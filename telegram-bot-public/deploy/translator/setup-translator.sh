#!/bin/bash
# Sets up the translator settings for @Nick_Cambodia_Bot without anyone opening the settings file.
#   bash setup-translator.sh key        makes a private key, saves it, and copies it to the clipboard (it is never shown)
#   bash setup-translator.sh url LINK   saves the Apps Script web app link
#   bash setup-translator.sh reakh      copies the two translator settings into @Nick_REAKH_Bot's settings file (nothing is shown)
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
  reakh)
    TO="$HOME/.phc-secrets/nick-reakh-bot.env"
    if ! grep -q '^TRANSLATE_KEY=' "$FILE" || ! grep -q '^TRANSLATE_URL=' "$FILE"; then echo "Set up the translator for @Nick_Cambodia_Bot first (key and url)."; exit 1; fi
    touch "$TO"; chmod 600 "$TO"
    grep -vE '^TRANSLATE_(KEY|URL)=' "$TO" > "$TO.tmp" && mv "$TO.tmp" "$TO" && chmod 600 "$TO"
    grep -E '^TRANSLATE_(KEY|URL)=' "$FILE" >> "$TO"
    echo "Done. @Nick_REAKH_Bot can now use the same translator. Restart that bot."
    ;;
  *) echo "Use: bash setup-translator.sh key   or   bash setup-translator.sh url LINK   or   bash setup-translator.sh reakh";;
esac
