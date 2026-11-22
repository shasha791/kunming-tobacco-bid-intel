"use strict";
/**
 * 诚E招电子采购交易平台适配器（公开页面，低频）。
 * 实测：栏目分页 /cms/categories/业务公告/{栏目}/page/N/ 稳定返回日期+标题+详情链接；
 * 正文位于 div.cez-business-details-main__middle-content。
 * 注意：/cms/search.json 曾返回过渲染 JSON，但当前稳定返回 Hugo 模板源文件，不可解析，
 * 因此不使用该接口；也不把接口失效误报为"零结果"，直接抛错让状态=失败。
 * 遵守：不绕过登录/验证码；招标文件需登录的部分不下载，仅保留原文入口。
 */
const { HttpClient } = require("../../lib/http-client");
const { stripHtml, sleep, readText } = require("../../lib/text-utils");

const SOURCE = require("../../config/sources.json").sources.find((s) => s.sourceId === "chengezhao");
const KEYWORDS = require("../../config/keywords.json").searchKeywords;

const CATEGORIES = ["项目公告", "变更公告", "中标公示", "结果公告"];
const BASE = "https://www.chengezhao.com/cms/categories/业务公告/";
const TOBACCO = /烟草|卷烟|烟机|制丝|切丝|切梗|梗丝|烟叶|烟厂/;

function extractList(html) {
  const rows = [];
  // 条目：日期链接 + 标题 h3 链接
  const re = /<a class="cez-business-main__news-item-date"[^>]*href="([^"]+)"[^>]*>\s*<span>(\d{2}-\d{2})<\/span>\s*<span>(\d{4})<\/span>[\s\S]{0,800}?<h3><a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[4] || m[1];
    const title = stripHtml(m[5]).trim();
    if (!href || !title) continue;
    rows.push({ detailUrl: new URL(href, "https://www.chengezhao.com").href, title, publishDate: `${m[3]}-${m[2]}` });
  }
  return rows;
}

function extractBody(html) {
  const m = html.match(/<div class="cez-business-details-main__middle-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  if (m) return stripHtml(m[1]);
  const i = html.search(/一、项目信息|一、项目概况|一、招标条件/);
  return i >= 0 ? stripHtml(html.slice(i, i + 12000)) : "";
}

function createChengezhaoSource(options = {}) {
  const client = options.httpClient || new HttpClient(options.httpOptions);

  async function collect() {
    const items = [];
    const seen = new Set();
    const stats = { categoryPages: 0, listRows: 0, detailAttempts: 0, bodyExtracted: 0, failedCategories: [] };
    const words = [...new Set([...(KEYWORDS.userSupplied || []), ...(KEYWORDS.tobaccoCore || []).slice(0, 3)])];
    // 只保留与关键词相关且烟草行业相关的词，避免 requests 浪费
    const searchWords = words.filter((w) => w.length >= 2);
    const maxPages = Number(process.env.CHENGZHAO_PAGES || 12); // 每栏目页数，覆盖近期公告

    for (const cat of CATEGORIES) {
      let categoryError = "";
      for (let page = 1; page <= maxPages; page += 1) {
        const url = page === 1
          ? BASE + encodeURIComponent(cat) + "/"
          : BASE + encodeURIComponent(cat) + `/page/${page}/`;
        const list = await client.fetch(url, { tag: `chengezhao:${cat}:p${page}`, useCache: true });
        if (!list.ok) { categoryError = list.error; break; }
        stats.categoryPages += 1;
        const rows = extractList(list.text);
        stats.listRows += rows.length;
        if (!rows.length) break;
        let stop = false;
        for (const row of rows) {
          if (items.length >= (SOURCE.maxDetails || 40)) { stop = true; break; }
          const text = `${row.title}`;
          const kwHit = searchWords.find((w) => text.includes(w));
          if (!kwHit || !TOBACCO.test(text)) continue; // 关键词 + 烟草行业双条件
          if (seen.has(row.detailUrl)) continue;
          seen.add(row.detailUrl);
          stats.detailAttempts += 1;
          const detail = await client.fetch(row.detailUrl, { tag: "chengezhao:detail" });
          if (!detail.ok) { await sleep(150); continue; }
          const body = extractBody(detail.text);
          if (body) stats.bodyExtracted += 1;
          items.push({
            sourceId: SOURCE.sourceId,
            sourceName: SOURCE.sourceName,
            sourceType: "official",
            sourcePriority: 70,
            sourceUrl: SOURCE.urls.home,
            detailUrl: row.detailUrl,
            originalOfficialUrl: row.detailUrl,
            title: row.title,
            publishDate: row.publishDate,
            fullText: body || row.title,
            content: (body || row.title).slice(0, 2000),
            noticeType: cat,
            collectorKeyword: kwHit,
            attachments: [],
            discoveredAt: new Date().toISOString()
          });
          await sleep(150);
        }
        if (stop) break;
      }
      if (categoryError) stats.failedCategories.push({ category: cat, error: categoryError });
      if (items.length >= (SOURCE.maxDetails || 40)) break;
    }
    if (items.length === 0) {
      stats.coverageNote = "栏目分页当前覆盖范围内未命中关键词；全量检索接口 /cms/search.json 返回模板不可解析，非'平台无公告'。";
    }
    return { items, stats };
  }

  return { sourceId: SOURCE.sourceId, collect, client };
}

module.exports = { createChengezhaoSource, extractList, extractBody };
