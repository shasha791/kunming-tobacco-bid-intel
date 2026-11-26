"use strict";
/**
 * 云端每日流水线（烟机项目，无外部发送）：
 *   完整性检查 → 采集 → 链接核验 → 增量处理 → 生成前端数据 → 构建公开站点 → 运行摘要。
 * 来源失败不覆盖上次成功数据；全部失败时保留历史，发布真实失败状态。
 */
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { collectEnabled } = require("./sources/registry");
const { classify, processNotice } = require("../lib/rules");
const { scoreNotice } = require("../lib/scoring");
const { assignAll } = require("../lib/assign");
const { buildPreview } = require("../lib/notify");
const { Store } = require("../lib/store");
const { buildPublicSite } = require("./build-public-site");
const { bjText, nextSchedule, readPreviousSummary, validateSummary, emptyCounts } = require("./lib/run-state");
const businessProfile = require("../config/business-profile.json");
const assignmentConfig = require("../config/assignment.json");
const demoPilot = require("../config/demo-pilot.json");

const ROOT = path.join(__dirname, "..");
const DB = process.env.NOTICE_DB_PATH || path.join(ROOT, "data", "notices.sqlite");
const RUN_SUMMARY = process.env.CLOUD_SUMMARY_JSON || path.join(ROOT, "data", "run-status.json");
const CLOUD_RUN = process.env.CLOUD_RUN_JSON || path.join(ROOT, "cloud-output", "latest-run.json");
const APP_DATA = path.join(ROOT, "data", "app-data.js");
const CRAWLED = path.join(ROOT, "data", "crawled-notices.json");
const SOURCE_STATUS = path.join(ROOT, "data", "source-statuses.json");
const LINK_CHECKS = path.join(ROOT, "data", "link-checks.json");
const PREVIEW = path.join(ROOT, "reports", "push-preview.json");
const RESULT = path.join(ROOT, "reports", "pipeline-result.json");

function inspectDatabase(dbPath) {
  if (!fsSync.existsSync(dbPath)) return { exists: false, integrity: "missing", note: "首次运行无数据库，需安全初始化" };
  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const integrity = db.prepare("PRAGMA integrity_check").get()?.integrity_check || "unknown";
    const rows = db.prepare("SELECT COUNT(*) AS c FROM notices").get()?.c || 0;
    db.close();
    return { exists: true, integrity, notices: rows };
  } catch (e) { return { exists: true, integrity: "error", error: e.message }; }
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}
async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch (e) { if (e.code === "ENOENT") return fallback; throw e; }
}

function countSources(statuses) {
  const r = { success: 0, empty: 0, failed: 0 };
  for (const s of statuses) {
    if (/失败/.test(s.status)) r.failed += 1;
    else if (/零结果/.test(s.status)) r.empty += 1;
    else r.success += 1;
  }
  return r;
}

async function main() {
  const startedAt = new Date();
  const runId = process.env.GITHUB_RUN_ID || `local-${startedAt.getTime()}`;
  const trigger = process.env.GITHUB_EVENT_NAME === "schedule" ? "定时" : "手动";
  const triggeredSchedule = process.env.TRIGGERED_SCHEDULE || "";
  const prev = readPreviousSummary(RUN_SUMMARY);
  const dbBefore = inspectDatabase(DB);

  // 数据库损坏：不得静默新建空库覆盖历史
  if (dbBefore.exists && dbBefore.integrity !== "ok") {
    throw new Error(`SQLite integrity check failed: ${dbBefore.integrity}. 不覆盖历史状态。`);
  }

  let result = { status: "success", runId, trigger };
  let collection = null;
  let upsert = null;
  let counts = emptyCounts();
  let errorMessage = "";

  try {
    // 首次运行无数据库是安全的：Store 构造时自动初始化空库（保留首次运行说明）
    collection = await collectEnabled();
    const allFailed = collection.statuses.length > 0 && collection.statuses.every((s) => s.status === "失败");
    if (allFailed) {
      // 全部失败：保留上次成功数据，不覆盖 crawled-notices.json；
      // 但仍写入本轮失败来源状态，供网站展示真实失败情况。
      await writeJson(SOURCE_STATUS, {
        generatedAt: startedAt.toISOString(),
        overall: "全部失败",
        statuses: collection.statuses
      });
      result.status = "failed";
      errorMessage = "所有来源采集失败，保留上次成功数据";
    } else {
      await writeJson(CRAWLED, collection.notices);
      await writeJson(SOURCE_STATUS, {
        generatedAt: startedAt.toISOString(),
        overall: collection.overall,
        statuses: collection.statuses
      });

      const processed = collection.notices.map((raw) => scoreNotice(processNotice({ ...raw, dataType: "真实采集" })));
      const assigned = assignAll(processed);
      for (const n of assigned.notices) n.ownerId = n.assignment?.primary?.personId || "";
      const store = new Store(DB);
      upsert = store.upsertMany(assigned.notices);
      const stored = store.listNotices().map((notice) => {
        if (!notice.manuallyVerified) return notice;
        const { validity, validityReason, isActionable } = classify(notice);
        return { ...notice, validity, validityReason, isActionable };
      });
      const preview = buildPreview(stored, store);
      const enriched = stored.map((n) => ({ ...n, timeline: store.getTimeline(n.projectKey || n.id) }));
      store.close();

      const status = await readJson(SOURCE_STATUS, { statuses: [] });
      const links = await readJson(LINK_CHECKS, { checks: {}, summary: {} });
      const appData = {
        generatedAt: new Date().toISOString(),
        company: "昆明烟机集团二机有限公司",
        productName: "昆明二机·烟草机械商机情报",
        scoringRuleVersion: require("../config/scoring.json").ruleVersion,
        scoringStatus: require("../config/scoring.json").status,
        matchingRuleVersion: require("../config/keywords.json").ruleVersion,
        simulation: {
          enabled: Boolean(businessProfile.simulation?.enabled || assignmentConfig.simulation?.enabled),
          label: businessProfile.simulation?.label || "模拟配置",
          warning: businessProfile.simulation?.warning || "模拟数据不可用于真实投标决策。",
          scope: businessProfile.simulation?.scope || [],
          realPilotNotice: demoPilot.notice,
          pilotWarning: demoPilot.warning
        },
        notices: enriched,
        sourceStatus: status,
        linkChecks: links.checks || {},
        linkCheckSummary: links.summary || {},
        counts: {
          noticeCount: enriched.length,
          projectCount: new Set(enriched.map((n) => n.projectKey || n.id)).size,
          real: enriched.length,
          A: enriched.filter((n) => n.category === "A").length,
          B: enriched.filter((n) => n.category === "B").length,
          C: enriched.filter((n) => n.category === "C").length,
          D: enriched.filter((n) => n.category === "D").length,
          E: enriched.filter((n) => n.category === "E").length,
          actionable: enriched.filter((n) => n.isActionable).length,
          currentValid: enriched.filter((n) => n.validity === "当前有效").length,
          unverifiedValidity: enriched.filter((n) => n.validity === "有效性待核实").length,
          expired: enriched.filter((n) => n.validity === "已截止").length,
          history: enriched.filter((n) => n.validity === "历史追踪").length,
          pendingAssignment: enriched.filter((n) => n.assignment?.status === "待分派").length
        },
        assignmentSummary: {
          total: enriched.length,
          assigned: enriched.filter((n) => n.assignment?.primary).length,
          pending: enriched.filter((n) => n.assignment?.status === "待分派").length,
          collaboration: enriched.filter((n) => n.assignment?.collaborators?.length > 0).length
        },
        statisticsNote: "公告条数按去重后公告记录计（含同项目招标/变更/中标不同阶段公告）；项目数按编号关联去重；当前有效机会仅统计有效期内且可行动的公告。全部数字来自同一次实际公开采集数据。历史公告不会因重新采集而计为今日新发布。",
        previewSummary: preview.summary,
        config: {
          channels: require("../config/channels.json").channels.map((c) => ({ id: c.id, label: c.label, status: c.status })),
          people: assignmentConfig.people.map((p) => ({ personId: p.personId, name: p.name, isTestData: p.isTestData, simulated: p.simulated, role: p.role }))
        },
        assignmentDetails: {
          assignment: assignmentConfig,
          // 公开产物只保留展示所需字段，不暴露渠道密钥变量名与内部备注
          channels: {
            subscriptions: (require("../config/channels.json").subscriptions || []).map((s) => ({
              label: s.label, frequency: s.frequency, channel: s.channel, minScore: s.minScore,
              acceptUnverifiedLeads: s.acceptUnverifiedLeads, acceptKeyChanges: s.acceptKeyChanges, status: s.status
            }))
          },
          sources: require("../config/sources.json"),
          preview: { previewCount: preview.previews.length, skippedCount: preview.skipped.length, previews: preview.previews }
        }
      };
      await fs.writeFile(APP_DATA, `window.APP_DATA = ${JSON.stringify(appData, null, 2)};\n`, "utf8");
      await writeJson(PREVIEW, preview);
      await writeJson(RESULT, { generatedAt: appData.generatedAt, counts: appData.counts, upsertResult: upsert, sourceStatus: status });

      counts = {
        fetched: collection.notices.length,
        excluded: enriched.filter((n) => n.category === "E").length,
        duplicate: upsert.duplicate,
        inserted: upsert.inserted,
        updated: upsert.updated,   // 仅业务字段真实变化（store 以 businessSignature 判定）
        mergedSources: upsert.mergedSources,
        notices: enriched.length,
        projects: appData.counts.projectCount
      };
      const src = countSources(collection.statuses);
      if (src.failed > 0 && src.success + src.empty > 0) result.status = "partial";
    }
  } catch (e) {
    result.status = "failed";
    errorMessage = e.message;
  }

  const finishedAt = new Date();
  const src = collection ? countSources(collection.statuses) : { success: 0, empty: 0, failed: 0 };
  const readLiveSource = collection?.statuses.some((s) => s.sourceId !== "cgjy-curated" && s.status !== "失败");
  const previousCollection = prev?.lastSuccessCollectedAt === undefined
    ? (dbBefore.exists && dbBefore.integrity === "ok" ? prev?.finishedAt || null : null)
    : prev.lastSuccessCollectedAt;
  const lastSuccess = readLiveSource && (result.status === "success" || result.status === "partial")
    ? finishedAt.toISOString()
    : previousCollection;
  const summary = {
    schemaVersion: "1.0.0",
    status: result.status,
    mode: "cloud-collect-only",
    deployed: process.env.GITHUB_ACTIONS === "true", // 仅云端 Actions 实际运行才算已部署启用
    executionEnv: process.env.GITHUB_ACTIONS === "true" ? "github-actions" : "local",
    noExternalSend: true,
    runId,
    trigger,
    triggeredSchedule,
    plannedBeijing: { primary: "03:35", fallback: "06:35" },
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    startedBeijing: bjText(startedAt.toISOString()),
    finishedBeijing: bjText(finishedAt.toISOString()),
    nextScheduled: nextSchedule(finishedAt),
    sources: collection ? collection.statuses.map((s) => ({ sourceId: s.sourceId, sourceName: s.sourceName, status: s.status, count: s.count, error: s.error || s.message || "" })) : [],
    sourceSummary: src,
    counts,
    // 五个结果分别记录，禁止互相替代：
    // collectResult=来源采集；saveResult=SQLite保存；buildResult=本地_site构建；
    // deployResult=云端部署（仅 workflow 推送成功后回写）；verifyResult=线上访问核验
    collectResult: result.status,
    saveResult: upsert ? "success" : (result.status === "failed" ? "skipped-due-to-failure" : "no-change"),
    buildResult: "pending",
    deployResult: "pending-deploy",   // 本地运行永远不是已部署；workflow 部署步骤会单独回写
    verifyResult: "not-verified",     // 需实际访问线上地址核验后回写
    dataSavedAt: result.status === "failed" ? (prev?.dataSavedAt || null) : finishedAt.toISOString(),
    lastSuccessCollectedAt: lastSuccess,
    // 只有真实云端部署成功才填写；本地构建时间不得当作部署时间
    lastDeployedAt: prev?.lastDeployedAt || null,
    lastDeployedRunId: prev?.lastDeployedRunId || null,
    lastPublishedDataAt: prev?.lastPublishedDataAt || null,
    database: { before: dbBefore, after: inspectDatabase(DB) },
    initializedFirstRun: !dbBefore.exists,
    message: errorMessage || ""
  };
  const invalid = validateSummary(summary);
  if (invalid) throw new Error(`Invalid run summary: ${invalid}`);

  await writeJson(RUN_SUMMARY, summary);
  await writeJson(CLOUD_RUN, summary);
  // 同步生成前端可同步加载的摘要（file:// 直接打开也能读取，不依赖 fetch）
  await fs.writeFile(path.join(ROOT, "data", "run-status.js"),
    `window.CLOUD_RUN_STATUS = ${JSON.stringify(summary, null, 2)};\n`, "utf8");

  // 本地构建成功只表示 _site 生成成功，不等于部署成功、不等于线上验证成功。
  let build = { result: "success" };
  try {
    const built = await buildPublicSite({ rootDir: ROOT });
    build = { result: "success", files: built.files.length };
  } catch (e) {
    build = { result: "failed", error: e.message };
  }
  summary.buildResult = build.result;
  summary.build = build;
  // deployResult 保持 pending-deploy；lastDeployedAt 沿用上次真实部署时间，绝不填本地构建时间。
  await writeJson(RUN_SUMMARY, summary);
  await writeJson(CLOUD_RUN, summary);
  const statusJs = `window.CLOUD_RUN_STATUS = ${JSON.stringify(summary, null, 2)};\n`;
  await fs.writeFile(path.join(ROOT, "data", "run-status.js"), statusJs, "utf8");
  // 把最终摘要同步到已构建的公开产物（仅本地构建成功时）。
  // 注意：此处不含任何部署成功标记，该标记只能由 workflow 部署步骤生成。
  if (build.result === "success") {
    const siteStatusDir = path.join(ROOT, "_site", "data");
    await fs.mkdir(siteStatusDir, { recursive: true });
    await fs.writeFile(path.join(siteStatusDir, "run-status.json"), JSON.stringify(summary, null, 2), "utf8");
    await fs.writeFile(path.join(siteStatusDir, "run-status.js"), statusJs, "utf8");
  }

  console.log(`[cloud] ${summary.status} run ${runId} (${trigger})`);
  console.log(`[cloud] sources success=${src.success} empty=${src.empty} failed=${src.failed}`);
  console.log(`[cloud] fetched=${counts.fetched} new=${counts.inserted} updated=${counts.updated} duplicate=${counts.duplicate}`);
  console.log(`[cloud] collect=${summary.collectResult} save=${summary.saveResult} build=${summary.buildResult} deploy=${summary.deployResult} verify=${summary.verifyResult}`);
  console.log(`[cloud] last success collect=${lastSuccess ? bjText(lastSuccess) : "无"}`);
  if (errorMessage) console.error(`[cloud] ${errorMessage}`);
  if (result.status === "failed") process.exitCode = 1;
}

if (require.main === module) main().catch((e) => { console.error(e); process.exitCode = 1; });
module.exports = { main, inspectDatabase };
