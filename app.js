// ============================================================
//  JUDO TRAINER — plain JavaScript, no install, no build step.
//  Sections: data · helpers · video · spaced repetition · filters ·
//  session builder · Library · Flashcards · Memory · Quiz · navigation
// ============================================================

// ---------- data ----------
const T = window.TECHNIQUES || [];
const NOTES = window.MY_NOTES || {};
T.forEach(t => { t.notes = NOTES[t.id] || ''; t.videos = t.videos || []; });
const byId = Object.fromEntries(T.map(t => [t.id, t]));
const GRADES = window.GRADES || [...new Set(T.map(t => t.grade))];
const DIFF = ['', 'Beginner', 'Intermediate', 'Advanced'];
// Belt colour shown next to each grade. Adjust to your federation's system.
const GRADE_COLOR = { '6th kyu': 'yellow', '5th kyu': 'orange', '4th kyu': 'green', '3rd kyu': 'blue', '2nd kyu': 'brown', '1st kyu': 'brown', '1st dan': 'black' };
const DAY = 864e5; // one day in milliseconds

// ---------- small helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uniq = a => [...new Set(a.filter(Boolean))];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pickOne = a => a[Math.random() * a.length | 0];
const plain = s => String(s).toLowerCase().replace(/[-\s]/g, ''); // "O-Soto" and "osoto" match
const hasVideo = t => t.videos.length > 0;
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }
};
const gradeTag = t => t.grade ? `<span class="tag belt belt-${GRADE_COLOR[t.grade] || 'none'}">${esc(t.grade)}</span>` : '';

// ---------- video ----------
// i: which of the technique's videos · play: autoplay muted on loop
// quiz: cover YouTube's title bar so it doesn't give away the answer
function media(t, { i = 0, play = false, quiz = false, full = false } = {}) {
  const c = !full && clipFor(t);
  if (play && c && t.videos[c.v]) return clipBox(t.videos[c.v].yt, c.start, c.end);
  const v = t.videos[i];
  if (!v) return `<div class="novideo">No video</div>`;
  if (v.src) return `<div class="vid"><video src="${esc(v.src)}" ${play ? 'autoplay muted loop' : ''} playsinline controls></video></div>`;
  const params = ['rel=0', 'playsinline=1', 'modestbranding=1'];
  if (play) params.push('autoplay=1', 'mute=1', 'loop=1', 'playlist=' + v.yt);
  if (quiz) params.push('controls=0');
  return `<div class="vid ${quiz ? 'hide-title' : ''}"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.yt)}?${params.join('&')}"
    title="${quiz ? 'Video' : esc(v.title)}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
}

// ---------- short clips: play only start–end of a YouTube video, on a loop ----------
// Clips come from my-clips.js (shared with everyone) plus ones you set in this browser
// with the clip editor (✂ in the library) and haven't exported yet.
let clipDrafts = store.get('judo-clip-drafts', {});
// Every technique plays 0:04–0:10 of its Kodokan video (or its first video) unless it has its own clip.
const DEFAULT_CLIP = { start: 4, end: 10 };
const defaultClip = t => {
  const i = Math.max(0, t.videos.findIndex(v => v.channel === 'KODOKAN'));
  return t.videos[i]?.yt ? { v: i, ...DEFAULT_CLIP } : null;
};
// your own clip: set in this browser (null = reset to default) or from my-clips.js
const customClip = t => (t.id in clipDrafts ? clipDrafts[t.id] : (window.MY_CLIPS || {})[t.id]) || null;
const clipFor = t => customClip(t) || defaultClip(t);
const clipBox = (yt, start, end) =>
  `<div class="vid clipbox"><div class="clip-slot" data-yt="${esc(yt)}" data-start="${start}" data-end="${end}"></div></div>`;

let ytReady; // loads YouTube's player script once, only when a clip is needed
function loadYT() {
  ytReady ??= new Promise(res => {
    if (window.YT?.Player) return res(window.YT);
    window.onYouTubeIframeAPIReady = () => res(window.YT);
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ytReady;
}

// Keeps a player looping between start and end; stops once the player has left the page.
// frame() returns the player's iframe (it only exists while the player is on screen).
function loopBetween(player, getStart, getEnd, frame) {
  let seen = false, ticks = 0;
  const timer = setInterval(() => {
    const f = frame();
    if (f) seen = true;
    if (!f && (seen || ++ticks > 200)) return clearInterval(timer); // card flipped back / page changed
    if (typeof player.getCurrentTime !== 'function') return; // player not ready yet
    const now = player.getCurrentTime(), s = getStart(), e = getEnd();
    if (now >= e - 0.15 || now < s - 0.5 || player.getPlayerState() === 0) { player.seekTo(s, true); player.playVideo(); }
  }, 100);
  return timer;
}

// Turns every clip placeholder on the page into a muted, looping, button-free player.
// Belt and braces: YouTube itself is told to stop at `end`, our timer loops it back to `start`,
// and if YouTube reports "ended" we restart it too.
let clipCount = 0;
async function mountClips() {
  const slots = $$('.clip-slot:not([data-mounted])');
  if (!slots.length) return;
  slots.forEach(el => { el.dataset.mounted = '1'; el.id = 'clip' + (++clipCount); });
  const YT = await loadYT();
  slots.forEach(el => {
    if (!document.body.contains(el)) return;
    const id = el.id, start = +el.dataset.start, end = +el.dataset.end;
    const restart = p => { p.seekTo(start, true); p.playVideo(); };
    const player = new YT.Player(el, {
      videoId: el.dataset.yt,
      playerVars: { start: Math.floor(start), end: Math.ceil(end), autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, iv_load_policy: 3, playsinline: 1 },
      events: {
        onReady: e => { e.target.mute(); restart(e.target); },
        onStateChange: e => { if (e.data === 0) restart(e.target); } // 0 = ended
      }
    });
    loopBetween(player, () => start, () => end, () => document.getElementById(id));
  });
}
new MutationObserver(mountClips).observe(document.getElementById('main'), { childList: true, subtree: true });

// ---------- spaced repetition (simplified SM-2, like classic Anki) ----------
// Each card stores: interval (days), ease (growth factor), reps, due (timestamp)
let srs = store.get('judo-srs', {});

function schedule(s = { interval: 0, ease: 2.5, reps: 0 }, r) { // r: 1 Again, 2 Hard, 3 Good, 4 Easy
  let { interval, ease, reps } = s;
  if (r === 1) { reps = 0; interval = 0; ease = Math.max(1.3, ease - 0.2); }
  else {
    if (r === 2) { interval = Math.max(1, interval * 1.2); ease = Math.max(1.3, ease - 0.15); }
    else if (reps === 0) interval = r === 4 ? 3 : 1;
    else if (reps === 1) interval = r === 4 ? 6 : 3;
    else interval = interval * ease * (r === 4 ? 1.3 : 1);
    if (r === 4) ease += 0.15;
    reps++;
  }
  interval = Math.round(interval * 10) / 10;
  return { interval, ease, reps, due: Date.now() + (r === 1 ? 60e3 : interval * DAY) };
}
function rate(id, r) { srs[id] = schedule(srs[id], r); store.set('judo-srs', srs); updateDue(); }
const isDue = id => srs[id] && srs[id].due <= Date.now();
function fmtInterval(s, r) {
  if (r === 1) return '1 min';
  const d = schedule(s, r).interval;
  return d < 30 ? Math.max(1, Math.round(d)) + ' d' : Math.round(d / 30) + ' mo';
}
function status(id) {
  const s = srs[id];
  if (!s) return 'new';
  if (s.due <= Date.now()) return 'due';
  return 'in ' + Math.ceil((s.due - Date.now()) / DAY) + ' d';
}
function updateDue() { $('#due').textContent = T.filter(t => isDue(t.id)).length + ' due'; }

// ---------- filters (shared by the library and every game) ----------
const filters = { q: '', category: '', subcategory: '', grade: '', maxDiff: 3 };
const excluded = new Set(); // techniques you unticked in the session builder

// ignoreGroup: apply everything except the group (used for the counts on the group boxes)
function applyFilters({ ignoreGroup = false } = {}) {
  const q = plain(filters.q);
  return T.filter(t =>
    (!q || plain([t.name, t.translation, t.kanji, t.notes].join(' ')).includes(q)) &&
    (!filters.category || t.category === filters.category) &&
    (ignoreGroup || !filters.subcategory || t.subcategory === filters.subcategory) &&
    (!filters.grade || GRADES.indexOf(t.grade) <= GRADES.indexOf(filters.grade)) &&
    t.difficulty <= filters.maxDiff);
}

// groups = false leaves out the category/group dropdowns (the library uses boxes for those)
function filterBar(groups = true) {
  const cats = uniq(T.map(t => t.category));
  const subs = uniq(T.filter(t => !filters.category || t.category === filters.category).map(t => t.subcategory));
  const grades = GRADES.filter(g => T.some(t => t.grade === g));
  const opt = (arr, sel, all, label = v => v) => `<option value="">${all}</option>` +
    arr.map(v => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(label(v))}</option>`).join('');
  return `<div class="filters">
    <input type="search" data-f="q" placeholder="Search name, English, kanji…" value="${esc(filters.q)}">
    ${groups ? `<select data-f="category">${opt(cats, filters.category, 'All categories')}</select>
    <select data-f="subcategory">${opt(subs, filters.subcategory, 'All groups')}</select>` : ''}
    <select data-f="grade">${opt(grades, filters.grade, 'All grades', g => 'Up to ' + g)}</select>
    <select data-f="maxDiff">${[3, 2, 1].map(n => `<option value="${n}" ${n === filters.maxDiff ? 'selected' : ''}>${['', 'Beginner only', 'Up to intermediate', 'All levels'][n]}</option>`).join('')}</select>
  </div>`;
}

// draw(full): full = true also redraws the filter bar (needed when the group list changes)
function bindFilters(root, draw) {
  $$('.fbar [data-f]', root).forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
    const k = el.dataset.f;
    filters[k] = k === 'maxDiff' ? +el.value : el.value;
    if (k === 'category') filters.subcategory = '';
    draw(k === 'category');
  }));
}

// ---------- session builder: pick which cards a game may use ----------
// need(t, opts) → false greys out techniques the chosen mode can't use
function builder(root, { title, extra = '', min = 1, need = () => true, onStart }) {
  root.innerHTML = `<h2>${title}</h2><div class="opts">${extra}</div><div class="fbar"></div>
    <div class="row"><button class="ghost" data-a="all">Select all</button><button class="ghost" data-a="none">Select none</button><span class="muted count"></span></div>
    <div class="pick"></div>
    <button class="primary start">Start</button>`;
  const getOpts = () => Object.fromEntries($$('.opts [name]', root).map(el => [el.name, el.value]));
  const pool = () => { const o = getOpts(); return applyFilters().filter(t => !excluded.has(t.id) && need(t, o)); };
  const count = () => {
    const n = pool().length;
    $('.count', root).textContent = `${n} selected` + (n < min ? ` (need at least ${min})` : '');
    $('.start', root).disabled = n < min;
  };
  const draw = full => {
    if (full) { $('.fbar', root).innerHTML = filterBar(); bindFilters(root, draw); }
    const o = getOpts();
    $('.pick', root).innerHTML = applyFilters().map(t =>
      `<label class="chip ${need(t, o) ? '' : 'off'}" title="${need(t, o) ? esc(t.translation) : 'Not usable in this mode'}"><input type="checkbox" value="${t.id}" ${excluded.has(t.id) ? '' : 'checked'}>${esc(t.name)}</label>`).join('');
    count();
  };
  root.onchange = e => {
    if (e.target.matches('.pick input')) { e.target.checked ? excluded.delete(e.target.value) : excluded.add(e.target.value); count(); }
    else if (e.target.closest('.opts')) draw(false);
  };
  $('[data-a=all]', root).onclick = () => { applyFilters().forEach(t => excluded.delete(t.id)); draw(false); };
  $('[data-a=none]', root).onclick = () => { applyFilters().forEach(t => excluded.add(t.id)); draw(false); };
  $('.start', root).onclick = () => { root.onchange = null; onStart(pool(), getOpts()); };
  draw(true);
}

// ============================================================
//  LIBRARY
// ============================================================

// Text and colours for categories and groups. Edit freely.
const CAT_INFO = {
  'Nage-Waza': { kanji: '投技', en: 'Throwing techniques', text: 'All standing throws. Tori breaks uke\'s balance (kuzushi), fits in (tsukuri) and executes the throw (kake). The groups are sorted by what does most of the work: hands, hips, legs, or a sacrifice fall.' },
  'Katame-Waza': { kanji: '固技', en: 'Grappling techniques', text: 'Groundwork. Holding uke on their back (osaekomi), strangles (shime) and joint locks (kansetsu): the techniques that decide the fight on the mat.' },
};
const SUB_INFO = {
  'Te-Waza': { kanji: '手技', en: 'Hand techniques', color: '#e0604a' },
  'Koshi-Waza': { kanji: '腰技', en: 'Hip techniques', color: '#d67f35' },
  'Ashi-Waza': { kanji: '足技', en: 'Foot and leg techniques', color: '#3d8a5b' },
  'Ma-Sutemi-Waza': { kanji: '真捨身技', en: 'Rear sacrifice techniques', color: '#7b5ca8' },
  'Yoko-Sutemi-Waza': { kanji: '横捨身技', en: 'Side sacrifice techniques', color: '#2b8a99' },
  'Osaekomi-Waza': { kanji: '抑込技', en: 'Pins and hold-downs', color: '#3b6db3' },
  'Shime-Waza': { kanji: '絞技', en: 'Strangles', color: '#a8436a' },
  'Kansetsu-Waza': { kanji: '関節技', en: 'Joint locks', color: '#86673a' },
};
const subInfo = s => SUB_INFO[s] || { kanji: '', en: '', color: '#6b7280' };
// traditional order (as listed above); anything unknown goes last
const orderOf = (list, v) => { const i = list.indexOf(v); return i < 0 ? 99 : i; };
const byOrder = keys => (a, b) => orderOf(keys, a) - orderOf(keys, b);
const bySubThenName = (a, b) => orderOf(Object.keys(SUB_INFO), a.subcategory) - orderOf(Object.keys(SUB_INFO), b.subcategory) || a.name.localeCompare(b.name);
let libScroll = 0; // remembers where you were in the list

function statusTag(t) {
  const s = status(t.id);
  return s === 'new' ? '' : `<span class="tag st-${s.split(' ')[0]}">${s}</span>`;
}

function card(t) {
  return `<button class="tcard" data-id="${t.id}" style="--c:${subInfo(t.subcategory).color}">
    <span class="tc-top"><span class="tpill">${esc(t.subcategory)}</span><span class="tc-kanji">${esc(t.kanji)}</span></span>
    <span class="tc-body">
      <span class="tc-name">${esc(t.name)}</span>
      <span class="muted small">${esc(t.translation)}</span>
      <span class="tags">${gradeTag(t)}<span class="tag d${t.difficulty}">${DIFF[t.difficulty]}</span>${statusTag(t)}${customClip(t) ? '<span class="tag">✂ own clip</span>' : ''}</span>
    </span>
  </button>`;
}

function library(root) {
  const nClips = Object.keys(allClips()).length, nDrafts = Object.keys(clipDrafts).length;
  root.innerHTML = `${nDrafts ? `<div class="clipbar">✂ ${nClips} of ${T.length} techniques have their own clip · ${nDrafts} change${nDrafts > 1 ? 's' : ''} only saved in this browser <button data-export>Export for my-clips.js</button></div>` : ''}<div class="lib-top"></div><div class="fbar"></div><h3 class="lib-h"></h3><div class="cards"></div>`;
  const draw = () => {
    const cat = filters.category, sub = filters.subcategory, info = CAT_INFO[cat];
    const cats = uniq(T.map(t => t.category)).sort(byOrder(Object.keys(CAT_INFO)));
    const subs = uniq(T.filter(t => !cat || t.category === cat).map(t => t.subcategory)).sort(byOrder(Object.keys(SUB_INFO)));
    const base = applyFilters({ ignoreGroup: true });
    $('.lib-top', root).innerHTML = `
      <div class="cattabs">${['', ...cats].map(c =>
        `<button class="ctab ${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${c ? `${esc(c)} <span class="k">${esc(CAT_INFO[c]?.kanji || '')}</span>` : 'All'}</button>`).join('')}</div>
      <h2 class="cat-title">${cat ? esc(cat) : 'All techniques'}${info ? ` <span class="k">${info.kanji}</span>` : ''}</h2>
      ${info ? `<p class="cat-en">${info.en}</p>` : ''}
      <p class="cat-text">${info ? info.text : 'Pick a category above, or a group below, to narrow it down.'}</p>
      <div class="subboxes">${subs.map(s => {
        const i = subInfo(s), n = base.filter(t => t.subcategory === s).length;
        return `<button class="subbox ${s === sub ? 'on' : ''}" data-sub="${esc(s)}" style="--c:${i.color}">
          <span><b>${esc(s)}</b> <span class="k">${i.kanji}</span></span>
          <span class="muted small">${esc(i.en)} · ${n} technique${n === 1 ? '' : 's'}</span></button>`;
      }).join('')}</div>`;
    const list = applyFilters().sort(bySubThenName);
    $('.lib-h', root).textContent = `${sub || cat || 'All'} techniques (${list.length})`;
    $('.cards', root).innerHTML = list.map(card).join('') || '<p class="muted">Nothing matches these filters.</p>';
  };
  root.onclick = e => {
    const c = e.target.closest('[data-cat]'), s = e.target.closest('[data-sub]'), t = e.target.closest('.tcard');
    if (c) { filters.category = c.dataset.cat; filters.subcategory = ''; draw(); }
    else if (s) {
      filters.subcategory = filters.subcategory === s.dataset.sub ? '' : s.dataset.sub; // click again to deselect
      if (filters.subcategory) filters.category = T.find(x => x.subcategory === filters.subcategory).category;
      draw();
    }
    else if (t) { libScroll = window.scrollY; showDetail(root, t.dataset.id); }
    else if (e.target.closest('[data-export]')) exportClips();
  };
  $('.fbar', root).innerHTML = filterBar(false);
  bindFilters(root, draw);
  draw();
}

// ---------- one technique on its own page ----------
function showDetail(root, id) {
  const t = byId[id], i = subInfo(t.subcategory);
  let curV = clipFor(t)?.v ?? 0; // which video the tabs are on
  root.innerHTML = `
    <div class="crumbs">
      <button class="ghost back">← Back</button>
      <span class="muted small"><a href="#" data-crumb="">Techniques</a> › <a href="#" data-crumb="${esc(t.category)}">${esc(t.category)}</a> › <a href="#" data-crumb="${esc(t.category)}|${esc(t.subcategory)}">${esc(t.subcategory)}</a></span>
    </div>
    <div class="hero" style="--c:${i.color}">
      <span class="hero-k">${esc(t.kanji)}</span>
      <span class="tpill">${esc(t.subcategory)} · ${esc(i.en)}</span>
      <h2>${esc(t.name)}</h2>
      <p>${esc(t.translation)}</p>
    </div>
    <div class="tags hero-tags">${gradeTag(t)}<span class="tag d${t.difficulty}">${DIFF[t.difficulty]}</span>${statusTag(t)}</div>
    <div class="detail">${detail(t)}</div>`;
  window.scrollTo(0, 0);
  const redraw = () => { $('.detail', root).innerHTML = detail(t); curV = clipFor(t)?.v ?? 0; };
  root.onclick = e => {
    const vt = e.target.closest('.vt[data-v]'), go = e.target.closest('[data-go]'), crumb = e.target.closest('[data-crumb]');
    if (vt) {
      $('.clip-editor', root).innerHTML = '';
      if (vt.dataset.v === 'clip') $('.player', root).innerHTML = media(t, { play: true });
      else { curV = +vt.dataset.v; $('.player', root).innerHTML = media(t, { i: curV, full: true }); }
      $$('.vt', root).forEach(b => b.classList.toggle('on', b === vt));
    }
    else if (e.target.closest('[data-edit]')) clipEditor(root, t, curV, redraw);
    else if (e.target.closest('[data-export]')) exportClips();
    else if (go) showDetail(root, go.dataset.go);
    else if (e.target.closest('.back')) { library(root); window.scrollTo(0, libScroll); }
    else if (crumb) {
      e.preventDefault();
      const [cat = '', sub = ''] = crumb.dataset.crumb.split('|');
      Object.assign(filters, { category: cat, subcategory: sub });
      library(root); window.scrollTo(0, 0);
    }
  };
}

// ---------- clip editor: pick start and end of a video ----------
function clipEditor(root, t, vi, done) {
  const box = $('.clip-editor', root), v = t.videos[vi], old = clipFor(t);
  let start = old?.v === vi ? old.start : DEFAULT_CLIP.start, end = old?.v === vi ? old.end : DEFAULT_CLIP.end, player, timer = null;
  const r1 = x => Math.max(0, Math.round(x * 10) / 10);
  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  $('.player', root).innerHTML = ''; // only one player at a time
  box.innerHTML = `
    <div class="ed-head"><b>✂ Clip editor</b> <span class="muted small">${esc(v.channel)} · ${esc(v.title)}</span></div>
    <div class="vid"><div id="ed-player"></div></div>
    <p class="muted small">Default is 0:04–0:10. Play the video and pause where the technique starts, then press <b>Set start</b>. Do the same for the end. 3–6 seconds works best.</p>
    <div class="ed-grid">
      <button data-ed="start">Set start</button><button data-ed="s-">−0.5 s</button><b class="ed-s"></b><button data-ed="s+">+0.5 s</button>
      <button data-ed="end">Set end</button><button data-ed="e-">−0.5 s</button><b class="ed-e"></b><button data-ed="e+">+0.5 s</button>
    </div>
    <div class="row">
      <button data-ed="preview">▶ Preview loop</button>
      <button class="primary" data-ed="save">Save clip</button>
      ${customClip(t) ? '<button data-ed="remove">Reset to default (0:04–0:10)</button>' : ''}
      <button class="ghost" data-ed="close">Close</button>
    </div>
    <p class="ed-msg small"></p>`;
  const msg = m => $('.ed-msg', box).innerHTML = m;
  const show = () => { $('.ed-s', box).textContent = fmt(start); $('.ed-e', box).textContent = fmt(end); };
  const stopPreview = () => { clearInterval(timer); timer = null; $('[data-ed=preview]', box).textContent = '▶ Preview loop'; };
  loadYT().then(YT => {
    player = new YT.Player('ed-player', { videoId: v.yt,
      playerVars: { start: Math.floor(start), rel: 0, playsinline: 1, iv_load_policy: 3 } });
  });
  box.onclick = e => {
    const a = e.target.closest('[data-ed]')?.dataset.ed;
    if (!a) return;
    e.stopPropagation();
    const now = () => r1(player?.getCurrentTime?.() ?? 0);
    if (a === 'start') start = now();
    if (a === 'end') end = now();
    if (a === 's-') start = r1(start - 0.5);
    if (a === 's+') start = r1(start + 0.5);
    if (a === 'e-') end = r1(end - 0.5);
    if (a === 'e+') end = r1(end + 0.5);
    if (a === 'preview') {
      if (timer) { stopPreview(); player?.pauseVideo(); }
      else if (player?.seekTo) { player.seekTo(start, true); player.playVideo(); timer = loopBetween(player, () => start, () => end, () => document.getElementById('ed-player')); e.target.textContent = '⏸ Stop preview'; }
    }
    if (a === 'save') {
      if (end - start < 0.5) return msg('⚠️ The end must be at least half a second after the start.');
      clipDrafts[t.id] = { v: vi, start, end };
      store.set('judo-clip-drafts', clipDrafts);
      stopPreview(); done();
      msgAfter(root, `✓ Clip saved in this browser (${fmt(end - start)} long). When you're done with several, <button class="linkbtn" data-export>export them</button> into my-clips.js.`);
      return;
    }
    if (a === 'remove') {
      clipDrafts[t.id] = null; // null = removed (also overrides my-clips.js)
      store.set('judo-clip-drafts', clipDrafts);
      stopPreview(); done(); msgAfter(root, 'Back to the default clip (0:04–0:10). <button class="linkbtn" data-export>Export</button> to make it permanent.');
      return;
    }
    if (a === 'close') { stopPreview(); done(); return; }
    show();
    if (end <= start) msg('⚠️ The end is before the start.'); else msg(`Clip length: ${(end - start).toFixed(1)} s`);
  };
  show();
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function msgAfter(root, html) { const p = $('.player', root); p.insertAdjacentHTML('afterend', `<p class="mynote small">${html}</p>`); }

// ---------- export: turns all clips into the contents of my-clips.js ----------
function allClips() {
  const all = { ...(window.MY_CLIPS || {}) };
  for (const [id, c] of Object.entries(clipDrafts)) c ? all[id] = c : delete all[id];
  return all;
}
function exportClips() {
  const all = allClips();
  const text = `// Your own clips, made with the clip editor (✂ in the library).\n` +
    `// Techniques not listed here play 0:04–0:10 of their Kodokan video.\n` +
    `// v = which video (0 = first), start/end = seconds into that video.\n` +
    `window.MY_CLIPS = {\n${Object.keys(all).sort().map(id =>
      `  "${id}": { v: ${all[id].v}, start: ${all[id].start}, end: ${all[id].end} },`).join('\n')}\n};\n`;
  const d = document.createElement('div');
  d.className = 'overlay';
  d.innerHTML = `<div class="card modal">
    <h2>Export clips (${Object.keys(all).length})</h2>
    <p>Replace everything in <b>my-clips.js</b> with this text, then commit and push. After that, everyone gets your clips.</p>
    <textarea readonly>${esc(text)}</textarea>
    <div class="row"><button class="primary" data-x="copy">Copy</button><button class="ghost" data-x="close">Close</button></div>
    <p class="small muted">After pushing, you can <button class="linkbtn" data-x="clear">clear this browser's drafts</button> so it uses the file again.</p>
    <p class="small x-msg"></p></div>`;
  document.body.appendChild(d);
  d.onclick = async e => {
    const x = e.target.dataset.x, say = m => $('.x-msg', d).textContent = m;
    if (e.target === d || x === 'close') d.remove();
    if (x === 'copy') {
      try { await navigator.clipboard.writeText(text); } catch { $('textarea', d).select(); document.execCommand('copy'); }
      say('Copied ✓ Now paste it into my-clips.js.');
    }
    if (x === 'clear') { clipDrafts = {}; store.set('judo-clip-drafts', clipDrafts); say('Drafts cleared. This browser now uses my-clips.js.'); }
  };
}

function detail(t) {
  const link = id => byId[id] ? `<button class="chip link" data-go="${id}">${esc(byId[id].name)}</button>` : '';
  const links = (label, ids) => ids?.length ? `<div class="links"><span class="muted">${label}</span>${ids.map(link).join('')}</div>` : '';
  const sec = (title, html) => html ? `<details class="sec"><summary>${title}</summary><div>${html}</div></details>` : '';
  const ul = items => items.length ? `<ul>${items.join('')}</ul>` : '';
  const clip = clipFor(t);
  return `
    <div class="player">${clip ? media(t, { play: true }) : media(t)}</div>
    <div class="vtabs">
      ${clip ? `<button class="vt on" data-v="clip">✂ Clip</button>` : ''}
      ${t.videos.map((v, i) => `<button class="vt ${!clip && !i ? 'on' : ''}" data-v="${i}" title="${esc(v.title)}">${esc(v.channel || 'Video ' + (i + 1))}</button>`).join('')}
      ${t.videos.some(v => v.yt) ? `<button class="vt edit" data-edit>✂ Adjust clip</button>` : ''}
    </div>
    <div class="clip-editor"></div>
    ${t.notes ? `<p class="mynote">📝 ${esc(t.notes)}</p>` : ''}
    <p>${esc(t.overview)}</p>
    ${sec('Kuzushi · Tsukuri · Kake', t.phases.map(p => `<p><b>${esc(p.label)}</b><br>${esc(p.text)}</p>`).join(''))}
    ${sec('Step by step', t.steps.length ? `<ol>${t.steps.map(s => `<li><b>${esc(s.title)}</b><br>${esc(s.text)}</li>`).join('')}</ol>` : '')}
    ${sec('Key principles', ul(t.principles.map(p => `<li>${esc(p)}</li>`)))}
    ${sec('Common mistakes', ul(t.mistakes.map(m => `<li><b>✗ ${esc(m.mistake)}</b><br>✓ ${esc(m.fix)}</li>`)))}
    ${sec('When to use', t.when ? `<p>${esc(t.when)}</p>` : '')}
    ${links('Set up with', t.setups)}${links('Follow up with', t.followUps)}${links('Countered by', t.counters)}${links('Related', t.related)}
    <p class="muted small">Taught at ${esc(t.grades.join(', ') || '—')}
      ${t.source ? ` · Source: <a href="${esc(t.source)}" target="_blank" rel="noopener">judolearn.com</a>` : ''}</p>`;
}

// ============================================================
//  FLASHCARDS (spaced repetition)
// ============================================================
function flashcards(root) {
  builder(root, {
    title: 'Flashcards',
    extra: `<label>Show <select name="mode">
              <option value="translation">English → Japanese name</option>
              <option value="kanji">Kanji → Japanese name</option>
              <option value="video">Video → Japanese name</option>
              <option value="name">Japanese name → picture it</option></select></label>
            <label>New cards <select name="newLimit"><option>5</option><option selected>10</option><option>20</option><option value="999">All</option></select></label>`,
    need: (t, o) => o.mode !== 'video' || hasVideo(t),
    onStart: (pool, o) => {
      const due = pool.filter(t => isDue(t.id)).sort((a, b) => srs[a.id].due - srs[b.id].due);
      const fresh = shuffle(pool.filter(t => !srs[t.id])).slice(0, +o.newLimit);
      const queue = [...due, ...fresh];
      if (queue.length) return runFlash(root, queue, o);
      const next = Math.min(...pool.map(t => srs[t.id]?.due ?? Infinity));
      root.innerHTML = `<div class="card center"><h2>Nothing due 🎉</h2>
        <p class="muted">${isFinite(next) ? 'Next card due ' + new Date(next).toLocaleDateString() : ''}</p>
        <button class="primary cram">Practice all selected anyway</button> <button class="ghost" onclick="go('flashcards')">Back</button></div>`;
      $('.cram', root).onclick = () => runFlash(root, shuffle(pool), o);
    }
  });
}

function runFlash(root, queue, o) {
  let done = 0, revealed = false;
  const show = () => {
    const t = queue[0];
    if (!t) {
      document.onkeydown = null;
      root.innerHTML = `<div class="card center"><h2>Session done 🥋</h2><p>${done} reviews</p><button class="primary" onclick="go('flashcards')">Back</button></div>`;
      return;
    }
    revealed = false;
    const front = {
      video: media(t, { play: true, quiz: true }),
      translation: `<p class="big">${esc(t.translation)}</p>`,
      kanji: `<p class="big kanji-big">${esc(t.kanji)}</p>`,
      name: `<p class="big">${esc(t.name)}</p><p class="muted center">Picture the technique, then check.</p>`
    }[o.mode];
    root.innerHTML = `<p class="muted">${queue.length} left · ${srs[t.id] ? 'review' : 'new card'}</p>
      <div class="card">${front}<div class="back"></div></div>
      <div class="actions"><button class="primary reveal">Show answer <kbd>Space</kbd></button></div>`;
    $('.reveal', root).onclick = reveal;
  };
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    const t = queue[0];
    $('.back', root).innerHTML = `<hr><h2>${esc(t.name)} <span class="muted">${esc(t.kanji)}</span></h2>
      <p>${esc(t.translation)} · ${esc(t.subcategory)} · ${DIFF[t.difficulty]}</p>
      ${o.mode !== 'video' ? media(t, { play: true }) : ''}
      ${t.notes ? `<p class="mynote">📝 ${esc(t.notes)}</p>` : ''}
      ${t.principles.length ? `<ul class="small">${t.principles.slice(0, 3).map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}`;
    $('.actions', root).innerHTML = ['Again', 'Hard', 'Good', 'Easy'].map((l, i) =>
      `<button class="rate r${i + 1}" data-r="${i + 1}">${l} <kbd>${i + 1}</kbd><small>${fmtInterval(srs[t.id], i + 1)}</small></button>`).join('');
    $$('.rate', root).forEach(b => b.onclick = () => answer(+b.dataset.r));
  };
  const answer = r => {
    const t = queue.shift();
    rate(t.id, r);
    done++;
    if (r === 1) queue.push(t); // "Again" → comes back at the end of this session
    show();
  };
  document.onkeydown = e => {
    if (e.target.matches('input, select')) return;
    if (e.code === 'Space') { e.preventDefault(); reveal(); }
    else if (revealed && ['1', '2', '3', '4'].includes(e.key)) answer(+e.key);
  };
  show();
}

// ============================================================
//  MEMORY
// ============================================================
function memory(root) {
  builder(root, {
    title: 'Memory', min: 2,
    extra: `<label>Pairs <select name="pair">
              <option value="video">Japanese name ↔ video</option>
              <option value="translation">Japanese name ↔ English</option>
              <option value="kanji">Japanese name ↔ kanji</option></select></label>
            <label>Number of pairs <select name="n"><option>4</option><option selected>6</option><option>8</option><option>10</option><option>12</option></select></label>`,
    need: (t, o) => o.pair !== 'video' || hasVideo(t),
    onStart: (pool, o) => runMemory(root, shuffle(pool).slice(0, +o.n), o)
  });
}

function runMemory(root, picks, o) {
  const cards = shuffle(picks.flatMap(t => [{ id: t.id, side: 'a' }, { id: t.id, side: 'b' }]));
  let open = [], moves = 0, found = 0, lock = false;
  const face = c => {
    const t = byId[c.id];
    if (c.side === 'a') return `<b>${esc(t.name)}</b>`;
    if (o.pair === 'video') return media(t, { play: true, quiz: true });
    if (o.pair === 'kanji') return `<span class="kanji-card">${esc(t.kanji)}</span>`;
    return `<span>${esc(t.translation)}</span>`;
  };
  root.innerHTML = `<p class="muted mstat"></p>
    <div class="grid ${o.pair === 'video' ? 'wide' : ''}">${cards.map((c, i) => `<div class="mcard" role="button" tabindex="0" data-i="${i}"><span class="face"></span></div>`).join('')}</div>`;
  const stat = () => $('.mstat', root).textContent = `Moves: ${moves} · Pairs: ${found}/${picks.length}`;
  stat();
  root.onclick = e => {
    const b = e.target.closest('.mcard');
    if (!b || lock || b.classList.contains('up')) return;
    const c = cards[b.dataset.i];
    b.classList.add('up');
    $('.face', b).innerHTML = face(c);
    open.push([b, c]);
    if (open.length < 2) return;
    moves++;
    const [[b1, c1], [b2, c2]] = open;
    open = [];
    if (c1.id === c2.id) {
      b1.classList.add('done'); b2.classList.add('done'); found++; stat();
      if (found === picks.length) setTimeout(() => {
        root.onclick = null;
        root.insertAdjacentHTML('beforeend', `<div class="card center"><h2>Done in ${moves} moves 🥋</h2><button class="primary" onclick="go('memory')">Play again</button></div>`);
      }, 400);
    } else {
      stat(); lock = true;
      setTimeout(() => { [b1, b2].forEach(x => { x.classList.remove('up'); $('.face', x).innerHTML = ''; }); lock = false; },
        o.pair === 'video' ? 2500 : 1100); // videos stay open a bit longer
    }
  };
}

// ============================================================
//  QUIZ (multiple choice)
// ============================================================
function quiz(root) {
  builder(root, {
    title: 'Quiz', min: 4,
    extra: `<label>Question <select name="type">
              <option value="translation">English → Japanese name</option>
              <option value="kanji">Kanji → Japanese name</option>
              <option value="video">Video → Japanese name</option>
              <option value="group">Japanese name → group</option>
              <option value="counter">Which technique counters it?</option></select></label>
            <label>Questions <select name="n"><option>5</option><option selected>10</option><option>20</option></select></label>`,
    need: (t, o) => o.type === 'video' ? hasVideo(t) : o.type === 'counter' ? t.counters.some(id => byId[id]) : true,
    onStart: (pool, o) => runQuiz(root, pool, o)
  });
}

function runQuiz(root, pool, o) {
  let order = [];
  while (order.length < +o.n) order.push(...shuffle(pool));
  order = order.slice(0, +o.n);
  let i = 0, score = 0;
  const missed = [];
  // wrong answers: techniques from the same group first, so it's not too easy
  const distractors = (t, exclude) => {
    const others = T.filter(x => !exclude.includes(x.name));
    return uniq([...shuffle(others.filter(x => x.subcategory === t.subcategory)), ...shuffle(others)].map(x => x.name));
  };
  const next = () => {
    if (i >= order.length) {
      root.innerHTML = `<div class="card center"><h2>${score} / ${order.length}</h2>
        ${missed.length ? `<p>Worth another look: ${uniq(missed).map(esc).join(', ')}</p>` : '<p>Perfect! 🥋</p>'}
        <button class="primary" onclick="go('quiz')">Again</button></div>`;
      return;
    }
    const t = order[i];
    let prompt, right, wrong;
    if (o.type === 'group') {
      prompt = `<p class="big">${esc(t.name)}</p><p class="muted center">Which group?</p>`;
      right = t.subcategory;
      const subs = uniq(T.map(x => x.subcategory)).filter(s => s !== right);
      const sameCat = uniq(T.filter(x => x.category === t.category).map(x => x.subcategory));
      wrong = uniq([...shuffle(subs.filter(s => sameCat.includes(s))), ...shuffle(subs)]);
    } else if (o.type === 'counter') {
      const counters = t.counters.filter(id => byId[id]).map(id => byId[id].name);
      prompt = `<p class="big">${esc(t.name)}</p><p class="muted center">Which of these is a counter to it?</p>`;
      right = pickOne(counters);
      wrong = shuffle(T.filter(x => x.id !== t.id && !counters.includes(x.name))).map(x => x.name);
    } else {
      prompt = { video: media(t, { play: true, quiz: true }), kanji: `<p class="big kanji-big">${esc(t.kanji)}</p>`, translation: `<p class="big">${esc(t.translation)}</p>` }[o.type];
      right = t.name;
      wrong = distractors(t, [t.name]);
    }
    const options = shuffle([right, ...wrong.slice(0, 3)]);
    root.innerHTML = `<p class="muted">Question ${i + 1} / ${order.length} · Score ${score}</p>
      <div class="card">${prompt}</div>
      <div class="choices">${options.map(x => `<button class="choice">${esc(x)}</button>`).join('')}</div>`;
    $$('.choice', root).forEach(b => b.onclick = () => {
      const ok = b.textContent === right;
      if (ok) score++; else missed.push(t.name);
      $$('.choice', root).forEach(x => { x.disabled = true; if (x.textContent === right) x.classList.add('ok'); });
      if (!ok) b.classList.add('bad');
      i++;
      setTimeout(next, ok ? 800 : 1800);
    });
  };
  next();
}

// ============================================================
//  NAVIGATION
// ============================================================
const views = { library, flashcards, memory, quiz };
function go(name) {
  const main = $('#main');
  main.onclick = main.onchange = null;
  document.onkeydown = null;
  $$('nav button').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  views[name](main);
  updateDue();
}
$$('nav button').forEach(b => b.onclick = () => go(b.dataset.view));
go('library');
