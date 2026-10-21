with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Replace the entire getTS8Card function with clean HTML and 4 streamlined buttons
old_ts8_func = text[text.find("function getTS8Card("):text.find("function getCalculatorMenu(")]

new_ts8_func = """function getTS8Card(lang = 'EN') {
  if (lang === 'JP') {
    return {
      photo: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      caption: 
        `<b>タイムズスクエア8 · 2LDK 緊急転売枠</b>\\n` +
        `<b>$99,000 USD</b>（約1,504万円 · 開発元価格より$15,000割安）\\n\\n` +
        `📍 プノンペン · 桑園（Chamkarmon / Boeng Trabek）\\n` +
        `▫️ <b>階数：</b> 22階（市内パノラマビュー）\\n` +
        `▫️ <b>専有面積：</b> 壁芯 65.0㎡（約19.6坪） / 内法 48.0㎡\\n` +
        `▫️ <b>間取り：</b> 2LDK（2寝室 · 1浴室 · 専用バルコニー）\\n` +
        `▫️ <b>実質利回り：</b> <b>8.5% Net</b>（想定家賃 $750 USD/月）\\n` +
        `▫️ <b>竣工予定：</b> 2026年Q4\\n` +
        `▫️ <b>権利形態：</b> 外国人100%自己名義ハードタイトル（分層所有権）\\n\\n` +
        `<blockquote>直接の現地・オンライン案内や優先割当枠の相談は代表Nickが承ります。</blockquote>`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💬 Nickへ直接相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }
          ],
          [
            { text: '📅 内覧予約 / ビデオ案内', callback_data: 'btn_book_TS8' },
            { text: '🧮 収支・ローン試算', callback_data: 'btn_calc_99000_TS8' }
          ],
          [
            { text: '🔙 メインメニュー', callback_data: 'menu_main' }
          ]
        ]
      }
    };
  }

  // Default: EN
  return {
    photo: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    caption: 
      `<b>TIME SQUARE 8 · 2-BEDROOM RESALE</b>\\n` +
      `<b>$99,000 USD</b> (Urgent Resale — $15,000 Below Developer List)\\n\\n` +
      `📍 Boeng Trabek / Chamkarmon, Phnom Penh\\n` +
      `▫️ <b>Elevation:</b> 22nd Floor · City Skyline Views\\n` +
      `▫️ <b>Dimensions:</b> 65.0 sqm Gross · 48.0 sqm Net\\n` +
      `▫️ <b>Layout:</b> 2 Bedrooms · 1 Bathroom · Private Balcony\\n` +
      `▫️ <b>Net Yield:</b> <b>8.5% – 9.1% Net</b> ($750/mo rent)\\n` +
      `▫️ <b>Status:</b> Under Construction (Handover Q4 2026)\\n` +
      `▫️ <b>Ownership:</b> 100% Foreign Freehold Strata Hard Title\\n\\n` +
      `<blockquote>Direct private advisory and off-market developer allocations managed by Property Hub Cambodia.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💬 Consult with Nick', url: 'https://t.me/Nick_REAKH' }
        ],
        [
          { text: '📅 Book Tour / Video', callback_data: 'btn_book_TS8' },
          { text: '🧮 Payment Calculator', callback_data: 'btn_calc_99000_TS8' }
        ],
        [
          { text: '🔙 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    }
  };
}

"""

if old_ts8_func:
    text = text.replace(old_ts8_func, new_ts8_func)
    print("Replaced getTS8Card with pure HTML and 4 streamlined buttons")

# 2. Update calc_p10_, calc_p20_, calc_mortgage_, calc_yield_ to use clean HTML and 3-row buttons
old_calc_subhandlers = text[text.find("else if (dataStr.startsWith('calc_p10_'))"):text.find("else if (dataStr === 'btn_book_TS8')")]

new_calc_subhandlers = """else if (dataStr.startsWith('calc_p10_')) {
          const parts = dataStr.replace('calc_p10_', '').split('_');
          const price = parseInt(parts[0], 10) || 99000;
          const unit = parts[1] || 'TS8';
          const down = Math.round(price * 0.1);
          const monthly = Math.round((price * 0.18) / 36);
          const handover = Math.round(price * 0.72);
          const userLang = userLanguages[msg.chat.id] || 'EN';

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          let textContent = '';
          let btnTextNick = '💬 Consult with Nick';
          let btnTextBook = '📅 Book Viewing';
          let btnTextBack = '🧮 Back to Calculator';
          let btnTextHome = '🔙 Main Menu';

          if (userLang === 'JP') {
            btnTextNick = '💬 Nickへ直接相談 (Telegram)';
            btnTextBook = '📅 内覧予約 / ビデオ案内';
            btnTextBack = '🧮 試算プラン一覧';
            btnTextHome = '🔙 メインメニュー';
            textContent = 
              `<b>10%頭金 分割払いシミュレーション</b>\\n\\n` +
              `▫️ <b>物件：</b> タイムズスクエア8 · $${price.toLocaleString()} USD\\n` +
              `▫️ <b>当初頭金（10%）：</b> $${down.toLocaleString()} USD（約${Math.round(down * 152 / 10000)}万円）\\n` +
              `▫️ <b>工事期間中分割（36ヶ月）：</b> 月額 $${monthly.toLocaleString()} USD/月\\n` +
              `▫️ <b>竣工時残代金（72%）：</b> $${handover.toLocaleString()} USD（2026年Q4）\\n` +
              `▫️ <b>想定家賃収入：</b> $750 USD/月（年額 $9,000 USD）\\n` +
              `▫️ <b>実質純利回り：</b> <b>8.5% Net</b>\\n\\n` +
              `<blockquote>手元資金を抑え、月々わずか$500未満の支払いで資産形成が可能です。</blockquote>`;
          } else {
            textContent = 
              `<b>DEVELOPER INSTALLMENT MODEL (10% DOWN)</b>\\n\\n` +
              `▫️ <b>Asset:</b> Time Square 8 · $${price.toLocaleString()} USD\\n` +
              `▫️ <b>Down Payment (10%):</b> $${down.toLocaleString()} USD upon contract\\n` +
              `▫️ <b>During Construction (36 Mos):</b> $${monthly.toLocaleString()}/month\\n` +
              `▫️ <b>Handover Balance (72%):</b> $${handover.toLocaleString()} USD (Q4 2026)\\n` +
              `▫️ <b>Projected Net Rent:</b> $750/mo ($9,000/year)\\n` +
              `▫️ <b>Net Rental Yield:</b> <b>8.5% Net</b>\\n\\n` +
              `<blockquote>Pay under $500/month while construction progresses, then collect rental income upon completion.</blockquote>`;
          }

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text: textContent, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: btnTextNick, url: 'https://t.me/Nick_REAKH' }],
                  [
                    { text: btnTextBook, callback_data: `btn_book_${unit}` },
                    { text: btnTextBack, callback_data: `btn_calc_${price}_${unit}` }
                  ],
                  [{ text: btnTextHome, callback_data: 'menu_main' }]
                ]
              }
            })
          });
        }

        else if (dataStr.startsWith('calc_p20_')) {
          const parts = dataStr.replace('calc_p20_', '').split('_');
          const price = parseInt(parts[0], 10) || 99000;
          const unit = parts[1] || 'TS8';
          const down = Math.round(price * 0.2);
          const monthly = Math.round((price * 0.20) / 36);
          const handover = Math.round(price * 0.60);
          const userLang = userLanguages[msg.chat.id] || 'EN';

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          let textContent = '';
          let btnTextNick = '💬 Consult with Nick';
          let btnTextBook = '📅 Book Viewing';
          let btnTextBack = '🧮 Back to Calculator';
          let btnTextHome = '🔙 Main Menu';

          if (userLang === 'JP') {
            btnTextNick = '💬 Nickへ直接相談 (Telegram)';
            btnTextBook = '📅 内覧予約 / ビデオ案内';
            btnTextBack = '🧮 試算プラン一覧';
            btnTextHome = '🔙 メインメニュー';
            textContent = 
              `<b>20%頭金 最優遇分割プラン</b>\\n\\n` +
              `▫️ <b>物件：</b> タイムズスクエア8 · $${price.toLocaleString()} USD\\n` +
              `▫️ <b>当初頭金（20%）：</b> $${down.toLocaleString()} USD（約${Math.round(down * 152 / 10000)}万円）\\n` +
              `▫️ <b>工事期間中分割（36ヶ月）：</b> 月額 $${monthly.toLocaleString()} USD/月\\n` +
              `▫️ <b>竣工時残代金（60%）：</b> $${handover.toLocaleString()} USD（2026年Q4）\\n` +
              `▫️ <b>実質純利回り：</b> <b>8.8% Net</b>\\n\\n` +
              `<blockquote>頭金を20%入れることで、竣工時の残債支払いを最小限に抑えられます。</blockquote>`;
          } else {
            textContent = 
              `<b>DEVELOPER INSTALLMENT MODEL (20% DOWN)</b>\\n\\n` +
              `▫️ <b>Asset:</b> Time Square 8 · $${price.toLocaleString()} USD\\n` +
              `▫️ <b>Down Payment (20%):</b> $${down.toLocaleString()} USD\\n` +
              `▫️ <b>During Construction (36 Mos):</b> $${monthly.toLocaleString()}/month\\n` +
              `▫️ <b>Balance at Handover (60%):</b> $${handover.toLocaleString()} USD (Q4 2026)\\n` +
              `▫️ <b>Net Rental Yield:</b> <b>8.8% Net</b>\\n\\n` +
              `<blockquote>Higher initial commitment reduces balloon balance upon completion.</blockquote>`;
          }

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text: textContent, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: btnTextNick, url: 'https://t.me/Nick_REAKH' }],
                  [
                    { text: btnTextBook, callback_data: `btn_book_${unit}` },
                    { text: btnTextBack, callback_data: `btn_calc_${price}_${unit}` }
                  ],
                  [{ text: btnTextHome, callback_data: 'menu_main' }]
                ]
              }
            })
          });
        }

        else if (dataStr.startsWith('calc_mortgage_')) {
          const parts = dataStr.replace('calc_mortgage_', '').split('_');
          const price = parseInt(parts[0], 10) || 99000;
          const unit = parts[1] || 'TS8';
          const down = Math.round(price * 0.30);
          const loan = Math.round(price * 0.70);
          const monthlyRent = 750;
          const r = 0.075 / 12;
          const n = 180;
          const emi = Math.round(loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
          const cashFlow = monthlyRent - emi;
          const userLang = userLanguages[msg.chat.id] || 'EN';

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          let textContent = '';
          let btnTextNick = '💬 Consult with Nick';
          let btnTextBook = '📅 Book Viewing';
          let btnTextBack = '🧮 Back to Calculator';
          let btnTextHome = '🔙 Main Menu';

          if (userLang === 'JP') {
            btnTextNick = '💬 Nickへ直接相談 (Telegram)';
            btnTextBook = '📅 内覧予約 / ビデオ案内';
            btnTextBack = '🧮 試算プラン一覧';
            btnTextHome = '🔙 メインメニュー';
            textContent = 
              `<b>15年銀行ローン返済シミュレーション</b>\\n\\n` +
              `▫️ <b>物件価格：</b> $${price.toLocaleString()} USD\\n` +
              `▫️ <b>自己資金（30%）：</b> $${down.toLocaleString()} USD（約${Math.round(down * 152 / 10000)}万円）\\n` +
              `▫️ <b>借入金額（70%）：</b> $${loan.toLocaleString()} USD（年利 7.5% · 15年元利均等）\\n` +
              `▫️ <b>毎月返済額（EMI）：</b> <b>$${emi.toLocaleString()} USD/月</b>\\n` +
              `▫️ <b>想定家賃収入：</b> $${monthlyRent} USD/月\\n` +
              `▫️ <b>毎月手残り（Cash Flow）：</b> <strong style="color:#34d399;">+$${cashFlow} USD/月 黒字</strong>\\n\\n` +
              `<blockquote>テナントの家賃でローン返済を行いながら、毎月手元に黒字キャッシュフローを残せます。</blockquote>`;
          } else {
            textContent = 
              `<b>15-YEAR COMMERCIAL BANK MORTGAGE MODEL</b>\\n\\n` +
              `▫️ <b>Purchase Price:</b> $${price.toLocaleString()} USD\\n` +
              `▫️ <b>Down Payment (30%):</b> $${down.toLocaleString()} USD\\n` +
              `▫️ <b>Bank Loan (70%):</b> $${loan.toLocaleString()} USD @ 7.5% (15 Years)\\n` +
              `▫️ <b>Monthly Mortgage (EMI):</b> <b>$${emi.toLocaleString()}/month</b>\\n` +
              `▫️ <b>Estimated Rent:</b> $${monthlyRent}/month\\n` +
              `▫️ <b>Net Cash Flow:</b> <strong style="color:#34d399;">+$${cashFlow}/month POSITIVE</strong>\\n\\n` +
              `<blockquote>The tenant pays off your mortgage while you retain positive cash flow and 100% property ownership.</blockquote>`;
          }

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text: textContent, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: btnTextNick, url: 'https://t.me/Nick_REAKH' }],
                  [
                    { text: btnTextBook, callback_data: `btn_book_${unit}` },
                    { text: btnTextBack, callback_data: `btn_calc_${price}_${unit}` }
                  ],
                  [{ text: btnTextHome, callback_data: 'menu_main' }]
                ]
              }
            })
          });
        }

        else if (dataStr.startsWith('calc_yield_')) {
          const parts = dataStr.replace('calc_yield_', '').split('_');
          const price = parseInt(parts[0], 10) || 99000;
          const unit = parts[1] || 'TS8';
          const grossAnnual = 9000;
          const mgmtFee = 600;
          const netAnnual = grossAnnual - mgmtFee;
          const netYield = ((netAnnual / price) * 100).toFixed(1);
          const userLang = userLanguages[msg.chat.id] || 'EN';

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          let textContent = '';
          let btnTextNick = '💬 Consult with Nick';
          let btnTextBook = '📅 Book Viewing';
          let btnTextBack = '🧮 Back to Calculator';
          let btnTextHome = '🔙 Main Menu';

          if (userLang === 'JP') {
            btnTextNick = '💬 Nickへ直接相談 (Telegram)';
            btnTextBook = '📅 内覧予約 / ビデオ案内';
            btnTextBack = '🧮 試算プラン一覧';
            btnTextHome = '🔙 メインメニュー';
            textContent = 
              `<b>純利回り（Net Yield）および投資収支詳細</b>\\n\\n` +
              `▫️ <b>年間総賃料収入（$750/月）：</b> $${grossAnnual.toLocaleString()} USD\\n` +
              `▫️ <b>管理費・修繕積立金：</b> -$${mgmtFee} USD/年\\n` +
              `▫️ <b>実質手取り年収：</b> $${netAnnual.toLocaleString()} USD（約${Math.round(netAnnual * 152 / 10000)}万円）\\n` +
              `▫️ <b>実質純利回り（Net）：</b> <b>${netYield}% Net</b>\\n\\n` +
              `<blockquote>【主要都市ネット利回り比較】\\nプノンペン（8.5% Net）vs バンコク（4.5%）vs 東京（2.4%）\\n高利回りと米ドル保有を同時に実現できます。</blockquote>`;
          } else {
            textContent = 
              `<b>NET RENTAL YIELD & CASH-FLOW MODEL</b>\\n\\n` +
              `▫️ <b>Gross Annual Rent ($750/mo):</b> $${grossAnnual.toLocaleString()} USD\\n` +
              `▫️ <b>Maintenance & Management:</b> -$${mgmtFee} USD/year\\n` +
              `▫️ <b>Net Annual Rental Income:</b> $${netAnnual.toLocaleString()} USD\\n` +
              `▫️ <b>Net Rental Yield:</b> <b>${netYield}% Net</b>\\n\\n` +
              `<blockquote>Global comparison: Phnom Penh (${netYield}% Net) vs Bangkok (4.5%) vs Tokyo (2.4%).</blockquote>`;
          }

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text: textContent, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: btnTextNick, url: 'https://t.me/Nick_REAKH' }],
                  [
                    { text: btnTextBook, callback_data: `btn_book_${unit}` },
                    { text: btnTextBack, callback_data: `btn_calc_${price}_${unit}` }
                  ],
                  [{ text: btnTextHome, callback_data: 'menu_main' }]
                ]
              }
            })
          });
        }
        """

if old_calc_subhandlers:
    text = text.replace(old_calc_subhandlers, new_calc_subhandlers)
    print("Replaced all 4 calculator sub-handlers with clean HTML, Japanese, and 4 buttons")

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: Full script updated.")
