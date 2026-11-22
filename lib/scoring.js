"use strict";
const scoringConfig = require("../config/scoring.json");
const profile = require("../config/business-profile.json");
const { readText } = require("./text-utils");

const RULE_VERSION = scoringConfig.ruleVersion;
const NOW = () => new Date();

function dim(id, score, max, evidence, flag, unknown) {
  return {
    id,
    label: scoringConfig.dimensions.find((d) => d.id === id)?.label || id,
    score,
    max,
    evidence: evidence || "未获取到证据",
    flag: flag || "",
    status: unknown ? "待确认" : (score > 0 ? "已确认" : "未命中"),
    unknown: Boolean(unknown)
  };
}

function daysRemaining(notice, now) {
  const raw = notice.structured?.bidDeadline?.normalized || notice.structured?.signupDeadline?.normalized || "";
  const match = readText(raw).match(/20\d{2}-\d{2}-\d{2}/);
  if (!match || match[0].includes("未披露")) return null;
  const deadline = new Date(`${match[0]}T23:59:59+08:00`);
  if (Number.isNaN(deadline.getTime())) return null;
  return Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
}

function scoreProductModelFit(notice) {
  const strong = notice.matchedStrong || [];
  const models = notice.matchedModels || [];
  const verified = models.filter((m) => m.status === "已核实");
  const pending = models.filter((m) => m.status === "待核实");
  const tobacco = notice.tobaccoContext?.has;
  const strongMachine = strong.some((g) => g.group === "machine");
  const strongModels = strong.some((g) => g.group === "models");

  if (tobacco && (strongMachine || verified.length > 0 || strongModels)) {
    const evidence = [
      ...strong.flatMap((g) => g.hits.map((h) => `${g.group}:${h}`)),
      ...verified.map((m) => `已核实型号:${m.model}`)
    ].join("；");
    return dim("productModelFit", 35, 35, evidence || "命中核心产品词");
  }
  if (tobacco && pending.length > 0) {
    return dim("productModelFit", 24, 35, `待核实型号:${pending.map((m) => m.model).join("、")}`, "型号待业务核实", true);
  }
  const weak = notice.matchedWeak || [];
  if (tobacco && weak.length > 0 && (notice.deviceContextHits || []).length > 0) {
    return dim("productModelFit", 12, 35, `宽泛词:${weak.flatMap((g) => g.hits).join("、")}；行业+设备语境成立`, "仅为线索，不判定产品适配");
  }
  return dim("productModelFit", 0, 35, "无适配产品证据");
}

function scoreServiceTechFit(notice) {
  const strong = notice.matchedStrong || [];
  const services = strong.find((g) => g.group === "services");
  const machine = strong.find((g) => g.group === "machine");
  const parts = strong.find((g) => g.group === "parts");
  const cap = profile.capabilityConfig;
  const configured = cap.status !== "待业务确认";

  if ((services || parts) && configured) {
    return dim("serviceTechFit", 20, 20, `采购内容属服务/零配件（${(services || parts).hits.join("、")}），公司能力已配置符合`);
  }
  if (services || parts || machine) {
    return dim("serviceTechFit", null, 20, `采购内容：${[...(services?.hits || []), ...(parts?.hits || []), ...(machine?.hits || [])].join("、")}`, "公司能力配置待业务确认，未知不计分", true);
  }
  return dim("serviceTechFit", null, 20, "未识别到明确服务/技术内容", "公司能力未配置", true);
}

function scoreQualificationFit(notice) {
  const qualification = readText(notice.structured?.qualification, "未披露");
  const cap = profile.capabilityConfig;
  const configured = cap.status !== "待业务确认";
  if (qualification === "未披露") {
    return dim("qualificationFit", null, 15, "公告未披露资格要求", "资格要求未披露，未知不计分", true);
  }
  if (!configured) {
    return dim("qualificationFit", null, 15, `公告资格要求：${qualification.slice(0, 80)}`, "公司资质比对未完成，未知不计分", true);
  }
  return dim("qualificationFit", 15, 15, "资格要求已与公司配置比对符合");
}

function scoreRegionFit(notice) {
  const regions = profile.capabilityConfig.regions;
  if (!regions || regions.status === "待业务确认" || !regions.value?.length) {
    return dim("regionFit", null, 10, `项目地区：${notice.structured?.province || "待核实"}/${notice.structured?.city || "待核实"}`, "公司服务半径未配置，未知不计分", true);
  }
  const province = notice.structured?.province || "";
  return regions.value.some((r) => province.includes(r))
    ? dim("regionFit", 10, 10, `项目地区${province}在服务范围内`)
    : dim("regionFit", 0, 10, `项目地区${province}不在已配置范围内`);
}

function scoreBudgetFit(notice) {
  const budget = notice.structured?.budget || { raw: "未披露" };
  const pref = profile.capabilityConfig.budgetPreference;
  if (budget.raw === "未披露") {
    return dim("budgetFit", null, 10, "预算未披露", "未知不计分", true);
  }
  if (!pref || pref.status === "待业务确认" || pref.min == null) {
    return dim("budgetFit", null, 10, `预算金额：${budget.raw}`, "预算偏好未配置，未知不计分", true);
  }
  const value = budget.valueYuan;
  if (value && value >= pref.min && (pref.max == null || value <= pref.max)) {
    return dim("budgetFit", 10, 10, `预算${budget.raw}在偏好区间内`);
  }
  return dim("budgetFit", 0, 10, `预算${budget.raw}不在偏好区间内`);
}

function scoreResponseTime(notice, now) {
  const days = daysRemaining(notice, now);
  if (days == null) {
    return dim("responseTime", null, 10, "截止时间未披露或无法解析", "未知不计分", true);
  }
  if (days < 0) return dim("responseTime", 0, 10, "截止时间已过", "过期项目不进入可行动商机池");
  if (days > 14) return dim("responseTime", 10, 10, `剩余${days}天`);
  if (days >= 7) return dim("responseTime", 7, 10, `剩余${days}天`);
  return dim("responseTime", 4, 10, `剩余${days}天`, "响应时间紧张");
}

function priorityFor(confirmed, unknownCount, notice) {
  if (notice.category === "D" || notice.category === "E") {
    return { level: "X", label: "不计入商机池", reason: `分类${notice.category}（${notice.categoryLabel}）` };
  }
  if (notice.category === "C") {
    return { level: "C", label: "历史追踪", reason: "结果类公告，非当前可行动商机" };
  }
  if (unknownCount >= 2 && confirmed < 65) {
    return { level: "X", label: "信息不足·待核实", reason: "未知维度≥2且已确认得分<65，不进入确定性高分推荐" };
  }
  for (const rule of scoringConfig.priorityThresholds) {
    if (rule.minScore != null && confirmed >= rule.minScore) {
      return { level: rule.level, label: rule.label, reason: `已确认得分${confirmed}≥${rule.minScore}` };
    }
  }
  return { level: "X", label: "待核实", reason: "未达到阈值" };
}

function scoreNotice(notice, options = {}) {
  const now = options.now || NOW();
  const dimensions = [
    scoreProductModelFit(notice),
    scoreServiceTechFit(notice),
    scoreQualificationFit(notice),
    scoreRegionFit(notice),
    scoreBudgetFit(notice),
    scoreResponseTime(notice, now)
  ];
  const confirmedScore = dimensions.reduce((n, d) => n + (d.unknown ? 0 : (d.score || 0)), 0);
  const unknownMax = dimensions.filter((d) => d.unknown).reduce((n, d) => n + d.max, 0);
  const unknownCount = dimensions.filter((d) => d.unknown).length;
  const priority = priorityFor(confirmedScore, unknownCount, notice);

  return {
    ...notice,
    score: {
      ruleVersion: RULE_VERSION,
      configStatus: scoringConfig.status,
      isDraft: true,
      scale: 100,
      confirmedScore,
      possibleMin: confirmedScore,
      possibleMax: confirmedScore + unknownMax,
      unknownDimensions: dimensions.filter((d) => d.unknown).map((d) => d.label),
      unknownCount,
      dimensions,
      priority,
      note: scoringConfig.notice,
      hasCompetitionEvidence: false,
      competitionNote: "暂无竞争度/废标风险的明确证据，不做量化"
    }
  };
}

module.exports = { scoreNotice, daysRemaining, RULE_VERSION };
