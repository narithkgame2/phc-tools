# Project Design Memo: Developer Intelligence & Client Quotation Architecture

**Date:** 2026-11-27  
**Author:** Antigravity & Nick  
**Scope:** `@Nick_REAKH_Bot` (Staging Bot), `project-advisor-engine.cjs`, `nickcambodia/public/assets/projects/`

---

## 1. Why We Designed It This Way (Design Decisions)

### A. Quotation Presentation vs. Due Diligence Walls
- **Original Approach:** Early pilot cards bundled all developer due diligence, title risk profiles, exit liquidity scores, and courier instructions into a single 80-line message.
- **Client Reality & User Feedback:** Clients on mobile find dense text blocks overwhelming. What converts an interested investor is clarity:
  1. The unit layout plan (visual evidence).
  2. Concise specifications (Floor, Orientation, Gross vs. Net sqm).
  3. Clean 3-box pricing (List Price, Promotional Savings, Final Net Price with \$/sqm).
  4. Numbered payment stages (① Booking, ② SPA Down Payment, ③ Monthly Installment breakdown, ④ Handover Balance).
  5. One-click link to the interactive VIP-Desk.
- **Settled Style:** Bold title, single-line `▫️` bullet rows, numbered `①②③④` payment stages, and zero unverified filler text.

### B. Slash (`/`) and Hash (`#`) Input Normalization
- **The Problem:** In Telegram, typing `/17S1` is natural because Telegram prompts commands with a `/`. Previously, any command without an exact handler fell back to the "New Client Inquiry" lead alert, frustrating users trying to look up units.
- **The Solution:** Strip leading `/` and `#` in `findUnit` before querying unit databases. `17S1`, `/17S1`, `#17S1`, `707`, `/707`, `#707` all resolve instantly to the exact unit.

### C. VIP-Desk Hosting on `nickcambodia.com`
- **Domain Context:** Nick's public personal brand is anchored at `https://www.nickcambodia.com`.
- **Architecture:** The VIP-Desk is hosted at `https://www.nickcambodia.com/vip-desk/?project=[code]&unit=[code]`.
- **Parameter Mapping:** Project identifiers in URLs use short codes (`ts7`, `ts8`, `ts9`, `ts10`, `ts11`, `mvt2`, `mvt6`) for clean, shareable URLs.

### D. Canonical Asset Hierarchy in `nickcambodia`
- **Why in `nickcambodia/public/assets/projects/`:**
  - Putting assets in the website's public folder makes them immediately web-accessible via CDN/Vercel without requiring extra hosting infrastructure.
  - The VIP-Desk web application and the Telegram Bot both reference the same canonical assets.
  - Future videos and showroom walkthroughs dropped into `videos/` can be served directly to both web visitors and bot users.

### E. Mekong View Towers Payment Strategy (Option 1 vs Option 2)
- **Why 1% / Month as Default:** MVT has flexible developer terms, but quoting irregular amounts (e.g. \$562.74/mo) creates friction. Standardizing on **10% Down Payment + 24 months @ 1%/mo + 66% on Handover** provides a clean, predictable headline structure.
- **Building Fees Transparency:** Operating costs (Management Fee \$0.70/sqm, Electricity \$0.25/kWh, Water \$0.30/m³, Parking \$25/mo, Free Motor, Free Decor) are included directly in MVT proposals so buyers know their total carrying costs upfront.

---

## 2. Optimization Roadmap (Ideas for Future Enhancement)

### 1. Telegram Media Group (Album / Video Carousel)
- **Current State:** Bot attaches a single high-resolution unit layout photo.
- **Future Optimization:** When extra media exists in `facilities/` or `videos/`, send a 3-item media group:
  1. Unit layout plan.
  2. Building exterior 3D hero render.
  3. 10–15 second showroom / sky pool walkthrough video (`.mp4`).
  Followed by the inline button navigation strip.

### 2. Multi-Language Quotation Generation (EN / JA Toggle)
- **Current State:** Proposals default to English luxury format.
- **Future Optimization:** Detect user language (`userLanguages[chatId] === 'JP'`) and automatically render the quotation in Japanese:
  - `お見積書 (Buyer Quotation)`
  - `専有面積 (Net Area)` / `総面積 (Gross Area)`
  - `お支払いスケジュール (Payment Schedule)`
  - Disclaimer: `※利回り・価格は参考値であり、将来の収益を保証するものではありません。`

### 3. Dynamic PDF Quotation Generation via Bot
- **Opportunity:** Since `phc-tools` already has `pdfkit` installed, the bot could have an inline button: `📄 Generate Official PDF Quotation`.
- **Outcome:** Generates a branded, downloadable A4 PDF quotation on the fly and delivers it directly into the Telegram chat.

### 4. Live Developer Inventory Sync Webhooks
- **Opportunity:** Connect unit status updates (`available` vs `sold`) directly to Google Sheets or developer spreadsheets so price or inventory changes update automatically without editing JSON files.
