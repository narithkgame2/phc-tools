// Geography helpers shared by the bot and tools/import-map.cjs. Boundaries come from Nick's verified map (config/boundaries.json).
// A point (longitude, latitude) is placed in a khan and a sangkat by checking which boundary contains it.
function inside([x, y], poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
// The bot's district buttons. BKK1, TTP and Tonle Bassac are sangkats; Daun Penh and Toul Kork are khans.
function buttonArea(khan, sangkat) {
  if (/\(BKK1\)/i.test(sangkat)) return 'BKK1';
  if (/^tonle bassac$/i.test(sangkat)) return 'Tonle Bassac';
  if (/toul tumpung|toul tom poung|tuol tumpung|tuol tompoung/i.test(sangkat)) return 'TTP';
  if (/^toul kork$/i.test(khan)) return 'Toul Kork';
  if (/^daun penh$/i.test(khan)) return 'Daun Penh';
  return 'Others';
}
function locate(lat, lng, boundaries) {
  const pt = [Number(lng), Number(lat)];
  if (!boundaries || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) return null;
  const hit = (list) => { const h = (list || []).find((b) => b.rings.some((r) => r.length > 2 && inside(pt, r))); return h ? h.name : ''; };
  const khan = hit(boundaries.khans), sangkat = hit(boundaries.sangkats).replace(/^Sangkat /, '');
  return { khan, sangkat, area: buttonArea(khan, sangkat) };
}
module.exports = { inside, buttonArea, locate };
