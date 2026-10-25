// Reads the net and gross size out of a listing post. Posts write them in several ways:
//   "47㎡ Gross | 38㎡ Net", "32m2 (Net) | 41m2 (Gross)", "72㎡ (Gross size)", "Net size 35sqm", "Net area: 51.46㎡ | Building area: 66.92㎡"
// A size with no label is returned as `plain`: its basis is unknown and a person must decide.
const NUM = '(\\d[\\d.,]*)';
const UNIT = '(?:㎡|m²|m2|sqm|sq\\.?\\s?m)';
const toNum = (s) => Number(String(s).replace(/,(?=\d{3}\b)/g, '').replace(',', '.'));
function parseSizes(text) {
  const t = String(text || '').normalize('NFKC');
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
module.exports = { parseSizes };
