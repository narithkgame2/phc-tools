# PHC Higgsfield Playbook
*Working guide for generating property video content · Version 1.0 · June 2026*

---

## ACCOUNT SETUP

| Item | Detail |
|------|--------|
| Plan | PLUS annual ($49/mo → ~$39/mo with 20% discount) |
| Credits | 1,000/month · no rollover · reset on billing date |
| Access | Higgsfield.ai → connected via Cowork MCP (28 tools) |
| Best video model | **Seedance 2.0** — reference-driven, cinematic, consistent identity |
| Draft model | **Kling 3.0** — 5 credits per clip, 720p/5s, for composition testing |

---

## THE TWO-PASS WORKFLOW

Every clip follows this exact sequence. No exceptions.

```
PASS 1 — DRAFT (cheap)
→ Model: Kling 3.0 Turbo
→ Resolution: 480p or 720p
→ Duration: 5 seconds
→ Goal: test if the camera move + composition works
→ Cost: 5 credits

If composition looks right → go to Pass 2
If composition is wrong → adjust prompt, try again (still Pass 1)
Maximum 2–3 Pass 1 attempts per clip before rethinking the prompt

PASS 2 — FINAL (quality)
→ Model: Seedance 2.0 standard
→ Resolution: 720p (social) or 1080p (hero/website)
→ Duration: 5–8 seconds
→ Goal: production-quality final clip
→ Cost: varies (check balance before running)

Only run Pass 2 when Pass 1 looks good.
Never run Pass 2 on a composition you haven't validated.
```

**Credit budget per finished reel (30 sec = 5–6 clips):**
- Pass 1 drafts: ~10–15 credits (2–3 attempts per clip)
- Pass 2 finals: ~30–40 credits
- Total per reel: ~50 credits
- PLUS plan (1,000 credits): ~20 reels per month theoretical → ~10–12 realistic (accounting for retakes and experiments)

---

## THE PROMPT FORMULA

Every Higgsfield prompt follows this structure:

```
[Camera move], [subject + setting], [lighting condition], [movement speed], [style notes], no people, no text
```

**Example:**
> Slow crane up along the glass facade of a modern high-rise tower, BKK1 Phnom Penh urban backdrop, golden hour warm amber light, smooth steady rise, cinematic architectural drama, no people, no text

**The two non-negotiable rules:**
1. **No people** — always include this. People in AI video look wrong and destroy credibility.
2. **Slow camera moves** — always specify "slow" or "steady". Fast motion = AI artifacts.

---

## THE 8 CAMERA MOVES

Use one move per clip. Never combine two moves.

| Move | Best for | PHC use case |
|------|----------|--------------|
| **Crane Up** | Exterior tower reveals | All high-rise towers — the money shot |
| **Dolly In** | Entering a space | Lobby, front entrance, pushing into living room |
| **Dolly Out** | Revealing full scale | Open-plan living/dining, large amenity spaces |
| **360 Orbit** | Centrepiece features | Kitchen island, pool, master bed |
| **Tilt Up** | Height and views | Floor-to-ceiling windows, rooftop skyline views |
| **FPV Drone** | Sweeping exploration | Coastal properties, open floor plans, large amenity decks |
| **Boom Down** | Descending reveals | Pool deck, rooftop amenities viewed from above |
| **Static Hero** | Money shot / thumbnail | Best room, no motion, held steady — always use as final clip |

---

## ROOM-BY-ROOM PROMPT TEMPLATES

Copy, paste, and replace `[PROPERTY DETAILS]` with specifics from the property entry.

---

### EXTERIOR — TOWER REVEAL
**Camera: Crane Up**
```
Slow crane up along the glass and steel facade of a modern high-rise residential tower, [PROPERTY DETAILS — e.g. "BKK1 Phnom Penh district backdrop, tree-lined boulevard below"], golden hour warm amber sky, smooth steady upward motion, cinematic architectural drama, no people, no text
```

---

### EXTERIOR — COASTAL / BEACHFRONT
**Camera: FPV Drone**
```
Smooth FPV drone sweep approaching a contemporary coastal tower from the ocean side, [PROPERTY DETAILS — e.g. "Gulf of Thailand turquoise water below, white sand beach"], bright tropical midday sun, fluid steady motion, cinematic coastal lifestyle, no people, no text
```

---

### LOBBY / ENTRANCE
**Camera: Dolly In**
```
Slow dolly forward through the glass entrance doors of a premium residential building into a bright marble lobby, [PROPERTY DETAILS — e.g. "double-height ceilings, warm pendant lighting"], eye-level push, steady smooth motion, luxury residential, no people, no text
```

---

### LIVING ROOM — OPEN PLAN REVEAL
**Camera: Dolly Out**
```
Slow dolly pull-back from floor-to-ceiling windows to reveal a full open-plan living and dining room, [PROPERTY DETAILS — e.g. "city skyline view through windows, soft afternoon light"], smooth steady reverse motion, spacious premium residential, no people, no text
```

---

### LIVING ROOM — LIFESTYLE ORBIT
**Camera: 360 Orbit**
```
Gentle 360 orbit around the centre of a furnished luxury living room, [PROPERTY DETAILS — e.g. "floor-to-ceiling windows with Phnom Penh skyline, warm afternoon light"], slow smooth rotation, premium residential atmosphere, no people, no text
```

---

### KITCHEN
**Camera: 360 Orbit**
```
Smooth orbit around a modern kitchen island, glide past [PROPERTY DETAILS — e.g. "marble countertop, pendant lights above, integrated appliances"], bright even lighting, slow cinematic rotation, premium residential kitchen, no people, no text
```

---

### BEDROOM
**Camera: Dolly In**
```
Slow dolly forward toward a made bed in a calm primary bedroom, [PROPERTY DETAILS — e.g. "large window with soft morning light, neutral tones, quality linen"], steady eye-level push, serene luxury residential, no people, no text
```

---

### POOL / AMENITY DECK
**Camera: Boom Down**
```
Slow boom down from above to reveal a rooftop infinity pool and amenity deck, [PROPERTY DETAILS — e.g. "Phnom Penh skyline panorama in background, blue water reflecting the sky"], late afternoon warm light, smooth descending motion, resort-style luxury, no people, no text
```

---

### BALCONY / VIEW
**Camera: Tilt Up**
```
Slow tilt up from balcony railing to reveal a panoramic city view through floor-to-ceiling glass, [PROPERTY DETAILS — e.g. "BKK1 Phnom Penh skyline, golden hour light"], smooth vertical reveal, cinematic architectural drama, no people, no text
```

---

### STATIC HERO (thumbnail / final clip)
**Camera: Static**
```
Static wide shot of [PROPERTY DETAILS — e.g. "a furnished luxury living room with floor-to-ceiling windows and Phnom Penh skyline"], held perfectly steady, golden afternoon light, premium residential photography style, no motion, no people, no text
```

---

## PROPERTY-SPECIFIC PROMPT SETS

Ready-to-use prompt packs for the top 5 priority properties. Replace nothing — these are pre-written.

---

### 🏙️ GATO TOWER — BKK1 Phnom Penh
*Off-plan · From $98,115 · Studio–Penthouse*
*Target: expat investors, entry-level foreign buyers*

**Clip 1 — Exterior reveal (OPEN WITH THIS)**
```
Slow crane up along the glass and steel facade of a modern high-rise tower in BKK1 Phnom Penh, tree-lined boulevard below with embassies and international restaurants visible in the district, golden hour warm amber sky, smooth steady upward rise, cinematic architectural drama, no people, no text
```

**Clip 2 — Lobby entrance**
```
Slow dolly forward through glass entrance doors of a premium residential tower into a bright marble lobby with double-height ceilings and warm pendant lighting, eye-level push, smooth steady motion, luxury residential, no people, no text
```

**Clip 3 — Living room**
```
Slow dolly pull-back from floor-to-ceiling windows to reveal a full open-plan living room with BKK1 city view, soft afternoon light streaming through glass, smooth steady reverse motion, spacious premium residential, no people, no text
```

**Clip 4 — Balcony view**
```
Slow tilt up from balcony railing to reveal a panoramic view over the Phnom Penh skyline with a glimpse of the Mekong River in the distance, golden hour warm light, smooth vertical reveal, cinematic premium residential, no people, no text
```

**Clip 5 — Static hero (thumbnail)**
```
Static wide shot of a furnished luxury living room in a BKK1 high-rise with floor-to-ceiling windows overlooking the Phnom Penh skyline, perfect afternoon light, held steady, premium residential photography, no motion, no people, no text
```

---

### 🏙️ TIME SQUARE 9 — BKK1 Phnom Penh
*Off-plan · From $102,000 · 1–4BR, 60–190 sqm*
*Target: expat families, long-term investors*

**Clip 1 — Exterior reveal**
```
Slow crane up along the facade of a contemporary mixed-use residential tower in BKK1 Phnom Penh, urban street setting with cafes and restaurants visible below, golden hour warm light, smooth steady upward rise, cinematic modern residential, no people, no text
```

**Clip 2 — Open-plan living reveal**
```
Slow dolly pull-back from floor-to-ceiling windows to reveal a spacious open-plan family living and dining room with large windows, warm afternoon light, smooth steady motion, family-sized premium residential, no people, no text
```

**Clip 3 — Kitchen**
```
Smooth orbit around a modern kitchen in a family apartment, marble countertop and integrated appliances, bright natural light, slow cinematic rotation, contemporary residential kitchen, no people, no text
```

**Clip 4 — Pool and amenities**
```
Slow boom down from above to reveal a rooftop pool and amenity deck of a BKK1 residential tower, city view visible in background, blue water reflecting afternoon sky, smooth descending motion, resort-style residential amenity, no people, no text
```

**Clip 5 — Static hero**
```
Static wide shot of a spacious furnished family apartment living room in a BKK1 high-rise, large windows with city view, afternoon natural light, held steady, premium residential photography, no motion, no people, no text
```

---

### 🌿 LE CONDE BKK1 — BKK1 Phnom Penh
*Off-plan · Boutique mid-rise · French-influenced design*
*Target: expat buyers, mid-range investors*

**Clip 1 — Entrance reveal**
```
Slow dolly forward along a palm-tree-lined entrance toward an elegant mid-rise residential building with warm stone facade, BKK1 quiet street setting, soft warm daylight, smooth steady push, boutique luxury residential, no people, no text
```

**Clip 2 — Lobby**
```
Slow dolly forward into a warm residential lobby with French-inspired design elements, marble floors and warm pendant lighting, soft even interior light, smooth steady motion, elegant boutique residential, no people, no text
```

**Clip 3 — Living room**
```
Gentle 360 orbit around the centre of an elegantly furnished living room with French design influences, warm lighting, spacious open layout, slow smooth rotation, boutique luxury residential, no people, no text
```

**Clip 4 — Rooftop garden**
```
Slow boom down from above to reveal a landscaped rooftop garden terrace with Phnom Penh skyline visible beyond, tropical plants, warm afternoon light, smooth descending motion, boutique residential rooftop, no people, no text
```

**Clip 5 — Static hero**
```
Static wide shot of an elegantly furnished living room with French-inspired design, warm lighting and spacious layout, held perfectly steady, boutique luxury residential photography, no motion, no people, no text
```

---

### 🌊 ODOM LIVING — Tonle Bassac Phnom Penh
*Luxury · From $275,000 · 1–4BR, 78–196 sqm*
*Target: high-net-worth, Japanese and European buyers*

**Clip 1 — Dramatic exterior reveal (OPEN WITH THIS)**
```
Slow crane up along the dramatic facade of a flagship luxury residential tower in Tonle Bassac Phnom Penh, Mekong River visible in the distance, golden sunset sky with deep amber and rose tones, smooth steady cinematic rise, architectural statement building, no people, no text
```

**Clip 2 — Sky amenity deck**
```
Slow boom down from above to reveal a sky-high infinity pool and amenity terrace with panoramic Phnom Penh and Mekong River views, late afternoon golden light, blue water reflecting the horizon, smooth descending motion, flagship luxury residential, no people, no text
```

**Clip 3 — Luxury living room**
```
Slow dolly pull-back to reveal a full luxury open-plan living area with floor-to-ceiling windows overlooking the Mekong River, stone and glass interior finishes, warm afternoon light, smooth steady motion, top-tier luxury residential, no people, no text
```

**Clip 4 — Penthouse balcony view**
```
Slow tilt up from penthouse balcony railing to reveal a 360-degree panoramic view over Phnom Penh and the Mekong River, golden sunset light, smooth vertical reveal, cinematic luxury residential, no people, no text
```

**Clip 5 — Static hero**
```
Static wide shot of a fully furnished luxury living room in a flagship Phnom Penh high-rise, floor-to-ceiling windows with Mekong River view, perfect golden hour light, held steady, ultra-premium residential photography, no motion, no people, no text
```

---

### 🏖️ LZ SEA VIEW PREMIUM — Sihanoukville Coast
*Beachfront · From $54,715 · Studio–Penthouse*
*Target: coastal lifestyle buyers, Airbnb investors*

**Clip 1 — Coastal approach (OPEN WITH THIS)**
```
Smooth FPV drone sweep approaching a contemporary coastal high-rise tower from the ocean, Gulf of Thailand turquoise water below, white sand beach visible, bright tropical midday sun with vivid blue sky, fluid steady forward motion, cinematic coastal lifestyle, no people, no text
```

**Clip 2 — Ocean view reveal**
```
Slow dolly pull-back from a large balcony window to reveal a furnished ocean-view apartment interior with full sea panorama, turquoise Gulf of Thailand water visible through floor-to-ceiling glass, warm tropical light, smooth steady motion, beachfront luxury residential, no people, no text
```

**Clip 3 — Infinity pool**
```
Slow 360 orbit around an upper-floor infinity pool overlooking the Gulf of Thailand, turquoise sea and sky visible at the pool edge, bright tropical afternoon light, slow smooth rotation, resort-style beachfront amenity, no people, no text
```

**Clip 4 — Balcony / sea view**
```
Slow tilt up from balcony railing to reveal a full panoramic sea view over the Gulf of Thailand, turquoise water to the horizon, bright tropical daylight, smooth vertical reveal, beachfront lifestyle photography, no people, no text
```

**Clip 5 — Static hero**
```
Static wide shot of a furnished beachfront apartment with floor-to-ceiling windows and direct Gulf of Thailand ocean view, vivid blue water visible, bright tropical light, held perfectly steady, premium coastal residential photography, no motion, no people, no text
```

---

## REEL ASSEMBLY GUIDE

**Standard 30-second property reel structure:**

| Order | Clip | Duration | Camera |
|-------|------|----------|--------|
| 1 | Exterior reveal | 6–8 sec | Crane Up or FPV Drone |
| 2 | Entrance / lobby | 5–6 sec | Dolly In |
| 3 | Living room | 5–6 sec | Dolly Out or Orbit |
| 4 | Best feature (pool / view / kitchen) | 5–6 sec | Boom Down or Tilt Up |
| 5 | Static hero | 4–5 sec | Static |

Total: ~25–30 seconds. Lead with your strongest shot. Close with the static hero.

**Stitch tool:** CapCut (free) or DaVinci Resolve. Add PHC logo lower-third and a simple caption. No music licence needed if you use platform-provided tracks.

---

## QUALITY CHECKLIST — BEFORE POSTING

Run through this before any clip goes on social media:

- [ ] No people visible in any frame
- [ ] No obvious AI artifacts (flickering, distorted edges, melting walls)
- [ ] Camera move is slow and steady throughout
- [ ] Resolution is 720p minimum (1080p for website/hero)
- [ ] No text or logos visible in the generated footage (add PHC branding in post)
- [ ] Clip is 5–8 seconds (not longer)
- [ ] Property UUID has been logged in `PHC_Property_Environments.md`
- [ ] Caption includes correct property name, location, price range, and PHC contact

---

## CREDIT MANAGEMENT RULES

1. **Check balance before every session** — `balance` tool in Higgsfield MCP
2. **Never run Pass 2 without a successful Pass 1** — one bad final render = 30–40 wasted credits
3. **Stop at 3 Pass 1 attempts** — if it's not working after 3 tries, the source image is the problem. Find a better render.
4. **Reserve 100 credits as buffer** — never go below 100. Running out mid-reel means restarting.
5. **Log every generation** in `Higgsfield_Weekly_Log.md` — model used, credits spent, result (pass/fail)
6. **Credits reset monthly** — don't hoard. Use what you have each month.

---

## SESSION WORKFLOW — STEP BY STEP

What to do at the start of every Higgsfield session:

```
1. Check credits (balance tool)
2. Open PHC_Property_Environments.md — find the property you're working on
3. Check if UUID exists for this property
   → If yes: use the reference element in your prompts
   → If no: this will be your first generation — save UUID after
4. Select the room/angle you're generating
5. Copy the prompt from this playbook
6. Run Pass 1 (Kling 3.0)
7. Review: good composition? → Pass 2. Bad? → adjust prompt, retry Pass 1
8. Save final clip (name it: PROPERTY_ROOM_DATE.mp4)
9. Update UUID log in PHC_Property_Environments.md if first generation
10. Log credits spent in Higgsfield_Weekly_Log.md
```

---

## FILE LOCATIONS

| File | What it's for |
|------|--------------|
| `content-os/docs/PHC_Higgsfield_Playbook.md` | This file — workflow, prompts, rules |
| `content-os/docs/PHC_Property_Environments.md` | All 18 properties — visual descriptions + UUID tracking |
| `content-os/docs/PHC_Brand_Rules.md` | Brand voice for captions and articles |
| `content-os/docs/Higgsfield_Weekly_Log.md` | Auto-updated every Monday — new tips and credit log |
| `content-os/PHC_Content_Tracker.xlsx` | Content calendar and posting schedule |

---

## JULY 1 LAUNCH CHECKLIST

- [ ] PLUS annual plan active
- [ ] Higgsfield MCP confirmed connected in Cowork (28 tools)
- [ ] Source images collected for GATO Tower (all 5 angles)
- [ ] Source images collected for LZ Sea View Premium (all 5 angles)
- [ ] First Pass 1 test run on GATO Tower exterior
- [ ] UUID logged for GATO Tower after first generation
- [ ] First reel assembled and posted by July 7

---

*Last updated: June 2026 · Built by Claude for Property Hub Cambodia*
