// Procedural chibi-ninja renderer. Everything is drawn with Canvas 2D – no image assets.
// Origin = point between the feet. Character faces +x; flip with pose.facing = -1.
import { drawNinja } from './ninja.js';

const OUT = '#2b1b12';
const TAU = Math.PI * 2;

const AURAS = {
  fire:  ['rgba(255,120,30,', 'rgba(255,60,20,'],
  ice:   ['rgba(120,210,255,', 'rgba(60,150,255,'],
  life:  ['rgba(120,255,140,', 'rgba(40,200,90,'],
  storm: ['rgba(110,230,255,', 'rgba(120,90,255,'],
  dark:  ['rgba(150,40,60,', 'rgba(60,0,30,'],
  ghost: ['rgba(200,140,255,', 'rgba(110,40,200,'],
};

/**
 * @param ctx  CanvasRenderingContext2D (already translated to the unit's feet)
 * @param look look definition from units.js
 * @param p    pose: { t, walking, attack (-1 or 0..1), ranged, facing, scale, alpha, hurt }
 */
export function drawCharacter(ctx, look, p = {}) {
  if (look.custom === 'turtle' || p.custom === 'turtle') return drawTurtle(ctx, p);
  if (look.ninjaStyle) return drawNinja(ctx, look, p, drawWeapon, drawAura);
  const t = p.t || 0;
  const s = (look.scale || 1) * (p.scale || 1);
  ctx.save();
  ctx.scale((p.facing || 1) * s, s);
  if (p.alpha != null) ctx.globalAlpha *= p.alpha;
  if (look.ghost) ctx.globalAlpha *= 0.88;

  const walkPhase = p.walking ? Math.sin(t * 11) : 0;
  const bob = p.walking ? -Math.abs(Math.sin(t * 11)) * 2.2 : Math.sin(t * 2.6) * 0.7;

  if (look.aura) drawAura(ctx, look.aura, t);

  ctx.translate(0, bob);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = OUT;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // ── arm angles (0 = straight down, +PI/2 = straight forward, PI = straight up)
  let front = 0.55 + walkPhase * 0.25;
  let back = 0.2 - walkPhase * 0.35;
  const a = p.attack;
  if (a != null && a >= 0) {
    if (p.ranged) {
      // quick throw / cast thrust
      const k = a < 0.4 ? a / 0.4 : 1 - (a - 0.4) / 0.6;
      front = 0.9 + k * 1.0;
    } else {
      // overhead slash: wind up then strike down-forward
      front = a < 0.35 ? 0.55 + (a / 0.35) * 2.6 : 3.15 - easeOut((a - 0.35) / 0.65) * 2.9;
    }
  }
  if (look.weapon === 'bow') { front = 1.45; back = 1.25; }
  if (look.zombie) { front = 1.35 + Math.sin(t * 3) * 0.1; back = 1.25 + Math.cos(t * 3) * 0.1; }

  // ── behind body
  if (look.scarf) drawScarf(ctx, look.scarf, t);
  drawHairBack(ctx, look, t);
  drawArm(ctx, -5, -25, back, look, false);
  drawLeg(ctx, -4, p.air ? 1.0 : walkPhase * 0.7, look);
  drawLeg(ctx, 4, p.air ? -0.6 : -walkPhase * 0.7, look);

  // ── torso
  drawTorso(ctx, look);

  // ── head
  drawHead(ctx, look, t);

  // ── front arm + weapon
  drawArm(ctx, 4, -25, front, look, true, t, a);

  ctx.restore();
}

function easeOut(x) { return 1 - (1 - x) * (1 - x); }

function drawAura(ctx, kind, t) {
  const [c1, c2] = AURAS[kind] || AURAS.fire;
  const pulse = 0.75 + Math.sin(t * 4) * 0.25;
  const g = ctx.createRadialGradient(0, -30, 4, 0, -30, 40);
  g.addColorStop(0, c1 + (0.45 * pulse).toFixed(3) + ')');
  g.addColorStop(0.6, c2 + (0.18 * pulse).toFixed(3) + ')');
  g.addColorStop(1, c2 + '0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -30, 34, 42, 0, 0, TAU);
  ctx.fill();
  // floating particles
  for (let i = 0; i < 5; i++) {
    const ph = (t * 0.8 + i / 5) % 1;
    const x = Math.sin(i * 7.3 + t * 1.5) * 18;
    const y = -6 - ph * 60;
    ctx.fillStyle = c1 + (0.8 * (1 - ph)).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(x, y, 1.8 * (1 - ph) + 0.6, 0, TAU);
    ctx.fill();
  }
}

function drawLeg(ctx, x, ang, look) {
  ctx.save();
  ctx.translate(x, -12);
  ctx.rotate(-ang);
  ctx.fillStyle = look.outfit2 || '#333';
  roundRect(ctx, -3, 0, 6, 10, 2);
  ctx.fill(); ctx.stroke();
  // foot (tabi)
  ctx.fillStyle = look.zombie ? look.skin : '#2a2a30';
  ctx.beginPath();
  ctx.ellipse(1.2, 11, 4, 2.4, 0, 0, TAU);
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawTorso(ctx, look) {
  ctx.fillStyle = look.outfit;
  roundRect(ctx, -8.5, -30, 17, 20, 5);
  ctx.fill(); ctx.stroke();
  // gi collar (V)
  ctx.strokeStyle = look.outfit2;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-3, -29); ctx.lineTo(3, -20); ctx.lineTo(7, -29);
  ctx.stroke();
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
  // belt
  ctx.fillStyle = look.belt || '#222';
  ctx.fillRect(-8.5, -17.5, 17, 4);
  ctx.strokeRect(-8.5, -17.5, 17, 4);
  // belt knot tail
  ctx.beginPath();
  ctx.moveTo(-6, -14); ctx.lineTo(-9, -9); ctx.lineTo(-5, -10); ctx.closePath();
  ctx.fill(); ctx.stroke();
  if (look.beads) {
    ctx.fillStyle = '#6b2a10';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(-4 + i * 2.2, -27 + Math.sin(i / 5 * Math.PI) * 6, 1.4, 0, TAU);
      ctx.fill();
    }
  }
  if (look.zombie) {
    // torn cloth
    ctx.fillStyle = look.outfit2;
    ctx.beginPath();
    ctx.moveTo(-8, -10); ctx.lineTo(-5, -6); ctx.lineTo(-2, -10); ctx.lineTo(2, -6); ctx.lineTo(5, -10); ctx.lineTo(8, -7); ctx.lineTo(8, -10);
    ctx.closePath(); ctx.fill();
  }
}

function drawArm(ctx, sx, sy, ang, look, isFront, t = 0, attack) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-ang);
  // sleeve
  ctx.fillStyle = isFront ? look.outfit : shade(look.outfit, -18);
  roundRect(ctx, -3, -1, 6, 10, 3);
  ctx.fill(); ctx.stroke();
  // hand
  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(0, 11.5, 3.3, 0, TAU);
  ctx.fill(); ctx.stroke();
  if (isFront) {
    ctx.translate(0, 11.5);
    drawWeapon(ctx, look.weapon, t, attack, look.weaponTint);
  }
  ctx.restore();
}

// Weapons are drawn in the hand's frame: the blade points along +x (after a small tilt).
export function drawWeapon(ctx, w, t = 0, attack, tint) {
  if (!w || w === 'none') return;
  ctx.save();
  switch (w) {
    case 'katana':
    case 'flamekatana': {
      ctx.rotate(-0.6);
      // handle
      ctx.fillStyle = '#3a2620';
      roundRect(ctx, -9, -1.8, 9, 3.6, 1.5); ctx.fill(); ctx.stroke();
      // guard
      ctx.fillStyle = '#e2b84a';
      ctx.fillRect(-0.8, -4, 2.6, 8); ctx.strokeRect(-0.8, -4, 2.6, 8);
      // blade
      const flame = w === 'flamekatana';
      if (flame) { ctx.shadowColor = '#ff6a00'; ctx.shadowBlur = 10; }
      ctx.fillStyle = flame ? '#ffd2a8' : (tint || '#eef3f7');
      ctx.beginPath();
      ctx.moveTo(1.8, -2.4);
      ctx.quadraticCurveTo(22, -4.5, 38, -1.5);
      ctx.lineTo(36, 1.2);
      ctx.quadraticCurveTo(20, 1.8, 1.8, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.strokeStyle = flame ? '#ff5a1f' : '#9fb1bf';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(20, -1, 34, -0.4); ctx.stroke();
      if (flame) {
        for (let i = 0; i < 4; i++) {
          const fx = 8 + i * 8, fl = 4 + Math.sin(t * 20 + i) * 2;
          ctx.fillStyle = i % 2 ? 'rgba(255,200,40,0.8)' : 'rgba(255,90,20,0.8)';
          ctx.beginPath();
          ctx.moveTo(fx - 3, -2); ctx.quadraticCurveTo(fx, -2 - fl * 2, fx + 3, -2); ctx.fill();
        }
      }
      break;
    }
    case 'sai': {
      ctx.rotate(-0.4);
      ctx.fillStyle = '#3a2620';
      roundRect(ctx, -7, -1.5, 7, 3, 1); ctx.fill(); ctx.stroke();
      ctx.fillStyle = tint || '#dfe6ec';
      ctx.fillRect(0, -1, 20, 2); ctx.strokeRect(0, -1, 20, 2);
      ctx.beginPath();
      ctx.moveTo(1, 0); ctx.quadraticCurveTo(4, -7, 8, -6);
      ctx.moveTo(1, 0); ctx.quadraticCurveTo(4, 7, 8, 6);
      ctx.lineWidth = 2.2; ctx.strokeStyle = tint || '#dfe6ec'; ctx.stroke();
      break;
    }
    case 'staff': {
      ctx.rotate(-0.9);
      ctx.fillStyle = tint || '#9b6331';
      roundRect(ctx, -26, -2, 58, 4, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e2b84a';
      ctx.fillRect(-26, -2.4, 4, 4.8); ctx.fillRect(28, -2.4, 4, 4.8);
      break;
    }
    case 'orbstaff': {
      ctx.rotate(-1.1);
      ctx.fillStyle = '#4a3a8a';
      roundRect(ctx, -14, -1.8, 44, 3.6, 2); ctx.fill(); ctx.stroke();
      ctx.shadowColor = '#5fe3ff'; ctx.shadowBlur = 14;
      ctx.fillStyle = '#bff6ff';
      ctx.beginPath(); ctx.arc(33, 0, 5 + Math.sin(t * 6) * 0.8, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0; ctx.stroke();
      break;
    }
    case 'hammer': {
      ctx.rotate(-0.8);
      ctx.fillStyle = '#4b3424';
      roundRect(ctx, -8, -2.2, 26, 4.4, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = tint || '#5b5f6b';
      roundRect(ctx, 16, -6.5, 22, 13, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c9ced6';
      for (let i = 0; i < 3; i++) for (let j = -1; j <= 1; j++) {
        ctx.beginPath(); ctx.arc(20 + i * 7, j * 3.8, 1.2, 0, TAU); ctx.fill();
      }
      break;
    }
    case 'nunchaku': {
      ctx.rotate(-0.5);
      ctx.fillStyle = tint || '#b2662c';
      roundRect(ctx, -3, -2, 14, 4, 2); ctx.fill(); ctx.stroke();
      const swing = attack != null && attack >= 0 ? attack * 6 : Math.sin(t * 5) * 0.6;
      ctx.translate(12, 0);
      ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.2;
      const cx = Math.cos(swing) * 6, cy = Math.sin(swing) * 6;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
      ctx.translate(cx, cy); ctx.rotate(swing);
      ctx.fillStyle = tint || '#b2662c';
      roundRect(ctx, 0, -2, 14, 4, 2); ctx.fill(); ctx.stroke();
      break;
    }
    case 'bow': {
      ctx.strokeStyle = '#7a4a1f'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-18, 0); ctx.quadraticCurveTo(0, 14, 18, 0);
      ctx.stroke();
      ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.stroke();
      break;
    }
    case 'shuriken': {
      ctx.translate(2, 2);
      ctx.rotate(t * 3);
      drawStar(ctx, 0, 0, 5.5, 2, tint || '#c9d1d9');
      break;
    }
    case 'kunai': {
      ctx.rotate(-0.4);
      ctx.fillStyle = '#2a2a30';
      roundRect(ctx, -6, -1.3, 6, 2.6, 1); ctx.fill();
      ctx.beginPath(); ctx.arc(-7.5, 0, 2, 0, TAU); ctx.strokeStyle = '#2a2a30'; ctx.stroke();
      ctx.strokeStyle = OUT;
      ctx.fillStyle = tint || '#dff3ff';
      ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(12, 0); ctx.lineTo(0, 3); ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;
    }
    case 'fan': {
      ctx.rotate(-0.8);
      ctx.fillStyle = '#ffefc8';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 15, -0.9, 0.9); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d6201f';
      ctx.beginPath(); ctx.arc(8, 0, 3.2, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8a4b1c'; ctx.lineWidth = 0.8;
      for (let i = -3; i <= 3; i++) {
        const an = i * 0.27;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * 15, Math.sin(an) * 15); ctx.stroke();
      }
      break;
    }
    case 'fists': {
      ctx.fillStyle = '#f4efe2';
      ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, TAU); ctx.fill(); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function drawHairBack(ctx, look, t) {
  const c = look.hairColor;
  if (look.hair === 'long') {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(-4, -54);
    ctx.quadraticCurveTo(-20, -48, -17, -30);
    ctx.quadraticCurveTo(-16 + Math.sin(t * 3) * 1.5, -18, -11, -12);
    ctx.lineTo(-7, -20);
    ctx.lineTo(-5, -14);
    ctx.lineTo(-2, -30);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (look.hairTip) {
      ctx.fillStyle = look.hairTip;
      ctx.beginPath();
      ctx.moveTo(-15, -22); ctx.quadraticCurveTo(-14, -16, -11, -12); ctx.lineTo(-7, -20); ctx.lineTo(-9, -24); ctx.closePath();
      ctx.fill();
    }
  } else if (look.hair === 'wild') {
    ctx.fillStyle = c;
    ctx.beginPath();
    const n = 13;
    for (let i = 0; i <= n; i++) {
      const an = Math.PI * 0.55 + (i / n) * Math.PI * 1.65;
      const r = i % 2 ? 15 : 23;
      const x = 1 + Math.cos(an) * r, y = -43 + Math.sin(an) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (look.hair === 'bun') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(-12, -48, 6.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d6201f'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-20, -54); ctx.lineTo(-5, -44); ctx.stroke();
    ctx.strokeStyle = OUT;
  }
}

function drawHead(ctx, look, t) {
  const hx = 1, hy = -43, r = 14;
  const hair = look.hair;

  // head base
  ctx.fillStyle = hair === 'hood' ? look.hairColor : look.skin;
  ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.fill(); ctx.stroke();

  if (hair === 'hood') {
    // face opening
    ctx.fillStyle = look.skin;
    ctx.beginPath(); ctx.ellipse(hx + 6, hy + 1, 8.5, 5, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = 1; ctx.stroke(); ctx.lineWidth = 1.6;
    // hood knot tails
    ctx.fillStyle = look.hairColor;
    const w = Math.sin(t * 6) * 2;
    ctx.beginPath();
    ctx.moveTo(hx - 12, hy - 4); ctx.lineTo(hx - 22, hy - 8 + w); ctx.lineTo(hx - 20, hy - 2 + w); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  // face
  drawFace(ctx, look, hx, hy);

  // lower mask (fire mage etc.)
  if (look.mask) {
    ctx.save();
    ctx.beginPath(); ctx.arc(hx, hy, r - 0.8, 0, TAU); ctx.clip();
    ctx.fillStyle = look.mask;
    ctx.fillRect(hx - r, hy + 3, r * 2, r);
    ctx.restore();
    ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.stroke();
  }

  // hair on top
  ctx.fillStyle = look.hairColor;
  if (hair === 'long' || hair === 'spiky' || hair === 'bun' || hair === 'wild') {
    // cap
    ctx.beginPath();
    ctx.arc(hx, hy, r + 0.6, Math.PI * 0.95, Math.PI * 2.02);
    // bangs zigzag
    ctx.lineTo(hx + 14, hy - 4);
    ctx.lineTo(hx + 9, hy - 7);
    ctx.lineTo(hx + 7, hy - 3);
    ctx.lineTo(hx + 3, hy - 7);
    ctx.lineTo(hx, hy - 2);
    ctx.lineTo(hx - 4, hy - 7);
    ctx.lineTo(hx - 9, hy - 1);
    ctx.lineTo(hx - 14, hy + 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }
  if (hair === 'long') {
    // samurai spikes
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy - 12); ctx.lineTo(hx - 9, hy - 22); ctx.lineTo(hx - 2, hy - 13);
    ctx.moveTo(hx + 1, hy - 14); ctx.lineTo(hx + 1, hy - 24); ctx.lineTo(hx + 6, hy - 13);
    ctx.fill(); ctx.stroke();
  }
  if (hair === 'spiky') {
    ctx.beginPath();
    const spikes = [[-12, -6, -22, -14], [-8, -11, -14, -24], [-2, -13, -3, -27], [5, -13, 9, -25], [10, -9, 18, -17]];
    for (const [x1, y1, x2, y2] of spikes) {
      ctx.moveTo(hx + x1 - 3, hy + y1 + 2); ctx.lineTo(hx + x2, hy + y2); ctx.lineTo(hx + x1 + 4, hy + y1 + 1);
    }
    ctx.fill(); ctx.stroke();
  }
  if (hair === 'topknot' || hair === 'elder') {
    // side hair patch + topknot
    ctx.beginPath();
    ctx.arc(hx - 9, hy - 2, 5.5, Math.PI * 0.4, Math.PI * 1.6);
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx - 2, hy - r - 3, 4.5, 4, -0.3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d6201f';
    ctx.fillRect(hx - 4, hy - r + 0.5, 4, 2);
    // shine
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(hx + 4, hy - 9, 4, 2, -0.4, 0, TAU); ctx.fill();
  }
  if (hair === 'bald') {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(hx + 3, hy - 9, 5, 2.4, -0.4, 0, TAU); ctx.fill();
    // monk dots
    ctx.fillStyle = '#7a4a2a';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(hx - 3 + i * 4, hy - 11, 0.9, 0, TAU); ctx.fill(); }
  }
  if (hair === 'elder') {
    // beard
    ctx.fillStyle = look.hairColor;
    ctx.beginPath();
    ctx.moveTo(hx + 1, hy + 7);
    ctx.quadraticCurveTo(hx + 7, hy + 24, hx + 4, hy + 26);
    ctx.quadraticCurveTo(hx + 13, hy + 18, hx + 13, hy + 6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // eyebrows
    ctx.strokeStyle = look.hairColor; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(hx + 3, hy - 5); ctx.lineTo(hx + 8, hy - 4); ctx.moveTo(hx + 10, hy - 4); ctx.lineTo(hx + 14, hy - 6); ctx.stroke();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
  }

  // headband
  if (look.headband) {
    ctx.save();
    ctx.beginPath(); ctx.arc(hx, hy, r + 0.5, 0, TAU); ctx.clip();
    ctx.fillStyle = look.headband;
    ctx.fillRect(hx - r - 1, hy - 8, r * 2 + 2, 4);
    ctx.restore();
    ctx.fillStyle = look.headband;
    const w = Math.sin(t * 7) * 2.5;
    ctx.beginPath();
    ctx.moveTo(hx - 13, hy - 7); ctx.quadraticCurveTo(hx - 20, hy - 9 + w, hx - 27, hy - 4 + w);
    ctx.lineTo(hx - 25, hy - 1 + w); ctx.quadraticCurveTo(hx - 19, hy - 5, hx - 13, hy - 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // metal plate
    ctx.fillStyle = '#c9d1d9';
    roundRect(ctx, hx + 5, hy - 8.5, 7, 5, 1); ctx.fill();
    ctx.lineWidth = 1; ctx.stroke(); ctx.lineWidth = 1.6;
  }

  if (look.horns) {
    ctx.fillStyle = '#f4ead2';
    ctx.beginPath();
    ctx.moveTo(hx - 7, hy - 11); ctx.quadraticCurveTo(hx - 12, hy - 22, hx - 6, hy - 28); ctx.quadraticCurveTo(hx - 5, hy - 19, hx - 2, hy - 13); ctx.closePath();
    ctx.moveTo(hx + 5, hy - 13); ctx.quadraticCurveTo(hx + 8, hy - 22, hx + 15, hy - 26); ctx.quadraticCurveTo(hx + 11, hy - 18, hx + 10, hy - 10); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  if (look.crown) {
    ctx.fillStyle = '#ffcc33';
    ctx.beginPath();
    ctx.moveTo(hx - 9, hy - 11);
    ctx.lineTo(hx - 10, hy - 22); ctx.lineTo(hx - 5, hy - 16); ctx.lineTo(hx, hy - 24); ctx.lineTo(hx + 5, hy - 16); ctx.lineTo(hx + 10, hy - 22); ctx.lineTo(hx + 9, hy - 11);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d6201f';
    ctx.beginPath(); ctx.arc(hx, hy - 15, 1.6, 0, TAU); ctx.fill();
  }
}

function drawFace(ctx, look, hx, hy) {
  const ex1 = hx + 4, ex2 = hx + 10, ey = hy + 1;
  if (look.eyes === 'glow') {
    ctx.save();
    ctx.shadowColor = look.eyeColor; ctx.shadowBlur = 8;
    ctx.fillStyle = look.eyeColor;
    ctx.beginPath();
    ctx.ellipse(ex1, ey, 2.4, 1.5, 0.25, 0, TAU);
    ctx.ellipse(ex2, ey, 2.4, 1.5, -0.25, 0, TAU);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (look.eyes === 'zombie') {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(ex1, ey, 2.6, 0, TAU); ctx.arc(ex2, ey, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(ex1 + 0.5, ey, 0.9, 0, TAU); ctx.arc(ex2 + 0.5, ey, 0.9, 0, TAU); ctx.fill();
    // stitched mouth
    ctx.strokeStyle = '#2b1b12'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx + 4, hy + 7); ctx.lineTo(hx + 11, hy + 7);
    for (let i = 0; i < 3; i++) { ctx.moveTo(hx + 5 + i * 2.5, hy + 5.5); ctx.lineTo(hx + 5 + i * 2.5, hy + 8.5); }
    ctx.stroke(); ctx.lineWidth = 1.6;
    return;
  }
  // classic chibi eyes
  ctx.fillStyle = '#1b1416';
  ctx.beginPath();
  ctx.ellipse(ex1, ey, 2, 2.9, 0, 0, TAU);
  ctx.ellipse(ex2, ey, 2, 2.9, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(ex1 + 0.7, ey - 1.1, 0.8, 0, TAU);
  ctx.arc(ex2 + 0.7, ey - 1.1, 0.8, 0, TAU);
  ctx.fill();
  if (look.hair !== 'hood' && !look.mask) {
    // blush + mouth
    ctx.fillStyle = 'rgba(255,120,120,0.35)';
    ctx.beginPath(); ctx.ellipse(hx + 12, hy + 5, 2.2, 1.3, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7a3a2a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx + 6, hy + 7); ctx.lineTo(hx + 9, hy + 7.4); ctx.stroke();
    ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
  }
}

function drawScarf(ctx, color, t) {
  ctx.fillStyle = color;
  const w = Math.sin(t * 6) * 3;
  ctx.beginPath();
  ctx.moveTo(-4, -31);
  ctx.quadraticCurveTo(-16, -33 + w, -28, -26 + w * 1.4);
  ctx.lineTo(-26, -22 + w);
  ctx.quadraticCurveTo(-14, -27, -4, -26);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
}

export function drawStar(ctx, x, y, R, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const an = (i / 8) * TAU;
    const rr = i % 2 ? r : R;
    ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = OUT; ctx.stroke();
  ctx.fillStyle = '#555';
  ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, TAU); ctx.fill();
}

// ── Boss: the mecha turtle (original design: spiked steel shell, snake neck, gatling cannon, rocket jets)
function drawTurtle(ctx, p) {
  const t = p.t || 0;
  ctx.save();
  ctx.scale((p.facing || 1) * (p.scale || 1), p.scale || 1);
  if (p.alpha != null) ctx.globalAlpha *= p.alpha;
  const hover = Math.sin(t * 2) * 4;
  ctx.translate(0, -18 + hover);
  ctx.lineWidth = 2; ctx.strokeStyle = OUT; ctx.lineJoin = 'round';

  // jets
  for (const jx of [-38, 18]) {
    const fl = 22 + Math.sin(t * 30 + jx) * 6;
    const g = ctx.createLinearGradient(0, 0, 0, fl);
    g.addColorStop(0, '#fff6b0'); g.addColorStop(0.4, '#ffb21f'); g.addColorStop(1, 'rgba(255,80,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(jx - 9, 0); ctx.quadraticCurveTo(jx, fl * 1.6, jx + 9, 0);
    ctx.fill();
    ctx.fillStyle = '#6b707a';
    roundRect(ctx, jx - 10, -10, 20, 12, 3); ctx.fill(); ctx.stroke();
  }

  // neck (segmented hose)
  const recoil = p.attack != null && p.attack >= 0 ? Math.sin(p.attack * Math.PI) * 6 : 0;
  ctx.fillStyle = '#26262c';
  for (let i = 0; i < 7; i++) {
    const k = i / 6;
    const nx = 40 + k * 32, ny = -40 - Math.sin(k * Math.PI * 0.9) * 26 - k * 10;
    ctx.beginPath(); ctx.arc(nx, ny, 7 - k * 1.5, 0, TAU); ctx.fill(); ctx.stroke();
  }
  // head
  ctx.fillStyle = '#cfd5dc';
  roundRect(ctx, 66, -88, 30, 20, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#26262c';
  ctx.fillRect(84, -78, 12, 4);
  ctx.save(); ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#ff3b3b';
  ctx.beginPath(); ctx.arc(82, -82, 3.5, 0, TAU); ctx.fill();
  ctx.restore();

  // shell
  const g = ctx.createLinearGradient(0, -100, 0, -10);
  g.addColorStop(0, '#eef1f4'); g.addColorStop(1, '#8b939c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-62, -14);
  ctx.quadraticCurveTo(-64, -92, 0, -96);
  ctx.quadraticCurveTo(58, -92, 56, -14);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // plates
  ctx.strokeStyle = '#7b838c'; ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-44, -20); ctx.quadraticCurveTo(-40, -70, -2, -76); ctx.quadraticCurveTo(38, -70, 40, -20);
  ctx.moveTo(-2, -76); ctx.lineTo(-2, -16);
  ctx.moveTo(-50, -48); ctx.lineTo(48, -48);
  ctx.stroke();
  ctx.strokeStyle = OUT; ctx.lineWidth = 2;
  // rim
  ctx.fillStyle = '#5c636c';
  roundRect(ctx, -66, -20, 126, 12, 6); ctx.fill(); ctx.stroke();
  // spikes
  ctx.fillStyle = '#e9edf1';
  for (let i = 0; i < 6; i++) {
    const an = Math.PI * (1.08 + i * 0.17);
    const bx = Math.cos(an) * 58, by = -14 + Math.sin(an) * 80;
    ctx.beginPath();
    ctx.moveTo(bx - 5, by + 3); ctx.lineTo(bx + Math.cos(an) * 12, by + Math.sin(an) * 12); ctx.lineTo(bx + 5, by + 3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // gatling cannon on top
  ctx.save();
  ctx.translate(-recoil, 0);
  ctx.fillStyle = '#3a3e46';
  roundRect(ctx, -10, -112, 26, 20, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8b939c';
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, 14, -110 + i * 6, 34, 4.5, 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#26262c';
  roundRect(ctx, 44, -112, 6, 20, 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

// ── helpers
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, v + amt));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// ── Portraits for UI cards (cached data URLs)
const portraitCache = new Map();
// def = anything with { look, custom? } – a ninja spec or a monster.
export function portrait(def, size = 120) {
  const key = size + ':' + (def.custom || '') + JSON.stringify(def.look);
  if (portraitCache.has(key)) return portraitCache.get(key);
  if (portraitCache.size > 400) portraitCache.clear();
  const c = document.createElement('canvas');
  c.width = size * 2; c.height = size * 2;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  const isTurtle = def.custom === 'turtle';
  const base = isTurtle ? 0.62 : 1.55 / (def.look.scale || 1);
  const k = (size / 120) * base;
  ctx.translate(size / 2 + (isTurtle ? -10 * k : -2 * k), size * (isTurtle ? 0.97 : 0.94));
  ctx.scale(k, k);
  drawCharacter(ctx, def.look, { t: 0.4, facing: 1, custom: def.custom });
  const url = c.toDataURL();
  portraitCache.set(key, url);
  return url;
}

// ── Weapon icons for the shop (cached data URLs)
const weaponCache = new Map();
export function weaponIcon(w, size = 96) {
  const type = w?.type || 'fists';
  const key = size + type + (w?.tint || '');
  if (weaponCache.has(key)) return weaponCache.get(key);
  const c = document.createElement('canvas');
  c.width = size * 2; c.height = size * 2;
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  ctx.lineWidth = 1.6; ctx.strokeStyle = '#2b1b12'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const k = size / 46;
  ctx.translate(size / 2, size / 2);
  ctx.scale(k, k);
  const layout = {
    katana: [-17, 12, -0.25], flamekatana: [-17, 12, -0.25], sai: [-10, 8, -0.2], staff: [-2, 3, 0.15], orbstaff: [-12, 12, 0.25],
    hammer: [-12, 18, 0.15], nunchaku: [-10, 0, 0.5], bow: [0, -8, Math.PI / 2], shuriken: [-2, -2, 0], kunai: [-4, 4, -0.3], fan: [-6, 8, -0.1], fists: [0, 0, 0],
  }[type] || [0, 0, 0];
  ctx.translate(layout[0], layout[1]);
  ctx.rotate(-0.7 + layout[2]);
  if (type === 'shuriken') ctx.scale(2.4, 2.4);
  drawWeapon(ctx, type, 0.3, -1, w?.tint);
  const url = c.toDataURL();
  weaponCache.set(key, url);
  return url;
}
