import re

with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace all occurrences of parse_mode: 'Markdown' with parse_mode: 'HTML'
text = text.replace("parse_mode: 'Markdown'", "parse_mode: 'HTML'")
print("Replaced all parse_mode: 'Markdown' with parse_mode: 'HTML'")

# Fix getTourFeedback markdown
old_tour_feedback = """function getTourFeedback(unitCode) {
  const code = (unitCode || 'TS8-22').toUpperCase();
  return {
    text: 
      `📋 **VERIFIED BUYER & TENANT INSPECTION FEEDBACK**\\n` +
      `🏢 **Unit:** #${code} | Time Square 8\\n\\n` +
      `▫️ **Tour 1 (🇯🇵 Tokyo Individual Investor):**\\n` +
      `  *"Impressed with 22nd-floor city views and Taiwan developer completion track record. Reviewing 10% installment plan."*\\n\\n` +
      `▫️ **Tour 2 (🇰🇭 Phnom Penh Expat Family):**\\n` +
      `  *"Loved Boeng Trabek location close to Russian Market. Asking if developer delivers kitchen appliances."*\\n\\n` +
      `▫️ **Tour 3 (🇷🇺 Vladivostok High-Net-Worth):**\\n` +
      `  *"Verifying Strata title legal deed. Requested 1-page investment factsheet."*\\n\\n` +
      `💡 **Broker Recommendation from Nick:**\\n` +
      `*Demand is solid. Keep price steady at $99,000 — we anticipate a firm deposit within 2–3 weeks.*`,"""

new_tour_feedback = """function getTourFeedback(unitCode) {
  const code = (unitCode || 'TS8-22').toUpperCase();
  return {
    text: 
      `📋 <b>VERIFIED BUYER & TENANT INSPECTION FEEDBACK</b>\\n` +
      `🏢 <b>Unit:</b> #${code} | Time Square 8\\n\\n` +
      `▫️ <b>Tour 1 (🇯🇵 Tokyo Individual Investor):</b>\\n` +
      `  <i>"Impressed with 22nd-floor city views and Taiwan developer completion track record. Reviewing 10% installment plan."</i>\\n\\n` +
      `▫️ <b>Tour 2 (🇰🇭 Phnom Penh Expat Family):</b>\\n` +
      `  <i>"Loved Boeng Trabek location close to Russian Market. Asking if developer delivers kitchen appliances."</i>\\n\\n` +
      `▫️ <b>Tour 3 (🇷🇺 Vladivostok High-Net-Worth):</b>\\n` +
      `  <i>"Verifying Strata title legal deed. Requested 1-page investment factsheet."</i>\\n\\n` +
      `💡 <b>Broker Recommendation from Nick:</b>\\n` +
      `<i>Demand is solid. Keep price steady at $99,000 — we anticipate a firm deposit within 2–3 weeks.</i>`,"""

if old_tour_feedback in text:
    text = text.replace(old_tour_feedback, new_tour_feedback, 1)
    print("Cleaned getTourFeedback HTML")

# Clean digest report markdown
old_report = """          const report = 
            `📊 **PROPERTY HUB CAMBODIA · EXECUTIVE DIGEST**\\n\\n` +
            `📈 **CHANNEL NETWORK PERFORMANCE:**\\n` +
            `▫️ **Total Reach:** 12,400+ subscribers across 4 languages\\n` +
            `▫️ **Active Listings:** 4 verified properties\\n` +
            `▫️ **Leads Captured:** 19 qualified buyer/tenant inquiries\\n\\n` +
            `🏆 **TOP PERFORMING PROPERTIES:**\\n` +
            `1. **Time Square 8 (2BR)** · $99,000 Resale — 42 inquiries\\n` +
            `2. **Time Square 306 (1BR)** · $650/mo Rent — 28 inquiries\\n` +
            `3. **Time Square 9 (Launch)** · From $48,000 — 17 inquiries\\n\\n` +
            `🎯 **BUYER ORIGIN DEMOGRAPHICS:**\\n` +
            `🇯🇵 **Japan:** 42% (Nick routing)\\n` +
            `🇬🇧 **Expats / Local:** 31% (Monika routing)\\n` +
            `🇷🇺 **Russia / CIS:** 18% (Monika routing)\\n` +
            `🇩🇪 **Europe (DACH):** 9% (Raz routing)\\n\\n` +
            `💡 **STRATEGIC ACTION ADVICE:**\\n` +
            `High buyer demand for 1BR units in BKK1 under $700/mo. Relist any available inventory this Tuesday morning.`;"""

new_report = """          const report = 
            `📊 <b>PROPERTY HUB CAMBODIA · EXECUTIVE DIGEST</b>\\n\\n` +
            `📈 <b>CHANNEL NETWORK PERFORMANCE:</b>\\n` +
            `▫️ <b>Total Reach:</b> 12,400+ subscribers across 4 languages\\n` +
            `▫️ <b>Active Listings:</b> 4 verified properties\\n` +
            `▫️ <b>Leads Captured:</b> 19 qualified buyer/tenant inquiries\\n\\n` +
            `🏆 <b>TOP PERFORMING PROPERTIES:</b>\\n` +
            `1. <b>Time Square 8 (2BR)</b> · $99,000 Resale — 42 inquiries\\n` +
            `2. <b>Time Square 306 (1BR)</b> · $650/mo Rent — 28 inquiries\\n` +
            `3. <b>Time Square 9 (Launch)</b> · From $48,000 — 17 inquiries\\n\\n` +
            `🎯 <b>BUYER ORIGIN DEMOGRAPHICS:</b>\\n` +
            `🇯🇵 <b>Japan:</b> 42% (Nick routing)\\n` +
            `🇬🇧 <b>Expats / Local:</b> 31% (Monika routing)\\n` +
            `🇷🇺 <b>Russia / CIS:</b> 18% (Monika routing)\\n` +
            `🇩🇪 <b>Europe (DACH):</b> 9% (Raz routing)\\n\\n` +
            `💡 <b>STRATEGIC ACTION ADVICE:</b>\\n` +
            `High buyer demand for 1BR units in BKK1 under $700/mo. Relist any available inventory this Tuesday morning.`;"""

if old_report in text:
    text = text.replace(old_report, new_report, 1)
    print("Cleaned digest report HTML")

# Clean all remaining ** in alert templates
text = text.replace('**', '<b>', 1)
while '**' in text:
    # replace pairs of ** with <b> and </b>
    text = text.replace('**', '<b>', 1)
    if '**' in text:
        text = text.replace('**', '</b>', 1)

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(text)

print("Standardization complete.")
