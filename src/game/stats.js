// Final combat stats = ninja base × belt × trait + weapon bonuses.
import { BELTS, TRAITS } from '../data/rarity.js';
import { WEAPON_MAP, WEAPON_TYPES } from '../data/weapons.js';
import { MONSTERS } from '../data/monsters.js';
import { rollNinja, seededRng } from '../data/ninjas.js';
import { ninjaLook } from '../data/ninja-looks.js';

export function ninjaStats(n, weapon) {
  const belt = BELTS[n.belt];
  const t = TRAITS[n.trait] || {};
  const w = weapon || { atk: 0, aspd: 1.0 };
  return {
    hp: Math.round((n.base.hp * belt.mult + (w.hp || 0)) * (1 + (t.hp || 0))),
    atk: Math.round((n.base.atk * belt.mult + (w.atk || 0) * (1 + n.belt * 0.08)) * (1 + (t.atk || 0))),
    aspd: +(w.aspd * (1 + (t.aspd || 0))).toFixed(2),
    crit: Math.min(0.6, n.base.crit + (w.crit || 0) + (t.crit || 0)),
    armor: Math.min(0.6, n.base.armor + (t.armor || 0) + n.belt * 0.01),
  };
}

export function power(s) {
  return Math.round(s.hp * 0.3 + s.atk * s.aspd * 7 * (1 + s.crit * 0.8) * (1 + s.armor));
}

/** Everything the battle needs to know about one fighter. */
export function ninjaSpec(n, weapon) {
  const type = weapon?.type || 'fists';
  return {
    name: n.name,
    rarity: n.rarity,
    stats: ninjaStats(n, weapon),
    ability: WEAPON_TYPES[type].ability,
    look: { ...ninjaLook(n), belt: BELTS[n.belt].color, weapon: type, weaponTint: weapon?.tint },
  };
}

export function monsterSpec(id, level) {
  const m = MONSTERS[id];
  const k = 1 + 0.12 * (level - 1);
  return {
    name: m.name, rarity: m.rarity, boss: !!m.boss, custom: m.custom, monster: id,
    stats: { ...m.stats, hp: Math.round(m.stats.hp * k), atk: Math.round(m.stats.atk * k) },
    ability: m.ability || null,
    look: m.look,
  };
}

/** Enemy ninjas are generated deterministically from the stage id, so a stage always looks the same. */
export function stageWaves(stage) {
  const rng = seededRng('stage' + stage.id);
  return stage.waves.map(w => w.map(e => {
    if (e.kind === 'monster') return monsterSpec(e.id, stage.level);
    const n = rollNinja(e.rarity, rng);
    n.belt = e.belt;
    return ninjaSpec(n, e.weapon ? WEAPON_MAP[e.weapon] : null);
  }));
}

export const stagePower = (stage) => stageWaves(stage).flat().reduce((a, s) => a + power(s.stats), 0);
