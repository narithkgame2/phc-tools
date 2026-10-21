import re

# ── 1. UPDATE STAGING BOT POLLER ─────────────────────────────────────────────
with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    poller = f.read()

# Button replacements
poller = poller.replace("text: '💬 Nickへ直接相談 (Telegram)'", "text: '💬 直接相談'")
poller = poller.replace("text: '💬 Nickへ直接相談'", "text: '💬 直接相談'")
poller = poller.replace("text: '💬 Consult with Nick (Telegram)'", "text: '💬 Consult with us'")
poller = poller.replace("text: '💬 Consult with Nick'", "text: '💬 Consult with us'")
poller = poller.replace("text: '💬 Chat Directly with Nick'", "text: '💬 Consult with us'")
poller = poller.replace("text: '💬 Message Buyer Directly'", "text: '💬 Message Client'")
poller = poller.replace("text: 'Sell My Condo (Resale)'", "text: 'Sell My Condo'")
poller = poller.replace("text: 'Rent Out My Condo'", "text: 'Rent My Condo'")
poller = poller.replace("text: 'Buyer Tour Feedback'", "text: 'Feedback'")
poller = poller.replace("text: 'Partnership Terms with Nick'", "text: 'Partnership Terms'")

# Comparison Matrix EN refinement
old_comp_en = """      `<blockquote>🏢 <b>1. TIME SQUARE 8 (Chamkarmon)</b>\\n` +
      `▫️ <b>Price:</b> $99,000 USD (Urgent Resale)\\n` +
      `▫️ <b>Size:</b> 65.0 sqm Gross · 48 sqm Net ($1,523/sqm)\\n` +
      `▫️ <b>Layout:</b> 2 Beds · 1 Bath · City Views\\n` +
      `▫️ <b>Net Yield:</b> <b>8.5% Net</b> | Handover: Q4 2026\\n` +
      `▫️ <b>Best For:</b> High Yield + Expat Capital Appreciation</blockquote>\\n\\n` +
      `<blockquote>🏢 <b>2. RESIDENCE L (Toul Tompoung)</b>\\n` +
      `▫️ <b>Price:</b> $45,000 USD (Low Entry Barrier)\\n` +
      `▫️ <b>Size:</b> 47.0 sqm Gross ($957/sqm)\\n` +
      `▫️ <b>Layout:</b> 1 Bed · 1 Bath\\n` +
      `▫️ <b>Net Yield:</b> <b>9.2% Net</b> | Ready to Move & Lease\\n` +
      `▫️ <b>Best For:</b> Maximum Immediate Cash Flow Under $50k</blockquote>\\n\\n` +
      `<blockquote>🏢 <b>3. ODOM LIVING (Norodom Blvd / Tonle Bassac)</b>\\n` +
      `▫️ <b>Price:</b> $240,000 USD (Ultra-Luxury Flagship)\\n` +
      `▫️ <b>Size:</b> 78.0 sqm Gross ($3,076/sqm)\\n` +
      `▫️ <b>Layout:</b> 2 Beds · 2 Baths\\n` +
      `▫️ <b>Net Yield:</b> <b>6.8% Net</b> | Handover: Q1 2027\\n` +
      `▫️ <b>Best For:</b> High-Net-Worth Trophy Asset & Diplomatic Rental</blockquote>"""

new_comp_en = """      `<blockquote>🏢 <b>1. TIME SQUARE 8 (Chamkarmon)</b>\\n` +
      `▫️ <b>Price:</b> $99,000 USD (Urgent Resale)\\n` +
      `▫️ <b>Size:</b> 65.0 sqm (Gross)\\n` +
      `▫️ <b>Net Yield:</b> <b>8.5% Net</b></blockquote>\\n\\n` +
      `<blockquote>🏢 <b>2. RESIDENCE L (Toul Tompoung)</b>\\n` +
      `▫️ <b>Price:</b> $45,000 USD (Low Entry Barrier)\\n` +
      `▫️ <b>Size:</b> 47.0 sqm (Gross)\\n` +
      `▫️ <b>Net Yield:</b> <b>9.2% Net</b></blockquote>\\n\\n` +
      `<blockquote>🏢 <b>3. ODOM LIVING (Tonle Bassac)</b>\\n` +
      `▫️ <b>Price:</b> $240,000 USD (Ultra-Luxury Flagship)\\n` +
      `▫️ <b>Size:</b> 78.0 sqm (Gross)\\n` +
      `▫️ <b>Net Yield:</b> <b>6.8% Net</b></blockquote>"""

if old_comp_en in poller:
    poller = poller.replace(old_comp_en, new_comp_en, 1)
    print("Refined Comparison Matrix EN in poller")
else:
    print("Warning: old_comp_en not found in poller")

# Comparison Matrix JP refinement
old_comp_jp = """      `<blockquote>🏢 <b>1. タイムズスクエア8（Chamkarmon）</b>\\n` +
      `▫️ <b>価格：</b> $99,000 USD（約1,504万円・割安緊急転売枠）\\n` +
      `▫️ <b>面積：</b> 壁芯 65.0㎡ / 約19.66坪（$1,523/㎡）\\n` +
      `▫️ <b>間取り：</b> 2LDK（2寝室・1浴室・市街地ビュー）\\n` +
      `▫️ <b>純利回り：</b> <b>8.5% Net</b> | 竣工予定：2026年第4四半期\\n` +
      `▫️ <b>おすすめ：</b> 高利回りインカムゲイン ＋ 日系・欧米駐在員賃貸需要</blockquote>\\n\\n` +
      `<blockquote>🏢 <b>2. レジデンス L（Toul Tompoung / ロシアンマーケット近接）</b>\\n` +
      `▫️ <b>価格：</b> $45,000 USD（約684万円・小口エントリー）\\n` +
      `▫️ <b>面積：</b> 47.0㎡ / 約14.21坪（$957/㎡）\\n` +
      `▫️ <b>間取り：</b> 1LDK（即入居・賃貸運用可能）\\n` +
      `▫️ <b>純利回り：</b> <b>9.2% Net</b>（月額 $350 USDで稼働中）\\n` +
      `▫️ <b>おすすめ：</b> 5万ドル以下で即キャッシュフローを得たい投資家向け</blockquote>\\n\\n` +
      `<blockquote>🏢 <b>3. オドム・リビング（Norodom Blvd / Tonle Bassac）</b>\\n` +
      `▫️ <b>価格：</b> $240,000 USD（約3,648万円・最高峰フラッグシップ）\\n` +
      `▫️ <b>面積：</b> 78.0㎡ / 約23.59坪（$3,076/㎡）\\n` +
      `▫️ <b>間取り：</b> 2LDK・2浴室・LEEDゴールド認証\\n` +
      `▫️ <b>純利回り：</b> <b>6.8% Net</b> | 竣工：2027年第1四半期\\n` +
      `▫️ <b>おすすめ：</b> 外交官・多国籍企業エグゼクティブ向けプレステージ資産</blockquote>"""

new_comp_jp = """      `<blockquote>🏢 <b>1. タイムズスクエア8（Chamkarmon）</b>\\n` +
      `▫️ <b>価格：</b> $99,000 USD（約1,504万円 / 割安緊急転売枠）\\n` +
      `▫️ <b>面積：</b> 65.0㎡（壁芯） / 約19.6坪\\n` +
      `▫️ <b>純利回り：</b> <b>8.5% Net</b></blockquote>\\n\\n` +
      `<blockquote>🏢 <b>2. レジデンス L（Toul Tompoung）</b>\\n` +
      `▫️ <b>価格：</b> $45,000 USD（約684万円 / 小口エントリー）\\n` +
      `▫️ <b>面積：</b> 47.0㎡（壁芯） / 約14.2坪\\n` +
      `▫️ <b>純利回り：</b> <b>9.2% Net</b></blockquote>\\n\\n` +
      `<blockquote>🏢 <b>3. オドム・リビング（Tonle Bassac）</b>\\n` +
      `▫️ <b>価格：</b> $240,000 USD（約3,648万円 / LEEDゴールド認証）\\n` +
      `▫️ <b>面積：</b> 78.0㎡（壁芯） / 約23.6坪\\n` +
      `▫️ <b>純利回り：</b> <b>6.8% Net</b></blockquote>"""

if old_comp_jp in poller:
    poller = poller.replace(old_comp_jp, new_comp_jp, 1)
    print("Refined Comparison Matrix JP in poller")
else:
    print("Warning: old_comp_jp not found in poller")

# Purchase Guide 4-Step Steps EN refinement
old_guide_steps_en = """      `<blockquote><b>【4-STEP PURCHASE PROCESS】</b>\\n` +
      `1️⃣ <b>Unit Reservation & Deposit:</b> $1,000 – $2,000 USD\\n` +
      `▫️ Secures your selected unit and locks developer pricing.\\n\\n` +
      `2️⃣ <b>Sales & Purchase Agreement (SPA) & Down Payment:</b> 10% – 20%\\n` +
      `▫️ Official contract signed with developer or resale owner.\\n\\n` +
      `3️⃣ <b>Milestone Installments:</b>\\n` +
      `▫️ Monthly cash-flow installments during construction or balloon at handover.\\n\\n` +
      `4️⃣ <b>Cadastral Title Transfer & Handover:</b>\\n` +
      `▫️ Strata title issued under your personal passport and keys delivered.</blockquote>"""

new_guide_steps_en = """      `<blockquote><b>【4-STEP PURCHASE PROCESS】</b>\\n` +
      `1️⃣ <b>Booking:</b> $1,000 – $2,000 USD deposit\\n` +
      `2️⃣ <b>Contract Signing:</b> 10% – 20% down payment\\n` +
      `3️⃣ <b>Installments:</b> Construction stage or cash flow\\n` +
      `4️⃣ <b>Ownership transfer:</b> Issued under your personal passport</blockquote>"""

if old_guide_steps_en in poller:
    poller = poller.replace(old_guide_steps_en, new_guide_steps_en, 1)
    print("Refined Purchase Guide EN steps in poller")
else:
    print("Warning: old_guide_steps_en not found in poller")

# Purchase Guide 4-Step Steps JP refinement
old_guide_steps_jp = """      `<blockquote><b>【購入の4ステップ】</b>\\n` +
      `1️⃣ <b>物件選定・部屋止め手付金：</b> $1,000〜$2,000 USD\\n` +
      `▫️ ご希望のユニットを確保し、価格・条件をロックします。\\n\\n` +
      `2️⃣ <b>売買契約締結（SPA）＆ 頭金：</b> 10%〜20%\\n` +
      `▫️ 契約内容を確認・署名の上、頭金をお支払いいただきます。\\n\\n` +
      `3️⃣ <b>工事進捗または月額分割払い：</b>\\n` +
      `▫️ 竣工前物件は完成までの分割払い、完成済み物件は残金決済へ。\\n\\n` +
      `4️⃣ <b>残金決済・ハードタイトル登記＆引渡し：</b>\\n` +
      `▫️ 国土整備・建設省にてパスポート名義での本登記を行い、鍵をお引渡し。</blockquote>"""

new_guide_steps_jp = """      `<blockquote><b>【購入の4ステップ】</b>\\n` +
      `1️⃣ <b>予約（Booking）：</b> $1,000〜$2,000 USD（手付金）\\n` +
      `2️⃣ <b>契約（Contract Signing）：</b> 10%〜20%（頭金）\\n` +
      `3️⃣ <b>分割払い（Installments）：</b> 工事進捗または月額分割\\n` +
      `4️⃣ <b>所有権移転（Ownership transfer）：</b> パスポート名義で本登記</blockquote>"""

if old_guide_steps_jp in poller:
    poller = poller.replace(old_guide_steps_jp, new_guide_steps_jp, 1)
    print("Refined Purchase Guide JP steps in poller")
else:
    print("Warning: old_guide_steps_jp not found in poller")

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(poller)
print("Updated staging-bot-poller.cjs successfully.")

# ── 2. UPDATE COCKPIT HTML ───────────────────────────────────────────────────
with open('phc-tools/bot-system-cockpit.html', 'r', encoding='utf-8') as f:
    cockpit = f.read()

# Button replacements in Cockpit
cockpit = cockpit.replace("💬 Nickへ直接相談 (Telegram)", "💬 直接相談")
cockpit = cockpit.replace("💬 Nickへ直接相談", "💬 直接相談")
cockpit = cockpit.replace("💬 Consult with Nick (Telegram)", "💬 Consult with us")
cockpit = cockpit.replace("💬 Consult with Nick", "💬 Consult with us")
cockpit = cockpit.replace("💬 Message Client Directly (@Takahashi_Tokyo)", "💬 Message Client")
cockpit = cockpit.replace("Direct Message (@Takahashi_Tokyo)", "💬 Message Client")
cockpit = cockpit.replace("Sell My Condo (Resale)", "Sell My Condo")
cockpit = cockpit.replace("Rent Out My Condo", "Rent My Condo")
cockpit = cockpit.replace("Buyer Tour Feedback", "Feedback")
cockpit = cockpit.replace("Partnership Terms with Nick", "Partnership Terms")

# Card 2 Comparison Matrix in Cockpit
old_cockpit_card2_text = """            <div class="tg-blockquote">
              🏢 <strong>1. TIME SQUARE 8 (Chamkarmon)</strong><br>
              ▫️ Price: $99,000 USD (Urgent Resale)<br>
              ▫️ Size: 65.0 sqm Gross · Net Yield: <strong>8.5% Net</strong>
            </div>
            <div class="tg-blockquote">
              🏢 <strong>2. RESIDENCE L (Toul Tompoung)</strong><br>
              ▫️ Price: $45,000 USD (Low Entry Barrier)<br>
              ▫️ Size: 47.0 sqm Gross · Net Yield: <strong>9.2% Net</strong>
            </div>
            <div class="tg-blockquote">
              🏢 <strong>3. ODOM LIVING (Tonle Bassac)</strong><br>
              ▫️ Price: $240,000 USD (LEED-Gold Flagship)<br>
              ▫️ Size: 78.0 sqm Gross · Net Yield: <strong>6.8% Net</strong>
            </div>"""

new_cockpit_card2_text = """            <div class="tg-blockquote">
              🏢 <strong>1. TIME SQUARE 8 (Chamkarmon)</strong><br>
              ▫️ Price: $99,000 USD (Urgent Resale)<br>
              ▫️ Size: 65.0 sqm (Gross)<br>
              ▫️ Net Yield: <strong>8.5% Net</strong>
            </div>
            <div class="tg-blockquote">
              🏢 <strong>2. RESIDENCE L (Toul Tompoung)</strong><br>
              ▫️ Price: $45,000 USD (Low Entry Barrier)<br>
              ▫️ Size: 47.0 sqm (Gross)<br>
              ▫️ Net Yield: <strong>9.2% Net</strong>
            </div>
            <div class="tg-blockquote">
              🏢 <strong>3. ODOM LIVING (Tonle Bassac)</strong><br>
              ▫️ Price: $240,000 USD (LEED-Gold Flagship)<br>
              ▫️ Size: 78.0 sqm (Gross)<br>
              ▫️ Net Yield: <strong>6.8% Net</strong>
            </div>"""

if old_cockpit_card2_text in cockpit:
    cockpit = cockpit.replace(old_cockpit_card2_text, new_cockpit_card2_text, 1)
    print("Refined Card 2 Comparison Matrix in cockpit")
else:
    print("Warning: old_cockpit_card2_text not found in cockpit")

# Card 4 Purchase Guide in Cockpit
old_cockpit_card4_steps = """            <div class="tg-blockquote">
              <strong>1️⃣ Unit Reservation:</strong> $1,000 – $2,000 USD deposit<br>
              <strong>2️⃣ SPA Contract Signing:</strong> 10% – 20% down payment<br>
              <strong>3️⃣ Milestone Installments:</strong> Construction stage or cash flow<br>
              <strong>4️⃣ Strata Hard Title:</strong> Issued under your personal passport
            </div>"""

new_cockpit_card4_steps = """            <div class="tg-blockquote">
              <strong>1️⃣ Booking:</strong> $1,000 – $2,000 USD deposit<br>
              <strong>2️⃣ Contract Signing:</strong> 10% – 20% down payment<br>
              <strong>3️⃣ Installments:</strong> Construction stage or cash flow<br>
              <strong>4️⃣ Ownership transfer:</strong> Issued under your personal passport
            </div>"""

if old_cockpit_card4_steps in cockpit:
    cockpit = cockpit.replace(old_cockpit_card4_steps, new_cockpit_card4_steps, 1)
    print("Refined Card 4 Purchase Guide in cockpit")
else:
    print("Warning: old_cockpit_card4_steps not found in cockpit")

with open('phc-tools/bot-system-cockpit.html', 'w', encoding='utf-8') as f:
    f.write(cockpit)
print("Updated bot-system-cockpit.html successfully.")
