# PHC Agent Training (new, in the Speak Like a Leader house style)

Redesign of `PHC_Agent_Training_v4.html` (Nick, 2026-09-30). v3 stays the live training until Nick approves this one.
Style and behaviour follow the house style in `~/.claude/skills/speak-like-an-advisor/references/house-style.md`.

## What's here
- Levels (2026-09-30): Foundation (v4 lessons 1–4 + "coming soon" 5), Professional Presence (6 lessons adapted from
  Speak Like a Leader for PHC clients: calm, introduce yourself, slow down, silence, sound certain, say less), Tough Calls
  (6 decisions, `review: true`: answers drafted from v4's rules, Nick to confirm PHC policy), then weeks 2–5 (coming soon).
  33 steps; step 1 is the PHC front door.
- Picture questions: `pics[{after: sectionIndex, prompt, options[{svg, cap}], answer, why}]` or `kind:"floors"` (tap the
  floors a foreigner can own). Drawings in `AT_ILL`; `sla:<key>:<a|b>` reuses Speak Like a Leader drawings.
- Decisions: `decision{situation, svg, steps[{prompt, options[{t, v: best|risky|wrong, result}]}], principle}`:
  intro (picture + situation) → one card per step (pick, see what happens) → the PHC way → stars for best picks.
- `index.html`: the whole app (HTML + CSS + JS, no build step). Started from the Speak Like a Leader engine; edit this
  file directly now. Content lives in `const TRAINING = {...}` (JSON): `weeks`, and 21 `lessons` (lessons 5–21 are
  `stub: true`, shown as "Coming soon"). English only for now; Khmer comes later (v3 has a full Khmer translation).
- Lesson shape (from v4): `objectives`, `sections[]` (label, heading, body HTML, optional dataTitle/data, table, calc,
  analogy, warning, diagrams ["floors","quota"], before/now, rules[{title,detail,action}]), `roleplay` (scenario,
  instructions, `turns[{client:[…], agent:"line with *stress* ‧‧‧ pauses ↘"}]`, note, debrief), `quiz[]`
  ({q, opts, correct, explain}), `reflection`.
- A lesson plays as cards (`lessonCards`): intro → per section: section card, "Which is the PHC way?" (before/now),
  one card per rule → practice the conversation (client line, model line, record, compare) → debrief → quiz →
  your words (saved in `state.refl`) → done with 1–3 stars.
- "Coming soon" steps (`stub`) never block the climb (audit 2026-09-30): `MTN.now` = next playable lesson (Continue, the
  pulsing step), `MTN.edge` = where the flag stands (`now`, or the first unfinished step after your last finished one);
  `climb()` counts only playable lessons, so ranks advance; `playUnlock` walks past stubs; stub nodes are dashed (`.soon`).
- Backups are `app:'phc-agent-training'` (files from Speak Like a Leader are refused). Settings "Test" plays `at0-t0`.
- Text style: sentence case for titles and section labels; no "Rule 1:" / "Step 1:" prefixes (the card shows "1 of 3").
- Home: a glass high-rise (`mtnModel` builds the route up the facade, `mtnArt` draws the city, the tower, lit windows
  for finished weeks, mist above your level). Weeks = levels (`UNIT_DEF`, `CAMPS`, floors in `ALTS`), rooftop =
  "PHC Certified" (`RANKS`).
- `audio/` + `audio/manifest.js`: Kokoro voice clips (coach af_heart, client am_fenrir, model am_michael).
  Regenerate after any text change: `"~/Desktop/Speak Like A Leader/tools/.venv/bin/python" agent-training/tools/make_voice.py`
  (only changed lines are remade).
- `sw.js`: offline copy, scoped to this folder, caches named `phcat-*` (never touches other tools' caches).
- Storage: localStorage `phc-training-v1`, IndexedDB `phc-training` (same origin as other PHC tools and Speak Like a
  Leader, so the names must stay distinct). The PHC password gate uses the shared `phc_agent_auth` session key.

## Writing and voice rules (Nick, 2026-09-30)
- No dashes in content (use . , : or "to" for ranges). Abbreviations written out on first use in a card.
- `tools/make_voice.py` runs every line through `speakable()` (money, %, sqm, years, 1BR, SPA/CGT/REAKH) before the
  voice, so "$1,000" is read "one thousand dollars". Type: Spectral for titles and spoken lines, Inter for reading.
- Facts to verify before rollout: Time Square 11 "launching Feb 2026", CGT "postponed to January 2027", the 2025/2026
  market numbers and project statuses (v4 content, may be out of date).

## Not done yet
- Lessons 5–21 (content), Khmer (text from v3; audio needs recordings, Kokoro has no Khmer voice),
  certificate at graduation, team progress to the PHC CRM sheet, and a link from the PHC Tools hub.
