// Six articulated cloth costumes. All geometry is local to the original 60px rig.
// Weapon rendering stays in the existing equipment renderer, at the animated hand.
export function drawNinja(ctx, look, p, drawWeapon, drawAura) {
  const t = p.t || 0, style = look.ninjaStyle;
  const bulky = style === 'guardian', forest = style === 'forest';
  const ivory = style === 'ivory', elite = style === 'shadow';
  const trim = look.trim, dark = look.outfit2, cloth = look.outfit;
  const ink = '#191922', skin = look.skin;
  const stride = p.walking ? Math.sin(t * 11) : 0;
  const bob = p.walking ? -Math.abs(stride) * 2 : Math.sin(t * 2.6) * 0.6;
  const scale = (look.scale || 1) * (p.scale || 1);
  const width = look.build || 1;
  const a = p.attack;
  ctx.save();
  ctx.scale((p.facing || 1) * scale, scale);
  if (p.alpha != null) ctx.globalAlpha *= p.alpha;
  if (look.aura) drawAura(ctx, look.aura, t);
  ctx.translate(0, bob);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.lineWidth = 1.2; ctx.strokeStyle = ink;

  function path(points, fill, stroke = ink, line = 1.2) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); }
  }
  function line(points, color, weight = 0.8) {
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
  }
  function oval(x, y, rx, ry, fill, stroke = ink, angle = 0) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.1; ctx.stroke(); }
  }

  // Cloth ties and scarves have separate lengths and silhouettes per costume.
  const wind = Math.sin(t * 6) * 2;
  const tail = look.scarf || cloth;
  path([[-10,-44],[-19,-48],[-27,-46+wind],[-22,-42+wind],[-15,-42]], tail);
  path([[-11,-42],[-18,-39],[-26,-40-wind],[-22,-35-wind],[-14,-38]], tail);
  if (look.scarf) {
    const length = style === 'scout' || ivory ? 32 : 25;
    path([[-5,-30],[-17,-32+wind],[-length,-28+wind],[-length+5,-23+wind],[-16,-26],[-4,-26]], tail);
    line([[-8,-29],[-18,-29+wind],[-length+4,-27+wind]], trim, 0.6);
  }

  // Crouched legs; walking and airborne poses keep the same animation contract.
  function leg(x, angle, front) {
    ctx.save(); ctx.translate(x, -15); ctx.rotate(angle);
    path([[-4,-2],[4,-2],[6,5],[3,10],[-3,8],[-6,3]], front ? cloth : dark);
    path([[-3,7],[3,8],[4,13],[-3,13]], dark);
    for (let i = 0; i < 3; i++) line([[-2.5,8+i*1.5],[3,10+i*1.2]], ivory ? '#aab4c1' : '#87858b', 0.65);
    ctx.translate(0, 13); ctx.rotate(-angle);
    path([[-3,-1],[3,-1],[6,1],[6,3],[-4,3]], dark);
    line([[1,0],[1,2],[5,2]], trim, 0.7);
    ctx.restore();
  }
  leg(-5*width, p.air ? 0.85 : 0.4 + stride*0.55, false);
  leg(5*width, p.air ? -0.65 : -0.4 - stride*0.55, true);

  let front = 0.8 + stride*0.2, back = -0.35 - stride*0.35;
  if (a != null && a >= 0) {
    if (p.ranged) front = 0.9 + (a < 0.4 ? a/0.4 : 1-(a-0.4)/0.6);
    else front = a < 0.35 ? 0.8 + a/0.35*2.35 : 3.15-(1-(1-(a-0.35)/0.65)**2)*2.9;
  }
  if (look.weapon === 'bow') { front = 1.45; back = 1.25; }
  function arm(x, angle, isFront) {
    ctx.save(); ctx.translate(x, -28); ctx.rotate(-angle);
    oval(0, 3, bulky ? 4.6 : 3.5, 5, isFront ? cloth : dark);
    path([[-3,5],[3,5],[3.2,11],[-2.8,11]], dark);
    for (let i = 0; i < 3; i++) line([[-2.6,6+i*1.5],[2.6,7.8+i*1.5]], '#93909b', 0.75);
    if (ivory) path([[-3,3],[3,3],[3,7],[-3,6]], '#536b87');
    oval(0, 12, 3, 3, dark);
    // Small visible fingertips; weapons are never baked into the costume.
    oval(1.5, 13, 1.4, 1.9, skin, null);
    if (isFront && look.weapon && look.weapon !== 'none' && look.weapon !== 'fists') {
      ctx.translate(0, 12);
      ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
      drawWeapon(ctx, look.weapon, t, a, look.weaponTint);
    }
    ctx.restore();
  }
  arm(-7*width, back, false);

  // Layered tunic, open split hem and contrasting lapels.
  ctx.save(); ctx.scale(width, 1);
  path([[-7,-32],[6,-32],[9,-24],[8,-17],[12,-9],[4,-11],[0,-8],[-4,-11],[-12,-10],[-8,-19],[-9,-25]], cloth);
  path([[-7,-30],[-1,-24],[7,-30],[6,-25],[-5,-16],[-8,-18]], dark);
  line([[-6,-31],[-1,-25],[6,-30]], trim, 1.1);
  line([[6,-26],[-5,-15],[-9,-11]], trim, 0.9);
  line([[1,-15],[5,-11],[10,-10]], trim, 0.9);
  path([[0,-15],[3,-13],[1,-9],[-1,-11]], dark, null);
  if (bulky) {
    path([[-9,-30],[-5,-31],[-5,-25],[-11,-24]], '#53515a');
    line([[-10,-27],[-6,-28]], trim, 1.2);
    path([[5,-31],[9,-29],[11,-24],[7,-24]], '#53515a');
  }
  if (forest) {
    path([[-7,-31],[-4,-32],[7,-18],[4,-17]], '#71583f');
    oval(-1,-25,2.2,2.6,trim);
    oval(-1,-25,1.2,1.6,dark,null);
    for (let i=0;i<3;i++) path([[-9+i*4,-20],[-6+i*4,-20],[-6+i*4,-15],[-9+i*4,-15]], '#836346');
  }
  if (ivory) {
    line([[-9,-12],[-7,-15],[-5,-12],[-3,-15]], '#a2b0c1', 0.75);
    line([[4,-14],[6,-12],[8,-14]], '#a2b0c1', 0.75);
  }
  if (elite) {
    path([[-7,-15],[-3,-12],[-6,-8],[-11,-10]], cloth);
    line([[-9,-11],[-6,-10],[-5,-12]], trim, 1);
    line([[6,-15],[9,-12],[6,-11]], trim, 1);
  }
  // Real rank color, not a costume-specific belt.
  const belt = look.belt || '#f4f4f4';
  path([[-8,-19],[8,-19],[8,-16],[-8,-16]], belt);
  path([[1,-17],[4,-16],[6,-9],[3,-10]], belt);
  path([[1,-17],[-1,-16],[-3,-10],[0,-11]], belt);
  oval(1,-17,2,1.8,belt);
  ctx.restore();

  // Scarf collar, leaving a strong separation between head and body.
  if (look.scarf) {
    path([[-9,-33],[7,-33],[8,-29],[1,-27],[-7,-29]], tail);
    line([[-6,-31],[1,-29],[6,-31]], dark, 0.8);
  }

  // Distinct hood silhouettes, not just color swaps.
  const hw = bulky ? 16 : style === 'scout' ? 13 : 14;
  if (look.hood === 'pointed') {
    ctx.beginPath(); ctx.moveTo(-hw, -48); ctx.lineTo(-hw-1,-59);
    ctx.quadraticCurveTo(-7,-58,-3,-58);
    ctx.bezierCurveTo(8,-58,15,-53,15,-45);
    ctx.bezierCurveTo(15,-35,9,-30,2,-30);
    ctx.bezierCurveTo(-9,-30,-hw,-35,-hw,-48);
    ctx.closePath(); ctx.fillStyle=cloth; ctx.fill();
    ctx.strokeStyle=ink; ctx.lineWidth=1.2; ctx.stroke();
    path([[-hw,-57],[-5,-54],[-10,-43],[-9,-36],[-13,-41]], dark, null);
    line([[-5,-54],[-9,-44],[-7,-39]], trim, 0.6);
  } else {
    ctx.beginPath(); ctx.moveTo(-hw,-43);
    ctx.bezierCurveTo(-hw-1,-54,-8,-59,2,-58);
    ctx.bezierCurveTo(12,-57,16,-50,15,-42);
    ctx.bezierCurveTo(15,-34,9,-30,2,-30);
    ctx.bezierCurveTo(-8,-30,-hw,-34,-hw,-43);
    ctx.fillStyle = cloth; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.2; ctx.stroke();
    if (look.hood === 'wrapped') {
      line([[-13,-49],[-5,-54],[6,-54],[12,-50]], bulky ? '#656169' : '#6c775c', 1);
      line([[-14,-45],[-5,-50],[7,-51],[13,-48]], dark, 1.4);
      line([[-12,-39],[-8,-46],[6,-49]], trim, 0.6);
    } else {
      line([[-11,-50],[-3,-55],[5,-55]], '#536780', 0.9);
      line([[-12,-48],[-8,-37],[-4,-34]], trim, 1);
    }
  }
  // Narrow eye opening above the full fabric face mask.
  path([[-3,-44],[7,-47],[14,-45],[13,-39],[7,-36],[-2,-38]], skin);
  path([[-3,-38],[4,-37],[13,-40],[12,-34],[6,-30],[-1,-31],[-6,-35]], dark);
  line([[-3,-35],[5,-33],[11,-36]], ivory ? '#576c84' : '#49424f', 0.75);
  // Brows integrated into hood edge; ordinary ninjas have natural dark eyes.
  line([[-3,-44],[3,-42]], ink, bulky ? 1.8 : 1.3);
  line([[8,-43],[13,-45]], ink, 1.3);
  oval(2,-41,1.3,2,elite ? look.eyeColor : '#16151c', null);
  oval(10.5,-42,1.1,1.8,elite ? look.eyeColor : '#16151c', null);
  if (ivory) line([[-4,-45],[5,-48],[13,-46]], dark, 1.7);
  if (style === 'violet' || elite) {
    line([[-12,-49],[-6,-45],[-2,-49]], trim, 1.1);
    line([[2,-50],[7,-53],[13,-48]], trim, 1.1);
  }
  if (elite) path([[4,-52],[6,-55],[8,-52],[6,-50]], trim, null);

  arm(6*width, front, true);
  ctx.restore();
}
