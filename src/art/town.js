// The player's town: a floating sky island with clickable buildings (dojo, weapon shop, summon shrine),
// a side islet with the balloon to the battle map, and "coming soon" building plots for future features.
import { drawCharacter, drawWeapon, roundRect } from './character.js';
import { costumeLook } from '../data/ninja-looks.js';
import { DAYLIGHT_LAYOUT, scenePoint, contains } from './village-layout.js';

// Vite emits a hashed asset; the existing PWA worker caches it for offline visits.
const villageURL = new URL('../assets/daylight-village.webp', import.meta.url).href;

const W = 1000, H = 560;
const TAU = Math.PI * 2;
const OUT = '#2b1b12';

// Main island top surface (an ellipse seen from above) and the small balloon islet.
const ISLAND = { x: 430, y: 330, rx: 405, ry: 150 };
const ISLET = { x: 922, y: 222, rx: 70, ry: 30 };

// box = clickable area [x, y, w, h]; sign = label position; soon = not built yet.
export const BUILDINGS = [
  { id: 'dojo',    label: '🥋 הדוג׳ו',       box: [120, 100, 225, 180], sign: [232, 92] },
  { id: 'shrine',  label: '⛩️ מקדש הזימון',  box: [385, 120, 170, 135], sign: [470, 112] },
  { id: 'shop',    label: '🏪 חנות הנשקים',  box: [555, 200, 175, 140], sign: [642, 192] },
  { id: 'balloon', label: '🎈 למפת הקרבות', box: [855, 10, 140, 235],  sign: [922, 272] },
  { id: 'forge',   label: '⚒️ נפחייה',       box: [55, 290, 130, 110],  sign: [120, 282], soon: 'הנפחייה תאפשר לשדרג ולחשל נשקים.' },
  { id: 'arena',   label: '🏟️ זירת אימונים', box: [265, 345, 130, 110], sign: [330, 337], soon: 'בזירת האימונים הנינג׳ות יתאמנו ויצברו ניסיון.' },
  { id: 'clan',    label: '🏯 היכל השבט',    box: [495, 355, 130, 110], sign: [560, 347], soon: 'בהיכל השבט תוכל להצטרף לשבט עם חברים.' },
];

// Where each building stands (base point) and how big it is drawn.
const PLACE = {
  dojo:    { x: 232, y: 272, s: 0.6 },
  shrine:  { x: 470, y: 250, s: 0.78 },
  shop:    { x: 642, y: 335, s: 0.66 },
  balloon: { x: 922, y: 224, s: 0.6 },
  forge:   { x: 120, y: 392, s: 0.8 },
  arena:   { x: 330, y: 447, s: 0.8 },
  clan:    { x: 560, y: 457, s: 0.8 },
};

const WORKER = costumeLook('forest', '#e8b48a');

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

const inIsland = (x, y, pad = 0) => ((x - ISLAND.x) / (ISLAND.rx - pad)) ** 2 + ((y - ISLAND.y) / (ISLAND.ry - pad * 0.4)) ** 2 < 1;

export class TownScene {
  constructor(canvas, { looks = [], townName = '', onEnter }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onEnter = onEnter;
    this.townName = townName;
    this.hover = null;
    this.t = 0;
    this.signTargets = [];
    this.artReady = false;
    this.art = new Image();
    this.art.onload = () => { if (!this.destroyed) this.artReady = true; };
    // Keep the procedural town available if loading the artwork fails.
    this.art.onerror = () => { this.artReady = false; };
    this.art.src = villageURL;
    this.sky = this.makeSky();
    this.island = this.makeIsland();
    // ninjas stroll around the central plaza
    this.walkers = looks.slice(0, 6).map((look, i) => ({
      look, x: 360 + i * 28, y: 274 + (i % 3) * 10, dir: i % 2 ? 1 : -1,
      speed: 14 + (i * 7) % 12, pause: Math.random() * 2, t: Math.random() * 10,
    }));
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    // the canvas can be any shape (phone held upright or sideways), so follow its size directly
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(this.resize) : null;
    this.ro?.observe(canvas);
    this.resize();
    const toWorld = (e) => {
      return scenePoint(canvas.getBoundingClientRect(), e.clientX, e.clientY);
    };
    this.onMove = (e) => {
      const [x, y] = toWorld(e);
      const signTarget = this.signTargets.find(s => contains(s.box, x, y));
      const b = signTarget || [...BUILDINGS].reverse().find(b => contains(this.artReady ? DAYLIGHT_LAYOUT[b.id].box : b.box, x, this.artReady ? y : y - Math.sin(this.t * 0.9) * 3));
      this.hover = b?.id || null;
      canvas.style.cursor = this.hover ? 'pointer' : 'default';
    };
    this.onClick = (e) => { this.onMove(e); if (this.hover) this.onEnter?.(this.hover, BUILDINGS.find(b => b.id === this.hover)); };
    this.onLeave = () => { this.hover = null; };
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('click', this.onClick);
    canvas.addEventListener('pointerleave', this.onLeave);
    this.last = performance.now();
    const frame = (now) => {
      if (this.destroyed) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  destroy() {
    this.destroyed = true;
    this.art.onload = this.art.onerror = null;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.ro?.disconnect();
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    // on a small screen the signs are drawn larger so they stay readable
    const shown = Math.min(r.width, r.height * W / H); // on-screen width of the scene
    this.signScale = shown < 700 ? Math.min(1.4, 600 / Math.max(1, shown)) : 1;
    this.artSignScale = shown < 700 ? Math.min(2, 760 / Math.max(1, shown)) : 1;
  }

  update(dt) {
    this.t += dt;
    for (const w of this.walkers) {
      w.t += dt;
      if (w.pause > 0) { w.pause -= dt; continue; }
      w.x += w.dir * w.speed * dt;
      if (w.x < 345 || w.x > 520) { w.dir *= -1; w.pause = 1 + Math.random() * 2; }
      if (Math.random() < dt * 0.15) w.pause = 1 + Math.random() * 2.5;
    }
  }

  render() {
    const ctx = this.ctx;
    const t = this.t;
    // fit the whole scene in the canvas and let the sky fill whatever space is left over
    const cw = this.canvas.width, ch = this.canvas.height;
    const k = Math.min(cw / W, ch / H);
    const ox = (cw - W * k) / 2 / k, oy = (ch - H * k) / 2 / k;
    ctx.setTransform(k, 0, 0, k, ox * k, oy * k);
    const g = ctx.createLinearGradient(0, -oy, 0, H + oy);
    g.addColorStop(0, '#6fbfee'); g.addColorStop(0.6, '#bfe6f8'); g.addColorStop(1, '#eef9fd');
    ctx.fillStyle = g; ctx.fillRect(-ox, -oy, W + ox * 2, H + oy * 2);
    if (this.artReady) {
      this.renderDaylight(ctx, t);
      return;
    }
    ctx.drawImage(this.sky, 0, 0, W, H);
    // extra clouds in the space above and below the island on tall screens
    for (let i = 0; oy > 20 && i < 8; i++) {
      const x = ((i * 170 + t * (4 + (i % 3))) % 1300) - 150 - ox;
      cloud(ctx, x, i % 2 ? -oy * (0.3 + (i % 3) * 0.2) : H + oy * (0.2 + (i % 4) * 0.18), 0.9 + (i % 3) * 0.3);
    }
    // drifting clouds behind the island
    for (let i = 0; i < 4; i++) {
      const x = ((i * 290 + t * (6 + i * 2)) % 1300) - 150;
      cloud(ctx, x, 60 + (i % 2) * 70, 0.7 + (i % 2) * 0.3);
    }

    // the whole island floats gently
    ctx.save();
    ctx.translate(0, Math.sin(t * 0.9) * 3);
    ctx.drawImage(this.island, 0, 0, W, H);

    // buildings and walkers, back to front
    const items = BUILDINGS.map(b => ({ y: PLACE[b.id].y, draw: () => this.building(b) }));
    for (const w of this.walkers) items.push({ y: w.y, draw: () => this.walker(w) });
    items.sort((a, b) => a.y - b.y).forEach(it => it.draw());

    // signs on top
    ctx.direction = 'rtl';
    const small = this.signScale > 1;
    for (const b of BUILDINGS) {
      const text = b.soon ? (small ? `🚧 ${b.label.split(' ').slice(1).join(' ')}` : `${b.label} · בקרוב`) : b.label;
      sign(ctx, b.sign[0], b.sign[1], text, this.hover === b.id, !!b.soon, this.signScale);
    }
    ctx.restore();

    // a band of cloud in front of the island's underside
    for (let i = 0; i < 6; i++) {
      const x = ((i * 220 - t * (5 + (i % 3))) % 1320 + 1320) % 1320 - 160;
      cloud(ctx, x, 528 + (i % 2) * 18, 1.1 + (i % 3) * 0.25);
    }
    if (this.townName) {
      ctx.direction = 'rtl';
      banner(ctx, 500, 30, this.townName);
    }
    ctx.direction = 'ltr';
  }

  renderDaylight(ctx, t) {
    ctx.drawImage(this.art, 0, 0, W, H);
    ctx.save();
    // A soft pulse over the shrine's painted orb keeps the scene alive.
    const pulse = 0.12 + Math.sin(t * 2.4) * 0.06;
    const glow = ctx.createRadialGradient(468, 170, 1, 468, 170, 17);
    glow.addColorStop(0, `rgba(180,250,255,${pulse + 0.2})`);
    glow.addColorStop(1, 'rgba(80,200,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(468, 170, 17, 0, TAU); ctx.fill();

    [...this.walkers].sort((a, b) => a.y - b.y).forEach(w => this.walker(w));
    // Petals stay subtle and do not cover the building signs or controls.
    for (let i = 0; i < 14; i++) {
      const x = (i * 73 + t * (7 + i % 3)) % 800 + 30;
      const y = 195 + ((i * 39 + t * (4 + i % 2)) % 250);
      ctx.fillStyle = i % 2 ? 'rgba(255,225,236,0.8)' : 'rgba(244,163,193,0.7)';
      ctx.beginPath(); ctx.ellipse(x, y, 2.3, 1.1, Math.sin(t + i), 0, TAU); ctx.fill();
    }
    this.signTargets = [];
    ctx.direction = 'rtl';
    for (const b of BUILDINGS) {
      const layout = DAYLIGHT_LAYOUT[b.id], hot = this.hover === b.id;
      const text = b.soon ? `🚧 ${b.label.split(' ').slice(1).join(' ')}` : b.label;
      const box = villageSign(ctx, ...layout.sign, text, hot, !!b.soon, this.artSignScale);
      this.signTargets.push({ id: b.id, box });
      if (hot) {
        const [x, y, w, h] = layout.box;
        ctx.strokeStyle = 'rgba(255,242,189,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 3, w * 0.4, 7, 0, 0, TAU); ctx.stroke();
      }
    }
    if (this.townName) villageSign(ctx, 570, 28, this.townName, false, false, 1.1);
    ctx.restore();
    ctx.direction = 'ltr';
  }

  building(b) {
    const ctx = this.ctx, p = PLACE[b.id], t = this.t;
    ctx.save();
    if (this.hover === b.id) ctx.filter = 'brightness(1.12) drop-shadow(0 0 10px rgba(255,240,180,0.95))';
    ctx.translate(p.x, p.y);
    ctx.scale(p.s, p.s);
    if (b.id === 'dojo') dojo(ctx, 0, 0);
    else if (b.id === 'shrine') shrine(ctx, 0, 0, t);
    else if (b.id === 'shop') shop(ctx, 0, 0, t);
    else if (b.id === 'balloon') balloon(ctx, 0, 0, t);
    else construction(ctx, t, b.id);
    ctx.restore();
  }

  walker(w) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, 1, 10, 3.5, 0, 0, TAU); ctx.fill();
    drawCharacter(ctx, w.look, { t: w.t, walking: w.pause <= 0, facing: w.dir, scale: 0.78 });
    ctx.restore();
  }

  makeSky() {
    const c = document.createElement('canvas');
    c.width = W * 2; c.height = H * 2;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = 'rgba(255,250,220,0.9)';
    ctx.beginPath(); ctx.arc(110, 78, 36, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,220,0.35)';
    ctx.beginPath(); ctx.arc(110, 78, 54, 0, TAU); ctx.fill();
    // far-away little islands, faded into the sky
    for (const [x, y, s] of [[60, 230, 0.55], [770, 410, 0.5], [975, 420, 0.4]]) farIsland(ctx, x, y, s);
    return c;
  }

  makeIsland() {
    const c = document.createElement('canvas');
    c.width = W * 2; c.height = H * 2;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    const r = rng(11);
    floatingRock(ctx, ISLAND, 210, r);
    floatingRock(ctx, ISLET, 70, r);
    ropeBridge(ctx, 806, 298, 858, 236);

    // sandy paths from the central plaza to every building
    ctx.save();
    ctx.beginPath(); ctx.ellipse(ISLAND.x, ISLAND.y, ISLAND.rx - 14, ISLAND.ry - 8, 0, 0, TAU); ctx.clip();
    const paths = [[[450, 345], [380, 300], [232, 278]], [[450, 345], [465, 300], [470, 255]], [[450, 345], [560, 340], [642, 338]],
      [[450, 345], [630, 300], [800, 296]], [[450, 345], [260, 360], [120, 395]], [[450, 345], [380, 400], [330, 450]], [[450, 345], [520, 410], [560, 460]]];
    for (const [w, col] of [[30, '#c9a46a'], [24, '#e6c98f']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [a, m, b] of paths) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1], b[0], b[1]); ctx.stroke(); }
    }
    // central stone plaza
    ctx.fillStyle = '#c9a46a'; ctx.beginPath(); ctx.ellipse(450, 345, 118, 46, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e9dcc0'; ctx.beginPath(); ctx.ellipse(450, 345, 112, 42, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c4b393'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      const a = r() * TAU, rr = Math.sqrt(r()) * 0.88;
      ctx.beginPath(); ctx.ellipse(450 + Math.cos(a) * 112 * rr, 345 + Math.sin(a) * 42 * rr, 10 + r() * 7, 3.5 + r() * 2, 0, 0, TAU); ctx.stroke();
    }
    // grass tufts, flowers and stones
    for (let i = 0; i < 160; i++) {
      const x = ISLAND.x + (r() * 2 - 1) * ISLAND.rx, y = ISLAND.y + (r() * 2 - 1) * ISLAND.ry;
      if (!inIsland(x, y, 18) || ((x - 450) / 125) ** 2 + ((y - 345) / 52) ** 2 < 1) continue;
      ctx.strokeStyle = '#4b8a36'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 6); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 6); ctx.stroke();
      const q = r();
      if (q < 0.18) { ctx.fillStyle = q < 0.09 ? '#ffd6e5' : '#fff3a0'; ctx.beginPath(); ctx.arc(x, y - 7, 2.4, 0, TAU); ctx.fill(); }
      else if (q > 0.95) { ctx.fillStyle = '#b8b2a8'; ctx.strokeStyle = '#7d7468'; ctx.beginPath(); ctx.ellipse(x, y, 7, 4.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    }
    ctx.restore();

    // trees and bushes around the edge (kept clear of the buildings)
    for (const [x, y, s] of [[60, 330, 0.75], [395, 205, 0.6], [770, 345, 0.7], [700, 430, 0.6], [215, 430, 0.65], [440, 470, 0.55], [585, 230, 0.55]]) cherry(ctx, x, y, s, r);
    for (const [x, y, s] of [[160, 225, 1], [325, 215, 0.9], [740, 270, 0.9], [100, 445, 1], [655, 470, 0.9], [800, 395, 0.8], [250, 470, 0.8]]) bush(ctx, x, y, s);
    for (const x of [372, 528]) lantern(ctx, x, 322, 0);
    return c;
  }
}

// ───────────── pieces
function villageSign(ctx, x, y, text, hot, soon, scale) {
  ctx.save();
  ctx.font = `700 ${soon ? 12 : 14}px Rubik, sans-serif`;
  const w = ctx.measureText(text).width + 22, h = 27;
  x = Math.max(w * scale / 2 + 3, Math.min(W - w * scale / 2 - 3, x));
  ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.shadowColor = 'rgba(25,50,48,0.3)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
  ctx.fillStyle = hot ? '#ffedb3' : soon ? '#f0eadb' : '#f9f3e3';
  ctx.strokeStyle = hot ? '#bd8d40' : '#456b65'; ctx.lineWidth = 1.5;
  roundRect(ctx, -w / 2, -h / 2, w, h, 7); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#294942'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1); ctx.restore();
  return [x - w * scale / 2, y - h * scale / 2, w * scale, h * scale];
}

function cloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + (k - 1.5) * 24 * s, y + (k % 2 ? -6 : 2) * s, 26 * s, 16 * s, 0, 0, TAU); ctx.fill(); }
}

function cherry(ctx, x, y, s, r) {
  ctx.fillStyle = '#6b4220';
  ctx.beginPath(); ctx.moveTo(x - 4 * s, y); ctx.lineTo(x - 2 * s, y - 40 * s); ctx.lineTo(x + 2 * s, y - 40 * s); ctx.lineTo(x + 4 * s, y); ctx.fill();
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i % 2 ? '#f6a9c4' : '#f9c4d6';
    ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 50 * s, y - 50 * s + (r() - 0.5) * 30 * s, (14 + r() * 8) * s, 0, TAU); ctx.fill();
  }
}

function dojo(ctx, cx, by) {
  ctx.save(); ctx.translate(cx, by);
  ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  // stone base & steps
  ctx.fillStyle = '#9b958c'; roundRect(ctx, -160, -22, 320, 22, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b8b2a8'; ctx.fillRect(-40, -8, 80, 8); ctx.strokeRect(-40, -8, 80, 8);
  // walls
  ctx.fillStyle = '#f6e7c8'; ctx.fillRect(-140, -150, 280, 128); ctx.strokeRect(-140, -150, 280, 128);
  ctx.fillStyle = '#5a2e0e';
  for (const x of [-140, -70, 0, 70, 134]) ctx.fillRect(x, -150, 6, 128);
  ctx.fillRect(-140, -150, 280, 8);
  // shoji doors
  ctx.strokeStyle = '#8a4b1c'; ctx.lineWidth = 1.6;
  for (const x0 of [-62, 8]) {
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x0 + i * 15, -140); ctx.lineTo(x0 + i * 15, -24); ctx.stroke(); }
    for (let j = 1; j < 6; j++) { ctx.beginPath(); ctx.moveTo(x0, -140 + j * 20); ctx.lineTo(x0 + 60, -140 + j * 20); ctx.stroke(); }
  }
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
  // lower roof
  ctx.fillStyle = '#c4302b';
  ctx.beginPath();
  ctx.moveTo(-185, -140); ctx.quadraticCurveTo(-150, -150, -130, -180); ctx.lineTo(130, -180); ctx.quadraticCurveTo(150, -150, 185, -140);
  ctx.quadraticCurveTo(0, -158, -185, -140); ctx.closePath(); ctx.fill(); ctx.stroke();
  // upper floor
  ctx.fillStyle = '#f6e7c8'; ctx.fillRect(-90, -225, 180, 45); ctx.strokeRect(-90, -225, 180, 45);
  ctx.fillStyle = '#5a2e0e'; for (const x of [-90, -30, 30, 84]) ctx.fillRect(x, -225, 6, 45);
  // upper roof
  ctx.fillStyle = '#d63c2f';
  ctx.beginPath();
  ctx.moveTo(-130, -218); ctx.quadraticCurveTo(-100, -228, -80, -262); ctx.lineTo(80, -262); ctx.quadraticCurveTo(100, -228, 130, -218);
  ctx.quadraticCurveTo(0, -236, -130, -218); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e8b04a'; ctx.fillRect(-80, -268, 160, 8); ctx.strokeRect(-80, -268, 160, 8);
  // plaque
  ctx.fillStyle = '#1d1b22'; roundRect(ctx, -26, -212, 52, 26, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd36b'; ctx.font = 'bold 18px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('道場', 0, -199);
  ctx.restore();
}

function shop(ctx, cx, by, t) {
  ctx.save(); ctx.translate(cx, by);
  ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  // back wall
  ctx.fillStyle = '#b5773e'; ctx.fillRect(-100, -150, 200, 130); ctx.strokeRect(-100, -150, 200, 130);
  ctx.strokeStyle = 'rgba(60,30,10,0.4)'; ctx.lineWidth = 1.5;
  for (let y = -140; y < -20; y += 14) { ctx.beginPath(); ctx.moveTo(-100, y); ctx.lineTo(100, y); ctx.stroke(); }
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
  // weapon rack
  ctx.fillStyle = '#6b4220'; ctx.fillRect(-85, -128, 170, 6);
  const rack = [['katana', null], ['staff', null], ['nunchaku', null], ['hammer', '#5b5f6b'], ['sai', null]];
  rack.forEach(([w, tint], i) => {
    ctx.save();
    ctx.translate(-68 + i * 34, -118);
    ctx.rotate(Math.PI / 2 + 0.1);
    ctx.scale(0.85, 0.85);
    ctx.lineWidth = 1.6;
    drawWeapon(ctx, w, t, -1, tint);
    ctx.restore();
  });
  // counter
  ctx.fillStyle = '#8a4b1c'; ctx.fillRect(-110, -55, 220, 55); ctx.strokeRect(-110, -55, 220, 55);
  ctx.fillStyle = '#a8612a'; ctx.fillRect(-116, -62, 232, 10); ctx.strokeRect(-116, -62, 232, 10);
  // gold coins on counter
  ctx.fillStyle = '#ffcc33';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(50 + i * 7, -66 - i * 3, 7, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
  // awning
  const n = 8, w = 250 / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#d63c2f';
    const x = -125 + i * w;
    ctx.beginPath();
    ctx.moveTo(x + 8, -190); ctx.lineTo(x + w + 8 - (i === n - 1 ? 0 : 0), -190); ctx.lineTo(x + w, -150);
    ctx.quadraticCurveTo(x + w / 2, -138 + Math.sin(t * 2 + i) * 1.5, x, -150); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  // poles
  ctx.fillStyle = '#6b4220'; ctx.fillRect(-122, -150, 8, 150); ctx.fillRect(114, -150, 8, 150);
  ctx.strokeRect(-122, -150, 8, 150); ctx.strokeRect(114, -150, 8, 150);
  // barrel
  ctx.fillStyle = '#9b6331'; roundRect(ctx, 125, -40, 34, 40, 8); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#3a2620'; ctx.beginPath(); ctx.moveTo(125, -28); ctx.lineTo(159, -28); ctx.moveTo(125, -12); ctx.lineTo(159, -12); ctx.stroke();
  ctx.restore();
}

function balloon(ctx, cx, by, t) {
  const bob = Math.sin(t * 1.4) * 7;
  ctx.save(); ctx.translate(cx, by);
  ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  // platform
  ctx.fillStyle = '#8a4b1c'; roundRect(ctx, -70, -14, 140, 14, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#6b4220'; ctx.fillRect(-62, 0, 10, 12); ctx.fillRect(52, 0, 10, 12);
  // tether ropes
  ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-60, -14); ctx.lineTo(-22, -70 + bob); ctx.moveTo(60, -14); ctx.lineTo(22, -70 + bob); ctx.stroke();
  ctx.translate(0, bob);
  // basket
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
  ctx.fillStyle = '#b5773e'; roundRect(ctx, -26, -96, 52, 34, 5); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#7a4a1f'; ctx.lineWidth = 1.2;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-26 + i * 10.4, -96); ctx.lineTo(-26 + i * 10.4, -62); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-26, -80); ctx.lineTo(26, -80); ctx.stroke();
  // ropes to envelope
  ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-24, -96); ctx.lineTo(-40, -150); ctx.moveTo(24, -96); ctx.lineTo(40, -150); ctx.moveTo(0, -96); ctx.lineTo(0, -150); ctx.stroke();
  // envelope
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-40, -150);
  ctx.bezierCurveTo(-110, -200, -95, -330, 0, -335);
  ctx.bezierCurveTo(95, -330, 110, -200, 40, -150);
  ctx.closePath();
  ctx.fillStyle = '#ff9d2e'; ctx.fill();
  ctx.clip();
  for (let i = -3; i <= 3; i++) {
    if (i % 2 === 0) continue;
    ctx.fillStyle = '#d63c2f';
    ctx.beginPath(); ctx.ellipse(i * 26, -240, 13, 110, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.ellipse(-35, -270, 14, 40, -0.3, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-40, -150);
  ctx.bezierCurveTo(-110, -200, -95, -330, 0, -335);
  ctx.bezierCurveTo(95, -330, 110, -200, 40, -150);
  ctx.closePath(); ctx.stroke();
  // band
  ctx.fillStyle = '#ffd36b'; roundRect(ctx, -44, -160, 88, 12, 5); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function shrine(ctx, cx, by, t) {
  ctx.save(); ctx.translate(cx, by);
  ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  // small shrine building behind
  ctx.fillStyle = '#9b958c'; ctx.fillRect(-60, -12, 120, 12); ctx.strokeRect(-60, -12, 120, 12);
  ctx.fillStyle = '#f6e7c8'; ctx.fillRect(-45, -70, 90, 58); ctx.strokeRect(-45, -70, 90, 58);
  ctx.fillStyle = '#5a2e0e'; ctx.fillRect(-12, -55, 24, 43);
  ctx.fillStyle = '#3a3e46';
  ctx.beginPath(); ctx.moveTo(-68, -66); ctx.quadraticCurveTo(-40, -74, -30, -100); ctx.lineTo(30, -100); ctx.quadraticCurveTo(40, -74, 68, -66); ctx.closePath(); ctx.fill(); ctx.stroke();
  // glowing orb
  const pulse = 0.7 + Math.sin(t * 3) * 0.3;
  const g = ctx.createRadialGradient(0, -128, 2, 0, -128, 32);
  g.addColorStop(0, `rgba(255,240,255,${pulse})`); g.addColorStop(0.4, `rgba(180,92,255,${0.7 * pulse})`); g.addColorStop(1, 'rgba(180,92,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -128 + Math.sin(t * 2) * 4, 32, 0, TAU); ctx.fill();
  // torii gate in front
  ctx.fillStyle = '#d63c2f';
  ctx.fillRect(-82, -120, 12, 132); ctx.strokeRect(-82, -120, 12, 132);
  ctx.fillRect(70, -120, 12, 132); ctx.strokeRect(70, -120, 12, 132);
  ctx.fillRect(-92, -110, 184, 9); ctx.strokeRect(-92, -110, 184, 9);
  ctx.fillStyle = '#c4161c';
  ctx.beginPath(); ctx.moveTo(-105, -128); ctx.quadraticCurveTo(0, -120, 105, -128); ctx.lineTo(100, -142); ctx.quadraticCurveTo(0, -134, -100, -142); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#1d1b22'; ctx.fillRect(-105, -146, 210, 5);
  ctx.restore();
}

function farIsland(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#9c8a78';
  ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-30, 40); ctx.lineTo(-8, 70); ctx.lineTo(12, 38); ctx.lineTo(40, 30); ctx.lineTo(60, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8fc47a';
  ctx.beginPath(); ctx.ellipse(0, 0, 62, 16, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#7ab866';
  ctx.beginPath(); ctx.arc(-20, -12, 14, 0, TAU); ctx.arc(8, -16, 18, 0, TAU); ctx.fill();
  ctx.restore();
}

// Earth-and-rock underside hanging below a grassy ellipse, with dangling rock tips.
function floatingRock(ctx, e, depth, r) {
  const { x, y, rx, ry } = e;
  ctx.save();
  ctx.lineJoin = 'round';
  // underside silhouette
  const pts = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n); // 0..PI across the front half of the rim
    const px = x + Math.cos(a) * rx;
    const edge = y + Math.sin(a) * ry;
    const mid = 1 - Math.abs(i / n - 0.5) * 2; // 0 at the sides, 1 in the middle
    const tip = (i % 2 ? 0.35 : 1) * (0.25 + 0.75 * mid ** 0.8) * depth * (0.75 + r() * 0.35);
    pts.push([px, edge + tip]);
  }
  ctx.beginPath();
  ctx.moveTo(x + rx, y);
  pts.forEach(([px, py]) => ctx.lineTo(px, py));
  ctx.lineTo(x - rx, y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + ry + depth);
  g.addColorStop(0, '#b5773e'); g.addColorStop(0.45, '#8a4a1c'); g.addColorStop(1, '#4f2a0e');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
  // rock strata
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(59,32,12,0.35)'; ctx.lineWidth = 2;
  for (let k = 1; k < 5; k++) {
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI * (i / 20);
      const px = x + Math.cos(a) * rx * (1 - k * 0.06), py = y + Math.sin(a) * ry + k * depth * 0.16 + Math.sin(i * 1.7 + k) * 4;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  // boulders in the cliff
  for (let i = 0; i < Math.round(rx / 18); i++) {
    const a = 0.15 + r() * (Math.PI - 0.3);
    const px = x + Math.cos(a) * rx * 0.85, py = y + Math.sin(a) * ry + 18 + r() * depth * 0.4;
    ctx.fillStyle = r() < 0.5 ? '#9b958c' : '#7d7468';
    ctx.beginPath(); ctx.ellipse(px, py, 8 + r() * 10, 6 + r() * 6, r(), 0, TAU); ctx.fill();
  }
  // dangling roots
  ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.6;
  for (let i = 0; i < Math.round(rx / 30); i++) {
    const a = 0.2 + r() * (Math.PI - 0.4);
    const px = x + Math.cos(a) * rx * 0.95, py = y + Math.sin(a) * ry + 6;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 6, py + 20, px - 2, py + 30 + r() * 25); ctx.stroke();
  }
  ctx.restore();
  // grassy top with a thick lip
  ctx.fillStyle = '#4b8a36';
  ctx.beginPath(); ctx.ellipse(x, y + 9, rx + 2, ry + 3, 0, 0, TAU); ctx.fill(); ctx.stroke();
  const gg = ctx.createRadialGradient(x - rx * 0.2, y - ry * 0.4, 10, x, y, rx);
  gg.addColorStop(0, '#9bd27a'); gg.addColorStop(1, '#6aa94e');
  ctx.fillStyle = gg;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#3f7a2c'; ctx.lineWidth = 2; ctx.stroke();
  // grass fringe hanging over the lip
  ctx.fillStyle = '#6aa94e';
  for (let i = 0; i < Math.round(rx / 7); i++) {
    const a = 0.05 + (i / Math.round(rx / 7)) * (Math.PI - 0.1);
    const px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry + 6;
    ctx.beginPath(); ctx.moveTo(px - 5, py - 4); ctx.lineTo(px, py + 5 + (i % 3) * 2); ctx.lineTo(px + 5, py - 4); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function ropeBridge(ctx, x1, y1, x2, y2) {
  ctx.save();
  ctx.lineCap = 'round';
  const planks = 8;
  for (let i = 0; i <= planks; i++) {
    const k = i / planks, sag = Math.sin(k * Math.PI) * 12;
    const x = x1 + (x2 - x1) * k, y = y1 + (y2 - y1) * k + sag;
    ctx.fillStyle = i % 2 ? '#a8612a' : '#b5773e'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2);
    roundRect(ctx, -9, -2.5, 18, 5, 1.5); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  // hand ropes and posts
  ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 2;
  for (const off of [-9, 9]) {
    ctx.beginPath(); ctx.moveTo(x1 + off * 0.6, y1 - 16 + off * 0.5);
    ctx.quadraticCurveTo((x1 + x2) / 2 + off * 0.6, (y1 + y2) / 2 + 8 + off * 0.5, x2 + off * 0.6, y2 - 16 + off * 0.5); ctx.stroke();
  }
  ctx.fillStyle = '#6b4220'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
  for (const [x, y] of [[x1 - 6, y1 - 4], [x1 + 6, y1 + 6], [x2 - 6, y2 - 4], [x2 + 6, y2 + 6]]) { ctx.fillRect(x - 2.5, y - 18, 5, 20); ctx.strokeRect(x - 2.5, y - 18, 5, 20); }
  ctx.restore();
}

function bush(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(0, 2, 22, 6, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#2f5e22'; ctx.lineWidth = 1.5;
  for (const [dx, dy, rr, c] of [[-12, -8, 12, '#4f9a3c'], [10, -9, 13, '#4f9a3c'], [0, -16, 14, '#5fae48'], [-3, -12, 9, '#74c25a']]) {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(dx, dy, rr, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

// A building plot under construction: stone base, timber frame, ladder, lumber, and a ninja hammering away.
function construction(ctx, t, kind) {
  ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';
  const roof = { forge: '#5b5f6b', arena: '#c4302b', clan: '#6d4a8f' }[kind] || '#c4302b';
  // dirt patch & stone base
  ctx.fillStyle = '#c9a46a'; ctx.beginPath(); ctx.ellipse(0, -4, 80, 18, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#9b958c'; roundRect(ctx, -62, -16, 124, 14, 3); ctx.fill(); ctx.stroke();
  // timber frame (posts + beams)
  ctx.fillStyle = '#b5773e';
  for (const x of [-56, -20, 16, 50]) { ctx.fillRect(x, -96, 7, 80); ctx.strokeRect(x, -96, 7, 80); }
  ctx.fillStyle = '#a8612a';
  ctx.fillRect(-62, -100, 124, 8); ctx.strokeRect(-62, -100, 124, 8);
  ctx.fillRect(-58, -58, 116, 6); ctx.strokeRect(-58, -58, 116, 6);
  // diagonal brace
  ctx.strokeStyle = '#8a4b1c'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-50, -20); ctx.lineTo(-22, -56); ctx.moveTo(22, -56); ctx.lineTo(50, -20); ctx.stroke();
  ctx.strokeStyle = OUT; ctx.lineWidth = 2.5;
  // half-built roof: rafters and a few tiles in the planned colour
  ctx.strokeStyle = '#8a4b1c'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-70, -98); ctx.lineTo(0, -136); ctx.lineTo(70, -98); ctx.stroke();
  ctx.lineWidth = 2.5;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-70 + i * 17.5, -98 - i * 9.5); ctx.lineTo(-70 + i * 17.5, -98); ctx.stroke(); }
  ctx.strokeStyle = OUT;
  ctx.fillStyle = roof;
  ctx.beginPath(); ctx.moveTo(-74, -96); ctx.lineTo(-38, -116); ctx.lineTo(-30, -108); ctx.lineTo(-64, -90); ctx.closePath(); ctx.fill(); ctx.stroke();
  // ladder
  ctx.strokeStyle = '#6b4220'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(56, -2); ctx.lineTo(76, -104); ctx.moveTo(70, 0); ctx.lineTo(90, -102); ctx.stroke();
  ctx.lineWidth = 2;
  for (let i = 1; i < 7; i++) { const k = i / 7; ctx.beginPath(); ctx.moveTo(56 + 20 * k, -2 - 102 * k); ctx.lineTo(70 + 20 * k, -102 * k); ctx.stroke(); }
  // lumber pile
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i % 2 ? '#b5773e' : '#c98a4c';
    roundRect(ctx, -92 + i * 4, -10 - i * 7, 38, 7, 2); ctx.fill(); ctx.stroke();
  }
  // "under construction" barrier in the game's red & cream
  ctx.save(); ctx.translate(18, -6);
  ctx.fillStyle = '#6b4220'; ctx.fillRect(-26, -16, 4, 16); ctx.fillRect(22, -16, 4, 16);
  ctx.beginPath(); roundRect(ctx, -30, -24, 60, 10, 3); ctx.save(); ctx.clip();
  for (let i = -4; i < 8; i++) { ctx.fillStyle = i % 2 ? '#fff3d6' : '#d63c2f'; ctx.beginPath(); ctx.moveTo(-30 + i * 10, -14); ctx.lineTo(-20 + i * 10, -24); ctx.lineTo(-14 + i * 10, -24); ctx.lineTo(-24 + i * 10, -14); ctx.fill(); }
  ctx.restore(); roundRect(ctx, -30, -24, 60, 10, 3); ctx.stroke();
  ctx.restore();
  // worker ninja swinging a hammer
  ctx.save(); ctx.translate(-30, -2);
  drawCharacter(ctx, { ...WORKER, weapon: 'hammer' }, { t, attack: (t * 1.4) % 1, facing: 1, scale: 0.85 });
  ctx.restore();
  if (((t * 1.4) % 1) > 0.55 && ((t * 1.4) % 1) < 0.7) {
    ctx.fillStyle = '#ffd36b';
    for (let i = 0; i < 4; i++) { const a = -0.4 - i * 0.5; ctx.beginPath(); ctx.arc(-6 + Math.cos(a) * 12, -34 + Math.sin(a) * 12, 2, 0, TAU); ctx.fill(); }
  }
}

function lantern(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#7d7468'; ctx.fillRect(-4, -40, 8, 40);
  ctx.fillStyle = '#9b958c'; ctx.fillRect(-12, -58, 24, 18);
  ctx.fillStyle = `rgba(255,210,90,${0.75 + Math.sin(t * 4 + x) * 0.2})`; ctx.fillRect(-7, -54, 14, 10);
  ctx.fillStyle = '#5d564d';
  ctx.beginPath(); ctx.moveTo(-17, -58); ctx.lineTo(0, -70); ctx.lineTo(17, -58); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function sign(ctx, x, y, text, hot, soon = false, scale = 1) {
  ctx.save();
  ctx.font = `700 ${soon ? 14 : 16}px Rubik, sans-serif`;
  const w = ctx.measureText(text).width + 26;
  const k = scale * (hot ? 1.08 : 1);
  x = Math.max(w * k / 2 + 4, Math.min(W - w * k / 2 - 4, x));
  ctx.translate(x, y + (hot ? -4 : 0));
  ctx.scale(k, k);
  ctx.fillStyle = hot ? '#fff3d6' : soon ? '#e9dcc0' : '#f0cf8f';
  if (soon) ctx.setLineDash([5, 3]);
  ctx.strokeStyle = '#5a2e0e'; ctx.lineWidth = 3;
  roundRect(ctx, -w / 2, -15, w, 30, 9); ctx.fill(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = soon ? '#7d5a3a' : '#3b200c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

function banner(ctx, x, y, text) {
  ctx.save();
  ctx.font = '800 20px Rubik, sans-serif';
  const w = ctx.measureText(text).width + 60;
  ctx.translate(x, y);
  ctx.fillStyle = '#c4302b'; ctx.strokeStyle = '#5a2e0e'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w / 2 - 14, -16); ctx.lineTo(w / 2 + 14, -16); ctx.lineTo(w / 2, 0); ctx.lineTo(w / 2 + 14, 16); ctx.lineTo(-w / 2 - 14, 16); ctx.lineTo(-w / 2, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}
