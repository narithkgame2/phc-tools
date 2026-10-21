# 🕵️ PHC Telegram Bot Staging Lab — Claude Audit Brief

> **For Claude:** You have been asked by Nick (CEO, Property Hub Cambodia) to conduct a thorough technical, data, and UX compliance audit of the PHC Telegram Bot Staging Lab (`@Nick_REAKH_Bot`).

---

## 🎯 System Scope & Objectives
The staging lab is located in `phc-tools/telegram-bot-staging/`. It houses two core production-bound engines:
1. **Off-Plan Developer Copilot (`/ts7`)**: Piloting Time Square 7 (TK) duplexes. Calculates promotional pricing (12% off + $3,000 rebate), dynamic 36-month payment schedules, outer perimeter orientation, and adjacent floor stack recommendations when a unit is taken.
2. **Search Concierge (`/explore`)**: A 5-step minimal luxury filter hierarchy (Off-Plan/Resale -> Type -> District -> Budget) that queries 154 multi-channel listings and outputs 3 comparative listings using the PHC 3-Property Anchoring Framework.

---

## 📋 6-Point Audit Checklist

### 1. Data Integrity & Provenance Check
* **File:** `data/projects/time-square-7.json`
* **Audit Items:**
  * Verify handover completion date is strictly **Q3 2028** (never Q4 2027).
  * Verify duplex gross size is strictly **65 sqm**.
  * Verify promotional pricing matches developer price sheets: `List Price * 0.88 - 3000`.
  * Confirm that synthetic yield percentages (e.g. `~7.9% Net`) have been completely excised.

### 2. Regulatory & Advisory Guardrails
* **File:** `engines/project-advisor.js`
* **Audit Items:**
  * Verify that developer list price increases are **never** described as "capital growth" or "capital appreciation".
  * Verify that inner courtyard units explicitly mention partial views / natural light constraints.
  * Verify that client budget overruns trigger an explicit advisory warning (`⚠️ Budget Note: ...`).

### 3. Automated Test Verification
* **Command to Run:**
  ```bash
  node tests/offplan-engine.test.js
  ```
  *(or from repo root: `node telegram-bot-staging/tests/offplan-engine.test.js`)*
* **Expected Result:** **12 / 12 tests must PASS (100%)**.

### 4. UX & Mobile Truncation Standards (Nick's Rules)
* **Files:** `config/chat-tree-config.json` & `engines/search-concierge.js`
* **Audit Items:**
  * **Zero Truncation Rule:** Are buttons with >14 characters set to `1_per_row` (full-width)? (Specifically: all budget brackets and compound terms like `🏗️ Off-Plan (New Developments)`).
  * **Quote Style:** Are listing options wrapped in Telegram `<blockquote>...</blockquote>` tags?
  * **Concierge Header:** Does the search header follow the minimal 2-line format (`SEARCH CONCIERGE` / `──────────` / `Step X of Y`)?

### 5. PHC 3-Property Comparative Anchoring
* **File:** `engines/search-concierge.js`
* **Audit Items:**
  * Verify the 3-property comparative framing:
    1. `⭐️ TOP RECOMMENDATION · Sweet Spot` (Middle price / optimal balance)
    2. `⚓ PREMIER BENCHMARK · Luxury Anchor` (Highest price / quality standard)
    3. `💡 SMART VALUE · Agile Alternative` (Lowest price / entry point)
  * Verify that each option includes an honest `💡 Why this fits: ...` broker rationale.
  * Verify presence of `[ 💬 Inquire with Nick Directly ]` action button.

### 6. Telegram Parser Safety & UTF-8 Cleanliness
* **Files:** `engines/search-concierge.js` & `engines/project-advisor.js`
* **Audit Items:**
  * Check that `escapeHtml()` escapes `&`, `<`, and `>`.
  * Check that emojis use Unicode-safe regex (`/\p{Emoji}/u`) to prevent broken surrogate pairs that trigger Telegram `400 Bad Request: text must be encoded in UTF-8`.

---

## 📝 Required Audit Output Format
Please provide your audit in 4 concise sections:
1. **Executive Verdict:** (Pass / Needs Attention / Fail) with an overall score out of 100.
2. **Automated Test Results:** Output of the 12 unit tests.
3. **UX & Compliance Findings:** Detailed verification of Nick's 6 rules.
4. **Concrete Recommendations:** Any remaining edge cases or code refinements.
