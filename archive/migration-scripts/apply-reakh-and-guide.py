import re

with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update getPurchaseGuide function
purchase_guide_func = """function getPurchaseGuide(lang = 'EN') {
  const isJP = lang === 'JP';
  if (isJP) {
    return {
      text: 
        `📖 <b>プノンペン コンドミニアム購入手順・諸費用ガイド</b>\\n` +
        `カンボジア最大の不動産ポータル「Realestate.com.kh」公式ガイド\\n\\n` +
        `外国人個人名義でのコンドミニアム（分層所有権ハードタイトル）購入は、明快な4ステップで完了します：\\n\\n` +
        `<blockquote><b>【購入の4ステップ】</b>\\n` +
        `1️⃣ <b>物件選定・部屋止め手付金：</b> $1,000〜$2,000 USD\\n` +
        `▫️ ご希望のユニットを確保し、価格・条件をロックします。\\n\\n` +
        `2️⃣ <b>売買契約締結（SPA）＆ 頭金：</b> 10%〜20%\\n` +
        `▫️ 契約内容を確認・署名の上、頭金をお支払いいただきます。\\n\\n` +
        `3️⃣ <b>工事進捗または月額分割払い：</b>\\n` +
        `▫️ 竣工前物件は完成までの分割払い、完成済み物件は残金決済へ。\\n\\n` +
        `4️⃣ <b>残金決済・ハードタイトル登記＆引渡し：</b>\\n` +
        `▫️ 国土整備・建設省にてパスポート名義での本登記を行い、鍵をお引渡し。</blockquote>\\n\\n` +
        `<blockquote><b>【購入時の諸費用一覧（Associated Costs）】</b>\\n` +
        `▫️ <b>所有権移転税（印紙税）：</b> 4%（名義書換登記時に1回のみ）\\n` +
        `▫️ <b>登記行政諸手数料：</b> 約 $500〜$1,000 USD\\n` +
        `▫️ <b>管理準備金・修繕積立金：</b> 約 $10〜$20/㎡（引渡し時一括）\\n` +
        `▫️ <b>仲介手数料（買主側）：</b> <b>0円・完全無料</b>（売主/開発元負担）\\n` +
        `▫️ <b>キャピタルゲイン税：</b> 外国人個人名義は現在 <b>0%（非課税）</b></blockquote>\\n\\n` +
        `💡 <i>Realestate.com.khの専任チームが契約書の確認から現地登記までワンストップで伴走いたします。</i>`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '💬 Nickへ購入相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }],
          [
            { text: '🧮 利回り・ローン試算', callback_data: 'btn_calc_99000_TS8' },
            { text: '🏢 厳選物件一覧を見る', callback_data: 'btn_view_TS8' }
          ],
          [{ text: '🔙 メインメニュー', callback_data: 'menu_main' }]
        ]
      }
    };
  }

  // Default: EN
  return {
    text: 
      `📖 <b>PHNOM PENH CONDO PURCHASE GUIDE & CLOSING COSTS</b>\\n` +
      `Official Step-by-Step Purchasing Guide from Realestate.com.kh\\n\\n` +
      `Buying foreign freehold strata property in Cambodia is straightforward across 4 defined stages:\\n\\n` +
      `<blockquote><b>【4-STEP PURCHASE PROCESS】</b>\\n` +
      `1️⃣ <b>Unit Reservation & Deposit:</b> $1,000 – $2,000 USD\\n` +
      `▫️ Secures your selected unit and locks developer pricing.\\n\\n` +
      `2️⃣ <b>Sales & Purchase Agreement (SPA) & Down Payment:</b> 10% – 20%\\n` +
      `▫️ Official contract signed with developer or resale owner.\\n\\n` +
      `3️⃣ <b>Milestone Installments:</b>\\n` +
      `▫️ Monthly cash-flow installments during construction or balloon at handover.\\n\\n` +
      `4️⃣ <b>Cadastral Title Transfer & Handover:</b>\\n` +
      `▫️ Strata title issued under your personal passport and keys delivered.</blockquote>\\n\\n` +
      `<blockquote><b>【ASSOCIATED CLOSING COSTS】</b>\\n` +
      `▫️ <b>Property Transfer Tax (Stamp Duty):</b> 4% (paid once upon title transfer)\\n` +
      `▫️ <b>Cadastral Legal & Registration Fee:</b> ~$500 – $1,000 USD\\n` +
      `▫️ <b>Maintenance Sinking Fund:</b> ~$10 – $20/sqm (one-time upon handover)\\n` +
      `▫️ <b>Buyer Commission:</b> <b>$0 (Zero Fee)</b> — 100% developer/seller paid\\n` +
      `▫️ <b>Individual Capital Gains Tax:</b> <b>0%</b></blockquote>\\n\\n` +
      `💡 <i>Realestate.com.kh coordinates complete contract verification, escrow transfers, and Cadastral title registration.</i>`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '💬 Consult with Nick (Telegram)', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: '🧮 Payment Calculator', callback_data: 'btn_calc_99000_TS8' },
          { text: '🏢 Explore Properties', callback_data: 'btn_view_TS8' }
        ],
        [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
      ]
    }
  };
}
"""

if 'function getPurchaseGuide' not in text:
    text = text.replace('function getLegalGuideMenu(lang = \'EN\') {', purchase_guide_func + '\nfunction getLegalGuideMenu(lang = \'EN\') {', 1)
    print("Added getPurchaseGuide function")

# 2. Update getMainMenu to Realestate.com.kh and replace Legal Guide with Condo Purchase Guide
old_menu_jp = """function getMainMenu(lang = 'EN', senderName = 'Valued Client') {
  if (lang === 'JP') {
    return {
      text: `<b>プロパティ・ハブ・カンボジア</b>\\n` +
        `プノンペン不動産投資 · プライベートアドバイザリー\\n\\n` +
        `${senderName}様、ようこそ。\\n` +
        `外国人100%自己名義ハードタイトル対象、プノンペン都心の厳選優良コンドミニアムをご案内いたします。\\n\\n` +
        `▫️ <b>米ドル建て資産：</b> 通貨下落リスクのない強固なUSD経済圏\\n` +
        `▫️ <b>完全所有権：</b> 個人パスポート名義でのCadastral本登記\\n` +
        `▫️ <b>日系対応：</b> 代表Nickによる直接個別相談\\n\\n` +
        `メニューをお選びください：`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🏢 厳選物件一覧 (TS8他)', callback_data: 'btn_view_TS8' },
            { text: '🧮 利回り・ローン試算', callback_data: 'btn_calc_99000_TS8' }
          ],
          [
            { text: '📚 外国人所有権・税制ガイド', callback_data: 'btn_legal_guide' },
            { text: '⚖️ 3大物件 比較マトリクス', callback_data: 'btn_compare_TS8' }
          ],
          [
            { text: '💬 Nickへ個別相談', url: 'https://t.me/Nick_REAKH' },
            { text: '🌐 言語切替 (Language)', callback_data: 'btn_change_lang' }
          ]
        ]
      }
    };
  }

  // Default: EN
  return {
    text: `<b>PROPERTY HUB CAMBODIA</b>\\n` +
      `Private Client Real Estate Advisory · Phnom Penh\\n\\n` +
      `Welcome <b>${senderName}</b>.\\n` +
      `Access verified prime freehold inventory, cash-flow models, and 100% foreign strata title documentation:\\n\\n` +
      `▫️ <b>Curated High-Yield Resales:</b> Verified developer & owner units\\n` +
      `▫️ <b>100% Foreign Freehold:</b> Registered Strata Title under your passport\\n` +
      `▫️ <b>Direct Advisory:</b> Personal consultation with Nick (@Nick_REAKH)\\n\\n` +
      `Select an option below:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Explore Properties', callback_data: 'btn_view_TS8' },
          { text: '🧮 Payment Calculator', callback_data: 'btn_calc_99000_TS8' }
        ],
        [
          { text: '📚 Legal & Tax Guide', callback_data: 'btn_legal_guide' },
          { text: '⚖️ Compare 3 Units', callback_data: 'btn_compare_TS8' }
        ],
        [
          { text: '💬 Consult with Nick', url: 'https://t.me/Nick_REAKH' },
          { text: '🌐 Change Language', callback_data: 'btn_change_lang' }
        ]
      ]
    }
  };
}"""

new_menu_jp = """function getMainMenu(lang = 'EN', senderName = 'Valued Client') {
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
            { text: '💬 Nickへ直接相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }
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
          { text: '💬 Consult with Nick (Telegram)', url: 'https://t.me/Nick_REAKH' }
        ],
        [
          { text: '⚖️ Compare 3 Units', callback_data: 'btn_compare_TS8' },
          { text: '🌐 Change Language', callback_data: 'btn_change_lang' }
        ]
      ]
    }
  };
}"""

if old_menu_jp in text:
    text = text.replace(old_menu_jp, new_menu_jp, 1)
    print("Updated getMainMenu to Realestate.com.kh with Condo Purchase Guide")
else:
    print("Warning: old_menu_jp not found")

# 3. Update callback handlers: route btn_purchase_guide and btn_legal_guide to getPurchaseGuide
old_legal_cb = """        else if (dataStr === 'btn_legal_guide' || dataStr === 'legal_back') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[chatId] || 'EN';
          const guide = getLegalGuideMenu(userLang);"""

new_legal_cb = """        else if (dataStr === 'btn_purchase_guide' || dataStr === 'btn_legal_guide' || dataStr === 'guide_back') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const guide = getPurchaseGuide(userLang);"""

if old_legal_cb in text:
    text = text.replace(old_legal_cb, new_legal_cb, 1)
    print("Updated callback handler for btn_purchase_guide")
else:
    print("Warning: old_legal_cb not found")

# 4. Update language gate and text branding
text = text.replace(
    '<b>PROPERTY HUB CAMBODIA</b>\\nプノンペン不動産投資 · プレミアム コンドミニアム仲介',
    '<b>Realestate.com.kh</b>\\nプノンペン不動産投資 · 公式プライベート窓口'
)

text = text.replace(
    '<b>Property Hub Cambodiaへのお問い合わせありがとうございます</b>',
    '<b>Realestate.com.khへのお問い合わせありがとうございます</b>'
)

text = text.replace(
    '<b>Thank You for Contacting Property Hub Cambodia</b>',
    '<b>Thank You for Contacting Realestate.com.kh</b>'
)

text = text.replace(
    '▫️ <b>Agency:</b> Property Hub Cambodia\\n',
    '▫️ <b>Platform:</b> Realestate.com.kh (Cambodia\'s #1 Real Estate Portal)\\n'
)

text = text.replace(
    'managed by Property Hub Cambodia.',
    'managed directly via Realestate.com.kh.'
)

# 5. Update commands registered in Telegram
old_cmds = """            commands: [
              { command: 'menu', description: 'Main Navigation Portal' },
              { command: 'calc', description: 'Payment & Yield Calculator' },
              { command: 'legal', description: 'Foreign Buyer Legal Guide' },
              { command: 'lang', description: 'Change Language (JP/EN/ZH/RU)' },
              { command: 'list', description: 'List Your Property with PHC' },
              { command: 'nick', description: 'Consult Directly with Nick' }
            ]"""

new_cmds = """            commands: [
              { command: 'menu', description: 'Main Navigation Portal' },
              { command: 'calc', description: 'Payment & Yield Calculator' },
              { command: 'guide', description: 'Condo Purchase Guide & Costs' },
              { command: 'lang', description: 'Change Language (JP/EN/ZH/RU)' },
              { command: 'list', description: 'List Property on Realestate.com.kh' },
              { command: 'nick', description: 'Consult with Nick (Realestate.com.kh)' }
            ]"""

if old_cmds in text:
    text = text.replace(old_cmds, new_cmds, 1)
    print("Updated native Telegram commands list")

# Handle /guide command
old_legal_cmd = """        if (text === '/legal') {
          const userLang = userLanguages[chatId] || 'EN';
          const guide = getLegalGuideMenu(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: guide.text, parse_mode: 'HTML', reply_markup: guide.reply_markup })
          });
          return;
        }"""

new_legal_cmd = """        if (text === '/guide' || text === '/purchaseguide' || text === '/steps') {
          const userLang = userLanguages[chatId] || 'EN';
          const guide = getPurchaseGuide(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: guide.text, parse_mode: 'HTML', reply_markup: guide.reply_markup })
          });
          return;
        }

        if (text === '/legal') {
          const userLang = userLanguages[chatId] || 'EN';
          const guide = getLegalGuideMenu(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: guide.text, parse_mode: 'HTML', reply_markup: guide.reply_markup })
          });
          return;
        }"""

if old_legal_cmd in text:
    text = text.replace(old_legal_cmd, new_legal_cmd, 1)
    print("Added /guide command handler")

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(text)

print("Saved staging-bot-poller.cjs updates.")
