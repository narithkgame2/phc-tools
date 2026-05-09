# CLAUDE.md — Property Hub Cambodia (PHC)

## WHO WE ARE
Company: Property Hub Cambodia (PHC)
Website: cambodiapropertyhub.com
Brand: Gold #cc9d4d / Navy #083467
Fonts: DM Sans / DM Serif Display / DM Mono
Team: Nick (CEO), Monika (Co-Founder), Reza (Co-Founder)

## WHAT WE ARE BUILDING
Custom internal OS using single-file HTML on GitHub Pages
+ Google Sheets as database + Google Apps Script as API.
No frameworks. Vanilla JS only.
Hub: https://narithkgame2.github.io/phc-tools/
Repo: narithkgame2/phc-tools

## GOOGLE SHEETS — spreadsheet name: PHC CRM
Five tabs: Leads, Clients, Projects, Deals, Tasks

Leads columns: id, createdAt, updatedAt, fullName, nationality,
phone, email, source, budget, timeline, interestedIn, stage, score,
agent, notes, lastContact, followUpDate, followUpAction, activities

Clients columns: id, createdAt, updatedAt, fullName, nationality,
phone, email, project, unit, purchasePrice, paymentPlan,
nextPaymentDate, nextPaymentAmount, spaStatus, titleStatus, agent, notes

Deals columns: id, createdAt, updatedAt, leadId, clientId, project,
unit, salePrice, commissionTotal, nickShare, monikaShare, rezaShare,
closedDate, agent, notes

## APPS SCRIPT API — file: PHC_AppsScript.gs
Deploy as Web App. Execute as Me. Anyone can access.
Run initializeSheets() once to set up all tabs.
localStorage: phc_api_v3 = URL, phc_leads_v3 = cache

GET: ?action=getAll&sheet=Leads
POST: { action:"insert"/"update"/"delete", sheet:"Leads", id?, data? }

## LEAD TRACKER V3 — CURRENT PRODUCTION FILE
File: PHC_Lead_Tracker.html

Built features:
- Kanban drag & drop across 7 stages
- Stages: New Lead / Contacted / Viewing / Negotiating / Closed / Hold / Released
- Lead detail drawer from right side
- Follow-up date + action + overdue alerts (red) + today alerts (orange)
- Activity log per lead (WhatsApp/Call/Email/Viewing/Meeting/Note)
- Stage changes auto-logged to activity timeline
- Lead scoring 1-5 stars + VIP/A/B/C label chip (nationality + budget + timeline)
- Pipeline value total per kanban column (budget midpoint sum)
- Dashboard tab: total leads, hot leads, pipeline value, overdue count,
  stage chart, score distribution, source breakdown, agent leaderboard
- CSV export button (all leads, filtered view)
- List view toggle, stage filter tabs, search/filter
- Google Sheets sync + localStorage fallback (phc_leads_v3)
- Sample data on first open (5 leads)

Score labels:
- VIP = score 5 | A = score 4 | B = score 3 | C = score <= 2

Projects dropdown (all tools):
Time Square 9 (Gatsby), Time Square 8, Time Square 10 (Otres),
Time Square 11 BKK3, J Tower 2, J Tower 3, Le Conde BKK1,
Royal Platinum, Peninsula, G.A.T.O Tower, Multiple/TBD

## BUILD ROADMAP
1. Connect Google Sheets (Nick, 10 min) — create PHC CRM sheet,
   paste PHC_AppsScript.gs, run initializeSheets(), deploy as Web App,
   paste URL into Lead Tracker Setup button
2. CEO Dashboard — Nick morning view, Director only:
   active leads, leads by stage chart, overdue list,
   deals closed MTD, pipeline value, revenue MTD, agent activity
3. Password Protection — shared password for Agent tools,
   separate PIN for Director tools (Nick only), client-side only
4. Commission Tracker — log deals, split Nick/Monika/Reza,
   monthly summary, Deals tab in Sheets
5. Client Manager — after-sale, payment alerts, title status,
   Clients tab in Sheets

## DESIGN SYSTEM
--navy: #083467 / --gold: #cc9d4d / --gold-light: #e8c47a
--gold-pale: #fdf3e3 / --cream: #fdf8f0 / --white: #ffffff
--g1: #f5f6f8 (bg) / --g2: #e8ecf2 (borders) / --g3: #c0c8d4
--g4: #7a8799 (secondary text) / --text: #1a2535
--red: #d63031 / --green: #00b894 / --orange: #e17055

Stage colors:
New Lead:    #dbeafe / #1e40af
Contacted:   #fef3c7 / #92400e
Viewing:     #d1fae5 / #065f46
Negotiating: #ede9fe / #4c1d95
Closed:      #083467 / #cc9d4d
Hold:        #f1f5f9 / #475569
Released:    #fee2e2 / #991b1b

Components:
Header: navy 54px, gold accents
Cards: white, g2 border, gold left border on hover
Primary btn: gold bg, navy text
Drawer: 480px right, navy header
Toast: navy bg, gold left border, bottom-right, 3s

## CODING STANDARDS
- Single-file HTML only
- Vanilla JS, no frameworks
- Google Fonts CDN only external resource
- localStorage keys prefixed phc_
- IDs: crypto.randomUUID()
- Timestamps: new Date().toISOString()
- API: always try/catch + localStorage fallback
- Mobile responsive required
- Never fabricate property data

## SYNC WORKFLOW
When updating any HTML tool locally, push to GitHub Pages:
  cd /Users/narithk/Desktop/phc-tools
  cp "/path/to/updated/TOOL.html" .
  git add TOOL.html && git commit -m "update TOOL" && git push

All tools live at: https://narithkgame2.github.io/phc-tools/

## BUSINESS RULES
Stages: New Lead > Contacted > Viewing > Negotiating > Closed > Hold > Released

Score = Math.round((natScore + budgetScore + timelineScore) / 3)
Nationality: Japanese=5, German=4, Singaporean=4, British=3,
             Cambodian=3, Russian=3, Chinese=3, Other=2
Budget: $500K+=5, $300K-500K=4, $200K-300K=3, $100K-200K=2, Under $100K=1
Timeline: 0-3m=5, 3-6m=4, 6-12m=2, 12+m=1

Agents: Nick / Monika / Reza

Cambodia rules:
- Foreign ownership above ground floor, max 70% per building
- Strata title required for foreign condo ownership
- CGT from January 2026, advise long-term hold
- Always verify: strata status, quota, completion date, developer track record

## GOAL
$0 cost OS on GitHub Pages + Google Sheets.
Full workflow: Lead CRM > After-sale > Commissions > CEO reporting.
Pipedrive-quality UX. Maintainable by Nick without a developer.
Current: ~30% complete. Foundation: Lead Tracker v3.
Next: CEO Dashboard / Commission Tracker / Client Manager
