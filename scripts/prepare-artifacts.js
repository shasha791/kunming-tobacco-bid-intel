"use strict";
/**
 * 准备交接产物：把本轮真实产物写入 cloud-output/，供 save-and-publish job 使用。
 * 原则：
 *  - 运行摘要必须存在（否则说明脚本连失败都没记录，严重错误）；
 *  - 数据库只有存在、非空、完整性 ok 才复制；否则不复制，避免覆盖 cloud-state 历史；
 *  - 站点产物只有 index.html + app-data.js 都存在才复制，避免发布半成品；
 *  - 全部来源失败时，运行摘要仍会被保存（真实失败状态）。
 */
const fs = require("node:fs");
const path = require("node:path");
const { inspectDatabase } = require("./cloud-pipeline");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "cloud-output");
const DB = process.env.NOTICE_DB_PATH || path.join(ROOT, "data", "notices.sqlite");
const SUMMARY = path.join(ROOT, "data", "run-status.json");

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (!fs.existsSync(SUMMARY) || fs.statSync(SUMMARY).size === 0) {
    throw new Error("缺少 run-status.json，无法保存真实运行状态");
  }
  fs.copyFileSync(SUMMARY, path.join(OUT, "run-status.json"));
  const latestSrc = path.join(OUT, "latest-run.json");
  if (!fs.existsSync(latestSrc) || fs.statSync(latestSrc).size === 0) {
    fs.copyFileSync(SUMMARY, latestSrc);
  }

  let dbSaved = false;
  if (fs.existsSync(DB) && fs.statSync(DB).size > 0) {
    const db = inspectDatabase(DB);
    if (db.integrity === "ok") {
      fs.copyFileSync(DB, path.join(OUT, "notices.sqlite"));
      dbSaved = true;
    } else {
      console.log(`数据库完整性=${db.integrity}，跳过数据库上传，保留 cloud-state 历史。`);
    }
  } else {
    console.log("无有效数据库，跳过数据库上传（首次运行或采集全部失败）。");
  }

  let siteReady = false;
  const siteDir = path.join(ROOT, "_site");
  const index = path.join(siteDir, "index.html");
  const appData = path.join(siteDir, "data", "app-data.js");
  if (fs.existsSync(index) && fs.existsSync(appData)) {
    fs.cpSync(siteDir, path.join(OUT, "site"), { recursive: true, force: true });
    siteReady = true;
  } else {
    console.log("站点产物不完整，跳过站点上传（不发布半成品）。");
  }

  const summary = JSON.parse(fs.readFileSync(SUMMARY, "utf8"));
  console.log(`交接：runId=${summary.runId} status=${summary.status} 数据库保存=${dbSaved} 站点就绪=${siteReady}`);
  fs.writeFileSync(path.join(OUT, "artifact-flags.json"), JSON.stringify({ dbSaved, siteReady }, null, 2));
}

main();
