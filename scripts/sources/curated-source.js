"use strict";

const fs = require("node:fs");
const path = require("node:path");

const FILE = path.join(__dirname, "../../data/curated-notices.json");

function createCuratedSource() {
  return {
    sourceId: "cgjy-curated",
    sourceName: "中烟电子采购平台（核验补录）",
    collect() {
      const { notices } = JSON.parse(fs.readFileSync(FILE, "utf8"));
      const items = notices.map((notice) => ({
        ...notice,
        sourceId: "cgjy",
        sourceName: "中烟电子采购平台",
        sourceType: "official",
        sourcePriority: 95,
        sourceUrl: "https://cgjy.tobacco.com.cn/",
        originalOfficialUrl: notice.detailUrl,
        manuallyVerified: true
      }));
      return { items, stats: { coverageNote: "公开公告核验清单为空" } };
    }
  };
}

module.exports = { createCuratedSource };
