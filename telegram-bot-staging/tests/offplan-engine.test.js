// ═══════════════════════════════════════════════════════════════
//  PHC AUTOMATED TEST SUITE: OFF-PLAN COPILOT ENGINE
//  Verifies all 12 edge cases & stress-test requirements
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Sandbox isolation: copy live data to a temporary isolated test project
const REAL_JSON_PATH = path.join(__dirname, '..', 'data', 'projects', 'time-square-7.json');
const TEST_PROJECT_ID = 'test-sandbox-ts7';
const TEST_JSON_PATH = path.join(__dirname, '..', 'data', 'projects', `${TEST_PROJECT_ID}.json`);

function setupSandbox() {
  const content = JSON.parse(fs.readFileSync(REAL_JSON_PATH, 'utf8'));
  content.projectId = TEST_PROJECT_ID;
  fs.writeFileSync(TEST_JSON_PATH, JSON.stringify(content, null, 2), 'utf8');
}

function teardownSandbox() {
  if (fs.existsSync(TEST_JSON_PATH)) {
    fs.unlinkSync(TEST_JSON_PATH);
  }
}

// Load engine
const engine = require('../engines/project-advisor.js');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ Test ${totalTests}: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ Test ${totalTests} FAILED: ${testName}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log("\n=======================================================");
console.log("🚀 RUNNING PHC OFF-PLAN ENGINE STRESS TESTS (12 SCENARIOS)");
console.log("=======================================================\n");

setupSandbox();

try {
  // Test 1: Nearest alternative floor proximity & adjacent stack
  runTest("Unit sold, find nearest alternative by adjacent stack & floor proximity", () => {
    // 1. Mark 42C1 sold -> should suggest 42D1 (same floor 42, adjacent outer stack)
    const result1 = engine.markUnitSold(TEST_PROJECT_ID, '42C1');
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result1.nextBestRecommendation.bestUnit.unitCode, '42D1');
    assert.strictEqual(result1.nextBestRecommendation.floorDifference, 0);

    // 2. Mark 42D1 sold as well -> should suggest floor 41 (distance 1), NOT floor 38 (distance 4)
    const result2 = engine.markUnitSold(TEST_PROJECT_ID, '42D1');
    assert.strictEqual(result2.success, true);
    const recFloor = result2.nextBestRecommendation.bestUnit.floor;
    assert.strictEqual(recFloor, 41, `Expected floor 41, but got floor ${recFloor}`);
    assert.strictEqual(result2.nextBestRecommendation.floorDifference, 1);
  });

  // Test 2: Client budget $70,000 (No units qualify -> explicit warning)
  runTest("Client budget $70,000 returns explicit budget variance warning", () => {
    const result = engine.findBestUnit(TEST_PROJECT_ID, { maxBudget: 70000 });
    assert.strictEqual(result.budgetMatched, false);
    assert.strictEqual(result.requestedBudget, 70000);
    assert.strictEqual(result.budgetVariance, 11315); // 81315 - 70000
    
    const card = engine.formatProposalCard(result);
    assert.ok(card.includes("⚠️ <b>Budget Advisory:</b>"), "Card must include budget advisory warning");
    assert.ok(card.includes("$11,315 USD above target"), "Card must specify the exact budget gap");
  });

  // Test 3: Penthouse / High-floor ranking (45AC1)
  runTest("Top floor unit 45AC1 correctly recognized as outer perimeter", () => {
    const project = engine.loadProject(TEST_PROJECT_ID);
    const unit45A = engine.findUnit(project, '45AC1');
    assert.ok(unit45A, "Unit 45AC1 must exist");
    
    const isOuter = engine.isOuterPerimeter(project, unit45A);
    assert.strictEqual(isOuter, true, "45AC1 (Column C1) must be classified as outer perimeter");
  });

  // Test 4: Inner courtyard unit wording & strictly no capital growth claims
  runTest("Inner courtyard card wording has no contradictions or 'capital appreciation'", () => {
    const project = engine.loadProject(TEST_PROJECT_ID);
    const innerUnit = engine.findUnit(project, '38C2');
    assert.ok(innerUnit, "Unit 38C2 must exist");
    
    const calc = engine.calculatePaymentPlan(project, innerUnit);
    const card = engine.formatProposalCard({
      project,
      bestUnit: innerUnit,
      calculation: calc
    });
    
    assert.ok(card.includes("internal courtyard void"), "Card must state inner courtyard");
    assert.ok(card.includes("moderate natural daylight"), "Card must explicitly state moderate natural daylight caveat");
    assert.ok(card.includes("<blockquote>"), "Card must be wrapped in blockquote");
    assert.strictEqual(card.includes("unobstructed panoramic views"), false, "Inner unit must not claim panoramic outer views");
    assert.strictEqual(card.toLowerCase().includes("capital appreciation"), false, "Must never mention capital appreciation");
    assert.strictEqual(card.toLowerCase().includes("capital growth"), false, "Must never mention capital growth");
  });

  // Test 5: Floor 45AF pricing step verification
  runTest("Floor 45AF pricing matches developer sheet ($103,688 list -> $88,245 net)", () => {
    const project = engine.loadProject(TEST_PROJECT_ID);
    const unit = engine.findUnit(project, '45AC1');
    const calc = engine.calculatePaymentPlan(project, unit);
    
    assert.strictEqual(calc.listPrice, 103688);
    assert.strictEqual(calc.netPrice, 88245);
    assert.strictEqual(calc.schedule.monthlyInstallment, 882); // 1% of 88245
    assert.strictEqual(calc.schedule.bookingDeposit, 1000);
  });

  // Test 6: Unit area dynamic calculation
  runTest("Gross area dynamically sourced from unit / project (65 sqm)", () => {
    const project = engine.loadProject(TEST_PROJECT_ID);
    const unit = engine.findUnit(project, '38C1');
    const calc = engine.calculatePaymentPlan(project, unit);
    
    assert.strictEqual(calc.grossAreaSqm, 65);
    assert.strictEqual(calc.pricePerSqmNet, Math.round(81315 / 65)); // 1251 $/sqm
  });

  // Test 7: Case-insensitive unit lookup
  runTest("Typing unit code in lowercase '38c1' succeeds", () => {
    const project = engine.loadProject(TEST_PROJECT_ID);
    const unit = engine.findUnit(project, '38c1');
    assert.ok(unit, "Should find unit with lowercase '38c1'");
    assert.strictEqual(unit.unitCode, '38C1');
  });

  // Test 8: Marking already sold unit is idempotent with warning
  runTest("Marking already sold unit returns alreadySold flag without crash", () => {
    // 42C1 was marked sold in Test 1
    const secondResult = engine.markUnitSold(TEST_PROJECT_ID, '42C1');
    assert.strictEqual(secondResult.success, false);
    assert.strictEqual(secondResult.alreadySold, true);
    assert.ok(secondResult.error.includes("already marked as SOLD"));
  });

  // Test 9: Data provenance metadata present
  runTest("Project contains verified provenance with date and source document", () => {
    const project = engine.loadProject(TEST_PROJECT_ID);
    assert.ok(project.provenance, "Provenance object must exist");
    assert.ok(project.provenance.sourceDocument, "Source document must be defined");
    assert.strictEqual(project.provenance.priceListDate, "2026-10-21");
    assert.ok(project.provenance.verifiedBy, "Verifier must be named");
  });

  // Test 10: Ordinal floor formatting (38th, 41st, 42nd, 43rd, 45AF)
  runTest("Floor ordinals formatted correctly (41st, NOT 41th)", () => {
    assert.strictEqual(engine.formatFloorLabel(38), "38th");
    assert.strictEqual(engine.formatFloorLabel(41), "41st");
    assert.strictEqual(engine.formatFloorLabel(42), "42nd");
    assert.strictEqual(engine.formatFloorLabel(43), "43rd");
    assert.strictEqual(engine.formatFloorLabel(45, "45AF"), "45AF");
  });

  // Test 11: HTML character escaping for Telegram safety
  runTest("Telegram HTML parser safety escapes '&', '<', '>'", () => {
    const raw = "Megakim & Partners <Phnom Penh>";
    const escaped = engine.escapeHtml(raw);
    assert.strictEqual(escaped, "Megakim &amp; Partners &lt;Phnom Penh&gt;");
  });

  // Test 12: Mathematical balance integrity across payment schedule
  runTest("Payment schedule math adds up 100% exactly to net price", () => {
    const project = engine.loadProject(TEST_PROJECT_ID);
    const available = project.unitTypes[0].availableUnits.filter(u => u.status === 'available');
    
    for (const unit of available) {
      const calc = engine.calculatePaymentPlan(project, unit);
      const s = calc.schedule;
      const totalPaid = s.bookingDeposit + s.downPaymentDue + (s.monthlyInstallment * s.durationMonths) + s.handoverBalance;
      assert.strictEqual(
        totalPaid,
        calc.netPrice,
        `Unit ${unit.unitCode} payment components do not sum to netPrice (${totalPaid} vs ${calc.netPrice})`
      );
    }
  });

} finally {
  teardownSandbox();
}

console.log("\n=======================================================");
console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
console.log("=======================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
