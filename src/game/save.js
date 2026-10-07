// Local save in the browser (localStorage). No server needed.
import { RARITIES, BELTS } from '../data/rarity.js';
import { WEAPON_MAP } from '../data/weapons.js';
import { ALL_STAGES } from '../data/stages.js';
import { rollNinja, newUid } from '../data/ninjas.js';
import { ninjaStats, power } from './stats.js';

const KEY = 'ninja-wars-save-v2';
export const SUMMON_COST = 500;
export const SUMMON10_COST = 4500;
export const MAX_ROSTER = 40;
export const SELL_RATE = 0.4;

function fresh() {
  const ninjas = Array.from({ length: 5 }, () => rollNinja('common'));
  const items = [{ uid: newUid('w'), wid: 'bamboo_bo' }, { uid: newUid('w'), wid: 'wood_nunchaku' }];
  ninjas[0].weapon = items[0].uid;
  ninjas[1].weapon = items[1].uid;
  return {
    town: 'הכפר שלי',
    gold: 300,
    xp: 0,
    level: 1,
    ninjas,
    items,
    squad: ninjas.map(n => n.uid),
    progress: {}, // stageId -> stars
    stats: { battles: 0, wins: 0, kills: 0 },
  };
}

export const save = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  const f = fresh();
  try { localStorage.setItem(KEY, JSON.stringify(f)); } catch { /* ignore */ }
  return f;
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* ignore */ }
}

export function resetSave() {
  const f = fresh();
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, f);
  persist();
}

// ── player level
export const xpForLevel = (lvl) => 50 + lvl * 35;
export function addXp(n) {
  save.xp += n;
  let ups = 0;
  while (save.xp >= xpForLevel(save.level)) {
    save.xp -= xpForLevel(save.level);
    save.level++;
    ups++;
  }
  return ups;
}
export const squadSize = (lvl = save.level) => Math.min(10, 5 + Math.floor((lvl - 1) / 2));

// ── ninjas
export const getNinja = (uid) => save.ninjas.find(n => n.uid === uid);
export const getItem = (uid) => save.items.find(i => i.uid === uid);
export const weaponOf = (n) => (n.weapon ? WEAPON_MAP[getItem(n.weapon)?.wid] || null : null);
export const statsOf = (n) => ninjaStats(n, weaponOf(n));
export const powerOf = (n) => power(statsOf(n));
export const ownerOf = (itemUid) => save.ninjas.find(n => n.weapon === itemUid);
export const inSquad = (uid) => save.squad.includes(uid);

export function toggleSquad(uid) {
  if (inSquad(uid)) save.squad = save.squad.filter(x => x !== uid);
  else {
    if (save.squad.length >= squadSize()) return 'החוליה מלאה – הוצא נינג׳ה קודם';
    save.squad.push(uid);
  }
  persist();
  return null;
}

export function autoSquad() {
  save.squad = [...save.ninjas].sort((a, b) => powerOf(b) - powerOf(a)).slice(0, squadSize()).map(n => n.uid);
  persist();
}

export function equip(ninjaUid, itemUid) {
  const n = getNinja(ninjaUid);
  if (!n) return;
  if (itemUid) {
    const prev = ownerOf(itemUid);
    if (prev) prev.weapon = null;
  }
  n.weapon = itemUid || null;
  persist();
}

// ── belts
export function beltStatus(n) {
  const next = BELTS[n.belt + 1];
  if (!next) return { max: true };
  return { next, xpOk: n.xp >= next.xp, goldOk: save.gold >= next.cost };
}
export function promote(uid) {
  const n = getNinja(uid);
  const st = beltStatus(n);
  if (st.max || !st.xpOk || !st.goldOk) return false;
  save.gold -= st.next.cost;
  n.belt++;
  persist();
  return true;
}

export function releaseNinja(uid) {
  const n = getNinja(uid);
  if (!n || save.ninjas.length <= 1) return 0;
  const gold = RARITIES[n.rarity].release * (1 + n.belt);
  save.ninjas = save.ninjas.filter(x => x !== n);
  save.squad = save.squad.filter(x => x !== uid);
  save.gold += gold;
  persist();
  return gold;
}

export function renameNinja(uid, name) {
  const n = getNinja(uid);
  if (n && name.trim()) { n.name = name.trim().slice(0, 18); persist(); }
}

// ── shop
export function buyWeapon(wid) {
  const w = WEAPON_MAP[wid];
  if (!w || save.gold < w.price) return null;
  save.gold -= w.price;
  const item = { uid: newUid('w'), wid };
  save.items.push(item);
  persist();
  return item;
}
export function grantWeapon(wid) {
  const item = { uid: newUid('w'), wid };
  save.items.push(item);
  return item;
}
export const sellPrice = (wid) => Math.round(WEAPON_MAP[wid].price * SELL_RATE);
export function sellItem(itemUid) {
  const it = getItem(itemUid);
  if (!it) return 0;
  const owner = ownerOf(itemUid);
  if (owner) owner.weapon = null;
  save.items = save.items.filter(x => x !== it);
  const g = sellPrice(it.wid);
  save.gold += g;
  persist();
  return g;
}

// ── stages
export function isUnlocked(stageId) {
  const i = ALL_STAGES.findIndex(s => s.id === stageId);
  return i === 0 || !!save.progress[ALL_STAGES[i - 1].id];
}

// ── summon (in-game gold only, no real money)
export function rollRarity() {
  const total = Object.values(RARITIES).reduce((a, r) => a + r.weight, 0);
  let x = Math.random() * total;
  for (const r of Object.values(RARITIES)) if ((x -= r.weight) < 0) return r.id;
  return 'common';
}
export function summon() {
  const n = rollNinja(rollRarity());
  save.ninjas.push(n);
  return n;
}
