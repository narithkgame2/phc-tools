import re

with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Comparison Card to always have Main Menu
old_comp_jp = """        inline_keyboard: [
          [
            { text: 'Time Square 8', callback_data: 'btn_view_TS8' },
            { text: 'Residence L', callback_data: 'btn_view_ResL' }
          ],
          [
            { text: 'Odom Living', callback_data: 'btn_view_Odom' },
            { text: '🧮 試算・ローン', callback_data: 'btn_calc_99000_TS8' }
          ],
          [
            { text: '💬 Nickへ相談', url: 'https://t.me/Nick_REAKH' }
          ]
        ]"""

new_comp_jp = """        inline_keyboard: [
          [{ text: '💬 Nickへ直接相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }],
          [
            { text: '🏢 Time Square 8', callback_data: 'btn_view_TS8' },
            { text: '🏢 Residence L', callback_data: 'btn_view_ResL' }
          ],
          [
            { text: '🏢 Odom Living', callback_data: 'btn_view_Odom' },
            { text: '🔙 メインメニュー', callback_data: 'menu_main' }
          ]
        ]"""

if old_comp_jp in code:
    code = code.replace(old_comp_jp, new_comp_jp, 1)
    print("Updated JP comparison keyboard")
else:
    print("Warning: old_comp_jp not found")

old_comp_en = """        inline_keyboard: [
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
        ]"""

new_comp_en = """        inline_keyboard: [
          [{ text: '💬 Consult with Nick (Telegram)', url: 'https://t.me/Nick_REAKH' }],
          [
            { text: '🏢 Time Square 8', callback_data: 'btn_view_TS8' },
            { text: '🏢 Residence L', callback_data: 'btn_view_ResL' }
          ],
          [
            { text: '🏢 Odom Living', callback_data: 'btn_view_Odom' },
            { text: '🔙 Main Menu', callback_data: 'menu_main' }
          ]
        ]"""

if old_comp_en in code:
    code = code.replace(old_comp_en, new_comp_en, 1)
    print("Updated EN comparison keyboard")
else:
    print("Warning: old_comp_en not found")

# 2. Update getLegalGuideMenu to support JP & back button
old_legal_menu = """function getLegalGuideMenu() {
  return {
    text: `<b>FOREIGN BUYER LEGAL & TAX FRAMEWORK</b>\\n\\n` +
      `Official Legal Framework for International Real Estate Buyers in the Kingdom of Cambodia.\\n\\n` +
      `<blockquote>⚖️ <b>Constitutional Protection:</b> Foreign freehold ownership is codified under the 2010 Strata Title Law. Units are registered under the buyer's individual passport with identical freehold rights to domestic citizens.</blockquote>\\n\\n` +
      `Tap any topic below for verified legal facts:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Strata Title Law', callback_data: 'legal_strata' },
          { text: 'Taxes & Fees', callback_data: 'legal_taxes' }
        ],
        [
          { text: 'Wires & USDT', callback_data: 'legal_transfers' },
          { text: 'Turnkey Management', callback_data: 'legal_management' }
        ],
        [
          { text: 'Legal Consultation with Nick', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}"""

new_legal_menu = """function getLegalGuideMenu(lang = 'EN') {
  const isJP = lang === 'JP';
  if (isJP) {
    return {
      text: `<b>外国人所有権・法務税制ガイド（プノンペン）</b>\\n\\n` +
        `カンボジアにおける外国人個人名義での不動産所有および税務基準：\\n\\n` +
        `<blockquote>⚖️ <b>国家法による完全保障：</b> 2010年外国人所有法第6条に基づき、外国人個人パスポート名義での100%完全所有権（分層所有権・ハードタイトル）が認められています。国内市民と同等の永代相続権・売却権を有します。</blockquote>\\n\\n` +
        `確認したい項目をお選びください：`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '💬 Nickへ法務・登記相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }],
          [
            { text: '📜 外国人所有法・ハードタイトル', callback_data: 'legal_strata' },
            { text: '🏷️ 税制・登記費用（印紙税4%）', callback_data: 'legal_taxes' }
          ],
          [
            { text: '💸 国際送金・米ドル決済', callback_data: 'legal_transfers' },
            { text: '🔑 現地賃貸管理・家賃送金', callback_data: 'legal_management' }
          ],
          [{ text: '🔙 メインメニュー', callback_data: 'menu_main' }]
        ]
      }
    };
  }

  return {
    text: `<b>FOREIGN BUYER LEGAL & TAX FRAMEWORK</b>\\n\\n` +
      `Official Legal Framework for International Real Estate Buyers in the Kingdom of Cambodia.\\n\\n` +
      `<blockquote>⚖️ <b>Constitutional Protection:</b> Foreign freehold ownership is codified under the 2010 Strata Title Law. Units are registered under the buyer's individual passport with identical freehold rights to domestic citizens.</blockquote>\\n\\n` +
      `Select a topic below for verified statutes:`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '💬 Consult with Nick (Telegram)', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: '📜 Strata Title Law', callback_data: 'legal_strata' },
          { text: '🏷️ Taxes & Fees', callback_data: 'legal_taxes' }
        ],
        [
          { text: '💸 Bank Wires & USDT', callback_data: 'legal_transfers' },
          { text: '🔑 Turnkey Management', callback_data: 'legal_management' }
        ],
        [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
      ]
    }
  };
}"""

if old_legal_menu in code:
    code = code.replace(old_legal_menu, new_legal_menu, 1)
    print("Updated getLegalGuideMenu")
else:
    print("Warning: old_legal_menu not found")

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved phase 1 updates.")
