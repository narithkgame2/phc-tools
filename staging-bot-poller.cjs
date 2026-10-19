// ═══════════════════════════════════════════════════════════════
// Comprehensive Staging Bot Listener & Lead Engine
// Bot: @Nick_REAKH_Bot | Channel: Nick Test Lab (-1004372846355)
// Features: Lead Capture, Telegram Mini App, GPS Pins, Trust Engine
// ═══════════════════════════════════════════════════════════════

const token = '8453711743:AAHj3SKU8orwO4ksev1z_xVvX0mNcm8_yq4';
const channelId = '-1004372846355'; // Nick Test Lab
const nickChatId = '353195979';

const PROJECT_COORDINATES = {
  'Time Square 8': { lat: 11.54345, lng: 104.91797 },
  'Time Square 306': { lat: 11.55010, lng: 104.92240 },
  'Time Square 9': { lat: 11.54120, lng: 104.91680 },
  'Residence L': { lat: 11.53200, lng: 104.91200 },
  'Odom Living': { lat: 11.55400, lng: 104.92800 },
};

function findCoords(text) {
  if (!text) return null;
  for (const name of Object.keys(PROJECT_COORDINATES)) {
    if (new RegExp(name.replace(/\s+/g, '\\s*'), 'i').test(text)) {
      return { name, coords: PROJECT_COORDINATES[name] };
    }
  }
  return null;
}

console.log('🤖 Comprehensive @Nick_REAKH_Bot listener started!');
console.log('Listening for button taps, leads, and commands...');

let offset = 0;

// Temporary in-memory lead state tracker
const leadState = {};

async function pollUpdates() {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`);
    const data = await res.json();
    if (!data.ok || !data.result) return;

    for (const update of data.result) {
      offset = update.update_id + 1;

      // ───────────────────────────────────────────────────────────
      // 1. HANDLE INCOMING CHAT MESSAGES (/start, /inquire, text)
      // ───────────────────────────────────────────────────────────
      if (update.message && update.message.text) {
        const text = update.message.text.trim();
        const chatId = update.message.chat.id;
        const sender = update.message.from;
        const senderName = sender.first_name || 'Client';

        if (text === '/start' || text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello' || text === '/inquire') {
          console.log(`👤 New client interaction from ${senderName} (${chatId})`);

          const welcomeText = `👋 **Hello ${senderName}!**\n\n` +
            `Welcome to **Property Hub Cambodia** — Phnom Penh's premier condo & investment specialists.\n\n` +
            `How can we assist you today? Select an option below to browse properties or speak directly with our team:`;

          const welcomeKeyboard = {
            inline_keyboard: [
              [
                { text: '🏠 Buy a Condo', callback_data: 'lead_flow_buy' },
                { text: '🔑 Rent a Home', callback_data: 'lead_flow_rent' }
              ],
              [
                { text: '💼 List My Property with PHC', callback_data: 'lead_flow_list' }
              ],
              [
                // TELEGRAM MINI APP: Opens in-app responsive website!
                { text: '📱 Browse All Properties (Mini App)', web_app: { url: 'https://www.propertyhubcambodia.com' } }
              ],
              [
                { text: '📞 Speak with Nick Directly', url: 'https://t.me/Nick_REAKH' }
              ]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: welcomeText,
              parse_mode: 'Markdown',
              reply_markup: welcomeKeyboard
            })
          });
        }
      }

      // ───────────────────────────────────────────────────────────
      // 2. HANDLE INLINE BUTTON TAPS (CALLBACK QUERIES)
      // ───────────────────────────────────────────────────────────
      if (update.callback_query) {
        const cb = update.callback_query;
        const cbId = cb.id;
        const dataStr = cb.data;
        const msg = cb.message;
        const user = cb.from;
        const userName = user.username ? `@${user.username}` : user.first_name;

        console.log(`\n👉 Tap received: ${dataStr} from user ${userName} (${user.id})`);

        // ── A. LEAD CAPTURE CONVERSATION FLOW ─────────────────────
        if (dataStr.startsWith('lead_flow_')) {
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
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cbId })
            });

            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                text: '💼 **List Your Property With Property Hub Cambodia**\n\n' +
                  'We market your property across 4 languages (English, Japanese, Russian, German) reaching thousands of qualified expat tenants and international investors.\n\n' +
                  'Tap below to connect directly with Nick to get your unit valued and published:',
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '📲 Message Nick Directly (@Nick_REAKH)', url: 'https://t.me/Nick_REAKH' }],
                    [{ text: '📞 Call Nick: 011 666 952', url: 'tel:+85511666952' }]
                  ]
                }
              })
            });

            // Notify Nick of listing owner lead!
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: nickChatId,
                text: `💼 **NEW OWNER LISTING INQUIRY**\n\n` +
                  `👤 **From:** ${userName} (${user.first_name} ${user.last_name || ''})\n` +
                  `🆔 **User ID:** \`${user.id}\`\n` +
                  `⚡ **Action:** Wants to list property with PHC!\n\n` +
                  `👉 [Tap here to message owner](tg://user?id=${user.id})`,
                parse_mode: 'Markdown'
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

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '✅ Profile matched! Sending recommendations...' })
          });

          // Final response with matches
          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `✨ **We found verified units matching your criteria!**\n\n` +
                `🏢 **Recommended:** Time Square 8 (2BR Resale) or Residence L (1BR)\n` +
                `📍 **Area:** ${loc === 'TTP' ? 'Toul Tompoung' : (loc === 'BKK1' ? 'BKK1' : 'Phnom Penh Prime')}\n\n` +
                `Nick has received your inquiry and can show you video tours or arrange a private viewing immediately:`,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💬 Connect with Nick (@Nick_REAKH)', url: 'https://t.me/Nick_REAKH' }],
                  [{ text: '📱 Open Mini App to View Photos', web_app: { url: 'https://www.propertyhubcambodia.com' } }]
                ]
              }
            })
          });

          // 🚨 INSTANT VIP LEAD ALERT SENT DIRECTLY TO NICK!
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🚨 **NEW QUALIFIED LEAD RECEIVED!**\n\n` +
                `👤 **Client:** ${userName} (${user.first_name} ${user.last_name || ''})\n` +
                `🎯 **Goal:** ${info.type}\n` +
                `💰 **Budget Category:** ${info.budget}\n` +
                `📍 **Preferred Area:** ${loc}\n\n` +
                `👉 [Tap here to message buyer directly](tg://user?id=${user.id})`,
              parse_mode: 'Markdown'
            })
          });
          console.log(`🚨 Sent VIP Lead Notification to Nick for user ${userName}!`);
        }

        // ── B. ADMIN APPROVAL / REJECTION BUTTONS ─────────────────
        else if (dataStr.startsWith('test_approve')) {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '✅ Approved! Publishing to Nick Test Lab...' })
          });

          if (msg && msg.caption) {
            const newCaption = msg.caption + '\n\n✅ POSTED to EN + JP + RU + DE (Simulated)';
            await fetch(`https://api.telegram.org/bot${token}/editMessageCaption`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                caption: newCaption,
                reply_markup: { inline_keyboard: [] }
              })
            });
            console.log('✅ Review card updated: buttons removed, POSTED tag added.');
          }

          if (dataStr.includes('audit')) {
            const auditCaption = '🛡️ [PHC DUE DILIGENCE AUDIT]\n\n' +
              '#Audit TIME SQUARE 8\n' +
              '📍 Boeng Trabek / Toul Tompoung, Chamkarmon\n\n' +
              '――――――――――\n\n' +
              '🏗️ DEVELOPER TRACK RECORD\n' +
              '✅ Megakim World Corp (Taiwanese-backed)\n' +
              '✅ Past towers 1-7: 100% completed & handed over\n\n' +
              '📜 LEGAL TITLE & STRATA TITLE\n' +
              '✅ Foreign Quota ownership (Strata Hard Title eligible)\n' +
              '✅ Master land title verified with Cadastral Office\n\n' +
              '📊 INVESTMENT METRICS\n' +
              '✅ Projected Net Yield: 7.5% – 8.8%\n' +
              '✅ High rental demand zone near Russian Market\n\n' +
              '――――――――――\n' +
              '⚖️ PHC AUDIT VERDICT: APPROVED (High Safety Tier)\n' +
              '📱 t.me/PropertyHubCambodia';

            await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: channelId,
                photo: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
                caption: auditCaption,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '📞 Inquire with Nick', url: 'https://t.me/Nick_REAKH' }],
                    [{ text: '📱 Open PHC Catalog / Bot', url: 'https://t.me/Nick_REAKH_Bot?start=audit_ts8' }]
                  ]
                }
              })
            });
            console.log('📢 Published #audit report to Nick Test Lab!');

          } else if (dataStr.includes('leased')) {
            const leasedCaption = '🏷️ [VERIFIED TRANSACTION PROOF]\n\n' +
              '#Leased TIME SQUARE 306 | 1BR CONDO\n' +
              '📍 BKK1, Phnom Penh\n\n' +
              '――――――――――\n\n' +
              '⚡ SPEED TO LEASE: 6 Days on Market\n' +
              '💰 RENT ACHIEVED: $650/month (Annual Contract)\n' +
              '📈 ACHIEVED YIELD: 8.1% Gross Yield for Owner\n' +
              '🤝 TENANT PROFILE: Expat Corporate Professional\n\n' +
              '――――――――――\n' +
              'Verified by Property Hub Cambodia\n' +
              '📱 t.me/PropertyHubCambodia';

            await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: channelId,
                photo: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
                caption: leasedCaption,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '📞 List Your Unit', url: 'https://t.me/Nick_REAKH' }],
                    [{ text: '📱 Open PHC Catalog / Bot', url: 'https://t.me/Nick_REAKH_Bot?start=leased_ts306' }]
                  ]
                }
              })
            });
            console.log('📢 Published #leased transaction proof to Nick Test Lab!');

          } else {
            // General property listing approved!
            let publicCaption = (msg && msg.caption) ? msg.caption : '';
            publicCaption = publicCaption.replace(/^[🔴🟢🟣🔵].*?(\n\n|$)/, '');
            publicCaption = publicCaption.replace(/\n\n✅ POSTED.*$/, '').trim();

            const photoId = (msg && msg.photo && msg.photo.length > 0)
              ? msg.photo[msg.photo.length - 1].file_id
              : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';

            const postRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: channelId,
                photo: photoId,
                caption: publicCaption,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '📞 Inquire with Nick (@Nick_REAKH)', url: 'https://t.me/Nick_REAKH' }],
                    [{ text: '📱 Browse in Bot / Catalog', url: 'https://t.me/Nick_REAKH_Bot?start=catalog' }]
                  ]
                }
              })
            });
            const postJson = await postRes.json();
            if (postJson.ok) {
              console.log('📢 Successfully published approved listing to Nick Test Lab!');
            } else {
              console.error('❌ Failed to publish approved listing to channel:', postJson);
            }
          }

        } else if (dataStr.startsWith('test_reject')) {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '❌ Listing rejected.' })
          });

          if (msg && msg.caption) {
            const newCaption = msg.caption + '\n\n❌ REJECTED';
            await fetch(`https://api.telegram.org/bot${token}/editMessageCaption`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                caption: newCaption,
                reply_markup: { inline_keyboard: [] }
              })
            });
            console.log('❌ Review card updated: buttons removed, REJECTED tag added.');
          }
        }
      }
    }
  } catch (err) {
    console.error('Polling error:', err.message);
  }
}

async function runLoop() {
  while (true) {
    await pollUpdates();
    await new Promise(r => setTimeout(r, 1000));
  }
}

runLoop();
