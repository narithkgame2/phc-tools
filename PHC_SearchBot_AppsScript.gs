// ═══════════════════════════════════════════════════════════════
//  PHC CLIENT SEARCH BOT — GOOGLE APPS SCRIPT EDITION (24/7 CLOUD BACKUP)
//  Bot: @Nick_REAKH_Bot (or your production bot token)
//
//  WHY THIS WORKS WHEN PC IS OFF:
//  Runs on Google's cloud servers 24/7.
//  Uses a 1-minute time trigger (checkForSearchBotUpdates) so your computer
//  does not need to be on or connected to the internet.
//
//  HOW TO DEPLOY IN 2 MINUTES:
//  1. Go to https://script.google.com and click "New project"
//  2. Name it "PHC Client Search Bot"
//  3. Paste this entire code into Code.gs
//  4. (Optional) In Project Settings (⚙) -> Script Properties, add:
//       BOT_TOKEN = 8453711743:AAHj3SKU8orwO4ksev1z_xVvX0mNcm8_yq4
//       NICK_CHAT_ID = 353195979
//  5. Select function "installSearchBotTrigger" from dropdown and click "Run"
//     (Grant Google permissions once when prompted)
//  Done! The bot will now run 24/7 in Google's cloud.
// ═══════════════════════════════════════════════════════════════

const DEFAULT_BOT_TOKEN = '8453711743:AAHj3SKU8orwO4ksev1z_xVvX0mNcm8_yq4';
const DEFAULT_NICK_CHAT_ID = '353195979';

function getBotToken() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('BOT_TOKEN') || DEFAULT_BOT_TOKEN;
}

function getNickChatId() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('NICK_CHAT_ID') || DEFAULT_NICK_CHAT_ID;
}

// ── 1. INSTALL / UNINSTALL 1-MINUTE CLOUD TRIGGER ────────────
function installSearchBotTrigger() {
  uninstallSearchBotTrigger(); // Remove duplicates
  ScriptApp.newTrigger('checkForSearchBotUpdates')
    .timeBased()
    .everyMinutes(1)
    .create();
  Logger.log('✅ 1-minute 24/7 Google Cloud Trigger successfully installed!');
}

function uninstallSearchBotTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkForSearchBotUpdates') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  Logger.log('🛑 Old triggers cleaned up.');
}

// ── 2. MAIN 24/7 POLLING ENGINE ──────────────────────────────
function checkForSearchBotUpdates() {
  const token = getBotToken();
  const props = PropertiesService.getScriptProperties();
  const lastUpdateId = parseInt(props.getProperty('LAST_UPDATE_ID') || '0', 10);

  const url = 'https://api.telegram.org/bot' + token + '/getUpdates?offset=' + (lastUpdateId + 1) + '&timeout=5';
  
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const data = JSON.parse(res.getContentText());
    if (!data.ok || !data.result || data.result.length === 0) return;

    let maxId = lastUpdateId;
    for (let i = 0; i < data.result.length; i++) {
      const update = data.result[i];
      if (update.update_id > maxId) maxId = update.update_id;
      handleTelegramUpdate(update);
    }
    props.setProperty('LAST_UPDATE_ID', maxId.toString());
  } catch (err) {
    Logger.log('Polling Error: ' + err.toString());
  }
}

// ── 3. UPDATE ROUTER ──────────────────────────────────────────
function handleTelegramUpdate(update) {
  if (update.callback_query) {
    handleCallbackQuery(update.callback_query);
  } else if (update.message) {
    handleIncomingMessage(update.message);
  }
}

// ── 4. MESSAGE HANDLER ────────────────────────────────────────
function handleIncomingMessage(msg) {
  const chatId = msg.chat.id.toString();
  const text = (msg.text || '').trim();
  const user = msg.from || {};
  const userName = user.first_name || 'Client';

  if (!text) return;

  // Handle Commands
  if (text.startsWith('/start') || text.startsWith('/menu')) {
    sendWelcomeMenu(chatId, userName);
    return;
  }

  if (text.startsWith('/rent')) {
    sendRentalOptions(chatId, 1);
    return;
  }

  if (text.startsWith('/sale') || text.startsWith('/buy')) {
    sendSaleOptions(chatId, 1);
    return;
  }

  if (text.startsWith('/nick') || text.startsWith('/contact')) {
    sendContactNick(chatId);
    return;
  }

  // Handle Natural Language Sentences (e.g. "looking for 1 bedroom in BKK1 budget $400")
  const lower = text.toLowerCase();
  const isRent = lower.includes('rent') || lower.includes('/mo') || lower.includes('month');
  const isSale = lower.includes('sale') || lower.includes('buy') || lower.includes('invest');

  if (isRent || (!isSale && (lower.includes('bkk') || lower.includes('bed') || lower.includes('$')))) {
    // Send Rental Matrix matching natural language
    sendRentalOptions(chatId, 1);
    // Notify Nick about the natural language lead
    notifyNickOfLead(user, 'Natural Language Search', text);
  } else {
    // Default to Sale / Investment Matrix
    sendSaleOptions(chatId, 1);
    notifyNickOfLead(user, 'Property Inquiry', text);
  }
}

// ── 5. CALLBACK QUERY HANDLER ────────────────────────────────
function handleCallbackQuery(cb) {
  const chatId = cb.message.chat.id.toString();
  const data = cb.data || '';
  const messageId = cb.message.message_id;
  const user = cb.from || {};

  // Acknowledge callback query
  answerCallback(cb.id);

  if (data === 'nav_explore') {
    sendExploreCategory(chatId);
  } else if (data === 'cat_rent_p1') {
    sendRentalOptions(chatId, 1);
  } else if (data === 'cat_rent_p2') {
    sendRentalOptions(chatId, 2);
  } else if (data === 'cat_sale_p1') {
    sendSaleOptions(chatId, 1);
  } else if (data === 'cat_sale_p2') {
    sendSaleOptions(chatId, 2);
  } else if (data === 'custom_source') {
    promptCustomSourcing(chatId);
  } else if (data === 'direct_nick') {
    sendContactNick(chatId);
    notifyNickOfLead(user, 'Direct Advisory Request', 'Client tapped Direct Advisory with Nick');
  }
}

// ── 6. UI BUILDERS & CARD DISPATCHERS ─────────────────────────

function sendWelcomeMenu(chatId, userName) {
  const text = 
    '🏛️ <b>PROPERTY HUB CAMBODIA (PHC)</b>\n' +
    '<i>Private Client Advisory & Verified Prime Inventory</i>\n\n' +
    'Welcome, <b>' + escapeHtml(userName) + '</b>.\n' +
    'How may we assist your Phnom Penh real estate search today?\n\n' +
    '▫️ <b>Prime Rentals</b>: Turnkey expat residences ($450 – $1,200+/mo)\n' +
    '▫️ <b>High-Yield Sales</b>: Strata Freehold 100% foreign-titled condos (7.5% – 9.2% Net Yield)\n' +
    '▫️ <b>Bespoke Sourcing</b>: Direct private search tailored by Nick';

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🏢 Prime Condos For Sale', callback_data: 'cat_sale_p1' },
        { text: '🔑 Turnkey Expat Rentals', callback_data: 'cat_rent_p1' }
      ],
      [
        { text: '🎯 Request Custom Sourcing', callback_data: 'custom_source' },
        { text: '👤 Private Advisory with Nick', callback_data: 'direct_nick' }
      ]
    ]
  };

  sendTelegramMessage(chatId, text, keyboard);
}

function sendExploreCategory(chatId) {
  const text = 'Select an inventory category to review verified opportunities:';
  const keyboard = {
    inline_keyboard: [
      [
        { text: '🏢 For Sale / Investment', callback_data: 'cat_sale_p1' },
        { text: '🔑 For Rent (Turnkey)', callback_data: 'cat_rent_p1' }
      ]
    ]
  };
  sendTelegramMessage(chatId, text, keyboard);
}

function sendRentalOptions(chatId, page) {
  let text = '';
  let keyboard = {};

  if (page === 1) {
    text = 
      '🔑 <b>PHC HANDPICKED EXPAT RENTALS</b>\n' +
      '<i>Verified Turnkey Residences in Prime Expat Hubs:</i>\n\n' +
      '<blockquote>✨ <b>OPTION 1 · TOP VALUE</b>\n' +
      '▫️ <b>Property:</b> J Tower 1 (Boeung Keng Kang 1)\n' +
      '▫️ <b>Pricing:</b> $600/month\n' +
      '▫️ <b>Specs:</b> 1BR · High Floor\n' +
      '📍 <i>Boeung Keng Kang 1 (BKK1)</i>\n' +
      '📐 60m² | 1🛏 | 1🛁 | 🏊 Pool & Gym\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>\n\n' +
      '<blockquote>✨ <b>OPTION 2 · EXPAT VIBE</b>\n' +
      '▫️ <b>Property:</b> Toul Tompoung 2 Modern Residence\n' +
      '▫️ <b>Pricing:</b> $550/month\n' +
      '▫️ <b>Specs:</b> 1BR · Modern Serviced\n' +
      '📍 <i>Russian Market / TTP2</i>\n' +
      '📐 55m² | 1🛏 | 1🛁 | 🧹 Weekly Cleaning\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>\n\n' +
      '<blockquote>✨ <b>OPTION 3 · ULTRA VALUE</b>\n' +
      '▫️ <b>Property:</b> Pring Residence (Toul Tum Poung)\n' +
      '▫️ <b>Pricing:</b> $450/month\n' +
      '▫️ <b>Specs:</b> 1BR · Turnkey Ready\n' +
      '📍 <i>Toul Tompoung 1 (Russian Market)</i>\n' +
      '📐 48m² | 1🛏 | 1🛁 | ☀️ Balcony\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>\n\n' +
      '💡 <i>All rentals include management fees, high-speed WiFi & security.</i>';

    keyboard = {
      inline_keyboard: [
        [{ text: '📂 View Next 3 Matches ❯', callback_data: 'cat_rent_p2' }],
        [{ text: '🎯 Request Custom Sourcing from Nick', callback_data: 'custom_source' }]
      ]
    };
  } else {
    text = 
      '🔑 <b>PHC HANDPICKED EXPAT RENTALS (BATCH 2)</b>\n' +
      '<i>Additional Handpicked Options ($450 – $650/mo):</i>\n\n' +
      '<blockquote>✨ <b>OPTION 4 · MODERN URBAN</b>\n' +
      '▫️ <b>Property:</b> Urban Village Phase 2 (Hun Sen Blvd)\n' +
      '▫️ <b>Pricing:</b> $450/month\n' +
      '▫️ <b>Specs:</b> 1BR · High Floor\n' +
      '📍 <i>Chak Angre / Factory Phnom Penh</i>\n' +
      '📐 50m² | 1🛏 | 1🛁 | ☕ Creative Hub Access\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>\n\n' +
      '<blockquote>✨ <b>OPTION 5 · SKY RESIDENCE</b>\n' +
      '▫️ <b>Property:</b> Time Square 306 (BKK1)\n' +
      '▫️ <b>Pricing:</b> $650/month\n' +
      '▫️ <b>Specs:</b> 1BR · Luxury High Floor\n' +
      '📍 <i>BKK1 Prime CBD</i>\n' +
      '📐 52m² | 1🛏 | 1🛁 | 🏊 45th Fl Infinity Pool\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>\n\n' +
      '<blockquote>✨ <b>OPTION 6 · SERVICED COMFORT</b>\n' +
      '▫️ <b>Property:</b> Boeng Kak 1 Serviced Residence\n' +
      '▫️ <b>Pricing:</b> $500/month\n' +
      '▫️ <b>Specs:</b> 1BR · Quiet Residential\n' +
      '📍 <i>Toul Kork (Boeng Kak 1)</i>\n' +
      '📐 50m² | 1🛏 | 1🛁 | 🚗 Car Parking\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>';

    keyboard = {
      inline_keyboard: [
        [{ text: '🔙 Back to Top 3 Matches', callback_data: 'cat_rent_p1' }],
        [{ text: '🎯 Request Custom Sourcing from Nick', callback_data: 'custom_source' }]
      ]
    };
  }

  sendTelegramMessage(chatId, text, keyboard);
}

function sendSaleOptions(chatId, page) {
  let text = '';
  let keyboard = {};

  if (page === 1) {
    text = 
      '⚖️ <b>PHC INVESTMENT COMPARISON MATRIX</b>\n' +
      '<i>Compare Top-Tier Foreign Freehold Strata Condos:</i>\n\n' +
      '<blockquote>🏢 <b>1. TIME SQUARE 8 (Chamkarmon)</b>\n' +
      '▫️ <b>Price:</b> $99,000 USD (Urgent Resale)\n' +
      '▫️ <b>Specs:</b> 2 Beds · 1 Bath · City Views\n' +
      '📍 <i>Chamkarmon / Russian Market Border</i>\n' +
      '📐 65m² Gross · 48m² Net ($1,523/m²)\n' +
      '▫️ <b>Net Yield:</b> 8.5% Net | Handover: Q4 2026\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>\n\n' +
      '<blockquote>🏢 <b>2. RESIDENCE L (Toul Tompoung)</b>\n' +
      '▫️ <b>Price:</b> $45,000 USD (Lowest Entry Barrier)\n' +
      '▫️ <b>Specs:</b> 1 Bed · 1 Bath · Turnkey Furnished\n' +
      '📍 <i>Boeung Tumpun / TTP Border</i>\n' +
      '📐 47m² Gross ($957/m²)\n' +
      '▫️ <b>Net Yield:</b> 9.2% Net | Ready to Move & Lease\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>\n\n' +
      '<blockquote>🏢 <b>3. ODOM LIVING (Norodom Blvd)</b>\n' +
      '▫️ <b>Price:</b> $240,000 USD (Ultra-Luxury Flagship)\n' +
      '▫️ <b>Specs:</b> 2 Beds · 2 Baths · Panoramic Views\n' +
      '📍 <i>Tonle Bassac / Norodom Blvd</i>\n' +
      '📐 78m² Gross ($3,076/m²)\n' +
      '▫️ <b>Net Yield:</b> 6.8% Net | Handover: Q1 2027\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>\n\n' +
      '💡 <i>All 3 properties are Strata Hard Title eligible for 100% foreign freehold ownership.</i>';

    keyboard = {
      inline_keyboard: [
        [{ text: '📂 View Next 3 Matches ❯', callback_data: 'cat_sale_p2' }],
        [{ text: '🎯 Request Custom Sourcing from Nick', callback_data: 'custom_source' }]
      ]
    };
  } else {
    text = 
      '⚖️ <b>PHC INVESTMENT COMPARISON MATRIX (BATCH 2)</b>\n' +
      '<i>Additional Handpicked Freehold Condominiums:</i>\n\n' +
      '<blockquote>🏢 <b>4. LE CONDÉ BKK1</b>\n' +
      '▫️ <b>Price:</b> $135,000 USD\n' +
      '▫️ <b>Specs:</b> 1 Bed · Smart Home Japanese System\n' +
      '📍 <i>BKK1 Heart</i>\n' +
      '📐 53m² Gross ($2,547/m²)\n' +
      '▫️ <b>Net Yield:</b> 7.8% Net | Handover: 2025\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>\n\n' +
      '<blockquote>🏢 <b>5. TIME SQUARE 306</b>\n' +
      '▫️ <b>Price:</b> $89,000 USD (High Floor Resale)\n' +
      '▫️ <b>Specs:</b> 1 Bed · Full Facilities\n' +
      '📍 <i>BKK1 / St 306</i>\n' +
      '📐 50m² Gross ($1,780/m²)\n' +
      '▫️ <b>Net Yield:</b> 8.2% Net | Ready Soon\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>\n\n' +
      '<blockquote>🏢 <b>6. URBAN VILLAGE PHASE 1</b>\n' +
      '▫️ <b>Price:</b> $72,000 USD\n' +
      '▫️ <b>Specs:</b> 2 Beds · Ready Tenant Generating $550/mo\n' +
      '📍 <i>Hun Sen Blvd</i>\n' +
      '📐 67m² Gross ($1,074/m²)\n' +
      '▫️ <b>Net Yield:</b> 9.1% Net | Immediate Cash Flow\n' +
      '▫️ <b>Listing Photos:</b> <a href="https://t.me/PropertyHubCambodia">View Details ↗</a></blockquote>';

    keyboard = {
      inline_keyboard: [
        [{ text: '🔙 Back to Top 3 Matches', callback_data: 'cat_sale_p1' }],
        [{ text: '🎯 Request Custom Sourcing from Nick', callback_data: 'custom_source' }]
      ]
    };
  }

  sendTelegramMessage(chatId, text, keyboard);
}

function promptCustomSourcing(chatId) {
  const text = 
    '🎯 <b>BESPOKE SOURCING CONCIERGE</b>\n\n' +
    'None of the options quite match what you are looking for?\n\n' +
    'Please reply directly to this chat with your requirements:\n' +
    '▫️ <b>Budget:</b> (e.g. $500/mo or under $100k)\n' +
    '▫️ <b>Preferred Area:</b> (e.g. BKK1, Tonle Bassac, Toul Kork)\n' +
    '▫️ <b>Bedrooms:</b> (Studio, 1BR, 2BR, 3BR)\n' +
    '▫️ <b>Move-in Date / Timeline</b>\n\n' +
    '⚡ Nick will personally review your request within 15 minutes and pull matching offline/unlisted units from our broker database.';

  sendTelegramMessage(chatId, text, null);
}

function sendContactNick(chatId) {
  const text = 
    '👤 <b>DIRECT ADVISORY WITH NICK</b>\n' +
    '<i>Founder & Lead Broker, Property Hub Cambodia</i>\n\n' +
    '📞 <b>Direct Phone:</b> +855 11 666 952\n' +
    '📱 <b>Telegram Direct:</b> @Nick_reakh\n' +
    '🏢 <b>Office:</b> BKK1, Phnom Penh, Cambodia\n\n' +
    'Feel free to send a message or call directly for off-market inventory or title verification.';

  const keyboard = {
    inline_keyboard: [
      [{ text: '💬 Chat with Nick on Telegram', url: 'https://t.me/Nick_reakh' }],
      [{ text: '🔙 Back to Menu', callback_data: 'nav_explore' }]
    ]
  };

  sendTelegramMessage(chatId, text, keyboard);
}

function notifyNickOfLead(user, source, content) {
  const nickId = getNickChatId();
  if (!nickId) return;

  const handle = user.username ? '@' + user.username : 'No username';
  const name = (user.first_name || '') + ' ' + (user.last_name || '');

  const text = 
    '🚨 <b>NEW INQUIRY VIA SEARCH BOT (GAS CLOUD)</b>\n\n' +
    '👤 <b>Client:</b> ' + escapeHtml(name) + ' (' + handle + ')\n' +
    '🆔 <b>Telegram ID:</b> <code>' + user.id + '</code>\n' +
    '🏷 <b>Source:</b> ' + source + '\n\n' +
    '💬 <b>Message / Requirement:</b>\n<i>' + escapeHtml(content) + '</i>\n\n' +
    '⚡ <i>Please follow up within 15 minutes!</i>';

  sendTelegramMessage(nickId, text, null);
}

// ── 7. TELEGRAM API UTILITIES ─────────────────────────────────
function sendTelegramMessage(chatId, text, keyboard) {
  const token = getBotToken();
  const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };

  if (keyboard) {
    payload.reply_markup = JSON.stringify(keyboard);
  }

  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Send Message Error: ' + err.toString());
  }
}

function answerCallback(callbackQueryId) {
  const token = getBotToken();
  const url = 'https://api.telegram.org/bot' + token + '/answerCallbackQuery';
  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ callback_query_id: callbackQueryId }),
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Answer Callback Error: ' + err.toString());
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
