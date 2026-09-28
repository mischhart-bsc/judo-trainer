// ============================================================
//  JUDO TRAINER — plain JavaScript, no install, no build step.
//  Sections: helpers · spaced repetition · filters · session
//  builder · Library · Flashcards · Memory · Quiz · navigation
// ============================================================

const T = window.TECHNIQUES || [];
const byId = Object.fromEntries(T.map(t => [t.id, t]));
const BELTS = ['white', 'yellow', 'orange', 'green', 'blue', 'brown', 'black'];
const DAY = 864e5; // one day in milliseconds

// ---------- small helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uniq = a => [...new Set(a.filter(Boolean))];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } }
};

// Video: empty → placeholder, YouTube link → embed, anything else → <video>
function media(t, small = false) {
  const v = t.video || '';
  if (!v) return `<div class="novideo">No video yet</div>`;
  const yt = v.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  if (yt) return `<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=${small ? 0 : 1}" allow="autoplay; fullscreen" loading="lazy"></iframe></div>`;
  return `<div class="vid"><video src="${esc(v)}" autoplay loop muted playsinline ${small ? '' : 'controls'}></video></div>`;
}

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
const filters = { q: '', category: '', subcategory: '', belt: '', maxDiff: 5 };
const excluded = new Set(); // techniques you unticked in the session builder

function applyFilters() {
  const q = filters.q.toLowerCase();
  return T.filter(t =>
    (!q || (t.name + ' ' + t.translation + ' ' + t.notes).toLowerCase().includes(q)) &&
    (!filters.category || t.category === filters.category) &&
    (!filters.subcategory || t.subcategory === filters.subcategory) &&
    (!filters.belt || BELTS.indexOf(t.belt) <= BELTS.indexOf(filters.belt)) &&
    t.difficulty <= filters.maxDiff);
}

function filterBar() {
  const cats = uniq(T.map(t => t.category));
  const subs = uniq(T.filter(t => !filters.category || t.category === filters.category).map(t => t.subcategory));
  const belts = BELTS.filter(b => T.some(t => t.belt === b));
  const opt = (arr, sel, all) => `<option value="">${all}</option>` + arr.map(v => `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
  return `<div class="filters">
    <input type="search" data-f="q" placeholder="Search…" value="${esc(filters.q)}">
    <select data-f="category">${opt(cats, filters.category, 'All categories')}</select>
    <select data-f="subcategory">${opt(subs, filters.subcategory, 'All groups')}</select>
    <select data-f="belt">${opt(belts, filters.belt, 'All belts')}</select>
    <select data-f="maxDiff">${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === filters.maxDiff ? 'selected' : ''}>Difficulty ≤ ${n}</option>`).join('')}</select>
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
// need(t, opts) → false greys out techniques the game can't use (e.g. no video)
function builder(root, { title, extra = '', min = 1, need = () => true, onStart }) {
  root.innerHTML = `<h2>${title}</h2><div class="fbar"></div>
    <div class="row"><button class="ghost" data-a="all">Select all</button><button class="ghost" data-a="none">Select none</button><span class="muted count"></span></div>
    <div class="pick"></div>
    <div class="opts">${extra}</div>
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
      `<label class="chip ${need(t, o) ? '' : 'off'}" title="${need(t, o) ? '' : 'Not usable in this mode'}"><input type="checkbox" value="${t.id}" ${excluded.has(t.id) ? '' : 'checked'}>${esc(t.name)}</label>`).join('');
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
function library(root) {
  root.innerHTML = `<div class="fbar"></div><p class="muted count"></p><div class="list"></div>`;
  const draw = full => {
    if (full) { $('.fbar', root).innerHTML = filterBar(); bindFilters(root, draw); }
    const list = applyFilters();
    $('.count', root).textContent = `${list.length} of ${T.length} techniques`;
    $('.list', root).innerHTML = list.map(t => `
      <details data-id="${t.id}">
        <summary>
          <span><b>${esc(t.name)}</b> <span class="muted">${esc(t.translation)}</span></span>
          <span class="tags">
            <span class="tag">${esc(t.subcategory)}</span>
            <span class="tag belt belt-${t.belt}">${t.belt}</span>
            <span class="tag" title="Difficulty">${'●'.repeat(t.difficulty)}${'○'.repeat(5 - t.difficulty)}</span>
            <span class="tag st-${status(t.id).split(' ')[0]}">${status(t.id)}</span>
          </span>
        </summary>
        <div class="body"><div class="m"></div><p>${esc(t.notes)}</p><p class="muted">${esc(t.category)} › ${esc(t.subcategory)}</p></div>
      </details>`).join('');
    // load a video only while its entry is open (keeps the page fast)
    $$('details', root).forEach(d => d.ontoggle = () => { $('.m', d).innerHTML = d.open ? media(byId[d.dataset.id]) : ''; });
  };
  draw(true);
}

// ============================================================
//  FLASHCARDS (spaced repetition)
// ============================================================
function flashcards(root) {
  builder(root, {
    title: 'Flashcards',
    extra: `<label>Show <select name="mode">
              <option value="translation">Translation → name</option>
              <option value="video">Video → name</option>
              <option value="name">Name → picture it</option></select></label>
            <label>New cards <select name="newLimit"><option>5</option><option selected>10</option><option>20</option><option value="999">All</option></select></label>`,
    need: (t, o) => o.mode !== 'video' || !!t.video,
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
    const front = o.mode === 'video' ? media(t)
      : o.mode === 'translation' ? `<p class="big">${esc(t.translation)}</p>`
      : `<p class="big">${esc(t.name)}</p><p class="muted">Picture the technique, then check.</p>`;
    root.innerHTML = `<p class="muted">${queue.length} left · ${srs[t.id] ? 'review' : 'new card'}</p>
      <div class="card">${front}<div class="back"></div></div>
      <div class="actions"><button class="primary reveal">Show answer <kbd>Space</kbd></button></div>`;
    $('.reveal', root).onclick = reveal;
  };
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    const t = queue[0];
    $('.back', root).innerHTML = `<hr><h2>${esc(t.name)}</h2><p>${esc(t.translation)}</p>
      ${o.mode !== 'video' ? media(t) : ''}<p>${esc(t.notes)}</p>
      <p class="muted">${esc(t.category)} › ${esc(t.subcategory)} · ${t.belt} belt · difficulty ${t.difficulty}</p>`;
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
              <option value="translation">Name ↔ translation</option>
              <option value="video">Name ↔ video</option></select></label>
            <label>Number of pairs <select name="n"><option>4</option><option selected>6</option><option>8</option><option>10</option><option>12</option></select></label>`,
    need: (t, o) => o.pair !== 'video' || !!t.video,
    onStart: (pool, o) => runMemory(root, shuffle(pool).slice(0, +o.n), o)
  });
}

function runMemory(root, picks, o) {
  const cards = shuffle(picks.flatMap(t => [{ id: t.id, side: 'a' }, { id: t.id, side: 'b' }]));
  let open = [], moves = 0, found = 0, lock = false;
  const face = c => {
    const t = byId[c.id];
    if (c.side === 'a') return `<b>${esc(t.name)}</b>`;
    return o.pair === 'video' ? media(t, true) : `<span>${esc(t.translation)}</span>`;
  };
  root.innerHTML = `<p class="muted mstat"></p>
    <div class="grid">${cards.map((c, i) => `<button class="mcard" data-i="${i}"><span class="face"></span></button>`).join('')}</div>`;
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
      setTimeout(() => { [b1, b2].forEach(x => { x.classList.remove('up'); $('.face', x).innerHTML = ''; }); lock = false; }, 1100);
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
              <option value="translation">Translation → name</option>
              <option value="video">Video → name</option>
              <option value="group">Name → group</option></select></label>
            <label>Questions <select name="n"><option>5</option><option selected>10</option><option>20</option></select></label>`,
    need: (t, o) => o.type !== 'video' || !!t.video,
    onStart: (pool, o) => runQuiz(root, pool, o)
  });
}

function runQuiz(root, pool, o) {
  let order = [];
  while (order.length < +o.n) order.push(...shuffle(pool));
  order = order.slice(0, +o.n);
  let i = 0, score = 0;
  const missed = [];
  const next = () => {
    if (i >= order.length) {
      root.innerHTML = `<div class="card center"><h2>${score} / ${order.length}</h2>
        ${missed.length ? `<p>Worth another look: ${uniq(missed).map(esc).join(', ')}</p>` : '<p>Perfect! 🥋</p>'}
        <button class="primary" onclick="go('quiz')">Again</button></div>`;
      return;
    }
    const t = order[i];
    let prompt, right, others;
    if (o.type === 'group') {
      prompt = `<p class="big">${esc(t.name)}</p><p class="muted">Which group?</p>`;
      right = t.subcategory;
      others = uniq(T.map(x => x.subcategory));
    } else {
      prompt = o.type === 'video' ? media(t) : `<p class="big">${esc(t.translation)}</p>`;
      right = t.name;
      others = uniq(pool.map(x => x.name));
    }
    const options = shuffle([right, ...shuffle(others.filter(x => x !== right)).slice(0, 3)]);
    root.innerHTML = `<p class="muted">Question ${i + 1} / ${order.length} · Score ${score}</p>
      <div class="card">${prompt}</div>
      <div class="choices">${options.map(x => `<button class="choice">${esc(x)}</button>`).join('')}</div>`;
    $$('.choice', root).forEach(b => b.onclick = () => {
      const ok = b.textContent === right;
      if (ok) score++; else missed.push(t.name);
      $$('.choice', root).forEach(x => { x.disabled = true; if (x.textContent === right) x.classList.add('ok'); });
      if (!ok) b.classList.add('bad');
      i++;
      setTimeout(next, ok ? 700 : 1600);
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
