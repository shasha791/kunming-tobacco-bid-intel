"use strict";
/**
 * 生成部署标记：只在 workflow 真正推送 gh-pages 前调用。
 * 该标记随站点一起发布，证明"本轮部署的运行ID与数据版本"，本地构建不得生成。
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const run = JSON.parse(fs.readFileSync(path.join(ROOT, "cloud-output", "run-status.json"), "utf8"));
// 发布步骤工作区可能已从 main 切换到 cloud-state，根目录 data/app-data.js 不存在；
// 优先读取 artifact 中的公开站点数据，保证仍能提取真实数据版本。
const appCandidates = [
  path.join(ROOT, "cloud-output", "site", "data", "app-data.js"),
  path.join(ROOT, "data", "app-data.js")
];
const appPath = appCandidates.find((p) => fs.existsSync(p));
if (!appPath) throw new Error("找不到 app-data.js，无法生成部署标记");
const app = fs.readFileSync(appPath, "utf8");
const m = app.match(/"generatedAt"\s*:\s*"([^"]+)"/);
const deployedAt = new Date();
const bj = new Date(deployedAt.getTime() + 8 * 3600 * 1000);
const p = (n) => String(n).padStart(2, "0");
const beijing = `${bj.getUTCFullYear()}年${bj.getUTCMonth() + 1}月${bj.getUTCDate()}日 ${p(bj.getUTCHours())}:${p(bj.getUTCMinutes())}`;
const status = {
  deployed: true,
  runId: run.runId,
  dataVersion: m ? m[1] : null,
  deployedAt: deployedAt.toISOString(),
  deployedBeijing: beijing,
  note: "由 GitHub Actions 发布步骤生成；本地构建不产生此文件。"
};
// main 分支不跟踪 data/ 目录，发布步骤恢复 main 后该目录可能不存在。
fs.mkdirSync(path.join(ROOT, "data"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "data", "deploy-status.js"), `window.DEPLOY_STATUS = ${JSON.stringify(status, null, 2)};\n`);
fs.writeFileSync(path.join(ROOT, "data", "deploy-status.json"), JSON.stringify(status, null, 2));
console.log(`部署标记: runId=${status.runId} dataVersion=${status.dataVersion} ${beijing}`);
