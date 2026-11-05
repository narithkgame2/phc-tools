#!/bin/bash
# Connects @Nick_Cambodia_Bot on this Mac to its backup in Google Apps Script (NickBot_Backup.gs), without anyone seeing a secret.
#   bash setup-backup.sh         asks for the backup's web app address, makes the private key, and puts the key and then the
#                                bot token on the clipboard one at a time, so you can paste them into Apps Script
#   bash setup-backup.sh check   only checks the backup (prints plain yes or no lines, never a secret)
FILE="$HOME/.phc-secrets/nick-cambodia-bot.env"
mkdir -p "$HOME/.phc-secrets"; touch "$FILE"; chmod 600 "$FILE"

check() {
  URL=$(grep '^BACKUP_URL=' "$FILE" | head -1 | cut -d= -f2-)
  KEY=$(grep '^BACKUP_KEY=' "$FILE" | head -1 | cut -d= -f2-)
  if [ -z "$URL" ] || [ -z "$KEY" ]; then echo "The backup is not set up yet. Run: bash setup-backup.sh"; exit 1; fi
  ANSWER=$(curl -s -L --max-time 40 "$URL?k=$KEY")
  printf '%s' "$ANSWER" | /usr/bin/python3 -c '
import json, sys
try:
    j = json.load(sys.stdin)
except Exception:
    print("The backup did not answer as expected. Check the web app address (Deploy > Manage deployments) and that access is Anyone."); sys.exit(1)
if not j.get("ok"):
    print("The backup refused the key. In Apps Script, Project Settings > Script properties, BACKUP_KEY must match. Run: bash setup-backup.sh"); sys.exit(1)
yn = lambda b: "yes" if b else "NO"
print("Backup reachable: yes")
print("Bot token saved in Apps Script: " + yn(j.get("token")) + ("" if j.get("token") is False else ", accepted by Telegram: " + yn(j.get("tokenOk"))))
print("Watchdog running (installWatchdog): " + yn(j.get("watchdog")))
s = j.get("macSecondsAgo")
print("Heard from this Mac: " + ("NO, restart the bot" if s is None else str(s) + " seconds ago"))
print("Answering clients now: " + ("the backup (the Mac seemed off)" if j.get("answering") == "backup" else "the Mac"))
if j.get("lastTelegramError"): print("Last Telegram error on the backup link: " + j["lastTelegramError"])
ok = j.get("token") and j.get("tokenOk") and j.get("watchdog") and s is not None
print("All good." if ok else "Something above says NO. Follow the step for it.")
sys.exit(0 if ok else 1)
'
}

if [ "$1" = "check" ]; then check; exit $?; fi

printf 'Paste the backup web app address (it ends in /exec), then press Enter: '
read -r URL
URL=$(printf '%s' "$URL" | tr -d '[:space:]')
case "$URL" in
  https://script.google.com/macros/s/*/exec) ;;
  *) echo "That is not a web app address. In Apps Script: Deploy > Manage deployments > copy the Web app URL (ends in /exec)."; exit 1;;
esac
KEY=$(grep '^BACKUP_KEY=' "$FILE" | head -1 | cut -d= -f2-)
[ -n "$KEY" ] || KEY=$(openssl rand -hex 24)
grep -vE '^BACKUP_(KEY|URL)=' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE" && chmod 600 "$FILE"
printf 'BACKUP_URL=%s\nBACKUP_KEY=%s\n' "$URL" "$KEY" >> "$FILE"
echo "Saved on this Mac."
echo
printf '%s' "$KEY" | pbcopy
echo "1) The backup key is now on your clipboard (you will not see it)."
echo "   In Apps Script: Project Settings > Script properties > Add script property"
echo "   Property: BACKUP_KEY    Value: paste (Command+V)"
read -r -p "   Press Enter when it is saved there. " _
TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$FILE" | head -1 | cut -d= -f2- | tr -d "\"'")
if [ -z "$TOKEN" ]; then echo "The bot token is missing in $FILE. Tell Claude."; pbcopy < /dev/null; exit 1; fi
printf '%s' "$TOKEN" | pbcopy
echo "2) The bot token is now on your clipboard."
echo "   Add script property   Property: TELEGRAM_BOT_TOKEN    Value: paste (Command+V)    then Save script properties"
read -r -p "   Press Enter when it is saved there. " _
pbcopy < /dev/null
echo "Clipboard cleared."
echo
echo "3) Now restart the bot on this Mac so it starts talking to the backup:"
echo "   bash deploy/mac/install-mac-service.sh"
echo "   Then check everything with: bash deploy/backup/setup-backup.sh check"
