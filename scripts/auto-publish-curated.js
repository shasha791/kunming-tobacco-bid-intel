"use strict";
/**
 * 全自动：采集 → 去重合并 → 持久化推送 main → 触发 GitHub Actions 发布网站。
 * 供每日 07:20 自动任务调用；使用持久 Deploy key（~/.ssh/kunming-tobacco-auto/id_ed25519）。
 * 无新增公告时不提交、不推送，避免无意义构建。
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const KEY = process.env.DEPLOY_KEY || path.join(process.env.HOME || "", ".ssh", "kunming-tobacco-auto", "id_ed25519");
const REPO = process.env.DEPLOY_REPO || "git@github.com:shasha791/kunming-tobacco-bid-intel.git";
const FILES = ["data/curated-notices.json", "reports/website-sync"];

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8", stdio: opts.quiet ? "pipe" : "inherit", env: { ...process.env, ...(opts.env || {}) } });
}

function main() {
  if (!fs.existsSync(KEY)) throw new Error(`持久 Deploy key 不存在: ${KEY}`);

  // 1) 采集 + 去重合并（脚本内部按 detailUrl 去重，重复运行 added=0）
  const sync = run(process.execPath, [path.join(ROOT, "scripts", "sync-curated-from-collection.js")], { quiet: true });
  const match = String(sync).match(/added=(\d+)/);
  const added = match ? Number(match[1]) : 0;
  console.log(`[auto-publish] 采集合并完成: ${String(sync).trim()}`);
  if (!added) {
    console.log("[auto-publish] 无新增公告，跳过推送（网站保持现状）。");
    return { added: 0, pushed: false };
  }

  // 2) 用持久 key 克隆 main，只提交变化的文件，推送触发 workflow
  const tmp = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "wb-auto-"));
  const ssh = `ssh -i ${KEY} -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new`;
  try {
    run("git", ["clone", "--depth=1", "--branch", "main", REPO, tmp], { quiet: true, env: { GIT_SSH_COMMAND: ssh } });
    for (const rel of FILES) {
      const src = path.join(ROOT, rel);
      const dst = path.join(tmp, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      if (fs.statSync(src).isDirectory()) fs.cpSync(src, dst, { recursive: true, force: true });
      else fs.copyFileSync(src, dst);
    }
    run("git", ["add", "-A"], { cwd: tmp });
    let changed = true;
    try { run("git", ["diff", "--cached", "--quiet"], { cwd: tmp, quiet: true }); changed = false; } catch {}
    if (!changed) {
      console.log("[auto-publish] 远端已含相同清单，跳过推送。");
      return { added, pushed: false };
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    run("git", ["-c", "user.name=wb-auto", "-c", "user.email=local@publish", "commit", "-m", `Auto publish curated cgjy notices ${stamp}`], { cwd: tmp });
    run("git", ["push", "origin", "HEAD:main"], { cwd: tmp, env: { GIT_SSH_COMMAND: ssh } });
    console.log("[auto-publish] 已推送 main，GitHub Actions 将自动重建并发布网站。");
    return { added, pushed: true };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try { const r = main(); console.log(`[auto-publish] RESULT added=${r.added} pushed=${r.pushed}`); }
  catch (e) { console.error(`[auto-publish] FAILED: ${e.message}`); process.exitCode = 1; }
}
module.exports = { main };
