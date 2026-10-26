#!/bin/bash
# Sets up the translator settings for @Nick_Cambodia_Bot without anyone opening the settings file.
#   bash setup-translator.sh key        makes a private key, saves it, and copies it to the clipboard (it is never shown)
#   bash setup-translator.sh url LINK   saves the Apps Script web app link
FILE="$HOME/.phc-secrets/nick-cambodia-bot.env"
mkdir -p "$HOME/.phc-secrets"; touch "$FILE"; chmod 600 "$FILE"
case "$1" in
  key)
    KEY=$(openssl rand -hex 24)
    grep -v '^TRANSLATE_KEY=' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE" && chmod 600 "$FILE"
    echo "TRANSLATE_KEY=$KEY" >> "$FILE"
    printf '%s' "$KEY" | pbcopy
    echo "Done. A private key is saved and copied to your clipboard. Paste it into Apps Script now (step: Script Properties)."
    ;;
  url)
    if [[ "$2" != https://script.google.com/* ]]; then echo "That does not look like an Apps Script web app link. It starts with https://script.google.com/"; exit 1; fi
    grep -v '^TRANSLATE_URL=' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE" && chmod 600 "$FILE"
    echo "TRANSLATE_URL=$2" >> "$FILE"
    echo "Done. The translator link is saved. Restart the bot."
    ;;
  *) echo "Use: bash setup-translator.sh key   or   bash setup-translator.sh url LINK";;
esac
