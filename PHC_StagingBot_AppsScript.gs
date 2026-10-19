// ═══════════════════════════════════════════════════════════════
// PHC Staging Bot - Sandbox Test Suite
// Bot: @Nick_REAKH_Bot
// ═══════════════════════════════════════════════════════════════

const STAGING_BOT_TOKEN = '8453711743:AAHj3SKU8orwO4ksev1z_xVvX0mNcm8_yq4';
const STAGING_REVIEWER_CHAT_ID = '353195979'; // Nick's Telegram Chat ID

// Test Channel: Nick Test Lab (https://t.me/+olPZyfkgtcQxOTA9)
const STAGING_CHANNEL_ID = '-1004372846355'; 

// ── 1. SEND REAL TEST REVIEW CARD TO NICK'S TELEGRAM ────────────
// Run this function directly from the Apps Script editor to receive
// the interactive review card on your Telegram!
function sendTestCardToNick() {
  const photoUrl = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80';
  
  const categoryPill = '🔴 [URGENT RESALE]';
  const mediaPill = '📸 1 photo';
  const prefix = categoryPill + ' · ' + mediaPill + ' · New listing ready — approving posts to EN + JP + RU + DE\n\n';
  
  const content = 
    '#ForSale $45,000 (Urgent)\n\n' +
    '𝗥𝗘𝗦𝗜𝗗𝗘𝗡𝗖𝗘 𝗟 | 𝟭𝗕𝗥\n' +
    '📍 Boeung Tumpun, Phnom Penh\n\n' +
    '――――――――――\n\n' +
    'Floor 9 | 📐 47 sqm | 1🛏 | 1🛁\n\n' +
    '✅ Swimming Pool & Fitness Gym\n' +
    '✅ Fully Furnished · High Floor\n\n' +
    '――――――――――\n' +
    '📞 011 666 952\n' +
    '📱 t.me/PropertyHubCambodia';

  const fullCaption = truncateCaptionSafe(prefix + content, 1024);

  const keyboard = {
    inline_keyboard: [[
      { text: '🟢 Approve All (4 Ch)', callback_data: 'test_approve_001' },
      { text: '🔴 Reject All', callback_data: 'test_reject_001' },
    ]],
  };

  return sendTelegramPhotoStaging(STAGING_REVIEWER_CHAT_ID, photoUrl, fullCaption, keyboard);
}

// ── 2. SEND RENTAL TEST CARD ────────────────────────────────────
function sendTestRentCardToNick() {
  const photoUrl = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80';
  
  const categoryPill = '🟢 [FOR RENT]';
  const mediaPill = '📸 3 photos';
  const prefix = categoryPill + ' · ' + mediaPill + ' · New listing ready — approving posts to EN + JP + RU + DE\n\n';
  
  const content = 
    '#ForRent $650/month\n\n' +
    '𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 𝟯𝟬𝟲 | 𝟭𝗕𝗥\n' +
    '📍 BKK1, Phnom Penh\n\n' +
    '――――――――――\n\n' +
    'Floor 18 | 📐 55 sqm | 1🛏 | 1🛁\n\n' +
    '✅ 45th Floor Sky Lounge & Infinity Pool\n' +
    '✅ Premium Modern Interior\n\n' +
    '――――――――――\n' +
    '📞 011 666 952\n' +
    '📱 t.me/PropertyHubCambodia';

  const fullCaption = truncateCaptionSafe(prefix + content, 1024);

  const keyboard = {
    inline_keyboard: [[
      { text: '🟢 Approve All (4 Ch)', callback_data: 'test_approve_rent' },
      { text: '🔴 Reject All', callback_data: 'test_reject_rent' },
    ]],
  };

  return sendTelegramPhotoStaging(STAGING_REVIEWER_CHAT_ID, photoUrl, fullCaption, keyboard);
}

// ── 3. TEST CUSTOM EMOJI SUPPORT ────────────────────────────────
// Tests if Telegram lets @Nick_REAKH_Bot send custom emoji entities
function testCustomEmojiSupport() {
  // Test with a sample custom emoji entity
  // Text: "Custom Emoji Test: ⭐" where ⭐ is replaced with a custom emoji document ID
  const text = 'Testing Custom Emoji for @Nick_REAKH_Bot: 🏷️ PHC Exclusive';
  
  const payload = {
    chat_id: STAGING_REVIEWER_CHAT_ID,
    text: text,
  };

  const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + STAGING_BOT_TOKEN + '/sendMessage', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    muteHttpExceptions: true,
  });

  Logger.log('Custom Emoji Test Response: ' + resp.getContentText());
  return JSON.parse(resp.getContentText());
}

// ── 4. WEBHOOK / CALLBACK HANDLER FOR STAGING BOT ───────────────
function doPost(e) {
  if (!e || !e.postData) return HtmlService.createHtmlOutput('OK');
  try {
    const update = JSON.parse(e.postData.contents);

    // Handle button taps (Approve / Reject)
    if (update.callback_query) {
      handleStagingCallback(update.callback_query);
    }
  } catch (err) {
    Logger.log('doPost error: ' + err.message);
  }
  return HtmlService.createHtmlOutput('OK');
}

function handleStagingCallback(cb) {
  const data = cb.data;
  const isPhoto = !!(cb.message && (cb.message.photo || cb.message.caption));
  const currentText = isPhoto ? cb.message.caption : cb.message.text;

  if (data.indexOf('test_approve') === 0) {
    // 1. Remove buttons and append confirmation
    finishStagingReviewMessage(cb.message.chat.id, cb.message.message_id, currentText + '\n\n✅ POSTED to EN + JP + RU + DE (Staging Simulated)', isPhoto);
    answerStagingCallback(cb.id, '✅ Approved! Simulated broadcast to 4 channels.');
  } else if (data.indexOf('test_reject') === 0) {
    // 1. Remove buttons and append rejection
    finishStagingReviewMessage(cb.message.chat.id, cb.message.message_id, currentText + '\n\n❌ REJECTED', isPhoto);
    answerStagingCallback(cb.id, '❌ Rejected.');
  }
}

// ── 5. CAPTION TRUNCATION SAFETY HELPER (1,024 LIMIT) ───────────
function truncateCaptionSafe(text, maxLen) {
  maxLen = maxLen || 1024;
  if (!text || text.length <= maxLen) return text;

  const sep = '――――――――――';
  const sepIdx = text.lastIndexOf(sep);

  if (sepIdx > 0) {
    const tail = text.slice(sepIdx);
    const connector = '\n…\n';
    if (tail.length < maxLen - 20) {
      const body = text.slice(0, sepIdx);
      const budget = maxLen - tail.length - connector.length;
      let cut = Math.min(budget, body.length);
      const slice = body.slice(0, cut);
      const lastBreak = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
      if (lastBreak > budget * 0.6) cut = lastBreak;
      
      // Surrogate pair protection
      if (body.charCodeAt(cut - 1) >= 0xD800 && body.charCodeAt(cut - 1) <= 0xDBFF) cut--;
      
      const trimmedBody = body.slice(0, cut).trimEnd();
      const res = trimmedBody + connector + tail;
      if (res.length <= maxLen) return res;
    }
  }

  const connector = '…';
  const budget = maxLen - connector.length;
  let cut = Math.min(budget, text.length);
  const slice = text.slice(0, cut);
  const lastBreak = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf(' '));
  if (lastBreak > budget * 0.6) cut = lastBreak;
  if (text.charCodeAt(cut - 1) >= 0xD800 && text.charCodeAt(cut - 1) <= 0xDBFF) cut--;
  return text.slice(0, cut).trimEnd() + connector;
}

// ── 6. TELEGRAM API UTILITIES ───────────────────────────────────
function sendTelegramPhotoStaging(chatId, photoUrl, caption, replyMarkup) {
  const safeCaption = truncateCaptionSafe(caption, 1024);
  const payload = {
    chat_id: String(chatId),
    photo: photoUrl,
    caption: safeCaption,
  };
  if (replyMarkup) payload.reply_markup = JSON.stringify(replyMarkup);

  const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + STAGING_BOT_TOKEN + '/sendPhoto', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    muteHttpExceptions: true,
  });

  const data = JSON.parse(resp.getContentText());
  Logger.log('sendTelegramPhotoStaging: ' + resp.getContentText());
  return data.result;
}

function finishStagingReviewMessage(chatId, messageId, newText, hasPhoto) {
  const url = 'https://api.telegram.org/bot' + STAGING_BOT_TOKEN + '/' + (hasPhoto ? 'editMessageCaption' : 'editMessageText');
  const safeText = hasPhoto ? truncateCaptionSafe(newText, 1024) : newText;
  const payload = {
    chat_id: String(chatId),
    message_id: String(messageId),
    reply_markup: JSON.stringify({ inline_keyboard: [] }),
  };
  payload[hasPhoto ? 'caption' : 'text'] = safeText;

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    muteHttpExceptions: true,
  });
}

function answerStagingCallback(callbackQueryId, text) {
  UrlFetchApp.fetch('https://api.telegram.org/bot' + STAGING_BOT_TOKEN + '/answerCallbackQuery', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: { callback_query_id: callbackQueryId, text: text },
    muteHttpExceptions: true,
  });
}

// Helper to inspect updates / find channel IDs
function getStagingBotUpdates() {
  const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + STAGING_BOT_TOKEN + '/getUpdates');
  Logger.log(resp.getContentText());
  return JSON.parse(resp.getContentText());
}
