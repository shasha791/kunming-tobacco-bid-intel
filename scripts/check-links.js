"use strict";
/**
 * 原文链接核验：对每条真实公告的具体原文链接做低频访问检查，
 * 记录：可访问/需登录/访问受限/已失效 + 核验时间。结果写入 data/link-checks.json。
 * 访问受限不判定公告虚假；无法验证时如实标注，不宣称验证通过。
 */
const fs = require("node:fs/promises");
const path = require("node:path");
const { HttpClient } = require("../lib/http-client");

const ROOT = path.join(__dirname, "..");
const CRAWLED = path.join(ROOT, "data", "crawled-notices.json");
const OUTPUT = path.join(ROOT, "data", "link-checks.json");

function classifyResponse(result, html) {
  if (!result.ok) {
    const err = (result.error || "").toLowerCase();
    if (/abort|timeout/.test(err)) return { status: "访问受限/超时", detail: "请求超时或中断，无法验证" };
    if (/403|401/.test(err) || result.status === 403 || result.status === 401) return { status: "访问受限", detail: "服务器拒绝公开访问" };
    if (/404/.test(err) || result.status === 404) return { status: "已失效", detail: "HTTP 404，链接可能已失效" };
    return { status: "访问受限", detail: `无法访问：${result.error}` };
  }
  if (result.status >= 400) return { status: result.status === 404 ? "已失效" : "访问受限", detail: `HTTP ${result.status}` };
  const text = String(html || "");
  if (/登录|login|请输入账号|用户名.*密码|请先注册/.test(text.slice(0, 3000)) && text.length < 8000) {
    return { status: "需登录", detail: "页面提示登录/注册，正文需登录查看" };
  }
  return { status: "可访问", detail: "公开页面可直接访问，原文入口有效" };
}

async function main() {
  let notices = [];
  try { notices = JSON.parse(await fs.readFile(CRAWLED, "utf8")); } catch { console.error("无采集数据，跳过链接核验"); return; }
  const client = new HttpClient({ timeoutMs: 12000, maxRetries: 0, requestIntervalMs: 400 });
  const checks = {};
  let pass = 0; let fail = 0; let restricted = 0;
  for (const n of notices) {
    const url = n.originalOfficialUrl || n.detailUrl;
    if (!url || !/^https?:\/\//.test(url)) {
      checks[url || n.title] = { status: "原文链接待核实", detail: "无效或占位链接", checkedAt: new Date().toISOString() };
      fail += 1; continue;
    }
    const result = await client.fetch(url, { tag: "link-check" });
    const verdict = classifyResponse(result, result.text);
    checks[url] = { ...verdict, checkedAt: new Date().toISOString(), httpStatus: result.status || 0 };
    if (verdict.status === "可访问") pass += 1;
    else if (verdict.status === "已失效") fail += 1;
    else restricted += 1;
  }
  const summary = { checkedAt: new Date().toISOString(), total: notices.length, accessible: pass, restricted, invalid: fail, note: "访问受限/需登录不代表公告虚假；无法验证的如实标注，不宣称验证通过。" };
  await fs.writeFile(OUTPUT, JSON.stringify({ summary, checks }, null, 2), "utf8");
  console.log(`链接核验完成：共 ${notices.length} 条，可访问 ${pass}，需登录/受限 ${restricted}，失效/无效 ${fail}`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exitCode = 1; });
module.exports = { main, classifyResponse };
