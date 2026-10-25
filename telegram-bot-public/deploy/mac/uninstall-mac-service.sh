#!/bin/bash
# Stops the background service and removes it. The copy in ~/nick-cambodia-bot and its data stay.
LABEL="com.nick.cambodia-bot"; PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
echo "Background service removed."
