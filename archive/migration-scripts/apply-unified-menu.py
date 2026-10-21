with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update getMainMenu in staging-bot-poller.cjs
old_menu_block = """function getMainMenu(lang = 'EN', senderName = 'Valued Client') {
  if (lang === 'JP') {
    return {
      text: `<b>Realestate.com.kh</b>\\n` +
        `プノンペン不動産投資 · 公式プライベート窓口\\n\\n` +
        `${senderName}様、ようこそ。\\n` +
        `カンボジア最大の不動産プラットフォーム「Realestate.com.kh」公式窓口です。\\n` +
        `外国人100%自己名義ハードタイトル対象、プノンペン都心の厳選優良コンドミニアムをご案内いたします。\\n\\n` +
        `▫️ <b>米ドル建て資産：</b> 通貨下落リスクのない強固なUSD経済圏\\n` +
        `▫️ <b>完全所有権：</b> 個人パスポート名義でのCadastral本登記\\n` +
        `▫️ <b>公式窓口：</b> 代表Nickによる直接個別相談\\n\\n` +
        `ご希望のメニューをお選びください：`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🏢 厳選注目物件一覧 (TS8他)', callback_data: 'btn_view_TS8' }
          ],
          [
            { text: '🧮 利回り・ローン試算', callback_data: 'btn_calc_99000_TS8' },
            { text: '📖 購入手順・諸費用ガイド', callback_data: 'btn_purchase_guide' }
          ],
          [
            { text: '💬 直接相談', url: 'https://t.me/Nick_REAKH' }
          ],
          [
            { text: '⚖️ 3大物件 比較', callback_data: 'btn_compare_TS8' },
            { text: '🌐 言語切替 (Language)', callback_data: 'btn_change_lang' }
          ]
        ]
      }
    };
  }

  // Default: EN
  return {
    text: `<b>REALESTATE.COM.KH</b>\\n` +
      `Private Client Real Estate Advisory · Phnom Penh\\n\\n` +
      `Welcome <b>${senderName}</b>.\\n` +
      `Welcome to Realestate.com.kh — Cambodia's #1 Real Estate Platform.\\n` +
      `Access verified prime freehold inventory, installment cash-flow models, purchase step-by-step guides, and direct advisory:\\n\\n` +
      `▫️ <b>Curated High-Yield Resales:</b> Verified developer & owner units\\n` +
      `▫️ <b>100% Foreign Freehold:</b> Registered Strata Hard Title under your passport\\n` +
      `▫️ <b>Official Desk:</b> Direct consultation with Nick (@Nick_REAKH)\\n\\n` +
      `Select an option below:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Explore Properties', callback_data: 'btn_view_TS8' }
        ],
        [
          { text: '🧮 Payment Calculator', callback_data: 'btn_calc_99000_TS8' },
          { text: '📖 Condo Purchase Guide', callback_data: 'btn_purchase_guide' }
        ],
        [
          { text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }
        ],
        [
          { text: '⚖️ Compare 3 Units', callback_data: 'btn_compare_TS8' },
          { text: '🌐 Change Language', callback_data: 'btn_change_lang' }
        ]
      ]
    }
  };
}"""

new_menu_block = """function getMainMenu(lang = 'EN', senderName = 'Valued Client') {
  if (lang === 'JP') {
    return {
      text: `<b>Realestate.com.kh</b>\\n` +
        `プノンペン不動産投資 · 公式プライベート窓口\\n\\n` +
        `${senderName}様、ようこそ。\\n` +
        `カンボジア最大の不動産プラットフォーム「Realestate.com.kh」公式窓口です。\\n` +
        `外国人100%自己名義ハードタイトル対象、プノンペンの優良コンドミニアムをご案内いたします。\\n\\n` +
        `• <b>米ドル建て資産：</b> 通貨下落リスクのない強固なUSD経済圏\\n` +
        `• <b>完全所有権：</b> 個人パスポート名義でのCadastral本登記\\n` +
        `• <b>公式窓口：</b> 代表Nickによる直接個別相談\\n\\n` +
        `ご希望のメニューをお選びください：`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏢 注目物件一覧', callback_data: 'btn_view_TS8' }],
          [{ text: '📖 購入手順・諸費用ガイド', callback_data: 'btn_purchase_guide' }],
          [{ text: '🌐 言語設定 (Language)', callback_data: 'btn_change_lang' }],
          [{ text: '💬 直接相談', url: 'https://t.me/Nick_REAKH' }]
        ]
      }
    };
  }

  // Default: EN
  return {
    text: `<b>REALESTATE.COM.KH</b>\\n` +
      `Private Client Real Estate Advisory · Phnom Penh\\n\\n` +
      `Welcome <b>${senderName}</b>.\\n` +
      `Welcome to Realestate.com.kh — Cambodia's #1 Real Estate Platform.\\n` +
      `Access verified prime freehold inventory, installment cash-flow models, purchase step-by-step guides, and direct advisory:\\n\\n` +
      `• <b>Curated High-Yield Resales:</b> Verified developer & owner units\\n` +
      `• <b>100% Foreign Freehold:</b> Registered Strata Hard Title under your passport\\n` +
      `• <b>Official Desk:</b> Direct consultation with Nick (@Nick_REAKH)\\n\\n` +
      `Select an option below:`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏢 Explore Property', callback_data: 'btn_view_TS8' }],
        [{ text: '📖 Condo Purchase Guide', callback_data: 'btn_purchase_guide' }],
        [{ text: '🌐 Prefer Language', callback_data: 'btn_change_lang' }],
        [{ text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }]
      ]
    }
  };
}"""

if old_menu_block in text:
    text = text.replace(old_menu_block, new_menu_block, 1)
    print("Replaced getMainMenu with clean 4-button unified layout!")
else:
    print("Warning: old_menu_block not found in staging-bot-poller.cjs")

# 2. Also clean the Language Menu bullets
old_lang_text = """    text: `<b>SELECT LANGUAGE / 言語をお選びください</b>\\n\\n` +
      `▫️ 🇯🇵 <b>日本語:</b> USD＋日本円換算（万円）・坪換算・日系窓口直通\\n` +
      `▫️ 🇬🇧 <b>English:</b> Global USD pricing, strata title framework\\n` +
      `▫️ 🇨🇳 <b>简体中文:</b> 美元避险资产・硬卡永久产权・中文顾问\\n` +
      `▫️ 🇷🇺 <b>Русский:</b> Расчет доходности в USD, фрихолд\\n\\n` +
      `言語を選択してください / Select preferred language:`,"""

new_lang_text = """    text: `<b>SELECT LANGUAGE / 言語をお選びください</b>\\n\\n` +
      `• 🇯🇵 <b>日本語:</b> USD＋日本円換算（万円）・坪換算・日系窓口直通\\n` +
      `• 🇬🇧 <b>English:</b> Global USD pricing, strata title framework\\n` +
      `• 🇨🇳 <b>简体中文:</b> 美元避险资产・硬卡永久产权・中文顾问\\n` +
      `• 🇷🇺 <b>Русский:</b> Расчет доходности в USD, фрихолд\\n\\n` +
      `言語を選択してください / Select preferred language:`,"""

if old_lang_text in text:
    text = text.replace(old_lang_text, new_lang_text, 1)
    print("Cleaned language menu bullets")

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(text)

# 3. Update bot-system-cockpit.html
with open('phc-tools/bot-system-cockpit.html', 'r', encoding='utf-8') as f:
    cockpit = f.read()

cockpit = cockpit.replace(
    'Explore Properties',
    'Explore Property'
)

with open('phc-tools/bot-system-cockpit.html', 'w', encoding='utf-8') as f:
    f.write(cockpit)

print("Updated bot-system-cockpit.html")
