// Reads the net and gross size out of a listing post. Posts write them in several ways:
//   "47㎡ Gross | 38㎡ Net", "32m2 (Net) | 41m2 (Gross)", "72㎡ (Gross size)", "Net size 35sqm", "Net area: 51.46㎡ | Building area: 66.92㎡"
// A size with no label is returned as `plain`: its basis is unknown and a person must decide.
const NUM = '(\\d[\\d.,]*)';
const UNIT = '(?:㎡|m²|m2|sqm|sq\\.?\\s?m)';
const toNum = (s) => Number(String(s).replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
// Nick's rule (2026-10-27): sqm everywhere. A size written in square feet is turned into sqm before anything reads it.
const SQFT = /(\d[\d.,]*)\s*(?:sq\.?\s?ft\.?|sqft|ft²|ft2|square\s+feet)/gi;
const sqftToSqm = (text) => String(text || '').replace(SQFT, (all, n) => (Math.round((toNum(n) / 10.7639) * 10) / 10) + ' sqm');
// Japanese buyers think in tsubo too: 50㎡（約15.1坪）. 1坪 = 3.3058㎡.
const tsubo = (sqm) => (Math.round((Number(sqm) / 3.3058) * 10) / 10).toFixed(1);
// a size for a Japanese text: "29㎡（専有・約8.8坪）", "57㎡（約17.2坪）"
const jpSize = (sqm, basis) => sqm + '㎡（' + (basis === 'net' ? '専有・' : basis === 'gross' ? '総面積・' : '') + '約' + tsubo(sqm) + '坪）';
// Cambodia counts floors the British way (Ground, then 1st). Japan calls the ground floor 1階; other floors keep the building's number.
const floorJP = (f) => (/^(g|ground|gf)$/i.test(String(f)) ? '1階（地上階）' : f + '階');
const floorEN = (f) => (/^(g|ground|gf)$/i.test(String(f)) ? 'Ground floor' : 'Floor ' + f);
function parseSizes(text) {
  const t = sqftToSqm(String(text || '').normalize('NFKC'));
  const out = { net: 0, gross: 0, plain: 0 };
  const put = (kind, v) => { const n = toNum(v); if (n > 0 && !out[kind]) out[kind] = n; };
  let m;
  // number, unit, then a label: "47㎡ Gross", "32m2 (Net)", "72㎡ (Gross size)", "65m2 (net area)"
  const after = new RegExp(NUM + '\\s*' + UNIT + '\\s*\\(?\\s*(net|gross)\\b', 'gi');
  while ((m = after.exec(t))) put(m[2].toLowerCase(), m[1]);
  // label, then number: "Net size 35sqm", "Gross area: 66.92㎡", "Building area: 66.92㎡" (building area is the gross figure)
  const before = new RegExp('\\b(net|gross|building)\\s*(?:size|area|floor area)?\\s*[:\\-]?\\s*' + NUM + '\\s*' + UNIT, 'gi');
  while ((m = before.exec(t))) put(m[1].toLowerCase() === 'net' ? 'net' : 'gross', m[2]);
  // an unlabelled "Size: 56m2" or "Size 41 sqm"
  const plain = new RegExp('(?<!\\b(?:net|gross|building)\\s)\\bsize\\s*[:\\-]?\\s*' + NUM + '\\s*' + UNIT + '(?!\\s*\\(?\\s*(?:net|gross))', 'i');
  if ((m = plain.exec(t))) put('plain', m[1]);
  if (!out.net && !out.gross && !out.plain) { const any = new RegExp(NUM + '\\s*' + UNIT, 'i').exec(t); if (any) put('plain', any[1]); }
  return out;
}
module.exports = { parseSizes, sqftToSqm, tsubo, jpSize, floorJP, floorEN };
