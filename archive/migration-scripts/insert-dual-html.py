with open('phc-tools/bot-system-cockpit.html', 'r', encoding='utf-8') as f:
    text = f.read()

target = '<!-- TAB 1: INVESTOR SUITE -->'
if target in text and 'id="dualView"' not in text:
    parts = text.split(target)
    
    dual_section = """<!-- ============================================================== -->
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
  <!-- ============================================================== -->
  """
    text = parts[0] + dual_section + target + parts[1]
    with open('phc-tools/bot-system-cockpit.html', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Successfully inserted dualView HTML block!")
else:
    print("Already present or target not found")
