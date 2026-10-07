// Weapons are bought in the shop and equipped on any ninja.
// The weapon TYPE decides the special ability used inside the fight cloud; the weapon itself adds stats.
// atk = bonus damage per hit, aspd = attacks per second, crit/hp = bonuses.

export const WEAPON_TYPES = {
  fists: { name: 'ידיים חשופות', ability: null },
  katana: { name: 'קטאנה', ability: { name: 'חיתוך כפול', type: 'multiHit', hits: 2, mult: 1.0, cd: 6, desc: 'מכה את המטרה פעמיים ברצף, 100% נזק כל מכה.' } },
  flamekatana: { name: 'להב בוער', ability: { name: 'להב התופת', type: 'cleave', targets: 3, mult: 1.6, cd: 7, fx: 'fire', desc: 'חותך 3 אויבים בלהבות, 160% נזק.' } },
  sai: { name: 'סאי', ability: { name: 'דקירת צל', type: 'execute', mult: 2.2, cd: 7, desc: 'פוגע באויב החלש ביותר בענן ב-220% נזק.' } },
  nunchaku: { name: 'נונצ׳אקו', ability: { name: 'סערת מכות', type: 'multiHit', hits: 5, mult: 0.6, cd: 7, desc: '5 מכות מהירות, 60% נזק כל אחת.' } },
  staff: { name: 'מטה', ability: { name: 'מכת הלם', type: 'stun', targets: 2, mult: 1.1, duration: 1.5, cd: 8, desc: 'משתק 2 אויבים ל-1.5 שניות, 110% נזק.' } },
  hammer: { name: 'פטיש', ability: { name: 'גל הלם', type: 'cleave', targets: 4, mult: 1.3, cd: 9, fx: 'shock', desc: 'מכת אדמה שפוגעת ב-4 אויבים, 130% נזק.' } },
  kunai: { name: 'קונאי', ability: { name: 'מטר קונאי', type: 'cleave', targets: 3, mult: 0.9, cd: 6, fx: 'blades', desc: 'זורק קונאי על 3 אויבים, 90% נזק.' } },
  shuriken: { name: 'שוריקן', ability: { name: 'מטר שוריקנים', type: 'cleave', targets: 3, mult: 0.8, cd: 5, fx: 'blades', desc: 'זורק שוריקנים על 3 אויבים, 80% נזק.' } },
  fan: { name: 'מניפה', ability: { name: 'כדור אש', type: 'cleave', targets: 3, mult: 1.5, cd: 8, fx: 'fire', desc: 'מפוצץ כדור אש בענן: 3 אויבים, 150% נזק.' } },
  orbstaff: { name: 'מטה קסם', ability: { name: 'שרשרת ברק', type: 'chain', jumps: 5, mult: 1.6, cd: 8, fx: 'lightning', desc: 'ברק שקופץ בין 5 אויבים, נחלש בכל קפיצה.' } },
};

export const WEAPONS = [
  // ── common
  { id: 'bamboo_bo',      name: 'מקל במבוק',        type: 'staff',    rarity: 'common', atk: 5,  aspd: 0.9,  price: 120, desc: 'מקל פשוט מהיער שליד הדוג׳ו.' },
  { id: 'wood_nunchaku',  name: 'נונצ׳אקו עץ',      type: 'nunchaku', rarity: 'common', atk: 4,  aspd: 1.5,  price: 140, desc: 'שני מקלות ושרשרת. מה כבר יכול להשתבש?' },
  { id: 'iron_sai',       name: 'סאי ברזל',         type: 'sai',      rarity: 'common', atk: 6,  aspd: 1.25, crit: 0.06, price: 160, desc: 'קל, חד ומהיר.' },
  { id: 'wood_mallet',    name: 'פטיש עץ',          type: 'hammer',   rarity: 'common', atk: 10, aspd: 0.7,  price: 170, desc: 'איטי, אבל כשהוא פוגע – מרגישים.' },
  { id: 'shuriken_pouch', name: 'שקיק שוריקנים',    type: 'shuriken', rarity: 'common', atk: 5,  aspd: 1.3,  price: 150, desc: 'עשרים כוכבי מתכת קטנים ומרושעים.' },
  // ── rare
  { id: 'steel_katana',   name: 'קטאנת פלדה',       type: 'katana',   rarity: 'rare', atk: 13, aspd: 1.1,  crit: 0.05, price: 650, desc: 'חושלה בכפר הנפחים שבהרים.' },
  { id: 'kunai_set',      name: 'סט קונאי',         type: 'kunai',    rarity: 'rare', atk: 11, aspd: 1.35, price: 600, desc: 'שישה פגיונות זריקה מאוזנים.' },
  { id: 'iron_bo',        name: 'מטה ברזל',         type: 'staff',    rarity: 'rare', atk: 14, aspd: 0.9,  hp: 60, price: 700, desc: 'כבד מספיק כדי לשמש גם כמגן.', tint: '#6b7280' },
  { id: 'war_fan',        name: 'מניפת מלחמה',      type: 'fan',      rarity: 'rare', atk: 12, aspd: 1.0,  price: 750, desc: 'מניפה עם להבי פלדה ונשמה של אש.' },
  { id: 'chain_nunchaku', name: 'נונצ׳אקו שרשרת',   type: 'nunchaku', rarity: 'rare', atk: 10, aspd: 1.7,  price: 700, desc: 'מהיר יותר ממה שהעין רואה.', tint: '#3a3e46' },
  // ── epic
  { id: 'oni_club',       name: 'אלת האוני',        type: 'hammer',   rarity: 'epic', atk: 30, aspd: 0.7,  hp: 120, price: 2400, desc: 'נלקחה משד הרים. הוא עדיין כועס.', tint: '#7a1f2a' },
  { id: 'storm_staff',    name: 'מטה הסערה',        type: 'orbstaff', rarity: 'epic', atk: 22, aspd: 0.95, price: 2600, desc: 'הכדור בקצה מזמזם בחשמל.' },
  { id: 'shadow_sai',     name: 'סאי הצל',          type: 'sai',      rarity: 'epic', atk: 20, aspd: 1.5,  crit: 0.15, price: 2500, desc: 'נעלם בחושך – ומופיע בגב שלך.', tint: '#9a6bff' },
  { id: 'moon_katana',    name: 'קטאנת הירח',       type: 'katana',   rarity: 'epic', atk: 25, aspd: 1.15, crit: 0.08, price: 2800, desc: 'זוהרת באור כסוף בלילות ירח מלא.', tint: '#bfe4ff' },
  // ── legendary
  { id: 'demon_blade',    name: 'להב השד המקולל',   type: 'flamekatana', rarity: 'legendary', atk: 46, aspd: 1.2, crit: 0.15, price: 9000, desc: 'לפי האגדה, הלהב נגנב מידיו של שד אדיר.' },
  { id: 'dragon_nunchaku', name: 'נונצ׳אקו הדרקון', type: 'nunchaku', rarity: 'legendary', atk: 34, aspd: 1.9, price: 8500, desc: 'עשוי מקשקשי דרקון זהב.', tint: '#ffb320' },
  { id: 'heaven_staff',   name: 'מטה השמיים',       type: 'orbstaff', rarity: 'legendary', atk: 40, aspd: 1.0, hp: 200, price: 9500, desc: 'אומרים שהשמיים עצמם עונים למי שמחזיק בו.' },
];

export const WEAPON_MAP = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

// Shop stock unlocks with the player's level
export const SHOP_UNLOCK = { common: 1, rare: 3, epic: 6, legendary: 9 };

export const dps = (w) => (w ? w.atk * w.aspd : 0);
export function speedLabel(aspd) {
  if (aspd >= 1.6) return 'מהיר מאוד';
  if (aspd >= 1.2) return 'מהיר';
  if (aspd >= 0.9) return 'בינוני';
  return 'איטי';
}
