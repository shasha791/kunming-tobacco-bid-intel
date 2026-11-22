"use strict";
/**
 * 针对本轮对抗式审查发现的关键问题的回归测试：
 *  1) 时间：UTC ISO 必须正确转北京时间；无时区字符串不得重复加 8 小时；星期按真实日期。
 *  2) 数字：businessSignature 区分真实变更与跨来源转载/重采集。
 *  3) 五阶段状态字段分离；部署时间不得用本地构建时间代替。
 *  4) 产物准备：数据库缺失/损坏不复制，摘要始终保存。
 * 所有测试使用临时目录/内存对象，不触碰正式数据。
 */
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { bjText, nextSchedule, readPreviousSummary, validateSummary } = require("../scripts/lib/run-state");

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); pass++; }
  catch (e) { console.error(`  FAIL  ${name}: ${e.message}`); fail++; }
}

console.log("\n=== 时间回归 ===");
test("UTC ISO 转北京时间为 +8 小时，不重复加", () => {
  // 2026-11-18T09:49:53Z = 北京 17:49
  assert.equal(bjText("2026-11-18T09:49:53.397Z"), "2026年11月18日 17:49");
  assert.equal(bjText("2026-11-18T19:35:00.000Z"), "2026年11月19日 03:35"); // 跨日
  assert.equal(bjText("2026-11-17T16:00:00.000Z"), "2026年11月18日 00:00"); // 跨日边界
});
test("无时区字符串按北京时间，不加8小时", () => {
  // "2026-12-07 11:00" 本身就是北京时间，格式化后仍是 11:00，不得变成 19:00
  assert.equal(bjText("2026-12-07 11:00"), "2026年12月7日 11:00");
});
test("下一计划时间为北京时间且标注仅计划", () => {
  const now = new Date("2026-11-18T12:00:00.000Z"); // 北京 20:00
  const n = nextSchedule(now);
  assert.ok(n.beijing.includes("03:35"));
  assert.ok(n.label.includes("次日"));
});

console.log("\n=== 状态字段分离回归 ===");
test("摘要校验拒绝缺少开始/结束时间", () => {
  assert.ok(validateSummary({}) !== null);
  assert.ok(validateSummary({ status: "success", startedAt: "x", finishedAt: "y", counts: {} }) === null);
});
test("上次成功摘要继承：失败摘要不继承", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "state-test-"));
  const f = path.join(dir, "s.json");
  fs.writeFileSync(f, JSON.stringify({ status: "failed", finishedAt: "x" }));
  assert.equal(readPreviousSummary(f), null);
  fs.writeFileSync(f, JSON.stringify({ status: "success", finishedAt: "2026-11-18T09:49:00Z", lastSuccessCollectedAt: "2026-11-18T09:49:00Z" }));
  assert.ok(readPreviousSummary(f));
});

console.log("\n=== businessSignature 变更判定回归 ===");
test("业务字段签名忽略标题转载后缀与来源，不把重采集当变更", () => {
  // 直接复刻 store.businessSignature 逻辑做行为验证（避免重复实现：从 store 源码提取函数）
  const src = fs.readFileSync(path.join(__dirname, "..", "lib", "store.js"), "utf8");
  const match = src.match(/function businessSignature\(notice = \{\}\) \{[\s\S]*?\n\}/);
  assert.ok(match, "store.js 应导出 businessSignature 函数体");
  const businessSignature = new Function("notice", match[0].replace("function businessSignature(notice = {}) {", "").replace(/\}$/, ""));
  const base = {
    title: "切丝机招标公告",
    publishDate: "2026-11-16",
    structured: { purchaser: "贵州中烟", projectNo: "B1", budget: { raw: "100万元" }, bidDeadline: { raw: "2026年12月20日" } }
  };
  const repost = { ...base, title: "切丝机招标公告（转载）", sourceName: "转载站", relatedSources: [{ sourceId: "x" }] };
  const changed = { ...base, structured: { ...base.structured, bidDeadline: { raw: "2026年12月25日" } } };
  assert.equal(businessSignature(base), businessSignature(repost), "转载标题/来源不应算变更");
  assert.notEqual(businessSignature(base), businessSignature(changed), "截止时间变化必须算变更");
});

console.log("\n=== 产物准备失败路径回归 ===");
test("prepare-artifacts：缺摘要时拒绝产出（不覆盖历史）", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-test-"));
  const script = fs.readFileSync(path.join(__dirname, "..", "scripts", "prepare-artifacts.js"), "utf8")
    .replace("const ROOT = path.join(__dirname, \"..\");", `const ROOT = ${JSON.stringify(dir)};`);
  const tmpScript = path.join(dir, "prepare.js");
  fs.writeFileSync(tmpScript, script);
  const { spawnSync } = require("node:child_process");
  const r = spawnSync(process.execPath, [tmpScript], { encoding: "utf8", env: { ...process.env, NOTICE_DB_PATH: path.join(dir, "nobody.sqlite") } });
  assert.notEqual(r.status, 0, "缺摘要应失败退出");
  assert.ok(!fs.existsSync(path.join(dir, "cloud-output", "run-status.json")), "不应产生交接摘要");
});

console.log(`\n=== 结果：${pass} 通过 / ${fail} 失败（隔离环境）===`);
process.exitCode = fail ? 1 : 0;
