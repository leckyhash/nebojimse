// Panorama images for the 360° tour.
// For the hackathon demo the rooms are drawn as illustrations at runtime
// (works fully offline, zero image downloads). To use real FN Brno photos,
// put a 4000×1000 (4:1) panorama in /img and set PANO_PHOTOS[room] = 'img/xyz.jpg'.
// Hotspot coordinates in content.js are in the same 4000×1000 pixel space.
'use strict';

const PANO_W = 4000, PANO_H = 1000, FLOOR_Y = 700;
const PANO_PHOTOS = { entrance: null, waiting: null, blood: null, ecg: null, us: null };

const panoCache = {};

function panoImage(room) {
  if (PANO_PHOTOS[room]) return PANO_PHOTOS[room];
  if (panoCache[room]) return panoCache[room];
  const c = document.createElement('canvas');
  c.width = PANO_W; c.height = PANO_H;
  const g = c.getContext('2d');
  DRAW[room](g);
  vignette(g);
  panoCache[room] = c.toDataURL('image/jpeg', 0.86);
  return panoCache[room];
}

// ---------- primitives ----------
function rr(g, x, y, w, h, r, fill, stroke) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 4; g.stroke(); }
}
function circ(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
function txt(g, s, x, y, size, color, weight = 800) {
  g.font = `${weight} ${size}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y);
}
function shadow(g, x, w, y = FLOOR_Y + 6) {
  g.beginPath(); g.ellipse(x + w / 2, y, w / 2 + 20, 18, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(0,0,0,0.10)'; g.fill();
}

function shell(g, wall, wall2, floor, floor2) {
  let gr = g.createLinearGradient(0, 0, 0, FLOOR_Y);
  gr.addColorStop(0, wall2); gr.addColorStop(1, wall);
  g.fillStyle = gr; g.fillRect(0, 0, PANO_W, FLOOR_Y);
  // ceiling band + lights
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, 0, PANO_W, 70);
  for (let x = 250; x < PANO_W; x += 500) rr(g, x - 90, 18, 180, 26, 13, '#FFFDF2');
  gr = g.createLinearGradient(0, FLOOR_Y, 0, PANO_H);
  gr.addColorStop(0, floor); gr.addColorStop(1, floor2);
  g.fillStyle = gr; g.fillRect(0, FLOOR_Y, PANO_W, PANO_H - FLOOR_Y);
  // floor tiles perspective lines
  g.strokeStyle = 'rgba(0,0,0,0.05)'; g.lineWidth = 3;
  for (let y = FLOOR_Y + 40; y < PANO_H; y += 60 + (y - FLOOR_Y) * 0.3) { g.beginPath(); g.moveTo(0, y); g.lineTo(PANO_W, y); g.stroke(); }
  // baseboard
  g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(0, FLOOR_Y - 18, PANO_W, 18);
  // room corners (4 walls)
  for (let x = 0; x <= PANO_W; x += 1000) {
    gr = g.createLinearGradient(x - 60, 0, x + 60, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.09)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - 60, 0, 120, FLOOR_Y);
  }
}
function vignette(g) {
  const gr = g.createLinearGradient(0, 0, 0, PANO_H);
  gr.addColorStop(0, 'rgba(0,0,0,0.06)'); gr.addColorStop(0.15, 'rgba(0,0,0,0)');
  gr.addColorStop(0.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = gr; g.fillRect(0, 0, PANO_W, PANO_H);
}
function plant(g, x) {
  shadow(g, x - 50, 100);
  rr(g, x - 50, FLOOR_Y - 110, 100, 110, 14, '#C9754B');
  for (let i = 0; i < 7; i++) {
    g.beginPath(); g.ellipse(x + (i - 3) * 22, FLOOR_Y - 170 - Math.abs(i - 3) * -8, 26, 70, (i - 3) * 0.35, 0, Math.PI * 2);
    g.fillStyle = i % 2 ? '#4FA36B' : '#3D8B58'; g.fill();
  }
}
function windowAt(g, x, y, w, h) {
  rr(g, x - 10, y - 10, w + 20, h + 20, 14, '#FFFFFF');
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, '#9FD3F5'); gr.addColorStop(1, '#D9F0FF');
  rr(g, x, y, w, h, 8, gr);
  circ(g, x + w * 0.3, y + h * 0.75, 60, '#A8D8A0'); circ(g, x + w * 0.7, y + h * 0.8, 80, '#93CC8B');
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(x + w * 0.6, y + h * 0.25, 60, 22, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#FFFFFF'; g.fillRect(x + w / 2 - 5, y, 10, h);
}
function door(g, x, y, w, color, label) {
  rr(g, x - 14, y - 14, w + 28, FLOOR_Y - y + 14, 10, '#FFFFFF');
  rr(g, x, y, w, FLOOR_Y - y, 6, color);
  rr(g, x + w * 0.15, y + 40, w * 0.7, 120, 8, 'rgba(255,255,255,0.35)');
  circ(g, x + w - 40, y + (FLOOR_Y - y) / 2 + 20, 12, '#E0E0E0');
  if (label) { rr(g, x + w * 0.1, y - 90, w * 0.8, 60, 12, '#2F4B7C'); txt(g, label, x + w / 2, y - 60, 30, '#FFFFFF'); }
}
function cabinet(g, x, w, label) {
  shadow(g, x, w);
  rr(g, x, 200, w, 160, 10, '#FFFFFF', '#D8DEE6');
  for (let i = 1; i < 4; i++) { g.fillStyle = '#D8DEE6'; g.fillRect(x + (w / 4) * i - 2, 205, 4, 150); }
  rr(g, x, 520, w, FLOOR_Y - 520, 10, '#FFFFFF', '#D8DEE6');
  rr(g, x - 20, 505, w + 40, 26, 8, '#B9C4D0');
  rr(g, x + w * 0.6, 470, 140, 40, 10, '#DDE6EE'); // sink
  g.strokeStyle = '#9AA7B5'; g.lineWidth = 10; g.beginPath(); g.moveTo(x + w * 0.6 + 70, 470); g.lineTo(x + w * 0.6 + 70, 420); g.lineTo(x + w * 0.6 + 110, 420); g.stroke();
  if (label) txt(g, label, x + w / 2, 280, 34, '#7C8A99');
}

// ---------- rooms ----------
const DRAW = {
  entrance(g) {
    shell(g, '#E6EEF7', '#F4F8FC', '#C9D3DE', '#B4C0CD');
    // glass entrance doors
    rr(g, 230, 210, 640, FLOOR_Y - 210, 10, '#5C6B7A');
    const gl = g.createLinearGradient(250, 0, 850, 0);
    gl.addColorStop(0, '#BFE3F7'); gl.addColorStop(0.5, '#E6F6FF'); gl.addColorStop(1, '#BFE3F7');
    rr(g, 250, 230, 295, FLOOR_Y - 230, 6, gl); rr(g, 555, 230, 295, FLOOR_Y - 230, 6, gl);
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 14;
    for (const ox of [300, 610]) { g.beginPath(); g.moveTo(ox, 600); g.lineTo(ox + 140, 300); g.stroke(); }
    rr(g, 220, 90, 660, 100, 18, '#2F6DB5');
    txt(g, 'DĚTSKÁ NEMOCNICE', 550, 128, 50, '#FFFFFF', 900);
    txt(g, 'FN Brno', 550, 170, 30, '#CFE3FF', 700);
    plant(g, 1050);
    // reception
    rr(g, 1350, 230, 500, 80, 18, '#FF8A5B'); txt(g, 'RECEPCE · INFO', 1600, 270, 40, '#FFFFFF', 900);
    shadow(g, 1300, 600);
    rr(g, 1300, 500, 600, FLOOR_Y - 500, 22, '#FFB070');
    rr(g, 1280, 480, 640, 36, 14, '#C98A5B');
    rr(g, 1480, 390, 140, 90, 8, '#2C3440'); rr(g, 1490, 400, 120, 70, 4, '#7FB8E6');
    circ(g, 1720, 420, 42, '#F2C9A0'); rr(g, 1670, 455, 100, 40, 20, '#4C7FBF'); // receptionist
    circ(g, 1720, 395, 44, '#6B4A35'); circ(g, 1720, 425, 36, '#F2C9A0');
    circ(g, 1708, 422, 5, '#333'); circ(g, 1732, 422, 5, '#333');
    // wayfinding signs
    rr(g, 2150, 250, 500, 290, 16, '#FFFFFF', '#D3DCE6');
    const signs = [['#E8566C', 'A  ➜'], ['#3A8DDE', 'B  ➜'], ['#3CB371', 'C  ➜'], ['#F2B233', 'D  ➜']];
    signs.forEach(([c, s], i) => { rr(g, 2180, 275 + i * 64, 440, 52, 10, c); txt(g, s, 2400, 302 + i * 64, 34, '#FFFFFF', 900); });
    // floor guide lines
    signs.forEach(([c], i) => { g.fillStyle = c; g.globalAlpha = 0.65; g.fillRect(1950, 760 + i * 34, 2050, 14); g.globalAlpha = 1; });
    // lift
    rr(g, 2930, 200, 540, FLOOR_Y - 200, 12, '#A9B4C0');
    const st = g.createLinearGradient(2950, 0, 3450, 0);
    st.addColorStop(0, '#D7DEE5'); st.addColorStop(0.5, '#F2F5F8'); st.addColorStop(1, '#D7DEE5');
    rr(g, 2955, 230, 240, FLOOR_Y - 230, 4, st); rr(g, 3205, 230, 240, FLOOR_Y - 230, 4, st);
    rr(g, 3490, 380, 60, 120, 12, '#5C6B7A'); txt(g, '▲', 3520, 415, 30, '#fff'); txt(g, '▼', 3520, 465, 30, '#fff');
    rr(g, 3080, 140, 240, 50, 12, '#2F4B7C'); txt(g, 'VÝTAH', 3200, 166, 30, '#FFFFFF');
    // bench
    shadow(g, 3650, 300); rr(g, 3650, 600, 300, 40, 12, '#8DB6E0'); rr(g, 3670, 640, 20, 60, 4, '#5C6B7A'); rr(g, 3910, 640, 20, 60, 4, '#5C6B7A');
  },

  waiting(g) {
    shell(g, '#FFF1DE', '#FFF8EE', '#E8D8C2', '#DCC7AB');
    // mural
    circ(g, 400, 250, 70, '#FFD45C');
    for (const [x, y] of [[650, 220], [900, 280], [1300, 200]]) { g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(x, y, 90, 34, 0, 0, Math.PI * 2); g.ellipse(x + 40, y - 20, 60, 30, 0, 0, Math.PI * 2); g.fill(); }
    // mural hills + animals
    g.fillStyle = '#BFE3B4'; g.beginPath(); g.moveTo(150, 520); g.quadraticCurveTo(500, 380, 950, 520); g.fill();
    // chairs
    const cols = ['#3A8DDE', '#FF8A5B', '#3CB371', '#F2B233', '#E8566C'];
    for (let i = 0; i < 5; i++) {
      const x = 170 + i * 150;
      shadow(g, x, 120); rr(g, x, 470, 120, 120, 20, cols[i]); rr(g, x - 6, 580, 132, 36, 14, cols[i]);
      rr(g, x + 10, 616, 12, 84, 4, '#6F7C8A'); rr(g, x + 98, 616, 12, 84, 4, '#6F7C8A');
    }
    // toy corner rug
    g.beginPath(); g.ellipse(1500, 790, 380, 70, 0, 0, Math.PI * 2); g.fillStyle = '#B9E0F2'; g.fill();
    g.beginPath(); g.ellipse(1500, 790, 300, 50, 0, 0, Math.PI * 2); g.fillStyle = '#9FD3EC'; g.fill();
    // blocks
    [['#E8566C', 1260, 700], ['#F2B233', 1330, 710], ['#3CB371', 1290, 640], ['#3A8DDE', 1700, 720], ['#FF8A5B', 1760, 700]].forEach(([c, x, y]) => { rr(g, x, y, 64, 64, 8, c); txt(g, '★', x + 32, y + 34, 32, 'rgba(255,255,255,0.8)'); });
    // teddy
    circ(g, 1500, 640, 80, '#B07A4F'); circ(g, 1500, 545, 58, '#B07A4F');
    circ(g, 1455, 500, 22, '#B07A4F'); circ(g, 1545, 500, 22, '#B07A4F');
    circ(g, 1500, 560, 24, '#E2C2A0'); circ(g, 1480, 535, 7, '#2B2A33'); circ(g, 1520, 535, 7, '#2B2A33'); circ(g, 1500, 552, 8, '#2B2A33');
    circ(g, 1500, 650, 40, '#E2C2A0');
    // fish tank on cabinet
    shadow(g, 2080, 490); rr(g, 2080, 560, 490, FLOOR_Y - 560, 12, '#C98A5B');
    rr(g, 2100, 360, 450, 210, 10, '#2F6DB5');
    const wt = g.createLinearGradient(0, 380, 0, 560); wt.addColorStop(0, '#7CC7F0'); wt.addColorStop(1, '#3A9AD9');
    rr(g, 2112, 372, 426, 186, 6, wt);
    [[2200, 430, '#FF8A5B'], [2330, 480, '#F2B233'], [2440, 420, '#E8566C'], [2270, 520, '#FFFFFF']].forEach(([x, y, c]) => {
      g.beginPath(); g.ellipse(x, y, 30, 18, 0, 0, Math.PI * 2); g.fillStyle = c; g.fill();
      g.beginPath(); g.moveTo(x - 26, y); g.lineTo(x - 50, y - 16); g.lineTo(x - 50, y + 16); g.fill();
      circ(g, x + 14, y - 4, 4, '#1F2A44');
    });
    for (let i = 0; i < 5; i++) { g.strokeStyle = '#3CB371'; g.lineWidth = 8; g.beginPath(); g.moveTo(2150 + i * 90, 558); g.quadraticCurveTo(2170 + i * 90, 500, 2150 + i * 90, 460); g.stroke(); }
    // door to exam room
    door(g, 2850, 250, 400, '#7FC4A8', 'AMBULANCE');
    circ(g, 3300, 330, 26, '#3CB371'); circ(g, 3300, 330, 40, 'rgba(60,179,113,0.25)');
    windowAt(g, 3500, 190, 400, 320);
  },

  blood(g) {
    shell(g, '#E7F6EF', '#F3FBF7', '#D3E2DB', '#C1D3CA');
    // poster
    rr(g, 180, 160, 220, 280, 12, '#FFFFFF', '#D8E2DC'); circ(g, 290, 260, 60, '#FFD45C'); txt(g, '🦔', 290, 380, 60, '#000');
    // blood-draw chair
    shadow(g, 450, 620);
    rr(g, 480, 260, 260, 320, 40, '#3A8DDE');      // back
    rr(g, 450, 520, 460, 90, 30, '#2F78C4');       // seat
    rr(g, 860, 440, 320, 50, 24, '#3A8DDE');       // arm rest extended
    rr(g, 900, 490, 30, 100, 8, '#6F7C8A');
    rr(g, 520, 610, 30, 90, 6, '#6F7C8A'); rr(g, 820, 610, 30, 90, 6, '#6F7C8A');
    rr(g, 510, 290, 200, 120, 30, 'rgba(255,255,255,0.18)');
    // cart
    shadow(g, 1340, 420);
    rr(g, 1340, 470, 420, 30, 10, '#B9C4D0'); rr(g, 1360, 500, 380, 160, 10, '#FFFFFF', '#D8DEE6');
    rr(g, 1380, 520, 340, 50, 6, '#EEF2F6'); rr(g, 1380, 590, 340, 50, 6, '#EEF2F6');
    circ(g, 1380, 685, 16, '#5C6B7A'); circ(g, 1720, 685, 16, '#5C6B7A');
    // tourniquet band
    g.strokeStyle = '#4AA3E8'; g.lineWidth = 22; g.lineCap = 'round';
    g.beginPath(); g.moveTo(1390, 455); g.bezierCurveTo(1430, 400, 1480, 480, 1520, 430); g.stroke(); g.lineCap = 'butt';
    // tube rack
    rr(g, 1580, 430, 170, 40, 6, '#DDE6EE');
    ['#E8566C', '#9B59B6', '#3CB371', '#F2B233', '#3A8DDE'].forEach((c, i) => { rr(g, 1595 + i * 31, 360, 20, 90, 8, '#F2F7FA', '#C6D0DA'); rr(g, 1593 + i * 31, 350, 24, 24, 6, c); });
    cabinet(g, 2100, 800, '');
    // plaster jar
    rr(g, 2540, 400, 120, 110, 18, 'rgba(220,240,255,0.8)', '#A9C2D6'); rr(g, 2535, 385, 130, 26, 8, '#FF8A5B');
    ['#FFD45C', '#E8566C', '#3CB371', '#3A8DDE'].forEach((c, i) => rr(g, 2555 + (i % 2) * 45, 425 + Math.floor(i / 2) * 38, 40, 22, 8, c));
    windowAt(g, 3100, 190, 380, 300);
    door(g, 3620, 230, 300, '#7FC4A8');
  },

  ecg(g) {
    shell(g, '#FFF0E6', '#FFF8F2', '#E7D9CF', '#D9C6B8');
    rr(g, 150, 180, 160, 200, 12, '#FFFFFF', '#E6D6CA'); txt(g, '❤️', 230, 280, 80, '#000');
    // bed
    shadow(g, 350, 900);
    rr(g, 370, 560, 860, 40, 10, '#6F7C8A');
    rr(g, 350, 500, 900, 70, 26, '#7FC4A8');
    rr(g, 380, 470, 220, 50, 24, '#FFFFFF');
    rr(g, 400, 600, 26, 100, 6, '#6F7C8A'); rr(g, 1180, 600, 26, 100, 6, '#6F7C8A');
    // paper roll
    rr(g, 620, 492, 600, 14, 6, 'rgba(255,255,255,0.8)');
    // machine on trolley
    shadow(g, 1400, 350);
    rr(g, 1400, 420, 350, 200, 16, '#E9EDF2', '#CCD5DE');
    rr(g, 1430, 270, 290, 160, 12, '#2C3440'); rr(g, 1445, 285, 260, 130, 6, '#0F2A1E');
    g.strokeStyle = '#3CE38A'; g.lineWidth = 5; g.beginPath();
    for (let x = 1450; x < 1700; x += 2) {
      const p = (x - 1450) % 85; let y = 350;
      if (p > 30 && p < 36) y = 350 - (p - 30) * 12; else if (p >= 36 && p < 42) y = 278 + (p - 36) * 18; else if (p >= 42 && p < 46) y = 386 - (p - 42) * 9;
      else if (p > 55 && p < 70) y = 350 - Math.sin((p - 55) / 15 * Math.PI) * 14;
      x === 1450 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
    rr(g, 1440, 620, 270, 30, 8, '#B9C4D0'); circ(g, 1450, 680, 18, '#5C6B7A'); circ(g, 1700, 680, 18, '#5C6B7A');
    // cables
    ['#E8566C', '#F2B233', '#3CB371', '#2C3440', '#FFFFFF'].forEach((c, i) => {
      g.strokeStyle = c; g.lineWidth = 7; g.beginPath(); g.moveTo(1420, 470 + i * 12);
      g.bezierCurveTo(1340, 620, 1250, 400 + i * 20, 1080 - i * 90, 515); g.stroke();
      circ(g, 1080 - i * 90, 515, 14, '#F5F5F5');
    });
    cabinet(g, 2100, 800, '');
    // electrode box
    rr(g, 2420, 420, 170, 90, 12, '#FFFFFF', '#C6D0DA');
    for (let i = 0; i < 6; i++) { circ(g, 2450 + (i % 3) * 55, 445 + Math.floor(i / 3) * 40, 16, '#EEF2F6'); circ(g, 2450 + (i % 3) * 55, 445 + Math.floor(i / 3) * 40, 6, '#9AA7B5'); }
    windowAt(g, 3100, 190, 380, 300);
    door(g, 3620, 230, 300, '#F2B98F');
  },

  us(g) {
    shell(g, '#E6EEFA', '#F1F5FC', '#CDD6E3', '#BAC5D4');
    g.fillStyle = 'rgba(20,30,60,0.06)'; g.fillRect(0, 0, PANO_W, PANO_H); // dimmed room
    rr(g, 150, 180, 160, 200, 12, '#FFFFFF', '#D3DCE8'); txt(g, '🐳', 230, 280, 80, '#000');
    // bed
    shadow(g, 350, 900);
    rr(g, 370, 560, 860, 40, 10, '#6F7C8A');
    rr(g, 350, 500, 900, 70, 26, '#8DB6E0');
    rr(g, 380, 470, 220, 50, 24, '#FFFFFF');
    rr(g, 400, 600, 26, 100, 6, '#6F7C8A'); rr(g, 1180, 600, 26, 100, 6, '#6F7C8A');
    // ultrasound machine
    shadow(g, 1400, 420);
    rr(g, 1400, 430, 420, 200, 16, '#F2F5F8', '#CCD5DE');
    rr(g, 1420, 440, 380, 40, 10, '#DCE3EA');
    for (let i = 0; i < 8; i++) rr(g, 1560 + i * 26, 450, 18, 18, 4, i % 3 ? '#9AA7B5' : '#3A8DDE');
    rr(g, 1440, 230, 340, 200, 14, '#2C3440'); usImage(g, 1610, 250, 170);
    // gel bottle
    rr(g, 1440, 360, 60, 80, 14, '#3A8DDE'); rr(g, 1455, 335, 30, 30, 6, '#FFFFFF'); rr(g, 1465, 318, 10, 20, 3, '#FFFFFF');
    // probe holder + probe
    rr(g, 1790, 450, 50, 70, 10, '#B9C4D0');
    rr(g, 1795, 410, 40, 70, 18, '#FFFFFF', '#9AA7B5');
    g.strokeStyle = '#4C5866'; g.lineWidth = 8; g.beginPath(); g.moveTo(1815, 520); g.quadraticCurveTo(1880, 640, 1780, 640); g.stroke();
    rr(g, 1440, 630, 340, 30, 8, '#B9C4D0'); circ(g, 1460, 685, 18, '#5C6B7A'); circ(g, 1760, 685, 18, '#5C6B7A');
    // wall TV
    rr(g, 1950, 160, 400, 260, 16, '#2C3440'); usImage(g, 2150, 185, 210);
    rr(g, 2140, 420, 20, 40, 4, '#9AA7B5');
    cabinet(g, 2400, 600, '');
    // paper towel roll
    rr(g, 2560, 430, 120, 80, 30, '#FFFFFF', '#D3DCE8'); circ(g, 2620, 470, 14, '#C6D0DA');
    windowAt(g, 3150, 200, 340, 280);
    door(g, 3620, 230, 300, '#8DB6E0');
  },
};

function usImage(g, cx, top, r) {
  g.save();
  g.beginPath(); g.moveTo(cx, top); g.arc(cx, top, r, Math.PI * 0.25, Math.PI * 0.75); g.closePath();
  g.fillStyle = '#111'; g.fill(); g.clip();
  for (let i = 0; i < 500; i++) {
    const a = Math.PI * (0.25 + Math.random() * 0.5), d = Math.random() * r;
    g.fillStyle = `rgba(255,255,255,${Math.random() * 0.35})`;
    g.fillRect(cx + Math.cos(a) * d, top + Math.sin(a) * d, 4, 3);
  }
  g.beginPath(); g.ellipse(cx, top + r * 0.6, r * 0.25, r * 0.15, 0.2, 0, Math.PI * 2);
  g.fillStyle = 'rgba(0,0,0,0.7)'; g.fill();
  g.restore();
}
