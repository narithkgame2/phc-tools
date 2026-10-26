// The Japanese post, line by line (the Content Bot way): layout kept, tables first, Google only for the rest, claims left out.
const assert = require('assert');
const { buildJP, linesToTranslate, mapTitleWords, factLine } = require('../engines/jpline.js');
let passed = 0, total = 0;
function t(name, fn) { total++; try { fn(); passed++; console.log('  ✅ Test ' + total + ': ' + name); } catch (e) { console.log('  ❌ Test ' + total + ': ' + name + '\n     ' + e.message); } }
const B = (s) => s.replace(/[A-Z]/g, (c) => String.fromCodePoint(0x1D5D4 + c.charCodeAt(0) - 65)).replace(/[0-9]/g, (c) => String.fromCodePoint(0x1D7EC + c.charCodeAt(0) - 48));

t('title words and fact lines come from the tables', () => {
  assert.strictEqual(mapTitleWords('1BR RESALE'), '1ベッドルーム・リセール');
  assert.strictEqual(mapTitleWords('4BR DUPLEX'), '4ベッドルーム・デュープレックス');
  assert.strictEqual(mapTitleWords('2BR UNIT'), '2ベッドルーム');
  assert.strictEqual(mapTitleWords('SKY GARDEN SUITE'), null, 'unknown words go to the translator');
  assert.strictEqual(factLine('32 sqm net / 41 sqm gross'), '32㎡（専有） | 41㎡（総面積）');
  assert.strictEqual(factLine('Studio | 1 Bath'), 'スタジオ | 1バスルーム');
  assert.strictEqual(factLine('Floor 12'), '12階');
});
t('bold sans serif titles and headings stay bold, names are never translated', () => {
  const src = '#ForSale $185,000\n\n' + B('GATO TOWER | 2BR UNIT') + '\n📍 BKK1, Phnom Penh\n\n' + B('UNIT DETAILS') + '\n✅ 2 Bedrooms | 2 Bathrooms\n✅ 85 sqm';
  const r = buildJP(src, [], { phone: '096 96 61 555' });
  assert.ok(r.text.includes('#売出中 $185,000') && r.text.includes('<b>GATO TOWER | 2ベッドルーム</b>') && r.text.includes('<b>物件情報</b>') && r.text.includes('✅ 2ベッドルーム | 2バスルーム') && r.text.includes('✅ 85㎡'), r.text);
});
t('rent: the monthly price, and only unknown lines are sent to Google', () => {
  const src = '#ForRent $650/month\n\nODOM LIVING | 1BR UNIT\n\nUNIT DETAILS\n✅ 1 Bedroom\n✅ Pet friendly\n✅ Fully furnished';
  assert.deepStrictEqual(linesToTranslate(src, [], {}), ['Pet friendly']);
  const r = buildJP(src, [], { mt: { 'Pet friendly': 'ペット可' }, rent: true });
  assert.ok(r.text.includes('#賃貸 $650/月') && r.text.includes('✅ ペット可') && r.text.includes('✅ 家具付き'), r.text);
  assert.deepStrictEqual(r.left.machine, ['Pet friendly']);
});
t('promotional claims and the source contact block are left out', () => {
  const src = 'X | 1BR UNIT\n✅ Great investment opportunity\n✅ High rental demand\n\n――――――――――\n📞 012 345 678\n📱 t.me/someagent';
  const r = buildJP(src, [], { phone: '096 96 61 555' });
  assert.ok(!/investment|demand|012 345|someagent/.test(r.text) && r.text.endsWith('📞 096 96 61 555'), r.text);
  assert.strictEqual(r.left.claims.length, 2);
});
t('a reduced price shows the old one crossed out on every price line', () => {
  const r = buildJP('#ForSale $98,000\n\nTS | 1BR UNIT\n\n💰 Selling Price: $98,000', [], { price: 94000, priceFrom: 98000 });
  assert.ok(r.text.includes('#売出中 <s>$98,000</s> → $94,000') && r.text.includes('💰 販売価格：<s>$98,000</s> → $94,000'), r.text);
});
t('without a translation the English line stays and is reported', () => {
  const r = buildJP('X | 1BR UNIT\n✅ Walk-in closet', [], {});
  assert.ok(r.text.includes('✅ Walk-in closet')); assert.deepStrictEqual(r.left.unknown, ['Walk-in closet']);
});
console.log('\nRESULTS: ' + passed + ' / ' + total + ' TESTS PASSED (' + Math.round(passed / total * 100) + '%)');
process.exit(passed === total ? 0 : 1);
