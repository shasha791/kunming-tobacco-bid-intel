"use strict";
const config = require("../config/channels.json");
const { readText } = require("./text-utils");

function channelStatus(channelId) {
  const ch = config.channels.find((c) => c.id === channelId);
  if (!ch || !ch.configured) return "未配置";
  return ch.status || "已配置";
}

function buildMessage(notice) {
  const f = notice.structured || {};
  const score = notice.score || {};
  return {
    title: notice.title,
    purchaser: f.purchaser || notice.purchaser || "未披露",
    content: f.content || "未披露",
    region: `${f.province || "待核实"}/${f.city || "待核实"}`,
    stage: `${notice.stage}/${notice.noticeType}`,
    score: {
      confirmed: score.confirmedScore,
      possibleRange: `${score.possibleMin}-${score.possibleMax}`,
      priority: score.priority?.label,
      dimensions: (score.dimensions || []).map((d) => ({ label: d.label, score: d.score, max: d.max, status: d.status, evidence: d.evidence, flag: d.flag }))
    },
    reason: notice.classificationReason,
    evidence: notice.evidence,
    pendingItems: notice.pendingItems,
    deadlines: {
      signup: f.signupDeadline?.normalized || "未披露",
      bid: f.bidDeadline?.normalized || "未披露",
      opening: f.bidOpeningTime?.normalized || "未披露"
    },
    budget: f.budget?.raw || "未披露",
    owner: notice.assignment?.primary?.name || "待分派",
    collaborators: (notice.assignment?.collaborators || []).map((p) => p.name),
    recommendedAction: recommendedAction(notice),
    originalUrl: notice.originalOfficialUrl || notice.detailUrl || "未披露",
    ruleVersion: score.ruleVersion
  };
}

function recommendedAction(notice) {
  const stage = notice.stage;
  if (stage === "采购前") return "建议核实采购需求与技术参数方向，争取前置介入。";
  if (stage === "招标中") return "建议核对报名/投标截止时间、资格要求与技术参数，判断是否投标。";
  if (stage === "变更") return "建议立即核对变更内容与最新截止时间，避免废标。";
  if (stage === "结果") return "建议分析中标单位与价格，作为竞对与报价参考；不视为新商机。";
  return "建议人工查看原公告确认跟进价值。";
}

function shouldPush(notice, person, subscription) {
  if (!person) return { ok: false, reason: "未指定接收人" };
  const score = notice.score?.confirmedScore ?? 0;
  const minScore = subscription?.minScore ?? person.minScore ?? 0;
  // 关键变化提醒独立规则：不受分类、评分阈值和信息不足限制，避免漏发
  if (notice.isKeyChange && person.acceptKeyChanges) {
    return { ok: true, reason: "已关注项目关键变化，独立提醒（不受分类/评分/信息不足限制）" };
  }
  if (notice.category === "E" || notice.category === "D") return { ok: false, reason: "分类不计入外部销售商机推送" };
  if (score < minScore) return { ok: false, reason: `得分${score}低于阈值${minScore}` };
  if (notice.score?.unknownCount >= 2 && !person.acceptUnverifiedLeads) {
    return { ok: false, reason: "信息不足的待核实线索，该人员不接收" };
  }
  return { ok: true, reason: `匹配分派条件，得分${score}≥${minScore}` };
}

function buildPreview(notices, store) {
  const previews = [];
  const skipped = [];
  const channels = config.channels;
  const subscriptions = config.subscriptions || [];

  for (const notice of notices) {
    const people = [notice.assignment?.primary, ...(notice.assignment?.collaborators || [])].filter(Boolean);
    for (const person of people) {
      const personChannels = (person.channels || []).length ? person.channels : ["email"];
      for (const channelId of personChannels) {
        const sub = subscriptions.find((s) => s.channel === channelId && (s.people || []).includes(person.personId));
        const decision = shouldPush(notice, person, sub);
        const channel = channels.find((c) => c.id === channelId);
        const item = {
          noticeId: notice.id || notice.fingerprint,
          noticeTitle: notice.title,
          personId: person.personId,
          personName: person.name,
          isTestData: person.isTestData,
          channel: channelId,
          channelStatus: channelStatus(channelId),
          subscriptionId: sub?.id || "未匹配订阅",
          score: notice.score?.confirmedScore,
          decision: decision.ok ? "待发送" : "跳过",
          reason: decision.reason,
          message: buildMessage(notice),
          duplicate: store ? store.wasPushed(notice.id || notice.fingerprint, person.personId) : false
        };
        if (item.duplicate) {
          item.decision = "跳过";
          item.reason = "相同人员对同一公告已推送过，不重复推送";
        }
        if (decision.ok && !item.duplicate) {
          previews.push(item);
        } else {
          skipped.push(item);
        }
      }
    }
  }
  return {
    mode: config.mode,
    testMode: config.testMode?.enabled,
    noRealSending: config.testMode?.noRealSending,
    generatedAt: new Date().toISOString(),
    summary: {
      previewCount: previews.length,
      skippedCount: skipped.length,
      channels: channels.map((c) => ({ id: c.id, label: c.label, status: channelStatus(c.id) })),
      note: "测试模式：仅生成预览，不调用真实接口、不向真实人员或群发送。"
    },
    previews,
    skipped
  };
}

module.exports = { buildPreview, buildMessage, shouldPush, channelStatus };
