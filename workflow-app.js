"use strict";
/* 烟草招投标全流程本地 Demo：本地存储模拟审批/附件/标书库，导出真实 .docx。 */
const DATA = window.APP_DATA || { notices: [], counts: {} };
const KEY = "tobacco-bid-demo-v1";
const $ = (id) => document.getElementById(id);

const DEMO_MANAGERS = [
  { name: "滇中片区经理（模拟）", provinces: ["云南"] },
  { name: "西南片区经理（模拟）", provinces: ["四川", "贵州", "重庆"] },
  { name: "西北片区经理（模拟）", provinces: ["陕西", "甘肃", "青海", "宁夏", "新疆"] },
  { name: "华北片区经理（模拟）", provinces: ["北京", "天津", "河北", "山西", "内蒙古"] },
  { name: "华东片区经理（模拟）", provinces: ["上海", "江苏", "浙江", "安徽", "山东", "福建", "江西"] },
  { name: "华南片区经理（模拟）", provinces: ["广东", "广西", "海南"] },
  { name: "东北片区经理（模拟）", provinces: ["辽宁", "吉林", "黑龙江"] },
  { name: "华中片区经理（模拟）", provinces: ["河南", "湖北", "湖南"] }
];
const LIBRARY_SEED = [
  { id: "lib1", name: "企业资质与营业执照汇编（模拟）", type: "资格证明", note: "演示资源，非真实证书" },
  { id: "lib2", name: "烟草机械同类项目业绩表（模拟）", type: "业绩", note: "3 条模拟业绩，仅演示" },
  { id: "lib3", name: "技术方案标准章节（模拟）", type: "技术方案", note: "设备改造、安装调试、验收" },
  { id: "lib4", name: "售后服务承诺模板（模拟）", type: "服务承诺", note: "响应时间与质保期" },
  { id: "lib5", name: "安全生产与合规承诺（模拟）", type: "合规", note: "安全生产、节能减排、环保" }
];

function defaultState() {
  return {
    role: "sales",
    applications: {},
    attachments: {},
    drafts: {},
    library: JSON.parse(JSON.stringify(LIBRARY_SEED)),
    selectedNoticeId: "",
    log: []
  };
}
let state = load();
function load() {
  try { return Object.assign(defaultState(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch (e) { return defaultState(); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove("show"), 2200);
}
function log(action, detail) {
  state.log.unshift({ at: new Date().toISOString(), action, detail });
  state.log = state.log.slice(0, 50);
}

function demoOwner(n) {
  const p = String(n.structured?.province || "");
  for (const m of DEMO_MANAGERS) if (m.provinces.some((x) => p.includes(x))) return m.name;
  return "待分派";
}
function daysLeft(n) {
  const raw = n.structured?.bidDeadline?.normalized;
  if (!raw || raw === "未披露") return null;
  const d = new Date(raw.replace(" ", "T"));
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
function getRisks(n) {
  const f = n.structured || {};
  const out = [];
  const add = (level, text) => out.push({ level, text });
  if (n.isKeyChange) add("高", "关键变化公告，必须核对最新变更与截止时间");
  const days = daysLeft(n);
  if (days != null && days < 0) add("高", "投标截止时间已过");
  else if (days != null && days < 7) add("高", `投标截止仅剩 ${days} 天，响应时间紧张`);
  if ((n.score?.unknownCount || 0) >= 2) add("中", `存在 ${n.score.unknownCount} 项信息不足，评分含未知项`);
  if (!f.budget || f.budget.raw === "未披露") add("中", "预算未披露，需核实采购规模");
  if (f.qualification === "未披露" || f.techRequirement === "未披露") add("中", "资格或技术要求未披露，需购标核实");
  if (f.bidOpeningTime?.raw && /远程不见面|CA/.test(f.bidOpeningTime.raw)) add("低", "远程开标/CA 要求，需提前办理数字证书");
  if (f.deposit === "未披露") add("低", "保证金要求未披露，需核对招标文件");
  if (!out.length) add("低", "未发现明显风险，仍需核对原公告");
  return out;
}
function notices() {
  return (DATA.notices || []).map((n) => Object.assign({}, n, { _owner: demoOwner(n), _risks: getRisks(n) }));
}
function riskLevel(n) {
  const r = n._risks || [];
  if (r.some((x) => x.level === "高")) return "高";
  if (r.some((x) => x.level === "中")) return "中";
  return "低";
}
function appStatus(id) { return state.applications[id]?.status || "未申请"; }
function roleName() {
  if (state.role === "manager") return "公司高层（模拟）";
  if (state.role === "admin") return "管理员（演示）";
  return "滇中片区经理（模拟）";
}
function canActOn(n) {
  if (state.role === "manager" || state.role === "admin") return true;
  return n._owner === roleName();
}

function renderStats() {
  const ns = notices();
  const st = { 未申请: 0, 申请中: 0, 已批准: 0, 已驳回: 0 };
  ns.forEach((n) => { st[appStatus(n.id)] = (st[appStatus(n.id)] || 0) + 1; });
  $("stats").innerHTML = [
    ["真实公告", ns.length], ["当前有效", ns.filter((n) => n.isActionable).length],
    ["已自动分派", ns.filter((n) => n._owner !== "待分派").length], ["投标申请中", st["申请中"]],
    ["已批准", st["已批准"]], ["已上传最终标书", Object.values(state.attachments).filter((a) => (a.final || []).length).length]
  ].map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join("");
}
function renderFlow() {
  const steps = [
    ["自动采集", true], ["清洗入库", true], ["评分与风险", true], ["片区自动分派", true],
    ["销售筛选申请", Object.values(state.applications).some((a) => a.status === "申请中") || Object.values(state.applications).some((a) => a.status === "已批准")],
    ["高层审批", Object.values(state.applications).some((a) => a.status === "已批准")],
    ["标书草稿+Word", Object.keys(state.drafts).length > 0],
    ["上传最终标书", Object.values(state.attachments).some((a) => (a.final || []).length)]
  ];
  $("flowStatus").innerHTML = steps.map(([s, d]) => `<span class="step ${d ? "done" : ""}">${d ? "✓ " : ""}${s}</span>`).join("");
}
function renderRiskSummary() {
  const ns = notices();
  const c = { 高: 0, 中: 0, 低: 0 };
  ns.forEach((n) => c[riskLevel(n)]++);
  $("riskSummary").innerHTML = `<div class="row"><span class="chip red">高风险 ${c.高}</span><span class="chip amber">中风险 ${c.中}</span><span class="chip green">低风险 ${c.低}</span></div><p class="muted">风险由截止时间、信息完整性、资格/技术要求披露情况、关键变化等规则自动生成，不替代人工判断。</p>`;
}
function renderNotices() {
  const kw = $("kw").value.trim();
  const owner = $("ownerFilter").value;
  const risk = $("riskFilter").value;
  let rows = notices().filter((n) => {
    if (kw && !`${n.title}${n.structured?.purchaser || ""}`.includes(kw)) return false;
    if (owner && n._owner !== owner) return false;
    if (risk && riskLevel(n) !== risk) return false;
    return true;
  }).slice(0, 60);
  if (!rows.length) { $("noticeTable").innerHTML = `<tr><td class="empty">无匹配公告</td></tr>`; return; }
  const head = `<tr><th>公告</th><th>地区/片区</th><th>评分</th><th>风险</th><th>负责人</th><th>状态</th><th>操作</th></tr>`;
  $("noticeTable").innerHTML = head + rows.map((n) => {
    const st = appStatus(n.id);
    const can = canActOn(n);
    const op = st === "未申请" && can
      ? `<button class="btn small" data-act="apply" data-id="${n.id}">申请投标</button>`
      : st === "申请中" && (state.role === "manager" || state.role === "admin")
        ? `<button class="btn small" data-act="approve" data-id="${n.id}">审批</button>`
        : `<button class="btn small ghost" data-act="detail" data-id="${n.id}">详情</button>`;
    return `<tr><td class="title">${n.title}<div class="muted">${n.structured?.purchaser || "采购单位未披露"}</div></td>
      <td>${n.structured?.province || "待核实"}<div class="muted">${n._owner}</div></td>
      <td><b>${n.score?.confirmedScore ?? "—"}</b><div class="muted">${n.score?.priority?.label || "—"}</div></td>
      <td><span class="chip ${riskLevel(n) === "高" ? "red" : riskLevel(n) === "中" ? "amber" : "green"}">${riskLevel(n)}风险</span><div class="muted">${n._risks[0]?.text || ""}</div></td>
      <td>${n._owner}</td><td><span class="chip ${st === "已批准" ? "green" : st === "申请中" ? "amber" : st === "已驳回" ? "red" : "blue"}">${st}</span></td><td>${op}</td></tr>`;
  }).join("");
}
function renderApproval() {
  const ns = notices();
  const pending = ns.filter((n) => appStatus(n.id) === "申请中");
  const mine = ns.filter((n) => state.role === "sales" ? n._owner === roleName() : true);
  const list = state.role === "sales" ? mine.filter((n) => appStatus(n.id) !== "未申请") : pending;
  $("approvalList").innerHTML = list.length ? list.map((n) => {
    const a = state.applications[n.id] || {};
    const buttons = state.role !== "sales" && a.status === "申请中"
      ? `<div class="row"><button class="btn small" data-act="approve-yes" data-id="${n.id}">批准</button><button class="btn small ghost" data-act="approve-no" data-id="${n.id}">驳回</button></div>`
      : "";
    return `<div class="item"><div class="title">${n.title}</div><div class="muted">申请说明：${a.note || "未填写"}｜负责人：${n._owner}｜状态：${a.status}</div>${buttons}</div>`;
  }).join("") : `<div class="empty">${state.role === "sales" ? "你还没有提交投标申请" : "暂无待审批事项"}</div>`;
  $("approvalHelp").innerHTML = `<div class="muted">当前角色：${roleName()}。审批动作会写入本机模拟记录，刷新后仍保留；清除浏览器数据或点“重置演示数据”会清空。</div>`;
}
function renderDocs() {
  const ns = notices();
  const approved = ns.filter((n) => appStatus(n.id) === "已批准");
  $("approvedList").innerHTML = approved.length ? approved.map((n) =>
    `<div class="item"><div class="title">${n.title}</div><div class="row"><button class="btn small" data-act="select-doc" data-id="${n.id}">处理标书</button><span class="chip green">已批准</span></div></div>`
  ).join("") : `<div class="empty">暂无已批准投标项</div>`;
  $("libraryList").innerHTML = state.library.map((x) =>
    `<div class="item"><div class="title">${x.name}</div><div class="muted">${x.type}｜${x.note}</div></div>`
  ).join("") + `<div class="field"><input id="libName" placeholder="新增模拟资源名称"><button class="btn small ghost" id="addLibBtn">加入标书库</button></div>`;

  const id = state.selectedNoticeId && approved.some((n) => n.id === state.selectedNoticeId) ? state.selectedNoticeId : approved[0]?.id;
  if (!id) { $("draftWorkspace").innerHTML = `<div class="empty">请先批准一个投标项，再生成标书草稿</div>`; return; }
  const n = ns.find((x) => x.id === id);
  const at = state.attachments[id] || { template: [], requirement: [], final: [] };
  const draft = state.drafts[id] || "";
  $("draftWorkspace").innerHTML = `
    <div class="muted">当前投标项：${n.title}</div>
    <div class="grid2">
      <div class="field"><label>上传招标模板（仅记录文件名演示）</label><input type="file" id="tplFile" data-kind="template"><button class="btn small ghost" data-act="fake-upload" data-kind="template">添加演示附件</button></div>
      <div class="field"><label>上传竞标要求（仅记录文件名演示）</label><input type="file" id="reqFile" data-kind="requirement"><button class="btn small ghost" data-act="fake-upload" data-kind="requirement">添加演示附件</button></div>
    </div>
    <div class="row"><span class="chip">模板：${at.template.map((x) => x.name).join("、") || "未上传"}</span><span class="chip">要求：${at.requirement.map((x) => x.name).join("、") || "未上传"}</span></div>
    <div class="row" style="margin-top:10px"><button class="btn" id="genDraftBtn">生成标书草稿</button><button class="btn ghost" id="exportWordBtn" ${draft ? "" : "disabled"}>导出 Word</button></div>
    ${draft ? `<div class="draft" id="draftText">${escapeHtml(draft)}</div>` : ""}
    <div class="field"><label>上传最终投标书（仅记录文件名演示）</label><input type="file" id="finalFile" data-kind="final"><button class="btn small ghost" data-act="fake-upload" data-kind="final">添加演示附件</button></div>
    <div class="muted">最终标书：${at.final.map((x) => x.name).join("、") || "未上传"}</div>`;
}
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

function renderAll() {
  document.querySelectorAll(".role-btn").forEach((b) => b.classList.toggle("active", b.dataset.role === state.role));
  $("roleName").textContent = roleName();
  const owners = [...new Set(notices().map((n) => n._owner))].filter((x) => x !== "待分派");
  const sel = $("ownerFilter"); const old = sel.value;
  sel.innerHTML = `<option value="">全部负责人</option>` + owners.map((x) => `<option>${x}</option>`).join("");
  sel.value = old;
  renderStats(); renderFlow(); renderRiskSummary(); renderNotices(); renderApproval(); renderDocs();
}

function showPage(page) {
  document.querySelectorAll(".nav").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  document.querySelectorAll(".page").forEach((p) => p.classList.toggle("active", p.id === `page-${page}`));
  const titles = { overview: ["总览", "全流程闭环演示，所有操作仅保存在本机浏览器"], pipeline: ["商机与分派", "真实公告 + 模拟片区规则，评分与风险自动计算"], approval: ["投标审批", "销售申请 → 高层审批"], docs: ["标书与文档", "附件、标书库、草稿生成与 Word 导出"] };
  $("pageTitle").textContent = titles[page][0]; $("pageSub").textContent = titles[page][1];
}
function apply(id) {
  const n = notices().find((x) => x.id === id); if (!n) return;
  if (!canActOn(n)) return toast("该公告不属于当前模拟负责人，无法申请");
  const note = prompt("填写投标申请说明（演示）：", `建议跟进：${n.title.slice(0, 24)}…`);
  if (note == null) return;
  state.applications[id] = { status: "申请中", note, applicant: roleName(), at: new Date().toISOString() };
  log("提交投标申请", n.title); save(); renderAll(); toast("已提交投标申请");
}
function approve(id, yes) {
  const a = state.applications[id]; if (!a) return;
  a.status = yes ? "已批准" : "已驳回"; a.reviewer = roleName(); a.decidedAt = new Date().toISOString();
  const n = notices().find((x) => x.id === id);
  log(yes ? "批准投标" : "驳回投标", n?.title || id); save(); renderAll(); toast(yes ? "已批准" : "已驳回");
}
function generateDraft(id) {
  const n = notices().find((x) => x.id === id); if (!n) return;
  const at = state.attachments[id] || {}; const f = n.structured || {};
  const resources = state.library.map((x) => `（${x.type}）${x.name}`).join("；");
  const lines = [
    `${n.title}——投标文档草稿（演示）`,
    "",
    "编制人（演示）：王丽莎",
    `生成时间：${new Date().toLocaleString("zh-CN")}`,
    `数据版本：${DATA.generatedAt || "本地导入"}`,
    "",
    "一、项目理解",
    `采购单位：${f.purchaser || "未披露"}。项目内容：${f.content || "未披露"}。预算：${f.budget?.raw || "未披露"}。`,
    "",
    "二、投标响应要点",
    `1. 响应范围：${f.content || "按招标文件第五章要求响应"}。`,
    `2. 交货/服务地点：${f.province || "待核实"}/${f.city || "待核实"}。`,
    `3. 关键时间：投标截止 ${f.bidDeadline?.normalized || "未披露"}；开标 ${f.bidOpeningTime?.normalized || "未披露"}。`,
    `4. 资格要求：${f.qualification === "无" ? "公告披露特定资格要求为无，一般资格要求按招标文件响应" : (f.qualification || "未披露，需购标核实")}。`,
    "",
    "三、风险提示与应对措施",
    ...(n._risks || []).map((r, i) => `${i + 1}. [${r.level}] ${r.text}；应对：人工核对原公告与招标文件，必要时补充资料。`),
    "",
    "四、拟调用的标书库资源（模拟）",
    resources,
    "",
    "五、附件引用（仅文件名演示，不含真实文件内容）",
    `招标模板：${(at.template || []).map((x) => x.name).join("、") || "未上传"}`,
    `竞标要求：${(at.requirement || []).map((x) => x.name).join("、") || "未上传"}`,
    "",
    "六、声明",
    "本草稿由本地 Demo 依据公告正文与模拟标书库自动生成，仅用于演示；不代表真实投标承诺。完整技术要求需以购标取得的招标文件为准。",
    `工作台：https://shasha791.github.io/kunming-tobacco-bid-intel/`
  ];
  state.drafts[id] = lines.join("\n"); log("生成标书草稿", n.title); save(); renderAll(); toast("草稿已生成，可导出 Word");
}

/* ---- 极简 DOCX 生成：纯 JS 写 ZIP + OpenXML，无外部依赖 ---- */
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function enc(s) { return new TextEncoder().encode(s); }
function xmlEsc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c])); }
function zipStore(files) {
  const parts = [], central = []; let offset = 0;
  const now = new Date(); const time = ((now.getHours() & 31) << 11) | ((now.getMinutes() & 63) << 5) | ((now.getSeconds() / 2) & 31);
  const date = (((now.getFullYear() - 1980) & 127) << 9) | (((now.getMonth() + 1) & 15) << 5) | (now.getDate() & 31);
  for (const [name, content] of files) {
    const nb = enc(name), db = enc(content), crc = crc32(db);
    const local = new Uint8Array(30 + nb.length); const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint16(8, 0, true);
    lv.setUint16(10, time, true); lv.setUint16(12, date, true); lv.setUint32(14, crc, true);
    lv.setUint32(18, db.length, true); lv.setUint32(22, db.length, true); lv.setUint16(26, nb.length, true); lv.setUint16(28, 0, true);
    local.set(nb, 30); parts.push(local, db);
    const cd = new Uint8Array(46 + nb.length); const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true); cv.setUint16(14, date, true); cv.setUint32(16, crc, true);
    cv.setUint32(20, db.length, true); cv.setUint32(24, db.length, true); cv.setUint16(28, nb.length, true);
    cv.setUint16(30, 0, true); cv.setUint16(32, 0, true); cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true); cv.setUint32(42, offset, true);
    cd.set(nb, 46); central.push(cd);
    offset += local.length + db.length;
  }
  const cdSize = central.reduce((s, x) => s + x.length, 0);
  const eocd = new Uint8Array(22); const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true); ev.setUint16(20, 0, true);
  return new Blob([...parts, ...central, eocd], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
function makeDocx(text) {
  const lines = text.split("\n");
  const paras = lines.map((line, i) => {
    const bold = i === 0 || /^[一二三四五六七八九十]、/.test(line);
    const sz = i === 0 ? 28 : 21;
    return `<w:p><w:pPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${xmlEsc(line || " ")}</w:t></w:r></w:p>`;
  }).join("");
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1080" w:bottom="1440" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const drels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="SimSun" w:hAnsi="Calibri"/><w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
  return zipStore([["[Content_Types].xml", types], ["_rels/.rels", rels], ["word/document.xml", doc], ["word/_rels/document.xml.rels", drels], ["word/styles.xml", styles]]);
}
function exportWord(id) {
  const text = state.drafts[id]; if (!text) return toast("请先生成草稿");
  const n = notices().find((x) => x.id === id);
  const blob = makeDocx(text); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `${(n?.title || "投标草稿").slice(0, 30)}-草稿.docx`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500); log("导出 Word", n?.title || id); save(); toast("Word 已导出");
}

function bind() {
  document.querySelectorAll(".nav").forEach((b) => b.onclick = () => showPage(b.dataset.page));
  document.querySelectorAll(".role-btn").forEach((b) => b.onclick = () => { state.role = b.dataset.role; save(); renderAll(); toast("已切换角色：" + roleName()); });
  ["kw", "ownerFilter", "riskFilter"].forEach((id) => $(id).addEventListener("input", renderNotices));
  $("reassignBtn").onclick = () => { renderAll(); toast("已按演示片区规则重新分派"); };
  $("resetBtn").onclick = () => { if (!confirm("确认清空本机演示数据并恢复初始状态？")) return; localStorage.removeItem(KEY); state = defaultState(); save(); renderAll(); toast("演示数据已重置"); };
  $("exportAllBtn").onclick = () => {
    const blob = new Blob([JSON.stringify({ state, notices: notices().length, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "bid-demo-flow.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const { act, id } = b.dataset;
    if (act === "apply") apply(id);
    if (act === "approve") showPage("approval");
    if (act === "approve-yes") approve(id, true);
    if (act === "approve-no") approve(id, false);
    if (act === "fake-upload") {
      const kind = b.dataset.kind;
      const targetId = state.selectedNoticeId || notices().find((n) => appStatus(n.id) === "已批准")?.id;
      if (!targetId) return toast("请先选择已批准投标项");
      const names = { template: "招标文件模板（演示）.docx", requirement: "竞标要求与评分办法（演示）.docx", final: "最终投标书（演示）.docx" };
      state.attachments[targetId] = state.attachments[targetId] || { template: [], requirement: [], final: [] };
      state.attachments[targetId][kind] = [{ name: names[kind], size: 1024, type: "demo", at: new Date().toISOString() }];
      log("添加演示附件", `${kind}: ${names[kind]}`); save(); renderAll(); toast("演示附件已记录");
    }
    if (act === "detail") { const n = notices().find((x) => x.id === id); alert(`${n?.title}\n\n风险：${(n?._risks || []).map((r) => `[${r.level}] ${r.text}`).join("\n")}`); }
    if (act === "select-doc") { state.selectedNoticeId = id; save(); renderDocs(); toast("已选择投标项"); }
  });
  document.addEventListener("change", (e) => {
    const f = e.target; if (!f.matches("input[type=file][data-kind]")) return;
    const id = state.selectedNoticeId || notices().find((n) => appStatus(n.id) === "已批准")?.id; if (!id) return;
    const kind = f.dataset.kind; state.attachments[id] = state.attachments[id] || { template: [], requirement: [], final: [] };
    state.attachments[id][kind] = [...(f.files || [])].map((x) => ({ name: x.name, size: x.size, type: x.type, at: new Date().toISOString() }));
    log("上传附件（演示）", `${kind}: ${state.attachments[id][kind].map((x) => x.name).join("、")}`); save(); renderAll(); toast("附件信息已记录（演示，不含真实文件内容）");
  });
  document.addEventListener("click", (e) => {
    if (e.target.id === "addLibBtn") {
      const v = $("libName")?.value.trim(); if (!v) return toast("请输入资源名称");
      state.library.push({ id: "lib" + Date.now(), name: v, type: "自定义", note: "本地演示资源" }); save(); renderDocs(); toast("已加入标书库（演示）");
    }
    if (e.target.id === "genDraftBtn") { const id = state.selectedNoticeId || notices().find((n) => appStatus(n.id) === "已批准")?.id; if (id) generateDraft(id); }
    if (e.target.id === "exportWordBtn") { const id = state.selectedNoticeId || notices().find((n) => appStatus(n.id) === "已批准")?.id; if (id) exportWord(id); }
  });
}
function init() { if (!Object.keys(state.applications).length) save(); bind(); renderAll(); }
init();
