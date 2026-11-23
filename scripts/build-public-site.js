"use strict";
/**
 * 白名单构建公开网页产物：只复制安全文件到 _site/。
 * 明确排除：config/（含渠道配置）、lib/、scripts/、data/notices.sqlite、
 * crawled-notices.json（含原始正文，非必需）、内部 docs/、.git、密钥。
 */
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

const PUBLIC_FILES = [
  "index.html",
  "styles.css",
  "app.js",
  "workflow.html",
  "workflow-styles.css",
  "workflow-app.js",
  "data/app-data.js",       // process.js 生成的展示数据（已过滤为公开字段）
  "data/run-status.js",     // 前端运行状态摘要（安全字段）
  "data/manual-verification.js", // 人工路径关键词验证清洗数据（公开字段）
  "data/run-status.json"    // 同内容的 JSON，便于排查
];

async function buildPublicSite({ rootDir, outputDir }) {
  outputDir = outputDir || path.join(rootDir, "_site");
  await fs.rm(outputDir, { recursive: true, force: true });
  const copied = [];
  for (const rel of PUBLIC_FILES) {
    const src = path.join(rootDir, rel);
    if (!fsSync.existsSync(src)) throw new Error(`Public file missing: ${rel}`);
    const dst = path.join(outputDir, rel);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst);
    copied.push(rel);
  }
  await fs.writeFile(path.join(outputDir, ".nojekyll"), "\n", "utf8");
  // 构建后自检：不得出现敏感文件
  const forbidden = ["notices.sqlite", "crawled-notices.json", ".env", "link-checks.json", "config", "scripts", "lib", "docs"];
  for (const f of forbidden) {
    if (fsSync.existsSync(path.join(outputDir, f))) throw new Error(`Forbidden file in public output: ${f}`);
  }
  return { outputDir, files: [...copied, ".nojekyll"] };
}

if (require.main === module) {
  const root = path.join(__dirname, "..");
  buildPublicSite({ rootDir: root }).then((r) => {
    console.log(`Built public site with ${r.files.length} files at ${r.outputDir}`);
    console.log(r.files.join("\n"));
  }).catch((e) => { console.error(e.message); process.exitCode = 1; });
}

module.exports = { PUBLIC_FILES, buildPublicSite };
