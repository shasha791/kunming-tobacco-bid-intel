"use strict";
const path = require("node:path");
const { HttpClient } = require("../../lib/http-client");
const { stripHtml, sleep, readText } = require("../../lib/text-utils");

const SOURCE = require("../../config/sources.json").sources.find((s) => s.sourceId === "cgjy");
const KEYWORDS = require("../../config/keywords.json").searchKeywords;

const NON_NOTICE_TITLES = /^(法律声明|服务协议|平台规则|通知公告|帮助中心|电子招标操作指南|环境检测工具|使用手册|操作手册)$/;

function parseSearchList(html, base) {
  const links = [];
  const seen = new Set();
  const regex = /href=["'](\/[a-z]+\/\d+\.jhtml)["'][^>]*>([\s\S]{0,600}?)<\/a>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const block = stripHtml(match[2]);
    if (seen.has(href)) continue;
    seen.add(href);
    const title = block.replace(/发布日期[:：]?\s*20\d{2}-\d{2}-\d{2}.*$/, "").trim();
    if (!title || NON_NOTICE_TITLES.test(title)) continue; // 过滤页脚/声明类非公告链接
    if (!/20\d{2}-\d{2}-\d{2}/.test(block)) continue; // 非公告链接通常无发布日期
    links.push({
      detailUrl: new URL(href, base).href,
      titleText: title,
      publishText: (block.match(/20\d{2}-\d{2}-\d{2}/) || [])[0] || "未披露",
      category: readText((block.match(/^(货物招标|服务招标|工程招标)/) || [])[1], "待核实")
    });
  }
  return links;
}

/**
 * 提取公告正文：中烟详情页正文位于若干并列的 <div class="wrap_content"> 块中，
 * 从"招标项目所在地区"到"九、联系方式"。只取这些块，排除站点导航/页头/页脚/客服。
 */
function extractAnnouncementBody(html) {
  // 招标公告模板：若干并列 <div class="wrap_content"> 块
  const blocks = [...html.matchAll(/<div class="wrap_content">([\s\S]*?)<\/div>/gi)].map((m) => m[1]);
  if (blocks.length) return blocks.map((b) => stripHtml(b)).filter(Boolean).join("\n");
  // 结果/公示公告模板：<div class="content" id="content"> 内的 Word 导出片段，止于 copyright_content
  const contentMatch = html.match(/<div class="content" id="content">([\s\S]*?)(?=<div class="copyright_content|<div class="inBottom|<script)/i);
  if (contentMatch) {
    // 移除 Word 导出的 <head>/<title> 元信息（其中可能含无关项目名），只保留 body 正文
    const inner = contentMatch[1]
      .replace(/<head[\s\S]*?<\/head>/gi, " ")
      .replace(/<title[\s\S]*?<\/title>/gi, " ")
      .replace(/<html[^>]*>|<\/html>|<body[^>]*>|<\/body>/gi, " ");
    return stripHtml(inner).trim();
  }
  return "";
}

function parseDetail(html) {
  const title = readText((html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i) || [])[1], "");
  const publishMatch = html.match(/发布时间[:：]\s*(20\d{2}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}:\d{2})?)/);
  // 页面全文本仅用于分类命中（关键词召回）；字段提取只使用 bodyText。
  // 正文提取失败时不回退到整页（避免导航/页脚污染），置空并标记提取待核实。
  const pageText = stripHtml(html);
  const bodyText = extractAnnouncementBody(html);
  return {
    titleFromPage: stripHtml(title),
    publishDate: publishMatch ? publishMatch[1] : "未披露",
    fullText: bodyText || "",
    bodyText,
    pageText,
    extractionStatus: bodyText ? "成功" : "提取待核实"
  };
}

function createCgjySource(options = {}) {
  const client = options.httpClient || new HttpClient(options.httpOptions);
  const cfg = SOURCE;

  async function collect() {
    const items = [];
    const stats = { listPageCount: 0, detailAttemptCount: 0, failedKeywords: [] };
    const searchWords = [
      ...(KEYWORDS.userSupplied || []),
      ...KEYWORDS.tobaccoCore.slice(0, 3),
      ...KEYWORDS.service.slice(0, 2),
      ...KEYWORDS.models.slice(0, 2)
    ].slice(0, cfg.maxKeywords || 12);

    for (const keyword of searchWords) {
      let pageCount = 0;
      for (let page = 1; page <= (cfg.maxPagesPerKeyword || 2); page += 1) {
        const searchUrl = page === 1
          ? `${cfg.urls.search}?q=${encodeURIComponent(keyword)}`
          : cfg.urls.searchPage.replace("{page}", page) + `?q=${encodeURIComponent(keyword)}`;
        const list = await client.fetch(searchUrl, { tag: `cgjy:search:${keyword}:p${page}` });
        if (!list.ok) {
          stats.failedKeywords.push({ keyword, page, error: list.error });
          break;
        }
        stats.listPageCount += 1;
        const parsed = parseSearchList(list.text, cfg.urls.home).slice(0, 30);
        if (!parsed.length) break;
        for (const p of parsed.slice(0, cfg.maxDetails ? Math.ceil(cfg.maxDetails / searchWords.length) : 15)) {
          stats.detailAttemptCount += 1;
          const detail = await client.fetch(p.detailUrl, { tag: "cgjy:detail" });
          if (!detail.ok) continue;
          const d = parseDetail(detail.text);
          const title = d.titleFromPage || p.titleText || keyword;
          items.push({
            sourceId: cfg.sourceId,
            sourceName: cfg.sourceName,
            sourceType: "official",
            sourcePriority: 95,
            sourceUrl: cfg.urls.home,
            detailUrl: p.detailUrl,
            originalOfficialUrl: p.detailUrl,
            title,
            publishDate: d.publishDate !== "未披露" ? d.publishDate : p.publishText,
            fullText: d.fullText,
            bodyText: d.bodyText,
            pageText: d.pageText,
            content: d.fullText.slice(0, 2000),
            noticeType: p.category,
            collectorKeyword: keyword,
            attachments: [],
            discoveredAt: new Date().toISOString()
          });
          await sleep(120);
        }
        await sleep(200);
      }
    }
    return { items, stats };
  }

  return { sourceId: cfg.sourceId, collect, client };
}

module.exports = { createCgjySource, parseSearchList, parseDetail };
