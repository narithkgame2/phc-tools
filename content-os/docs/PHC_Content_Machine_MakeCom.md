# PHC Content Machine — Make.com Automation Setup
*Phase 3: Connect approved content to automatic scheduling and posting*

---

## What this does

After Monika approves content in the Content Builder tool, she clicks "Schedule" → Make.com automatically posts it to Facebook, Instagram, and delivers the TikTok script to Telegram. No more manual copy-pasting into each platform.

---

## What you need before starting

- [ ] Make.com account (free tier works, Pro recommended for scheduling)
- [ ] Facebook Page admin access (for PropertyHubKH)
- [ ] Instagram Business account connected to the Facebook Page
- [ ] Telegram bot token (already in PHC Telegram setup)
- [ ] Claude API key (same one used in Content Builder)

---

## Scenario 1 — Content Generation on Demand

This is the simplest starting point. Monika fills in a Google Form → Make.com calls Claude → sends the generated content to a shared Google Doc or Telegram channel for Monika to review.

### Step-by-step

**1. Create the trigger — Google Form**

1. Go to make.com → Create a new Scenario
2. First module: **Google Forms → Watch Responses**
   - Form fields: Property Name · Target Market · Content Types · Extra Notes
   - Connect your Google account
   - Select the PHC Content Request form (create it first at forms.google.com)

**2. Add Claude API call**

3. Add module: **HTTP → Make a Request**
   - URL: `https://api.anthropic.com/v1/messages`
   - Method: POST
   - Headers:
     ```
     x-api-key: [your Claude API key]
     anthropic-version: 2023-06-01
     content-type: application/json
     ```
   - Body (JSON):
     ```json
     {
       "model": "claude-sonnet-4-5",
       "max_tokens": 4096,
       "system": "[paste full system prompt from PHC_Content_Machine_Prompt.md]",
       "messages": [
         {
           "role": "user",
           "content": "Create content for: {{property}} | Markets: {{markets}} | Types: {{types}} | Notes: {{notes}}"
         }
       ]
     }
     ```

**3. Parse the response**

4. Add module: **JSON → Parse JSON**
   - Parse `content[0].text` from the Claude response
   - This gives you the full generated content as a text variable

**4. Deliver to Monika**

5. Add module: **Telegram → Send a Message**
   - Bot token: your PHC bot token
   - Chat ID: Monika's Telegram user ID (or a private PHC-content-review channel)
   - Message: The parsed Claude output

**5. Save to Google Doc (optional)**

6. Add module: **Google Docs → Append to a Document**
   - Document: "PHC Content Queue" (create this once)
   - Content: Full generated output with timestamp and property name header

**Test it:** Submit the Google Form → verify Claude generates content → verify it arrives in Telegram.

---

## Scenario 2 — Auto-Post to Facebook/Instagram

After Monika approves content in Telegram (via a reaction or reply), this scenario posts it automatically.

> ⚠️ Facebook/Instagram auto-posting requires the **Meta API** — accessed through the **Facebook Page** MCP in Make.com. You need the Page connected with publishing permissions.

### Step-by-step

**1. Trigger — Telegram Approval**

1. Module: **Telegram → Watch Updates**
   - Filter: Only trigger when Monika sends ✅ or replies "APPROVED" to the content message

**2. Extract approved text**

2. Module: **Text Parser → Extract Patterns**
   - Extract the FB/IG caption from the approved message (between the dividers)

**3. Post to Facebook Page**

3. Module: **Facebook Pages → Create a Page Post**
   - Page: Property Hub Cambodia (PropertyHubKH)
   - Message: The extracted EN caption
   - Publish immediately OR schedule (use **Scheduling** in Make.com)

**4. Post to Instagram**

4. Module: **Instagram for Business → Create a Photo/Video Post**
   - Connected via the same Meta Business account as Facebook
   - Caption: Same EN caption (Instagram auto-formats)
   - Note: Instagram requires a media URL — you'll need to upload the property photo to a public URL first (Google Drive → share publicly, or Cloudinary)

**5. TikTok — Manual delivery**

TikTok does NOT allow automated posting via API (as of 2026). The workaround:

5. Module: **Telegram → Send a Message**
   - To: Monika's Telegram
   - Message: "🎬 TikTok Script Ready — [property name]\n\n" + extracted TikTok script
   - Monika records the video manually and posts

---

## Scenario 3 — Scheduled Weekly Content Calendar

Generate a full week's content on Sunday → scheduled to post Monday–Friday.

### Step-by-step

**1. Trigger — Schedule**

1. Module: **Schedule → Every Week** (Sundays at 9am Phnom Penh time, UTC+7)

**2. Pick properties for the week**

2. Module: **Google Sheets → Get Range**
   - Sheet: A simple "Content Calendar" sheet where Nick or Monika lists properties for each week
   - Columns: Date · Property · Market · Content Types

**3. Loop through rows**

3. Module: **Iterator** → loop each row from the sheet

**4. For each row: call Claude**

4. Module: **HTTP → Make a Request** (same as Scenario 1 Step 2)

**5. Schedule the posts**

5. For Facebook/Instagram: use **Facebook Pages → Create a Post** with the scheduled_publish_time field
   - Set to the date from the spreadsheet row
   - Facebook accepts UNIX timestamp for future scheduling

---

## Recommended build order

| Step | When | Effort |
|------|------|--------|
| Scenario 1 (Form → Claude → Telegram) | Start here | 1–2 hours |
| Test with 5 real content requests | After Scenario 1 | 30 min |
| Scenario 2 (Approval → FB/IG post) | Once Scenario 1 is stable | 1–2 hours |
| Scenario 3 (Weekly calendar) | Once Scenario 2 is working | 2–3 hours |

---

## Important notes

**Content moderation:** Make.com will post whatever is approved. Monika must review before clicking APPROVED — Claude is good but not perfect. The review step is non-negotiable.

**Image handling:** Every social post needs a property photo. Make.com can't generate images. Monika needs to attach the correct photo when triggering the form, or maintain a Google Drive folder of approved property photos referenced by project name.

**Rate limits:** Claude API has rate limits. If generating a full week (5+ properties), add a delay between API calls (30–60 seconds) to avoid hitting limits.

**Backup:** Keep a Google Doc with all generated content as a log. If a Make.com run fails, you have the content and can post manually.

**Meta API review:** Facebook/Instagram posting via API requires your Meta app to go through review for the `pages_manage_posts` permission. This can take 1–2 weeks. Apply early.

---

## Monika's daily workflow (once everything is running)

1. **Monday morning:** Open Google Form → submit 5 content requests (one per day)
2. **Within 2 minutes:** Receive all 5 pieces in Telegram
3. **Review each:** Send ✅ to approve, or reply with edits and Claude regenerates
4. **Approved content:** Posts automatically to FB/IG at the scheduled time
5. **TikTok scripts:** Record manually, post natively in the app

**Total active time for Monika:** ~20 minutes per week instead of hours.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Claude returns an error | Check API key is valid; check rate limits |
| Facebook post fails | Check page token hasn't expired (refresh every 60 days) |
| Instagram post fails | Check media URL is publicly accessible |
| Content looks wrong | Refine the system prompt in PHC_Content_Machine_Prompt.md |
| Make.com scenario fails | Check the scenario error log → Operations tab |

---

*Setup guide compiled June 2026 for PHC Content Machine v1*
