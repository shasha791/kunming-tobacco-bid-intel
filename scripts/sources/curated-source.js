"use strict";
/**
 * 人工核验补录来源：读取 data/curated-notices.json 中经原文核对的真实公告。
 * 目的：把已采到但因云端旧库覆盖而从线上消失的中烟公告，纳入与在线采集相同的
 * 入库/构建/发布流程。每次流水线运行都会与在线来源结果一起去重入库，
 * 因此不会被 cloud-state 旧库覆盖，重复运行也不会产生重复公告。
 *
 * 边界：只含中烟公开原文可打开的公告；不登录、不绕验证码、不碰 CA；
 * 不新增任何演示/占位数据；字段缺失保持"未披露/待核实"，不臆造。
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const FILE = path.join(ROOT, "data", "curated-notices.json");

function createCuratedSource() {
  return {
    sourceId: "cgjy-curated",
    sourceName: "中烟电子采购平台（人工核验补录）",
    collect() {
      if (!fs.existsSync(FILE)) return { items: [], stats: { note: "无补录清单文件", coverageNote: "无补录清单文件" } };
      const doc = JSON.parse(fs.readFileSync(FILE, "utf8"));
      const items = (doc.notices || []).map((n) => ({
        ...n,
        sourceId: "cgjy",
        sourceName: "中烟电子采购平台",
        sourceType: "official",
        sourcePriority: 95,
        sourceUrl: "https://cgjy.tobacco.com.cn/",
        detailUrl: n.detailUrl || n.originalOfficialUrl,
        originalOfficialUrl: n.originalOfficialUrl || n.detailUrl,
        discoveredAt: n.discoveredAt || new Date().toISOString()
      }));
      return {
        items,
        stats: {
          note: items.length ? "人工核验补录：原文可打开且与线上站点核对不重复" : "补录清单为空",
          coverageNote: items.length ? "" : "补录清单为空"
        }
      };
    }
  };
}

module.exports = { createCuratedSource };
