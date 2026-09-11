# PHC Article Image Guide
*Working standard for how many images a blog/guide article needs, and how to prompt them · Version 1.0 · July 2026*

---

## WHY THIS EXISTS

Competitors (realestate.com.kh and similar portals) run image-dense guide articles — hero shot + supporting visual per section, not just one photo at the top. A single hero image reads thin next to that. This doc sets the minimum standard for PHC's own guide/educational articles so they don't lose the visual comparison.

---

## THE 5-IMAGE RULE — minimum for a guide-style article

Every educational/guide article (Buying Guide, Market Intelligence, Investment Analysis pillars from `PHC_Brand_Rules.md`) should ship with at least 5 images, each tied to a specific job — not decoration:

| # | Role | Placement | Purpose |
|---|------|-----------|---------|
| 1 | **Hero** | Top of article, above intro | Sets tone, doubles as social-share thumbnail |
| 2 | **Section support** | Under the market-context / "why now" H2 | Aspirational skyline or district shot |
| 3 | **Data visual / infographic** | Under whichever H2 has numbers (yield, payment plan %, timeline) | Most shareable asset in the piece — text-heavy sections lose readers without it |
| 4 | **Trust/process support** | Under the "how to verify / due diligence" H2 | Reinforces the advisory (not salesy) positioning |
| 5 | **Closing CTA banner** | Bottom of article, before contact block | PHC branding + contact block baked in — this is the one exception to "no logo in the AI image" since it's a template graphic, not an AI-generated photo |

Short articles (under ~600 words) can drop to 3 (hero, one section support, closing banner). Never publish a guide article with only 1 image — that was the gap this doc corrects.

---

## STATIC IMAGE PROMPT FORMULA

This is different from `PHC_Higgsfield_Playbook.md`, which is for **video** (camera-move prompts, Seedance/Kling). Article images are static photography-style stills. Formula:

```
[Subject + setting], [lighting condition], [color palette notes], photorealistic, [mood/style], no people (or: hands/silhouette only), no text, no logos, avoid fake-CGI/overly rendered look
```

**Non-negotiables, same spirit as the video playbook:**
1. **No visible faces** — hands/silhouette only if a person is needed for scale/context. Full faces read as generic stock photography and PHC's brand rules explicitly warn against "specific ethnicities without direction."
2. **No baked-in text or logos** — those get added as a separate overlay step (gold accent bar, PHC logo, property name typography, footer domain — see Brand Rules' "Visual Direction for Higgsfield" section).
3. **No construction-site imagery** — same rule as video. Avoid "unfinished" perception even when the article discusses off-plan buying.
4. **Golden hour / warm tones preferred** for exteriors; warm whites and creams for interiors — matches PHC's established palette, don't introduce a new one per article.

---

## REFERENCE PROMPTS (from the Overseas Cambodians article set)

**Hero — "investor reviewing options from abroad":**
```
A modern, softly lit home office scene at dusk: a laptop open on a wooden desk showing a blurred property listing, next to a warm cup of coffee, with a large window in the background revealing a golden-hour Phnom Penh skyline — BKK1-style modern towers softly lit by the setting sun, deep blue-green sky. Warm whites and creams in the interior, gold and amber lifestyle tones. Photorealistic, aspirational but calm, no visible text or logos, no people's faces in frame (hands/silhouette only). Avoid an overly rendered or fake-CGI look.
```

**Section support — BKK1 skyline establishing shot:**
```
A wide aspirational cityscape of BKK1, Phnom Penh at golden hour — modern high-rise condominium towers against a deep blue-green dusk sky, warm amber light reflecting off glass facades, clean streets, no construction cranes or unfinished buildings visible. Photorealistic, premium real estate marketing photography style, no people, no text overlays, no logos baked into the image.
```

**Still needed for the full 5-image set (not yet written):**
- Data visual — staged payment plan breakdown (10–30% booking → milestones → handover). Likely a simple infographic rather than an AI photo — consider building this in Canva/Figma instead of Higgsfield, since precise numbers and labels don't render reliably in AI image generation.
- Trust/process support — a "verified paperwork / handshake" style visual for the developer due-diligence section.
- Closing CTA banner — template graphic (logo + gold accent bar + contact block), not AI-generated.

---

## FILE LOCATIONS

| File | What it's for |
|------|----------------|
| `content-os/docs/PHC_Article_Image_Guide.md` | This file — how many images, static-image prompt formula |
| `content-os/docs/PHC_Higgsfield_Playbook.md` | Video/reel generation workflow — different prompt formula (camera moves) |
| `content-os/docs/PHC_Brand_Rules.md` | Brand voice + the base "Visual Direction for Higgsfield" rules this doc extends |
| `content-os/production/` | Where finished article drafts + their image prompts live per piece |

---

*Captures the pattern worked out with Claude Code, July 2026 — refine further in ChatGPT / Claude Co-work as needed.*
