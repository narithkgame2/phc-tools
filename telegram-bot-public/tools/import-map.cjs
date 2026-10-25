// Turns Nick's Google My Maps "Cambodia Property Map" into config/places.json: every condo and development point with its
// khan (district) and sangkat, found by point-in-polygon against the map's own boundary layers.
// Usage: node tools/import-map.cjs "<path to Cambodia Property Map.kml or the kml?forcekml=1 link>"
// The downloaded .kml is only a link to the live map, so the script follows it. The map is public data; nothing secret is read.
const fs = require('fs');
const path = require('path');

const dec = (s) => String(s || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
const tag = (block, name) => { const m = block.match(new RegExp('<' + name + '>([\\s\\S]*?)</' + name + '>')); return m ? dec(m[1]) : ''; };
const nums = (block) => { const m = block.match(/<coordinates>([\s\S]*?)<\/coordinates>/); return m ? m[1].trim().split(/\s+/).filter((x) => x.includes(',')).map((x) => x.split(',').slice(0, 2).map(Number)) : []; };
const { inside, buttonArea } = require('../engines/places.js');
const PROJECT_FOLDERS = /^(New Developments|Time Square Projects|Finished Condos|Serviced Apartments)/i;

async function main() {
  let src = process.argv[2];
  if (!src) { console.error('Give the map file or link.'); process.exit(1); }
  let kml = /^https:/.test(src) ? await (await fetch(src)).text() : fs.readFileSync(src, 'utf8');
  const link = kml.match(/<NetworkLink>[\s\S]*?<href>([\s\S]*?)<\/href>/);
  if (link && !/<Placemark>/.test(kml)) kml = await (await fetch(dec(link[1]))).text();
  const folders = {};
  kml.split('<Folder>').slice(1).forEach((f) => { folders[tag(f, 'name')] = f.split('<Placemark>').slice(1).map((p) => ({ name: tag(p, 'name'), pts: nums(p), isPoint: /<Point>/.test(p) })); });
  const khanKey = Object.keys(folders).find((k) => /^Khan/i.test(k)), sangkatKey = Object.keys(folders).find((k) => /^Sangkat/i.test(k));
  if (!khanKey || !sangkatKey) throw new Error('The map needs the Khan and Sangkat layers.');
  const find = (layer, pt) => { const hit = folders[layer].find((p) => p.pts.length > 2 && inside(pt, p.pts)); return hit ? hit.name : ''; };
  const places = [];
  Object.keys(folders).filter((k) => PROJECT_FOLDERS.test(k)).forEach((layer) => {
    folders[layer].forEach((p) => {
      if (!p.name || !p.pts.length) return;
      const [lng, lat] = p.pts[0];
      const khan = find(khanKey, [lng, lat]), sangkat = find(sangkatKey, [lng, lat]);
      places.push({ name: p.name, layer: layer.replace(/\s*\(.*$/, ''), lat: +lat.toFixed(6), lng: +lng.toFixed(6), khan, sangkat: sangkat.replace(/^Sangkat /, ''), area: buttonArea(khan, sangkat) });
    });
  });
  const round = (pts) => pts.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]);
  const layer = (key) => folders[key].filter((p) => p.pts.length > 2).map((p) => ({ name: p.name.replace(/^Sangkat /, ''), rings: [round(p.pts)] }));
  fs.writeFileSync(path.join(__dirname, '..', 'config', 'boundaries.json'), JSON.stringify({ built: new Date().toISOString().slice(0, 10), khans: layer(khanKey), sangkats: layer(sangkatKey) }));
  const out = path.join(__dirname, '..', 'config', 'places.json');
  fs.writeFileSync(out, JSON.stringify({ built: new Date().toISOString().slice(0, 10), source: 'Cambodia Property Map (Google My Maps)', khans: folders[khanKey].map((p) => p.name), places }, null, 1));
  console.log('places.json written: ' + places.length + ' places, ' + folders[khanKey].length + ' khans');
}
main().catch((e) => { console.error(e.message); process.exit(1); });
