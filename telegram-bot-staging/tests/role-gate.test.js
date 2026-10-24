// ═══════════════════════════════════════════════════════════════
//  ROLE GATE TEST SUITE
//  Verifies: only Nick's ID is admin, staff commands and buttons are
//  blocked for clients, client features stay open, polite denied text.
// ═══════════════════════════════════════════════════════════════
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const gate = require('../engines/role-gate.js');

let passed = 0, total = 0;
function runTest(name, fn) {
  total++;
  try { fn(); passed++; console.log(`  ✅ Test ${total}: ${name}`); }
  catch (e) { console.log(`  ❌ Test ${total}: ${name}\n     ${e.message}`); }
}

runTest("Nick's ID is admin (number or string)", () => {
  assert.strictEqual(gate.isAdmin(353195979, {}), true);
  assert.strictEqual(gate.isAdmin('353195979', {}), true);
});
runTest('Other IDs, empty and missing IDs are not admin', () => {
  assert.strictEqual(gate.isAdmin(111, {}), false);
  assert.strictEqual(gate.isAdmin('', {}), false);
  assert.strictEqual(gate.isAdmin(undefined, {}), false);
  assert.strictEqual(gate.isAdmin(null, {}), false);
});
runTest('PHC_ADMIN_IDS adds more admins without removing Nick', () => {
  const env = { PHC_ADMIN_IDS: '222, 333' };
  assert.strictEqual(gate.isAdmin(222, env), true);
  assert.strictEqual(gate.isAdmin(333, env), true);
  assert.strictEqual(gate.isAdmin(353195979, env), true);
  assert.strictEqual(gate.isAdmin(444, env), false);
});
runTest('Every staff command is detected, with args, @botname and any case', () => {
  for (const c of ['/digest', '/stats', '/scheduledigest on', '/broadcastdigest', '/syncchannels',
    '/refreshchannels', '/makeqr abc', '/pricedrop TS8 99000', '/testsla', '/cobroke', '/registerdeal x',
    '/myunit TS8-22', '/dashboard', '/DIGEST', '/digest@Nick_REAKH_Bot']) {
    assert.strictEqual(gate.isAdminCommand(c), true, c);
  }
});
runTest('Client commands and normal text are NOT staff commands', () => {
  for (const c of ['/start', '/explore', '/tour', '/list', '/guide', '/nick', '/menu', '/lang', '/calc 100000',
    '/compare', '/search', 'hello', 'digest', '利回りを教えて', '']) {
    assert.strictEqual(gate.isAdminCommand(c), false, c);
  }
});
runTest('Every staff button is detected', () => {
  for (const d of ['admin_reset_ts7', 'admin_sold_ts7_A1', 'sched_status', 'sched_toggle', 'sched_preview',
    'digest_broadcast_now', 'test_approve_audit', 'test_reject_x', 'publish_article_now',
    'cobroke_reg_deal', 'cobroke_make_pdf', 'deal_confirm_1', 'sla_done_1', 'sla_booked_1']) {
    assert.strictEqual(gate.isAdminCallback(d), true, d);
  }
});
runTest('Client buttons are NOT staff buttons', () => {
  for (const d of ['menu_main', 'btn_explore_prop', 'lead_budget_under', 'legal_taxes', 'btn_calc_TS8',
    'explore_buy', 'owner_start_wizard', 'tour_video_X', 'set_lang_JP', 'portfolio_more_matches', '']) {
    assert.strictEqual(gate.isAdminCallback(d), false, d);
  }
});
runTest('Denied text is polite, in JP and EN, and reveals nothing', () => {
  assert.ok(/ご利用いただけません/.test(gate.deniedText('JP')));
  assert.ok(/not available/.test(gate.deniedText('EN')));
  assert.ok(/not available/.test(gate.deniedText(undefined)));
  for (const l of ['JP', 'EN']) assert.ok(!/admin|staff|digest|nick/i.test(gate.deniedText(l)));
});
runTest('index.js really calls the gate for messages and buttons', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  assert.ok(src.includes('roleGate.isAdminCommand(text) && !roleGate.isAdmin(sender.id)'));
  assert.ok(src.includes('roleGate.isAdminCallback(dataStr) && !roleGate.isAdmin(user.id)'));
});
runTest('Servers listen on this Mac only unless HOST is set', () => {
  const idx = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const srv = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert.ok(idx.includes("process.env.HOST || '127.0.0.1'") && idx.includes('healthServer.listen(PORT, HOST'));
  assert.ok(srv.includes("process.env.HOST || '127.0.0.1'") && srv.includes('server.listen(PORT, HOST'));
  assert.ok(!idx.includes("listen(PORT, '0.0.0.0'") && !srv.includes("listen(PORT, '0.0.0.0'"));
});

console.log(`\nRESULTS: ${passed} / ${total} TESTS PASSED (${Math.round(passed / total * 100)}%)`);
process.exit(passed === total ? 0 : 1);
