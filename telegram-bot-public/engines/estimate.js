// /estimate maths and wording, from Nick's own models (2026-10-28):
// long term = his signature method (14% non-resident tax, 10% rental management, 1 month empty) plus the building fee
// ($1.50 per sqm a month, the middle of the guide's $1 to $2) when the size is known, the same lines as FAQ 3;
// short stay = his "TS9 Short stay model" sheet (nightly rate x occupancy, building fee, electricity, $8 cleaning per booked night,
// 20% operator fee), shown to Nick only, never sent to a client by itself.
const TAX = 0.14, MGMT = 0.10, BLD = 1.5;
const SHORT = { occupancy: 0.6, bld: 1, electricity: 130, cleaning: 8, fee: 0.2 };

// one amount from a client's text: 68000, 68,000, $68,000, 6.8万, 68k
function amountOf(s) {
  const m = String(s || '').replace(/[,，\s]/g, '').match(/(\d+(?:\.\d+)?)(万|k|K)?/);
  if (!m) return 0;
  const n = Number(m[1]) * (m[2] === '万' ? 10000 : m[2] ? 1000 : 1);
  return n > 0 ? n : 0;
}
const allNums = (s) => (String(s || '').replace(/[,，]/g, '').match(/\d+(?:\.\d+)?/g) || []).map(Number);

function longTerm({ price, rent, size, bldFee }) {
  const year = rent * 12, tax = year * TAX, mgmt = year * MGMT, empty = rent;
  const fee = size ? (bldFee || BLD) : 0, bld = size ? fee * size * 12 : 0;
  const net = year - tax - mgmt - empty - bld;
  return { kind: 'long', price: price || 0, rent, size: size || 0, fee, year, tax, mgmt, empty, bld, net,
    gross: price ? (year / price) * 100 : null, netPct: price ? (net / price) * 100 : null };
}

function shortStay({ price, nightly, occupancy, size, bldFee, electricity }) {
  const occ = occupancy || SHORT.occupancy, nights = 365 * occ, gross = nightly * nights;
  const bld = size ? (bldFee || SHORT.bld) * size * 12 : 0, elec = (electricity || SHORT.electricity) * 12, clean = SHORT.cleaning * nights;
  const before = gross - bld - elec - clean, fee = before * SHORT.fee, net = before - fee, tax = gross * TAX;
  return { kind: 'short', price: price || 0, nightly, occ, nights, gross, size: size || 0, bld, elec, clean, before, fee, net, tax, netTax: net - tax,
    assumed: { occupancy: !occupancy, electricity: !electricity, bldFee: !!size && !bldFee },
    netPct: price ? (net / price) * 100 : null, netTaxPct: price ? ((net - tax) / price) * 100 : null };
}

// reads a client's own calculation (free text, any language): what it says and what it leaves out
function readOwn(text) {
  const t = String(text || ''), lines = t.split(/\r?\n/).map((x) => x.replace(/^[\s\-－–—・•▫️✅*]+/, '').trim()).filter(Boolean);
  const grab = (re) => { const m = t.match(re); return m ? amountOf(m[1]) : 0; };
  const d = {};
  d.name = (lines.find((x) => !/[$％%:：]|ドル|usd|sqm|㎡|m2|万|\d{3,}/i.test(x) && x.length <= 60) || '');
  d.price = grab(/(?:price|価格|売値|販売|購入|selling)[^\d\n]*\$?\s*([\d,.]+\s*(?:万|k)?)/i);
  d.nightly = grab(/(?:night|nightly|1泊|一泊|per\s*night)[^\d\n]*\$?\s*([\d,.]+)/i) || grab(/\$?\s*([\d,.]+)\s*(?:ドル|\$|usd)?\s*\/?\s*(?:night|泊)/i);
  d.rent = d.nightly ? 0 : grab(/(?:rent|家賃|賃料)[^\d\n]*\$?\s*([\d,.]+)/i);
  const occ = t.match(/(?:occupancy|稼働率|入居率)[^\d\n]*([\d.]+)\s*[%％]/i); d.occupancy = occ ? Number(occ[1]) / 100 : 0;
  const size = t.match(/(\d+(?:\.\d+)?)\s*(?:sqm|㎡|m2|m²|平米|平方メートル)/i); d.size = size ? Number(size[1]) : 0;
  d.bldFee = grab(/\$?\s*([\d.]+)\s*(?:ドル|\$|usd)?\s*\/\s*(?:sqm|㎡|m2|m²|平米)/i);
  d.electricity = grab(/(?:electric|電気|光熱|utilit)[^\d\n]*\$?\s*([\d,.]+)/i);
  // bare numbers with no words, like "68000, 650, 35": price (the biggest), then the rent, then the size, as in /estimate
  if (!d.rent && !d.nightly) {
    const bare = lines.filter((x) => /\d/.test(x) && !/[A-Za-z぀-ヿ一-鿿]/.test(x.replace(/\$|ドル|usd|sqm|㎡|m2|万|k/gi, '')));
    const ns = allNums(bare.join(' '));
    if (ns.length >= 2 && ns.length <= 3 && Math.max.apply(null, ns) >= 1000) {
      const rest = ns.slice(); rest.splice(rest.indexOf(Math.max.apply(null, ns)), 1);
      d.price = d.price || Math.max.apply(null, ns); d.rent = rest[0]; if (rest[1] && !d.size) d.size = rest[1];
    }
  }
  if (!d.price) { const big = allNums(t).filter((n) => n >= 10000); if (big.length) d.price = Math.max.apply(null, big); }
  d.short = !!d.nightly;
  d.has = { tax: /tax|税/i.test(t), mgmt: /rental\s*management|management\s*fee\s*\d|賃貸管理|管理手数料|\d\s*[%％][^\n]*管理|管理[^\n]*\d\s*[%％]/i.test(t),
    empty: /vacan|empty|空室|occupancy|稼働率|入居率/i.test(t), bld: !!d.bldFee || /building|建物/i.test(t) };
  return d;
}
function missingOf(d) {
  if (d.short) return [!d.price && 'price', !d.occupancy && 'occupancy', !d.size && 'size', !d.has.tax && 'tax'].filter(Boolean);
  return [!d.price && 'price', !d.rent && 'rent', !d.has.tax && 'tax', !d.has.mgmt && 'rental management', !d.has.empty && 'empty months', !d.size && 'size'].filter(Boolean);
}

const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
const dol = (n) => Math.round(n).toLocaleString('en-US') + 'ドル';
const pct = (n) => (Math.round(n * 10) / 10).toFixed(1);
const bldRate = (f) => (Number.isInteger(f) ? String(f) : f.toFixed(2).replace(/0$/, ''));

// the client's breakdown, in Japanese or English (Khmer clients get English until Nick has checked a Khmer one)
function clientText(r, lang) {
  const jp = lang === 'jp';
  const L = [];
  if (jp) {
    L.push('<b>試算結果（年間）</b>', '<i>お送りいただいた数値に基づきます</i>', '');
    L.push('家賃：' + dol(r.year), '－ 税金 14%：' + dol(r.tax), '－ 賃貸管理費 10%：' + dol(r.mgmt), '－ 空室 1か月：' + dol(r.empty));
    if (r.size) L.push('－ 建物の管理費（' + r.size + '㎡、1㎡あたり月' + bldRate(r.fee) + 'ドル）：' + dol(r.bld));
    L.push('＝ <b>手取り：' + dol(r.net) + '</b>');
    if (r.price) L.push('', '表面利回り ' + pct(r.gross) + '% → <b>手取りの利回り 約' + pct(r.netPct) + '%</b>');
    L.push('');
    if (!r.price) L.push('※利回りの計算には物件価格が必要です。');
    if (!r.size) L.push('※建物の管理費（1㎡あたり月1から2ドル）は含みません。');
    L.push('※税金は海外在住の場合の14%です。修繕費は含みません。');
  } else {
    L.push('<b>Your estimate (per year)</b>', '<i>Based on the numbers you sent</i>', '');
    L.push('Rent: ' + usd(r.year), '− Tax 14%: ' + usd(r.tax), '− Rental management 10%: ' + usd(r.mgmt), '− Empty months, 1 month: ' + usd(r.empty));
    if (r.size) L.push('− Building management (' + r.size + ' sqm at $' + (Number.isInteger(r.fee) ? r.fee : r.fee.toFixed(2)) + ' per sqm a month): ' + usd(r.bld));
    L.push('= <b>You keep: ' + usd(r.net) + '</b>');
    if (r.price) L.push('', 'Gross yield ' + pct(r.gross) + '% → <b>net yield about ' + pct(r.netPct) + '%</b>');
    L.push('');
    if (!r.price) L.push('The yield needs the price of the unit.');
    if (!r.size) L.push('Building management ($1 to $2 per sqm a month) is not included.');
    L.push('Tax is the 14% for owners living abroad. Repairs are not included.');
  }
  return L.join('\n');
}

// the short stay workings, for Nick only (English, his sheet's lines)
function shortText(r) {
  const a = r.assumed, L = [];
  L.push('Nightly ' + usd(r.nightly) + ' × ' + Math.round(r.occ * 100) + '% occupancy' + (a.occupancy ? ' (assumed)' : '') + ' = ' + Math.round(r.nights) + ' nights → ' + usd(r.gross));
  if (r.size) L.push('− Building fee ' + usd(r.bld) + ' (' + r.size + ' sqm' + (a.bldFee ? ' × $1, assumed' : '') + ')'); else L.push('− Building fee: size unknown, not included');
  L.push('− Electricity ' + usd(r.elec) + (a.electricity ? ' ($130 a month, assumed)' : ''));
  L.push('− Cleaning ' + usd(r.clean) + ' ($8 × ' + Math.round(r.nights) + ' nights)');
  L.push('= ' + usd(r.before) + ' before the operator fee', '− Operator fee 20%: ' + usd(r.fee), '= ' + usd(r.net) + (r.price ? ' → ' + pct(r.netPct) + '% of ' + usd(r.price) : ''));
  L.push('If 14% rental tax applies: − ' + usd(r.tax) + ' → ' + usd(r.netTax) + (r.price ? ' → ' + pct(r.netTaxPct) + '%' : ''));
  return L.join('\n');
}

module.exports = { longTerm, shortStay, readOwn, missingOf, clientText, shortText, amountOf, allNums, TAX, MGMT, BLD };
