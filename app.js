"use strict";
(function () {
  const DATA = window.APP_DATA || { notices: [], sourceStatus: {}, counts: {}, previewSummary: {}, config: {} };
  const ALL = DATA.notices || [];
  const state = { page: "home", globalCategory: "", selectedId: null, ws: "mine", detailTab: "info", detail: null };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  /* ---- 北京时间统一显示 ----
     数据中的时间有两种：ISO UTC（如 2026-11-18T08:34:48.994Z）与已规范化的北京时间字符串
     （如 2026-12-07 11:00）。这里统一解析为北京时间并格式化，保留原始值不做修改。 */
  function parseBeijing(s) {
    if (!s || /未披露|未提取到|待核实|提取待核实/.test(String(s))) return null;
    const raw = String(s).trim();
    let d = null;
    if (/Z$|[+-]\d{2}:?\d{2}$/.test(raw)) {
      d = new Date(raw); // 带时区的 ISO，JS 自动转本地时间戳，下面用北京偏移换算
    } else {
      const m = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2}))?/);
      if (m) {
        // 无时区字符串按北京时间（UTC+8）处理
        d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], (+(m[4] || 0) - 8), +(m[5] || 0)));
      }
    }
    return (d && !isNaN(d.getTime())) ? d : null;
  }
  function bjParts(s) {
    const d = parseBeijing(s);
    if (!d) return null;
    // 用北京时间偏移取得日历组件
    const bj = new Date(d.getTime() + 8 * 3600 * 1000);
    return {
      year: bj.getUTCFullYear(),
      md: `${bj.getUTCMonth() + 1}月${bj.getUTCDate()}日`,
      hm: `${String(bj.getUTCHours()).padStart(2, "0")}:${String(bj.getUTCMinutes()).padStart(2, "0")}`,
      today: `${bj.getUTCMonth() + 1}月${bj.getUTCDate()}日`
    };
  }
  const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
  function bjDayGroup(s) {
    const p = bjParts(s);
    if (!p) return null;
    // 用该日期本身（北京时间日历）计算星期，禁止写死或用年初日期代替
    const m = p.md.match(/(\d+)月(\d+)日/);
    const d = new Date(Date.UTC(p.year, Number(m[1]) - 1, Number(m[2])));
    return `${p.md} 星期${WEEK[d.getUTCDay()]}`;
  }
  function formatDate(s) { // 完整日期时间（北京时间）
    const p = bjParts(s);
    if (!p) return s && !/未披露|未提取到/.test(String(s)) ? String(s) : "未披露";
    return `${p.md} ${p.hm}`;
  }
  function formatShort(s) { // 仅日期（北京时间）
    const p = bjParts(s);
    return p ? p.md : "未披露";
  }
  function formatWithYear(s) {
    const p = bjParts(s);
    return p ? `${p.year}年${p.md} ${p.hm}` : "未披露";
  }
  function updateNoteText() {
    const p = bjParts(DATA.generatedAt);
    return p ? `更新于 ${p.md} ${p.hm}（北京时间）` : "更新时间待核实";
  }
  function linkCheck(x) { return (DATA.linkChecks || {})[x] || { status: "未核验", checkedAt: "" }; }
  function catLabel(n) { return `${n.category || "—"} ${n.categoryLabel || ""}`.trim(); }
  function scoreMini(n) {
    const s = n.score || {};
    if (s.confirmedScore == null) return "";
    const u = s.unknownCount || 0;
    return `<span class="item-score-mini" title="草案评分：已确认得分，未确认维度不计满分。评分不代表中标概率。">草案评分 <b>${s.confirmedScore}</b>${u ? ` · ${u}项待确认` : ""}</span>`;
  }
  function validityTag(n) {
    const v = n.validity || "有效性待核实";
    const cls = v === "当前有效" ? "valid" : v === "有效性待核实" ? "pending" : v === "已截止" || v === "历史追踪" ? "" : "";
    return `<span class="tag ${cls}">${esc(v)}</span>`;
  }

  function currentPageNotices() {
    return state.globalCategory ? ALL.filter((n) => n.category === state.globalCategory) : ALL;
  }

  /** 统一公告条目：第一层来源/日期/阶段 → 第二层标题 → 第三层业务字段 → 第四层理由 → 第五层操作 */
  function itemHtml(n) {
    const f = n.structured || {};
    const originalUrl = n.originalOfficialUrl || n.detailUrl || "";
    const hasOriginal = /^https?:\/\//.test(originalUrl);
    const deadline = formatDate(f.bidDeadline?.normalized);
    const region = [f.province, f.city].filter((x) => x && x !== "未披露" && x !== "待核实").join(" · ") || "待核实";
    return `<article class="item" data-id="${esc(n.id)}">
      <!-- 第一层：来源 · 发布日期 · 阶段 -->
      <div class="item-source">
        <span class="src-name">${esc(n.sourceName || "来源未披露")}</span>
        <span class="dot">·</span>
        <span>公告发布 ${esc(formatDate(n.publishDate))}</span>
        <span class="dot">·</span>
        <span class="stage">${esc(n.stage || "待核实")} / ${esc(n.noticeType || "待核实")}</span>
        ${scoreMini(n)}
      </div>
      <!-- 第二层：标题（最突出） -->
      <div class="item-title"><a href="#" class="link-detail">${esc(n.title)}</a></div>
      <!-- 第三层：关键业务字段 -->
      <div class="item-fields">
        <span class="field">采购单位 <b>${esc(f.purchaser || n.purchaser || "未披露")}</b></span>
        <span class="field">地区 <b>${esc(region)}</b></span>
        <span class="field">预算 <b>${esc(f.budget?.raw || "未披露")}</b></span>
        <span class="field deadline">投标截止 <b>${esc(deadline)}</b></span>
      </div>
      <!-- 第四层：相关性说明（规则依据，不伪装成人工判断） -->
      ${n.classificationReason ? `<div class="item-why"><span class="why-label">匹配依据：</span>${esc(n.classificationReason)}</div>` : ""}
      <!-- 标签：只保留帮助判断的少量状态 -->
      <div class="item-tags">
        ${validityTag(n)}
        <span class="tag">${esc(catLabel(n))}</span>
        ${n.isKeyChange ? '<span class="tag change">关键变化</span>' : ""}
        ${n.pendingItems?.length ? `<span class="tag pending">${n.pendingItems.length} 项待核实</span>` : ""}
      </div>
      <!-- 第五层：操作 -->
      <div class="item-actions">
        ${hasOriginal ? `<a class="mini-btn primary btn-external" href="${esc(originalUrl)}" target="_blank" rel="noopener">查看原公告</a>` : '<button class="mini-btn" disabled>原文链接待核实</button>'}
        <button class="mini-btn btn-detail" type="button">查看详情与评分依据</button>
      </div>
    </article>`;
  }

  /** 按发布日期分组的信息流（北京时间日期） */
  function feedHtml(list) {
    if (!list.length) return "";
    const groups = [];
    const map = {};
    list.forEach((n) => {
      const key = bjDayGroup(n.publishDate) || "日期待核实";
      if (!map[key]) { map[key] = []; groups.push(key); }
      map[key].push(n);
    });
    return groups.map((g) => `<div class="feed-day">
      <div class="feed-day-head"><span class="day">${esc(g)}</span><span class="count">${map[g].length} 条</span></div>
      <div class="feed-list">${map[g].map(itemHtml).join("")}</div>
    </div>`).join("");
  }

  function bindItemClicks(container) {
    container.querySelectorAll(".link-detail").forEach((a) => {
      a.addEventListener("click", (e) => { e.preventDefault(); openDetail(a.closest(".item").dataset.id); });
    });
    container.querySelectorAll(".btn-detail").forEach((b) => {
      b.addEventListener("click", () => openDetail(b.closest(".item").dataset.id));
    });
  }

  function renderHome() {
    const c = DATA.counts || {};
    const statuses = (DATA.sourceStatus || {}).statuses || [];
    // 紧凑一行统计：业务数字优先，管理信息降级到侧栏/管理页
    document.getElementById("homeStats").innerHTML = `
      <span class="stat-item ok"><b>${c.currentValid || 0}</b><span class="stat-label">当前有效机会</span></span>
      <span class="stat-item"><b>${c.noticeCount || 0}</b><span class="stat-label">真实公告（${c.projectCount || 0} 个项目）</span></span>
      <span class="stat-item warn"><b>${c.unverifiedValidity || 0}</b><span class="stat-label">有效性待核实</span></span>
      <span class="stat-item"><b>${c.history || 0}</b><span class="stat-label">历史追踪</span></span>`;
    // 数据说明折叠（不占首屏）
    document.getElementById("dataBanner").innerHTML = `<p>本页只展示实际采集、可追溯到原公告的真实信息。共 <b>${c.noticeCount || 0}</b> 条公告 / <b>${c.projectCount || 0}</b> 个项目。</p>
      <p style="margin-top:8px">${esc(DATA.statisticsNote || "")}</p>
      <p style="margin-top:8px">评分规则版本 <b>${esc(DATA.scoringRuleVersion || "")}</b>（${esc(DATA.scoringStatus || "待业务确认")}）；匹配规则版本 ${esc(DATA.matchingRuleVersion || "")}。评分仅为草案，不代表中标概率。</p>`;
    const R = window.CLOUD_RUN_STATUS;
    let note = updateNoteText();
    if (R && R.finishedAt) {
      const bj = new Date(Date.now() + 8 * 3600 * 1000);
      const after8 = (bj.getUTCHours() * 60 + bj.getUTCMinutes()) >= 8 * 60;
      const pubIsToday = R.lastPublishedDataAt && (() => {
        const p = parseBeijing(R.lastPublishedDataAt);
        const t = new Date(Date.now() + 8 * 3600 * 1000);
        return p && p.getUTCFullYear() === t.getUTCFullYear() && p.getUTCMonth() === t.getUTCMonth() && p.getUTCDate() === t.getUTCDate();
      })();
      if (R.status === "failed" || (after8 && !pubIsToday)) note += " · 今日更新延迟，展示上次成功数据";
      else if (R.sourceSummary && R.sourceSummary.failed > 0) note += " · 部分来源更新失败";
      else if (R.counts && R.counts.inserted === 0) note += " · 采集完成，暂无新增";
    }
    document.getElementById("updateNote").textContent = note;

    // 主栏：当前有效商机信息流
    const featured = ALL.filter((n) => n.validity === "当前有效" && ["A", "B"].includes(n.category));
    const filtered = state.globalCategory ? featured.filter((n) => n.category === state.globalCategory) : featured;
    const ordered = [...filtered].sort((a, b) => (b.publishDate || "").localeCompare(a.publishDate || ""));
    const featuredBox = document.getElementById("homeFeatured");
    featuredBox.innerHTML = ordered.length ? feedHtml(ordered) : '<div class="empty-panel"><strong>暂无当前有效商机</strong>本次采集未发现处于有效期内的明确相关项目。历史公告与待核实信息不计入当前机会。</div>';
    bindItemClicks(featuredBox);
    document.getElementById("homeFeaturedNote").textContent = `${ordered.length} 条 · 按发布日期分组`;

    // 侧栏：即将截止、关键变化分开列，明确历史属性
    const soon = ALL.filter((n) => {
      const d = n.structured?.bidDeadline?.normalized || "";
      if (!/20\d{2}-\d{2}-\d{2}/.test(d)) return false;
      const days = (new Date(d.replace(/-/g, "/")) - new Date()) / 86400000;
      return days >= 0 && days <= 30;
    }).sort((a, b) => (a.structured.bidDeadline.normalized || "").localeCompare(b.structured.bidDeadline.normalized || ""));
    const changes = ALL.filter((n) => n.isKeyChange).sort((a, b) => (b.publishDate || "").localeCompare(a.publishDate || ""));
    let side = "";
    side += `<div class="note-card"><h3>即将截止（30天内）</h3>${soon.length ? soon.slice(0, 6).map((n) => `<div class="tl-item"><span class="tl-date">截止 ${esc(formatDate(n.structured.bidDeadline.normalized))}</span><br>${esc(n.title.slice(0, 30))}${n.title.length > 30 ? "…" : ""}</div>`).join("") : '<div class="tl-item skip-note">暂无30天内截止的公告</div>'}</div>`;
    side += `<div class="note-card"><h3>关键变化提醒</h3>${changes.length ? changes.slice(0, 6).map((n) => `<div class="tl-item"><span class="tl-date">${esc(formatShort(n.publishDate))} · ${esc(n.categoryLabel || n.category)}</span><br>${esc(n.title.slice(0, 30))}${n.title.length > 30 ? "…" : ""}</div>`).join("") + '<div class="tl-item skip-note">以上为历史变更记录，按原发布日期显示。</div>' : '<div class="tl-item skip-note">暂无关键变化</div>'}</div>`;
    document.getElementById("homeDeadlines").innerHTML = side;

    document.getElementById("sidebarStatus").textContent = updateNoteText();
    document.getElementById("mobileStatus").textContent = (c.noticeCount || 0) + " 条真实公告";
  }

  function statusBadge(status) {
    const cls = /失败/.test(status) ? "b-e" : /零结果/.test(status) ? "b-b" : "b-a";
    return `<span class="badge ${cls}">${esc(status)}</span>`;
  }

  function renderActivity() {
    const kw = document.getElementById("filterKeyword").value.trim();
    const cat = document.getElementById("filterCategory").value;
    const region = document.getElementById("filterRegion").value;
    const stage = document.getElementById("filterStage").value;
    const validity = document.getElementById("filterValidity") ? document.getElementById("filterValidity").value : "";
    const owner = document.getElementById("filterOwner").value;
    const sort = document.getElementById("filterSort").value;
    let list = ALL.filter((n) => {
      const f = n.structured || {};
      if (kw) {
        const hay = `${n.title} ${f.purchaser || n.purchaser} ${f.content || ""} ${n.fullText || ""}`.toLowerCase();
        if (!hay.includes(kw.toLowerCase())) return false;
      }
      if (cat && n.category !== cat) return false;
      if (region && !(f.province || "").includes(region)) return false;
      if (stage && n.stage !== stage) return false;
      if (validity && n.validity !== validity) return false;
      if (owner) {
        const o = n.assignment?.primary?.personId || "待分派";
        if (o !== owner) return false;
      }
      return true;
    });
    list.sort((a, b) => {
      if (sort === "score") return (b.score?.confirmedScore || 0) - (a.score?.confirmedScore || 0);
      if (sort === "deadline") return (a.structured?.bidDeadline?.normalized || "9999").localeCompare(b.structured?.bidDeadline?.normalized || "9999");
      return (b.publishDate || "").localeCompare(a.publishDate || "");
    });
    document.getElementById("activityMeta").innerHTML = `共 <b>${list.length}</b> 条真实公告 · ${new Set(list.map((n) => n.projectKey || n.id)).size} 个项目（按项目编号去重）<button class="detail-back" style="margin-left:8px;margin-bottom:0" type="button" id="clearFiltersLink">清空筛选</button>`;
    const box = document.getElementById("activityList");
    box.innerHTML = list.length ? feedHtml(list) : '<div class="empty-panel"><strong>无匹配结果</strong>请调整筛选条件，或点击"清空筛选"查看全部公告。</div>';
    bindItemClicks(box);
    const clear = document.getElementById("clearFiltersLink");
    if (clear) clear.onclick = () => { document.getElementById("resetFilters").click(); };
    state.activityFiltered = list;
    window._activityFiltered = list;
  }

  function fillFilterOptions() {
    const regions = [...new Set(ALL.map((n) => n.structured?.province || "待核实").filter((p) => p && p !== "待核实"))].sort();
    const regionSel = document.getElementById("filterRegion");
    regions.forEach((r) => { const o = document.createElement("option"); o.value = r; o.textContent = r; regionSel.appendChild(o); });
    const ownerSel = document.getElementById("filterOwner");
    (DATA.config?.people || []).forEach((p) => { const o = document.createElement("option"); o.value = p.personId; o.textContent = p.name + (p.isTestData ? "（测试）" : ""); ownerSel.appendChild(o); });
    const u = document.createElement("option"); u.value = "待分派"; u.textContent = "待分派"; ownerSel.appendChild(u);
  }

  function openDetail(id) {
    const n = ALL.find((x) => x.id === id);
    if (!n) return;
    state.selectedId = id; state.detail = n; state.detailTab = "info";
    showPage("detail");
    renderDetail();
  }

  function renderDetail() {
    const n = state.detail;
    if (!n) { document.getElementById("detailContainer").innerHTML = '<div class="empty-panel">请从列表选择一个项目查看详情</div>'; return; }
    const f = n.structured || {};
    const s = n.score || {};
    const kw = (n.evidence || []).map((e) => `<span class="chip">${esc(e)}</span>`).join("");
    const heads = [["info", "结构化信息"], ["score", "评分明细"], ["evidence", "原文证据"], ["timeline", "公告时间线"], ["follow", "跟进与推送"]];
    let body = "";
    if (state.detailTab === "info") {
      const meta = f.fieldMeta || {};
      const originalUrl = n.originalOfficialUrl || n.detailUrl || "";
      const check = linkCheck(originalUrl);
      const withStatus = (k, label) => {
        const v = f[k] || "未披露";
        const st = (meta[k] && meta[k].status) || "";
        const ev = (meta[k] && meta[k].evidence) || "";
        return `<dt>${label}</dt><dd class="${/未披露|待核实/.test(String(v)) ? "missing" : ""}">${esc(v)} <span class="field-status">${esc(st)}</span>${ev ? `<div class="field-evidence">原文证据：${esc(ev)}</div>` : ""}</dd>`;
      };
      body = `${/^https?:\/\//.test(originalUrl) ? `<p class="skip-note" style="margin-bottom:10px">原文链接核验：${esc(check.status)}（核验于 ${esc(formatDate(check.checkedAt))}）</p>` : ""}
        <div class="reading-block"><h3>关键字段</h3></div>
        <dl class="kv">
          ${withStatus("projectNo", "项目编号")}
          ${withStatus("lotNo", "标段编号")}
          ${withStatus("purchaser", "采购单位/招标人")}
          ${withStatus("agency", "代理机构")}
          <dt>项目实施地区</dt><dd><b>${esc(f.province || "待核实")} ${esc(f.city || "")}</b> <span class="field-status">${esc((meta.province || {}).status || "")}</span><div class="field-evidence">原文证据：${esc((meta.province || {}).evidence || "")}（采购单位、代理机构所在地分列，不影响项目地区）</div></dd>
          <dt>投标截止（北京时间）</dt><dd><b>${esc(formatWithYear(f.bidDeadline?.normalized))}</b> <span class="field-status">${esc((meta.bidDeadline || {}).status || "")}</span></dd>
          <dt>开标时间（北京时间）</dt><dd>${esc(formatWithYear(f.bidOpeningTime?.normalized))}</dd>
          <dt>报名截止</dt><dd>${esc(formatDate(f.signupDeadline?.normalized))}</dd>
          <dt>招标文件获取截止</dt><dd>${esc(formatDate(f.fileAcquireDeadline?.normalized))}</dd>
          <dt>预算 / 规模金额</dt><dd class="${f.budget?.raw === "未披露" ? "missing" : ""}">${esc(f.budget?.raw || "未披露")} <span class="field-status">${esc((meta.budget || {}).status || "")}</span></dd>
          <dt>中标金额 / 单价</dt><dd>${esc(f.winningAmount?.raw || "未披露")} / ${esc(f.unitPrice?.raw || "未披露")}</dd>
          ${withStatus("deposit", "保证金要求")}
          <dt>产品类别 / 型号</dt><dd>${esc(n.productCategory || "待核实")}${n.matchedModels?.length ? " · " + esc(n.matchedModels.map((m) => m.model + "(" + m.status + ")").join("、")) : ""}</dd>
          <dt>数量</dt><dd>${esc(f.quantity || "未披露")}</dd>
        </dl>
        <div class="reading-block"><h3>采购内容</h3><div class="reading-text">${esc(f.content || "未披露（原文未提取到采购内容描述）")}${f.content && f.content !== "未披露" ? `<div class="field-evidence">原文证据：${esc((meta.content || {}).evidence || "")}（状态：${esc((meta.content || {}).status || "")}）</div>` : ""}</div></div>
        <div class="reading-block"><h3>资格要求</h3><div class="reading-text">${esc(f.qualification || "未披露（公告未披露或系统未成功提取，请回原文核实）")}</div></div>
        ${f.techRequirement && f.techRequirement !== "未披露" ? `<div class="reading-block"><h3>技术要求</h3><div class="reading-text">${esc(f.techRequirement)}</div></div>` : ""}
        <div class="reading-block"><h3>分类理由与待核实</h3><div class="reading-text">${esc(n.classificationReason || "")}</div>
        <div class="chip-row" style="margin-top:8px">${(n.pendingItems || []).length ? (n.pendingItems || []).map((x) => `<span class="chip">${esc(x)}</span>`).join(" ") : '<span class="chip">无需核实事项</span>'}</div></div>`;
    } else if (state.detailTab === "score") {
      body = `<div class="data-banner">业务评分与信息可信度分别展示。评分表示适配优先级，<b>不代表中标概率</b>。规则版本 ${esc(s.ruleVersion || "")}（${esc(s.configStatus || "待业务确认")}）。</div>
        <div style="font-size:13px;margin-bottom:12px"><b>已确认得分：<span style="color:var(--accent);font-size:18px">${s.confirmedScore}</span></b> ／ 可能范围 ${esc(s.possibleMin)}–${esc(s.possibleMax)} ／ 未知维度 ${s.unknownCount} 个 ／ 优先级 <b>${esc(s.priority?.label || "")}</b></div>
        ${(s.dimensions || []).map((d) => `<div class="score-dim">
          <div class="score-dim-head"><b>${esc(d.label)}</b><span>${d.score == null ? "待确认" : d.score} / ${d.max} · ${esc(d.status)}</span></div>
          <div class="bar"><i style="width:${d.score == null ? 0 : Math.round(d.score / d.max * 100)}%"></i></div>
          <div class="score-dim.evidence">证据：${esc(d.evidence)}${d.flag ? `<span class="flag">${esc(d.flag)}</span>` : ""}</div>
        </div>`).join("")}
        <div class="data-banner" style="margin-top:12px">${esc(s.note || "")} 竞争度/废标风险：${esc(s.competitionNote || "暂无证据，不量化")}</div>`;
    } else if (state.detailTab === "evidence") {
      body = `<div style="font-size:12.5px;color:var(--ink2);margin-bottom:10px">匹配依据（来自原文/标题的可核查片段）：</div>
        <div class="chip-row">${kw || '<span class="skip-note">无命中证据</span>'}</div>
        <div style="margin-top:14px;font-size:12.5px"><b>行业语境：</b>${esc((n.tobaccoContext?.buyer || []).concat(n.tobaccoContext?.usage || []).join("、") || "未命中")}</div>
        <div style="margin-top:8px;font-size:12.5px"><b>设备语境：</b>${esc((n.deviceContextHits || []).join("、") || "未命中")}</div>
        <div style="margin-top:8px;font-size:12.5px"><b>命中词：</b>强词 ${esc((n.matchedStrong || []).flatMap((g) => g.hits).join("、") || "无")}；通用词 ${esc((n.matchedWeak || []).flatMap((g) => g.hits).join("、") || "无")}</div>
        <details style="margin-top:14px"><summary style="cursor:pointer;font-size:12.5px;color:var(--navy2)">查看采集正文（前 1500 字）</summary><pre style="white-space:pre-wrap;font-size:12px;background:#faf8f3;padding:12px;border-radius:8px;margin-top:8px">${esc((n.fullText || "").slice(0, 1500))}</pre></details>`;
    } else if (state.detailTab === "timeline") {
      const tl = n.timeline || [];
      body = tl.length ? `<div class="timeline">${tl.map((t) => `<div class="tl-item"><span class="tl-date">${esc(t.publishDate ? formatDate(t.publishDate) : "日期待核实")}</span> · ${esc(t.noticeType || "")} · ${esc(t.title || "")}${t.changeDetail ? `<div class="skip-note">${esc(t.changeDetail)}</div>` : ""}</div>`).join("")}</div><div class="skip-note">同一项目的采购意向/招标/变更/中标公告按项目编号关联；变更与延期保留修改前后记录。</div>` : '<div class="empty-panel">该项目暂无关联公告</div>';
    } else if (state.detailTab === "follow") {
      body = `<div class="panel-body" style="padding:0">
        <div style="font-size:13px;margin-bottom:10px"><b>负责人：</b>${esc(n.assignment?.primary?.name || "待分派")} ${n.assignment?.status === "人工调整" ? "（人工调整）" : ""}　<b>协同：</b>${esc((n.assignment?.collaborators || []).map((p) => p.name).join("、") || "无")}</div>
        <div style="font-size:12.5px;color:var(--ink2)">${esc(n.assignment?.reason || "")}</div>
        <div style="margin-top:14px;font-size:13px"><b>跟进状态：</b>${esc(n.followStatus || "未跟进")}</div>
        <div style="margin-top:10px"><button class="mini-btn" type="button" id="btnFollow">更新跟进状态</button> <button class="mini-btn" type="button" id="btnAssign">人工调整负责人</button></div>
        <div class="data-banner" style="margin-top:14px">真实人员尚未配置，当前无负责人、无推送接收人；渠道未配置，不生成推送任务、不向任何人发送消息。</div>
      </div>`;
    }
    const original = n.originalOfficialUrl || n.detailUrl || "";
    document.getElementById("detailContainer").innerHTML = `
      <div class="detail-head">
        <button class="detail-back" type="button" id="backList">← 返回列表</button>
        <h2>${esc(n.title)}</h2>
        <div class="item-tags" style="margin-bottom:12px">
          ${validityTag(n)}<span class="tag">${esc(catLabel(n))}</span>
          <span class="tag">${esc(n.stage || "待核实")} / ${esc(n.noticeType || "待核实")}</span>
          ${scoreMini(n)}
        </div>
        <div class="detail-source">
          <span>来源 <b>${esc(n.sourceName || "未披露")}${n.sourceType === "official" ? "（官方）" : "（第三方转载）"}</b></span>
          <span>公告发布 <b>${esc(formatWithYear(n.publishDate))}</b></span>
          <span>最近采集 <b>${esc(formatDate(n.lastSeenAt || n.discoveredAt))}</b></span>
          <span>采购单位 <b>${esc(f.purchaser || n.purchaser || "未披露")}</b></span>
        </div>
        <div class="item-actions">
          ${/^https?:\/\//.test(original) ? `<a class="mini-btn primary btn-external" href="${esc(original)}" target="_blank" rel="noopener">查看原公告</a>` : '<button class="mini-btn" disabled>原文链接待核实</button>'}
          <button class="mini-btn" type="button" id="watchedBtn">加入关注</button>
        </div>
      </div>
      <div class="detail-tabs">${heads.map(([k, label]) => `<button class="${state.detailTab === k ? "active" : ""}" data-tab="${k}" type="button">${label}</button>`).join("")}</div>
      <div class="reading-col">${body}</div>`;
    document.getElementById("backList").onclick = () => showPage(state.globalCategory ? "activity" : "home");
    document.querySelectorAll(".detail-tabs button").forEach((b) => b.onclick = () => { state.detailTab = b.dataset.tab; renderDetail(); });
    const wb = document.getElementById("watchedBtn");
    if (wb) wb.onclick = () => { alert("关注状态写入需要后端 API，本版本未提供写入入口。"); };
    const bf = document.getElementById("btnFollow");
    if (bf) bf.onclick = () => { alert("跟进状态写入需要后端 API 与权限控制，本版本未提供写入入口，请线下记录。"); };
    const ba = document.getElementById("btnAssign");
    if (ba) ba.onclick = () => { alert("人工调整负责人需写入后台配置 assignment.json 的 manualOverrides 并重新运行流水线。"); };
  }

  function renderWorkspace() {
    const ws = state.ws;
    let list = [];
    if (ws === "mine") list = ALL.filter((n) => n.assignment?.primary && !n.assignment.primary.isTestData);
    else if (ws === "pending") list = ALL.filter((n) => n.assignment?.status === "待分派" || n.category === "B");
    else if (ws === "deadline") list = ALL.filter((n) => { const d = n.structured?.bidDeadline?.normalized || ""; if (!/20\d{2}-\d{2}-\d{2}/.test(d)) return false; return (new Date(d) - new Date()) / 86400000 <= 30; });
    else if (ws === "watched") list = ALL.filter((n) => n.isKeyChange);
    else if (ws === "unverified") list = ALL.filter((n) => (n.score?.unknownCount || 0) >= 2 || n.category === "B");
    const box = document.getElementById("workspaceList");
    const emptyMsg = ws === "mine"
      ? '<div class="empty-panel"><strong>暂无"我负责的"项目</strong>真实人员尚未配置，没有可归属的负责人，所有公告均为"待分派"。</div>'
      : '<div class="empty-panel"><strong>暂无项目</strong>该视图下没有匹配项。</div>';
    box.innerHTML = list.length ? list.map(itemHtml).join("") : emptyMsg;
    bindItemClicks(box);
  }

  function renderPeople() {
    const people = require_config("assignment").people || [];
    const rules = require_config("assignment").rules || {};
    const unassigned = ALL.filter((n) => n.assignment?.status === "待分派");
    document.getElementById("peopleList").innerHTML = people.length ? `<table class="table"><thead><tr><th>人员</th><th>岗位</th><th>负责区域</th><th>负责产品/型号</th><th>角色/优先级</th><th>接收渠道</th><th>最低分</th><th>接收待核实/变更</th></tr></thead><tbody>${people.map((p) => `<tr><td>${esc(p.name)}<div class="skip-note">${esc(p.personId)}</div></td><td>${esc(p.role)}</td><td><div class="chip-row">${(p.regions || []).map((r) => `<span class="chip">${esc(r)}</span>`).join("") || "全国"}</div></td><td><div class="chip-row">${(p.products || []).map((r) => `<span class="chip">${esc(r)}</span>`).join("")}${(p.models || []).map((r) => `<span class="chip">${esc(r)}</span>`).join("")}</div></td><td>${p.isPrimary ? "主负责人" : "协同"} · P${p.priority}</td><td>${esc((p.channels || []).join("、"))}</td><td>${p.minScore}</td><td>${p.acceptUnverifiedLeads ? "接收" : "不接收"} / ${p.acceptKeyChanges ? "接收变更" : "不接收"}</td></tr>`).join("")}</tbody></table>` : '<div class="empty-panel"><strong>真实人员尚未配置</strong>未提供任何人员名单与联系方式。所有公告显示"待分派"，不自动指定负责人。请由业务提供真实人员后在 config/assignment.json 中配置。</div>';
    document.getElementById("assignmentRules").innerHTML = `<ul style="font-size:12.5px;padding-left:18px;line-height:2">
      <li>按区域 + 产品/型号匹配负责人：${rules.matchByRegionAndProduct ? "启用" : "未启用"}</li>
      <li>无人匹配：<b>进入待分派</b>，不强行指定</li>
      <li>多人匹配：按优先级确定主负责人，其余为协同人员</li>
      <li>允许人工调整并保存：${rules.allowManualOverride ? "启用" : "未启用"}</li>
      <li>${esc(rules.noBlanketPush ? "禁止把所有公告无差别推给所有人" : "")}</li></ul>`;
    const uBox = document.getElementById("unassignedList");
    uBox.innerHTML = unassigned.length ? `<table class="table"><thead><tr><th>公告</th><th>地区</th><th>分类</th><th>原因</th></tr></thead><tbody>${unassigned.map((n) => `<tr><td>${esc(n.title.slice(0, 40))}</td><td>${esc(n.structured?.province || "待核实")}</td><td>${esc(n.category)}</td><td>${esc(n.assignment?.reason || "")}</td></tr>`).join("")}</tbody></table>` : '<div class="empty-panel">全部公告均已匹配负责人</div>';
  }

  function require_config(name) {
    // 配置通过 app-data.js 暴露的精简视图读取；人员详细规则在 app-data.js 内嵌
    return (DATA.assignmentDetails || {})[name] || {};
  }

  function renderPush() {
    const channels = DATA.config?.channels || [];
    document.getElementById("channelList").innerHTML = `<table class="table"><thead><tr><th>渠道</th><th>状态</th><th>说明</th></tr></thead><tbody>${channels.map((c) => `<tr><td>${esc(c.label)}</td><td>${/未配置/.test(c.status) ? '<span class="badge b-e">未配置</span>' : `<span class="badge b-a">${esc(c.status)}</span>`}</td><td>未提供密钥与收件人，不调用真实接口；密钥使用环境变量</td></tr>`).join("")}</tbody></table>`;
    const subs = require_config("channels").subscriptions || [];
    document.getElementById("subscriptionList").innerHTML = `<table class="table"><thead><tr><th>订阅</th><th>频率</th><th>渠道</th><th>阈值</th><th>范围</th><th>状态</th></tr></thead><tbody>${subs.map((s) => `<tr><td>${esc(s.label)}</td><td>${esc(s.frequency)}</td><td>${esc(s.channel)}</td><td>${s.minScore}</td><td>${s.acceptUnverifiedLeads ? "含待核实" : "仅明确"}${s.acceptKeyChanges ? " · 含关键变化" : ""}</td><td><span class="badge b-b">${esc(s.status)}</span></td></tr>`).join("")}</tbody></table>`;
    const preview = require_config("preview") || {};
    document.getElementById("pushPreviewNote").textContent = `${preview.previewCount || 0} 条待发送预览 · ${preview.skippedCount || 0} 条跳过`;
    const box = document.getElementById("pushPreview");
    const items = preview.previews || [];
    box.innerHTML = items.length ? items.map((p) => `<div class="preview-card">
      <h4>${esc(p.personName)}（${esc(p.personId)}） · ${esc(p.channel)} · ${statusBadge(p.channelStatus)}</h4>
      <div class="skip-note">项目：${esc(p.noticeTitle)} ｜ 得分 ${esc(p.score)} ｜ 触发原因：${esc(p.reason)} ｜ 决策：${esc(p.decision)}</div>
      <div class="msg">${esc(formatPreviewMessage(p.message))}</div>
    </div>`).join("") : '<div class="empty-panel"><strong>无推送预览</strong>真实人员与渠道均未配置，没有接收人，不生成任何推送任务。请先由业务提供真实人员名单、渠道与密钥。</div>';
  }

  function formatPreviewMessage(m) {
    if (!m) return "";
    return `【标题】${m.title}
【采购单位】${m.purchaser}
【采购内容】${m.content}
【地区】${m.region}
【阶段】${m.stage}
【评分】已确认 ${m.score?.confirmed} / 可能 ${m.score?.possibleRange}（${m.score?.priority}）
【分类理由】${m.reason}
【待核实】${(m.pendingItems || []).join("、") || "无"}
【截止】报名 ${m.deadlines?.signup} / 投标 ${m.deadlines?.bid}
【负责人】${m.owner}${m.collaborators?.length ? "（协同：" + m.collaborators.join("、") + "）" : ""}
【建议动作】${m.recommendedAction}
【原文】${m.originalUrl}
（规则版本 ${m.ruleVersion || ""}）`;
  }

  /** 云端自动更新状态：采集/保存/构建/部署/线上核验分别展示，不互相替代 */
  function autoStatusHtml() {
    const R = window.CLOUD_RUN_STATUS;
    const D = window.DEPLOY_STATUS; // 仅由 workflow 部署步骤生成并随站点发布
    if (!R || !R.startedAt) {
      return '<div class="empty-panel"><strong>云端自动更新尚未运行</strong>网站当前展示本地采集数据。云端定时采集需在 GitHub Actions 实际运行后显示状态；计划时间不是执行保证。</div>';
    }
    const now = new Date();
    const bj = new Date(now.getTime() + 8 * 3600 * 1000);
    const todayStr = `${bj.getUTCFullYear()}-${String(bj.getUTCMonth() + 1).padStart(2, "0")}-${String(bj.getUTCDate()).padStart(2, "0")}`;
    const dataDate = DATA.generatedAt ? formatDate(DATA.generatedAt) : "未知";
    const dataIsToday = DATA.generatedAt && (() => {
      const p = parseBeijing(DATA.generatedAt);
      return p && `${p.getUTCFullYear()}-${String(p.getUTCMonth() + 1).padStart(2, "0")}-${String(p.getUTCDate()).padStart(2, "0")}` === todayStr;
    })();
    const after8 = (bj.getUTCHours() * 60 + bj.getUTCMinutes()) >= 8 * 60;
    const deployed = Boolean(D && D.deployedAt && D.runId);
    const onlineMatches = deployed && D.dataVersion && DATA.generatedAt && D.dataVersion === DATA.generatedAt;
    let banner = "";
    if (R.status === "failed") banner = '今日采集未完成，当前展示上次成功数据';
    else if (after8 && !dataIsToday) banner = '今日更新延迟，当前展示上次成功数据';
    else if (R.sourceSummary && R.sourceSummary.failed > 0) banner = '部分来源更新失败';
    else if (R.counts && R.counts.inserted === 0 && R.status === "success") banner = '采集完成，暂无新增';
    const src = R.sourceSummary || {};
    const stage = (label, value, ok) => `<dt>${label}</dt><dd>${esc(value)} <span class="field-status">${ok ? "已完成" : "未完成/未验证"}</span></dd>`;
    return `${banner ? `<div class="data-banner test-banner" style="margin-bottom:14px">${esc(banner)}</div>` : ""}
      <div class="kv" style="max-width:820px">
        <dt>每日计划（北京）</dt><dd>主任务 03:35 · 兜底 06:35 <span class="field-status">计划时间，非执行保证</span></dd>
        <dt>下一计划时间</dt><dd>${esc((R.nextScheduled || {}).beijing || "待核实")} <span class="field-status">仅计划</span></dd>
        <dt>最近一次运行</dt><dd>${esc(R.finishedBeijing || formatDate(R.finishedAt))} · ${esc(R.status === "success" ? "成功" : R.status === "partial" ? "部分成功" : "失败")} <span class="field-status">运行ID ${esc(R.runId || "未知")}</span></dd>
        ${stage("① 来源采集", (R.collectResult || "未知") + `（成功 ${src.success || 0} / 零结果 ${src.empty || 0} / 失败 ${src.failed || 0}）`, R.collectResult === "success" || R.collectResult === "partial")}
        ${stage("② 数据保存", R.saveResult || "未知", R.saveResult === "success")}
        ${stage("③ 本地构建（_site）", R.buildResult || "未知", R.buildResult === "success")}
        ${stage("④ 云端部署", deployed ? `已部署 · 运行ID ${D.runId}` : "未部署（本地构建不等于部署）", deployed)}
        ${stage("⑤ 线上访问核验", D && D.verifiedAt ? `已核验 ${esc(formatDate(D.verifiedAt))}` : "未验证", Boolean(D && D.verifiedAt))}
        <dt>线上数据版本</dt><dd>${onlineMatches ? "与当前页面一致（数据版本 " + esc(dataDate) + "）" : (deployed ? "线上为本轮部署，但数据版本未匹配" : "无部署记录")}</dd>
        <dt>最近成功采集</dt><dd>${esc(R.lastSuccessCollectedAt ? formatDate(R.lastSuccessCollectedAt) : "无成功记录")}</dd>
        <dt>最近成功部署时间</dt><dd>${esc(R.lastDeployedAt ? formatDate(R.lastDeployedAt) : "无")} <span class="field-status">本地构建时间不作为部署时间</span></dd>
        <dt>本轮统计</dt><dd>获取 ${R.counts?.fetched || 0} · 新增 ${R.counts?.inserted || 0} · 变更 ${R.counts?.updated || 0} · 重复 ${R.counts?.duplicate || 0} · 排除 ${R.counts?.excluded || 0} · 最终公告 ${R.counts?.notices || 0} · 项目 ${R.counts?.projects || 0}</dd>
      </div>
      ${(R.sources || []).some((s) => s.error) ? `<div class="reading-block"><h3>来源错误详情</h3><div class="reading-text">${R.sources.filter((s) => s.error).map((s) => `${esc(s.sourceName)}：${esc(s.error)}`).join("\n")}</div></div>` : ""}
      <p class="skip-note" style="margin-top:12px">排查入口：GitHub Actions 中的 Daily Tobacco Bid Intelligence 运行记录（需仓库访问权限）。</p>`;
  }

  function renderSources() {
    const box = document.getElementById("autoStatus");
    if (box) box.innerHTML = autoStatusHtml();
    const configs = require_config("sources").sources || [];
    const st = DATA.sourceStatus || {};
    const runMap = {}; (st.statuses || []).forEach((s) => runMap[s.sourceId] = s);
    document.getElementById("sourceList").innerHTML = `<table class="table"><thead><tr><th>来源</th><th>属性</th><th>覆盖</th><th>列表/正文/分页</th><th>附件条件</th><th>业务优先</th><th>采集状态</th><th>最近验证</th></tr></thead><tbody>${configs.map((c) => `<tr><td>${c.urls && c.urls.home && /^https?:\/\//.test(c.urls.home) ? `<a href="${esc(c.urls.home)}" target="_blank" rel="noopener" style="color:var(--navy2);text-decoration:underline">${esc(c.sourceName)} ↗</a>` : esc(c.sourceName)}</td><td>${c.sourceType === "official" ? "官方" : "第三方"}</td><td>${esc(c.region || c.industry || "")}</td><td>${c.listCapability ? "列表✓" : "列表?"} ${c.detailCapability ? "正文✓" : "正文?"} ${c.pagination && c.pagination !== "待核验" ? "分页✓" : "分页?"}</td><td>${esc(c.attachmentAccess || "待核验")}</td><td>P${c.businessPriority}</td><td>${c.enabled ? statusBadge((runMap[c.sourceId] || {}).status || c.collectionStatus) : `<span class="badge b-e">${esc(c.collectionStatus)}</span>`}</td><td>${esc(c.lastVerifiedAt || "待核验")}</td></tr>`).join("")}</tbody></table>
      <div class="skip-note" style="margin-top:10px">失败原因：${configs.filter((c) => c.failureReason).map((c) => esc(c.sourceName) + "—" + esc(c.failureReason)).join("；") || "无"}</div>`;
    const runs = st.statuses || [];
    document.getElementById("sourceRuns").innerHTML = runs.length ? `<table class="table"><thead><tr><th>来源</th><th>状态</th><th>条数</th><th>开始</th><th>结束</th><th>说明</th></tr></thead><tbody>${runs.map((r) => `<tr><td>${esc(r.sourceName)}</td><td>${statusBadge(r.status)}</td><td>${r.count}</td><td>${esc(r.startedAt ? formatDate(r.startedAt) : "时间待核实")}</td><td>${esc(r.finishedAt ? formatDate(r.finishedAt) : "时间待核实")}</td><td>${esc(r.error || r.message || "采集完成")}</td></tr>`).join("")}</tbody></table>` : '<div class="empty-panel">尚无采集运行记录</div>';
    document.getElementById("configSummary").innerHTML = `<div style="font-size:12.5px;line-height:2">
      <div>匹配规则版本：<b>${esc(DATA.matchingRuleVersion || "")}</b> ｜ 评分规则版本：<b>${esc(DATA.scoringRuleVersion || "")}</b>（${esc(DATA.scoringStatus || "待业务确认")}）</div>
      <div>强产品词：切丝机 / 切梗机 / SQ34A / SQ35 / SQ39 等（型号核实状态见业务画像）</div>
      <div>通用词：切丝设备 / 制丝设备 / 刀片 / 砂轮 / 维修 —— 必须结合烟草行业与设备语境才计入</div>
      <div>排除词：食堂 / 保安 / 办公用品 / 车辆租赁 / 一般土建 / 医疗 等；宽泛表达不直接等同公司产品</div>
      <div>评分六维：产品型号35 · 服务能力20 · 资格15 · 区域10 · 预算10 · 响应时间10；未知维度不计满分</div>
    </div>`;
  }

  function exportCsv() {
    const list = window._activityFiltered || ALL;
    const cols = [["公告标题", (n) => n.title], ["分类", (n) => n.category + " " + (n.categoryLabel || "")], ["阶段", (n) => n.stage + "/" + (n.noticeType || "")], ["采购单位", (n) => n.structured?.purchaser || n.purchaser || ""], ["地区", (n) => (n.structured?.province || "") + "/" + (n.structured?.city || "")], ["预算", (n) => n.structured?.budget?.raw || ""], ["投标截止", (n) => n.structured?.bidDeadline?.normalized || ""], ["已确认得分", (n) => n.score?.confirmedScore], ["未知维度数", (n) => n.score?.unknownCount], ["负责人", (n) => n.assignment?.primary?.name || "待分派"], ["公告状态", (n) => n.validity || ""], ["来源网站", (n) => n.sourceName || ""], ["发布日期(北京)", (n) => formatDate(n.publishDate)], ["最近采集(北京)", (n) => formatDate(n.lastSeenAt || n.discoveredAt)], ["原文链接", (n) => n.originalOfficialUrl || n.detailUrl || ""]];
    const escCsv = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const csv = "\ufeff" + cols.map((c) => escCsv(c[0])).join(",") + "\n" + list.map((n) => cols.map((c) => escCsv(c[1](n))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "昆明二机_招采动态_" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function showPage(page) {
    state.page = page;
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
    document.querySelectorAll(".page").forEach((s) => s.classList.remove("active"));
    const el = document.getElementById("page-" + page); if (el) el.classList.add("active");
    const titles = {
      home: ["商机精选", "值得关注的真实项目，来自公开招采公告"],
      activity: ["全部公告", "搜索与筛选所有已采集的真实公告"],
      detail: ["项目详情", "结构化信息、原文证据与评分依据"],
      workspace: ["我的工作台", "待处理、即将截止、已关注与待核实"],
      people: ["人员与分派", "真实人员尚未配置 · 全部待分派"],
      push: ["订阅推送", "渠道未配置 · 无推送任务"],
      sources: ["采集来源", "来源覆盖、实测状态与采集结果"],
      workflow: ["全流程工作台", "在同一网页内完成公告筛选、审批、标书草稿与 Word 导出"]
    };
    document.getElementById("pageTitle").textContent = (titles[page] || ["", ""])[0];
    document.getElementById("pageSubtitle").textContent = (titles[page] || ["", ""])[1];
    if (page === "home") renderHome();
    if (page === "activity") renderActivity();
    if (page === "detail") renderDetail();
    if (page === "workspace") renderWorkspace();
    if (page === "people") renderPeople();
    if (page === "push") renderPush();
    if (page === "sources") renderSources();
    if (page !== "home") document.getElementById("updateNote").textContent = updateNoteText();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function buildMobileNav() {
    const box = document.getElementById("mobileNav");
    if (!box) return;
    // 复制桌面侧栏导航按钮，保证行为与选中状态一致
    document.querySelectorAll(".sidebar .nav-item").forEach((b) => {
      const c = b.cloneNode(true);
      c.onclick = () => showPage(c.dataset.page);
      box.appendChild(c);
    });
  }

  function init() {
    const simBanner = document.getElementById("simulationBanner");
    if (simBanner && DATA.simulation?.enabled) {
      simBanner.hidden = false;
      simBanner.innerHTML = `<strong>${DATA.simulation.label}</strong>：${DATA.simulation.warning} 样机公告：${DATA.simulation.realPilotNotice?.title || "未配置"}。`;
    }
    fillFilterOptions();
    buildMobileNav();
    document.querySelectorAll(".nav-item").forEach((b) => b.onclick = () => showPage(b.dataset.page));
    document.querySelectorAll(".category-tab").forEach((b) => b.onclick = () => {
      state.globalCategory = b.dataset.globalCategory;
      document.querySelectorAll(".category-tab").forEach((x) => x.classList.toggle("active", x === b));
      if (state.page === "home") renderHome(); else showPage("activity");
    });
    ["filterKeyword", "filterCategory", "filterRegion", "filterStage", "filterValidity", "filterOwner", "filterSort"].forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener("input", renderActivity); el.addEventListener("change", renderActivity);
    });
    document.getElementById("resetFilters").onclick = () => {
      ["filterKeyword", "filterCategory", "filterRegion", "filterStage", "filterValidity", "filterOwner"].forEach((id) => document.getElementById(id).value = "");
      document.getElementById("filterSort").value = "publish"; renderActivity();
    };
    document.getElementById("exportCsv").onclick = exportCsv;
    document.querySelectorAll("#workspaceTabs button").forEach((b) => b.onclick = () => { state.ws = b.dataset.ws; document.querySelectorAll("#workspaceTabs button").forEach((x) => x.classList.toggle("active", x === b)); renderWorkspace(); });
    window.addEventListener("hashchange", handleHash);
    function handleHash() {
      const m = location.hash.match(/^#(home|activity|detail|workspace|people|push|sources|workflow)(?:\/(.+))?$/);
      if (m) {
        if (m[1] === "detail" && m[2]) { state.selectedId = decodeURIComponent(m[2]); state.detail = ALL.find((x) => x.id === state.selectedId) || state.detail; }
        showPage(m[1]);
      }
    }
    handleHash();
    if (!location.hash) renderHome();
  }

  // 把配置细节注入前端（由流水线写入 app-data.js）
  window.addEventListener("DOMContentLoaded", init);
})();
