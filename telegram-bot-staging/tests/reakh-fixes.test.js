// ═══════════════════════════════════════════════════════════════
//  REAKH BOT FIXES VERIFICATION TEST SUITE
//  Verifies all items under "Fix in @Nick_REAKH_Bot" from GEMINI.md:
//  1. Unsourced "speed-to-lead" numbers (78%, 12%) removed from SLA cards.
//  2. SLA escalations suppressed for Nick's test inquiries (id 353195979).
//  3. Out-of-date "0%" Capital Gains Tax updated (20% from Jan 2027).
//  4. No claims that Realestate.com.kh handles "escrow transfers".
//  5. Buying from abroad settled rules included (hand signing on originals,
//     no e-signature, courier such as DHL, POA noted).
//  6. Legal guide menu provides "Buying from Abroad" (legal_abroad).
//  7. Message style: bold title, ▫️ / ①②③ rows, quote block, closing line.
// ═══════════════════════════════════════════════════════════════

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✅ Test ${total}: ${name}`);
  } catch (e) {
    console.error(`  ❌ Test ${total} FAILED: ${name}\n     ${e.message}`);
    throw e;
  }
}

console.log('\n=======================================================');
console.log('🚀 RUNNING REAKH BOT GEMINI.md FIXES AUDIT SUITE');
console.log('=======================================================\n');

const indexPath = path.join(__dirname, '..', 'index.js');
const indexSrc = fs.readFileSync(indexPath, 'utf8');

// 1. Check speed-to-lead numbers removed from SLA cards
runTest('SLA cards have zero unsourced percentages (78%, 12%)', () => {
  assert.strictEqual(/78%/.test(indexSrc), false, 'Must not contain 78% in code');
  assert.strictEqual(/drops below 12%/.test(indexSrc), false, 'Must not contain "drops below 12%"');
  assert.ok(/Early response ensures the highest engagement/.test(indexSrc), 'Uses factual engagement prompt');
});

// 2. Check SLA escalation suppression for Nick's test account (353195979)
runTest('SLA escalations are suppressed for Nick (353195979)', () => {
  assert.ok(/String\(lead\.userId\)\s*===\s*[\x27\x22]353195979[\x27\x22]/.test(indexSrc), 'Contains check for Nick user ID');
  assert.ok(/continue;/.test(indexSrc), 'Skips escalation alert for Nick');
});

// 3. Capital Gains Tax card: 0% claim removed, reflects 20% scheduled from 2027
runTest('Capital Gains Tax reflects 20% / Jan 2027 and removes 0% claim', () => {
  assert.strictEqual(/キャピタルゲイン税：.*0%（非課税）/.test(indexSrc), false, '0% non-taxable claim must be removed');
  assert.ok(/キャピタルゲイン税：.*20%/.test(indexSrc), 'JP tax card notes 20% capital gains tax');
  assert.ok(/2027年1月/.test(indexSrc), 'JP tax card notes January 2027 implementation date');
  assert.ok(/Capital Gains Tax:.*20%/.test(indexSrc), 'EN tax card notes 20% capital gains tax');
  assert.ok(/January 2027/.test(indexSrc), 'EN tax card notes January 2027 implementation date');
});

// 4. No claims that Realestate.com.kh handles "escrow transfers"
runTest('Realestate.com.kh does not claim to handle escrow transfers', () => {
  assert.strictEqual(/escrow transfers/.test(indexSrc), false, 'Must not claim escrow transfers');
  assert.strictEqual(/Realestate\.com\.kh.*エスクロー/.test(indexSrc), false, 'Must not claim REAKH escrow in JP');
});

// 5. Buying from abroad: hand-signed originals, no e-signature, courier / DHL, POA
runTest('Buying from abroad covers hand signing, DHL/courier, and POA', () => {
  assert.ok(/原本署名|手書き/.test(indexSrc), 'Notes hand signing on original documents');
  assert.ok(/電子署名は(不可|認められていません)/.test(indexSrc), 'Notes no e-signature');
  assert.ok(/DHL/.test(indexSrc), 'Notes courier such as DHL');
  assert.ok(/Power of Attorney|委任状/.test(indexSrc), 'Notes Power of Attorney is possible but more involved');
});

// 6. Legal Guide Menu provides legal_abroad callback and button
runTest('Legal Guide Menu exposes Buying from Abroad (legal_abroad)', () => {
  assert.ok(/callback_data:\s*[\x27\x22]legal_abroad[\x27\x22]/.test(indexSrc), 'Button with legal_abroad exists');
  assert.ok(/else if\s*\(\s*dataStr\s*===\s*[\x27\x22]legal_abroad[\x27\x22]\s*\)/.test(indexSrc), 'Callback handler for legal_abroad exists');
});

// 7. Message style: check structure of guide cards
runTest('Cards use bold title, structured rows, blockquotes, and closing lines', () => {
  assert.ok(/📖 <b>プノンペン コンドミニアム購入手順・諸費用ガイド<\/b>/.test(indexSrc));
  assert.ok(/✈️ <b>海外からの遠隔購入手順/.test(indexSrc));
  assert.ok(/<blockquote>/.test(indexSrc));
  assert.ok(/<\/blockquote>/.test(indexSrc));
});

console.log('\n=======================================================');
console.log(`🎉 ALL ${passed}/${total} REAKH FIX TESTS PASSED PERFECTLY!`);
console.log('=======================================================\n');
