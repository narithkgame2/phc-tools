import re

with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    code = f.read()

# ── 1. UPGRADE LEAD CAPTURE FLOW (LINES ~1850-2015) ───────────────────────────
old_lead_block = """        if (dataStr.startsWith('lead_flow_')) {
          const action = dataStr.replace('lead_flow_', '');

          if (action === 'buy') {
            leadState[user.id] = { type: 'Buy' };
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cbId })
            });

            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                text: '🎯 **Great! What is your target budget for purchasing?**',
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '💰 Under $50,000 (Urgent Resales)', callback_data: 'lead_budget_under50' }],
                    [{ text: '💰 $50,000 – $100,000 (Prime 1-2BR)', callback_data: 'lead_budget_50to100' }],
                    [{ text: '💰 $100,000 – $200,000 (Luxury High-Rise)', callback_data: 'lead_budget_100to200' }],
                    [{ text: '💰 $200,000+ (Penthouse / Prime BKK1)', callback_data: 'lead_budget_200plus' }]
                  ]
                }
              })
            });

          } else if (action === 'rent') {
            leadState[user.id] = { type: 'Rent' };
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cbId })
            });

            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                text: '🔑 **What is your monthly rental budget?**',
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '💵 $400 – $650 / month (Studio / 1BR)', callback_data: 'lead_budget_rent_low' }],
                    [{ text: '💵 $700 – $1,200 / month (Luxury 1-2BR)', callback_data: 'lead_budget_rent_mid' }],
                    [{ text: '💵 $1,500+ / month (Executive / 3BR)', callback_data: 'lead_budget_rent_high' }]
                  ]
                }
              })
            });

          } else if (action === 'list') {
            ownerListingState[user.id] = { step: 1 };
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cbId })
            });

            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                text: '💼 **60-SECOND PROPERTY INTAKE WIZARD**\\n\\n' +
                  'We syndicate your listing across 4 languages (English, Japanese, Russian, German) reaching thousands of qualified international buyers and high-budget expat tenants.\\n\\n' +
                  '**Step 1 of 4:** What is your primary objective for this property?',
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Sell My Condo (Resale)', callback_data: 'owner_goal_sell' }],
                    [{ text: 'Rent Out My Condo', callback_data: 'owner_goal_rent' }],
                    [{ text: '💬 Connect Directly with Nick', url: 'https://t.me/Nick_REAKH' }]
                  ]
                }
              })
            });
          }

        } else if (dataStr.startsWith('lead_budget_')) {
          const budget = dataStr.replace('lead_budget_', '');
          if (!leadState[user.id]) leadState[user.id] = {};
          leadState[user.id].budget = budget;

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: '📍 **Which location in Phnom Penh do you prefer?**',
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '📍 BKK1 (Embassy & Dining Hub)', callback_data: 'lead_loc_bkk1' },
                    { text: '📍 Toul Tompoung (Russian Market)', callback_data: 'lead_loc_ttp' }
                  ],
                  [
                    { text: '📍 Tonle Bassac (CBD & Diamond Island)', callback_data: 'lead_loc_tb' },
                    { text: '📍 Open to Any Good Deal', callback_data: 'lead_loc_any' }
                  ]
                ]
              }
            })
          });

        } else if (dataStr.startsWith('lead_loc_')) {
          const loc = dataStr.replace('lead_loc_', '').toUpperCase();
          const info = leadState[user.id] || { type: 'Property Search', budget: 'Selected' };
          info.location = loc;

          const inquiryLeadId = 'inquiry_' + user.id + '_' + Date.now();
          leadSlaTracker[inquiryLeadId] = {
            id: inquiryLeadId,
            name: userName,
            userId: user.id,
            type: `Buyer Inquiry (${info.type || 'Search'} · ${info.budget || 'General'})`,
            unitRef: loc,
            createdAt: Date.now(),
            status: 'pending',
            escalated: false
          };
          saveState();

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '✅ Profile matched! Sending recommendations...' })
          });

          // Final response with rich matches and action buttons
          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `<b>VERIFIED UNITS MATCHING YOUR PREFERENCES</b>\\n\\n` +
                `Based on your criteria (<b>${info.budget || 'Mid-High Yield'}</b> in <b>${loc === 'TTP' ? 'Toul Tompoung' : (loc === 'BKK1' ? 'BKK1' : 'Chamkarmon / Prime')}</b>), here are our top verified matches:\\n\\n` +
                `▫️ <b>Time Square 8 (2BR Resale)</b> · $99,000 USD (8.5% Net)\\n` +
                `▫️ <b>Residence L (1BR Cash Flow)</b> · $45,000 USD (9.2% Net)\\n\\n` +
                `<blockquote>Nick has received your inquiry. Select a unit below to review photos, financial installment schedules, and legal records:</blockquote>`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Time Square 8 ($99k)', callback_data: 'btn_view_TS8' },
                    { text: 'Residence L ($45k)', callback_data: 'btn_view_ResL' }
                  ],
                  [
                    { text: 'Payment Calculator', callback_data: 'btn_calc_99000_TS8' },
                    { text: 'Compare 3 Units', callback_data: 'btn_compare_TS8' }
                  ],
                  [
                    { text: 'Foreign Buyer Legal Guide', callback_data: 'btn_legal_guide' },
                    { text: 'Main Menu', callback_data: 'menu_main' }
                  ],
                  [
                    { text: 'Consult with Nick', url: 'https://t.me/Nick_REAKH' }
                  ]
                ]
              }
            })
          });"""

new_lead_block = """        if (dataStr.startsWith('lead_flow_')) {
          const action = dataStr.replace('lead_flow_', '');
          const isJP = (userLanguages[user.id] || userLanguages[msg.chat.id]) === 'JP';

          if (action === 'buy') {
            leadState[user.id] = { type: 'Buy' };
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cbId })
            });

            const buyText = isJP ?
              `<b>プノンペン不動産 · ご予算帯の選択</b>\\n\\n` +
              `ご検討中のご予算をお選びください（米ドル・日本円換算）：` :
              `<b>TARGET INVESTMENT BUDGET</b>\\n\\n` +
              `Please select your purchase budget range:`;

            const buyKeyboard = isJP ? {
              inline_keyboard: [
                [{ text: '💰 5万ドル未満（約760万円以下 / 利回り重視）', callback_data: 'lead_budget_under50' }],
                [{ text: '💰 5万〜10万ドル（約760万〜1,520万円 / 1〜2LDK）', callback_data: 'lead_budget_50to100' }],
                [{ text: '💰 10万〜20万ドル（約1,520万〜3,040万円 / 高級高層）', callback_data: 'lead_budget_100to200' }],
                [{ text: '💰 20万ドル以上（約3,040万円以上 / 旗艦・ペントハウス）', callback_data: 'lead_budget_200plus' }],
                [{ text: '🔙 メインメニュー', callback_data: 'menu_main' }]
              ]
            } : {
              inline_keyboard: [
                [{ text: '💰 Under $50,000 USD (Urgent Cash Flow)', callback_data: 'lead_budget_under50' }],
                [{ text: '💰 $50,000 – $100,000 USD (Prime 1-2BR)', callback_data: 'lead_budget_50to100' }],
                [{ text: '💰 $100,000 – $200,000 USD (Luxury High-Rise)', callback_data: 'lead_budget_100to200' }],
                [{ text: '💰 $200,000+ USD (Flagship & Penthouses)', callback_data: 'lead_budget_200plus' }],
                [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
              ]
            };

            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                text: buyText,
                parse_mode: 'HTML',
                reply_markup: buyKeyboard
              })
            });

          } else if (action === 'rent') {
            leadState[user.id] = { type: 'Rent' };
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cbId })
            });

            const rentText = isJP ?
              `<b>賃貸コンドミニアム · ご希望月額予算</b>\\n\\n` +
              `プノンペン都心の賃貸ご予算をお選びください：` :
              `<b>MONTHLY RENTAL BUDGET</b>\\n\\n` +
              `Select your target monthly rent:`;

            const rentKeyboard = isJP ? {
              inline_keyboard: [
                [{ text: '💵 月額 $400 – $650 USD（スタジオ / 1LDK）', callback_data: 'lead_budget_rent_low' }],
                [{ text: '💵 月額 $700 – $1,200 USD（高級 1〜2LDK）', callback_data: 'lead_budget_rent_mid' }],
                [{ text: '💵 月額 $1,500+ USD（エグゼクティブ / 3LDK+）', callback_data: 'lead_budget_rent_high' }],
                [{ text: '🔙 メインメニュー', callback_data: 'menu_main' }]
              ]
            } : {
              inline_keyboard: [
                [{ text: '💵 $400 – $650 / month (Studio / 1BR)', callback_data: 'lead_budget_rent_low' }],
                [{ text: '💵 $700 – $1,200 / month (Luxury 1-2BR)', callback_data: 'lead_budget_rent_mid' }],
                [{ text: '💵 $1,500+ / month (Executive / 3BR)', callback_data: 'lead_budget_rent_high' }],
                [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
              ]
            };

            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                text: rentText,
                parse_mode: 'HTML',
                reply_markup: rentKeyboard
              })
            });

          } else if (action === 'list') {
            ownerListingState[user.id] = { step: 1 };
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cbId })
            });

            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                text: `💼 <b>60-SECOND PROPERTY INTAKE WIZARD</b>\\n\\n` +
                  `We syndicate your listing across 4 languages reaching 12,000+ international buyers and tenants.\\n\\n` +
                  `<b>Step 1 of 4:</b> What is your primary objective for this property?`,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Sell My Condo (Resale)', callback_data: 'owner_goal_sell' }],
                    [{ text: 'Rent Out My Condo', callback_data: 'owner_goal_rent' }],
                    [{ text: '💬 Connect Directly with Nick', url: 'https://t.me/Nick_REAKH' }],
                    [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
                  ]
                }
              })
            });
          }

        } else if (dataStr.startsWith('lead_budget_')) {
          const budget = dataStr.replace('lead_budget_', '');
          if (!leadState[user.id]) leadState[user.id] = {};
          leadState[user.id].budget = budget;
          const isJP = (userLanguages[user.id] || userLanguages[msg.chat.id]) === 'JP';

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const locText = isJP ?
            `<b>ご希望エリアの選択</b>\\n\\nプノンペン市内のご希望エリアをお選びください：` :
            `<b>PREFERRED PHNOM PENH LOCATION</b>\\n\\nWhich location in Phnom Penh do you prefer?`;

          const locKeyboard = isJP ? {
            inline_keyboard: [
              [
                { text: '📍 BKK1（大使館・商業中心街）', callback_data: 'lead_loc_bkk1' },
                { text: '📍 トゥールトンポン（ロシアン市場周辺）', callback_data: 'lead_loc_ttp' }
              ],
              [
                { text: '📍 トンレバサック（CBD・ダイヤモンド島）', callback_data: 'lead_loc_tb' },
                { text: '📍 エリア不問（利回り・好条件重視）', callback_data: 'lead_loc_any' }
              ],
              [{ text: '🔙 メインメニュー', callback_data: 'menu_main' }]
            ]
          } : {
            inline_keyboard: [
              [
                { text: '📍 BKK1 (Embassy & Commercial Hub)', callback_data: 'lead_loc_bkk1' },
                { text: '📍 Toul Tompoung (Russian Market)', callback_data: 'lead_loc_ttp' }
              ],
              [
                { text: '📍 Tonle Bassac (CBD & Diamond Island)', callback_data: 'lead_loc_tb' },
                { text: '📍 Open to Any Good Deal', callback_data: 'lead_loc_any' }
              ],
              [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: locText,
              parse_mode: 'HTML',
              reply_markup: locKeyboard
            })
          });

        } else if (dataStr.startsWith('lead_loc_')) {
          const loc = dataStr.replace('lead_loc_', '').toUpperCase();
          const info = leadState[user.id] || { type: 'Property Search', budget: 'Selected' };
          info.location = loc;
          const isJP = (userLanguages[user.id] || userLanguages[msg.chat.id]) === 'JP';

          const inquiryLeadId = 'inquiry_' + user.id + '_' + Date.now();
          leadSlaTracker[inquiryLeadId] = {
            id: inquiryLeadId,
            name: userName,
            userId: user.id,
            type: `Buyer Inquiry (${info.type || 'Search'} · ${info.budget || 'General'})`,
            unitRef: loc,
            createdAt: Date.now(),
            status: 'pending',
            escalated: false
          };
          saveState();

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: isJP ? '✅ 条件に一致する物件を抽出しました' : '✅ Profile matched! Sending recommendations...' })
          });

          // Final response with clean Rule of 3 (Max 3 rows / 4 buttons)
          const resultText = isJP ?
            `<b>ご希望条件に一致する厳選物件</b>\\n\\n` +
            `ご選択いただいた条件に最適なプノンペンの優良コンドミニアムをご案内いたします：\\n\\n` +
            `▫️ <b>タイムズスクエア8（2LDK リセール）</b> · $99,000 USD（約1,504万円 / 実質8.5% Net）\\n` +
            `▫️ <b>レジデンス L（1LDK キャッシュフロー）</b> · $45,000 USD（約684万円 / 実質9.2% Net）\\n\\n` +
            `<blockquote>全物件、外国人100%自己名義ハードタイトル対象です。各物件の詳細確認や、代表Nickへの直接相談は以下よりお進みください。</blockquote>` :
            `<b>VERIFIED UNITS MATCHING YOUR PREFERENCES</b>\\n\\n` +
            `Based on your criteria, here are our top verified opportunities in Phnom Penh:\\n\\n` +
            `▫️ <b>Time Square 8 (2BR Resale)</b> · $99,000 USD (8.5% Net Yield)\\n` +
            `▫️ <b>Residence L (1BR Cash Flow)</b> · $45,000 USD (9.2% Net Yield)\\n\\n` +
            `<blockquote>100% Foreign Freehold Strata Hard Title. Tap below to inspect specifications, financial models, or consult with Nick directly:</blockquote>`;

          const resultKeyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 Nickへ直接相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '🏢 タイムズスクエア8 ($99k)', callback_data: 'btn_view_TS8' },
                { text: '🏢 レジデンスL ($45k)', callback_data: 'btn_view_ResL' }
              ],
              [{ text: '🔙 メインメニュー', callback_data: 'menu_main' }]
            ]
          } : {
            inline_keyboard: [
              [{ text: '💬 Consult with Nick (Telegram)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '🏢 Time Square 8 ($99k)', callback_data: 'btn_view_TS8' },
                { text: '🏢 Residence L ($45k)', callback_data: 'btn_view_ResL' }
              ],
              [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: resultText,
              parse_mode: 'HTML',
              reply_markup: resultKeyboard
            })
          });"""

if old_lead_block in code:
    code = code.replace(old_lead_block, new_lead_block, 1)
    print("Updated lead capture flow with bilingual Rule of 3")
else:
    print("Warning: old_lead_block not found")

# ── 2. UPGRADE TOUR BOOKING FLOW (LINES ~2085-2144) ───────────────────────────
old_tour_block = """        else if (dataStr.startsWith('btn_book_')) {
          const unit = dataStr.replace('btn_book_', '').toUpperCase();
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: `📅 **Select Viewing Format for ${unit}**\\n\\nHow would you prefer to tour this property?`,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🏢 In-Person Walking Tour (Phnom Penh)', callback_data: `tour_inperson_${unit}` }],
                  [{ text: '🎥 Overseas Live Video Call (WhatsApp/Zoom)', callback_data: `tour_video_${unit}` }]
                ]
              }
            })
          });
        }

        else if (dataStr.startsWith('tour_inperson_') || dataStr.startsWith('tour_video_')) {
          const isVideo = dataStr.startsWith('tour_video_');
          const unit = dataStr.replace(isVideo ? 'tour_video_' : 'tour_inperson_', '');
          const tourLeadId = 'tour_' + unit + '_' + user.id + '_' + Math.floor(Math.random() * 899 + 100);

          leadSlaTracker[tourLeadId] = {
            id: tourLeadId,
            name: userName,
            userId: user.id,
            type: isVideo ? 'Live Video Tour Request' : 'In-Person Tour Request',
            unitRef: unit,
            createdAt: Date.now(),
            status: 'pending',
            escalated: false
          };
          saveState();

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '✅ Request received! Connecting with Nick...' })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `✅ **Viewing Request Confirmed for ${unit}!**\\n\\n` +
                `📋 **Format:** ${isVideo ? '🎥 Live Overseas Video Call' : '🏢 In-Person Walking Tour'}\\n` +
                `Nick has received your appointment request and will coordinate the exact time with you directly:`,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💬 Connect with Nick (@Nick_REAKH)', url: 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });"""

new_tour_block = """        else if (dataStr.startsWith('btn_book_')) {
          const unit = dataStr.replace('btn_book_', '').toUpperCase();
          const isJP = (userLanguages[user.id] || userLanguages[msg.chat.id]) === 'JP';
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const bookText = isJP ?
            `<b>📅 ${unit} · 内覧形式の選択</b>\\n\\nご希望のご案内形式をお選びください：` :
            `<b>📅 SELECT VIEWING FORMAT · ${unit}</b>\\n\\nHow would you prefer to tour this property?`;

          const bookKeyboard = isJP ? {
            inline_keyboard: [
              [{ text: '🏢 現地対面内覧（プノンペン）', callback_data: `tour_inperson_${unit}` }],
              [{ text: '🎥 オンライン・ビデオ案内（日本・海外から）', callback_data: `tour_video_${unit}` }],
              [{ text: '🔙 物件詳細へ戻る', callback_data: `btn_view_${unit}` }]
            ]
          } : {
            inline_keyboard: [
              [{ text: '🏢 In-Person Walking Tour (Phnom Penh)', callback_data: `tour_inperson_${unit}` }],
              [{ text: '🎥 Overseas Live Video Call (WhatsApp/Zoom)', callback_data: `tour_video_${unit}` }],
              [{ text: '🔙 Back to Property', callback_data: `btn_view_${unit}` }]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: bookText,
              parse_mode: 'HTML',
              reply_markup: bookKeyboard
            })
          });
        }

        else if (dataStr.startsWith('tour_inperson_') || dataStr.startsWith('tour_video_')) {
          const isVideo = dataStr.startsWith('tour_video_');
          const unit = dataStr.replace(isVideo ? 'tour_video_' : 'tour_inperson_', '');
          const isJP = (userLanguages[user.id] || userLanguages[msg.chat.id]) === 'JP';
          const tourLeadId = 'tour_' + unit + '_' + user.id + '_' + Math.floor(Math.random() * 899 + 100);

          leadSlaTracker[tourLeadId] = {
            id: tourLeadId,
            name: userName,
            userId: user.id,
            type: isVideo ? 'Live Video Tour Request' : 'In-Person Tour Request',
            unitRef: unit,
            createdAt: Date.now(),
            status: 'pending',
            escalated: false
          };
          saveState();

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: isJP ? '✅ ご予約を受け付けました' : '✅ Request received! Connecting with Nick...' })
          });

          const confirmText = isJP ?
            `✅ <b>内覧リクエストを受け付けました（${unit}）</b>\\n\\n` +
            `▫️ <b>形式：</b> ${isVideo ? '🎥 オンライン・ビデオ案内' : '🏢 現地対面内覧'}\\n` +
            `▫️ <b>担当：</b> Nick（プノンペン日系窓口）\\n\\n` +
            `日程調整のため、代表NickよりTelegramにて直接ご連絡差し上げます。お急ぎの場合は以下より直接メッセージをお送りください：` :
            `✅ <b>VIEWING REQUEST CONFIRMED FOR ${unit}!</b>\\n\\n` +
            `▫️ <b>Format:</b> ${isVideo ? '🎥 Live Overseas Video Call' : '🏢 In-Person Walking Tour'}\\n` +
            `▫️ <b>Advisor:</b> Nick (@Nick_REAKH)\\n\\n` +
            `Nick has received your appointment request and will coordinate the exact time with you directly:`;

          const confirmKeyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 Nickへ直接相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '🔙 物件詳細へ戻る', callback_data: `btn_view_${unit}` },
                { text: 'メインメニュー', callback_data: 'menu_main' }
              ]
            ]
          } : {
            inline_keyboard: [
              [{ text: '💬 Connect with Nick (@Nick_REAKH)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '🔙 Back to Property', callback_data: `btn_view_${unit}` },
                { text: 'Main Menu', callback_data: 'menu_main' }
              ]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: confirmText,
              parse_mode: 'HTML',
              reply_markup: confirmKeyboard
            })
          });"""

if old_tour_block in code:
    code = code.replace(old_tour_block, new_tour_block, 1)
    print("Updated tour booking flow with bilingual return paths")
else:
    print("Warning: old_tour_block not found")

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved phase 3 updates.")
