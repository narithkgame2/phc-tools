#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu VM for @Nick_Cambodia_Bot. Run it once with:  sudo bash setup-vm.sh
# It installs Node 20, creates a user named nickbot, downloads the bot code from GitHub and installs the service.
# It does NOT start the bot and never asks for the token: Nick types that into a private file himself (see HOSTING.md).
set -euo pipefail
BRANCH="${BOT_BRANCH:-feat/bot-color-cards-and-guards}"
REPO="https://github.com/narithkgame2/phc-tools.git"

echo "1/5 Installing tools"
apt-get update -y
apt-get install -y git curl ca-certificates

echo "2/5 Installing Node 20"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node --version

echo "3/5 Creating the nickbot user"
id nickbot >/dev/null 2>&1 || useradd --create-home --shell /bin/bash nickbot
sudo -u nickbot mkdir -p /home/nickbot/.phc-secrets
chmod 700 /home/nickbot/.phc-secrets

echo "4/5 Downloading the bot code ($BRANCH)"
if [ ! -d /home/nickbot/phc-tools ]; then
  sudo -u nickbot git clone --branch "$BRANCH" --single-branch "$REPO" /home/nickbot/phc-tools
else
  sudo -u nickbot git -C /home/nickbot/phc-tools pull
fi
sudo -u nickbot mkdir -p /home/nickbot/phc-tools/telegram-bot-public/data

echo "5/5 Installing the service (not started yet)"
cp /home/nickbot/phc-tools/telegram-bot-public/deploy/nick-cambodia-bot.service /etc/systemd/system/nick-cambodia-bot.service
systemctl daemon-reload
systemctl enable nick-cambodia-bot

echo
echo "Done. Next: create the private settings file, then start the bot. See HOSTING.md steps 5 and 6."
