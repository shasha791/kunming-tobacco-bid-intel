"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { readText, normalizeText, toIso } = require("./text-utils");

function sameProject(a = {}, b = {}) {
  const pa = readText(a.structured?.projectNo || a.projectNo, "未披露");
  const pb = readText(b.structured?.projectNo || b.projectNo, "未披露");
  if (pa !== "未披露" && pb !== "未披露" && pa === pb) {
    const la = readText(a.structured?.lotNo || a.lotNo, "未披露");
    const lb = readText(b.structured?.lotNo || b.lotNo, "未披露");
    if (la === lb) return true; // 同编号同标段
  }
  const ta = normalizeText(a.title);
  const tb = normalizeText(b.title);
  const sa = readText(a.stage || a.noticeType);
  const sb = readText(b.stage || b.noticeType);
  if (ta && ta === tb && sa === sb) {
    const ua = normalizeText(a.purchaser || a.structured?.purchaser);
    const ub = normalizeText(b.purchaser || b.structured?.purchaser);
    if (ua && ua === ub) return true;
  }
  return false;
}

function isChangeNotice(notice) {
  return /变更|澄清|更正|延期|补遗/.test(`${notice.noticeType} ${notice.stage} ${notice.title}`);
}

/**
 * 业务字段签名：只含真正代表公告内容变化的字段。
 * 不含 relatedSources（跨来源转载合并）、firstSeenAt/lastSeenAt（时间）、score（评分重算）、fullText（正文可能微小波动）。
 * 只有此签名变化才算"变更数"，避免每次采集把未变化记录误报为更新。
 */
function businessSignature(notice = {}) {
  const f = notice.structured || {};
  // 只含最稳定、最能代表公告实质变更的字段。
  // 不含 title（转载后缀）、purchaser/agency（不同模板写法不同）、stage/noticeType/category（阶段归类可能因新正文微调），
  // 这些字段在不同来源/不同采集批次间会波动，纳入会导致同一公告反复误判为"更新"。
  return JSON.stringify({
    projectNo: f.projectNo,
    lotNo: f.lotNo,
    budget: f.budget?.raw,
    bidDeadline: f.bidDeadline?.raw,
    signupDeadline: f.signupDeadline?.raw,
    bidOpeningTime: f.bidOpeningTime?.raw
  });
}

class Store {
  constructor(dbPath) {
    this.dbPath = dbPath;
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notices (
        id TEXT PRIMARY KEY,
        projectKey TEXT NOT NULL,
        contentHash TEXT NOT NULL,
        sourceId TEXT, sourceName TEXT, sourceType TEXT,
        detailUrl TEXT, officialUrl TEXT,
        title TEXT, publishDate TEXT, purchaser TEXT,
        province TEXT, city TEXT, noticeType TEXT, stage TEXT,
        category TEXT, categoryLabel TEXT,
        isActionable INTEGER, isKeyChange INTEGER,
        scoreJson TEXT, rawJson TEXT,
        ownerId TEXT, followStatus TEXT, notes TEXT,
        firstSeenAt TEXT, lastSeenAt TEXT, isNew INTEGER DEFAULT 1,
        isUpdated INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_notices_project ON notices(projectKey);
      CREATE INDEX IF NOT EXISTS idx_notices_category ON notices(category, isActionable);
      CREATE TABLE IF NOT EXISTS project_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        projectKey TEXT NOT NULL, noticeId TEXT, stage TEXT, noticeType TEXT,
        title TEXT, publishDate TEXT, changeDetail TEXT, createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS source_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sourceId TEXT, status TEXT, count INTEGER, message TEXT,
        startedAt TEXT, finishedAt TEXT
      );
      CREATE TABLE IF NOT EXISTS push_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        noticeId TEXT, personId TEXT, channel TEXT, status TEXT,
        reason TEXT, previewJson TEXT, sentAt TEXT
      );
      CREATE TABLE IF NOT EXISTS overrides (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        noticeId TEXT, field TEXT, value TEXT, updatedAt TEXT
      );
    `);
  }

  rowToNotice(row) {
    if (!row) return null;
    return {
      ...JSON.parse(row.rawJson || "{}"),
      id: row.id, projectKey: row.projectKey, contentHash: row.contentHash,
      sourceId: row.sourceId, sourceName: row.sourceName,
      ownerId: row.ownerId, followStatus: row.followStatus, notes: row.notes,
      firstSeenAt: row.firstSeenAt, lastSeenAt: row.lastSeenAt,
      isNew: Boolean(row.isNew), isUpdated: Boolean(row.isUpdated)
    };
  }

  upsertMany(notices, runAt = toIso(new Date())) {
    const result = { inserted: 0, updated: 0, duplicate: 0, mergedSources: 0, timelineAdded: 0 };
    const selectById = this.db.prepare("SELECT * FROM notices WHERE id = ?");
    const allRows = this.db.prepare("SELECT * FROM notices").all();
    const insert = this.db.prepare(`
      INSERT INTO notices (id, projectKey, contentHash, sourceId, sourceName, sourceType, detailUrl, officialUrl,
        title, publishDate, purchaser, province, city, noticeType, stage, category, categoryLabel,
        isActionable, isKeyChange, scoreJson, rawJson, ownerId, followStatus, notes,
        firstSeenAt, lastSeenAt, isNew, isUpdated)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0)
    `);
    const updateChanged = this.db.prepare(`
      UPDATE notices SET contentHash=?, sourceId=?, sourceName=?, sourceType=?, detailUrl=?, officialUrl=?,
        title=?, publishDate=?, purchaser=?, province=?, city=?, noticeType=?, stage=?, category=?, categoryLabel=?,
        isActionable=?, isKeyChange=?, scoreJson=?, rawJson=?, lastSeenAt=?, isNew=0, isUpdated=1
      WHERE id=?
    `);
    const updateSeen = this.db.prepare("UPDATE notices SET lastSeenAt=?, isNew=0 WHERE id=?");
    // 仅跨来源合并/重采集：更新来源列表与采集时间，不改变业务字段，不计入"变更数"
    const updateMerged = this.db.prepare("UPDATE notices SET rawJson=?, lastSeenAt=?, isNew=0, isUpdated=0 WHERE id=?");

    const timelineInsert = this.db.prepare(`
      INSERT INTO project_timeline (projectKey, noticeId, stage, noticeType, title, publishDate, changeDetail, createdAt)
      VALUES (?,?,?,?,?,?,?,?)
    `);

    try {
      this.db.exec("BEGIN");
      for (const notice of notices) {
        const id = notice.fingerprint || notice.id;
        const originalId = id; // 合并前的原始指纹：用于区分"同一公告重采集"与"同项目另一条公告"
        const projectKey = sameProjectKey(notice, allRows, this);
        let existing = selectById.get(id);
        // 关键变化公告（澄清/变更/延期/终止/中标）不作为重复合并，独立保留并关联同一项目时间线，
        // 以便独立提醒，保留修改前后记录。
        const isKeyChangeType = notice.isKeyChange === true;
        if (!existing && !isKeyChangeType) {
          const found = allRows.find((row) => {
            const storedNotice = this.rowToNotice(row);
            // 不把关键变化公告作为合并目标
            if (storedNotice.isKeyChange === true) return false;
            return sameProject(storedNotice, notice);
          });
          if (found) {
            existing = found;
            notice.fingerprint = found.id;
            notice.id = found.id;
          }
        }

        if (!existing) {
          insert.run(
            id, projectKey || id, notice.contentHash,
            notice.sourceId, notice.sourceName, notice.sourceType,
            notice.detailUrl, notice.originalOfficialUrl || notice.detailUrl,
            notice.title, notice.publishDate, notice.purchaser || notice.structured?.purchaser,
            notice.structured?.province, notice.structured?.city, notice.noticeType, notice.stage,
            notice.category, notice.categoryLabel, notice.isActionable ? 1 : 0, notice.isKeyChange ? 1 : 0,
            JSON.stringify(notice.score || {}), JSON.stringify(notice),
            notice.ownerId || "", notice.followStatus || "未跟进", "",
            notice.firstSeenAt || runAt, runAt
          );
          allRows.push({ id, rawJson: JSON.stringify(notice), ...notice });
          result.inserted += 1;
          if (addTimeline(timelineInsert, notice, projectKey || id, runAt)) result.timelineAdded += 1;
          continue;
        }

        const existingNotice = this.rowToNotice(existing);
        const incomingSources = notice.relatedSources || [];
        const mergedSources = uniqueSources([...(existingNotice.relatedSources || []), ...incomingSources, sourceRef(notice)]);
        const merged = { ...existingNotice, relatedSources: mergedSources };
        // 走到此分支的都是通过 sameProject 合并到已有记录的公告：同一公告重采集或同项目同阶段跨来源转载。
        // 这类一律不算"变更"，只合并来源、更新采集时间。
        // 真正的变更/延期/中标公告有独立指纹（fingerprint 含阶段），走 insert 分支 + 时间线，不靠 updated 计数。
        const businessChanged = false;
        const changed = false;

        if (changed) {
          // 变更/延期不删除旧记录：旧内容保存为时间线事件，正文更新为新版本
          let changeDetail = "";
          if (businessChanged) {
            changeDetail = `内容变更：截止时间 ${readText(existingNotice.structured?.bidDeadline?.raw, "未披露")} → ${readText(notice.structured?.bidDeadline?.raw, "未披露")}`;
          }
          if (isChangeNotice(notice)) changeDetail = `${changeDetail}（公告类型：${notice.noticeType}）`.trim();
          if (addTimeline(timelineInsert, existingNotice, existing.projectKey, runAt, changeDetail)) result.timelineAdded += 1;

          // 业务字段以新公告为准，但保留原公告标题（避免转载标题覆盖原公告）
          const next = { ...notice, title: notice.isKeyChange ? notice.title : (existingNotice.title || notice.title) };
          merged.title = next.title;
          updateChanged.run(
            notice.contentHash, notice.sourceId, notice.sourceName, notice.sourceType,
            notice.detailUrl, notice.originalOfficialUrl || notice.detailUrl,
            next.title, notice.publishDate, notice.purchaser || notice.structured?.purchaser,
            notice.structured?.province, notice.structured?.city, notice.noticeType, notice.stage,
            notice.category, notice.categoryLabel, notice.isActionable ? 1 : 0, notice.isKeyChange ? 1 : 0,
            JSON.stringify(notice.score || {}), JSON.stringify(merged), runAt, existing.id
          );
          result.updated += 1;
        } else {
          // 无业务变更：仅写回合并来源与采集时间，不计更新
          merged.rawJson = JSON.stringify(merged);
          updateMerged.run(JSON.stringify(merged), runAt, existing.id);
          result.duplicate += 1;
        }
        if (mergedSources.length > (existingNotice.relatedSources || []).length) result.mergedSources += 1;
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return result;
  }

  markSourceRun(status) {
    this.db.prepare(`INSERT INTO source_runs (sourceId,status,count,message,startedAt,finishedAt) VALUES (?,?,?,?,?,?)`)
      .run(status.sourceId, status.status, status.count || 0, status.message || "", status.startedAt || toIso(new Date()), status.finishedAt || toIso(new Date()));
  }

  recordSourceFailures(statuses) {
    for (const status of statuses) this.markSourceRun(status);
  }

  listNotices() {
    return this.db.prepare("SELECT * FROM notices ORDER BY publishDate DESC, firstSeenAt DESC").all().map((row) => this.rowToNotice(row));
  }

  getTimeline(projectKey) {
    return this.db.prepare("SELECT * FROM project_timeline WHERE projectKey=? ORDER BY publishDate, id").all(projectKey);
  }

  listSourceRuns(limit = 200) {
    return this.db.prepare("SELECT * FROM source_runs ORDER BY id DESC LIMIT ?").all(limit);
  }

  applyOverride(noticeId, field, value) {
    this.db.prepare(`INSERT INTO overrides (noticeId,field,value,updatedAt) VALUES (?,?,?,?)`).run(noticeId, field, String(value), toIso(new Date()));
    const row = this.db.prepare("SELECT * FROM notices WHERE id=?").get(noticeId);
    if (!row) return null;
    const notice = this.rowToNotice(row);
    notice[field] = value;
    this.db.prepare("UPDATE notices SET rawJson=?, ownerId=?, followStatus=?, notes=? WHERE id=?")
      .run(JSON.stringify(notice), notice.ownerId || "", notice.followStatus || "", notice.notes || "", noticeId);
    return notice;
  }

  listOverrides() {
    return this.db.prepare("SELECT * FROM overrides ORDER BY id DESC").all();
  }

  recordPush(record) {
    this.db.prepare(`INSERT INTO push_records (noticeId,personId,channel,status,reason,previewJson,sentAt) VALUES (?,?,?,?,?,?,?)`)
      .run(record.noticeId, record.personId, record.channel, record.status || "待发送", record.reason || "", JSON.stringify(record.preview || {}), record.sentAt || "");
  }

  listPushRecords(limit = 500) {
    return this.db.prepare("SELECT * FROM push_records ORDER BY id DESC LIMIT ?").all(limit);
  }

  wasPushed(noticeId, personId) {
    return this.db.prepare("SELECT id FROM push_records WHERE noticeId=? AND personId=? LIMIT 1").get(noticeId, personId) != null;
  }

  close() { this.db.close(); }
}

function sourceRef(notice) {
  return {
    sourceId: notice.sourceId, sourceName: notice.sourceName, sourceType: notice.sourceType,
    detailUrl: notice.detailUrl, title: notice.title,
    requiresManualCheck: Boolean(notice.requiresManualCheck),
    manualCheckReason: notice.manualCheckReason || ""
  };
}

function uniqueSources(sources) {
  const seen = new Set();
  return (sources || []).filter((s) => {
    if (!s || !s.sourceId) return false;
    const key = `${s.sourceId}|${s.detailUrl}|${s.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sameProjectKey(notice, rows, store) {
  // 项目关联以项目编号为主键（不含阶段），使同项目招标/变更/中标进入同一时间线。
  const projectNo = readText(notice.structured?.projectNo || notice.projectNo, "未披露");
  if (projectNo !== "未披露") {
    const found = rows.find((row) => {
      const n = store.rowToNotice(row);
      return readText(n.structured?.projectNo || n.projectNo, "未披露") === projectNo;
    });
    if (found) return found.projectKey;
    return `PRJ-${projectNo}`;
  }
  const found = rows.find((row) => sameProject(store.rowToNotice(row), notice));
  return found?.projectKey || null;
}

function addTimeline(insertStmt, notice, projectKey, now, changeDetail = "") {
  if (!projectKey) return false;
  insertStmt.run(projectKey, notice.id || notice.fingerprint, notice.stage, notice.noticeType, notice.title, notice.publishDate, changeDetail, now);
  return true;
}

module.exports = { Store, sameProject, isChangeNotice };
