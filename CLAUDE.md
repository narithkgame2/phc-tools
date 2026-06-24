# CLAUDE.md — Property Hub Cambodia (PHC) Internal OS

## WHO WE ARE

**Company:** Property Hub Cambodia (PHC) — premium multilingual real estate advisory, BKK1 Phnom Penh  
**Website:** https://propertyhubcambodia.com  
**Team:** Nick (CEO) · Monika (Co-Founder, Japanese/Russian/EN market) · Reza (Co-Founder, European/German market)  
**Main line:** 011 666 952 · t.me/PropertyHubCambodia

**7 buyer segments:** English/Western · Japanese · German/European · Russian · Cambodian Local · Cambodian Overseas · VIP ($500K+)

---

## TWO SEPARATE CODEBASES

| Codebase | Path | Stack | Hosting |
|----------|------|-------|---------|
| **PHC Tools** (this repo) | `~/Desktop/phc-tools/` | Single-file HTML · Vanilla JS · Google Sheets | GitHub Pages |
| **PHC Website** | `~/Desktop/phc-website/` | React · Vite · TypeScript · shadcn-ui · Tailwind · Supabase | Vercel |

This CLAUDE.md is for **PHC Tools** only.  
The website has its own CLAUDE.md at `~/Desktop/phc-website/CLAUDE.md`.

---

## PHC TOOLS — OVERVIEW

**Rule:** Every tool is a single self-contained `.html` file. No frameworks. No build step. Google Fonts CDN is the only external resource.

**Repo:** narithkgame2/phc-tools  
**Live hub:** https://narithkgame2.github.io/phc-tools/  
**Mirror repo:** NickCambodia/phc-tools (manual fork — sync via "Sync fork" on GitHub when ready)  
**Mirror live hub:** https://nickcambodia.github.io/phc-tools/  
**Local path:** /Users/narithk/Desktop/phc-tools/

### File Inventory

| File | Status | Live URL |
|------|--------|----------|
| `index.html` | ✅ Live | /phc-tools/ |
| `PHC_Task_Manager_v4.html` | ✅ Live + Sheets | /phc-tools/PHC_Task_Manager_v4.html |
| `PHC_Lead_Tracker.html` | ✅ Live + Sheets | /phc-tools/PHC_Lead_Tracker.html |
| `PHC_Sales_Desk.html` | ✅ Live | /phc-tools/PHC_Sales_Desk.html |
| `PHC_Agent_Training_v3.html` | ✅ Live | /phc-tools/PHC_Agent_Training_v3.html |
| `PHC_Proposal_Generator.html` | ✅ Live | /phc-tools/PHC_Proposal_Generator.html |
| `PHC_Client_Manager.html` | ✅ Live | /phc-tools/PHC_Client_Manager.html |
| `PHC_Message_Builder.html` | ✅ Live | /phc-tools/PHC_Message_Builder.html |
| `PHC_Investment_Explorer.html` | ✅ Live | /phc-tools/PHC_Investment_Explorer.html |
| `PHC_Setup_Tracker.html` | ✅ Live | /phc-tools/PHC_Setup_Tracker.html |
| `PHC_Lead_Magnet.html` | ✅ Live | /phc-tools/PHC_Lead_Magnet.html |
| `PHC_Market_Intelligence_Cheat_Sheet.html` | ✅ Live | /phc-tools/PHC_Market_Intelligence_Cheat_Sheet.html |
| `PHC_CEO_Dashboard.html` | ✅ Live | /phc-tools/PHC_CEO_Dashboard.html |
| `PHC_Commission_Tracker.html` | ✅ Live | /phc-tools/PHC_Commission_Tracker.html |
| `PHC_CEO_Business_Plan.html` | ✅ Live | /phc-tools/PHC_CEO_Business_Plan.html |
| `PHC_System_Map.html` | ✅ Live | /phc-tools/PHC_System_Map.html |
| `PHC_AppsScript.gs` | ✅ Deployed | Google Apps Script (bound to PHC CRM sheet) |
| `PHC_Bridge_Script.gs` | ✅ Done | Apps Script bound to lead inquiry sheet |

---

## PASSWORD PROTECTION

Every tool has an inline password gate (sessionStorage — clears when browser closes).

| Level | Password | Who |
|-------|----------|-----|
| Agent | `PHC2026` | All team — Monika, Reza, Mey, Marina |
| Director | `Nick@PHC2026` | Nick only |

- Nick's director password also unlocks all agent tools automatically
- Gate check pattern (agent tools): `sessionStorage.getItem('phc_agent_auth')==='1' || sessionStorage.getItem('phc_ceo_auth')==='1'`
- Gate check pattern (director tools): `sessionStorage.getItem('phc_ceo_auth')==='1'`

---

## GOOGLE SHEETS DATABASE

**Spreadsheet name:** PHC CRM  
**Spreadsheet ID:** `1XAfvcbv86E2PgGInaYVr2c9QTOLIFHfDEYFLkRPAjHw`  
**URL:** https://docs.google.com/spreadsheets/d/1XAfvcbv86E2PgGInaYVr2c9QTOLIFHfDEYFLkRPAjHw/

### Tab schemas

**Tasks** (Task Manager v4)
`id, name, status, priority, category, due, assignees, memo, link, createdAt, updatedAt`

**Leads** (Lead Tracker)
`id, createdAt, updatedAt, fullName, nationality, phone, telegram, email, source, budget, timeline, interestedIn, stage, score, agent, notes, lastContact, followUpDate, followUpAction, activities`

> **Note:** `telegram` was added after the initial schema. Run `migrateLeadsSchema()` once in Apps Script to add this column to an existing Leads sheet without losing data.

**Clients**
`id, createdAt, updatedAt, name, nat, telegram, phone, project, unit, floor, bookingDate, spa, titleStatus, payDay, payAmount, payTotal, payMade, bank, status, notes`

**Deals** (Commission Tracker — run `initializeAll()` if tab missing)
`id, createdAt, updatedAt, closedDate, clientName, project, unit, salePrice, commissionRate, commissionTotal, nickPct, monikaPct, rezaPct, nickAmt, monikaAmt, rezaAmt, agent, notes`

---

## APPS SCRIPT API (PHC_AppsScript.gs)

**Web App URL:** `https://script.google.com/macros/s/AKfycbzlAxcJqEI3upZ18sm-mj2Gxd3w2XSkD_YYqgkZ4kdw2_AV3V8f2B4qVcPESHZTOq2k8Q/exec`  
**Settings:** Execute as Me · Anyone can access  
**CORS strategy:** POST uses `mode:'no-cors'` + `Content-Type: text/plain` (avoids preflight; response is opaque — do not try to read it)

```
GET  ?action=ping                       → { ok: true, ts: "..." }
GET  ?action=getAll&sheet=Tasks         → [ ...row objects ]
GET  ?action=getAll&sheet=Leads         → [ ...row objects ]
GET  ?action=getAll&sheet=Clients       → [ ...row objects ]
GET  ?action=getAll&sheet=Deals         → [ ...row objects ]

POST { action: "insert", sheet: "Leads", data: { id, ... } }      → { success: true, id }
POST { action: "update", sheet: "Clients", id: "...", data: {} }   → { success: true }
POST { action: "delete", sheet: "Deals", id: "..." }               → { success: true }
```

```javascript
// GET — reads are fine, response is JSON
const res = await fetch(API_URL + '?action=getAll&sheet=Leads');
const leads = await res.json();

// POST — writes use no-cors; NEVER call .json() on the response
await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },  // MUST be text/plain
  body: JSON.stringify({ action: 'insert', sheet: 'Leads', data: leadObject }),
  mode: 'no-cors'  // MUST be no-cors
});
```

### Apps Script setup (when redeploying)
1. Open PHC CRM sheet → Extensions → Apps Script → paste full `PHC_AppsScript.gs`
2. Run `initializeAll()` once — creates/formats all 4 tabs
3. Deploy → New Deployment → Web App → Execute as Me · Anyone → copy URL

---

## TASK MANAGER v4 — ARCHITECTURE

**File:** `PHC_Task_Manager_v4.html`

### localStorage keys
```javascript
const LS_API   = 'phc_tasks_api';    // Web App URL (DEFAULT_API pre-baked)
const LS_CACHE = 'phc_tasks_cache';  // Task array JSON cache
const LS_DOCS  = 'phc_tasks_docs';   // Doc tab notes, keyed by nav section
```

### Data shape mapping (CRITICAL — never mix these)
Sheets stores `priority` + `category`. JS object uses `pri` + `cat`.

```javascript
function taskToRow(t) {          // JS → Sheets
  return { ..., priority: t.pri, category: t.cat, assignees: t.assignees.join(',') };
}
function rowToTask(row) {        // Sheets → JS
  return { ..., pri: row.priority, cat: row.category, assignees: row.assignees.split(',').filter(Boolean) };
}
```

### Task ID rule (CRITICAL)
New tasks: `'T' + Date.now()` — string with letter prefix.  
**Always quote IDs in event handlers:**
```javascript
onclick="openEditModal('${t.id}')"    // CORRECT
onclick="openEditModal(${t.id})"      // WRONG — breaks on T-prefixed IDs
```
This applies everywhere: `openEditModal`, `toggleDone`, `cycleStatus`, `deleteTask`, `onDragStart`, `schedDragStart`.

### Views
- **List** — grouped by status (Overdue → In Progress → Review → To Do → Done → Stuck)
- **Board** — Kanban drag & drop
- **Schedule** — calendar month view, drag chips to reschedule
- **Doc** — rich text notepad per nav section, persisted to `LS_DOCS`

### Values
- **Priority:** `urgent` / `high` / `normal`
- **Status:** `To Do` / `In Progress` / `Review` / `Done` / `Stuck`
- **Category:** `Sales & Listings` / `Content & Marketing` / `Admin & Operations` / `Training` / `Japanese Market`
- **Assignees:** `N` (Nick) · `M` (Monika) · `R` (Reza) · `Me` (Mey/Content) · `Ma` (Marina/Support)

---

## LEAD TRACKER v3 — ARCHITECTURE

**File:** `PHC_Lead_Tracker.html`  
**localStorage:** `phc_api_v3` (URL), `phc_leads_v3` (cache)

**Stage flow:** `New Lead → Contacted → Viewing → Negotiating → Closed → Hold → Released`

**Lead scoring:**
```
Score = Math.round((nationalityScore + budgetScore + timelineScore) / 3)
VIP=5, A=4, B=3, C≤2

Nationality: Japanese=5, German=4, Singaporean=4, British=3, Cambodian=3, Russian=3, Chinese=3, Other=2
Budget:      $500K+=5, $300K-500K=4, $200K-300K=3, $100K-200K=2, Under $100K=1
Timeline:    0-3m=5, 3-6m=4, 6-12m=2, 12+m=1
```

**Convert Lead → Client:** When stage = Closed, a "→ Convert to Client" button appears in the drawer. Clicking saves `phc_convert_pending` to localStorage and opens Client Manager in a new tab, which pre-fills the new client modal.

---

## CLIENT MANAGER — ARCHITECTURE

**File:** `PHC_Client_Manager.html`  
**localStorage:** `phc_clients_cache`, `phc_clients_api`

**Nationality codes:** `JP=Japanese, DE=German/European, EN=English/Western, RU=Russian, KH=Cambodian, CN=Chinese`

**Payment day clamping:**
```javascript
function clampPayDay(y, m, d) { return Math.min(d, new Date(y, m+1, 0).getDate()); }
```

---

## COMMISSION TRACKER — ARCHITECTURE

**File:** `PHC_Commission_Tracker.html`  
**Requires:** Deals tab in PHC CRM sheet — run `initializeAll()` in Apps Script if missing

**Commission calculation:**
```javascript
commissionTotal = salePrice * (commissionRate / 100)
nickAmt  = commissionTotal * (nickPct  / 100)
monikaAmt = commissionTotal * (monikaPct / 100)
rezaAmt  = commissionTotal * (rezaPct  / 100)
// nickPct + monikaPct + rezaPct must = 100 (validated before save)
```

**Deal IDs:** `'D' + Date.now()`

---

## BRIDGE SCRIPT — LEAD INQUIRY SHEET → PHC CRM

**File:** `PHC_Bridge_Script.gs`  
**Lead inquiry sheet ID:** `1-YtoUwEp-dQfMsl7AHbM1rbaG5rwUpPu9QheLEsyOKI`

- Run `setupTrigger()` once — installs onChange trigger
- Run `syncAllToPHC()` — backfills all existing rows (safe to re-run)
- Bridge IDs are prefixed `B-` (e.g. `B-L-20260202-192549`)

---

## DESIGN SYSTEM

```css
--navy:       #083467   /* topbar, headers, primary CTA */
--gold:       #cc9d4d   /* accents, hover, badges */
--gold-light: #e8c47a
--gold-pale:  #fdf3e3
--cream:      #fdf8f0
--g1:         #f5f6f8   /* page background */
--g2:         #e8ecf2   /* borders */
--g3:         #c0c8d4
--g4:         #7a8799   /* secondary text */
--text:       #1a2535
--red:        #d63031
--green:      #00b894
--orange:     #e17055
```

**Fonts:** DM Sans (UI) · DM Serif Display (hero only) · DM Mono (labels/numbers)

**Component patterns:**
- Header: navy 54px, sticky
- Primary btn: gold bg, navy text
- Drawer: right panel, navy header
- Toast: navy bg, gold left border, bottom-right, 3s auto-dismiss
- Password gate: navy full-screen overlay, white card

**Stage badge colors:**
```
New Lead:    #dbeafe / #1e40af   Contacted:   #fef3c7 / #92400e
Viewing:     #d1fae5 / #065f46   Negotiating: #ede9fe / #4c1d95
Closed:      #083467 / #cc9d4d   Hold:        #f1f5f9 / #475569
Released:    #fee2e2 / #991b1b
```

---

## CODING STANDARDS

- Single-file HTML — HTML + CSS + JS all in one `.html` file
- Vanilla JS only — no React, Vue, jQuery
- Google Fonts CDN is the only allowed external resource
- `localStorage` keys always prefixed `phc_`
- New IDs: `'T' + Date.now()` (tasks) · `'D' + Date.now()` (deals) · `crypto.randomUUID()` (leads/clients)
- Timestamps: `new Date().toISOString()`
- API writes: `Content-Type: text/plain` + `mode: 'no-cors'` + `try/catch`
- API reads: plain fetch, response is a JSON array
- localStorage always used as cache/fallback
- Mobile responsive required on every tool

---

## PROJECTS REFERENCE (18 properties)

**Phnom Penh:**
Time Square 7 · Time Square 8 · Time Square 9 · Time Square 10 · Time Square 11 · Kingston Royale · Le Conde BKK1 · GATO Tower · Odom Living · Odom Tower · UC88 Wyndham Garden · J Tower 3 · Diamond Bay Garden · Norea Square · Picasso Sky Gemme

**Siem Reap:** Angkor Grace · Rose Apple Square

**Sihanoukville:** LZ Sea View Premium

---

## FULL SYSTEM ARCHITECTURE

### Lead Entry Points
Instagram (DMs · comments · ads) · Facebook (DMs · comments · ads) · Telegram (@PHCPropertyBot · channel · project groups) · WhatsApp 011 666 952 · Website propertyhubcambodia.com (lead form + Mailchimp) · Referral/QR

### Automation Layer
- **ManyChat** — qualification flow (budget · timeline · nationality), Lead Magnet delivery, VIP routing ($500K+ → Nick direct), Calendly site visit booking
- **Make.com** — team Telegram alerts on new lead, Mailchimp 3-email nurture (website leads), payment reminders (5 days before due), post-proposal follow-up D1/3/7, SPA checklist (24h after booking), construction milestone broadcasts, handover prep package (90 days out)

### Client Lifecycle
**Before Sale:** Lead captured → qualified → Lead Magnet → team alert → agent follow-up → site visit → proposal → D1/3/7 follow-up

**During Sale:** Booking fee → welcome → SPA checklist → payment schedule → SPA signing → project group → payment reminders

**After Sale:** Monthly reminders → project updates → milestone broadcasts → handover prep (90 days) → key collection → rental management referral

---

## CEO DASHBOARD — ARCHITECTURE

**File:** `PHC_CEO_Dashboard.html`  
Fetches Tasks + Leads + Clients in parallel. Shows: active leads, pipeline value, overdue follow-ups, overdue tasks, payments due this week, pipeline by stage, lead score breakdown, recent leads, agent breakdown.

**Budget → pipeline value mapping:**
`Under $100K→$65K, $100K-$200K→$150K, $200K-$300K→$250K, $300K-$500K→$400K, $500K+→$650K`

---

## BUILD ROADMAP

| # | Tool | Status |
|---|------|--------|
| 1 | Google Sheets connection (4 tabs) | ✅ Done |
| 2 | Task Manager v4 | ✅ Done — list/board/schedule/doc, Sheets sync |
| 3 | Lead Tracker v3 | ✅ Done — kanban, scoring, activity log, dashboard |
| 4 | CEO Dashboard | ✅ Done — live morning view, pipeline, agent breakdown |
| 5 | Commission Tracker | ✅ Done — deal logging, auto-split |
| 6 | Client Manager | ✅ Done — payment schedules, SPA/title status |
| 7 | Convert Lead → Client | ✅ Done |
| 8 | Password protection | ✅ Done — PHC2026 / Nick@PHC2026 |
| 9 | Lead inquiry bridge | ✅ Done — Bridge Script syncs → PHC CRM |
| 10 | Auto-mirror to NickCambodia | 🔲 Pending — manual sync for now |

---

## KNOWN ISSUES / GOTCHAS

1. **ID quoting** — always `'${t.id}'` in onclick, never `${t.id}` (breaks on T-prefixed string IDs)
2. **taskToRow/rowToTask** — Sheets uses `priority`/`category`; JS uses `pri`/`cat`. Always go through the converters, never access directly.
3. **Git lock files** — stale `.git/*.lock` blocks commits: `rm .git/index.lock .git/HEAD.lock`
4. **Apps Script CORS** — POST must use `Content-Type: text/plain` to avoid preflight. Never call `.json()` on a POST response.
5. **Deals tab missing** — Commission Tracker requires Deals tab. Run `initializeAll()` in Apps Script if not there.
6. **NickCambodia fork** — does NOT auto-sync. Nick must click "Sync fork" manually on GitHub.
7. **Phone numbers in Sheets** — Numbers starting with `+` interpreted as formulas. Set phone columns to Plain Text: Leads col F, Clients col G.
8. **Leads telegram column** — If Leads tab was created before telegram field, run `migrateLeadsSchema()` in Apps Script once.
9. **Bridge script IDs** — Leads from inquiry sheet get `B-` prefix IDs to prevent duplicates on re-sync.

---

## GIT WORKFLOW

```bash
cd /Users/narithk/Desktop/phc-tools

# Standard push
git add -A
git commit -m "feat/fix: description"
git push

# Push a single file
git add PHC_Task_Manager_v4.html
git commit -m "fix: description"
git push

# If lock files block git
rm .git/index.lock .git/HEAD.lock
```

GitHub Pages auto-deploys ~30 seconds after push.  
All tools live at: https://narithkgame2.github.io/phc-tools/
