// Costume only: weapons and rank belts always come from equipped game data.
export const NINJA_STYLES = {
  violet: { outfit: '#34283e', outfit2: '#211d2c', trim: '#d9ad59', scarf: '#653461', hood: 'pointed', build: 1 },
  scout: { outfit: '#293b55', outfit2: '#172538', trim: '#aab9cc', scarf: '#85313f', hood: 'fitted', build: 0.87 },
  guardian: { outfit: '#36363c', outfit2: '#222329', trim: '#91404a', scarf: '#8e303b', hood: 'wrapped', build: 1.22 },
  forest: { outfit: '#414d37', outfit2: '#252e23', trim: '#8b7350', hood: 'wrapped', build: 0.92 },
  ivory: { outfit: '#e5dfd2', outfit2: '#35455b', trim: '#899bb0', scarf: '#354d70', hood: 'pointed', build: 0.94 },
  shadow: { outfit: '#282131', outfit2: '#181822', trim: '#deb459', scarf: '#613073', hood: 'pointed', build: 1 },
};

export const ORDINARY_STYLES = ['violet', 'scout', 'guardian', 'forest', 'ivory'];

export function costumeLook(style, skin = '#f6cfa6') {
  const c = NINJA_STYLES[style] || NINJA_STYLES.violet;
  return { ...c, ninjaStyle: style, hair: 'hood', hairColor: c.outfit, skin,
    ...(style === 'shadow' ? { aura: 'ghost', eyeColor: '#ffc66b' } : {}) };
}

// Upgrade old saved appearances at render time; never rewrite a save or stats.
export function ninjaLook(n) {
  if (NINJA_STYLES[n.look?.ninjaStyle]) return n.look;
  let hash = 7;
  for (const ch of String(n.uid || n.name)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return costumeLook(n.rarity === 'legendary' ? 'shadow' : ORDINARY_STYLES[hash % ORDINARY_STYLES.length], n.look?.skin);
}
