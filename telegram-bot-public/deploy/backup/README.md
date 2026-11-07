# Backup for @Nick_Cambodia_Bot (lite mode)

Nick's choice, 5 Nov 2026 (option C): the bot runs on the Mac; when the Mac is off (power cut, internet down, asleep) a copy in Google Apps Script answers clients with the same screens, words, buttons and language.

## How it works
- Every minute the Mac sends the backup a heartbeat (`engines/backup.js`). When something changed it also sends the screens (`config/flow.json`), the texts (`MSG` in `bot.js`) and each client's language.
- `watchdog()` in `NickBot_Backup.gs` runs every minute. After 3 minutes without a heartbeat it points Telegram at the backup (`setWebhook`) and tells Nick once.
- When the Mac starts again it removes that link (`deleteWebhook`) and polls as before. Its next heartbeat switches the backup off, and Nick hears "The Mac is back".
- Some things need the Mac: listings, unit cards, photos, compare, alerts and CRM rows. The backup gives the client the same reply the Mac would, keeps a short list of what is still to do, and the Mac finishes it when it is back (`bot.replay`). Listings older than 24 hours are not sent late.
- Nick's and the agents' own commands get one line: they need the Mac.
- With the lid closed macOS still wakes the Mac for a few seconds every 15 minutes ("dark wakes", see `pmset -g log`). `engines/wake.js` makes the Mac wait until it has been awake 90 seconds before it sends a heartbeat or takes Telegram back, so these short wakes do not switch anything (fixed 2026-11-07).

## Secrets
Only in Apps Script **Script properties** (`TELEGRAM_BOT_TOKEN`, `BACKUP_KEY`) and in `~/.phc-secrets/nick-cambodia-bot.env` (`BACKUP_URL`, `BACKUP_KEY`). `setup-backup.sh` puts them on the clipboard; nobody reads them. Never write them in a file in this repo.

## Setup (once)
1. script.google.com > New project, paste `NickBot_Backup.gs`, save.
2. Deploy > New deployment > Web app, Execute as Me, access Anyone. Copy the URL.
3. `bash deploy/backup/setup-backup.sh` (paste the URL, then paste the key and the token into Script properties).
4. In the editor run `installWatchdog` once.
5. `bash deploy/mac/install-mac-service.sh`, then `bash deploy/backup/setup-backup.sh check`.

## After a code change
- A change to screens or texts needs nothing: the Mac sends it to the backup by itself.
- A change to `NickBot_Backup.gs` must be pasted into Apps Script, then **Deploy > Manage deployments > edit > Version: New version > Deploy** (the address stays the same).
- `node tests/backup.test.js` walks every screen in Japanese, English and Khmer and checks the backup sends exactly what the Mac sends. Run it after any change to `bot.js` or the screens, and keep the backup in step when it fails.
