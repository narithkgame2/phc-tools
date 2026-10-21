import re

with open('phc-tools/bot-system-cockpit.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update Navigation Tabs to include Dual Viewport as Tab 0
old_tabs = """  <div class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('phase1')">💼 1. Investor Conversion Suite</button>"""

new_tabs = """  <div class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('dualView')">📱 0. Client vs Admin Live Simulator</button>
    <button class="tab-btn" onclick="switchTab('phase1')">💼 1. Investor Conversion Suite</button>"""

if old_tabs in html:
    html = html.replace(old_tabs, new_tabs, 1)
    print("Updated navigation tabs with dualView button")
else:
    print("Warning: old_tabs not found")

# Make phase1 inactive by default since dualView will be active
html = html.replace('<div id="phase1" class="section-container active">', '<div id="phase1" class="section-container">', 1)

# 2. Build the Dual Viewport Section HTML
dual_view_html = """  <!-- ============================================================== -->
  <!-- TAB 0: CLIENT VS ADMIN LIVE DUAL-VIEWPORT SIMULATOR -->
  <!-- ============================================================== -->
  <div id="dualView" class="section-container active">
    
    <!-- Scenario Selection Toolbar -->
    <div style="background: rgba(15, 23, 42, 0.8); border: 1px solid var(--panel-border); border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 13px; font-weight: 700; color: var(--gold); text-transform: uppercase;">Simulate Live Journey:</span>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <button class="tab-btn active" id="btnScenA" style="padding: 6px 14px; font-size: 12px;" onclick="loadDualScenario('A')">🇯🇵 1. Japanese Buyer (TS8)</button>
        <button class="tab-btn" id="btnScenB" style="padding: 6px 14px; font-size: 12px;" onclick="loadDualScenario('B')">📅 2. Overseas Video Tour Booking</button>
        <button class="tab-btn" id="btnScenC" style="padding: 6px 14px; font-size: 12px;" onclick="loadDualScenario('C')">💼 3. Condo Owner Listing (60s)</button>
        <button class="tab-btn" id="btnScenD" style="padding: 6px 14px; font-size: 12px;" onclick="loadDualScenario('D')">💬 4. Client Free-Text Question</button>
      </div>
    </div>

    <!-- Dual Viewport Grid -->
    <div class="grid-2col" style="align-items: start;">

      <!-- ========================================== -->
      <!-- COLUMN 1: CLIENT-FACING SIDE (TELEGRAM)   -->
      <!-- ========================================== -->
      <div class="cockpit-card" style="border-top: 3px solid #38bdf8;">
        <div class="card-header">
          <div class="card-title">
            <h3 style="display: flex; align-items: center; gap: 8px;">
              <span>📱</span> Client-Facing Experience
            </h3>
            <p id="clientViewSub">What the buyer or investor sees on their Telegram mobile app</p>
          </div>
          <span class="badge badge-blue">Client Screen</span>
        </div>

        <div style="padding: 12px 14px; background: rgba(56, 189, 248, 0.08); border-radius: 8px; margin-bottom: 14px; font-size: 12px; color: #bae6fd; display: flex; justify-content: space-between; align-items: center;">
          <span id="clientFeaturePill">✨ Rule of 3 (Max 3-4 Actions) · 100% Pure HTML · No Asterisks</span>
          <span style="font-weight: 700; color: #38bdf8;">Mobile Viewport</span>
        </div>

        <div class="tg-simulator" id="clientSimulator">
          <div class="tg-bubble" id="clientBubble">
            <!-- Injected via JS -->
          </div>
          <div class="tg-keyboard" id="clientKeyboard">
            <!-- Injected via JS -->
          </div>
        </div>

        <div class="action-bar" style="margin-top: 14px;">
          <span class="cmd-badge" id="clientCmdBadge">/start or /card</span>
          <a href="https://t.me/Nick_REAKH_Bot" target="_blank" class="tg-link-btn">Test Live on Phone ↗</a>
        </div>
      </div>

      <!-- ========================================== -->
      <!-- COLUMN 2: ADMIN-FACING SIDE (NICK ALERT)  -->
      <!-- ========================================== -->
      <div class="cockpit-card" style="border-top: 3px solid #f59e0b;">
        <div class="card-header">
          <div class="card-title">
            <h3 style="display: flex; align-items: center; gap: 8px;">
              <span>🛡️</span> Admin &amp; Broker Control Center
            </h3>
            <p>Instant SLA alert &amp; 1-tap action dispatched to Nick (@Nick_REAKH)</p>
          </div>
          <span class="badge badge-gold">Nick Private Desk</span>
        </div>

        <div style="padding: 12px 14px; background: rgba(245, 158, 11, 0.08); border-radius: 8px; margin-bottom: 14px; font-size: 12px; color: #fde68a; display: flex; justify-content: space-between; align-items: center;">
          <span id="adminSlaPill">⚡ Response SLA Watchdog: 15-Minute Benchmark</span>
          <span style="font-weight: 700; color: #f59e0b;">Lead Telemetry</span>
        </div>

        <div class="tg-simulator" id="adminSimulator">
          <div class="tg-bubble" id="adminBubble" style="background: #1c2738; border-left: 3px solid #f59e0b;">
            <!-- Injected via JS -->
          </div>
          <div class="tg-keyboard" id="adminKeyboard">
            <!-- Injected via JS -->
          </div>
        </div>

        <div class="action-bar" style="margin-top: 14px;">
          <span class="cmd-badge">Admin Telegram ID: 353195979</span>
          <span style="font-size: 11px; color: var(--green);">● Live Bot Hook Connected</span>
        </div>
      </div>

    </div>

    <!-- Architectural Contrast Summary Table -->
    <div style="margin-top: 24px; background: rgba(15, 23, 42, 0.7); border: 1px solid var(--panel-border); border-radius: 14px; padding: 20px;">
      <h4 style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
        <span>⚖️</span> System Architecture Comparison: Client vs Admin
      </h4>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; color: #cbd5e1;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left; color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
              <th style="padding: 10px 14px;">Core Feature</th>
              <th style="padding: 10px 14px; color: #38bdf8;">Client-Facing Experience</th>
              <th style="padding: 10px 14px; color: #f59e0b;">Admin (Nick) Experience</th>
              <th style="padding: 10px 14px; color: #34d399;">Business Impact</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 12px 14px; font-weight: 700;">Navigation &amp; Buttons</td>
              <td style="padding: 12px 14px;"><strong>The Rule of 3 (Max 3-4 Actions)</strong><br><span style="color:#94a3b8; font-size:11.5px;">No button overload; zero cognitive friction</span></td>
              <td style="padding: 12px 14px;"><strong>1-Tap Action Center</strong><br><span style="color:#94a3b8; font-size:11.5px;">Instant direct message link (tg://user) + SLA status toggles</span></td>
              <td style="padding: 12px 14px; color: #34d399;">High mobile conversion rate</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 12px 14px; font-weight: 700;">Text Formatting</td>
              <td style="padding: 12px 14px;"><strong>Pure HTML Mode (Zero `**`)</strong><br><span style="color:#94a3b8; font-size:11.5px;">Beautiful bolding, blockquotes, and currency tags</span></td>
              <td style="padding: 12px 14px;"><strong>Structured Lead Dossier</strong><br><span style="color:#94a3b8; font-size:11.5px;">Client budget, location, inquiry timestamp, and user ID</span></td>
              <td style="padding: 12px 14px; color: #34d399;">Premium brand credibility</td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <td style="padding: 12px 14px; font-weight: 700;">Language &amp; Cultural Fit</td>
              <td style="padding: 12px 14px;"><strong>Language-First Gate</strong><br><span style="color:#94a3b8; font-size:11.5px;">Immediate Japanese portal with 万円 and 坪 calculations</span></td>
              <td style="padding: 12px 14px;"><strong>Language Tagging in Alert</strong><br><span style="color:#94a3b8; font-size:11.5px;">Tells Nick whether client requires JP or EN advisory</span></td>
              <td style="padding: 12px 14px; color: #34d399;">Tailored cross-border deal closing</td>
            </tr>
            <tr>
              <td style="padding: 12px 14px; font-weight: 700;">Dead-End Protection</td>
              <td style="padding: 12px 14px;"><strong>Guaranteed Return Paths</strong><br><span style="color:#94a3b8; font-size:11.5px;">Every sub-card and calculator includes 🔙 Main Menu</span></td>
              <td style="padding: 12px 14px;"><strong>15-Minute SLA Watchdog</strong><br><span style="color:#94a3b8; font-size:11.5px;">Unanswered leads trigger visual escalation in ledger</span></td>
              <td style="padding: 12px 14px; color: #34d399;">Zero lost leads; 100% follow-up</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
"""

# Insert before Phase 1 section
if '<div id="dualView"' not in html:
    html = html.replace('  <!-- ==============================================================\n  <!-- TAB 1: INVESTOR SUITE', dual_view_html + '\n  <!-- ==============================================================\n  <!-- TAB 1: INVESTOR SUITE', 1)
    print("Inserted Dual Viewport HTML section")

# 3. Add Scenario switching JavaScript
js_dual = """
    // Dual Viewport Scenario Data
    const dualScenarios = {
      'A': {
        sub: 'Japanese Investor reviewing Time Square 8 ($99,000 USD)',
        pill: '🇯🇵 Japanese VIP Portal · 万円 & 坪換算 · Rule of 3 (Max 3-4 Actions)',
        cmd: '/showcase or /card (Lang: JP)',
        clientBubble: `<strong>🎯 タイムズスクエア8 · 2LDK 緊急転売枠</strong><br>
          <span style="color:#f87171;font-weight:700;">$99,000 USD</span>（約1,504万円 · 開発元価格より$15,000割安）<br><br>
          📍 プノンペン · 桑園（Chamkarmon / Boeng Trabek）<br>
          ▫️ <strong>階数：</strong> 22階（市内パノラマビュー）<br>
          ▫️ <strong>専有面積：</strong> 壁芯 65.0㎡（約19.6坪） / 内法 48.0㎡<br>
          ▫️ <strong>実質純利回り：</strong> <span style="color:#34d399;font-weight:700;">8.5% Net</span>（想定家賃 $750 USD/月）<br>
          ▫️ <strong>権利形態：</strong> 外国人100%自己名義ハードタイトル（分層所有権）
          <div class="tg-blockquote">現地・オンライン案内や優先購入のお手続きは代表Nickが承ります。</div>`,
        clientKeyboard: `
          <div class="tg-row">
            <button class="tg-btn" style="background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.25)); font-weight:700;" onclick="simToast('💬 Connecting directly with Nick (@Nick_REAKH)...', '💬')">💬 Nickへ直接相談 (Telegram)</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="loadDualScenario('B')">📅 内覧予約 / ビデオ案内</button>
            <button class="tg-btn" onclick="switchSimCalc()">🧮 収支・ローン試算</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="simToast('🔙 Returning to Main Navigation Menu...', '🔙')">🔙 メインメニュー</button>
          </div>`,
        adminSla: '⚡ Response SLA Watchdog: 15-Minute Countdown Active',
        adminBubble: `🚨 <strong>NEW PROPERTY INQUIRY DETECTED!</strong><br><br>
          👤 <strong>Client:</strong> Kenji Takahashi (@Takahashi_Tokyo)<br>
          🆔 <strong>User ID:</strong> <code>5712964982</code><br>
          🌐 <strong>Language:</strong> 🇯🇵 日本語 (Japanese)<br>
          🏢 <strong>Property:</strong> Time Square 8 (Unit #TS8-22 · $99,000)<br>
          🎯 <strong>Action:</strong> Reviewing Resale Color Card &amp; Yield Model<br>
          ⏰ <strong>Timestamp:</strong> Just now<br><br>
          <div class="tg-blockquote">⚡ <strong>15-Minute SLA Benchmark:</strong> Client is actively browsing. Message them now to secure private viewing booking!</div>`,
        adminKeyboard: `
          <div class="tg-row">
            <button class="tg-btn" style="background:linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.25)); font-weight:700;" onclick="simToast('💬 Opening direct Telegram chat with @Takahashi_Tokyo', '💬')">💬 Message Client Directly (@Takahashi_Tokyo)</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="simToast('✅ Lead marked as Contacted. SLA satisfied!', '✅')">✅ Mark Contacted</button>
            <button class="tg-btn" onclick="simToast('📅 Inspection Tour booked into calendar.', '📅')">📅 Tour Booked</button>
          </div>`
      },
      'B': {
        sub: 'Client confirms overseas video viewing tour request',
        pill: '🎥 Live Overseas Video Tour Flow · Zero Dead-Ends',
        cmd: 'btn_book_TS8 -> tour_video_TS8',
        clientBubble: `✅ <strong>内覧リクエストを受け付けました（TIME SQUARE 8）</strong><br><br>
          ▫️ <strong>形式：</strong> 🎥 オンライン・ビデオ案内（日本・海外から）<br>
          ▫️ <strong>担当：</strong> Nick（プノンペン日系窓口）<br><br>
          日程調整のため、代表NickよりTelegramにて直接ご連絡差し上げます。お急ぎの場合は以下より直接メッセージをお送りください：`,
        clientKeyboard: `
          <div class="tg-row">
            <button class="tg-btn" style="background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.25)); font-weight:700;" onclick="simToast('Opening direct chat with Nick...', '💬')">💬 Nickへ直接相談 (Telegram)</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="loadDualScenario('A')">🔙 物件詳細へ戻る</button>
            <button class="tg-btn" onclick="simToast('Returning to Main Menu', '🔙')">🔙 メインメニュー</button>
          </div>`,
        adminSla: '🚨 URGENT TOUR BOOKING: Coordinate Viewing Time',
        adminBubble: `📅 <strong>NEW OVERSEAS VIDEO TOUR BOOKING!</strong> 🚨<br><br>
          👤 <strong>Client:</strong> Kenji Takahashi (@Takahashi_Tokyo)<br>
          🏢 <strong>Property:</strong> Time Square 8 (2BR Resale · $99k)<br>
          🎯 <strong>Format:</strong> 🎥 Live Overseas Video Call (WhatsApp/Zoom)<br>
          ⏰ <strong>Booking Time:</strong> Just now<br><br>
          <div class="tg-blockquote">⚡ <strong>Action Required:</strong> Send calendar invite &amp; confirm Tokyo time zone offset within 15 minutes!</div>`,
        adminKeyboard: `
          <div class="tg-row">
            <button class="tg-btn" style="background:linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.25)); font-weight:700;" onclick="simToast('Connecting to @Takahashi_Tokyo to lock tour time...', '💬')">💬 Confirm Tour Time with Client</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="simToast('✅ Synced with PHC Tour Calendar', '📅')">📅 Sync with Google Calendar</button>
          </div>`
      },
      'C': {
        sub: 'Condo owner submitting exclusive unit resale listing',
        pill: '💼 60-Second Property Intake Wizard · Multi-Lingual Syndication',
        cmd: 'btn_intake_owner -> owner_val',
        clientBubble: `🎉 <strong>PROPERTY SUBMISSION RECEIVED!</strong><br><br>
          📋 <strong>YOUR SUBMISSION SUMMARY:</strong><br>
          ▫️ <strong>Unit Reference:</strong> <code>#PHC-842</code><br>
          ▫️ <strong>Objective:</strong> Resale (For Sale)<br>
          ▫️ <strong>Location:</strong> Time Square Series (Chamkarmon)<br>
          ▫️ <strong>Layout:</strong> 2-Bedroom (55–75 sqm)<br>
          ▫️ <strong>Target Pricing:</strong> $99,000 USD<br><br>
          🛡️ <strong>NEXT STEPS:</strong><br>
          Nick and the PHC valuation team will verify building title records and reach out within 2 hours to confirm your representation agreement.<br><br>
          👉 <i>Track marketing analytics anytime by typing:</i> <code>/myunit PHC-842</code>`,
        clientKeyboard: `
          <div class="tg-row">
            <button class="tg-btn" style="background:rgba(245,158,11,0.25); font-weight:700;" onclick="simToast('Connecting to Nick...', '💬')">💬 Connect Directly with Nick</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="simToast('Loading Landlord Performance Dashboard...', '🔑')">🔑 View Performance Dashboard</button>
            <button class="tg-btn" onclick="simToast('Returning to Main Menu', '🔙')">🔙 Main Menu</button>
          </div>`,
        adminSla: '🏢 NEW EXCLUSIVE LISTING MANDATE INTAKE',
        adminBubble: `🚨 <strong>NEW EXCLUSIVE PROPERTY SUBMISSION!</strong> 🚨<br><br>
          👤 <strong>Owner:</strong> Somnang Keo (@Keo_Property)<br>
          🆔 <strong>User ID:</strong> <code>491028471</code><br>
          📋 <strong>Unit Code:</strong> <code>#PHC-842</code><br>
          🎯 <strong>Goal:</strong> Resale (For Sale)<br>
          📍 <strong>Project:</strong> Time Square Series (Chamkarmon)<br>
          🛋️ <strong>Layout:</strong> 2-Bedroom (65 sqm)<br>
          💰 <strong>Target Asking Price:</strong> $99,000 USD<br>
          ⏰ <strong>Submitted:</strong> Just now<br><br>
          <div class="tg-blockquote">⚡ <strong>Response SLA:</strong> Reach out within 2 hours to confirm Strata hard title deed &amp; lock exclusive listing contract!</div>`,
        adminKeyboard: `
          <div class="tg-row">
            <button class="tg-btn" style="background:linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.25)); font-weight:700;" onclick="simToast('Opening direct chat with Owner @Keo_Property', '💬')">💬 Message Owner Directly</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="simToast('Valuation meeting scheduled.', '📅')">📅 Schedule Valuation Call</button>
          </div>`
      },
      'D': {
        sub: 'Client types free-text question in chat instead of clicking buttons',
        pill: '💬 Unmatched Free-Text Fallback Handler · Zero Friction',
        cmd: 'Client types: "こんにちは、今週内覧できますか？"',
        clientBubble: `<strong>Property Hub Cambodiaへのお問い合わせありがとうございます</strong><br><br>
          ナレット様からのメッセージをプノンペン現地サポートおよび代表Nickに転送いたしました。<br><br>
          担当者より直接ご返信いたしますが、お急ぎの場合や個別相談をご希望の際は、以下のボタンよりNickへ直接メッセージをお送りいただくか、メニューをご利用ください：`,
        clientKeyboard: `
          <div class="tg-row">
            <button class="tg-btn" style="background:linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.25)); font-weight:700;" onclick="simToast('💬 Opening direct Telegram chat with Nick...', '💬')">💬 Nickへ直接相談 (Telegram)</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="loadDualScenario('A')">🏢 厳選物件一覧</button>
            <button class="tg-btn" onclick="switchSimCalc()">🧮 収支・ローン試算</button>
          </div>
          <div class="tg-row">
            <button class="tg-btn" onclick="simToast('Returning to Main Menu', '🔙')">🔙 メインメニュー</button>
          </div>`,
        adminSla: '💬 INCOMING DIRECT CLIENT MESSAGE',
        adminBubble: `💬 <strong>NEW INCOMING CLIENT MESSAGE!</strong><br><br>
          👤 <strong>Client:</strong> Narith (ナレット) (@Narith_KH)<br>
          🆔 <strong>User ID:</strong> <code>5712964982</code><br>
          🌐 <strong>Language:</strong> 🇯🇵 日本語 (Japanese)<br>
          💬 <strong>Message:</strong> <i>"こんにちは、今週内覧できますか？"</i><br><br>
          <div class="tg-blockquote">👉 <strong>One-Tap Quick Reply:</strong> Tap below to jump straight into conversation with Narith on Telegram:</div>`,
        adminKeyboard: `
          <div class="tg-row">
            <button class="tg-btn" style="background:linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.25)); font-weight:700;" onclick="simToast('Opening chat with Narith on Telegram...', '💬')">💬 Reply to Narith on Telegram</button>
          </div>`
      }
    };

    function loadDualScenario(key) {
      document.querySelectorAll('#btnScenA, #btnScenB, #btnScenC, #btnScenD').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById(`btnScen${key}`);
      if (activeBtn) activeBtn.classList.add('active');

      const data = dualScenarios[key];
      if (!data) return;

      document.getElementById('clientViewSub').innerText = data.sub;
      document.getElementById('clientFeaturePill').innerText = data.pill;
      document.getElementById('clientCmdBadge').innerText = data.cmd;
      document.getElementById('clientBubble').innerHTML = data.clientBubble;
      document.getElementById('clientKeyboard').innerHTML = data.clientKeyboard;

      document.getElementById('adminSlaPill').innerText = data.adminSla;
      document.getElementById('adminBubble').innerHTML = data.adminBubble;
      document.getElementById('adminKeyboard').innerHTML = data.adminKeyboard;

      simToast(`Loaded Scenario ${key}: ${data.sub}`, '⚡');
    }
"""

if "function loadDualScenario" not in html:
    html = html.replace("    function switchTab(tabId) {", js_dual + "\n    function switchTab(tabId) {", 1)
    print("Added loadDualScenario JavaScript engine")

# Trigger initial load of Scenario A on window load
init_call = """
    window.addEventListener('DOMContentLoaded', () => {
      loadDualScenario('A');
    });
"""
if "window.addEventListener('DOMContentLoaded'" not in html:
    html = html.replace("  </script>", init_call + "\n  </script>", 1)
    print("Added DOMContentLoaded initial loader")

with open('phc-tools/bot-system-cockpit.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Dual Viewport integration successfully saved to bot-system-cockpit.html.")
