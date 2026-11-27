"use strict";
/**
 * 全自动：中烟采集 → 去重合并 → 仅提交 data/curated-notices.json → 推 main → GitHub Actions 发布网站。
 *
 * 修复要点：
 *  - run() 严格使用 opts.cwd（此前忽略，导致 clone 后 Git 命令仍在 ROOT 执行而失败）；
 *  - 每次重试都重新克隆并基于远端最新清单重新按官方 detailUrl 去重合并，避免失败重试漏推；
 *  - 发布前总是以远端 main 的 curated-notices.json 为基准合并，提交只允许包含该单一文件；
 *  - push 失败/超时后重试，若重试发现目标公告已在远端（上次实际已推成功）则判定成功，不重复提交。
 *
 * 用法：node scripts/auto-publish-curated.js [--skip-collect]
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const KEY = process.env.DEPLOY_KEY || path.join(process.env.HOME || "", ".ssh", "kunming-tobacco-auto", "id_ed25519");
const REPO = process.env.DEPLOY_REPO || "git@github.com:shasha791/kunming-tobacco-bid-intel.git";
const CURATED_REL = "data/curated-notices.json";
const MAX_RETRIES = 3;

function run(cmd, args, opts = {}) {
  // 关键修复：默认 ROOT，但显式 cwd 必须生效（clone 目录、临时仓库目录）
  return execFileSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    encoding: "utf8",
    stdio: opts.quiet ? ["ignore", "pipe", "pipe"] : "inherit",
    env: { ...process.env, ...(opts.env || {}) }
  });
}

function sshEnv() {
  return { GIT_SSH_COMMAND: `ssh -i ${KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o BatchMode=yes` };
}

function latestBatchFile() {
  const dir = path.join(ROOT, "reports", "website-sync");
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter((f) => /^cgjy-.*\.json$/.test(f))
    .map((f) => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return files.length ? path.join(dir, files[0].f) : null;
}

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

function writeJsonAtomic(p, obj) {
  const tmp = `${p}.${process.pid}.new`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + "\n", "utf8");
    fs.renameSync(tmp, p);
  } finally {
    try { fs.rmSync(tmp, { force: true }); } catch {}
  }
}

/** 以远端清单为基准，按官方 detailUrl 去重合并最新批次。返回新文件对象与新增公告。 */
function mergeByDetailUrl(remoteDoc, batch, sourceBatch) {
  const doc = JSON.parse(JSON.stringify(remoteDoc));
  if (!Array.isArray(doc.notices)) doc.notices = [];
  const seen = new Set(doc.notices.map((n) => n.detailUrl).filter(Boolean));
  const added = [];
  for (const n of batch.notices || []) {
    if (!n.detailUrl || seen.has(n.detailUrl)) continue;
    seen.add(n.detailUrl);
    doc.notices.push({
      ...n,
      curation: {
        reason: "WorkBuddy 自动采集批次（原文可核对）",
        sourceBatch,
        verifiedAt: new Date().toISOString(),
        fieldsFromOriginal: true
      }
    });
    added.push(n);
  }
  // 只有确实新增公告时才更新时间戳，避免重复运行仅因 generatedAt 变化产生空提交。
  if (added.length) doc.generatedAt = new Date().toISOString();
  return { doc, added };
}

function main(options = {}) {
  if (!fs.existsSync(KEY)) throw new Error(`持久 Deploy key 不存在: ${KEY}`);

  // 1) 采集 + 生成本地批次（本地清单也同步更新，供本地校验使用）
  if (!options.skipCollect) {
    const sync = run(process.execPath, [path.join(ROOT, "scripts", "sync-curated-from-collection.js")], { quiet: true });
    console.log(`[auto-publish] 采集完成: ${String(sync).trim()}`);
  }
  const batchFile = latestBatchFile();
  if (!batchFile) throw new Error("未找到 website-sync 批次文件");
  const batch = readJson(batchFile);
  const sourceBatch = path.basename(batchFile);
  const intended = (batch.notices || []).map((n) => n.detailUrl).filter(Boolean);
  console.log(`[auto-publish] 批次=${sourceBatch} 候选=${(batch.notices || []).length} 官方链接=${intended.length}`);

  // 2) 每次尝试都重新克隆远端 main，基于远端最新清单合并，杜绝漏推/覆盖
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wb-auto-"));
    const repoDir = path.join(tmp, "repo");
    try {
      run("git", ["clone", "--depth=1", "--branch", "main", REPO, repoDir], { quiet: true, env: sshEnv() });

      const remoteCuratedPath = path.join(repoDir, CURATED_REL);
      const remoteDoc = readJson(remoteCuratedPath);
      const { doc, added } = mergeByDetailUrl(remoteDoc, batch, sourceBatch);
      const remoteHasAll = intended.every((u) => doc.notices.some((n) => n.detailUrl === u));
      writeJsonAtomic(remoteCuratedPath, doc);

      // 只允许本次提交包含 curated-notices.json
      run("git", ["add", "--", CURATED_REL], { cwd: repoDir });
      let changed = true;
      try { run("git", ["diff", "--cached", "--quiet"], { cwd: repoDir, quiet: true }); changed = false; } catch {}

      if (!changed) {
        // 无 diff：要么本来就已存在（远端已含全部目标），要么没有新增
        if (remoteHasAll && added.length === 0) {
          console.log(`[auto-publish] 远端已含全部 ${intended.length} 条目标公告，判定发布成功（无重复提交）。`);
          return { added: 0, pushed: false, alreadyPresent: true, sourceBatch, urls: intended };
        }
        console.log("[auto-publish] 无新增公告，跳过推送。");
        return { added: 0, pushed: false, alreadyPresent: false, sourceBatch, urls: [] };
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      run("git", ["-c", "user.name=wb-auto", "-c", "user.email=local@publish", "commit", "-m", `Auto publish cgjy notices ${stamp}`], { cwd: repoDir, quiet: true });
      run("git", ["push", "origin", "HEAD:main"], { cwd: repoDir, env: sshEnv(), quiet: true });
      console.log(`[auto-publish] 第 ${attempt} 次推送成功：新增 ${added.length} 条，仅提交 ${CURATED_REL}。`);
      // 同步本地清单，保持本地与远端一致
      writeJsonAtomic(path.join(ROOT, CURATED_REL), doc);
      return { added: added.length, pushed: true, alreadyPresent: false, sourceBatch, urls: added.map((n) => n.detailUrl) };
    } catch (e) {
      lastError = e;
      const msg = String(e.message || e).split("\n")[0];
      console.error(`[auto-publish] 第 ${attempt}/${MAX_RETRIES} 次失败: ${msg}`);
      if (/Permission denied|publickey|403|could not read Username/i.test(msg)) {
        throw new Error(`写入权限失败: ${msg}。需要在 GitHub 仓库 Settings → Deploy keys 确认 wb-auto-publish-20261126 存在且勾选 Allow write access；或在 WorkBuddy 左下连接器重新授权 GitHub 并授予仓库 Contents 读写权限。`);
      }
    } finally {
      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
    }
  }
  throw new Error(`重试 ${MAX_RETRIES} 次仍失败，最后错误: ${String(lastError && lastError.message || lastError).split("\n")[0]}`);
}

if (require.main === module) {
  try {
    const r = main({ skipCollect: process.argv.includes("--skip-collect") });
    console.log(`[auto-publish] RESULT added=${r.added} pushed=${r.pushed} alreadyPresent=${r.alreadyPresent} urls=${r.urls.length}`);
  } catch (e) {
    console.error(`[auto-publish] FAILED: ${e.message}`);
    process.exitCode = 1;
  }
}
module.exports = { main, run, mergeByDetailUrl, latestBatchFile };
