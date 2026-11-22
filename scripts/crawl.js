"use strict";
const fs = require("node:fs/promises");
const path = require("node:path");
const { collectEnabled } = require("./sources/registry");

const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(ROOT, "data", "crawled-notices.json");
const STATUS_OUT = path.join(ROOT, "data", "source-statuses.json");

async function main() {
  const result = await collectEnabled();
  // 全部失败不覆盖上次成功数据
  if (result.overall === "全部失败") {
    await fs.writeFile(STATUS_OUT, JSON.stringify(result.statuses, null, 2), "utf8");
    console.error("[采集失败] 全部来源失败，保留上次成功数据不变。");
    process.exitCode = 1;
    return;
  }
  await fs.writeFile(OUTPUT, JSON.stringify(result.notices, null, 2), "utf8");
  await fs.writeFile(STATUS_OUT, JSON.stringify({ generatedAt: new Date().toISOString(), overall: result.overall, statuses: result.statuses }, null, 2), "utf8");
  console.log(`采集完成：${result.notices.length} 条公告，总体状态 ${result.overall}`);
  for (const s of result.statuses) console.log(` - ${s.sourceName}: ${s.status}，${s.count} 条${s.error ? `（${s.error}）` : ""}`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exitCode = 1; });
module.exports = { main };
