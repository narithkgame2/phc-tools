// Loads this bot's private settings (the bot token) from a file OUTSIDE the project folder.
// File: the one named in PHC_SECRETS_FILE, otherwise ~/.phc-secrets/nick-cambodia-bot.env. No project fallback.
const fs = require('fs');
const os = require('os');
const path = require('path');
const file = process.env.PHC_SECRETS_FILE || path.join(os.homedir(), '.phc-secrets', 'nick-cambodia-bot.env');
try {
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach(function (line) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  });
} catch (e) { /* the caller reports a missing token */ }
module.exports = { file };
