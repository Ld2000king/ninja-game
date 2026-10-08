import test from 'node:test';
import assert from 'node:assert/strict';
import { costumeLook, NINJA_STYLES, ninjaLook } from '../src/data/ninja-looks.js';
import { rollNinja, seededRng } from '../src/data/ninjas.js';
import { ninjaSpec } from '../src/game/stats.js';
import { WEAPON_MAP } from '../src/data/weapons.js';
import { BELTS } from '../src/data/rarity.js';

test('all six costumes occur; new ninjas have no built-in weapon', () => {
  const seen = new Set();
  const rng = seededRng('costume-coverage');
  for (const rarity of ['common', 'rare', 'epic', 'legendary']) {
    for (let i=0; i<100; i++) {
      const n = rollNinja(rarity, rng);
      seen.add(n.look.ninjaStyle);
      assert.equal(n.weapon, null);
      assert.equal(n.look.weapon, undefined);
      assert.equal(n.look.belt, undefined);
      if (rarity !== 'legendary') assert.equal(n.look.aura, undefined);
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(NINJA_STYLES).sort());
});

test('old saves get stable appearances without changing any saved data', () => {
  const n = rollNinja('epic', seededRng(7));
  n.look = { hair: 'long', outfit: '#d63c3c', skin: '#c98e62' };
  n.weapon = 'owned-weapon'; n.belt = 4; n.xp = 620;
  const before = JSON.stringify(n);
  assert.deepEqual(ninjaLook(n), ninjaLook(JSON.parse(before)));
  assert.equal(ninjaLook(n).skin, n.look.skin);
  const spec = ninjaSpec(n, null);
  assert.ok(NINJA_STYLES[spec.look.ninjaStyle]);
  assert.equal(spec.look.belt, BELTS[4].color);
  assert.equal(JSON.stringify(n), before);
});

test('equipping and removing weapons works independently for every costume', () => {
  const weapon = Object.values(WEAPON_MAP).find(w => w.type === 'katana');
  assert.ok(weapon);
  for (const style of Object.keys(NINJA_STYLES)) {
    const n = rollNinja('common', seededRng(3)); n.look = costumeLook(style);
    const empty = ninjaSpec(n, null), armed = ninjaSpec(n, weapon);
    assert.equal(empty.look.weapon, 'fists');
    assert.equal(armed.look.weapon, 'katana');
    assert.equal(armed.look.ninjaStyle, style);
    assert.deepEqual(ninjaSpec(n, null), empty);
    assert.ok(armed.stats.atk > empty.stats.atk);
  }
});
