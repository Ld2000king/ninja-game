import test from 'node:test';
import assert from 'node:assert/strict';
import { DAYLIGHT_LAYOUT, scenePoint, contains } from '../src/art/village-layout.js';

test('all seven buildings remain reachable in wide and letterboxed phone layouts', () => {
  assert.deepEqual(Object.keys(DAYLIGHT_LAYOUT), ['dojo', 'shrine', 'shop', 'balloon', 'forge', 'arena', 'clan']);
  for (const [width, height] of [[1200, 672], [390, 590], [740, 300]]) {
    const rect = { left: 12, top: 83, width, height };
    const k = Math.min(width / 1000, height / 560);
    for (const [id, { box }] of Object.entries(DAYLIGHT_LAYOUT)) {
      const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
      const [x, y] = scenePoint(rect, rect.left + (width - 1000 * k) / 2 + cx * k,
        rect.top + (height - 560 * k) / 2 + cy * k);
      const hits = Object.entries(DAYLIGHT_LAYOUT).filter(([, b]) => contains(b.box, x, y)).map(([key]) => key);
      assert.deepEqual(hits, [id]);
    }
  }
});

test('taps in phone letterboxing do not activate buildings', () => {
  const [x, y] = scenePoint({ left: 0, top: 0, width: 390, height: 590 }, 195, 30);
  assert.ok(Object.values(DAYLIGHT_LAYOUT).every(b => !contains(b.box, x, y)));
});
