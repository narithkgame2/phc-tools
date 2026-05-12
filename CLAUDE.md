# CLAUDE.md — Property Hub Cambodia (PHC) Internal OS

## PROJECT OVERVIEW

**Company:** Property Hub Cambodia (PHC) — premium real estate advisory, BKK1 Phnom Penh  
**Website:** cambodiapropertyhub.com  
**Stack:** Single-file HTML tools · Vanilla JS · Google Sheets (database) · Google Apps Script (API) · GitHub Pages (hosting)  
**Repo:** narithkgame2/phc-tools  
**Live hub:** https://narithkgame2.github.io/phc-tools/  
**Local folder:** /Users/narithk/Desktop/phc-tools/  
**Team:** Nick (CEO), Monika (Co-Founder, Japanese market), Reza (Co-Founder, European market)

**Goal:** $0-cost internal OS — Pipedrive-quality UX without subscriptions.  
**Rule:** Every tool is a single self-contained .html file. No frameworks. No build step. No dependencies except Google Fonts CDN.

---

## FILE INVENTORY

| File | Status | Live URL |
|------|--------|----------|
| `index.html` | ✅ Production | /phc-tools/ |
| `PHC_Lead_Tracker.html` | ✅ Production | /phc-tools/PHC_Lead_Tracker.html |
| `PHC_Task_Manager_v4.html` | ✅ Production | /phc-tools/PHC_Task_Manager_v4.html |
| `PHC_Sales_Desk.html` | ✅ Production | /phc-tools/PHC_Sales_Desk.html |
| `PHC_Agent_Training_v3.html` | ✅ Production | /phc-tools/PHC_Agent_Training_v3.html |
| `PHC_Proposal_Generator.html` | ✅ Production | /phc-tools/PHC_Proposal_Generator.html |
| `PHC_Client_Manager.html` | ✅ Production | /phc-tools/PHC_Client_Manager.html |
| `PHC_Message_Builder.html` | ✅ Production | /phc-tools/PHC_Message_Builder.html |
| `PHC_Investment_Explorer.html` | ✅ Production | /phc-tools/PHC_Investment_Explorer.html |
| `PHC_Setup_Tracker.html` | ✅ Production | /phc-tools/PHC_Setup_Tracker.html |
| `PHC_Lead_Magnet.html` | ✅ Production | /phc-tools/PHC_Lead_Magnet.html |
| `PHC_Market_Intelligence_Cheat_Sheet.html` | ✅ Production | /phc-tools/PHC_Market_Intelligence_Cheat_Sheet.html |
| `PHC_CEO_Business_Plan.html` | ✅ Production | /phc-tools/PHC_CEO_Business_Plan.html |
| `PHC_System_Map.html` | ✅ Production | /phc-tools/PHC_System_Map.html |
| `PHC_CEO_Dashboard.html` | ✅ Production | /phc-tools/PHC_CEO_Dashboard.html |
| `PHC_AppsScript.gs` | ✅ Deployed | Google Apps Script (bound to PHC CRM sheet) |

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

**Clients**
`id, createdAt, updatedAt, fullName, nationality, phone, email, project, unit, purchasePrice, paymentPlan, nextPaymentDate, nextPaymentAmount, spaStatus, titleStatus, agent, notes`

**Deals**
`id, createdAt, updatedAt, leadId, clientId, project, unit, salePrice, commissionTotal, nickShare, monikaShare, rezaShare, closedDate, agent, notes`

---

## APPS SCRIPT API (PHC_AppsScript.gs)

**Web App URL:** `https://script.google.com/macros/s/AKfycbzlAxcJqEI3upZ18sm-mj2Gxd3w2XSkD_YYqgkZ4kdw2_AV3V8f2B4qVcPESHZTOq2k8Q/exec`  
**Settings:** Execute as Me · Anyone can access  
**CORS strategy:** POST body as `Content-Type: text/plain` (avoids preflight)

### Endpoints

```
GET  ?action=ping            → { ok: true, ts: "..." }
GET  ?action=getAll          → [ ...task objects ]

POST { action: "insert", data: { id, name, status, ... } }  → { success: true, id }
POST { action: "update", id: "...", data: { ...fields } }   → { success: true }
POST { action: "delete", id: "..." }                        → { success: true }
```

### Calling pattern (all HTML tools)

```javascript
// GET
const res = await fetch(API_URL + '?action=getAll');
const tasks = await res.json();

// POST
const res = await fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain' },  // MUST be text/plain
  body: JSON.stringify({ action: 'insert', data: taskObject })
});
const result = await res.json();
```

---

## TASK MANAGER v4 — ARCHITECTURE

**File:** `PHC_Task_Manager_v4.html`  
**Live:** https://narithkgame2.github.io/phc-tools/PHC_Task_Manager_v4.html

### localStorage keys
```javascript
const LS_API   = 'phc_tasks_api';    // Web App URL (pre-baked as DEFAULT_API)
const LS_CACHE = 'phc_tasks_cache';  // Task array cache (JSON)
const LS_DOCS  = 'phc_tasks_docs';   // Doc tab notes (JSON, keyed by nav section)
```

### Data flow
1. `initApp()` — loads cache → shows UI immediately → calls `loadFromSheets()` in background
2. `loadFromSheets()` — GET getAll → `data.map(rowToTask)` → `tasks` array → re-render
3. All mutations (create/edit/delete/status change) update `tasks` array instantly (optimistic UI) then call `syncCreate/syncUpdate/syncDelete` asynchronously

### Data shape mapping (CRITICAL)
The Sheets row uses `priority` / `category`. The JS task object uses `pri` / `cat`.
Always use these converters — never mix the shapes:

```javascript
// JS task object → Sheets row
function taskToRow(t) {
  return {
    id, name, status,
    priority: t.pri,      // <-- mapped
    category: t.cat,      // <-- mapped
    due, assignees: t.assignees.join(','),
    memo, link, createdAt, updatedAt
  };
}

// Sheets row → JS task object
function rowToTask(row) {
  return {
    id, name, status,
    pri: row.priority,    // <-- mapped back
    cat: row.category,    // <-- mapped back
    due,
    assignees: row.assignees.split(',').filter(Boolean),
    memo, link, createdAt, updatedAt
  };
}
```

### Task ID rule (CRITICAL)
New tasks from the app get string IDs like `T1747523456789` (Date.now() prefix).
Tasks inserted directly via API get string IDs like `"1"`, `"2"`.
**All onclick/ondragstart handlers MUST quote the ID:**
```javascript
// CORRECT
onclick="openEditModal('${t.id}')"
onchange="toggleDone('${t.id}', this)"

// WRONG — breaks when ID contains letters (e.g. T1747...)
onclick="openEditModal(${t.id})"
```

### Views
- **List** — grouped by status (Overdue → In Progress → Review → To Do → Done → Stuck), sorted by due date within each group
- **Board** — Kanban columns (To Do / In Progress / Review / Done / Stuck), drag & drop changes status
- **Schedule** — calendar month view, drag chip to reschedule (changes due date), click chip opens edit modal
- **Doc** — per-section rich text notepad, persisted to localStorage (`LS_DOCS`)

### Status cycle (click the badge in list view)
`To Do → In Progress → Review → Done → Stuck → To Do`

### Priority values: `urgent` / `high` / `normal`
### Category values: `Sales & Listings` / `Content & Marketing` / `Admin & Operations` / `Training` / `Japanese Market`
### Assignee codes: `N` (Nick) / `M` (Monika) / `R` (Reza) / `Me` (Mey/Content) / `Ma` (Marina/Support)

---

## LEAD TRACKER v3 — ARCHITECTURE

**File:** `PHC_Lead_Tracker.html`  
**localStorage:** `phc_api_v3` (URL), `phc_leads_v3` (cache)

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
- Header: navy `#083467`, 54px, gold accent line
- Cards: white bg, `#e8ecf2` border, gold left border on hover
- Primary button: gold bg, navy text
- Drawer: 480px right panel, navy header
- Toast: navy bg, gold left border, bottom-right, 3s auto-dismiss

### Status colors (Lead Tracker stages)
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
- New IDs: `'T' + Date.now()` for task-style tools, `crypto.randomUUID()` for lead-style tools
- Timestamps: `new Date().toISOString()`
- API calls: always wrapped in `try/catch` with localStorage fallback
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
| 1 | Google Sheets connection | ✅ Done (Tasks + Leads tabs live) |
| 2 | Task Manager v4 | ✅ Done (list/board/schedule/doc views, Sheets sync) |
| 3 | Lead Tracker v3 | ✅ Done (kanban, scoring, activity log, dashboard) |
| 4 | CEO Dashboard | ✅ Done — pipeline by stage, overdue follow-ups/tasks, payments due, agent breakdown |
| 5 | Commission Tracker | 🔲 Log deals, auto-split Nick/Monika/Reza, monthly summary |
| 6 | Client Manager | ✅ Done — payment schedules, SPA/title status, Sheets sync |
| 7 | Convert Lead → Client | 🔲 Button in Lead Tracker to move closed lead into Client Manager |
| 8 | Password protection | 🔲 Shared password for agent tools, separate PIN for CEO tools |

---

## KNOWN ISSUES / WATCH OUT FOR

1. **ID quoting in onclick handlers** — task IDs can be strings like `T1747...`. Always wrap in quotes: `onclick="fn('${t.id}')"` not `onclick="fn(${t.id})"`.
2. **taskToRow / rowToTask mapping** — Sheets uses `priority`/`category`; JS uses `pri`/`cat`. Always go through the converters.
3. **git lock files** — The repo sometimes gets `.git/index.lock` / `.git/HEAD.lock` stale files. Clear with: `rm /Users/narithk/Desktop/phc-tools/.git/*.lock` then re-run git commands.
4. **Apps Script CORS** — POST requests must use `Content-Type: text/plain` to avoid CORS preflight. JSON body still works — just the header must be `text/plain`.
5. **Apps Script `sheet` param** — The current Apps Script ignores the `sheet` parameter in GET requests; it always reads the Tasks sheet. Future multi-sheet support needs the `doGet` handler updated.

---

## GIT WORKFLOW

```bash
cd /Users/narithk/Desktop/phc-tools

# Push a single file
git add PHC_Task_Manager_v4.html
git commit -m "feat/fix: description"
git push

# If lock files block git
rm .git/index.lock .git/HEAD.lock   # clear stale locks first
```

GitHub Pages auto-deploys ~30 seconds after push.
All tools live at: `https://narithkgame2.github.io/phc-tools/`
