"use strict";
const { createCgjySource } = require("./cgjy-source");
const { createYnGgzySource } = require("./yn-ggzy-source");
const { createChengezhaoSource } = require("./chengezhao-source");
const { createChinabiddingSource } = require("./chinabidding-source");

const factories = {
  "cgjy-source": createCgjySource,
  "yn-ggzy-source": createYnGgzySource,
  "chengezhao-source": createChengezhaoSource,
  "chinabidding-source": createChinabiddingSource
};

async function collectOne(source, options = {}) {
  const startedAt = new Date().toISOString();
  try {
    const result = await source.collect();
    return {
      items: result.items || [],
      status: {
        sourceId: source.sourceId,
        sourceName: source.sourceName || source.sourceId,
        status: (result.items || []).length > 0 ? "成功且有结果" : "成功但零结果",
        message: (result.items || []).length === 0 && result.stats && result.stats.coverageNote
          ? result.stats.coverageNote
          : "",
        count: (result.items || []).length,
        stats: result.stats || {},
        startedAt,
        finishedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      items: [],
      status: {
        sourceId: source.sourceId,
        sourceName: source.sourceName || source.sourceId,
        status: "失败",
        count: 0,
        error: error.message,
        startedAt,
        finishedAt: new Date().toISOString()
      }
    };
  }
}

async function collectEnabled(options = {}) {
  const sourceConfigs = require("../../config/sources.json").sources.filter((s) => s.enabled && s.adapter);
  const notices = [];
  const statuses = [];
  for (const config of sourceConfigs) {
    const factory = factories[config.adapter];
    if (!factory) continue;
    const source = { sourceId: config.sourceId, sourceName: config.sourceName, ...factory(options) };
    const result = await collectOne(source, options);
    notices.push(...result.items);
    statuses.push(result.status);
  }
  const allFailed = statuses.length > 0 && statuses.every((s) => s.status === "失败");
  const partialFail = statuses.some((s) => s.status === "失败") && !allFailed;
  return { notices, statuses, overall: allFailed ? "全部失败" : partialFail ? "部分失败" : "正常" };
}

module.exports = { collectEnabled, collectOne, factories };
