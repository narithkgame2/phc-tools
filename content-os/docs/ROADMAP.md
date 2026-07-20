# PHC Content OS — Roadmap

**Last Updated:** June 2026

---

## ⚡ Architecture Decision — June 2026

**Lovable Content OS: Parked (not dead)**

After review, the Lovable build was determined to be over-engineered for the current team size. The two core problems it was meant to solve (factual accuracy in social content, consistent brand voice) are solved more directly by:

1. **Claude Project — PHC Content Team** (active approach)
2. **Claude Cowork + Higgsfield** — Nick manages video production separately

### Claude Project Setup (active)
- System instructions: `PHC_Content_Machine_Prompt.md` → paste into Project Instructions
- Knowledge files: `PHC_Property_Environments.md` + `PHC_Brand_Rules.md` → upload to project
- Users: Monika sets up the project on her Claude account. Mey has since left PHC — her content responsibilities were absorbed by Marina, who should set up the project too if she's taking on this workflow.
- Status: **Ready to launch — no build required**

**When to revisit Lovable:** If the team scales to 10+ people, Buffer integration becomes critical, or a proper review/approval workflow is needed across multiple content creators.

---

## Development Philosophy

- Content generation lives in Claude Project (not a custom app)
- Video production lives in Claude Cowork + Higgsfield (Nick-managed)
- PHC Tools (HTML) handles data management only — not content generation
- Build only what Claude Project cannot do

**Sprint rule:** One sprint at a time. Each sprint must be reviewed before the next begins.

---

## Sprint History

### ✅ Sprint 1 — Working Content Generator (Complete)
Built the first working content generation tool.

Delivered:
- `PHC_Content_Machine.html` — one-click content generation for all 18 properties
- All 18 PHC properties embedded with real data
- Claude API integration (text generation)
- Higgsfield visual prompt generation
- Buffer social scheduling integration
- Password gate (PHC brand)
- `PHC_Brand_Rules.md` — master brand brief
- `PHC_Property_Environments.md` — all 18 properties with Higgsfield prompts
- `PHC_Content_Machine_Prompt.md` — Claude Project system prompt
- `PHC_Content_Tracker.xlsx` — content planning spreadsheet

---

## Active Sprints (Lovable)

### 🔄 Sprint 2.1 — Property Knowledge Base
**Goal:** Add all 18 real PHC properties into Lovable with structured, complete data.

**Why first:** Everything else depends on accurate property data. The AI Marketing Director can only work if it knows what every property is.

Deliverables:
- All 18 properties added to Lovable Properties module
- Each property has: Developer · Location · Title Type · Foreign Ownership · Unit Types · Pricing · Payment Plan · Rental Yield · Target Audience · Selling Points · FAQ · Risks

Data source: `PHC_Property_Environments.md` (already complete)

Acceptance criteria:
- All 18 properties visible in Properties list
- Knowledge Base fields filled correctly for every property
- Foreign ownership status pulls through correctly into generation (no hallucination)

---

### ⏳ Sprint 2.2 — Review Center UX Fix
**Goal:** Make the review workflow fast and trustworthy for Monika.

Known issues to fix:
- Content cards collapsed by default — Monika can't read content without clicking eye icon. Must expand by default.
- Keyboard shortcuts (A/R/→) have no focus state — unclear which card is selected
- No auto-scroll to next item after approve/reject

Acceptance criteria:
- Full content text visible on every card without extra clicks
- Focused card has clear visual highlight
- Pressing A approves focused card and automatically scrolls to next
- Pressing R rejects and moves to next
- Pressing → skips to next without deciding

---

### ⏳ Sprint 2.3 — Campaign Blueprint + Brand Brain
**Goal:** Campaign templates produce consistent, correct output using the Knowledge Base and Brand Rules.

Deliverables:
- Campaign Blueprint defines exact asset types per template (e.g. Investment = Facebook + Instagram + Telegram + Blog + FAQ + Reel + Sales Sheet)
- Brand Brain enforces: correct year, title type pulled from KB (no rewriting), yield stated as "projected", no guaranteed return language
- German and Russian added as language options

Acceptance criteria:
- Generated content never contradicts the property's own Knowledge Base data
- Current year used automatically (not hardcoded)
- All 5 languages (EN, KH, JA, DE, RU) selectable in campaign creation

---

### ⏳ Sprint 2.4 — AI Marketing Director
**Goal:** The system proactively tells Nick what to do next.

Logic:
- Coverage gaps: which properties have no active campaign?
- Language gaps: which properties are missing Japanese / German content?
- Freshness: which campaigns are older than 30 days with nothing new?
- Scheduling gaps: which properties have nothing publishing this week?

Acceptance criteria:
- Dashboard shows recommendations for at least 5 real PHC properties
- Each recommendation has a one-click "Generate" action
- Marketing health score reflects real property data

---

## Port Sprint — HTML Production Tool

**Goal:** Once Lovable UX is validated across Sprints 2.1–2.4, rebuild as single `.html` file.

Why port:
- No platform dependency (Lovable subscription)
- All 18 real PHC properties already in our codebase
- Claude API already wired (not OpenAI)
- Higgsfield prompts already generated
- Buffer scheduling already working
- PHC navy/gold brand, not Lovable purple

Deliverable:
- `PHC_Content_Machine_v2.html` — campaign-centric, review center with keyboard shortcuts, publishing kanban, AI marketing director recommendations

---

## Deferred

- Make.com automation layer — on hold until team scales (`PHC_Content_Machine_MakeCom.md`)
- Direct API publishing to Facebook/Instagram — deferred until Buffer is confirmed working
- TikTok scheduling — deferred (platform API restrictions)
- Analytics and performance tracking — Sprint 3+
