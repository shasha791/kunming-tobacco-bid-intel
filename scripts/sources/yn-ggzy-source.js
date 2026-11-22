"use strict";
const { HttpClient } = require("../../lib/http-client");
const { stripHtml, readText, toIso } = require("../../lib/text-utils");

const SOURCE = require("../../config/sources.json").sources.find((s) => s.sourceId === "yn-ggzy");
const KEYWORDS = require("../../config/keywords.json").tobaccoContext.buyer;

const API_BASE = "https://ggzy.yn.gov.cn/ynggfwpt-home-api";

function normalizeDate(value) {
  const text = readText(value);
  if (/^\d{14}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  const match = text.match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/);
  if (!match) return "未披露";
  const parts = match[0].match(/\d+/g) || [];
  return `${parts[0]}-${String(parts[1]).padStart(2, "0")}-${String(parts[2]).padStart(2, "0")}`;
}

function isTobaccoRelated(item) {
  const text = `${readText(item.bulletintitle)} ${readText(item.purchaseprojectname)}`;
  // 用烟草语境过滤综合平台噪声；不把大量无关信息当作烟草机械商机
  return KEYWORDS.some((k) => text.includes(k)) || /切丝机|切梗|烟机|制丝/.test(text);
}

function createYnGgzySource(options = {}) {
  const client = options.httpClient || new HttpClient(options.httpOptions);
  const cfg = SOURCE;

  async function collect() {
    const items = [];
    const stats = { listPageCount: 0, detailAttemptCount: 0, filteredNoise: 0 };
    const endpoints = cfg.endpoints || [];
    for (const endpoint of endpoints) {
      for (let page = 1; page <= (cfg.maxPagesPerEndpoint || 2); page += 1) {
        const result = await client.fetchJson(`${API_BASE}${endpoint.list}`, {
          method: "POST",
          body: { pageNum: page, pageSize: cfg.pageSize || 30 },
          headers: { "content-type": "application/json" },
          tag: `yn-ggzy:${endpoint.label}:p${page}`
        });
        if (!result.ok || result.json?.code !== "1") break;
        stats.listPageCount += 1;
        const rows = result.json?.value?.list || [];
        if (!rows.length) break;
        for (const row of rows) {
          const title = readText(row.bulletintitle);
          if (!isTobaccoRelated(row)) { stats.filteredNoise += 1; continue; }
          stats.detailAttemptCount += 1;
          const detailResult = await client.fetchJson(`${API_BASE}${endpoint.detail}?guid=${encodeURIComponent(row.guid)}`, {
            tag: "yn-ggzy:detail"
          });
          let fullText = "";
          if (detailResult.ok && detailResult.json?.code === "1") {
            const value = detailResult.json.value || {};
            fullText = stripHtml(value.bulletincontent || value.content || title);
          }
          items.push({
            sourceId: cfg.sourceId,
            sourceName: cfg.sourceName,
            sourceType: "official",
            sourcePriority: 70,
            sourceUrl: cfg.urls.home,
            detailUrl: `https://ggzy.yn.gov.cn/#/detail?guid=${row.guid}`,
            originalOfficialUrl: `https://ggzy.yn.gov.cn/#/detail?guid=${row.guid}`,
            title,
            publishDate: normalizeDate(row.bulletinstarttime || row.createTime),
            fullText: fullText || title,
            content: (fullText || title).slice(0, 2000),
            noticeType: endpoint.label,
            province: "云南",
            city: readText(row.secondAreaName || row.areaName, "待核实"),
            projectNo: readText(row.purchaseprojectcode, "未披露"),
            attachments: [],
            discoveredAt: toIso(new Date())
          });
          if (items.length >= (cfg.maxDetails || 30)) break;
        }
        if (items.length >= (cfg.maxDetails || 30)) break;
      }
      if (items.length >= (cfg.maxDetails || 30)) break;
    }
    return { items, stats };
  }

  return { sourceId: cfg.sourceId, collect, client };
}

module.exports = { createYnGgzySource, isTobaccoRelated, normalizeDate };
