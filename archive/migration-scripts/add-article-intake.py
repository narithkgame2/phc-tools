with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update update.message check to also catch caption
old_msg_start = """      if (update.message && update.message.text) {
        const text = update.message.text.trim();
        const chatId = update.message.chat.id;
        const sender = update.message.from;
        const senderName = sender.first_name || 'Client';
        console.log(`💬 Message from ${senderName} (${chatId}): "${text}"`);"""

new_msg_start = """      if (update.message && (update.message.text || update.message.caption)) {
        const text = (update.message.text || update.message.caption || '').trim();
        const chatId = update.message.chat.id;
        const sender = update.message.from;
        const senderName = sender.first_name || 'Client';
        console.log(`💬 Message from ${senderName} (${chatId}): "${text.slice(0, 100)}..."`);"""

if old_msg_start in text:
    text = text.replace(old_msg_start, new_msg_start, 1)
    print("Updated update.message handler to support captions & text")
else:
    print("Warning: old_msg_start not found")

# 2. Add Article/Listing Intake block right before the fallback handler
article_intake_code = """        // ── ARTICLE & PROPERTY LISTING INTAKE PARSER ──────────────
        const isListingPattern = /#ForSale|#ForRent|#NewProject|\\[FOR SALE\\]|\\[FOR RENT\\]/i.test(text) ||
          (/\\$[\\d,]+/.test(text) && (/(?:1|2|3)\\s*(?:bed|br|bedroom|寝室|ldk)/i.test(text) || /sqm|㎡|floor|strata|yield/i.test(text)));
        const isLongArticle = text.length > 80 && (text.includes('Time Square') || text.includes('Phnom Penh') || text.includes('Condo') || text.includes('Realestate') || text.includes('$') || text.includes('USD'));

        if (isListingPattern || isLongArticle) {
          console.log(`📰 Article/Listing intake detected from ${senderName} (${chatId})`);
          
          let formattedContent = text;
          if (!formattedContent.includes('REALESTATE.COM.KH') && !formattedContent.includes('Realestate.com.kh')) {
            formattedContent = `🏢 <b>REALESTATE.COM.KH · VERIFIED LISTING</b>\\n\\n` + formattedContent;
          }

          const previewMsg = 
            `📥 <b>LISTING / ARTICLE DRAFT DETECTED!</b>\\n\\n` +
            `Our engine parsed your content and formatted it for Realestate.com.kh:\\n\\n` +
            `――――――――――――――――――\\n` +
            `${formattedContent}\\n` +
            `――――――――――――――――――\\n\\n` +
            `<b>What would you like to do with this post?</b>`;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: previewMsg,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🚀 Approve & Broadcast to Channel', callback_data: 'publish_article_now' }],
                  [{ text: '📱 Preview Property Color Card', callback_data: 'btn_view_TS8' }],
                  [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
                ]
              }
            })
          });
          return;
        }
"""

target_before_fallback = "        // ───────────────────────────────────────────────────────────\n        // FALLBACK: ANY UNMATCHED USER TEXT MESSAGE"
if target_before_fallback in text and 'ARTICLE & PROPERTY LISTING INTAKE PARSER' not in text:
    text = text.replace(target_before_fallback, article_intake_code + "\n" + target_before_fallback, 1)
    print("Inserted Article/Listing Intake block")

# 3. Add callback handler for publish_article_now
publish_cb_code = """        else if (dataStr === 'publish_article_now') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '🚀 Dispatched to channel!' })
          });

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: channelId,
              text: `📰 <b>REALESTATE.COM.KH · VERIFIED NEW LISTING</b>\\n\\n` +
                `🏢 <b>Exclusive Phnom Penh Opportunity</b>\\n` +
                `100% Foreign Freehold Strata Hard Title · Verified by Nick\\n\\n` +
                `▫️ Direct representation and private viewings available now!`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '📱 View in Realestate.com.kh Bot', url: 'https://t.me/Nick_REAKH_Bot?start=catalog' },
                    { text: '💬 Inquire with Nick', url: 'https://t.me/Nick_REAKH' }
                  ]
                ]
              }
            })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `✅ <b>BROADCAST SUCCESSFUL!</b>\\n\\nYour listing has been formatted and published to <b>Nick Test Lab</b> with interactive contact buttons!`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📱 View in Channel', url: 'https://t.me/+olPZyfkgtcQxOTA9' }],
                  [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
                ]
              }
            })
          });
        }
"""

if 'publish_article_now' not in text:
    text = text.replace("else if (dataStr === 'digest_broadcast_now') {", publish_cb_code + "\n        else if (dataStr === 'digest_broadcast_now') {", 1)
    print("Added callback handler for publish_article_now")

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(text)

