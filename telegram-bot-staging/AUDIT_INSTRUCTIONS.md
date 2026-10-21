# 🕵️ PHC Telegram Bot Staging Lab — Claude Re-Audit Brief

> **For Claude:** Nick (CEO, Property Hub Cambodia) has asked you to verify that all findings from your initial audit (Score: 58/100) have been resolved.

---

## 🎯 Verification Scope & Test Suites
The staging codebase is in `phc-tools/telegram-bot-staging/`.

### 1. Run the Full Automated Test Suite (22 Tests Total)
You can execute both automated test suites directly:
```bash
# 1. Developer Off-Plan Engine (12 Tests)
node telegram-bot-staging/tests/offplan-engine.test.js

# 2. Search Concierge, UX & Anchoring (10 Tests)
node telegram-bot-staging/tests/search-concierge.test.js
```
*Expected Result: 22 / 22 TESTS MUST PASS (100%).*

---

## 📋 Specific Findings Resolved for Audit

### Rule 1: Zero Button Truncation
* ✅ Property Type (Rent & Buy) set to `1_per_row` (full-width pills).
* ✅ Districts set to `1_per_row` (or strictly <=14 chars in grids).
* ✅ Results action buttons (`Next 3`, `Previous 3`, `Inquire`, `Refine`, `Catalog`) are all stacked 1 per row. Zero multi-column truncation.

### Rule 2: Real Developer Data & Down Payment Math
* ✅ Handover completion strictly Q3 2028.
* ✅ Duplex gross area strictly 65 sqm.
* ✅ Down payment balance explicitly labeled: `Down Payment Balance: $7,132 USD (10% total less deposit)`.
* ✅ Zero synthetic yields.

### Rule 3: Advisory Guardrails & Inner Units
* ✅ Inner courtyard units explicitly state: `overlooks the central internal courtyard void. Note: Provides courtyard views and moderate natural daylight compared to perimeter stacks, with an acoustic environment insulated from street noise.`
* ✅ Strictly zero "capital appreciation" or "capital growth" wording.
* ✅ Budget overrun warning (`⚠️ Budget Advisory`) triggers when client budget is below available units.

### Rule 4: 3-Property Anchoring & Elimination of Silent Relaxation
* ✅ **NO SILENT RELAXATION:** When a filter (e.g. Villa in BKK1 under $105k) finds 0 matches, it strictly returns `No Exact Matches (0)` with an honest category integrity notice. It NEVER secretly substitutes condos for villas!
* ✅ **Unpriced Items:** Time Square 7 and unpriced items are assigned `🏢 VERIFIED DEVELOPER PROJECT`, never falsely claiming to have the "lowest entry price".
* ✅ **Priced 3-Pack:** Sweet Spot (middle), Luxury Anchor (highest), Smart Value (lowest) with customized rationale.

### Rule 5: Formatting, Proposal Cards & Real Names
* ✅ TS7 proposal cards are cleanly wrapped in `<blockquote>...</blockquote>`.
* ✅ Building fallback uses clean project titles or `Phnom Penh Property`. Never invents fake `{district} Residence`.
* ✅ Corrupted replacement characters (`\uFFFD`) and orphaned surrogates (`0xD800-0xDFFF`) stripped from inventory.
* ✅ Links properly escape quotes (`&quot;`).

### Other Audit Items
* ✅ Step labeling: Buy is strictly 5 steps (Step 1 of 5 to Step 5 of 5); Rent is strictly 4 steps (Step 1 of 4 to Step 4 of 4).
* ✅ Distinct callbacks: Chroy Changvar (`srch_loc_cc`) and Peng Huoth (`srch_loc_ph`) are completely separate. Sen Sok (`srch_loc_sensok`) is separated from Toul Kork (`srch_loc_tk`).
* ✅ Token extraction: `process.env.TELEGRAM_BOT_TOKEN || '...'`.
