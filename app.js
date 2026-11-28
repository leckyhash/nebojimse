'use strict';

// ---------------- state (on this device only, no personal data) ----------------
const STORE = 'nebojimse.v2';
let S = Object.assign(
  { lang: detectLang(), exam: null, ver: null, photos: null, guide: null, screen: 'setup', step: 0 },
  load()
);
applyUrlParams();

function detectLang() { const n = (navigator.language || 'cs').slice(0, 2); return LANGS.includes(n) ? n : 'cs'; }
function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function save() { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch {} }
// QR from the doctor page: ?exam=blood|heart&lang=cs|uk|en&ver=pre|pas
function applyUrlParams() {
  const p = new URLSearchParams(location.search);
  if (LANGS.includes(p.get('lang'))) S.lang = p.get('lang');
  if (EXAMS[p.get('exam')] && p.get('exam') !== S.exam) { S.exam = p.get('exam'); S.screen = 'setup'; S.step = 0; }
  if (['pre', 'pas'].includes(p.get('ver'))) S.ver = p.get('ver');
}

const t = obj => (obj ? obj[S.lang] ?? obj.cs : '');
const ui = (k, v = {}) => t(UI[k]).replace(/\{(\w+)\}/g, (_, x) => v[x]);
const exam = () => EXAMS[S.exam];
const steps = () => exam().steps;
const audioSrc = file => `audio/${S.lang}/${file}.m4a`;

// ---------------- audio ----------------
const player = new Audio();
let playingBtn = null, countTimer = null;
function play(src, btn) {
  const same = playingBtn && playingBtn === btn && !player.paused;
  stopAudio();
  if (same) return;
  player.src = src; player.currentTime = 0;
  player.play().catch(() => {});
  if (btn) { btn.classList.add('on'); playingBtn = btn; }
}
player.onended = player.onpause = () => { if (playingBtn) playingBtn.classList.remove('on'); playingBtn = null; };
function stopAudio() {
  player.pause();
  clearInterval(countTimer); countTimer = null;
  document.querySelectorAll('video').forEach(v => v.pause());
  if (playingBtn) playingBtn.classList.remove('on');
  playingBtn = null;
}
const ICON = {
  speaker: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  back: '<path d="m14.5 6-6 6 6 6"/>',
  next: '<path d="m9.5 6 6 6-6 6"/>',
  gear: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  play: '<path d="M8 5.5v13l10.5-6.5L8 5.5Z"/>',
  again: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
};
const icon = (name, size = 20) => `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
const listenBtn = (src, cls = '') => `<button class="listen ${cls}" data-audio="${src}">${icon('speaker')}<span>${ui('listen')}</span></button>`;

// Download this language's voice files for offline use (photos are cached by the service worker).
// The cache name changes when recordings change (tools/build.js), so phones never keep an old voice.
const AUDIO_CACHE = 'nebojimse-audio-86d3b10726';
// Runs as soon as the parent picks the exam and language (not only at "Start"), so a family that
// opens the app once at home on Wi-Fi has the voice in the hospital too. "Works offline" is shown
// only once the app files AND this exam's voice in this language are saved on the phone.
let voiceReady = '';
function cacheAudio() {
  if (!('caches' in window) || !S.exam) return;
  const want = `${S.lang}-${S.exam}`;
  const files = [];
  for (const s of steps()) files.push(audioSrc(`${S.exam}-${s.id}-pre`), audioSrc(`${S.exam}-${s.id}-pas`));
  for (let n = 1; n <= 20; n++) files.push(audioSrc(`n${n}`));
  ['pickGuide', 'planIntro', 'doneText', 'echoWarn', 'count20'].forEach(k => files.push(audioSrc(`ui-${k}`)));
  caches.open(AUDIO_CACHE)
    .then(c => Promise.all(files.map(f => c.match(f).then(hit => hit ? true : c.add(new Request(f, { cache: 'reload' })).then(() => true, () => false)))))
    .then(ok => { if (ok.every(Boolean) && want === `${S.lang}-${S.exam}`) { voiceReady = want; markOffline(); } })
    .catch(() => {});
}

// ---------------- guides (original characters) ----------------
function pip(size = 96) {
  // spikes are anchored on the body oval itself (base slightly inside it), so there is no gap
  const cx = 52, cy = 68, rx = 42, ry = 32;
  const p = (ang, k) => `${(cx + Math.cos(ang) * rx * k).toFixed(1)} ${(cy - Math.sin(ang) * ry * k).toFixed(1)}`;
  let spikes = '';
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (0.96 - i * 0.08);
    spikes += `<path d="M${p(a - 0.15, 0.86)}L${p(a, 1.44)}L${p(a + 0.15, 0.86)}Z"/>`;
  }
  return `<svg class="pip" width="${size}" height="${size}" viewBox="-10 0 130 110" aria-hidden="true">
    <g fill="#6B4428">${spikes}</g>
    <ellipse cx="52" cy="68" rx="42" ry="32" fill="#8B5E3C"/><ellipse cx="86" cy="72" rx="26" ry="23" fill="#F3D9B1"/>
    <circle cx="111" cy="70" r="6" fill="#2B2A33"/><circle cx="92" cy="62" r="5" fill="#2B2A33"/><circle cx="93.5" cy="60.5" r="1.6" fill="#fff"/>
    <circle cx="94" cy="78" r="6" fill="#FF9AA2" opacity=".55"/><path d="M98 84q6 5 12 -1" stroke="#2B2A33" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="34" cy="98" rx="10" ry="6" fill="#6B4428"/><ellipse cx="76" cy="98" rx="10" ry="6" fill="#6B4428"/></svg>`;
}
function guideAvatar(size = 72) {
  if (S.guide === 'clown') return `<img class="clown" src="img/klaun.png" alt="" width="${size}" height="${size}">`;
  if (S.guide === 'pip') return pip(size);
  return '';
}

// ---------------- render ----------------
const app = document.getElementById('app');
let lastKey = '';

function go(screen, step) {
  stopAudio();
  S.screen = screen; if (step != null) S.step = step;
  save(); render(); window.scrollTo(0, 0);
}

function render() {
  if (S.screen === 'plan' && S.ver !== 'pas') { S.screen = 'step'; S.step = 0; save(); }
  document.documentElement.lang = S.lang;
  document.title = ui('appName');
  const key = S.screen + S.step;
  const enter = key !== lastKey ? ' enter' : '';
  lastKey = key;
  const header = S.screen === 'setup' ? '' : `
    <header class="top">
      <button class="icon-btn" data-act="back" aria-label="${ui('back')}">${icon('back', 22)}</button>
      <div class="top-title">${exam() ? `${exam().icon} ${t(exam().name)}` : ''}</div>
      <button class="icon-btn" data-act="settings" aria-label="${ui('settings')}">${icon('gear', 22)}</button>
    </header>`;
  app.innerHTML = header + `<main class="screen${enter} screen-${S.screen} ver-${S.ver}">${SCREENS[S.screen]()}</main><div class="sheet-backdrop" id="sheet" hidden></div>`;
  if (window.__offline) markOffline();
}

function choice(group, value, title, sub, sel, extra = '') {
  return `<button class="choice ${sel ? 'sel' : ''}" data-set="${group}" data-v="${value}" aria-pressed="${sel}">${extra}<b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
}
function settingsFields(withExam) {
  return `
    <h2 class="label">${ui('lang')}</h2>
    <div class="choices two">${LANGS.map(l => choice('lang', l, LANG_NAMES[l], '', S.lang === l)).join('')}</div>
    ${withExam ? `<h2 class="label">${ui('exam')}</h2>
    <div class="choices two">${Object.entries(EXAMS).map(([id, e]) => choice('exam', id, t(e.name), '', S.exam === id, `<span class="big">${e.icon}</span>`)).join('')}</div>` : ''}
    <h2 class="label">${ui('version')}</h2>
    <div class="choices">${choice('ver', 'pre', ui('verPre'), ui('verPreSub'), S.ver === 'pre')}${choice('ver', 'pas', ui('verPas'), ui('verPasSub'), S.ver === 'pas')}</div>
    <h2 class="label">${ui('photos')}</h2>
    <div class="choices two">${choice('photos', 'show', ui('photosShow'), ui('photosShowSub'), S.photos === 'show')}${choice('photos', 'hide', ui('photosHide'), ui('photosHideSub'), S.photos === 'hide')}</div>
    <p class="fine left">${ui('photosNote')}</p>`;
}

const SCREENS = {
  setup() {
    const ready = S.exam && S.ver && S.photos;
    return `
      <section class="hero">
        <div class="hero-guides"><img class="clown" src="img/klaun.png" alt="" width="84" height="84">${pip(84)}</div>
        <h1>${ui('appName')}</h1>
        <p class="lead">${ui('tagline')}</p>
        <p class="badges"><span class="badge">FN Brno · Dětská nemocnice</span><span class="badge ok" id="offline-badge" hidden>✓ ${ui('offline')}</span></p>
      </section>
      <div class="panel">
        <h2 class="panel-title">${ui('setupTitle')}</h2>
        ${settingsFields(true)}
      </div>
      <button class="cta" data-act="startChild" ${ready ? '' : 'disabled'}>${ui('startChild')}</button>
      <button class="cta secondary" data-act="parent" ${S.exam ? '' : 'disabled'}>${ui('openParent')}</button>
      ${ready ? '' : `<p class="fine">${ui('chooseAll')}</p>`}
      <p class="fine">${ui('draft')}<br>${ui('privacy')}</p>`;
  },

  guide() {
    const opt = (id, art, label) => `<button class="guide-opt ${S.guide === id ? 'sel' : ''}" data-act="pickGuide" data-v="${id}">${art}<b>${label}</b></button>`;
    return `
      <h1 class="center">${ui('pickGuide')}</h1>
      <div class="center">${listenBtn(audioSrc('ui-pickGuide'), 'mini')}</div>
      <div class="guides">
        ${opt('clown', '<video class="clown" src="media/klaun.mp4" autoplay muted loop playsinline width="150" height="150"></video>', ui('guideClown'))}
        ${opt('pip', pip(150), ui('guidePip'))}
        ${S.ver === 'pas' ? opt('none', '<span class="none-art">◻️</span>', ui('guideNone')) : ''}
      </div>`;
  },

  plan() {
    const e = exam();
    return `
      <div class="say">${guideAvatar(64)}<p>${ui('planIntro')}</p>${listenBtn(audioSrc('ui-planIntro'), 'mini')}</div>
      <h1>${ui('plan')}</h1>
      <ol class="plan">
        ${e.steps.map((s, i) => `
          <li style="--c:${e.color}">
            <span class="num">${i + 1}</span>
            ${thumb(s)}
            <div><b>${t(s.title)}</b>${s.dur ? `<small>${icon('clock', 15)} ${t(s.dur)}</small>` : ''}</div>
          </li>`).join('')}
      </ol>
      <p class="total">${icon('clock', 18)} ${t(e.total)}</p>
      <button class="cta" data-act="begin">${ui('start')}${icon('next')}</button>`;
  },

  step() {
    const e = exam(), all = e.steps, s = all[S.step], n = S.step + 1;
    const text = S.ver === 'pre' ? t(s.pre) : t(s.pas);
    const chips = (list, dict) => list.map(k => `<li><span>${dict[k].i}</span>${t(dict[k].t)}</li>`).join('');
    const sensesBlock = S.ver === 'pas'
      ? `${s.senses.length ? `<div class="info"><h3>${ui('feel')}</h3><ul class="chips">${chips(s.senses, SENSES)}</ul></div>` : ''}
         ${s.doing.length ? `<div class="info"><h3>${ui('doing')}</h3><ul class="chips">${chips(s.doing, DOING)}</ul></div>` : ''}`
      : `<ul class="icons">${[...s.senses.map(k => SENSES[k]), ...s.doing.map(k => DOING[k])].map(x => `<li title="${t(x.t)}"><span>${x.i}</span><small>${t(x.t)}</small></li>`).join('')}</ul>`;
    return `
      <div class="track" aria-label="${ui('stepOf', { n, total: all.length })}">
        ${all.map((x, i) => `<i class="${i < S.step ? 'done' : i === S.step ? 'cur' : ''}" style="--c:${e.color}"></i>`).join('')}
      </div>
      <p class="step-of">${ui('stepOf', { n, total: all.length })}</p>
      <h1 class="step-title"><span class="step-ic" style="--c:${e.color}" aria-hidden="true">${s.icon}</span>${t(s.title)}</h1>
      ${gallery(s)}
      ${s.dur ? `<p class="dur" style="--c:${e.color}">${icon('clock', 26)}<span><small>${ui('duration')}</small>${t(s.dur)}</span></p>` : ''}
      <div class="step-text ${S.guide && S.guide !== 'none' ? 'with-guide' : ''}">
        ${guideAvatar(S.ver === 'pre' ? 72 : 48)}
        <div><p>${text}</p>${listenBtn(audioSrc(`${S.exam}-${s.id}-${S.ver}`), 'mini')}</div>
      </div>
      ${sensesBlock}
      ${s.extra === 'count20' ? count20() : ''}
      ${s.extra === 'echo' ? echoBox() : ''}
      <nav class="stepnav">
        <button class="cta secondary" data-act="prev">${icon('back')}${ui('back')}</button>
        <button class="cta" data-act="next">${n === all.length ? ui('close') : ui('next')}${icon('next')}</button>
      </nav>`;
  },

  done() {
    const e = exam();
    return `
      <div class="done">
        ${guideAvatar(110) || '<div class="big-check">✓</div>'}
        <h1>${ui('doneTitle')}</h1>
        <p class="lead">${ui('doneText')}</p>${listenBtn(audioSrc('ui-doneText'), 'mini')}
      </div>
      ${S.ver === 'pas' ? `<ol class="plan compact">${e.steps.map((s, i) => `<li style="--c:${e.color}"><span class="num">${i + 1}</span><span class="ic">${s.icon}</span><div><b>${t(s.title)}</b>${s.dur ? `<small>${icon('clock', 15)} ${t(s.dur)}</small>` : ''}</div></li>`).join('')}</ol>
      <p class="total">${icon('clock', 18)} ${t(e.total)}</p>` : ''}
      <button class="cta" data-act="again">${icon('again')}${ui('again')}</button>
      <button class="cta secondary" data-act="parent">${ui('openParent')}</button>`;
  },

  parent() {
    const e = exam();
    return `
      <h1>${ui('parentTitle')}: ${t(e.name)}</h1>
      <p class="lead">${ui('parentIntro')}</p>
      <div class="panel"><h2 class="panel-title">${ui('howTalk')}</h2><ul class="talk">${TALK.map(x => `<li>${t(x)}</li>`).join('')}</ul></div>
      <div class="panel warn"><h2 class="panel-title">${ui('moments')}</h2>
        ${e.moments.map(m => `<div class="moment"><b>${t(m.t)}</b><p>${t(m.d)}</p></div>`).join('')}</div>
      <div class="panel"><h2 class="panel-title">${ui('stepsTable')}</h2>
        <ol class="ptable">${e.steps.map((s, i) => `
          <li><span class="num" style="--c:${e.color}">${i + 1}</span>
            <div><b>${t(s.title)}</b><p>${t(s.parent)}</p>${s.dur ? `<small>${icon('clock', 15)} ${t(s.dur)}</small>` : ''}</div></li>`).join('')}
        </ol>
        <p class="total">${icon('clock', 18)} ${t(e.total)}</p>
      </div>
      <p class="fine">${ui('draft')}</p>
      <button class="cta" data-act="startChild" ${S.ver && S.photos ? '' : 'disabled'}>${ui('startChild')}</button>`;
  },
};

function isHidden(id) { return SENSITIVE.has(id) && S.photos !== 'show'; }
function thumb(s) {
  const id = s.photos.find(p => !isHidden(p));
  return id ? `<img class="thumb" src="img/${id}.jpg" alt="" loading="lazy">` : `<span class="thumb ic">${s.icon}</span>`;
}
function gallery(s) {
  // no photo for this step: a big emoji on a soft background in the exam's color
  if (!s.photos.length) return `<div class="gallery"><figure class="art" style="--c:${exam().color}" aria-hidden="true">${(s.art || [s.icon]).map(a => `<span>${a}</span>`).join('')}</figure></div>`;
  // several hidden photos collapse into one neutral picture
  const ids = s.photos.filter((id, i, arr) => !isHidden(id) || arr.findIndex(isHidden) === i);
  const figs = ids.map(id => isHidden(id)
    ? `<figure class="neutral"><span>🙈</span><b>${ui('hiddenPhoto')}</b><figcaption>${ui('hiddenSub')}</figcaption></figure>`
    : `<figure><img src="img/${id}.jpg" alt="${t(PHOTOS[id])}" loading="lazy"><figcaption>${t(PHOTOS[id])}</figcaption></figure>`);
  return `<div class="gallery" id="gallery">${figs.join('')}</div>
    ${figs.length > 1 ? `<div class="gdots">${figs.map((_, i) => `<button data-act="gto" data-v="${i}" class="${i ? '' : 'on'}" aria-label="${i + 1} / ${figs.length}"></button>`).join('')}</div>` : ''}`;
}
function count20() {
  return `<div class="extra count"><p>${ui('count20')}</p><div class="counter" id="counter" aria-live="polite">0<small>/20</small></div>
    <button class="cta small" data-act="count">${icon('play')}${ui('countStart')}</button></div>`;
}
function echoBox() {
  return `<div class="extra echo"><h3>${ui('echoTitle')}</h3><p>${ui('echoWarn')}</p>
    <button class="cta small" data-audio="media/zvuk_srdicka.m4a">${icon('play')}${ui('playSound')}</button>
    <details><summary>${ui('playVideo')}</summary><video src="media/echo.mp4" controls playsinline preload="none" poster="img/echo_obrazovka.jpg"></video></details></div>`;
}

// ---------------- events ----------------
app.addEventListener('click', e => {
  const a = e.target.closest('[data-audio]');
  if (a) { play(a.dataset.audio, a); return; }
  const set = e.target.closest('[data-set]');
  if (set) {
    const k = set.dataset.set, v = set.dataset.v;
    if (k === 'exam' && S.exam !== v) S.step = 0;
    if (k === 'ver' && v === 'pre' && S.guide === 'none') S.guide = null;
    S[k] = v; save();
    if (k === 'exam' || k === 'lang') cacheAudio();
    if (document.getElementById('sheet').hidden) render(); else { renderSheet(); }
    return;
  }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  switch (el.dataset.act) {
    case 'startChild': if (S.exam && S.ver && S.photos) { cacheAudio(); go('guide', 0); } break;
    case 'parent': go('parent'); break;
    case 'pickGuide': S.guide = el.dataset.v; S.ver === 'pas' ? go('plan') : go('step', 0); break;
    case 'begin': go('step', 0); break;
    case 'next': S.step < steps().length - 1 ? go('step', S.step + 1) : go('done'); break;
    case 'prev': S.step > 0 ? go('step', S.step - 1) : go(firstScreen()); break;
    case 'again': go('guide', 0); break;
    case 'back': back(); break;
    case 'settings': openSheet(); break;
    case 'gto': { const g = document.getElementById('gallery'); g.scrollTo({ left: g.clientWidth * +el.dataset.v, behavior: 'smooth' }); break; }
    case 'count': startCount(el); break;
  }
});
app.addEventListener('scroll', e => {
  if (e.target.id !== 'gallery') return;
  const g = e.target, i = Math.round(g.scrollLeft / g.clientWidth);
  document.querySelectorAll('.gdots button').forEach((b, j) => b.classList.toggle('on', i === j));
}, true);

// The overview of all steps is only shown in the exact (PAS) version, where a visual schedule helps.
// Preschoolers go from choosing the guide straight to step 1.
const firstScreen = () => (S.ver === 'pas' ? 'plan' : 'guide');

function back() {
  const order = { guide: 'setup', plan: 'guide', step: null, done: 'step', parent: 'setup' };
  if (S.screen === 'step') { S.step > 0 ? go('step', S.step - 1) : go(firstScreen()); return; }
  if (S.screen === 'done') { go('step', steps().length - 1); return; }
  go(order[S.screen] || 'setup');
}

function startCount(btn) {
  stopAudio();
  const out = document.getElementById('counter');
  let n = 0;
  btn.disabled = true;
  const tick = () => {
    n++;
    out.innerHTML = `${n}<small>/20</small>`;
    out.style.setProperty('--p', n / 20);
    player.src = audioSrc(`n${n}`); player.play().catch(() => {});
    if (n >= 20) { clearInterval(countTimer); countTimer = null; btn.disabled = false; }
  };
  tick();
  countTimer = setInterval(tick, 1100);
}

// ---------------- settings sheet (changeable at any time) ----------------
function openSheet() { stopAudio(); renderSheet(); document.getElementById('sheet').hidden = false; }
function renderSheet() {
  const sheet = document.getElementById('sheet');
  sheet.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${ui('settings')}">
    <h2 class="panel-title">${ui('settings')}</h2>${settingsFields(false)}
    <button class="cta" data-close>${ui('close')}</button>
    <button class="cta secondary" data-home>${ui('home')}</button></div>`;
  sheet.onclick = ev => {
    if (ev.target === sheet || ev.target.closest('[data-close]')) { sheet.hidden = true; render(); }
    else if (ev.target.closest('[data-home]')) { sheet.hidden = true; go('setup'); }
  };
}

// ---------------- offline ----------------
function markOffline() {
  const b = document.getElementById('offline-badge');
  if (b) b.hidden = !(window.__offline && S.exam && voiceReady === `${S.lang}-${S.exam}`);
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => { window.__offline = true; markOffline(); }).catch(() => {});
}

render();
if (S.exam) cacheAudio();
