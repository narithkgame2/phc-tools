import re

with open('phc-tools/staging-bot-poller.cjs', 'r', encoding='utf-8') as f:
    code = f.read()

# ── 1. UPGRADE LEGAL SUBTOPICS (LINES ~2550-2680) ─────────────────────────────
old_legal_topics = """        else if (dataStr === 'legal_strata') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          let text = '';
          if (userLang === 'JP') {
            text = 
              `📜 <b>2010年外国人不動産所有権法（分層所有権・Strata Title）</b>\\n\\n` +
              `<blockquote>✅ <b>第6条の規定（100%自己名義ハードタイトル）：</b>\\n` +
              `▫️ 外国人個人名義で、共同住宅の1階（日本基準の2階以上）の専有部分を100%完全所有（フリーホールド）可能。\\n` +
              `▫️ カンボジア国土整備・都市計画・建設省（Cadastral Office）にて個人パスポート番号で直接登記。\\n` +
              `▫️ カンボジア国民と同等の永代相続、賃貸運用、将来の転売権利が国家レベルで法的に保障されています。</blockquote>\\n\\n` +
              `<blockquote>🛡️ <b>外国人保有比率の規定：</b>\\n` +
              `▫️ 共同住宅全体の私有専有面積の最大70%まで外国人名義での登記が認められています（PHCの掲載物件は全棟適格確認済み）。</blockquote>\\n\\n` +
              `💡 <i>Property Hub Cambodiaは全物件について、登記官庁によるハードタイトル適格性を事前審査の上で仲介しています。</i>`;
          } else {
            text = 
              `📜 <b>100% FOREIGN FREEHOLD STRATA TITLE LAW</b>\\n\\n` +
              `<blockquote>✅ <b>Article 6 of 2010 Foreign Ownership Law:</b>\\n` +
              `▫️ Foreign nationals can legally own 100% freehold title in private units from 1st floor upwards.\\n` +
              `▫️ Registered directly under your personal passport at the Ministry of Land Management (Cadastral Hard Title).\\n` +
              `▫️ Perpetual inheritance, transfer, and leasing rights identical to domestic citizens.</blockquote>\\n\\n` +
              `<blockquote>🛡️ <b>Foreign Quota Safeguards:</b> Up to 70% of private floor area in a co-owned building can be foreign-owned.</blockquote>`;
          }

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Taxes & Fees', callback_data: 'legal_taxes' }, { text: '💸 Bank Wires & USDT', callback_data: 'legal_transfers' }],
                  [{ text: '🔙 Back to Legal Menu', callback_data: 'legal_back' }, { text: '💬 Ask Nick a Question', url: 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });
        }

        else if (dataStr === 'legal_taxes') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const text = 
            `🏷️ <b>TAXES & GOVERNMENT CLOSING FEES</b>\\n\\n` +
            `Cambodia offers one of the most investor-friendly tax regimes globally:\\n\\n` +
            `<blockquote>💰 <b>Official Tax Schedule:</b>\\n` +
            `▫️ <b>Property Transfer Tax (Stamp Duty):</b> 4% of Cadastral assessed value (paid once upon hard title transfer).\\n` +
            `▫️ <b>Annual Property Tax:</b> 0.1% on properties valued above ~$25,000 USD (assessed on 80% baseline — typically only $50–$100/yr for a 2BR condo).\\n` +
            `▫️ <b>Capital Gains Tax:</b> 0% for individual foreign buyers (corporate: 20%).\\n` +
            `▫️ <b>Rental Withholding Tax:</b> Non-residents pay 14% withholding (often borne by tenant or offset by management expense deductions).</blockquote>\\n\\n` +
            `💡 <i>Property Hub Cambodia prepares complete tax clearance paperwork on your behalf.</i>`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📜 Strata Title Law', callback_data: 'legal_strata' }, { text: '💸 Bank Wires & USDT', callback_data: 'legal_transfers' }],
                  [{ text: '🔙 Back to Legal Menu', callback_data: 'legal_back' }, { text: '💬 Ask Nick a Question', url: 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });
        }

        else if (dataStr === 'legal_transfers') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const text = 
            `💸 <b>INTERNATIONAL BANK WIRE & DIGITAL ASSETS</b>\\n\\n` +
            `<blockquote>🌐 <b>Remittance & Currency Framework:</b>\\n` +
            `▫️ <b>USD-Based Economy:</b> Cambodia is a dual-currency nation operating predominantly in United States Dollars (USD). There is zero currency exchange loss or depreciation risk.\\n` +
            `▫️ <b>Telegraphic Transfers (SWIFT):</b> Overseas investors can wire purchase funds directly to developer escrow accounts or PHC partner commercial banks (ABA Bank, Canadia Bank, Prince Bank) with your sales contract.\\n` +
            `▫️ <b>Digital Currency / USDT:</b> Property Hub Cambodia can facilitate compliant escrow settlements via USDT (Tether).\\n` +
            `▫️ <b>Fund Repatriation:</b> Under the Law on Foreign Exchange, capital, rental income, and profits can be freely remitted abroad through commercial banks.</blockquote>`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📜 Strata Title Law', callback_data: 'legal_strata' }, { text: '🔑 Property Management', callback_data: 'legal_management' }],
                  [{ text: '🔙 Back to Legal Menu', callback_data: 'legal_back' }, { text: '💬 Ask Nick a Question', url: 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });
        }

        else if (dataStr === 'legal_management') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const text = 
            `🔑 <b>TURNKEY OVERSEAS PROPERTY MANAGEMENT</b>\\n\\n` +
            `Overseas investors never need to fly to Cambodia to manage their unit:\\n\\n` +
            `<blockquote>🤝 <b>Full-Lifecycle Passive Landlord Service:</b>\\n` +
            `▫️ <b>Tenant Sourcing & Screening:</b> We syndicate listings across our 12,000+ subscriber network in English, Japanese, Russian, and German.\\n` +
            `▫️ <b>Rent Collection & Banking:</b> Monthly rent is collected and transferred directly to your bank account with complete digital statements.\\n` +
            `▫️ <b>Maintenance & Repairs:</b> Dedicated on-site team handles repairs, cleaning, and routine inspections.\\n` +
            `▫️ <b>Full Digital Reporting:</b> Quarterly unit condition photos and inspection reports delivered straight to your Telegram.</blockquote>`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📜 Strata Title Law', callback_data: 'legal_strata' }, { text: 'Taxes & Fees', callback_data: 'legal_taxes' }],
                  [{ text: '🔙 Back to Legal Menu', callback_data: 'legal_back' }, { text: '💬 Connect with Nick', url: 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });
        }"""

new_legal_topics = """        else if (dataStr === 'legal_strata') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const isJP = userLang === 'JP';
          const text = isJP ?
            `📜 <b>2010年外国人不動産所有権法（分層所有権・Strata Title）</b>\\n\\n` +
            `<blockquote>✅ <b>第6条の規定（100%自己名義ハードタイトル）：</b>\\n` +
            `▫️ 外国人個人名義で、共同住宅の1階（日本基準の2階以上）の専有部分を100%完全所有（フリーホールド）可能。\\n` +
            `▫️ カンボジア国土整備・都市計画・建設省（Cadastral Office）にて個人パスポート番号で直接登記。\\n` +
            `▫️ カンボジア国民と同等の永代相続、賃貸運用、将来の転売権利が国家レベルで法的に保障されています。</blockquote>\\n\\n` +
            `<blockquote>🛡️ <b>外国人保有比率の規定：</b>\\n` +
            `▫️ 共同住宅全体の私有専有面積の最大70%まで外国人名義での登記が認められています（PHCの掲載物件は全棟適格確認済み）。</blockquote>\\n\\n` +
            `💡 <i>Property Hub Cambodiaは全物件について、登記官庁によるハードタイトル適格性を事前審査の上で仲介しています。</i>` :
            `📜 <b>100% FOREIGN FREEHOLD STRATA TITLE LAW</b>\\n\\n` +
            `<blockquote>✅ <b>Article 6 of 2010 Foreign Ownership Law:</b>\\n` +
            `▫️ Foreign nationals can legally own 100% freehold title in private units from 1st floor upwards.\\n` +
            `▫️ Registered directly under your personal passport at the Ministry of Land Management (Cadastral Hard Title).\\n` +
            `▫️ Perpetual inheritance, transfer, and leasing rights identical to domestic citizens.</blockquote>\\n\\n` +
            `<blockquote>🛡️ <b>Foreign Quota Safeguards:</b> Up to 70% of private floor area in a co-owned building can be foreign-owned.</blockquote>`;

          const keyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 Nickへ直接相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '🏷️ 税制・登記費用（印紙税4%）', callback_data: 'legal_taxes' },
                { text: '💸 国際送金・米ドル決済', callback_data: 'legal_transfers' }
              ],
              [
                { text: '🔙 法務ガイド目次', callback_data: 'legal_back' },
                { text: 'メインメニュー', callback_data: 'menu_main' }
              ]
            ]
          } : {
            inline_keyboard: [
              [{ text: '💬 Consult with Nick (Telegram)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '🏷️ Taxes & Fees', callback_data: 'legal_taxes' },
                { text: '💸 Bank Wires & USDT', callback_data: 'legal_transfers' }
              ],
              [
                { text: '🔙 Legal Guide Menu', callback_data: 'legal_back' },
                { text: 'Main Menu', callback_data: 'menu_main' }
              ]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'HTML',
              reply_markup: keyboard
            })
          });
        }

        else if (dataStr === 'legal_taxes') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const isJP = userLang === 'JP';
          const text = isJP ?
            `🏷️ <b>税制および登記諸費用（カンボジア不動産）</b>\\n\\n` +
            `カンボジアは世界で最も投資家優遇の税制を採用している国の一つです：\\n\\n` +
            `<blockquote>💰 <b>公定税務スケジュール：</b>\\n` +
            `▫️ <b>所有権移転税（印紙税）：</b> 4%（ハードタイトル名義書換時に1回のみ納付）\\n` +
            `▫️ <b>固定資産税：</b> 年0.1%（物件評価額の80%に対して課税。2LDKコンドミニアムで年間約$50〜$100程度）\\n` +
            `▫️ <b>キャピタルゲイン税：</b> 外国人個人名義は現在 <b>0%（非課税）</b>\\n` +
            `▫️ <b>賃料源泉税：</b> 非居住者は14%（通常テナント負担または管理経費控除で相殺）</blockquote>\\n\\n` +
            `💡 <i>Property Hub Cambodiaが納税申告および名義書換手続きをワンストップで代行します。</i>` :
            `🏷️ <b>TAXES & GOVERNMENT CLOSING FEES</b>\\n\\n` +
            `Cambodia offers one of the most investor-friendly tax regimes globally:\\n\\n` +
            `<blockquote>💰 <b>Official Tax Schedule:</b>\\n` +
            `▫️ <b>Property Transfer Tax (Stamp Duty):</b> 4% of Cadastral assessed value (paid once upon hard title transfer).\\n` +
            `▫️ <b>Annual Property Tax:</b> 0.1% on properties valued above ~$25,000 USD (typically only $50–$100/yr for a 2BR condo).\\n` +
            `▫️ <b>Capital Gains Tax:</b> 0% for individual foreign buyers.\\n` +
            `▫️ <b>Rental Withholding Tax:</b> Non-residents pay 14% withholding.</blockquote>\\n\\n` +
            `💡 <i>Property Hub Cambodia prepares complete tax clearance paperwork on your behalf.</i>`;

          const keyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 Nickへ直接相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '📜 外国人所有法', callback_data: 'legal_strata' },
                { text: '💸 国際送金・米ドル決済', callback_data: 'legal_transfers' }
              ],
              [
                { text: '🔙 法務ガイド目次', callback_data: 'legal_back' },
                { text: 'メインメニュー', callback_data: 'menu_main' }
              ]
            ]
          } : {
            inline_keyboard: [
              [{ text: '💬 Consult with Nick (Telegram)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '📜 Strata Title Law', callback_data: 'legal_strata' },
                { text: '💸 Bank Wires & USDT', callback_data: 'legal_transfers' }
              ],
              [
                { text: '🔙 Legal Guide Menu', callback_data: 'legal_back' },
                { text: 'Main Menu', callback_data: 'menu_main' }
              ]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'HTML',
              reply_markup: keyboard
            })
          });
        }

        else if (dataStr === 'legal_transfers') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const isJP = userLang === 'JP';
          const text = isJP ?
            `💸 <b>国際銀行送金および米ドル決済（為替リスクゼロ）</b>\\n\\n` +
            `<blockquote>🌐 <b>送金および通貨決済フレームワーク：</b>\\n` +
            `▫️ <b>米ドル流通経済：</b> カンボジアは国内全域で米ドル（USD）が実質基軸通貨として流通。為替損失や現地通貨下落のリスクがありません。\\n` +
            `▫️ <b>SWIFT国際電信送金：</b> 売買契約書に基づき、大手商業銀行（ABA Bank、カナディア銀行等）の開発業者エスクロー口座へ直接海外送金可能。\\n` +
            `▫️ <b>暗号資産（USDT）決済：</b> 法令を遵守したステーブルコイン（USDT）によるエスクロー決済もサポート。\\n` +
            `▫️ <b>資金の海外回収：</b> 外国為替法に基づき、家賃収入や売却益は商業銀行を通じて自由かつ無制限に日本や海外口座へ送金・回収可能です。</blockquote>` :
            `💸 <b>INTERNATIONAL BANK WIRE & DIGITAL ASSETS</b>\\n\\n` +
            `<blockquote>🌐 <b>Remittance & Currency Framework:</b>\\n` +
            `▫️ <b>USD-Based Economy:</b> Cambodia operates in United States Dollars (USD) with zero currency depreciation risk.\\n` +
            `▫️ <b>Telegraphic Transfers (SWIFT):</b> Overseas investors can wire purchase funds directly to developer escrow accounts or PHC partner commercial banks (ABA Bank, Canadia Bank) with your sales contract.\\n` +
            `▫️ <b>Digital Currency / USDT:</b> Compliant escrow settlements via USDT (Tether) supported.\\n` +
            `▫️ <b>Fund Repatriation:</b> Under the Law on Foreign Exchange, capital, rental income, and profits can be freely remitted abroad.</blockquote>`;

          const keyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 Nickへ直接相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '📜 外国人所有法', callback_data: 'legal_strata' },
                { text: '🔑 現地賃貸管理', callback_data: 'legal_management' }
              ],
              [
                { text: '🔙 法務ガイド目次', callback_data: 'legal_back' },
                { text: 'メインメニュー', callback_data: 'menu_main' }
              ]
            ]
          } : {
            inline_keyboard: [
              [{ text: '💬 Consult with Nick (Telegram)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '📜 Strata Title Law', callback_data: 'legal_strata' },
                { text: '🔑 Property Management', callback_data: 'legal_management' }
              ],
              [
                { text: '🔙 Legal Guide Menu', callback_data: 'legal_back' },
                { text: 'Main Menu', callback_data: 'menu_main' }
              ]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'HTML',
              reply_markup: keyboard
            })
          });
        }

        else if (dataStr === 'legal_management') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const isJP = userLang === 'JP';
          const text = isJP ?
            `🔑 <b>完全代行・プノンペン現地賃貸管理サービス</b>\\n\\n` +
            `海外にお住まいの投資家様も、現地渡航不要で完全な不労所得運用を実現できます：\\n\\n` +
            `<blockquote>🤝 <b>フルライフサイクル賃貸管理（日系対応）：</b>\\n` +
            `▫️ <b>優良入居者募集：</b> 多言語ネットワーク（日・英・中・露）を通じて外国人駐在員・大手法人テナントを獲得。\\n` +
            `▫️ <b>家賃回収・送金：</b> 毎月の米ドル賃料を回収し、明細書と共に日本またはご指定の海外口座へ送金。\\n` +
            `▫️ <b>室内保全・修繕：</b> 現地日本人スタッフ・常駐チームが退去時立会い、修繕、清掃を一括対応。\\n` +
            `▫️ <b>四半期写真報告：</b> Telegramにて定期的な室内写真と現況レポートをお届けします。</blockquote>` :
            `🔑 <b>TURNKEY OVERSEAS PROPERTY MANAGEMENT</b>\\n\\n` +
            `Overseas investors never need to fly to Cambodia to manage their unit:\\n\\n` +
            `<blockquote>🤝 <b>Full-Lifecycle Passive Landlord Service:</b>\\n` +
            `▫️ <b>Tenant Sourcing & Screening:</b> We syndicate listings across 12,000+ subscriber network in English, Japanese, Russian, and German.\\n` +
            `▫️ <b>Rent Collection & Banking:</b> Monthly rent is collected and transferred directly to your bank account with complete digital statements.\\n` +
            `▫️ <b>Maintenance & Repairs:</b> Dedicated on-site team handles repairs, cleaning, and inspections.\\n` +
            `▫️ <b>Full Digital Reporting:</b> Quarterly unit condition photos delivered straight to your Telegram.</blockquote>`;

          const keyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 Nickへ直接相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '📜 外国人所有法', callback_data: 'legal_strata' },
                { text: '🏷️ 税制・登記費用', callback_data: 'legal_taxes' }
              ],
              [
                { text: '🔙 法務ガイド目次', callback_data: 'legal_back' },
                { text: 'メインメニュー', callback_data: 'menu_main' }
              ]
            ]
          } : {
            inline_keyboard: [
              [{ text: '💬 Consult with Nick (Telegram)', url: 'https://t.me/Nick_REAKH' }],
              [
                { text: '📜 Strata Title Law', callback_data: 'legal_strata' },
                { text: '🏷️ Taxes & Fees', callback_data: 'legal_taxes' }
              ],
              [
                { text: '🔙 Legal Guide Menu', callback_data: 'legal_back' },
                { text: 'Main Menu', callback_data: 'menu_main' }
              ]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'HTML',
              reply_markup: keyboard
            })
          });
        }"""

if old_legal_topics in code:
    code = code.replace(old_legal_topics, new_legal_topics, 1)
    print("Updated legal topics with Japanese translations & Rule of 3 navigation")
else:
    print("Warning: old_legal_topics not found")

# ── 2. UPGRADE OWNER INTAKE WIZARD (CLEAN HTML & MAIN MENU BUTTON) ─────────────
old_owner_block = """        else if (dataStr.startsWith('owner_goal_')) {
          const goal = dataStr.replace('owner_goal_', '') === 'sell' ? 'Resale (For Sale)' : 'Rental (For Rent)';
          if (!ownerListingState[user.id]) ownerListingState[user.id] = {};
          ownerListingState[user.id].goal = goal;

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `💼 **60-SECOND PROPERTY INTAKE WIZARD**\\n\\n` +
                `🎯 **Objective:** ${goal}\\n\\n` +
                `**Step 2 of 4:** Select the project or area of your property:`,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🏢 Time Square Series (TS8 / TS306 / TS9)', callback_data: 'owner_proj_TS' }],
                  [{ text: '📍 BKK1 / Chamkarmon Center', callback_data: 'owner_proj_BKK' }],
                  [{ text: '📍 Toul Tompoung (Russian Market)', callback_data: 'owner_proj_TTP' }],
                  [{ text: '🏙️ Other District (Daun Penh / Chroy Changvar)', callback_data: 'owner_proj_OTHER' }]
                ]
              }
            })
          });
        }

        else if (dataStr.startsWith('owner_proj_')) {
          const projMap = {
            'owner_proj_TS': 'Time Square Series (Chamkarmon)',
            'owner_proj_BKK': 'BKK1 / BKK2 / BKK3',
            'owner_proj_TTP': 'Toul Tompoung / Russian Market',
            'owner_proj_OTHER': 'Other Phnom Penh District'
          };
          const projName = projMap[dataStr] || 'Phnom Penh';
          if (!ownerListingState[user.id]) ownerListingState[user.id] = {};
          ownerListingState[user.id].project = projName;

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `💼 **60-SECOND PROPERTY INTAKE WIZARD**\\n\\n` +
                `🎯 **Objective:** ${ownerListingState[user.id].goal}\\n` +
                `📍 **Location:** ${projName}\\n\\n` +
                `**Step 3 of 4:** What is the bedroom configuration & size?`,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🛋️ Studio / 1-Bedroom (35 – 50 sqm)', callback_data: 'owner_bed_1BR' }],
                  [{ text: '🛏️ 2-Bedroom (55 – 75 sqm)', callback_data: 'owner_bed_2BR' }],
                  [{ text: '🏰 3+ Bedrooms / Penthouse (90+ sqm)', callback_data: 'owner_bed_3BR' }]
                ]
              }
            })
          });
        }

        else if (dataStr.startsWith('owner_bed_')) {
          const bedMap = {
            'owner_bed_1BR': '1-Bedroom (35–50 sqm)',
            'owner_bed_2BR': '2-Bedroom (55–75 sqm)',
            'owner_bed_3BR': '3+ Bedrooms / Penthouse (90+ sqm)'
          };
          const bedName = bedMap[dataStr] || '2-Bedroom';
          if (!ownerListingState[user.id]) ownerListingState[user.id] = {};
          ownerListingState[user.id].bedrooms = bedName;
          const isSell = ownerListingState[user.id].goal && ownerListingState[user.id].goal.includes('Resale');

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const priceKeyboard = isSell ? [
            [{ text: '💵 Under $60,000 USD', callback_data: 'owner_val_under60k' }],
            [{ text: '💵 $60,000 – $100,000 USD', callback_data: 'owner_val_60to100k' }],
            [{ text: '💵 $100,000 – $180,000 USD', callback_data: 'owner_val_100to180k' }],
            [{ text: '💵 $200,000+ USD (Luxury)', callback_data: 'owner_val_over200k' }]
          ] : [
            [{ text: '💵 Under $500 / month', callback_data: 'owner_val_under500' }],
            [{ text: '💵 $500 – $850 / month', callback_data: 'owner_val_500to850' }],
            [{ text: '💵 $900 – $1,500 / month', callback_data: 'owner_val_900to1500' }],
            [{ text: '💵 $1,600+ / month (Luxury)', callback_data: 'owner_val_over1600' }]
          ];

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `💼 **60-SECOND PROPERTY INTAKE WIZARD**\\n\\n` +
                `🎯 **Objective:** ${ownerListingState[user.id].goal}\\n` +
                `📍 **Location:** ${ownerListingState[user.id].project}\\n` +
                `🛋️ **Layout:** ${bedName}\\n\\n` +
                `**Step 4 of 4:** What is your target ${isSell ? 'asking price' : 'expected monthly rent'}?`,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: priceKeyboard }
            })
          });
        }

        else if (dataStr.startsWith('owner_val_')) {
          const valMap = {
            'owner_val_under60k': 'Under $60,000 USD',
            'owner_val_60to100k': '$60,000 – $100,000 USD',
            'owner_val_100to180k': '$100,000 – $180,000 USD',
            'owner_val_over200k': '$200,000+ USD',
            'owner_val_under500': 'Under $500 / month',
            'owner_val_500to850': '$500 – $850 / month',
            'owner_val_900to1500': '$900 – $1,500 / month',
            'owner_val_over1600': '$1,600+ / month'
          };
          const valName = valMap[dataStr] || '$99,000 USD';
          const info = ownerListingState[user.id] || {};
          info.price = valName;
          const unitRef = 'PHC-' + Math.floor(Math.random() * 899 + 100);
          const leadId = 'owner_' + unitRef;

          leadSlaTracker[leadId] = {
            id: leadId,
            name: userName,
            userId: user.id,
            unitRef: unitRef,
            type: `Owner Property Listing (${info.goal || 'Resale'})`,
            createdAt: Date.now(),
            status: 'pending',
            escalated: false
          };
          saveState();

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '🎉 Listing submitted to PHC!' })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `🎉 **PROPERTY SUBMISSION RECEIVED!**\\n\\n` +
                `📋 **YOUR SUBMISSION SUMMARY:**\\n` +
                `▫️ **Unit Reference:** \\`#${unitRef}\\`\\n` +
                `▫️ **Objective:** ${info.goal || 'Resale'}\\n` +
                `▫️ **Location:** ${info.project || 'Chamkarmon'}\\n` +
                `▫️ **Layout:** ${info.bedrooms || '2-Bedroom'}\\n` +
                `▫️ **Target Pricing:** ${valName}\\n\\n` +
                `🛡️ **NEXT STEPS:**\\n` +
                `Nick and the PHC valuation team will verify building title records and reach out within 2 hours to confirm your representation agreement.\\n\\n` +
                `👉 *You can track your marketing analytics anytime by typing:* \\`/myunit ${unitRef}\\``,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔑 View Performance Dashboard', callback_data: `owner_refresh_${unitRef}` }],
                  [{ text: '💬 Connect Directly with Nick', url: 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });"""

new_owner_block = """        else if (dataStr.startsWith('owner_goal_')) {
          const goal = dataStr.replace('owner_goal_', '') === 'sell' ? 'Resale (For Sale)' : 'Rental (For Rent)';
          if (!ownerListingState[user.id]) ownerListingState[user.id] = {};
          ownerListingState[user.id].goal = goal;

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `💼 <b>60-SECOND PROPERTY INTAKE WIZARD</b>\\n\\n` +
                `🎯 <b>Objective:</b> ${goal}\\n\\n` +
                `<b>Step 2 of 4:</b> Select the project or area of your property:`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🏢 Time Square Series (TS8 / TS306 / TS9)', callback_data: 'owner_proj_TS' }],
                  [{ text: '📍 BKK1 / Chamkarmon Center', callback_data: 'owner_proj_BKK' }],
                  [{ text: '📍 Toul Tompoung (Russian Market)', callback_data: 'owner_proj_TTP' }],
                  [{ text: '🏙️ Other District (Daun Penh / Chroy Changvar)', callback_data: 'owner_proj_OTHER' }],
                  [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
                ]
              }
            })
          });
        }

        else if (dataStr.startsWith('owner_proj_')) {
          const projMap = {
            'owner_proj_TS': 'Time Square Series (Chamkarmon)',
            'owner_proj_BKK': 'BKK1 / BKK2 / BKK3',
            'owner_proj_TTP': 'Toul Tompoung / Russian Market',
            'owner_proj_OTHER': 'Other Phnom Penh District'
          };
          const projName = projMap[dataStr] || 'Phnom Penh';
          if (!ownerListingState[user.id]) ownerListingState[user.id] = {};
          ownerListingState[user.id].project = projName;

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `💼 <b>60-SECOND PROPERTY INTAKE WIZARD</b>\\n\\n` +
                `🎯 <b>Objective:</b> ${ownerListingState[user.id].goal}\\n` +
                `📍 <b>Location:</b> ${projName}\\n\\n` +
                `<b>Step 3 of 4:</b> What is the bedroom configuration & size?`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🛋️ Studio / 1-Bedroom (35 – 50 sqm)', callback_data: 'owner_bed_1BR' }],
                  [{ text: '🛏️ 2-Bedroom (55 – 75 sqm)', callback_data: 'owner_bed_2BR' }],
                  [{ text: '🏰 3+ Bedrooms / Penthouse (90+ sqm)', callback_data: 'owner_bed_3BR' }],
                  [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
                ]
              }
            })
          });
        }

        else if (dataStr.startsWith('owner_bed_')) {
          const bedMap = {
            'owner_bed_1BR': '1-Bedroom (35–50 sqm)',
            'owner_bed_2BR': '2-Bedroom (55–75 sqm)',
            'owner_bed_3BR': '3+ Bedrooms / Penthouse (90+ sqm)'
          };
          const bedName = bedMap[dataStr] || '2-Bedroom';
          if (!ownerListingState[user.id]) ownerListingState[user.id] = {};
          ownerListingState[user.id].bedrooms = bedName;
          const isSell = ownerListingState[user.id].goal && ownerListingState[user.id].goal.includes('Resale');

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const priceKeyboard = isSell ? [
            [{ text: '💵 Under $60,000 USD', callback_data: 'owner_val_under60k' }],
            [{ text: '💵 $60,000 – $100,000 USD', callback_data: 'owner_val_60to100k' }],
            [{ text: '💵 $100,000 – $180,000 USD', callback_data: 'owner_val_100to180k' }],
            [{ text: '💵 $200,000+ USD (Luxury)', callback_data: 'owner_val_over200k' }],
            [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
          ] : [
            [{ text: '💵 Under $500 / month', callback_data: 'owner_val_under500' }],
            [{ text: '💵 $500 – $850 / month', callback_data: 'owner_val_500to850' }],
            [{ text: '💵 $900 – $1,500 / month', callback_data: 'owner_val_900to1500' }],
            [{ text: '💵 $1,600+ / month (Luxury)', callback_data: 'owner_val_over1600' }],
            [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
          ];

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `💼 <b>60-SECOND PROPERTY INTAKE WIZARD</b>\\n\\n` +
                `🎯 <b>Objective:</b> ${ownerListingState[user.id].goal}\\n` +
                `📍 <b>Location:</b> ${ownerListingState[user.id].project}\\n` +
                `🛋️ <b>Layout:</b> ${bedName}\\n\\n` +
                `<b>Step 4 of 4:</b> What is your target ${isSell ? 'asking price' : 'expected monthly rent'}?`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: priceKeyboard }
            })
          });
        }

        else if (dataStr.startsWith('owner_val_')) {
          const valMap = {
            'owner_val_under60k': 'Under $60,000 USD',
            'owner_val_60to100k': '$60,000 – $100,000 USD',
            'owner_val_100to180k': '$100,000 – $180,000 USD',
            'owner_val_over200k': '$200,000+ USD',
            'owner_val_under500': 'Under $500 / month',
            'owner_val_500to850': '$500 – $850 / month',
            'owner_val_900to1500': '$900 – $1,500 / month',
            'owner_val_over1600': '$1,600+ / month'
          };
          const valName = valMap[dataStr] || '$99,000 USD';
          const info = ownerListingState[user.id] || {};
          info.price = valName;
          const unitRef = 'PHC-' + Math.floor(Math.random() * 899 + 100);
          const leadId = 'owner_' + unitRef;

          leadSlaTracker[leadId] = {
            id: leadId,
            name: userName,
            userId: user.id,
            unitRef: unitRef,
            type: `Owner Property Listing (${info.goal || 'Resale'})`,
            createdAt: Date.now(),
            status: 'pending',
            escalated: false
          };
          saveState();

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '🎉 Listing submitted to PHC!' })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `🎉 <b>PROPERTY SUBMISSION RECEIVED!</b>\\n\\n` +
                `📋 <b>YOUR SUBMISSION SUMMARY:</b>\\n` +
                `▫️ <b>Unit Reference:</b> <code>#${unitRef}</code>\\n` +
                `▫️ <b>Objective:</b> ${info.goal || 'Resale'}\\n` +
                `▫️ <b>Location:</b> ${info.project || 'Chamkarmon'}\\n` +
                `▫️ <b>Layout:</b> ${info.bedrooms || '2-Bedroom'}\\n` +
                `▫️ <b>Target Pricing:</b> ${valName}\\n\\n` +
                `🛡️ <b>NEXT STEPS:</b>\\n` +
                `Nick and the PHC valuation team will verify building title records and reach out within 2 hours to confirm your representation agreement.\\n\\n` +
                `👉 <i>You can track your marketing analytics anytime by typing:</i> <code>/myunit ${unitRef}</code>`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💬 Connect Directly with Nick', url: 'https://t.me/Nick_REAKH' }],
                  [
                    { text: '🔑 View Performance Dashboard', callback_data: `owner_refresh_${unitRef}` },
                    { text: '🔙 Main Menu', callback_data: 'menu_main' }
                  ]
                ]
              }
            })
          });"""

if old_owner_block in code:
    code = code.replace(old_owner_block, new_owner_block, 1)
    print("Updated owner intake wizard with clean HTML and return paths")
else:
    print("Warning: old_owner_block not found")

with open('phc-tools/staging-bot-poller.cjs', 'w', encoding='utf-8') as f:
    f.write(code)

print("Saved phase 4 updates.")
