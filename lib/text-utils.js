"use strict";
const crypto = require("node:crypto");

function readText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || fallback;
}

function hashText(text) {
  return crypto.createHash("sha256").update(String(text || "")).digest("hex");
}

function normalizeText(text) {
  return readText(text).replace(/[\s\u3000]/g, "").replace(/[（）()【】\[\]"'"']/g, "");
}

function toIso(date) {
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeDateTime(raw = "") {
  const text = readText(raw);
  const match = text.match(/(20\d{2})[年\-/\.](\d{1,2})[月\-/\.](\d{1,2})日?(?:\s*(\d{1,2})[:：时点](\d{1,2})?)?/);
  if (!match) return "";
  const [, year, month, day, hour, minute] = match;
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!hour) return date;
  return `${date} ${String(hour).padStart(2, "0")}:${String(minute || "00").padStart(2, "0")}`;
}

function parseMoney(raw = "") {
  const text = readText(raw).replace(/[,，]/g, "");
  const match = text.match(/(\d+(?:\.\d+)?)\s*(亿元|万元|万|元)/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  if (match[2] === "亿元") return Math.round(value * 100000000 * 100) / 100;
  if (/万/.test(match[2])) return Math.round(value * 10000 * 100) / 100;
  return value;
}

function extractLabeled(text, labels, maxLength = 120) {
  const sorted = [...labels].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`(?:${escaped})\\s*(?:\\([^)]*\\)|（[^）]*）)?\\s*[:：]?\\s*([^\\n；;。]{1,${maxLength}})`);
  const match = readText(text).match(pattern);
  return match ? match[1].trim() : "";
}

function provinceOf(text = "") {
  const provinces = ["北京", "天津", "上海", "重庆", "河北", "山西", "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "海南", "四川", "贵州", "云南", "陕西", "甘肃", "青海", "内蒙古", "广西", "西藏", "宁夏", "新疆", "香港", "澳门", "台湾"];
  for (const p of provinces) if (text.includes(p)) return p.includes("内蒙古") ? "内蒙古" : /[省市自治区]$/.test(p) ? p : p;
  return "待核实";
}

module.exports = { readText, hashText, normalizeText, toIso, stripHtml, sleep, unique, normalizeDateTime, parseMoney, extractLabeled, provinceOf };
