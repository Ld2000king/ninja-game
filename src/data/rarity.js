// Rarity = how strong a ninja is born (from the summon shrine). Each tier rolls base stats in its own range.
export const RARITIES = {
  common:    { id: 'common',    name: 'נפוץ', color: '#a7b3bd', dark: '#58636d', order: 0, weight: 62, release: 40,
               hp: [180, 260], atk: [14, 21], crit: [0.03, 0.07], armor: [0.00, 0.05] },
  rare:      { id: 'rare',      name: 'נדיר', color: '#3d8bff', dark: '#1b4ea6', order: 1, weight: 27, release: 120,
               hp: [250, 330], atk: [19, 27], crit: [0.05, 0.10], armor: [0.03, 0.08] },
  epic:      { id: 'epic',      name: 'אפי',  color: '#b45cff', dark: '#6420aa', order: 2, weight: 9,  release: 400,
               hp: [320, 420], atk: [25, 34], crit: [0.08, 0.14], armor: [0.05, 0.12] },
  legendary: { id: 'legendary', name: 'אגדי', color: '#ffb320', dark: '#a86300', order: 3, weight: 2,  release: 1500,
               hp: [420, 540], atk: [32, 44], crit: [0.12, 0.20], armor: [0.08, 0.15] },
};

export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];

// Belt ranks. mult multiplies the ninja's base HP and attack.
// xp = total battle experience the ninja needs to take the belt exam, cost = gold for the exam.
export const BELTS = [
  { id: 'white',  name: 'לבנה',  color: '#f4f4f4', mult: 1.00, xp: 0,    cost: 0 },
  { id: 'yellow', name: 'צהובה', color: '#ffd93b', mult: 1.25, xp: 40,   cost: 150 },
  { id: 'orange', name: 'כתומה', color: '#ff9a2e', mult: 1.50, xp: 120,  cost: 350 },
  { id: 'green',  name: 'ירוקה', color: '#3fae3a', mult: 1.75, xp: 260,  cost: 700 },
  { id: 'blue',   name: 'כחולה', color: '#2f7de0', mult: 2.00, xp: 480,  cost: 1200 },
  { id: 'purple', name: 'סגולה', color: '#8a3fd1', mult: 2.30, xp: 800,  cost: 2000 },
  { id: 'brown',  name: 'חומה',  color: '#7a4a22', mult: 2.60, xp: 1250, cost: 3200 },
  { id: 'black',  name: 'שחורה', color: '#1b1b1f', mult: 3.00, xp: 1900, cost: 5000 },
];

// Every ninja is born with one trait.
export const TRAITS = {
  sturdy:   { name: 'חסון',        desc: '+15% חיים',                  hp: 0.15 },
  fierce:   { name: 'עז',          desc: '+12% נזק',                   atk: 0.12 },
  swift:    { name: 'זריז',        desc: '+15% מהירות התקפה',          aspd: 0.15 },
  sharp:    { name: 'עין חדה',     desc: '+8% סיכוי קריטי',            crit: 0.08 },
  iron:     { name: 'עור ברזל',    desc: '+8% שריון',                  armor: 0.08 },
  balanced: { name: 'מאוזן',       desc: '+6% חיים, נזק ומהירות',      hp: 0.06, atk: 0.06, aspd: 0.06 },
  prodigy:  { name: 'גאון לחימה',  desc: '+20% נזק ו-10% חיים',        atk: 0.2, hp: 0.1 },
  legend:   { name: 'בן אגדה',     desc: '+20% חיים ונזק, +10% מהירות', hp: 0.2, atk: 0.2, aspd: 0.1, crit: 0.05 },
};

export const TRAIT_POOLS = {
  common: ['sturdy', 'fierce', 'swift', 'sharp', 'iron', 'balanced'],
  rare: ['sturdy', 'fierce', 'swift', 'sharp', 'iron', 'balanced'],
  epic: ['fierce', 'swift', 'sharp', 'balanced', 'prodigy', 'prodigy'],
  legendary: ['prodigy', 'legend', 'legend'],
};
