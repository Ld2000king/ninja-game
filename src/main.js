import '@fontsource/rubik/400.css';
import '@fontsource/rubik/600.css';
import '@fontsource/rubik/800.css';
import '@fontsource/bangers/400.css';
import './style.css';

import { RARITIES, RARITY_ORDER, BELTS, TRAITS } from './data/rarity.js';
import { WEAPONS, WEAPON_MAP, WEAPON_TYPES, SHOP_UNLOCK, dps, speedLabel } from './data/weapons.js';
import { REGIONS, ALL_STAGES, STAGE_MAP, nextStageId } from './data/stages.js';
import { portrait, weaponIcon } from './art/character.js';
import { drawWorldMap, arenaThumb, ARENAS } from './art/arenas.js';
import { TownScene } from './art/town.js';
import { Battle, SPELLS } from './game/battle.js';
import { ninjaSpec, ninjaStats, power, stageWaves, stagePower } from './game/stats.js';
import {
  save, persist, resetSave, xpForLevel, addXp, squadSize, getNinja, getItem, weaponOf, statsOf, powerOf, ownerOf, inSquad,
  toggleSquad, autoSquad, equip, beltStatus, promote, releaseNinja, releaseMany, releaseValue, renameNinja, buyWeapon, grantWeapon, sellPrice, sellItem,
  isUnlocked, summon, SUMMON_COST, SUMMON10_COST, MAX_ROSTER,
} from './game/save.js';
import { MODES, getModePref, setModePref, detectMode, activeMode, applyMode } from './game/device.js';
import { registerServiceWorker, canInstall, promptInstall, onInstallChange, isStandalone, isIOS } from './pwa.js';

applyMode();
registerServiceWorker();

const app = document.getElementById('app');
app.innerHTML = `
  <header class="topbar">
    <div class="logo">NINJA <span>WARS</span></div>
    <nav class="nav">
      <button data-nav="town"><i>🏘️</i><span>העיר</span></button>
      <button data-nav="dojo"><i>🥋</i><span>דוג׳ו</span></button>
      <button data-nav="shop"><i>🏪</i><span>חנות</span></button>
      <button data-nav="summon"><i>⛩️</i><span>זימון</span></button>
      <button data-nav="map"><i>🎈</i><span>מפת קרבות</span></button>
    </nav>
    <div class="stats">
      <div class="lvl"><b id="st-level"></b><div class="xpbar"><i id="st-xp"></i></div></div>
      <div class="gold">🪙 <b id="st-gold"></b></div>
      <button class="icon-btn" id="settings-btn" title="הגדרות">⚙️</button>
    </div>
  </header>
  <main id="screen"></main>
  <div id="modal-root"></div>
  <div id="toast"></div>
`;

const screenEl = document.getElementById('screen');
const modalRoot = document.getElementById('modal-root');
let current = 'town';
let battle = null;
let town = null;
let selectedStage = null;
let dojoFilter = 'all';
let dojoPick = null; // Set of picked ninja uids while bulk-delete mode is on
let shopTab = 'buy';

// ───────────────────────── helpers
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const specOf = (n) => ninjaSpec(n, weaponOf(n));
const squadNinjas = () => save.squad.map(getNinja).filter(Boolean);
const squadPower = () => squadNinjas().reduce((a, n) => a + powerOf(n), 0);
const beltChip = (b) => `<span class="belt-chip" style="--bc:${BELTS[b].color}" title="חגורה ${BELTS[b].name}"><i></i>${BELTS[b].name}</span>`;

function refreshStats() {
  document.getElementById('st-level').textContent = `רמה ${save.level}`;
  document.getElementById('st-xp').style.width = `${(save.xp / xpForLevel(save.level)) * 100}%`;
  document.getElementById('st-gold').textContent = fmt(save.gold);
  document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === current));
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2400);
}

function openModal(html, cls = '') {
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal ${cls}">${html}</div></div>`;
  const bd = modalRoot.firstElementChild;
  const sticky = cls.includes('result-modal') || cls.includes('sticky');
  bd.addEventListener('click', (e) => { if ((e.target === bd && !sticky) || e.target.closest('[data-close]')) closeModal(); });
  return bd.firstElementChild;
}
function closeModal() { modalRoot.innerHTML = ''; }

function ninjaCard(n, opts = {}) {
  const r = RARITIES[n.rarity];
  const w = weaponOf(n);
  return `
    <div class="card r-${n.rarity} ${opts.cls || ''} ${opts.pick != null ? 'pickable' : ''} ${opts.pick ? 'picked' : ''}" data-ninja="${n.uid}" style="--rc:${r.color};--rd:${r.dark}">
      ${opts.pick != null ? `<i class="pick-mark">✓</i><button class="card-info" data-info="${n.uid}" title="פרטים">i</button>` : ''}
      <div class="card-art"><img src="${portrait(specOf(n), 120)}" alt=""></div>
      ${w ? `<img class="card-weapon" src="${weaponIcon(w, 40)}" alt="" title="${w.name}">` : ''}
      <div class="card-name">${n.name}</div>
      <div class="card-meta"><span class="rar">${r.name}</span><span>⚡${fmt(powerOf(n))}</span></div>
      <div class="card-belt" style="--bc:${BELTS[n.belt].color}" title="חגורה ${BELTS[n.belt].name}"></div>
      ${opts.badge ? `<div class="card-badge">${opts.badge}</div>` : inSquad(n.uid) && !opts.noSquadMark ? '<div class="card-badge squad">בחוליה</div>' : ''}
    </div>`;
}

function weaponCard(w, actions = '', extra = '') {
  const r = RARITIES[w.rarity];
  const ab = WEAPON_TYPES[w.type].ability;
  return `
    <div class="wcard r-${w.rarity}" style="--rc:${r.color};--rd:${r.dark}">
      <div class="wcard-top">
        <img src="${weaponIcon(w, 96)}" alt="">
        <div>
          <b>${w.name}</b>
          <div class="row gap tiny-gap"><span class="rar-chip">${r.name}</span><span class="muted">${WEAPON_TYPES[w.type].name}</span></div>
        </div>
      </div>
      <div class="wstats">
        <span>DPS <b>${dps(w).toFixed(1)}</b></span>
        <span>נזק <b>+${w.atk}</b></span>
        <span>מהירות <b>${speedLabel(w.aspd)}</b></span>
        ${w.crit ? `<span>קריטי <b>+${Math.round(w.crit * 100)}%</b></span>` : ''}
        ${w.hp ? `<span>חיים <b>+${w.hp}</b></span>` : ''}
      </div>
      ${ab ? `<div class="wability"><b>✦ ${ab.name}</b> – ${ab.desc}</div>` : ''}
      <p class="wdesc">${w.desc}</p>
      ${extra}
      <div class="row gap">${actions}</div>
    </div>`;
}

function go(name, arg) {
  if (battle) { battle.destroy(); battle = null; }
  if (town) { town.destroy(); town = null; }
  if (current === 'battle' && name !== 'battle') try { screen.orientation?.unlock?.(); } catch { /* unsupported */ }
  if (name !== current) dojoPick = null;
  current = name;
  document.body.classList.toggle('in-battle', name === 'battle');
  closeModal();
  ({ town: renderTown, dojo: renderDojo, shop: renderShop, summon: renderSummon, map: renderMap, battle: renderBattle })[name](arg);
  refreshStats();
  window.scrollTo(0, 0);
  screenEl.scrollTop = 0;
}
const rerender = () => go(current);

document.querySelector('.nav').addEventListener('click', (e) => {
  const b = e.target.closest('[data-nav]');
  if (b) go(b.dataset.nav);
});

document.getElementById('settings-btn').addEventListener('click', () => {
  const m = openModal(`
    <button class="close" data-close>✕</button>
    <h2>הגדרות</h2>
    <p class="muted">ההתקדמות נשמרת אוטומטית בדפדפן במכשיר שלך.</p>
    <div class="col">
      <div class="col tiny-gap">מצב משחק
        ${modeButtons()}
      </div>
      ${installBlock()}
      <label class="col tiny-gap">שם העיר שלך
        <div class="row gap"><input id="town-name" value="${save.town}" maxlength="22"><button class="btn small" id="save-name">שמור</button></div>
      </label>
      <button class="btn" id="dev-gold">🧪 מצב בדיקה: קבל 10,000 זהב</button>
      <button class="btn" id="dev-weapons">🧪 מצב בדיקה: קבל אחד מכל נשק</button>
      <button class="btn" id="dev-xp">🧪 מצב בדיקה: +500 ניסיון לכל הנינג׳ות</button>
      <button class="btn danger" id="reset">🗑️ איפוס כל ההתקדמות</button>
    </div>`, 'small');
  bindModeButtons(m, () => { afterModeChange(); toast(`מצב ${MODES[getModePref()].name} הופעל`); });
  bindInstall(m);
  m.querySelector('#save-name').onclick = () => { save.town = m.querySelector('#town-name').value.trim() || save.town; persist(); toast('השם נשמר'); if (current === 'town') rerender(); };
  m.querySelector('#dev-gold').onclick = () => { save.gold += 10000; persist(); refreshStats(); toast('+10,000 זהב'); };
  m.querySelector('#dev-weapons').onclick = () => { WEAPONS.forEach(w => grantWeapon(w.id)); persist(); toast('נוספו כל הנשקים למחסן'); };
  m.querySelector('#dev-xp').onclick = () => { save.ninjas.forEach(n => n.xp += 500); persist(); toast('+500 ניסיון לכל נינג׳ה'); };
  m.querySelector('#reset').onclick = () => {
    if (confirm('בטוח? כל ההתקדמות תימחק.')) { resetSave(); go('town'); toast('ההתקדמות אופסה'); }
  };
});

// ───────────────────────── PLAY MODE & INSTALL
function modeButtons() {
  const pref = getModePref() || 'auto';
  return `<div class="mode-pick">${Object.entries(MODES).map(([id, m]) => `
    <button class="mode-opt ${id === pref ? 'on' : ''}" data-mode="${id}">
      <i>${m.icon}</i><b>${m.name}</b><small>${id === 'auto' ? `${m.desc} (כרגע: ${MODES[detectMode()].name})` : m.desc}</small>
    </button>`).join('')}</div>`;
}
function bindModeButtons(root, after) {
  root.querySelector('.mode-pick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    setModePref(b.dataset.mode);
    after?.();
  });
}

// A running battle keeps going; its canvases just re-measure for the new layout.
function afterModeChange() {
  closeModal();
  if (current === 'battle') window.dispatchEvent(new Event('resize'));
  else rerender();
}

function installBlock() {
  if (isStandalone()) return '<p class="muted tiny">✅ המשחק מותקן כאפליקציה.</p>';
  if (canInstall()) return '<button class="btn primary" id="install-app">📲 התקן כאפליקציה</button>';
  if (isIOS()) return '<p class="install-tip">📲 להתקנה כאפליקציה: לחץ על <b>שיתוף</b> <span dir="ltr">⬆️</span> ואז <b>״הוסף למסך הבית״</b>.</p>';
  return '';
}
function bindInstall(root) {
  root.querySelector('#install-app')?.addEventListener('click', async () => {
    if (await promptInstall()) toast('🎉 המשחק הותקן!');
  });
}

function openModeChooser() {
  const m = openModal(`
    <div class="mode-chooser">
      <div class="logo big">NINJA <span>WARS</span></div>
      <h2>איך תרצה לשחק?</h2>
      <p class="muted">אפשר לשנות את זה בכל רגע בהגדרות ⚙️</p>
      ${modeButtons()}
      ${installBlock()}
    </div>`, 'small sticky');
  bindModeButtons(m, afterModeChange);
  bindInstall(m);
}

// Show the install button in the top bar once the browser says the game can be installed.
const installBtn = document.createElement('button');
installBtn.className = 'icon-btn install-btn';
installBtn.title = 'התקן כאפליקציה';
installBtn.textContent = '📲';
installBtn.onclick = async () => { if (await promptInstall()) toast('🎉 המשחק הותקן!'); };
document.querySelector('.stats').prepend(installBtn);
const syncInstall = () => { installBtn.hidden = !canInstall(); };
onInstallChange(syncInstall);
syncInstall();

// ───────────────────────── TOWN
function renderTown() {
  screenEl.innerHTML = `
    <div class="town-screen">
      <div class="town-wrap"><canvas id="town-canvas"></canvas></div>
      <div class="town-info">
        <div class="panel mini-panel"><b>🥷 ${save.ninjas.length}</b><small>נינג׳ות בדוג׳ו</small></div>
        <div class="panel mini-panel"><b>⚔️ ${save.squad.length}/${squadSize()}</b><small>בחוליה</small></div>
        <div class="panel mini-panel"><b>⚡ ${fmt(squadPower())}</b><small>כוח החוליה</small></div>
        <div class="panel mini-panel"><b>🗡️ ${save.items.length}</b><small>נשקים במחסן</small></div>
        <div class="panel mini-panel"><b>⭐ ${Object.values(save.progress).reduce((a, b) => a + b, 0)}/${ALL_STAGES.length * 3}</b><small>כוכבים</small></div>
      </div>
      <p class="hint">לחץ על בניין כדי להיכנס אליו. המגרשים עם 🚧 ייפתחו בקרוב.</p>
    </div>`;
  town = new TownScene(document.getElementById('town-canvas'), {
    looks: squadNinjas().map(n => specOf(n).look),
    townName: save.town,
    onEnter: (id, b) => {
      if (b?.soon) return toast(`🚧 ${b.label} – בקרוב! ${b.soon}`);
      go({ shrine: 'summon', dojo: 'dojo', shop: 'shop', balloon: 'map' }[id]);
    },
  });
}

// ───────────────────────── BULK SELL (dojo + summon results)
/**
 * Lets the player tap ninja cards to pick them, then sell them all at once.
 * pick: Set of uids, pool(): ninjas the quick-select chips work on, render(): redraws the cards.
 */
function bindPicker(root, { pick, pool, render, onSold, squadChip = false }) {
  const bar = root.querySelector('.pick-bar');
  const drawBar = () => {
    const list = [...pick].map(getNinja).filter(Boolean);
    const gold = list.reduce((a, n) => a + releaseValue(n), 0);
    bar.innerHTML = `
      <span class="pick-sum">נבחרו <b>${list.length}</b> · 🪙 <b>${fmt(gold)}</b></span>
      <div class="pick-quick">
        <button data-pick="all">הכל</button>
        ${squadChip ? '<button data-pick="free">מחוץ לחוליה</button>' : ''}
        <button data-pick="common">נפוצים</button>
        <button data-pick="none">נקה</button>
      </div>
      <button class="btn small danger" data-pick="sell" ${list.length ? '' : 'disabled'}>💰 מכור ${list.length || ''}</button>`;
  };
  const update = () => {
    root.querySelectorAll('.card.pickable').forEach(c => c.classList.toggle('picked', pick.has(c.dataset.ninja)));
    drawBar();
  };
  root.addEventListener('click', (e) => {
    const info = e.target.closest('[data-info]');
    if (info) return openNinja(info.dataset.info);
    const q = e.target.closest('[data-pick]');
    if (q) {
      const k = q.dataset.pick;
      if (k === 'sell') return sellPicked();
      if (k === 'none') pick.clear();
      else pool().filter(n => k === 'all' || (k === 'free' && !inSquad(n.uid)) || (k === 'common' && n.rarity === 'common' && !inSquad(n.uid))).forEach(n => pick.add(n.uid));
      return update();
    }
    const c = e.target.closest('.card.pickable');
    if (c) { pick.has(c.dataset.ninja) ? pick.delete(c.dataset.ninja) : pick.add(c.dataset.ninja); update(); }
  });
  function sellPicked() {
    const list = [...pick].map(getNinja).filter(Boolean);
    if (!list.length) return;
    if (list.length >= save.ninjas.length) return toast('חייב להשאיר לפחות נינג׳ה אחד בדוג׳ו');
    const gold = list.reduce((a, n) => a + releaseValue(n), 0);
    const squad = list.filter(n => inSquad(n.uid)).length;
    const belted = list.filter(n => n.belt > 0).length;
    const rare = list.filter(n => RARITIES[n.rarity].order >= 2).length;
    const notes = [squad && `${squad} בחוליה`, belted && `${belted} עם חגורה`, rare && `${rare} אפיים/אגדיים`].filter(Boolean);
    if (!confirm(`למכור ${list.length} נינג׳ות תמורת ${fmt(gold)} זהב?${notes.length ? `\nשים לב: ${notes.join(', ')}.` : ''}\nהנשקים שלהם יחזרו למחסן.`)) return;
    const res = releaseMany(list.map(n => n.uid));
    pick.clear();
    toast(`💰 נמכרו ${res.count} נינג׳ות · +${fmt(res.gold)} זהב`);
    refreshStats();
    onSold?.();
  }
  render?.();
  update();
  return update;
}

// ───────────────────────── DOJO
function renderDojo() {
  const size = squadSize();
  const list = save.ninjas
    .filter(n => dojoFilter === 'all' || n.rarity === dojoFilter)
    .sort((a, b) => (inSquad(b.uid) - inSquad(a.uid)) || powerOf(b) - powerOf(a));
  const ready = save.ninjas.filter(n => { const s = beltStatus(n); return !s.max && s.xpOk; }).length;
  screenEl.innerHTML = `
    <div class="dojo-screen">
      <section class="panel squad-panel">
        <div class="row between">
          <h2>🥋 החוליה לקרב <small>${save.squad.length}/${size}</small></h2>
          <div class="row gap">
            <span class="pill">⚡ כוח: <b>${fmt(squadPower())}</b></span>
            <button class="btn small" id="auto">✨ החזקים ביותר</button>
            <button class="btn small ghost" id="clear">ניקוי</button>
          </div>
        </div>
        <div class="squad-slots">
          ${Array.from({ length: 10 }, (_, i) => {
            if (i >= size) return `<div class="slot locked" title="נפתח ברמה ${3 + (i - 5) * 2}">🔒<small>רמה ${3 + (i - 5) * 2}</small></div>`;
            const n = getNinja(save.squad[i]);
            if (!n) return `<div class="slot empty">+</div>`;
            return `<div class="slot filled r-${n.rarity}" data-ninja="${n.uid}" style="--rc:${RARITIES[n.rarity].color}">
              <img src="${portrait(specOf(n), 72)}" alt=""><small>${n.name}</small><i class="slot-belt" style="--bc:${BELTS[n.belt].color}"></i></div>`;
          }).join('')}
        </div>
        <p class="muted tiny">לחץ על נינג׳ה כדי לשדרג חגורה, להחליף נשק או להוציא/להכניס לחוליה. גודל החוליה גדל עם רמת השחקן.</p>
      </section>
      <section class="panel roster-panel">
        <div class="row between">
          <h2>הנינג׳ות שלך <small>${save.ninjas.length}/${MAX_ROSTER}</small> ${ready ? `<span class="ready-pill">🥋 ${ready} מוכנים למבחן חגורה</span>` : ''}</h2>
          <button class="btn small ${dojoPick ? 'primary' : ''}" id="multi">${dojoPick ? '✓ סיום מחיקה' : '🗑️ מחיקה מרובה'}</button>
          <div class="filters">
            <button data-f="all" class="${dojoFilter === 'all' ? 'on' : ''}">הכל</button>
            ${RARITY_ORDER.map(r => `<button data-f="${r}" class="${dojoFilter === r ? 'on' : ''}" style="--rc:${RARITIES[r].color}">${RARITIES[r].name}</button>`).join('')}
          </div>
        </div>
        ${dojoPick ? '<div class="pick-bar"></div><p class="muted tiny">לחץ על נינג׳ות כדי לבחור אותן למחיקה. מקבלים זהב על כל נינג׳ה, והנשקים שלהם חוזרים למחסן.</p>' : ''}
        <div class="grid">${list.map(n => ninjaCard(n, dojoPick ? { pick: dojoPick.has(n.uid) } : {})).join('') || '<p class="muted">אין נינג׳ות בקטגוריה הזו.</p>'}</div>
      </section>
    </div>`;
  screenEl.querySelector('#auto').onclick = () => { autoSquad(); renderDojo(); };
  screenEl.querySelector('#clear').onclick = () => { save.squad = []; persist(); renderDojo(); };
  screenEl.querySelector('.filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (b) { dojoFilter = b.dataset.f; renderDojo(); }
  });
  screenEl.querySelector('#multi').onclick = () => { dojoPick = dojoPick ? null : new Set(); renderDojo(); };
  if (dojoPick) {
    bindPicker(screenEl.querySelector('.roster-panel'), {
      pick: dojoPick, squadChip: true,
      pool: () => list,
      onSold: () => { dojoPick = null; renderDojo(); },
    });
  }
  screenEl.querySelector('.dojo-screen').addEventListener('click', (e) => {
    if (dojoPick && e.target.closest('.roster-panel')) return; // handled by the picker
    const c = e.target.closest('[data-ninja]');
    if (c) openNinja(c.dataset.ninja);
  });
}

const STAT_ROWS = [['hp', '❤️ חיים'], ['atk', '⚔️ נזק'], ['aspd', '💨 מהירות'], ['crit', '🎯 קריטי', true], ['armor', '🛡️ שריון', true]];

function openNinja(uid) {
  const n = getNinja(uid);
  if (!n) return;
  const r = RARITIES[n.rarity];
  const w = weaponOf(n);
  const st = statsOf(n);
  const bare = ninjaStats(n, null);
  const bs = beltStatus(n);
  const trait = TRAITS[n.trait];
  const ab = w && WEAPON_TYPES[w.type].ability;
  const fmtStat = (k, v, pct) => pct ? Math.round(v * 100) + '%' : k === 'aspd' ? v.toFixed(2) : fmt(v);
  const m = openModal(`
    <button class="close" data-close>✕</button>
    <div class="nd r-${n.rarity}" style="--rc:${r.color};--rd:${r.dark}">
      <div class="nd-info">
        <div class="nd-head">
          <h2>${n.name}</h2><button class="icon-btn small" id="rename" title="שנה שם">✏️</button>
        </div>
        <span class="pill nd-trait">✦ <b>${trait.name}</b> ${trait.desc}</span>

        <div class="nd-stats">
          ${STAT_ROWS.map(([k, label, pct]) => {
            const diff = st[k] - bare[k];
            return `<div><span>${label}</span><b>${fmtStat(k, st[k], pct)}</b><em>${w && Math.abs(diff) > 0.001 ? `${diff > 0 ? '+' : ''}${fmtStat(k, diff, pct)} 🗡️` : ''}</em></div>`;
          }).join('')}
        </div>

        <div class="nd-block">
          <div class="belt-ladder">
            ${BELTS.map((b, i) => `<div class="${i <= n.belt ? 'got' : ''} ${i === n.belt ? 'cur' : ''}" style="--bc:${b.color}" title="${b.name} – ×${b.mult}"><i></i><small>${b.name}</small></div>`).join('')}
          </div>
          ${bs.max ? '<p class="muted tiny nd-max">🏆 חגורה שחורה – הדרגה הגבוהה ביותר!</p>' : `
          <div class="belt-next">
            <div class="col tiny-gap grow">
              <small>ניסיון למבחן חגורה ${bs.next.name}: <b>${fmt(Math.min(n.xp, bs.next.xp))}/${fmt(bs.next.xp)}</b></small>
              <div class="bar"><i style="width:${Math.min(100, (n.xp / bs.next.xp) * 100)}%"></i></div>
            </div>
            <button class="btn small ${bs.xpOk && bs.goldOk ? 'primary' : ''}" id="promote" ${bs.xpOk && bs.goldOk ? '' : 'disabled'}
              title="חיים ונזק בסיס ×${bs.next.mult} (כרגע ×${BELTS[n.belt].mult})">🥋 מבחן ×${bs.next.mult} · 🪙 ${fmt(bs.next.cost)}</button>
          </div>`}
        </div>

        <div class="nd-block equip-row">
          ${w ? `<img src="${weaponIcon(w, 64)}" alt=""><div class="grow"><b>${w.name}</b>
            <small class="muted">${RARITIES[w.rarity].name} · DPS ${dps(w).toFixed(1)} · ${speedLabel(w.aspd)}</small>
            ${ab ? `<small class="nd-ability" title="${ab.desc}">✦ ${ab.name} – ${ab.desc}</small>` : ''}</div>`
          : `<div class="grow muted">🤜 ידיים חשופות – בלי נשק ובלי יכולת מיוחדת.</div>`}
          <div class="col tiny-gap">
            <button class="btn small primary" id="change-w">🔄 ${w ? 'החלף' : 'צייד'}</button>
            ${w ? '<button class="btn small ghost" id="remove-w">הסר</button>' : ''}
          </div>
        </div>
      </div>

      <div class="nd-side">
        <div class="nd-art">
          <img src="${portrait(specOf(n), 240)}" alt="">
          <div class="nd-rarity">${r.name}</div>
          <div class="nd-belt" style="--bc:${BELTS[n.belt].color};color:${n.belt <= 2 ? '#3b200c' : '#fff'}">חגורה ${BELTS[n.belt].name}</div>
        </div>
        <div class="nd-power">⚡ כוח <b>${fmt(power(st))}</b></div>
        <button class="btn small ${inSquad(uid) ? 'ghost' : 'primary'}" id="squad">${inSquad(uid) ? '➖ הוצא מהחוליה' : '➕ הכנס לחוליה'}</button>
        <button class="btn small danger" id="release">🗑️ מכור · 🪙 ${fmt(releaseValue(n))}</button>
      </div>
    </div>`, 'wide nd-modal');
  const refresh = () => { refreshStats(); if (current === 'dojo') renderDojo(); openNinja(uid); };
  m.querySelector('#rename').onclick = () => { const nm = prompt('שם חדש לנינג׳ה:', n.name); if (nm) { renameNinja(uid, nm); refresh(); } };
  m.querySelector('#promote')?.addEventListener('click', () => {
    if (promote(uid)) { toast(`🎉 ${n.name} קיבל/ה חגורה ${BELTS[n.belt].name}!`); refresh(); }
  });
  m.querySelector('#change-w').onclick = () => openWeaponPicker(uid);
  m.querySelector('#remove-w')?.addEventListener('click', () => { equip(uid, null); refresh(); });
  m.querySelector('#squad').onclick = () => { const err = toggleSquad(uid); if (err) return toast(err); refresh(); };
  m.querySelector('#release').onclick = () => {
    if (save.ninjas.length <= 1) return toast('אי אפשר למכור את הנינג׳ה האחרון');
    if (!confirm(`למכור את ${n.name} תמורת ${fmt(releaseValue(n))} זהב? הנשק שלו יחזור למחסן.`)) return;
    const g = releaseNinja(uid);
    toast(`${n.name} נמכר/ה. +${fmt(g)} זהב`);
    document.querySelector(`.summon-box [data-ninja="${uid}"]`)?.closest('.flip')?.remove();
    closeModal(); refreshStats(); if (current === 'dojo') renderDojo();
  };
}

function openWeaponPicker(uid) {
  const n = getNinja(uid);
  const base = powerOf(n);
  const items = [...save.items].sort((a, b) => dps(WEAPON_MAP[b.wid]) - dps(WEAPON_MAP[a.wid]));
  const m = openModal(`
    <button class="close" data-close>✕</button>
    <h2>בחר נשק ל${n.name}</h2>
    ${items.length ? `<div class="picker">
      ${items.map(it => {
        const w = WEAPON_MAP[it.wid];
        const owner = ownerOf(it.uid);
        const p = power(ninjaStats(n, w));
        const delta = p - base;
        return `<button class="pick-row r-${w.rarity} ${owner?.uid === uid ? 'on' : ''}" data-item="${it.uid}" style="--rc:${RARITIES[w.rarity].color}">
          <img src="${weaponIcon(w, 56)}" alt="">
          <span class="grow"><b>${w.name}</b><small>${RARITIES[w.rarity].name} · DPS ${dps(w).toFixed(1)} · ${WEAPON_TYPES[w.type].ability?.name || ''}</small>
          ${owner && owner.uid !== uid ? `<small class="warn">מוחזק ע״י ${owner.name}</small>` : ''}</span>
          <span class="delta ${delta >= 0 ? 'up' : 'down'}">${owner?.uid === uid ? 'מצויד' : `⚡ ${delta >= 0 ? '+' : ''}${fmt(delta)}`}</span>
        </button>`;
      }).join('')}
    </div>` : '<p class="muted">המחסן ריק. קנה נשקים בחנות!</p>'}
    <div class="row gap center"><button class="btn" id="to-shop">🏪 לחנות הנשקים</button></div>`, 'small');
  m.querySelector('#to-shop').onclick = () => go('shop');
  m.querySelector('.picker')?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-item]');
    if (!b) return;
    equip(uid, b.dataset.item);
    toast(`${n.name} מצויד/ת ב${WEAPON_MAP[getItem(b.dataset.item).wid].name}`);
    if (current === 'dojo') renderDojo();
    if (current === 'shop') renderShop();
    openNinja(uid);
  });
}

// ───────────────────────── SHOP
function renderShop() {
  screenEl.innerHTML = `
    <div class="shop-screen">
      <section class="panel">
        <div class="row between">
          <h2>🏪 חנות הנשקים</h2>
          <div class="filters tabs">
            <button data-tab="buy" class="${shopTab === 'buy' ? 'on' : ''}">🛒 קנייה</button>
            <button data-tab="inv" class="${shopTab === 'inv' ? 'on' : ''}">📦 המחסן שלי (${save.items.length})</button>
          </div>
        </div>
        <p class="muted">כל נשק מוסיף נזק ומהירות, ולכל סוג נשק יש יכולת מיוחדת שמופעלת בתוך ענן הקרב. נשקים חזקים יותר נפתחים ככל שהרמה שלך עולה.</p>
        <div id="shop-body"></div>
      </section>
    </div>`;
  screenEl.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) { shopTab = b.dataset.tab; renderShop(); }
  });
  const body = document.getElementById('shop-body');
  if (shopTab === 'buy') {
    body.innerHTML = RARITY_ORDER.map(r => {
      const locked = save.level < SHOP_UNLOCK[r];
      return `<h3 class="shop-tier" style="--rc:${RARITIES[r].color}">${RARITIES[r].name} ${locked ? `<small>🔒 נפתח ברמה ${SHOP_UNLOCK[r]}</small>` : ''}</h3>
        <div class="wgrid ${locked ? 'locked' : ''}">${WEAPONS.filter(w => w.rarity === r).map(w => {
          const owned = save.items.filter(i => i.wid === w.id).length;
          return weaponCard(w, locked ? '' : `<button class="btn primary small" data-buy="${w.id}" ${save.gold < w.price ? 'disabled' : ''}>קנה 🪙 ${fmt(w.price)}</button>`,
            owned ? `<small class="owned">במחסן: ${owned}</small>` : '');
        }).join('')}</div>`;
    }).join('');
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-buy]');
      if (!b) return;
      const item = buyWeapon(b.dataset.buy);
      if (!item) return toast('אין מספיק זהב');
      toast(`קנית ${WEAPON_MAP[item.wid].name}! צייד אותו לנינג׳ה בדוג׳ו או כאן במחסן.`);
      refreshStats(); renderShop();
    });
  } else {
    const items = [...save.items].sort((a, b) => RARITIES[WEAPON_MAP[b.wid].rarity].order - RARITIES[WEAPON_MAP[a.wid].rarity].order);
    body.innerHTML = items.length ? `<div class="wgrid">${items.map(it => {
      const w = WEAPON_MAP[it.wid];
      const owner = ownerOf(it.uid);
      return weaponCard(w,
        `<button class="btn small primary" data-equip="${it.uid}">🥷 צייד נינג׳ה</button>
         <button class="btn small danger" data-sell="${it.uid}">מכור 🪙 ${fmt(sellPrice(it.wid))}</button>`,
        `<small class="owned">${owner ? `מוחזק ע״י <b>${owner.name}</b>` : 'פנוי'}</small>`);
    }).join('')}</div>` : '<p class="muted">המחסן ריק.</p>';
    body.addEventListener('click', (e) => {
      const s = e.target.closest('[data-sell]');
      if (s) {
        const it = getItem(s.dataset.sell);
        const owner = ownerOf(it.uid);
        if (owner && !confirm(`${owner.name} מחזיק/ה בנשק הזה. למכור בכל זאת?`)) return;
        toast(`נמכר! +${fmt(sellItem(it.uid))} זהב`);
        refreshStats(); renderShop();
      }
      const q = e.target.closest('[data-equip]');
      if (q) openNinjaPicker(q.dataset.equip);
    });
  }
}

function openNinjaPicker(itemUid) {
  const w = WEAPON_MAP[getItem(itemUid).wid];
  const list = [...save.ninjas].sort((a, b) => (inSquad(b.uid) - inSquad(a.uid)) || powerOf(b) - powerOf(a));
  const m = openModal(`
    <button class="close" data-close>✕</button>
    <h2>מי יחזיק את ${w.name}?</h2>
    <div class="picker">
      ${list.map(n => {
        const cur = weaponOf(n);
        const delta = power(ninjaStats(n, w)) - powerOf(n);
        return `<button class="pick-row r-${n.rarity}" data-n="${n.uid}" style="--rc:${RARITIES[n.rarity].color}">
          <img src="${portrait(specOf(n), 56)}" alt="">
          <span class="grow"><b>${n.name}</b> ${inSquad(n.uid) ? '<small class="pill">בחוליה</small>' : ''}<small>${RARITIES[n.rarity].name} · חגורה ${BELTS[n.belt].name} · ${cur ? cur.name : 'בלי נשק'}</small></span>
          <span class="delta ${delta >= 0 ? 'up' : 'down'}">⚡ ${delta >= 0 ? '+' : ''}${fmt(delta)}</span>
        </button>`;
      }).join('')}
    </div>`, 'small');
  m.querySelector('.picker').addEventListener('click', (e) => {
    const b = e.target.closest('[data-n]');
    if (!b) return;
    equip(b.dataset.n, itemUid);
    toast(`${getNinja(b.dataset.n).name} מצויד/ת ב${w.name}`);
    closeModal(); renderShop();
  });
}

// ───────────────────────── SUMMON
function renderSummon() {
  screenEl.innerHTML = `
    <div class="summon-screen">
      <section class="panel shrine">
        <div class="torii"><div class="t-top"></div><div class="t-beam"></div><div class="t-l"></div><div class="t-r"></div><div class="orb"></div></div>
        <h2>מקדש הזימון</h2>
        <p class="muted">הקרב זהב וזמן נינג׳ה חדש לדוג׳ו. כל נינג׳ה נולד עם חיים, כוח ותכונה משלו – ככל שהנדירות גבוהה יותר, הנתונים חזקים יותר. אין כאן כסף אמיתי, רק זהב מהמשחק.</p>
        <div class="row gap center">
          <button class="btn primary big" id="s1">זימון ×1<small>🪙 ${fmt(SUMMON_COST)}</small></button>
          <button class="btn primary big gold" id="s10">זימון ×10<small>🪙 ${fmt(SUMMON10_COST)}</small></button>
        </div>
        <div class="rates">
          ${RARITY_ORDER.map(r => `<div style="--rc:${RARITIES[r].color}"><i></i>${RARITIES[r].name}<b>${RARITIES[r].weight}%</b><small>❤️ ${RARITIES[r].hp.join('-')}<br>⚔️ ${RARITIES[r].atk.join('-')}</small></div>`).join('')}
        </div>
        <p class="muted tiny">בדוג׳ו יש מקום ל-${MAX_ROSTER} נינג׳ות. אפשר לשחרר נינג׳ה תמורת זהב.</p>
      </section>
      <section class="panel summon-results" id="results">
        <h2>תוצאות</h2>
        <p class="muted">הנינג׳ות שתזמן יופיעו כאן.</p>
      </section>
    </div>`;
  const doSummon = (count, cost) => {
    if (save.ninjas.length + count > MAX_ROSTER) return toast(`אין מקום בדוג׳ו (מקסימום ${MAX_ROSTER}). שחרר נינג׳ות קודם.`);
    if (save.gold < cost) return toast('אין מספיק זהב – נצח בקרבות כדי להרוויח עוד');
    save.gold -= cost;
    const res = Array.from({ length: count }, () => summon());
    persist(); refreshStats();
    showSummonResults(res);
    const best = res.reduce((a, b) => RARITIES[b.rarity].order > RARITIES[a.rarity].order ? b : a);
    if (best.rarity === 'legendary') toast(`✨ אגדי! ${best.name} הצטרף לדוג׳ו ✨`);
  };
  screenEl.querySelector('#s1').onclick = () => doSummon(1, SUMMON_COST);
  screenEl.querySelector('#s10').onclick = () => doSummon(10, SUMMON10_COST);
}

// Summon results: every new ninja can be picked and sold on the spot.
function showSummonResults(res) {
  const el = document.getElementById('results');
  const pick = new Set();
  const left = () => res.filter(n => getNinja(n.uid));
  el.innerHTML = `
    <div class="row between"><h2>תוצאות</h2><small class="muted">לא צריך מישהו? בחר ומכור אותו מיד.</small></div>
    <div class="summon-box"><div class="pick-bar"></div><div class="grid reveal"></div></div>`;
  const box = el.querySelector('.summon-box');
  const grid = box.querySelector('.grid');
  let first = true;
  const render = () => {
    const list = left();
    grid.classList.toggle('reveal', first);
    grid.innerHTML = list.map((n, i) =>
      `<div class="flip" style="animation-delay:${i * 0.12}s">${ninjaCard(n, { badge: TRAITS[n.trait].name, pick: pick.has(n.uid) })}
        <div class="born"><span>❤️ ${n.base.hp}</span><span>⚔️ ${n.base.atk}</span></div></div>`).join('')
      || '<p class="muted">כל הנינג׳ות מהזימון הזה נמכרו.</p>';
    box.querySelector('.pick-bar').hidden = !list.length;
    first = false;
  };
  const update = bindPicker(box, { pick, pool: left, render, onSold: () => { render(); update(); } });
}

// ───────────────────────── MAP
function renderMap() {
  if (!selectedStage || !isUnlocked(selectedStage)) {
    selectedStage = (ALL_STAGES.find(s => isUnlocked(s.id) && !save.progress[s.id]) || ALL_STAGES[ALL_STAGES.length - 1]).id;
  }
  screenEl.innerHTML = `
    <div class="map-screen">
      <div class="panel map-panel">
        <div class="map-wrap">
          <canvas id="worldmap"></canvas>
          ${ALL_STAGES.map(s => {
            const unlocked = isUnlocked(s.id);
            const stars = save.progress[s.id] || 0;
            return `<button class="node ${unlocked ? '' : 'locked'} ${stars ? 'cleared' : ''} ${s.boss ? 'boss' : ''} ${s.id === selectedStage ? 'sel' : ''}"
              data-stage="${s.id}" style="left:${s.pos[0] / 10}%;top:${s.pos[1] / 5.6}%;--c:${s.region.color}">
              <span>${unlocked ? (s.boss ? '💀' : s.id.split('-')[1]) : '🔒'}</span>
              ${stars ? `<em>${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</em>` : ''}
            </button>`;
          }).join('')}
          <div class="map-balloon">🎈</div>
        </div>
      </div>
      <aside class="panel stage-panel" id="stage-panel"></aside>
    </div>`;
  drawWorldMap(document.getElementById('worldmap'), REGIONS);
  const sel = STAGE_MAP[selectedStage];
  const bl = screenEl.querySelector('.map-balloon');
  bl.style.left = `${sel.pos[0] / 10}%`; bl.style.top = `${sel.pos[1] / 5.6}%`;
  screenEl.querySelector('.map-wrap').addEventListener('click', (e) => {
    const n = e.target.closest('[data-stage]');
    if (!n) return;
    if (!isUnlocked(n.dataset.stage)) return toast('נצח בשלב הקודם כדי לפתוח את השלב הזה');
    selectedStage = n.dataset.stage;
    screenEl.querySelectorAll('.node').forEach(x => x.classList.toggle('sel', x === n));
    const s = STAGE_MAP[selectedStage];
    bl.style.left = `${s.pos[0] / 10}%`; bl.style.top = `${s.pos[1] / 5.6}%`;
    renderStagePanel();
  });
  renderStagePanel();
}

function renderStagePanel() {
  const s = STAGE_MAP[selectedStage];
  const el = document.getElementById('stage-panel');
  const waves = stageWaves(s);
  const groups = new Map();
  for (const spec of waves.flat()) {
    const key = spec.monster || spec.name + spec.look.weapon;
    const g = groups.get(key) || { spec, n: 0 };
    g.n++; groups.set(key, g);
  }
  const stars = save.progress[s.id] || 0;
  const first = !stars;
  const ep = stagePower(s), sp = squadPower();
  const ratio = sp / ep;
  const diff = ratio > 1.3 ? ['קל', 'easy'] : ratio > 0.9 ? ['שקול', 'even'] : ratio > 0.6 ? ['קשה', 'hard'] : ['קשה מאוד', 'deadly'];
  const reward = s.reward ? WEAPON_MAP[s.reward] : null;
  el.innerHTML = `
    <div class="region-chip" style="--c:${s.region.color}">${s.region.name}</div>
    <h2>${s.boss ? '💀 ' : ''}שלב ${s.id} · ${s.name}</h2>
    <div class="arena-thumb"><img src="${arenaThumb(s.region.arena)}" alt=""><span>זירה: ${ARENAS[s.region.arena].name}</span></div>
    <p class="muted">${s.region.desc}</p>
    <div class="row between">
      <span>${waves.length > 1 ? `🌊 ${waves.length} גלים` : `👥 ${waves[0].length} אויבים`}</span>
      <span class="stars-lg">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>
    </div>
    <h3>אויבים</h3>
    <div class="enemy-list">
      ${[...groups.values()].map(({ spec, n }) => `<div class="mini r-${spec.rarity}" style="--rc:${RARITIES[spec.rarity].color}" title="${spec.name}">
        <img src="${portrait(spec, 64)}" alt=""><b>×${n}</b>${spec.boss ? '<i>בוס</i>' : ''}
        ${spec.monster ? '' : `<span class="mini-belt" style="--bc:${spec.look.belt}"></span>`}</div>`).join('')}
    </div>
    <h3>פרסים ${first ? '' : '<small>(משחק חוזר: 50%)</small>'}</h3>
    <div class="rewards">
      <span>🪙 ${fmt(first ? s.gold : s.gold / 2)}</span>
      <span>✨ ${fmt(first ? s.xp : s.xp / 2)} XP</span>
      ${reward ? `<span class="reward-unit ${first ? '' : 'got'}" style="--rc:${RARITIES[reward.rarity].color}">
        <img src="${weaponIcon(reward, 40)}" alt="">${first ? '' : '✓ '}${reward.name}</span>` : ''}
    </div>
    <div class="power-cmp">
      <div><small>הכוח שלך</small><b>${fmt(sp)}</b></div>
      <div class="diff ${diff[1]}">${diff[0]}</div>
      <div><small>כוח האויב</small><b>${fmt(ep)}</b></div>
    </div>
    <div class="row gap">
      <button class="btn ghost" id="edit-squad">🥋 לדוג׳ו</button>
      <button class="btn primary big" id="fight">⚔️ לקרב!</button>
    </div>`;
  el.querySelector('#fight').onclick = () => {
    if (!squadNinjas().length) return toast('החוליה ריקה – הוסף נינג׳ות בדוג׳ו');
    go('battle', s.id);
  };
  el.querySelector('#edit-squad').onclick = () => go('dojo');
}

// ───────────────────────── BATTLE
function renderBattle(stageId) {
  const stage = STAGE_MAP[stageId];
  screenEl.innerHTML = `
    <div class="battle-screen">
      <div class="battle-hud" dir="ltr">
        <div class="side p">
          <div class="who"><b>${save.town}</b><small>רמה ${save.level}</small></div>
          <div class="hpbar"><i id="hp-p"></i><span id="hp-p-t"></span></div>
        </div>
        <div class="vs">VS</div>
        <div class="side e">
          <div class="who"><b>${stage.name}</b><small id="wave-t"></small></div>
          <div class="hpbar"><i id="hp-e"></i><span id="hp-e-t"></span></div>
        </div>
      </div>
      <div class="battle-stage"><canvas id="battle-canvas"></canvas></div>
      <div class="battle-bar">
        <div class="spells">
          ${SPELLS.map(sp => {
            const locked = save.level < sp.unlock;
            return `<button class="spell ${locked ? 'locked' : ''}" data-spell="${sp.id}" title="${sp.name}: ${sp.desc}">
              <span class="ic">${locked ? '🔒' : sp.icon}</span><small>${locked ? 'רמה ' + sp.unlock : sp.name}</small><i class="cd"></i></button>`;
          }).join('')}
        </div>
        <div class="row gap">
          <button class="btn small" id="speed">⏩ x1</button>
          <button class="btn small" id="pause">⏸️</button>
          <button class="btn small danger" id="retreat">🏳️ נסיגה</button>
        </div>
      </div>
      <p class="rotate-hint">📱↻ סובב את הטלפון לרוחב כדי לראות את הקרב גדול יותר</p>
      <p class="hint">הנינג׳ות קופצות לענן הקרב בכל סיבוב. לחץ על כישוף ואז על שדה הקרב (או על הענן) כדי להטיל אותו.</p>
    </div>`;

  if (activeMode() === 'mobile') screen.orientation?.lock?.('landscape').catch(() => { /* only works in fullscreen / installed app */ });
  const fighters = squadNinjas();
  const spellBtns = [...screenEl.querySelectorAll('[data-spell]')];
  battle = new Battle(document.getElementById('battle-canvas'), {
    stage, squad: fighters.map(specOf), waves: stageWaves(stage), playerLevel: save.level,
    onHud: (h) => {
      document.getElementById('hp-p').style.width = `${(h.pHp / h.pMax) * 100}%`;
      document.getElementById('hp-e').style.width = `${Math.min(1, h.eHp / Math.max(1, h.eMax)) * 100}%`;
      document.getElementById('hp-p-t').textContent = `${fmt(h.pHp)} / ${fmt(h.pMax)}`;
      document.getElementById('hp-e-t').textContent = `${fmt(h.eHp)} / ${fmt(h.eMax)}`;
      document.getElementById('wave-t').textContent = `${h.waves > 1 ? `גל ${h.wave}/${h.waves} · ` : ''}סיבוב ${Math.max(1, h.round)}`;
      for (const b of spellBtns) {
        const sp = SPELLS.find(s => s.id === b.dataset.spell);
        const cd = h.spellCd[sp.id] || 0;
        b.querySelector('.cd').style.height = `${(cd / sp.cd) * 100}%`;
        b.classList.toggle('armed', battle?.pendingSpell === sp.id);
        b.classList.toggle('ready', cd <= 0 && save.level >= sp.unlock);
      }
    },
    onEnd: (res) => showResult(stage, res, fighters),
  });
  screenEl.querySelector('.spells').addEventListener('click', (e) => {
    const b = e.target.closest('[data-spell]');
    if (!b) return;
    const sp = SPELLS.find(s => s.id === b.dataset.spell);
    if (save.level < sp.unlock) return toast(`הכישוף נפתח ברמה ${sp.unlock}`);
    battle.requestSpell(sp.id);
  });
  const speedBtn = screenEl.querySelector('#speed');
  speedBtn.onclick = () => { battle.speed = battle.speed % 3 + 1; speedBtn.textContent = `⏩ x${battle.speed}`; };
  const pauseBtn = screenEl.querySelector('#pause');
  pauseBtn.onclick = () => { battle.paused = !battle.paused; pauseBtn.textContent = battle.paused ? '▶️' : '⏸️'; };
  screenEl.querySelector('#retreat').onclick = () => { if (confirm('לסגת מהקרב? לא תקבל פרסים.')) go('map'); };
}

function showResult(stage, res, fighters) {
  const first = !save.progress[stage.id];
  let gold, xp, ninjaXp, rewardHtml = '';
  if (res.win) {
    gold = Math.round(first ? stage.gold : stage.gold / 2);
    xp = Math.round(first ? stage.xp : stage.xp / 2);
    ninjaXp = xp;
    save.progress[stage.id] = Math.max(res.stars, save.progress[stage.id] || 0);
    save.stats.wins++;
    if (first && stage.reward) {
      const w = WEAPON_MAP[stage.reward];
      grantWeapon(w.id);
      rewardHtml = `<div class="unlock"><h3>🎁 נשק חדש במחסן!</h3>${weaponCard(w)}</div>`;
    }
  } else {
    gold = Math.round(stage.gold * 0.1);
    xp = Math.round(stage.xp * 0.25);
    ninjaXp = Math.round(stage.xp * 0.35);
  }
  const readyBefore = new Set(fighters.filter(n => { const s = beltStatus(n); return !s.max && s.xpOk; }).map(n => n.uid));
  fighters.forEach(n => { n.xp += ninjaXp; });
  const nowReady = fighters.filter(n => { const s = beltStatus(n); return !s.max && s.xpOk && !readyBefore.has(n.uid); });
  save.gold += gold;
  save.stats.battles++;
  save.stats.kills += res.kills;
  const prevSize = squadSize();
  const ups = addXp(xp);
  persist(); refreshStats();
  const newSpells = SPELLS.filter(sp => ups && sp.unlock > save.level - ups && sp.unlock <= save.level);
  const next = nextStageId(stage.id);

  const m = openModal(`
    <div class="result ${res.win ? 'win' : 'lose'}">
      <h1>${res.win ? 'ניצחון!' : 'הפסד...'}</h1>
      ${res.win ? `<div class="stars-big">${[1, 2, 3].map(i => `<span class="${i <= res.stars ? 'on' : ''}" style="animation-delay:${i * 0.2}s">★</span>`).join('')}</div>` : '<p class="muted">נסה לשדרג חגורות, לקנות נשקים טובים יותר או לזמן נינג׳ות חדשות.</p>'}
      <div class="rewards center">
        <span>🪙 +${fmt(gold)}</span><span>✨ +${fmt(xp)} XP</span><span>🥋 +${fmt(ninjaXp)} ניסיון לכל נינג׳ה</span><span>☠️ ${res.kills} הריגות</span>
      </div>
      ${ups ? `<div class="levelup">⬆️ עלית לרמה ${save.level}!${squadSize() > prevSize ? ' · משבצת חדשה בחוליה' : ''}${newSpells.map(s => ` · כישוף חדש: ${s.icon} ${s.name}`).join('')}</div>` : ''}
      ${nowReady.length ? `<div class="levelup belt">🥋 מוכנים למבחן חגורה: ${nowReady.map(n => n.name).join(', ')}</div>` : ''}
      ${rewardHtml}
      <div class="row gap center">
        <button class="btn ghost" id="r-town">🏘️ לעיר</button>
        <button class="btn ghost" id="r-map">🗺️ למפה</button>
        <button class="btn" id="r-again">🔁 שוב</button>
        ${res.win && next ? `<button class="btn primary" id="r-next">➡️ השלב הבא</button>` : ''}
      </div>
    </div>`, 'small result-modal');
  m.querySelector('#r-town').onclick = () => go('town');
  m.querySelector('#r-map').onclick = () => go('map');
  m.querySelector('#r-again').onclick = () => go('battle', stage.id);
  m.querySelector('#r-next')?.addEventListener('click', () => { selectedStage = next; go('map'); });
}

go('town');
if (!getModePref()) openModeChooser();
