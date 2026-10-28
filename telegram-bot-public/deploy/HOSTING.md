# Hosting @Nick_Cambodia_Bot on Google Cloud (free tier)

Written 2026-10-25 for Nick. Plain steps, nothing to install on your Mac. About 60 minutes the first time.

## What you get and what it costs

Google's Always Free tier includes one small server (an e2-micro) per month in Oregon (us-west1), Iowa (us-central1) or South Carolina (us-east1), 30 GB of standard disk and 1 GB of outbound traffic per month. This bot needs a tiny fraction of that. Source: https://docs.cloud.google.com/free/docs/free-cloud-features

Things to know honestly:
- A Google Cloud billing account with a credit card is required, even for free usage. You are charged only if you go over the free limits. Step 3 sets an alert so you are told long before any charge.
- Google may change the free tier with 30 days notice. Check the page above once a quarter.
- The server is in the USA. That does not matter for a bot: Telegram replies take well under a second.
- Only ONE copy of a bot may run per token. Never run the Mac copy and the server copy on the same token at the same time.
- Client data (Telegram IDs, searches, alerts) will live on the server in `data/`. Treat the server like an office file cabinet.

## Step 1. Create a test bot first

1. In Telegram open @BotFather and send `/newbot`.
2. Name: `Nick Cambodia Test`. Username: `Nick_Cambodia_Test_Bot`.
3. BotFather gives you a token. Keep it private. Never paste it into chat or email. You will type it only into the server file in Step 5.

Using a test bot means your real bot keeps working on the Mac while you set up the server.

## Step 2. Google Cloud account

1. Go to https://console.cloud.google.com and sign in with the Google account you want to own this.
2. Accept the terms. When asked to activate the free trial or add billing, follow the prompts and add your card.
3. Create a project named `nick-cambodia-bot` (top bar, project picker, New project).

## Step 3. Safety alert before anything else

1. Menu, Billing, Budgets and alerts, Create budget.
2. Name `free tier guard`, amount `1` USD, keep the default alert levels, and add your email.
3. Save. You are emailed if spending ever approaches 1 USD.

## Step 4. Create the server

1. Menu, Compute Engine, VM instances. Enable the API if asked.
2. Click Create instance.
3. Name `nick-cambodia-bot`. Region `us-central1` (Iowa). Zone any.
4. Machine configuration: series E2, machine type `e2-micro`.
5. Boot disk, Change: Ubuntu 22.04 LTS, boot disk type `Standard persistent disk`, size `30` GB.
6. Firewall: leave both HTTP and HTTPS boxes unticked. The bot makes outgoing calls only.
7. Click Create. When the row shows a green tick, click `SSH` on that row. A black window opens in your browser. This is the server. You type commands there.

Screen names can differ slightly. The settings above are what matter: e2-micro, one of the three US regions, standard disk of 30 GB.

## Step 5. Install the bot (copy and paste into the black window)

First command (downloads the setup script):

```
curl -fsSLO https://raw.githubusercontent.com/narithkgame2/phc-tools/feat/bot-color-cards-and-guards/telegram-bot-public/deploy/setup-vm.sh
```

Second command (runs it, takes about 2 minutes):

```
sudo bash setup-vm.sh
```

Third command, creates the private settings file. This opens a simple editor:

```
sudo -u nickbot nano /home/nickbot/.phc-secrets/nick-cambodia-bot.env
```

Type these lines, replacing the words in capitals with your real values:

```
TELEGRAM_BOT_TOKEN=PASTE_THE_TEST_BOT_TOKEN_HERE
NICK_TELEGRAM_ID=353195979
```

Save with Control+O then Enter, leave with Control+X. Make the file private:

```
sudo chmod 600 /home/nickbot/.phc-secrets/nick-cambodia-bot.env
```

## Step 6. Start it and check

```
sudo systemctl start nick-cambodia-bot
sudo journalctl -u nick-cambodia-bot -n 20 --no-pager
```

You should see `Nick Cambodia bot started as @Nick_Cambodia_Test_Bot`, and your Telegram receives `Bot started on nick-cambodia-bot`. Open the test bot in Telegram and try `/buy`.

If you see `Another copy of this bot is already running`, a second program uses the same token. Stop one.

## Step 7. Give the server your listings

The server cannot read files on your Mac. It reads a link to your Google Sheet. Publish only a safe tab, never the whole Sheet.

1. In your Sheet add a new tab named `Bot feed`.
2. In cell A1 paste this formula. Change `Sheet1` to the real name of your listings tab if it differs. Columns A to X are the 24 columns the bot reads (Ref to Unit number):

```
=QUERY(Sheet1!A:X, "select * where B = 'Active' or B = 'Preview'", 1)
```

Preview rows are shown to Nick and the testers only, never to clients, so they are safe to include.
3. File, Share, Publish to web. Choose the tab `Bot feed` (not Entire document), format `Comma separated values (.csv)`, Publish.
4. Copy the link it shows.
5. On the server open the settings file again and add one line (replace the link):

```
sudo -u nickbot nano /home/nickbot/.phc-secrets/nick-cambodia-bot.env
```

```
LISTINGS_CSV_URL=PASTE_THE_PUBLISHED_LINK_HERE
```

6. Restart: `sudo systemctl restart nick-cambodia-bot`.

Only Active and Preview rows appear in that tab, so other rows and any notes outside columns A to X are not published. The link is long and unguessable, but treat it as semi private.

The bot reads the link every 5 minutes. Edits to the Sheet reach clients within about 5 minutes, with no download step.

## Step 8. Switch to the real bot

Only after the test bot works well on the server:

The `data` folder on the Mac holds everything the code does not: the channels (@Nick_Cambodia, @NickREAKH and its watch), agents and their units, the guide PDFs, testers, clients and their alerts. It is never on GitHub, so it is carried across by hand.

1. On your Mac, stop the bot (Control+C in its Terminal window). If you installed the Mac background service, also run `bash ~/Desktop/PHC_Backup_2026/phc-tools/telegram-bot-public/deploy/mac/uninstall-mac-service.sh`.
2. In a Mac Terminal, pack the data folder onto your Desktop:

```
tar -czf ~/Desktop/nickbot-data.tgz -C ~/Desktop/PHC_Backup_2026/phc-tools/telegram-bot-public data
```

3. In the server's black SSH window click `UPLOAD FILE` (top right), choose `nickbot-data.tgz` from your Desktop, wait for it to finish, then paste:

```
sudo systemctl stop nick-cambodia-bot
sudo tar -xzf ~/nickbot-data.tgz -C /home/nickbot/phc-tools/telegram-bot-public
sudo chown -R nickbot:nickbot /home/nickbot/phc-tools/telegram-bot-public/data
rm ~/nickbot-data.tgz
```

4. Copy the settings. On the Mac run `open -e ~/.phc-secrets/nick-cambodia-bot.env` (it opens in TextEdit; never screenshot or share it). On the server open the settings file (`sudo -u nickbot nano /home/nickbot/.phc-secrets/nick-cambodia-bot.env`), delete what is there, and type or paste every line from the Mac file (the real token, NICK_TELEGRAM_ID, CRM_URL, CRM_KEY and any TRANSLATE_ lines). Keep your LISTINGS_CSV_URL line from Step 7. Save with Control+O, Enter, Control+X. Close TextEdit without changing anything.
5. `sudo systemctl start nick-cambodia-bot`, then `sudo journalctl -u nick-cambodia-bot -n 20 --no-pager`. You should see `PHC CRM link: on`, and Telegram sends `Bot started on nick-cambodia-bot`.
6. Test from your phone: `/buy`, `/guide` (the guide PDF arrives) and the ☰ menu in Japanese. Your Mac copy must stay off from now on.
7. Delete `nickbot-data.tgz` from your Mac Desktop (it holds client data).

## Daily life

| I want to | Command (in the black window) |
|---|---|
| See what the bot is doing | `sudo journalctl -u nick-cambodia-bot -f` (Control+C to stop looking) |
| Restart the bot | `sudo systemctl restart nick-cambodia-bot` |
| Stop the bot | `sudo systemctl stop nick-cambodia-bot` |
| Update to the newest code | `sudo -u nickbot git -C /home/nickbot/phc-tools pull` then restart |
| Check it runs | In Telegram you receive `Bot started on ...` after every restart |

The service restarts itself after a crash or a reboot. If the server ever stops answering, restart it from the Google Cloud console (VM instances, three dots, Reset).

## Running on this Mac instead (start here, simpler)

You can run the bot on your own Mac with no server and no card. Two ways:

1. In a Terminal window: `cd ~/Desktop/PHC_Backup_2026/phc-tools/telegram-bot-public && caffeinate -i node index.js`. Keep the window open, the Mac plugged in and the lid open.
2. As a background service (no Terminal window, starts at login, restarts after a crash): `bash ~/Desktop/PHC_Backup_2026/phc-tools/telegram-bot-public/deploy/mac/install-mac-service.sh`. Run the same line again after every code change or new listings.csv. Remove it with `deploy/mac/uninstall-mac-service.sh`.

For either way, in System Settings, Battery (or Energy), Options, turn on "Prevent automatic sleeping on power adapter when the display is off". A closed lid still puts a laptop to sleep.

Use the Google Cloud steps above when you want the bot to stay up with the Mac off. Run it on only one machine at a time.
