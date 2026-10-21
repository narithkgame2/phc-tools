import re

with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update EN comparison keyboard
old_en_comp_target = """    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Time Square 8', callback_data: 'btn_view_TS8' },
          { text: 'Residence L', callback_data: 'btn_view_ResL' }
        ],
        [
          { text: 'Odom Living', callback_data: 'btn_view_Odom' },
          { text: 'Payment Calculator', callback_data: 'btn_calc_99000_TS8' }
        ],
        [
          { text: 'Consult with Nick', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }"""

new_en_comp_target = """    reply_markup: {
      inline_keyboard: [
        [{ text: '💬 Consult with Nick (Telegram)', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: '🏢 Time Square 8', callback_data: 'btn_view_TS8' },
          { text: '🏢 Residence L', callback_data: 'btn_view_ResL' }
        ],
        [
          { text: '🏢 Odom Living', callback_data: 'btn_view_Odom' },
          { text: '🔙 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    }"""

if old_en_comp_target in code:
    code = code.replace(old_en_comp_target, new_en_comp_target, 1)
    print("Updated EN comparison keyboard")
else:
    print("Warning: old_en_comp_target not found")

# 2. Add fallback text handler after line 1764
old_text_end = """          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: langGateText,
              parse_mode: 'HTML',
              reply_markup: langGateKeyboard
            })
          });
          return;
        }
      }"""

new_text_end = """          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: langGateText,
              parse_mode: 'HTML',
              reply_markup: langGateKeyboard
            })
          });
          return;
        }

        // ───────────────────────────────────────────────────────────
        // FALLBACK: ANY UNMATCHED USER TEXT MESSAGE
        // ───────────────────────────────────────────────────────────
        const userLang = userLanguages[chatId] || 'EN';
        const isJP = userLang === 'JP';
        const senderHandle = sender.username ? `@${sender.username}` : senderName;

        // Alert Nick of incoming direct client inquiry
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: nickChatId,
            text: `💬 <b>NEW INCOMING CLIENT MESSAGE!</b>\\n\\n` +
              `👤 <b>Client:</b> ${senderHandle} (${senderName})\\n` +
              `🆔 <b>User ID:</b> <code>${chatId}</code>\\n` +
              `🌐 <b>Language:</b> ${userLang}\\n` +
              `💬 <b>Message:</b> "${text}"\\n\\n` +
              `👉 <a href="tg://user?id=${chatId}">Tap here to reply directly to client</a>`,
            parse_mode: 'HTML'
          })
        });

        // Instant polite response with direct advisory access and clean menu
        const fallbackText = isJP ?
          `<b>Property Hub Cambodiaへのお問い合わせありがとうございます</b>\\n\\n` +
          `${senderName}様からのメッセージをプノンペン現地サポートおよび代表Nickに転送いたしました。\\n\\n` +
          `担当者より直接ご返信いたしますが、お急ぎの場合や個別相談をご希望の際は、以下のボタンよりNickへ直接メッセージをお送りいただくか、メニューをご利用ください：` :
          `<b>Thank You for Contacting Property Hub Cambodia</b>\\n\\n` +
          `Your message has been forwarded to Nick and our Phnom Penh advisory desk.\\n\\n` +
          `We will reply shortly. For immediate priority assistance, you can message Nick directly or explore verified properties below:`;

        const fallbackKeyboard = {
          inline_keyboard: [
            [{ text: isJP ? '💬 Nickへ直接相談 (Telegram)' : '💬 Chat Directly with Nick', url: 'https://t.me/Nick_REAKH' }],
            [
              { text: isJP ? '🏢 厳選物件一覧' : '🏢 Featured Properties', callback_data: 'btn_view_TS8' },
              { text: isJP ? '🧮 収支・ローン試算' : '🧮 Payment Calculator', callback_data: 'btn_calc_99000_TS8' }
            ],
            [{ text: isJP ? '🔙 メインメニュー' : '🔙 Main Menu', callback_data: 'menu_main' }]
          ]
        };

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: fallbackText,
            parse_mode: 'HTML',
            reply_markup: fallbackKeyboard
          })
        });
        return;
      }"""

if old_text_end in code:
    code = code.replace(old_text_end, new_text_end, 1)
    print("Updated text fallback handler")
else:
    print("Warning: old_text_end not found")

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved phase 2 updates.")
