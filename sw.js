// Offline support. VERSION and ASSETS are written by tools/build.js. Run it before deploying.
const VERSION = 'nebojimse-4d511f6cd8';
const AUDIO_CACHE = 'nebojimse-audio-ff498bff4d'; // versioned by tools/build.js from audio/manifest.json
const ASSETS = ["./","index.html","styles.css","content-sk.js","content.js","app.js","manifest.webmanifest","icon.svg","icon-180.png","icon-512.png","img/CITLIVE_jehla1.jpg","img/CITLIVE_jehla2.jpg","img/ambulance_lehatko.jpg","img/cekarna.jpg","img/chodba.jpg","img/detska_manzeta.jpg","img/dezinfekce_sprej.jpg","img/dezinfekce_tamponek.jpg","img/echo_gel.jpg","img/echo_obrazovka.jpg","img/echo_pristroj.jpg","img/echo_sonda.jpg","img/ekg_kabely.jpg","img/ekg_kolicky_balonky.jpg","img/evidence1.jpg","img/klaun.png","img/kreslo_modre.jpg","img/kreslo_zlute.jpg","img/manzeta.jpg","img/odberova_mistnost.jpg","img/skrtidlo.jpg","img/strop.jpg","img/tamponky_naplasti.jpg","img/tlakomer.jpg","img/vstup_kardiologie.jpg","img/zkumavky.jpg","media/echo.mp4","media/klaun.mp4","media/zvuk_srdicka.m4a"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== AUDIO_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Cache-first so it works without signal in the hospital; refresh in the background.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Safari requests audio/video in byte ranges, so answer them from the cached file so sound works offline.
  if (req.headers.has('range')) { e.respondWith(rangeResponse(req)); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => {
      if (res.ok && res.status === 200 && new URL(req.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});

async function rangeResponse(req) {
  const hit = await caches.match(req.url, { ignoreSearch: true });
  if (!hit) {
    // not cached yet: fetch the whole file once, cache it, then answer the range
    try {
      const full = await fetch(req.url);
      if (!full.ok) return fetch(req);
      const c = await caches.open(new URL(req.url).pathname.includes('/audio/') ? AUDIO_CACHE : VERSION);
      await c.put(req.url, full.clone());
      return slice(full, req.headers.get('range'));
    } catch { return new Response('', { status: 504 }); }
  }
  return slice(hit, req.headers.get('range'));
}
async function slice(res, range) {
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = m[1] ? +m[1] : 0, end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream', 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' },
  });
}
