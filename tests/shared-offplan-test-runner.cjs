// ═══════════════════════════════════════════════════════════════
//  PHC AUTOMATED SHARED TEST SUITE: OFF-PLAN COPILOT ENGINE
//  Single source of truth for engine verification across repos & bots
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTestSuite(engine) {
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

  // 1. Target directories for sandboxes
  const ROOT_PROJECTS_DIR = path.join(__dirname, '..', 'data', 'projects');
  const STAGING_PROJECTS_DIR = path.join(__dirname, '..', 'telegram-bot-staging', 'data', 'projects');
  const TARGET_DIRS = [ROOT_PROJECTS_DIR];
  if (fs.existsSync(STAGING_PROJECTS_DIR)) TARGET_DIRS.push(STAGING_PROJECTS_DIR);

  const REAL_TS7_PATH = path.join(ROOT_PROJECTS_DIR, 'time-square-7.json');
  const TEST_TS7_ID = 'test-sandbox-ts7';

  const REAL_TS8_PATH = path.join(ROOT_PROJECTS_DIR, 'time-square-8.json');
  const TEST_TS8_ID = 'test-sandbox-ts8';

  function setupSandboxes() {
    const ts7Content = JSON.parse(fs.readFileSync(REAL_TS7_PATH, 'utf8'));
    ts7Content.projectId = TEST_TS7_ID;
    const ts8Content = JSON.parse(fs.readFileSync(REAL_TS8_PATH, 'utf8'));
    ts8Content.projectId = TEST_TS8_ID;

    for (const dir of TARGET_DIRS) {
      fs.writeFileSync(path.join(dir, `${TEST_TS7_ID}.json`), JSON.stringify(ts7Content, null, 2), 'utf8');
      fs.writeFileSync(path.join(dir, `${TEST_TS8_ID}.json`), JSON.stringify(ts8Content, null, 2), 'utf8');
    }
  }

  function teardownSandboxes() {
    for (const dir of TARGET_DIRS) {
      const p7 = path.join(dir, `${TEST_TS7_ID}.json`);
      const p8 = path.join(dir, `${TEST_TS8_ID}.json`);
      if (fs.existsSync(p7)) fs.unlinkSync(p7);
      if (fs.existsSync(p8)) fs.unlinkSync(p8);
    }
  }

  console.log("\n=======================================================");
  console.log("🚀 RUNNING SHARED PHC OFF-PLAN ENGINE STRESS TESTS");
  console.log("=======================================================\n");

  setupSandboxes();

  try {
    // Test 1: Nearest alternative floor proximity & adjacent stack
    runTest("Unit sold, find nearest alternative by adjacent stack & floor proximity", () => {
      const result1 = engine.markUnitSold(TEST_TS7_ID, '42C1');
      assert.strictEqual(result1.success, true);
      assert.strictEqual(result1.nextBestRecommendation.bestUnit.unitCode, '42D1');
      assert.strictEqual(result1.nextBestRecommendation.floorDifference, 0);

      const result2 = engine.markUnitSold(TEST_TS7_ID, '42D1');
      assert.strictEqual(result2.success, true);
      const recFloor = result2.nextBestRecommendation.bestUnit.floor;
      assert.strictEqual(recFloor, 41, `Expected floor 41, but got floor ${recFloor}`);
      assert.strictEqual(result2.nextBestRecommendation.floorDifference, 1);
    });

    // Test 2: Client budget $70,000 (No units qualify -> explicit warning)
    runTest("Client budget $70,000 returns explicit budget variance warning", () => {
      const result = engine.findBestUnit(TEST_TS7_ID, { maxBudget: 70000 });
      assert.strictEqual(result.budgetMatched, false);
      assert.strictEqual(result.requestedBudget, 70000);
      assert.strictEqual(result.budgetVariance, 11315);
      
      const card = engine.formatProposalCard(result);
      assert.ok(card.includes("⚠️ <b>Budget Advisory:</b>"), "Card must include budget advisory warning");
      assert.ok(card.includes("$11,315 USD above target"), "Card must specify the exact budget gap");
    });

    // Test 3: Penthouse / High-floor ranking (45AC1)
    runTest("Top floor unit 45AC1 correctly recognized as outer perimeter", () => {
      const project = engine.loadProject(TEST_TS7_ID);
      const unit45A = engine.findUnit(project, '45AC1');
      assert.ok(unit45A, "Unit 45AC1 must exist");
      
      const isOuter = engine.isOuterPerimeter(project, unit45A);
      assert.strictEqual(isOuter, true, "45AC1 (Column C1) must be classified as outer perimeter");
    });

    // Test 4: Inner courtyard unit wording: visible plan facts only, no unverified acoustic/daylight claims
    runTest("Inner courtyard note contains only plan facts (no daylight/acoustics/capital claims)", () => {
      const project = engine.loadProject(TEST_TS7_ID);
      const innerUnit = engine.findUnit(project, '38C2');
      assert.ok(innerUnit, "Unit 38C2 must exist");
      
      const calc = engine.calculatePaymentPlan(project, innerUnit);
      const card = engine.formatProposalCard({
        project,
        bestUnit: innerUnit,
        calculation: calc
      });
      
      assert.ok(card.includes("Faces the internal courtyard void per floor plan"), "Card must cite floor plan void");
      assert.strictEqual(card.includes("moderate natural daylight"), false, "Must not claim daylight without source");
      assert.strictEqual(card.includes("quiet acoustics"), false, "Must not claim acoustics without source");
      assert.ok(card.includes("<blockquote>"), "Card must be wrapped in blockquote");
      assert.strictEqual(card.toLowerCase().includes("capital appreciation"), false, "Must never mention capital appreciation");
      assert.strictEqual(card.toLowerCase().includes("capital growth"), false, "Must never mention capital growth");
    });

    // Test 5: Floor 45AF pricing step verification
    runTest("Floor 45AF pricing matches developer sheet ($103,688 list -> $88,245 net)", () => {
      const project = engine.loadProject(TEST_TS7_ID);
      const unit = engine.findUnit(project, '45AC1');
      const calc = engine.calculatePaymentPlan(project, unit);
      
      assert.strictEqual(calc.listPrice, 103688);
      assert.strictEqual(calc.netPrice, 88245);
      assert.strictEqual(calc.schedule.monthlyInstallment, 882);
      assert.strictEqual(calc.schedule.bookingDeposit, 1000);
    });

    // Test 6: Unit area dynamic calculation
    runTest("Gross area dynamically sourced from unit / project (65 sqm)", () => {
      const project = engine.loadProject(TEST_TS7_ID);
      const unit = engine.findUnit(project, '38C1');
      const calc = engine.calculatePaymentPlan(project, unit);
      
      assert.strictEqual(calc.grossAreaSqm, 65);
      assert.strictEqual(calc.pricePerSqmNet, Math.round(81315 / 65));
    });

    // Test 7: Case-insensitive unit lookup
    runTest("Typing unit code in lowercase '38c1' succeeds", () => {
      const project = engine.loadProject(TEST_TS7_ID);
      const unit = engine.findUnit(project, '38c1');
      assert.ok(unit, "Should find unit with lowercase '38c1'");
      assert.strictEqual(unit.unitCode, '38C1');
    });

    // Test 8: Marking already sold unit is idempotent with warning
    runTest("Marking already sold unit returns alreadySold flag without crash", () => {
      const secondResult = engine.markUnitSold(TEST_TS7_ID, '42C1');
      assert.strictEqual(secondResult.success, false);
      assert.strictEqual(secondResult.alreadySold, true);
      assert.ok(secondResult.error.includes("already marked as SOLD"));
    });

    // Test 9: Data provenance metadata present
    runTest("Project contains verified provenance with date and source document", () => {
      const project = engine.loadProject(TEST_TS7_ID);
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
      const project = engine.loadProject(TEST_TS7_ID);
      const available = project.unitTypes[0].availableUnits.filter(u => u.status === 'available');
      
      for (const unit of available) {
        const calc = engine.calculatePaymentPlan(project, unit);
        const s = calc.schedule;
        const totalPaid = s.bookingDeposit + s.downPaymentDue + s.totalInstallments + s.handoverBalance;
        assert.strictEqual(
          totalPaid,
          calc.netPrice,
          `Unit ${unit.unitCode} payment components do not sum to netPrice (${totalPaid} vs ${calc.netPrice})`
        );
      }
    });

    // ─────────────────────────────────────────────────────────────
    // NEW PHASE 1 & 2 SPECIFICATION TESTS
    // ─────────────────────────────────────────────────────────────

    // Test 13: TS8 Unit 45AO 10% Down Payment Math
    runTest("TS8 Unit 45AO: 10% down payment schedule balance assertion", () => {
      const project = engine.loadProject(TEST_TS8_ID);
      const unit = engine.findUnit(project, '45AO');
      assert.ok(unit, "Unit 45AO must exist in TS8");

      const calc = engine.calculatePaymentPlan(project, unit, { downPaymentPercent: 10, roundingRule: 'round_whole' });
      assert.strictEqual(calc.netPrice, 101990, "Net price must be $101,990");
      assert.strictEqual(calc.schedule.bookingDeposit, 1000, "Booking must be $1,000");
      assert.strictEqual(calc.schedule.downPaymentDue, 9199, "10% Down balance must be $9,199");
      assert.strictEqual(calc.schedule.monthlyInstallment, 1020, "Monthly installment must be $1,020");
      assert.strictEqual(calc.schedule.durationMonths, 40, "Duration must be 40 months");
      assert.strictEqual(calc.schedule.totalInstallments, 40800, "Installments total must be $40,800");
      assert.strictEqual(calc.schedule.handoverBalance, 50991, "Handover balance must be $50,991");
      
      // Strict equality sum
      const sum = calc.schedule.bookingDeposit + calc.schedule.downPaymentDue + calc.schedule.totalInstallments + calc.schedule.handoverBalance;
      assert.strictEqual(sum, calc.netPrice, `Sum ${sum} must equal net price ${calc.netPrice}`);
    });

    // Test 14: TS8 Unit 45AO 20% Down Payment Math & Developer Flag
    runTest("TS8 Unit 45AO: 20% down payment schedule balance assertion & flag", () => {
      const project = engine.loadProject(TEST_TS8_ID);
      const unit = engine.findUnit(project, '45AO');

      const calc = engine.calculatePaymentPlan(project, unit, { downPaymentPercent: 20, roundingRule: 'round_whole' });
      assert.strictEqual(calc.netPrice, 101990);
      assert.strictEqual(calc.schedule.bookingDeposit, 1000);
      assert.strictEqual(calc.schedule.downPaymentDue, 19398, "20% Down balance must be $19,398");
      assert.strictEqual(calc.schedule.monthlyInstallment, 1020);
      assert.strictEqual(calc.schedule.totalInstallments, 40800);
      assert.strictEqual(calc.schedule.handoverBalance, 40792, "Handover balance must be $40,792");

      const sum = calc.schedule.bookingDeposit + calc.schedule.downPaymentDue + calc.schedule.totalInstallments + calc.schedule.handoverBalance;
      assert.strictEqual(sum, calc.netPrice, `Sum ${sum} must equal net price ${calc.netPrice}`);

      assert.ok(calc.developerConfirmationFlag, "Flag must be present for non-10% down payment");
      assert.ok(calc.developerConfirmationFlag.includes("confirm with developer"), "Flag must state confirm with developer");
    });

    // Test 15: Rounding rule setting & Proposal card active indicator
    runTest("Rounding rule setting (cents vs round_whole) reflects on card", () => {
      const project = engine.loadProject(TEST_TS8_ID);
      const unit = engine.findUnit(project, '45AO');

      const calcCents = engine.calculatePaymentPlan(project, unit, { roundingRule: 'exact_cents' });
      assert.strictEqual(calcCents.schedule.monthlyInstallment, 1019.9);
      const cardCents = engine.formatProposalCard({ project, calculation: calcCents, bestUnit: unit });
      assert.ok(cardCents.includes("Exact cents"), "Card must state active Exact cents rounding");

      const calcWhole = engine.calculatePaymentPlan(project, unit, { roundingRule: 'round_whole' });
      assert.strictEqual(calcWhole.schedule.monthlyInstallment, 1020);
      const cardWhole = engine.formatProposalCard({ project, calculation: calcWhole, bestUnit: unit });
      assert.ok(cardWhole.includes("Rounded whole dollar"), "Card must state active Rounded whole dollar");
    });

    // Test 16: Audit log and Undo for Mark as Sold
    runTest("Mark as sold records audit log and undo restores status to Available", () => {
      const soldRes = engine.markUnitSold(TEST_TS8_ID, '45AO', 'Nick (Admin)');
      assert.strictEqual(soldRes.success, true);
      assert.ok(soldRes.auditLog, "Audit log entry must be returned");
      assert.strictEqual(soldRes.auditLog.action, 'mark_sold');
      assert.strictEqual(soldRes.auditLog.who, 'Nick (Admin)');
      assert.strictEqual(soldRes.auditLog.unitCode, '45AO');
      assert.strictEqual(soldRes.auditLog.previousStatus, 'available');

      // Undo
      const undoRes = engine.undoUnitSold(TEST_TS8_ID, '45AO', 'Nick (Admin)');
      assert.strictEqual(undoRes.success, true);
      assert.strictEqual(undoRes.unit.status, 'available');
      assert.strictEqual(undoRes.auditLog.action, 'undo_sold');
      assert.strictEqual(undoRes.auditLog.previousStatus, 'sold');

      const reloaded = engine.loadProject(TEST_TS8_ID);
      assert.strictEqual(reloaded.auditLog.length >= 2, true);
    });

    // Test 17: Floor label formatting without architectural ambiguity
    runTest("Unit 45AO displays marketed floor 45AF without confusing (Floor 44) label", () => {
      const project = engine.loadProject(TEST_TS8_ID);
      const unit = engine.findUnit(project, '45AO');
      const calc = engine.calculatePaymentPlan(project, unit);
      const card = engine.formatProposalCard({ project, calculation: calc, bestUnit: unit });
      
      assert.ok(card.includes("• <b>Floor:</b> 45AF"), "Card must display 45AF");
      assert.strictEqual(card.includes("(Floor 44)"), false, "Card must not display internal (Floor 44)");
    });

  } finally {
    teardownSandboxes();
  }

  console.log("\n=======================================================");
  console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log("=======================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

module.exports = { runTestSuite };
