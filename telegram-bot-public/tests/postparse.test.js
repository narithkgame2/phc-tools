// Reading listing posts: the channel format and the looser way an agent writes.
const assert = require('assert');
const { parsePost } = require('../engines/postparse.js');
let passed = 0, total = 0;
function t(name, fn) { total++; try { fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }
const places = { places: [{ name: 'Odom Living', khan: 'Chamkar Mon', sangkat: 'Tonle Bassac', area: 'Tonle Bassac' }, { name: 'Agile Sky Residence', khan: 'Boeng Keng Kang', sangkat: 'BKK3', area: 'Others' }, { name: 'Morgan EnMaison', khan: 'Chroy Changvar', sangkat: 'x', area: 'Others' }] };
const pick = (r) => ({ name: r.name, type: r.type, price: r.price, net: r.net, gross: r.gross, plain: r.plain, beds: r.beds, floor: r.floor, area: r.area, unit: r.unit });

t('a channel-format post is read completely, including both sizes, the unit number and the floor', () => {
  const r = parsePost('#ForSale $35,000\n\n𝗥𝗘𝗦𝗜𝗗𝗘𝗡𝗖𝗘 𝗟 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧\n📍 Boeung Tumpun, Phnom Penh\n\n――――――――――\n✅ Unit G10-09 | 9th Floor\n✅ 1 Bedroom | 1 Bathroom\n✅ 47㎡ Gross | 38㎡ Net\n📞 096 96 61 555\n🏠 t.me/NickREAKH', places);
  assert.deepStrictEqual(pick(r), { name: 'RESIDENCE L', type: 'buy', price: 35000, net: 38, gross: 47, plain: 0, beds: 1, floor: '9', area: 'Others', unit: 'G10-09' });
});
t('an agent\'s own wording: no hashtags, "selling price", per month, a project from the verified map wins over a sentence', () => {
  assert.deepStrictEqual(pick(parsePost('Odom Living 2BR for rent $1,200 per month, 90 sqm, floor 20', places)), { name: 'Odom Living', type: 'rent', price: 1200, net: 0, gross: 0, plain: 90, beds: 2, floor: '20', area: 'Tonle Bassac', unit: '' });
  assert.deepStrictEqual(pick(parsePost('Studio, $45,000, size 30 sqm, floor 6, Morgan EnMaison', places)), { name: 'Morgan EnMaison', type: 'buy', price: 45000, net: 0, gross: 0, plain: 30, beds: 0, floor: '6', area: 'Others', unit: '' });
});
t('both a sale and a rent price leave the type open for the agent to choose, and both prices are returned', () => {
  const r = parsePost('Agile Sky Residence 2BR 72 sqm (Gross size) #ForSale $125,000 #ForRent $1,200/month', places);
  assert.strictEqual(r.type, ''); assert.strictEqual(r.buy, 125000); assert.strictEqual(r.rent, 1200); assert.strictEqual(r.gross, 72);
});
t('nothing is guessed from a vague message', () => {
  const r = parsePost('Nice condo near the river, call me', places);
  assert.deepStrictEqual(pick(r), { name: '', type: '', price: 0, net: 0, gross: 0, plain: 0, beds: undefined, floor: '', area: '', unit: '' });
});
t('a far-away project (Sihanoukville, Siem Reap) is flagged so the bot can refuse it', () => {
  assert.strictEqual(parsePost('Condo in Sihanoukville beachfront $65,000', places).faraway, true);
});
console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
process.exit(passed === total ? 0 : 1);
