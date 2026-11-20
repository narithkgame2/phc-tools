// ═══════════════════════════════════════════════════════════════
//  PHC AUTOMATED TEST SUITE: ROOT OFF-PLAN ENGINE
//  Delegates to shared test runner
// ═══════════════════════════════════════════════════════════════

const engine = require('../project-advisor-engine.cjs');
const { runTestSuite } = require('./shared-offplan-test-runner.cjs');

runTestSuite(engine);
