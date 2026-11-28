"use strict";
/**
 * 中烟采集分阶段诊断：本机 / GitHub Actions 用同一组关键词、同一采集逻辑运行。
 * 记录：HTTP 状态、搜索页解析条数、详情解析条数、过滤后条数、去重后新增条数。
 * 不登录、不绕验证码、不碰 CA；只用公开搜索页与详情页。
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const { HttpClient } = require(path.join(ROOT, "lib", "http-client"));
const { createCgjySource, parseSearchList, parseDetail } = require(path.join(ROOT, "scripts", "sources", "cgjy-source"));
const { buildBatch } = require(path.join(ROOT, "scripts", "export-cgjy-public-batch"));
const { processNotice } = require(path.join(ROOT, "lib", "rules"));
const cfg = require(path.join(ROOT, "config", "sources.json")).sources.find((s) => s.sourceId === "cgjy");
const keywordsCfg = require(path.join(ROOT, "config", "keywords.json"));
const deviceTerms = keywordsCfg.deviceContext.terms;

const ENV = process.env.DIAG_ENV || "local";
const MAX_PAGES = Number(process.env.DIAG_MAX_PAGES || cfg.maxPagesPerKeyword || 2);
const MAX_DETAILS = Number(process.env.DIAG_MAX_DETAILS || cfg.maxDetails || 40);

function words() {
  return [
    ...keywordsCfg.searchKeywords.userSupplied,
    ...keywordsCfg.searchKeywords.tobaccoCore.slice(0, 3),
    ...keywordsCfg.searchKeywords.service.slice(0, 2),
    ...keywordsCfg.searchKeywords.models.slice(0, 2)
  ].slice(0, cfg.maxKeywords || 8);
}

async function main() {
  const startedAt = new Date();
  const client = new HttpClient();
  const source = createCgjySource({ httpClient: client });
  const list = words();
  const perKeywordDetails = Math.ceil(MAX_DETAILS / list.length);
  const rows = [];
  const rawNotices = [];

  for (const kw of list) {
    const row = { keyword: kw, searches: [], details: [], searchParsed: 0, detailAttempted: 0, detailParsed: 0 };
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const url = page === 1
        ? `${cfg.urls.search}?q=${encodeURIComponent(kw)}`
        : `${cfg.urls.searchPage.replace("{page}", page)}?q=${encodeURIComponent(kw)}`;
      const res = await client.fetch(url, { tag: `diag:search:${kw}:p${page}` });
      const parsed = res.ok ? parseSearchList(res.text, cfg.urls.home) : [];
      row.searches.push({ page, url, httpStatus: res.status, ok: Boolean(res.ok), parsed: parsed.length, error: res.error || "" });
      row.searchParsed += parsed.length;
      if (!res.ok) continue;
      for (const p of parsed.slice(0, perKeywordDetails)) {
        const d = await client.fetch(p.detailUrl, { tag: "diag:detail" });
        row.detailAttempted += 1;
        if (!d.ok) { row.details.push({ url: p.detailUrl, httpStatus: d.status, ok: false, bodyLen: 0, error: d.error || "" }); continue; }
        const detail = parseDetail(d.text);
        row.detailParsed += detail.bodyText ? 1 : 0;
        row.details.push({ url: p.detailUrl, httpStatus: d.status, ok: true, bodyLen: detail.bodyText.length, title: detail.titleFromPage.slice(0, 80) });
        rawNotices.push({
          sourceId: "cgjy", sourceName: "中烟电子采购平台", sourceType: "official",
          detailUrl: p.detailUrl, originalOfficialUrl: p.detailUrl,
          title: detail.titleFromPage || p.titleText || kw,
          publishDate: detail.publishDate !== "未披露" ? detail.publishDate : p.publishText,
          fullText: detail.fullText, bodyText: detail.bodyText, pageText: detail.pageText,
          content: detail.fullText.slice(0, 2000), noticeType: p.category,
          collectorKeyword: kw, attachments: [], discoveredAt: new Date().toISOString()
        });
      }
    }
    rows.push(row);
  }

  // 过滤后条数（与 export-cgjy-public-batch.js 同一规则）
  const batch = buildBatch(rawNotices, processNotice, deviceTerms);
  // 去重后新增条数（与流水线同一清单）
  const curatedPath = path.join(ROOT, "data", "curated-notices.json");
  const curated = fs.existsSync(curatedPath) ? JSON.parse(fs.readFileSync(curatedPath, "utf8")) : { notices: [] };
  const seen = new Set((curated.notices || []).map((n) => n.detailUrl));
  const newUrls = batch.notices.filter((n) => !seen.has(n.detailUrl)).map((n) => n.detailUrl);

  const httpStatuses = client.requestLog.map((r) => r.status);
  const report = {
    schemaVersion: "1.0.0",
    env: ENV,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    windowBeijing: `${new Date(startedAt.getTime() + 8 * 3600e3).toISOString().slice(0, 19)} ~ ${new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 19)}`,
    config: { keywords: list, maxPages: MAX_PAGES, maxDetails: MAX_DETAILS, perKeywordDetails, sourceUrl: cfg.urls.search },
    metrics: {
      httpRequests: client.requestLog.length,
      http200: httpStatuses.filter((s) => s === 200).length,
      httpNon200: httpStatuses.filter((s) => s !== 200).length,
      searchParsed: rows.reduce((n, r) => n + r.searchParsed, 0),
      detailAttempted: rows.reduce((n, r) => n + r.detailAttempted, 0),
      detailParsed: rows.reduce((n, r) => n + r.detailParsed, 0),
      rawNotices: rawNotices.length,
      filteredNotices: batch.notices.length,
      dedupedNew: newUrls.length
    },
    newUrls,
    keywords: rows
  };

  const dir = path.join(ROOT, "reports", "cgjy-diagnose");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, `${ENV}-${startedAt.toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n", "utf8");
  const m = report.metrics;
  console.log(`[diag:${ENV}] window=${report.windowBeijing} keywords=${list.length}`);
  console.log(`[diag:${ENV}] http=${m.http200}/${m.httpRequests} non200=${m.httpNon200} searchParsed=${m.searchParsed} detailAttempted=${m.detailAttempted} detailParsed=${m.detailParsed}`);
  console.log(`[diag:${ENV}] raw=${m.rawNotices} filtered=${m.filteredNotices} dedupNew=${m.dedupedNew} report=${path.relative(ROOT, out)}`);
  return report;
}

if (require.main === module) main().catch((e) => { console.error(`[diag:${ENV}] FAILED: ${e.message}`); process.exitCode = 1; });
module.exports = { main, words };
