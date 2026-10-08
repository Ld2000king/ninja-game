// Ninja generator: every ninja is unique – own name, look, base stats and trait.
import { RARITIES, TRAIT_POOLS } from './rarity.js';
import { costumeLook, ORDINARY_STYLES } from './ninja-looks.js';

const NAMES = [
  'קנג׳י', 'הירו', 'יוקי', 'סאקורה', 'ריו', 'טאקשי', 'אקירה', 'מיקו', 'קאיטו', 'האנה',
  'ג׳ין', 'רן', 'סורה', 'ראיקו', 'טורו', 'אאיקו', 'קנטה', 'נאוקי', 'שין', 'יאמאטו',
  'איצ׳ירו', 'מאי', 'הייאטו', 'קאזו', 'טאקה', 'מומו', 'ריוג׳י', 'יורי', 'צובאסה', 'קוהאקו',
  'היקארי', 'אסאמי', 'שינג׳י', 'קיוקו', 'דאיצ׳י', 'ננאמי', 'קאורו', 'סנטה', 'אמי', 'טאיגה',
];
const TITLES = ['הזריז', 'השקט', 'האמיץ', 'מההרים', 'הצל', 'הסערה', 'הברזל', 'הלהבה', 'הירח', 'הנמר'];

const HAIRS = ['long', 'long', 'topknot', 'spiky', 'bun', 'hood', 'hood', 'bald'];
const HAIR_COLORS = ['#1d1b22', '#1d1b22', '#2a1a14', '#6b3b1f', '#3a2a5a', '#7a1f2a', '#c9c9c9'];
const SKINS = ['#ffdcbc', '#ffdcbc', '#f6cfa6', '#e8b48a', '#c98e62', '#fde6d4'];
const OUTFITS = [
  ['#d63c3c', '#7c1d2b'], ['#ef8a2c', '#8a3f12'], ['#3a3c48', '#22232b'], ['#1f9e8f', '#0f5a52'],
  ['#3f9c3a', '#1f5a1d'], ['#2f6fbf', '#163c73'], ['#6d4a8f', '#3b2550'], ['#f2b233', '#a8521a'],
  ['#1f1f27', '#121217'], ['#b3201f', '#5e0d10'], ['#e9e4d4', '#8a7a5a'], ['#4a2a6b', '#1f0f33'],
];
const BANDS = ['#ffffff', '#d63c3c', '#2f6fbf', '#ffb320', '#1d1b22', '#3f9c3a'];
const AURAS = ['fire', 'ice', 'storm', 'ghost', 'life'];
const EYE_GLOW = { fire: '#ffb347', ice: '#bff6ff', storm: '#5fe3ff', ghost: '#d6a8ff', life: '#9dff9d' };

export function seededRng(seed) {
  let s = typeof seed === 'number' ? seed : [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  s = s % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const between = (rng, [a, b]) => a + rng() * (b - a);

let counter = 0;
export const newUid = (p = 'n') => p + Date.now().toString(36) + (counter++).toString(36) + Math.floor(Math.random() * 1e4).toString(36);

export function rollLook(rarity, rng = Math.random) {
  const [outfit, outfit2] = pick(rng, OUTFITS);
  const hair = pick(rng, HAIRS);
  const look = {
    hair,
    hairColor: hair === 'hood' ? outfit2 : pick(rng, HAIR_COLORS),
    skin: pick(rng, SKINS),
    outfit, outfit2,
  };
  if (rng() < 0.5 && hair !== 'hood') look.headband = pick(rng, BANDS);
  if (rng() < 0.12 && hair !== 'hood') look.mask = rng() < 0.5 ? '#ffffff' : '#1d1b22';
  const ord = RARITIES[rarity].order;
  if (ord >= 1 && rng() < 0.35) look.scarf = pick(rng, BANDS.slice(1));
  if (ord >= 2 && rng() < 0.5) look.headband = look.headband || pick(rng, BANDS);
  if (ord >= 3) {
    look.aura = pick(rng, AURAS);
    look.eyes = 'glow';
    look.eyeColor = EYE_GLOW[look.aura];
    if (rng() < 0.4) { look.hair = 'wild'; look.hairColor = pick(rng, ['#f2f2f2', '#ffb320', '#d63c3c']); }
  }
  // Keep the original RNG draw sequence so deterministic enemy stats do not change.
  const styleSeed = [...JSON.stringify(look)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return costumeLook(ord >= 3 ? 'shadow' : ORDINARY_STYLES[styleSeed % ORDINARY_STYLES.length], look.skin);
}

/** A brand-new ninja of the given rarity (used by summons, starting roster and enemies). */
export function rollNinja(rarity, rng = Math.random) {
  const r = RARITIES[rarity];
  const name = pick(rng, NAMES) + (r.order >= 2 ? ' ' + pick(rng, TITLES) : '');
  return {
    uid: newUid(),
    name,
    rarity,
    trait: pick(rng, TRAIT_POOLS[rarity]),
    base: {
      hp: Math.round(between(rng, r.hp)),
      atk: Math.round(between(rng, r.atk)),
      crit: +between(rng, r.crit).toFixed(3),
      armor: +between(rng, r.armor).toFixed(3),
    },
    look: rollLook(rarity, rng),
    belt: 0,
    xp: 0,
    weapon: null,
  };
}
