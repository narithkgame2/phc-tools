// The post composer: Japanese facts from a glossary, English house style, claims left out, unknown lines reported.
const assert = require('assert');
const C = require('../engines/compose.js');
const { parsePost, extractFeatures } = require('../engines/postparse.js');
let passed = 0, total = 0;
function t(name, fn) { total++; try { fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); } catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); } }
const POST = '#ForSale $35,000\n\nRESIDENCE L | 1BR UNIT\n📍 Boeung Tumpun, Phnom Penh\n\n✅ Unit G10-09 | 9th Floor\n✅ 1 Bedroom | 1 Bathroom\n✅ 47㎡ Gross | 38㎡ Net\n✅ Strata Title\n✅ Fully Furnished\n✅ Swimming Pool & Gym\n✅ Coffee Shop\n✅ Convenience Store\n✅ Laundry Room\n✅ Great Investment Opportunity\n✅ Strong Rental Demand\n✅ Hanging Gardens of Babylon\n💰 Selling Price: $35,000\n📞 096 96 61 555\n🏠 t.me/NickREAKH';

t('feature lines are taken from a post without the structured facts, the phone number or the price', () => {
  const f = extractFeatures(POST);
  assert.deepStrictEqual(f, ['Strata Title', 'Fully Furnished', 'Swimming Pool & Gym', 'Coffee Shop', 'Convenience Store', 'Laundry Room', 'Great Investment Opportunity', 'Strong Rental Demand', 'Hanging Gardens of Babylon']);
  assert.deepStrictEqual(parsePost(POST, { places: [] }).features, f);
});
t('facts are translated from the glossary, claims are left out, unknown lines are reported', () => {
  const s = C.sortFeatures(extractFeatures(POST));
  assert.deepStrictEqual(s.facts, ['区分所有権（ストラタタイトル）', '家具付き', 'プール・ジム', 'カフェ', 'コンビニ', 'ランドリールーム']);
  assert.deepStrictEqual(s.claims, ['Great Investment Opportunity', 'Strong Rental Demand']);
  assert.deepStrictEqual(s.unknown, ['Hanging Gardens of Babylon']);
});
t('glossary: orientation, corner, balcony, views, floors and titles', () => {
  const jp = (x) => C.translateFeature(x).jp;
  assert.strictEqual(jp('North Facing'), '北向き'); assert.strictEqual(jp('South-East Facing'), '南東向き'); assert.strictEqual(jp('Corner Unit (North-East)'), '角部屋（北東向き）');
  assert.strictEqual(jp('Private Balcony'), '専用バルコニー'); assert.strictEqual(jp('High Floor City View'), '高層階からのシティビュー'); assert.strictEqual(jp('Hard Title'), 'ハードタイトル');
  assert.strictEqual(jp('Studio Unit'), 'スタジオタイプ'); assert.strictEqual(jp('Under Construction'), '建設中'); assert.strictEqual(jp('Move-In Ready'), 'すぐに入居可能');
});
t('promotional claims are never translated', () => {
  ['Strong Long-Term Growth Potential', 'High rental demand', 'Ideal for Living or Investment', 'Affordable Entry Price', 'Guaranteed 8% return'].forEach((x) => assert.strictEqual(C.translateFeature(x).kind, 'claim', x));
});
t('the Japanese post has the card, a facts list, the availability line and the two links, and reports what it left out', () => {
  const r = C.composeJP({ card: '<blockquote>CARD</blockquote>', features: extractFeatures(POST), availLine: '※空室状況と価格は確認します。', lineUrl: 'https://line.me/x', botLink: 'https://t.me/Bot?start=RL-6001' });
  assert.ok(r.text.startsWith('<b>新着物件</b>') && /<b>特徴<\/b>\n・区分所有権（ストラタタイトル）\n・家具付き/.test(r.text) && /Start|start=RL-6001/.test(r.text) && /line\.me/.test(r.text));
  assert.ok(!/Investment|Rental Demand|Hanging/.test(r.text), 'no English claim or unknown line in the Japanese post');
  assert.deepStrictEqual(r.left.unknown, ['Hanging Gardens of Babylon']); assert.strictEqual(r.left.claims.length, 2);
});
t('the English house-style post follows the layout of the channel and keeps claims out', () => {
  const u = { name: 'Residence L', type: 'buy', price: 35000, beds: 1, floor: '9', unitNo: 'G10-09', net: 38, gross: 47, area: 'Others', features: extractFeatures(POST) };
  const r = C.composeEN(u, { khan: 'Mean Chey', footer: 'Message Nick on Telegram' });
  assert.ok(r.text.startsWith('#ForSale $35,000\n\n𝗥𝗘𝗦𝗜𝗗𝗘𝗡𝗖𝗘 𝗟 | 𝟭𝗕𝗥 𝗨𝗡𝗜𝗧\n📍 Mean Chey, Phnom Penh'));
  assert.ok(/✅ Unit G10-09 \| 9th Floor/.test(r.text) && /✅ 47㎡ Gross \| 38㎡ Net/.test(r.text) && /✅ Strata Title/.test(r.text) && /💰 Selling Price: \$35,000/.test(r.text) && /Message Nick on Telegram$/.test(r.text));
  assert.ok(!/Great Investment|Strong Rental/.test(r.text)); assert.deepStrictEqual(r.left.claims, ['Great Investment Opportunity', 'Strong Rental Demand']);
});
t('a rental post says monthly rent', () => {
  const r = C.composeEN({ name: 'Odom Living', type: 'rent', price: 1200, beds: 2, area: 'Tonle Bassac', features: [] }, {});
  assert.ok(/^#ForRent \$1,200\/month/.test(r.text) && /Monthly Rent: \$1,200/.test(r.text));
});
console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
process.exit(passed === total ? 0 : 1);
