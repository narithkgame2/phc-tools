// The translator client: sends only the lines, the key and the protected names; a failure never breaks posting.
const assert = require('assert');
const { createTranslator } = require('../engines/translate.js');
let passed = 0, total = 0;
async function t(name, fn) { total++; try { await fn(); passed++; console.log('  ✅ Test ' + total + ': ' + name); } catch (e) { console.log('  ❌ Test ' + total + ': ' + name + '\n     ' + e.message); } }
(async () => {
  await t('off without settings', () => { assert.strictEqual(createTranslator({}), null); assert.strictEqual(createTranslator({ url: 'x' }), null); });
  await t('sends key, lines and protected names, maps the answer back', async () => {
    let sent; const tr = createTranslator({ url: 'https://script.example/exec', key: 'K', fetchImpl: async (u, o) => { sent = JSON.parse(o.body); return { json: async () => ({ ok: true, out: ['ウォークインクローゼット', 'BKK1の眺望'] }) }; } });
    const map = await tr(['Walk-in closet', 'View of BKK1'], ['Time Square 5']);
    assert.strictEqual(sent.key, 'K'); assert.deepStrictEqual(sent.lines, ['Walk-in closet', 'View of BKK1']); assert.ok(sent.keep.includes('BKK1') && sent.keep.includes('Time Square 5'));
    assert.deepStrictEqual(map, { 'Walk-in closet': 'ウォークインクローゼット', 'View of BKK1': 'BKK1の眺望' });
  });
  await t('a refused key or a network error gives an empty answer, not a crash', async () => {
    const quiet = console.error; console.error = () => {};
    const a = createTranslator({ url: 'u', key: 'k', fetchImpl: async () => ({ json: async () => ({ ok: false, error: 'not allowed' }) }) });
    const b = createTranslator({ url: 'u', key: 'k', fetchImpl: async () => { throw new Error('offline'); } });
    assert.deepStrictEqual(await a(['x']), {}); assert.deepStrictEqual(await b(['x']), {});
    console.error = quiet;
  });
  console.log('\nRESULTS: ' + passed + ' / ' + total + ' TESTS PASSED (' + Math.round(passed / total * 100) + '%)');
  process.exit(passed === total ? 0 : 1);
})();
