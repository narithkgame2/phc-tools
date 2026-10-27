#!/bin/bash
# Connects @Nick_Cambodia_Bot to the PHC CRM without anyone seeing the key.
#   bash setup-crm.sh         asks for the bot key (typing is hidden), saves it, then checks the connection
#   bash setup-crm.sh check   only checks the connection (prints OK or the problem, never the key)
# Make the key first in the PHC CRM sheet: PHC Access > Create or replace an access key, name "Telegram bot", role "bot".
FILE="$HOME/.phc-secrets/nick-cambodia-bot.env"
URL="https://script.google.com/macros/s/AKfycbyCd3r8sX18YONWUf98_eB_B3uuXbn3ALq8A7ataIysQfUPU9y43DvZUe-OoRIticXBzg/exec"
mkdir -p "$HOME/.phc-secrets"; touch "$FILE"; chmod 600 "$FILE"

check() {
  KEY=$(grep '^CRM_KEY=' "$FILE" | head -1 | cut -d= -f2-)
  if [ -z "$KEY" ]; then echo "No CRM key saved yet. Run: bash setup-crm.sh"; exit 1; fi
  ANSWER=$(curl -s -L --max-time 30 "$URL?action=ping&key=$KEY")
  case "$ANSWER" in
    *'"ok":true'*) echo "OK: the bot can reach the PHC CRM. Restart the bot.";;
    *Unauthorized*) echo "The CRM refused the key. Make a new one (PHC Access, name Telegram bot, role bot) and run: bash setup-crm.sh"; exit 1;;
    *) echo "The CRM did not answer as expected. Check the internet connection and try again."; exit 1;;
  esac
}

if [ "$1" = "check" ]; then check; exit $?; fi

printf 'Paste the bot key (you will not see it), then press Enter: '
read -rs KEY; echo
KEY=$(printf '%s' "$KEY" | tr -d '[:space:]')
case "$KEY" in
  phc_bot_*) ;;
  phc_*) echo "That key has another role. Make one with the role bot (PHC Access, name Telegram bot, role bot)."; exit 1;;
  *) echo "That does not look like a PHC access key. It starts with phc_bot_"; exit 1;;
esac
grep -vE '^CRM_(KEY|URL)=' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE" && chmod 600 "$FILE"
printf 'CRM_URL=%s\nCRM_KEY=%s\n' "$URL" "$KEY" >> "$FILE"
echo "Saved."
check
