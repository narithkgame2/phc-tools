# 🤖 PHC Telegram Bot Staging Lab (@Nick_REAKH_Bot)

> **Purpose:** Dedicated staging test model and validation environment for the Property Hub Cambodia Telegram Client Concierge and Off-Plan Advisory Engine.

---

## 📁 Directory Structure

```text
telegram-bot-staging/
│
├── index.js                      # Main Bot Poller (connects to Telegram Bot API)
├── server.js                     # Local Studio & Cockpit Server (port 8888)
│
├── engines/                      # Core Intelligence & Business Rules
│   ├── search-concierge.js       # 5-step search flow, filter hierarchy & anchoring
│   ├── project-advisor.js        # TS7 developer calculator & floor proximity scoring
│   └── channel-syncer.js         # Telegram channel auto-intake (every 30 mins)
│
├── config/                       # Live Configuration
│   └── chat-tree-config.json     # Editable step labels, prompts, button layouts
│
├── data/                         # Verified Inventory & State Layer
│   ├── multi-channel-inventory.json # 154 scraped listings across 5 channels
│   ├── bot-state.json            # Active user sessions & lead capture log
│   └── projects/
│       └── time-square-7.json    # 48 verified duplex units (Q3 2028 completion)
│
├── studio/                       # Visual Canva & Dashboards
│   ├── canvas.html               # Interactive Canva Step Studio & phone simulator
│   ├── bot-system-cockpit.html   # System Cockpit
│   └── telegram-catalog.html     # Mini App Catalog
│
└── tests/                        # Automated Test Suite
    └── offplan-engine.test.js    # 12 stress-test scenarios (100% pass)
```

---

## 🚀 Quick Start Commands

### 1. Run the Telegram Bot
```bash
node index.js
```
*Listens live on Telegram for:*
* `/start` — Private client welcome & VIP menu
* `/explore` — 5-step minimal search concierge with 3-property comparative anchoring
* `/ts7` — Developer duplex advisory engine (e.g. `/ts7 38c1`)
* `/tour` — VIP private tour booking
* `/guide` — Foreign buyer tax & legal guide

### 2. Launch the Canva Step Studio
```bash
node server.js
```
*Open in Browser:*
* **Canva Step Studio:** `http://localhost:8888/canvas`
* **System Cockpit:** `http://localhost:8888/cockpit`

### 3. Run Automated Tests
```bash
node tests/offplan-engine.test.js
```
*(All 12 edge cases & financial calculations verified 100%)*

---

## 🎨 Nick's Permanent UX Rules
1. **Zero Truncation Rule:** Never place buttons with >14 characters in 2-column rows. Full-width pills (1 per row) are mandatory for prices and compound names.
2. **Quote Styling:** All listing cards must be formatted inside Telegram `<blockquote>...</blockquote>` blocks.
3. **Comparative Anchoring:** Output exactly 3 listings ordered:
   * ⭐️ `TOP RECOMMENDATION · Sweet Spot` (Best balance)
   * ⚓ `PREMIER BENCHMARK · Luxury Anchor` (High-tier benchmark)
   * 💡 `SMART VALUE · Agile Alternative` (Entry price point)
4. **Direct Handoff:** Always offer `[ 💬 Inquire with Nick Directly ]` on result cards.
