'use strict';

// ---------------- state (only on this device, no personal data) ----------------
const STORE = 'nebojimse.v1';
const FLOW = ['setup', 'before', 'tour', 'guide', 'quiz', 'cert', 'after'];
const fresh = () => ({ screen: 'setup', before: null, after: null, room: 0, found: {}, qi: 0, answers: [], tab: 'child' });

let S = Object.assign({ lang: detectLang(), exam: null, age: null }, fresh(), load());
applyUrlParams();

function detectLang() {
  const n = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return LANGS.includes(n) ? n : 'en';
}
function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch {} }

// QR codes on the invitation letter can pre-select: ?exam=blood&lang=cs&age=m
function applyUrlParams() {
  const p = new URLSearchParams(location.search);
  if (LANGS.includes(p.get('lang'))) S.lang = p.get('lang');
  if (EXAMS[p.get('exam')] && S.exam !== p.get('exam')) { S.exam = p.get('exam'); Object.assign(S, fresh()); }
  if (AGES.some(a => a.id === p.get('age'))) S.age = p.get('age');
}

// ---------------- i18n helpers ----------------
const tr = arr => arr[LANGS.indexOf(S.lang)] ?? arr[0];
const ui = (k, vars = {}) => tr(UI[k]).replace(/\{(\w+)\}/g, (_, v) => vars[v]);
const kid = obj => tr(obj[S.age] || obj.m);              // y / m / t variants
const hsText = hs => tr(S.age === 't' ? hs.t : hs.k);    // k / t variants
const exam = () => EXAMS[S.exam];
const roomsFor = () => ['entrance', 'waiting', S.exam];

// ---------------- speech (Web Speech API, works offline with on-device voices) ----------------
let speakingBtn = null;
function speak(text, btn) {
  if (!('speechSynthesis' in window)) return;
  const wasThis = speakingBtn === btn && speechSynthesis.speaking;
  stopSpeech();
  if (wasThis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = SPEECH_LANG[S.lang];
  const voice = speechSynthesis.getVoices().find(v => v.lang.replace('_', '-').startsWith(u.lang.slice(0, 2)));
  if (voice) u.voice = voice;
  u.rate = S.age === 'y' ? 0.85 : 0.95;
  u.onend = u.onerror = () => { if (btn) btn.classList.remove('on'); speakingBtn = null; };
  if (btn) { btn.classList.add('on'); speakingBtn = btn; }
  speechSynthesis.speak(u);
}
function stopSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if (speakingBtn) speakingBtn.classList.remove('on');
  speakingBtn = null;
}
const speakBtn = (text, cls = '') => `<button class="speak ${cls}" data-say="${encodeURIComponent(text)}" aria-label="${ui('listen')}">🔊 <span>${ui('listen')}</span></button>`;

// ---------------- mascot ----------------
function pip(size = 96, cls = '') {
  let spikes = '';
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (1.05 - i * 0.1), cx = 52, cy = 64, r = 38;
    const x1 = cx + Math.cos(a - 0.12) * r, y1 = cy - Math.sin(a - 0.12) * r * 0.9;
    const x2 = cx + Math.cos(a + 0.12) * r, y2 = cy - Math.sin(a + 0.12) * r * 0.9;
    const xt = cx + Math.cos(a) * (r + 16), yt = cy - Math.sin(a) * (r + 16) * 0.9;
    spikes += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${xt.toFixed(1)} ${yt.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}Z"/>`;
  }
  return `<svg class="pip ${cls}" width="${size}" height="${size}" viewBox="0 0 120 110" aria-hidden="true">
    <ellipse cx="58" cy="102" rx="40" ry="5" fill="rgba(0,0,0,.08)"/>
    <g fill="#6B4428">${spikes}</g>
    <ellipse cx="52" cy="68" rx="42" ry="32" fill="#8B5E3C"/>
    <ellipse cx="86" cy="72" rx="26" ry="23" fill="#F3D9B1"/>
    <circle cx="111" cy="70" r="6" fill="#2B2A33"/>
    <circle cx="92" cy="62" r="5" fill="#2B2A33"/><circle cx="93.5" cy="60.5" r="1.6" fill="#fff"/>
    <circle cx="94" cy="78" r="6" fill="#FF9AA2" opacity=".55"/>
    <path d="M98 84q6 5 12 -1" stroke="#2B2A33" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="34" cy="98" rx="10" ry="6" fill="#6B4428"/><ellipse cx="76" cy="98" rx="10" ry="6" fill="#6B4428"/>
  </svg>`;
}

// ---------------- render ----------------
const app = document.getElementById('app');
let viewer = null;
let lastScreen = '';

function go(screen) {
  stopSpeech();
  if (viewer) { viewer.destroy(); viewer = null; }
  S.screen = screen; save(); render();
  window.scrollTo(0, 0);
}

function render() {
  document.documentElement.lang = S.lang;
  document.title = ui('appName');
  const idx = FLOW.indexOf(S.screen);
  const bar = S.screen === 'setup' ? '' : `
    <header class="top">
      <button class="icon-btn" data-act="back" aria-label="${ui('back')}">‹</button>
      <div class="progress"><i style="width:${(idx / (FLOW.length - 1)) * 100}%"></i></div>
      <select class="lang-mini" data-act="lang" aria-label="${ui('chooseLang')}">
        ${LANGS.map(l => `<option value="${l}" ${l === S.lang ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}
      </select>
    </header>`;
  const enter = lastScreen !== S.screen + S.room + S.qi ? ' enter' : '';
  lastScreen = S.screen + S.room + S.qi;
  app.innerHTML = bar + `<main class="screen${enter} screen-${S.screen}">${SCREENS[S.screen]()}</main><div class="sheet-backdrop" id="sheet" hidden></div>`;
  if (S.screen === 'tour') mountTour();
  if (window.__offline) markOffline();
}

const SCREENS = {
  setup() {
    const ready = S.exam && S.age;
    return `
      <section class="hero">
        ${pip(110, 'bob')}
        <h1>${ui('appName')}</h1>
        <p class="lead">${ui('tagline')}</p>
        <p class="badge-row"><span class="badge">🏥 FN Brno · Dětská nemocnice</span> <span class="badge ok" id="offline-badge" hidden>✓ ${ui('offline')}</span></p>
      </section>
      <h2 class="label">🌍 ${ui('chooseLang')}</h2>
      <div class="chips">
        ${LANGS.map(l => `<button class="chip ${S.lang === l ? 'sel' : ''}" data-act="lang" data-v="${l}">${LANG_NAMES[l]}</button>`).join('')}
      </div>
      <h2 class="label">🩺 ${ui('chooseExam')}</h2>
      <div class="exam-grid">
        ${Object.entries(EXAMS).map(([id, e]) => `
          <button class="exam-card ${S.exam === id ? 'sel' : ''}" data-act="exam" data-v="${id}" style="--c:${e.color}">
            <span class="exam-emoji">${e.emoji}</span>
            <span class="exam-name">${tr(e.name)}</span>
            <span class="exam-sub">${tr(e.sub)}</span>
          </button>`).join('')}
      </div>
      <h2 class="label">🎂 ${ui('chooseAge')}</h2>
      <div class="chips age">
        ${AGES.map(a => `<button class="chip big ${S.age === a.id ? 'sel' : ''}" data-act="age" data-v="${a.id}">${a.emoji}<b>${a.label}</b><small>${ui('years')}</small></button>`).join('')}
      </div>
      <button class="cta" data-act="start" ${ready ? '' : 'disabled'}>${ui('start')} →</button>
      <p class="fine">🔒 ${ui('privacy')}</p>`;
  },

  before() { return feelScreen('before'); },
  after() { return S.after == null ? feelScreen('after') : resultScreen(); },

  tour() {
    const rooms = roomsFor(), r = ROOMS[rooms[S.room]];
    const found = r.hotspots.filter(h => S.found[rooms[S.room] + ':' + h.id]).length;
    const last = S.room === rooms.length - 1;
    const pipLine = [kid(INTRO), ui('pipWaiting'), ui('pipExam')][S.room];
    return `
      <div class="room-head">
        <div><small>${ui('roomOf', { n: S.room + 1 })}</small><h2>${tr(r.name)}</h2></div>
        <div class="dots">${rooms.map((_, i) => `<i class="${i < S.room ? 'done' : i === S.room ? 'cur' : ''}"></i>`).join('')}</div>
      </div>
      <div class="pano-wrap">
        <div class="pano" id="pano" role="img" aria-label="${tr(r.name)}"><div class="pano-layer" id="pano-layer"></div></div>
        <div class="pano-hint" id="pano-hint">👆 ${ui('tourHint')}</div>
        <button class="gyro" data-act="gyro" id="gyro-btn">🧭 ${ui('gyro')}</button>
      </div>
      <div class="room-foot">
        <span class="found">✨ ${ui('found', { n: found, total: r.hotspots.length })}</span>
        <button class="cta small" data-act="${last ? 'tourDone' : 'nextRoom'}">${last ? ui('finishTour') : ui('nextRoom')} →</button>
      </div>
      <div class="pip-says">${pip(56)}<p>${pipLine}</p>${speakBtn(pipLine, 'mini')}</div>`;
  },

  guide() {
    const e = exam();
    const child = `
      <ol class="comic">
        ${e.steps.map((s, i) => `
          <li class="panel" style="--c:${e.color}">
            <div class="panel-art"><span>${s.icon}</span><b>${i + 1}</b></div>
            <div class="panel-body"><small>${ui('step')} ${i + 1}</small><p>${kid(s)}</p>${speakBtn(kid(s), 'mini')}</div>
          </li>`).join('')}
      </ol>
      <button class="cta" data-act="toQuiz">${ui('toQuiz')} 🎯</button>`;
    const parent = `
      <div class="tip age-tip"><h3>👪 ${ui('ageTip')} (${AGES.find(a => a.id === S.age).label})</h3><p>${tr(AGE_TIP[S.age])}</p></div>
      <div class="tip"><h3>🎒 ${ui('prepare')}</h3><ul>${e.prepare.map(p => `<li>${tr(p)}</li>`).join('')}</ul></div>
      <div class="tip good"><h3>💬 ${ui('say')}</h3><ul>${e.say.map(p => `<li>${tr(p)}</li>`).join('')}</ul></div>
      <div class="tip bad"><h3>🚫 ${ui('avoid')}</h3>
        ${[...e.avoid, AVOID_ALL].map(a => `<div class="swap"><p class="no">✗ ${tr(a.no)}</p><p class="yes"><small>${ui('instead')}:</small> ✓ ${tr(a.yes)}</p></div>`).join('')}
      </div>
      <button class="cta" data-act="toQuiz">${ui('toQuiz')} 🎯</button>`;
    return `
      <div class="exam-pill" style="--c:${e.color}">${e.emoji} ${tr(e.name)}</div>
      <div class="tabs" role="tablist">
        <button role="tab" class="${S.tab === 'child' ? 'sel' : ''}" data-act="tab" data-v="child">🧒 ${ui('tabChild')}</button>
        <button role="tab" class="${S.tab === 'parent' ? 'sel' : ''}" data-act="tab" data-v="parent">👪 ${ui('tabParent')}</button>
      </div>
      ${S.tab === 'child' ? child : parent}`;
  },

  quiz() {
    const q = exam().quiz[S.qi], ans = S.answers[S.qi];
    const answered = ans != null;
    return `
      <h2 class="label center">${ui('quizTitle')}</h2>
      <p class="center muted">${ui('qOf', { n: S.qi + 1 })}</p>
      <div class="q-card">
        <p class="q">${tr(q.q)}</p>${speakBtn(tr(q.q) + ' ' + q.a.map(a => tr(a.t)).join(', '), 'mini')}
      </div>
      <div class="answers">
        ${q.a.map((a, i) => `
          <button class="answer ${answered ? (i === q.ok ? 'right' : i === ans ? 'miss' : 'dim') : ''}" data-act="answer" data-v="${i}" ${answered ? 'disabled' : ''}>
            <span>${a.e}</span>${tr(a.t)}
          </button>`).join('')}
      </div>
      ${answered ? `
        <div class="feedback ${ans === q.ok ? 'yay' : 'soft'}">
          ${pip(54, ans === q.ok ? 'jump' : '')}
          <p>${ans === q.ok ? ui('right') : `${ui('goodTry')} <b>${q.a[q.ok].e} ${tr(q.a[q.ok].t)}</b>`}</p>
        </div>
        <button class="cta" data-act="nextQ">${ui('next')} →</button>` : ''}`;
  },

  cert() {
    const e = exam();
    return `
      <div class="cert">
        <div class="confetti" aria-hidden="true">${['🎉', '⭐', '✨', '🎈', '⭐', '✨'].map((c, i) => `<i style="--i:${i}">${c}</i>`).join('')}</div>
        <div class="medal">🏅</div>
        <small>FN Brno · Dětská nemocnice</small>
        <h1>${ui('certTitle')}</h1>
        ${pip(120, 'bob')}
        <p class="cert-exam" style="--c:${e.color}">${e.emoji} ${tr(e.name)}</p>
        <p class="cert-sub">${ui('certSub')}</p>
        <p class="muted">${ui('certShow')}</p>
      </div>
      <button class="cta" data-act="toAfter">${ui('oneMore')} →</button>`;
  },
};

function feelScreen(which) {
  const sel = S[which];
  return `
    <div class="feel">
      ${pip(100, 'bob')}
      <h1>${ui(which === 'before' ? 'feelBefore' : 'feelAfter')}</h1>
      ${speakBtn(ui(which === 'before' ? 'feelBefore' : 'feelAfter'), 'mini')}
      <div class="thermo">
        ${FEEL_EMOJI.map((e, i) => `
          <button class="feel-btn ${sel === i ? 'sel' : ''}" data-act="feel" data-which="${which}" data-v="${i}" style="--h:${120 - i * 30}">
            <span>${e}</span><small>${tr(UI.feelings[i])}</small>
          </button>`).join('')}
      </div>
      <p class="fine">👪 ${ui('feelHint')}</p>
    </div>`;
}

function resultScreen() {
  const b = S.before, a = S.after;
  const msg = a < b ? ui('better') : a === b ? ui('same') : ui('worse');
  return `
    <div class="result">
      ${pip(100, a <= b ? 'jump' : '')}
      <div class="compare">
        <div><small>${ui('before')}</small><span>${FEEL_EMOJI[b]}</span><b>${tr(UI.feelings[b])}</b></div>
        <div class="arrow">➜</div>
        <div><small>${ui('now')}</small><span>${FEEL_EMOJI[a]}</span><b>${tr(UI.feelings[a])}</b></div>
      </div>
      <p class="msg">${msg}</p>
      <button class="cta" data-act="saveCard">📲 ${ui('save')}</button>
      <button class="ghost" data-act="restart">↺ ${ui('restart')}</button>
    </div>`;
}

// ---------------- events ----------------
app.addEventListener('click', e => {
  const say = e.target.closest('[data-say]');
  if (say) { speak(decodeURIComponent(say.dataset.say), say); return; }
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT') return;
  const v = el.dataset.v;
  switch (el.dataset.act) {
    case 'lang': S.lang = v; save(); render(); break;
    case 'exam': if (S.exam !== v) Object.assign(S, fresh()); S.exam = v; save(); render(); break;
    case 'age': S.age = v; save(); render(); break;
    case 'start': if (S.exam && S.age) go('before'); break;
    case 'back': back(); break;
    case 'feel':
      S[el.dataset.which] = +v; save();
      if (el.dataset.which === 'before') setTimeout(() => go('tour'), 350); else render();
      break;
    case 'nextRoom': S.room++; go('tour'); break;
    case 'tourDone': S.tab = 'child'; go('guide'); break;
    case 'gyro': viewer && viewer.toggleGyro(el); break;
    case 'tab': stopSpeech(); S.tab = v; save(); render(); break;
    case 'toQuiz': S.qi = 0; S.answers = []; go('quiz'); break;
    case 'answer': S.answers[S.qi] = +v; save(); render(); break;
    case 'nextQ': if (S.qi < 2) { S.qi++; go('quiz'); } else go('cert'); break;
    case 'toAfter': S.after = null; go('after'); break;
    case 'saveCard': saveCard(el); break;
    case 'restart': Object.assign(S, fresh()); go('setup'); break;
  }
});
app.addEventListener('change', e => {
  if (e.target.dataset.act === 'lang') { S.lang = e.target.value; save(); stopSpeech(); if (viewer) { viewer.destroy(); viewer = null; } render(); }
});

function back() {
  if (S.screen === 'tour' && S.room > 0) { S.room--; go('tour'); return; }
  if (S.screen === 'quiz' && S.qi > 0) { S.qi--; go('quiz'); return; }
  if (S.screen === 'after' && S.after != null) { S.after = null; go('after'); return; }
  const i = FLOW.indexOf(S.screen);
  if (S.screen === 'guide') S.room = 2;
  go(FLOW[Math.max(0, i - 1)]);
}

// ---------------- 360° panorama viewer ----------------
function mountTour() {
  const rooms = roomsFor(), roomId = rooms[S.room], room = ROOMS[roomId];
  const pano = document.getElementById('pano'), layer = document.getElementById('pano-layer');
  const hint = document.getElementById('pano-hint');
  pano.style.backgroundImage = `url(${panoImage(roomId)})`;

  const spots = [...room.hotspots.map(h => ({ ...h, type: 'info' }))];
  if (room.nav) spots.push({ id: 'nav', x: room.nav.x, y: room.nav.y, type: 'nav' });
  spots.forEach(h => {
    const b = document.createElement('button');
    b.className = h.type === 'nav' ? 'hs nav' : 'hs' + (S.found[roomId + ':' + h.id] ? ' seen' : '');
    b.innerHTML = h.type === 'nav' ? `<span>${ui('nextRoom')} ➜</span>` : `<span>${h.icon}</span>`;
    b.setAttribute('aria-label', h.type === 'nav' ? ui('nextRoom') : tr(h.title));
    b.addEventListener('click', ev => {
      ev.stopPropagation();
      if (moved > 8) return;
      if (h.type === 'nav') { S.room++; go('tour'); } else openSheet(roomId, h);
    });
    h.el = b; layer.appendChild(b);
  });

  let w = 0, h = 0, scale = 1, dispW = 1, offset = 0, vel = 0, dragging = false, moved = 0, lastX = 0, lastT = 0;
  let interacted = false, raf = 0, gyroOn = false, lastAlpha = null;

  function measure() {
    w = pano.clientWidth; h = pano.clientHeight;
    scale = h / PANO_H; dispW = PANO_W * scale;
    pano.style.backgroundSize = `${dispW}px ${h}px`;
  }
  measure();
  offset = room.start * scale - w / 2;

  function draw() {
    offset = ((offset % dispW) + dispW) % dispW;
    pano.style.backgroundPosition = `${-offset}px 0`;
    for (const s of spots) {
      let x = s.x * scale - offset;
      x = ((x % dispW) + dispW) % dispW;
      if (x > w + 80) x -= dispW;
      s.el.style.transform = `translate(${x}px, ${s.y * scale}px) translate(-50%, -50%)`;
    }
  }
  function tick() {
    if (!dragging) {
      if (Math.abs(vel) > 0.05) { offset += vel; vel *= 0.94; }
      else if (!interacted && !gyroOn) offset += 0.35;
    }
    draw();
    raf = requestAnimationFrame(tick);
  }
  const touch = () => { if (!interacted) { interacted = true; hint.classList.add('gone'); } };

  pano.addEventListener('pointerdown', e => { dragging = true; moved = 0; vel = 0; lastX = e.clientX; lastT = performance.now(); touch(); });
  const onMove = e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, now = performance.now();
    offset -= dx; moved += Math.abs(dx);
    vel = -dx / Math.max(1, now - lastT) * 16;
    lastX = e.clientX; lastT = now;
  };
  const up = () => { if (!dragging) return; dragging = false; setTimeout(() => { moved = 0; }, 0); };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);

  function onOrient(e) {
    if (e.alpha == null) return;
    if (lastAlpha != null) {
      let d = e.alpha - lastAlpha;
      if (d > 180) d -= 360; if (d < -180) d += 360;
      offset -= d * dispW / 360;
    }
    lastAlpha = e.alpha;
  }
  async function toggleGyro(btn) {
    touch();
    if (gyroOn) { window.removeEventListener('deviceorientation', onOrient); gyroOn = false; btn.classList.remove('on'); return; }
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
        if (await DeviceOrientationEvent.requestPermission() !== 'granted') return;
      }
    } catch { return; }
    lastAlpha = null; gyroOn = true; btn.classList.add('on');
    window.addEventListener('deviceorientation', onOrient);
  }
  if (!('DeviceOrientationEvent' in window) || !matchMedia('(pointer: coarse)').matches) document.getElementById('gyro-btn').hidden = true;

  const ro = new ResizeObserver(() => { const rel = offset / dispW; measure(); offset = rel * dispW; });
  ro.observe(pano);
  tick();
  viewer = {
    toggleGyro,
    destroy() {
      cancelAnimationFrame(raf); ro.disconnect();
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    },
  };
}

function openSheet(roomId, h) {
  const sheet = document.getElementById('sheet');
  const text = hsText(h);
  sheet.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-icon">${h.icon}</div>
      <h3>${tr(h.title)}</h3>
      <p>${text}</p>
      <div class="sheet-actions">${speakBtn(tr(h.title) + '. ' + text)}<button class="cta small" data-close>${ui('gotIt')}</button></div>
    </div>`;
  sheet.hidden = false;
  if (S.age === 'y') setTimeout(() => { const b = sheet.querySelector('[data-say]'); if (b && !sheet.hidden) speak(text, b); }, 250);
  const key = roomId + ':' + h.id;
  const close = () => {
    stopSpeech(); sheet.hidden = true;
    if (!S.found[key]) { S.found[key] = true; save(); }
    h.el.classList.add('seen');
    const room = ROOMS[roomId];
    const n = room.hotspots.filter(x => S.found[roomId + ':' + x.id]).length;
    document.querySelector('.found').textContent = '✨ ' + ui('found', { n, total: room.hotspots.length });
  };
  sheet.onclick = e => { if (e.target === sheet || e.target.closest('[data-close]')) close(); };
}

// ---------------- summary card (PNG, generated on-device) ----------------
async function saveCard(btn) {
  const e = exam(), W = 1080, H = 1350;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#FFE9D6'); bg.addColorStop(1, '#D9EEFF');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = '#FFFFFF'; g.beginPath(); g.roundRect(70, 70, W - 140, H - 140, 60); g.fill();
  const font = (w, s) => `${w} ${s}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  const center = (s, y, f, col) => { g.font = f; g.fillStyle = col; g.textAlign = 'center'; g.fillText(s, W / 2, y); };
  center('FN Brno · Dětská nemocnice', 170, font(700, 34), '#7C8A99');
  center('🏅 ' + ui('certTitle'), 270, font(900, 76), '#2B2A33');
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pip(300).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
  await new Promise(r => { img.onload = r; img.onerror = r; });
  try { g.drawImage(img, W / 2 - 170, 300, 340, 340); } catch {}
  g.fillStyle = e.color; g.beginPath(); g.roundRect(W / 2 - 260, 670, 520, 90, 45); g.fill();
  center(`${e.emoji} ${tr(e.name)}`, 732, font(800, 46), '#FFFFFF');
  center(ui('certSub'), 840, font(800, 50), '#2B2A33');
  g.font = font(400, 130); g.textAlign = 'center';
  g.fillText(FEEL_EMOJI[S.before], W / 2 - 220, 1030); g.fillText('➜', W / 2, 1020); g.fillText(FEEL_EMOJI[S.after], W / 2 + 220, 1030);
  g.font = font(700, 32); g.fillStyle = '#7C8A99';
  g.fillText(ui('before'), W / 2 - 220, 1090); g.fillText(ui('now'), W / 2 + 220, 1090);
  wrap(g, ui('certShow'), W / 2, 1180, 820, 44, font(700, 36), '#2B2A33');

  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'super-explorer.png', { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: ui('certTitle') }); return; }
  } catch (err) { if (err.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
  btn.textContent = '✓ ' + ui('saved');
}
function wrap(g, s, x, y, maxW, lh, f, col) {
  g.font = f; g.fillStyle = col; g.textAlign = 'center';
  let line = '';
  for (const word of s.split(' ')) {
    if (g.measureText(line + word).width > maxW && line) { g.fillText(line.trim(), x, y); y += lh; line = ''; }
    line += word + ' ';
  }
  g.fillText(line.trim(), x, y);
}

// ---------------- offline (service worker) ----------------
function markOffline() { const b = document.getElementById('offline-badge'); if (b) b.hidden = false; }
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => { window.__offline = true; markOffline(); }).catch(() => {});
}
if ('speechSynthesis' in window) speechSynthesis.getVoices();

render();
