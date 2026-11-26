"use strict";
/**
 * 接通「自动采集 → 自动入库」缺失的一步：
 *   1) 运行 export-cgjy-public-batch.js，生成 reports/website-sync/cgjy-*.json
 *   2) 取最新批次，按 detailUrl 去重合并进 data/curated-notices.json
 *   3) 不改项目所在地字段；销售片区由 assignment 规则另外决定
 * 幂等：同一 detailUrl 不会重复写入；合并后可由现有流水线自动入库/发布。
 *
 * 用法：node scripts/sync-curated-from-collection.js [--skip-export]
 */
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const SYNC_DIR = path.join(ROOT, "reports", "website-sync");
const CURATED = path.join(ROOT, "data", "curated-notices.json");

function latestBatchFile() {
  if (!fsSync.existsSync(SYNC_DIR)) return null;
  const files = fsSync.readdirSync(SYNC_DIR)
    .filter((f) => /^cgjy-.*\.json$/.test(f) && !f.endsWith(".new"))
    .map((f) => ({ f, mtime: fsSync.statSync(path.join(SYNC_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length ? path.join(SYNC_DIR, files[0].f) : null;
}

async function main(options = {}) {
  if (!options.skipExport) {
    execFileSync(process.execPath, [path.join(ROOT, "scripts", "export-cgjy-public-batch.js"), ROOT], { cwd: ROOT, stdio: "inherit" });
  }
  const batchFile = latestBatchFile();
  if (!batchFile) throw new Error("未找到 website-sync 批次文件");
  const batch = JSON.parse(await fs.readFile(batchFile, "utf8"));
  const curated = JSON.parse(await fs.readFile(CURATED, "utf8"));
  const seen = new Set((curated.notices || []).map((n) => n.detailUrl));
  let added = 0;
  for (const n of batch.notices || []) {
    if (!n.detailUrl || seen.has(n.detailUrl)) continue;
    seen.add(n.detailUrl);
    curated.notices.push({ ...n, curation: { reason: "自动采集批次合并（原文可核对）", sourceBatch: path.basename(batchFile), verifiedAt: new Date().toISOString(), fieldsFromOriginal: true } });
    added += 1;
  }
  curated.generatedAt = new Date().toISOString();
  const tmp = `${CURATED}.${process.pid}.new`;
  try {
    await fs.writeFile(tmp, JSON.stringify(curated, null, 2) + "\n", "utf8");
    await fs.rename(tmp, CURATED);
  } finally {
    await fs.rm(tmp, { force: true });
  }
  console.log(`[sync] batch=${path.basename(batchFile)} candidates=${(batch.notices || []).length} added=${added} total=${curated.notices.length}`);
  return { added, total: curated.notices.length, batch: path.basename(batchFile) };
}

if (require.main === module) main({ skipExport: process.argv.includes("--skip-export") }).catch((e) => { console.error(e.message); process.exitCode = 1; });
module.exports = { main };
