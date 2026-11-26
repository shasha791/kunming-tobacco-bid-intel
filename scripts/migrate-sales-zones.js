"use strict";
/**
 * 一次性迁移：为已入库公告补写 salesZone（销售片区），与项目所在地区分列。
 * 幂等：已存在正确销售片区的记录不改动。
 */
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { salesZoneOfNotice } = require("../lib/assign");

const ROOT = path.join(__dirname, "..");
const DB = process.env.NOTICE_DB_PATH || path.join(ROOT, "data", "notices.sqlite");

function main() {
  const db = new DatabaseSync(DB);
  const rows = db.prepare("SELECT id, rawJson FROM notices").all();
  const update = db.prepare("UPDATE notices SET rawJson=? WHERE id=?");
  let changed = 0;
  db.exec("BEGIN");
  for (const row of rows) {
    const notice = JSON.parse(row.rawJson || "{}");
    const zone = salesZoneOfNotice(notice);
    if (notice.salesZone === zone) continue;
    notice.salesZone = zone;
    update.run(JSON.stringify(notice), row.id);
    changed += 1;
  }
  db.exec("COMMIT");
  db.close();
  console.log(`[migrate] notices=${rows.length} changed=${changed}`);
}

if (require.main === module) main();
module.exports = { main };
