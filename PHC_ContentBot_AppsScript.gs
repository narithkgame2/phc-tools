// ═══════════════════════════════════════════════════════════════
//  PHC Content Bot — Listing detection + multi-language distribution
//
//  Flow: forward a listing post (from e.g. t.me/REAKHchinese) to
//  this bot in your private chat → bot detects it's a listing
//  (#ForSale / #ForRent), extracts the fields, rebuilds it in PHC's
//  template for EN/JP/DE (photo carried over, JP/DE translated via
//  Apps Script's built-in free translator) → sends all 3 to you for
//  Approve/Reject → on approve, posts to that language's channel.
//
//  You can also still add a row manually to the Queue sheet
//  (language + content) and use "Send New Content for Review" from
//  the menu — both paths share the same review/approval mechanism.
//
//  Uses POLLING (checkForUpdates, on a 1-minute trigger), not a
//  webhook — Google Apps Script Web App URLs always 302-redirect to
//  script.googleusercontent.com to serve their response, and
//  Telegram's webhook caller does not follow redirects. Polling
//  sidesteps that entirely since it's Apps Script calling Telegram,
//  not the other way around.
//
//  HOW TO DEPLOY:
//  1. Open the "PHC Content Queue" Google Sheet
//  2. Extensions → Apps Script → paste this entire file
//  3. Project Settings (⚙) → Script Properties → add:
//     BOT_TOKEN = <your bot token from BotFather>
//  4. Run initializeAll() once (creates the Queue tab)
//  5. Run migrateQueueSchema() once (adds the photoFileId column —
//     safe to run even on a brand-new sheet)
//  6. Run installTriggers() once (starts checking every minute —
//     no Web App deployment needed for this part)
// ═══════════════════════════════════════════════════════════════

// ── Config ────────────────────────────────────────────────
const REVIEWER_CHAT_ID = '353195979'; // Nick's personal Telegram chat — approval requests go here

// Map each language to its public channel's Chat ID.
// EN points at t.me/PHC_EN — a separate pilot channel, NOT the live
// client-facing t.me/PropertyHubCambodia. Swap this to PropertyHubCambodia's
// real Chat ID once ready to go live for real.
const LANGUAGE_CHANNELS = {
  EN: '-1004394035989', // t.me/PHC_EN (pilot — not the live PropertyHubCambodia channel)
  JP: '-1003986315402', // t.me/PHC_JP (renamed from the old pilot TEST channel)
  RU: '-1003704439031', // t.me/PHC_RU
  DE: '-1004434464190', // t.me/PHC_DE
};

// Contact block appended to every listing, per PHC's ChatGPT listing prompt.
// Never carry over a source agent's own contact info. Includes the main
// channel link as plain text since getContactKeyboard()'s "More Property"
// button now points to the website, not the Telegram channel — this is the
// only place the channel link still shows up.
const CONTACT_STANDARD = '📞 011 666 952\n📱 t.me/PropertyHubCambodia';

// Each channel's "Contact Us" opens a direct Telegram chat with the person
// in charge of that audience — not a shared WhatsApp line — so replies come
// from the right staff member with no extra bot hop for the client.
const CHANNEL_CONTACT_PERSON = {
  EN: 'Monika_PHC',
  JP: 'Nick_REAKH',
  RU: 'Monika_PHC',
  DE: 'RAZ_360',
};

// 2 buttons for every listing — "Contact Us" routes to the channel's owner
// on Telegram, "More Property" links to the website. channelTag (e.g.
// 'EN'/'JP'/'RU'/'DE') selects who "Contact Us" points to; falls back to
// Monika if an unrecognized/missing tag is passed.
function getContactKeyboard(channelTag) {
  const contactUsername = CHANNEL_CONTACT_PERSON[channelTag] || CHANNEL_CONTACT_PERSON.EN;
  return { inline_keyboard: [[
    { text: '📱 Contact Us', url: 'https://t.me/' + contactUsername },
    { text: '🌐 More Property', url: 'https://propertyhubcambodia.com' },
  ]] };
}

const SHEET_NAME = 'Queue';
const HEADERS = ['id', 'createdAt', 'language', 'content', 'status', 'reviewMsgId', 'postedMsgId', 'postedAt', 'photoFileId', 'listingType', 'entities'];

// ── Polling — checks Telegram for new messages/button taps every minute ─

function checkForUpdates() {
  const token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  const props = PropertiesService.getScriptProperties();
  const lastOffset = Number(props.getProperty('LAST_UPDATE_OFFSET') || '0');

  // allowed_updates must be listed explicitly to receive message_reaction_count —
  // Telegram omits reaction updates by default unless a bot opts in. Specifying
  // this list REPLACES the default set, so every update type the bot relies on
  // elsewhere (message, callback_query, channel_post) has to be included too.
  const allowedUpdates = encodeURIComponent(JSON.stringify(['message', 'callback_query', 'channel_post', 'message_reaction_count']));
  const resp = UrlFetchApp.fetch(
    'https://api.telegram.org/bot' + token + '/getUpdates?offset=' + (lastOffset + 1) + '&timeout=0&allowed_updates=' + allowedUpdates,
    { muteHttpExceptions: true }
  );
  const data = JSON.parse(resp.getContentText());
  if (!data.ok) { Logger.log('getUpdates failed: ' + resp.getContentText()); return; }
  Logger.log('Fetched ' + data.result.length + ' update(s), offset=' + (lastOffset + 1));
  if (!data.result.length) return;

  // Multi-photo listings arrive as an "album" — each photo as its own message,
  // all sharing the same media_group_id, usually only one of them carrying the
  // caption. Group them within this batch before processing.
  const mediaGroups = {}; // media_group_id -> { chatId, captionText, captionEntities, photoIds: [], isForwarded, sourceUsername }
  const singleMessages = [];

  data.result.forEach(update => {
    if (update.callback_query) {
      try { handleCallback(update.callback_query); }
      catch (err) { Logger.log('handleCallback error: ' + err); }
    } else if (update.channel_post) {
      // Posts made directly in a channel the bot administers (not sent to the
      // bot's private chat) — logged so a channel's Chat ID can be read off
      // once the bot is added as admin and any message is posted there.
      const cp = update.channel_post;
      Logger.log('channel_post: chat.id=' + cp.chat.id + ' title="' + cp.chat.title + '" username="' + (cp.chat.username || '') + '" text="' + (cp.text || cp.caption || '') + '"');
    } else if (update.message_reaction_count) {
      try { handleReactionUpdate(update.message_reaction_count); }
      catch (err) { Logger.log('handleReactionUpdate error: ' + err); }
    } else if (update.message) {
      const m = update.message;
      if (m.reply_to_message && String(m.chat.id) === REVIEWER_CHAT_ID && looksLikeStatusKeyword(m.text)) {
        // Nick replying "SOLD" / "RENTED" / etc. directly to a listing's review
        // message — update the already-posted channel messages in place.
        try { handleStatusReply(m.chat.id, m.text, m.reply_to_message.message_id); }
        catch (err) { Logger.log('handleStatusReply error: ' + err); }
      } else if (m.poll) {
        try { handleIncomingPoll(m.chat.id, m.poll); }
        catch (err) { Logger.log('handleIncomingPoll error: ' + err); }
      } else if (m.media_group_id) {
        const gid = m.media_group_id;
        if (!mediaGroups[gid]) mediaGroups[gid] = { chatId: m.chat.id, captionText: '', captionEntities: null, photoIds: [], isForwarded: false, sourceUsername: null };
        const photoId = getLargestPhotoId(m);
        if (photoId) mediaGroups[gid].photoIds.push(photoId);
        if (m.caption) { mediaGroups[gid].captionText = m.caption; mediaGroups[gid].captionEntities = getMessageEntities(m); }
        if (isMessageForwarded(m)) mediaGroups[gid].isForwarded = true;
        const srcU = getForwardSourceUsername(m);
        if (srcU) mediaGroups[gid].sourceUsername = srcU;
      } else {
        singleMessages.push(m);
      }
    }
    props.setProperty('LAST_UPDATE_OFFSET', String(update.update_id));
  });

  singleMessages.forEach(m => {
    try {
      const photoId = getLargestPhotoId(m);
      handleIncomingMessage(m.chat.id, m.caption || m.text || '', photoId ? [photoId] : [], isMessageForwarded(m), getForwardSourceUsername(m), getMessageEntities(m));
    } catch (err) { Logger.log('handleIncomingMessage error: ' + err); }
  });

  Object.keys(mediaGroups).forEach(gid => {
    const g = mediaGroups[gid];
    try { handleIncomingMessage(g.chatId, g.captionText, g.photoIds, g.isForwarded, g.sourceUsername, g.captionEntities); }
    catch (err) { Logger.log('handleIncomingMessage(group) error: ' + err); }
  });
}

function isMessageForwarded(m) {
  return !!(m.forward_origin || m.forward_from || m.forward_from_chat || m.forward_sender_name);
}

// Username of the channel a message was forwarded from, if any (covers both
// the older forward_from_chat shape and the newer forward_origin shape).
function getForwardSourceUsername(m) {
  if (m.forward_from_chat && m.forward_from_chat.username) return m.forward_from_chat.username;
  if (m.forward_origin) {
    if (m.forward_origin.chat && m.forward_origin.chat.username) return m.forward_origin.chat.username;
    if (m.forward_origin.sender_chat && m.forward_origin.sender_chat.username) return m.forward_origin.sender_chat.username;
  }
  return null;
}

// Nick's own channel where he posts already-final listings — forwards from
// here skip reformatting entirely and only get translated.
const OWN_CHANNEL_USERNAME = 'NickREAKH';

// ── Claude API fallback — for listing formats none of the 3 hardcoded
//    parsers recognize (arbitrary layouts from other agents' channels).
//    Requires a CLAUDE_API_KEY Script Property; if missing, this step is
//    skipped entirely and the bot falls back to the old "couldn't
//    recognize" message. See deploy notes for how to add the key.

const CLAUDE_MODEL = 'claude-haiku-4-5';

const CLAUDE_LISTING_SYSTEM_PROMPT =
  "You convert messy real estate listing text into Property Hub Cambodia's standard listing format. " +
  "Output ONLY the reformatted listing — no preamble, no explanation, no markdown code fences.\n\n" +
  "Format exactly:\n" +
  "#ForSale $<price>\n" +
  "(or #ForRent $<price>/month — use whichever applies. Include only the one that applies.)\n\n" +
  "<PROJECT NAME> | <UNIT TYPE>\n\n" +
  "――――――――――\n\n" +
  "UNIT DETAILS\n" +
  "✅ <fact from the source text>\n" +
  "✅ <fact from the source text>\n" +
  "(one bullet per fact — floor, size, bedrooms, price breakdown, etc.)\n\n" +
  "Strict rules:\n" +
  "- Extract exact numbers from the source. Never estimate, round, or invent a price, size, floor, or bedroom count.\n" +
  "- If the source has no clear price, omit the #ForSale/#ForRent line entirely rather than guessing.\n" +
  "- Never include phone numbers, WhatsApp, Telegram links, or any contact info from the source — omit them completely.\n" +
  "- Title format is 'NAME | TYPE', e.g. 'TIME SQUARE 5 | 1BR UNIT'.\n" +
  "- If the source text isn't a property listing at all, output exactly: NOT_A_LISTING";

// Returns reformatted listing text, or null if the API key is missing, the
// call fails, or the model determined the input wasn't a listing at all.
function reformatViaClaudeAPI(text) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  if (!apiKey) return null;

  const payload = {
    model: CLAUDE_MODEL,
    max_tokens: 800,
    system: CLAUDE_LISTING_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  };

  const resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  if (resp.getResponseCode() !== 200) {
    Logger.log('reformatViaClaudeAPI failed: ' + resp.getContentText());
    return null;
  }

  const data = JSON.parse(resp.getContentText());
  if (data.stop_reason === 'refusal' || !data.content || !data.content.length) return null;

  const reformatted = data.content[0].text.trim();
  if (reformatted === 'NOT_A_LISTING') return null;
  return reformatted;
}

// Telegram Premium custom emoji are a plain fallback char + an invisible
// "entity" (offset/length/custom_emoji_id) layered on top — not part of the
// text itself. Only valid to reuse when the text is sent byte-identical to
// the original (any reconstruction shifts character positions and breaks it).
function getMessageEntities(m) {
  return m.caption_entities || m.entities || null;
}

// ── Incoming message handling (listing detection) ──────────────────

function handleIncomingMessage(chatId, text, photoFileIds, isForwarded, sourceUsername, originalEntities) {
  if (String(chatId) !== REVIEWER_CHAT_ID) return; // only from you, in your private chat with the bot

  // Anything forwarded straight from your own channel is trusted outright —
  // no hashtag/shape check at all. It's not always a single-property listing
  // (e.g. multi-project promo posts, announcements) so it can't be forced
  // through the UNIT DETAILS/FEATURES bullet parser, which assumes one fixed
  // schema. Whole-block translate preserves whatever structure it actually has.
  const isFromOwnChannel = sourceUsername && sourceUsername.toLowerCase() === OWN_CHANNEL_USERNAME.toLowerCase();

  let fields, assembleFn;
  if (isFromOwnChannel) {
    fields = null;
    assembleFn = null; // handled directly below via translateWholeText
  } else {
    // Three source formats supported for everything else: our own
    // #ForSale/#ForRent/#NewProject template (e.g. output from the ChatGPT
    // formatting step); a foreign-language listing (e.g. Chinese, from
    // someone else's channel) — detected by CJK characters plus a dollar
    // amount, since it won't have our hashtag; or another agent's own
    // English-language format using a "[FOR RENT]"/"[FOR SALE]" bracket tag
    // instead of our hashtag (e.g. content shared in from other channels).
    let hasOwnHashtag = /#ForSale|#ForRent|#NewProject/i.test(text);
    let hasForeignListing = /[一-鿿]/.test(text) && /\$[\d,]+/.test(text);
    let hasBracketTag = /\[\s*for\s+(sale|rent)\s*\]/i.test(text);
    let hasFreeformListing = !hasOwnHashtag && !hasForeignListing && !hasBracketTag && hasListingVocabulary(text);

    if (!hasOwnHashtag && !hasForeignListing && !hasBracketTag && !hasFreeformListing) {
      // None of the 4 known shapes matched — try the Claude API fallback
      // before giving up. It only activates if CLAUDE_API_KEY is set; if the
      // key's missing or the call fails, this is a silent no-op and control
      // falls through to the "couldn't recognize" message below unchanged.
      const reformatted = reformatViaClaudeAPI(text);
      if (reformatted) {
        text = reformatted;
        hasOwnHashtag = /#ForSale|#ForRent|#NewProject/i.test(text);
      }
    }

    if (!hasOwnHashtag && !hasForeignListing && !hasBracketTag && !hasFreeformListing) {
      // Only speak up if this looked like an attempted listing (has a photo, or
      // was forwarded) — stay silent for plain chat like "hi" so the bot isn't noisy.
      const looksLikeAttemptedListing = (photoFileIds && photoFileIds.length > 0) || isForwarded;
      if (looksLikeAttemptedListing) {
        sendTelegramMessage(REVIEWER_CHAT_ID,
          "🤔 I couldn't recognize this as a listing — no #ForSale, #ForRent, or #NewProject tag found.\n\n" +
          "If this was meant to be a listing, run it through ChatGPT first using PHC's listing format rules, then forward the result here.");
      }
      return;
    }

    // Contact info is only ever trusted from a genuine t.me/NickREAKH forward
    // (handled above) — text that merely LOOKS like your template but was
    // pasted, not forwarded, still gets fully rebuilt so its contact info
    // can't slip through unreplaced.
    if (hasOwnHashtag) {
      fields = parseListingText(text);
      assembleFn = assembleListing;
    } else if (hasBracketTag) {
      fields = parseBracketListing(text);
      assembleFn = assembleListing;
    } else if (hasForeignListing) {
      fields = parseChineseListingText(text);
      assembleFn = assembleListing;
    } else {
      fields = parseFreeformListing(text);
      assembleFn = assembleListing;
    }
  }

  const sourceId = 'L' + Date.now();
  const sheet = getQueueSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const photoJson = photoFileIds && photoFileIds.length ? JSON.stringify(photoFileIds) : '';
  const photoCount = photoFileIds ? photoFileIds.length : 0;

  sendTelegramMessage(REVIEWER_CHAT_ID, '📥 Listing detected (' + photoCount + ' photo' + (photoCount === 1 ? '' : 's') + ') — generating EN/JP/RU/DE versions for your review...');

  ['EN', 'JP', 'RU', 'DE'].forEach(lang => {
    let content;
    if (isFromOwnChannel) {
      // EN: send the ORIGINAL text byte-for-byte (no reconstruction) so any
      // Premium custom-emoji entities stay valid. JP/DE: whole-block translate —
      // this content isn't guaranteed to match the single-listing bullet schema,
      // so there's nothing to structurally parse; translating the full text as
      // one unit is the only approach that works for arbitrary layouts.
      content = lang === 'EN' ? text : translateWholeText(text, lang);
    } else {
      content = assembleFn(fields, lang);
    }
    // Entities only carry over for the EN row when text is untouched — any
    // reconstruction (translation included) shifts character positions.
    const rowEntities = (isFromOwnChannel && lang === 'EN' && originalEntities) ? JSON.stringify(originalEntities) : '';

    const rowNum = sheet.getLastRow() + 1;
    const row = headers.map(h => {
      if (h === 'id') return sourceId + '-' + lang;
      if (h === 'createdAt') return new Date().toISOString();
      if (h === 'language') return lang;
      if (h === 'content') return content;
      if (h === 'photoFileId') return photoJson;
      if (h === 'entities') return rowEntities;
      return '';
    });
    sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
  });

  // One review message covering all 3 languages — approving posts to all 3
  // channels at once (they're the same listing, just translated).
  sendCombinedReviewMessage(sheet, headers, sourceId, photoFileIds);
}

// Reads the photoFileId cell, which may be a JSON array (multi-photo) or,
// for rows created before multi-photo support, a single plain file_id string.
function parsePhotoIds(cellValue) {
  if (!cellValue) return [];
  try {
    const parsed = JSON.parse(cellValue);
    return Array.isArray(parsed) ? parsed : [cellValue];
  } catch (e) {
    return [cellValue];
  }
}

// ── Listing parsing (source → raw fields, unclassified bullets) ────────
//
//   Matches PHC's actual ChatGPT listing prompt: ONE unified structure for
//   every listing type (For Sale / For Rent / Promotion / Resale / etc. —
//   ChatGPT picks the right content, but the output shape is always the
//   same). Bullets carry their own icon: ✅ for details/features, or one of
//   💧⚡🚗💼 for the optional utilities section — so bucketing is based on
//   the icon actually used, not guessed from keywords.

function parseListingText(text) {
  const plainText = fromBoldSansSerif(text);
  const lines = text.split('\n').map(l => l.trim());
  const plainLines = plainText.split('\n').map(l => l.trim());

  let forSale = '', forRent = '', title = '', location = '';
  const bullets = []; // { icon, text }
  let seenBullet = false;
  const bulletIcons = ['✅', '💧', '⚡', '🚗', '💼'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const plain = plainLines[i];
    if (!line) continue;

    // Price line(s) — either on separate lines, or combined as
    // "#ForSale $X | #ForRent $Y/month" on one line.
    if (/#ForSale/i.test(plain)) {
      const m = line.match(/#ForSale\s*(\$[\d,]+)/i);
      if (m) forSale = m[1];
    }
    if (/#ForRent/i.test(plain)) {
      const m = line.match(/#ForRent\s*(\$[\d,]+(?:\/\S+)?)/i);
      if (m) forRent = m[1];
    }
    if (/#ForSale|#ForRent/i.test(plain)) continue;

    if (line.startsWith('📍')) { location = line.replace('📍', '').trim(); continue; }
    if (/^[―\-_=]{3,}$/.test(line)) continue; // divider
    if (/^[A-Z\s]{3,}$/.test(plain) && !bulletIcons.some(ic => line.startsWith(ic))) continue; // skip section labels (UNIT DETAILS, FEATURES, etc.)
    if (line.startsWith('📞')) break; // contact block — stop parsing, we use our own contact info

    const icon = bulletIcons.find(ic => line.startsWith(ic));
    if (icon) {
      seenBullet = true;
      bullets.push({ icon, text: line.slice(icon.length).trim() });
      continue;
    }
    if (line.includes('|') && !title && !seenBullet) { title = line; continue; }
  }

  return { forSale, forRent, title, location, bullets, sourceLang: 'en' };
}

// ── Foreign-language listing parsing (e.g. Chinese source channels) ────
//
//   Different structure from our own template: 🏢 title line, 💰/📍/📐
//   labeled fields, ✅/⚡/💧/🚙-prefixed bullets, no #ForSale hashtag,
//   contact block always replaced with our own (never carry over a
//   competitor's contact info).

function stripLeadingSymbols(line) {
  return line.replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

function parseChineseListingText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let rawTitle = '', priceValue = '', isRent = false, location = '', area = '';
  const bullets = []; // { icon, text }
  let pastFeatures = false;
  const utilityIcons = ['💧', '⚡', '🚗', '🚙', '💼'];

  lines.forEach((line, idx) => {
    if (idx === 0) { rawTitle = line; return; }
    if (/出租/.test(line)) isRent = true;
    if (/💰|转售价格|售价|租金|价格/.test(line)) {
      const m = line.match(/\$[\d,]+(?:\/[^\s]+)?/);
      if (m) priceValue = m[0];
      return;
    }
    if (line.startsWith('📍')) { location = stripLeadingSymbols(line.replace(/位置[:：]?/, '')); return; }
    if (line.startsWith('📐')) { area = stripLeadingSymbols(line.replace(/面积[:：]?/, '')); return; }
    if (line.startsWith('📎') || /^在线咨询|^微信号|^电话|t\.me\//.test(line)) { pastFeatures = true; return; }
    if (pastFeatures) return;

    const utilityIcon = utilityIcons.find(ic => line.startsWith(ic));
    const content = stripLeadingSymbols(line);
    if (content) bullets.push({ icon: utilityIcon === '🚙' ? '🚗' : (utilityIcon || '✅'), text: content });
  });

  const titleClean = stripLeadingSymbols(rawTitle);
  const titleParts = titleClean.split(/[｜|]/).map(s => s.trim()).filter(Boolean);
  if (area) bullets.unshift({ icon: '✅', text: area });

  return {
    forSale: !isRent ? priceValue : '',
    forRent: isRent ? priceValue : '',
    title: titleParts.join(' | '),
    location,
    bullets,
    sourceLang: 'zh',
  };
}

// ── Bracket-tag listing parsing (other agents' own English format) ─────
//
//   e.g. "[FOR RENT] 1BR at TS 306" then "●"-prefixed bullets, one of which
//   is a "Price: 700$ | Month" line — promoted into the forSale/forRent
//   field like our own template's price line. Contact info (phone, t.me
//   link) at the end is discarded — never carry over another agent's own
//   contact details, matches the same rule used for Chinese-source listings.

function parseBracketListing(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let forSale = '', forRent = '', title = '', isRent = false;
  const bullets = [];
  // Bullet markers seen in the wild across different agents' own formats —
  // not just the plain dots (●•◦‣) PHC originally expected, but the emoji
  // checkmarks/money-bag markers other agents commonly use too.
  const bulletChars = ['●', '•', '◦', '‣', '✅', '✓', '☑️', '☑', '💰', '🏷️', '🏷', '👉', '▪️', '▪', '■', '★'];

  // The [FOR SALE]/[FOR RENT] tag isn't always the first line — some posts
  // lead with a headline before it (e.g. "Stunning 1-Bedroom Condo ✨" then
  // "[For Rent] 1Bedroom at Vue Aston" on the next line). Find the tag
  // wherever it actually is instead of assuming line 0.
  let tagLineIdx = -1, tagMatch = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\[\s*for\s+(sale|rent)\s*\]/i);
    if (m) { tagLineIdx = i; tagMatch = m; break; }
  }

  if (tagLineIdx > -1) {
    isRent = /rent/i.test(tagMatch[1]);
    const headline = lines.slice(0, tagLineIdx).join(' — ').trim();
    const afterTag = lines[tagLineIdx].replace(tagMatch[0], '').trim();
    title = [headline, afterTag].filter(Boolean).join(' — ');
  } else {
    // No tag found at all — fall back to the old assumption (line 0 is the
    // title) rather than losing everything.
    title = lines[0] || '';
  }

  lines.forEach((line, idx) => {
    if (idx <= tagLineIdx) return; // already consumed as headline/tag above

    const bulletChar = bulletChars.find(c => line.startsWith(c));
    if (!bulletChar) return; // contact block / anything else — discard

    const content = line.slice(bulletChar.length).trim();
    // Price lines: either explicitly labelled ("Price: ...") or marked with
    // a money-bag bullet, or phrased as "Only $X ...".
    if (/^price\s*:?/i.test(content) || bulletChar.indexOf('💰') === 0 || /^only\s/i.test(content)) {
      const amt = content.match(/[\d,]+/);
      if (amt) {
        const period = /month|\bmo\b/i.test(content) ? '/month' : '';
        const priceStr = '$' + amt[0] + period;
        if (isRent) forRent = priceStr; else forSale = priceStr;
      }
      return;
    }
    bullets.push({ icon: '✅', text: content });
  });

  return { forSale, forRent, title, location: '', bullets, sourceLang: 'en' };
}

// ── Freeform listing parsing (no tag at all — recognized by vocabulary) ──
//
//   Some agents post plain "Label Value" lines with no #hashtag, no [FOR
//   RENT] bracket, no bullet markers at all — just recognizable real-estate
//   words (bedroom, floor, size, price...) plus a dollar amount. Detected by
//   keyword density rather than any tag, so it stays free (no API call).

function hasListingVocabulary(text) {
  const wordKeywords = text.match(/\b(bedrooms?|bathrooms?|studios?|floors?|size|furnitur\w*|furnish\w*|balcon\w*|units?)\b/gi) || [];
  // "sqm" has no word boundary before it in e.g. "60sqm" (digit + letter are
  // both \w chars) — matched separately, without requiring a leading \b.
  const areaKeywords = text.match(/sq\.?\s?m(?:eter|etre)?s?\b/gi) || [];
  // Price can appear as "$130,000" or "130,000$" — both conventions have shown up.
  const hasDollarAmount = /\$\s?[\d,]{3,}|[\d,]{3,}\s?\$/.test(text);
  return (wordKeywords.length + areaKeywords.length) >= 2 && hasDollarAmount;
}

// Strips Khmer-script words (Unicode block U+1780–U+17FF, also covers the
// ៛ Riel symbol) from a line that duplicates the same fact in English —
// common in Cambodian listings ("Floor : 7th | ជាន់ទី 07"). Leaves any
// digits/Latin text in the Khmer segment alone (can't tell duplicate numbers
// apart from the English ones), so cleanup is best-effort, not perfect —
// but it's a large readability improvement over leaving raw Khmer script in
// a bullet that then gets machine-translated to JP/RU/DE.
function stripKhmerDuplicateText(line) {
  return line
    .replace(/[ក-៿]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s|/]+$/, '')
    .trim();
}

function parseFreeformListing(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const contactLineRegex = /📞|📱|🌐|🔥|whatsapp|telegram|t\.me\/|facebook\.com|https?:\/\/|contact for viewing|\btel\s*[:.]|\bphone\s*[:.]|\bhotline\b|\bcall\s*[:.]/i;
  const isRentOverall = /\brent\b|\/month|\bmonthly\b/i.test(text);

  let forSale = '', forRent = '', title = '';
  const bullets = [];
  let titleFound = false;

  lines.forEach(rawLine => {
    // Strip Khmer duplicate text first, then any leading bullet/emoji marker
    // (⁃, -, ➡️, ✅, etc.) — our own template adds its own ✅ icon on assembly,
    // so a leftover source marker would just double up visually.
    const line = stripLeadingSymbols(stripKhmerDuplicateText(rawLine));
    if (!line) return;
    if (contactLineRegex.test(line)) return; // never carry over another agent's contact info

    if (/\b(price|rental|rent)\b/i.test(line) && /[\d,]+/.test(line)) {
      const amt = line.match(/[\d,]+/);
      if (amt) {
        const priceStr = '$' + amt[0] + (isRentOverall ? '/month' : '');
        if (isRentOverall) forRent = priceStr; else forSale = priceStr;
      }
      return;
    }

    if (!titleFound) { title = line; titleFound = true; return; }
    bullets.push({ icon: '✅', text: line });
  });

  return { forSale, forRent, title, location: '', bullets, sourceLang: 'en' };
}

// ── Bullet bucketing — one unified structure for every listing type ────
//
//   ✅ bullets split into Unit Details vs Features by content (structural
//   facts vs marketing points). Utility-icon bullets (💧⚡🚗💼) always go
//   into their own Utilities section, keeping their original icon instead
//   of ✅ — only included at all if the source actually had any.

function classifyBullet(text) {
  const featureHints = /investment|opportunit|afforda|prime|rental demand|ideal for|luxury|convenien|walk|near|close to|high floor|city view|swimming|pool|gym|fitness|amenit|move-?in|modern|resale|urgent|reduced/i;
  return featureHints.test(text) ? 'features' : 'details';
}

function bucketListing(bullets) {
  const details = [], features = [], utilities = [];
  bullets.forEach(b => {
    if (b.icon === '✅') {
      (classifyBullet(b.text) === 'features' ? features : details).push(b);
    } else {
      utilities.push(b);
    }
  });
  const sections = [['UNIT DETAILS', details], ['FEATURES', features]];
  if (utilities.length) sections.push(['UTILITIES', utilities]);
  return sections;
}

// ── Final assembly — translate + apply the unified template shape ──────

function translateField(text, sourceLang, lang) {
  if (!text) return text;
  const targetCode = { EN: 'en', JP: 'ja', RU: 'ru', DE: 'de' }[lang];
  if (sourceLang === 'en' && lang === 'EN') return text; // already English, no-op
  try {
    // Google's translator often leaves short ALL-CAPS phrases untouched
    // (reads them as acronyms/labels, not text) — e.g. "PROJECTS FEATURED"
    // and "PAYMENT PLAN" came back unchanged while normal sentences
    // translated fine. Lowercase before translating, then re-uppercase the
    // result — sentence-case text translates reliably; still displays in caps.
    const isAllCaps = text === text.toUpperCase() && text !== text.toLowerCase();
    const toTranslate = isAllCaps ? text.toLowerCase() : text;
    const translated = LanguageApp.translate(toTranslate, sourceLang, targetCode);
    return isAllCaps ? translated.toUpperCase() : translated;
  } catch (err) {
    Logger.log('translate error: ' + err);
    return text; // fall back to source text if translation fails — better than a broken post
  }
}

// Translates content forwarded from your own channel that doesn't match the
// single-listing bullet/section schema (promo posts, announcements, etc.).
// Translates LINE BY LINE rather than as one big block — sending the whole
// multi-paragraph text in a single call lets the translator take liberties
// with structure. Per-line keeps each header/bullet anchored to its own line.
function translateWholeText(text, lang) {
  if (lang === 'EN' || !text) return text;
  return text.split('\n').map(line => {
    if (!line.trim()) return line;
    // Headers use literal bold Unicode characters (the same 𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘-style
    // trick as your regular listings) — those glyphs aren't real Latin letters,
    // so Google's translator either drops them or returns garbage for that
    // line (confirmed via Execution log: "PROJECTS FEATURED" → "印刷物",
    // "printed matter" — nonsense). Convert to plain ASCII before translating,
    // then reapply bold styling to the result if the original line had it.
    const plainLine = fromBoldSansSerif(line);
    const wasBold = plainLine !== line;
    const translated = translateField(plainLine, 'en', lang);
    return wasBold ? toBoldSansSerif(translated) : translated;
  }).join('\n');
}

function assembleListing(fields, lang) {
  // Bucketing classifies on ENGLISH text always — normalize to EN first
  // regardless of source or target language, then translate each already-
  // classified bullet for display. Otherwise JP/DE output (and any
  // zh-sourced listing, even in EN) silently loses its section structure,
  // since the classifier never matches non-English text.
  const toEn = (s) => s ? translateField(s, fields.sourceLang, 'EN') : s;
  const toLang = (enText) => (lang === 'EN' || !enText) ? enText : translateField(enText, 'en', lang);

  const titleEn = fields.sourceLang === 'zh' ? toEn(fields.title) : fields.title; // project names in our own template stay as-is
  const locationEn = fields.location ? toEn(fields.location) : '';
  const bulletsEn = fields.bullets.map(b => ({ icon: b.icon, text: toEn(b.text) }));

  const sections = bucketListing(bulletsEn); // classify on EN text — consistent structure across all languages

  // Project/place names are proper nouns — never machine-translate them, or
  // "TIME SQUARE 10" risks coming back garbled in JP/DE. Normalizing a zh
  // source's title/location to English (done above) is enough; after that,
  // keep as-is for every target language.
  const title = titleEn;
  const location = locationEn;
  const displaySections = sections.map(([header, items]) => [header, items.map(b => ({ icon: b.icon, text: toLang(b.text) }))]);

  let priceLine = '';
  if (fields.forSale) priceLine += '#ForSale ' + fields.forSale + '\n';
  if (fields.forRent) priceLine += '#ForRent ' + fields.forRent + '\n';

  let body = priceLine.trim() + '\n\n' + toBoldSansSerif(title) + '\n';
  if (location) body += '📍 ' + location + '\n';
  body += '\n――――――――――\n\n';
  displaySections.forEach(([header, items]) => {
    if (!items.length) return;
    body += toBoldSansSerif(header) + '\n' + items.map(b => b.icon + ' ' + b.text).join('\n') + '\n\n';
  });
  body += '――――――――――\n' + CONTACT_STANDARD;
  return body;
}

// ── Bold Sans-Serif Unicode helpers (𝗧𝗜𝗠𝗘 𝗦𝗤𝗨𝗔𝗥𝗘 style headers) ────
//
//   Mathematical Sans-Serif Bold block: A-Z starts at U+1D5D4,
//   a-z starts at U+1D5EE, 0-9 starts at U+1D7EC.

function toBoldSansSerif(str) {
  return str.split('').map(ch => {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + (code - 65));   // A-Z
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + (code - 97));  // a-z
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7EC + (code - 48));   // 0-9
    return ch;
  }).join('');
}

function fromBoldSansSerif(str) {
  return Array.from(str).map(ch => {
    const code = ch.codePointAt(0);
    if (code >= 0x1D5D4 && code <= 0x1D5ED) return String.fromCharCode(65 + (code - 0x1D5D4)); // A-Z
    if (code >= 0x1D5EE && code <= 0x1D607) return String.fromCharCode(97 + (code - 0x1D5EE)); // a-z
    if (code >= 0x1D7EC && code <= 0x1D7F5) return String.fromCharCode(48 + (code - 0x1D7EC)); // 0-9
    return ch;
  }).join('');
}

// ── Callback handling (Approve / Reject button taps) ──────────────

function handleCallback(cb) {
  const data = cb.data || ''; // "approve_<id>" / "reject_<id>" (single-row, manual Sheet entries) or "approveAll_<sourceId>" / "rejectAll_<sourceId>" (auto-detected listings)
  const sepIdx = data.indexOf('_');
  const action = sepIdx === -1 ? data : data.slice(0, sepIdx);
  const id = sepIdx === -1 ? '' : data.slice(sepIdx + 1);
  Logger.log('handleCallback: raw data="' + data + '" action="' + action + '" id="' + id + '"');

  if (action === 'approveAll' || action === 'rejectAll') {
    handleGroupCallback(cb, action, id);
    return;
  }
  if (action === 'pollApproveAll' || action === 'pollRejectAll') {
    handlePollGroupCallback(cb, action, id);
    return;
  }

  const sheet = getQueueSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIdx = headers.indexOf('id');
  const photoIdx = headers.indexOf('photoFileId');

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIdx]) !== String(id)) continue;

    const rowNum = i + 1;
    const rowObj = {};
    headers.forEach((h, c) => rowObj[h] = rows[i][c]);
    const photoIds = parsePhotoIds(photoIdx > -1 ? rowObj.photoFileId : '');
    Logger.log('handleCallback: found row ' + rowNum + ', status="' + rowObj.status + '", language="' + rowObj.language + '"');

    if (rowObj.status !== 'Pending Review') {
      answerCallback(cb.id, 'Already handled.');
      return;
    }

    if (action === 'approve') {
      const channelId = LANGUAGE_CHANNELS[rowObj.language];
      Logger.log('handleCallback: approving, channelId=' + channelId + ', photoIds=' + photoIds.length);
      if (!channelId) {
        answerCallback(cb.id, 'No channel configured for language: ' + rowObj.language);
        return;
      }
      const contactKeyboard = getContactKeyboard(rowObj.language);
      let posted;
      if (photoIds.length > 0) {
        posted = postGalleryWithButtons(channelId, photoIds, rowObj.content, contactKeyboard);
      } else {
        posted = sendTelegramMessage(channelId, rowObj.content, contactKeyboard);
      }
      Logger.log('handleCallback: post result=' + JSON.stringify(posted));
      const postedMsgId = Array.isArray(posted) ? (posted[0] && posted[0].message_id) : (posted && posted.message_id);
      sheet.getRange(rowNum, headers.indexOf('status') + 1).setValue('Posted');
      sheet.getRange(rowNum, headers.indexOf('postedMsgId') + 1).setValue(postedMsgId || '');
      sheet.getRange(rowNum, headers.indexOf('postedAt') + 1).setValue(new Date().toISOString());
      finishReviewMessage(cb.message.chat.id, cb.message.message_id, rowObj.content + '\n\n✅ POSTED to ' + rowObj.language, photoIds.length > 0);
      sendTelegramMessage(cb.message.chat.id, '✅ APPROVED — posted to ' + rowObj.language + ' (' + photoIds.length + ' photo' + (photoIds.length === 1 ? '' : 's') + '):\n"' + rowObj.content + '"');
      answerCallback(cb.id, 'Posted to ' + rowObj.language + '!');
    } else if (action === 'reject') {
      sheet.getRange(rowNum, headers.indexOf('status') + 1).setValue('Rejected');
      finishReviewMessage(cb.message.chat.id, cb.message.message_id, rowObj.content + '\n\n❌ REJECTED', photoIds.length > 0);
      sendTelegramMessage(cb.message.chat.id, '❌ REJECTED:\n"' + rowObj.content + '"');
      answerCallback(cb.id, 'Rejected.');
    }
    return;
  }
  answerCallback(cb.id, 'Row not found.');
}

// Handles "approveAll_<sourceId>" / "rejectAll_<sourceId>" — approving posts
// all 3 language rows sharing that sourceId to their channels in one tap.
function handleGroupCallback(cb, action, sourceId) {
  const sheet = getQueueSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIdx = headers.indexOf('id');
  const langIdx = headers.indexOf('language');
  const contentIdx = headers.indexOf('content');
  const statusIdx = headers.indexOf('status');
  const photoIdx = headers.indexOf('photoFileId');
  const entitiesIdx = headers.indexOf('entities');

  const matchingRows = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIdx]).indexOf(sourceId + '-') === 0) matchingRows.push(i + 1);
  }
  if (!matchingRows.length) { answerCallback(cb.id, 'Rows not found.'); return; }
  if (sheet.getRange(matchingRows[0], statusIdx + 1).getValue() !== 'Pending Review') {
    answerCallback(cb.id, 'Already handled.');
    return;
  }

  const hasPhoto = !!(cb.message.photo && cb.message.photo.length);
  const originalText = hasPhoto ? cb.message.caption : cb.message.text;

  if (action === 'approveAll') {
    matchingRows.forEach(rowNum => {
      const language = sheet.getRange(rowNum, langIdx + 1).getValue();
      const content = sheet.getRange(rowNum, contentIdx + 1).getValue();
      const photoIds = parsePhotoIds(photoIdx > -1 ? sheet.getRange(rowNum, photoIdx + 1).getValue() : '');
      const entitiesCell = entitiesIdx > -1 ? sheet.getRange(rowNum, entitiesIdx + 1).getValue() : '';
      let entities = null;
      if (entitiesCell) { try { entities = JSON.parse(entitiesCell); } catch (e) { entities = null; } }
      const channelId = LANGUAGE_CHANNELS[language];
      if (!channelId) { Logger.log('handleGroupCallback: no channel for ' + language); return; }
      const contactKeyboard = getContactKeyboard(language);

      let posted;
      if (photoIds.length > 0) {
        posted = postGalleryWithButtons(channelId, photoIds, content, contactKeyboard, entities);
      } else {
        posted = sendTelegramMessage(channelId, content, contactKeyboard, entities);
      }
      const postedMsgId = Array.isArray(posted) ? (posted[0] && posted[0].message_id) : (posted && posted.message_id);
      sheet.getRange(rowNum, statusIdx + 1).setValue('Posted');
      sheet.getRange(rowNum, headers.indexOf('postedMsgId') + 1).setValue(postedMsgId || '');
      sheet.getRange(rowNum, headers.indexOf('postedAt') + 1).setValue(new Date().toISOString());
    });
    finishReviewMessage(cb.message.chat.id, cb.message.message_id, originalText + '\n\n✅ POSTED to EN + JP + RU + DE', hasPhoto);
    answerCallback(cb.id, 'Posted to EN/JP/RU/DE!');
  } else {
    matchingRows.forEach(rowNum => sheet.getRange(rowNum, statusIdx + 1).setValue('Rejected'));
    finishReviewMessage(cb.message.chat.id, cb.message.message_id, originalText + '\n\n❌ REJECTED', hasPhoto);
    answerCallback(cb.id, 'Rejected.');
  }
}

// ── Polls — Nick sends a native Telegram poll to the bot, it gets
//    translated to EN/JP/RU/DE and posted as real polls in each channel,
//    same review/approve pattern as listings. ──────────────────────

function handleIncomingPoll(chatId, poll) {
  if (String(chatId) !== REVIEWER_CHAT_ID) return; // only from you, in your private chat with the bot

  const question = poll.question;
  const optionTexts = poll.options.map(o => o.text);

  sendTelegramMessage(REVIEWER_CHAT_ID, '📊 Poll detected — generating EN/JP/RU/DE versions for your review...');

  const sourceId = 'P' + Date.now();
  const sheet = getQueueSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  ['EN', 'JP', 'RU', 'DE'].forEach(lang => {
    const translatedQuestion = translateField(question, 'en', lang);
    const translatedOptions = optionTexts.map(t => translateField(t, 'en', lang));
    const content = JSON.stringify({
      question: translatedQuestion,
      options: translatedOptions,
      isAnonymous: poll.is_anonymous !== false,
      allowsMultiple: !!poll.allows_multiple_answers,
    });

    const rowNum = sheet.getLastRow() + 1;
    const row = headers.map(h => {
      if (h === 'id') return sourceId + '-' + lang;
      if (h === 'createdAt') return new Date().toISOString();
      if (h === 'language') return lang;
      if (h === 'content') return content;
      if (h === 'status') return 'Pending Review';
      if (h === 'listingType') return 'poll';
      return '';
    });
    sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
  });

  sendPollReviewMessage(sheet, headers, sourceId, question, optionTexts);
}

function sendPollReviewMessage(sheet, headers, sourceId, question, options) {
  const reviewText = '📊 New poll ready — approving posts to EN + JP + RU + DE\n\n' +
    toBoldSansSerif(question) + '\n\n' +
    options.map((o, i) => (i + 1) + '. ' + o).join('\n');

  const keyboard = { inline_keyboard: [[
    { text: '✅ Approve All', callback_data: 'pollApproveAll_' + sourceId },
    { text: '❌ Reject All', callback_data: 'pollRejectAll_' + sourceId },
  ]] };

  const msg = sendTelegramMessage(REVIEWER_CHAT_ID, reviewText, keyboard);
  if (!msg || !msg.message_id) return;

  const rows = sheet.getDataRange().getValues();
  const idIdx = headers.indexOf('id');
  const reviewIdx = headers.indexOf('reviewMsgId');
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIdx]).indexOf(sourceId + '-') === 0) {
      sheet.getRange(i + 1, reviewIdx + 1).setValue(msg.message_id);
    }
  }
}

// Handles "pollApproveAll_<sourceId>" / "pollRejectAll_<sourceId>" — mirrors
// handleGroupCallback's pattern but posts real Telegram polls instead of text.
function handlePollGroupCallback(cb, action, sourceId) {
  const sheet = getQueueSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIdx = headers.indexOf('id');
  const langIdx = headers.indexOf('language');
  const contentIdx = headers.indexOf('content');
  const statusIdx = headers.indexOf('status');

  const matchingRows = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIdx]).indexOf(sourceId + '-') === 0) matchingRows.push(i + 1);
  }
  if (!matchingRows.length) { answerCallback(cb.id, 'Poll not found.'); return; }
  if (sheet.getRange(matchingRows[0], statusIdx + 1).getValue() !== 'Pending Review') {
    answerCallback(cb.id, 'Already handled.');
    return;
  }

  if (action === 'pollApproveAll') {
    matchingRows.forEach(rowNum => {
      const language = sheet.getRange(rowNum, langIdx + 1).getValue();
      const contentJson = sheet.getRange(rowNum, contentIdx + 1).getValue();
      let pollData;
      try { pollData = JSON.parse(contentJson); } catch (e) { Logger.log('poll content parse failed: ' + e); return; }
      const channelId = LANGUAGE_CHANNELS[language];
      if (!channelId) { Logger.log('handlePollGroupCallback: no channel for ' + language); return; }
      const posted = sendTelegramPoll(channelId, pollData.question, pollData.options, pollData.isAnonymous, pollData.allowsMultiple);
      sheet.getRange(rowNum, statusIdx + 1).setValue('Posted');
      sheet.getRange(rowNum, headers.indexOf('postedMsgId') + 1).setValue((posted && posted.message_id) || '');
      sheet.getRange(rowNum, headers.indexOf('postedAt') + 1).setValue(new Date().toISOString());
    });
    finishReviewMessage(cb.message.chat.id, cb.message.message_id, cb.message.text + '\n\n✅ POSTED to EN + JP + RU + DE', false);
    answerCallback(cb.id, 'Poll posted to EN/JP/RU/DE!');
  } else {
    matchingRows.forEach(rowNum => sheet.getRange(rowNum, statusIdx + 1).setValue('Rejected'));
    finishReviewMessage(cb.message.chat.id, cb.message.message_id, cb.message.text + '\n\n❌ REJECTED', false);
    answerCallback(cb.id, 'Rejected.');
  }
}

// ── Listing status updates — Nick replies "SOLD" / "RENTED" / "RESERVED" /
//    "REDUCED $X" directly to a listing's review message. The reply is
//    matched back to that listing via reply_to_message.message_id against
//    the reviewMsgId already saved for every row, then the already-POSTED
//    channel messages get edited in place (not reposted) via
//    editMessageText/editMessageCaption. ──────────────────────

const STATUS_LABELS = {
  SOLD: '🔴 SOLD — no longer available',
  RENTED: '🔑 RENTED — no longer available',
  RESERVED: '🟡 RESERVED / Under Offer',
};

function looksLikeStatusKeyword(text) {
  if (!text) return false;
  const upper = text.trim().toUpperCase();
  return !!STATUS_LABELS[upper] || /^REDUCED\b/.test(upper);
}

function handleStatusReply(chatId, text, replyToMessageId) {
  const upper = text.trim().toUpperCase();
  let banner;
  if (STATUS_LABELS[upper]) {
    banner = STATUS_LABELS[upper];
  } else {
    const extra = text.trim().slice('REDUCED'.length).trim();
    banner = '🟢 PRICE REDUCED' + (extra ? ' — ' + extra : '');
  }

  const sheet = getQueueSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const reviewIdx = headers.indexOf('reviewMsgId');
  const langIdx = headers.indexOf('language');
  const postedMsgIdx = headers.indexOf('postedMsgId');
  const photoIdx = headers.indexOf('photoFileId');
  const contentIdx = headers.indexOf('content');

  const matchingRows = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][reviewIdx]) === String(replyToMessageId)) matchingRows.push(i + 1);
  }
  if (!matchingRows.length) {
    sendTelegramMessage(REVIEWER_CHAT_ID, "🤔 Couldn't find which listing that's replying to — make sure you're replying directly to the original review message (the one with Approve/Reject).");
    return;
  }

  let updatedCount = 0;
  matchingRows.forEach(rowNum => {
    const language = sheet.getRange(rowNum, langIdx + 1).getValue();
    const postedMsgId = sheet.getRange(rowNum, postedMsgIdx + 1).getValue();
    if (!postedMsgId) return; // this language version was rejected, never posted — nothing to edit
    const channelId = LANGUAGE_CHANNELS[language];
    if (!channelId) return;
    const content = sheet.getRange(rowNum, contentIdx + 1).getValue();
    const photoIds = parsePhotoIds(photoIdx > -1 ? sheet.getRange(rowNum, photoIdx + 1).getValue() : '');

    // postGalleryWithButtons puts the caption on the PHOTO message only when
    // there's exactly one photo — everything else (0 photos, or a multi-photo
    // album) carries the caption on a separate plain text message. Editing
    // must match whichever it actually is, or Telegram rejects the call.
    const captionIsOnAPhoto = photoIds.length === 1;
    editPostedMessage(channelId, postedMsgId, banner + '\n\n' + content, captionIsOnAPhoto);
    updatedCount++;
  });

  sendTelegramMessage(REVIEWER_CHAT_ID, updatedCount
    ? '✅ Updated ' + updatedCount + ' posted version(s) to: ' + banner.replace(/^[^\s]+\s/, '')
    : "🤔 Found that listing, but nothing was actually posted for it (all versions were rejected?).");
}

function editPostedMessage(chatId, messageId, newText, hasPhoto) {
  const token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  const url = 'https://api.telegram.org/bot' + token + '/' + (hasPhoto ? 'editMessageCaption' : 'editMessageText');
  const payload = { chat_id: chatId, message_id: messageId };
  payload[hasPhoto ? 'caption' : 'text'] = newText;
  // reply_markup intentionally omitted — Telegram leaves existing buttons
  // (Contact Us / More Property / the tracked Telegram link) untouched when
  // it's not included, which is exactly what a status update should do.
  const resp = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/x-www-form-urlencoded', payload: payload, muteHttpExceptions: true,
  });
  const data = JSON.parse(resp.getContentText());
  if (!data.ok) Logger.log('editPostedMessage failed: ' + resp.getContentText());
  return data.result;
}

// ── Reaction tracking — requires allowed_updates to include
//    message_reaction_count (see checkForUpdates) and the bot to be an
//    admin in each channel. Logs engagement per listing to a "Reactions"
//    sheet — a free, lightweight stand-in for Buffer's paid analytics. ──

function handleReactionUpdate(mrc) {
  const sheet = getQueueSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const postedMsgIdx = headers.indexOf('postedMsgId');
  const contentIdx = headers.indexOf('content');
  const langIdx = headers.indexOf('language');
  const totalReactions = (mrc.reactions || []).reduce((sum, r) => sum + (r.total_count || 0), 0);

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][postedMsgIdx]) === String(mrc.message_id)) {
      logReactionCount(rows[i][langIdx], rows[i][contentIdx], mrc.message_id, totalReactions, mrc.reactions);
      return;
    }
  }
  Logger.log('handleReactionUpdate: no matching listing for message_id=' + mrc.message_id);
}

function logReactionCount(language, content, messageId, totalReactions, reactions) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Reactions');
  if (!sheet) {
    sheet = ss.insertSheet('Reactions');
    const reactionHeaders = ['timestamp', 'language', 'messageId', 'totalReactions', 'breakdown', 'listingSnippet'];
    sheet.getRange(1, 1, 1, reactionHeaders.length).setValues([reactionHeaders]);
    sheet.getRange(1, 1, 1, reactionHeaders.length)
      .setBackground('#0F192E').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
    sheet.setFrozenRows(1);
  }
  const breakdown = (reactions || [])
    .map(r => (r.type && (r.type.emoji || r.type.custom_emoji_id || r.type.type)) + ':' + r.total_count)
    .join(', ');
  const snippet = String(content || '').split('\n').filter(Boolean).slice(0, 2).join(' ').slice(0, 70);
  sheet.appendRow([new Date().toISOString(), language, messageId, totalReactions, breakdown, snippet]);
}

// ── Location pins — CAPABILITY ONLY, not wired into posting yet.
//    sendTelegramLocation() works and is ready to use, but PROJECT_COORDINATES
//    below has no real GPS data in it — filling in fake coordinates would
//    risk sending someone to the wrong building, so it's deliberately left
//    empty rather than guessed. Fill in real lat/long per project (Google
//    Maps → right-click a location → the numbers at the top of the menu),
//    then a listing's title can be matched against this table to attach a
//    real map pin alongside the photos. ──

const PROJECT_COORDINATES = {
  // 'Time Square 9': { lat: 0, lng: 0 }, // TODO: fill in real coordinates before use
};

function sendTelegramLocation(chatId, latitude, longitude) {
  const token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendLocation', {
    method: 'post', contentType: 'application/x-www-form-urlencoded',
    payload: { chat_id: chatId, latitude: latitude, longitude: longitude },
    muteHttpExceptions: true,
  });
  const data = JSON.parse(resp.getContentText());
  if (!data.ok) Logger.log('sendTelegramLocation failed: ' + resp.getContentText());
  return data.result;
}

// ── Send for review ──────────────────────────────────────────────

// One review message for all 3 language rows sharing a sourceId — shows the
// EN content (the one you can actually read to judge), approving posts all
// 3 to their channels at once instead of 3 separate taps.
function sendCombinedReviewMessage(sheet, headers, sourceId, photoFileIds) {
  const rows = sheet.getDataRange().getValues();
  const idIdx = headers.indexOf('id');
  const langIdx = headers.indexOf('language');
  const contentIdx = headers.indexOf('content');
  const statusIdx = headers.indexOf('status');

  const entitiesIdx = headers.indexOf('entities');
  let enContent = '', enEntities = null;
  const matchingRows = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][idIdx]).indexOf(sourceId + '-') === 0) {
      matchingRows.push(i + 1);
      if (rows[i][langIdx] === 'EN') {
        enContent = rows[i][contentIdx];
        const cell = entitiesIdx > -1 ? rows[i][entitiesIdx] : '';
        if (cell) { try { enEntities = JSON.parse(cell); } catch (e) { enEntities = null; } }
      }
    }
  }
  if (!matchingRows.length) return;

  // Prefix pushes enContent's start further into the string — any entities
  // (Premium emoji) must shift by the prefix's length or they'll point at
  // the wrong characters once attached to this longer message.
  const prefix = '📝 New listing ready — approving posts to EN + JP + RU + DE\n\n';
  const reviewText = prefix + enContent;
  const shiftedEntities = enEntities ? enEntities.map(e => Object.assign({}, e, { offset: e.offset + prefix.length })) : null;
  const keyboard = {
    inline_keyboard: [[
      { text: '✅ Approve All', callback_data: 'approveAll_' + sourceId },
      { text: '❌ Reject All', callback_data: 'rejectAll_' + sourceId },
    ]],
  };

  const msg = photoFileIds && photoFileIds.length
    ? sendTelegramPhoto(REVIEWER_CHAT_ID, photoFileIds[0], reviewText, keyboard, shiftedEntities)
    : sendTelegramMessage(REVIEWER_CHAT_ID, reviewText, keyboard, shiftedEntities);

  matchingRows.forEach(rowNum => {
    sheet.getRange(rowNum, statusIdx + 1).setValue('Pending Review');
    sheet.getRange(rowNum, headers.indexOf('reviewMsgId') + 1).setValue(msg && msg.message_id || '');
  });
}

function sendRowForReview(sheet, headers, rowNum) {
  const idIdx = headers.indexOf('id');
  const langIdx = headers.indexOf('language');
  const contentIdx = headers.indexOf('content');
  const statusIdx = headers.indexOf('status');
  const photoIdx = headers.indexOf('photoFileId');

  const row = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  const id = row[idIdx];
  const language = row[langIdx] || 'TEST';
  const content = row[contentIdx];
  const photoIds = parsePhotoIds(photoIdx > -1 ? row[photoIdx] : '');

  const reviewText = '📝 New content ready — ' + language + (photoIds.length > 1 ? ' (' + photoIds.length + ' photos, showing 1st)' : '') + '\n\n' + content;
  const keyboard = {
    inline_keyboard: [[
      { text: '✅ Approve', callback_data: 'approve_' + id },
      { text: '❌ Reject', callback_data: 'reject_' + id },
    ]],
  };

  // Review preview only shows the first photo (Telegram albums can't carry
  // inline buttons) — the final channel post sends all photos as an album.
  const msg = photoIds.length
    ? sendTelegramPhoto(REVIEWER_CHAT_ID, photoIds[0], reviewText, keyboard)
    : sendTelegramMessage(REVIEWER_CHAT_ID, reviewText, keyboard);

  sheet.getRange(rowNum, statusIdx + 1).setValue('Pending Review');
  sheet.getRange(rowNum, headers.indexOf('reviewMsgId') + 1).setValue(msg && msg.message_id || '');
}

// Run from the menu — picks up any manually-added rows (language + content, no status yet)
function sendForReview() {
  const sheet = getQueueSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const idIdx = headers.indexOf('id');
  const statusIdx = headers.indexOf('status');
  const contentIdx = headers.indexOf('content');
  const createdIdx = headers.indexOf('createdAt');

  let sent = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[contentIdx] && !row[statusIdx]) {
      const rowNum = i + 1;
      if (!row[idIdx]) sheet.getRange(rowNum, idIdx + 1).setValue('C' + Date.now() + i);
      if (!row[createdIdx]) sheet.getRange(rowNum, createdIdx + 1).setValue(new Date().toISOString());
      sendRowForReview(sheet, headers, rowNum);
      sent++;
    }
  }
  SpreadsheetApp.getUi().alert(sent + ' item(s) sent for review.');
}

// ── Telegram API helpers ────────────────────────────────────────

function sendTelegramMessage(chatId, text, replyMarkup, entities) {
  const token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  const payload = { chat_id: chatId, text: text };
  if (replyMarkup) payload.reply_markup = JSON.stringify(replyMarkup);
  if (entities) payload.entities = JSON.stringify(entities); // preserves Premium custom emoji etc. — only valid if text is byte-identical to the message the entities came from

  const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    muteHttpExceptions: true,
  });
  const data = JSON.parse(resp.getContentText());
  if (!data.ok) Logger.log('sendMessage failed: ' + resp.getContentText());
  return data.result;
}

function sendTelegramPhoto(chatId, fileId, caption, replyMarkup, entities) {
  const token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  const payload = { chat_id: chatId, photo: fileId, caption: caption };
  if (replyMarkup) payload.reply_markup = JSON.stringify(replyMarkup);
  if (entities) payload.caption_entities = JSON.stringify(entities);
  if (entities) Logger.log('sendTelegramPhoto: sending caption_entities=' + payload.caption_entities); // TEMP diagnostic

  const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendPhoto', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    muteHttpExceptions: true,
  });
  const data = JSON.parse(resp.getContentText());
  if (!data.ok) Logger.log('sendPhoto failed: ' + resp.getContentText());
  else if (entities) Logger.log('sendTelegramPhoto: response entities=' + JSON.stringify(data.result && data.result.caption_entities)); // TEMP diagnostic — confirms what Telegram actually stored
  return data.result;
}

// Posts a real native Telegram poll (not a text message describing one).
// options is a plain array of strings — Telegram polls don't support any
// rich text formatting in the question or options, so there's no bold/
// entity handling to worry about here, unlike listing captions.
function sendTelegramPoll(chatId, question, options, isAnonymous, allowsMultiple) {
  const token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  const payload = {
    chat_id: chatId,
    question: question,
    options: JSON.stringify(options),
    is_anonymous: isAnonymous !== false,
  };
  if (allowsMultiple) payload.allows_multiple_answers = true;

  const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendPoll', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    muteHttpExceptions: true,
  });
  const data = JSON.parse(resp.getContentText());
  if (!data.ok) Logger.log('sendPoll failed: ' + resp.getContentText());
  return data.result;
}

// Telegram doesn't support inline buttons on media groups — this is used
// only for the final channel post (no buttons needed there).
function sendTelegramMediaGroup(chatId, fileIds, caption, entities) {
  const token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  const media = fileIds.map((id, i) => {
    const item = { type: 'photo', media: id };
    if (i === 0) {
      item.caption = caption; // Telegram only shows a caption from the first item
      if (entities) item.caption_entities = entities; // not stringified — nested inside the media JSON below
    }
    return item;
  });

  const resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMediaGroup', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: { chat_id: chatId, media: JSON.stringify(media) },
    muteHttpExceptions: true,
  });
  const data = JSON.parse(resp.getContentText());
  if (!data.ok) Logger.log('sendMediaGroup failed: ' + resp.getContentText());
  return data.result; // array of Message objects, one per photo
}

// Posts a gallery of photos with the caption + Contact Us/More Property
// buttons. Single photo: caption and buttons attach directly to that one
// message — clean, no placeholder, always worked.
//
// Multiple photos: the album carries no caption at all (keeps the grid
// visually intact — no oversized last photo, no split). The full caption
// then goes out as its own plain text message right after, with the
// buttons attached directly to it. Because the caption is always real,
// substantial listing text, it's never empty — so there's nothing here for
// Telegram to silently reject the way it did with earlier attempts:
//   - splitting the last photo out to attach buttons to it directly worked,
//     but visually broke the gallery (rejected 2026-07-21 after live test)
//   - an invisible/whitespace-only placeholder for a buttons-only message
//     was silently dropped by Telegram (confirmed twice, live, 2026-07-21)
// This version needs neither trick — Nick's idea, 2026-07-22.
function postGalleryWithButtons(channelId, photoIds, caption, contactKeyboard, entities) {
  if (photoIds.length === 1) {
    return sendTelegramPhoto(channelId, photoIds[0], caption, contactKeyboard, entities);
  }
  sendTelegramMediaGroup(channelId, photoIds); // no caption — it goes in its own message below
  return sendTelegramMessage(channelId, caption, contactKeyboard, entities);
}

function getLargestPhotoId(message) {
  if (message.photo && message.photo.length) {
    return message.photo[message.photo.length - 1].file_id; // Telegram lists smallest→largest
  }
  return null;
}

// Edits the review message (text or photo caption) once handled, removing the buttons.
function finishReviewMessage(chatId, messageId, newText, hasPhoto) {
  const token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  const url = 'https://api.telegram.org/bot' + token + '/' + (hasPhoto ? 'editMessageCaption' : 'editMessageText');
  const payload = {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: JSON.stringify({ inline_keyboard: [] }),
  };
  payload[hasPhoto ? 'caption' : 'text'] = newText;

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: payload,
    muteHttpExceptions: true,
  });
}

function answerCallback(callbackQueryId, text) {
  const token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/answerCallbackQuery', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: { callback_query_id: callbackQueryId, text: text },
    muteHttpExceptions: true,
  });
}

// ── Sheet helpers ────────────────────────────────────────────────

function getQueueSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setBackground('#0F192E').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function initializeAll() {
  const sheet = getQueueSheet();
  Logger.log('✅ Queue ready — rows: ' + sheet.getLastRow());
}

// Run once after adding 'photoFileId' to HEADERS, for sheets created before this existed.
function migrateQueueSchema() {
  const sheet = getQueueSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const toAdd = ['photoFileId', 'listingType', 'entities'].filter(c => !headers.includes(c));
  if (!toAdd.length) {
    Logger.log('✅ Schema already up to date — no migration needed');
    return;
  }
  let nextCol = sheet.getLastColumn() + 1;
  toAdd.forEach(col => {
    sheet.getRange(1, nextCol).setValue(col)
      .setBackground('#0F192E').setFontColor('#ffffff').setFontWeight('bold').setFontSize(10);
    nextCol++;
  });
  Logger.log('✅ Added columns: ' + toAdd.join(', '));
}

// ── Trigger setup (run ONCE) ────────────────────────────────────────

function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkForUpdates')
    .timeBased()
    .everyMinutes(1)
    .create();
  Logger.log('✅ Trigger installed — checking for messages/button taps every minute.');
}

// ── Menu ─────────────────────────────────────────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('PHC Content Bot')
    .addItem('📤 Send New Content for Review', 'sendForReview')
    .addSeparator()
    .addItem('🔧 Set up Queue sheet', 'initializeAll')
    .addItem('🔧 Migrate Queue schema (add photoFileId)', 'migrateQueueSchema')
    .addItem('⚙️ Install / Reset Triggers', 'installTriggers')
    .addToUi();
}
