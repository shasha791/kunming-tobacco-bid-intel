"use strict";
/**
 * 生成部署标记：只在 workflow 真正推送 gh-pages 前调用。
 * 该标记随站点一起发布，证明"本轮部署的运行ID与数据版本"，本地构建不得生成。
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const run = JSON.parse(fs.readFileSync(path.join(ROOT, "cloud-output", "run-status.json"), "utf8"));
const app = fs.readFileSync(path.join(ROOT, "data", "app-data.js"), "utf8");
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
fs.writeFileSync(path.join(ROOT, "data", "deploy-status.js"), `window.DEPLOY_STATUS = ${JSON.stringify(status, null, 2)};\n`);
fs.writeFileSync(path.join(ROOT, "data", "deploy-status.json"), JSON.stringify(status, null, 2));
console.log(`部署标记: runId=${status.runId} dataVersion=${status.dataVersion} ${beijing}`);
