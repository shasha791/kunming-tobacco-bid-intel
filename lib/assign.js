"use strict";
const config = require("../config/assignment.json");
const { readText } = require("./text-utils");

function productIdOf(notice) {
  const groups = notice.matchedStrong || [];
  const content = readText(notice.structured?.content || notice.fullText || "").slice(0, 600);
  // 零配件/服务优先于整机：标题含"切丝机零配件"时 machine 词也会命中，需按采购内容判定业务类别。
  const hasPartsIntent = /零配件|备件|刀片|砂轮|铜排链|耗材/.test(content) || groups.some((g) => g.group === "parts");
  const hasServiceIntent = /维修|大修|项修|改造|拆解|维保|升级/.test(content) || groups.some((g) => g.group === "services");
  if (hasPartsIntent) return "parts";
  if (hasServiceIntent) return "overhaul";
  if (groups.some((g) => g.group === "machine" || g.group === "models")) return "machine";
  return "machine";
}

function provinceOfNotice(notice) {
  return readText(notice.structured?.province, "待核实");
}

function matchesPerson(notice, person) {
  const province = provinceOfNotice(notice);
  const regionMatch = !person.regions?.length || person.regions.some((r) => province.includes(r) || r.includes(province));
  const product = productIdOf(notice);
  const productConfigured = Array.isArray(person.products) && person.products.length > 0;
  const modelConfigured = Array.isArray(person.models) && person.models.length > 0;
  const productMatch = !productConfigured || person.products.includes(product);
  const models = (notice.matchedModels || []).map((m) => m.model);
  // 型号未配置时不能视为"匹配所有型号"，否则技术支持会无条件匹配全部公告。
  const modelMatch = modelConfigured && models.some((m) => person.models.includes(m));
  // 若人员配置了产品范围但不包含该产品，且型号也未命中，则不匹配。
  const scopeMatch = !productConfigured
    ? modelMatch || !modelConfigured
    : productMatch || modelMatch;
  return regionMatch && scopeMatch;
}

function assignNotice(notice, options = {}) {
  const people = config.people || [];
  const override = (config.manualOverrides || []).find((o) => o.noticeId === (notice.id || notice.fingerprint));
  if (override) {
    const primary = people.find((p) => p.personId === override.primaryId);
    const collaborators = (override.collaboratorIds || []).map((id) => people.find((p) => p.personId === id)).filter(Boolean);
    return {
      primary: primary || null,
      collaborators,
      status: "人工调整",
      reason: "采用人工分派调整",
      matchedCount: 1 + collaborators.length
    };
  }

  const matched = people.filter((p) => matchesPerson(notice, p));
  if (matched.length === 0) {
    return { primary: null, collaborators: [], status: "待分派", reason: "无人匹配区域/产品条件", matchedCount: 0 };
  }
  const sorted = [...matched].sort((a, b) => (a.priority || 99) - (b.priority || 99));
  const primary = sorted[0];
  const collaborators = sorted.slice(1);
  return {
    primary,
    collaborators,
    status: "已分派",
    reason: matched.length > 1
      ? `多人匹配，按优先级取主负责人（priority=${primary.priority}），其余为协同`
      : "唯一匹配",
    matchedCount: matched.length
  };
}

function assignAll(notices) {
  const result = notices.map((notice) => ({ ...notice, assignment: assignNotice(notice) }));
  const assigned = result.filter((n) => n.assignment.primary).length;
  const pending = result.filter((n) => n.assignment.status === "待分派").length;
  const collaboration = result.filter((n) => n.assignment.collaborators?.length > 0).length;
  return { notices: result, summary: { assigned, pending, collaboration, total: result.length } };
}

module.exports = { assignNotice, assignAll, matchesPerson };
