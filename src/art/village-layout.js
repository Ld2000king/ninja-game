// Hit targets in the 1000 × 560 scene coordinate system, aligned to the artwork.
export const DAYLIGHT_LAYOUT = {
  dojo:    { box: [125, 85, 210, 155], sign: [238, 80] },
  shrine:  { box: [407, 98, 115, 108], sign: [468, 93] },
  shop:    { box: [552, 178, 180, 135], sign: [650, 174] },
  balloon: { box: [815, 7, 160, 154], sign: [900, 170] },
  forge:   { box: [112, 257, 175, 107], sign: [198, 375] },
  arena:   { box: [321, 302, 157, 107], sign: [396, 420] },
  clan:    { box: [530, 310, 172, 108], sign: [622, 431] },
};

export function scenePoint(rect, clientX, clientY) {
  const scale = Math.min(rect.width / 1000, rect.height / 560);
  if (scale <= 0) return [NaN, NaN];
  return [(clientX - rect.left - (rect.width - 1000 * scale) / 2) / scale,
    (clientY - rect.top - (rect.height - 560 * scale) / 2) / scale];
}

export const contains = (box, x, y) => x >= box[0] && x <= box[0] + box[2] && y >= box[1] && y <= box[1] + box[3];
