"use strict";
/**
 * 供前端展示的评分规则视图：直接取自权威配置文件，避免前端另写一套导致口径漂移。
 * cloud-pipeline.js 与 process.js 共用，保证本地与云端产物一致。
 */
const scoring = require("../config/scoring.json");
const keywords = require("../config/keywords.json");

function buildScoringRulesView() {
  return {
    ruleVersion: scoring.ruleVersion,
    status: scoring.status,
    notice: scoring.notice,
    scale: scoring.scale,
    dimensions: scoring.dimensions,
    priorityThresholds: scoring.priorityThresholds,
    rules: scoring.rules,
    matchingRuleVersion: keywords.ruleVersion,
    productTerms: keywords.productTerms,
    tobaccoContext: keywords.tobaccoContext,
    deviceContext: keywords.deviceContext,
    exclusions: keywords.exclusions,
    noticeStages: keywords.noticeStages,
    keyChangeTypes: keywords.keyChangeTypes,
    classificationRules: keywords.classificationRules
  };
}

module.exports = { buildScoringRulesView };
