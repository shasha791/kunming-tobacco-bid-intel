"use strict";
/**
 * 演示片区试点推送校验：
 * - 目标公告：销售片区=演示片区 → 生成正式格式企微消息
 * - 对照公告：销售片区≠演示片区 → 不生成、不发送
 * 只读取本地 app-data；不直接发送消息，发送由 wecom-cli 单独执行。
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://shasha791.github.io/kunming-tobacco-bid-intel/";

function loadNotices() {
  const p = path.join(ROOT, "data", "app-data.js");
  const text = fs.readFileSync(p, "utf8").replace(/^window\.APP_DATA\s*=\s*/, "").replace(/;\s*$/, "");
  return JSON.parse(text).notices;
}

function detailLink(n) { return `${SITE}#detail/${encodeURIComponent(n.id)}`; }

function messageFor(n) {
  const f = n.structured || {};
  return [
    "**【试点推送·演示片区】**",
    `**项目标题**：${n.title}`,
    `**投标截止**：${f.bidDeadline?.normalized || "原文未披露，待核实"}`,
    `**项目所在地区**：${f.province || "待核实"}${f.city && f.city !== "未披露" ? " / " + f.city : ""}（与销售片区分列）`,
    `**销售片区 / 归属**：${n.salesZone || "未分区"} / ${n.assignment?.primary?.name || "待分派"}`,
    `**网站详情**：${detailLink(n)}`,
    `**中烟原文**：${n.originalOfficialUrl || n.detailUrl || "未披露"}`,
    "",
    "说明：第一轮为演示片区试点，企微仅发授权人本人验收；真实收件人由客户确认后启用。"
  ].join("\n");
}

function main() {
  const notices = loadNotices();
  const target = notices.find((n) => n.salesZone === "演示片区" && n.assignment?.primary?.personId === "PILOT-OWNER-DEMO");
  const control = notices.find((n) => n.salesZone === "滇中片区" || n.title.includes("云南九九物业"));
  if (!target) throw new Error("未找到演示片区目标公告");
  const result = {
    generatedAt: new Date().toISOString(),
    target: {
      projectNo: target.structured?.projectNo,
      title: target.title,
      deadline: target.structured?.bidDeadline?.normalized || "待核实",
      salesZone: target.salesZone,
      owner: target.assignment?.primary?.name,
      siteDetailUrl: detailLink(target),
      originalUrl: target.originalOfficialUrl || target.detailUrl,
      message: messageFor(target)
    },
    control: control ? {
      projectNo: control.structured?.projectNo,
      title: control.title,
      salesZone: control.salesZone,
      owner: control.assignment?.primary?.name || "待分派",
      decision: "不推送",
      reason: `销售片区 ${control.salesZone || "未分区"} 不属于演示片区，跳过`
    } : null
  };
  const out = path.join(ROOT, "reports", "pilot-push-check.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(`[pilot] target=${target.structured?.projectNo} zone=${target.salesZone} owner=${target.assignment?.primary?.name}`);
  console.log(`[pilot] control=${control?.structured?.projectNo || "none"} zone=${control?.salesZone || "none"} decision=不推送`);
  console.log(`[pilot] report=${out}`);
}

if (require.main === module) main();
module.exports = { messageFor, detailLink };
