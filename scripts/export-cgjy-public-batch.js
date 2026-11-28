"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const ORIGIN = "https://cgjy.tobacco.com.cn";
const OFFICIAL_DETAIL = /^https:\/\/cgjy\.tobacco\.com\.cn\/[a-z]+\/\d+\.jhtml$/i;
const PROJECT_NO = /^[A-Z0-9][A-Z0-9-]{5,39}$/i;
const PUBLISH_DATE = /^20\d{2}-\d{2}-\d{2}(?: \d{2}:\d{2}:\d{2})?$/;
const DATE_TIME = /^20\d{2}-\d{2}-\d{2}(?: \d{2}:\d{2})?$/;
const ORGANIZATION = /^[\p{L}\p{N}·.()（）\s-]{2,80}(?:公司|厂|中心|局|院|集团)$/u;
const EQUIPMENT_TERM = /^[\p{L}\p{N} ·().（）+/-]{2,30}$/u;

function buildBatch(rawNotices, processNotice, deviceKeywords) {
  const seen = new Set();
  const notices = [];
  for (const raw of rawNotices) {
    if (!OFFICIAL_DETAIL.test(raw.detailUrl) || seen.has(raw.detailUrl)) continue;
    const notice = processNotice(raw);
    const fields = notice.structured;
    const relevantChange = notice.stage === "变更" && ["A", "B"].includes(notice.category);
    if (!notice.isActionable && !relevantChange) continue;
    if (!PROJECT_NO.test(fields.projectNo) || !PUBLISH_DATE.test(notice.publishDate) ||
        !notice.title || notice.title === "待核实公告" || notice.title.length > 260) continue;

    const publicFields = [["项目编号", fields.projectNo]];
    if (ORGANIZATION.test(fields.purchaser)) publicFields.push(["采购人", fields.purchaser]);
    if (/^[\p{L}\p{N}-]{1,20}$/u.test(fields.lotNo) && fields.lotNo !== "未披露") {
      publicFields.push(["标段编号", fields.lotNo]);
    }
    for (const [label, field] of [
      ["报名截止时间", fields.signupDeadline],
      ["获取时间", fields.fileAcquireDeadline],
      ["递交截止时间", fields.bidDeadline],
      ["开标时间", fields.bidOpeningTime]
    ]) {
      if (DATE_TIME.test(field?.normalized)) publicFields.push([label, field.normalized]);
    }
    const searchable = [raw.title, raw.fullText, raw.bodyText, raw.content].join(" ");
    const evidence = [...new Set([
      ...[...notice.matchedStrong, ...notice.matchedWeak].flatMap((match) => match.hits),
      ...notice.tobaccoContext.buyer,
      ...notice.tobaccoContext.usage,
      ...deviceKeywords.filter((term) => searchable.includes(term))
    ].filter((term) => EQUIPMENT_TERM.test(term)))].slice(0, 18);

    const row = {
      title: notice.title,
      detailUrl: raw.detailUrl,
      publishDate: notice.publishDate,
      noticeType: raw.noticeType || "待核实",
      bodyText: publicFields.map(([label, value]) => `${label}：${value}`).join("\n"),
      summary: evidence.length ? `公告关键词：${evidence.join("、")}` : "",
      verification: "workbuddy-public"
    };
    const projected = processNotice({
      ...row,
      sourceId: "cgjy",
      sourceName: "中烟电子采购平台"
    });
    if (!projected.isActionable && !(relevantChange && ["A", "B"].includes(projected.category))) continue;
    seen.add(raw.detailUrl);
    notices.push(row);
  }
  return { schemaVersion: "1.0.0", source: ORIGIN, capturedAt: new Date().toISOString(), notices };
}

async function main(root = path.resolve(__dirname, "..")) {
  const { createCgjySource } = require(path.join(root, "scripts/sources/cgjy-source"));
  const { processNotice } = require(path.join(root, "lib/rules"));
  const { deviceContext } = require(path.join(root, "config/keywords.json"));
  const { items, stats } = requireCompleteCollection(await createCgjySource().collect());
  const batch = buildBatch(items, processNotice, deviceContext.terms);
  const dir = path.join(root, "reports", "website-sync");
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, `cgjy-${batch.capturedAt.replace(/[:.]/g, "-")}.json`);
  const temporary = `${target}.${process.pid}.new`;
  try {
    await fs.writeFile(temporary, JSON.stringify(batch, null, 2) + "\n");
    await fs.rename(temporary, target);
  } finally {
    await fs.rm(temporary, { force: true });
  }
  console.log(`公开中烟批次：搜索页 ${stats.listPageCount}，候选 ${items.length}，符合发布条件 ${batch.notices.length}。`);
}

function requireCompleteCollection(result) {
  const { items, stats } = result;
  if (!stats.listPageCount || stats.failedKeywords?.length || !items.length) {
    throw new Error("中烟搜索或详情读取未获完整结果，保留已导出的批次。");
  }
  return result;
}

if (require.main === module) {
  main(process.argv[2]).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildBatch, requireCompleteCollection };
