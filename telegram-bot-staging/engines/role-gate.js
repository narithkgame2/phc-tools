// Role gate: decides who may use staff and admin features.
// Admin = Nick's Telegram ID only. Extra IDs can be added with PHC_ADMIN_IDS (comma separated).
// Everyone else is a client. Staff and admin features answer clients with a polite "not available".

const NICK_ID = '353195979';

// Slash commands that only an admin may use (no @botname suffix, lower case)
const ADMIN_COMMANDS = new Set([
  '/digest', '/stats', '/scheduledigest', '/broadcastdigest', '/digestbroadcast',
  '/syncchannels', '/refreshchannels', '/makeqr', '/pricedrop', '/testsla',
  '/cobroke', '/registerdeal', '/myunit', '/dashboard',
]);

// Button (callback) names that only an admin may press
const ADMIN_CALLBACK_PREFIXES = [
  'admin_', 'sched_', 'digest_broadcast', 'test_approve', 'test_reject',
  'publish_article', 'cobroke_', 'deal_confirm_', 'sla_',
];

function adminIds(env) {
  const raw = (env && env.PHC_ADMIN_IDS) || '';
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return new Set([NICK_ID, ...ids]);
}

function isAdmin(userId, env) {
  if (userId === undefined || userId === null) return false;
  return adminIds(env || process.env).has(String(userId));
}

function commandOf(text) {
  const first = String(text || '').trim().split(/\s+/)[0] || '';
  return first.split('@')[0].toLowerCase();
}

function isAdminCommand(text) {
  return ADMIN_COMMANDS.has(commandOf(text));
}

function isAdminCallback(data) {
  const d = String(data || '');
  return ADMIN_CALLBACK_PREFIXES.some((p) => d.startsWith(p));
}

// Polite reply for a client who reaches for a staff feature. Reveals nothing about what it does.
function deniedText(lang) {
  return String(lang || '').toUpperCase() === 'JP'
    ? 'この機能はご利用いただけません。メニューからお選びください。'
    : 'This feature is not available. Please choose from the menu.';
}

module.exports = { NICK_ID, ADMIN_COMMANDS, ADMIN_CALLBACK_PREFIXES, isAdmin, isAdminCommand, isAdminCallback, deniedText };
