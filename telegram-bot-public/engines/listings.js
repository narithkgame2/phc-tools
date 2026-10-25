// Real listings from Nick's Google Sheet (published as CSV). Only rows Nick approved are ever shown.
// Pure functions plus one small loader, so the bot core and the tests stay offline.
const fs = require('fs');

// Minimal CSV reader: quoted fields, doubled quotes, commas and newlines inside quotes.
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const head = (rows.shift() || []).map((h) => h.trim());
  return rows.filter((r) => r.some((x) => x.trim() !== '')).map((r) => { const o = {}; head.forEach((h, i) => { o[h] = (r[i] || '').trim(); }); return o; });
}

const num = (v) => { const n = Number(String(v || '').replace(/[,$\s]/g, '')); return Number.isFinite(n) && n > 0 ? n : 0; };

// Places from Nick's map (config/places.json, built by tools/import-map.cjs): project name -> khan, sangkat, bot area.
const normName = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\(.*?\)/g, '').replace(/\s+-\s+.*$/, '').replace(/[^a-z0-9]/g, '');
const PLACES = require('./places.js');
const NAME_ALIAS = { hresidence: 'residenceh' }; // the same project written two ways in the posts
function placeFor(name, places) {
  const list = (places && places.places) || [];
  let key = normName(name); key = NAME_ALIAS[key] || key;
  if (key.length < 5 || !list.length) return null;
  return list.find((p) => normName(p.name) === key) || (key.length >= 6 ? list.find((p) => { const k = normName(p.name); return k.startsWith(key) && !/\d/.test(k.charAt(key.length)); }) : null) || null;
}
function withPlace(r, places) {
  const p = placeFor(r.project_name, places);
  if (!p) return r;
  return Object.assign({}, r, { district: r.district || p.area, khan: p.khan, sangkat: p.sangkat });
}

// The Sheet uses plain headers ("Price (USD)"); old technical names still work. Same status names as the website admin.
const ALIAS = { ref: 'id', id: 'id', status: 'status', buyorrent: 'type', type: 'type', listingtype: 'type', project: 'project_name', projectname: 'project_name', area: 'district', district: 'district',
  priceusd: 'price_usd', monthlyrentusd: 'rent_usd_month', rentusdmonth: 'rent_usd_month', sizesqm: 'size_sqm', sizebasis: 'size_basis', basis: 'size_basis', bedrooms: 'bedrooms', netyield: 'net_yield_pct', netyieldpct: 'net_yield_pct',
  photolink: 'photo_url', photourl: 'photo_url', notejapanese: 'note_jp', notejp: 'note_jp', noteenglish: 'note_en', noteen: 'note_en', lastchecked: 'last_checked', source: 'source', tenanted: 'tenanted', tenancynote: 'tenant_note', tenantnote: 'tenant_note', unitnumber: 'unit_number', unit: 'unit_number', floor: 'floor', unitfloor: 'floor' };
function normRow(r) {
  const o = {};
  Object.keys(r).forEach((k) => { const a = ALIAS[k.toLowerCase().replace(/[^a-z0-9]/g, '')]; if (a && o[a] === undefined) o[a] = r[k]; });
  return o;
}
// The website calls listings resale, rent, new-launch or ready. For the bot a client either buys or rents.
const kindOf = (t) => { const v = String(t || '').trim().toLowerCase().replace(/[\s_]+/g, '-'); return v === 'rent' ? 'rent' : ['buy', 'resale', 'new-launch', 'ready'].includes(v) ? 'buy' : ''; };
const MAX_AGE_DAYS = 30; // a unit not re-checked for this long hides itself (only when the Last checked cell has a date)
function stale(v, now) {
  if (!v) return false;
  const t = Date.parse(v);
  return Number.isFinite(t) && (now - t) / 86400000 > MAX_AGE_DAYS;
}

// Shown only when the status is Active (website wording) and the facts a client needs are present.
function usable(r, now) {
  const st = String(r.status).trim().toLowerCase();
  if (st !== 'active' && st !== 'preview') return false; // Preview = visible to Nick only, to check how a listing looks
  if (!r.id || !r.project_name || !r.district) return false;
  const type = kindOf(r.type);
  if (type === 'buy') return num(r.price_usd) > 0;
  if (type === 'rent') return num(r.rent_usd_month) > 0;
  return false;
}
function clean(rows, now, places) {
  return rows.map(normRow).map((r) => withPlace(r, places)).filter((r) => usable(r, now)).map((r) => ({
    khan: r.khan || '', sangkat: r.sangkat || '', checked: r.last_checked || '',
    id: r.id, preview: String(r.status).trim().toLowerCase() === 'preview', type: kindOf(r.type), name: r.project_name, district: r.district,
    price: num(r.price_usd), rent: num(r.rent_usd_month), sqm: num(r.size_sqm), beds: r.bedrooms,
    basis: /net|専有|专有|internal/i.test(String(r.size_basis || '')) ? 'net' : /gross|総|延|total|built/i.test(String(r.size_basis || '')) ? 'gross' : '',
    // a dash or a word in the Floor column means no floor
    unit: r.unit_number || '', floor: /\d/.test(r.floor || '') ? String(r.floor).trim() : '', tenanted: /^(yes|y|true|1)$/i.test(String(r.tenanted || '').trim()), tenantNote: r.tenant_note || '',
    partner: /reakh/i.test(String(r.source || '')), netYield: num(r.net_yield_pct), photo: /^https:\/\//.test(r.photo_url) ? r.photo_url : '', noteJp: r.note_jp, noteEn: r.note_en,
  }));
}

// "5万", "80,000", "$80k", "80000" -> number, or 0
function parseAmount(text) {
  const t = String(text || '').replace(/[,，$＄\s]/g, '');
  const m = t.match(/(\d+(?:\.\d+)?)(万|k|K)?/);
  if (!m) return 0;
  const n = Number(m[1]);
  return m[2] === '万' ? n * 10000 : /k/i.test(m[2] || '') ? n * 1000 : n;
}
// English button label or typed text -> [min, max], or null for "no filter"
function range(key) {
  if (!key) return null;
  if (key.startsWith('typed:')) { const n = parseAmount(key.slice(6)); return n ? [n * 0.7, n * 1.15, n] : null; }
  const nums = (key.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
  if (/under/i.test(key) && nums[0]) return [0, nums[0]];
  if (/above/i.test(key) && nums[0]) return [nums[0], Infinity];
  if (nums.length >= 2) return [nums[0], nums[1]];
  return null;
}
const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
function districtOk(l, key) {
  if (!key || key === 'Others' || key === 'No preference') return true;
  if (key.startsWith('typed:')) { const t = norm(key.slice(6)); return !!t && [l.district, l.name, l.khan, l.sangkat].some((x) => norm(x).includes(t)); }
  return norm(l.district) === norm(key);
}
// kind 'buy' or 'rent'; keys = { budget, district } from the client's choices. Returns at most 3.
function match(listings, kind, keys, limit) {
  const r = range(keys.budget);
  const price = (l) => (kind === 'buy' ? l.price : l.rent);
  return (listings || []).filter((l) => l.type === kind && districtOk(l, keys.district) && (!r || (price(l) >= r[0] && price(l) <= r[1])))
    .sort((a, b) => (r && r[2] ? Math.abs(price(a) - r[2]) - Math.abs(price(b) - r[2]) : price(a) - price(b))).slice(0, limit || 3);
}

// Loader with a short cache. source is a file path or an https URL; failure keeps the last good copy.
function makeLoader(source, ttlMs, places) {
  let cache = [], at = 0;
  return async function load() {
    if (!source) return [];
    if (Date.now() - at < (ttlMs || 300000) && at) return cache;
    try {
      const text = /^https:\/\//.test(source) ? await (await fetch(source)).text() : fs.readFileSync(source, 'utf8');
      cache = clean(parseCsv(text), Date.now(), places); at = Date.now();
    } catch (e) { at = at || Date.now() - (ttlMs || 300000) + 30000; }
    return cache;
  };
}
// Website feed (phc-website api/bot-listings): already normalized and already limited to Active rows.
// Only Phnom Penh is shown. Website photos are off by default because they may carry the PHC watermark.
function fromWebsite(json, opts) {
  const showPhotos = !!(opts && opts.photos), places = opts && opts.places, bounds = opts && opts.boundaries;
  return ((json && json.listings) || []).filter((l) => l && l.id && l.name && l.district && /phnom penh/i.test(l.city || 'Phnom Penh')
    && (l.type === 'rent' ? l.rent > 0 : l.price > 0)).map((l) => ({
    ...(() => { const g = (l.lat && l.lng && PLACES.locate(l.lat, l.lng, bounds)) || placeFor(l.name, places) || {}; return { khan: g.khan || '', sangkat: g.sangkat || '' }; })(),
    id: l.id, preview: false, from: !!l.from, type: l.type, name: l.name, district: l.district, price: l.price || 0, rent: l.rent || 0, sqm: l.sqm || 0,
    beds: l.beds || '', floor: l.floor || '', tenanted: !!l.tenanted, tenantNote: l.tenantNote || '', partner: false, netYield: 0,
    photo: showPhotos && /^https:\/\//.test(l.photo) ? l.photo : '', noteJp: '', noteEn: '', source: 'website',
  }));
}
function makeWebsiteLoader(url, ttlMs, opts) {
  let cache = [], at = 0;
  return async function load() {
    if (!url) return [];
    if (at && Date.now() - at < (ttlMs || 300000)) return cache;
    try { const r = await fetch(url); if (r.ok) { cache = fromWebsite(await r.json(), opts); at = Date.now(); } else at = Date.now() - (ttlMs || 300000) + 30000; }
    catch (e) { at = Date.now() - (ttlMs || 300000) + 30000; }
    return cache;
  };
}
// Several sources in one list. A failing source is skipped, never the whole list. First source wins on a repeated id.
function combine(...loaders) {
  return async function load() {
    const out = [], seen = new Set();
    for (const f of loaders) { let rows = []; try { rows = await f(); } catch (e) { rows = []; } rows.forEach((r) => { if (!seen.has(r.id)) { seen.add(r.id); out.push(r); } }); }
    return out;
  };
}
module.exports = { MAX_AGE_DAYS, placeFor, normName, fromWebsite, makeWebsiteLoader, combine, parseCsv, clean, usable, normRow, parseAmount, range, match, makeLoader };
