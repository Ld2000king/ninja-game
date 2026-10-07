// World map: 4 regions, 4 stages each. The last stage of every region is a boss.
// pos = position on the world map (1000x560). level = scaling for zombies & bosses.
// waves: list of waves, each a list of enemy specs built with N() (ninjas) and M() (monsters).
// reward = weapon id given on the first win.

const N = (count, rarity, belt, ...weapons) =>
  Array.from({ length: count }, (_, i) => ({ kind: 'ninja', rarity, belt, weapon: weapons.length ? weapons[i % weapons.length] : null }));
const M = (id, count = 1) => Array.from({ length: count }, () => ({ kind: 'monster', id }));
const wave = (...parts) => parts.flat();

export const REGIONS = [
  {
    id: 'dojo', name: 'דוג׳ו הלוטוס האדום', arena: 'dojo', color: '#d0412f',
    desc: 'הדוג׳ו שבו הכל התחיל. התלמידים המורדים השתלטו עליו – הגיע הזמן להחזיר את הסדר.',
    stages: [
      { id: '1-1', name: 'שיעור ראשון',    level: 1, pos: [70, 470],  gold: 100, xp: 40,  waves: [wave(N(3, 'common', 0))] },
      { id: '1-2', name: 'תלמידים מורדים', level: 1, pos: [160, 410], gold: 130, xp: 50,  waves: [wave(N(5, 'common', 0, 'bamboo_bo', null))] },
      { id: '1-3', name: 'שומרי השער',     level: 1, pos: [85, 320],  gold: 170, xp: 65,  waves: [wave(N(6, 'common', 0, 'wood_nunchaku', null, 'bamboo_bo'))], reward: 'iron_sai' },
      { id: '1-4', name: 'הסנסאי הבוגד',   level: 1, pos: [185, 235], gold: 320, xp: 130, waves: [wave(M('traitor'), N(3, 'common', 1, 'bamboo_bo', 'wood_nunchaku'))], reward: 'steel_katana', boss: true },
    ],
  },
  {
    id: 'courtyard', name: 'חצר האבן בשקיעה', arena: 'courtyard', color: '#e08a3a',
    desc: 'חצר מקדש עתיקה בהרים. שבט הצל אורב בין הסלעים.',
    stages: [
      { id: '2-1', name: 'שביל האבן',    level: 2, pos: [285, 150], gold: 220, xp: 80,  waves: [wave(N(6, 'common', 1, 'iron_sai', 'wood_nunchaku', 'shuriken_pouch'), N(1, 'rare', 1, 'bamboo_bo'))] },
      { id: '2-2', name: 'מארב בשקיעה',  level: 3, pos: [390, 115], gold: 260, xp: 95,  waves: [wave(N(5, 'rare', 1, 'iron_sai', 'shuriken_pouch'), N(2, 'common', 2, 'wood_mallet'))] },
      { id: '2-3', name: 'חומת הנזירים', level: 3, pos: [335, 255], gold: 300, xp: 110, waves: [wave(N(7, 'rare', 2, 'steel_katana', 'iron_bo', 'wood_nunchaku'))], reward: 'war_fan' },
      { id: '2-4', name: 'אדון הצללים',  level: 4, pos: [430, 355], gold: 520, xp: 200, waves: [wave(M('shadowlord'), N(5, 'rare', 2, 'iron_sai', 'kunai_set'))], reward: 'moon_katana', boss: true },
    ],
  },
  {
    id: 'desert', name: 'המדבר הבוער', arena: 'desert', color: '#e7b450',
    desc: 'המתים קמו מהחולות. שרוד את גלי הזומבים ומצא את המלך שלהם.',
    stages: [
      { id: '3-1', name: 'חול ועצמות',  level: 6, pos: [545, 445], gold: 340, xp: 125, waves: [M('zombie', 6), M('zombie', 8)] },
      { id: '3-2', name: 'הלילה החי',   level: 6, pos: [645, 390], gold: 380, xp: 140, waves: [wave(M('zombie', 6), M('zombieBrute')), wave(M('zombie', 8), M('zombieBrute', 2))] },
      { id: '3-3', name: 'המצור',       level: 7, pos: [585, 290], gold: 430, xp: 160, waves: [M('zombie', 8), wave(M('zombie', 6), M('zombieBrute', 2)), wave(M('zombie', 8), M('zombieBrute', 2))], reward: 'oni_club' },
      { id: '3-4', name: 'מלך הזומבים', level: 8, pos: [690, 205], gold: 700, xp: 260, waves: [M('zombie', 8), wave(M('zombieKing'), M('zombieBrute', 2), M('zombie', 4))], reward: 'storm_staff', boss: true },
    ],
  },
  {
    id: 'sky', name: 'מבצר השמיים', arena: 'sky', color: '#5aa8e6',
    desc: 'מבצר מרחף מעל העננים, שמור על ידי מכונת המלחמה העתיקה.',
    stages: [
      { id: '4-1', name: 'שערי העננים', level: 8,  pos: [775, 330], gold: 480, xp: 180, waves: [wave(N(8, 'rare', 5, 'steel_katana', 'iron_bo', 'war_fan', 'kunai_set'))] },
      { id: '4-2', name: 'משמר הסערה',  level: 9,  pos: [860, 250], gold: 540, xp: 200, waves: [wave(N(4, 'epic', 5, 'moon_katana', 'shadow_sai'), N(4, 'rare', 5, 'iron_bo', 'chain_nunchaku'))] },
      { id: '4-3', name: 'היכל הלהבות', level: 10, pos: [800, 160], gold: 600, xp: 220, waves: [wave(N(1, 'legendary', 6, 'demon_blade'), N(7, 'epic', 6, 'oni_club', 'storm_staff', 'moon_katana'))], reward: 'heaven_staff' },
      { id: '4-4', name: 'צב המכונה',   level: 11, pos: [910, 95],  gold: 1200, xp: 400, waves: [wave(M('turtle'), N(6, 'epic', 7, 'storm_staff', 'moon_katana', 'shadow_sai'))], reward: 'demon_blade', boss: true },
    ],
  },
];

export const ALL_STAGES = REGIONS.flatMap(r => r.stages.map(s => ({ ...s, region: r })));
export const STAGE_MAP = Object.fromEntries(ALL_STAGES.map(s => [s.id, s]));

export function nextStageId(id) {
  const i = ALL_STAGES.findIndex(s => s.id === id);
  return ALL_STAGES[i + 1]?.id ?? null;
}
