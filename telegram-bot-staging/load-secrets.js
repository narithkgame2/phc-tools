// Loads private settings, such as the bot token, from a file OUTSIDE the project folder.
// Order: the file named in PHC_SECRETS_FILE, then ~/.phc-secrets/nick-reakh-bot.env,
// then telegram-bot-staging/.env as a last resort. The first file found is used.
const fs = require('fs');
const os = require('os');
const path = require('path');

const candidates = [
  process.env.PHC_SECRETS_FILE,
  path.join(os.homedir(), '.phc-secrets', 'nick-reakh-bot.env'),
  path.join(__dirname, '.env'),
].filter(Boolean);

for (const file of candidates) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (e) { continue; }
  raw.split(/\r?\n/).forEach(function (line) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  });
  break;
}

module.exports = { candidates };
