// Non-ninja enemies: zombies and bosses. Their stats scale with the stage level.
export const MONSTERS = {
  zombie: {
    name: 'נינג׳ה זומבי', rarity: 'common',
    stats: { hp: 260, atk: 24, aspd: 0.8, crit: 0, armor: 0.05 },
    look: { hair: 'long', hairColor: '#2b2f38', skin: '#8fb8cc', outfit: '#c25a63', outfit2: '#6d2a33', belt: '#4a4f5a', eyes: 'zombie', weapon: 'none', zombie: true },
  },
  zombieBrute: {
    name: 'זומבי בריון', rarity: 'rare',
    stats: { hp: 560, atk: 32, aspd: 0.6, crit: 0, armor: 0.15 },
    look: { hair: 'topknot', hairColor: '#2b2f38', skin: '#7aa6bb', outfit: '#6d4a8f', outfit2: '#3b2550', belt: '#4a4f5a', eyes: 'zombie', weapon: 'none', zombie: true, scale: 1.25 },
  },
  traitor: {
    name: 'הסנסאי הבוגד', rarity: 'epic', boss: true,
    stats: { hp: 2000, atk: 30, aspd: 0.8, crit: 0.05, armor: 0.2 },
    ability: { name: 'רעידת מטה', type: 'stun', targets: 3, mult: 1.3, duration: 1.2, cd: 6 },
    look: { hair: 'elder', hairColor: '#8a8a8a', skin: '#f0c49e', outfit: '#4a2a6b', outfit2: '#1f0f33', belt: '#1b1b1f', eyes: 'glow', eyeColor: '#ff5a5a', weapon: 'staff', aura: 'dark', scale: 1.7 },
  },
  shadowlord: {
    name: 'אדון הצללים', rarity: 'legendary', boss: true,
    stats: { hp: 2800, atk: 38, aspd: 1.1, crit: 0.2, armor: 0.15 },
    ability: { name: 'שכפול צל', type: 'clone', count: 2, power: 0.3, cd: 9 },
    look: { hair: 'hood', hairColor: '#111', skin: '#e9dcff', outfit: '#111117', outfit2: '#000', belt: '#1b1b1f', scarf: '#ff3a3a', eyes: 'glow', eyeColor: '#ff3a3a', weapon: 'katana', aura: 'dark', scale: 1.6 },
  },
  zombieKing: {
    name: 'מלך הזומבים', rarity: 'legendary', boss: true,
    stats: { hp: 3600, atk: 48, aspd: 0.7, crit: 0.05, armor: 0.2 },
    ability: { name: 'קריאת המתים', type: 'summon', unit: 'zombie', count: 2, cd: 10 },
    look: { hair: 'long', hairColor: '#2b2f38', skin: '#6f9fb6', outfit: '#3b2550', outfit2: '#1e1230', belt: '#ffb320', crown: true, eyes: 'glow', eyeColor: '#9dff5a', weapon: 'hammer', zombie: true, scale: 1.9 },
  },
  turtle: {
    name: 'צב המכונה', rarity: 'legendary', boss: true, custom: 'turtle',
    stats: { hp: 9000, atk: 55, aspd: 0.9, crit: 0.05, armor: 0.3 },
    ability: { name: 'מטח תותחים', type: 'cleave', targets: 5, mult: 1.3, cd: 6, fx: 'fire' },
    look: { radius: 55 },
  },
};
