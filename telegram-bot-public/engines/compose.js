// Builds the full post for a channel from a unit's facts and the feature lines of the original post.
//  - Japanese (plain, for @Nick_Cambodia): facts only. Lines that are facts about the unit are translated from a glossary taken from
//    Nick's own posts; promotional claims (growth, demand, "great opportunity") are LEFT OUT on purpose, and anything the glossary does
//    not know is reported back so a person can translate it.
//  - English (house style, for @NickREAKH): the layout of Nick's channel posts, with bold sans-serif headings.
// Nothing here guesses a translation. Unknown lines are returned in `unknown`.
const FEATURE_SKIP = /bedrooms?|bathrooms?|^floor\b|\bfloor\s*[:#]?\s*\d|\d+(?:st|nd|rd|th)?\s*floor|^unit\s|\d.*(?:sqm|㎡|m2|m²)|price|booking|payment|installment|handover|deposit|property id|message me|\$|^(?:unit details|features|facilities|payment plan|resale highlights)$/i;
const CLAIM = /invest|growth|potential|demand|yield|guarantee|return|apprecia|capital|\bbest\b|prime|rare|exclusive|opportunit|affordable|bargain|luxur|ideal for|perfect for|strong|great |amazing|high-?demand|hot |must see/i;

const DIRS = { north: '北', south: '南', east: '東', west: '西' };
const RULES = [
  [/^fully furnished$/i, () => '家具付き'], [/^(?:partly|semi)[- ]furnished$/i, () => '一部家具付き'], [/^unfurnished$/i, () => '家具なし'], [/^move[- ]in ready$/i, () => 'すぐに入居可能'],
  [/strata title/i, () => '区分所有権（ストラタタイトル）'], [/hard title/i, () => 'ハードタイトル'], [/soft title/i, () => 'ソフトタイトル'], [/freehold/i, () => '所有権（フリーホールド）'],
  [/(?:swimming )?pool\b.*(?:gym|fitness)|(?:gym|fitness).*pool/i, () => 'プール・ジム'], [/swimming pool|\bpool\b/i, () => 'プール'], [/\bgym\b|fitness/i, () => 'ジム'],
  [/coffee shop|\bcafe\b|café/i, () => 'カフェ'], [/convenience store|mini ?mart/i, () => 'コンビニ'], [/laundry/i, () => 'ランドリールーム'], [/sauna/i, () => 'サウナ'],
  [/parking/i, () => '駐車場'], [/24 ?(?:h|hr|hours?)? ?security|security/i, () => 'セキュリティ'], [/elevator|\blift\b/i, () => 'エレベーター'], [/rooftop/i, () => 'ルーフトップ'],
  [/playground/i, () => '子供の遊び場'], [/co-?working/i, () => 'コワーキングスペース'], [/\bspa\b/i, () => 'スパ'], [/^(?:communal |rooftop |private )?garden$/i, () => 'ガーデン'],
  [/^(north|south|east|west)(?:[- ]?(east|west))?[- ]facing$/i, (m) => (DIRS[m[1].toLowerCase()] + (m[2] ? DIRS[m[2].toLowerCase()] : '') + '向き')],
  [/^corner unit(?: \((.*?)\))?$/i, (m) => '角部屋' + (m[1] ? '（' + (m[1].replace(/(north|south|east|west)(?:[- ]?(east|west))?/i, (a, x, y) => DIRS[x.toLowerCase()] + (y ? DIRS[y.toLowerCase()] : '')) + '向き') + '）' : '')],
  [/bright corner unit/i, () => '角部屋（明るい間取り）'], [/private balcony/i, () => '専用バルコニー'], [/balcony/i, () => 'バルコニー'],
  [/high floor city view/i, () => '高層階からのシティビュー'], [/city (?:&|and) pool view/i, () => '市街とプールの眺望'], [/city view/i, () => 'シティビュー'], [/pool view/i, () => 'プールビュー'], [/river view/i, () => 'リバービュー'],
  [/high floor/i, () => '高層階'], [/^studio(?: unit)?$/i, () => 'スタジオタイプ'], [/duplex/i, () => 'メゾネット（デュープレックス）'], [/penthouse/i, () => 'ペントハウス'],
  [/under construction/i, () => '建設中'], [/resale(?: unit)?/i, () => 'リセール物件'], [/bright living space/i, () => '明るいリビング'],
];
function translateFeature(line) {
  const t = String(line || '').replace(/^[✅▫️•\-–\s]+/, '').trim();
  if (!t) return { kind: 'skip', en: t };
  if (CLAIM.test(t) && !/\$|\d\s*%/.test(t)) return { kind: 'claim', en: t }; // a promotional claim, whatever else the line says
  if (FEATURE_SKIP.test(t)) return { kind: 'skip', en: t };
  for (const [re, f] of RULES) { const m = t.match(re); if (m) return { kind: 'fact', en: t, jp: f(m) }; }
  if (CLAIM.test(t)) return { kind: 'claim', en: t };
  return { kind: 'unknown', en: t };
}
function sortFeatures(features) {
  const out = { facts: [], claims: [], unknown: [] }, seen = new Set();
  (features || []).forEach((l) => {
    const r = translateFeature(l); if (r.kind === 'skip') return;
    const k = r.kind === 'fact' ? r.jp : r.en.toLowerCase(); if (seen.has(k)) return; seen.add(k);
    if (r.kind === 'fact') out.facts.push(r.jp); else if (r.kind === 'claim') out.claims.push(r.en); else out.unknown.push(r.en);
  });
  return out;
}

// ---- Japanese post
function composeJP(o) {
  // o: { card (the unit's card block, HTML), features, availLine, lineUrl, botLink }
  const f = sortFeatures(o.features);
  const parts = ['<b>新着物件</b>', '', o.card];
  if (f.facts.length) parts.push('', '<b>特徴</b>', f.facts.map((x) => '・' + x).join('\n'));
  parts.push('', '<i>' + o.availLine + '</i>');
  const links = [];
  if (o.botLink) links.push('<a href="' + o.botLink + '">ボットで条件に合う物件を探す</a>');
  if (o.lineUrl) links.push('<a href="' + o.lineUrl + '">LINEでNickに相談</a>');
  if (links.length) parts.push(links.join('\n'));
  return { text: parts.join('\n'), left: { claims: f.claims, unknown: f.unknown } };
}

// ---- English house style
const BOLD = (s) => String(s).replace(/[A-Za-z0-9]/g, (c) => {
  const code = c.charCodeAt(0);
  if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + code - 65);
  if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + code - 97);
  return String.fromCodePoint(0x1D7EC + code - 48);
});
function composeEN(u, o) {
  const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const rent = u.type === 'rent';
  const beds = u.beds === 0 ? 'STUDIO' : u.beds ? u.beds + 'BR' : '';
  const title = BOLD((u.name + (beds ? ' | ' + beds + ' UNIT' : '')).toUpperCase());
  const lines = [(rent ? '#ForRent ' + usd(u.price) + '/month' : '#ForSale ' + usd(u.price)), '', title, '📍 ' + (u.area && u.area !== 'Others' ? u.area : (o.khan || '')) + (u.area || o.khan ? ', ' : '') + 'Phnom Penh', '', '――――――――――', '', BOLD('UNIT DETAILS')];
  if (u.unitNo || u.floor) lines.push('✅ ' + [u.unitNo ? 'Unit ' + u.unitNo : '', u.floor ? ordinal(u.floor) + ' Floor' : ''].filter(Boolean).join(' | '));
  if (u.beds !== undefined && u.beds !== '') lines.push('✅ ' + (u.beds === 0 ? 'Studio' : u.beds + ' Bedroom' + (u.beds > 1 ? 's' : '')));
  const sizes = [u.gross ? u.gross + '㎡ Gross' : '', u.net ? u.net + '㎡ Net' : ''].filter(Boolean);
  if (sizes.length) lines.push('✅ ' + sizes.join(' | ')); else if (u.sqm) lines.push('✅ ' + u.sqm + '㎡');
  if (u.tenanted) lines.push('✅ Tenanted' + (u.tenantNote ? ': ' + u.tenantNote : ''));
  const all = (u.features || []).map((x) => String(x).replace(/^[✅▫️•\-–\s]+/, '').trim()).filter((x) => x && !FEATURE_SKIP.test(x));
  const claims = all.filter((x) => CLAIM.test(x)); // promotional claims stay out of the draft; Nick may add one back by hand
  all.filter((x) => !CLAIM.test(x)).slice(0, 10).forEach((x) => lines.push('✅ ' + x));
  lines.push('', '💰 ' + (rent ? 'Monthly Rent: ' : 'Selling Price: ') + usd(u.price) + (rent ? '' : ''));
  if (o.footer) lines.push('', '――――――――――', o.footer);
  return { text: lines.join('\n'), left: { claims } };
}
function ordinal(n) { const v = Number(n); if (!v) return String(n); const s = ['th', 'st', 'nd', 'rd'], m = v % 100; return v + (s[(m - 20) % 10] || s[m] || s[0]); }

module.exports = { translateFeature, sortFeatures, composeJP, composeEN, BOLD, FEATURE_SKIP };
