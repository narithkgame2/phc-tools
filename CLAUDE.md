# CLAUDE.md — Property Hub Cambodia (PHC) Internal OS

## PROJECT OVERVIEW

**Company:** Property Hub Cambodia (PHC) — premium real estate advisory, BKK1 Phnom Penh  
**Website:** cambodiapropertyhub.com  
**Stack:** Single-file HTML tools · Vanilla JS · Google Sheets (database) · Google Apps Script (API) · GitHub Pages (hosting)  
**Primary repo:** narithkgame2/phc-tools  
**Primary live hub:** https://narithkgame2.github.io/phc-tools/  
**Mirror repo:** NickCambodia/phc-tools (manual fork — sync via "Sync fork" on GitHub when ready)  
**Mirror live hub:** https://nickcambodia.github.io/phc-tools/  
**Local folder:** /Users/narithk/Desktop/phc-tools/  
**Team:** Nick (CEO), Monika (Co-Founder, Japanese market), Reza (Co-Founder, European market)

**Goal:** $0-cost internal OS — Pipedrive-quality UX without subscriptions.  
**Rule:** Every tool is a single self-contained .html file. No frameworks. No build step. No dependencies except Google Fonts CDN.

---

## FILE INVENTORY

| File | Access | Live URL |
|------|--------|----------|
| `index.html` | Agent (PHC2026) | /phc-tools/ |
| `PHC_Task_Manager_v4.html` | Agent | /phc-tools/PHC_Task_Manager_v4.html |
| `PHC_Lead_Tracker.html` | Agent | /phc-tools/PHC_Lead_Tracker.html |
| `PHC_Sales_Desk.html` | Agent | /phc-tools/PHC_Sales_Desk.html |
| `PHC_Agent_Training_v3.html` | Agent | /phc-tools/PHC_Agent_Training_v3.html |
| `PHC_Proposal_Generator.html` | Agent | /phc-tools/PHC_Proposal_Generator.html |
| `PHC_Message_Builder.html` | Agent | /phc-tools/PHC_Message_Builder.html |
| `PHC_Investment_Explorer.html` | Agent | /phc-tools/PHC_Investment_Explorer.html |
| `PHC_Lead_Magnet.html` | Agent | /phc-tools/PHC_Lead_Magnet.html |
| `PHC_Market_Intelligence_Cheat_Sheet.html` | Agent | /phc-tools/PHC_Market_Intelligence_Cheat_Sheet.html |
| `PHC_CEO_Dashboard.html` | Director (Nick@PHC2026) | /phc-tools/PHC_CEO_Dashboard.html |
| `PHC_Commission_Tracker.html` | Director | /phc-tools/PHC_Commission_Tracker.html |
| `PHC_Client_Manager.html` | Director | /phc-tools/PHC_Client_Manager.html |
| `PHC_Setup_Tracker.html` | Director | /phc-tools/PHC_Setup_Tracker.html |
| `PHC_CEO_Business_Plan.html` | Director | /phc-tools/PHC_CEO_Business_Plan.html |
| `PHC_System_Map.html` | Director | /phc-tools/PHC_System_Map.html |
| `PHC_AppsScript.gs` | — | Google Apps Script (bound to PHC CRM sheet) |

---

## PASSWORD PROTECTION

Every tool has an inline password gate (sessionStorage — clears when browser closes).

| Level | Password | Who |
|-------|----------|-----|
| Agent | `PHC2026` | All team — Monika, Reza, Mey, Marina |
| Director | `Nick@PHC2026` | Nick only |

**Rules:**
- Nick's director password also unlocks all agent tools automatically
- sessionStorage keys: `phc_agent_auth` and `phc_ceo_auth` (both set to `'1'` when authenticated)
- Gate check pattern (agent tools): `sessionStorage.getItem('phc_agent_auth')==='1' || sessionStorage.getItem('phc_ceo_auth')==='1'`
- Gate check pattern (director tools): `sessionStorage.getItem('phc_ceo_auth')==='1'`

---

## GOOGLE SHEETS DATABASE

**Spreadsheet name:** PHC CRM  
**Spreadsheet ID:** 1XAfvcbv86E2PgGInaYVr2c9QTOLIFHfDEYFLkRPAjHw  
**URL:** https://docs.google.com/spreadsheets/d/1XAfvcbv86E2PgGInaYVr2c9QTOLIFHfDEYFLkRPAjHw/

### Tabs and columns

**Tasks** (used by Task Manager v4)
`id, name, status, priority, category, due, assignees, memo, link, createdAt, updatedAt`

**Leads** (used by Lead Tracker)
`id, createdAt, updatedAt, fullName, nationality, phone, email, source, budget, timeline, interestedIn, stage, score, agent, notes, lastContact, followUpDate, followUpAction, activities`

**Clients** (used by Client Manager)
`id, createdAt, updatedAt, name, nat, telegram, phone, project, unit, floor, bookingDate, spa, titleStatus, payDay, payAmount, payTotal, payMade, bank, status, notes`

**Deals** (used by Commission Tracker — run `initializeAll()` in Apps Script to create this tab)
`id, createdAt, updatedAt, closedDate, clientName, project, unit, salePrice, commissionRate, commissionTotal, nickPct, monikaPct, rezaPct, nickAmt, monikaAmt, rezaAmt, agent, notes`

---

## APPS SCRIPT API (PHC_AppsScript.gs)

**Web App URL:** `https://script.google.com/macros/s/AKfycbzlAxcJqEI3upZ18sm-mj2Gxd3w2XSkD_YYqgkZ4kdw2_AV3V8f2B4qVcPESHZTOq2k8Q/exec`  
**Settings:** Execute as Me · Anyone can access  
**CORS strategy:** POST uses `mode:'no-cors'` + `Content-Type: text/plain` (avoids preflight; response is opaque — do not try to read it)

### Endpoints

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

### Calling pattern (all HTML tools)

```javascript
// GET — reads are fine, response is JSON
const res = await fetch(API_URL + '?action=getAll&sheet=Leads');
const leads = await res.json(); // returns plain array

// POST — writes use no-cors; never try to read the response
await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },  // MUST be text/plain
  body: JSON.stringify({ action: 'insert', sheet: 'Leads', data: leadObject }),
  mode: 'no-cors'  // MUST be no-cors — avoids CORS redirect failure
});
```

### Apps Script setup (when redeploying)
1. Open PHC CRM sheet → Extensions → Apps Script → paste full `PHC_AppsScript.gs`
2. Run `initializeAll()` once — creates/formats all 4 tabs (Tasks, Leads, Clients, Deals)
3. Deploy → New Deployment → Web App → Execute as Me · Anyone → copy URL

---

## TASK MANAGER v4 — ARCHITECTURE

**File:** `PHC_Task_Manager_v4.html`

### localStorage keys
```javascript
const LS_API   = 'phc_tasks_api';    // Web App URL (pre-baked as DEFAULT_API)
const LS_CACHE = 'phc_tasks_cache';  // Task array cache (JSON)
const LS_DOCS  = 'phc_tasks_docs';   // Doc tab notes (JSON, keyed by nav section)
```

### Data shape mapping (CRITICAL)
The Sheets row uses `priority` / `category`. The JS task object uses `pri` / `cat`.
Always use these converters — never mix the shapes:

```javascript
function taskToRow(t) {
  return { id, name, status, priority: t.pri, category: t.cat,
           due, assignees: t.assignees.join(','), memo, link, createdAt, updatedAt };
}
function rowToTask(row) {
  return { id, name, status, pri: row.priority, cat: row.category,
           due, assignees: row.assignees.split(',').filter(Boolean),
           memo, link, createdAt, updatedAt };
}
```

### Task ID rule (CRITICAL)
New tasks: `T1747523456789` (string with `T` prefix). Always quote in handlers:
```javascript
onclick="openEditModal('${t.id}')"   // CORRECT
onclick="openEditModal(${t.id})"     // WRONG — breaks on T-prefixed IDs
```

### Views
- **List** — grouped by status (Overdue → In Progress → Review → To Do → Done → Stuck)
- **Board** — Kanban drag & drop
- **Schedule** — calendar month view, drag to reschedule
- **Doc** — per-section notepad, persisted to localStorage

### Priority values: `urgent` / `high` / `normal`
### Category values: `Sales & Listings` / `Content & Marketing` / `Admin & Operations` / `Training` / `Japanese Market`
### Assignee codes: `N` (Nick) / `M` (Monika) / `R` (Reza) / `Me` (Mey/Content) / `Ma` (Marina/Support)

---

## LEAD TRACKER v3 — ARCHITECTURE

**File:** `PHC_Lead_Tracker.html`  
**localStorage:** `phc_api_v3` (API URL, set via "Setup Sheets" in sidebar), `phc_leads_v3` (cache)

### Stage flow
`New Lead → Contacted → Viewing → Negotiating → Closed → Hold → Released`

### Lead scoring
```
Score = Math.round((nationalityScore + budgetScore + timelineScore) / 3)
Labels: VIP=5, A=4, B=3, C≤2

Nationality: Japanese=5, German=4, Singaporean=4, British=3, Cambodian=3, Russian=3, Chinese=3, Other=2
Budget:      $500K+=5, $300K-500K=4, $200K-300K=3, $100K-200K=2, Under $100K=1
Timeline:    0-3m=5, 3-6m=4, 6-12m=2, 12+m=1
```

### Convert Lead → Client
When a lead's stage is **Closed**, a **"→ Convert to Client"** button appears in the drawer footer.  
Clicking it:
1. Saves `phc_convert_pending` to localStorage with `{ name, nat, phone, project, notes, leadId }`
2. Opens `PHC_Client_Manager.html` in a new tab

Client Manager reads and clears `phc_convert_pending` on `DOMContentLoaded`, opens the new client modal pre-filled.

**Nationality mapping (Lead → Client nat code):**
`Japanese→JP, German→DE, British→EN, Singaporean→EN, Cambodian→KH, Russian→RU, Chinese→CN`

---

## CLIENT MANAGER — ARCHITECTURE

**File:** `PHC_Client_Manager.html`  
**localStorage:** `phc_clients_cache` (client array), `phc_clients_api` (API URL)  
**API URL:** pre-baked as DEFAULT_API (no manual setup needed)

### Client data shape (Sheets columns)
`id, createdAt, updatedAt, name, nat, telegram, phone, project, unit, floor, bookingDate, spa (bool), titleStatus, payDay (1-28), payAmount, payTotal, payMade, bank, status, notes`

### Nationality codes (NATS object)
`JP=Japanese, DE=German/European, EN=English/Western, RU=Russian, KH=Cambodian, CN=Chinese`

### Payment day clamping
`payDay` is clamped to the actual last day of each month to prevent February rollover:
```javascript
function clampPayDay(y, m, d) { return Math.min(d, new Date(y, m+1, 0).getDate()); }
```

---

## CEO DASHBOARD — ARCHITECTURE

**File:** `PHC_CEO_Dashboard.html`  
Fetches Tasks + Leads + Clients in parallel on load. Shows:
- Stat cards: active leads, pipeline value, overdue follow-ups, overdue tasks, payments due this week
- Pipeline by stage (horizontal bar chart)
- Lead score breakdown (VIP / A / B / C)
- Recent leads (last 5)
- Overdue tasks, overdue follow-ups, payments due (right column)
- Agent breakdown: Nick / Monika / Reza with YTD earnings and follow-up status

**Budget → pipeline value mapping:**
`Under $100K→$65K, $100K-$200K→$150K, $200K-$300K→$250K, $300K-$500K→$400K, $500K+→$650K`

---

## COMMISSION TRACKER — ARCHITECTURE

**File:** `PHC_Commission_Tracker.html`  
**localStorage:** `phc_deals_cache`  
**Requires:** Deals tab in PHC CRM sheet — run `initializeAll()` in Apps Script if tab doesn't exist yet

### Deal data shape
`id, closedDate, clientName, project, unit, salePrice, commissionRate, commissionTotal, nickPct, monikaPct, rezaPct, nickAmt, monikaAmt, rezaAmt, agent, notes`

### Commission calculation
```javascript
commissionTotal = salePrice * (commissionRate / 100)
nickAmt  = commissionTotal * (nickPct  / 100)
monikaAmt = commissionTotal * (monikaPct / 100)
rezaAmt  = commissionTotal * (rezaPct  / 100)
// nickPct + monikaPct + rezaPct must = 100 (validated before save)
```

### Deal IDs: `'D' + Date.now()`

---

## DESIGN SYSTEM

### Brand colors
```css
--navy:       #083467
--gold:       #cc9d4d
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

### Fonts
- **DM Sans** — body, UI text
- **DM Serif Display** — hero headings only
- **DM Mono** — labels, numbers, monospaced data

### Component patterns
- Topbar: navy `#083467`, 54px, sticky
- Cards: white bg, `#e8ecf2` border, gold accent on hover
- Primary button: gold bg, navy text
- Drawer: right panel, navy header
- Toast: navy bg, gold left border, bottom-right, 3s auto-dismiss
- Password gate: navy full-screen overlay, white card, gold divider line

### Stage badge colors
```
New Lead:    bg #dbeafe  text #1e40af
Contacted:   bg #fef3c7  text #92400e
Viewing:     bg #d1fae5  text #065f46
Negotiating: bg #ede9fe  text #4c1d95
Closed:      bg #083467  text #cc9d4d
Hold:        bg #f1f5f9  text #475569
Released:    bg #fee2e2  text #991b1b
```

---

## CODING STANDARDS

- Single-file HTML — everything (HTML/CSS/JS) in one `.html` file
- Vanilla JS only — no React, Vue, jQuery, etc.
- External resource allowed: Google Fonts CDN only
- `localStorage` keys always prefixed `phc_`
- New IDs: `'T' + Date.now()` for task-style tools, `'D' + Date.now()` for deals, `crypto.randomUUID()` for leads/clients
- Timestamps: `new Date().toISOString()`
- API writes: always `mode:'no-cors'` + `Content-Type: text/plain`, wrapped in try/catch
- API reads: plain fetch, response is a JSON array
- localStorage always used as cache/fallback
- Mobile responsive required on every tool
- Never fabricate property data or prices

---

## PROJECTS REFERENCE

Dropdown options used across all tools:
```
Time Square 9 (Gatsby)
Time Square 8
Time Square 10 (Otres)
Time Square 11 BKK3
J Tower 2
J Tower 3
Le Conde BKK1
Royal Platinum
Peninsula Private Residences
G.A.T.O Tower
Multiple/TBD
```

---

## CAMBODIA BUSINESS RULES

- Foreign ownership: above ground floor only, max 70% of units per building
- Strata title required for foreign condo ownership
- CGT applies from January 2026 — advise clients to hold long-term
- Always verify: strata status, foreign quota remaining, completion date, developer track record
- Agents: Nick / Monika / Reza

---

## BUILD ROADMAP

| # | Tool | Status |
|---|------|--------|
| 1 | Google Sheets connection | ✅ Done — all 4 tabs live (Tasks, Leads, Clients, Deals) |
| 2 | Task Manager v4 | ✅ Done — list/board/schedule/doc views, Sheets sync |
| 3 | Lead Tracker v3 | ✅ Done — kanban, scoring, activity log, dashboard, Sheets sync |
| 4 | CEO Dashboard | ✅ Done — live morning view, pipeline, agent breakdown |
| 5 | Commission Tracker | ✅ Done — deal logging, auto-split, monthly & YTD |
| 6 | Client Manager | ✅ Done — payment schedules, SPA/title status, Sheets sync |
| 7 | Convert Lead → Client | ✅ Done — button in Lead Tracker drawer when stage = Closed |
| 8 | Password protection | ✅ Done — PHC2026 (agents) / Nick@PHC2026 (director) on all 15 tools |
| 9 | Auto-mirror to NickCambodia | 🔲 Pending — Option B GitHub Actions mirror (user testing first) |

---

## KNOWN ISSUES / WATCH OUT FOR

1. **ID quoting in onclick handlers** — task IDs can be strings like `T1747...`. Always wrap in quotes: `onclick="fn('${t.id}')"` not `onclick="fn(${t.id})"`.
2. **taskToRow / rowToTask mapping** — Sheets uses `priority`/`category`; JS uses `pri`/`cat`. Always go through the converters.
3. **git lock files** — The repo sometimes gets `.git/index.lock` / `.git/HEAD.lock` stale files. Clear with: `rm /Users/narithk/Desktop/phc-tools/.git/*.lock` then re-run git commands.
4. **Apps Script POST response** — All write calls use `mode:'no-cors'` so the response is always opaque. Never call `.json()` on a POST response — it will throw. Only GET reads return usable JSON.
5. **Deals tab missing** — Commission Tracker requires the Deals tab to exist in PHC CRM. If it's not there, run `initializeAll()` in Apps Script editor once.
6. **NickCambodia fork is a snapshot** — Changes pushed to narithkgame2 do NOT auto-sync to the NickCambodia fork. Nick must go to github.com/NickCambodia/phc-tools and click "Sync fork" manually after each batch of updates.
7. **Phone numbers in Sheets** — Phone numbers starting with `+` (e.g. `+81 90-...`) are interpreted as formulas. Set the phone columns to Plain Text format in the spreadsheet: Leads → col F, Clients → col G.

---

## GIT WORKFLOW

```bash
cd /Users/narithk/Desktop/phc-tools

# Standard push
git add -A
git commit -m "feat/fix: description"
git push

# Push a single file
git add PHC_Lead_Tracker.html
git commit -m "fix: description"
git push

# If lock files block git
rm .git/index.lock .git/HEAD.lock   # clear stale locks first
```

GitHub Pages auto-deploys ~30 seconds after push.  
All tools live at: `https://narithkgame2.github.io/phc-tools/`
