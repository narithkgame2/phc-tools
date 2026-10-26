// Reads a listing post (text, as posted in the channels or typed by an agent) into facts, so the bot only has to ask about what is missing.
// Used by the agent intake and by tools/import-queue.cjs. Nothing here guesses: a field it cannot find is returned empty.
const { parseSizes } = require('./sizes.js');
const { placeFor } = require('./listings.js');

const DISTRICTS = [['bkk1', 'BKK1'], ['bkk 1', 'BKK1'], ['bkk2', 'BKK2'], ['bkk3', 'BKK3'], ['toul kork', 'Toul Kork'], ['tuol kork', 'Toul Kork'], ['tonle bassac', 'Tonle Bassac'],
  ['daun penh', 'Daun Penh'], ['toul tompoung', 'TTP'], ['tuol tompoung', 'TTP'], ['ttp', 'TTP'], ['chroy changvar', 'Chroy Changvar'], ['sen sok', 'Sen Sok'], ['boeung tumpun', 'Boeung Tumpun'], ['koh pich', 'Koh Pich']];
const BUTTONS = ['Daun Penh', 'Tonle Bassac', 'BKK1', 'TTP', 'Toul Kork'];
const BY_PROJECT = [['time square 7', 'Toul Kork'], ['time square 9', 'BKK1'], ['time square 5', 'BKK1'], ['odom', 'Tonle Bassac'], ['j tower 3', 'Tonle Bassac'], ['norea', 'Tonle Bassac'], ['diamond bay', 'Tonle Bassac'], ['gato', 'BKK1'], ['picasso', 'BKK1'], ['le conde', 'BKK1']];

function clean(content) {
  return String(content || '').normalize('NFKC') // styled bold letters become plain letters
    .split(/\r?\n/).filter((l) => !/(📞|🏠|📱|t\.me\/|^\s*[―\-─]{3,}\s*$)/.test(l)).join('\n');
}
const money = (v, min) => { const n = Number(String(v || '').replace(/,/g, '')); return n >= min ? n : 0; };

function facts(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const priceBuy = (text.match(/#ForSale[^\d$]*\$\s*([\d,]+)/i) || [])[1];
  const priceRent = (text.match(/#ForRent[^\d$]*\$\s*([\d,]+)/i) || [])[1];
  const titleLine = lines.find((l) => l && !l.startsWith('#') && !l.startsWith('📍') && !/^(UNIT DETAILS|FEATURES|PAYMENT PLAN|RESALE HIGHLIGHTS)$/i.test(l)) || '';
  const pinLine = (lines.find((l) => l.startsWith('📍')) || '').replace(/^📍\s*/, '').trim();
  const titleHead = titleLine.split('|')[0].trim();
  const hay = (titleLine + ' ' + pinLine).toLowerCase();
  const d = DISTRICTS.find(([k]) => hay.includes(k));
  const byProject = BY_PROJECT.find(([k]) => hay.includes(k));
  const district = d ? d[1] : (byProject ? byProject[1] : '');
  const isArea = (s) => !s || DISTRICTS.some(([k]) => s.toLowerCase().includes(k)) || /phnom penh|district|blvd|street|st\./i.test(s);
  const junk = (s) => !/[A-Za-z]{3}/.test(s) || /^(key features|\d+\s?br\b)/i.test(s.replace(/^[^A-Za-z0-9]+/, '')) || /^[^A-Za-z0-9]/.test(s) || /sihanoukville|siem reap|beachfront/i.test(s);
  const name = [pinLine, titleHead].find((s) => s && !isArea(s) && !junk(s)) || '';
  const faraway = /sihanoukville|siem reap|kampot|kep\b|beachfront|time square 10|otres/i.test(titleLine + ' ' + pinLine);
  const sizes = parseSizes(text);
  const floorM = /\d+(?:st|nd|rd|th)\s*[–-]\s*\d+/.test(text) ? null : (text.match(/floor\s*[:#]?\s*(\d{1,2})(?:st|nd|rd|th)?\b/i) || text.match(/(\d{1,2})(?:st|nd|rd|th)\s*floor/i));
  const unitM = text.match(/unit\s+([A-Z]?\d[\w-]*\d)\b/i) || text.match(/floor:\s*\d+(?:st|nd|rd|th)\s*\((\w+)\)/i);
  const tenantM = /\btenanted\b/i.test(text) ? (text.match(/(\d+-?\s*year lease[^\n]*)/i) || [])[1] : null;
  const beds = (text.match(/(\d)\s*(?:bedrooms?|BR\b|bed\b|Schlafzimmer)/i) || text.match(/bedrooms?:\s*(\d)/i) || [])[1];
  return {
    faraway, buy: money(priceBuy, 1000), rent: money(priceRent, 100), name, district, plain: sizes.plain || 0, net: sizes.net || 0, gross: sizes.gross || 0,
    floor: floorM ? floorM[1] : '', unit: unitM ? unitM[1] : '', tenanted: /\btenanted\b/i.test(text), tenantNote: tenantM ? tenantM.replace(/^✅\s*/, '').trim() : '',
    beds: beds === undefined ? undefined : Number(beds), studio: /\bstudio\b/i.test(text), check: [titleLine, pinLine].filter(Boolean).join(' | '),
  };
}

// An agent's own wording is looser than the channel format: no hashtags, "Selling price: $35,000", "$650 per month".
function parsePost(raw, places) {
  const text = clean(raw);
  const f = facts(text);
  let buy = f.buy, rent = f.rent;
  if (!buy && !rent) {
    const sale = text.match(/(?:selling price|sale price|asking price|price)\s*[:\-]?\s*\$\s*([\d,]+)/i) || text.match(/\$\s*([\d,]+)\s*(?:for sale|usd for sale)/i);
    const monthly = text.match(/\$\s*([\d,]+)\s*(?:\/|per|a)\s*(?:month|mo)\b/i) || text.match(/(?:monthly rent|rent)\s*[:\-]?\s*\$\s*([\d,]+)/i);
    const any = text.match(/\$\s*([\d,]+)/);
    if (monthly) rent = money(monthly[1], 100);
    if (sale) buy = money(sale[1], 1000);
    if (!buy && !rent && any) { const n = money(any[1], 1); if (/for rent|#forrent|rental/i.test(text)) rent = n >= 100 ? n : 0; else if (/for sale|#forsale|selling|resale/i.test(text) || n >= 10000) buy = n >= 1000 ? n : 0; }
  }
  const wantsRent = /#forrent|for rent|rental|to rent/i.test(text), wantsSale = /#forsale|for sale|selling|resale|for buy/i.test(text);
  let type = '';
  if (buy && !rent) type = 'buy'; else if (rent && !buy) type = 'rent';
  else if (buy && rent) type = wantsRent && !wantsSale ? 'rent' : (wantsSale && !wantsRent ? 'buy' : '');
  const price = type === 'buy' ? buy : type === 'rent' ? rent : (buy || rent || 0);
  // a project the map knows, found anywhere in the text (longest name wins), beats the title heuristics
  let name = f.name;
  const hay = text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
  const known = ((places && places.places) || []).map((p) => p.name).filter((n) => n.length >= 6).sort((a, b) => b.length - a.length)
    .find((n) => hay.includes(n.toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+-\s+.*$/, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()));
  const looksLikeName = (n) => n && n.length <= 40 && !/\$/.test(n) && n.split(',').length <= 2 && !/\d\s*(?:sqm|㎡|m2)/i.test(n) && !/,/.test(n) && !/\b(call|contact|please|near|nice|beautiful|available|sale|rent|price|bedroom)\b/i.test(n);
  if (known) name = known.replace(/\(.*?\)/g, '').replace(/\s+-\s+.*$/, '').trim(); // the verified map beats the title heuristics
  else if (!looksLikeName(name)) name = '';
  const place = name ? placeFor(name, places) : null;
  const area = place ? place.area : (f.district ? (BUTTONS.includes(f.district) ? f.district : 'Others') : '');
  return { name, type, price, rentAlso: buy && rent ? rent : 0, net: f.net, gross: f.gross, plain: f.plain, beds: f.beds !== undefined ? f.beds : (f.studio ? 0 : undefined),
    floor: f.floor, unit: f.unit, area, tenanted: f.tenanted, tenantNote: f.tenantNote, faraway: f.faraway, check: f.check, district: f.district, buy, rent };
}
module.exports = { parsePost, facts, clean, DISTRICTS, BUTTONS };
