"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const { processNotice } = require("../lib/rules");
const { scoreNotice } = require("../lib/scoring");
const { assignAll } = require("../lib/assign");
const { buildPreview } = require("../lib/notify");
const { Store } = require("../lib/store");
const businessProfile = require("../config/business-profile.json");
const assignmentConfig = require("../config/assignment.json");
const demoPilot = require("../config/demo-pilot.json");
const { buildScoringRulesView } = require("../lib/scoring-rules-view");

const ROOT = path.join(__dirname, "..");
const DB_PATH = process.env.NOTICE_DB_PATH || path.join(ROOT, "data", "notices.sqlite");
const CRAWLED = path.join(ROOT, "data", "crawled-notices.json");
const APP_DATA = path.join(ROOT, "data", "app-data.js");
const PREVIEW_OUT = path.join(ROOT, "reports", "push-preview.json");
const RESULT_OUT = path.join(ROOT, "reports", "pipeline-result.json");
const STATUS_OUT = path.join(ROOT, "data", "source-statuses.json");
const LINK_CHECKS = path.join(ROOT, "data", "link-checks.json");

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch (e) { if (e.code === "ENOENT") return fallback; throw e; }
}

async function main(options = {}) {
  // 只处理实际采集的真实公告；不存在任何演示数据加载路径。
  const crawled = await readJson(CRAWLED, []);
  const allRaw = crawled.map((n) => ({ ...n, dataType: "真实采集" }));

  const processed = allRaw.map((raw) => {
    const base = processNotice(raw);
    return scoreNotice(base);
  });
  const assigned = assignAll(processed);
  // 将主负责人写回记录，供"我负责的"视图与共享持久存储使用
  for (const n of assigned.notices) {
    n.ownerId = n.assignment?.primary?.personId || "";
    if (n.assignment?.primary) n.followStatus = n.followStatus || "未跟进";
  }
  const store = new Store(DB_PATH);
  const upsertResult = store.upsertMany(assigned.notices);
  const stored = store.listNotices();
  const preview = buildPreview(stored, store);
  const status = await readJson(STATUS_OUT, { overall: "未运行采集", statuses: [] });
  const linkChecks = await readJson(LINK_CHECKS, { summary: {}, checks: {} });

  // 为每条公告补充项目时间线
  const enriched = stored.map((n) => ({ ...n, timeline: store.getTimeline(n.projectKey || n.id) }));

  const appData = {
    generatedAt: new Date().toISOString(),
    company: "昆明烟机集团二机有限公司",
    productName: "昆明二机·烟草机械商机情报",
    scoringRuleVersion: require("../config/scoring.json").ruleVersion,
    scoringStatus: require("../config/scoring.json").status,
    matchingRuleVersion: require("../config/keywords.json").ruleVersion,
    scoringRules: buildScoringRulesView(),
    simulation: {
      enabled: Boolean(businessProfile.simulation?.enabled || assignmentConfig.simulation?.enabled),
      label: businessProfile.simulation?.label || "模拟配置",
      warning: businessProfile.simulation?.warning || "模拟数据不可用于真实投标决策。",
      scope: businessProfile.simulation?.scope || [],
      realPilotNotice: demoPilot.notice,
      pilotWarning: demoPilot.warning
    },
    notices: enriched,
    // 分派统计基于去重后的正式公告（enriched），与首页/列表口径一致
    assignmentSummary: {
      total: enriched.length,
      assigned: enriched.filter((n) => n.assignment?.primary).length,
      pending: enriched.filter((n) => n.assignment?.status === "待分派").length,
      collaboration: enriched.filter((n) => n.assignment?.collaborators?.length > 0).length
    },
    upsertResult,
    sourceStatus: status,
    linkChecks: linkChecks.checks || {},
    linkCheckSummary: linkChecks.summary || {},
    counts: {
      // 统计口径：全部来自同一次正式数据（crawled-notices.json），无演示数据。
      noticeCount: enriched.length,                 // 公告条数（含同项目不同阶段公告）
      projectCount: new Set(enriched.map((n) => n.projectKey || n.id)).size, // 项目数（按项目关联去重）
      real: crawled.length,
      A: enriched.filter((n) => n.category === "A").length,
      B: enriched.filter((n) => n.category === "B").length,
      C: enriched.filter((n) => n.category === "C").length,
      D: enriched.filter((n) => n.category === "D").length,
      E: enriched.filter((n) => n.category === "E").length,
      actionable: enriched.filter((n) => n.isActionable).length,          // 当前有效可行动商机（公告条数）
      currentValid: enriched.filter((n) => n.validity === "当前有效").length,
      unverifiedValidity: enriched.filter((n) => n.validity === "有效性待核实").length,
      expired: enriched.filter((n) => n.validity === "已截止").length,
      history: enriched.filter((n) => n.validity === "历史追踪").length,
      pendingAssignment: enriched.filter((n) => n.assignment?.status === "待分派").length
    },
    statisticsNote: "公告条数按去重后的公告记录计（含同一项目的招标/变更/中标等不同阶段公告）；项目数按项目编号关联去重。当前有效机会仅统计 isActionable 的公告，历史/已截止/有效性待核实不计入。所有数字来自同一次实际公开采集数据。历史公告不会因本次重新采集而计为今日新发布。",
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

  await fs.mkdir(path.dirname(APP_DATA), { recursive: true });
  await fs.mkdir(path.dirname(PREVIEW_OUT), { recursive: true });
  await fs.writeFile(APP_DATA, `window.APP_DATA = ${JSON.stringify(appData, null, 2)};\n`, "utf8");
  await fs.writeFile(PREVIEW_OUT, JSON.stringify(preview, null, 2), "utf8");
  await fs.writeFile(RESULT_OUT, JSON.stringify({
    generatedAt: appData.generatedAt,
    counts: appData.counts,
    upsertResult,
    sourceStatus: status,
    assignmentSummary: assigned.summary,
    previewSummary: preview.summary
  }, null, 2), "utf8");
  store.close();

  console.log(`处理完成：${enriched.length} 条真实公告（采集输入 ${crawled.length} 条，无演示数据）`);
  console.log(`分类 A=${appData.counts.A} B=${appData.counts.B} C=${appData.counts.C} D=${appData.counts.D} E=${appData.counts.E}`);
  console.log(`新增${upsertResult.inserted} 更新${upsertResult.updated} 重复${upsertResult.duplicate} 跨来源合并${upsertResult.mergedSources} 时间线${upsertResult.timelineAdded}`);
  console.log(`推送预览 ${preview.previews.length} 条（跳过 ${preview.skipped.length} 条；渠道未配置、无接收人，不真实发送）`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exitCode = 1; });
module.exports = { main };
