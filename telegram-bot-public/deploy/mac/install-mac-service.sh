#!/bin/bash
# Runs @Nick_Cambodia_Bot on this Mac as a background service: it starts when you log in, restarts if it crashes,
# keeps the Mac awake while it runs, and needs no Terminal window.
# Run:  bash deploy/mac/install-mac-service.sh          (installs or updates and restarts)
#       bash deploy/mac/install-mac-service.sh --dry-run (prints what it would do, changes nothing)
# macOS often blocks background programs from reading ~/Desktop, so the service runs from a copy in ~/nick-cambodia-bot.
# Run this script again after any code change to copy the new code over and restart. Client data in data/ is never overwritten.
set -euo pipefail
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
DEST="$HOME/nick-cambodia-bot"
NODE="$(command -v node || true)"
LABEL="com.nick.cambodia-bot"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/nick-cambodia-bot.log"
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1

[ -n "$NODE" ] || { echo "Node is not installed. Tell Claude."; exit 1; }
[ -f "$HOME/.phc-secrets/nick-cambodia-bot.env" ] || { echo "The private token file is missing: ~/.phc-secrets/nick-cambodia-bot.env"; exit 1; }

make_plist() {
cat <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/caffeinate</string>
    <string>-i</string>
    <string>$NODE</string>
    <string>index.js</string>
  </array>
  <key>WorkingDirectory</key><string>$DEST</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
PLIST
}

if [ "$DRY" = 1 ]; then
  echo "Would copy $SRC to $DEST (keeping $DEST/data)"
  echo "Would write $PLIST"
  make_plist > /tmp/nick-bot-test.plist && plutil -lint /tmp/nick-bot-test.plist
  rm -f /tmp/nick-bot-test.plist
  exit 0
fi

# stop our own service first, then refuse to start if a Terminal copy is still running (two copies on one token fight)
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
if pgrep -f "node index.js" >/dev/null; then
  echo "A copy of the bot is still running (probably in a Terminal window)."
  echo "Click that Terminal window, press Control+C, then run this script again."
  exit 1
fi

mkdir -p "$DEST" "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
if [ -d "$DEST/data" ]; then
  rsync -a --exclude data/ "$SRC/" "$DEST/"
else
  rsync -a "$SRC/" "$DEST/"
fi
# the files Nick edits by hand are always taken from the Desktop copy; client data (users, alerts, listing decisions) is never overwritten
for f in listings.csv mode.json testers.json; do [ -f "$SRC/data/$f" ] && cp "$SRC/data/$f" "$DEST/data/$f"; done
make_plist > "$PLIST"
plutil -lint "$PLIST" >/dev/null
launchctl bootstrap "gui/$(id -u)" "$PLIST"
launchctl kickstart -k "gui/$(id -u)/$LABEL"
sleep 4
echo "Installed. Last lines of the log:"
tail -n 5 "$LOG" 2>/dev/null || true
echo
echo "Telegram should show: Bot started on $(hostname)"
