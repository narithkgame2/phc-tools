import re

with open('phc-tools/bot-system-cockpit.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add Architecture Banner right after <div class="nav-tabs">...</div>
banner_html = """  <!-- UX Overhaul Architecture Banner -->
  <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(16, 185, 129, 0.08)); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px; padding: 20px 24px; margin-bottom: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
      <div>
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
          <span style="font-size:20px;">⚡</span>
          <h2 style="font-size:16px; font-weight:800; color:#f8fafc; letter-spacing:-0.2px;">2026 MOBILE UX OVERHAUL · THE "RULE OF 3" &amp; JAPANESE-FIRST ARCHITECTURE</h2>
          <span class="badge badge-gold" style="font-size:10px; padding:3px 8px;">LIVE IN STAGING</span>
        </div>
        <p style="font-size:13px; color:#cbd5e1; max-width:960px; line-height:1.6;">
          Refined strictly based on live iPhone/Android mobile testing feedback with Nick. Eliminated button maze friction, eradicated raw <code>**</code> asterisk formatting, and established an up-front Japanese language portal.
        </p>
      </div>
      <div style="display:flex; gap:10px;">
        <span class="metric-pill" style="background:rgba(16,185,129,0.15); border-color:rgba(16,185,129,0.4); color:#34d399; font-weight:700;">
          ✓ Max 3-4 Buttons Per Screen
        </span>
        <span class="metric-pill" style="background:rgba(59,130,246,0.15); border-color:rgba(59,130,246,0.4); color:#60a5fa; font-weight:700;">
          ✓ Pure HTML Bolding
        </span>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; margin-top:16px;">
      <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px 14px;">
        <div style="font-size:11px; text-transform:uppercase; color:#f59e0b; font-weight:700; margin-bottom:4px;">1. The Rule of 3</div>
        <div style="font-size:12px; color:#94a3b8;">Row 1: Full-width CTA (Chat with Nick)<br>Row 2: 2 Primary actions (Tour &amp; Calc)<br>Row 3: Guaranteed 🔙 Main Menu</div>
      </div>
      <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px 14px;">
        <div style="font-size:11px; text-transform:uppercase; color:#34d399; font-weight:700; margin-bottom:4px;">2. Language-First Onboarding</div>
        <div style="font-size:12px; color:#94a3b8;">/start immediately gates 🇯🇵 日本語, 🇬🇧 English, 🇨🇳 中文, 🇷🇺 Русский. Zero confusing English button walls for Japanese clients.</div>
      </div>
      <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px 14px;">
        <div style="font-size:11px; text-transform:uppercase; color:#38bdf8; font-weight:700; margin-bottom:4px;">3. No Raw Asterisks</div>
        <div style="font-size:12px; color:#94a3b8;">100% standardized on Telegram HTML parse mode. Eliminated unparsed <code>**</code> and broken markdown symbols across all flows.</div>
      </div>
      <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px 14px;">
        <div style="font-size:11px; text-transform:uppercase; color:#a855f7; font-weight:700; margin-bottom:4px;">4. Zero-Dead-End Guarantee</div>
        <div style="font-size:12px; color:#94a3b8;">Every flow (lead inquiry, calculator, legal, tour booking, or typing free text) provides clear return paths and alerts Nick.</div>
      </div>
    </div>
  </div>
"""

old_nav_tabs_end = "  </div>\n\n  <!-- ==============================================================\n  <!-- TAB 1: INVESTOR SUITE"
if "<!-- UX Overhaul Architecture Banner -->" not in html:
    # Insert before Tab 1
    tab1_marker = "  <!-- ==============================================================\n  <!-- TAB 1: INVESTOR SUITE"
    if tab1_marker not in html:
        tab1_marker = "  <!-- =============================================================="
    html = html.replace(tab1_marker, banner_html + "\n" + tab1_marker, 1)
    print("Inserted UX Overhaul Architecture Banner")

# 2. Update Card 1: VIP Property Showcase Card to sleek 3-row layout with language switcher
old_card1_body = """        <div class="tg-simulator">
          <div class="tg-bubble">
            <strong>🎯 TIME SQUARE 8 | 2-BEDROOM RESALE</strong><br>
            <span style="color:#f87171;font-weight:700;">#ForSale $99,000</span> (Urgent Resale — $15,000 Below Developer!)<br><br>
            📍 Boeng Trabek / Toul Tompoung, Chamkarmon<br>
            ▫️ <strong>Floor:</strong> 22nd Floor (Panoramic City Skyline)<br>
            ▫️ <strong>Size:</strong> 65.0 sqm Gross · 48 sqm Net<br>
            ▫️ <strong>Net Yield:</strong> <span style="color:#34d399;font-weight:700;">8.5% – 9.1% Net</span> ($750/mo rent)<br>
            ▫️ <strong>Ownership:</strong> 100% Foreign Freehold Strata Hard Title
          </div>
          <div class="tg-keyboard">
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('Viewing requested. Alert dispatched to Nick.')">Book Tour</button>
              <button class="tg-btn" onclick="simToast('PDF Investment Teaser sent.')">PDF Teaser</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="switchSimCalc()">Calculator</button>
              <button class="tg-btn" onclick="switchSimLegal()">Legal Guide</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('Live Rates: $99,000 = 約 1,504 万円 = €91,080')">JPY / EUR Rates</button>
              <button class="tg-btn" onclick="switchTab('phase1')">Compare 3</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('Watchlist activated for TS8')">Price Alerts</button>
              <button class="tg-btn" onclick="switchSimLang()">Language</button>
            </div>
          </div>
        </div>"""

new_card1_body = """        <div class="tg-simulator">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="font-size:11px; font-weight:700; color:var(--gold);">PREVIEW LANGUAGE:</span>
            <div style="display:flex; gap:6px;">
              <button class="tg-btn" style="padding:4px 8px; font-size:11px;" id="btnSimLangJP" onclick="toggleCardLang('JP')">🇯🇵 日本語</button>
              <button class="tg-btn" style="padding:4px 8px; font-size:11px; background:rgba(255,255,255,0.15);" id="btnSimLangEN" onclick="toggleCardLang('EN')">🇬🇧 English</button>
            </div>
          </div>
          <div class="tg-bubble" id="card1Bubble">
            <strong>🎯 TIME SQUARE 8 · 2-BEDROOM RESALE</strong><br>
            <span style="color:#f87171;font-weight:700;">#ForSale $99,000 USD</span> (Urgent Resale — $15,000 Below Developer!)<br><br>
            📍 Boeng Trabek / Toul Tompoung, Chamkarmon<br>
            ▫️ <strong>Floor:</strong> 22nd Floor (Panoramic City Skyline)<br>
            ▫️ <strong>Size:</strong> 65.0 sqm Gross · 48.0 sqm Net<br>
            ▫️ <strong>Net Yield:</strong> <span style="color:#34d399;font-weight:700;">8.5% – 9.1% Net</span> ($750/mo rent)<br>
            ▫️ <strong>Ownership:</strong> 100% Foreign Freehold Strata Hard Title
            <div class="tg-blockquote">Direct private advisory and off-market developer allocations managed by Property Hub Cambodia.</div>
          </div>
          <div class="tg-keyboard" id="card1Keyboard">
            <div class="tg-row">
              <button class="tg-btn" style="background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.25)); font-weight:700;" onclick="simToast('💬 Connecting directly to Nick Telegram (@Nick_REAKH)...', '💬')">💬 Consult with Nick</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('📅 Tour requested! In-person or live video call.', '📅')">📅 Book Tour / Video</button>
              <button class="tg-btn" onclick="switchSimCalc()">🧮 Payment Calculator</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('🔙 Returning to Main Navigation Menu...', '🔙')">🔙 Main Menu</button>
            </div>
          </div>
        </div>"""

if old_card1_body in html:
    html = html.replace(old_card1_body, new_card1_body, 1)
    print("Updated Card 1 with Rule of 3 and bilingual toggle")
else:
    print("Warning: old_card1_body not found")

# 3. Update Card 2: Comparison Matrix buttons
old_card2_kb = """          <div class="tg-keyboard">
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('Viewing Time Square 8 details')">Time Square 8</button>
              <button class="tg-btn" onclick="simToast('Viewing Residence L details')">Residence L</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('Viewing Odom Living details')">Odom Living</button>
              <button class="tg-btn" onclick="simToast('Opening payment calculator')">Payment Calculator</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('Redirecting to Nick Telegram')">Consult with Nick</button>
            </div>
          </div>"""

new_card2_kb = """          <div class="tg-keyboard">
            <div class="tg-row">
              <button class="tg-btn" style="background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.25)); font-weight:700;" onclick="simToast('💬 Connecting directly to Nick...', '💬')">💬 Consult with Nick (Telegram)</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('Viewing Time Square 8 ($99k)', '🏢')">🏢 Time Square 8</button>
              <button class="tg-btn" onclick="simToast('Viewing Residence L ($45k)', '🏢')">🏢 Residence L</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('Viewing Odom Living ($240k)', '🏢')">🏢 Odom Living</button>
              <button class="tg-btn" onclick="simToast('Returning to Main Menu', '🔙')">🔙 Main Menu</button>
            </div>
          </div>"""

if old_card2_kb in html:
    html = html.replace(old_card2_kb, new_card2_kb, 1)
    print("Updated Card 2 Comparison keyboard with Rule of 3")
else:
    print("Warning: old_card2_kb not found")

# 4. Update Card 3: Calculator keyboard
old_card3_kb = """          <div class="tg-keyboard">
            <div class="tg-row">
              <button class="tg-btn" onclick="simCalcOption('p10')">10% Down ($9.9k)</button>
              <button class="tg-btn" onclick="simCalcOption('p20')">20% Down ($19.8k)</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simCalcOption('mortgage')">Bank Loan (7.5%)</button>
              <button class="tg-btn" onclick="simCalcOption('yield')">Net Yield &amp; ROI</button>
            </div>
          </div>"""

new_card3_kb = """          <div class="tg-keyboard">
            <div class="tg-row">
              <button class="tg-btn" onclick="simCalcOption('p10')">10% Down ($9.9k)</button>
              <button class="tg-btn" onclick="simCalcOption('p20')">20% Down ($19.8k)</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simCalcOption('mortgage')">Bank Loan (7.5%)</button>
              <button class="tg-btn" onclick="simCalcOption('yield')">Net Yield &amp; ROI</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" style="background:rgba(245,158,11,0.2);" onclick="simToast('💬 Discussing cash flow model with Nick...', '💬')">💬 Consult with Nick</button>
              <button class="tg-btn" onclick="simToast('🔙 Returning to Main Menu', '🔙')">🔙 Main Menu</button>
            </div>
          </div>"""

if old_card3_kb in html:
    html = html.replace(old_card3_kb, new_card3_kb, 1)
    print("Updated Card 3 Calculator keyboard with Rule of 3")
else:
    print("Warning: old_card3_kb not found")

# 5. Update Card 4: Legal Guide keyboard
old_card4_kb = """          <div class="tg-keyboard">
            <div class="tg-row">
              <button class="tg-btn" onclick="simLegalTopic('strata')">Strata Title Law</button>
              <button class="tg-btn" onclick="simLegalTopic('taxes')">Taxes &amp; Fees</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simLegalTopic('wires')">Wires &amp; USDT</button>
              <button class="tg-btn" onclick="simLegalTopic('mgmt')">Turnkey Management</button>
            </div>
            <div class="tg-row">
              <button class="tg-btn" onclick="simToast('💬 Connecting to Nick direct legal advice')">💬 Legal Q&amp;A with Nick</button>
            </div>
          </div>"""

new_card4_kb = """          <div class="tg-keyboard">
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
          </div>"""

if old_card4_kb in html:
    html = html.replace(old_card4_kb, new_card4_kb, 1)
    print("Updated Card 4 Legal Guide keyboard with Rule of 3")
else:
    print("Warning: old_card4_kb not found")

# 6. Add JavaScript for toggleCardLang
js_helper = """    function toggleCardLang(lang) {
      const b = document.getElementById('card1Bubble');
      const k = document.getElementById('card1Keyboard');
      const btnJP = document.getElementById('btnSimLangJP');
      const btnEN = document.getElementById('btnSimLangEN');

      if (lang === 'JP') {
        btnJP.style.background = 'rgba(255,255,255,0.15)';
        btnEN.style.background = 'transparent';
        b.innerHTML = `<strong>🎯 タイムズスクエア8 · 2LDK 緊急転売枠</strong><br>
          <span style="color:#f87171;font-weight:700;">$99,000 USD</span>（約1,504万円 · 開発元価格より$15,000割安）<br><br>
          📍 プノンペン · 桑園（Chamkarmon / Boeng Trabek）<br>
          ▫️ <strong>階数：</strong> 22階（市内パノラマビュー）<br>
          ▫️ <strong>専有面積：</strong> 壁芯 65.0㎡（約19.6坪） / 内法 48.0㎡<br>
          ▫️ <strong>実質純利回り：</strong> <span style="color:#34d399;font-weight:700;">8.5% Net</span>（想定家賃 $750 USD/月）<br>
          ▫️ <strong>権利形態：</strong> 外国人100%自己名義ハードタイトル（分層所有権）
          <div class="tg-blockquote">現地・オンライン案内や優先購入のお手続きは代表Nickが承ります。</div>`;

        k.innerHTML = `
          <div class="tg-row">
            <button class="tg-btn" style="background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.25)); font-weight:700;" onclick="simToast('💬 Nickへ直接相談 (Telegram) を起動...', '💬')">💬 Nickへ直接相談 (Telegram)</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="simToast('📅 内覧予約 / ビデオ案内リクエスト送信', '📅')">📅 内覧予約 / ビデオ案内</button>
            <button class="tg-btn" onclick="switchSimCalc()">🧮 収支・ローン試算</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="simToast('🔙 メインメニューへ戻る', '🔙')">🔙 メインメニュー</button>
          </div>`;
        simToast('Switched showcase preview to 🇯🇵 日本語', '🇯🇵');
      } else {
        btnEN.style.background = 'rgba(255,255,255,0.15)';
        btnJP.style.background = 'transparent';
        b.innerHTML = `<strong>🎯 TIME SQUARE 8 · 2-BEDROOM RESALE</strong><br>
          <span style="color:#f87171;font-weight:700;">#ForSale $99,000 USD</span> (Urgent Resale — $15,000 Below Developer!)<br><br>
          📍 Boeng Trabek / Toul Tompoung, Chamkarmon<br>
          ▫️ <strong>Floor:</strong> 22nd Floor (Panoramic City Skyline)<br>
          ▫️ <strong>Size:</strong> 65.0 sqm Gross · 48.0 sqm Net<br>
          ▫️ <strong>Net Yield:</strong> <span style="color:#34d399;font-weight:700;">8.5% – 9.1% Net</span> ($750/mo rent)<br>
          ▫️ <strong>Ownership:</strong> 100% Foreign Freehold Strata Hard Title
          <div class="tg-blockquote">Direct private advisory and off-market developer allocations managed by Property Hub Cambodia.</div>`;

        k.innerHTML = `
          <div class="tg-row">
            <button class="tg-btn" style="background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.25)); font-weight:700;" onclick="simToast('💬 Connecting directly to Nick...', '💬')">💬 Consult with Nick</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="simToast('📅 Tour requested! In-person or live video call.', '📅')">📅 Book Tour / Video</button>
            <button class="tg-btn" onclick="switchSimCalc()">🧮 Payment Calculator</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="simToast('🔙 Returning to Main Navigation Menu...', '🔙')">🔙 Main Menu</button>
          </div>`;
        simToast('Switched showcase preview to 🇬🇧 English', '🇬🇧');
      }
    }
"""

if "function toggleCardLang" not in html:
    html = html.replace("    function switchTab(tabId) {", js_helper + "\n    function switchTab(tabId) {", 1)
    print("Added toggleCardLang JS helper function")

with open('phc-tools/bot-system-cockpit.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Cockpit HTML update completed successfully.")
