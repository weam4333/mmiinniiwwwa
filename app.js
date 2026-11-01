/* ============ Mini@ᯇᴗᯇ —— 原型逻辑 ============ */
(function () {
  'use strict';

  /* ---------------- 工具 ---------------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const uid = (p) => (p || 'id') + '_' + Math.random().toString(36).slice(2, 9);
  const now = () => Date.now();
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (ts) => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function relTime(ts) {
    const d = new Date(ts), n = new Date();
    const sameDay = d.toDateString() === n.toDateString();
    if (sameDay) return hhmm(ts);
    const y = new Date(n.getTime() - 864e5);
    if (d.toDateString() === y.toDateString()) return '昨天';
    const diff = (n - d) / 864e5;
    if (diff < 7) return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    return (d.getMonth() + 1) + '/' + d.getDate();
  }
  function dayLabel(ts) {
    const d = new Date(ts), n = new Date();
    if (d.toDateString() === n.toDateString()) return '今天 ' + hhmm(ts);
    const y = new Date(n.getTime() - 864e5);
    if (d.toDateString() === y.toDateString()) return '昨天 ' + hhmm(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日 ${hhmm(ts)}`;
  }
  const fullTime = (ts) => { const d = new Date(ts); return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${hhmm(ts)}`; };

  /* ---------------- 常量 ---------------- */
  const COLORS = [
    ['#93a1a8', '林'], ['#9fb2b8', '沈'], ['#a79fb5', '陆'], ['#9caba3', '周'],
    ['#b3b09c', '温'], ['#b8a0a2', '白'], ['#8fa3b5', '顾'], ['#a8a49b', '许'],
  ];

  /* 状态字典：QQ 式在线状态 */
  const STATUS = {
    on:   { label: '在线',       dot: 'on' },
    busy: { label: '忙碌',       dot: 'busy' },
    away: { label: '离开',       dot: 'away' },
    rest: { label: '请勿打扰',   dot: 'rest' },
    hide: { label: '隐身',       dot: '' },
  };
  const STATUS_WORDS = [
    '在线', '听歌中', '发呆中', '在忙', '刚睡醒', '摸鱼', '出差中',
    '在写东西', '正在读你的笔记', '手机快没电了', '勿扰', '在等你',
  ];

  /* 关系字典：朋友（绿）/ 恋人（粉）/ 亲人（黄），选了就跟着名字走 */
  const REL = {
    friend: { label: '朋友' },
    lover:  { label: '恋人' },
    kin:    { label: '亲人' },
  };
  const REL_ICONS = {
    friend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7.5" r="3.4"/><path d="M3.2 19.5c.9-3.4 3.2-5.2 5.8-5.2s4.9 1.8 5.8 5.2"/><circle cx="17" cy="8.8" r="2.7"/><path d="M17.4 14.9c2.1.4 3.5 1.9 4.1 4.6"/></svg>',
    lover: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 20.6 4.6 13.2a5 5 0 0 1 7-7l.4.4.4-.4a5 5 0 0 1 7 7z"/></svg>',
    kin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M6.3 10.2v9.8h11.4v-9.8"/></svg>',
  };
  function relBadge(ch) {
    const r = ch && REL[ch.rel];
    if (!r) return '';
    return `<span class="rel-badge" data-rel="${ch.rel}">${REL_ICONS[ch.rel]}${r.label}</span>`;
  }
  const KIND_LABEL = { diary: '日记', read: '读书笔记', memo: '备忘录' };
  const TABS = ['chat', 'moments', 'notes', 'stickers', 'me'];

  /* ---------------- 初始数据 ---------------- */
  const H = 3600e3, M = 60e3;
  const T = now();

  function seed() {
    // 没有任何预置角色：一切由用户自己创建
    return {
      version: 2,
      chars: [],
      chats: [],
      moments: [],
      notes: [],
      todos: [],
      marks: [],
      narr: null,
      nstickers: [],   // 旧字段：笔记贴纸（迁移到 pstickers）
      gstickers: [],   // 通用表情：所有聊天 + 贴纸栏都能用
      pstickers: [],   // 笔记专用贴纸：只在笔记里贴
      noteKinds: [
        { id: 'diary', label: '日记' },
        { id: 'read', label: '读书笔记' },
        { id: 'memo', label: '备忘录' },
      ],
      games: [],
      cards: [],
      settings: {
        me: { name: '我', initial: '我', color: '#93a1a8', avatar: null },
        notifications: true,
        speed: 60,
        sim: true,
        simStart: T,
        autoReply: true,
        readReceipt: true,
        notifyRange: true,
        theme: 'warm',
        ai: { enabled: false, key: '', model: 'deepseek-chat', endpoint: 'https://api.deepseek.com/chat/completions' },
        annoPref: { onMoment: true, onNote: true, onChat: false },
        todoRemind: true,
        todoSpeed: 'auto',
      },
      unreadMoments: 0,
      lastActive: T,
    };
  }

  /* ---------------- 存储 ---------------- */
  const KEY = 'pillowtalk.v1';
  let S;
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && (d.version === 1 || d.version === 2)) return migrate(d);
      }
    } catch (e) { /* ignore */ }
    return seed();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('存储空间不足，图片可能过大'); }
  }
  // 旧版（v1）里带了一批预置角色与示例数据，升级时清掉它们，只保留用户自己创建的
  const SEED_CHAR_IDS = ['c_sh', 'c_lw', 'c_zx', 'c_by'];
  const SEED_MOMENT_IDS = ['mo_1', 'mo_2'];
  const SEED_NOTE_IDS = ['nt_1', 'nt_2', 'nt_3'];
  const SEED_TODO_IDS = ['td_1', 'td_2', 'td_3', 'td_4'];

  function migrate(d) {
    if (d.version >= 2) return d;
    d.version = 2;
    const keepChar = (id) => SEED_CHAR_IDS.indexOf(id) < 0;
    d.chars = (d.chars || []).filter((c) => keepChar(c.id));
    d.chats = (d.chats || []).filter((c) => keepChar(c.charId));
    d.moments = (d.moments || []).filter((p) => SEED_MOMENT_IDS.indexOf(p.id) < 0);
    d.notes = (d.notes || []).filter((n) => SEED_NOTE_IDS.indexOf(n.id) < 0);
    d.todos = (d.todos || []).filter((t) => SEED_TODO_IDS.indexOf(t.id) < 0);
    (d.games || []).forEach((g) => {
      g.cast = (g.cast || []).filter((c) => keepChar(c.charId));
    });
    return d;
  }

  S = load();
  // 兼容旧版本数据
  if (!Array.isArray(S.todos)) S.todos = [];
  if (!Array.isArray(S.games)) S.games = [];
  // 旧数据里 cover 存的是 emoji，不是图片，这里区分开
  S.games.forEach((g) => {
    if (g.cover && !/^data:image/.test(g.cover)) { g.emoji = g.cover; g.cover = null; }
  });
  if (!S.settings.todoRemind) S.settings.todoRemind = S.settings.todoRemind === false ? false : true;
  if (!Array.isArray(S.cards)) S.cards = [];
  // 通用字卡以前分「主动消息 / 回复 / 动态评论 / 笔记批注」四种槽位，现在不分了：
  // 通用字卡任何时候都能说。旧数据里的 type 字段保留但不再参与挑选。
  if (!Array.isArray(S.marks)) S.marks = [];
  if (!S.narr || typeof S.narr !== 'object') S.narr = null;
  if (!Array.isArray(S.nstickers)) S.nstickers = [];
  if (!Array.isArray(S.gstickers)) S.gstickers = [];
  if (!Array.isArray(S.pstickers)) S.pstickers = [];
  // 旧版只有一份「笔记贴纸」，现在统一迁进「通用表情」——聊天里也能用
  if (S.nstickers.length) {
    S.nstickers.forEach((x) => { S.gstickers.push(x); });
    S.nstickers = [];
  }
  if (!Array.isArray(S.noteKinds) || !S.noteKinds.length) {
    S.noteKinds = [
      { id: 'diary', label: '日记' },
      { id: 'read', label: '读书笔记' },
      { id: 'memo', label: '备忘录' },
    ];
  }
  if (!S.settings.me) S.settings.me = { name: '我', initial: '我' };
  if (!S.settings.me.avatar) S.settings.me.avatar = null;
  if (!S.settings.me.color) S.settings.me.color = '#93a1a8';
  S.chars.forEach((c) => {
    if (!c.status) c.status = { kind: 'on', word: '在线' };
    if (!c.met) c.met = now() - 100 * 864e5;
    if (!c.impressions) c.impressions = [];
    if (!c.moments) c.moments = [];
  });

  /* 计算"加速时间" */
  function appClock() {
    const base = Date.now();
    if (!S.settings.sim) return base;
    return S.settings.simStart + (base - S.settings.simStart) * S.settings.speed;
  }
  const charOf = (id) => S.chars.find((c) => c.id === id);
  const chatOf = (charId) => S.chats.find((c) => c.charId === charId);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // 统一的"我"：名字、头像、底色都从设置里来
  function meObj() {
    const me = S.settings.me || { name: '我', initial: '我' };
    const col = /^#[0-9a-fA-F]{3,8}$/.test(me.color || '') ? me.color : '#93a1a8';
    return { name: me.name || '我', initial: me.initial || (me.name || '我').slice(0, 1), color: col, avatar: me.avatar || null };
  }

  // 统一图片压缩：长边缩到 max，转 JPEG（比 PNG 小很多，本地存储更省）
  function shrinkImage(file, max, cb, quality) {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        cb(cv.toDataURL('image/jpeg', quality || 0.82), w, h);
      };
      img.onerror = () => cb(null);
      img.src = r.result;
    };
    r.onerror = () => cb(null);
    r.readAsDataURL(file);
  }

  function avatarHTML(ch, cls, opts) {
    const o = opts || {};
    const bg = ch.avatar ? 'background:#e7ebed' : `background:${ch.color}`;
    const inner = ch.avatar ? `<img src="${ch.avatar}" alt="">` : esc(ch.initial || '?');
    const dot = o.dot
      ? `<span class="st-dot ${STATUS[(ch.status || {}).kind] ? STATUS[ch.status.kind].dot : ''}"></span>`
      : '';
    return `<div class="avatar ${cls || ''}" style="${bg}" ${o.data ? `data-char="${ch.id}"` : ''}>${inner}${dot}</div>`;
  }

  /* 状态胶囊 / 状态行 */
  function statusOf(ch) {
    const st = ch.status || { kind: 'on', word: STATUS.on.label };
    const meta = STATUS[st.kind] || STATUS.on;
    return { kind: st.kind || 'on', word: st.word || meta.label, dot: meta.dot };
  }
  function statusPill(ch, maxw) {
    const s = statusOf(ch);
    return `<span class="st-pill ${s.dot}" ${maxw ? `style="max-width:${maxw}px"` : ''}><i></i>${esc(s.word)}</span>`;
  }
  function statusLine(ch) {
    const s = statusOf(ch);
    return `<div class="ci-status ${s.dot}"><span class="dot"></span><span class="st-txt">${esc(s.word)}</span></div>`;
  }
  function daysTogether(ch) {
    const from = ch.met || now();
    return Math.max(0, Math.floor((Date.now() - from) / 864e5));
  }

  /* ---------------- 视口 / tab ---------------- */
  let curTab = 'chat';
  let view = { tab: 'chat', sub: null, id: null };
  let navStack = [];

  const appBody = $('#appBody');
  const tabbar = $('#tabbar');

  function setTab(t, push) {
    const changed = t !== curTab;
    curTab = t;
    view = { tab: t, sub: null, id: null };
    if (push !== false) navStack = [];
    render(t === 'chat' && changed ? 'enter' : '');
  }

  function openChat(charId) {
    view = { tab: 'chat', sub: 'detail', id: charId };
    navStack = [];
    render('enter');
  }
  function openNote(noteId) {
    view = { tab: 'notes', sub: 'detail', id: noteId };
    navStack = [];
    render('enter');
  }
  function openProfile(charId, fromTab) {
    navStack = [{ tab: fromTab || (view.sub === 'detail' ? view.tab : view.tab), sub: view.sub, id: view.id }];
    view = { tab: 'profile', sub: 'detail', id: charId };
    pfTab = 'together';
    render('enter');
  }
  function backToList() {
    // 优先弹回上一级（例如从聊天进来时回到聊天）
    if (view.tab === 'profile' && navStack.length) {
      const prev = navStack.pop();
      view = prev;
      render('enter-back');
      return;
    }
    const up = view.tab === 'profile' ? 'chat'
      : view.tab === 'todo' ? 'notes'
      : view.tab === 'calendar' ? 'notes'
      : view.tab === 'cards' ? 'me'
      : view.tab === 'nstickers' ? 'me'
      : view.tab;
    view = { tab: up, sub: null, id: null };
    render('enter-back');
  }

  /* ---------------- 渲染入口 ---------------- */
  function render(anim) {
    const cls = anim === 'enter' ? 'page enter' : anim === 'enter-back' ? 'page enter-back' : 'page';
    let html = '';
    if (view.tab === 'chat') html = view.sub === 'detail' ? chatDetailPage(view.id, cls) : chatListPage(cls);
    else if (view.tab === 'moments') html = momentsPage(cls);
    else if (view.tab === 'notes') html = view.sub === 'detail' ? noteDetailPage(view.id, cls) : notesListPage(cls);
    else if (view.tab === 'todo') html = todoPage(cls);
    else if (view.tab === 'calendar') html = calendarPage(cls);
    else if (view.tab === 'profile') html = profilePage(view.id, cls);
    else if (view.tab === 'game') {
      html = view.sub === 'create' ? gameCreatePage(cls) : view.sub === 'play' ? gamePlayPage(view.id, cls) : gameListPage(cls);
    }
    else if (view.tab === 'stickers') html = stickersPage(cls);
    else if (view.tab === 'cards') html = cardsPage(cls);
    else if (view.tab === 'nstickers') html = stickersPage(cls);
    else if (view.tab === 'me') html = mePage(cls);

    appBody.innerHTML = html;
    updateTabs();
    updateBadges();
    afterRender();
  }

  function updateTabs() {
    $$('.tab', tabbar).forEach((b) => b.classList.toggle('on', b.dataset.tab === curTab));
    const hide = view.sub === 'detail' || view.tab === 'profile' || view.tab === 'todo'
      || view.tab === 'cards' || view.tab === 'calendar' || view.tab === 'nstickers' || (view.tab === 'game' && view.sub);
    tabbar.style.display = hide ? 'none' : 'flex';
  }

  function updateBadges() {
    const unread = S.chats.reduce((a, c) => a + (c.unread || 0), 0);
    setBadge($('#badgeChat'), unread);
    setBadge($('#badgeMoments'), S.unreadMoments || 0);
    const noteUnread = S.notes.filter((n) => n.annos && n.annos.some((a) => a.unread)).length;
    setBadge($('#badgeNotes'), noteUnread);
    setBadge($('#badgeMe'), 0);
    setAppBadge(unread + (S.unreadMoments || 0) + noteUnread);
  }
  function setBadge(el, n) {
    if (!el) return;
    el.textContent = n > 99 ? '99+' : n;
    el.classList.toggle('show', n > 0);
  }
  // 装到主屏后，图标角标跟着未读走
  function setAppBadge(n) {
    try {
      if (n > 0 && navigator.setAppBadge) navigator.setAppBadge(n);
      else if (navigator.clearAppBadge) navigator.clearAppBadge();
    } catch (err) {}
  }

  /* ---------------- 消息列表 ---------------- */
  let charManageMode = false;

  function chatListPage(cls) {
    const items = S.chats.slice().sort((a, b) => {
      if (a.locked && !b.locked) return 1;
      if (!a.locked && b.locked) return -1;
      const ta = a.messages.length ? a.messages[a.messages.length - 1].ts : 0;
      const tb = b.messages.length ? b.messages[b.messages.length - 1].ts : 0;
      return tb - ta;
    });
    const rows = items.map((c) => {
      const ch = charOf(c.charId);
      const last = c.messages.filter((m) => m.type !== 'sys').slice(-1)[0];
      let prev = '还没有消息';
      if (last) {
        if (last.type === 'sticker') prev = '[表情]';
        else if (last.type === 'image') prev = '[图片]';
        else prev = (last.from === 'me' ? '你：' : '') + last.text;
      }
      return `<div class="chat-item" data-chat="${c.charId}" data-cid="${ch.id}">
        ${charManageMode ? `<button class="chat-item-manage" data-remove-char="${ch.id}">−</button>` : ''}
        <div class="ci-av" data-profile="${ch.id}">
          ${avatarHTML(ch, ch.tag === '置顶' ? 'ring' : '', { dot: true })}
        </div>
        <div class="chat-item-main">
          <div class="chat-item-top">
            <span class="chat-item-name" data-profile="${ch.id}">${esc(ch.name)}</span>
            ${relBadge(ch)}
            ${ch.tag ? `<span class="chat-item-tag">${esc(ch.tag)}</span>` : ''}
            <span class="chat-item-time">${last ? relTime(last.ts) : ''}</span>
          </div>
          ${statusLine(ch)}
          <div style="display:flex;align-items:center">
            <div class="chat-item-preview">${esc(prev)}</div>
            ${c.locked ? '<span class="chat-item-time" style="margin-left:auto">🔒</span>' : c.unread ? `<span class="unread-dot">${c.unread}</span>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');

    return `<div class="${cls}">
      <div class="navbar" style="border-bottom:none;padding-top:2px">
        <div style="width:34px"></div>
        <div class="nb-title">Mini@ᯇᴗᯇ<small>${S.chars.length} 位联系人 · 全部本地</small></div>
        <div class="nb-right" style="gap:0">
          ${charManageMode
            ? `<button class="btn solid sm" data-action="exit-manage" style="margin-right:2px">完成</button>`
            : `<button class="icon-btn" data-action="toggle-manage" title="管理联系人">
                 <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
               </button>
               <button class="icon-btn" data-action="new-char" title="新的联系人">
                 <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
               </button>`}
        </div>
      </div>
      ${charManageMode ? `<div style="padding:0 16px 6px;font-size:11px;color:var(--ink-3);line-height:1.6">点名字左侧的 − 可以移除这个联系人，他的聊天、印象、心动时刻会一起删掉。</div>` : ''}
      <div class="searchbar">
        <div class="sb-in">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          搜索联系人或消息
        </div>
      </div>
      <div class="list-scroll">${items.length ? '' : `<div class="empty-state">
        <div class="es-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="8.4" r="3.8"/><path d="M4.8 20c.8-3.6 3.7-5.6 7.2-5.6s6.4 2 7.2 5.6"/></svg></div>
        <h4>还没有联系人</h4>
        <p>点右上角的 + ，给一个人起名字。<br>从此以后，这是我们的「命中注定」。</p>
        <button class="btn solid" data-action="new-char" style="margin-top:16px">创建第一个联系人</button>
      </div>`}<div class="chat-list">${rows}</div>
      </div>
    </div>`;
  }

  /* ---------------- 聊天详情 ---------------- */
  function chatDetailPage(charId, cls) {
    const ch = charOf(charId);
    const chat = chatOf(charId);
    if (!chat) return `<div class="${cls}"></div>`;
    chat.unread = 0;
    save();

    let html = '';
    let lastDay = '';
    chat.messages.forEach((m) => {
      const d = new Date(m.ts).toDateString();
      if (d !== lastDay) {
        lastDay = d;
        html += `<div class="day-divider"><span>${dayLabel(m.ts)}</span></div>`;
      }
      if (m.type === 'sys') {
        html += `<div class="sys-tip">${esc(m.text)}</div>`;
        return;
      }
      const side = m.from === 'me' ? 'me' : 'them';
      const who = m.from === 'me' ? meObj() : ch;
      html += `<div class="msg-row ${side}" data-msg="${m.id}">
        ${avatarHTML(who, '', m.from === 'char' ? { dot: true } : {})}
        <div class="msg-col">
          ${m.from === 'char' ? `<div class="msg-name">${esc(ch.name)}</div>` : ''}
          <div class="bubble ${m.type === 'image' ? 'img-bubble' : ''} ${m.type === 'sticker' ? 'sticker-bubble' : ''}">
            ${m.quote ? `<div class="msg-quote">${esc(m.quote.name)}：${esc(m.quote.text)}</div>` : ''}
            ${m.type === 'text' ? esc(m.text)
              : m.type === 'image' ? `<img src="${m.text}" alt="">`
              : `<div class="stk">${m.text.startsWith('data:') || m.text.startsWith('http') ? `<img src="${m.text}" alt="">` : esc(m.text)}</div>`}
          </div>
        </div>
      </div>`;
    });

    return `<div class="${cls} chat-page">
      <div class="navbar">
        <button class="nb-back" data-action="back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>
        </button>
        <button class="nb-title nb-profile" data-profile="${ch.id}" style="display:flex;flex-direction:column;align-items:center;gap:3px;background:none">
          <span style="display:inline-flex;align-items:center;gap:4px">${esc(ch.name)}${relBadge(ch)}</span>
          ${statusPill(ch, 150)}
        </button>
        <div class="nb-right">
          <button class="icon-btn" data-action="chat-more" data-char="${ch.id}">
            <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
          </button>
        </div>
      </div>
      ${chat.locked ? `<div class="sys-tip" style="margin:6px 16px">这是一段被锁住的对白。</div>` : ''}
      <div class="chat-scroll" id="chatScroll">${html}</div>
      <div class="chat-input">
        <div class="ci-quote-bar" id="quoteBar" style="display:none"><span></span>
          <button class="icon-btn" style="width:22px;height:22px" data-action="clear-quote">✕</button>
        </div>
        <div class="ci-row">
          <button class="ci-btn" data-action="toggle-sticker" data-char="${ch.id}">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2"/><circle cx="9.2" cy="10.2" r=".9" fill="currentColor" stroke="none"/><circle cx="14.8" cy="10.2" r=".9" fill="currentColor" stroke="none"/><path d="M8.6 14.2c.9 1.3 2.1 2 3.4 2s2.5-.7 3.4-2"/></svg>
          </button>
          <button class="ci-btn" data-action="pick-image">
            <svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.5"/><path d="m5 17 4.5-4.5 3.5 3 3-2.5L20 16.5"/></svg>
          </button>
          <textarea class="ci-input" id="ciInput" rows="1" placeholder="发消息…" data-char="${ch.id}"></textarea>
          <button class="ci-send" id="ciSend" data-action="send">发送</button>
        </div>
        <div class="sticker-panel" id="stickerPanel"></div>
      </div>
    </div>`;
  }

  function renderStickerPanel(charId) {
    const p = $('#stickerPanel');
    if (!p) return;
    if (p.classList.contains('open')) { p.classList.remove('open'); return; }
    const ch = charOf(charId);
    const own = ch.stickers || [];
    const gen = S.gstickers || [];
    const cell = (s, i, bank) => `<div class="stk-cell" data-stk="${bank}|${bank === 'own' ? ch.id : ''}|${i}">${s.data ? `<img src="${s.data}" alt="">` : esc(s.e)}</div>`;
    const empty = !own.length && !gen.length;
    p.innerHTML = `<div class="stkp-body">
      ${gen.length ? `<div class="stkp-lbl">通用 · 谁都能发</div>
        <div class="stk-grid">${gen.map((s, i) => cell(s, i, 'g')).join('')}</div>` : ''}
      ${own.length ? `<div class="stkp-lbl">${esc(ch.name)}的专属</div>
        <div class="stk-grid">${own.map((s, i) => cell(s, i, 'own')).join('')}</div>` : ''}
      ${empty ? `<div class="stk-empty">还没有表情<br>去「表情与贴纸」导入几张，或者为他上传一套</div>` : ''}
      ${gen.length || own.length ? '' : `<button class="btn ghost sm" data-action="open-stickers" style="margin:8px auto 0;display:block">去导入</button>`}
    </div>`;
    p.classList.add('open');
    setTimeout(() => { const sc = $('#chatScroll'); if (sc) sc.scrollTop = sc.scrollHeight; }, 80);
  }

  /* ---------------- 角色档案 ---------------- */
  let pfTab = 'together';

  function profilePage(charId, cls) {
    const ch = charOf(charId);
    if (!ch) return `<div class="${cls}"></div>`;
    const days = daysTogether(ch);
    const imps = ch.impressions || [];
    const hms = ch.moments || [];
    const tabBtn = (k, label) => {
      const n = k === 'imp' ? imps.length : k === 'mom' ? hms.length : '';
      return `<button class="${pfTab === k ? 'on' : ''}" data-pftab="${k}">${label}${n ? `<em>${n}</em>` : ''}</button>`;
    };

    return `<div class="${cls} profile-page">
      <div class="navbar" style="border-bottom:none">
        <button class="nb-back" data-action="back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>
        </button>
        <div class="nb-title">角色档案</div>
        <div class="nb-right">
          <button class="icon-btn" data-action="profile-more" data-char="${ch.id}">
            <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
          </button>
        </div>
      </div>

      <div class="pf-scroll">
        <div class="pf-hero">
          <div class="avatar" data-char="${ch.id}" style="${ch.avatar ? 'background:#e7ebed' : `background:${ch.color}`}" data-action="change-avatar" data-cid="${ch.id}">
            ${ch.avatar ? `<img src="${ch.avatar}" alt="">` : esc(ch.initial)}
            <span class="edit-badge">换头像</span>
          </div>
          <div class="pf-info">
            <div class="pf-name">${esc(ch.name)}${relBadge(ch)}${ch.tag ? `<span class="tag">${esc(ch.tag)}</span>` : ''}</div>
            <div class="pf-sub">${statusPill(ch)}</div>
            <div class="pf-persona">${esc(ch.persona || '还没有人设。')}</div>
          </div>
        </div>

        <div class="pf-toolbar">
          <button class="btn solid" data-action="open-chat-from-profile" data-char="${ch.id}">发消息</button>
          <button class="btn ghost" data-action="edit-status" data-char="${ch.id}">改状态</button>
        </div>

        <div class="pf-tabs">
          ${tabBtn('together', '相伴时长')}
          ${tabBtn('imp', '印象')}
          ${tabBtn('mom', '心动时刻')}
        </div>

        <div class="pf-body">${pfTab === 'together' ? pfTogether(ch, days) : pfTab === 'imp' ? pfImpression(ch) : pfMoments(ch)}</div>
      </div>
    </div>`;
  }

  function pfTogether(ch, days) {
    const met = new Date(ch.met || now());
    const totalMsgs = (chatOf(ch.id) || { messages: [] }).messages.filter((m) => m.type !== 'sys').length;
    const hmCount = (ch.moments || []).length;
    const imCount = (ch.impressions || []).length;
    // 以一年为一段进度
    const yearPct = Math.min(100, ((days % 365) / 365) * 100);
    return `<div class="together-card">
      <div class="together-num">${days.toLocaleString()}<small>天</small></div>
      <div class="together-lbl">相 伴 时 长</div>
      <div class="together-bar"><i style="width:${Math.max(3, yearPct)}%"></i></div>
      <div class="together-foot"><span>从 ${met.getFullYear()} 年 ${met.getMonth() + 1} 月 ${met.getDate()} 日开始</span><span>第 ${Math.floor(days / 365) + 1} 年</span></div>
      <div style="margin-top:14px;font-size:11px;color:var(--ink-3);line-height:1.7">
        距下一次纪念日还有 <b style="color:var(--ink-2)">${365 - (days % 365)}</b> 天
      </div>
    </div>
    <div class="together-wall">
      <div>一起走过 <b>${days}</b> 个日夜</div>
      <div>说过 <b>${totalMsgs}</b> 句话</div>
      <div>被你记下 <b>${hmCount}</b> 个心动时刻</div>
      <div>你为他写下 <b>${imCount}</b> 条印象</div>
    </div>
    <div style="margin-top:12px;display:flex;gap:8px">
      <button class="btn ghost block" data-action="edit-met" data-char="${ch.id}" style="flex:1">修改相识日期</button>
    </div>
    <div class="empty-tip" style="padding:22px 10px 0">日子是算出来的，<br>但每一天都是你亲手过完的。</div>`;
  }

  function pfImpression(ch) {
    const list = (ch.impressions || []).slice().sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.ts - a.ts);
    return `<div class="impression-add">
        <input id="imInput" placeholder="关于他，你又发现了一点…" maxlength="80">
        <button data-action="add-impression" data-char="${ch.id}">记下</button>
      </div>
      ${list.length ? list.map((im) => `<div class="im-card ${im.pin ? 'pin' : ''}" data-im="${im.id}">
        <div class="im-txt">${esc(im.text)}</div>
        <div class="im-meta">
          ${im.tag ? `<span class="im-tag">${esc(im.tag)}</span>` : ''}
          <span>${relTime(im.ts)}</span>
          <button class="im-del" data-action="del-impression" data-char="${ch.id}" data-im="${im.id}">删除</button>
        </div>
      </div>`).join('') : `<div class="empty-tip">你还没有写下对他的印象。<br>第一条可以从"他说话的方式"开始。</div>`}`;
  }

  function pfMoments(ch) {
    const list = (ch.moments || []).slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const quoteTxt = (m) => {
      if (m.kind === 'image') return '';
      if (/^data:/.test(m.text)) return `<img src="${m.text}" alt="">`;
      return esc(m.text);
    };
    const imgs = (m) => {
      // 兼容旧数据：图片可能直接存在 text 里
      if (m.kind === 'image') return m.images && m.images.length ? m.images : [/^data:/.test(m.text || '') ? m.text : null].filter(Boolean);
      return m.images || [];
    };
    return `<div class="hm-toolbar">
        <button class="btn solid" data-action="pick-heart" data-char="${ch.id}">从聊天记录里收</button>
        <button class="btn ghost" data-action="heart-add-img" data-char="${ch.id}">
          <svg viewBox="0 0 24 24" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="m4.5 17 5-4.5 4 3.5 3-2.5 3.5 3"/></svg>
          放入图片
        </button>
      </div>
      ${list.length ? list.map((m) => {
        const src = imgs(m);
        const isImg = m.kind === 'image' || src.length > 0;
        return `<div class="hm-card ${isImg ? 'hm-img' : ''}" data-hm="${m.id}">
          ${isImg && src.length ? `<div class="hm-photos ${src.length > 1 ? 'multi' : ''}">${src.map((u) => `<img src="${u}" alt="" data-hm-img="${m.id}">`).join('')}</div>` : ''}
          ${isImg ? '' : `<div class="hm-quote">
            <span class="hm-who">${m.from === 'me' ? esc(S.settings.me.name) : esc(ch.name)} · ${relTime(m.ts)}</span>
            ${quoteTxt(m)}
          </div>`}
          ${isImg ? `<div class="hm-who hm-img-who">${esc(S.settings.me.name)} · ${relTime(m.ts)}</div>` : ''}
          ${m.why ? `<div class="hm-note"><b>记</b>${esc(m.why)}</div>` : ''}
          <div class="hm-meta">
            <button class="hm-act" data-action="why-heart" data-char="${ch.id}" data-hm="${m.id}">${m.why ? '改写' : (isImg ? '写一句' : '补一句')}</button>
            ${isImg ? `<button class="hm-act" data-action="heart-add-img" data-char="${ch.id}" data-hm="${m.id}">加图</button>` : ''}
            <button class="hm-act hm-del" data-action="del-heart" data-char="${ch.id}" data-hm="${m.id}">移除</button>
          </div>
        </div>`;
      }).join('') : `<div class="empty-tip">还没有心动时刻。<br>收一句他说过的话，或放进一张照片。<br>这里会慢慢变成你们的相册。</div>`}`;
  }

  /* ---------------- 动态 ---------------- */
  function momentsPage(cls) {
    S.unreadMoments = 0;
    const posts = S.moments.slice().sort((a, b) => b.ts - a.ts);
    const list = posts.map((p) => {
      const visibleChars = p.private ? S.chars.slice(0, 2) : S.chars;
      const imgs = (p.images || []).slice(0, 3);
      const likes = (p.likes || []).map((id) => charOf(id)).filter(Boolean);
      const cmts = (p.comments || []).slice().sort((a, b) => a.ts - b.ts);
      return `<div class="post-card" data-post="${p.id}">
        <div class="post-head">
          ${avatarHTML(meObj(), '')}
          <div><div class="ph-name">${esc(S.settings.me.name)}</div><div class="ph-time">${relTime(p.ts)}</div></div>
        </div>
        <div class="post-text">${esc(p.text)}</div>
        ${imgs.length ? `<div class="post-imgs g${imgs.length}">${imgs.map((s) => `<img src="${s}" alt="">`).join('')}</div>` : ''}
        ${p.private ? `<div class="post-vis">🔒 仅 ${visibleChars.map((c) => esc(c.name)).join('、') || '自己'} 可见</div>` : ''}
        <div class="post-actions">
          <button class="post-act ${likes.length ? 'liked' : ''}" data-action="like-post" data-post="${p.id}">
            <svg viewBox="0 0 24 24"><path d="M12 20s-7.5-4.7-7.5-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7.5 2.6C19.5 15.3 12 20 12 20Z"/></svg>
            ${likes.length ? esc(likes.map((l) => l.name).join('、')) : '赞'}
          </button>
          <button class="post-act" data-action="focus-cmt" data-post="${p.id}">
            <svg viewBox="0 0 24 24"><path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z"/></svg>
            ${cmts.length ? cmts.length + ' 条评论' : '评论'}
          </button>
        </div>
        ${cmts.length ? `<div class="comment-box">
          ${cmts.map((c) => {
            const ch = charOf(c.charId) || { name: '某人' };
            return `<div class="cmt ${c.replyTo ? 'reply' : ''}">
              <span class="cmt-name">${esc(ch.name)}${c.replyTo ? ` → ${esc(c.replyTo)}` : '：'}</span>
              <span class="cmt-body">${esc(c.text)}</span>
            </div>`;
          }).join('')}
        </div>` : ''}
        <div class="cmt-pending" data-pending="${p.id}" style="display:none">
          <span class="dots"><i></i><i></i><i></i></span><span class="ptxt">有人正在看这条</span>
        </div>
        <div class="cmt-form" data-cmtform="${p.id}">
          <input placeholder="回复这条动态…" data-cmtinput="${p.id}">
          <button data-action="send-cmt" data-post="${p.id}">发送</button>
        </div>
      </div>`;
    }).join('');

    if (!S.chars.length) return `<div class="${cls} moments-page">
      <div class="navbar" style="border-bottom:none">
        <div style="width:34px"></div>
        <div class="nb-title">动态<small>这是一个小小星球</small></div>
        <div class="nb-right"></div>
      </div>
      <div class="list-scroll">
        <div class="empty-state">
          <div class="es-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2"/><path d="M12 3.8v16.4M3.8 12h16.4"/></svg></div>
          <h4>动态还没有观众</h4>
          <p>先创建联系人，他们才会出现在你的动态下面。<br>分享动态</p>
          <button class="btn solid" data-action="new-char" style="margin-top:16px">创建第一个联系人</button>
        </div>
      </div>
    </div>`;

    return `<div class="${cls} moments-page">
      <div class="navbar" style="border-bottom:none">
        <div style="width:34px"></div>
        <div class="nb-title">动态<small>这是一个小小星球</small></div>
        <div class="nb-right">
          <button class="icon-btn" data-action="new-post">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
      <div class="moments-hero">
        ${avatarHTML(meObj(), '')}
        <div class="mh-txt">
          <h3>今天想说点什么</h3>
          <p>这里是你的世界</p>
        </div>
        <button class="btn solid sm" data-action="new-post">发布</button>
      </div>
      <div class="list-scroll">${list}
        <div style="padding:24px 20px 34px;text-align:center;font-size:11px;color:var(--ink-3);line-height:1.9">
          动态只活在这台手机里。<br>这里是空的
        </div>
      </div>
    </div>`;
  }

  /* ---------------- 笔记贴纸（贴纸库） ---------------- */
  function nStickPage(cls) {
    const list = [...(S.pstickers || []), ...(S.gstickers || [])];
    return `<div class="${cls} nstk-page">
      <div class="navbar">
        <button class="nb-back" data-action="back-to-me">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>
        </button>
        <div class="nb-title">笔记贴纸<small>贴上去，文字会绕开它</small></div>
        <div class="nb-right"></div>
      </div>
      <div class="list-scroll">
        <div class="nstk-grid">
          <button class="nstk-add" data-action="nstk-upload">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>导入图片</span>
          </button>
          ${list.map((s, i) => `<div class="nstk-tile" data-nstk="${i}">
            <img src="${s.data}" alt="">
            <span class="del" data-nstk-del="${i}">✕</span>
          </div>`).join('')}
        </div>
        ${list.length ? '' : `<div class="empty-state" style="padding:30px 24px">
          <div class="es-icon"><svg viewBox="0 0 24 24"><path d="M4 6h16v12H4z"/><circle cx="9" cy="11" r="1.6"/><path d="m5 17 5-5 3 3 3-2 4 4"/></svg></div>
          <h4>还没有贴纸</h4><p>导入几张图，写笔记时就能贴上去。<br>建议用透明背景的 PNG。</p>
        </div>`}
        <div style="padding:18px 20px 30px;text-align:center;font-size:10.5px;color:var(--ink-3);line-height:1.9">
          贴纸会压在一段文字旁边，<br>文字自动绕开它排版。
        </div>
      </div>
    </div>`;
  }

  /* 两个贴纸库：通用表情（所有聊天 + 笔记都能用）/ 笔记专用 */
  const STK_BANKS = {
    g: { key: 'gstickers', label: '通用表情' },
    p: { key: 'pstickers', label: '笔记专用贴纸' },
  };
  const bankOf = (k) => S[(STK_BANKS[k] || STK_BANKS.g).key];

  function nstkUpload(which) {
    const k = which === 'p' ? 'p' : 'g';
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = () => {
      const files = [...(inp.files || [])].slice(0, 12);
      if (!files.length) return;
      let done = 0;
      const bank = bankOf(k);
      files.forEach((f) => {
        shrinkImage(f, 360, (data) => {
          if (data) bank.push({ id: uid('ns'), data });
          if (++done === files.length) {
            save(); render('');
            toast(`已导入 ${done} 张${STK_BANKS[k].label}`);
          }
        }, 0.9);
      });
    };
    inp.click();
  }

  function delNstk(which, i) {
    const k = which === 'p' ? 'p' : 'g';
    bankOf(k).splice(i, 1);
    save(); render(''); toast('已删除');
  }

  /* ---------------- 笔记 · 图片（结尾 / 插图 / 贴纸） ----------------
   * 三种放法：
   *   end    结尾图片 —— 排在正文最后，整块显示（像备忘录）
   *   inline 插图     —— 插在某一行里的某个位置（行内/居左/居右/独占一行），正文按段流排
   *   float  贴纸式   —— 就是原来的贴纸：浮在段落一侧，文字绕开它
   */
  let insMode = 'end';          // 当前选择：end / inline / float
  let insPickLine = 0, insPickPos = 'block';
  let insFrac = 0.5;            // 插图落在这一行的位置（0~1）
  let insFlow = 'block';        // 插图排法：inline / left / right / block
  let insW = 62;                // 插图宽度（%）

  function noteAddImages(noteId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n) return;
    insMode = 'end'; insPickLine = 0; insPickPos = 'block';
    openRawDialog(`
      <h3>导入图片</h3>
      <div class="dlg-body">
        <div class="dlg-field"><label>放在哪儿</label>
          <div class="ins-modes" id="insModes">
            <button data-m="end" class="on">
              <b>结尾图片</b><span>排在正文最后，占满整行</span>
            </button>
            <button data-m="inline">
              <b>中间图片</b><span>插到正文的某一处</span>
            </button>
          </div>
        </div>
        <div id="insMid" class="ins-mid" style="display:none">
          <div class="dlg-field"><label>中间怎么放</label>
            <div class="ins-kinds" id="insKinds">
              <button data-k="inline" class="on">
                <b>插图</b><span>插在某一行、某个位置</span>
              </button>
              <button data-k="float">
                <b>贴纸</b><span>贴在段落一侧，文字绕开它</span>
              </button>
            </div>
          </div>
          <div id="insInlineBox">
            <div class="dlg-field"><label>插在哪一行</label>
              <select id="insLine"></select></div>
            <div class="dlg-field"><label>这一行的位置</label>
              <div class="ins-frac">
                <input type="range" id="insFrac" min="0" max="100" value="50">
                <span id="insFracTxt">中间</span>
              </div>
            </div>
            <div class="dlg-field"><label>怎么排</label>
              <div class="card-seg" id="insFlow">
                <button data-v="inline">紧跟文字</button>
                <button data-v="left">单独居左</button>
                <button data-v="right">单独居右</button>
                <button data-v="block" class="on">独占一行</button>
              </div>
            </div>
            <div class="dlg-field"><label>多大</label>
              <div class="ins-frac"><input type="range" id="insW" min="20" max="100" value="62">
                <span id="insWTxt">62%</span></div>
            </div>
          </div>
          <div id="insFloatBox" style="display:none">
            <div class="dlg-field"><label>贴在哪一段旁边</label>
              <select id="insFloatLine"></select></div>
            <div class="dlg-field"><label>靠哪边</label>
              <div class="card-seg" id="insFloatSide">
                <button data-v="left">靠左</button>
                <button data-v="right" class="on">靠右</button>
              </div>
            </div>
            <p class="ins-note">贴上去之后，这一段的文字会自动绕开它。图片会从「表情与贴纸」里的贴纸库挑，
              也可以直接从手机里选一张新的。</p>
          </div>
        </div>
        <p class="ins-note" id="insEndNote">选好之后会从相册里挑图片。可以一次选多张。</p>
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" data-close-dialog>取消</button>
        <button class="btn solid" data-action="ins-go" data-note="${noteId}">选图片</button>
      </div>`);
    fillInsLines(n);
  }

  /* 段落下拉：两处（插图 / 贴纸）共用同一份内容 */
  function fillInsLines(n) {
    const lines = (n.content || '').split('\n');
    const opts = lines.map((ln, i) => `<option value="${i}">第 ${i + 1} 段 · ${esc((ln || '（空行）').slice(0, 12))}</option>`).join('');
    ['#insLine', '#insFloatLine'].forEach((sel) => {
      const el = $(sel);
      if (el) { el.innerHTML = opts; el.value = String(Math.min(insPickLine, Math.max(0, lines.length - 1))); }
    });
  }

  /* 选中一张图后，按当前模式落到笔记里 */
  function applyInsertedImage(n, data) {
    const ts = appClock();
    if (insMode === 'end') {
      if (!Array.isArray(n.imgs)) n.imgs = [];
      n.imgs.push({ id: uid('ni'), data, ts });
      return;
    }
    if (insMode === 'float') {
      if (!Array.isArray(n.stickers)) n.stickers = [];
      n.stickers.push({ id: uid('sk'), img: data, line: insPickLine, side: insPickSide, ts });
      return;
    }
    // 插图
    if (!Array.isArray(n.insets)) n.insets = [];
    n.insets.push({
      id: uid('in'), data, line: insPickLine, frac: insFrac,
      flow: insFlow, w: insW, ts,
    });
  }

  /* 弹窗里两块面板互斥显示 */
  function syncInsBoxes() {
    const ib = $('#insInlineBox'), fb = $('#insFloatBox');
    if (ib) ib.style.display = insMode === 'float' ? 'none' : 'block';
    if (fb) fb.style.display = insMode === 'float' ? 'block' : 'none';
    const mid = $('#insMid'), endNote = $('#insEndNote');
    if (mid) mid.style.display = insMode === 'end' ? 'none' : 'block';
    if (endNote) endNote.style.display = insMode === 'end' ? 'block' : 'none';
  }

  /* 修改插图位置：重新选行 / 位置 / 排法 / 大小 */
  let editInsId = null;
  function editInsetDialog(noteId, insId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n || !Array.isArray(n.insets)) return;
    const it = n.insets.find((x) => x.id === insId);
    if (!it) return;
    editInsId = insId;
    insPickLine = it.line || 0;
    insFrac = it.frac == null ? 0.5 : it.frac;
    insFlow = it.flow || 'block';
    insW = it.w || 62;
    const lines = (n.content || '').split('\n');
    const opts = lines.map((ln, i) => `<option value="${i}" ${i === insPickLine ? 'selected' : ''}>第 ${i + 1} 段 · ${esc((ln || '（空行）').slice(0, 12))}</option>`).join('');
    const flowBtn = (v, label) => `<button data-v="${v}" class="${insFlow === v ? 'on' : ''}">${label}</button>`;
    openRawDialog(`
      <h3>调整这张插图</h3>
      <div class="dlg-body">
        <div class="ins-preview"><img src="${it.data}" alt=""></div>
        <div class="dlg-field" style="margin-top:10px"><label>放在哪一行</label>
          <select id="editInsLine">${opts}</select></div>
        <div class="dlg-field"><label>这一行的位置</label>
          <div class="ins-frac">
            <input type="range" id="editInsFrac" min="0" max="100" value="${Math.round(insFrac * 100)}">
            <span id="editInsFracTxt">${insFrac < 0.2 ? '靠前' : insFrac > 0.8 ? '靠后' : insFrac < 0.4 ? '偏前' : insFrac > 0.6 ? '偏后' : '中间'}</span>
          </div>
        </div>
        <div class="dlg-field"><label>怎么排</label>
          <div class="card-seg" id="editInsFlow">
            ${flowBtn('inline', '紧跟文字')}${flowBtn('left', '单独居左')}${flowBtn('right', '单独居右')}${flowBtn('block', '独占一行')}
          </div>
        </div>
        <div class="dlg-field"><label>多大</label>
          <div class="ins-frac"><input type="range" id="editInsW" min="20" max="100" value="${insW}">
            <span id="editInsWTxt">${insW}%</span></div>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" data-action="ins-remove" data-note="${noteId}" data-ins="${insId}">移除</button>
        <button class="btn solid" data-action="ins-save-pos" data-note="${noteId}" data-ins="${insId}">保存</button>
      </div>`);
  }

  function saveInsetPos(noteId, insId) {
    const n = S.notes.find((x) => x.id === noteId);
    const it = n && (n.insets || []).find((x) => x.id === insId);
    if (!it) return;
    const sel = $('#editInsLine');
    it.line = sel ? +sel.value : it.line;
    it.frac = insFrac;
    it.flow = insFlow;
    it.w = insW;
    n.updated = appClock();
    save(); closeDialog(); render('');
    toast('位置已更新');
  }

  function delInset(noteId, id) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n || !Array.isArray(n.insets)) return;
    n.insets = n.insets.filter((x) => x.id !== id);
    save(); render(''); toast('已移除插图');
  }

  function insPickFiles(noteId, count) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n) return;
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = () => {
      const files = [...(inp.files || [])].slice(0, count);
      if (!files.length) return;
      let done = 0;
      const max = insMode === 'float' ? 360 : 1000;
      files.forEach((f) => {
        shrinkImage(f, max, (data) => {
          if (data) applyInsertedImage(n, data);
          if (++done === files.length) {
            n.updated = appClock(); save(); closeDialog(); render('');
            toast(insMode === 'end' ? `已放到结尾 · ${done} 张`
              : insMode === 'float' ? '贴好了，文字会绕开它' : '插图放好了');
          }
        }, 0.85);
      });
    };
    inp.click();
  }

  function delNoteImg(noteId, imgId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n || !Array.isArray(n.imgs)) return;
    n.imgs = n.imgs.filter((i) => i.id !== imgId);
    save(); render(''); toast('已移除图片');
  }

  /* 贴纸：选一张，指定贴在正文第几段旁边（左右可选），文字自动绕排 */
  function noteStickDialog(noteId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n) return;
    const lib = [...(S.pstickers || []), ...(S.gstickers || [])];
    if (!lib.length) {
      openRawDialog(`
        <h3>还没有贴纸</h3>
        <div class="dlg-body"><p style="font-size:12.5px;color:var(--ink-2);line-height:1.9;margin:0">
          先去「我的 → 表情与贴纸」导入几张，再回来贴。<br>
          （也可以直接点「导入图片 → 中间图片 → 贴纸」，从相册选。）</p></div>
        <div class="dialog-actions">
          <button class="btn ghost" data-close-dialog>知道了</button>
          <button class="btn solid" data-action="goto-nstickers">去导入</button>
        </div>`);
      return;
    }
    const lines = (n.content || '').split('\n');
    const opts = lines.map((ln, i) => `<option value="${i}">第 ${i + 1} 段 · ${esc((ln || '（空行）').slice(0, 12))}</option>`).join('');
    stickPickImg = 0; stickPickLine = 0;
    stickFrac = 0.5; stickFlow = 'inline'; stickW = 26;
    openRawDialog(`
      <h3>贴一张贴纸</h3>
      <div class="dlg-body">
        <div class="dlg-field"><label>选贴纸</label>
          <div class="stick-pick" id="stickLib">
            ${lib.map((s, i) => `<button data-stickimg="${i}" class="${i === 0 ? 'on' : ''}"><img src="${s.data}" alt=""></button>`).join('')}
          </div></div>
        <div class="dlg-field"><label>贴在哪一行</label>
          <select id="stickLine">${opts}</select></div>
        <div class="dlg-field"><label>这一行的位置</label>
          <div class="ins-frac">
            <input type="range" id="stickFrac" min="0" max="100" value="50">
            <span id="stickFracTxt">中间</span>
          </div>
        </div>
        <div class="dlg-field"><label>怎么排</label>
          <div class="card-seg" id="stickFlow">
            <button data-v="inline" class="on">夹在字间</button>
            <button data-v="left">贴着左边</button>
            <button data-v="right">贴着右边</button>
            <button data-v="block">独占一行</button>
          </div>
        </div>
        <div class="dlg-field"><label>多大</label>
          <div class="ins-frac"><input type="range" id="stickW" min="10" max="80" value="26">
            <span id="stickWTxt">26%</span></div>
        </div>
        <p style="font-size:11px;color:var(--ink-3);line-height:1.8;margin:0">
          贴纸站在你选的那个字旁边，这一行的文字会自己让开。
        </p>
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" data-close-dialog>取消</button>
        <button class="btn solid" data-action="stick-save" data-note="${noteId}">贴上</button>
      </div>`);
  }
  let stickPickImg = 0, stickPickLine = 0;
  let stickFrac = 0.5, stickFlow = 'inline', stickW = 26;

  /* 新版贴纸自带位置（frac / flow）；老版本只有 side，当作浮动贴纸 */
  const isFlowStick = (sk) => sk.frac != null || !!sk.flow;

  /* 贴纸位置设置：和插图那套一样 —— 哪一行 / 行内什么位置 / 怎么排 / 多大 */
  function editStickDialog(noteId, skId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n || !Array.isArray(n.stickers)) return;
    const sk = n.stickers.find((x) => x.id === skId);
    if (!sk) return;
    editStickId = skId;
    stickPickLine = sk.line || 0;
    stickFrac = sk.frac == null ? 0.5 : sk.frac;
    stickFlow = sk.flow || (sk.side === 'left' ? 'left' : 'right');
    stickW = sk.w || 26;
    const lines = (n.content || '').split('\n');
    const opts = lines.map((ln, i) => `<option value="${i}" ${i === stickPickLine ? 'selected' : ''}>第 ${i + 1} 段 · ${esc((ln || '（空行）').slice(0, 12))}</option>`).join('');
    const flowBtn = (v, label) => `<button data-v="${v}" class="${stickFlow === v ? 'on' : ''}">${label}</button>`;
    openRawDialog(`
      <h3>调整这张贴纸</h3>
      <div class="dlg-body">
        <div class="ins-preview sk-preview"><img src="${sk.img}" alt=""></div>
        <div class="dlg-field" style="margin-top:10px"><label>贴在哪一行</label>
          <select id="editSkLine">${opts}</select></div>
        <div class="dlg-field"><label>这一行的位置</label>
          <div class="ins-frac">
            <input type="range" id="editSkFrac" min="0" max="100" value="${Math.round(stickFrac * 100)}">
            <span id="editSkFracTxt">${fracLabel(stickFrac)}</span>
          </div>
        </div>
        <div class="dlg-field"><label>怎么排</label>
          <div class="card-seg" id="editSkFlow">
            ${flowBtn('inline', '夹在字间')}${flowBtn('left', '贴着左边')}${flowBtn('right', '贴着右边')}${flowBtn('block', '独占一行')}
          </div>
        </div>
        <div class="dlg-field"><label>多大</label>
          <div class="ins-frac"><input type="range" id="editSkW" min="10" max="80" value="${stickW}">
            <span id="editSkWTxt">${stickW}%</span></div>
        </div>
        <p class="ins-note">贴纸就站在你选的那个字旁边，这一行的文字会自己让开。</p>
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" data-action="sk-remove" data-note="${noteId}" data-sk="${skId}">取下</button>
        <button class="btn solid" data-action="sk-save-pos" data-note="${noteId}" data-sk="${skId}">保存</button>
      </div>`);
  }
  let editStickId = null;

  const fracLabel = (v) => (v < 0.2 ? '靠前' : v > 0.8 ? '靠后' : v < 0.4 ? '偏前' : v > 0.6 ? '偏后' : '中间');

  function saveStickPos(noteId, skId) {
    const n = S.notes.find((x) => x.id === noteId);
    const sk = n && (n.stickers || []).find((x) => x.id === skId);
    if (!sk) return;
    const sel = $('#editSkLine');
    sk.line = sel ? +sel.value : sk.line;
    sk.frac = stickFrac;
    sk.flow = stickFlow;
    sk.w = stickW;
    delete sk.side;              // 改成新式落位，不再走浮动逻辑
    n.updated = appClock();
    save(); closeDialog(); render('');
    toast('位置已更新');
  }

  function saveStick(noteId) {
    const n = S.notes.find((x) => x.id === noteId);
    const lib = [...(S.pstickers || []), ...(S.gstickers || [])];
    const s = lib[stickPickImg];
    if (!n || !s) { toast('选一张贴纸'); return; }
    const sel = $('#stickLine');
    const line = sel ? +sel.value : 0;
    if (!Array.isArray(n.stickers)) n.stickers = [];
    n.stickers.push({
      id: uid('sk'), img: s.data, line, frac: stickFrac, flow: stickFlow, w: stickW, ts: appClock(),
    });
    n.updated = appClock();
    save(); closeDialog(); render('');
    toast('贴好了，文字会绕开它');
  }

  function delStick(noteId, id) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n || !Array.isArray(n.stickers)) return;
    n.stickers = n.stickers.filter((x) => x.id !== id);
    save(); closeDialog(); render(''); toast('已取下贴纸');
  }

  /* ---------------- 笔记（左右分栏） ---------------- */
  let noteCat = 'all';

  // 类型由用户自己定义：S.noteKinds = [{ id, label }]
  // 旧的 kind（diary/read/memo）会自动映射成三个默认类型，删掉也能继续用
  const DEFAULT_KINDS = [
    { id: 'diary', label: '日记' },
    { id: 'read', label: '读书笔记' },
    { id: 'memo', label: '备忘录' },
  ];
  function noteKinds() {
    if (!Array.isArray(S.noteKinds)) S.noteKinds = DEFAULT_KINDS.map((k) => Object.assign({}, k));
    return S.noteKinds;
  }
  function kindLabel(id) {
    const k = noteKinds().find((x) => x.id === id);
    return k ? k.label : (KIND_LABEL[id] || '笔记');
  }
  // 「被看见 / 仅自己 / 有批注」是固定的筛选，其余全是用户类型
  function noteCats() {
    return [{ key: 'all', label: '全部', match: () => true }]
      .concat(noteKinds().map((k) => ({ key: 'k:' + k.id, label: k.label, kindId: k.id, match: (n) => n.kind === k.id })))
      .concat([
        { key: 'visible', label: '被看见', match: (n) => n.visible },
        { key: 'hidden', label: '仅自己', match: (n) => !n.visible },
        { key: 'anno', label: '有批注', match: (n) => n.annos && n.annos.some((a) => a.text) },
      ]);
  }

  function openTodoCount() {
    return (S.todos || []).filter((t) => !t.done).length;
  }

  function notesListPage(cls) {
    const CATS = noteCats();
    const all = S.notes.slice().sort((a, b) => b.updated - a.updated);
    const cat = CATS.find((c) => c.key === noteCat) || CATS[0];
    const q = noteQuery.trim().toLowerCase();
    const notes = all
      .filter(cat.match)
      .filter((n) => !q || (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));

    const side = CATS.map((c) => {
      const cnt = all.filter(c.match).length;
      const unread = c.key === 'anno' ? all.filter((n) => (n.annos || []).some((a) => a.unread)).length : 0;
      const del = c.kindId ? `<span class="ns-del" data-del-kind="${c.kindId}" title="删除这个类型">×</span>` : '';
      return `<div class="ns-item ${c.key === noteCat ? 'on' : ''}" data-cat="${c.key}">
        <span class="ns-dot"></span><span class="ns-txt">${esc(c.label)}</span>
        <span class="ns-cnt">${unread ? `<span style="color:var(--red)">${unread}</span>` : cnt || ''}</span>
        ${del}
      </div>`;
    }).join('');

    const cards = notes.map((n) => {
      const names = (n.chars || []).map((id) => (charOf(id) || {}).name).filter(Boolean);
      const annoN = (n.annos || []).length;
      return `<div class="note-mini" data-note="${n.id}">
        <div class="nm-top">
          <span class="nm-kind">${esc(kindLabel(n.kind))}</span>
          <span class="nm-time">${relTime(n.updated)}</span>
          <span class="nm-vis ${n.visible ? 'vis-on' : 'vis-off'}">${n.visible ? '👁' + (names.length ? names.length : '') : '🔒'}</span>
        </div>
        <h4>${esc(n.title)}</h4>
        <p>${esc(n.content)}</p>
        <div class="nm-foot"><span>${(n.content || '').length} 字</span>${annoN ? `<span>💬 ${annoN}</span>` : ''}</div>
      </div>`;
    }).join('');

    return `<div class="${cls}">
      <div class="navbar" style="border-bottom:none">
        <div style="width:34px"></div>
        <div class="nb-title">笔记<small>思考，记录，存档</small></div>
        <div class="nb-right">
          <button class="icon-btn" data-action="toggle-note-search" title="搜索笔记">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          </button>
          <button class="icon-btn" data-action="new-note">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
      ${noteSearchOpen ? `<div class="note-searchbar"><input id="noteSearchInput" placeholder="搜索标题或正文关键词…" value="${esc(noteQuery)}">
        <button class="icon-btn" style="width:26px;height:26px" data-action="toggle-note-search">✕</button></div>` : ''}
      <div class="notes-split">
        <div class="notes-side">
          <div class="side-lbl">主题
            <button class="side-add" data-action="new-kind" title="新增类型">＋</button>
          </div>
          ${side}
          <div class="ns-sep"></div>
          <div class="ns-item" data-action="open-todo" style="font-weight:600;color:var(--ink)">
            <span class="ns-dot" style="background:var(--accent)"></span>
            <span class="ns-txt">待办</span>
            ${openTodoCount() ? `<span class="ns-badge">${openTodoCount()}</span>` : ''}
          </div>
          <div class="ns-item" data-action="open-calendar" style="font-weight:600;color:var(--ink)">
            <span class="ns-dot" style="background:#a79fb5"></span>
            <span class="ns-txt">日历</span>
            <span class="ns-cnt">${todayMarkCount()}</span>
          </div>
          <div class="ns-item ${S.settings.todoRemind ? 'on' : ''}" data-action="toggle-todo-remind" title="让他到点提醒我">
            <span class="ns-dot" style="background:${S.settings.todoRemind ? 'var(--green)' : 'var(--ink-3)'}"></span>
            <span class="ns-txt" style="font-size:11px">到点提醒</span>
            <span class="ns-cnt">${S.settings.todoRemind ? '开' : '关'}</span>
          </div>
          <div class="notes-side-foot" style="padding:8px 12px;font-size:9.5px;color:var(--ink-3);line-height:1.7">
            点左侧切换<br>右侧打开原文
          </div>
        </div>
        <div class="notes-main">
          <div class="notes-main-head">
            <span class="nm-title">${q ? `搜索「${esc(noteQuery.trim())}」` : cat.label}</span>
            <span class="nm-count">${notes.length} 篇</span>
          </div>
          <div class="list-scroll">${cards || `<div class="empty-state" style="padding:44px 18px">
            <div class="es-icon"><svg viewBox="0 0 24 24"><path d="M6 3.8h9l4 4v12.4H6z"/><path d="M9 10h7M9 13.5h7"/></svg></div>
            <h4>${all.length ? '这个主题还是空的' : '还没有笔记'}</h4>
            <p>${all.length ? '换一个主题看看，或写新的一篇。' : '日记、读书笔记、备忘录——<br>写下来，可以让某个联系人看见。'}</p>
            ${all.length ? '' : '<button class="btn solid" data-action="new-note" style="margin-top:14px">写第一篇</button>'}
          </div>`}
            <div style="padding:18px 14px 26px;text-align:center;font-size:10.5px;color:var(--ink-3);line-height:1.9">
              设为「联系人可见」后，<br>他们会在几分钟里留下批注。
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ---------------- 笔记搜索 ---------------- */
  let noteQuery = '';
  let noteSearchOpen = false;

  /* ---------------- 日历 ---------------- */
  const WD = ['日', '一', '二', '三', '四', '五', '六'];
  function dkey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function mdkey(md) { return md; } // 'MM-DD'
  function todayKey() { return dkey(appClock()); }

  function marksFor(key) {
    // key: YYYY-MM-DD → 该日期命中的特别标注 + 角色纪念日
    const out = [];
    const md = key.slice(5); // MM-DD
    (S.marks || []).forEach((m) => {
      if (m.repeat === 'year' ? m.date === md : m.date === key) out.push({ label: m.label, kind: 'mark', id: m.id });
    });
    (S.chars || []).forEach((c) => {
      if (!c.met) return;
      const d = new Date(c.met);
      const cmd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (cmd === md) out.push({ label: `${c.name} 的相遇纪念日`, kind: 'met', id: c.id });
    });
    return out;
  }
  function todayMarkCount() { return marksFor(todayKey()).length; }

  // 某一天命中的待办（用 due 时间）
  function todosOn(key) { return (S.todos || []).filter((t) => t.due && dkey(t.due) === key); }
  // 某一天写过的笔记（按 created/updated 日期）
  function notesOn(key) { return S.notes.filter((n) => dkey(n.created || n.updated) === key || dkey(n.updated) === key); }

  let calY, calM, calSel;
  function calInit() { const d = new Date(); calY = d.getFullYear(); calM = d.getMonth(); calSel = null; }

  function calendarPage(cls) {
    if (calY == null) calInit();
    const first = new Date(calY, calM, 1);
    const startWd = first.getDay();
    const daysIn = new Date(calY, calM + 1, 0).getDate();
    const tk = todayKey();
    let cells = '';
    for (let i = 0; i < startWd; i++) cells += '<div class="cal-cell blank"></div>';
    for (let day = 1; day <= daysIn; day++) {
      const key = `${calY}-${String(calM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasNote = notesOn(key).length;
      const hasTodo = todosOn(key).some((t) => !t.done);
      const mk = marksFor(key);
      const isToday = key === tk;
      const sel = calSel === key;
      const dots = [
        mk.some((m) => m.kind === 'met') ? '<i class="cal-dot d-met"></i>' : '',
        mk.some((m) => m.kind === 'mark') ? '<i class="cal-dot d-mark"></i>' : '',
        hasTodo ? '<i class="cal-dot d-todo"></i>' : '',
        hasNote ? '<i class="cal-dot d-note"></i>' : '',
      ].join('');
      cells += `<div class="cal-cell ${isToday ? 'today' : ''} ${sel ? 'sel' : ''} ${hasNote || hasTodo || mk.length ? 'has' : ''}" data-day="${key}">
        <span class="cal-num">${day}</span><span class="cal-dots">${dots}</span>
      </div>`;
    }
    const mk = calSel ? marksFor(calSel) : [];
    const tds = calSel ? todosOn(calSel) : [];
    const nts = calSel ? notesOn(calSel) : [];

    return `<div class="${cls} cal-page">
      <div class="navbar">
        <button class="nb-back" data-action="back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>
        </button>
        <div class="nb-title">日历<small>路一步一步走，日子一天一天过</small></div>
        <div class="nb-right">
          <button class="icon-btn" data-action="cal-add-mark" title="特别标注">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
      <div class="list-scroll">
        <div class="cal-head">
          <button class="icon-btn" data-cal-nav="-1">‹</button>
          <b>${calY} 年 ${calM + 1} 月</b>
          <button class="icon-btn" data-cal-nav="1">›</button>
        </div>
        <div class="cal-grid">
          ${WD.map((w) => `<div class="cal-wd">${w}</div>`).join('')}
          ${cells}
        </div>
        <div class="cal-legend">
          <span><i class="cal-dot d-note"></i>写过笔记</span>
          <span><i class="cal-dot d-todo"></i>有待办</span>
          <span><i class="cal-dot d-met"></i>纪念日</span>
          <span><i class="cal-dot d-mark"></i>特别标注</span>
        </div>
        ${calSel ? `<div class="cal-detail">
          <div class="cd-head"><b>${calSel}</b>${calSel === tk ? '<span class="cd-today">今天</span>' : ''}
            <button class="todo-del" data-action="cal-add-todo" data-day="${calSel}">＋ 加待办</button></div>
          ${mk.length ? mk.map((m) => `<div class="cal-flag ${m.kind}">${m.kind === 'met' ? '♡' : '★'} ${esc(m.label)}</div>`).join('') : ''}
          ${nts.length ? `<div class="cd-lbl">这一天的笔记</div>${nts.map((n) => `<div class="cd-note" data-note="${n.id}"><b>${esc(n.title)}</b><span>${esc((n.content || '').slice(0, 40))}</span></div>`).join('')}` : ''}
          ${tds.length ? `<div class="cd-lbl">这一天的待办</div>${tds.map((t) => {
            const w = t.remindBy && t.remindBy !== 'random' ? charOf(t.remindBy) : (t.remindedBy ? charOf(t.remindedBy) : null);
            return `<div class="cd-todo ${t.done ? 'done' : ''}"><span class="todo-check" data-toggle-todo="${t.id}"></span><span style="flex:1">${esc(t.text)}</span>${w ? `<span class="cd-who">${esc(w.name)} 提醒</span>` : ''}</div>`;
          }).join('')}` : ''}
          ${!nts.length && !tds.length && !mk.length ? '<p class="cd-empty">这一天还没有记录，写点什么吧。</p>' : ''}
        </div>` : '<p class="cd-hint">点一个日期，看那天写过的东西。</p>'}
        <div style="padding:16px 20px 30px;text-align:center;font-size:10.5px;color:var(--ink-3);line-height:1.9">时钟会停顿，时间却依旧向前。</div>
      </div>
    </div>`;
  }

  function calAddMark() {
    const preY = calY, preM = calM + 1, preD = calSel ? Number(calSel.slice(8)) : 1;
    openRawDialog(`
      <h3>特别标注</h3>
      <div class="dlg-body">
        <div class="dlg-field"><label>日期（月-日）</label>
          <input id="mkDate" type="text" value="${String(preM).padStart(2, '0')}-${String(preD).padStart(2, '0')}" placeholder="如 05-20" maxlength="5"></div>
        <div class="dlg-field"><label>叫什么</label>
          <input id="mkLabel" type="text" placeholder="如 生日、纪念日" maxlength="12"></div>
        <div class="dlg-field"><label>重复</label>
          <div class="card-seg" id="mkRepeat">
            <button data-v="year" class="${mkRepeat === 'year' ? 'on' : ''}">每一年</button>
            <button data-v="month" class="${mkRepeat === 'month' ? 'on' : ''}">仅本月</button>
          </div></div>
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" data-close-dialog>取消</button>
        <button class="btn solid" data-action="mk-save">保存</button>
      </div>`);
  }
  let mkRepeat = 'year';

  function calAddTodo(key) {
    openRawDialog(`
      <h3>加一条待办</h3>
      <div class="dlg-body">
        <div class="dlg-field"><label>哪一天 · ${key}</label><input id="tdText" type="text" placeholder="要记得做什么…" maxlength="60"></div>
        <div class="dlg-field"><label>几点提醒</label><input id="tdTime" type="time" value="09:00"></div>
        <div class="dlg-field"><label>谁来提醒</label><div id="tdWho" class="card-seg wrap">
          <button data-v="random" class="${tdWho === 'random' ? 'on' : ''}">随机一个人</button>
          ${S.chars.map((c) => `<button data-v="${c.id}" class="${tdWho === c.id ? 'on' : ''}">${esc(c.name)}</button>`).join('')}
        </div></div>
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" data-close-dialog>取消</button>
        <button class="btn solid" data-action="td-save" data-day="${key}">保存</button>
      </div>`);
  }
  let tdWho = 'random';

  /* ---------------- 待办提醒 ---------------- */
  function dueLabel(td) {
    if (!td.due) return null;
    const diff = td.due - appClock();
    const d = new Date(td.due);
    const stamp = `${d.getMonth() + 1}/${d.getDate()} ${hhmm(td.due)}`;
    if (diff < 0) return { cls: 'overdue', txt: '已过期 · ' + stamp };
    if (diff < 6 * H) return { cls: 'due-soon', txt: '还有 ' + Math.max(1, Math.round(diff / M)) + ' 分钟' };
    if (diff < 24 * H) return { cls: 'due-soon', txt: '今天 ' + hhmm(td.due) };
    return { cls: '', txt: stamp };
  }

  function todoPage(cls) {
    const list = S.todos || [];
    const open = list.filter((t) => !t.done).sort((a, b) => {
      if (!a.due && b.due) return 1;
      if (a.due && !b.due) return -1;
      return (a.due || 0) - (b.due || 0);
    });
    const doneList = list.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    const pct = list.length ? Math.round((doneList.length / list.length) * 100) : 0;
    const R = 19, C = 2 * Math.PI * R;

    const row = (td) => {
      const ch = (td.remindedBy || td.remindBy) && td.remindBy !== 'random' ? charOf(td.remindedBy || td.remindBy) : (td.remindedBy ? charOf(td.remindedBy) : null);
      const due = dueLabel(td);
      return `<div class="todo-item ${td.done ? 'done' : ''}" data-todo="${td.id}">
        <div class="todo-check" data-toggle-todo="${td.id}"></div>
        <div class="todo-main">
          <div class="todo-txt">${esc(td.text)}</div>
          <div class="todo-meta">
            ${due ? `<span class="todo-flag ${due.cls}">⏰ ${due.txt}</span>` : ''}
            ${td.remindAt && !td.done ? `<span class="todo-flag">提醒 ${hhmm(td.remindAt)}</span>` : ''}
            ${ch ? `<span class="todo-who">由 <i style="${ch.avatar ? '' : `background:${ch.color}`}">${ch.avatar ? `<img src="${ch.avatar}" alt="">` : esc(ch.initial)}</i>${esc(ch.name)} 提醒</span>` : ''}
            <button class="todo-del" data-del-todo="${td.id}">删除</button>
          </div>
        </div>
      </div>`;
    };

    return `<div class="${cls} todo-page">
      <div class="navbar" style="border-bottom:none">
        <button class="nb-back" data-action="back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>
        </button>
        <div class="nb-title">待办<small>或许你会忘记，但是总有人记得</small></div>
        <div class="nb-right">
          <button class="icon-btn" data-action="todo-more">
            <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
          </button>
        </div>
      </div>

      <div class="todo-head">
        <div class="todo-ring-wrap">
          <div class="todo-ring">
            <svg width="46" height="46" viewBox="0 0 46 46">
              <circle cx="23" cy="23" r="${R}" fill="none" stroke="#e4e8ea" stroke-width="4"/>
              <circle cx="23" cy="23" r="${R}" fill="none" stroke="#7f8b92" stroke-width="4"
                stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/>
            </svg>
            <span class="rt">${pct}%</span>
          </div>
          <div>
            <h3>还有 ${open.length} 件事没做</h3>
            <p>${open.filter((t) => t.remindAt).length ? `其中 ${open.filter((t) => t.remindAt).length} 件设了提醒，到点会有一个人来找你` : '事事清算事事算，事事顺心事事新'}</p>
          </div>
        </div>
      </div>

      <div class="todo-input-row">
        <input id="todoInput" placeholder="要记得做什么…" maxlength="60">
        <button data-action="add-todo">添加</button>
      </div>
      ${S.chars.length ? `<div style="padding:0 14px 0;background:var(--paper)">${todoWhoBar()}</div>` : ''}
      <div style="padding:0 14px 4px;background:var(--paper)">
        <div class="quick-times" style="padding:0 0 10px">
          <button data-quick-due="30">30 分钟后</button>
          <button data-quick-due="180">3 小时后</button>
          <button data-quick-due="1440">明天此刻</button>
          <button data-quick-due="0" class="on">不设时间</button>
        </div>
      </div>

      <div class="list-scroll">
        <div class="todo-group-lbl">待完成 · ${open.length}</div>
        ${open.length ? open.map(row).join('') : `<div class="empty-state" style="padding:34px 24px">
          <div class="es-icon"><svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7"/></svg></div>
          <h4>都做完了</h4><p>茶前无别事，倚木享清风。</p>
        </div>`}
        ${doneList.length ? `<div class="todo-group-lbl">已完成 · ${doneList.length}</div>${doneList.map(row).join('')}` : ''}
      </div>
    </div>`;
  }

  /* 待办操作 */
  let quickDue = 0;

  function addTodo() {
    const inp = $('#todoInput');
    const v = inp && inp.value.trim();
    if (!v) { if (inp) inp.focus(); return; }
    const clock = appClock();
    const td = {
      id: uid('td'), text: v, done: false,
      due: quickDue ? clock + quickDue * M : null,
      remindAt: quickDue ? clock + quickDue * M : null,
      remindBy: todoWho || 'random',
      remindedBy: null, createdAt: clock,
    };
    S.todos.push(td);
    save();
    inp.value = '';
    render();
    const who = todoWho !== 'random' && charOf(todoWho);
    toast(quickDue ? (who ? `已添加，${who.name} 会来提醒你` : '已添加，到点会有人来提醒你') : '已添加');
  }

  /* 待办提醒人选择：random 或角色 id */
  let todoWho = 'random';

  function todoWhoBar() {
    return `<div class="quick-times" style="padding:0 0 10px" id="todoWhoBar">
      <button data-who="random" class="${todoWho === 'random' ? 'on' : ''}">随机提醒</button>
      ${S.chars.map((c) => `<button data-who="${c.id}" class="${todoWho === c.id ? 'on' : ''}">${esc(c.name)} 提醒</button>`).join('')}
    </div>`;
  }

  function toggleTodo(id) {
    const td = (S.todos || []).find((t) => t.id === id);
    if (!td) return;
    td.done = !td.done;
    td.doneAt = td.done ? appClock() : null;
    save(); render();
    toast(td.done ? '做完了 ✓' : '放回待完成');
  }

  function delTodo(id) {
    S.todos = S.todos.filter((t) => t.id !== id);
    save(); render(); toast('已删除');
  }

  /* 角色提醒：随机挑一个角色，把待办说一句 */
  const TODO_PHRASES = [
    (t) => `「${t}」——别忘了。`,
    (t) => `提醒你一下：${t}。`,
    (t) => `你是不是又忘了？${t}。`,
    (t) => `${t}。我在等你做完。`,
    (t) => `刚路过看到，想起来你还没${t.replace(/^.*?(给|取|回|把|去)/, '$1')}。`,
  ];

  function remindByChar(td, silent) {
    const pool = S.chars.filter((c) => (chatOf(c.id) || {}).messages);
    if (!pool.length) return null;
    // 指定了提醒人就固定是他；纪念日待办（anniv）固定那个角色
    let ch = null;
    if (td.remindBy && charOf(td.remindBy)) ch = charOf(td.remindBy);
    else if (td.annivChar && charOf(td.annivChar)) ch = charOf(td.annivChar);
    if (!ch) ch = pick(pool);
    const text = pick(TODO_PHRASES)(td.text);
    const chat = chatOf(ch.id) || (S.chats.push({ id: uid('mt'), charId: ch.id, unread: 0, messages: [] }), chatOf(ch.id));
    const m = { id: uid('m'), from: 'char', type: 'text', text, ts: appClock(), todoId: td.id };
    chat.messages.push(m);
    td.remindedBy = ch.id;
    td.remindAt = null;

    const viewing = view.sub === 'detail' && view.id === ch.id && curTab === 'chat';
    if (viewing) {
      render('');
      if (isNearBottom()) { const sc = $('#chatScroll'); if (sc) sc.scrollTop = sc.scrollHeight; }
    } else {
      chat.unread = (chat.unread || 0) + 1;
      if (curTab === 'chat') render('');
    }
    updateBadges();
    if (S.settings.notifications && !silent) {
      showBanner(ch, `${td.text} —— 记得做`, 'chat', ch.id);
    }
    save();
    return ch;
  }

  function todoTick() {
    if (!S.settings.todoRemind) return;
    const clock = appClock();
    let changed = false;
    (S.todos || []).forEach((td) => {
      if (td.done || !td.remindAt) return;
      if (clock >= td.remindAt) {
        remindByChar(td);
        changed = true;
      }
    });
    if (changed && view.tab === 'todo') render('');
  }

  function todoMoreSheet() {
    const st = S.settings;
    openSheet(`
      <div class="sheet-title">待办提醒</div>
      <div class="set-row" style="padding:14px 22px">
        <div class="sr-txt">角色主动提醒<div class="sr-sub">到点随机挑一个人在聊天里提醒你</div></div>
        <button class="switch ${st.todoRemind ? 'on' : ''}" data-toggle="todoRemind"></button>
      </div>
      <div class="set-row" style="padding:14px 22px">
        <div class="sr-txt">立即测试一次<div class="sr-sub">挑一条未完成的待办，让角色现在就提醒</div></div>
        <button class="btn ghost sm" data-action="test-remind">试试</button>
      </div>
      <button class="sheet-item danger" data-sheet="clearDone">清除已完成的待办</button>
      <button class="sheet-item sheet-cancel" data-close-sheet>关闭</button>
    `);
  }

  function noteDetailPage(noteId, cls) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n) return `<div class="${cls}"></div>`;
    const annos = (n.annos || []).slice().sort((a, b) => a.ts - b.ts);
    const annosHTML = annos.map((a) => {
      const ch = charOf(a.charId);
      return `<div class="anno">
        ${avatarHTML(ch, '', { dot: true })}
        <div class="anno-main">
          <div class="anno-name">${esc(ch.name)}</div>
          <div class="anno-text">${esc(a.text)}</div>
        </div>
      </div>`;
    }).join('');
    if (n.annos) n.annos.forEach((a) => (a.unread = false));

    // 正文按行渲染：修改批注（便利贴）要挂在某一行的正下方
    const stickers = (n.revs || []).slice().sort((a, b) => a.ts - b.ts);
    const byLine = {};
    stickers.forEach((r) => { (byLine[r.line] = byLine[r.line] || []).push(r); });
    // 贴纸：可以贴在某一行里（跟插图一样有位置/排法/宽度），也可以浮在段落一侧
    const sticks = Array.isArray(n.stickers) ? n.stickers.slice().sort((a, b) => a.ts - b.ts) : [];
    const byPlace = {};   // `${line}-${side}` -> 浮动贴纸（老版本写法，同一段左右各最多一张）
    sticks.forEach((sk) => {
      if (isFlowStick(sk)) return;
      const k = `${sk.line}-${sk.side}`;
      if (!byPlace[k]) byPlace[k] = sk;
    });
    // 按「第几段第几个字」落位的贴纸
    const flowSticks = sticks.filter(isFlowStick);
    const skByLine = {};
    flowSticks.forEach((sk) => { (skByLine[sk.line] = skByLine[sk.line] || []).push(sk); });
    const lines = (n.content || '').split('\n');

    // 插图：按「第几行第几个字」拆开这一行的文字，把图塞进去
    const insets = Array.isArray(n.insets) ? n.insets.slice().sort((a, b) => (a.frac || 0) - (b.frac || 0)) : [];
    const byLines = {};   // lineIndex -> [inset...]
    insets.forEach((it) => { (byLines[it.line] = byLines[it.line] || []).push(it); });

    const insetHTML = (it) => `<span class="ins-fig ${it.flow || 'block'}"
        style="--iw:${it.w || 62}%" data-ins-edit="${it.id}" data-note="${n.id}" title="点按调整位置">
        <img src="${it.data}" alt=""></span>`;

    // 落位贴纸：跟插图一样，按 frac 插进这一行的文字之间
    const skFigHTML = (sk) => `<span class="sk-fig ${sk.flow || 'inline'}"
        style="--iw:${sk.w || 26}%" data-sk-edit="${sk.id}" data-note="${n.id}" title="点按调整位置">
        <img src="${sk.img}" alt=""></span>`;

    /* 把一行的文字按落点切开，依次塞进插图 / 贴纸（按 frac 排序，越靠后的越右） */
    function lineBodyHTML(ln, figs) {
      if (!figs.length) return esc(ln);
      const chars = [...ln];
      // 空行也要给贴纸一个落点，否则它没地方站
      if (!chars.length) return '<span class="sk-hold">&#8203;</span>';
      let out = '', last = 0;
      figs.forEach((f) => {
        const at = Math.max(last, Math.min(chars.length, Math.round((f.frac == null ? 0.5 : f.frac) * chars.length)));
        out += esc(chars.slice(last, at).join('')) + (f.kind === 'in' ? insetHTML(f.it) : skFigHTML(f.it));
        last = at;
      });
      out += esc(chars.slice(last).join(''));
      return out;
    }

    const storyHTML = lines.map((ln, i) => {
      const st = (byLine[i] || []).map((r) => `<div class="sticky" data-rev-del="${r.id}" data-note="${n.id}" title="${fullTime(r.ts).slice(0, 10)} · 点按取下">
          <div class="sticky-txt">${esc(r.text)}</div>
          <div class="sticky-time">${fullTime(r.ts).slice(5, 10)}</div>
        </div>`).join('');
      const sl = byPlace[`${i}-left`], sr = byPlace[`${i}-right`];
      // 老式浮动贴纸用 float 放进段落里，文字自然绕开
      const floats = (sl ? `<img class="note-stk left" src="${sl.img}" alt="" data-note="${n.id}" title="点按调整位置" data-sk-edit="${sl.id}">` : '')
        + (sr ? `<img class="note-stk right" src="${sr.img}" alt="" data-note="${n.id}" title="点按调整位置" data-sk-edit="${sr.id}">` : '');

      // 本行的插图 + 落位贴纸，合成一条按 frac 排序的队列
      const mine = (byLines[i] || []).map((it) => ({ kind: 'in', it, frac: it.frac }))
        .concat((skByLine[i] || []).map((sk) => ({ kind: 'sk', it: sk, frac: sk.frac })))
        .sort((a, b) => (a.frac || 0) - (b.frac || 0));
      const body = lineBodyHTML(ln, mine);
      const hasSk = !!(skByLine[i] || []).length;
      return `<div class="note-line ${st ? 'has-sticky' : ''} ${floats ? 'has-stk' : ''} ${mine.length ? 'has-ins' : ''} ${hasSk ? 'has-skf' : ''}">${floats}${body}${st}</div>`;
    }).join('');

    // 行号超出正文（比如删过段落）的插图 / 贴纸，统一挂到末尾
    const orphanIn = insets.filter((it) => it.line >= lines.length).map((it) => ({ kind: 'in', it, frac: it.frac }));
    const orphanSk = flowSticks.filter((sk) => sk.line >= lines.length).map((sk) => ({ kind: 'sk', it: sk, frac: sk.frac }));
    const orphan = orphanIn.concat(orphanSk).sort((a, b) => (a.frac || 0) - (b.frac || 0));
    const orphanHTML = orphan.length ? `<div class="note-line has-ins">${orphan.map((f) => (f.kind === 'in' ? insetHTML(f.it) : skFigHTML(f.it))).join('')}</div>` : '';

    // 图片：按插入顺序排在正文之后，像备忘录那样
    const imgs = Array.isArray(n.imgs) ? n.imgs : [];
    const imgsHTML = imgs.length ? `<div class="note-imgs">${imgs.map((im) => `<div class="ni-wrap" data-ni="${im.id}">
        <img src="${im.data}" alt="" data-note-img="${im.id}" data-note="${n.id}">
        <span class="ni-del" data-del-ni="${im.id}" data-note="${n.id}">✕</span>
      </div>`).join('')}</div>` : '';
    const stkCount = sticks.length;
    const insCount = insets.length;
    const stash = byLine['-1'] ? byLine['-1'].map((r) => `<div class="sticky tail" data-rev-del="${r.id}" data-note="${n.id}" title="${fullTime(r.ts).slice(0, 10)} · 点按取下">
        <div class="sticky-txt">${esc(r.text)}</div>
        <div class="sticky-time">${fullTime(r.ts).slice(5, 10)}</div>
      </div>`).join('') : '';

    return `<div class="${cls}" style="background:var(--paper)">
      <div class="navbar">
        <button class="nb-back" data-action="back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>
        </button>
        <div class="nb-title">${esc(kindLabel(n.kind))}<small>${fullTime(n.updated)}</small></div>
        <div class="nb-right">
          <button class="icon-btn" data-action="note-more" data-note="${n.id}">
            <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
          </button>
        </div>
      </div>
      <div class="note-body">
        <h3 class="note-title">${esc(n.title)}</h3>
        <div class="note-sub">
          <span>写于 ${fullTime(n.ts || n.updated).slice(0, 10)}</span>
          <span>改于 ${fullTime(n.updated).slice(0, 16)}</span>
          <button class="btn ${n.visible ? 'solid' : 'ghost'} sm" data-action="toggle-visible" data-note="${n.id}">
            ${n.visible ? '👁 联系人可见' : '🔒 仅自己可见'}
          </button>
          <button class="btn ghost sm" data-action="edit-note" data-note="${n.id}">编辑</button>
        </div>
        <div class="note-tools">
          <button data-action="note-add-img" data-note="${n.id}">
            <svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.5"/><path d="m5 17 4.5-4.5 3.5 3 3-2.5L20 16.5"/></svg>
            导入图片${insCount ? ` · ${insCount}` : ''}
          </button>
          <button data-action="note-add-stick" data-note="${n.id}">
            <svg viewBox="0 0 24 24"><path d="M12 4.5 14 9l5 .6-3.6 3.5.9 5-4.3-2.4L7.7 18l.9-5L5 9.5 10 9z"/></svg>
            贴纸${stkCount ? ` · ${stkCount}` : ''}
          </button>
        </div>
        <div class="note-content">${storyHTML}${orphanHTML}${stash}</div>
        ${imgsHTML}
        <div class="anno-sec">
          <h5>批注 · ${annos.length}</h5>
          ${n.visible ? `<div class="anno-hint">这篇你允许他们看见了</div>` : ''}
          ${annosHTML || (n.visible ? '<div style="font-size:12px;color:var(--ink-3);padding:6px 0">还没有批注。</div>' : '')}
          ${n.visible ? `<div style="margin-top:12px"><button class="btn ghost sm" data-action="nudge-anno" data-note="${n.id}">催一条新批注</button></div>` : ''}
        </div>
      </div>
    </div>`;
  }

  /* ================= 游戏 · 角色扮演群聊 ================= */
  let gameDraft = null;   // 创建中的草稿
  let playTyping = false;

  /* ---------- 旁白字卡库 ----------
   * 按叙事逻辑分四类：人物 / 场景 / 动作 / 情节。
   * 一句话的骨架固定为「谁 · 在哪儿 · 做了什么 · 然后呢」，
   * 用户点四类字卡，系统按这个顺序拼成一条旁白。 */
  const NARR_CATS = [
    { key: 'who', label: '人物', hint: '这一段里，镜头对着谁' },
    { key: 'where', label: '场景', hint: '他现在在哪儿' },
    { key: 'act', label: '动作', hint: '他做了什么' },
    { key: 'then', label: '情节', hint: '这件事之后，气氛变成了什么' },
  ];
  const NARR_SEED = {
    who: ['他', '她', '那个人', '房间里的另一个人', '站在门口的人', '你', '所有人'],
    where: ['在窗边', '在走廊尽头', '在灯下', '在雨里', '在楼梯口', '在很远的地方', '就在你身后'],
    act: ['停住了脚步', '低下头笑了一下', '把门轻轻带上', '看了你很久', '没有说话', '伸手碰了碰桌角', '转身要走'],
    then: ['空气安静下来', '雨声忽然变大了', '灯闪了一下', '一句话也没有留下', '像是在等你说什么', '故事就这样拐了个弯'],
  };
  function narrBank() {
    if (!S.narr || typeof S.narr !== 'object') S.narr = JSON.parse(JSON.stringify(NARR_SEED));
    NARR_CATS.forEach((c) => { if (!Array.isArray(S.narr[c.key])) S.narr[c.key] = []; });
    return S.narr;
  }
  // 已经选好但还没发出去的四格
  let narrPick = { who: '', where: '', act: '', then: '' };
  let narrOpen = false;
  let dreamWho = null;   // 「让某人说一句」上一次挑中的人
  function narrSentence() {
    const p = narrPick;
    const parts = [p.who, p.where, p.act, p.then].filter(Boolean);
    if (!parts.length) return '';
    // 「他 / 她 / 你」直接接地点；其他称呼加个逗号更顺
    const head = p.who && /^[他她你]$/.test(p.who) ? p.who + (p.where || '') : [p.who, p.where].filter(Boolean).join('，');
    const rest = [p.act, p.then].filter(Boolean).join('，');
    const body = [head, rest].filter(Boolean).join('，');
    return body + '。';
  }
  function narrPickerHTML() {
    const bank = narrBank();
    const seg = NARR_CATS.map((c) => {
      const cur = narrPick[c.key];
      return `<div class="np-row">
        <div class="np-lbl">${c.label}</div>
        <div class="np-chips">
          ${bank[c.key].map((w) => `<button class="np-chip ${cur === w ? 'on' : ''}" data-np="${c.key}" data-npw="${esc(w)}">${esc(w)}</button>`).join('')}
          <button class="np-chip add" data-np-add="${c.key}">＋</button>
        </div>
      </div>`;
    }).join('');
    return `<div class="np-wrap" data-game="${view.id}">
      <div class="np-head"><b>旁白字卡</b><span>人物 · 场景 · 动作 · 情节</span></div>
      ${seg}
      <div class="np-preview">${narrSentence() ? esc(narrSentence()) : '<span class="ph">按顺序点几张字卡，凑成一句旁白</span>'}</div>
      <div class="np-acts">
        <button class="btn ghost sm" data-action="np-clear">清空</button>
        <button class="btn solid sm" data-action="np-send">作为旁白发出</button>
      </div>
    </div>`;
  }
  function addNarrWord(cat) {
    const bank = narrBank();
    const v = prompt(`新的「${(NARR_CATS.find((c) => c.key === cat) || {}).label}」字卡`);
    if (!v || !v.trim()) return;
    bank[cat].push(v.trim());
    narrPick[cat] = v.trim();
    save(); render(''); toast('已加进字卡库');
  }
  function npSet(cat, word) {
    narrPick[cat] = narrPick[cat] === word ? '' : word;
    render('');
  }

  function gamesSorted() {
    return (S.games || []).slice().sort((a, b) => (b.updated || b.created) - (a.updated || a.created));
  }

  function gameListPage(cls) {
    const list = gamesSorted();
    const cards = list.map((g) => {
      const live = g.status === 'live';
      const cast = (g.cast || []).slice(0, 5);
      return `<div class="game-card" data-game="${g.id}">
        <div class="gc-top">
          <div class="gc-cover" ${g.cover ? `style="background-image:url('${g.cover}');background-size:cover;background-position:center;color:transparent"` : ''}>${g.cover ? '' : (g.emoji || '🎭')}</div>
          <div class="gc-title">
            <b>${g.noAI ? '<i class="dream-tag">一场梦</i>' : ''}${esc(g.name)}</b>
            <span>${cast.length + 1} 位在场 · ${live ? '演绎中' : '已结束'} · ${relTime(g.updated || g.created)}</span>
          </div>
          <span class="gc-state ${live ? 'live' : ''}">${live ? '进行中' : '存档'}</span>
        </div>
        <div class="gc-setting">${esc(g.setting || '没有写背景设定')}</div>
        <div class="gc-cast">
          <span class="mini-av" style="background:#93a1a8">${esc(S.settings.me.initial)}</span>
          ${cast.map((c) => {
            const ch = charOf(c.charId);
            if (ch) return `<span class="mini-av" style="background:${ch.color}">${ch.avatar ? `<img src="${ch.avatar}" alt="">` : esc(ch.initial)}</span>`;
            return `<span class="mini-av" style="background:#a8a49b">${esc((c.name || '?')[0])}</span>`;
          }).join('')}
          <span class="more">${(g.lines || []).length} 句台词</span>
        </div>
      </div>`;
    }).join('');

    return `<div class="${cls} game-page">
      <div class="navbar" style="border-bottom:none">
        <div style="width:34px"></div>
        <div class="nb-title">游戏<small>给联系人一个角色，让他们演下去</small></div>
        <div class="nb-right">
          <button class="icon-btn" data-action="new-game">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
      </div>
      <div class="game-hero">
        <h3>角色扮演群聊</h3>
        <p>写一个背景设定，把联系人拉进来扮演对应角色。<br>可以不接 AI，用字卡把戏推下去。</p>
      </div>
      <div class="list-scroll">
        ${cards}
        <div style="padding:8px 14px 0">
          <button class="btn ghost block" data-action="new-game">创建新群聊</button>
        </div>
        <div style="padding:20px 20px 34px;text-align:center;font-size:10.5px;color:var(--ink-3);line-height:1.9">
          ${S.settings.ai.key ? '已接入 AI：' + esc(S.settings.ai.model) + '（新建时可选择不用）' : '不接 AI 也能玩：用旁白字卡和角色字卡把戏推下去<br>「我的 → AI 接口配置」里填 Key 可以让角色自己开口'}
        </div>
      </div>
    </div>`;
  }

  /* ---------- 创建页 ---------- */
  function newDraft() {
    gameDraft = {
      id: uid('gm'), name: '', setting: '', cover: '🎭', noAI: false,
      cast: [{ key: uid('cs'), charId: '', role: '', persona: '' }],
    };
    view = { tab: 'game', sub: 'create', id: gameDraft.id };
    render('enter');
  }

  function gameCreatePage(cls) {
    const d = gameDraft;
    if (!d) return `<div class="${cls}"></div>`;
    const castHTML = d.cast.map((c, i) => {
      const owners = S.chars.map((ch) => `<button class="${c.charId === ch.id ? 'on' : ''}" data-cast-owner="${ch.id}" data-ci="${i}">
        <span class="oav" style="background:${ch.color}">${ch.avatar ? `<img src="${ch.avatar}" alt="">` : esc(ch.initial)}</span>${esc(ch.name)}
      </button>`).join('');
      return `<div class="cast-card" data-cast="${c.key}">
        <div class="cc-head">
          <span class="cc-idx">${i + 1}</span>
          <span style="font-size:12px;color:var(--ink-3)">${c.charId ? '已指定扮演者' : '未指定扮演者'}</span>
          ${d.cast.length > 1 ? `<button class="cc-del" data-cast-del="${c.key}">删除</button>` : ''}
        </div>
        <div class="form-lbl">由谁扮演${S.chars.length ? '' : '（还没有联系人，可直接新建角色）'}</div>
        <div class="cast-owner">
          <button class="${!c.charId ? 'on' : ''}" data-cast-owner="" data-ci="${i}">
            <span class="oav" style="background:#b3bcc0">新</span>新建角色
          </button>
          ${owners}
        </div>
        <input data-cast-field="name" data-ci="${i}" value="${esc(c.name || '')}" placeholder="他在这场戏里叫什么（角色名）">
        <textarea data-cast-field="persona" data-ci="${i}" rows="3" placeholder="这个人物的背景设定：身份、性格、和主角的关系、此刻的处境…">${esc(c.persona || '')}</textarea>
      </div>`;
    }).join('');

    return `<div class="${cls} game-page">
      <div class="navbar">
        <button class="nb-back" data-action="back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>
        </button>
        <div class="nb-title">创建群聊</div>
        <div class="nb-right"><button class="btn solid sm" data-action="create-game">开始</button></div>
      </div>
      <div class="list-scroll" style="padding:14px">
        <div class="form-lbl">群聊名称</div>
        <input class="form-input" id="gName" value="${esc(d.name)}" placeholder="例如：雨夜的旧宅" style="margin-bottom:14px">

        <div class="form-lbl">背景设定</div>
        <textarea class="form-textarea" id="gSetting" rows="5" placeholder="这个世界是什么样的？故事从哪里开始？你是谁？&#10;例：民国年间，你继承了祖母留下的旧宅，搬进去的第一晚，宅子里的三位住客陆续出现了……" style="margin-bottom:16px">${esc(d.setting)}</textarea>

        <div style="display:flex;align-items:center;margin-bottom:8px">
          <div class="form-lbl" style="margin:0;flex:1">登场角色</div>
          <button class="btn ghost sm" data-action="add-cast">+ 加一个</button>
        </div>
        ${castHTML}

        <div class="play-setting" style="margin-top:4px">
          <span class="ps-label">主角</span>
          你 —— <b>${esc(S.settings.me.name)}</b>。默认由你本人出演，不需要设定。
        </div>

        <div class="form-lbl" style="margin-top:16px">怎么演</div>
        <div class="mode-pick" id="modePick">
          <button data-mode="ai" class="${d.noAI ? '' : 'on'}">
            <b>接 AI</b><span>角色会按人设自己说话</span>
          </button>
          <button data-mode="dream" class="${d.noAI ? 'on' : ''}">
            <b>不接 AI · 一场梦</b><span>用字卡拼旁白，戏由你推</span>
          </button>
        </div>
        ${d.noAI ? `<div class="mode-note">这场戏会被标上「一场梦」。没有 AI，角色的台词从字卡里来，
          你可以用「人物 / 场景 / 动作 / 情节」四类旁白字卡把剧情推下去。</div>` : ''}
        <div style="height:10px"></div>
        <button class="btn solid block" data-action="create-game">进入这场戏</button>
        <div style="height:26px"></div>
      </div>
    </div>`;
  }

  /* ---------- 扮演页 ---------- */
  function gamePlayPage(gameId, cls) {
    const g = (S.games || []).find((x) => x.id === gameId);
    if (!g) return `<div class="${cls}"></div>`;

    const linesHtml = (g.lines || []).map((l) => {
      if (l.type === 'narr') {
        return `<div class="line-row narr"><div class="line-bubble">${esc(l.text)}</div></div>`;
      }
      if (l.type === 'sys') {
        return `<div class="line-row narr"><div class="line-bubble" style="border-style:solid;background:rgba(255,255,255,.45)">${esc(l.text)}</div></div>`;
      }
      const mine = l.from === 'me';
      const who = mine ? meObj()
        : (() => { const ch = charOf(l.charId); return { name: l.name || (ch ? ch.name : '某人'), initial: (l.name || (ch ? ch.name : '某'))[0], color: ch ? ch.color : '#a8a49b', avatar: ch ? ch.avatar : '' }; })();
      return `<div class="line-row ${mine ? 'me' : ''}">
        ${avatarHTML(who, '')}
        <div class="line-col">
          <div class="line-who">
            <span class="${mine ? '' : 'role'}">${esc(who.name)}</span>
            ${!mine && l.role ? `<span class="arrow">饰</span><span>${esc(l.role)}</span>` : ''}
          </div>
          <div class="line-bubble">${esc(l.text)}</div>
        </div>
      </div>`;
    }).join('');

    const castNames = (g.cast || []).map((c) => c.name || (charOf(c.charId) || {}).name).filter(Boolean);

    return `<div class="${cls} play-page">
      <div class="play-bar">
        <button class="icon-btn" data-action="back">
          <svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>
        </button>
        <div class="pb-title">
          <b>${g.noAI ? '<i class="dream-tag">一场梦</i>' : ''}${esc(g.name)}</b>
          <span>${g.status === 'live' ? '演绎中' : '已结束'} · ${castNames.length + 1} 位在场${g.noAI ? ' · 不接 AI' : ''}</span>
        </div>
        <button class="icon-btn" data-action="play-more" data-game="${g.id}">
          <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg>
        </button>
      </div>
      <div class="play-scroll" id="playScroll">
        <div class="grp-card ${g.cover ? 'has-img' : ''}" ${g.cover ? `style="background-image:url('${g.cover}')"` : ''}
             data-action="group-cover" data-game="${g.id}">
          ${g.cover ? '<div class="grc-veil"></div>' : ''}
          <div class="grc-inner">
            <span class="ps-label">背景设定${g.cover ? ' · 群聊背景卡' : ''}</span>
            <div class="grc-text">${esc(g.setting)}</div>
            ${castNames.length ? `<div class="grc-cast">登场：${esc(S.settings.me.name)}（你）、${castNames.map(esc).join('、')}</div>` : ''}
          </div>
          <span class="grc-edit">${g.cover ? '换背景卡' : '＋ 背景卡'}</span>
        </div>
        ${linesHtml}
        <div id="typingSlot"></div>
      </div>
      <div class="play-input">
        ${g.status !== 'live' ? `
        <div style="display:flex;gap:8px;align-items:center;justify-content:center;padding:4px 0 6px">
          <span style="font-size:11.5px;color:var(--ink-3)">这场戏已经结束了</span>
          <button class="btn ghost sm" data-action="resume-play" data-game="${g.id}">重新开始演绎</button>
        </div>` : g.noAI ? `
        <div class="pi-tools">
          <button data-action="toggle-narr" data-game="${g.id}" class="${narrOpen ? 'on' : ''}">旁白字卡</button>
          <button data-action="dream-say" data-game="${g.id}">让某人说一句</button>
          <button data-action="end-play" data-game="${g.id}">结束扮演</button>
        </div>
        ${narrOpen ? narrPickerHTML() : ''}
        <div class="pi-row">
          <textarea id="playInput" rows="1" placeholder="你自己要说的话…（不想说就只发旁白）" data-game="${g.id}"></textarea>
          <button class="pi-btn" data-action="play-send" data-game="${g.id}">说</button>
        </div>
        <div class="dream-hint">这场梦里没有 AI，所有字都从字卡里来。</div>` : `
        <div class="pi-tools">
          <button data-action="continue-play" data-game="${g.id}">继续（让他们说）</button>
          <button data-action="toggle-narr" data-game="${g.id}" class="${narrOpen ? 'on' : ''}">旁白字卡</button>
          <button data-action="end-play" data-game="${g.id}">结束扮演</button>
        </div>
        ${narrOpen ? narrPickerHTML() : ''}
        <div class="pi-row">
          <textarea id="playInput" rows="1" placeholder="你说的话…（你是${esc(S.settings.me.name)}）" data-game="${g.id}"></textarea>
          <button class="pi-btn" data-action="play-send" data-game="${g.id}">发送</button>
        </div>`}
      </div>
    </div>`;
  }

  /* ---------- 群聊背景卡 ---------- */
  function groupCoverSheet(gameId) {
    const g = (S.games || []).find((x) => x.id === gameId);
    if (!g) return;
    openRawDialog(`
      <h3>群聊背景卡</h3>
      <div class="dlg-body">
        <div class="gcs-preview ${g.cover ? 'has-img' : ''}" id="gcsPrev"
             ${g.cover ? `style="background-image:url('${g.cover}')"` : ''}>
          ${g.cover ? '' : '<span>还没有背景卡</span>'}
          <div class="gcs-veil"></div>
          <div class="gcs-txt">${esc(g.setting || '背景设定')}</div>
        </div>
        <p style="font-size:11px;color:var(--ink-3);line-height:1.8;margin:10px 0 12px">
          这张卡会贴在群聊顶部，背景设定就写在上面。<br>图片只存在这台设备里。
        </p>
        <div style="display:flex;gap:8px">
          <button class="btn ghost sm" data-action="gc-pick" data-game="${gameId}" style="flex:1">${g.cover ? '换一张' : '上传图片'}</button>
          ${g.cover ? `<button class="btn ghost sm" data-action="gc-clear" data-game="${gameId}" style="flex:0 0 auto;color:var(--red)">去掉</button>` : ''}
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn solid" data-close-dialog>好了</button>
      </div>`);
  }

  function pickGroupCover(gameId) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      // 背景卡用宽一点的压缩尺寸（横图为主）
      shrinkImage(f, 1100, (data, w, h) => {
        if (!data) { toast('这张图读不了，换一张试试'); return; }
        const g = (S.games || []).find((x) => x.id === gameId);
        if (!g) return;
        g.cover = data; g.coverW = w; g.coverH = h;
        g.updated = appClock();
        save();
        const prev = $('#gcsPrev');
        if (prev) {
          prev.classList.add('has-img');
          prev.style.backgroundImage = `url('${data}')`;
          const sp = $('span', prev); if (sp && !sp.classList.contains('gcs-txt')) sp.remove();
        }
        render('');
        toast('背景卡换好了');
      });
    };
    inp.click();
  }

  function clearGroupCover(gameId) {
    const g = (S.games || []).find((x) => x.id === gameId);
    if (!g) return;
    g.cover = null; g.coverW = null; g.coverH = null;
    save(); closeDialog(); render('');
    toast('已去掉背景卡');
  }

  /* ---------- AI：让一个角色说一句 ---------- */
  function castLabel(c) {
    const ch = charOf(c.charId);
    return `${c.name || (ch ? ch.name : '角色')}${c.role ? '（' + c.role + '）' : ''}`;
  }

  async function gameSpeak(g, cast) {
    const st = S.settings.ai;
    const ch = cast.charId ? charOf(cast.charId) : null;
    const others = (g.cast || []).filter((c) => c !== cast).map(castLabel).join('、') || '无';
    const recent = (g.lines || []).slice(-14).map((l) => {
      if (l.type === 'narr') return `【旁白】${l.text}`;
      if (l.type === 'sys') return '';
      const nm = l.from === 'me' ? S.settings.me.name : `${l.name || ''}${l.role ? '(' + l.role + ')' : ''}`;
      return `${nm}：${l.text}`;
    }).filter(Boolean).join('\n');

    const sys = [
      '你正在参与一场中文角色扮演。',
      `【背景设定】${g.setting}`,
      `【你的角色】${cast.name || (ch ? ch.name : '无名角色')}${cast.role ? '，身份/关系：' + cast.role : ''}`,
      cast.persona ? `【角色设定】${cast.persona}` : '',
      ch ? `【你本来的性格（可以带一点进来）】${ch.persona}` : '',
      `【在场其他人物】主角：${S.settings.me.name}；其他人：${others}`,
      '只输出你这一句台词。不要写角色名，不要写"某某说"，不要旁白，不要括号动作。',
      '口语、简短、有画面感，不超过 40 字。严格贴合背景设定与角色设定。',
    ].filter(Boolean).join('\n');

    if (!st.key) {
      // 无 Key：占位台词，保证流程完整可演示
      await new Promise((r) => setTimeout(r, 900 + Math.random() * 1200));
      const seeds = [
        `（${cast.name || '他'}看了你一会儿）……你终于来了。`,
        `这里的事，你最好别问太多。`,
        `${S.settings.me.name}，你还记得上一次来这儿是什么时候吗？`,
        `我等你很久了。`,
        `别站在门口。进来吧。`,
      ];
      return { text: pick(seeds), placeholder: true };
    }

    const body = {
      model: st.model || 'deepseek-chat',
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: `【到目前为止的对白】\n${recent || '（戏刚开始）'}\n\n现在轮到你说一句。` },
      ],
      temperature: 0.95, max_tokens: 120,
    };
    const r = await fetch(st.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + st.key },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    const txt = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!txt) throw new Error('empty');
    return { text: txt.trim().replace(/^["'“”]|["'“”]$/g, '').replace(new RegExp('^' + (cast.name || '') + '[：:]'), '').trim() };
  }

  function showTyping(name) {
    const slot = $('#typingSlot');
    if (!slot) return;
    slot.innerHTML = `<div class="typing-line">
      <span class="dots"><i></i><i></i><i></i></span>
      <span>${esc(name)} 正在说…</span>
    </div>`;
    const sc = $('#playScroll'); if (sc) sc.scrollTop = sc.scrollHeight;
  }
  function clearTyping() {
    const slot = $('#typingSlot');
    if (slot) slot.innerHTML = '';
  }

  async function advancePlay(gameId) {
    if (playTyping) return;
    const g = (S.games || []).find((x) => x.id === gameId);
    if (!g || g.status !== 'live') return;
    const cast = (g.cast || []).filter((c) => c.name || c.charId);
    if (!cast.length) { toast('这场戏还没有角色'); return; }

    playTyping = true;
    const c = cast[(g.turn || 0) % cast.length];
    g.turn = ((g.turn || 0) + 1) % cast.length;
    const displayName = c.name || (charOf(c.charId) || {}).name || '角色';
    showTyping(displayName);

    let out;
    try {
      out = await gameSpeak(g, c);
    } catch (err) {
      out = { text: '（AI 没有回应：' + err.message + '）' };
    }
    clearTyping();
    g.lines = g.lines || [];
    g.lines.push({ id: uid('ln'), type: 'say', charId: c.charId || '', name: displayName, role: c.role || '', text: out.text, ts: appClock() });
    g.updated = appClock();
    playTyping = false;
    save();
    refreshPlay(gameId);
    if (out.placeholder && !S.settings.ai.key && !g._warned) {
      g._warned = true; save();
      setTimeout(() => toast('这是占位台词，配好 AI Key 后会按设定真演'), 600);
    }
  }

  function refreshPlay(gameId) {
    if (view.tab === 'game' && view.sub === 'play' && view.id === gameId) {
      // 局部追加，避免整页重绘打断输入
      const g = (S.games || []).find((x) => x.id === gameId);
      const sc = $('#playScroll');
      if (!sc) { render(''); return; }
      const last = (g.lines || []).slice(-1)[0];
      if (!last) return;
      const slot = $('#typingSlot');
      let el = '';
      if (last.type === 'narr') el = `<div class="line-row narr"><div class="line-bubble">${esc(last.text)}</div></div>`;
      else if (last.type === 'sys') el = `<div class="line-row narr"><div class="line-bubble" style="border-style:solid">${esc(last.text)}</div></div>`;
      else {
        const mine = last.from === 'me';
        const who = mine ? meObj()
          : (() => { const ch = charOf(last.charId); return { name: last.name || (ch ? ch.name : '某人'), initial: (last.name || (ch ? ch.name : '某'))[0], color: ch ? ch.color : '#a8a49b', avatar: ch ? ch.avatar : '' }; })();
        el = `<div class="line-row ${mine ? 'me' : ''}">
          ${avatarHTML(who, '')}
          <div class="line-col">
            <div class="line-who"><span class="${mine ? '' : 'role'}">${esc(who.name)}</span>
              ${!mine && last.role ? `<span class="arrow">饰</span><span>${esc(last.role)}</span>` : ''}</div>
            <div class="line-bubble">${esc(last.text)}</div>
          </div>
        </div>`;
      }
      slot.insertAdjacentHTML('beforebegin', el);
      sc.scrollTop = sc.scrollHeight;
      return;
    }
    updateBadges();
  }

  function pushPlayLine(gameId, line) {
    const g = (S.games || []).find((x) => x.id === gameId);
    if (!g) return;
    g.lines = g.lines || [];
    g.lines.push(Object.assign({ id: uid('ln'), ts: appClock() }, line));
    g.updated = appClock();
    save();
    refreshPlay(gameId);
  }

  function playMoreSheet(gameId) {
    const g = (S.games || []).find((x) => x.id === gameId);
    if (!g) return;
    openSheet(`
      <div class="sheet-title">${esc(g.name)}</div>
      <button class="sheet-item" data-action="edit-game" data-game="${g.id}">查看 / 编辑设定</button>
      <button class="sheet-item" data-action="play-narr-prompt" data-game="${g.id}">插入一段旁白</button>
      ${g.status === 'live'
        ? `<button class="sheet-item danger" data-action="end-play" data-game="${g.id}">结束扮演</button>`
        : `<button class="sheet-item" data-action="resume-play" data-game="${g.id}">继续这场戏</button>`}
      <button class="sheet-item danger" data-sheet="delGame" data-game="${g.id}">删除这个群聊</button>
      <button class="sheet-item sheet-cancel" data-close-sheet>取消</button>
    `);
  }

  /* ---------- 创建 / 编辑 ---------- */
  function collectDraft() {
    const d = gameDraft;
    const nm = $('#gName'); const st = $('#gSetting');
    if (nm) d.name = nm.value.trim();
    if (st) d.setting = st.value.trim();
    return d;
  }

  function createGame() {
    const d = collectDraft();
    if (!d.name) { toast('先给群聊起个名字'); const el = $('#gName'); if (el) el.focus(); return; }
    if (!d.setting) { toast('写一句背景设定，AI 才知道这是哪儿'); const el = $('#gSetting'); if (el) el.focus(); return; }
    const cast = d.cast.filter((c) => c.name && (c.persona || c.charId));
    if (!cast.length) { toast('至少写一个角色，并给个名字'); return; }

    const g = {
      id: d.id, name: d.name, setting: d.setting, cover: null, emoji: d.cover || '🎭', noAI: !!d.noAI,
      cast: cast.map((c) => ({ key: c.key, charId: c.charId, name: c.name, role: c.role || '', persona: c.persona || '' })),
      lines: [{
        id: uid('ln'), type: 'sys', ts: appClock(),
        text: `—— 戏开始了。${cast.map((c) => c.name).join('、')} 陆续登场。你就是 ${S.settings.me.name}。`,
      }],
      status: 'live', turn: 0, created: appClock(), updated: appClock(),
    };
    S.games = S.games || [];
    S.games.unshift(g);
    gameDraft = null;
    save();
    view = { tab: 'game', sub: 'play', id: g.id };
    render('enter');
    if (!g.noAI) setTimeout(() => advancePlay(g.id), 700);
  }

  function endPlay(gameId) {
    const g = (S.games || []).find((x) => x.id === gameId);
    if (!g) return;
    openDialog({
      title: '结束这场扮演？',
      desc: '对话会完整存档，之后还能重新开始演绎。',
      rawHTML: `<div class="end-card">
        <div class="ec-mark">🎬</div>
        <h4>${esc(g.name)}</h4>
        <p>${(g.lines || []).length} 句台词 · ${(g.cast || []).length + 1} 位角色<br>存档之后，故事停在这里。</p>
      </div>`,
      ok: '结束扮演',
      danger: true,
      onOk: () => {
        g.status = 'ended';
        g.lines.push({ id: uid('ln'), type: 'sys', text: `—— 戏结束了。（${fullTime(appClock())}）`, ts: appClock() });
        g.updated = appClock();
        save(); render(''); toast('已存档');
      },
    });
  }

  function editGameSheet(gameId) {
    const g = (S.games || []).find((x) => x.id === gameId);
    if (!g) return;
    const castTxt = (g.cast || []).map((c, i) => `${i + 1}. ${c.name}${c.role ? '（' + c.role + '）' : ''}\n   ${c.persona || '无设定'}`).join('\n\n');
    openDialog({
      title: g.name,
      rawHTML: `<div style="max-height:300px;overflow-y:auto;font-size:12px;color:var(--ink-2);line-height:1.8">
        <div class="ps-label" style="font-size:9.5px;letter-spacing:1.2px;color:var(--ink-3)">背景设定</div>
        <div style="margin-bottom:12px">${esc(g.setting)}</div>
        <div class="ps-label" style="font-size:9.5px;letter-spacing:1.2px;color:var(--ink-3)">登场角色</div>
        <div style="white-space:pre-wrap">${esc(castTxt)}</div>
      </div>`,
      ok: '知道了',
    });
  }

  function sendPlayLine(gameId) {
    const inp = $('#playInput');
    const v = inp && inp.value.trim();
    if (!v) { if (inp) inp.focus(); return; }
    pushPlayLine(gameId, { type: 'say', from: 'me', text: v });
    inp.value = '';
    inp.dispatchEvent(new Event('input'));
    // 说完一句，让下一个角色接
    setTimeout(() => advancePlay(gameId), 700);
  }

  /* 无 AI：用旁白字卡发出 → 不强制接话，用户可选择「让某人说一句」 */
  function sendPickedNarr(gameId) {
    const txt = narrSentence();
    if (!txt) { toast('先点几张字卡'); return; }
    pushPlayLine(gameId, { type: 'narr', text: txt, cards: Object.assign({}, narrPick) });
    narrPick = { who: '', where: '', act: '', then: '' };
    render('');
    toast('旁白已经写进这场戏');
  }

  /* 无 AI：让一个角色用他的字卡说一句 */
  function dreamSpeak(gameId) {
    const g = (S.games || []).find((x) => x.id === gameId);
    if (!g) return;
    const pool = (g.cast || []).filter((c) => c.name || c.charId);
    if (!pool.length) { toast('这场戏还没有角色'); return; }
    const c = dreamWho && pool.find((x) => x.key === dreamWho) ? pool.find((x) => x.key === dreamWho) : pool[(g.turn || 0) % pool.length];
    dreamWho = null;
    g.turn = ((g.turn || 0) + 1) % pool.length;
    const ch = c.charId ? charOf(c.charId) : null;
    const lines = ch ? cardsFor(ch, 'pool').concat(cardsFor(ch, 'reply')) : (ch && ch.pool ? ch.pool : []);
    const text = lines.length ? pick(lines) : '……';
    pushPlayLine(gameId, { type: 'say', charId: c.charId || '', name: c.name || (ch ? ch.name : '角色'), role: c.role || '', text });
    render('');
  }

  function sendNarration(gameId) {
    const inp = $('#narrInput');
    const v = inp && inp.value.trim();
    if (!v) { if (inp) inp.focus(); return; }
    pushPlayLine(gameId, { type: 'narr', text: v });
    inp.value = '';
    setTimeout(() => advancePlay(gameId), 700);
  }

  /* ---------------- 表情与贴纸 ----------------
   * 四块：
   *   通用表情   —— 所有聊天里都能发，笔记里也能当贴纸
   *   笔记专用贴纸 —— 只在笔记里贴
   *   角色特殊表情 —— 每个联系人一套，只有他的聊天里能用
   */
  function bankGridHTML(which, list, addLabel) {
    return `<div class="nstk-grid">
      <button class="nstk-add" data-action="nstk-upload" data-which="${which}">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>${addLabel}</span>
      </button>
      ${list.map((st, i) => `<div class="nstk-tile" data-nstk="${which}:${i}">
        <img src="${st.data}" alt="">
        <span class="del" data-nstk-del="${which}:${i}">✕</span>
      </div>`).join('')}
    </div>`;
  }

  function stickersPage(cls) {
    const gl = S.gstickers || [];
    const pl = S.pstickers || [];

    const gHTML = `<div class="stk-wall">
      <div class="stk-owner">
        <span class="nstk-badge"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2"/><path d="M8.6 14.2c.9 1.3 2.1 2 3.4 2s2.5-.7 3.4-2"/></svg></span>
        <div><b>通用表情</b><span>${gl.length} 张 · 所有聊天里都能发，笔记里也能贴</span></div>
      </div>
      ${bankGridHTML('g', gl, '导入表情')}
      ${gl.length ? '' : `<div class="stk-hint">还没有通用表情。导入几张，跟谁聊都能发。</div>`}
    </div>`;

    const pHTML = `<div class="stk-wall">
      <div class="stk-owner">
        <span class="nstk-badge"><svg viewBox="0 0 24 24"><path d="M12 4.5 14 9l5 .6-3.6 3.5.9 5-4.3-2.4L7.7 18l.9-5L5 9.5 10 9z"/></svg></span>
        <div><b>笔记专用贴纸</b><span>${pl.length} 张 · 只在笔记里贴，文字会绕开它</span></div>
      </div>
      ${bankGridHTML('p', pl, '导入贴纸')}
      ${pl.length ? '' : `<div class="stk-hint">笔记专用的贴纸放这儿。聊天里不会出现它们。</div>`}
    </div>`;

    const rows = S.chars.map((ch) => {
      const list = ch.stickers || [];
      return `<div class="stk-wall">
        <div class="stk-owner">
          ${avatarHTML(ch, '')}
          <div><b>${esc(ch.name)}<i class="stk-own-tag">专属</i></b><span>${list.length} 个 · 只有他的聊天里能用</span></div>
        </div>
        <div class="stk-wall-grid">
          ${list.map((s2, i) => `<div class="stk-tile" data-stk-tile="${ch.id}|${i}">
            ${s2.data ? `<img src="${s2.data}" alt="">` : esc(s2.e)}
            <span class="del" data-stk-del="${ch.id}|${i}">✕</span>
          </div>`).join('')}
          <button class="stk-add" data-action="upload-sticker" data-char="${ch.id}">
            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            <span>上传</span>
          </button>
        </div>
      </div>`;
    }).join('');

    const head = `<div class="navbar" style="border-bottom:none">
        <div style="width:34px"></div>
        <div class="nb-title">表情与贴纸</div>
        <div class="nb-right"></div>
      </div>`;

    return `<div class="${cls} stk-page">
      ${head}
      <div class="list-scroll">
        ${gHTML}
        <div class="stk-sep"><span>角色专属</span></div>
        ${S.chars.length ? `
        <div class="stk-tabs">
          ${S.chars.map((c) => `<button class="chip on" data-jump-stk="${c.id}">
            <span class="mini" style="background:${c.color}">${esc(c.initial)}</span>${esc(c.name)}
          </button>`).join('')}
        </div>
        ${rows}` : `<div class="empty-state" style="padding:22px 24px">
          <div class="es-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.2"/><path d="M8.6 14.2c.9 1.3 2.1 2 3.4 2s2.5-.7 3.4-2"/></svg></div>
          <h4>还没有角色</h4>
          <p>角色专属表情只能给某一个人用。<br>先创建一个人，再为他上传一套。</p>
          <button class="btn solid" data-action="new-char" style="margin-top:14px">创建联系人</button>
        </div>`}
        ${pHTML}
        <div style="padding:8px 20px 34px;text-align:center;font-size:11px;color:var(--ink-3);line-height:1.9">
          通用表情和笔记贴纸谁都能用；<br>角色专属表情只在那个人的聊天里出现。
        </div>
      </div>
    </div>`;
  }

  /* ---------------- 我的 ---------------- */
  function mePage(cls) {
    const st = S.settings;
    return `<div class="${cls} me-page">
      <div class="navbar" style="border-bottom:none;background:transparent">
        <div style="width:34px"></div><div class="nb-title">我的</div><div class="nb-right"></div>
      </div>
      <div class="list-scroll">
        <div class="me-head me-head-edit" style="margin:0" data-action="edit-me">
          ${avatarHTML({ initial: st.me.initial, color: st.me.color || '#93a1a8', avatar: st.me.avatar }, '')}
          <div style="flex:1"><h2>${esc(st.me.name)}</h2><p>这台手机里只住着你和 ${S.chars.length} 个人</p></div>
          <span class="me-edit-ico"><svg viewBox="0 0 24 24"><path d="M4 20h4l10-10-4-4L4 16v4z"/><path d="M14.5 5.5l4 4"/></svg></span>
        </div>

        <div class="sec-title">主动消息</div>
        <div class="set-list">
          <div class="set-row">
            <div class="sr-txt">模拟定时消息<div class="sr-sub">按角色活跃时段，自动"发"一条字卡</div></div>
            <button class="switch ${st.sim ? 'on' : ''}" data-toggle="sim"></button>
          </div>
          <div class="set-row">
            <div class="sr-txt">弹出通知横幅<div class="sr-sub">消息到达时在顶部滑入</div></div>
            <button class="switch ${st.notifications ? 'on' : ''}" data-toggle="notifications"></button>
          </div>
          <div class="set-row">
            <div class="sr-txt">时间加速<div class="sr-sub">让"几小时"在几秒内发生</div></div>
            <div class="seg" data-seg="speed">
              ${[1, 12, 60, 240].map((v) => `<button class="${st.speed === v ? 'on' : ''}" data-speed="${v}">${v}×</button>`).join('')}
            </div>
          </div>
        </div>

        <div class="sec-title">回复方式</div>
        <div class="set-list">
          <div class="set-row">
            <div class="sr-txt">字卡自动回复<div class="sr-sub">你发消息后，从角色的字卡池里抽一句回你</div></div>
            <button class="switch ${st.autoReply ? 'on' : ''}" data-toggle="autoReply"></button>
          </div>
          <div class="set-row">
            <div class="sr-txt">AI 生成回复<div class="sr-sub">关闭时全部使用字卡，零成本</div></div>
            <button class="switch ${st.ai.enabled ? 'on' : ''}" data-toggle="ai"></button>
          </div>
          <div class="set-row" data-action="ai-config" style="cursor:pointer">
            <div class="sr-txt">AI 接口配置<div class="sr-sub">${st.ai.enabled ? esc(st.ai.model) : '未启用'}</div></div>
            <span class="sr-val">›</span>
          </div>
        </div>


        <div class="sec-title">他说的话</div>
        <div class="set-list">
          <div class="set-row" data-action="open-cards" style="cursor:pointer">
            <div class="sr-txt">字卡库<div class="sr-sub">通用 ${(S.cards || []).length} 条（不分场合） · 特殊 ${S.chars.reduce((a, c) => a + (c.pool || []).length + (c.reply || []).length + (c.cmt || []).length + (c.anno || []).length + (c.rel === 'lover' ? (c.love || []).length : 0), 0)} 条</div></div>
            <span class="sr-val">›</span>
          </div>
        </div>

        <div class="sec-title">收藏</div>
        <div class="set-list">
          <div class="set-row" data-action="open-stickers" style="cursor:pointer">
            <div class="sr-txt">表情与贴纸<div class="sr-sub">通用 ${(S.gstickers || []).length} · 专属 ${S.chars.reduce((a, c) => a + (c.stickers || []).length, 0)} · 笔记贴纸 ${(S.pstickers || []).length}</div></div>
            <span class="sr-val">›</span>
          </div>
        </div>

        <div class="sec-title">联系人</div>
        <div class="set-list">
          <div class="set-row" data-action="new-char" style="cursor:pointer">
            <div class="sr-txt">新增联系人<div class="sr-sub">当前 ${S.chars.length} 位</div></div>
            <span class="sr-val">›</span>
          </div>
          <div class="set-row" data-action="go-manage" style="cursor:pointer">
            <div class="sr-txt">管理联系人<div class="sr-sub">移除联系人及其全部记录</div></div>
            <span class="sr-val">›</span>
          </div>
        </div>

        <div class="sec-title">批注与回响</div>
        <div class="set-list">
          <div class="set-row">
            <div class="sr-txt">可见笔记会收到批注</div>
            <button class="switch ${st.annoPref.onNote ? 'on' : ''}" data-toggle="onNote"></button>
          </div>
          <div class="set-row">
            <div class="sr-txt">动态会有角色评论</div>
            <button class="switch ${st.annoPref.onMoment ? 'on' : ''}" data-toggle="onMoment"></button>
          </div>
        </div>

        <div class="sec-title">数据</div>
        <div class="set-list">
          <div class="set-row" data-action="export" style="cursor:pointer">
            <div class="sr-txt">导出全部数据<div class="sr-sub">JSON，包含聊天、动态、笔记</div></div>
            <span class="sr-val">›</span>
          </div>
          <div class="set-row" data-action="install-app" style="cursor:pointer" id="installRow" hidden>
            <div class="sr-txt">安装到手机桌面<div class="sr-sub">像 App 一样全屏打开，可离线使用</div></div>
            <span class="sr-val">›</span>
          </div>
          <div class="set-row" data-action="reset-demo" style="cursor:pointer">
            <div class="sr-txt" style="color:var(--red)">重置为初始状态</div>
            <span class="sr-val">›</span>
          </div>
        </div>
        <div style="padding:22px 20px 30px;text-align:center;font-size:11px;color:var(--ink-3);line-height:1.9">
          Mini@ᯇᴗᯇ v0.1<br>数据只存在这台设备上，不联网、不上传、不做统计
        </div>
      </div>
    </div>`;
  }

  /* ---------------- 渲染后 ---------------- */
  let quoteTarget = null;

  function afterRender() {
    const sc = $('#chatScroll');
    if (sc) sc.scrollTop = sc.scrollHeight;

    const input = $('#ciInput');
    if (input) {
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(90, input.scrollHeight) + 'px';
        const b = $('#ciSend');
        if (b) b.disabled = !input.value.trim();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
      });
      const b = $('#ciSend');
      if (b) b.disabled = true;
    }
    if (quoteTarget) {
      const bar = $('#quoteBar');
      if (bar) { bar.style.display = 'flex'; bar.querySelector('span').textContent = quoteTarget.name + '：' + quoteTarget.text; }
    }
    // 游戏创建页：字段实时写回草稿
    if (view.tab === 'game' && view.sub === 'create' && gameDraft) {
      $$('[data-cast-field]').forEach((el) => {
        el.addEventListener('input', () => {
          const i = +el.dataset.ci;
          if (gameDraft.cast[i]) gameDraft.cast[i][el.dataset.castField] = el.value;
        });
      });
      const gn = $('#gName'); if (gn) gn.addEventListener('input', () => { gameDraft.name = gn.value; });
      const gs = $('#gSetting'); if (gs) gs.addEventListener('input', () => { gameDraft.setting = gs.value; });
    }

    // 扮演页：输入框自动高度 + 回车发送
    const pi = $('#playInput');
    if (pi) {
      pi.addEventListener('input', () => {
        pi.style.height = 'auto';
        pi.style.height = Math.min(88, pi.scrollHeight) + 'px';
      });
      pi.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPlayLine(pi.dataset.game); }
      });
    }
    const ni = $('#narrInput');
    if (ni) ni.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); sendNarration(view.id); }
    });
    if (view.tab === 'game' && view.sub === 'play') {
      const sc = $('#playScroll'); if (sc) sc.scrollTop = sc.scrollHeight;
    }

    const ti = $('#todoInput');
    if (ti) ti.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTodo(); } });
    const im = $('#imInput');
    if (im) im.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const cid = im.closest('[data-char]') ? null : view.id; addImpression(view.id); }
    });
  }

  /* ---------------- 事件 ---------------- */
  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'cardOwnerSel') { cardOwner = e.target.value; render(''); }
  });

  // 笔记搜索输入
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'noteSearchInput') {
      noteQuery = e.target.value;
      const main = $('.notes-main-head');
      if (main) {
        // 只刷新右侧列表，避免输入框失焦
        const cat = noteCats().find((c) => c.key === noteCat) || noteCats()[0];
        const q = noteQuery.trim().toLowerCase();
        const list = S.notes.filter(cat.match)
          .filter((n) => !q || (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));
        const titleEl = $('.nm-title', main), cntEl = $('.nm-count', main), scEl = $('.notes-main .list-scroll');
        if (titleEl) titleEl.textContent = q ? `搜索「${noteQuery.trim()}」` : cat.label;
        if (cntEl) cntEl.textContent = `${list.length} 篇`;
        if (scEl) {
          scEl.innerHTML = list.map((n) => {
            const annoN = (n.annos || []).length;
            return `<div class="note-mini" data-note="${n.id}">
              <div class="nm-top"><span class="nm-kind">${esc(kindLabel(n.kind))}</span><span class="nm-time">${relTime(n.updated)}</span></div>
              <h4>${esc(n.title)}</h4><p>${esc(n.content)}</p>
              <div class="nm-foot"><span>${(n.content || '').length} 字</span>${annoN ? `<span>💬 ${annoN}</span>` : ''}</div>
            </div>`;
          }).join('') || `<div class="empty-state" style="padding:44px 18px"><h4>没有匹配的笔记</h4><p>换个关键词试试。</p></div>`;
        }
      }
    }
  });

  document.addEventListener('click', (e) => {
    const t = e.target;

    // 底部 tab
    const tab = t.closest('.tab');
    if (tab) { setTab(tab.dataset.tab); return; }

    // 左侧提示跳转
    const jl = t.closest('[data-jump]');
    if (jl) { setTab(jl.dataset.jump); if (jl.dataset.jump === 'notes' || jl.dataset.jump === 'chat') window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    // 表情 tab 内跳
    const js = t.closest('[data-jump-stk]');
    if (js) {
      const wall = $(`[data-stk-tile^="${js.dataset.jumpStk}"]`);
      if (wall) wall.closest('.stk-wall').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // 角色档案入口（头像 / 名字）
    const pf = t.closest('[data-profile]');
    if (pf) { openProfile(pf.dataset.profile); return; }

    // 笔记左侧分类
    const catEl = t.closest('[data-cat]');
    if (catEl && !t.closest('[data-del-kind]')) { noteCat = catEl.dataset.cat; render(''); return; }
    // 删除自定义类型
    const dk = t.closest('[data-del-kind]');
    if (dk) { e.stopPropagation(); delKind(dk.dataset.delKind); return; }
    // 导入图片：选放在哪儿 / 中间怎么放 / 排法 / 段落
    const imMode = t.closest('#insModes button');
    if (imMode) {
      insMode = imMode.dataset.m === 'end' ? 'end' : (insMode === 'end' ? 'inline' : insMode);
      $$('#insModes button').forEach((b) => b.classList.toggle('on', b === (imMode.dataset.m === 'end'
        ? imMode : document.querySelector('#insModes [data-m="inline"]'))));
      const mid = $('#insMid'), endNote = $('#insEndNote');
      if (mid) mid.style.display = imMode.dataset.m === 'end' ? 'none' : 'block';
      if (endNote) endNote.style.display = imMode.dataset.m === 'end' ? 'block' : 'none';
      syncInsBoxes();
      return;
    }
    const imKind = t.closest('#insKinds button');
    if (imKind) {
      insMode = imKind.dataset.k;   // inline | float
      $$('#insKinds button').forEach((b) => b.classList.toggle('on', b === imKind));
      syncInsBoxes();
      return;
    }
    const imFlow = t.closest('#insFlow button');
    if (imFlow) {
      insFlow = imFlow.dataset.v;
      $$('#insFlow button').forEach((b) => b.classList.toggle('on', b === imFlow));
      return;
    }
    const imSide = t.closest('#insFloatSide button');
    if (imSide) {
      insPickSide = imSide.dataset.v;
      $$('#insFloatSide button').forEach((b) => b.classList.toggle('on', b === imSide));
      return;
    }
    // 贴纸库：删除 / 选贴纸 / 靠左靠右
    const nd = t.closest('[data-nstk-del]');
    if (nd) {
      e.stopPropagation();
      const [w, i] = String(nd.dataset.nstkDel).split(':');
      delNstk(w, +i); return;
    }
    const sp2 = t.closest('[data-stickimg]');
    if (sp2) {
      stickPickImg = +sp2.dataset.stickimg;
      $$('[data-stickimg]').forEach((b) => b.classList.toggle('on', b === sp2));
      return;
    }
    const ss = t.closest('#stickFlow button');
    if (ss) {
      stickFlow = ss.dataset.v;
      $$('#stickFlow button').forEach((b) => b.classList.toggle('on', b === ss));
      return;
    }
    const esf = t.closest('#editSkFlow button');
    if (esf) {
      stickFlow = esf.dataset.v;
      $$('#editSkFlow button').forEach((b) => b.classList.toggle('on', b === esf));
      return;
    }
    // 笔记里的贴纸：点一下调整位置（跟插图同一套设置）
    const skd = t.closest('[data-sk-edit]');
    if (skd) { e.stopPropagation(); editStickDialog(skd.dataset.note, skd.dataset.skEdit); return; }
    // 笔记里的插图：点一下调整位置
    const ind = t.closest('[data-ins-edit]');
    if (ind) { e.stopPropagation(); editInsetDialog(ind.dataset.note, ind.dataset.insEdit); return; }
    // 留在笔记里的小纸片：点一下询问是否取下（写下后不能改，只能整张取下）
    const rvd = t.closest('[data-rev-del]');
    if (rvd) {
      e.stopPropagation();
      const nid2 = rvd.dataset.note, rid = rvd.dataset.revDel;
      openRawDialog(`
        <h3>取下这张小纸片？</h3>
        <div class="dlg-body"><p style="font-size:12.5px;color:var(--ink-2);line-height:1.9;margin:0">
          它写下之后就不能改了，但可以整张取下。取下就不会再回来了。</p></div>
        <div class="dialog-actions">
          <button class="btn ghost" data-close-dialog>留着</button>
          <button class="btn solid" data-action="rev-del-ok" data-note="${nid2}" data-rev="${rid}">取下</button>
        </div>`);
      return;
    }
    // 笔记图片：删除 / 全屏
    const nid = t.closest('[data-del-ni]');
    if (nid) { e.stopPropagation(); delNoteImg(nid.dataset.note, nid.dataset.delNi); return; }
    const nimg = t.closest('[data-note-img]');
    if (nimg) {
      const pv = document.createElement('div');
      pv.className = 'photo-view';
      pv.innerHTML = `<img src="${nimg.src}" alt="">`;
      pv.onclick = () => pv.remove();
      document.body.appendChild(pv);
      return;
    }

    // 旁白字卡点选
    const np = t.closest('[data-np]');
    if (np) { npSet(np.dataset.np, np.dataset.npw); return; }
    const npa = t.closest('[data-np-add]');
    if (npa) { addNarrWord(npa.dataset.npAdd); return; }
    // 创建页演法切换
    const md = t.closest('[data-mode]');
    if (md) {
      if (gameDraft) { collectDraft(); gameDraft.noAI = md.dataset.mode === 'dream'; render(''); }
      return;
    }
    // 小纸片：选行
    const rl = t.closest('[data-revline]');
    if (rl) {
      revLine = +rl.dataset.revline;
      $$('[data-revline]').forEach((b) => b.classList.toggle('on', b === rl));
      return;
    }

    // 档案内三个栏目
    const pft = t.closest('[data-pftab]');
    if (pft) { pfTab = pft.dataset.pftab; render(''); return; }
    // 点心动时刻的图片 → 全屏看
    const hmImg = e.target.closest('[data-hm-img]');
    if (hmImg) {
      const pv = document.createElement('div');
      pv.className = 'photo-view';
      pv.innerHTML = `<img src="${hmImg.src}" alt="">`;
      pv.onclick = () => pv.remove();
      document.body.appendChild(pv);
      return;
    }
    const ct = e.target.closest('[data-cardtab]');
    if (ct) { cardTab = ct.dataset.cardtab; render(''); return; }
    const mc = e.target.closest('[data-mecolor]');
    if (mc) {
      S.settings.me.color = mc.dataset.mecolor;
      $$('[data-mecolor]').forEach((b) => b.classList.toggle('on', b === mc));
      const av = $('#myAv');
      if (av && !S.settings.me.avatar) av.style.background = mc.dataset.mecolor;
      save(); return;
    }
    const dc = e.target.closest('[data-delcard]');
    if (dc) {
      S.cards.splice(+dc.dataset.delcard, 1);
      save(); render(''); toast('已删除'); return;
    }
    const doDel = e.target.closest('[data-delown]');
    if (doDel) {
      const ch = charOf(cardOwner);
      if (ch) { ch[doDel.dataset.delown].splice(+doDel.dataset.idx, 1); save(); render(''); toast('已删除'); }
      return;
    }

    // 待办
    const tg = t.closest('[data-toggle-todo]');
    if (tg) { toggleTodo(tg.dataset.toggleTodo); return; }
    const dt = t.closest('[data-del-todo]');
    if (dt) { e.stopPropagation(); delTodo(dt.dataset.delTodo); return; }
    const qd = t.closest('[data-quick-due]');
    if (qd) {
      quickDue = +qd.dataset.quickDue;
      $$('[data-quick-due]').forEach((b) => b.classList.toggle('on', b === qd));
      return;
    }
    // 待办提醒人选择
    const wh = t.closest('[data-who]');
    if (wh) {
      todoWho = wh.dataset.who;
      $$('[data-who]').forEach((b) => b.classList.toggle('on', b === wh));
      return;
    }
    // 弹窗内按钮（日历标注/待办等）
    const cd2 = t.closest('[data-close-dialog]');
    if (cd2) { closeDialog(); return; }
    const seg2 = t.closest('#mkRepeat button, #tdWho button');
    if (seg2) {
      const wrap = seg2.parentElement;
      $$('button', wrap).forEach((b) => b.classList.toggle('on', b === seg2));
      if (wrap.id === 'mkRepeat') mkRepeat = seg2.dataset.v;
      if (wrap.id === 'tdWho') tdWho = seg2.dataset.v;
      return;
    }
    // 日历翻月
    const cn = t.closest('[data-cal-nav]');
    if (cn) {
      calM += +cn.dataset.calNav;
      if (calM < 0) { calM = 11; calY--; }
      if (calM > 11) { calM = 0; calY++; }
      render('');
      return;
    }
    // 日历选日期
    const dcc = t.closest('.cal-cell[data-day]');
    if (dcc) { calSel = calSel === dcc.dataset.day ? null : dcc.dataset.day; render(''); return; }
    // 特别标注删除
    const dmk = t.closest('[data-del-mark]');
    if (dmk) {
      S.marks = (S.marks || []).filter((m) => m.id !== dmk.dataset.delMark);
      save(); render(''); toast('已去掉标注');
      return;
    }

    // 游戏创建页：指定扮演者
    const ow = t.closest('[data-cast-owner]');
    if (ow) {
      collectDraft();
      const c = gameDraft.cast[+ow.dataset.ci];
      let hadFocusVal = {};
      // 先把当前输入存进草稿
      $$('[data-cast-field]').forEach((el) => {
        const i = +el.dataset.ci;
        if (gameDraft.cast[i]) gameDraft.cast[i][el.dataset.castField] = el.value;
      });
      c.charId = ow.dataset.castOwner || '';
      if (c.charId) {
        const ch = charOf(c.charId);
        if (ch) {
          if (!c.name) c.name = ch.name;
          if (!c.persona) c.persona = ch.persona;
        }
      }
      render('');
      return;
    }
    const cd = t.closest('[data-cast-del]');
    if (cd) {
      collectDraft();
      $$('[data-cast-field]').forEach((el) => {
        const i = +el.dataset.ci;
        if (gameDraft.cast[i]) gameDraft.cast[i][el.dataset.castField] = el.value;
      });
      gameDraft.cast = gameDraft.cast.filter((c) => c.key !== cd.dataset.castDel);
      render('');
      return;
    }
    const gc = t.closest('.game-card[data-game]');
    if (gc && !t.closest('[data-action]')) {
      view = { tab: 'game', sub: 'play', id: gc.dataset.game };
      render('enter');
      return;
    }

    // 移除联系人
    const rc = t.closest('[data-remove-char]');
    if (rc) { e.stopPropagation(); confirmRemoveChar(rc.dataset.removeChar); return; }

    // 打开聊天
    const ci = t.closest('[data-chat]');
    if (ci) { openChat(ci.dataset.chat); return; }

    // 打开笔记
    const nc = t.closest('[data-note]:not([data-action])');
    if (nc) { openNote(nc.dataset.note); return; }

    // 动作（弹层内的事件由弹层自己处理，避免重复触发）
    const act = t.closest('[data-action]');
    if (act && !t.closest('#sheet') && !t.closest('#dialog')) { handleAction(act, e); return; }

    // 引号条关闭
    if (t.closest('#quoteBar .icon-btn')) { quoteTarget = null; const b = $('#quoteBar'); if (b) b.style.display = 'none'; return; }

    // 长按菜单关闭
    const cm = $('#ctxMenu');
    if (cm && !t.closest('#ctxMenu')) cm.remove();

    // 表情选择
    const stkCell = t.closest('[data-stk]');
    if (stkCell) { sendSticker(stkCell.dataset.stk); return; }

    // 表情删除
    const del = t.closest('[data-stk-del]');
    if (del) { e.stopPropagation(); delSticker(del.dataset.stkDel); return; }

    // 开关
    const sw = t.closest('[data-toggle]');
    if (sw) { toggleSetting(sw.dataset.toggle); return; }
    const seg = t.closest('[data-speed]');
    if (seg) { S.settings.speed = +seg.dataset.speed; save(); render(); toast('时间流速 ' + seg.dataset.speed + '×'); return; }
  });

  function handleAction(el, e) {
    const a = el.dataset.action;
    switch (a) {
      case 'back': backToList(); break;
      case 'send': doSend(); break;
      case 'toggle-sticker': renderStickerPanel(el.dataset.char); break;
      case 'clear-quote': quoteTarget = null; { const b = $('#quoteBar'); if (b) b.style.display = 'none'; } break;
      case 'pick-image': pickImage(); break;
      case 'chat-more': chatMoreSheet(el.dataset.char); break;
      case 'new-post': newPostDialog(); break;
      case 'like-post': toggleLike(el.dataset.post); break;
      case 'focus-cmt': { const i = $(`[data-cmtinput="${el.dataset.post}"]`); if (i) i.focus(); break; }
      case 'send-cmt': sendComment(el.dataset.post); break;
      case 'new-note': newNoteDialog(); break;
      case 'note-more': noteMoreSheet(el.dataset.note); break;
      case 'toggle-visible': toggleNoteVisible(el.dataset.note); break;
      case 'nudge-anno': nudgeAnno(el.dataset.note); break;
      case 'upload-sticker': uploadSticker(el.dataset.char); break;
      case 'new-char': newCharDialog(); break;
      case 'ai-config': aiConfigDialog(); break;
      case 'change-avatar': pickAvatar(el.dataset.cid); break;
      case 'edit-status': statusSheet(el.dataset.char); break;
      case 'profile-more': profileMoreSheet(el.dataset.char); break;
      case 'open-chat-from-profile': openChat(el.dataset.char); break;
      case 'add-impression': addImpression(el.dataset.char); break;
      case 'del-impression': delImpression(el.dataset.char, el.dataset.im); break;
      case 'pick-heart': openHeartPicker(el.dataset.char); break;
      case 'del-heart': delHeart(el.dataset.char, el.dataset.hm); break;
      case 'why-heart': whyHeart(el.dataset.char, el.dataset.hm); break;
      case 'heart-add-img': heartAddImages(el.dataset.char, el.dataset.hm || null); break;
      case 'edit-met': editMetDialog(el.dataset.char); break;
      case 'open-todo': view = { tab: 'todo', sub: 'detail', id: null }; render('enter'); break;
      case 'open-calendar': view = { tab: 'calendar', sub: null, id: null }; render('enter'); break;
      case 'toggle-note-search':
        noteSearchOpen = !noteSearchOpen; noteQuery = '';
        render(''); if (noteSearchOpen) { const i = $('#noteSearchInput'); if (i) i.focus(); }
        break;
      case 'cal-add-mark': calAddMark(); break;
      case 'new-kind': newKindDialog(); break;
      case 'add-rev': addRevDialog(el.dataset.note); break;
      case 'edit-note': editNoteDialog(el.dataset.note); break;
      case 'rev-ask': addRevDialog(el.dataset.note); break;
      case 'rev-skip':
        S.revArmed = null; save();
        openNoteEditor(el.dataset.note);
        break;
      case 'rev-save': saveRev(el.dataset.note); break;
      case 'rev-del-ok': {
        const n = S.notes.find((x) => x.id === el.dataset.note);
        if (n && Array.isArray(n.revs)) {
          n.revs = n.revs.filter((r) => r.id !== el.dataset.rev);
          save(); toast('已经取下了');
        }
        closeDialog(); render('');
        break;
      }      case 'nk-save': saveNewKind(); break;
      case 'change-note-kind': changeNoteKind(el.dataset.note); break;
      case 'nb-kind-save': {
        const n = S.notes.find((x) => x.id === el.dataset.note);
        const picked = $('#nkPick button.on');
        if (n && picked) { n.kind = picked.dataset.v; save(); closeDialog(); render(''); toast('已换成「' + kindLabel(n.kind) + '」'); }
        break;
      }
      case 'cal-add-todo': calAddTodo(el.dataset.day); break;
      case 'mk-save': {
        const dt = ($('#mkDate') || {}).value || '';
        const lb = ($('#mkLabel') || {}).value || '';
        if (!/^\d{2}-\d{2}$/.test(dt)) { toast('日期格式：MM-DD'); break; }
        if (!lb.trim()) { toast('写个名字吧'); break; }
        if (!Array.isArray(S.marks)) S.marks = [];
  if (!S.narr || typeof S.narr !== 'object') S.narr = null;
  if (!Array.isArray(S.nstickers)) S.nstickers = [];
  if (!Array.isArray(S.gstickers)) S.gstickers = [];
  if (!Array.isArray(S.pstickers)) S.pstickers = [];
  if (S.nstickers.length) {
    S.nstickers.forEach((x) => S.gstickers.push(x));
    S.nstickers = [];
  }
  if (!Array.isArray(S.noteKinds) || !S.noteKinds.length) {
    S.noteKinds = [
      { id: 'diary', label: '日记' },
      { id: 'read', label: '读书笔记' },
      { id: 'memo', label: '备忘录' },
    ];
  }
        S.marks.push({ id: uid('mk'), date: dt, label: lb.trim(), repeat: mkRepeat });
        save(); closeDialog(); render('');
        toast(mkRepeat === 'year' ? '每年都会记得' : '这个月会记得');
        break;
      }
      case 'td-save': {
        const day = el.dataset.day;
        const txt = ($('#tdText') || {}).value || '';
        const tm = ($('#tdTime') || {}).value || '';
        if (!txt.trim()) { toast('写点什么吧'); break; }
        const [y, mo, dd] = day.split('-').map(Number);
        const due = tm ? new Date(y, mo - 1, dd, ...tm.split(':').map(Number)).getTime() : new Date(y, mo - 1, dd, 9).getTime();
        const td = {
          id: uid('td'), text: txt.trim(), done: false,
          due, remindAt: due, remindBy: tdWho, remindedBy: null, createdAt: appClock(),
        };
        S.todos.push(td); save(); closeDialog(); render('');
        const w = tdWho !== 'random' && charOf(tdWho);
        toast(w ? `${w.name} 会记着这件事` : '已添加，到点会有人来找你');
        break;
      }
      case 'open-stickers': setTab('stickers'); break;
      case 'open-cards': view = { tab: 'cards', sub: null, id: null }; render('enter'); break;
      case 'open-nstickers': view = { tab: 'stickers', sub: null, id: null }; render('enter'); break;
      case 'goto-nstickers': closeDialog(); view = { tab: 'stickers', sub: null, id: null }; render('enter'); break;
      case 'nstk-upload': nstkUpload(el.dataset.which || 'g'); break;
      case 'note-add-img': noteAddImages(el.dataset.note); break;
      case 'ins-go': insPickFiles(el.dataset.note, insMode === 'float' ? 1 : (insMode === 'end' ? 9 : 4)); break;
      case 'ins-save-pos': saveInsetPos(el.dataset.note, el.dataset.ins); break;
      case 'ins-remove': closeDialog(); delInset(el.dataset.note, el.dataset.ins); break;
      case 'note-add-stick': noteStickDialog(el.dataset.note); break;
      case 'stick-save': saveStick(el.dataset.note); break;
      case 'sk-save-pos': saveStickPos(el.dataset.note, el.dataset.sk); break;
      case 'sk-remove': delStick(el.dataset.note, el.dataset.sk); break;
      case 'back-to-me': view = { tab: 'me', sub: null, id: null }; render('enter-back'); break;
      case 'edit-me': editMyProfile(); break;
      case 'add-card': addCardDialog(); break;
      case 'toggle-todo-remind':
        S.settings.todoRemind = !S.settings.todoRemind;
        save(); render(''); toast(S.settings.todoRemind ? '他们会来叫你' : '已关闭提醒');
        break;
      case 'me-pickimg': {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => {
          const f = inp.files && inp.files[0];
          if (!f) return;
          shrinkImage(f, 240, (data) => {
            S.settings.me.avatar = data;
            const av = $('#myAv');
            if (av) { av.style.background = '#e7ebed'; av.innerHTML = `<img src="${data}" alt="">`; }
            save(); toast('头像已换');
          });
        };
        inp.click();
        break;
      }
      case 'me-clearimg':
        S.settings.me.avatar = null;
        { const av = $('#myAv'); if (av) { av.style.background = S.settings.me.color || '#93a1a8'; av.textContent = S.settings.me.initial || '我'; } }
        save(); toast('已改用文字头像');
        break;
      case 'new-game': newDraft(); break;
      case 'add-cast': collectDraft(); gameDraft.cast.push({ key: uid('cs'), charId: '', role: '', persona: '' }); render(''); break;
      case 'create-game': createGame(); break;
      case 'continue-play': advancePlay(el.dataset.game); break;
      case 'end-play': endPlay(el.dataset.game); break;
      case 'resume-play': {
        const g = (S.games || []).find((x) => x.id === el.dataset.game);
        if (g) { g.status = 'live'; g.lines.push({ id: uid('ln'), type: 'sys', text: '—— 戏重新开始了。', ts: appClock() }); save(); render(''); setTimeout(() => advancePlay(g.id), 600); }
        break;
      }
      case 'play-send': sendPlayLine(el.dataset.game); break;
      case 'toggle-narr': narrOpen = !narrOpen; render(''); break;
      case 'group-cover': groupCoverSheet(el.dataset.game); break;
      case 'gc-pick': pickGroupCover(el.dataset.game); break;
      case 'gc-clear': clearGroupCover(el.dataset.game); break;
      case 'np-send': sendPickedNarr(view.id); break;
      case 'np-clear': narrPick = { who: '', where: '', act: '', then: '' }; render(''); break;
      case 'dream-say': dreamSpeak(el.dataset.game); break;
      case 'play-narr': sendNarration(el.dataset.game); break;
      case 'play-narr-prompt': {
        const t = prompt('写一段旁白（第三人称）');
        if (t) pushPlayLine(el.dataset.game, { type: 'narr', text: t });
        break;
      }
      case 'play-more': playMoreSheet(el.dataset.game); break;
      case 'edit-game': editGameSheet(el.dataset.game); break;
      case 'add-todo': addTodo(); break;
      case 'todo-more': todoMoreSheet(); break;
      case 'test-remind': {
        const td = (S.todos || []).find((t) => !t.done);
        if (!td) { toast('没有未完成的待办'); break; }
        const ch = remindByChar(td, true);
        if (ch) { toast(ch.name + ' 已经在聊天里提醒你了'); if (curTab === 'chat') render(''); }
        break;
      }
      case 'toggle-manage': charManageMode = true; render(''); break;
      case 'go-manage': charManageMode = true; setTab('chat'); render('enter'); break;
      case 'exit-manage': charManageMode = false; render(''); break;
      case 'export': exportData(); break;
      case 'reset-demo': confirmReset(); break;
      case 'install-app': doInstall(); break;
    }
  }

  /* ---------------- 发送 ---------------- */
  function doSend() {
    const input = $('#ciInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const charId = input.dataset.char;
    pushMessage(charId, { from: 'me', type: 'text', text, quote: quoteTarget });
    quoteTarget = null;
    input.value = '';
    input.style.height = 'auto';
    input.dispatchEvent(new Event('input'));
    save();
    reopenChat(charId);
    scheduleReply(charId);
  }

  function sendSticker(key) {
    // key: "g||3"（通用表情） 或 "own|charId|3"（角色专属）
    const [bank, charId0, idx] = key.split('|');
    const charId = view.id || charId0;
    let s = null;
    if (bank === 'g') s = (S.gstickers || [])[+idx];
    else { const ch = charOf(charId0 || charId); s = ch && (ch.stickers || [])[+idx]; }
    if (!s) return;
    pushMessage(charId, { from: 'me', type: 'sticker', text: s.data || s.e });
    save();
    reopenChat(charId);
    const p = $('#stickerPanel'); if (p) p.classList.remove('open');
  }

  function pickImage() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const charId = view.id;
        pushMessage(charId, { from: 'me', type: 'image', text: r.result });
        save(); reopenChat(charId);
        toast('图片已发送');
      };
      r.readAsDataURL(f);
    };
    inp.click();
  }

  function pushMessage(charId, msg) {
    let chat = chatOf(charId);
    if (!chat) { chat = { id: uid('mt'), charId, unread: 0, messages: [] }; S.chats.push(chat); }
    chat.messages.push(Object.assign({ id: uid('m'), ts: appClock() }, msg));
  }

  function reopenChat(charId) {
    if (view.sub === 'detail' && view.id === charId) {
      const sc = $('#chatScroll');
      const keep = sc ? sc.scrollTop : 0;
      render('');
      const sc2 = $('#chatScroll');
      if (sc2) sc2.scrollTop = sc2.scrollHeight;
      updateTabs();
    } else {
      updateBadges();
    }
  }

  /* ---------------- 角色回复 ---------------- */
  function scheduleReply(charId) {
    const st = S.settings;
    if (!st.autoReply) return;
    const ch = charOf(charId);
    // 读取状态
    if (st.readReceipt) {
      const chat = chatOf(charId);
      const lastMine = chat.messages.filter((m) => m.from === 'me').slice(-1)[0];
      if (lastMine) {
        setTimeout(() => {
          lastMine.read = true;
          if (view.sub === 'detail' && view.id === charId) render('');
        }, 900 + Math.random() * 700);
      }
    }
    const delay = st.ai.enabled ? 1800 : 1200 + Math.random() * 1800;
    setTimeout(() => {
      replyOnce(charId, 'chat');
    }, delay);
  }

  async function replyOnce(charId, ctx, extra) {
    const ch = charOf(charId);
    const chat = chatOf(charId);
    if (!chat) return;
    let text = null;
    if (S.settings.ai.enabled) {
      try { text = await aiGenerate(ch, ctx, extra); } catch (err) { /* 降级 */ }
    }
    if (!text) text = pick(cardsFor(ch, 'reply').length ? cardsFor(ch, 'reply') : (cardsFor(ch, 'pool').length ? cardsFor(ch, 'pool') : ['嗯。']));

    const m = { id: uid('m'), from: 'char', type: 'text', text, ts: appClock() };
    const atBottom = isNearBottom();
    chat.messages.push(m);

    const viewing = view.sub === 'detail' && view.id === charId && curTab === 'chat';
    if (viewing) {
      render('');
      if (atBottom) { const sc = $('#chatScroll'); if (sc) sc.scrollTop = sc.scrollHeight; }
    } else {
      chat.unread = (chat.unread || 0) + 1;
      updateBadges();
      if (S.settings.notifications) showBanner(ch, text, 'chat', charId);
      notifySystem(ch.name, text, 'chat-' + charId);
    }
    save();
  }

  function isNearBottom() {
    const sc = $('#chatScroll');
    if (!sc) return true;
    return sc.scrollHeight - sc.scrollTop - sc.clientHeight < 90;
  }

  /* ---------------- AI ---------------- */
  async function aiGenerate(ch, ctx, extra) {
    const st = S.settings.ai;
    if (!st.key) throw new Error('no key');
    let sys = `你是「${ch.name}」。人设：${ch.persona}\n说话风格：只用短句，口语，不要旁白，不要动作描写，不要加引号和"我："这样的前缀。用简体中文。`;
    if (ctx === 'chat') sys += '\n你正在和用户私聊，回复 1 句，不超过 30 字。';
    if (ctx === 'moment') sys += '\n你看到了用户的动态，写一条评论，不超过 25 字。';
    if (ctx === 'anno') sys += '\n你在用户写的笔记下面留一条批注，不超过 40 字，可以指出问题也可以感慨。';
    const chat = chatOf(ch.id);
    const hist = chat ? chat.messages.filter((m) => m.type === 'text').slice(-8)
      .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text })) : [];
    let userMsg = extra || '（继续聊）';
    if (ctx !== 'chat') userMsg = extra;

    const body = {
      model: st.model || 'deepseek-chat',
      messages: [{ role: 'system', content: sys }, ...hist, { role: 'user', content: userMsg }],
      temperature: 0.95, max_tokens: 80,
    };
    const r = await fetch(st.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + st.key },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error('http ' + r.status);
    const j = await r.json();
    const txt = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!txt) throw new Error('empty');
    return txt.trim().replace(/^["'“”]|["'“”]$/g, '');
  }

  /* ---------------- 动态交互 ---------------- */
  function newPostDialog() {
    openDialog({
      title: '发布动态',
      desc: '这条会同时出现在所有联系人的"朋友圈"里。',
      fields: [
        { key: 'text', type: 'textarea', label: '内容', rows: 4, placeholder: '今天想说的…' },
        { key: 'img', type: 'file', label: '配图（可选）' },
        { key: 'private', type: 'vis', label: '可见范围' },
      ],
      ok: '发布',
      onOk: (v) => {
        const p = {
          id: uid('mo'), text: v.text || ' ', images: v.img ? [v.img] : [], private: !!v.private,
          ts: appClock(), likes: [], comments: [],
        };
        S.moments.push(p); save(); render('enter');
        toast('已发布');
        if (S.settings.annoPref.onMoment) simulatePostActivity(p.id);
      },
    });
  }

  function toggleLike(postId) {
    const p = S.moments.find((x) => x.id === postId);
    if (!p) return;
    if (!S.chars.length) { toast('先创建一个联系人，他才会来点赞'); return; }
    const ch = S.chars[Math.floor(Math.random() * S.chars.length)];
    if (!p.likes) p.likes = [];
    if (p.likes.includes(ch.id)) p.likes = p.likes.filter((i) => i !== ch.id);
    else p.likes.push(ch.id);
    save(); render();
  }

  function sendComment(postId) {
    const inp = $(`[data-cmtinput="${postId}"]`);
    if (!inp || !inp.value.trim()) return;
    const p = S.moments.find((x) => x.id === postId);
    p.comments = p.comments || [];
    p.comments.push({ id: uid('c'), charId: 'me', text: inp.value.trim(), ts: appClock(), byMe: true });
    inp.value = '';
    save(); render();
    // 角色回应
    if (S.settings.annoPref.onMoment) {
      const pool = S.chars.filter((c) => !p.private || S.chars.indexOf(c) < 2);
      if (!pool.length) return;
      const ch = pick(pool);
      setTimeout(() => {
        p.comments.push({ id: uid('c'), charId: ch.id, text: pick(cardsFor(ch, 'cmt').length ? cardsFor(ch, 'cmt') : ['嗯。']), ts: appClock(), replyTo: '你' });
        save();
        if (view.tab === 'moments') render();
        else S.unreadMoments = (S.unreadMoments || 0) + 1, updateBadges();
      }, 1400 + Math.random() * 1600);
    }
  }

  function simulatePostActivity(postId) {
    const p = S.moments.find((x) => x.id === postId);
    if (!p) return;
    const pool = p.private ? S.chars.slice(0, 2) : S.chars.slice();
    if (!pool.length) return;
    const ch = pick(pool);
    const pending = $(`[data-pending="${postId}"]`);
    if (pending) {
      pending.style.display = 'flex';
      pending.querySelector('.ptxt').textContent = ch.name + ' 正在输入…';
    }
    const delay = 2200 + Math.random() * 2600;
    setTimeout(() => {
      p.comments = p.comments || [];
      p.comments.push({ id: uid('c'), charId: ch.id, text: pick(cardsFor(ch, 'cmt').length ? cardsFor(ch, 'cmt') : ['嗯。']), ts: appClock() });
      save();
      if (view.tab === 'moments') render();
      else S.unreadMoments = (S.unreadMoments || 0) + 1, updateBadges();
      if (S.settings.notifications) showBanner(ch, '在动态里评论了你', 'moment', null);
    }, delay);
  }

  /* ---------------- 笔记交互 ---------------- */
  function newNoteDialog() {
    const kinds = noteKinds();
    openDialog({
      title: '新建笔记',
      fields: [
        { key: 'kind', type: 'select', label: '类型', options: kinds.length ? kinds.map((k) => [k.id, k.label]) : [['', '（先去左侧加一个类型）']] },
        { key: 'title', type: 'input', label: '标题', placeholder: '给今天起个名字' },
        { key: 'content', type: 'textarea', label: '正文', rows: 6, placeholder: '写吧。' },
        { key: 'visible', type: 'vis', label: '谁能看见' },
      ],
      ok: '保存',
      onOk: (v) => {
        const n = {
          id: uid('nt'), kind: v.kind, title: v.title || '无题', content: v.content || '',
          visible: !!v.visible, chars: v.visible ? S.chars.slice(0, S.chars.length).map((c) => c.id) : [],
          ts: appClock(), updated: appClock(), annos: [],
        };
        S.notes.push(n); save();
        view = { tab: 'notes', sub: 'detail', id: n.id };
        render('enter');
        if (n.visible && S.settings.annoPref.onNote) simulateAnno(n.id);
      },
    });
  }

  /* 自定义笔记类型 */
  function newKindDialog() {
    openRawDialog(`
      <h3>新增类型</h3>
      <div class="dlg-body">
        <div class="dlg-field"><label>叫什么</label>
          <input id="nkLabel" type="text" placeholder="如：随记、灵感、观后感" maxlength="10"></div>
        <p style="font-size:11px;color:var(--ink-3);line-height:1.8;margin:0">
          类型只是你自己给笔记分的类。写的时候选一个，左侧「主题」就多一格。
        </p>
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" data-close-dialog>取消</button>
        <button class="btn solid" data-action="nk-save">保存</button>
      </div>`);
    setTimeout(() => { const i = $('#nkLabel'); if (i) i.focus(); }, 60);
  }

  function saveNewKind() {
    const inp = $('#nkLabel');
    const v = inp && inp.value.trim();
    if (!v) { toast('写个名字吧'); return; }
    const kinds = noteKinds();
    if (kinds.some((k) => k.label === v)) { toast('已经有这个类型了'); return; }
    const id = 'k_' + uid('k');
    kinds.push({ id, label: v });
    noteCat = 'k:' + id;
    save(); closeDialog(); render('');
    toast('已加上「' + v + '」');
  }

  function delKind(id) {
    const kinds = noteKinds();
    const k = kinds.find((x) => x.id === id);
    if (!k) return;
    const used = S.notes.filter((n) => n.kind === id).length;
    openDialog({
      title: '删除类型',
      desc: used ? `「${k.label}」下还有 ${used} 篇笔记。删掉类型后，这些笔记会回到「全部」里，内容不会丢。` : `删掉「${k.label}」这个类型？`,
      ok: '删除',
      danger: true,
      onOk: () => {
        S.noteKinds = kinds.filter((x) => x.id !== id);
        if (noteCat === 'k:' + id) noteCat = 'all';
        save(); render(''); toast('已删除类型');
      },
    });
  }

  /* 改一篇笔记的类型（详情页「…」里） */
  function changeNoteKind(noteId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n) return;
    const kinds = noteKinds();
    openRawDialog(`
      <h3>换一个类型</h3>
      <div class="dlg-body">
        <div class="dlg-field">
          <div class="card-seg wrap" id="nkPick">
            ${kinds.map((k) => `<button data-v="${k.id}" class="${n.kind === k.id ? 'on' : ''}">${esc(k.label)}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" data-close-sheet-btn data-close-dialog>取消</button>
        <button class="btn solid" data-action="nb-kind-save" data-note="${noteId}">保存</button>
      </div>`);
    closeSheet();
  }

  /* 补记（便利贴）：贴在某一行的正下方。
   * 这是一个藏起来的彩蛋——界面上不出现「补记」两个字，也不提示规则。
   * 只有笔记已经 30 天以上没改动、这时又回来编辑，才会轻轻问一句。
   * 写下后不可修改，只能整张取下。 */
  let revLine = 0;
  let revPending = null;   // 本次编辑的笔记 id（补记窗口开着）

  function addRevDialog(noteId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n) return;
    const lines = (n.content || '').split('\n');
    revLine = Math.min(revLine, Math.max(0, lines.length - 1));
    revPending = noteId;
    const list = lines.map((ln, i) => `<button data-revline="${i}" class="${i === revLine ? 'on' : ''}">
        <i>${i + 1}</i><span>${esc((ln || '（空行）').slice(0, 18))}</span></button>`).join('');
    openRawDialog(`
      <h3>给这一行留一句话</h3>
      <div class="dlg-body">
        <div class="dlg-field"><label>放在哪一行下面</label>
          <div class="rev-lines" id="revLines">${list}</div></div>
        <div class="dlg-field"><label>现在的你，想对那时候说什么</label>
          <textarea id="revText" rows="4" placeholder="隔了这么久再看…" style="width:100%;box-sizing:border-box;border-radius:9px;border:.5px solid var(--line);padding:9px 10px;font-size:13px;outline:none;resize:vertical"></textarea></div>
        <p style="font-size:11px;color:var(--ink-3);line-height:1.8;margin:0">
          它不会改掉原文，只会变成一小片纸，留在那一行下面。
        </p>
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" data-close-dialog>下次吧</button>
        <button class="btn solid" data-action="rev-save" data-note="${noteId}">留下</button>
      </div>`);
    setTimeout(() => { const i = $('#revText'); if (i) i.focus(); }, 60);
  }

  function saveRev(noteId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n) return;
    const txt = ($('#revText') || {}).value || '';
    if (!txt.trim()) { toast('还没写呢'); return; }
    if (!Array.isArray(n.revs)) n.revs = [];
    n.revs.push({ id: uid('rv'), line: revLine, text: txt.trim(), ts: appClock() });
    save(); closeDialog(); render('');
    toast('留在那一行下面了');
  }

  /* 打开编辑：如果这篇已经 30 天没动过，轻轻问一句（不点名、不解释） */
  function editNoteDialog(noteId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n) return;
    const REV_GAP = 30 * 864e5;
    const since = appClock() - (n.updated || n.ts || 0);
    if (since >= REV_GAP) {
      // 触发一次：本次会话里对这篇只问一次，避免反复弹
      S.revArmed = noteId;
      save();
      openRawDialog(`
        <h3>隔了 ${Math.floor(since / 864e5)} 天</h3>
        <div class="dlg-body">
          <p style="font-size:12.5px;line-height:1.9;color:var(--ink-2);margin:0 0 4px">
            上一次写这篇，是 ${fullTime(n.updated).slice(0, 10)}。<br>
            要不要先在原来的某一行下面，留一句话给那时候的你？
          </p>
        </div>
        <div class="dialog-actions">
          <button class="btn ghost" data-action="rev-skip" data-note="${noteId}">直接改</button>
          <button class="btn solid" data-action="rev-ask" data-note="${noteId}">留一句</button>
        </div>`);
      return;
    }
    openNoteEditor(noteId);
  }

  function openNoteEditor(noteId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n) return;
    openDialog({
      title: '编辑笔记',
      fields: [
        { key: 'title', type: 'input', label: '标题', value: n.title },
        { key: 'content', type: 'textarea', label: '正文', value: n.content, rows: 8 },
      ],
      ok: '保存',
      onOk: (v) => {
        n.title = v.title;
        n.content = v.content;
        n.updated = appClock();
        save(); render(); toast('已保存');
      },
    });
  }

  function toggleNoteVisible(noteId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n) return;
    if (!n.visible) {
      pickVisibleChars(n, () => {
        n.visible = true;
        n.chars = n._picked || S.chars.map((c) => c.id);
        delete n._picked;
        save(); render();
        toast('已设为「联系人可见」');
        if (S.settings.annoPref.onNote) simulateAnno(n.id);
      });
    } else {
      n.visible = false;
      save(); render();
      toast('改为仅自己可见');
    }
  }

  function pickVisibleChars(n, cb) {
    // 简化为弹一个选择框
    const opts = S.chars.map((c) => `<label style="display:flex;align-items:center;gap:8px;padding:7px 0;font-size:13.5px">
      <input type="checkbox" value="${c.id}" checked style="width:auto"> ${esc(c.name)}</label>`).join('');
    openDialog({
      title: '让谁看见这篇',
      desc: '被选中的联系人会读到它，并可能留下批注。',
      rawHTML: `<div style="max-height:180px;overflow-y:auto">${opts}</div>`,
      ok: '确定',
      onOk: () => {
        const chk = $$('#dialog input[type=checkbox]:checked').map((i) => i.value);
        n._picked = chk;
        cb();
      },
    });
  }

  function simulateAnno(noteId) {
    const n = S.notes.find((x) => x.id === noteId);
    if (!n) return;
    const pool = S.chars.filter((c) => (n.chars || []).includes(c.id));
    if (!pool.length) return;
    let i = 0;
    const step = () => {
      if (i >= Math.min(2, pool.length)) return;
      const ch = pool[i++];
      setTimeout(() => {
        n.annos = n.annos || [];
        n.annos.push({ id: uid('a'), charId: ch.id, text: pick(cardsFor(ch, 'anno').length ? cardsFor(ch, 'anno') : ['看过了。']), ts: appClock(), unread: true });
        n.updated = appClock();
        save();
        if (view.sub === 'detail' && view.id === noteId) render();
        else updateBadges();
        if (S.settings.notifications) {
          showBanner(ch, '在你的笔记里留了一条批注', 'anno', null);
        }
        step();
      }, 2400 + Math.random() * 2000);
    };
    step();
  }

  function nudgeAnno(noteId) {
    const n = S.notes.find((x) => x.id === noteId);
    const pool = S.chars.filter((c) => (n.chars || []).includes(c.id));
    if (!pool.length) { toast('这篇没有可见的联系人'); return; }
    const ch = pick(pool);
    toast(ch.name + ' 正在读…');
    setTimeout(() => {
      n.annos.push({ id: uid('a'), charId: ch.id, text: pick(cardsFor(ch, 'anno').length ? cardsFor(ch, 'anno') : ['看过了。']), ts: appClock(), unread: false });
      save(); render();
    }, 1500);
  }

  /* ---------------- 表情包 ---------------- */
  function uploadSticker(charId) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = () => {
      const files = Array.from(inp.files || []);
      let done = 0;
      files.forEach((f) => {
        const r = new FileReader();
        r.onload = () => {
          const img = new Image();
          img.onload = () => {
            // 压缩到 160px，避免 localStorage 溢出
            const size = 160;
            const cv = document.createElement('canvas');
            const ratio = Math.min(size / img.width, size / img.height);
            cv.width = img.width * ratio; cv.height = img.height * ratio;
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            const ch = charOf(charId);
            ch.stickers.push({ data: cv.toDataURL('image/png') });
            save(); render();
          };
          img.src = r.result;
        };
        r.readAsDataURL(f);
      });
      toast('已上传');
    };
    inp.click();
  }

  function delSticker(key) {
    const [charId, idx] = key.split('|');
    const ch = charOf(charId);
    ch.stickers.splice(+idx, 1);
    save(); render();
  }

  /* ---------------- 移除联系人 ---------------- */
  function confirmRemoveChar(charId) {
    const ch = charOf(charId);
    if (!ch) return;
    const chat = chatOf(charId);
    const msgN = chat ? chat.messages.length : 0;
    openDialog({
      title: '移除 ' + ch.name + '？',
      desc: `他的 ${msgN} 条聊天、${(ch.impressions || []).length} 条印象、${(ch.moments || []).length} 个心动时刻会一起消失，不能撤销。`,
      fields: [{ key: 'confirm', type: 'input', label: '输入他的名字确认', placeholder: ch.name }],
      ok: '移除',
      danger: true,
      onOk: (v) => {
        if ((v.confirm || '').trim() !== ch.name) { toast('名字不对，没有删除'); return; }
        S.chars = S.chars.filter((c) => c.id !== charId);
        S.chats = S.chats.filter((c) => c.charId !== charId);
        S.moments.forEach((p) => {
          p.comments = (p.comments || []).filter((c) => c.charId !== charId);
          p.likes = (p.likes || []).filter((i) => i !== charId);
        });
        S.notes.forEach((n) => {
          n.chars = (n.chars || []).filter((i) => i !== charId);
          n.annos = (n.annos || []).filter((a) => a.charId !== charId);
        });
        (S.todos || []).forEach((t) => { if (t.remindedBy === charId) t.remindedBy = null; });
        save();
        if (S.chars.length === 0) charManageMode = true;
        render('');
        toast('已移除 ' + ch.name);
      },
    });
  }

  /* ---------------- 新建联系人 ---------------- */
  function newCharDialog() {
    const idx = S.chars.length;
    const col = COLORS[idx % COLORS.length][0];
    let draftAvatar = null;
    let draftColor = col;

    openDialog({
      title: '新的联系人',
      desc: '名字、头像、人设、说话方式，全部由你决定。这里没有别人。',
      rawHTML: `
        <label>头像</label>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">
          <div id="ncAvatar" style="width:52px;height:52px;border-radius:16px;background:${col};color:#fff;display:grid;place-items:center;font-size:20px;font-weight:600;overflow:hidden;flex:0 0 52px">?</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="btn ghost sm" id="ncPick">上传图片</button>
            <button class="btn ghost sm" id="ncClear">用文字头像</button>
          </div>
        </div>
        <label>头像底色</label>
        <div id="ncColors" style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:4px">
          ${COLORS.map((c) => `<span data-ncolor="${c[0]}" style="width:24px;height:24px;border-radius:8px;background:${c[0]};display:block;cursor:pointer;outline:${c[0] === col ? '2px solid #5a666d' : 'none'};outline-offset:2px"></span>`).join('')}
        </div>
        <label>名字</label>
        <input data-f="name" id="ncName" placeholder="他的名字">
        <label>关系</label>
        <select data-f="rel" style="width:auto">
          <option value="">未设置</option>
          <option value="friend">朋友</option>
          <option value="lover">恋人</option>
          <option value="kin">亲人</option>
        </select>
        <label>人设（他会是谁、怎么说话、和你什么关系）</label>
        <textarea data-f="persona" rows="3" placeholder="例：话很少，只用句号，凌晨两点最清醒…"></textarea>
        <label>状态</label>
        <div style="display:flex;gap:7px;align-items:center">
          <select data-f="skind" style="width:auto;flex:0 0 96px">
            ${Object.keys(STATUS).map((k) => `<option value="${k}">${STATUS[k].label}</option>`).join('')}
          </select>
          <input data-f="sword" placeholder="状态短语，如：在写东西" style="flex:1">
        </div>
        <label>活跃时段（他到点会自己发消息，如 22-2）</label>
        <input data-f="schedule" value="21-2">
        <label>他知道的、会说的话（一行一句，可不填，之后在「…」里加）</label>
        <textarea data-f="pool" rows="3" placeholder="今天几点睡？&#10;楼下那家店还开着。"></textarea>
      `,
      ok: '创建',
      onOk: (v) => {
        const name = (v.name || '').trim();
        if (!name) { toast('总得有个名字'); return; }
        let start = 21, end = 2;
        const m = /(\d{1,2})\s*-\s*(\d{1,2})/.exec(v.schedule || '');
        if (m) { start = clamp(+m[1], 0, 23); end = clamp(+m[2], 0, 24); }
        const pool = (v.pool || '').split('\n').map((x) => x.trim()).filter(Boolean);

        const ch = {
          id: uid('c'), name, initial: name[0],
          color: draftColor, tag: '', persona: (v.persona || '').trim(),
          rel: REL[v.rel] ? v.rel : '',
          schedule: { start, end, freq: 2 },
          status: { kind: v.skind || 'on', word: (v.sword || '').trim() || (STATUS[v.skind] || STATUS.on).label },
          met: Date.now(),
          pool, reply: [], anno: [], cmt: [], love: [],
          impressions: [], moments: [],
          stickers: [],
        };
        if (draftAvatar) ch.avatar = draftAvatar;

        S.chars.push(ch);
        S.chats.push({ id: uid('mt'), charId: ch.id, unread: 0, messages: [] });
        save();
        charManageMode = false;
        setTab('chat');
        openChat(ch.id);
        toast(pool.length ? '已创建 · 这是我们的「命中注定」' : '已创建 · 去「…」里给他加句话');
      },
    });

    // 头像交互
    setTimeout(() => {
      const av = $('#ncAvatar');
      const nameEl = $('#ncName');
      const syncInit = () => { if (!draftAvatar) av.textContent = nameEl && nameEl.value.trim() ? nameEl.value.trim()[0] : '?'; };
      if (nameEl) nameEl.addEventListener('input', syncInit);

      const pick = $('#ncPick');
      if (pick) pick.onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => {
          const f = inp.files[0]; if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            const img = new Image();
            img.onload = () => {
              const size = 240;
              const cv = document.createElement('canvas');
              const ratio = Math.min(size / img.width, size / img.height);
              cv.width = img.width * ratio; cv.height = img.height * ratio;
              cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
              draftAvatar = cv.toDataURL('image/png');
              av.innerHTML = `<img src="${draftAvatar}" style="width:100%;height:100%;object-fit:cover">`;
            };
            img.src = r.result;
          };
          r.readAsDataURL(f);
        };
        inp.click();
      };
      const clr = $('#ncClear');
      if (clr) clr.onclick = () => { draftAvatar = null; av.innerHTML = ''; syncInit(); };

      $$('[data-ncolor]').forEach((el) => {
        el.onclick = () => {
          draftColor = el.dataset.ncolor;
          av.style.background = draftColor;
          $$('[data-ncolor]').forEach((x) => (x.style.outline = 'none'));
          el.style.outline = '2px solid #5a666d';
          el.style.outlineOffset = '2px';
        };
      });
    }, 30);
  }

  /* ---------------- 头像 ---------------- */
  function pickAvatar(charId) {
    const ch = charOf(charId);
    openDialog({
      title: '更换头像 · ' + ch.name,
      desc: '上传一张图，或留空回到文字头像。图片会被压到 240px 存在本地。',
      fields: [{ key: 'img', type: 'file', label: '头像图片' }],
      ok: '使用这张',
      onOk: (v) => {
        if (!v.img) { toast('没有选择图片'); return; }
        ch.avatar = v.img;
        save(); render(); toast('头像已更换');
      },
      extraBtn: ch.avatar ? { label: '恢复文字头像', fn: () => { delete ch.avatar; save(); closeDialog(); render(); toast('已恢复'); } } : null,
    });
  }

  /* ---------------- 状态 ---------------- */
  function statusSheet(charId) {
    const ch = charOf(charId);
    const cur = statusOf(ch);
    openSheet(`
      <div class="sheet-title">${esc(ch.name)} 的状态</div>
      <div style="padding:4px 20px 10px;display:flex;gap:7px;flex-wrap:wrap">
        ${Object.keys(STATUS).map((k) => `<button class="chip ${cur.kind === k ? 'on' : ''}" data-setstatus="${k}" data-char="${ch.id}">${STATUS[k].label}</button>`).join('')}
      </div>
      <div style="padding:2px 20px 10px;font-size:10.5px;color:var(--ink-3);letter-spacing:.5px">状态短语</div>
      <div style="padding:0 20px 12px;display:flex;gap:7px;flex-wrap:wrap">
        ${STATUS_WORDS.map((w) => `<button class="chip ${cur.word === w ? 'on' : ''}" data-setword="${esc(w)}" data-char="${ch.id}">${esc(w)}</button>`).join('')}
      </div>
      <div style="padding:0 20px 14px;display:flex;gap:6px">
        <input id="wordInput" placeholder="自己写一句…" maxlength="16" style="flex:1;height:34px;border-radius:9px;border:.5px solid var(--line);padding:0 10px;font-size:12.5px;outline:none;background:#fff;color:var(--ink)">
        <button class="btn solid sm" data-customword data-char="${ch.id}">设置</button>
      </div>
      <button class="sheet-item sheet-cancel" data-close-sheet>完成</button>
    `);
  }

  document.addEventListener('click', (e) => {
    const stBtn = e.target.closest('[data-setstatus]');
    if (stBtn) {
      const ch = charOf(stBtn.dataset.char);
      ch.status = Object.assign({}, ch.status, { kind: stBtn.dataset.setstatus });
      save(); closeSheet(); render(); toast('状态已更新');
      return;
    }
    const wdBtn = e.target.closest('[data-setword]');
    if (wdBtn) {
      const ch = charOf(wdBtn.dataset.char);
      ch.status = Object.assign({}, ch.status, { word: wdBtn.dataset.setword });
      save(); closeSheet(); render(); toast('状态已更新');
      return;
    }
    const cw = e.target.closest('[data-customword]');
    if (cw) {
      const inp = $('#wordInput');
      const v = inp && inp.value.trim();
      if (!v) return;
      const ch = charOf(cw.dataset.char);
      ch.status = Object.assign({}, ch.status, { word: v });
      save(); closeSheet(); render(); toast('状态已更新');
    }
  }, true);

  /* ---------------- 印象 ---------------- */
  function addImpression(charId) {
    const inp = $('#imInput');
    const v = inp && inp.value.trim();
    if (!v) { if (inp) inp.focus(); return; }
    const ch = charOf(charId);
    ch.impressions = ch.impressions || [];
    ch.impressions.push({ id: uid('im'), text: v, tag: '', ts: Date.now() });
    save(); render();
    toast('已记下');
  }

  function delImpression(charId, imId) {
    const ch = charOf(charId);
    ch.impressions = ch.impressions.filter((i) => i.id !== imId);
    save(); render(); toast('已删除');
  }

  /* ---------------- 心动时刻 ---------------- */
  function openHeartPicker(charId) {
    const ch = charOf(charId);
    const chat = chatOf(charId);
    const msgs = ((chat && chat.messages) || []).filter((m) => m.type !== 'sys' && m.text);
    if (!msgs.length) { toast('这个聊天还没有消息'); return; }
    const exist = new Set((ch.moments || []).map((m) => m.mid));
    const rows = msgs.slice().reverse().map((m) => {
      const mine = m.from === 'me';
      const txt = /^data:/.test(m.text) ? '[图片]' : m.text;
      const who = mine ? meObj() : ch;
      return `<div class="pick-row ${exist.has(m.id) ? 'sel' : ''}" data-heart-msg="${m.id}" data-char="${ch.id}">
        ${avatarHTML(who, '')}
        <div class="pr-main">
          <div class="pr-txt">${mine ? '<span style="color:var(--ink-3)">你：</span>' : ''}${esc(txt)}</div>
          <div class="pr-time">${fullTime(m.ts)}</div>
        </div>
        <div class="pr-check"></div>
      </div>`;
    }).join('');

    const mask = document.createElement('div');
    mask.className = 'picker-mask show';
    mask.id = 'pickerMask';
    mask.innerHTML = `<div class="picker">
      <div class="picker-head">
        <h3>选一条心动时刻</h3>
        <button data-picker-close>关闭</button>
      </div>
      <div class="picker-hint">「收藏消息」—— 收下的句子会钉在这个人的档案里，删不掉。</div>
      <div class="picker-list">${rows}</div>
      <div class="picker-foot">
        <button class="btn ghost" data-picker-close style="flex:1">取消</button>
        <button class="btn solid" id="heartConfirm" style="flex:1">收下（<b id="heartN">1</b>）</button>
      </div>
    </div>`;
    document.body.appendChild(mask);

    const sel = new Set();
    mask.querySelectorAll('[data-heart-msg]').forEach((r) => {
      if (r.classList.contains('sel')) sel.add(r.dataset.heartMsg);
      r.onclick = () => {
        const id = r.dataset.heartMsg;
        if (sel.has(id)) { sel.delete(id); r.classList.remove('sel'); }
        else { sel.add(id); r.classList.add('sel'); }
        const n = $('#heartN'); if (n) n.textContent = sel.size || 1;
      };
    });
    const close = () => mask.remove();
    mask.querySelectorAll('[data-picker-close]').forEach((b) => (b.onclick = close));
    mask.onclick = (ev) => { if (ev.target === mask) close(); };

    $('#heartConfirm').onclick = () => {
      if (!sel.size) { toast('先选一条'); return; }
      let added = 0;
      sel.forEach((mid) => {
        if (exist.has(mid)) return;
        const m = msgs.find((z) => z.id === mid);
        if (!m) return;
        ch.moments = ch.moments || [];
        ch.moments.push({ id: uid('hm'), mid, text: /^data:/.test(m.text) ? m.text : m.text, from: m.from, ts: m.ts, why: '' });
        added++;
      });
      save(); close();
      toast(added ? `收下 ${added} 条` : '这些已经在里面了');
      setTimeout(() => askWhy(ch.id), 320);
    };
  }

  function askWhy(charId) {
    const ch = charOf(charId);
    const noWhy = (ch.moments || []).filter((m) => !m.why && m.mid);
    if (!noWhy.length) return;
    const last = noWhy[noWhy.length - 1];
    openDialog({
      title: '为什么是这一刻',
      desc: '一句话就够了。也可以先跳过。',
      fields: [{ key: 'why', type: 'input', label: '写下来', placeholder: '因为那天……' }],
      ok: '写下',
      onOk: (v) => {
        if (!v.why) return;
        last.why = v.why;
        save(); render();
        toast('已记下这一刻');
      },
    });
  }

  function whyHeart(charId, hmId) {
    const ch = charOf(charId);
    const hm = (ch.moments || []).find((m) => m.id === hmId);
    if (!hm) return;
    const isImg = hm.kind === 'image';
    openDialog({
      title: isImg ? '为这张照片写一句' : '为什么是这一刻',
      desc: isImg ? '照片会留在这里，你的字也一起。' : '一句话就够了。',
      fields: [{ key: 'why', type: 'textarea', label: isImg ? '补充' : '写下来', rows: isImg ? 4 : 2, value: hm.why || '', placeholder: isImg ? '那天我们……' : '因为那天……' }],
      ok: '保存',
      onOk: (v) => { hm.why = (v.why || '').trim(); save(); render(); toast(hm.why ? '已记下' : '已清空'); },
    });
  }

  /* ---------------- 心动时刻 · 放入图片 ---------------- */
  function heartAddImages(charId, hmId) {
    const ch = charOf(charId);
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = () => {
      const files = Array.from(inp.files || []).slice(0, 9);
      if (!files.length) return;
      // 逐张压缩，全部完成后统一入库
      const results = [];
      let left = files.length;
      files.forEach((f) => {
        shrinkImage(f, 1200, (data) => {
          if (data) results.push(data);
          if (--left === 0) {
            if (!results.length) { toast('图片读取失败'); return; }
            if (hmId) {
              const hm = (ch.moments || []).find((m) => m.id === hmId);
              if (hm) { hm.images = (hm.images || []).concat(results); hm.kind = 'image'; }
            } else {
              ch.moments = ch.moments || [];
              ch.moments.push({ id: uid('hm'), kind: 'image', images: results, from: 'me', ts: Date.now(), why: '' });
            }
            save(); render();
            toast('已放入 ' + results.length + ' 张');
            // 立刻让用户补一句
            setTimeout(() => {
              const target = hmId || (ch.moments[ch.moments.length - 1] || {}).id;
              if (target) askImageNote(ch.id, target);
            }, 320);
          }
        }, 0.78);
      });
    };
    inp.click();
  }

  function askImageNote(charId, hmId) {
    const ch = charOf(charId);
    const hm = (ch.moments || []).find((m) => m.id === hmId);
    if (!hm || hm.why) return;
    openDialog({
      title: '为这张照片写一句',
      desc: '可以不写，之后再补。',
      fields: [{ key: 'why', type: 'textarea', label: '补充', rows: 3, placeholder: '拍下这张的时候……' }],
      ok: '写下',
      onOk: (v) => { hm.why = (v.why || '').trim(); save(); render(); if (hm.why) toast('已记下'); },
    });
  }

  function delHeart(charId, hmId) {
    const ch = charOf(charId);
    ch.moments = ch.moments.filter((m) => m.id !== hmId);
    save(); render(); toast('已移除');
  }

  /* ---------------- 相识日期 ---------------- */
  function editMetDialog(charId) {
    const ch = charOf(charId);
    const d = new Date(ch.met || now());
    const v0 = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    openDialog({
      title: '相识的第一天',
      desc: '改这里，「相伴时长」会跟着重算。',
      fields: [{ key: 'date', type: 'date', label: '日期', value: v0 }],
      ok: '保存',
      onOk: (v) => {
        const t = new Date(v.date + 'T00:00:00').getTime();
        if (isNaN(t)) { toast('日期无效'); return; }
        ch.met = Math.min(t, now());
        save(); render(); toast('已更新');
      },
    });
  }

  /* ---------------- 档案「更多」 ---------------- */
  function profileMoreSheet(charId) {
    const ch = charOf(charId);
    openSheet(`
      <div class="sheet-title">${esc(ch.name)}</div>
      <button class="sheet-item" data-sheet="editChar" data-char="${ch.id}">编辑名字 / 人设 / 活跃时段</button>
      <button class="sheet-item" data-action="change-avatar" data-cid="${ch.id}">更换头像</button>
      <button class="sheet-item" data-action="edit-status" data-char="${ch.id}">设置状态</button>
      <button class="sheet-item" data-action="edit-met" data-char="${ch.id}">修改相识日期</button>
      <button class="sheet-item danger" data-sheet="clearChat" data-char="${ch.id}">清空聊天记录</button>
      <button class="sheet-item sheet-cancel" data-close-sheet>取消</button>
    `);
  }

  /* ---------------- 设置 ---------------- */
  function toggleSetting(k) {
    const st = S.settings;
    if (k === 'sim') { st.sim = !st.sim; st.simStart = Date.now(); }
    else if (k === 'notifications') st.notifications = !st.notifications;
    else if (k === 'autoReply') st.autoReply = !st.autoReply;
    else if (k === 'ai') st.ai.enabled = !st.ai.enabled;
    else if (k === 'onNote') st.annoPref.onNote = !st.annoPref.onNote;
    else if (k === 'onMoment') st.annoPref.onMoment = !st.annoPref.onMoment;
    else if (k === 'todoRemind') st.todoRemind = !st.todoRemind;
    save(); render();
    if (k === 'ai' && st.ai.enabled && !st.ai.key) setTimeout(() => aiConfigDialog(), 220);
  }

  function aiConfigDialog() {
    openDialog({
      title: 'AI 接口配置',
      desc: '填你自己的 Key。不填就用字卡池，完全离线。',
      fields: [
        { key: 'endpoint', type: 'input', label: '接口地址', value: S.settings.ai.endpoint },
        { key: 'model', type: 'input', label: '模型名', value: S.settings.ai.model },
        { key: 'key', type: 'input', label: 'API Key', value: S.settings.ai.key, placeholder: 'sk-...' },
      ],
      ok: '保存',
      onOk: (v) => {
        S.settings.ai.endpoint = v.endpoint; S.settings.ai.model = v.model; S.settings.ai.key = v.key;
        S.settings.ai.enabled = !!v.key;
        save(); render();
        toast(v.key ? 'AI 已启用' : '未填 Key，保持字卡模式');
      },
    });
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'miniat-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    toast('已导出 JSON');
  }

  function confirmReset() {
    openDialog({
      title: '重置为初始状态',
      desc: '会清空这台手机里的所有联系人、聊天、动态、笔记与表情包，从零开始。这个操作不能撤销。',
      ok: '确定重置',
      danger: true,
      onOk: () => {
        localStorage.removeItem(KEY);
        S = seed();
        save();
        setTab('chat');
        toast('已重置');
      },
    });
  }

  /* ---------------- 弹层 ---------------- */
  const sheetMask = $('#sheetMask');
  const sheet = $('#sheet');
  sheetMask.addEventListener('click', (e) => { if (e.target === sheetMask) closeSheet(); });

  function openSheet(html) {
    sheet.innerHTML = html;
    sheetMask.classList.add('show');
  }
  function closeSheet() { sheetMask.classList.remove('show'); }

  sheet.addEventListener('click', (e) => {
    const it = e.target.closest('[data-sheet]');
    if (it) { closeSheet(); it.dataset.sheet && sheetHandlers[it.dataset.sheet] && sheetHandlers[it.dataset.sheet](it); return; }
    const ac = e.target.closest('[data-action]');
    if (ac) { closeSheet(); handleAction(ac, e); return; }
    if (e.target.closest('[data-close-sheet]')) closeSheet();
  });

  const sheetHandlers = {
    editPool: (el) => editPoolDialog(el.dataset.char),
    addCard: (el) => addCardDialog(el.dataset.char),
    clearChat: (el) => {
      const c = chatOf(el.dataset.char);
      if (!c) return;
      c.messages = [];
      save(); render(); toast('聊天已清空');
    },
    stickerOfChar: (el) => { setTab('stickers'); },
    editChar: (el) => editCharDialog(el.dataset.char),
    delGame: (el) => {
      S.games = (S.games || []).filter((g) => g.id !== el.dataset.game);
      save(); view = { tab: 'game', sub: null, id: null }; render(''); toast('已删除');
    },
    clearDone: () => {
      S.todos = (S.todos || []).filter((t) => !t.done);
      save(); render(); toast('已清除');
    },
    deleteNote: (el) => {
      S.notes = S.notes.filter((n) => n.id !== el.dataset.note);
      save(); backToList(); toast('已删除');
    },
    editNote: (el) => editNoteDialog(el.dataset.note),
    copyNote: (el) => {
      const n = S.notes.find((x) => x.id === el.dataset.note);
      if (navigator.clipboard) navigator.clipboard.writeText(n.title + '\n\n' + n.content);
      toast('已复制到剪贴板');
    },
  };

  /* ================= 字卡库（我的 → 通用 / 特殊） ================= */
  // 通用字卡：所有角色都会用。
  // 特殊字卡：ch.pool，只给某个角色用。
  let cardTab = 'common';       // 'common' | 'special'
  let cardOwner = null;          // 特殊字卡里选中的角色 id
  const CARD_TYPES = [
    { key: 'pool', label: '主动消息', hint: '到点自己发给你' },
    { key: 'reply', label: '回复', hint: '你说话后他回你' },
    { key: 'cmt', label: '动态评论', hint: '在动态下的留言' },
    { key: 'anno', label: '笔记批注', hint: '可见笔记的批注' },
  ];

  function allCardsOf(ch) {
    // 某角色能用的全部字卡：通用（不分场景）+ 他自己的特殊字卡
    const common = (S.cards || []).map((c) => ({ text: c.text, common: true }));
    const own = ['pool', 'reply', 'cmt', 'anno'].reduce((a, k) => {
      a[k] = (ch[k] || []).map((t) => ({ text: t, type: k, common: false }));
      return a;
    }, {});
    return { common, own };
  }

  /* 通用字卡不分场景：只要到了「他该说一句话」的场合，通用字卡都能被抽到。
   * type 只是特殊字卡的分组（主动消息 / 回复 / 动态评论 / 笔记批注）。 */
  function cardsFor(ch, type) {
    const common = (S.cards || []).map((c) => c.text);
    const own = (ch && (ch[type] || [])) || [];
    // 恋人专属字卡：只有关系是「恋人」的角色会说，混进他本人的特殊字卡池
    const love = ch && ch.rel === 'lover' ? (ch.love || []) : [];
    // 特殊字卡优先（更像他本人），但通用字卡永远在同一条池子里
    return own.concat(love, common);
  }

  function cardsPage(cls) {
    const hasChars = S.chars.length > 0;
    if (!cardOwner || !charOf(cardOwner)) cardOwner = hasChars ? S.chars[0].id : null;
    const owner = cardOwner ? charOf(cardOwner) : null;

    const body = cardTab === 'common'
      ? (S.cards.length
        ? S.cards.map((c, i) => `<div class="card-row" data-card="${i}">
            <div class="cr-main"><div class="cr-text">${esc(c.text)}</div></div>
            <button class="cr-del" data-delcard="${i}">✕</button>
          </div>`).join('')
        : `<div class="card-empty">还没有通用字卡。<br>这里的句子，什么时候都能说。</div>`)
      : (!owner
        ? `<div class="card-empty">先去「消息」里创建一个联系人，<br>再给他配专属的字卡。</div>`
        : `<div class="card-owner-bar">
            ${avatarHTML(owner, 'sm')}
            <select id="cardOwnerSel">
              ${S.chars.map((c) => `<option value="${c.id}" ${c.id === owner.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
            <span class="cob-hint">只给他说</span>
          </div>
          ${(owner.rel === 'lover'
            ? CARD_TYPES.concat([{ key: 'love', label: '恋人', hint: '恋人专属 · 只有 TA 之间会说到' }])
            : CARD_TYPES).map((t) => {
            const list = owner[t.key] || [];
            return `<div class="card-group">
              <div class="cg-head">${t.label}<span>${t.hint}</span><b>${list.length}</b></div>
              ${list.length ? list.map((txt, i) => `<div class="card-row">
                <div class="cr-main"><div class="cr-text">${esc(txt)}</div></div>
                <button class="cr-del" data-delown="${t.key}" data-idx="${i}">✕</button>
              </div>`).join('') : `<div class="cg-empty">还没有</div>`}
            </div>`;
          }).join('')}`);

    return `<div class="${cls} cards-page">
      <div class="navbar">
        <button class="nb-back" data-action="back-to-me">
          <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>
        </button>
        <div class="nb-title">字卡库</div>
        <div class="nb-right"><button class="icon-btn" data-action="add-card"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button></div>
      </div>
      <div class="card-seg">
        <button class="${cardTab === 'common' ? 'on' : ''}" data-cardtab="common">通用字卡<em>${S.cards.length}</em></button>
        <button class="${cardTab === 'special' ? 'on' : ''}" data-cardtab="special">特殊字卡<em>${S.chars.reduce((a, c) => a + (c.pool || []).length + (c.reply || []).length + (c.cmt || []).length + (c.anno || []).length + (c.rel === 'lover' ? (c.love || []).length : 0), 0)}</em></button>
      </div>
      <div class="card-hint">${cardTab === 'common'
        ? '通用字卡：不分场合，什么时候都能说。一个回车就是一条。'
        : '特殊字卡：只属于某一个人，别人不会说。'}</div>
      <div class="list-scroll"><div class="cards-body">${body}</div>
        <div style="padding:14px 18px 28px;text-align:center;font-size:10.5px;color:var(--ink-3);line-height:1.9">
          ${cardTab === 'common'
            ? '通用字卡不分场景，闲聊、主动发、评论、批注都可能抽到它。'
            : '他被问到什么，就会从这些句子里挑一句。'}
        </div>
      </div>
    </div>`;
  }

  /* 添加字卡：一行一条。通用字卡不问场景，特殊字卡才选「说在哪」。 */
  function addCardDialog(charId) {
    const isCommon = cardTab === 'common' && !charId;
    if (!isCommon) {
      if (charId) cardOwner = charId;
      if ((!cardOwner || !charOf(cardOwner)) && S.chars.length) cardOwner = S.chars[0].id;
    }
    const owner = !isCommon && cardOwner ? charOf(cardOwner) : null;
    if (!isCommon && !owner) { toast('先创建一个联系人'); return; }

    const fields = [];
    if (!isCommon) {
      // 恋人专属字卡栏：只有关系是「恋人」的联系人才能往这一栏加
      const types = (!isCommon && owner && owner.rel === 'lover')
        ? CARD_TYPES.concat([{ key: 'love', label: '恋人', hint: '恋人专属 · 只对你说' }])
        : CARD_TYPES;
      fields.push({ key: 'type', type: 'select', label: '什么时候说', options: types.map((t) => [t.key, t.label + ' · ' + t.hint]) });
    }
    fields.push({
      key: 'text', type: 'textarea', rows: 7, label: '内容（一行一条）',
      placeholder: '今天想我了没？\n早点睡。\n外面下雨了，带伞。',
    });

    openDialog({
      title: isCommon ? '添加通用字卡' : '给 ' + owner.name + ' 添加字卡',
      desc: isCommon ? '一行一条，回车分开。不分场合，什么时候都能说。' : '一行一条，回车分开。只有他会说。',
      rawHTML: `<div class="card-add-tip"><span id="cardCnt">0 条</span> · 空行会自动跳过</div>`,
      fields,
      ok: '添加',
      onOk: (v) => {
        const texts = (v.text || '').split('\n').map((x) => x.trim()).filter(Boolean);
        if (!texts.length) return;
        if (isCommon) {
          texts.forEach((t) => S.cards.push({ id: uid('cd'), text: t }));
        } else {
          const k = v.type || 'pool';
          owner[k] = owner[k] || [];
          texts.forEach((t) => owner[k].push(t));
        }
        cardTab = isCommon ? 'common' : 'special';
        save(); render(''); toast('已添加 ' + texts.length + ' 条');
      },
    });

    // 实时显示会加进去几条
    setTimeout(() => {
      const ta = dialogEl.querySelector('[data-f="text"]');
      const cnt = dialogEl.querySelector('#cardCnt');
      if (!ta || !cnt) return;
      const upd = () => {
        const n = (ta.value || '').split('\n').filter((x) => x.trim()).length;
        cnt.textContent = n + ' 条';
      };
      ta.addEventListener('input', upd);
      upd();
    }, 30);
  }

  function editMyProfile() {
    const me = S.settings.me;
    let img = null;
    openDialog({
      title: '我自己',
      desc: '这个名字和头像会出现在聊天、动态、批注里。',
      rawHTML: `<div style="display:flex;gap:12px;align-items:center;margin:6px 0 4px">
          <div class="avatar" id="myAv" style="${me.avatar ? 'background:#e7ebed' : 'background:' + (me.color || '#93a1a8')}">${me.avatar ? `<img src="${me.avatar}" alt="">` : esc(me.initial || '我')}</div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px">
            <button class="btn ghost sm" data-action="me-pickimg">上传头像</button>
            <button class="btn ghost sm" data-action="me-clearimg">用文字头像</button>
          </div>
        </div>
        <div class="me-swatches" id="meSwatches">
          ${COLORS.map((c) => `<button class="sw ${me.color === c[0] ? 'on' : ''}" data-mecolor="${c[0]}" style="background:${c[0]}"></button>`).join('')}
        </div>`,
      fields: [{ key: 'name', type: 'input', label: '名字', value: me.name || '我' }],
      ok: '保存',
      onOk: (v) => {
        me.name = (v.name || '').trim() || '我';
        me.initial = me.name.slice(0, 1);
        if (img) me.avatar = img;
        save(); render(); toast('已保存');
      },
    });
  }

  function cardTypeLabel(k) {
    return (CARD_TYPES.find((t) => t.key === k) || {}).label || '字卡';
  }

  function chatMoreSheet(charId) {
    const ch = charOf(charId);
    openSheet(`
      <div class="sheet-title">${esc(ch.name)}</div>
      <button class="sheet-item" data-sheet="editChar" data-char="${ch.id}">编辑人设与活跃时段</button>
      <button class="sheet-item" data-sheet="addCard" data-char="${ch.id}">添加一条字卡</button>
      <button class="sheet-item" data-sheet="editPool" data-char="${ch.id}">查看 / 管理字卡池（${ch.pool.length}）</button>
      <button class="sheet-item" data-sheet="stickerOfChar" data-char="${ch.id}">他的表情包（${(ch.stickers || []).length}）</button>
      <button class="sheet-item danger" data-sheet="clearChat" data-char="${ch.id}">清空聊天记录</button>
      <button class="sheet-item sheet-cancel" data-close-sheet>取消</button>
    `);
  }

  function editPoolDialog(charId) {
    const ch = charOf(charId);
    const list = ch.pool.map((p, i) => `<div style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:.5px solid var(--line-2)">
      <span style="flex:1;font-size:12.5px;color:var(--ink-2);line-height:1.5">${esc(p)}</span>
      <button class="icon-btn" style="width:24px;height:24px;color:var(--red)" data-delpool="${i}">✕</button></div>`).join('');
    openDialog({
      title: '字卡池 · ' + ch.name,
      desc: '他到点会"主动发"的句子，从这里随机抽。',
      rawHTML: `<div style="max-height:220px;overflow-y:auto">${list || '<div style="font-size:12px;color:var(--ink-3);padding:8px 0">空</div>'}</div>
        <div style="margin-top:10px;display:flex;gap:6px">
          <input id="newCard" placeholder="新的一条…" style="flex:1;width:auto">
          <button class="btn solid sm" id="addCardBtn">加</button>
        </div>`,
      ok: '完成',
      onOk: () => { save(); render(); },
    });
    setTimeout(() => {
      const btn = $('#addCardBtn');
      if (btn) btn.onclick = () => {
        const v = $('#newCard').value.trim();
        if (!v) return;
        ch.pool.push(v); $('#newCard').value = ''; editPoolDialog(charId);
      };
      $$('[data-delpool]', $('#dialog')).forEach((b) => {
        b.onclick = () => { ch.pool.splice(+b.dataset.delpool, 1); save(); editPoolDialog(charId); };
      });
    }, 30);
  }

  function editCharDialog(charId) {
    const ch = charOf(charId);
    openDialog({
      title: '编辑 ' + ch.name,
      fields: [
        { key: 'name', type: 'input', label: '名字', value: ch.name },
        { key: 'tag', type: 'input', label: '标签（留空则不显示）', value: ch.tag || '' },
        { key: 'rel', type: 'select', label: '关系', value: ch.rel || '', options: [['', '未设置'], ['friend', '朋友'], ['lover', '恋人'], ['kin', '亲人']] },
        { key: 'persona', type: 'textarea', label: '人设', value: ch.persona, rows: 3 },
        { key: 'schedule', type: 'input', label: '活跃时段', value: ch.schedule.start + '-' + ch.schedule.end },
        { key: 'freq', type: 'input', label: '每天大概几条（1-12）', value: String(ch.schedule.freq) },
      ],
      ok: '保存',
      onOk: (v) => {
        ch.name = v.name || ch.name;
        ch.initial = ch.name[0];
        ch.tag = v.tag;
        ch.rel = REL[v.rel] ? v.rel : '';
        ch.persona = v.persona;
        const m = /(\d{1,2})\s*-\s*(\d{1,2})/.exec(v.schedule || '');
        if (m) { ch.schedule.start = clamp(+m[1], 0, 23); ch.schedule.end = clamp(+m[2], 0, 24); }
        ch.schedule.freq = clamp(parseInt(v.freq) || 2, 0, 12);
        save(); render(); toast('已保存');
      },
    });
  }

  function noteMoreSheet(noteId) {
    openSheet(`
      <div class="sheet-title">这篇笔记</div>
      <button class="sheet-item" data-action="edit-note" data-note="${noteId}">编辑内容</button>
      <button class="sheet-item" data-action="change-note-kind" data-note="${noteId}">换个类型</button>
      <button class="sheet-item" data-sheet="copyNote" data-note="${noteId}">复制全文</button>
      <button class="sheet-item danger" data-sheet="deleteNote" data-note="${noteId}">删除这篇</button>
      <button class="sheet-item sheet-cancel" data-close-sheet>取消</button>
    `);
  }

  /* ---------------- 通用 Dialog ---------------- */
  const dialogMask = $('#dialogMask');
  const dialogEl = $('#dialog');
  let dialogCb = null;

  dialogMask.addEventListener('click', (e) => { if (e.target === dialogMask) closeDialog(); });

  // 简易弹窗（自拼 HTML 结构，供日历等少量场景使用）
  function openRawDialog(html) {
    dialogCb = null;
    dialogEl.innerHTML = html;
    dialogMask.classList.add('show');
  }

  function openDialog(cfg) {
    dialogCb = cfg;
    let body = '';
    if (cfg.desc) body += `<p>${esc(cfg.desc)}</p>`;
    (cfg.fields || []).forEach((f) => {
      body += `<label>${esc(f.label || '')}</label>`;
      if (f.type === 'textarea') body += `<textarea data-f="${f.key}" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}">${esc(f.value || '')}</textarea>`;
      else if (f.type === 'select') body += `<select data-f="${f.key}">${f.options.map((o) => `<option value="${o[0]}"${f.value === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
      else if (f.type === 'vis') body += `<div class="vis-toggle" data-vis>
          <div class="vis-opt on" data-v="0">仅自己</div>
          <div class="vis-opt" data-v="1">联系人可见</div>
        </div>`;
      else if (f.type === 'file') body += `<div style="display:flex;gap:6px;align-items:center">
          <button class="btn ghost sm" data-pickimg>选择图片</button>
          <span style="font-size:11px;color:var(--ink-3)" data-fname>未选择</span></div>`;
      else if (f.type === 'date') body += `<input type="date" data-f="${f.key}" value="${esc(f.value || '')}">`;
      else body += `<input data-f="${f.key}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}">`;
    });
    if (cfg.rawHTML) body += cfg.rawHTML;

    // 标题与按钮固定，中间内容区可滚动 —— 横屏/小屏也能完整操作
    dialogEl.innerHTML = `<h3>${esc(cfg.title)}</h3>
      <div class="dlg-body">${body}
        ${cfg.extraBtn ? `<button class="btn ghost block sm" id="dlgExtra" style="margin-top:14px">${esc(cfg.extraBtn.label)}</button>` : ''}
      </div>
      <div class="dialog-actions">
        <button class="cancel" data-dcancel>取消</button>
        <button class="ok" data-dok style="${cfg.danger ? 'background:var(--red)' : ''}">${esc(cfg.ok || '确定')}</button>
      </div>`;
    dialogMask.classList.add('show');

    let visVal = 0, fileVal = null;

    // 可见性切换
    $$('[data-vis] .vis-opt', dialogEl).forEach((o) => {
      o.onclick = () => {
        $$('[data-vis] .vis-opt', dialogEl).forEach((x) => x.classList.remove('on'));
        o.classList.add('on');
        visVal = +o.dataset.v;
      };
    });

    // 图片
    const pib = $('[data-pickimg]', dialogEl);
    if (pib) {
      pib.onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = () => {
          const f = inp.files[0]; if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            const img = new Image();
            img.onload = () => {
              const cv = document.createElement('canvas');
              const max = 900, ratio = Math.min(max / img.width, max / img.height, 1);
              cv.width = img.width * ratio; cv.height = img.height * ratio;
              cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
              fileVal = cv.toDataURL('image/jpeg', 0.82);
              $('[data-fname]', dialogEl).textContent = '已选择 ✓';
            };
            img.src = r.result;
          };
          r.readAsDataURL(f);
        };
        inp.click();
      };
    }

    const eb = $('#dlgExtra', dialogEl);
    if (eb && cfg.extraBtn) eb.onclick = () => cfg.extraBtn.fn();

    $('[data-dcancel]', dialogEl).onclick = closeDialog;
    $('[data-dok]', dialogEl).onclick = () => {
      const vals = {};
      $$('[data-f]', dialogEl).forEach((el) => (vals[el.dataset.f] = el.value));
      (cfg.fields || []).forEach((f) => {
        if (f.type === 'vis') vals[f.key] = !!visVal;
        if (f.type === 'file') vals[f.key] = fileVal;
      });
      closeDialog();
      if (cfg.onOk) cfg.onOk(vals);
    };
  }
  function closeDialog() { dialogMask.classList.remove('show'); dialogCb = null; }

  // 弹窗内的动作（日历标注、加待办等 raw dialog）
  dialogEl.addEventListener('click', (e) => {
    const act = e.target.closest('[data-action]');
    if (act) { handleAction(act, e); return; }
    const cd = e.target.closest('[data-close-dialog]');
    if (cd) { closeDialog(); return; }
    const seg2 = e.target.closest('#mkRepeat button, #tdWho button, #nkPick button');
    if (seg2) {
      const wrap = seg2.parentElement;
      $$('button', wrap).forEach((b) => b.classList.toggle('on', b === seg2));
      if (wrap.id === 'mkRepeat') mkRepeat = seg2.dataset.v;
      if (wrap.id === 'tdWho') tdWho = seg2.dataset.v;
    }
    // 导入图片弹窗：模式 / 排法 / 靠边
    const m2 = e.target.closest('#insModes button');
    if (m2) {
      const isEnd = m2.dataset.m === 'end';
      insMode = isEnd ? 'end' : (insMode === 'end' ? 'inline' : insMode);
      $$('#insModes button').forEach((b) => b.classList.toggle('on', b === m2));
      if (!isEnd) {
        const k = document.querySelector('#insKinds button.on');
        insMode = k ? k.dataset.k : 'inline';
      }
      syncInsBoxes();
      return;
    }
    const k2 = e.target.closest('#insKinds button');
    if (k2) {
      insMode = k2.dataset.k;
      $$('#insKinds button').forEach((b) => b.classList.toggle('on', b === k2));
      syncInsBoxes();
      return;
    }
    const f2 = e.target.closest('#insFlow button');
    if (f2) {
      insFlow = f2.dataset.v;
      $$('#insFlow button').forEach((b) => b.classList.toggle('on', b === f2));
      return;
    }
    const s2 = e.target.closest('#insFloatSide button');
    if (s2) {
      insPickSide = s2.dataset.v;
      $$('#insFloatSide button').forEach((b) => b.classList.toggle('on', b === s2));
      return;
    }
    const ef = e.target.closest('#editInsFlow button');
    if (ef) {
      insFlow = ef.dataset.v;
      $$('#editInsFlow button').forEach((b) => b.classList.toggle('on', b === ef));
    }
  });

  // 导入图片弹窗：滑块 / 下拉
  dialogEl.addEventListener('input', (e) => {
    if (e.target.id === 'insFrac') {
      insFrac = +e.target.value / 100;
      const t = $('#insFracTxt');
      const v = insFrac;
      if (t) t.textContent = v < 0.2 ? '靠前' : v > 0.8 ? '靠后' : v < 0.4 ? '偏前' : v > 0.6 ? '偏后' : '中间';
    }
    if (e.target.id === 'insW') {
      insW = +e.target.value;
      const t = $('#insWTxt');
      if (t) t.textContent = insW + '%';
    }
    if (e.target.id === 'editInsFrac') {
      insFrac = +e.target.value / 100;
      const t = $('#editInsFracTxt');
      const v = insFrac;
      if (t) t.textContent = v < 0.2 ? '靠前' : v > 0.8 ? '靠后' : v < 0.4 ? '偏前' : v > 0.6 ? '偏后' : '中间';
    }
    if (e.target.id === 'editInsW') {
      insW = +e.target.value;
      const t = $('#editInsWTxt');
      if (t) t.textContent = insW + '%';
    }
    if (e.target.id === 'stickFrac') {
      stickFrac = +e.target.value / 100;
      const t = $('#stickFracTxt');
      if (t) t.textContent = fracLabel(stickFrac);
    }
    if (e.target.id === 'stickW') {
      stickW = +e.target.value;
      const t = $('#stickWTxt');
      if (t) t.textContent = stickW + '%';
    }
    if (e.target.id === 'editSkFrac') {
      stickFrac = +e.target.value / 100;
      const t = $('#editSkFracTxt');
      if (t) t.textContent = fracLabel(stickFrac);
    }
    if (e.target.id === 'editSkW') {
      stickW = +e.target.value;
      const t = $('#editSkWTxt');
      if (t) t.textContent = stickW + '%';
    }
  });
  dialogEl.addEventListener('change', (e) => {
    if (e.target.id === 'insLine') insPickLine = +e.target.value;
    if (e.target.id === 'insFloatLine') insPickLine = +e.target.value;
    if (e.target.id === 'editInsLine') insPickLine = +e.target.value;
    if (e.target.id === 'stickLine') stickPickLine = +e.target.value;
    if (e.target.id === 'editSkLine') stickPickLine = +e.target.value;
  });

  /* ---------------- 聊天长按 ---------------- */
  let pressTimer = null;
  let pressStart = null;
  let pressFired = false;
  appBody.addEventListener('pointerdown', (e) => {
    const row = e.target.closest('.msg-row');
    if (!row) return;
    pressFired = false;
    pressStart = { x: e.clientX, y: e.clientY };
    if (pressTimer) clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      pressTimer = null;
      if (pressStart && Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 14) return;
      pressFired = true;
      if (navigator.vibrate) { try { navigator.vibrate(12); } catch (err) {} }
      showCtxMenu(row, e.clientX, e.clientY);
    }, 460);
  });
  ['pointerup', 'pointercancel', 'scroll'].forEach((ev) =>
    appBody.addEventListener(ev, () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } }, true)
  );
  // 手指滑动超过阈值就取消：滚动列表时不该弹菜单
  appBody.addEventListener('pointermove', (e) => {
    if (!pressTimer || !pressStart) return;
    if (Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 14) {
      clearTimeout(pressTimer); pressTimer = null;
    }
  }, true);
  // 长按之后的那一次 click 不要穿透到气泡上
  appBody.addEventListener('click', (e) => {
    if (pressFired) { pressFired = false; e.preventDefault(); e.stopPropagation(); }
  }, true);

  function showCtxMenu(row, x, y) {
    const old = $('#ctxMenu');
    if (old) old.remove();
    const msgId = row.dataset.msg;
    const chat = chatOf(view.id);
    const m = chat.messages.find((z) => z.id === msgId);
    if (!m) return;
    const txt = m.text && !m.text.startsWith('data:') ? m.text : (m.type === 'image' ? '[图片]' : '[表情]');
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.id = 'ctxMenu';
    menu.innerHTML = `
      <button data-ctx="copy">复制</button>
      ${m.type === 'text' ? '<button data-ctx="quote">引用</button>' : ''}
      <button data-ctx="recall" class="danger">撤回</button>`;
    document.body.appendChild(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = clamp(x - 40, 12, window.innerWidth - r.width - 12) + 'px';
    menu.style.top = clamp(y - 50, 12, window.innerHeight - r.height - 12) + 'px';

    menu.onclick = (ev) => {
      const b = ev.target.closest('[data-ctx]');
      if (!b) return;
      const a = b.dataset.ctx;
      if (a === 'copy') { navigator.clipboard && navigator.clipboard.writeText(txt); toast('已复制'); }
      if (a === 'quote') {
        quoteTarget = { name: m.from === 'me' ? S.settings.me.name : charOf(view.id).name, text: txt };
        afterRender();
        const inp = $('#ciInput'); if (inp) inp.focus();
        const bar = $('#quoteBar');
        if (bar) { bar.style.display = 'flex'; bar.querySelector('span').textContent = quoteTarget.name + '：' + txt; }
      }
      if (a === 'recall') {
        chat.messages = chat.messages.filter((z) => z.id !== msgId);
        save(); render(''); toast('已撤回');
      }
      menu.remove();
    };
  }

  /* ---------------- 通知横幅 ---------------- */
  const bannerWrap = $('#bannerWrap');
  function showBanner(ch, text, kind, charId) {
    const el = document.createElement('div');
    el.className = 'banner';
    el.innerHTML = `${avatarHTML(ch, '')}
      <div class="banner-main">
        <div class="banner-top">
          <b>${esc(ch.name)}</b>
          <span class="banner-pill">${kind === 'chat' ? '消息' : kind === 'moment' ? '动态' : '批注'}</span>
          <span>${hhmm(appClock())}</span>
        </div>
        <div class="banner-txt">${esc(text)}</div>
      </div>`;
    bannerWrap.appendChild(el);
    if (bannerWrap.children.length > 3) bannerWrap.firstChild.remove();

    const kill = () => {
      if (!el.parentNode) return;
      el.classList.add('out');
      setTimeout(() => el.remove(), 300);
    };
    const tm = setTimeout(kill, 4200);
    el.onclick = () => {
      clearTimeout(tm);
      kill();
      if (kind === 'chat') { setTab('chat'); openChat(charId); }
      else if (kind === 'moment') setTab('moments');
      else {
        const n = S.notes.find((x) => x.annos && x.annos.some((a) => a.unread));
        setTab('notes');
        if (n) openNote(n.id);
      }
    };
  }

  /* ---------------- toast ---------------- */
  const toastWrap = $('#toastWrap');
  function toast(t) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = t;
    toastWrap.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = '.3s'; }, 1600);
    setTimeout(() => el.remove(), 2000);
  }

  /* ---------------- 系统通知（装到主屏后才会真的弹出） ---------------- */
  // 只在页面不在前台时发，避免和顶部横幅重复打扰。
  function notifySystem(title, body, tag) {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      // 页面在前台时不发系统通知，顶部横幅已经够了
      if (document.visibilityState === 'visible' && document.hasFocus()) return;
      const n = new Notification(title, {
        body, tag: tag || title, icon: 'icon-192.png', badge: 'icon-192.png',
        silent: false, lang: 'zh-CN',
      });
      n.onclick = () => { window.focus(); n.close(); };
      setTimeout(() => { try { n.close(); } catch (e) {} }, 8000);
    } catch (err) { /* 通知不是必需品，失败就静默 */ }
  }
  function askNotifyPermission() {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') Notification.requestPermission();
    } catch (err) {}
  }
  document.addEventListener('click', function once() {
    askNotifyPermission();
    document.removeEventListener('click', once);
  }, { once: true });

  /* ---------------- 模拟定时消息 ---------------- */
  const activeChats = new Set();
  function tickSim() {
    if (!S.settings.sim) return;
    const clock = appClock();
    const d = new Date(clock);
    const h = d.getHours() + d.getMinutes() / 60;
    S.chars.forEach((ch) => {
      if (!ch.schedule) return;
      const { start, end } = ch.schedule;
      const inWindow = start <= end ? h >= start && h < end : (h >= start || h < end);
      if (!inWindow) return;
      const lastKey = 'lastAuto_' + ch.id;
      const last = S[lastKey] || (S.settings.simStart - 40 * M * S.settings.speed);
      const gap = (24 / Math.max(1, ch.schedule.freq || 2)) * H;
      if (clock - last > gap) {
        S[lastKey] = clock;
        autoMessage(ch);
      }
    });
  }

  function autoMessage(ch) {
    const chat = chatOf(ch.id);
    if (!chat || chat.locked) return;
    let text = pick(cardsFor(ch, 'pool').length ? cardsFor(ch, 'pool') : (cardsFor(ch, 'reply').length ? cardsFor(ch, 'reply') : ['……']));
    const m = { id: uid('m'), from: 'char', type: 'text', text, ts: appClock() };
    chat.messages.push(m);
    const viewing = view.sub === 'detail' && view.id === ch.id && curTab === 'chat';
    if (viewing) {
      render('');
      if (isNearBottom()) { const sc = $('#chatScroll'); if (sc) sc.scrollTop = sc.scrollHeight; }
    } else {
      chat.unread = (chat.unread || 0) + 1;
      updateBadges();
      if (curTab === 'chat') render();
      if (S.settings.notifications) showBanner(ch, text, 'chat', ch.id);
    }
    save();
  }

  setInterval(tickSim, 4000);
  setInterval(todoTick, 3000);
  setTimeout(todoTick, 1500);

  /* ---------------- 时钟 ---------------- */
  function clockTick() {
    const d = new Date();
    const el = $('#sbTime');
    if (el) el.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  clockTick();
  setInterval(clockTick, 15000);

  /* ---------------- 真机全屏模式 ---------------- */
  // 手机浏览器 / 已安装的 PWA 里，"手机壳"没有意义：整个视口就是屏幕。
  // 桌面浏览器仍然显示那个可交互的原型外壳。
  // 用"短边"判断手机，而不是宽度：横屏时宽度会到 800+ 但不该退回桌面原型。
  // 同时 (pointer:coarse) + hover:none 能把触屏设备和鼠标设备区分开。
  const MOBILE_QUERY = [
    '(max-width: 820px)',
    '(max-device-width: 820px)',
    '(display-mode: standalone)',
    '(display-mode: fullscreen)',
    '(display-mode: minimal-ui)',
  ].join(', ');
  const mobileMQ = window.matchMedia(MOBILE_QUERY);
  const installedMQ = window.matchMedia('(display-mode: standalone)');
  function applyStandalone() {
    const on = mobileMQ.matches;
    document.body.classList.toggle('standalone', on);
    // 已安装（无地址栏）时让内容顶到系统状态栏下面
    const installed = installedMQ.matches || window.navigator.standalone === true;
    document.body.classList.toggle('installed', installed);
  }
  applyStandalone();
  const onStandaloneChange = () => { applyStandalone(); syncNavSafe(); };
  if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', onStandaloneChange);
  else if (mobileMQ.addListener) mobileMQ.addListener(onStandaloneChange);
  if (installedMQ.addEventListener) installedMQ.addEventListener('change', onStandaloneChange);

  /* ---------------- 屏幕内导航键 / 手势条避让 ---------------- */
  // env(safe-area-inset-*) 在 display:standalone 下通常可靠，
  // 但部分安卓 WebView / 老版浏览器会给 0 —— 这时用实测兜底。
  const rootStyle = document.documentElement.style;
  function readInset(prop) {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;' +
      prop + ':env(safe-area-inset-bottom,0px);height:0';
    document.body.appendChild(probe);
    const v = parseFloat(getComputedStyle(probe).getPropertyValue(prop)) || 0;
    probe.remove();
    return v;
  }
  let navSafe = 0;
  var syncNavSafe = function () {
    if (!document.body.classList.contains('standalone')) {
      rootStyle.setProperty('--nav-safe', '0px');
      navSafe = 0;
      return;
    }
    let v = readInset('padding-bottom');
    // 兜底：三键导航/手势条吃掉的高度（仅当系统没告诉我们时启用，且限制在合理范围）
    if (v === 0 && window.visualViewport) {
      const vv = window.visualViewport;
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      if (gap > 0 && gap < 90) v = gap;
    }
    v = Math.max(0, Math.min(v, 60));
    navSafe = v;
    rootStyle.setProperty('--nav-safe', Math.round(v) + 'px');
  };

  // 键盘弹起 / 地址栏收放时，用 visualViewport 把输入条挪到可视区底部
  if (window.visualViewport) {
    const vv = window.visualViewport;
    const syncViewport = () => {
      const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      rootStyle.setProperty('--kb', Math.round(kb) + 'px');
      syncNavSafe();
    };
    vv.addEventListener('resize', syncViewport);
    vv.addEventListener('scroll', syncViewport);
    syncViewport();
  }
  window.addEventListener('resize', syncNavSafe);
  window.addEventListener('orientationchange', () => setTimeout(syncNavSafe, 260));
  syncNavSafe();

  /* ---------------- Service Worker（离线可用 + 可安装） ---------------- */
  // 仅在 https / localhost 下有意义；file:// 打开单文件版时自动跳过
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  /* ---------------- 安装到主屏 ---------------- */
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    const row = $('#installRow');
    if (row) row.hidden = false;
  });
  function doInstall() {
    if (deferredInstall) {
      deferredInstall.prompt();
      deferredInstall.userChoice.then(() => { deferredInstall = null; });
    } else {
      // Chrome 没给事件时，教用户手动添加
      openDialog({
        title: '添加到主屏幕',
        rawHTML: `<p style="font-size:12.5px;color:var(--ink-2);line-height:1.9;margin:4px 0 0">
          Chrome：<b>右上角 ⋮</b> → <b>添加到主屏幕 / 安装应用</b><br>
          Edge：<b>底部 …</b> → <b>添加到手机</b><br><br>
          装好后它会像真正的 App 一样：有自己的图标、全屏打开、离线也能用。</p>`,
        ok: '知道了',
      });
    }
  }

  /* ---------------- 桌面 App 模式开关 ---------------- */
  // 宽屏浏览器里默认进入全屏 App 形态（拆掉原型预览壳），
  // 右上角小按钮可在"App 模式 / 原型预览"之间切换，选择会被记住。
  const APPMODE_KEY = 'mini.appmode';
  const appModeBtn = $('#appModeBtn');
  function applyAppMode(on, silent) {
    document.body.classList.toggle('force-app', !!on);
    if (appModeBtn) appModeBtn.textContent = on ? '退出 App 模式' : 'App 模式';
    if (!silent) toast(on ? '已进入 App 模式' : '已返回原型预览');
  }
  let savedAppMode = null;
  try { savedAppMode = localStorage.getItem(APPMODE_KEY); } catch (e) {}
  applyAppMode(savedAppMode !== 'proto', true);
  if (appModeBtn) {
    appModeBtn.addEventListener('click', () => {
      const on = !document.body.classList.contains('force-app');
      applyAppMode(on);
      try { localStorage.setItem(APPMODE_KEY, on ? 'app' : 'proto'); } catch (e) {}
    });
  }

  /* ---------------- 启动 ---------------- */
  setTab('chat', false);
  save();

  // 首次进入的引导（只提示一次）
  setTimeout(() => {
    if (!localStorage.getItem('pillowtalk.greeted')) {
      toast('点右上角 + 创建第一个联系人');
      localStorage.setItem('pillowtalk.greeted', '1');
    }
  }, 800);

  // 让 1× 之外的速度在界面上即时生效
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
})();
