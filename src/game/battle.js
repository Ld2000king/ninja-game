// "Brawl cloud" battle engine, in the style of the original Ninja Warz:
// every round both armies LEAP into the middle, a cartoon fight cloud forms, the fight is resolved inside it,
// then the cloud pops – survivors jump back to their side and the fallen drop on the way.
import { RARITIES } from '../data/rarity.js';
import { drawCharacter, drawStar, drawWeapon, roundRect } from '../art/character.js';
import { getArena, W, H, GROUND } from '../art/arenas.js';
import { monsterSpec } from './stats.js';

const FIELD = { x0: 25, x1: W - 25, y0: GROUND + 42, y1: H - 14 };
const CLOUD = { x: W / 2, y: (FIELD.y0 + FIELD.y1) / 2 + 6 };
const US = 1.2; // global unit size
const T = { leap: 0.6, brawl: 2.4, scatter: 0.7, rest: 1.0 };
const TAU = Math.PI * 2;
const WORDS = ['POW!', 'BAM!', 'WHAM!', 'BONK!', 'KAPOW!', 'SMACK!', 'THUD!'];
let UID = 1;

export const SPELLS = [
  { id: 'lightning', name: 'ברק שמיימי', icon: '⚡', cd: 14, unlock: 1, target: true,  desc: 'ברק שפוגע בכל האויבים באזור – גם בתוך ענן הקרב.' },
  { id: 'heal',      name: 'ברכת ריפוי', icon: '✚',  cd: 24, unlock: 3, target: false, desc: 'מרפא את כל הצבא שלך ב-30%.' },
  { id: 'tornado',   name: 'סופת אש',    icon: '🌪️', cd: 22, unlock: 5, target: true,  desc: 'טורנדו אש שנע לעבר האויב ושורף את כל מי שבדרך.' },
];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const isTurtle = (u) => u.custom === 'turtle';
const heightOf = (u) => isTurtle(u) ? 160 : 60 * u.scale;

export class Battle {
  /**
   * @param squad  array of unit specs for the player (from stats.ninjaSpec)
   * @param waves  array of waves, each an array of enemy unit specs
   */
  constructor(canvas, { stage, squad, waves, playerLevel, onEnd, onHud }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stage = stage;
    this.waves = waves;
    this.playerLevel = playerLevel;
    this.onEnd = onEnd;
    this.onHud = onHud;
    this.units = []; this.effects = []; this.texts = []; this.events = []; this.pops = [];
    this.time = 0; this.speed = 1; this.paused = false;
    this.phase = 'intro'; this.phaseT = 0; this.restDur = T.rest;
    this.round = 0;
    this.shake = 0;
    this.waveIndex = 0;
    this.spellCd = {};
    this.pendingSpell = null;
    this.mouse = null;
    this.stats = { kills: 0 };
    this.banner = null;
    this.cloud = { a: 0, rx: 100, ry: 55, puffs: [], popT: 0 };
    this.sideMaxHp = { player: 0, enemy: 0 };

    this.placeArmy(squad, 'player', 0);
    this.placeArmy(waves[0], 'enemy', 0);
    this.initialPlayerHp = this.sideHp('player');

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
    this.bindInput();
    this.showBanner('READY!', 1.1, () => this.showBanner('FIGHT!', 0.8));
    this.start();
  }

  // ───────────── setup
  placeArmy(specs, side, offset) {
    const bosses = specs.filter(s => s.boss), rest = specs.filter(s => !s.boss);
    bosses.forEach((s, i) => {
      const x = side === 'player' ? CLOUD.x - 190 : CLOUD.x + (s.custom === 'turtle' ? 215 : 175) + i * 50;
      this.addUnit(s, side, x + offset, CLOUD.y + i * 50);
    });
    const perCol = 5;
    rest.forEach((s, i) => {
      const col = Math.floor(i / perCol), row = i % perCol;
      const inCol = Math.min(perCol, rest.length - col * perCol);
      const span = FIELD.y1 - FIELD.y0;
      const y = FIELD.y0 + (row + 0.5) * (span / inCol);
      const stagger = (row % 2 ? 14 : -14) * (side === 'player' ? 1 : -1);
      const x = side === 'player' ? 300 - col * 58 : 700 + col * 58 + (bosses.length ? 60 : 0);
      this.addUnit(s, side, x + stagger + offset, y);
    });
  }

  addUnit(spec, side, homeX, homeY, extra = {}) {
    const s = spec.stats;
    const look = spec.look;
    const p = extra.power || 1;
    const u = {
      uid: UID++, spec, side, look, custom: spec.custom, boss: !!spec.boss,
      x: homeX, y: homeY, z: 0, rot: 0, homeX, homeY,
      hp: s.hp * p, maxHp: s.hp * p, atk: s.atk * p, aspd: s.aspd, crit: s.crit, armor: s.armor,
      ability: extra.clone ? null : spec.ability,
      abCd: spec.ability ? spec.ability.cd * rand(0.25, 0.7) : Infinity,
      atkCd: rand(0.05, 0.6), anim: -1, stun: 0, hurt: 0, t: Math.random() * 10,
      facing: side === 'player' ? 1 : -1,
      dead: false, fallen: false, fallenT: 0, inCloud: false, jump: null, clone: !!extra.clone, gone: false,
      scale: (look.scale || 1) * US,
      radius: (look.radius || 13 * (look.scale || 1)) * US,
    };
    this.units.push(u);
    if (!u.clone) this.sideMaxHp[side] += u.maxHp;
    return u;
  }

  // ───────────── loop
  start() {
    this.last = performance.now();
    const frame = (now) => {
      if (this.destroyed) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!this.paused) for (let i = 0; i < this.speed; i++) this.update(dt);
      this.render();
      this.hudT = (this.hudT || 0) - dt;
      if (this.hudT <= 0) { this.hudT = 0.1; this.emitHud(); }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    this.unbindInput?.();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.arena = getArena(this.stage.region.arena, this.canvas.width > W * 1.2 ? 2 : 1);
  }

  bindInput() {
    const toWorld = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
    };
    const move = (e) => { this.mouse = toWorld(e); };
    const leave = () => { this.mouse = null; };
    const click = (e) => {
      if (!this.pendingSpell) return;
      const p = toWorld(e);
      this.castSpell(this.pendingSpell, p.x, clamp(p.y, FIELD.y0, FIELD.y1));
      this.pendingSpell = null;
    };
    this.canvas.addEventListener('pointermove', move);
    this.canvas.addEventListener('pointerleave', leave);
    this.canvas.addEventListener('click', click);
    this.unbindInput = () => {
      this.canvas.removeEventListener('pointermove', move);
      this.canvas.removeEventListener('pointerleave', leave);
      this.canvas.removeEventListener('click', click);
    };
  }

  emitHud() {
    this.onHud?.({
      pHp: this.sideHp('player'), pMax: this.sideMaxHp.player,
      eHp: this.sideHp('enemy'), eMax: this.sideMaxHp.enemy,
      wave: this.waveIndex + 1, waves: this.waves.length, round: this.round,
      spellCd: this.spellCd,
    });
  }

  sideHp(side) { return this.units.reduce((a, u) => a + (u.side === side && !u.dead && !u.clone ? u.hp : 0), 0); }
  alive(side) { return this.units.filter(u => u.side === side && !u.dead && !u.gone); }
  enemiesOf(side) { return this.units.filter(u => u.side !== side && !u.dead && !u.gone); }
  within(list, x, y, r) { return list.filter(e => Math.hypot(e.x - x, (e.y - y) * 1.3) < r + e.radius); }
  after(t, fn) { this.events.push({ t, fn }); }
  showBanner(text, dur, then) { this.banner = { text, t: 0, dur, then }; }
  setPhase(p) { this.phase = p; this.phaseT = 0; }

  // ───────────── update
  update(dt) {
    this.time += dt;
    this.phaseT += dt;
    this.shake = Math.max(0, this.shake - dt * 30);

    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.dur) { const then = this.banner.then; this.banner = null; then?.(); }
    }

    for (const u of this.units) {
      u.t += dt;
      u.hurt = Math.max(0, u.hurt - dt);
      u.stun = Math.max(0, u.stun - dt);
      if (u.anim >= 0) { u.anim += dt / 0.3; if (u.anim >= 1) u.anim = -1; }
      if (u.fallen) u.fallenT += dt;
      if (u.jump) this.stepJump(u, dt);
    }
    this.units = this.units.filter(u => !u.gone && !(u.fallen && u.fallenT > 5));

    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i];
      e.t -= dt;
      if (e.t <= 0) { this.events.splice(i, 1); e.fn(); }
    }
    this.updateFx(dt);
    if (this.phase !== 'end' && this.phase !== 'intro') for (const k in this.spellCd) this.spellCd[k] = Math.max(0, this.spellCd[k] - dt);

    const c = this.cloud;
    switch (this.phase) {
      case 'intro':
        if (this.phaseT > 1.9) this.startLeap();
        break;
      case 'leap':
        if (this.phaseT > 0.3) c.a = Math.min(1, c.a + dt * 4);
        if (this.phaseT > 1.0 || (this.phaseT > 0.3 && !this.units.some(u => u.jump))) this.setPhase('brawl');
        break;
      case 'brawl': {
        c.a = Math.min(1, c.a + dt * 4);
        this.brawlTick(dt);
        const pIn = this.units.some(u => u.side === 'player' && u.inCloud && !u.dead);
        const eIn = this.units.some(u => u.side === 'enemy' && u.inCloud && !u.dead);
        if (this.phaseT > T.brawl || !pIn || !eIn) this.startScatter();
        break;
      }
      case 'scatter':
        c.a = Math.max(0, c.a - dt * 6);
        if (this.phaseT > 0.45 && !this.units.some(u => u.jump && u.jump.t < u.jump.dur)) this.afterScatter();
        break;
      case 'rest':
        if (this.phaseT > this.restDur) this.startLeap();
        break;
      case 'end':
        c.a = Math.max(0, c.a - dt * 6);
        if (!this.endSent && this.phaseT > 1.8) { this.endSent = true; this.onEnd?.(this.result); }
        break;
    }
  }

  stepJump(u, dt) {
    const j = u.jump;
    j.t += dt;
    if (j.t < 0) return;
    const k = Math.min(1, j.t / j.dur);
    u.x = lerp(j.fx, j.tx, k);
    u.y = lerp(j.fy, j.ty, k);
    u.z = Math.sin(k * Math.PI) * j.h;
    if (j.spin) u.rot = j.spin * k;
    if (k >= 1) {
      u.z = 0;
      u.jump = null;
      j.land?.();
    }
  }

  // ── round flow
  startLeap() {
    this.round++;
    const fighters = this.units.filter(u => !u.dead && !u.boss && !u.gone);
    const n = fighters.length;
    const c = this.cloud;
    c.rx = clamp(95 + n * 7, 120, 195);
    c.ry = clamp(58 + n * 2.2, 64, 92);
    c.puffs = [];
    const ring = 13;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * TAU + rand(-0.15, 0.15);
      c.puffs.push({ x: Math.cos(a) * c.rx * 0.78, y: Math.sin(a) * c.ry * 0.62, r: c.ry * rand(0.5, 0.66), ph: Math.random() * TAU });
    }
    for (let i = 0; i < 5; i++) c.puffs.push({ x: rand(-0.4, 0.4) * c.rx, y: rand(-0.3, 0.2) * c.ry, r: c.ry * rand(0.6, 0.8), ph: Math.random() * TAU });
    c.a = 0;

    for (const u of fighters) {
      const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.75;
      const tx = CLOUD.x + Math.cos(a) * r * c.rx, ty = CLOUD.y + Math.sin(a) * r * c.ry;
      u.rot = 0;
      u.jump = { fx: u.x, fy: u.y, tx, ty, t: -rand(0, 0.3), dur: T.leap * rand(0.9, 1.15), h: rand(70, 105), land: () => { u.inCloud = true; } };
    }
    for (const u of this.units) if (u.boss && !u.dead) u.inCloud = true;
    this.setPhase('leap');
  }

  brawlTick(dt) {
    const c = this.cloud;
    for (const u of this.units) {
      if (u.dead || !u.inCloud) continue;
      if (u.stun > 0) continue;
      const foes = this.units.filter(e => e.side !== u.side && e.inCloud && !e.dead);
      if (!foes.length) continue;
      if (u.ability) {
        u.abCd -= dt;
        if (u.abCd <= 0) { u.abCd = u.ability.cd; this.castAbility(u, foes); }
      }
      u.atkCd -= dt;
      if (u.atkCd <= 0) {
        u.atkCd = rand(0.85, 1.15) / u.aspd;
        if (u.boss) u.anim = 0;
        this.damage(u, pick(foes), 1);
      }
    }
    c.popT -= dt;
    if (c.popT <= 0) { c.popT = 0.05; this.spawnPop(); }
  }

  startScatter() {
    this.setPhase('scatter');
    const c = this.cloud;
    this.fx('poof', CLOUD.x, CLOUD.y, { r: c.rx * 0.9, dur: 0.5 });
    this.pops = [];
    for (const u of this.units) {
      if (!u.inCloud) continue;
      u.inCloud = false;
      if (u.boss) continue;
      if (u.clone) { u.gone = true; continue; }
      if (!u.dead) {
        u.jump = { fx: u.x, fy: u.y, tx: u.homeX, ty: u.homeY, t: -rand(0, 0.12), dur: T.scatter * rand(0.85, 1.1), h: rand(70, 100) };
      } else {
        // knocked out: flies toward home but crashes down on the way
        const f = rand(0.2, 0.6);
        const dir = u.side === 'player' ? 1 : -1;
        u.jump = {
          fx: u.x, fy: u.y,
          tx: lerp(u.x, u.homeX, f) + rand(-25, 25), ty: clamp(lerp(u.y, u.homeY, f) + rand(-20, 20), FIELD.y0, FIELD.y1),
          t: 0, dur: T.scatter * rand(0.8, 1.0), h: rand(90, 130), spin: -dir * rand(6, 10),
          land: () => { u.fallen = true; u.rot = -dir * Math.PI / 2; this.fx('dust', u.x, u.y, { r: 18, dur: 0.4 }); },
        };
      }
    }
  }

  afterScatter() {
    const pAlive = this.alive('player').filter(u => !u.clone).length;
    const eAlive = this.alive('enemy').filter(u => !u.clone).length;
    if (!pAlive) return this.finish(false);
    if (!eAlive) {
      if (this.waveIndex < this.waves.length - 1) {
        this.waveIndex++;
        this.sideMaxHp.enemy = 0;
        const before = this.units.length;
        this.placeArmy(this.waves[this.waveIndex], 'enemy', 0);
        for (const u of this.units.slice(before)) {
          u.x = W + 60 + Math.random() * 80;
          u.jump = { fx: u.x, fy: u.homeY, tx: u.homeX, ty: u.homeY, t: -rand(0, 0.4), dur: 1.1, h: 40 };
        }
        this.showBanner(`WAVE ${this.waveIndex + 1}`, 1.3);
        this.restDur = 2.2;
        return this.setPhase('rest');
      }
      return this.finish(true);
    }
    this.restDur = T.rest;
    this.setPhase('rest');
  }

  finish(win) {
    this.setPhase('end');
    const left = this.sideHp('player') / (this.initialPlayerHp || 1);
    const stars = !win ? 0 : left >= 0.55 ? 3 : left >= 0.25 ? 2 : 1;
    this.result = { win, stars, kills: this.stats.kills, rounds: this.round };
    this.winner = win ? 'player' : 'enemy';
    this.showBanner(win ? 'VICTORY!' : 'DEFEAT', 1.8);
  }

  // ───────────── combat
  cloudPoint() {
    const c = this.cloud;
    return { x: CLOUD.x + rand(-0.8, 0.8) * c.rx, y: CLOUD.y - c.ry * 0.9 + rand(-28, 8) };
  }

  damage(src, tg, mult, opts = {}) {
    if (!tg || tg.dead) return 0;
    const crit = !opts.noCrit && src && Math.random() < src.crit;
    let d = (opts.flat ?? src.atk) * mult * rand(0.9, 1.1);
    if (crit) d *= 1.8;
    d *= 1 - tg.armor;
    d = Math.max(1, Math.round(d));
    tg.hp -= d;
    tg.hurt = 0.12;
    const p = tg.inCloud && !tg.boss ? this.cloudPoint() : { x: tg.x + rand(-10, 10), y: tg.y - heightOf(tg) - 6 };
    this.text(p.x, p.y, crit ? `-${d}!` : `-${d}`, crit ? 'crit' : tg.side === 'player' ? 'dmgP' : 'dmg');
    if (tg.hp <= 0) this.kill(tg);
    return d;
  }

  heal(tg, amt) {
    if (tg.dead) return;
    const a = Math.round(Math.min(tg.maxHp - tg.hp, amt));
    if (a <= 0) return;
    tg.hp += a;
    const p = tg.inCloud && !tg.boss ? this.cloudPoint() : { x: tg.x, y: tg.y - heightOf(tg) - 6 };
    this.text(p.x, p.y, `+${a}`, 'heal');
  }

  kill(u) {
    if (u.dead) return;
    u.dead = true; u.hp = 0;
    if (u.side === 'enemy' && !u.clone) this.stats.kills++;
    if (u.boss) { this.shake = 14; this.fx('poof', u.x, u.y - 30, { r: 70, dur: 0.6 }); u.inCloud = false; }
    if (!u.inCloud && !u.jump) {
      if (u.clone) { u.gone = true; return; }
      u.fallen = true;
      u.rot = (u.side === 'player' ? 1 : -1) * -Math.PI / 2;
      if (isTurtle(u)) u.rot = 0;
    }
    if (u.boss) u.inCloud = false;
  }

  castAbility(u, foes) {
    const ab = u.ability;
    const live = () => foes.filter(f => !f.dead);
    const c = this.cloud;
    if (u.boss) u.anim = 0;
    switch (ab.type) {
      case 'multiHit': {
        const tg = pick(live());
        for (let i = 0; i < ab.hits; i++) this.after(i * 0.12, () => { if (!u.dead) this.damage(u, tg, ab.mult); });
        break;
      }
      case 'cleave': {
        const targets = shuffle(live()).slice(0, ab.targets);
        targets.forEach((tg, i) => this.after(i * 0.06, () => {
          if (u.dead) return;
          this.damage(u, tg, ab.mult);
          const p = this.cloudPoint();
          if (ab.fx === 'fire') this.fx('explosion', p.x, p.y + 30, { r: 42, dur: 0.45 });
          else if (ab.fx === 'blades') this.fx('spark', p.x, p.y + 25, { dur: 0.25, color: '#e6eef5' });
        }));
        if (ab.fx === 'shock') { this.fx('ring', CLOUD.x, CLOUD.y + c.ry * 0.6, { r: c.rx * 1.3, dur: 0.5, color: '#ff8a3a', width: 7 }); this.shake = Math.max(this.shake, 6); }
        break;
      }
      case 'execute': {
        const tg = live().reduce((a, b) => (b.hp < a.hp ? b : a));
        this.damage(u, tg, ab.mult);
        const p = this.cloudPoint();
        this.fx('slash', p.x, p.y + 30, { dur: 0.25, big: true, dir: u.facing });
        break;
      }
      case 'stun': {
        for (const tg of shuffle(live()).slice(0, ab.targets)) {
          this.damage(u, tg, ab.mult);
          tg.stun = Math.max(tg.stun, ab.duration);
        }
        this.fx('ring', CLOUD.x, CLOUD.y + c.ry * 0.6, { r: c.rx * 1.1, dur: 0.45, color: '#ffe14a', width: 5 });
        break;
      }
      case 'chain': {
        const targets = shuffle(live()).slice(0, ab.jumps);
        const pts = [{ x: u.boss ? u.x : CLOUD.x + rand(-c.rx, c.rx) * 0.6, y: CLOUD.y - c.ry - 30 }];
        let m = ab.mult;
        for (const tg of targets) { this.damage(u, tg, m); m *= 0.85; pts.push(this.cloudPoint()); }
        this.fx('lightning', 0, 0, { pts, dur: 0.35 });
        break;
      }
      case 'clone':
        for (let i = 0; i < ab.count; i++) {
          const cl = this.addUnit(u.spec, u.side, u.x, u.y, { clone: true, power: ab.power });
          cl.boss = false; cl.inCloud = true;
          cl.x = CLOUD.x + rand(-0.5, 0.5) * c.rx; cl.y = CLOUD.y;
        }
        this.fx('smoke', u.x, u.y - 40, { dur: 0.5, color: '#6a3aa8', r: 40 });
        break;
      case 'summon':
        for (let i = 0; i < ab.count; i++) {
          const spec = monsterSpec(ab.unit, this.stage.level);
          const z = this.addUnit(spec, u.side, clamp(u.homeX - 70 + rand(-25, 25), CLOUD.x + 90, FIELD.x1), clamp(u.homeY + rand(-110, 110), FIELD.y0, FIELD.y1));
          this.sideMaxHp[u.side] -= z.maxHp; // summoned minions don't count in the HP bar total
          this.fx('dust', z.x, z.y, { r: 30, dur: 0.6 });
        }
        break;
    }
    // shout the ability name above the cloud
    const sx = u.boss ? u.x : CLOUD.x + (u.side === 'player' ? -1 : 1) * rand(10, c.rx * 0.9);
    const sy = u.boss ? u.y - heightOf(u) - 24 : CLOUD.y - c.ry - 48 + rand(-10, 10);
    this.text(sx, sy, ab.name + '!', 'shout', RARITIES[u.spec.rarity]?.color || '#fff');
  }

  spawnPop() {
    const inside = this.units.filter(u => u.inCloud && !u.boss);
    if (!inside.length) return;
    const u = pick(inside);
    const c = this.cloud;
    const a = rand(-Math.PI * 0.95, Math.PI * 0.95) + (Math.random() < 0.5 ? 0 : Math.PI);
    // just inside the cloud's outer edge, so limbs visibly poke out of it
    const base = { a, u, t: 0, x: Math.cos(a) * (c.rx * 0.78 + c.ry * 0.3), y: Math.sin(a) * c.ry * 0.85 };
    const r = Math.random();
    if (r < 0.32) this.pops.push({ ...base, type: 'arm', dur: 0.32, len: rand(22, 34) });
    else if (r < 0.5) this.pops.push({ ...base, type: 'leg', dur: 0.32, len: rand(20, 30) });
    else if (r < 0.66) this.pops.push({ ...base, type: 'weapon', dur: 0.3 });
    else if (r < 0.78) this.pops.push({ ...base, type: 'tumble', dur: 0.35, spin: rand(-8, 8), facing: Math.random() < 0.5 ? 1 : -1 });
    else if (r < 0.9) this.pops.push({ ...base, type: 'star', dur: 0.35, y: -c.ry * rand(0.6, 1.0), x: rand(-c.rx, c.rx) * 0.8 });
    else this.pops.push({ ...base, type: 'word', dur: 0.55, word: pick(WORDS), x: rand(-c.rx, c.rx) * 0.6, y: -c.ry * rand(0.5, 1.1) });
  }

  spawnTornado(side, x, y, dir, dmg, dur) {
    const e = { type: 'tornado', x, y, dir, t: 0, dur, tick: 0 };
    e.update = (dt) => {
      e.x += dir * 95 * dt;
      e.tick -= dt;
      if (e.tick <= 0) {
        e.tick = 0.3;
        for (const en of this.enemiesOf(side)) {
          if (Math.abs(en.x - e.x) < 45 + en.radius && Math.abs(en.y - e.y) < 45) this.damage(null, en, 1, { flat: dmg, noCrit: true });
        }
      }
    };
    this.effects.push(e);
  }

  // ───────────── player spells
  canCast(id) {
    const sp = SPELLS.find(s => s.id === id);
    return sp && this.phase !== 'intro' && this.phase !== 'end' && this.playerLevel >= sp.unlock && !(this.spellCd[id] > 0);
  }

  requestSpell(id) {
    if (!this.canCast(id)) return;
    const sp = SPELLS.find(s => s.id === id);
    if (!sp.target) return this.castSpell(id);
    this.pendingSpell = this.pendingSpell === id ? null : id;
  }

  castSpell(id, x, y) {
    if (!this.canCast(id)) return;
    const sp = SPELLS.find(s => s.id === id);
    const lvl = this.playerLevel;
    if (id === 'lightning') {
      const dmg = 90 + 30 * lvl;
      this.fx('bolt', x, y, { dur: 0.45 });
      this.fx('ring', x, y, { r: 85, dur: 0.4, color: '#bff6ff' });
      this.shake = Math.max(this.shake, 8);
      for (const e of this.within(this.enemiesOf('player'), x, y, 85)) {
        this.damage(null, e, 1, { flat: dmg, noCrit: true });
        e.stun = Math.max(e.stun, 0.7);
      }
    } else if (id === 'heal') {
      for (const a of this.alive('player')) {
        this.heal(a, a.maxHp * 0.3);
        if (!a.inCloud) this.fx('healfx', a.x, a.y, { dur: 0.9, h: heightOf(a) });
      }
      if (this.phase === 'brawl') this.fx('healwave', CLOUD.x, CLOUD.y + this.cloud.ry * 0.6, { r: this.cloud.rx * 1.3, dur: 0.7 });
    } else if (id === 'tornado') {
      this.spawnTornado('player', x, y, 1, 30 + 12 * lvl, 5);
    }
    this.spellCd[id] = sp.cd;
  }

  // ───────────── fx & text
  fx(type, x, y, o = {}) { this.effects.push({ type, x, y, t: 0, dur: 0.4, ...o }); }

  text(x, y, str, kind, color) {
    this.texts.push({ x, y, str, kind, color, t: 0 });
    if (this.texts.length > 90) this.texts.shift();
  }

  updateFx(dt) {
    for (const e of this.effects) { e.t += dt; e.update?.(dt); }
    this.effects = this.effects.filter(e => e.t < e.dur);
    for (const t of this.texts) t.t += dt;
    this.texts = this.texts.filter(t => t.t < (t.kind === 'shout' ? 1.1 : 0.85));
    for (const p of this.pops) p.t += dt;
    this.pops = this.pops.filter(p => p.t < p.dur);
  }

  // ───────────── render
  render() {
    const ctx = this.ctx;
    const k = this.canvas.width / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.direction = 'ltr';
    ctx.clearRect(0, 0, W, H);
    if (this.shake > 0) ctx.translate(rand(-1, 1) * this.shake * 0.6, rand(-1, 1) * this.shake * 0.4);
    ctx.drawImage(this.arena, 0, 0, W, H);

    const visible = this.units.filter(u => !u.inCloud || u.boss).sort((a, b) => a.y - b.y);

    // shadows
    for (const u of visible) {
      if (u.fallen && u.fallenT > 3) continue;
      const s = 1 - Math.min(0.6, u.z / 200);
      ctx.fillStyle = `rgba(0,0,0,${0.22 * s})`;
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + 1, u.radius * (isTurtle(u) ? 1.25 : 1.15) * s, u.radius * 0.38 * s, 0, 0, TAU);
      ctx.fill();
    }

    for (const e of this.effects) if (GROUND_FX.has(e.type)) this.drawFx(e);
    for (const u of visible) if (u.fallen) this.drawUnit(u);
    if (this.cloud.a > 0) this.drawCloud();
    for (const u of visible) if (!u.fallen) this.drawUnit(u);
    for (const e of this.effects) if (!GROUND_FX.has(e.type)) this.drawFx(e);
    for (const t of this.texts) this.drawText(t);

    if (this.pendingSpell && this.mouse) {
      const r = this.pendingSpell === 'lightning' ? 85 : 45;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.ellipse(this.mouse.x, this.mouse.y, r, r * 0.55, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (this.banner) this.drawBanner();
  }

  drawUnit(u) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(u.x, u.y - u.z);
    let alpha = 1;
    if (u.fallen) alpha = u.fallenT < 3 ? 1 : Math.max(0, 1 - (u.fallenT - 3) / 1.5);
    if (u.clone) alpha *= 0.65;
    if (this.phase === 'end' && u.side === this.winner && !u.dead && !u.jump) ctx.translate(0, -Math.abs(Math.sin(u.t * 7)) * 9);
    if (u.rot) {
      ctx.translate(0, -heightOf(u) * 0.4);
      ctx.rotate(u.rot);
      ctx.translate(0, heightOf(u) * 0.4);
    }
    const filters = [];
    if (u.hurt > 0) filters.push('brightness(2.2)');
    if (u.clone) filters.push('grayscale(1) brightness(0.55) sepia(1) hue-rotate(220deg) saturate(2.5)');
    if (u.fallen && !isTurtle(u)) filters.push('saturate(0.6)');
    if (filters.length) ctx.filter = filters.join(' ');

    drawCharacter(ctx, u.look, {
      t: u.t, walking: false, air: !!u.jump && u.z > 3, attack: u.jump && !u.dead ? 0.25 : u.dead ? -1 : u.anim,
      facing: u.facing, alpha, custom: u.custom, scale: US,
    });
    ctx.filter = 'none';

    if (!u.dead) {
      const h = heightOf(u);
      if (u.stun > 0) {
        for (let i = 0; i < 3; i++) {
          const an = u.t * 6 + i * TAU / 3;
          drawStar(ctx, Math.cos(an) * 12, -h - 4 + Math.sin(an) * 4, 4, 1.8, '#ffe14a');
        }
      }
      if (!u.jump) this.drawHpBar(u, h);
    }
    ctx.restore();
  }

  drawHpBar(u, h) {
    const ctx = this.ctx;
    const f = Math.max(0, u.hp / u.maxHp);
    const color = `hsl(${Math.round(f * 120)}, 90%, 48%)`;
    if (u.boss) {
      const w = 100;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-w / 2 - 2, -h - 16, w + 4, 9);
      ctx.fillStyle = color; ctx.fillRect(-w / 2, -h - 14, w * f, 5);
      return;
    }
    const bx = (u.facing > 0 ? -1 : 1) * (u.radius + 7);
    const bh = 26 * u.scale;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx - 2, -h + 6, 4, bh);
    ctx.fillStyle = color; ctx.fillRect(bx - 1.2, -h + 6 + bh * (1 - f), 2.4, bh * f);
  }

  drawCloud() {
    const ctx = this.ctx;
    const c = this.cloud;
    const a = c.a;
    const s = a < 1 ? easeOutBack(a) : 1;
    ctx.save();
    ctx.translate(CLOUD.x, CLOUD.y);
    ctx.globalAlpha = Math.min(1, a * 1.5);

    // ground dust shadow
    ctx.fillStyle = 'rgba(80,50,20,0.22)';
    ctx.beginPath(); ctx.ellipse(0, c.ry * 0.7, c.rx * 1.15 * s, c.ry * 0.45 * s, 0, 0, TAU); ctx.fill();

    // things poking out from behind the cloud
    for (const p of this.pops) if (p.type === 'tumble') this.drawPop(p, s);

    const t = this.time;
    const puff = (p, extra) => {
      const r = p.r * (1 + Math.sin(t * 9 + p.ph) * 0.08) * s + extra;
      const jx = Math.sin(t * 13 + p.ph * 3) * 2.5, jy = Math.cos(t * 11 + p.ph * 2) * 2.5;
      ctx.beginPath(); ctx.arc(p.x * s + jx, p.y * s + jy, Math.max(1, r), 0, TAU); ctx.fill();
    };
    ctx.fillStyle = '#7a5a3a';
    for (const p of c.puffs) puff(p, 4);
    ctx.fillStyle = '#f6efe0';
    for (const p of c.puffs) puff(p, 0);
    ctx.fillStyle = '#e6d9bf';
    for (const p of c.puffs) {
      const r = p.r * 0.55 * s;
      ctx.beginPath(); ctx.arc(p.x * s + 4, p.y * s + r * 0.6, Math.max(1, r), 0, TAU); ctx.fill();
    }
    // speed lines inside
    ctx.strokeStyle = 'rgba(122,90,58,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const an = t * 6 + i * 1.7;
      ctx.beginPath(); ctx.arc(0, 0, c.ry * (0.35 + i * 0.12) * s, an, an + 1.1); ctx.stroke();
    }

    for (const p of this.pops) if (p.type !== 'tumble' && p.type !== 'word' && p.type !== 'star') this.drawPop(p, s);
    for (const p of this.pops) if (p.type === 'word' || p.type === 'star') this.drawPop(p, s);
    ctx.restore();
  }

  drawPop(p, s) {
    const ctx = this.ctx;
    const k = p.t / p.dur;
    const out = Math.sin(k * Math.PI); // in-out
    const look = p.u.look;
    ctx.save();
    ctx.translate(p.x * s, p.y * s);
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#2b1b12'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (p.type) {
      case 'arm': {
        ctx.rotate(p.a - Math.PI / 2);
        const L = p.len * out;
        ctx.fillStyle = look.outfit || '#888';
        roundRect(ctx, -3.5, 0, 7, L, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = look.skin || '#ffdcbc';
        ctx.beginPath(); ctx.arc(0, L + 3, 4.5, 0, TAU); ctx.fill(); ctx.stroke();
        break;
      }
      case 'leg': {
        ctx.rotate(p.a - Math.PI / 2);
        const L = p.len * out;
        ctx.fillStyle = look.outfit2 || '#444';
        roundRect(ctx, -4, 0, 8, L, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = look.zombie ? look.skin : '#2a2a30';
        ctx.beginPath(); ctx.ellipse(2, L + 2, 6, 3.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
        break;
      }
      case 'weapon': {
        ctx.rotate(p.a + (k - 0.5) * 1.2);
        ctx.translate(18 * out, 0);
        ctx.scale(1.5, 1.5);
        drawWeapon(ctx, look.weapon === 'none' ? 'fists' : look.weapon, this.time, -1, look.weaponTint);
        break;
      }
      case 'tumble': {
        ctx.translate(Math.cos(p.a) * 14 * out, Math.sin(p.a) * 10 * out);
        ctx.rotate(p.spin * k);
        drawCharacter(ctx, look, { t: this.time, facing: p.facing, scale: 1.05, attack: 0.3 });
        break;
      }
      case 'star':
        ctx.scale(0.5 + out, 0.5 + out);
        ctx.rotate(k * 3);
        drawStar(ctx, 0, 0, 9, 4, '#ffe14a');
        break;
      case 'word': {
        const sc = 0.6 + Math.min(1, k * 4) * 0.6;
        ctx.scale(sc, sc);
        ctx.rotate(-0.15 + (p.a % 0.3));
        ctx.globalAlpha *= k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        ctx.font = '30px Bangers, Impact, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 6; ctx.strokeStyle = '#2b1b12';
        ctx.strokeText(p.word, 0, 0);
        ctx.fillStyle = '#ffd21f';
        ctx.fillText(p.word, 0, 0);
        break;
      }
    }
    ctx.restore();
  }

  drawFx(e) {
    const ctx = this.ctx;
    const k = e.t / e.dur;
    ctx.save();
    switch (e.type) {
      case 'slash': {
        ctx.translate(e.x, e.y);
        ctx.scale(e.dir || 1, 1);
        ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
        ctx.lineWidth = (e.big ? 6 : 4) * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(-6, 0, e.big ? 26 : 17, -1.3 + k * 0.6, 0.9 + k * 0.6); ctx.stroke();
        break;
      }
      case 'spark':
        ctx.translate(e.x, e.y);
        ctx.strokeStyle = e.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2.5;
        for (let i = 0; i < 6; i++) {
          const an = i * TAU / 6;
          ctx.beginPath(); ctx.moveTo(Math.cos(an) * 3, Math.sin(an) * 3); ctx.lineTo(Math.cos(an) * (7 + k * 12), Math.sin(an) * (7 + k * 12)); ctx.stroke();
        }
        break;
      case 'explosion': {
        ctx.translate(e.x, e.y);
        const r = e.r * (0.35 + 0.65 * Math.sqrt(k));
        ctx.globalAlpha = 1 - k;
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
        g.addColorStop(0, '#fff7c0'); g.addColorStop(0.35, '#ffb021'); g.addColorStop(0.75, '#e2401b'); g.addColorStop(1, 'rgba(120,30,10,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.8, 0, 0, TAU); ctx.fill();
        break;
      }
      case 'ring':
        ctx.translate(e.x, e.y);
        ctx.strokeStyle = e.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = (e.width || 5) * (1 - k) + 1;
        ctx.beginPath(); ctx.ellipse(0, 0, e.r * (0.2 + 0.8 * k), e.r * 0.5 * (0.2 + 0.8 * k), 0, 0, TAU); ctx.stroke();
        break;
      case 'dust':
        ctx.translate(e.x, e.y);
        ctx.fillStyle = `rgba(190,160,120,${0.5 * (1 - k)})`;
        for (let i = 0; i < 8; i++) {
          const an = i * TAU / 8;
          const rr = e.r * (0.3 + 0.7 * k);
          ctx.beginPath(); ctx.arc(Math.cos(an) * rr, Math.sin(an) * rr * 0.45 - 5, 6 + k * 7, 0, TAU); ctx.fill();
        }
        break;
      case 'healwave':
        ctx.translate(e.x, e.y);
        ctx.strokeStyle = `rgba(120,255,140,${1 - k})`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, 0, e.r * k, e.r * 0.5 * k, 0, 0, TAU); ctx.stroke();
        break;
      case 'healfx':
        ctx.translate(e.x, e.y);
        ctx.fillStyle = `rgba(110,255,130,${1 - k})`;
        for (let i = 0; i < 3; i++) {
          const x = (i - 1) * 10, y = -e.h * 0.4 - k * 30 - i * 6;
          ctx.fillRect(x - 1.5, y - 5, 3, 10); ctx.fillRect(x - 5, y - 1.5, 10, 3);
        }
        break;
      case 'smoke':
      case 'poof':
        ctx.translate(e.x, e.y);
        ctx.fillStyle = e.color ? hexA(e.color, 0.55 * (1 - k)) : `rgba(246,239,224,${0.85 * (1 - k)})`;
        for (let i = 0; i < 9; i++) {
          const an = i * TAU / 9;
          const rr = (e.r || 18) * (0.5 + k * 0.9);
          ctx.beginPath(); ctx.arc(Math.cos(an) * rr * 0.8, Math.sin(an) * rr * 0.5, rr * 0.45 * (1 - k * 0.4), 0, TAU); ctx.fill();
        }
        break;
      case 'lightning':
      case 'bolt': {
        const pts = e.type === 'bolt' ? [{ x: e.x + rand(-30, 30), y: -10 }, { x: e.x, y: e.y }] : e.pts;
        ctx.globalAlpha = 1 - k;
        for (const [w, col] of [[7, 'rgba(110,230,255,0.5)'], [2.5, '#ffffff']]) {
          ctx.strokeStyle = col; ctx.lineWidth = w;
          ctx.beginPath();
          for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            const segs = e.type === 'bolt' ? 10 : 5;
            if (i === 0) ctx.moveTo(a.x, a.y);
            for (let sgm = 1; sgm <= segs; sgm++) {
              const q = sgm / segs, j = sgm === segs ? 0 : 12;
              ctx.lineTo(a.x + (b.x - a.x) * q + rand(-j, j), a.y + (b.y - a.y) * q + rand(-j, j) * 0.6);
            }
          }
          ctx.stroke();
        }
        break;
      }
      case 'tornado': {
        ctx.translate(e.x, e.y);
        ctx.globalAlpha = Math.min(1, e.t * 3, (e.dur - e.t) * 2);
        for (let i = 0; i < 12; i++) {
          const y = -i * 9;
          const rx = 10 + i * 3.6 + Math.sin(e.t * 18 + i) * 2.5;
          const ox = Math.sin(e.t * 9 + i * 0.6) * (3 + i * 0.8);
          ctx.strokeStyle = i % 2 ? 'rgba(255,90,40,0.85)' : 'rgba(255,190,90,0.8)';
          ctx.fillStyle = 'rgba(255,110,70,0.18)';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(ox, y, rx, 4 + i * 0.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }

  drawText(t) {
    const ctx = this.ctx;
    const life = t.kind === 'shout' ? 1.1 : 0.85;
    const k = t.t / life;
    const y = t.y - k * (t.kind === 'shout' ? 16 : 30);
    ctx.save();
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    let size = 16, fill = '#ff3b2f', stroke = '#ffffff';
    if (t.kind === 'dmgP') fill = '#c81e1e';
    if (t.kind === 'crit') { size = 22; fill = '#ffd21f'; stroke = '#7a1f00'; }
    if (t.kind === 'heal') fill = '#2fbf4a';
    if (t.kind === 'shout') { size = 14; fill = t.color || '#fff'; stroke = '#1b1020'; ctx.direction = 'rtl'; }
    const pop = t.kind === 'crit' ? 1 + Math.max(0, 0.4 - t.t) * 1.5 : 1;
    ctx.font = `800 ${Math.round(size * pop)}px Rubik, sans-serif`;
    ctx.lineWidth = 3.5; ctx.strokeStyle = stroke;
    ctx.strokeText(t.str, t.x, y);
    ctx.fillStyle = fill;
    ctx.fillText(t.str, t.x, y);
    ctx.restore();
  }

  drawBanner() {
    const ctx = this.ctx;
    const b = this.banner;
    const k = b.t / b.dur;
    const scale = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : k < 0.25 ? 1.1 - ((k - 0.15) / 0.1) * 0.1 : 1;
    ctx.save();
    ctx.translate(W / 2, 190);
    ctx.scale(scale, scale);
    ctx.rotate(-0.04);
    ctx.globalAlpha = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '86px Bangers, Impact, sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12; ctx.strokeStyle = '#3b3b3b';
    ctx.strokeText(b.text, 0, 0);
    const g = ctx.createLinearGradient(0, -40, 0, 40);
    const win = b.text === 'VICTORY!', lose = b.text === 'DEFEAT';
    g.addColorStop(0, win ? '#fff3a0' : lose ? '#ffb0a0' : '#f4f4f4');
    g.addColorStop(1, win ? '#ffb320' : lose ? '#d8351f' : '#a9a9a9');
    ctx.fillStyle = g;
    ctx.fillText(b.text, 0, 0);
    ctx.restore();
  }
}

const GROUND_FX = new Set(['ring', 'dust', 'healwave']);

function easeOutBack(x) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
}
