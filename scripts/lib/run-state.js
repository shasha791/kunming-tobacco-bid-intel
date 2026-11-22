"use strict";
/**
 * 运行状态摘要：构建 / 校验 / 北京时间格式化。
 * 前端只读取安全摘要文件（不含密钥、联系方式、内部备注、数据库）。
 */
const fs = require("node:fs");
const path = require("node:path");

/** 北京时间 ISO 字符串（如 2026-11-18T03:35:00+08:00）对应的 Date */
function beijingDate(isoWithOffset) {
  const d = new Date(isoWithOffset);
  return Number.isNaN(d.getTime()) ? null : d;
}
/** 北京时间可读串 */
function bjText(iso, withYear = true) {
  const d = beijingDate(iso);
  if (!d) return "时间待核实";
  const bj = new Date(d.getTime() + 8 * 3600 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  const md = `${bj.getUTCMonth() + 1}月${bj.getUTCDate()}日`;
  const hm = `${p(bj.getUTCHours())}:${p(bj.getUTCMinutes())}`;
  return withYear ? `${bj.getUTCFullYear()}年${md} ${hm}` : `${md} ${hm}`;
}

/** 计划时间的北京时间 ISO（用于展示"下一计划时间"，仅为计划，不保证执行） */
function nextSchedule(now = new Date()) {
  const bj = new Date(now.getTime() + 8 * 3600 * 1000);
  const day = new Date(Date.UTC(bj.getUTCFullYear(), bj.getUTCMonth(), bj.getUTCDate()));
  const candidates = [
    { hour: 3, minute: 35, label: "主任务 03:35" },
    { hour: 6, minute: 35, label: "兜底 06:35" }
  ];
  for (const c of candidates) {
    const t = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), c.hour - 8, c.minute));
    if (t.getTime() > now.getTime()) {
      return { iso: t.toISOString(), beijing: bjText(t.toISOString()), label: c.label };
    }
  }
  const tomorrow = new Date(day.getTime() + 86400000);
  const t = new Date(Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 3 - 8, 35));
  return { iso: t.toISOString(), beijing: bjText(t.toISOString()), label: "主任务 03:35（次日）" };
}

/**
 * 读取上一次成功摘要（用于失败时继承"最后成功采集/发布时间"）。
 * 摘要不存在或损坏时返回 null，不伪造状态。
 */
function readPreviousSummary(file) {
  try {
    const s = JSON.parse(fs.readFileSync(file, "utf8"));
    if (s.status !== "success" && s.status !== "partial") return null;
    if (!s.finishedAt) return null;
    return s;
  } catch { return null; }
}

/** 校验摘要结构，损坏则返回错误原因 */
function validateSummary(s) {
  if (!s || typeof s !== "object") return "摘要不是对象";
  if (!["success", "partial", "failed"].includes(s.status)) return "status 无效";
  if (!s.startedAt || !s.finishedAt) return "缺少开始/结束时间";
  if (!s.counts || typeof s.counts !== "object") return "缺少统计";
  return null;
}

function emptyCounts() {
  return { fetched: 0, inserted: 0, updated: 0, duplicate: 0, mergedSources: 0, notices: 0, projects: 0 };
}

module.exports = { bjText, beijingDate, nextSchedule, readPreviousSummary, validateSummary, emptyCounts };
