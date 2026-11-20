// ═══════════════════════════════════════════════════════════════
//  PHC AUTOMATED TEST SUITE: STAGING BOT OFF-PLAN ENGINE
//  Delegates to shared test runner
// ═══════════════════════════════════════════════════════════════

const engine = require('../engines/project-advisor.js');
const { runTestSuite } = require('../../tests/shared-offplan-test-runner.cjs');

runTestSuite(engine);
