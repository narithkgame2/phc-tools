// Side by side comparison of up to three listings the client has just seen. Only facts the listings really have are shown.
const LABELS = {
  jp: { head: '比較', price: '価格', rent: '月額家賃', net: '専有面積', gross: '総面積', sqm: '面積（区分不明）', ppsm: '専有1㎡あたり', ppsmg: '総面積1㎡あたり', beds: 'ベッドルーム', floor: '階', area: 'エリア', yield: '手取り利回り',
    note: '※面積は専有と総面積を分けて表示しています。㎡単価はどちらかが分かる物件のみ計算します。', none: '-' },
  en: { head: 'Compare', price: 'Price', rent: 'Monthly rent', net: 'Net size', gross: 'Gross size', sqm: 'Size (basis unknown)', ppsm: 'Price per sqm (net)', ppsmg: 'Price per sqm (gross)', beds: 'Bedrooms', floor: 'Floor', area: 'Area', yield: 'Net yield',
    note: 'Net and gross sizes are shown separately. Price per sqm is only calculated where a size basis is known.', none: '-' },
};
function compareText(list, lang, h) {
  const L = LABELS[lang === 'jp' ? 'jp' : 'en'], letters = ['A', 'B', 'C'], items = list.slice(0, 3);
  const usd = h.fmtUsd, esc = h.esc, jp = lang === 'jp';
  const head = items.map((l, i) => letters[i] + '  ' + esc(l.name) + ' (' + esc(l.id) + ')');
  const row = (label, fn) => {
    const vals = items.map((l) => fn(l)), any = vals.some((v) => v);
    return any ? '<b>' + label + '</b>  ' + vals.map((v, i) => letters[i] + ' ' + (v || L.none)).join(' / ') : null;
  };
  const lines = [
    row(L.price, (l) => (l.type === 'buy' && l.price ? usd(l.price) + (l.from ? (jp ? 'から' : ' from') : '') : '')),
    row(L.rent, (l) => (l.type === 'rent' && l.rent ? usd(l.rent) : '')),
    row(L.net, (l) => (l.net ? l.net + (jp ? '㎡' : ' sqm') : '')),
    row(L.gross, (l) => (l.gross ? l.gross + (jp ? '㎡' : ' sqm') : '')),
    row(L.sqm, (l) => (!l.net && !l.gross && l.sqm ? l.sqm + (jp ? '㎡' : ' sqm') : '')),
    row(L.ppsm, (l) => (l.type === 'buy' && !l.from && l.price && l.net ? usd(l.price / l.net) : '')),
    row(L.ppsmg, (l) => (l.type === 'buy' && !l.from && l.price && !l.net && l.gross ? usd(l.price / l.gross) : '')),
    row(L.beds, (l) => (l.beds ? String(l.beds) : '')),
    row(L.floor, (l) => (l.floor ? String(l.floor) : '')),
    row(L.area, (l) => esc(h.areaText(l))),
    row(L.yield, (l) => (l.netYield ? l.netYield + '%*' : '')),
  ].filter(Boolean);
  return '<b>' + L.head + '</b>\n\n' + head.join('\n') + '\n\n' + lines.join('\n') + '\n\n<i>' + L.note + '</i>';
}
module.exports = { compareText };
