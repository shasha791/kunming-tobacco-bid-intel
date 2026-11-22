"use strict";
/**
 * 采购与招标网（chinabidding.cn）适配器 —— 走官方公开的移动端页面。
 * 合规依据：
 *  - 电脑版首页有阿里云 WAF JS 挑战，不破解；
 *  - 移动端 m.chinabidding.cn 的招标公告/中标公示列表与详情可公开访问，无 WAF；
 *  - robots.txt 未禁止移动端列表路径，且提供 sitemap。
 * 能力限制：移动端无关键词检索（/search?q= 只返回筛选界面），因此采用逐页扫描列表 +
 * 标题关键词过滤；正文在详情页有部分脱敏，但标题/地区/日期/行业为真实字段。
 * 低频：列表页与详情页均间隔 >=1s，有限重试，不并发。
 */
const { HttpClient } = require("../../lib/http-client");
const { stripHtml, sleep, readText } = require("../../lib/text-utils");

const SOURCE = require("../../config/sources.json").sources.find((s) => s.sourceId === "chinabidding");
const KEYWORDS = require("../../config/keywords.json").searchKeywords;

const BASE = "https://m.chinabidding.cn";
const CHANNELS = [
  { path: "/zbxx/zbgg", label: "招标公告" },
  { path: "/zbxx/zbgs", label: "中标公示" }
];
// 标题可能只写产品词（如"切丝机"）而不写行业词；行业语境交给下游 rules.js 按正文判断，
// 这里只做关键词召回，避免过早过滤导致漏抓。
const TOBACCO = /烟草|卷烟|烟机|制丝|切丝|切梗|梗丝|烟叶|烟厂|中烟|备品配件|配件/;

function extractList(html) {
  const rows = [];
  const re = /<li class="dynamic-list">[\s\S]*?<p class="dynamic-list-title">\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<span class="dynamic-list-addr">[\s\S]*?>([^<]+)<\/a>[\s\S]*?<span class="dynamic-list-type">([\s\S]*?)<\/span>[\s\S]*?<span class="dynamic-list-time">([^<]+)<\/span>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const title = stripHtml(m[2]).trim();
    if (!title) continue;
    rows.push({
      detailUrl: new URL(m[1], BASE).href,
      title,
      region: stripHtml(m[3]).trim(),
      type: stripHtml(m[4]).replace(/,/g, " ").trim(),
      publishDate: stripHtml(m[5]).trim()
    });
  }
  return rows;
}

function extractBody(html) {
  // 详情页正文：取"现邀请全国供应商"之后的描述段，或 title 后的首段
  const t = stripHtml(html);
  const i = t.search(/现邀请全国供应商|项目概况|招标内容|采购内容/);
  return i >= 0 ? t.slice(i, i + 2000) : "";
}

function createChinabiddingSource(options = {}) {
  const client = options.httpClient || new HttpClient(options.httpOptions);

  async function collect() {
    const items = [];
    const seen = new Set();
    const stats = { pages: 0, listRows: 0, detailAttempts: 0, failedChannels: [] };
    const words = [...new Set([...(KEYWORDS.userSupplied || []), ...(KEYWORDS.tobaccoCore || []).slice(0, 3)])];
    const maxPages = Number(process.env.CHINABIDDING_PAGES || 10);
    const maxDetails = SOURCE.maxDetails || 30;

    for (const ch of CHANNELS) {
      for (let page = 1; page <= maxPages; page += 1) {
        if (items.length >= maxDetails) break;
        const url = `${BASE}${ch.path}?page=${page}`;
        const list = await client.fetch(url, { tag: `chinabidding:${ch.label}:p${page}`, useCache: true });
        if (!list.ok) { stats.failedChannels.push({ channel: ch.label, page, error: list.error }); break; }
        stats.pages += 1;
        const rows = extractList(list.text);
        stats.listRows += rows.length;
        if (!rows.length) break;
        let stop = false;
        for (const row of rows) {
          if (items.length >= maxDetails) { stop = true; break; }
          const kwHit = words.find((w) => row.title.includes(w));
          if (!kwHit || !TOBACCO.test(row.title)) continue;
          if (seen.has(row.detailUrl)) continue;
          seen.add(row.detailUrl);
          stats.detailAttempts += 1;
          const detail = await client.fetch(row.detailUrl, { tag: "chinabidding:detail" });
          if (!detail.ok) { await sleep(150); continue; }
          const body = extractBody(detail.text);
          items.push({
            sourceId: SOURCE.sourceId,
            sourceName: SOURCE.sourceName,
            sourceType: "official",
            sourcePriority: 60,
            sourceUrl: "https://www.chinabidding.cn/",
            detailUrl: row.detailUrl,
            originalOfficialUrl: row.detailUrl,
            title: row.title,
            publishDate: row.publishDate,
            fullText: body || row.title,
            content: (body || row.title).slice(0, 2000),
            noticeType: ch.label,
            collectorKeyword: kwHit,
            province: row.region,
            attachments: [],
            discoveredAt: new Date().toISOString()
          });
          await sleep(200);
        }
        if (stop) break;
        await sleep(150);
      }
      if (items.length >= maxDetails) break;
    }
    if (items.length === 0) {
      stats.coverageNote = "移动端列表当前扫描范围内未命中关键词；该站无关键词检索接口，逐页扫描覆盖有限，非'平台无公告'。";
    }
    return { items, stats };
  }

  return { sourceId: SOURCE.sourceId, collect, client };
}

module.exports = { createChinabiddingSource, extractList, extractBody };
