// ═══════════════════════════════════════════════════════════════
//  AUTOMATED AUDIT TEST SUITE: SEARCH CONCIERGE & UX RULES
//  Verifies: Zero Truncation, No Silent Relaxation, Quote Blocks,
//  Anchoring Logic, Unpriced Handlers, Callback Uniqueness, UTF-8
// ═══════════════════════════════════════════════════════════════

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const search = require('../engines/search-concierge.js');

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  ✅ Test ${totalCount}: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ Test ${totalCount}: ${name}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n=======================================================');
console.log('🚀 RUNNING PHC SEARCH CONCIERGE & UX AUDIT SUITE');
console.log('=======================================================\n');

try {
  // Test 1: Zero button truncation across all search steps
  runTest("Zero button truncation across all step keyboards (no >14 char buttons in 2-col rows)", () => {
    const stepsToCheck = [
      search.renderStep1(),
      search.renderStep2({ type: 'Sale' }),
      search.renderStep2({ type: 'Rent' }),
      search.renderStep3({ type: 'Sale' }),
      search.renderLocationStep({ type: 'Sale' }),
      search.renderLocationStep({ type: 'Rent' }),
      search.renderBudgetStep({ type: 'Sale' }),
      search.renderBudgetStep({ type: 'Rent' })
    ];

    stepsToCheck.forEach((step, sIdx) => {
      const keyboard = step.reply_markup?.inline_keyboard || [];
      keyboard.forEach((row, rIdx) => {
        if (row.length > 1) {
          row.forEach(btn => {
            const len = btn.text.length;
            assert.ok(
              len <= 14,
              `Step ${sIdx} row ${rIdx} button "${btn.text}" has length ${len} (>14) in a multi-button row!`
            );
          });
        }
      });
    });
  });

  // Test 2: Results screen action buttons are strictly single-column (full width)
  runTest("Results screen action buttons are strictly full-width (1 per row)", () => {
    const sampleState = { type: 'Sale', propType: 'condo', location: 'any', budget: 'any' };
    const res = search.renderResultsCard(sampleState, 1);
    const keyboard = res.reply_markup.inline_keyboard;

    keyboard.forEach((row, idx) => {
      assert.strictEqual(row.length, 1, `Results row ${idx} must contain exactly 1 button for full-width legibility!`);
    });
  });

  // Test 3: Step labeling consistency (Buy = 5 steps, Rent = 4 steps)
  runTest("Step numbering is mathematically consistent (Buy has 5 steps, Rent has 4 steps)", () => {
    const buy1 = search.renderStep1();
    assert.ok(buy1.text.includes("Step 1 of 5"), "Buy Step 1 must say Step 1 of 5");

    const buy2 = search.renderStep2({ type: 'Sale' });
    assert.ok(buy2.text.includes("Step 2 of 5"), "Buy Step 2 must say Step 2 of 5");

    const buy3 = search.renderStep3({ type: 'Sale' });
    assert.ok(buy3.text.includes("Step 3 of 5"), "Buy Step 3 must say Step 3 of 5");

    const buy4 = search.renderStep4({ type: 'Sale' });
    assert.ok(buy4.text.includes("Step 4 of 5"), "Buy Step 4 must say Step 4 of 5");

    const buy5 = search.renderStep5({ type: 'Sale' });
    assert.ok(buy5.text.includes("Step 5 of 5"), "Buy Step 5 must say Step 5 of 5");

    const rent2 = search.renderStep2({ type: 'Rent' });
    assert.ok(rent2.text.includes("Step 2 of 4"), "Rent Step 2 must say Step 2 of 4");

    const rent3 = search.renderStep3({ type: 'Rent' });
    assert.ok(rent3.text.includes("Step 3 of 4"), "Rent Step 3 must say Step 3 of 4");

    const rent4 = search.renderStep4({ type: 'Rent' });
    assert.ok(rent4.text.includes("Step 4 of 4"), "Rent Step 4 must say Step 4 of 4");
  });

  // Test 4: Strict filter matching — ELIMINATE silent relaxation
  runTest("No silent filter relaxation (unmatched criteria returns 0, never substitutes condos for villas)", () => {
    // Testing impossible criteria: Villa in BKK1 under $105k
    const state = {
      type: 'Sale',
      propType: 'villa',
      location: 'bkk1',
      budget: 'sale_1' // <$105k
    };
    const matches = search.filterInventory(state);
    assert.strictEqual(matches.length, 0, "Must return 0 exact matches for Villa in BKK1 under $105k");

    const card = search.renderResultsCard(state, 1);
    assert.ok(card.text.includes("No Exact Matches (0)"), "Card must state No Exact Matches");
    assert.ok(card.text.includes("do not substitute different categories"), "Card must state strict category integrity notice");
    assert.strictEqual(card.text.includes("Time Square 6"), false, "Card must never substitute condos when villa is requested!");
  });

  // Test 5: All property listings are strictly wrapped in <blockquote> blocks
  runTest("Every listing card is cleanly wrapped in Telegram <blockquote> blocks", () => {
    const state = { type: 'Sale', propType: 'any', location: 'any', budget: 'any' };
    const res = search.renderResultsCard(state, 1);

    const matches = search.filterInventory(state);
    if (matches.length > 0) {
      assert.ok(res.text.includes("<blockquote>"), "Results must contain <blockquote> opening tag");
      assert.ok(res.text.includes("</blockquote>"), "Results must contain </blockquote> closing tag");
      const openCount = (res.text.match(/<blockquote>/g) || []).length;
      const closeCount = (res.text.match(/<\/blockquote>/g) || []).length;
      assert.strictEqual(openCount, closeCount, "Every <blockquote> must be properly closed");
    }
  });

  // Test 6: 3-Property Comparative Anchoring (Sweet Spot / Luxury Anchor / Smart Value)
  runTest("3-Property comparative anchoring sorts by verified price and frames options correctly", () => {
    // Find a state with >=3 priced matches (e.g. Sale in Chamkarmon)
    const state = { type: 'Sale', location: 'ttp', propType: 'any', budget: 'any' };
    const res = search.renderResultsCard(state, 1);

    assert.ok(res.text.includes("⭐️ TOP RECOMMENDATION · Sweet Spot"), "Must frame Sweet Spot");
    assert.ok(res.text.includes("⚓ PREMIER BENCHMARK · Luxury Anchor"), "Must frame Luxury Anchor");
    assert.ok(res.text.includes("💡 SMART VALUE · Agile Alternative"), "Must frame Agile Alternative");
    assert.ok(res.text.includes("Why this fits:"), "Each option must include broker rationale");
  });

  // Test 7: Unpriced / Inquire listings never receive arbitrary 'lowest entry price' claim
  runTest("Unpriced listings receive neutral 'Verified Developer Project' badge without false price claims", () => {
    // Artificial test with unpriced mock
    const unpricedState = {
      type: 'Sale',
      status: 'offplan',
      propType: 'condo',
      location: 'tk',
      budget: 'any'
    };
    const res = search.renderResultsCard(unpricedState, 1);
    if (res.text.includes("Price: Inquire")) {
      assert.strictEqual(
        res.text.includes("Lowest entry price point"),
        false,
        "Unpriced listings must never claim to have the lowest entry price!"
      );
      assert.ok(res.text.includes("VERIFIED DEVELOPER PROJECT"), "Must use official developer project badge");
    }
  });

  // Test 8: Location callbacks are distinct (Peng Huoth != Chroy Changvar)
  runTest("Location callbacks are completely distinct (Peng Huoth != Chroy Changvar)", () => {
    const locStep = search.renderLocationStep({ type: 'Sale' });
    const allButtons = locStep.reply_markup.inline_keyboard.flat();

    const ccBtn = allButtons.find(b => b.text.includes("Chroy Changvar"));
    const phBtn = allButtons.find(b => b.text.includes("Peng Huoth"));

    assert.ok(ccBtn, "Chroy Changvar button must exist");
    assert.ok(phBtn, "Peng Huoth button must exist");
    assert.notStrictEqual(ccBtn.callback_data, phBtn.callback_data, "Callbacks must not be identical!");
    assert.strictEqual(ccBtn.callback_data, 'srch_loc_cc');
    assert.strictEqual(phBtn.callback_data, 'srch_loc_ph');
  });

  // Test 9: Zero synthetic '{district} Residence' names
  runTest("Never synthesizes fake '{district} Residence' names", () => {
    const state = { type: 'Sale', propType: 'any', location: 'any', budget: 'any' };
    const res = search.renderResultsCard(state, 1);
    assert.strictEqual(res.text.includes("Chamkarmon Residence"), false);
    assert.strictEqual(res.text.includes("Toul Kork Residence"), false);
    assert.strictEqual(res.text.includes("BKK1 Residence"), false);
  });

  // Test 10: Zero corrupted characters (\uFFFD or unhandled surrogates) in inventory
  runTest("Active inventory database contains zero corrupted characters or orphaned surrogates", () => {
    const invFile = path.join(__dirname, '..', 'data', 'multi-channel-inventory.json');
    const raw = fs.readFileSync(invFile, 'utf8');
    assert.strictEqual(raw.includes('\uFFFD'), false, "Inventory must contain zero \uFFFD replacement chars");
    assert.strictEqual(/[\uD800-\uDFFF]/.test(raw), false, "Inventory must contain zero unhandled surrogates");
  });

} catch (e) {
  console.error("Critical test execution error:", e);
  process.exitCode = 1;
}

console.log('\n=======================================================');
console.log(`RESULTS: ${passedCount} / ${totalCount} TESTS PASSED (${Math.round((passedCount / totalCount) * 100)}%)`);
console.log('=======================================================\n');

if (passedCount !== totalCount) {
  process.exit(1);
}
