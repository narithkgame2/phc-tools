with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update JP Purchase Guide Steps
old_jp_guide = """        `<blockquote><b>【購入の4ステップ】</b>\\n` +
        `1️⃣ <b>物件選定・部屋止め手付金：</b> $1,000〜$2,000 USD\\n` +
        `▫️ ご希望のユニットを確保し、価格・条件をロックします。\\n\\n` +
        `2️⃣ <b>売買契約締結（SPA）＆ 頭金：</b> 10%〜20%\\n` +
        `▫️ 契約内容を確認・署名の上、頭金をお支払いいただきます。\\n\\n` +
        `3️⃣ <b>工事進捗または月額分割払い：</b>\\n` +
        `▫️ 竣工前物件は完成までの分割払い、完成済み物件は残金決済へ。\\n\\n` +
        `4️⃣ <b>残金決済・ハードタイトル登記＆引渡し：</b>\\n` +
        `▫️ 国土整備・建設省にてパスポート名義での本登記を行い、鍵をお引渡し。</blockquote>"""

new_jp_guide = """        `<blockquote><b>【購入の4ステップ】</b>\\n` +
        `1️⃣ <b>予約（Booking）：</b> $1,000〜$2,000 USD（手付金）\\n` +
        `2️⃣ <b>契約（Contract Signing）：</b> 10%〜20%（頭金）\\n` +
        `3️⃣ <b>分割払い（Installments）：</b> 工事進捗または月額分割\\n` +
        `4️⃣ <b>所有権移転（Ownership transfer）：</b> パスポート名義で本登記</blockquote>"""

if old_jp_guide in text:
    text = text.replace(old_jp_guide, new_jp_guide, 1)
    print("Replaced JP purchase guide steps")
else:
    print("Warning: old_jp_guide not found")

# 2. Update JP Comparison Matrix
old_jp_comp = """        `<blockquote>🏢 <b>1. タイムズスクエア8（Chamkarmon）</b>\\n` +
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

new_jp_comp = """        `<blockquote>🏢 <b>1. タイムズスクエア8（Chamkarmon）</b>\\n` +
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

if old_jp_comp in text:
    text = text.replace(old_jp_comp, new_jp_comp, 1)
    print("Replaced JP comparison matrix")
else:
    print("Warning: old_jp_comp not found")

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(text)

