// Play mode: desktop layout or mobile (app-style) layout. Stored separately from the game save,
// so resetting progress keeps the chosen mode.
const KEY = 'ninja-wars-device-mode';
export const MODES = {
  desktop: { name: 'מחשב', icon: '🖥️', desc: 'מסך רחב, תפריט עליון ועכבר.' },
  mobile:  { name: 'טלפון', icon: '📱', desc: 'תפריט תחתון, כפתורים גדולים ומגע.' },
  auto:    { name: 'אוטומטי', icon: '✨', desc: 'המשחק בוחר לפי המכשיר.' },
};

export function getModePref() {
  try { const v = localStorage.getItem(KEY); return MODES[v] ? v : null; } catch { return null; }
}

export function setModePref(mode) {
  try { localStorage.setItem(KEY, mode); } catch { /* ignore */ }
  applyMode();
}

/** What "auto" picks on this device right now. */
export function detectMode() {
  const touch = window.matchMedia?.('(pointer: coarse)').matches;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 600 || window.innerWidth < 760;
  return touch || narrow ? 'mobile' : 'desktop';
}

export const activeMode = () => {
  const pref = getModePref() || 'auto';
  return pref === 'auto' ? detectMode() : pref;
};

export function applyMode() {
  const m = activeMode();
  document.body.classList.toggle('mode-mobile', m === 'mobile');
  document.body.classList.toggle('mode-desktop', m === 'desktop');
  return m;
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if ((getModePref() || 'auto') === 'auto') applyMode(); }, 150);
});
