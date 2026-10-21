# PHC AGENT OFF-PLAN COPILOT — ARCHITECTURE & EXECUTION PLAN
**Target User:** Nick (Lead Broker & Director, Property Hub Cambodia)  
**Primary Purpose:** Internal Agent Copilot tool to parse developer price lists/brochures, calculate exact promotional payment schedules, compare units/stacks, and export instant 1-tap client quotations (Telegram text & 1-page PDF).

---

## 1. THE PROBLEM IT SOLVES
In Phnom Penh, developers (Time Square, Megakim, Urban Village, J Tower, Le Condé, etc.) frequently share off-plan inventory, promotions, and price lists as **images or PDFs** in broker Telegram groups.
Availability changes rapidly, and calculating exact payment schedules with current promotions (e.g., 12% discount + $3,000 rebate) usually requires opening Excel or Canva, costing 20–30 minutes per client inquiry.

---

## 2. THE 4 NATURAL AGENT STEPS (WORKFLOW)

### Step 1: Select Project
Agent selects or queries an active development:
- E.g., Time Square 7 (Toul Kork), Time Square 8, Time Square 11, J Tower 3, Le Condé, Odom Living.

### Step 2: Live Availability & Stack Matrix
Displays the current available units grouped by **Floor Tier** and **View Orientation**:
- **Outer Perimeter Units** (e.g. C1, D1): Unobstructed panoramic city views, superior view equity and resale liquidity.
- **Inner Courtyard Units** (e.g. C2, D2): Facing central atrium / inner corridor.
- Displays Net Price after active promotional discounts + monthly construction installments ($/month).

### Step 3: Broker Comparison & Upsell Engine
Allows side-by-side comparison between floors:
- E.g., Compare **Unit 38C1** (Floor 38, $81,315 Net / $813/mo) vs **Unit 45AC1** (Floor 45 Top Penthouse, $88,245 Net / $882/mo).
- Automatically calculates the upsell delta: *"For just +$69/month more, upgrade to the 45th floor top penthouse level!"*

### Step 4: Export Deliverables for Client
1-tap export options:
1. **Telegram / WhatsApp Client Card**: Pre-formatted blockquoted message ready to forward.
2. **Branded 1-Page PDF Quotation**: Built using `pdfkit` featuring project cover, unit specs, full payment schedule table (Booking, 10% Down, 36 Months, Handover), floor plan thumbnail, and Nick's contact.

---

## 3. FEEDBACK LOOP: "UNIT IS TAKEN"
When a unit (e.g. 38C1) is reserved by another agent:
1. Agent taps `[ ❌ Mark 38C1 as Sold ]` or sends new developer price list image.
2. The engine immediately flags `38C1` as SOLD in `phc-tools/data/projects/{projectId}.json`.
3. The engine automatically pivots and presents the **next best alternative unit** with the same orientation and price (e.g. Unit `38D1`), preventing client drop-off.

---

## 4. PILOT PROJECT: TIME SQUARE 7 (TS7) DUPLEX
- **Location:** Street 315, Toul Kork, Phnom Penh
- **Developer:** Megakim World Corp
- **Handover:** Q4 2027 (49 Floors)
- **Unit Analyzed:** 1-Bed Duplex Loft (65.0 sqm Gross Area)
- **Active Promotion:** 12% Developer Discount + $3,000 USD Cash Rebate
- **Baseline Net Pricing:**
  - 38F (38C1/38D1): List $95,813 ➡️ **Net $81,315 USD** ($1,251/sqm) · **$813 / month**
  - 45AF (45AC1 Penthouse): List $103,688 ➡️ **Net $88,245 USD** ($1,357/sqm) · **$882 / month**
- **Schedule:** $1,000 booking deposit, 10% down payment, 1%/mo for 36 months, 54% handover balance.

---

## 5. EXISTING CODE & ASSET PATHS
- **Media & Plans Asset Folder:** `phc-website/Property Listing/Time Square 7/` (Floor Plan, Unit Layout, Facility, Photos)
- **Project JSON Model:** `phc-tools/data/projects/time-square-7.json`
- **Calculation Engine:** `phc-tools/project-advisor-engine.cjs`
- **Telegram Bot Poller:** `phc-tools/staging-bot-poller.cjs`
- **Supabase Unit Draft Intake:** `phc-website/supabase/migrations/20261017180000_add_unit_draft_intake.sql`

---

## 6. HISTORICAL MEMORY & EVOLUTION TRACKING (THE BROKER ADVANTAGE)
Average agents have zero memory. PHC retains permanent historical versioning across all developments:

### 1. Dual Storage Architecture
- **Local Storage (`phc-tools/data/projects/{projectId}/`):**
  - `project-master.json`: Current live availability & active promotion.
  - `price-lists/`: Versioned raw developer files (`2024-05_v1.0_Launch.pdf`, `2026-10_v2.0_Duplex_Promo.jpg`).
  - `history/pricing-evolution.json`: Timestamped price changes per stack.
  - `history/layout-changelog.md`: Architectural layout revisions between phases.
- **Google Drive Sync:**
  - Dedicated Google Drive intake folder (`PHC Property Database / {Project}`) for seamless mobile uploads from Telegram broker chats.

### 2. High-Value Client Advisory Metrics
- **Launch Arbitrage Metric:** Automatically calculates Current Net Price vs. Phase 1 Launch Baseline (e.g. *"7.6% Below Original Launch Price"*).
- **Layout Revision Protection:** Tracks subtle developer plan modifications (net area shrinkage, AC ledge shifts, column intrusions) to protect buyer interests.
- **Below-Launch VIP Resale Alerts:** Automatically triggers alerts when an urgent resale unit drops below the developer's original launch price.

