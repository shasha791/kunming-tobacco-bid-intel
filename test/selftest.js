"use strict";
/**
 * 自动化验收测试（独立测试目录）。
 * 所有虚构样例仅存在于本文件内存与临时数据库，不写入正式数据、网站构建或推送流程。
 * 运行：node test/selftest.js
 */
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const { processNotice, strongTermHits, hasTobaccoContext, detectStage } = require("../lib/rules");
const { scoreNotice } = require("../lib/scoring");
const { assignNotice } = require("../lib/assign");
const { shouldPush, buildMessage } = require("../lib/notify");
const { sameProject, isChangeNotice, Store } = require("../lib/store");

let pass = 0; let fail = 0;
function test(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); pass += 1; }
  catch (e) { console.error(`  FAIL  ${name}: ${e.message}`); fail += 1; }
}
const now = new Date("2026-11-18T12:00:00+08:00");
function mk(title, body, extra = {}) {
  return processNotice({
    title, publishDate: "2026-11-18", fullText: body, bodyText: body,
    sourceId: "test-source", sourceName: "测试临时源", sourceType: "official", detailUrl: "test://notice",
    ...extra
  });
}

console.log("\n=== 分类验收（A/B/C/D/E）===");
test("A：明确相关商机（切丝机+中烟+有效截止）", () => {
  const n = mk("贵州中烟遵义卷烟厂切丝机大修公开招标公告", "招标项目所在地区：贵州省遵义市\n招标项目编号：B202601BA0000000001\n招标内容与范围：烟草切丝机大修，含刀辊。\n项目规模：120万元。\n递交截止时间：2026年12月20日10时00分00秒\n特定资格要求：ISO9001。", { purchaser: "贵州中烟工业有限责任公司遵义卷烟厂" });
  assert.equal(n.category, "A"); assert.equal(n.validity, "当前有效"); assert.equal(n.isActionable, true);
});
test("B：潜在相关待核实（弱词+行业+设备语境）", () => {
  const n = mk("某卷烟厂制丝设备维修服务竞争性磋商公告", "招标项目所在地区：贵州省\n采购内容：制丝车间切丝设备维修保养服务。预算未披露。");
  assert.equal(n.category, "B");
});
test("C：中标结果（公司名仅出现在中标结果，非新商机）", () => {
  const n = mk("某卷烟厂切梗丝机维修项目中标结果公告", "招标编号：C1。中标人：昆明烟机集团二机有限公司。中标金额：35.84万元。", { purchaser: "山东中烟工业有限责任公司" });
  assert.equal(n.category, "C"); assert.equal(n.isActionable, false); assert.equal(n.validity, "历史追踪");
});
test("D：本公司采购动态（采购方为本公司）", () => {
  const n = mk("昆明烟机集团二机有限公司刀具采购询价公告", "我公司采购刀具一批。", { purchaser: "昆明烟机集团二机有限公司" });
  assert.equal(n.category, "D"); assert.equal(n.isActionable, false);
});
test("E：通用词误命中（食堂切丝机/厨房刀片）", () => {
  const n = mk("某单位食堂切丝机及厨房刀片采购公告", "采购厨房用切丝机和刀片一批，用于职工食堂。");
  assert.equal(n.category, "E");
});
test("E：烟草企业后勤采购不因采购方属烟草行业得高分", () => {
  const n = mk("某中烟工业公司职工食堂食材配送及保安服务采购公告", "采购食堂食材配送与保安服务，与设备无关。", { purchaser: "某中烟工业公司" });
  assert.equal(n.category, "E");
});
test("通用词无烟草语境不判商机", () => {
  assert.equal(hasTobaccoContext("采购切丝设备与刀片一批").has, false);
  assert.equal(strongTermHits("采购切丝设备与刀片一批").length, 0);
});

console.log("\n=== 本次真实提取错误回归检查 ===");
test("项目编号只保存纯编号，不混入正文", () => {
  const n = mk("四川中烟西昌卷烟厂切梗丝机配套改造招标公告", "一、招标条件 本招标项目 （招标项目编号： B202601BA2001886822701 ），已由项目审批/核准/备案机关批准，项目资金来源为 企业自筹 ，招标人为 四川中烟工业有限责任公司西昌卷烟厂 。");
  assert.equal(n.structured.projectNo, "B202601BA2001886822701");
  assert.ok(n.structured.projectNo.length < 40);
});
test("采购单位纯名称，不含多余的'为'", () => {
  const n = mk("四川中烟西昌卷烟厂切丝机招标公告", "招标人为 四川中烟工业有限责任公司西昌卷烟厂 。招标代理机构：四川思渠国际招标有限公司 。");
  assert.ok(n.structured.purchaser.includes("西昌卷烟厂"));
  assert.ok(!n.structured.purchaser.startsWith("为"));
  assert.ok(!n.structured.purchaser.includes("："));
});
test("代理机构纯名称，不含入驻规则/导航/客服电话", () => {
  const n = mk("切丝机招标公告", "首页 招采公告 平台规则 客服热线400-903-3236\n招标代理机构：四川思渠国际招标有限公司 。");
  assert.equal(n.structured.agency, "四川思渠国际招标有限公司");
});
test("采购内容不含网站页头", () => {
  const n = mk("切丝机招标公告", "货物招标 - 中烟电子采购平台 首页 招采公告 客服热线\n招标内容与范围： 2.1购置一台烟草切丝机，详见第五章。");
  assert.ok(n.structured.content.includes("切丝机"));
  assert.ok(!n.structured.content.includes("中烟电子采购平台"));
});
test("产品类别为中文，不显示 machine", () => {
  const n = mk("贵州中烟切丝机招标公告", "招标项目所在地区：贵州省\n采购烟草切丝机一台。递交截止时间：2026年12月20日10时00分00秒");
  assert.ok(/整机|维修|零配件|型号/.test(n.productCategory));
  assert.notEqual(n.productCategory, "machine");
});
test("地区以项目实施地为主，不因代理机构在北京归为北京", () => {
  const n = mk("切丝机招标公告", "招标项目所在地区： 四川省凉山彝族自治州\n招标代理机构：北京某某招标有限公司（地址：北京市朝阳区）");
  assert.equal(n.structured.province, "四川");
  assert.equal(n.structured.city, "凉山彝族自治州");
});
test("四类时间分别提取且北京时间", () => {
  const n = mk("切丝机招标公告", "获取时间： 2026年11月17日00时00分00秒---2026年11月24日17时00分00秒\n递交截止时间： 2026年12月07日11时00分00秒\n开标时间： 2026年12月07日11时00分00秒");
  assert.equal(n.structured.fileAcquireDeadline.normalized, "2026-11-24 17:00");
  assert.equal(n.structured.bidDeadline.normalized, "2026-12-07 11:00");
  assert.equal(n.structured.bidOpeningTime.normalized, "2026-12-07 11:00");
});
test("未披露与提取待核实区分", () => {
  const a = mk("切丝机招标公告", "采购切丝机一台。");
  const b = mk("切丝机招标公告", "采购切丝机一台，预算详见招标文件。");
  assert.equal(a.structured.fieldMeta.budget.status, "未披露");
  assert.equal(b.structured.fieldMeta.budget.status, "提取待核实");
});

console.log("\n=== 字段结构化与评分 ===");
test("不同截止时间分别存储、金额单位规范化", () => {
  const n = mk("切丝机采购招标公告", "报名截止时间：2026年11月25日\n投标保证金：2万元\n项目规模：120万元\n递交截止时间：2026年12月05日09时30分00秒\n开标时间：2026年12月05日10时00分00秒");
  assert.equal(n.structured.budget.valueYuan, 1200000);
  assert.equal(n.structured.depositValueYuan, 20000);
  assert.notEqual(n.structured.signupDeadline.normalized, n.structured.bidDeadline.normalized);
});
test("六维齐全合计100、未知不放大", () => {
  const n = mk("切丝机招标公告", "中烟切丝机采购。");
  const s = scoreNotice(n, { now }).score;
  assert.equal(s.dimensions.length, 6);
  assert.equal(s.dimensions.reduce((a, d) => a + d.max, 0), 100);
  for (const d of s.dimensions) if (d.unknown) assert.equal(d.score, null);
});
test("信息不足进入待核实", () => {
  assert.equal(scoreNotice(mk("切丝机招标公告", "中烟切丝机采购。"), { now }).score.priority.level, "X");
});

console.log("\n=== 阶段/去重/时间线（临时数据库）===");
test("结果类阶段标题优先识别", () => {
  assert.equal(detectStage("某公司切丝机采购项目-中标候选人公示", "某公司切丝机采购项目-中标候选人公示").noticeType, "中标结果");
  assert.equal(detectStage("切丝机采购变更公告", "切丝机采购变更公告").noticeType, "澄清变更");
});
test("同项目不同标段不混为一条", () => {
  const a = mk("切丝机零配件采购包1招标公告", "招标项目编号：LOT1。标段编号：包1。");
  const b = mk("切丝机零配件采购包2招标公告", "招标项目编号：LOT1。标段编号：包2。");
  assert.notEqual(a.fingerprint, b.fingerprint);
});
test("关键变化识别", () => {
  assert.equal(isChangeNotice({ title: "切丝机采购延期公告", noticeType: "澄清变更" }), true);
  assert.equal(isChangeNotice({ title: "切丝机采购招标公告" }), false);
});
test("过期项目不进入可行动池", () => {
  const n = mk("切丝机招标公告", "中烟切丝机采购。递交截止时间：2020年01月01日00时00分00秒");
  assert.equal(n.validity, "已截止"); assert.equal(n.isActionable, false);
});
test("临时数据库：去重不重复计数", () => {
  const tmp = path.join(os.tmpdir(), `selftest-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  const store = new Store(tmp);
  try {
    const n = mk("切丝机招标公告", "招标项目编号：T1。中烟切丝机采购。递交截止时间：2026年12月20日10时00分00秒", { sourceId: "test-source", sourceName: "测试临时源" });
    assert.equal(store.upsertMany([n]).inserted, 1);
    assert.equal(store.upsertMany([{ ...n }]).duplicate, 1);
    assert.equal(store.listNotices().length, 1);
  } finally { store.close(); }
});

console.log("\n=== 分派与推送（模拟片区经理配置）===");
test("模拟片区经理：云南项目分派，非云南项目待分派", () => {
  const yn = mk("云南中烟切丝机整机购置招标公告", "招标项目所在地区：云南省\n采购烟草切丝机整机。", { province: "云南" });
  const ayn = assignNotice(yn);
  assert.equal(ayn.status, "已分派"); assert.ok(ayn.primary?.simulated === true);
  const gd = mk("广东中烟切丝机整机购置招标公告", "招标项目所在地区：广东省\n采购烟草切丝机整机。", { province: "广东" });
  const agd = assignNotice(gd);
  assert.equal(agd.status, "待分派"); assert.equal(agd.primary, null);
});
test("E/D分类不推送", () => {
  const n = mk("食堂切丝机采购", "厨房切丝机", { province: "云南" });
  n.category = "E"; n.score = { confirmedScore: 80, unknownCount: 0 };
  assert.equal(shouldPush(n, { minScore: 0, acceptUnverifiedLeads: true, acceptKeyChanges: true }, null).ok, false);
});
test("关键变化不受评分阈值和信息不足限制", () => {
  const n = mk("切丝机采购延期公告", "延期"); n.isKeyChange = true; n.category = "A"; n.score = { confirmedScore: 0, unknownCount: 5 };
  assert.equal(shouldPush(n, { minScore: 90, acceptUnverifiedLeads: false, acceptKeyChanges: true }, null).ok, true);
});
test("推送消息含规定字段", () => {
  const n = mk("切丝机招标公告", "中烟切丝机采购，预算50万。", { province: "广东" });
  n.assignment = { primary: { name: "待配置" }, collaborators: [] };
  const m = buildMessage(n);
  for (const k of ["title", "purchaser", "content", "region", "stage", "score", "reason", "pendingItems", "deadlines", "owner", "recommendedAction", "originalUrl"]) assert.ok(k in m, `缺少字段 ${k}`);
});

console.log(`\n=== 结果：${pass} 通过 / ${fail} 失败（虚构样例仅在内存与临时库）===`);
process.exitCode = fail > 0 ? 1 : 0;
