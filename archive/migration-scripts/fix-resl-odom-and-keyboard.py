with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Streamline getResLCard buttons
old_resl = """function getResLCard(lang = 'EN') {
  return {
    photo: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    caption: 
      `<b>RESIDENCE L · 1-BEDROOM HIGH CASH FLOW</b>\\n` +
      `<b>$45,000 USD</b> (Immediate Handover · Low Entry Barrier)\\n\\n` +
      `📍 Toul Tompoung (Near Russian Market), Chamkarmon\\n` +
      `▫️ <b>Dimensions:</b> 47.0 sqm Gross ($957/sqm)\\n` +
      `▫️ <b>Layout:</b> 1 Bedroom · 1 Bathroom · Fully Furnished\\n` +
      `▫️ <b>Net Yield:</b> <b>9.2% Net</b> ($350/mo active rental tenancy)\\n` +
      `▫️ <b>Title:</b> 100% Foreign Freehold Strata Hard Title\\n\\n` +
      `<blockquote>Highest rental yield per dollar in Phnom Penh. Ideal for investors seeking immediate monthly cash flow under $50,000 USD.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Book Tour', callback_data: 'btn_book_ResL' },
          { text: 'Payment Calculator', callback_data: 'btn_calc_45000_ResL' }
        ],
        [
          { text: 'Compare 3 Units', callback_data: 'btn_compare_TS8' },
          { text: 'Legal Guide', callback_data: 'btn_legal_guide' }
        ],
        [
          { text: 'Main Menu', callback_data: 'menu_main' },
          { text: 'Consult with Nick', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}"""

new_resl = """function getResLCard(lang = 'EN') {
  const isJP = lang === 'JP';
  return {
    photo: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    caption: isJP ?
      `<b>レジデンス L · 1LDK 高利回りキャッシュフロー物件</b>\\n` +
      `<b>$45,000 USD</b>（約684万円 · 即入居・賃貸稼働中）\\n\\n` +
      `📍 プノンペン · ロシアンマーケット近接（Toul Tompoung）\\n` +
      `▫️ <b>専有面積：</b> 47.0㎡（約14.2坪） / 家具家電フル完備\\n` +
      `▫️ <b>間取り：</b> 1LDK（1寝室 · 1浴室）\\n` +
      `▫️ <b>実質利回り：</b> <b>9.2% Net</b>（月額 $350 USDで賃貸稼働中）\\n` +
      `▫️ <b>権利形態：</b> 外国人100%自己名義ハードタイトル\\n\\n` +
      `<blockquote>5万ドル未満で即座に米ドルインカムゲインを得られる小口優良物件です。</blockquote>` :
      `<b>RESIDENCE L · 1-BEDROOM HIGH CASH FLOW</b>\\n` +
      `<b>$45,000 USD</b> (Immediate Handover · Low Entry Barrier)\\n\\n` +
      `📍 Toul Tompoung (Near Russian Market), Chamkarmon\\n` +
      `▫️ <b>Dimensions:</b> 47.0 sqm Gross ($957/sqm)\\n` +
      `▫️ <b>Layout:</b> 1 Bedroom · 1 Bathroom · Fully Furnished\\n` +
      `▫️ <b>Net Yield:</b> <b>9.2% Net</b> ($350/mo active rental tenancy)\\n` +
      `▫️ <b>Title:</b> 100% Foreign Freehold Strata Hard Title\\n\\n` +
      `<blockquote>Highest rental yield per dollar in Phnom Penh. Ideal for investors seeking immediate monthly cash flow under $50,000 USD.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [{ text: isJP ? '💬 Nickへ直接相談 (Telegram)' : '💬 Consult with Nick', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: isJP ? '📅 内覧予約 / ビデオ案内' : '📅 Book Tour / Video', callback_data: 'btn_book_ResL' },
          { text: isJP ? '🧮 収支試算' : '🧮 Payment Calculator', callback_data: 'btn_calc_45000_ResL' }
        ],
        [{ text: isJP ? '🔙 メインメニュー' : '🔙 Main Menu', callback_data: 'menu_main' }]
      ]
    }
  };
}"""

if old_resl in text:
    text = text.replace(old_resl, new_resl)
    print("Streamlined getResLCard to 3 rows of clean buttons")

# 2. Streamline getOdomCard buttons
old_odom = """function getOdomCard(lang = 'EN') {
  return {
    photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    caption: 
      `<b>ODOM LIVING · FLAGSHIP RESIDENTIAL TOWER</b>\\n` +
      `<b>$240,000 USD</b> (Pre-Handover Q1 2027 · LEED-Gold Certified)\\n\\n` +
      `📍 Norodom Boulevard, Tonle Bassac\\n` +
      `▫️ <b>Dimensions:</b> 78.0 sqm Gross ($3,076/sqm)\\n` +
      `▫️ <b>Layout:</b> 2 Bedrooms · 2 Bathrooms · Sky Balcony\\n` +
      `▫️ <b>Net Yield:</b> <b>6.8% Net</b> ($1,400/mo projected diplomatic rent)\\n` +
      `▫️ <b>Title:</b> 100% Foreign Freehold Strata Hard Title\\n\\n` +
      `<blockquote>Phnom Penh's premier architectural landmark. Tailored for multinational corporate executives, embassies, and generational private wealth.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Book Tour', callback_data: 'btn_book_Odom' },
          { text: 'Payment Calculator', callback_data: 'btn_calc_240000_Odom' }
        ],
        [
          { text: 'Compare 3 Units', callback_data: 'btn_compare_TS8' },
          { text: 'Legal Guide', callback_data: 'btn_legal_guide' }
        ],
        [
          { text: 'Main Menu', callback_data: 'menu_main' },
          { text: 'Consult with Nick', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}"""

new_odom = """function getOdomCard(lang = 'EN') {
  const isJP = lang === 'JP';
  return {
    photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    caption: isJP ?
      `<b>オドム・リビング · 最高峰フラッグシップ邸宅</b>\\n` +
      `<b>$240,000 USD</b>（約3,648万円 · LEEDゴールド認証）\\n\\n` +
      `📍 プノンペン中心部 · ノロドム通り（Tonle Bassac）\\n` +
      `▫️ <b>専有面積：</b> 78.0㎡（約23.6坪）\\n` +
      `▫️ <b>間取り：</b> 2LDK（2寝室 · 2浴室 · スカイバルコニー）\\n` +
      `▫️ <b>実質利回り：</b> <b>6.8% Net</b>（想定月額家賃 $1,400 USD）\\n` +
      `▫️ <b>権利形態：</b> 外国人100%自己名義ハードタイトル\\n\\n` +
      `<blockquote>外交官・多国籍企業エグゼクティブ向けプレステージ資産。信託・永代承継に最適。</blockquote>` :
      `<b>ODOM LIVING · FLAGSHIP RESIDENTIAL TOWER</b>\\n` +
      `<b>$240,000 USD</b> (Pre-Handover Q1 2027 · LEED-Gold Certified)\\n\\n` +
      `📍 Norodom Boulevard, Tonle Bassac\\n` +
      `▫️ <b>Dimensions:</b> 78.0 sqm Gross ($3,076/sqm)\\n` +
      `▫️ <b>Layout:</b> 2 Bedrooms · 2 Bathrooms · Sky Balcony\\n` +
      `▫️ <b>Net Yield:</b> <b>6.8% Net</b> ($1,400/mo projected diplomatic rent)\\n` +
      `▫️ <b>Title:</b> 100% Foreign Freehold Strata Hard Title\\n\\n` +
      `<blockquote>Phnom Penh's premier architectural landmark. Tailored for multinational corporate executives, embassies, and generational private wealth.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [{ text: isJP ? '💬 Nickへ直接相談 (Telegram)' : '💬 Consult with Nick', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: isJP ? '📅 内覧予約 / ビデオ案内' : '📅 Book Tour / Video', callback_data: 'btn_book_Odom' },
          { text: isJP ? '🧮 収支試算' : '🧮 Payment Calculator', callback_data: 'btn_calc_240000_Odom' }
        ],
        [{ text: isJP ? '🔙 メインメニュー' : '🔙 Main Menu', callback_data: 'menu_main' }]
      ]
    }
  };
}"""

if old_odom in text:
    text = text.replace(old_odom, new_odom)
    print("Streamlined getOdomCard to 3 rows of clean buttons")

# 3. Remove persistentKeyboard definition and any remaining sends of it
old_kb_def = """const persistentKeyboard = {
  keyboard: [
    [{ text: '🏢 Featured Properties' }, { text: '🧮 Payment Calculator' }],
    [{ text: '⚖️ Compare Top Units' }, { text: '📚 Legal & Tax Guide' }],
    [{ text: '💼 List My Property' }, { text: '💬 Consult with Nick' }]
  ],
  resize_keyboard: true,
  is_persistent: true
};"""

if old_kb_def in text:
    text = text.replace(old_kb_def, "// Persistent keyboard removed in favor of native Telegram Menu Button")
    print("Removed persistentKeyboard definition")

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: ResL & Odom updated, persistent keyboard removed.")
