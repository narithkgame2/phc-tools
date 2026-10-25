// Turns the Content Bot's Queue tab (downloaded as CSV) into DRAFT rows for the listings Sheet.
// Usage: node tools/import-queue.cjs data/queue.csv [Posted|"Pending Review"|all] > data/queue-drafts.csv
// Nothing it makes can reach clients: every row is status draft, approved no. Nick checks and fills the gaps.
const fs = require('fs');
const { parseCsv } = require('../engines/listings.js');
const { parseSizes } = require('../engines/sizes.js');

const DISTRICTS = [['bkk1', 'BKK1'], ['bkk 1', 'BKK1'], ['bkk2', 'BKK2'], ['bkk3', 'BKK3'], ['toul kork', 'Toul Kork'], ['tuol kork', 'Toul Kork'], ['tonle bassac', 'Tonle Bassac'],
  ['daun penh', 'Daun Penh'], ['toul tompoung', 'TTP'], ['tuol tompoung', 'TTP'], ['ttp', 'TTP'], ['chroy changvar', 'Chroy Changvar'], ['sen sok', 'Sen Sok'], ['boeung tumpun', 'Boeung Tumpun'], ['koh pich', 'Koh Pich']];
const BUTTONS = ['Daun Penh', 'Tonle Bassac', 'BKK1', 'TTP', 'Toul Kork'];

const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
const HEAD = 'Ref,Status,Source,Buy or Rent,Project,Area,Price (USD),Monthly rent (USD),Size (sqm),Net size (sqm),Gross size (sqm),Bedrooms,Net yield (%),Photo link,Note (Japanese),Note (English),Last checked,To check,Source link,Posted on,Tenanted,Tenancy note,Floor,Unit number';

function clean(content) {
  return String(content || '').normalize('NFKC') // styled bold letters become plain letters
    .split(/\r?\n/).filter((l) => !/(📞|🏠|📱|t\.me\/|^\s*[―\-─]{3,}\s*$)/.test(l)).join('\n');
}
function facts(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const priceBuy = (text.match(/#ForSale[^\d$]*\$\s*([\d,]+)/i) || [])[1];
  const priceRent = (text.match(/#ForRent[^\d$]*\$\s*([\d,]+)/i) || [])[1];
  const titleLine = lines.find((l) => l && !l.startsWith('#') && !l.startsWith('📍') && !/^(UNIT DETAILS|FEATURES|PAYMENT PLAN|RESALE HIGHLIGHTS)$/i.test(l)) || '';
  const pinLine = (lines.find((l) => l.startsWith('📍')) || '').replace(/^📍\s*/, '').trim();
  const titleHead = titleLine.split('|')[0].trim();
  const hay = (titleLine + ' ' + pinLine).toLowerCase();
  const d = DISTRICTS.find(([k]) => hay.includes(k));
  const BY_PROJECT = [['time square 7', 'Toul Kork'], ['time square 9', 'BKK1'], ['time square 5', 'BKK1'], ['odom', 'Tonle Bassac'], ['j tower 3', 'Tonle Bassac'], ['norea', 'Tonle Bassac'], ['diamond bay', 'Tonle Bassac'], ['gato', 'BKK1'], ['picasso', 'BKK1'], ['le conde', 'BKK1']];
  const byProject = BY_PROJECT.find(([k]) => hay.includes(k));
  const district = d ? d[1] : (byProject ? byProject[1] : '');
  const isArea = (s) => !s || DISTRICTS.some(([k]) => s.toLowerCase().includes(k)) || /phnom penh|district|blvd|street|st\./i.test(s);
  const junk = (s) => !/[A-Za-z]{3}/.test(s) || /^(key features|\d+\s?br\b)/i.test(s.replace(/^[^A-Za-z0-9]+/, '')) || /^[^A-Za-z0-9]/.test(s) || /sihanoukville|siem reap|beachfront/i.test(s);
  const name = [pinLine, titleHead].find((s) => s && !isArea(s) && !junk(s)) || '';
  const faraway = /sihanoukville|siem reap|kampot|kep\b|beachfront|time square 10|otres/i.test(titleLine + ' ' + pinLine);
  const sizes = parseSizes(text); // net and gross come from the post's own labels; an unlabelled size goes to Size (sqm) for a person to decide
  const floorM = /\d+(?:st|nd|rd|th)\s*[–-]\s*\d+/.test(text) ? null : (text.match(/floor\s*[:#]?\s*(\d{1,2})(?:st|nd|rd|th)?\b/i) || text.match(/(\d{1,2})(?:st|nd|rd|th)\s*floor/i));
  const unitM = text.match(/unit\s+([A-Z]?\d[\w-]*\d)\b/i) || text.match(/floor:\s*\d+(?:st|nd|rd|th)\s*\((\w+)\)/i);
  const tenantM = /\btenanted\b/i.test(text) ? (text.match(/(\d+-?\s*year lease[^\n]*)/i) || [])[1] : null;
  const beds = (text.match(/(\d)\s*(?:bedrooms?|BR\b|Schlafzimmer)/i) || text.match(/bedrooms?:\s*(\d)/i) || [])[1];
  return {
    faraway, buy: priceBuy && Number(priceBuy.replace(/,/g, '')) >= 1000 ? priceBuy.replace(/,/g, '') : '', rent: priceRent && Number(priceRent.replace(/,/g, '')) >= 100 ? priceRent.replace(/,/g, '') : '', name, district,
    sqm: sizes.plain ? String(sizes.plain) : '', net: sizes.net ? String(sizes.net) : '', gross: sizes.gross ? String(sizes.gross) : '',
    floor: floorM ? floorM[1] : '', unit: unitM ? unitM[1] : '', tenanted: /\btenanted\b/i.test(text), tenantNote: tenantM ? tenantM.replace(/^✅\s*/, '').trim() : '', beds: beds || '', check: [titleLine, pinLine].filter(Boolean).join(' | '),
  };
}

const [file, want = 'Posted'] = process.argv.slice(2);
if (!file) { console.error('Give the Queue CSV file as the first argument.'); process.exit(1); }
const rows = parseCsv(fs.readFileSync(file, 'utf8'));
const groups = new Map();
rows.forEach((r) => {
  if (!/^L\d+-EN$/.test(r.id) || r.language !== 'EN') return; // one English row per listing; JP and DE copies share its facts
  if (want !== 'all' && r.status !== want) return;
  groups.set(r.id.replace(/-EN$/, ''), r);
});
const seen = new Map(); // same name + price = same unit; keep the newest
[...groups.entries()].forEach(([id, r]) => {
  const f = facts(clean(r.content));
  if ((!f.buy && !f.rent) || f.faraway) return; // the bot covers Phnom Penh only
  const key = (f.name || f.check) + '|' + (f.buy || f.rent);
  if (!seen.has(key) || seen.get(key).date < r.createdAt) seen.set(key, { id, r, f, date: r.createdAt });
});
// One-off corrections Nick and I made by hand after reading the first import, keyed by Queue id.
const FIX = {
  L1792402514262: { name: 'Morgan EnMaison' }, L1784374914571: { district: 'TTP' }, L1789621316492: { district: 'Others' },
  L1784425193779: { name: 'Time Square 3', district: 'Toul Kork' }, L1784334593380: { name: 'L Residence' }, L1784717573588: { skip: true },
  L1784780213941: { name: 'Chip Mong Parkland' }, L1784642093930: { name: 'Anata Residence' }, L1784374676699: { name: 'Orkide' }, L1784780634747: { name: 'Time Square 5' },
};
// Same letters rule as the website (phc-website/src/lib/refCode.ts). Units that are not on the website yet get a
// provisional number from 5001 upward, far from the website's (id + 1000) range, and take the real code once published.
const slug = (s) => s.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().split(/[\s_-]+/).filter(Boolean);
const refPrefix = (name) => {
  const seg = slug(name);
  if (!seg.length) return 'PH';
  const letters = seg.length === 1 ? (/\d/.test(seg[0]) ? seg[0] : seg[0].slice(0, 3)) : seg.map((x) => (/\d/.test(x) ? x : x[0])).join('');
  return letters.toUpperCase().slice(0, 6);
};
const title = (s) => s.replace(/\w[\w']*/g, (w) => (w.length > 1 && w === w.toUpperCase() && !/\d/.test(w) ? w[0] + w.slice(1).toLowerCase() : w)).replace(/\bUc\b/, 'UC').replace(/\bTs\b/, 'TS');
const out = [HEAD];
let n = 0;
[...seen.values()].sort((a, b) => (a.date < b.date ? 1 : -1)).forEach(({ id, r, f, date }) => {
  const fix = FIX[id.replace(/-EN$/, '')] || {};
  if (fix.skip) return;
  n++;
  const name = title(fix.name || f.name), d0 = fix.district || f.district;
  const district = BUTTONS.includes(d0) ? d0 : (d0 ? 'Others' : '');
  const todo = ['Still available?'];
  if (!name) todo.push('project name missing');
  if (!district) todo.push('area missing');
  if (f.buy && f.rent) todo.push('rent figure came from the post, verify');
  out.push([refPrefix(name) + '-' + (5000 + n), 'Pending Review', 'Content Queue', f.buy ? 'Buy' : 'Rent', name, district, f.buy, f.rent, f.sqm, f.net, f.gross, f.beds, '', '', '', '', '', todo.join('; '), id, date.slice(0, 10), f.tenanted ? 'Yes' : '', f.tenantNote, f.floor, f.unit].map(q).join(','));
});
process.stdout.write(out.join('\n') + '\n');
console.error('Drafts written: ' + n + ' (from ' + groups.size + ' ' + want + ' listings)');
