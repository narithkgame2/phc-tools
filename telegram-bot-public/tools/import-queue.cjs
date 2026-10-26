// Turns the Content Bot's Queue tab (downloaded as CSV) into DRAFT rows for the listings Sheet.
// Usage: node tools/import-queue.cjs data/queue.csv [Posted|"Pending Review"|all] > data/queue-drafts.csv
// Nothing it makes can reach clients: every row is status draft, approved no. Nick checks and fills the gaps.
const fs = require('fs');
const { parseCsv } = require('../engines/listings.js');
const { parseSizes } = require('../engines/sizes.js');

const { facts: rawFacts, clean, BUTTONS } = require('../engines/postparse.js');

const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
const HEAD = 'Ref,Status,Source,Buy or Rent,Project,Area,Price (USD),Monthly rent (USD),Size (sqm),Net size (sqm),Gross size (sqm),Bedrooms,Net yield (%),Photo link,Note (Japanese),Note (English),Last checked,To check,Source link,Posted on,Tenanted,Tenancy note,Floor,Unit number';

// the importer writes strings into CSV cells
function facts(text) {
  const f = rawFacts(text);
  return { faraway: f.faraway, buy: f.buy ? String(f.buy) : '', rent: f.rent ? String(f.rent) : '', name: f.name, district: f.district, sqm: f.plain ? String(f.plain) : '', net: f.net ? String(f.net) : '', gross: f.gross ? String(f.gross) : '',
    floor: f.floor, unit: f.unit, tenanted: f.tenanted, tenantNote: f.tenantNote, beds: f.beds === undefined ? '' : String(f.beds), check: f.check };
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
