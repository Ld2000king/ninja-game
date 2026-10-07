// The player's town: an animated, clickable scene (dojo, weapon shop, balloon to the battle map, summon shrine).
import { drawCharacter, drawWeapon, roundRect } from './character.js';

const W = 1000, H = 560;
const TAU = Math.PI * 2;
const OUT = '#2b1b12';

export const BUILDINGS = [
  { id: 'shrine', label: '⛩️ מקדש הזימון', box: [395, 120, 215, 175], sign: [502, 112] },
  { id: 'dojo',   label: '🥋 הדוג׳ו',       box: [45, 150, 330, 270],  sign: [210, 140] },
  { id: 'shop',   label: '🏪 חנות הנשקים',  box: [560, 230, 230, 200], sign: [675, 222] },
  { id: 'balloon', label: '🎈 למפת הקרבות', box: [800, 50, 185, 360],  sign: [890, 410] },
];

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export class TownScene {
  constructor(canvas, { looks = [], townName = '', onEnter }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onEnter = onEnter;
    this.townName = townName;
    this.hover = null;
    this.t = 0;
    this.bg = this.makeBackground();
    this.walkers = looks.slice(0, 7).map((look, i) => ({
      look, x: 300 + i * 70, y: 470 + (i % 3) * 22, dir: i % 2 ? 1 : -1,
      speed: 18 + (i * 7) % 15, pause: Math.random() * 2, t: Math.random() * 10,
    }));
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    const toWorld = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    this.onMove = (e) => {
      const [x, y] = toWorld(e);
      const b = [...BUILDINGS].reverse().find(b => x >= b.box[0] && x <= b.box[0] + b.box[2] && y >= b.box[1] && y <= b.box[1] + b.box[3]);
      this.hover = b?.id || null;
      canvas.style.cursor = this.hover ? 'pointer' : 'default';
    };
    this.onClick = (e) => { this.onMove(e); if (this.hover) this.onEnter?.(this.hover); };
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
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('click', this.onClick);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
  }

  update(dt) {
    this.t += dt;
    for (const w of this.walkers) {
      w.t += dt;
      if (w.pause > 0) { w.pause -= dt; continue; }
      w.x += w.dir * w.speed * dt;
      if (w.x < 280 || w.x > 790) { w.dir *= -1; w.pause = 1 + Math.random() * 2; }
      if (Math.random() < dt * 0.15) w.pause = 1 + Math.random() * 2.5;
    }
  }

  render() {
    const ctx = this.ctx;
    const k = this.canvas.width / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.drawImage(this.bg, 0, 0, W, H);
    // drifting clouds
    for (let i = 0; i < 5; i++) {
      const x = ((i * 230 + this.t * (8 + i * 3)) % 1250) - 150;
      cloud(ctx, x, 40 + (i % 3) * 32, 0.8 + (i % 2) * 0.4);
    }
    this.building('shrine', () => shrine(ctx, 502, 290, this.t));
    this.building('dojo', () => dojo(ctx, 210, 420));
    this.building('shop', () => shop(ctx, 675, 430, this.t));
    this.building('balloon', () => balloon(ctx, 892, 400, this.t));

    // lanterns along the plaza
    for (const x of [300, 520, 800]) lantern(ctx, x, 455, this.t);

    // wandering ninjas
    const ws = [...this.walkers].sort((a, b) => a.y - b.y);
    for (const w of ws) {
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(0, 1, 14, 5, 0, 0, TAU); ctx.fill();
      drawCharacter(ctx, w.look, { t: w.t, walking: w.pause <= 0, facing: w.dir, scale: 1.05 });
      ctx.restore();
    }

    // signs on top
    ctx.direction = 'rtl';
    for (const b of BUILDINGS) sign(ctx, b.sign[0], b.sign[1], b.label, this.hover === b.id);
    if (this.townName) {
      ctx.direction = 'rtl';
      banner(ctx, 500, 30, this.townName);
    }
    ctx.direction = 'ltr';
  }

  building(id, draw) {
    const ctx = this.ctx;
    ctx.save();
    if (this.hover === id) ctx.filter = 'brightness(1.12) drop-shadow(0 0 10px rgba(255,240,180,0.95))';
    draw();
    ctx.restore();
  }

  makeBackground() {
    const c = document.createElement('canvas');
    c.width = W * 2; c.height = H * 2;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    const r = rng(9);
    // sky
    const g = ctx.createLinearGradient(0, 0, 0, 320);
    g.addColorStop(0, '#7cc6f0'); g.addColorStop(1, '#dff3fb');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,250,220,0.9)';
    ctx.beginPath(); ctx.arc(120, 80, 38, 0, TAU); ctx.fill();
    // far mountains
    ctx.fillStyle = '#9cc3d9';
    ctx.beginPath(); ctx.moveTo(0, 260);
    [[80, 180], [190, 230], [300, 150], [420, 220], [560, 140], [700, 210], [820, 160], [1000, 220]].forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(W, 320); ctx.lineTo(0, 320); ctx.fill();
    ctx.fillStyle = '#f4fbff';
    for (const [x, y] of [[300, 150], [560, 140], [820, 160]]) {
      ctx.beginPath(); ctx.moveTo(x - 22, y + 22); ctx.lineTo(x, y); ctx.lineTo(x + 22, y + 22); ctx.closePath(); ctx.fill();
    }
    // hills
    ctx.fillStyle = '#86c06a';
    ctx.beginPath(); ctx.moveTo(0, 300);
    ctx.quadraticCurveTo(250, 230, 500, 285); ctx.quadraticCurveTo(760, 240, 1000, 290);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    // grass
    const gg = ctx.createLinearGradient(0, 300, 0, H);
    gg.addColorStop(0, '#79b85a'); gg.addColorStop(1, '#5e9e45');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.moveTo(0, 330); ctx.quadraticCurveTo(500, 300, 1000, 330); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    // stone plaza
    ctx.fillStyle = '#d9cdb4';
    ctx.beginPath(); ctx.ellipse(540, 485, 330, 70, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#b5a68a'; ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const a = r() * TAU, rr = Math.sqrt(r());
      const x = 540 + Math.cos(a) * 300 * rr, y = 485 + Math.sin(a) * 60 * rr;
      ctx.beginPath(); ctx.ellipse(x, y, 14 + r() * 10, 5 + r() * 3, 0, 0, TAU); ctx.stroke();
    }
    // path to the shrine
    ctx.fillStyle = '#d9cdb4';
    ctx.beginPath(); ctx.moveTo(470, 425); ctx.lineTo(490, 300); ctx.lineTo(515, 300); ctx.lineTo(560, 425); ctx.closePath(); ctx.fill();
    // grass tufts & flowers
    for (let i = 0; i < 70; i++) {
      const x = r() * W, y = 330 + r() * 230;
      if (Math.abs(x - 540) < 330 * Math.sqrt(Math.max(0, 1 - ((y - 485) / 70) ** 2))) continue;
      ctx.strokeStyle = '#4b8a36'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 7); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 7); ctx.stroke();
      if (r() < 0.3) { ctx.fillStyle = r() < 0.5 ? '#ffd6e5' : '#fff3a0'; ctx.beginPath(); ctx.arc(x, y - 8, 2.5, 0, TAU); ctx.fill(); }
    }
    // cherry trees
    for (const [x, y, s] of [[30, 330, 1.1], [395, 330, 0.8], [620, 320, 0.8], [970, 470, 1.2], [20, 520, 1.3]]) cherry(ctx, x, y, s, r);
    return c;
  }
}

// ───────────── pieces
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

function lantern(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#7d7468'; ctx.fillRect(-4, -40, 8, 40);
  ctx.fillStyle = '#9b958c'; ctx.fillRect(-12, -58, 24, 18);
  ctx.fillStyle = `rgba(255,210,90,${0.75 + Math.sin(t * 4 + x) * 0.2})`; ctx.fillRect(-7, -54, 14, 10);
  ctx.fillStyle = '#5d564d';
  ctx.beginPath(); ctx.moveTo(-17, -58); ctx.lineTo(0, -70); ctx.lineTo(17, -58); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function sign(ctx, x, y, text, hot) {
  ctx.save();
  ctx.font = '700 17px Rubik, sans-serif';
  const w = ctx.measureText(text).width + 30;
  ctx.translate(x, y + (hot ? -4 : 0));
  ctx.scale(hot ? 1.08 : 1, hot ? 1.08 : 1);
  ctx.fillStyle = hot ? '#fff3d6' : '#f0cf8f';
  ctx.strokeStyle = '#5a2e0e'; ctx.lineWidth = 3;
  roundRect(ctx, -w / 2, -17, w, 34, 9); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3b200c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
