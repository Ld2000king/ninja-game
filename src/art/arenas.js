// Battle arena backgrounds, drawn once to an offscreen canvas.
import { roundRect } from './character.js';

export const W = 1000, H = 560, GROUND = 215;

export const ARENAS = {
  dojo:      { name: 'דוג׳ו אדום' },
  courtyard: { name: 'חצר אבן בשקיעה' },
  desert:    { name: 'מדבר בוער' },
  sky:       { name: 'מבצר השמיים' },
};

const cache = new Map();

// seeded random so the backgrounds look the same every time
function rng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function getArena(id, scale = 1) {
  const key = id + scale;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = W * scale; c.height = H * scale;
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  ({ dojo, courtyard, desert, sky })[id](ctx);
  cache.set(key, c);
  return c;
}

export function arenaThumb(id) {
  const key = 'thumb:' + id;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = 320; c.height = 180;
  c.getContext('2d').drawImage(getArena(id), 0, 0, 320, 180);
  const url = c.toDataURL('image/jpeg', 0.85);
  cache.set(key, url);
  return url;
}

function dojo(ctx) {
  // back wall
  ctx.fillStyle = '#b8261b';
  ctx.fillRect(0, 0, W, GROUND);
  // beams
  ctx.fillStyle = '#7d140f';
  ctx.fillRect(0, 0, W, 26);
  ctx.fillRect(0, GROUND - 40, W, 40);
  ctx.fillStyle = '#e8b04a';
  ctx.fillRect(0, 26, W, 5);
  ctx.fillRect(0, GROUND - 44, W, 4);
  // shoji lattice windows
  for (let i = 0; i < 4; i++) {
    const x = 60 + i * 240, y = 50, w = 150, h = 110;
    ctx.fillStyle = '#f6e7c8';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#8f1a12'; ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);
    ctx.lineWidth = 2.5;
    for (let gx = 1; gx < 6; gx++) { ctx.beginPath(); ctx.moveTo(x + gx * w / 6, y); ctx.lineTo(x + gx * w / 6, y + h); ctx.stroke(); }
    for (let gy = 1; gy < 5; gy++) { ctx.beginPath(); ctx.moveTo(x, y + gy * h / 5); ctx.lineTo(x + w, y + gy * h / 5); ctx.stroke(); }
  }
  // pillars
  for (let i = 0; i < 5; i++) {
    const x = 10 + i * 240;
    ctx.fillStyle = '#6d0f0b'; ctx.fillRect(x, 31, 28, GROUND - 75);
    ctx.fillStyle = '#e8b04a'; ctx.fillRect(x + 4, GROUND - 60, 20, 10);
  }
  // hanging lanterns
  for (let i = 0; i < 4; i++) {
    const x = 135 + i * 240;
    ctx.strokeStyle = '#3a1a10'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, 31); ctx.lineTo(x, 44); ctx.stroke();
    ctx.fillStyle = '#ffcf4a';
    ctx.beginPath(); ctx.ellipse(x, 54, 9, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a1a10'; ctx.fillRect(x - 6, 42, 12, 3); ctx.fillRect(x - 6, 63, 12, 3);
  }
  // wooden floor
  const g = ctx.createLinearGradient(0, GROUND, 0, H);
  g.addColorStop(0, '#b4661f'); g.addColorStop(1, '#d6893a');
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  const r = rng(7);
  ctx.strokeStyle = 'rgba(90,40,10,0.45)'; ctx.lineWidth = 2;
  let y = GROUND, step = 14;
  while (y < H) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    // plank seams
    let x = r() * 200;
    while (x < W) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + step); ctx.stroke();
      x += 150 + r() * 200;
    }
    y += step; step *= 1.09;
  }
  // wood grain highlights
  ctx.strokeStyle = 'rgba(255,220,160,0.12)'; ctx.lineWidth = 1;
  for (let i = 0; i < 80; i++) {
    const gx = r() * W, gy = GROUND + r() * (H - GROUND);
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 40 + r() * 60, gy); ctx.stroke();
  }
  shadowTop(ctx);
}

function courtyard(ctx) {
  // sunset sky
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, '#ffb347'); g.addColorStop(0.6, '#ffd36b'); g.addColorStop(1, '#ffe9a6');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
  // sun
  ctx.fillStyle = 'rgba(255,255,230,0.85)';
  ctx.beginPath(); ctx.arc(760, 120, 46, 0, Math.PI * 2); ctx.fill();
  // mountains
  ctx.fillStyle = '#d98a4a';
  ctx.beginPath(); ctx.moveTo(0, GROUND - 40);
  [[90, 90], [200, 140], [330, 70], [470, 150], [600, 95], [740, 160], [880, 80], [1000, 130]].forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(W, GROUND); ctx.lineTo(0, GROUND); ctx.fill();
  ctx.fillStyle = '#b8683a';
  ctx.beginPath(); ctx.moveTo(0, GROUND - 10);
  [[120, 150], [260, 120], [380, 175], [520, 130], [690, 180], [820, 140], [1000, 175]].forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(W, GROUND); ctx.lineTo(0, GROUND); ctx.fill();
  // low stone wall
  ctx.fillStyle = '#8c8681';
  ctx.fillRect(0, GROUND - 22, W, 22);
  ctx.strokeStyle = '#5f5a56'; ctx.lineWidth = 2;
  for (let x = 0; x < W; x += 50) { ctx.strokeRect(x, GROUND - 22, 50, 11); ctx.strokeRect(x + 25, GROUND - 11, 50, 11); }
  // stone ground
  ctx.fillStyle = '#a8a29b';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  const r = rng(42);
  ctx.strokeStyle = '#6f6a65'; ctx.lineWidth = 2;
  for (let row = 0; row < 9; row++) {
    const y0 = GROUND + row * 40;
    let x = -r() * 60;
    while (x < W) {
      const w = 60 + r() * 70;
      ctx.fillStyle = `hsl(30, 5%, ${58 + r() * 10}%)`;
      ctx.beginPath();
      ctx.moveTo(x + r() * 6, y0 + r() * 6);
      ctx.lineTo(x + w - r() * 6, y0 + r() * 6);
      ctx.lineTo(x + w - r() * 6, y0 + 40 - r() * 6);
      ctx.lineTo(x + r() * 6, y0 + 40 - r() * 6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      if (r() < 0.3) { // crack
        ctx.beginPath(); ctx.moveTo(x + w * 0.3, y0 + 10); ctx.lineTo(x + w * 0.45, y0 + 20); ctx.lineTo(x + w * 0.4, y0 + 32); ctx.stroke();
      }
      x += w;
    }
  }
  // warm light overlay
  const o = ctx.createLinearGradient(0, GROUND, 0, H);
  o.addColorStop(0, 'rgba(255,170,60,0.25)'); o.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = o; ctx.fillRect(0, GROUND, W, H - GROUND);
  shadowTop(ctx);
}

function desert(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, '#9fd3f2'); g.addColorStop(1, '#f1e9c9');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
  ctx.fillStyle = 'rgba(255,250,200,0.9)';
  ctx.beginPath(); ctx.arc(140, 70, 34, 0, Math.PI * 2); ctx.fill();
  // dunes
  ctx.fillStyle = '#efc777';
  ctx.beginPath(); ctx.moveTo(0, GROUND);
  ctx.quadraticCurveTo(180, 120, 380, 170); ctx.quadraticCurveTo(560, 210, 700, 150); ctx.quadraticCurveTo(860, 100, 1000, 160);
  ctx.lineTo(W, GROUND); ctx.fill();
  ctx.fillStyle = '#e2b25a';
  ctx.beginPath(); ctx.moveTo(0, GROUND);
  ctx.quadraticCurveTo(250, 160, 520, 200); ctx.quadraticCurveTo(780, 170, 1000, 195);
  ctx.lineTo(W, GROUND); ctx.fill();
  // wooden posts with rope (like the zombie arena)
  for (const x of [230, 760]) {
    ctx.fillStyle = '#7b4a22'; ctx.fillRect(x, 20, 14, GROUND - 10);
    ctx.strokeStyle = '#3e230e'; ctx.lineWidth = 2; ctx.strokeRect(x, 20, 14, GROUND - 10);
  }
  ctx.strokeStyle = '#a7773c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(244, 40); ctx.quadraticCurveTo(500, 90, 760, 40); ctx.stroke();
  // skull on a stick
  ctx.fillStyle = '#f3ecd9';
  ctx.beginPath(); ctx.arc(900, GROUND - 46, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3e230e'; ctx.fillRect(898, GROUND - 35, 4, 35);
  ctx.beginPath(); ctx.arc(896, GROUND - 47, 2.6, 0, Math.PI * 2); ctx.arc(904, GROUND - 47, 2.6, 0, Math.PI * 2); ctx.fill();
  // sand ground
  const s = ctx.createLinearGradient(0, GROUND, 0, H);
  s.addColorStop(0, '#d7b98a'); s.addColorStop(1, '#e8cf9e');
  ctx.fillStyle = s; ctx.fillRect(0, GROUND, W, H - GROUND);
  const r = rng(5);
  ctx.strokeStyle = 'rgba(150,110,60,0.25)'; ctx.lineWidth = 2;
  for (let i = 0; i < 60; i++) {
    const x = r() * W, y = GROUND + 10 + r() * (H - GROUND);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 30, y - 6, x + 60 + r() * 40, y); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(120,90,50,0.35)';
  for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(r() * W, GROUND + r() * (H - GROUND), 1 + r() * 3, 0, Math.PI * 2); ctx.fill(); }
  shadowTop(ctx);
}

function sky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, '#2f6fbf'); g.addColorStop(1, '#a9d8ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, GROUND);
  const r = rng(11);
  // clouds
  for (let i = 0; i < 9; i++) {
    const cx = r() * W, cy = 40 + r() * 120, s = 0.6 + r() * 0.9;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let k = 0; k < 5; k++) {
      ctx.beginPath(); ctx.ellipse(cx + (k - 2) * 26 * s, cy + Math.sin(k) * 6 * s, 30 * s, 18 * s, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // floating fortress silhouette
  ctx.fillStyle = 'rgba(40,70,120,0.55)';
  ctx.beginPath();
  ctx.moveTo(620, 150); ctx.lineTo(640, 90); ctx.lineTo(660, 90); ctx.lineTo(670, 60); ctx.lineTo(690, 60); ctx.lineTo(700, 90); ctx.lineTo(740, 90); ctx.lineTo(760, 150);
  ctx.lineTo(720, 185); ctx.lineTo(660, 185); ctx.closePath(); ctx.fill();
  // metallic hex floor
  ctx.fillStyle = '#9aa6b4'; ctx.fillRect(0, GROUND, W, H - GROUND);
  const hs = 30;
  ctx.lineWidth = 2;
  for (let row = 0; row * hs * 0.86 < H - GROUND + hs; row++) {
    for (let col = -1; col * hs * 1.5 < W + hs; col++) {
      const x = col * hs * 1.5;
      const y = GROUND + row * hs * 1.73 + (col % 2 ? hs * 0.86 : 0);
      ctx.fillStyle = `hsl(212, 14%, ${60 + r() * 12}%)`;
      ctx.strokeStyle = '#5d6877';
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const an = k * Math.PI / 3;
        ctx.lineTo(x + Math.cos(an) * hs, y + Math.sin(an) * hs * 0.86);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  // edge
  ctx.fillStyle = '#4b5666'; ctx.fillRect(0, GROUND - 8, W, 10);
  ctx.fillStyle = '#5fe3ff'; ctx.fillRect(0, GROUND - 3, W, 2);
  shadowTop(ctx);
}

function shadowTop(ctx) {
  const s = ctx.createLinearGradient(0, GROUND, 0, GROUND + 40);
  s.addColorStop(0, 'rgba(0,0,0,0.28)'); s.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = s; ctx.fillRect(0, GROUND, W, 40);
}

// ───────────────────────── World map ─────────────────────────
export function drawWorldMap(canvas, regions) {
  const scale = 2;
  canvas.width = W * scale; canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  const r = rng(3);

  // sea
  const sea = ctx.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, '#7cc6e6'); sea.addColorStop(1, '#4fa3cf');
  ctx.fillStyle = sea; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const x = r() * W, y = r() * H;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y - 4, x + 16, y); ctx.quadraticCurveTo(x + 24, y + 4, x + 32, y); ctx.stroke();
  }

  // landmass
  ctx.fillStyle = '#e9d7a6';
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(20, 520);
  [[10, 380], [40, 240], [130, 170], [220, 60], [380, 40], [480, 120], [470, 260], [520, 360], [500, 500], [620, 520], [740, 470], [740, 330], [700, 240], [740, 140], [840, 40], [980, 40], [990, 200], [960, 400], [900, 470], [760, 545], [560, 548], [300, 545], [120, 548]]
    .forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // region tints
  const blob = (cx, cy, rx, ry, color) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  };
  // dojo: green hills, cherry trees, pagoda
  blob(125, 380, 115, 150, 'rgba(110,180,90,0.55)');
  for (let i = 0; i < 14; i++) tree(ctx, 30 + r() * 200, 300 + r() * 220, r() < 0.5 ? '#f3a6c0' : '#4f9a45');
  pagoda(ctx, 70, 250, '#c0392b');
  // courtyard: grey mountains
  blob(360, 200, 120, 140, 'rgba(150,140,130,0.5)');
  for (let i = 0; i < 7; i++) mountain(ctx, 270 + r() * 200, 100 + r() * 240, 26 + r() * 20);
  // desert
  blob(625, 360, 120, 160, 'rgba(240,190,90,0.7)');
  for (let i = 0; i < 8; i++) dune(ctx, 540 + r() * 180, 260 + r() * 250);
  cactus(ctx, 560, 380); cactus(ctx, 700, 470); cactus(ctx, 690, 300);
  // sky: clouds + castle
  blob(870, 220, 130, 170, 'rgba(160,210,255,0.7)');
  for (let i = 0; i < 8; i++) cloud(ctx, 780 + r() * 190, 80 + r() * 330);
  castle(ctx, 920, 150);

  // region names
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.font = 'bold 17px Rubik, sans-serif';
  const labels = [[125, 545 - 20], [360, 380], [625, 530], [880, 425]];
  regions.forEach((reg, i) => {
    const [x, y] = labels[i];
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,248,230,0.95)';
    ctx.strokeText(reg.name, x, y);
    ctx.fillStyle = '#5a2e0e';
    ctx.fillText(reg.name, x, y);
  });

  // dotted path through all stages
  const pts = regions.flatMap(reg => reg.stages.map(s => s.pos));
  ctx.setLineDash([2, 10]); ctx.lineCap = 'round';
  ctx.strokeStyle = '#6b3b12'; ctx.lineWidth = 5;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (!i) return ctx.moveTo(x, y);
    const [px, py] = pts[i - 1];
    ctx.quadraticCurveTo((px + x) / 2 + (i % 2 ? 25 : -25), (py + y) / 2, x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // compass
  ctx.save(); ctx.translate(960, 515);
  ctx.fillStyle = '#8a1f12';
  ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(6, 0); ctx.lineTo(0, 22); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2d27b';
  ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(0, 6); ctx.lineTo(22, 0); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill();
  ctx.restore();

  // parchment frame
  ctx.strokeStyle = '#6b3b12'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, W - 10, H - 10);
  ctx.strokeStyle = '#d9a05a'; ctx.lineWidth = 3; ctx.strokeRect(14, 14, W - 28, H - 28);
}

function tree(ctx, x, y, c) {
  ctx.fillStyle = '#6b4220'; ctx.fillRect(x - 1.5, y, 3, 8);
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y - 2, 7, 0, Math.PI * 2); ctx.fill();
}
function pagoda(ctx, x, y, c) {
  for (let i = 0; i < 3; i++) {
    const w = 46 - i * 10, yy = y - i * 18;
    ctx.fillStyle = '#f6e7c8'; ctx.fillRect(x - w / 2 + 6, yy - 12, w - 12, 12);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 6, yy - 10); ctx.lineTo(x, yy - 24); ctx.lineTo(x + w / 2 + 6, yy - 10); ctx.closePath(); ctx.fill();
  }
}
function mountain(ctx, x, y, s) {
  ctx.fillStyle = '#8e857c';
  ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y - s * 1.2); ctx.lineTo(x + s, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 0.84); ctx.lineTo(x, y - s * 1.2); ctx.lineTo(x + s * 0.3, y - s * 0.84); ctx.closePath(); ctx.fill();
}
function dune(ctx, x, y) {
  ctx.fillStyle = '#d9a64a';
  ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.quadraticCurveTo(x, y - 18, x + 24, y); ctx.closePath(); ctx.fill();
}
function cactus(ctx, x, y) {
  ctx.fillStyle = '#4f8a3a';
  ctx.fillRect(x - 3, y - 22, 6, 22); ctx.fillRect(x - 10, y - 15, 4, 8); ctx.fillRect(x + 6, y - 18, 4, 9);
  ctx.fillRect(x - 10, y - 11, 8, 3); ctx.fillRect(x + 2, y - 12, 8, 3);
}
function cloud(ctx, x, y) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + (k - 1) * 14, y + (k === 1 ? -6 : 0), 12, 0, Math.PI * 2); ctx.fill(); }
}
function castle(ctx, x, y) {
  ctx.fillStyle = '#5d6b80';
  ctx.fillRect(x - 30, y - 30, 60, 30);
  ctx.fillRect(x - 36, y - 50, 14, 50); ctx.fillRect(x + 22, y - 50, 14, 50); ctx.fillRect(x - 8, y - 62, 16, 62);
  ctx.fillStyle = '#2f6fbf';
  for (const [tx, w, h] of [[x - 29, 14, 50], [x + 29, 14, 50], [x, 16, 62]]) {
    ctx.beginPath(); ctx.moveTo(tx - w / 2 - 3, y - h); ctx.lineTo(tx, y - h - 16); ctx.lineTo(tx + w / 2 + 3, y - h); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#5fe3ff'; ctx.fillRect(x - 4, y - 16, 8, 16);
  roundRect(ctx, x - 40, y, 80, 8, 4); ctx.fillStyle = '#ffffff'; ctx.fill();
}
