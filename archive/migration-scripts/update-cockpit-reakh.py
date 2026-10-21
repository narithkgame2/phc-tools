import re

with open('phc-tools/bot-system-cockpit.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update Title and Branding Header
text = text.replace(
    '<title>PHC Telegram Bot Engine · Complete System Cockpit & Testbed</title>',
    '<title>Realestate.com.kh Telegram Bot Engine · Complete System Cockpit & Testbed</title>'
)

text = text.replace(
    '<h1>PHC Telegram Bot Engine</h1>',
    '<h1>Realestate.com.kh Bot Engine</h1>'
)

text = text.replace(
    '<p>Multi-Language Resale, Intake Wizard & Broker Co-Broke Ecosystem</p>',
    '<p>Official Realestate.com.kh Client Desk & Investment Ecosystem</p>'
)

# 2. Update Card 4 to Condo Purchase Guide
old_card4 = """      <!-- Test 4: Foreign Buyer Legal Guide -->
      <div class="cockpit-card">
        <div class="card-header">
          <div class="card-title">
            <h3>📚 Foreign Buyer Legal &amp; Tax Guide</h3>
            <p>Strata Title law, closing taxes, bank wires, and turnkey leasing</p>
          </div>
          <span class="badge badge-gold">Trust &amp; Legal</span>
        </div>
        <div class="tg-simulator">
          <div class="tg-bubble" id="legalBubble">
            <strong>📚 FOREIGN BUYER LEGAL &amp; TAX GUIDE</strong><br>
            <div class="tg-blockquote">
              ⚖️ <strong>Article 6 of 2010 Foreign Ownership Law:</strong> Foreigners can legally own 100% freehold title registered directly under their personal passport.
            </div>
            Tap any topic below for verified statutes:
          </div>
          <div class="tg-keyboard">
            <div class="tg-row">
              <button class="tg-btn" style="background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.25)); font-weight:700;" onclick="simToast('💬 Connecting to Nick direct legal advice', '💬')">💬 Legal Q&amp;A with Nick</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simLegalTopic('strata')">📜 Strata Title Law</button>
              <button class="tg-btn" onclick="simLegalTopic('taxes')">🏷️ Taxes &amp; Fees (4%)</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simLegalTopic('wires')">💸 Bank Wires &amp; USDT</button>
              <button class="tg-btn" onclick="simLegalTopic('mgmt')">🔑 Turnkey Management</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('🔙 Returning to Main Menu', '🔙')">🔙 Main Menu</button>
            </div>
          </div>
        </div>
        <div class="action-bar">
          <span class="cmd-badge">/legal</span>
          <label class="test-checkbox"><input type="checkbox" onchange="updateScore(this)"> Test Verified in Telegram</label>
          <a href="https://t.me/Nick_REAKH_Bot" target="_blank" class="tg-link-btn">Send /legal ↗</a>
        </div>
      </div>"""

new_card4 = """      <!-- Test 4: Condo Purchase Guide & Closing Costs -->
      <div class="cockpit-card">
        <div class="card-header">
          <div class="card-title">
            <h3>📖 Condo Purchase Guide &amp; Associated Costs</h3>
            <p>4-step buying roadmap, reservation deposits, stamp duty &amp; 0% buyer commission</p>
          </div>
          <span class="badge badge-gold">Buyer RoadMap</span>
        </div>
        <div class="tg-simulator">
          <div class="tg-bubble" id="purchaseGuideBubble">
            <strong>📖 PHNOM PENH CONDO PURCHASE GUIDE &amp; COSTS</strong><br>
            <span style="font-size:11px;color:#94a3b8;">Official Buyer Roadmap by Realestate.com.kh:</span>
            <div class="tg-blockquote">
              <strong>1️⃣ Unit Reservation:</strong> $1,000 – $2,000 USD deposit<br>
              <strong>2️⃣ SPA Contract Signing:</strong> 10% – 20% down payment<br>
              <strong>3️⃣ Milestone Installments:</strong> Construction stage or cash flow<br>
              <strong>4️⃣ Strata Hard Title:</strong> Issued under your personal passport
            </div>
            <strong>Associated Closing Costs:</strong><br>
            ▫️ <strong>Transfer Stamp Duty:</strong> 4% (one-time upon title transfer)<br>
            ▫️ <strong>Cadastral Legal Fee:</strong> ~$500 – $1,000 USD<br>
            ▫️ <strong>Buyer Commission:</strong> <span style="color:#34d399;font-weight:700;">$0 (Zero Fee — Seller Paid)</span><br>
            ▫️ <strong>Capital Gains Tax:</strong> 0% for foreign individuals
          </div>
          <div class="tg-keyboard">
            <div class="tg-row">
              <button class="tg-btn" style="background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.25)); font-weight:700;" onclick="simToast('💬 Connecting directly to Nick (Realestate.com.kh)...', '💬')">💬 Consult with Nick (Telegram)</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="switchSimCalc()">🧮 Payment Calculator</button>
              <button class="tg-btn" onclick="simToast('Viewing Featured Properties...', '🏢')">🏢 Explore Properties</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('🔙 Returning to Main Menu', '🔙')">🔙 Main Menu</button>
            </div>
          </div>
        </div>
        <div class="action-bar">
          <span class="cmd-badge">/guide or /purchaseguide</span>
          <label class="test-checkbox"><input type="checkbox" onchange="updateScore(this)"> Test Verified in Telegram</label>
          <a href="https://t.me/Nick_REAKH_Bot" target="_blank" class="tg-link-btn">Send /guide ↗</a>
        </div>
      </div>"""

if old_card4 in text:
    text = text.replace(old_card4, new_card4, 1)
    print("Replaced Card 4 with Condo Purchase Guide")
else:
    print("Warning: old_card4 not found")

# Replace remaining PHC mentions
text = text.replace('PHC BOT ENGINE COCKPIT', 'REALESTATE.COM.KH BOT ENGINE COCKPIT')
text = text.replace('Property Hub Cambodia', 'Realestate.com.kh')

with open('phc-tools/bot-system-cockpit.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Cockpit HTML updated with Realestate.com.kh and Purchase Guide.")
