"use strict";
const path = require("node:path");
const keywords = require("../config/keywords.json");
const profile = require("../config/business-profile.json");
const { readText, normalizeText, hashText, toIso, normalizeDateTime, parseMoney, extractLabeled, provinceOf, unique } = require("./text-utils");

const RULE_VERSION = keywords.ruleVersion;

function sourceText(notice = {}) {
  return [
    notice.title, notice.projectName, notice.purchaser, notice.buyerName,
    notice.province, notice.city, notice.noticeType, notice.stage,
    notice.summary, notice.content, notice.fullText
  ].map((v) => readText(v)).filter(Boolean).join(" ");
}

function findHits(text, words = []) {
  if (!Array.isArray(words)) return [];
  return words.filter((w) => typeof w === "string" && w.trim() && text.includes(w));
}

function matchStageRules(text = "") {
  // 结果/终止/变更类关键词优先于"招标公告"，避免正文含"公开招标"就误判阶段。
  const priority = ["终止流标", "中标结果", "合同公告", "澄清变更"];
  const ordered = [
    ...keywords.noticeStages.filter((r) => priority.includes(r.type)),
    ...keywords.noticeStages.filter((r) => !priority.includes(r.type))
  ];
  for (const rule of ordered) {
    const hits = rule.keywords.filter((k) => text.includes(k));
    if (hits.length) return { noticeType: rule.type, stage: rule.stage, hits };
  }
  return null;
}

function detectStage(text = "", title = "") {
  // 标题是公告阶段的权威来源（公告标题通常以"招标公告/结果公告/中标候选人公示"结尾）
  const fromTitle = title ? matchStageRules(title) : null;
  if (fromTitle) return fromTitle;
  return matchStageRules(text) || { noticeType: "待核实", stage: "待核实", hits: [] };
}

function strongTermHits(text) {
  const groups = keywords.productTerms.strong;
  const result = [];
  for (const [group, words] of Object.entries(groups)) {
    if (group === "note") continue;
    const hits = findHits(text, words);
    if (hits.length) result.push({ group, hits });
  }
  return result;
}

function weakTermHits(text) {
  const groups = keywords.productTerms.weak;
  const result = [];
  for (const [group, words] of Object.entries(groups)) {
    if (group === "note") continue;
    const hits = findHits(text, words);
    if (hits.length) result.push({ group, hits });
  }
  return result;
}

function hasTobaccoContext(text) {
  const buyer = findHits(text, keywords.tobaccoContext.buyer);
  const usage = findHits(text, keywords.tobaccoContext.usage);
  return { has: buyer.length > 0 || usage.length > 0, buyer, usage };
}

function hasDeviceContext(text) {
  return findHits(text, keywords.deviceContext.terms);
}

function exclusionHits(text) {
  const result = {};
  for (const [group, words] of Object.entries(keywords.exclusions)) {
    if (group === "note") continue;
    const hits = findHits(text, words);
    if (hits.length) result[group] = hits;
  }
  return result;
}

function isOwnCompanyPurchase(notice) {
  // 仅以采购方/招标人为准判定"本公司采购动态"。
  // 公司名称出现在中标结果/供应商名单中不代表本公司采购，应归 C 类历史追踪。
  const purchaserText = [readText(notice.purchaser), readText(notice.structured?.purchaser)].filter(Boolean).join(" ");
  const names = [profile.company.name, ...profile.company.aliases].map((n) => readText(n)).filter((n) => n && n.length > 2);
  return findHits(purchaserText, names);
}

function detectModels(text) {
  const hits = [];
  for (const m of profile.models) {
    if (text.includes(m.model)) hits.push({ model: m.model, status: m.status, basis: m.basis });
  }
  return hits;
}

// 字段状态：disclosed=原文披露并提取成功；undisclosed=原文明示没有/未披露；extract-pending=正文有相关栏目但未成功提取
const NOT_DISCLOSED = "未披露";
const EXTRACT_PENDING = "提取待核实";

/** 从单行正文中严格取"标签：值"，止于换行/下一标签/句号/括号备注，避免混入后续正文。 */
function grabAfter(text, labels, maxLen = 120) {
  const lines = readText(text, "").split("\n");
  for (const line of lines) {
    for (const label of labels) {
      // 找该标签在行中的所有位置，取第一个后面紧跟冒号的（跳过"开标时间及地点"这类标题）
      let from = 0;
      let matched = "";
      while (true) {
        const idx = line.indexOf(label, from);
        if (idx < 0) break;
        const after = line.slice(idx + label.length);
        from = idx + label.length;
        if (!/^\s*[:：]/.test(after)) continue;
        let rest = after.replace(/^\s*[:：]\s*/, "");
        // 止于下一个字段标签
        const nextLabel = rest.search(/\s(?:获取方法|递交方法|开标地点|项目名称|招标项目编号|项目编号|招标人|招标代理机构|地址|联系人|电话|电子邮件|项目规模|招标内容与范围|资格要求|一般资格要求|特定资格要求|投标保证金|保证金|获取时间|递交截止时间|开标时间|数量|技术要求)[:：]/);
        if (nextLabel >= 0) rest = rest.slice(0, nextLabel);
        // 止于句号（保留数字中的点）
        const period = rest.search(/。(?!\d)/);
        if (period >= 0) rest = rest.slice(0, period);
        matched = readText(rest).slice(0, maxLen);
        break;
      }
      if (matched) return matched;
    }
  }
  return "";
}

function field(value, evidence, status) {
  return { value: value || NOT_DISCLOSED, evidence: evidence || "", status: status || NOT_DISCLOSED };
}

/** 只保留编号 token，去除混入的正文（如"本项目已具备招标条件…"） */
function pickProjectNo(raw) {
  const text = readText(raw);
  if (!text) return "";
  // 优先匹配常见编号形态：字母+数字组合（含中烟 C/B 开头长编号）
  const m = text.match(/\b([A-Z]{1,4}\d{8,}[A-Z0-9]*)\b/) || text.match(/\b([A-Z0-9]{6,24})\b/);
  if (m) return m[1];
  // 提取到过长的文本说明混入正文，不采信
  if (text.length > 40) return "";
  return /^[\w\-—]+$/.test(text) ? text : "";
}

/** 从"九、联系方式"区段精确提取招标人/代理机构名称（纯名称，不含地址电话） */
function pickContactNames(bodyText) {
  const result = { purchaser: "", agency: "" };
  const contactSection = readText(bodyText).split(/九、联系方式|十、联系方式/)[1] || "";
  if (!contactSection) return result;
  const buyer = contactSection.match(/招标人[:：]\s*([^\s，,。；;]+)/);
  const agency = contactSection.match(/招标代理机构[:：]\s*([^\s，,。；;]+)/);
  if (buyer) result.purchaser = buyer[1].trim();
  if (agency) result.agency = agency[1].trim();
  return result;
}

/** 项目实施地：优先"招标项目所在地区"/"服务地点"/"项目实施地点"，不用采购单位或代理机构所在地 */
function pickProjectLocation(bodyText, notice) {
  const text = readText(bodyText);
  for (const label of ["招标项目所在地区", "项目实施地点", "项目所在地", "服务地点", "交货地点"]) {
    const m = text.match(new RegExp(label + "[:：]\\s*([^\\n\\s，,。；;]{2,40})"));
    if (m) return readText(m[1]);
  }
  return readText(notice.province, "") || "";
}

/**
 * 从干净正文中提取结构化字段。
 * @param notice 公告记录（含 bodyText 则为纯净正文）
 * @param fullText 回退正文
 */
function extractStructuredFields(notice, fullText) {
  // 只用公告正文，不含站点导航/页头/页脚/客服
  const bodyText = readText(notice.bodyText) || readText(fullText);
  const text = bodyText;
  const evidenceOf = (label, raw) => raw ? `${label}：${readText(raw).slice(0, 80)}` : "";

  // 项目编号（只保留 token）
  const projectNoRaw = extractLabeled(text, ["招标项目编号", "项目编号", "招标编号", "采购项目编号", "采购编号"], 120);
  const projectNo = pickProjectNo(projectNoRaw);
  const lotRaw = extractLabeled(text, ["标段编号", "包号", "标包号"], 40);

  // 采购单位 / 代理机构（联系方式区，纯名称）
  const names = pickContactNames(text);
  // 回退：正文"招标人为 X" / "采购人为 X"
  const buyerInline = readText(text).match(/(?:招标人|采购人|采购单位)[为是]?\s*([^\s，,。；;（(]{2,40}?(?:公司|厂|中心|局|院|大学|集团))/);
  // 回退2：从公告标题提取采购单位，贪婪取到"卷烟厂/有限责任公司/公司"等完整名称
  const titleText = readText(notice.title);
  const titleBuyer = titleText.match(/^([\u4e00-\u9fa5A-Za-z0-9（）()]{2,40}?(?:卷烟厂|有限责任公司|有限公司|烟草公司))/)
    || titleText.match(/^([\u4e00-\u9fa5A-Za-z0-9（）()]{2,40}?集团)/);
  // 结果公告正文无"招标人"字段时，标题比正文模糊匹配更可靠；bid 公告用正文招标人
  const purchaser = names.purchaser || (titleBuyer ? titleBuyer[1] : (buyerInline ? buyerInline[1] : readText(notice.purchaser, "")));
  const agency = names.agency || extractLabeled(text, ["招标代理机构", "采购代理机构"], 60);

  // 地区：项目实施地优先；无明确项目所在地时用采购单位名推断，不扫描全文（避免误取其他省份）
  const location = pickProjectLocation(text, notice);
  const province = provinceOf(location) !== "待核实" ? provinceOf(location)
    : provinceOf(purchaser) !== "待核实" ? provinceOf(purchaser)
    : provinceOf(text) !== "待核实" ? provinceOf(text) : EXTRACT_PENDING;
  // 市/州：去掉省名前缀，只保留下级行政区
  let city = location || NOT_DISCLOSED;
  for (const p of ["云南省", "四川省", "贵州省", "广东省", "山东省", "湖南省", "河南省", "陕西省", "吉林省", "河北省", "江苏省", "浙江省", "福建省", "湖北省", "安徽省", "江西省", "广西壮族自治区", "内蒙古自治区", "广西壮族自治区", "重庆市", "北京市", "上海市", "天津市", "广西", "重庆", "北京", "上海", "天津"]) {
    if (city.startsWith(p)) {
      const rest = city.slice(p.length);
      // 直辖市或仅剩行政后缀时保留原始名称，不截成"市"
      city = (!rest || /^(市|省|自治区|彝族自治州|自治州)/.test(rest)) ? p : rest;
      break;
    }
  }

  // 时间：报名 / 招标文件获取 / 投标截止 / 开标 分别提取，统一北京时间
  const signupRaw = grabAfter(text, ["报名截止时间", "报名截止"], 100);
  // 招标文件获取时间区间："获取时间：2026年11月17日00时00分00秒---2026年11月24日17时00分00秒"
  const fileAcquireRaw = grabAfter(text, ["获取时间", "招标文件获取时间", "获取招标文件时间", "文件获取时间"], 120);
  const fileAcquireEnd = fileAcquireRaw ? (fileAcquireRaw.match(/[-–—~至]{1,3}\s*(20\d{2}年[^\s]{1,30})/) || [])[1] || "" : "";
  const bidDeadlineRaw = grabAfter(text, ["递交截止时间", "投标截止时间", "提交投标文件截止时间", "响应文件提交截止时间", "递交投标文件截止时间"], 120);
  const openRaw = grabAfter(text, ["开标时间"], 120);

  // 金额：预算/规模 / 中标 / 单价 / 保证金
  const budgetRaw = grabAfter(text, ["项目规模", "预算金额", "项目预算", "最高限价", "采购预算", "预算", "采购金额"], 80);
  const winningRaw = grabAfter(text, ["中标金额", "成交金额", "中标总价", "含税中标总价", "含增值税中标总价", "不含增值税中标总价"], 80);
  const unitPriceRaw = grabAfter(text, ["单价", "单价限价"], 80);
  const depositRaw = grabAfter(text, ["投标保证金", "履约保证金", "保证金"], 80);
  const qualificationRaw = grabAfter(text, ["特定资格要求", "资格要求", "供应商资格", "投标人资格", "申请人资格要求"], 120);

  // 采购内容 / 技术要求：优先"招标内容与范围"，不用站点页头
  const contentRaw = grabAfter(text, ["招标内容与范围", "采购内容", "采购需求", "招标范围"], 300) || readText(notice.summary, "");
  const quantityRaw = grabAfter(text, ["采购数量", "数量"], 80);
  const techRaw = grabAfter(text, ["技术要求", "技术规格", "主要技术参数", "技术参数"], 200);

  function timeField(name, raw, fallbackRaw) {
    const source = raw || fallbackRaw || "";
    if (!source) return { raw: NOT_DISCLOSED, normalized: NOT_DISCLOSED, status: NOT_DISCLOSED, evidence: "", timezone: "北京时间" };
    const normalized = normalizeDateTime(source);
    // raw 只保留日期时间串作为证据，去除混入的后续说明
    const dateOnly = readText(source).match(/20\d{2}年\d{1,2}月\d{1,2}日(?:\d{1,2}时\d{1,2}分\d{1,2}秒)?(?:[-–—~至]{1,3}20\d{2}年\d{1,2}月\d{1,2}日\d{1,2}时\d{1,2}分\d{1,2}秒)?/);
    return {
      raw: dateOnly ? dateOnly[0] : readText(source).slice(0, 120),
      normalized: normalized || EXTRACT_PENDING,
      status: normalized ? "已披露" : EXTRACT_PENDING,
      evidence: evidenceOf(name, source),
      timezone: "北京时间"
    };
  }

  // 兼容模式：字段值保持字符串（供前端/下游直接使用），证据与状态放入 fieldMeta。
  const projectNoValue = projectNo || NOT_DISCLOSED;
  const purchaserValue = purchaser || NOT_DISCLOSED;
  const agencyValue = agency || NOT_DISCLOSED;
  const provinceValue = province || EXTRACT_PENDING;
  const fileAcquire = timeField("招标文件获取截止", fileAcquireEnd, fileAcquireRaw);

  const fieldMeta = {
    projectNo: { evidence: evidenceOf("招标项目编号", projectNoRaw), status: projectNo ? "已披露" : (projectNoRaw ? EXTRACT_PENDING : NOT_DISCLOSED) },
    lotNo: { evidence: evidenceOf("标段", lotRaw), status: lotRaw ? "已披露" : NOT_DISCLOSED },
    purchaser: { evidence: evidenceOf("招标人", purchaser), status: purchaser ? "已披露" : (buyerInline ? EXTRACT_PENDING : NOT_DISCLOSED) },
    agency: { evidence: evidenceOf("招标代理机构", agency), status: agency ? "已披露" : (text.includes("代理机构") ? EXTRACT_PENDING : NOT_DISCLOSED) },
    province: { evidence: evidenceOf("项目所在地区", location), status: location ? "已披露" : (notice.province ? "已披露" : EXTRACT_PENDING) },
    city: { evidence: evidenceOf("项目所在地区", location), status: location ? "已披露" : NOT_DISCLOSED },
    purchaserRegion: { evidence: "采购单位所在地（与项目实施地分列）", status: "单独处理" },
    agencyRegion: { evidence: "代理机构所在地（与项目实施地分列）", status: "单独处理" },
    qualification: { evidence: evidenceOf("资格要求", qualificationRaw), status: qualificationRaw ? "已披露" : (text.includes("资格要求") ? EXTRACT_PENDING : NOT_DISCLOSED) },
    deposit: { evidence: evidenceOf("保证金", depositRaw), status: depositRaw ? "已披露" : (text.includes("保证金") ? EXTRACT_PENDING : NOT_DISCLOSED) },
    budget: { evidence: evidenceOf("项目规模/预算", budgetRaw), status: budgetRaw ? "已披露" : (text.includes("万元") || text.includes("预算") ? EXTRACT_PENDING : NOT_DISCLOSED) },
    winningAmount: { evidence: evidenceOf("中标金额", winningRaw), status: winningRaw ? "已披露" : NOT_DISCLOSED },
    unitPrice: { evidence: evidenceOf("单价", unitPriceRaw), status: unitPriceRaw ? "已披露" : NOT_DISCLOSED },
    signupDeadline: timeField("报名截止", signupRaw),
    fileAcquireDeadline: fileAcquire,
    bidDeadline: timeField("投标截止", bidDeadlineRaw),
    bidOpeningTime: timeField("开标时间", openRaw),
    content: { evidence: evidenceOf("招标内容", contentRaw), status: contentRaw ? "已披露" : (notice.summary ? "已披露" : EXTRACT_PENDING) },
    quantity: { evidence: evidenceOf("数量", quantityRaw), status: quantityRaw ? "已披露" : NOT_DISCLOSED },
    techRequirement: { evidence: evidenceOf("技术要求", techRaw), status: techRaw ? "已披露" : NOT_DISCLOSED }
  };
  // 字符串值版本（时间字段用 normalized 值）
  fieldMeta._values = {
    signupDeadline: fieldMeta.signupDeadline.normalized,
    fileAcquireDeadline: fileAcquire.normalized,
    bidDeadline: fieldMeta.bidDeadline.normalized,
    bidOpeningTime: fieldMeta.bidOpeningTime.normalized
  };

  return {
    projectNo: projectNoValue,
    lotNo: pickProjectNo(lotRaw) || readText(lotRaw).slice(0, 20) || NOT_DISCLOSED,
    purchaser: purchaserValue,
    agency: agencyValue,
    province: provinceValue,
    city,
    purchaserRegion: provinceOf(purchaser) === "待核实" ? NOT_DISCLOSED : provinceOf(purchaser),
    agencyRegion: provinceOf(agency) === "待核实" ? NOT_DISCLOSED : provinceOf(agency),
    qualification: qualificationRaw || NOT_DISCLOSED,
    deposit: depositRaw || NOT_DISCLOSED,
    budget: { raw: budgetRaw || NOT_DISCLOSED, valueYuan: parseMoney(budgetRaw), nature: budgetRaw ? "预算/规模金额" : NOT_DISCLOSED },
    winningAmount: { raw: winningRaw || NOT_DISCLOSED, valueYuan: parseMoney(winningRaw) },
    unitPrice: { raw: unitPriceRaw || NOT_DISCLOSED, valueYuan: parseMoney(unitPriceRaw) },
    depositValueYuan: parseMoney(depositRaw),
    signupDeadline: { raw: signupRaw || NOT_DISCLOSED, normalized: fieldMeta._values.signupDeadline },
    fileAcquireDeadline: { raw: fileAcquireRaw || NOT_DISCLOSED, normalized: fileAcquire.normalized },
    bidDeadline: { raw: bidDeadlineRaw || NOT_DISCLOSED, normalized: fieldMeta._values.bidDeadline },
    bidOpeningTime: { raw: openRaw || NOT_DISCLOSED, normalized: fieldMeta._values.bidOpeningTime },
    content: contentRaw || readText(notice.summary, NOT_DISCLOSED),
    quantity: quantityRaw || NOT_DISCLOSED,
    techRequirement: techRaw || NOT_DISCLOSED,
    fieldMeta,
    bodyText: bodyText.slice(0, 4000)
  };
}

function classify(notice) {
  const text = sourceText(notice).replace(/<!--[\s\S]*?-->/g, " ");
  // 排除词只在标题和采购内容语境中判断，避免页面页脚/导航（如"培训""帮助中心"）误触发。
  const exclusionText = [readText(notice.title), readText(notice.summary), readText(notice.content), readText(notice.fullText).slice(0, 600)].join(" ");
  const stageInfo = detectStage(text, readText(notice.title));
  const own = isOwnCompanyPurchase({ ...notice, structured: notice.structured || extractStructuredFields(notice, readText(notice.fullText || notice.content || "")) });
  const excl = exclusionHits(text);
  const titleExcl = exclusionHits(readText(notice.title));
  const tobacco = hasTobaccoContext(text);
  const deviceHits = hasDeviceContext(text);
  const strong = strongTermHits(text);
  const weak = weakTermHits(text);
  const models = detectModels(text);
  const fields = extractStructuredFields(notice, readText(notice.fullText || notice.content || notice.summary, ""));

  const evidence = [];
  const pending = [];
  let category = "E";
  let reason = "";
  let productCategory = "无关";

  const strongCount = strong.reduce((n, g) => n + g.hits.length, 0);
  const modelVerified = models.filter((m) => m.status === "已核实");
  const modelPendingVerify = models.filter((m) => m.status === "待核实");
  const weakGenericService = weak.some((g) => g.group === "genericService");
  const weakGenericParts = weak.some((g) => g.group === "genericParts");
  const weakGenericMachine = weak.some((g) => g.group === "genericMachine");
  const hardExcl = excl.hard || [];
  const nonTobaccoCut = excl.nonTobaccoCutting || [];
  const medicalExcl = excl.medical || [];

  // D: 本公司采购动态（优先，独立于销售商机判断）
  if (own.length > 0) {
    category = "D";
    reason = `采购方/正文出现本公司名称：${own.join("、")}。归为本公司采购动态，不计入外部销售商机。`;
    evidence.push(`本公司名称命中：${own.join("、")}`);
  }
  // E: 硬排除（非烟草机械语境的通用误命中）
  else if (
    (titleExcl.hard?.length > 0 || titleExcl.nonTobaccoCutting?.length > 0 || titleExcl.medical?.length > 0)
    || (strongCount === 0 && (hardExcl.length > 0 || nonTobaccoCut.length > 0 || medicalExcl.length > 0))
  ) {
    category = "E";
    const exWords = [
      ...(titleExcl.hard || []), ...(titleExcl.nonTobaccoCutting || []), ...(titleExcl.medical || []),
      ...(strongCount === 0 ? [...hardExcl, ...nonTobaccoCut, ...medicalExcl] : [])
    ];
    reason = `命中排除词且与烟草机械核心产品无关：${unique(exWords).join("、")}。`;
    evidence.push(`排除词：${unique(exWords).join("、")}`);
  }
  // 通用词但无烟草行业语境 → E（防止"食堂切丝机""厨房刀片"误命中）
  else if (strongCount === 0 && weak.length > 0 && !tobacco.has) {
    category = "E";
    reason = "仅命中宽泛/通用词（如切丝设备、刀片、维修），且无烟草行业语境，不判定为烟草机械商机。";
    evidence.push("无烟草行业语境");
    evidence.push(...weak.flatMap((g) => g.hits.map((h) => `通用词：${h}`)));
  }
  // C: 中标/历史结果（公司名称出现在中标结果不代表新销售机会）
  else if (/结果|中标|成交|合同/.test(stageInfo.stage) || /中标|成交|结果公示|结果公告/.test(stageInfo.noticeType)) {
    const hasProduct = strongCount > 0 || modelVerified.length > 0 || modelPendingVerify.length > 0 || (weak.length > 0 && tobacco.has && deviceHits.length > 0);
    category = hasProduct ? "C" : "E";
    reason = hasProduct
      ? "结果类公告且命中烟草机械产品语境，归为中标及历史项目追踪；出现公司名称不代表新销售机会。"
      : "结果类公告但未命中烟草机械产品语境，归为无关信息。";
    evidence.push(`公告阶段：${stageInfo.stage}/${stageInfo.noticeType}`);
    if (fields.winningAmount.raw !== "未披露") evidence.push(`中标金额：${fields.winningAmount.raw}`);
  }
  // A/B: 商机类
  else if (strongCount > 0 || modelVerified.length > 0 || modelPendingVerify.length > 0) {
    if (tobacco.has) {
      category = modelPendingVerify.length > 0 && strongCount === 0 && modelVerified.length === 0 ? "B" : "A";
      reason = modelPendingVerify.length > 0 && strongCount === 0 && modelVerified.length === 0
        ? "命中待核实型号，行业语境成立但型号未经核实，进入待核实线索。"
        : "命中核心产品词/已核实型号且烟草行业语境成立，判为明确相关商机。";
      evidence.push(...strong.flatMap((g) => g.hits.map((h) => `${g.group}：${h}`)));
      evidence.push(...models.map((m) => `型号${m.model}（${m.status}）`));
      evidence.push(`行业语境：${unique([...tobacco.buyer, ...tobacco.usage]).join("、") || "命中"}`);
      const groupLabel = { machine: "整机设备", models: "型号设备", services: "维修/改造服务", parts: "专用零配件" };
      const primaryGroup = strong.find((g) => g.group === "machine")?.group
        || strong.find((g) => g.group === "models")?.group
        || strong.find((g) => g.group === "services")?.group
        || strong.find((g) => g.group === "parts")?.group;
      productCategory = groupLabel[primaryGroup] || "烟草机械";
      if (weakGenericService && !strong.some((g) => g.group === "services")) pending.push("通用服务词需确认是否属于切丝机/切梗机维保范围");
    } else {
      category = "B";
      reason = "命中核心产品词，但未明确烟草行业语境，进入待核实线索（避免泛化到所有机械制造）。";
      evidence.push(...strong.flatMap((g) => g.hits.map((h) => `${g.group}：${h}`)));
      pending.push("采购用途/采购单位是否为烟草行业待核实");
    }
  }
  // 弱词+烟草+设备语境 → B（数据库采购等泛提及不直接判A）
  else if (weak.length > 0 && tobacco.has && deviceHits.length > 0) {
    category = "B";
    reason = "仅命中宽泛/通用词，但有烟草行业+设备语境，判为潜在相关待核实线索。";
    evidence.push(...weak.flatMap((g) => g.hits.map((h) => `通用词：${h}`)));
    evidence.push(`行业语境：${unique([...tobacco.buyer, ...tobacco.usage]).join("、")}`);
    evidence.push(`设备语境：${deviceHits.join("、")}`);
    pending.push("是否属于切丝机/切梗机相关采购需人工核实");
    productCategory = "待核实设备";
  } else {
    category = "E";
    reason = "未命中烟草机械产品规则或行业语境，判为无关信息。";
    evidence.push("无有效产品/行业命中");
  }

  if (fields.budget.raw === "未披露") pending.push("预算未披露");
  if (fields.qualification === "未披露") pending.push("资格要求未披露");
  if (fields.bidDeadline.normalized === "未披露") pending.push("投标截止时间未披露");
  if (modelPendingVerify.length > 0) pending.push(`型号待核实：${modelPendingVerify.map((m) => m.model).join("、")}`);
  if (fields.deposit === "未披露") pending.push("保证金要求未披露");

  const isActionable = ["A", "B"].includes(category) && ["采购前", "招标中", "变更"].includes(stageInfo.stage);
  // 关键变化以标题为准（公告标题明确标注公告类型），避免正文页脚/引用误触发
  const keyChangeText = readText(notice.title) || text;
  const isKeyChange = keywords.keyChangeTypes.some((k) => keyChangeText.includes(k));

  // 有效性状态：区分当前有效机会 / 已截止 / 历史追踪 / 有效性待核实
  const now = Date.now();
  const stageActionable = ["A", "B"].includes(category) && ["采购前", "招标中", "变更"].includes(stageInfo.stage);
  const deadlineRaw = readText(fields.bidDeadline.normalized);
  let validity = "有效性待核实";
  let validityReason = "截止时间或状态无法确认，默认不视为可投标";
  const isResultStage = ["结果", "异常阶段"].includes(stageInfo.stage) || /中标|成交|结果|终止|流标|废标/.test(stageInfo.noticeType);
  if (isResultStage || category === "C") {
    validity = "历史追踪"; validityReason = "结果类/历史公告，不代表当前销售机会";
  } else if (/20\d{2}-\d{2}-\d{2}/.test(deadlineRaw)) {
    const deadline = new Date(deadlineRaw.replace(" ", "T") + (deadlineRaw.length <= 10 ? "T23:59:59+08:00" : "+08:00"));
    validity = deadline.getTime() >= now ? "当前有效" : "已截止";
    validityReason = deadline.getTime() >= now ? `投标截止时间 ${deadlineRaw}（北京时间）` : `投标截止时间 ${deadlineRaw} 已过`;
  } else if (category === "A" || category === "B") {
    validity = "有效性待核实"; validityReason = "未在正文中提取到可确认的投标截止时间，需回原文核实";
  }
  const actionable = stageActionable && validity === "当前有效";

  return {
    category,
    categoryLabel: { A: "明确相关商机", B: "潜在相关·待核实", C: "中标及历史追踪", D: "本公司采购动态", E: "无关或排除" }[category],
    classificationReason: reason,
    evidence: unique(evidence),
    pendingItems: unique(pending),
    stage: stageInfo.stage,
    noticeType: stageInfo.noticeType,
    stageEvidence: stageInfo.hits,
    isActionable: actionable,
    isKeyChange,
    validity,
    validityReason,
    productCategory,
    matchedStrong: strong,
    matchedWeak: weak,
    matchedModels: models,
    tobaccoContext: { buyer: tobacco.buyer, usage: tobacco.usage, has: tobacco.has },
    deviceContextHits: deviceHits,
    exclusionHits: excl,
    ownCompanyHit: own,
    structured: fields,
    ruleVersion: RULE_VERSION
  };
}

function fingerprint(notice) {
  const projectNo = readText(notice.structured?.projectNo || notice.projectNo, "未披露");
  const title = normalizeText(notice.title);
  const purchaser = normalizeText(notice.purchaser || notice.structured?.purchaser);
  const publish = readText(notice.publishDate, "未披露");
  const lot = normalizeText(notice.structured?.lotNo || notice.lotNo);
  // fingerprint 纳入公告阶段：同一项目的招标/延期/中标公告各自独立保留，
  // 通过 projectKey 关联时间线；同一阶段跨来源转载则指纹相同，走合并逻辑。
  const stagePart = `${readText(notice.noticeType, "")}|${readText(notice.stage, "")}`;
  const stable = projectNo !== "未披露"
    ? `${projectNo}|${lot}|${purchaser}|${stagePart}`
    : `${title}|${publish}|${purchaser}|${lot}|${stagePart}`;
  return hashText(stable || notice.detailUrl || `${notice.sourceId}|${notice.title}|${Date.now()}`).slice(0, 40);
}

function contentHash(notice) {
  return hashText(JSON.stringify({
    title: notice.title,
    publishDate: notice.publishDate,
    purchaser: notice.purchaser,
    noticeType: notice.noticeType,
    stage: notice.stage,
    category: notice.category,
    projectNo: notice.structured?.projectNo,
    lotNo: notice.structured?.lotNo,
    budget: notice.structured?.budget?.raw,
    bidDeadline: notice.structured?.bidDeadline?.raw,
    fullText: readText(notice.fullText).slice(0, 4000)
  })).slice(0, 40);
}

function processNotice(raw) {
  const fullText = readText(raw.fullText || raw.content || raw.summary || "");
  const classified = classify({ ...raw, fullText });
  const notice = {
    ...raw,
    title: readText(raw.title, "待核实公告"),
    publishDate: readText(raw.publishDate, "未披露"),
    fullText,
    firstSeenAt: readText(raw.firstSeenAt) || toIso(new Date()),
    lastSeenAt: toIso(new Date()),
    ...classified
  };
  notice.fingerprint = fingerprint(notice);
  notice.contentHash = contentHash(notice);
  notice.id = notice.fingerprint;
  return notice;
}

module.exports = { classify, processNotice, fingerprint, contentHash, RULE_VERSION, detectStage, strongTermHits, hasTobaccoContext, exclusionHits };
