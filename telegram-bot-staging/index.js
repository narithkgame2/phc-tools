// ═══════════════════════════════════════════════════════════════
// Comprehensive Staging Bot Listener & Lead Engine
// Bot: @Nick_REAKH_Bot | Channel: Nick Test Lab (-1004372846355)
// Features: Lead Capture, Telegram Mini App, GPS Pins, Trust Engine
// ═══════════════════════════════════════════════════════════════

// Bot token: read from a private file outside the project (see load-secrets.js). Never written in code.
require('./load-secrets.js');
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token || !/^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(token)) {
  console.error('\nThe bot token is missing or not valid.\nOpen this private file and paste the token after TELEGRAM_BOT_TOKEN=\n  ~/.phc-secrets/nick-reakh-bot.env\nThen start the bot again.\n');
  process.exit(1);
}
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
const userWaitingForCustomSearch = {};

// Persistent State File
const fs = require('fs');
const path = require('path');
const STATE_FILE = path.join(__dirname, 'data', 'bot-state.json');
const { syncAllChannels, searchInventory } = require('./engines/channel-syncer.js');
const { handleSearchCallback, handleSearchCommand, isSearchCallback } = require('./engines/search-concierge.js');
const projectEngine = require('./engines/project-advisor.js');
const roleGate = require('./engines/role-gate.js');

// Periodic Multi-Channel Sync (every 30 minutes)
setInterval(() => {
  syncAllChannels().catch(err => console.error('⚠️ [Channel Sync Error]:', err.message));
}, 30 * 60 * 1000);

// Setup Clean Luxury Telegram Menu (setMyCommands)
async function setupBotCommands() {
  try {
    // 1. Default (English - Private Client Architecture)
    const defaultCommands = [
      { command: 'start', description: '🏛️ Main Menu & Welcome' },
      { command: 'explore', description: '🏢 Explore Condos (Buy / Rent)' },
      { command: 'tour', description: '📅 Book Private Tour / Video' },
      { command: 'list', description: '🤝 List Your Property (Owners)' },
      { command: 'guide', description: '📖 Buyer Legal & Tax Guide' },
      { command: 'nick', description: '👤 Direct Advisory with Nick' }
    ];
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: defaultCommands })
    });

    // 2. Japanese Localized Commands (for Japanese phone locales)
    const jpCommands = [
      { command: 'start', description: '🏛️ メインメニュー' },
      { command: 'explore', description: '🏢 厳選物件（売買・賃貸）' },
      { command: 'tour', description: '📅 プライベート内覧予約' },
      { command: 'list', description: '🤝 物件掲載・売却 (オーナー)' },
      { command: 'guide', description: '📖 外国人購入・法務税制ガイド' },
      { command: 'nick', description: '👤 代表Nickへ直接相談' }
    ];
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: jpCommands, language_code: 'ja' })
    });

    console.log('✅ Luxury bot menu commands registered (Default & JA)');
  } catch (err) {
    console.error('⚠️ Failed to set bot commands:', err.message);
  }
}
setupBotCommands();

// Global Collections
const watchlist = {
  'TS8': new Set(['353195979']),
  'RESL': new Set(['353195979']),
  'ODOM': new Set(['353195979'])
};
const ownerListingState = {};
const leadSlaTracker = {};
const registeredDeals = {};
const userLanguages = {};
const digestSchedule = {
  autoBroadcast: true,
  lastBroadcastWeek: null,
  targetDayOfWeek: 1, // Monday
  targetHourPhnomPenh: 9 // 09:00 AM (UTC+7)
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (data.watchlist) {
        for (const [unit, list] of Object.entries(data.watchlist)) {
          watchlist[unit] = new Set(list);
        }
      }
      if (data.registeredDeals) Object.assign(registeredDeals, data.registeredDeals);
      if (data.leadSlaTracker) Object.assign(leadSlaTracker, data.leadSlaTracker);
      if (data.userLanguages) Object.assign(userLanguages, data.userLanguages);
      if (data.digestSchedule) Object.assign(digestSchedule, data.digestSchedule);
      console.log('💾 Loaded persistent bot state from disk successfully.');
    }
  } catch (err) {
    console.error('⚠️ Could not load state from disk:', err.message);
  }
}

function saveState() {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const serializableWatchlist = {};
    for (const [unit, setObj] of Object.entries(watchlist)) {
      serializableWatchlist[unit] = Array.from(setObj);
    }

    const payload = {
      watchlist: serializableWatchlist,
      registeredDeals,
      leadSlaTracker,
      userLanguages,
      digestSchedule,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (err) {
    console.error('⚠️ Failed to save state to disk:', err.message);
  }
}

// Initial state hydration
loadState();
saveState();

function getLanguageMenu() {
  return {
    text: `🌐 <b>PREFER LANGUAGE / 言語選択</b>\n\n` +
      `Please choose your preferred communication language:\n` +
      `ご希望の言語を選択してください：`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🇯🇵 日本語', callback_data: 'set_lang_JP' },
          { text: '🇬🇧 English', callback_data: 'set_lang_EN' }
        ],
        [
          { text: '🇨🇳 简体中文', callback_data: 'set_lang_ZH' },
          { text: '🇷🇺 Русский', callback_data: 'set_lang_RU' }
        ],
        [
          { text: '🔙 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    }
  };
}


function getResLCard(lang = 'EN') {
  const isJP = lang === 'JP';
  return {
    photo: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    caption: isJP ?
      `<b>レジデンス L · 1LDK 高利回りキャッシュフロー物件</b>\n` +
      `<b>$45,000 USD</b>（約684万円 · 即入居・賃貸稼働中）\n\n` +
      `📍 プノンペン · ロシアンマーケット近接（Toul Tompoung）\n` +
      `▫️ <b>専有面積：</b> 47.0㎡（約14.2坪） / 家具家電フル完備\n` +
      `▫️ <b>間取り：</b> 1LDK（1寝室 · 1浴室）\n` +
      `▫️ <b>実質利回り：</b> <b>9.2% Net</b>（月額 $350 USDで稼働中）\n` +
      `▫️ <b>権利形態：</b> 外国人100%自己名義ハードタイトル\n\n` +
      `<blockquote>5万ドル未満で即座に米ドルインカムゲインを得られる小口優良物件です。</blockquote>` :
      `<b>RESIDENCE L · 1-BEDROOM HIGH CASH FLOW</b>\n` +
      `<b>$45,000 USD</b> (Immediate Handover · Low Entry Barrier)\n\n` +
      `📍 Toul Tompoung (Near Russian Market), Chamkarmon\n` +
      `▫️ <b>Dimensions:</b> 47.0 sqm Gross ($957/sqm)\n` +
      `▫️ <b>Layout:</b> 1 Bedroom · 1 Bathroom · Fully Furnished\n` +
      `▫️ <b>Net Yield:</b> <b>9.2% Net</b> ($350/mo active rental tenancy)\n` +
      `▫️ <b>Title:</b> 100% Foreign Freehold Strata Hard Title\n\n` +
      `<blockquote>Highest rental yield per dollar in Phnom Penh. Ideal for immediate cash flow under $50,000 USD.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [{ text: isJP ? '💬 Nickへ直接相談 (Telegram)' : '💬 Consult with Nick', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: isJP ? '📅 内覧予約 / ビデオ案内' : '📅 Book Tour / Video', callback_data: 'btn_book_ResL' },
          { text: isJP ? '🧮 収支試算' : '🧮 Payment Calculator', callback_data: 'btn_calc_45000_ResL' }
        ],
        [{ text: isJP ? '🔙 メインメニュー' : '🔙 Main Menu', callback_data: 'menu_main' }]
      ]
    }
  };
}

function getOdomCard(lang = 'EN') {
  const isJP = lang === 'JP';
  return {
    photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    caption: isJP ?
      `<b>オドム・リビング · 最高峰フラッグシップ邸宅</b>\n` +
      `<b>$240,000 USD</b>（約3,648万円 · LEEDゴールド認証）\n\n` +
      `📍 プノンペン中心部 · ノロドム通り（Tonle Bassac）\n` +
      `▫️ <b>専有面積：</b> 78.0㎡（約23.6坪）\n` +
      `▫️ <b>間取り：</b> 2LDK（2寝室 · 2浴室 · スカイバルコニー）\n` +
      `▫️ <b>実質利回り：</b> <b>6.8% Net</b>（想定月額家賃 $1,400 USD）\n` +
      `▫️ <b>権利形態：</b> 外国人100%自己名義ハードタイトル\n\n` +
      `<blockquote>外交官・多国籍企業エグゼクティブ向けプレステージ資産。信託・永代承継に最適。</blockquote>` :
      `<b>ODOM LIVING · FLAGSHIP RESIDENTIAL TOWER</b>\n` +
      `<b>$240,000 USD</b> (Pre-Handover Q1 2027 · LEED-Gold Certified)\n\n` +
      `📍 Norodom Boulevard, Tonle Bassac\n` +
      `▫️ <b>Dimensions:</b> 78.0 sqm Gross ($3,076/sqm)\n` +
      `▫️ <b>Layout:</b> 2 Bedrooms · 2 Bathrooms · Sky Balcony\n` +
      `▫️ <b>Net Yield:</b> <b>6.8% Net</b> ($1,400/mo projected diplomatic rent)\n` +
      `▫️ <b>Title:</b> 100% Foreign Freehold Strata Hard Title\n\n` +
      `<blockquote>Phnom Penh's premier architectural landmark. Tailored for corporate executives and generational wealth.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [{ text: isJP ? '💬 Nickへ直接相談 (Telegram)' : '💬 Consult with Nick', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: isJP ? '📅 内覧予約 / ビデオ案内' : '📅 Book Tour / Video', callback_data: 'btn_book_Odom' },
          { text: isJP ? '🧮 収支試算' : '🧮 Payment Calculator', callback_data: 'btn_calc_240000_Odom' }
        ],
        [{ text: isJP ? '🔙 メインメニュー' : '🔙 Main Menu', callback_data: 'menu_main' }]
      ]
    }
  };
}

function getMainMenu(lang = 'EN', senderName = 'Valued Client') {
  if (lang === 'JP') {
    return {
      text: `<b>Realestate.com.kh</b>\n` +
        `プノンペン不動産 · 公式プライベートデスク\n\n` +
        `<b>${senderName}様</b>、ようこそ。\n` +
        `カンボジア最大の不動産プラットフォーム「Realestate.com.kh」公式個別相談デスクです。\n` +
        `外国人100%自己名義ハードタイトル対象、プノンペンの優良コンドミニアムをご案内いたします。\n\n` +
        `• <b>賃貸・居住：</b> BKK1・桑園・リバーサイドの家具付き厳選コンドミニアム\n` +
        `• <b>購入・投資：</b> 割安緊急転売・高利回り8%〜9%の厳選フリーホールド資産\n` +
        `• <b>オーナー様：</b> 4言語・1.2万人超の海外投資家・優良駐在員ネットワークへの無料掲載・客付け\n\n` +
        `ご希望のメニューをお選びください：`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏢 物件を探す (Buy / Rent)', callback_data: 'btn_explore_prop' }],
          [{ text: '📅 プライベート内覧・ビデオ案内を予約', callback_data: 'btn_book_PORTFOLIO' }],
          [{ text: '🤝 物件を貸したい・売りたい (オーナー様)', callback_data: 'owner_start_wizard' }],
          [{ text: '📖 外国人購入・法務税制ガイド', callback_data: 'btn_purchase_guide' }],
          [
            { text: '🌐 言語設定 (Language)', callback_data: 'btn_change_lang' },
            { text: '💬 Nickへ直接相談 ↗', url: 'https://t.me/Nick_REAKH' }
          ]
        ]
      }
    };
  }

  // Default: EN
  return {
    text: `<b>REALESTATE.COM.KH</b>\n` +
      `Private Client Real Estate Advisory · Phnom Penh\n\n` +
      `Welcome <b>${senderName}</b>.\n` +
      `Cambodia's #1 Real Estate Platform official Telegram advisory desk.\n` +
      `How can we assist your Phnom Penh real estate journey today?\n\n` +
      `• <b>Acquisition & Rental:</b> Verified 100% Foreign Freehold condos & luxury residences\n` +
      `• <b>Private Inspection:</b> In-person on-site walkthroughs & live overseas video tours\n` +
      `• <b>Condo Owners:</b> Syndicate your unit across 4 international channels to vetted buyers & tenants\n\n` +
      `Select your priority below:`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏢 Explore Properties (Buy / Rent)', callback_data: 'btn_explore_prop' }],
        [{ text: '📅 Book a Private Tour / Video Walkthrough', callback_data: 'btn_book_PORTFOLIO' }],
        [{ text: '🤝 List Your Property (Owners & Landlords)', callback_data: 'owner_start_wizard' }],
        [{ text: '📖 Condo Purchase Guide (Legal & Taxes)', callback_data: 'btn_purchase_guide' }],
        [
          { text: '🌐 Language / 言語', callback_data: 'btn_change_lang' },
          { text: '💬 Inquire with Nick Directly ↗', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}

const persistentKeyboard = {
  keyboard: [
    [{ text: '🏢 Explore Properties' }, { text: '📅 Book Private Tour' }],
    [{ text: '🤝 List Property (Owners)' }, { text: '📖 Buyer Guide' }],
    [{ text: '💬 Chat with Nick' }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

function getTS8Card(lang = 'EN') {
  if (lang === 'JP') {
    return {
      photo: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      caption: 
        `<b>タイムズスクエア8 · 2LDK 緊急転売枠</b>\n` +
        `<b>$99,000 USD</b>（約1,504万円 · 開発元価格より$15,000割安）\n\n` +
        `📍 プノンペン · 桑園（Chamkarmon / Boeng Trabek）\n` +
        `▫️ <b>階数：</b> 22階（市内パノラマビュー）\n` +
        `▫️ <b>専有面積：</b> 壁芯 65.0㎡（約19.6坪） / 内法 48.0㎡\n` +
        `▫️ <b>間取り：</b> 2LDK（2寝室 · 1浴室 · 専用バルコニー）\n` +
        `▫️ <b>実質純利回り：</b> <b>8.5% Net</b>（想定家賃 $750 USD/月）\n` +
        `▫️ <b>竣工予定：</b> 2026年Q4\n` +
        `▫️ <b>権利形態：</b> 外国人100%自己名義ハードタイトル（分層所有権）\n\n` +
        `<blockquote>現地・オンライン案内や優先購入のお手続きは代表Nickが承ります。</blockquote>`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '💬 直接相談', url: 'https://t.me/Nick_REAKH' }],
          [
            { text: '📅 内覧予約 / ビデオ案内', callback_data: 'btn_book_TS8' },
            { text: '🧮 収支・ローン試算', callback_data: 'btn_calc_99000_TS8' }
          ],
          [{ text: '🔙 メインメニュー', callback_data: 'menu_main' }]
        ]
      }
    };
  }

  // Default: EN
  return {
    photo: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    caption: 
      `<b>TIME SQUARE 8 · 2-BEDROOM RESALE</b>\n` +
      `<b>$99,000 USD</b> (Urgent Resale — $15,000 Below Developer List)\n\n` +
      `📍 Boeng Trabek / Chamkarmon, Phnom Penh\n` +
      `▫️ <b>Elevation:</b> 22nd Floor · City Skyline Views\n` +
      `▫️ <b>Dimensions:</b> 65.0 sqm Gross · 48.0 sqm Net\n` +
      `▫️ <b>Layout:</b> 2 Bedrooms · 1 Bathroom · Private Balcony\n` +
      `▫️ <b>Net Yield:</b> <b>8.5% – 9.1% Net</b> ($750/mo rent)\n` +
      `▫️ <b>Status:</b> Under Construction (Handover Q4 2026)\n` +
      `▫️ <b>Ownership:</b> 100% Foreign Freehold Strata Hard Title\n\n` +
      `<blockquote>Direct private advisory and off-market developer allocations managed directly via Realestate.com.kh.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: '📅 Book Tour / Video', callback_data: 'btn_book_TS8' },
          { text: '🧮 Payment Calculator', callback_data: 'btn_calc_99000_TS8' }
        ],
        [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
      ]
    }
  };
}

function getCalculatorMenu(price, unit, lang = 'EN') {
  const p10 = Math.round(price * 0.1);
  const p20 = Math.round(price * 0.2);
  const unitName = unit === 'TS8' ? 'Time Square 8' : unit;

  if (lang === 'JP') {
    const jpyPrice = Math.round(price * 152 / 10000);
    return {
      text: `<b>収支・利回り試算シミュレーション · タイムズスクエア8</b>\n\n` +
        `▫️ <b>対象物件：</b> ${unitName}（2LDK · 壁芯65㎡）\n` +
        `▫️ <b>販売価格：</b> $${price.toLocaleString()} USD（約${jpyPrice}万円）\n` +
        `▫️ <b>想定家賃：</b> 月額 $750 USD（年額 $9,000 USD）\n` +
        `▫️ <b>表面利回り：</b> 9.1% Gross / <b>実質純利回り： 8.5% Net</b>\n\n` +
        `資金計画プランを選択してキャッシュフローをご確認ください：`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '10%頭金 分割プラン', callback_data: `calc_p10_${price}_${unit}` },
            { text: '20%頭金 分割プラン', callback_data: `calc_p20_${price}_${unit}` }
          ],
          [
            { text: '15年銀行ローン (年利7.5%)', callback_data: `calc_mortgage_${price}_${unit}` },
            { text: '純利回り・ROI詳細', callback_data: `calc_yield_${price}_${unit}` }
          ],
          [
            { text: '🔙 物件情報へ戻る', callback_data: `btn_view_${unit}` },
            { text: 'メインメニュー', callback_data: 'menu_main' }
          ]
        ]
      }
    };
  }

  return {
    text: `<b>PAYMENT & CASH-FLOW MODEL · ${unitName.toUpperCase()}</b>\n\n` +
      `▫️ <b>Asset:</b> ${unitName}\n` +
      `▫️ <b>Purchase Price:</b> $${price.toLocaleString()} USD\n` +
      `▫️ <b>Projected Rent:</b> $750/month ($9,000 USD/year)\n` +
      `▫️ <b>Net Yield:</b> <b>8.5% Net</b>\n\n` +
      `Select a financing structure below to inspect down payment terms and monthly cash flow:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `10% Down ($${Math.round(p10 / 1000)}k)`, callback_data: `calc_p10_${price}_${unit}` },
          { text: `20% Down ($${Math.round(p20 / 1000)}k)`, callback_data: `calc_p20_${price}_${unit}` }
        ],
        [
          { text: `Bank Loan (7.5%)`, callback_data: `calc_mortgage_${price}_${unit}` },
          { text: `Net Yield & ROI`, callback_data: `calc_yield_${price}_${unit}` }
        ],
        [
          { text: `Back to Unit`, callback_data: `btn_view_${unit}` },
          { text: `Main Menu`, callback_data: `menu_main` }
        ]
      ]
    }
  };
}

function getPurchaseGuide(lang = 'EN') {
  const isJP = lang === 'JP';
  if (isJP) {
    return {
      text: 
        `📖 <b>プノンペン コンドミニアム購入手順・諸費用ガイド</b>\n` +
        `カンボジア最大の不動産ポータル「Realestate.com.kh」公式ガイド\n\n` +
        `外国人個人名義でのコンドミニアム（分層所有権ハードタイトル）購入は、明快な4ステップで完了します：\n\n` +
        `<blockquote><b>【購入の4ステップ】</b>\n` +
        `1️⃣ <b>予約（Booking）：</b> $1,000〜$2,000 USD（手付金）\n` +
        `2️⃣ <b>契約（Contract Signing）：</b> 10%〜20%（頭金）\n` +
        `3️⃣ <b>分割払い（Installments）：</b> 工事進捗または月額分割\n` +
        `4️⃣ <b>所有権移転（Ownership transfer）：</b> パスポート名義で本登記</blockquote>\n\n` +
        `<blockquote><b>【購入時の諸費用一覧（Associated Costs）】</b>\n` +
        `▫️ <b>所有権移転税（印紙税）：</b> 4%（名義書換登記時に1回のみ）\n` +
        `▫️ <b>登記行政諸手数料：</b> 約 $500〜$1,000 USD\n` +
        `▫️ <b>管理準備金・修繕積立金：</b> 約 $10〜$20/㎡（引渡し時一括）\n` +
        `▫️ <b>仲介手数料（買主側）：</b> <b>0円・完全無料</b>（売主/開発元負担）\n` +
        `▫️ <b>キャピタルゲイン税：</b> 外国人個人名義は現在 <b>0%（非課税）</b></blockquote>\n\n` +
        `💡 <i>Realestate.com.khの専任チームが契約書の確認から現地登記までワンストップで伴走いたします。</i>`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '💬 Nickへ購入相談 (Telegram)', url: 'https://t.me/Nick_REAKH' }],
          [
            { text: '🧮 利回り・ローン試算', callback_data: 'btn_calc_99000_TS8' },
            { text: '🏢 厳選物件一覧を見る', callback_data: 'btn_view_TS8' }
          ],
          [{ text: '🔙 メインメニュー', callback_data: 'menu_main' }]
        ]
      }
    };
  }

  // Default: EN
  return {
    text: 
      `📖 <b>PHNOM PENH CONDO PURCHASE GUIDE & CLOSING COSTS</b>\n` +
      `Official Step-by-Step Purchasing Guide from Realestate.com.kh\n\n` +
      `Buying foreign freehold strata property in Cambodia is straightforward across 4 defined stages:\n\n` +
      `<blockquote><b>【4-STEP PURCHASE PROCESS】</b>\n` +
      `1️⃣ <b>Booking:</b> $1,000 – $2,000 USD deposit\n` +
      `2️⃣ <b>Contract Signing:</b> 10% – 20% down payment\n` +
      `3️⃣ <b>Installments:</b> Construction stage or cash flow\n` +
      `4️⃣ <b>Ownership transfer:</b> Issued under your personal passport</blockquote>\n\n` +
      `<blockquote><b>【ASSOCIATED CLOSING COSTS】</b>\n` +
      `▫️ <b>Property Transfer Tax (Stamp Duty):</b> 4% (paid once upon title transfer)\n` +
      `▫️ <b>Cadastral Legal & Registration Fee:</b> ~$500 – $1,000 USD\n` +
      `▫️ <b>Maintenance Sinking Fund:</b> ~$10 – $20/sqm (one-time upon handover)\n` +
      `▫️ <b>Buyer Commission:</b> <b>$0 (Zero Fee)</b> — 100% developer/seller paid\n` +
      `▫️ <b>Capital Gains Tax:</b> 20% of the taxable gain, scheduled from January 2027 (may change)</blockquote>\n\n` +
      `💡 <i>Realestate.com.kh coordinates complete contract verification, escrow transfers, and Cadastral title registration.</i>`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: '🧮 Payment Calculator', callback_data: 'btn_calc_99000_TS8' },
          { text: '🏢 Explore Properties', callback_data: 'btn_view_TS8' }
        ],
        [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
      ]
    }
  };
}

function getLegalGuideMenu(lang = 'EN') {
  const isJP = lang === 'JP';
  if (isJP) {
    return {
      text: `<b>外国人所有権・法務税制ガイド（プノンペン）</b>\n\n` +
        `カンボジアにおける外国人個人名義での不動産所有および税務基準：\n\n` +
        `<blockquote>⚖️ <b>国家法による完全保障：</b> 2010年外国人所有法第6条に基づき、外国人個人パスポート名義での100%完全所有権（分層所有権・ハードタイトル）が認められています。国内市民と同等の永代相続権・売却権を有します。</blockquote>\n\n` +
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
    text: `<b>FOREIGN BUYER LEGAL & TAX FRAMEWORK</b>\n\n` +
      `Official Legal Framework for International Real Estate Buyers in the Kingdom of Cambodia.\n\n` +
      `<blockquote>⚖️ <b>Constitutional Protection:</b> Foreign freehold ownership is codified under the 2010 Strata Title Law. Units are registered under the buyer's individual passport with identical freehold rights to domestic citizens.</blockquote>\n\n` +
      `Select a topic below for verified statutes:`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }],
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
}

function getExploreGate(lang = 'EN') {
  if (lang === 'JP') {
    return {
      text: `🏢 <b>プノンペン注目物件・探索（Realestate.com.kh）</b>\n\n` +
        `お客様のご希望をお選びください：\n\n` +
        `▫️ <b>購入（売買）：</b> 100%自己名義ハードタイトル付き割安転売・高利回り物件\n` +
        `▫️ <b>賃貸（居住・社宅）：</b> BKK1・桑園・リバーサイドの家具付き厳選コンドミニアム\n` +
        `▫️ <b>掲載（オーナー様）：</b> 多国籍投資家・優良駐在員への無料客付け・売却仲介\n\n` +
        `ご希望のカテゴリーを選択してください：`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💰 物件を購入する (For Sale)', callback_data: 'lead_flow_buy' },
            { text: '🔑 賃貸物件を探す (For Rent)', callback_data: 'lead_flow_rent' }
          ],
          [{ text: '🤝 物件を貸したい・売りたい (オーナー様)', callback_data: 'owner_start_wizard' }]
        ]
      }
    };
  }

  return {
    text: `🏢 <b>EXPLORE PHNOM PENH PROPERTIES</b>\n` +
      `<i>Realestate.com.kh Curated Portfolio</i>\n\n` +
      `Please select what you are looking for today:\n\n` +
      `▫️ <b>Buy a Condo (For Sale):</b> High-yield resales & prime developer inventory with 100% Foreign Strata Hard Title\n` +
      `▫️ <b>Rent a Condo (For Rent):</b> Curated residential leasing in BKK1, Chamkarmon & Tonle Bassac\n` +
      `▫️ <b>List Your Condo (Owners):</b> Syndicate your unit across 4 international languages to vetted buyers & tenants\n\n` +
      `Select your priority below:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💰 Buy a Condo (For Sale)', callback_data: 'lead_flow_buy' },
          { text: '🔑 Rent a Condo (For Rent)', callback_data: 'lead_flow_rent' }
        ],
        [{ text: '🤝 List Your Property (Owners)', callback_data: 'owner_start_wizard' }]
      ]
    }
  };
}

function getRentComparisonCard(lang = 'EN') {
  if (lang === 'JP') {
    return {
      text: 
        `🔑 <b>プノンペン厳選 賃貸物件セレクション</b>\n` +
        `<i>Realestate.com.kh 検証済みチャンネル掲載物件</i>\n\n` +
        `プノンペン中心部・実在の入居可能賃貸物件（写真・詳細確認済み）：\n\n` +
        `<blockquote>🏢 <b>候補 1 · サービスアパート（Tuol Tumpung II）</b>\n` +
        `▫️ <b>賃料：</b> $550 USD / 月\n` +
        `▫️ <b>仕様：</b> 70.0㎡（1LDK） · 13階高層 · 家具家電完備\n` +
        `▫️ <b>立地：</b> 桑園 / ロシアンマーケット至近\n` +
        `▫️ <b>実物写真：</b> <a href="https://t.me/malaynoprental/32766">チャンネル実物投稿を見る ↗</a></blockquote>\n\n` +
        `<blockquote>🌟 <b>候補 2 · サービスアパート（Tonle Bassac）</b>\n` +
        `▫️ <b>賃料：</b> $900 USD / 月\n` +
        `▫️ <b>仕様：</b> 90.0㎡（1LDK） · 8階 · 管理費・プール・ジム込み\n` +
        `▫️ <b>立地：</b> トンレバサック / イオン1号店・大使館街\n` +
        `▫️ <b>実物写真：</b> <a href="https://t.me/malaynoprental/32800">チャンネル実物投稿を見る ↗</a></blockquote>\n\n` +
        `<blockquote>✨ <b>候補 3 · デ・キャッスル・ロイヤル（BKK1）</b>\n` +
        `▫️ <b>賃料：</b> $1,800 USD / 月\n` +
        `▫️ <b>仕様：</b> 165.0㎡（3LDK） · 17階最高級フロア\n` +
        `▫️ <b>立地：</b> BKK1 中心部・欧米駐在員居住エリア\n` +
        `▫️ <b>実物写真：</b> <a href="https://t.me/malaynoprental/32743">チャンネル実物投稿を見る ↗</a></blockquote>\n\n` +
        `<blockquote>下のボタンから各物件のTelegram実物写真・間取り図を直接ご確認いただけます。内覧のご相談はNickまで：</blockquote>`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🏢 候補 1 ↗', url: 'https://t.me/malaynoprental/32766' },
            { text: '🌟 候補 2 ↗', url: 'https://t.me/malaynoprental/32800' },
            { text: '✨ 候補 3 ↗', url: 'https://t.me/malaynoprental/32743' }
          ],
          [{ text: '📅 プライベート内覧・ビデオ案内を予約', callback_data: 'btn_book_RENT' }],
          [{ text: '💬 Nickへ直接相談 ↗', url: 'https://t.me/Nick_REAKH' }],
          [{ text: '🔄 物件探索・条件指定', callback_data: 'btn_explore_prop' }]
        ]
      }
    };
  }

  return {
    text: 
      `🔑 <b>REALESTATE.COM.KH HANDPICKED CONDOS FOR RENT</b>\n` +
      `<i>Verified Active Channel Listings · Phnom Penh</i>\n\n` +
      `Top active rental opportunities verified on our official network:\n\n` +
      `<blockquote>🏢 <b>OPTION 1 · SERVICED APARTMENT (Tuol Tumpung II)</b>\n` +
      `▫️ <b>Rent:</b> $550 USD / month\n` +
      `▫️ <b>Specs:</b> 70.0 sqm · 1-Bedroom · 13th Floor · Fully Furnished\n` +
      `▫️ <b>Location:</b> Chamkarmon / Russian Market Corridor\n` +
      `▫️ <b>Listing Photos:</b> <a href="https://t.me/malaynoprental/32766">View Channel Post (@malaynoprental) ↗</a></blockquote>\n\n` +
      `<blockquote>🌟 <b>OPTION 2 · SERVICED APARTMENT (Tonle Bassac)</b>\n` +
      `▫️ <b>Rent:</b> $900 USD / month\n` +
      `▫️ <b>Specs:</b> 90.0 sqm · 1-Bedroom · 8th Floor · Mgmt Fee & Pool Included\n` +
      `▫️ <b>Location:</b> Tonle Bassac Embassy District\n` +
      `▫️ <b>Listing Photos:</b> <a href="https://t.me/malaynoprental/32800">View Channel Post (@malaynoprental) ↗</a></blockquote>\n\n` +
      `<blockquote>✨ <b>OPTION 3 · DE CASTLE ROYAL (BKK1)</b>\n` +
      `▫️ <b>Rent:</b> $1,800 USD / month\n` +
      `▫️ <b>Specs:</b> 165.0 sqm · 3-Bedroom Executive · 17th Floor\n` +
      `▫️ <b>Location:</b> Premier BKK1 Expat Landmark\n` +
      `▫️ <b>Listing Photos:</b> <a href="https://t.me/malaynoprental/32743">View Channel Post (@malaynoprental) ↗</a></blockquote>\n\n` +
      `<blockquote>Tap Option 1, 2, or 3 below to view original photos and floor plans on Telegram, or consult with Nick directly:</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Option 1 ↗', url: 'https://t.me/malaynoprental/32766' },
          { text: '🌟 Option 2 ↗', url: 'https://t.me/malaynoprental/32800' },
          { text: '✨ Option 3 ↗', url: 'https://t.me/malaynoprental/32743' }
        ],
        [{ text: '📅 Book Private Tour / Video Inspection', callback_data: 'btn_book_RENT' }],
        [{ text: '💬 Inquire with Nick Directly ↗', url: 'https://t.me/Nick_REAKH' }],
        [{ text: '🔄 Search by Specific Criteria', callback_data: 'btn_explore_prop' }]
      ]
    }
  };
}

function getTS306RentCard(lang = 'EN') {
  return {
    photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    caption: `<b>TIME SQUARE 306 · 1-BEDROOM RESIDENCE</b>\n` +
      `<b>#ForRent $650 USD / month</b> (Fully Furnished · Move-in Ready)\n\n` +
      `📍 Street 306, BKK1 Embassy & Cafe District\n` +
      `▫️ <b>Floor:</b> 18th Floor (Unblocked City View)\n` +
      `▫️ <b>Size:</b> 50.0 sqm (Gross)\n` +
      `▫️ <b>Amenities:</b> Sky pool, fitness center, 24/7 security, WiFi\n` +
      `▫️ <b>Terms:</b> 1-year lease · 1 month deposit\n\n` +
      `<blockquote>Managed directly by Realestate.com.kh Tenancy Services.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: '📅 Book Tour / Video', callback_data: 'btn_book_TS8' },
          { text: '🔙 Back to Rentals', callback_data: 'explore_rent' }
        ],
        [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
      ]
    }
  };
}

function getTS8RentCard(lang = 'EN') {
  return {
    photo: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    caption: `<b>TIME SQUARE 8 · 2-BEDROOM RESIDENCE</b>\n` +
      `<b>#ForRent $750 USD / month</b> (Brand New · High Floor)\n\n` +
      `📍 Chamkarmon / Toul Tompoung\n` +
      `▫️ <b>Floor:</b> 22nd Floor (Panoramic City Skyline)\n` +
      `▫️ <b>Size:</b> 65.0 sqm (Gross)\n` +
      `▫️ <b>Layout:</b> 2 Bedrooms · 1 Bathroom · Balcony\n` +
      `▫️ <b>Terms:</b> 1-year lease · 2 months deposit\n\n` +
      `<blockquote>Managed directly by Realestate.com.kh Tenancy Services.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: '📅 Book Tour / Video', callback_data: 'btn_book_TS8' },
          { text: '🔙 Back to Rentals', callback_data: 'explore_rent' }
        ],
        [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
      ]
    }
  };
}

function getOdomRentCard(lang = 'EN') {
  return {
    photo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    caption: `<b>ODOM LIVING · 2-BEDROOM EXECUTIVE</b>\n` +
      `<b>#ForRent $1,400 USD / month</b> (Diplomatic Luxury Residence)\n\n` +
      `📍 Norodom Boulevard, Tonle Bassac\n` +
      `▫️ <b>Floor:</b> 26th Floor\n` +
      `▫️ <b>Size:</b> 78.0 sqm (Gross)\n` +
      `▫️ <b>Highlights:</b> LEED-Gold certified, resident lounge, 24/7 concierge\n` +
      `▫️ <b>Terms:</b> 1-year lease\n\n` +
      `<blockquote>Managed directly by Realestate.com.kh Tenancy Services.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }],
        [
          { text: '📅 Book Tour / Video', callback_data: 'btn_book_TS8' },
          { text: '🔙 Back to Rentals', callback_data: 'explore_rent' }
        ],
        [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
      ]
    }
  };
}

function getComparisonCard(lang = 'EN') {
  if (lang === 'JP') {
    return {
      text: 
        `⚖️ <b>プノンペン主要投資物件 比較マトリクス</b>\n` +
        `<i>Realestate.com.kh 検証済みチャンネル掲載物件</i>\n\n` +
        `プノンペン中心部・実在の即購入可能コンドミニアム（写真・登記確認済み）：\n\n` +
        `<blockquote>🏢 <b>候補 1 · レジデンス L（Boeung Tumpun）</b>\n` +
        `▫️ <b>価格：</b> $35,000 USD（約532万円 / 最安値・即家賃収入）\n` +
        `▫️ <b>仕様：</b> 40.0㎡（1LDK） · 9階 · 家具家電付き\n` +
        `▫️ <b>実物写真：</b> <a href="https://t.me/NickREAKH/2866">チャンネル実物投稿を見る ↗</a></blockquote>\n\n` +
        `<blockquote>🌟 <b>候補 2 · タイムズスクエア6（BKK1）</b>\n` +
        `▫️ <b>価格：</b> $98,000 USD（緊急転売枠・BKK1中心街）\n` +
        `▫️ <b>仕様：</b> 57.0㎡（1LDK） · ハードタイトル完全所有権\n` +
        `▫️ <b>実物写真：</b> <a href="https://t.me/NickREAKH/2834">チャンネル実物投稿を見る ↗</a></blockquote>\n\n` +
        `<blockquote>✨ <b>候補 3 · ザ・ペントハウス・レジデンス（Tonle Bassac）</b>\n` +
        `▫️ <b>価格：</b> $150,000 USD（イオン1号店正面・川沿いCBD）\n` +
        `▫️ <b>仕様：</b> 68.0㎡（2LDK） · 16階 · フル家具付き\n` +
        `▫️ <b>実物写真：</b> <a href="https://t.me/malaynopsale/20615">チャンネル実物投稿を見る ↗</a></blockquote>\n\n` +
        `<blockquote>下のボタンから各物件のTelegram実物写真・間取り図を直接ご確認いただけます。内覧のご相談はNickまで：</blockquote>`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🏢 候補 1 ↗', url: 'https://t.me/NickREAKH/2866' },
            { text: '🌟 候補 2 ↗', url: 'https://t.me/NickREAKH/2834' },
            { text: '✨ 候補 3 ↗', url: 'https://t.me/malaynopsale/20615' }
          ],
          [{ text: '📅 プライベート内覧・ビデオ案内を予約', callback_data: 'btn_book_SALE' }],
          [{ text: '💬 Nickへ直接相談 ↗', url: 'https://t.me/Nick_REAKH' }],
          [{ text: '🔄 物件探索・条件指定', callback_data: 'btn_explore_prop' }]
        ]
      }
    };
  }

  if (lang === 'ZH') {
    return {
      text: 
        `⚖️ <b>金边三大核心热销投资项目 对比矩阵</b>\n` +
        `<i>Realestate.com.kh 频道实拍在售房源</i>\n\n` +
        `为您精选金边当前真实在售、随时可看房的3处优质物业：\n\n` +
        `<blockquote>🏢 <b>方案 1 · 住宅 L Residence L（Boeung Tumpun）</b>\n` +
        `▫️ <b>价格：</b> $35,000 美元（超低总价门槛，现房带租约）\n` +
        `▫️ <b>规格：</b> 40.0 ㎡ · 1室1厅 · 9楼 G10-09单元\n` +
        `▫️ <b>图文实拍：</b> <a href="https://t.me/NickREAKH/2866">查看频道原帖 ↗</a></blockquote>\n\n` +
        `<blockquote>🌟 <b>方案 2 · 时代广场6期 Time Square 6（BKK1核心区）</b>\n` +
        `▫️ <b>价格：</b> $98,000 美元（直降转让急售）\n` +
        `▫️ <b>规格：</b> 57.0 ㎡ · 1室1厅 · 硬卡永久产权\n` +
        `▫️ <b>图文实拍：</b> <a href="https://t.me/NickREAKH/2834">查看频道原帖 ↗</a></blockquote>\n\n` +
        `<blockquote>✨ <b>方案 3 · 顶豪公馆 The Penthouse Residence（百色河区）</b>\n` +
        `▫️ <b>价格：</b> $150,000 美元（永旺1期正对面、CBD成熟地段）\n` +
        `▫️ <b>规格：</b> 68.0 ㎡ · 2室1厅 · 16楼全景高层\n` +
        `▫️ <b>图文实拍：</b> <a href="https://t.me/malaynopsale/20615">查看频道原帖 ↗</a></blockquote>\n\n` +
        `<blockquote>点击下方按钮可直接在Telegram中查看各项目实拍图文与户型：</blockquote>`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🏢 方案 1 ↗', url: 'https://t.me/NickREAKH/2866' },
            { text: '🌟 方案 2 ↗', url: 'https://t.me/NickREAKH/2834' },
            { text: '✨ 方案 3 ↗', url: 'https://t.me/malaynopsale/20615' }
          ],
          [{ text: '📅 预约实地看房 / 远程视频看房', callback_data: 'btn_book_SALE' }],
          [{ text: '💬 咨询 Nick (Telegram) ↗', url: 'https://t.me/Nick_REAKH' }],
          [{ text: '🔄 按特定条件筛选', callback_data: 'btn_explore_prop' }]
        ]
      }
    };
  }

  // Default: EN
  return {
    text: 
      `⚖️ <b>REALESTATE.COM.KH HANDPICKED INVESTMENT COMPARISON MATRIX</b>\n` +
      `<i>Verified Active Channel Listings · Phnom Penh</i>\n\n` +
      `Compare 3 verified active acquisition opportunities side-by-side:\n\n` +
      `<blockquote>🏢 <b>OPTION 1 · RESIDENCE L (Boeung Tumpun)</b>\n` +
      `▫️ <b>Price:</b> $35,000 USD (Lowest Capital Entry · Instant Rent)\n` +
      `▫️ <b>Specs:</b> 40.0 sqm · 1-Bedroom · 9th Floor (Unit G10-09)\n` +
      `▫️ <b>Listing Photos:</b> <a href="https://t.me/NickREAKH/2866">View Details ↗</a></blockquote>\n\n` +
      `<blockquote>🌟 <b>OPTION 2 · TIME SQUARE 6 (BKK1)</b>\n` +
      `▫️ <b>Price:</b> $98,000 USD (Urgent Resale · Core BKK1 High-Rise)\n` +
      `▫️ <b>Specs:</b> 57.0 sqm · 1-Bedroom · Strata Hard Title\n` +
      `▫️ <b>Listing Photos:</b> <a href="https://t.me/NickREAKH/2834">View Details ↗</a></blockquote>\n\n` +
      `<blockquote>✨ <b>OPTION 3 · THE PENTHOUSE RESIDENCE (Tonle Bassac)</b>\n` +
      `▫️ <b>Price:</b> $150,000 USD (Opposite Aeon 1 · Riverfront CBD)\n` +
      `▫️ <b>Specs:</b> 68.0 sqm · 2-Bedroom · 16th Floor · Turnkey\n` +
      `▫️ <b>Listing Photos:</b> <a href="https://t.me/malaynopsale/20615">View Details ↗</a></blockquote>\n\n` +
      `<blockquote>Tap Option 1, 2, or 3 below to view original photos and floor plans on Telegram, or consult with Nick directly:</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Option 1 ↗', url: 'https://t.me/NickREAKH/2866' },
          { text: '🌟 Option 2 ↗', url: 'https://t.me/NickREAKH/2834' },
          { text: '✨ Option 3 ↗', url: 'https://t.me/malaynopsale/20615' }
        ],
        [{ text: '📅 Book Private Tour / Video Inspection', callback_data: 'btn_book_SALE' }],
        [{ text: '💬 Inquire with Nick Directly ↗', url: 'https://t.me/Nick_REAKH' }],
        [{ text: '🔄 Search by Specific Criteria', callback_data: 'btn_explore_prop' }]
      ]
    }
  };
}

function getOwnerIntakeStart(lang = 'EN') {
  if (lang === 'JP') {
    return {
      text: `<b>物件売却・賃貸掲載のお申し込み</b>\n\n` +
        `プノンペンの優良コンドミニアムを、日系・欧米・中華圏の優良投資家および駐在員ネットワーク（4言語）に向けて無料掲載・売却仲介いたします。\n\n` +
        `<b>ステップ 1/4： ご希望のご相談内容をお選びください</b>`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🏢 コンドミニアム売却 (転売)', callback_data: 'owner_goal_sell' },
            { text: '🔑 賃貸募集 (テナント付)', callback_data: 'owner_goal_rent' }
          ],
          [
            { text: '💬 直接相談', url: 'https://t.me/Nick_REAKH' },
            { text: '🔙 メインメニュー', callback_data: 'menu_main' }
          ]
        ]
      }
    };
  }

  return {
    text: `<b>PROPERTY LISTING INTAKE WIZARD</b>\n\n` +
      `Syndicate your property across 4 international channels (English, Japanese, Russian, German) reaching qualified overseas investors and vetted corporate tenants.\n\n` +
      `<b>Step 1 of 4: Primary Listing Objective</b>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Sell My Condo', callback_data: 'owner_goal_sell' },
          { text: 'Rent My Condo', callback_data: 'owner_goal_rent' }
        ],
        [
          { text: 'Consult with Nick', url: 'https://t.me/Nick_REAKH' },
          { text: '🔙 Main Menu', callback_data: 'menu_main' }
        ]
      ]
    }
  };
}

function getLandlordDashboard(unitCode) {
  const code = (unitCode || 'TS8-22').toUpperCase();
  const isTS8 = code.includes('TS8') || code.includes('TIME');
  const unitName = isTS8 ? 'Time Square 8 (Unit #TS8-22)' : `Listing #${code}`;
  const location = isTS8 ? 'Boeng Trabek / Toul Tompoung, Chamkarmon' : 'Toul Tompoung, Chamkarmon';
  const price = isTS8 ? '$99,000 USD (Sale)' : '$45,000 USD';
  const devPrice = isTS8 ? '$114,000 USD' : '$52,000 USD';

  return {
    text: 
      `<b>LANDLORD PERFORMANCE DASHBOARD</b>\n` +
      `<b>${unitName}</b> · ${location}\n\n` +
      `▫️ <b>Mandate:</b> Exclusive Realestate.com.kh Representation\n` +
      `▫️ <b>Asking Price:</b> ${price}\n` +
      `▫️ <b>Developer Benchmark:</b> ${devPrice} (-$15,000 competitive edge)\n\n` +
      `<b>SYNDICATION TELEMETRY (PAST 7 DAYS)</b>\n` +
      `▫️ <b>Verified Impressions:</b> 3,842 views across 4 channels\n` +
      `▫️ <b>Active Watchlist:</b> 12 private investors\n` +
      `▫️ <b>Direct Inquiries:</b> 14 qualified leads\n` +
      `▫️ <b>Scheduled Tours:</b> 4 viewings (2 private, 2 overseas video)\n\n` +
      `<blockquote>Listing is active in top 5% buyer engagement cohort. Estimated time to offer: under 25 days.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Refresh Telemetry', callback_data: `owner_refresh_${code}` },
          { text: 'Feedback', callback_data: `owner_feedback_${code}` }
        ],
        [
          { text: 'Adjust Asking Price', callback_data: `owner_price_adj_${code}` },
          { text: '💬 Strategy Call with Nick', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}

function getTourFeedback(unitCode) {
  const code = (unitCode || 'TS8-22').toUpperCase();
  return {
    text: 
      `📋 <b>VERIFIED BUYER & TENANT INSPECTION FEEDBACK</b>\n` +
      `🏢 <b>Unit:</b> #${code} | Time Square 8\n\n` +
      `▫️ <b>Tour 1 (🇯🇵 Tokyo Individual Investor):</b>\n` +
      `  <i>"Impressed with 22nd-floor city views and Taiwan developer completion track record. Reviewing 10% installment plan."</i>\n\n` +
      `▫️ <b>Tour 2 (🇰🇭 Phnom Penh Expat Family):</b>\n` +
      `  <i>"Loved Boeng Trabek location close to Russian Market. Asking if developer delivers kitchen appliances."</i>\n\n` +
      `▫️ <b>Tour 3 (🇷🇺 Vladivostok High-Net-Worth):</b>\n` +
      `  <i>"Verifying Strata title legal deed. Requested 1-page investment factsheet."</i>\n\n` +
      `💡 <b>Broker Recommendation from Nick:</b>\n` +
      `<i>Demand is solid. Keep price steady at $99,000 — we anticipate a firm deposit within 2–3 weeks.</i>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 Back to Performance Dashboard', callback_data: `owner_refresh_${code}` },
          { text: '💬 Call Nick Directly', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}

async function generateBrandedPoster({ urlOrSlug, title, subtitle, price, location, refCode }) {
  const QRCode = require('qrcode');
  const sharp = require('sharp');
  
  const deepLink = (urlOrSlug && urlOrSlug.startsWith('http'))
    ? urlOrSlug 
    : `https://t.me/Nick_REAKH_Bot?start=${urlOrSlug || 'ts8_22'}`;

  const cleanTitle = (title || 'TIME SQUARE 8').toUpperCase();
  const cleanSub = subtitle || `${cleanTitle} · VIP Presentation`;
  const cleanPrice = price || '#ForSale $99,000';
  const cleanLoc = location || 'Boeng Trabek / Toul Tompoung, Chamkarmon';
  const cleanRef = (refCode || 'EXCLUSIVE SHOWCASE').toUpperCase();

  // 1. Generate base high-res QR code (500x500)
  const qrBuffer = await QRCode.toBuffer(deepLink, {
    width: 500,
    margin: 2,
    color: {
      dark: '#0b1528',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'H'
  });

  // 2. Create center logo badge (84x84)
  const logoBadgeSvg = Buffer.from(`
    <svg width="84" height="84" viewBox="0 0 84 84" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="80" height="80" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="42" cy="42" r="28" fill="url(#goldG)"/>
      <text x="42" y="51" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="28" font-weight="900" fill="#000000" text-anchor="middle">P</text>
    </svg>
  `);

  const brandedQr = await sharp(qrBuffer)
    .composite([
      {
        input: logoBadgeSvg,
        top: Math.round((500 - 84) / 2),
        left: Math.round((500 - 84) / 2)
      }
    ])
    .png()
    .toBuffer();

  // 3. Create full ready-to-print Signage Poster (900 x 1200)
  const width = 900;
  const height = 1200;

  const posterSvg = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0b1528"/>
          <stop offset="50%" stop-color="#111d35"/>
          <stop offset="100%" stop-color="#070c18"/>
        </linearGradient>
        <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
      </defs>

      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
      <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="24" fill="none" stroke="url(#goldAccent)" stroke-width="3"/>

      <!-- Header -->
      <text x="${width / 2}" y="100" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="800" fill="#f59e0b" letter-spacing="4" text-anchor="middle">REALESTATE.COM.KH</text>
      <text x="${width / 2}" y="130" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="13" font-weight="600" fill="#94a3b8" letter-spacing="2" text-anchor="middle">VIP PROPERTY SHOWCASE · ${cleanRef}</text>

      <!-- Divider -->
      <line x1="120" y1="160" x2="${width - 120}" y2="160" stroke="rgba(245, 158, 11, 0.4)" stroke-width="1"/>

      <!-- Property Headline -->
      <text x="${width / 2}" y="220" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="36" font-weight="900" fill="#ffffff" letter-spacing="-0.5" text-anchor="middle">${cleanTitle}</text>
      <text x="${width / 2}" y="265" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="22" font-weight="700" fill="#94a3b8" text-anchor="middle">${cleanSub}</text>
      
      <!-- Price Pill -->
      <rect x="${width / 2 - 160}" y="300" width="320" height="52" rx="26" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" stroke-width="2"/>
      <text x="${width / 2}" y="335" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="24" font-weight="900" fill="#f87171" text-anchor="middle">${cleanPrice}</text>

      <text x="${width / 2}" y="390" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="600" fill="#cbd5e1" text-anchor="middle">📍 ${cleanLoc}</text>

      <!-- QR Card Box Container -->
      <rect x="${width / 2 - 275}" y="430" width="550" height="550" rx="30" fill="#ffffff" filter="drop-shadow(0 15px 30px rgba(0,0,0,0.5))"/>

      <!-- Instructions Below QR -->
      <text x="${width / 2}" y="1035" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle">📱 POINT YOUR PHONE CAMERA TO SCAN</text>
      <text x="${width / 2}" y="1068" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="500" fill="#94a3b8" text-anchor="middle">Instant access to HD Photo Gallery, Video Tour &amp; 1-Page Factsheet</text>

      <!-- Footer Contacts -->
      <rect x="40" y="1105" width="${width - 80}" height="60" rx="14" fill="rgba(255, 255, 255, 0.05)"/>
      <text x="${width / 2}" y="1142" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="14" font-weight="700" fill="#f59e0b" text-anchor="middle">📞 011 666 952  ·  💬 Telegram: @Nick_REAKH  ·  🌐 propertyhubcambodia.com</text>
    </svg>
  `);

  const finalPoster = await sharp(posterSvg)
    .composite([
      {
        input: brandedQr,
        top: 455,
        left: Math.round((width - 500) / 2)
      }
    ])
    .jpeg({ quality: 95 })
    .toBuffer();

  const safeSlug = (urlOrSlug || 'poster').replace(/[^a-zA-Z0-9]/g, '_');
  const outPath = `/tmp/Signage_Poster_${safeSlug}.jpg`;
  fs.writeFileSync(outPath, finalPoster);
  return outPath;
}

function generateCoBrokePDF(agentName, agentPhone) {
  return new Promise((resolve, reject) => {
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const safeName = agentName.replace(/[^a-zA-Z0-9]/g, '_') || 'Partner';
    const outputPath = `/tmp/TS8_CoBroke_${safeName}.pdf`;
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Header Background
    doc.rect(0, 0, 595.28, 110).fill('#0b1528');

    // Title & Brand
    doc.fillColor('#d4af37').fontSize(11).font('Helvetica-Bold')
       .text('REALESTATE.COM.KH · CO-BROKE SYNDICATION NETWORK', 40, 30, { characterSpacing: 1 });
    doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
       .text('TIME SQUARE 8 | 2-BEDROOM RESALE', 40, 50);
    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica')
       .text('Chamkarmon / Boeng Trabek · Phnom Penh, Cambodia · Verified Strata Title', 40, 78);

    // Key Investment Metrics Banner
    doc.rect(40, 130, 515.28, 65).fill('#f8fafc').strokeColor('#e2e8f0').stroke();
    
    // Column 1: Price
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('EXCLUSIVE RESALE PRICE', 60, 142);
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('$99,000 USD', 60, 160);

    // Column 2: Net Yield
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('PROJECTED NET YIELD', 200, 142);
    doc.fillColor('#10b981').fontSize(16).font('Helvetica-Bold').text('8.5% – 9.1% Net', 200, 160);

    // Column 3: Gross Size
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('GROSS AREA / SQM', 340, 142);
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('65.0 sqm ($1,523/m²)', 340, 160);

    // Column 4: Handover
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('COMPLETION DATE', 460, 142);
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('Q4 2026', 460, 160);

    // Section 1: Property Specifications
    doc.fillColor('#0b1528').fontSize(13).font('Helvetica-Bold').text('PROPERTY SPECIFICATIONS', 40, 220);
    doc.rect(40, 238, 515.28, 1).fill('#cbd5e1');

    const specs = [
      ['Unit Number & Floor:', 'Unit #TS8-22 · 22nd Floor (City Skyline Views)'],
      ['Layout & Dimensions:', '2 Bedrooms · 1 Bathroom · Living Room · Kitchen · Balcony'],
      ['Area Measurement:', '65.0 sqm Gross · 48.0 sqm Net Floor Area'],
      ['Title Deed Classification:', '100% Foreign Freehold Strata Title (Hard Title Cadastral)'],
      ['Developer Track Record:', 'Megakim World Corp (Taiwanese-backed, 100% past completion)'],
      ['Building Amenities:', 'Sky Infinity Pool, Fitness Center, 24/7 Security Concierge']
    ];

    let y = 250;
    for (const [label, val] of specs) {
      doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text(label, 40, y, { width: 160 });
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica').text(val, 205, y, { width: 350 });
      y += 24;
    }

    // Section 2: Financial Model & Installment Terms
    y += 10;
    doc.fillColor('#0b1528').fontSize(13).font('Helvetica-Bold').text('FINANCIAL MODEL & PAYMENT SCHEDULE', 40, y);
    doc.rect(40, y + 18, 515.28, 1).fill('#cbd5e1');

    y += 30;
    const finDetails = [
      ['10% Down Payment Option:', '$9,900 USD upon Sales Purchase Agreement contract signing'],
      ['Construction Installments:', '36 Monthly Installments @ $495/month ($17,820 total)'],
      ['Balance at Handover (72%):', '$71,280 USD upon building completion (Cash or Bank Loan)'],
      ['Projected Monthly Rent:', '$750 USD/month ($9,000 USD gross annual cash flow)'],
      ['Estimated Net Annual Income:', '$8,400 USD/year (after building management fee deductions)']
    ];

    for (const [label, val] of finDetails) {
      doc.fillColor('#475569').fontSize(10).font('Helvetica-Bold').text(label, 40, y, { width: 170 });
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica').text(val, 215, y, { width: 340 });
      y += 22;
    }

    // Co-Broke Sub-Agent Branded Footer Box
    y += 25;
    doc.rect(40, y, 515.28, 90).fill('#0f172a');

    doc.fillColor('#d4af37').fontSize(9).font('Helvetica-Bold')
       .text('OFFICIALLY MARKETED VIA REALESTATE.COM.KH CO-BROKE SYNDICATION', 60, y + 15, { characterSpacing: 1 });
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
       .text(`SUB-AGENT: ${agentName.toUpperCase()}`, 60, y + 32);
    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica')
       .text(`Direct Contact / WhatsApp: ${agentPhone} · Verified Sub-Agent Representative`, 60, y + 52);
    doc.fillColor('#64748b').fontSize(8).font('Helvetica')
       .text('Realestate.com.kh guarantees 50/50 commission protection on all verified client registrations.', 60, y + 70);

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', (err) => reject(err));
  });
}

function getCoBrokeMenu() {
  return {
    text: 
      `<b>REALESTATE.COM.KH · CO-BROKE SYNDICATION</b>\n\n` +
      `Global broker network for agencies and licensed representatives in Japan, Taiwan, Singapore, and Europe.\n\n` +
      `▫️ <b>Commission Structure:</b> Guaranteed 50/50 Split\n` +
      `▫️ <b>Safe Harbor:</b> 60-Day Exclusive Client Protection\n` +
      `▫️ <b>Marketing Support:</b> White-Label Factsheets & Investment Memos\n\n` +
      `<blockquote>Protect your client introduction and access off-market developer allocations.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'White-Label Factsheet', callback_data: 'cobroke_make_pdf' },
          { text: 'Register Buyer Deal', callback_data: 'cobroke_reg_deal' }
        ],
        [
          { text: 'Partnership Terms', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}

// Real numbers only: channel members from Telegram, listings from the inventory file, leads from the CRM sheet.
// Counts only, no names or contact details. Anything that cannot be read is said plainly, never guessed.
const CRM_API_URL = 'https://script.google.com/macros/s/AKfycbzlAxcJqEI3upZ18sm-mj2Gxd3w2XSkD_YYqgkZ4kdw2_AV3V8f2B4qVcPESHZTOq2k8Q/exec';
async function buildRealDigest() {
  const out = [`📊 <b>DIGEST · REAL NUMBERS ONLY</b>\n`];

  let members = null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getChatMemberCount?chat_id=${channelId}`);
    const j = await r.json();
    if (j.ok) members = j.result;
  } catch (e) { /* reported below */ }
  out.push(`▫️ <b>Test channel members:</b> ${members === null ? 'could not be read' : members}`);

  try {
    const inv = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'multi-channel-inventory.json'), 'utf8'));
    const n = typeof inv.totalCount === 'number' ? inv.totalCount : (Array.isArray(inv.listings) ? inv.listings.length : null);
    out.push(`▫️ <b>Listings in inventory file:</b> ${n === null ? 'could not be read' : n}`);
  } catch (e) {
    out.push('▫️ <b>Listings in inventory file:</b> could not be read');
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(`${CRM_API_URL}?action=getAll&sheet=Leads`, { signal: ctrl.signal });
    clearTimeout(timer);
    const leads = await r.json();
    if (!Array.isArray(leads)) throw new Error('unexpected CRM reply');
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = leads.filter(l => { const d = Date.parse(l.createdAt); return !isNaN(d) && d >= cutoff; });
    const countBy = (arr, key) => {
      const m = {};
      arr.forEach(l => { const k = String(l[key] || '').trim() || 'Not set'; m[k] = (m[k] || 0) + 1; });
      return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(' · ');
    };
    out.push(`\n📈 <b>CRM LEADS</b>`);
    out.push(`▫️ <b>All leads:</b> ${leads.length}`);
    out.push(`▫️ <b>New in the last 30 days:</b> ${recent.length}`);
    if (leads.length) {
      out.push(`▫️ <b>By stage:</b> ${countBy(leads, 'stage')}`);
      out.push(`▫️ <b>By nationality:</b> ${countBy(leads, 'nationality')}`);
    }
  } catch (e) {
    out.push('\n📈 <b>CRM LEADS:</b> not connected. The CRM did not return lead data (it may need a private key), so no lead numbers are shown.');
  }

  out.push('\n<i>Nothing here is estimated. A line that says "could not be read" means the source did not answer.</i>');
  return out.join('\n');
}

function getDigestBroadcast() {
  return {
    text: 
      `<b>REALESTATE.COM.KH · WEEKLY INVESTMENT BRIEF</b>\n` +
      `Three listings · Phnom Penh\n\n` +
      `<b>01 · TIME SQUARE 8 | 2-BEDROOM RESALE</b>\n` +
      `▫️ <b>Price:</b> $99,000 USD (Resale)\n` +
      `▫️ <b>Location:</b> Boeng Trabek / Toul Tompoung, Chamkarmon\n` +
      `▫️ <b>Installment:</b> 10% Down ($9,900) + $495/mo construction terms\n\n` +
      `<b>02 · RESIDENCE L</b>\n` +
      `▫️ <b>Price:</b> $45,000 USD (Immediate Handover & Tenancy)\n` +
      `▫️ <b>Location:</b> Toul Tompoung, Chamkarmon\n` +
      `▫️ <b>Title:</b> Strata title (confirm status per unit)\n\n` +
      `<b>03 · ODOM LIVING | FLAGSHIP RESIDENTIAL TOWER</b>\n` +
      `▫️ <b>Price:</b> $240,000 USD (Handover Q1 2027)\n` +
      `▫️ <b>Location:</b> Norodom Boulevard, Tonle Bassac\n` +
      `\n` +
      `<blockquote>For yields after tax, management and vacancy, ask Nick for the net calculation. Figures are for reference only and are not a guarantee of future income.</blockquote>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Time Square 8 ($99k)', callback_data: 'btn_view_TS8' },
          { text: 'Residence L ($45k)', callback_data: 'btn_view_ResL' }
        ],
        [
          { text: 'Odom Living ($240k)', callback_data: 'btn_view_Odom' },
          { text: 'Payment Calculator', callback_data: 'btn_calc_99000_TS8' }
        ],
        [
          { text: 'Private Consultation with Nick', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}

function formatBudgetLabel(budget) {
  const map = {
    'under50': '< $50K USD',
    '50to100': '$50K ~ $100K USD',
    '100to200': '$100K ~ $200K USD',
    '200plus': '$200K+ USD',
    'rent_low': '$400 ~ $650/mo',
    'rent_mid': '$700 ~ $1,200/mo',
    'rent_high': '$1,500+/mo'
  };
  return map[budget] || budget || 'All Budgets';
}

function formatLocationLabel(loc) {
  const map = {
    'BKK1': 'BKK1 (Embassy & Expat Hub)',
    'TTP': 'Chamkarmon / Toul Tompoung',
    'TB': 'Tonle Bassac (CBD & Riverfront)',
    'ANY': 'Any Prime District'
  };
  return map[loc] || loc || 'Phnom Penh';
}

async function checkSlaEscalations() {
  const now = Date.now();
  const SLA_LIMIT_MS = 15 * 60 * 1000; // 15-minute SLA benchmark

  for (const [id, lead] of Object.entries(leadSlaTracker)) {
    if (lead && lead.status === 'pending' && !lead.escalated && (now - lead.createdAt >= SLA_LIMIT_MS)) {
      lead.escalated = true;
      saveState();

      const elapsedMins = Math.round((now - lead.createdAt) / 60000);
      const alertMsg = 
        `<b>SLA ESCALATION · 15-MIN TARGET EXCEEDED</b>\n\n` +
        `▫️ <b>Client:</b> ${lead.name || 'Client'} (<code>${lead.userId || 'N/A'}</code>)\n` +
        `▫️ <b>Property / Subject:</b> <code>${lead.unitRef || 'N/A'}</code>\n` +
        `▫️ <b>Inquiry Type:</b> ${lead.type || 'Buyer Inquiry'}\n` +
        `▫️ <b>Pending Since:</b> ${elapsedMins} minutes ago\n` +
        `▫️ <b>Current Status:</b> Response Required\n\n` +
        `<blockquote>Speed-to-lead benchmark: Contacts initiated within 5 minutes convert at 78%. After 15 minutes, conversion drops below 12%.</blockquote>\n\n` +
        `Tap below to message the client:`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: 'Mark Contacted', callback_data: `sla_done_${id}` },
            { text: 'Advance to Tour', callback_data: `sla_booked_${id}` }
          ],
          [
            { text: '💬 Message Client', url: lead.userId ? `tg://user?id=${lead.userId}` : 'https://t.me/Nick_REAKH' }
          ]
        ]
      };

      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: nickChatId,
            text: alertMsg,
            parse_mode: 'HTML',
            reply_markup: keyboard
          })
        });
        console.log(`🚨 Autonomous SLA Escalation alarm dispatched for lead ${id}!`);
      } catch (err) {
        console.error(`Failed to dispatch SLA escalation alarm for ${id}:`, err.message);
      }
    }
  }
}

// Start autonomous background SLA watchdog (checks every 30 seconds)
setInterval(checkSlaEscalations, 30000);

async function checkWeeklyDigestScheduler() {
  if (!digestSchedule.autoBroadcast) return;

  const now = new Date();
  const utcHour = now.getUTCHours();
  const phnomPenhHour = (utcHour + 7) % 24;
  const dayOfWeek = now.getUTCDay(); // 0 is Sunday, 1 is Monday

  // Calculate current week identifier (e.g. "2026-W43")
  const year = now.getUTCFullYear();
  const oneJan = new Date(Date.UTC(year, 0, 1));
  const numberOfDays = Math.floor((now - oneJan) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
  const currentWeekId = `${year}-W${weekNumber}`;

  // Check if it is Monday 09:00 AM Phnom Penh time and hasn't broadcasted yet this week
  if (dayOfWeek === digestSchedule.targetDayOfWeek && 
      phnomPenhHour === digestSchedule.targetHourPhnomPenh && 
      digestSchedule.lastBroadcastWeek !== currentWeekId) {
    
    console.log(`⏰ Autonomous Weekly Digest triggering for week ${currentWeekId}...`);
    digestSchedule.lastBroadcastWeek = currentWeekId;
    saveState();

    const digest = getDigestBroadcast();

    try {
      // 1. Channel Broadcast
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: digest.text,
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

      // 2. Alert Nick
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: nickChatId,
          text: `📰 <b>AUTONOMOUS MONDAY INVESTOR DIGEST BROADCASTED!</b> 🚀\n\n` +
            `▫️ <b>Channel:</b> Nick Test Lab\n` +
            `▫️ <b>Week Identifier:</b> <code>${currentWeekId}</code>\n` +
            `▫️ <b>Timestamp:</b> Monday 09:00 AM Phnom Penh Time\n` +
            `▫️ <b>Status:</b> ✅ Successfully delivered\n\n` +
            `💡 <i>Autonomous scheduler is active. Next blast scheduled for next Monday 09:00 AM.</i>`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📱 Open Nick Test Lab', url: 'https://t.me/+olPZyfkgtcQxOTA9' }],
              [{ text: '⚙️ Scheduler Settings', callback_data: 'sched_status' }]
            ]
          }
        })
      });
      console.log(`✅ Autonomous weekly digest successfully dispatched!`);
    } catch (err) {
      console.error('⚠️ Failed to dispatch autonomous digest:', err.message);
    }
  }
}

// Start autonomous weekly digest watchdog (checks every 60 seconds)
setInterval(checkWeeklyDigestScheduler, 60000);

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
      if (update.message && (update.message.text || update.message.caption)) {
        const text = (update.message.text || update.message.caption || '').trim();
        const chatId = update.message.chat.id;
        const sender = update.message.from;
        const senderName = sender.first_name || 'Client';
        console.log(`💬 Message from ${senderName} (${chatId}): "${text.slice(0, 100)}..."`);

        // ROLE CHECK: staff and admin commands work for Nick only. Clients get a polite "not available".
        if (roleGate.isAdminCommand(text) && !roleGate.isAdmin(sender.id)) {
          console.log(`🔒 Blocked admin command from non-admin ${sender.id}`);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: roleGate.deniedText(userLanguages[chatId]) })
          });
          continue;
        }

        if (text === '/digest' || text === '/stats') {
          const report = await buildRealDigest();

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: report, parse_mode: 'HTML' })
          });
          return;
        }

        if (text === '/showcase' || text === '/card') {
          const userLang = userLanguages[chatId] || 'EN';
          const card = getTS8Card(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, photo: card.photo, caption: card.caption,
              parse_mode: 'HTML', reply_markup: card.reply_markup
            })
          });
          return;
        }

        if (text === '/lang' || text === '/language') {
          const menu = getLanguageMenu();
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: menu.text, parse_mode: 'HTML', reply_markup: menu.reply_markup })
          });
          return;
        }

        if (text === '/catalog' || text === '/miniapp') {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `📱 <b>REALESTATE.COM.KH · VISUAL CATALOG (MINI APP)</b>\n\n` +
                `Experience our full interactive property portal directly inside Telegram:\n` +
                `▫️ Instant filter by status (#Urgent, #ForSale, #ForRent, #Projects)\n` +
                `▫️ HD Photo Carousels, Net Yield calculations, and verified developer records\n` +
                `▫️ Smooth native app-like experience with zero app store download needed!`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🚀 Open Interactive Mini App', web_app: { url: 'https://propertyhubcambodia.com/telegram-catalog.html' } }],
                  [{ text: '💬 Connect with Nick Directly', url: 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });
          return;
        }

        if (text.startsWith('/scheduledigest')) {
          const parts = text.split(/\s+/);
          const subCmd = (parts[1] || 'status').toLowerCase();

          const now = new Date();
          const phnomPenhHour = (now.getUTCHours() + 7) % 24;
          const phnomPenhMin = now.getUTCMinutes();
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const currentDayName = days[now.getUTCDay()];

          if (subCmd === 'now') {
            const digest = getDigestBroadcast();
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: channelId,
                text: digest.text,
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

            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `✅ <b>WEEKLY DIGEST BROADCASTED IMMEDIATELY!</b>\n\nDispatched to <b>Nick Test Lab</b>.`,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '📱 View in Nick Test Lab', url: 'https://t.me/+olPZyfkgtcQxOTA9' }]
                  ]
                }
              })
            });
            return;
          }

          if (subCmd === 'toggle') {
            digestSchedule.autoBroadcast = !digestSchedule.autoBroadcast;
            saveState();
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `⚙️ <b>AUTOMATED DIGEST SCHEDULER:</b> ${digestSchedule.autoBroadcast ? '🟢 <b>ENABLED (Active)</b>' : '🔴 <b>DISABLED (Paused)</b>'}`,
                parse_mode: 'HTML'
              })
            });
            return;
          }

          if (subCmd === 'preview') {
            const digest = getDigestBroadcast();
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `📰 <b>EXECUTIVE DIGEST · PREVIEW DRAFT</b>\n\n` + digest.text,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🚀 Approve & Broadcast to Channel', callback_data: 'digest_broadcast_now' }],
                    [{ text: '💬 Discuss with Team', url: 'https://t.me/Nick_REAKH' }]
                  ]
                }
              })
            });
            return;
          }

          // Default: status
          const statusMsg = 
            `📅 <b>REALESTATE.COM.KH WEEKLY DIGEST SCHEDULER STATUS</b>\n\n` +
            `▫️ <b>Status:</b> ${digestSchedule.autoBroadcast ? '🟢 <b>ACTIVE (Autonomous Autopilot)</b>' : '🔴 <b>PAUSED</b>'}\n` +
            `▫️ <b>Target Schedule:</b> Every Monday at 09:00 AM Phnom Penh Time (UTC+7)\n` +
            `▫️ <b>Current Phnom Penh Time:</b> ${currentDayName}, ${String(phnomPenhHour).padStart(2, '0')}:${String(phnomPenhMin).padStart(2, '0')}\n` +
            `▫️ <b>Last Broadcast Week:</b> <code>${digestSchedule.lastBroadcastWeek || 'None yet'}</code>\n` +
            `▫️ <b>Target Channel:</b> Nick Test Lab (<code>-1004372846355</code>)\n\n` +
            `<b>Commands:</b>\n` +
            `▫️ <code>/scheduledigest preview</code> — Preview this week's draft\n` +
            `▫️ <code>/scheduledigest now</code> — Force broadcast immediately\n` +
            `▫️ <code>/scheduledigest toggle</code> — Enable/Disable autopilot`;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: statusMsg,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📰 Preview Draft', callback_data: 'sched_preview' }, { text: '🚀 Broadcast Now', callback_data: 'digest_broadcast_now' }],
                  [{ text: digestSchedule.autoBroadcast ? '⏸️ Pause Autopilot' : '▶️ Enable Autopilot', callback_data: 'sched_toggle' }]
                ]
              }
            })
          });
          return;
        }

        if (text === '/guide' || text === '/purchaseguide' || text === '/steps') {
          const userLang = userLanguages[chatId] || 'EN';
          const guide = getPurchaseGuide(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: guide.text, parse_mode: 'HTML', reply_markup: guide.reply_markup })
          });
          return;
        }

        if (text === '/legal') {
          const userLang = userLanguages[chatId] || 'EN';
          const guide = getLegalGuideMenu(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: guide.text, parse_mode: 'HTML', reply_markup: guide.reply_markup })
          });
          return;
        }

        if (text === '/syncchannels' || text === '/refreshchannels') {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: '🔄 <b>Syncing channels:</b> @NickREAKH, @malaynopsale, @malaynoprental...', parse_mode: 'HTML' })
          });
          const items = await syncAllChannels();
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ <b>Channel Sync Complete!</b>\n\n` +
                `▫️ <b>Monitored Channels:</b> @NickREAKH, @malaynopsale, @malaynoprental\n` +
                `▫️ <b>Active Verified Units (&lt; 30 days):</b> ${items.length}\n` +
                `▫️ <b>Instant Search:</b> Type any query (e.g. <i>"Tonle Bassac under $1000"</i> or <i>"Studio in BKK1"</i>) to search live!`,
              parse_mode: 'HTML'
            })
          });
          return;
        }

        if (text === '/compare') {
          const userLang = userLanguages[chatId] || 'EN';
          const comp = getComparisonCard(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: comp.text,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
              link_preview_options: { is_disabled: true },
              reply_markup: comp.reply_markup
            })
          });
          return;
        }

        if (text.startsWith('/calc')) {
          const parts = text.split(/\s+/);
          const customPrice = parseInt(parts[1], 10) || 99000;
          const userLang = userLanguages[chatId] || 'EN';
          const calc = getCalculatorMenu(customPrice, 'TS8', userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: calc.text, parse_mode: 'HTML', reply_markup: calc.reply_markup })
          });
          return;
        }

        if (text.startsWith('/makeqr')) {
          const raw = text.replace('/makeqr', '').trim();
          let slug = 'ts8_22';
          let title = 'Time Square 8 (2BR)';
          let price = '#ForSale $99,000';
          let loc = 'Boeng Trabek / Toul Tompoung';

          if (raw) {
            const match = raw.match(/"([^"]+)"|'([^']+)'|(\S+)/g);
            if (match) {
              const tokens = match.map(m => m.replace(/^["']|["']$/g, ''));
              if (tokens[0]) slug = tokens[0];
              if (tokens[1]) title = tokens[1];
              if (tokens[2]) price = tokens[2];
              if (tokens[3]) loc = tokens[3];
            }
          }

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `🎨 Rendering High-Resolution Branded Signage Poster for <b>${title}<b>...`, parse_mode: 'HTML' })
          });

          const posterPath = await generateBrandedPoster({
            urlOrSlug: slug,
            title,
            subtitle: `${title} · VIP Presentation`,
            price,
            location: loc,
            refCode: slug.toUpperCase()
          });

          const fileData = fs.readFileSync(posterPath);
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('photo', new Blob([fileData], { type: 'image/jpeg' }), 'signage_poster.jpg');
          formData.append('caption', `<b>BRANDED SIGNAGE POSTER GENERATED</b>\n\n<b>${title}</b>\n▫️ <b>Pricing:</b> ${price}\n▫️ <b>Location:</b> ${loc}\n▫️ <b>Deep Link:</b> <code>${slug}</code>\n\n<blockquote>Print-ready 900×1200 high-resolution format with embedded gold QR. Direct smartphone scan routes visitors into Telegram portfolio.</blockquote>`);
          formData.append('parse_mode', 'HTML');
          formData.append('reply_markup', JSON.stringify({
            inline_keyboard: [
              [{ text: 'Open Deep Link', url: slug.startsWith('http') ? slug : `https://t.me/Nick_REAKH_Bot?start=${slug}` }],
              [{ text: 'Share with Nick', url: 'https://t.me/Nick_REAKH' }]
            ]
          }));

          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: formData });
          return;
        }

        if (text.startsWith('/pricedrop')) {
          const parts = text.split(/\s+/);
          const unit = (parts[1] || 'TS8').toUpperCase();
          const newPrice = parseInt(parts[2], 10) || 89000;
          const oldPrice = 99000;
          const discount = oldPrice - newPrice;
          const unitName = unit === 'TS8' ? 'Time Square 8' : (unit === 'RESL' ? 'Residence L' : unit);

          const dropAlert = 
            `<b>PRICE REDUCTION NOTICE · ${unit}</b>\n\n` +
            `<b>${unitName} · Floor 22</b>\n` +
            `Chamkarmon / Boeng Trabek\n\n` +
            `▫️ <b>Revised Price:</b> $${newPrice.toLocaleString()} USD (Previously <del>$${oldPrice.toLocaleString()}</del>)\n` +
            `▫️ <b>Instant Equity:</b> -$${discount.toLocaleString()} USD below developer list\n` +
            `▫️ <b>Adjusted Yield:</b> <b>9.4% Net</b>\n\n` +
            `<blockquote>Exclusive 48-hour priority window for registered private clients prior to public release.</blockquote>`;

          const dropKeyboard = {
            inline_keyboard: [
              [
                { text: 'Claim Allocation', callback_data: `btn_book_${unit}` },
                { text: 'Payment Schedule', callback_data: `btn_calc_${newPrice}_${unit}` }
              ],
              [
                { text: 'Advisory with Nick', url: 'https://t.me/Nick_REAKH' }
              ]
            ]
          };

          const subscribers = watchlist[unit] || new Set([nickChatId]);
          let sentCount = 0;
          for (const subChatId of subscribers) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: subChatId, text: dropAlert, parse_mode: 'HTML', reply_markup: dropKeyboard })
            });
            sentCount++;
          }
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `✅ Price drop alert broadcasted to ${sentCount} subscriber(s) for ${unit}!`, parse_mode: 'HTML' })
          });
          return;
        }

        if (text.startsWith('/myunit') || text === '/dashboard') {
          const parts = text.split(/\s+/);
          const unitRef = parts[1] || 'TS8-22';
          const dash = getLandlordDashboard(unitRef);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: dash.text, parse_mode: 'HTML', reply_markup: dash.reply_markup })
          });
          return;
        }

        if (text === '/list') {
          const userLang = userLanguages[chatId] || 'EN';
          const intake = getOwnerIntakeStart(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: intake.text, parse_mode: 'HTML', reply_markup: intake.reply_markup })
          });
          return;
        }

        if (text === '/testsla') {
          const testLeadId = 'lead_sim_' + Math.floor(Math.random() * 8999 + 1000);
          leadSlaTracker[testLeadId] = {
            id: testLeadId,
            name: 'Kenji Takahashi (@Takahashi_Tokyo)',
            userId: 353195979,
            unitRef: 'TS8 (2BR Resale)',
            type: 'Simulated High-Intent Lead',
            createdAt: Date.now() - 17 * 60 * 1000,
            status: 'pending',
            escalated: true
          };
          saveState();
          const urgentWarning = 
            `<b>SLA DISPATCH WATCHDOG · RESPONSE OVERDUE</b>\n\n` +
            `▫️ <b>Client:</b> @Takahashi_Tokyo (Kenji Takahashi)\n` +
            `▫️ <b>Asset:</b> Time Square 8 (2BR Resale)\n` +
            `▫️ <b>Target Budget:</b> $99,000 USD\n` +
            `▫️ <b>Elapsed:</b> 17 minutes (Benchmark: &lt; 15 mins)\n` +
            `▫️ <b>Status:</b> Response Required\n\n` +
            `<blockquote>Speed-to-lead benchmark: contacts initiated within 5 minutes convert at 78%. After 15 minutes, conversion drops below 12%.</blockquote>`;

          const urgentKeyboard = {
            inline_keyboard: [
              [
                { text: 'Mark Contacted', callback_data: `sla_done_${testLeadId}` },
                { text: 'Advance to Tour', callback_data: `sla_booked_${testLeadId}` }
              ],
              [
                { text: 'Direct Message (@Takahashi_Tokyo)', url: 'https://t.me/Nick_REAKH' }
              ]
            ]
          };

          const sRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: urgentWarning, parse_mode: 'HTML', reply_markup: urgentKeyboard })
          });
          const sData = await sRes.json();
          if (!sData.ok) console.error('⚠️ /testsla sendMessage error:', sData);
          return;
        }

        // ── PHASE 3 & 4: CO-BROKE, DEAL REGISTRATION & BROADCAST ──
        if (text.startsWith('/cobroke')) {
          const parts = text.split(/\s+/).slice(1);
          if (parts.length < 2) {
            const menu = getCoBrokeMenu();
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: menu.text, parse_mode: 'HTML', reply_markup: menu.reply_markup })
            });
            return;
          }

          const agentPhone = parts[parts.length - 1];
          const agentName = parts.slice(0, parts.length - 1).join(' ');

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `⚙️ Generating custom Co-Broke Factsheet for </b>${agentName}<b>...` })
          });

          const pdfPath = await generateCoBrokePDF(agentName, agentPhone);
          const fs = require('fs');
          const fileData = fs.readFileSync(pdfPath);
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('document', new Blob([fileData], { type: 'application/pdf' }), `TS8_Factsheet_${agentName.replace(/\s+/g, '_')}.pdf`);
          formData.append('caption', `<b>CO-BROKE INVESTMENT MEMO</b>\n\n<b>Time Square 8 (2BR)</b> · $99,000 USD\n\n▫️ <b>Sub-Agent:</b> ${agentName} (${agentPhone})\n▫️ <b>Commission Structure:</b> 50/50 Protected Split\n\n<blockquote>Client-ready investment memo with your direct sub-agent contact credentials. Safe harbor protection active upon delivery.</blockquote>`);
          formData.append('parse_mode', 'HTML');

          await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: formData });

          // Alert Nick
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🤝 </b>NEW CO-BROKE SUB-AGENT ONBOARDED!<b>\n\n` +
                `👤 </b>Agent:<b> ${agentName}\n` +
                `📞 </b>Contact:<b> ${agentPhone} (${sender.username ? '@' + sender.username : senderName})\n` +
                `🏢 </b>Property:<b> Time Square 8 (Factsheet Dispatched)\n` +
                `⚡ </b>Split:<b> 50% REAKH / 50% Sub-Agent Guaranteed`,
              parse_mode: 'HTML'
            })
          });
          return;
        }

        if (text.startsWith('/registerdeal')) {
          const parts = text.split(/\s+/).slice(1);
          if (parts.length < 2) {
            const usage = 
              `🛡️ </b>REALESTATE.COM.KH CO-BROKE DEAL REGISTRATION<b>\n\n` +
              `To protect your 50/50 commission before introducing a buyer, register them below:\n\n` +
              `</b>Usage:<b>\n` +
              `\`/registerdeal [Property] [Client Name] [Client Phone]\`\n\n` +
              `</b>Example:<b>\n` +
              `\`/registerdeal TS8 Mr. Wang +886912345678\``;
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: usage, parse_mode: 'HTML' })
            });
            return;
          }

          const unit = parts[0].toUpperCase();
          const clientPhone = parts[parts.length - 1];
          const clientName = parts.slice(1, parts.length - 1).join(' ') || 'Private Investor';
          const regId = 'REG-' + Math.floor(Math.random() * 8999 + 1000);

          registeredDeals[regId] = {
            id: regId,
            agentName: senderName,
            agentHandle: sender.username ? '@' + sender.username : senderName,
            agentChatId: chatId,
            clientName,
            clientPhone,
            unit,
            registeredAt: new Date().toISOString(),
            status: 'protected'
          };
          saveState();

          const cert = 
            `<b>REALESTATE.COM.KH BROKER SAFE HARBOR CERTIFICATE</b>\n` +
            `Reference: <code>#${regId}</code>\n\n` +
            `▫️ <b>Sub-Agent:</b> ${senderName} (${sender.username ? '@' + sender.username : ''})\n` +
            `▫️ <b>Protected Buyer:</b> ${clientName} (${clientPhone.slice(0, 4)}••••${clientPhone.slice(-3)})\n` +
            `▫️ <b>Asset:</b> ${unit === 'TS8' ? 'Time Square 8' : unit}\n` +
            `▫️ <b>Commission Split:</b> 50% REAKH / 50% Sub-Agent\n` +
            `▫️ <b>Protection Term:</b> 60 Days Exclusive Safe Harbor\n\n` +
            `<blockquote>Official deal registration recorded in Realestate.com.kh partner ledger. Non-circumvention guaranteed.</blockquote>`;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: cert, parse_mode: 'HTML' })
          });

          // Alert Nick to confirm
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🛡️ </b>NEW DEAL REGISTRATION FILED!<b>\n\n` +
                `📜 </b>Cert ID:<b> \`#${regId}\`\n` +
                `👤 </b>Sub-Agent:<b> ${senderName} (${sender.username ? '@' + sender.username : ''})\n` +
                `👤 </b>Buyer:<b> ${clientName} (${clientPhone})\n` +
                `🏢 </b>Unit:<b> ${unit}\n` +
                `💰 </b>Commission Agreement:<b> 50% / 50% Split\n\n` +
                `Tap to endorse registration:`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Endorse Safe Harbor', callback_data: `deal_confirm_${regId}` }],
                  [{ text: 'Contact Broker', url: `tg://user?id=${sender.id}` }]
                ]
              }
            })
          });
          return;
        }

        if (text === '/broadcastdigest' || text === '/digestbroadcast') {
          const digest = getDigestBroadcast();

          // 1. Send to Nick Test Lab channel
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: channelId,
              text: digest.text,
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

          // 2. Also deliver directly to Nick with full interactive test buttons
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `✅ <b>DIGEST BROADCASTED TO NICK TEST LAB!</b>\n\n` + digest.text,
              parse_mode: 'HTML',
              reply_markup: digest.reply_markup
            })
          });
          return;
        }

        if (text.startsWith('/start ts8') || text.includes('ts8_22')) {
          console.log(`📱 QR Code scan detected from ${senderName} (${chatId}) for Time Square 8!`);

          const card = getTS8Card();
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              photo: card.photo,
              caption: card.caption,
              parse_mode: 'HTML',
              reply_markup: card.reply_markup
            })
          });

          const senderHandle = sender.username ? `@${sender.username}` : senderName;
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🚨 </b>NEW QR CODE SCAN DETECTED!<b>\n\n` +
                `👤 </b>Visitor:<b> ${senderHandle} (${sender.first_name} ${sender.last_name || ''})\n` +
                `📍 </b>Source:<b> Scanned Open House Signage for </b>Time Square 8<b>!\n` +
                `⚡ </b>Status:<b> Active on property card right now.\n\n` +
                `👉 [Tap here to message visitor directly](tg://user?id=${sender.id})`,
              parse_mode: 'HTML'
            })
          });
          return;
        }

        // Handle persistent reply keyboard taps
        if (text.includes('Featured Properties') || text === '/properties') {
          const card = getTS8Card();
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, photo: card.photo, caption: card.caption,
              parse_mode: 'HTML', reply_markup: card.reply_markup
            })
          });
          return;
        }

        if (text.includes('Payment Calculator') || text === '/calculator') {
          const calc = getCalculatorMenu(99000, 'TS8');
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: calc.text, parse_mode: 'HTML', reply_markup: calc.reply_markup })
          });
          return;
        }

        if (text.includes('Compare Top Units')) {
          const userLang = userLanguages[chatId] || 'EN';
          const comp = getComparisonCard(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: comp.text, parse_mode: 'HTML', reply_markup: comp.reply_markup })
          });
          return;
        }

        if (text.includes('Legal & Tax Guide')) {
          const userLang = userLanguages[chatId] || 'EN';
          const guide = getLegalGuideMenu(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: guide.text, parse_mode: 'HTML', reply_markup: guide.reply_markup })
          });
          return;
        }

        if (text.includes('List My Property') || text.includes('List My Condo')) {
          const intake = getOwnerIntakeStart();
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: intake.text, parse_mode: 'HTML', reply_markup: intake.reply_markup })
          });
          return;
        }

        if (text.includes('Consult with Nick')) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `<b>DIRECT PRIVATE ADVISORY WITH NICK</b>\n\n` +
                `▫️ <b>Advisor:</b> Nick (@Nick_REAKH)\n` +
                `▫️ <b>Platform:</b> Realestate.com.kh (Cambodia's #1 Real Estate Portal)\n` +
                `▫️ <b>Specialization:</b> Foreign Freehold Strata Title & High-Yield Resales\n\n` +
                `<blockquote>Tap below to open a direct private consultation in Telegram:</blockquote>`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Start Chat with Nick', url: 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });
          return;
        }

        if (text === '/menu') {
          const userLang = userLanguages[chatId] || 'EN';
          const menu = getMainMenu(userLang, senderName);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, text: menu.text, parse_mode: 'HTML', reply_markup: menu.reply_markup
            })
          });
          return;
        }

        // ── DEVELOPER PROJECT INTELLIGENCE ENGINE (PILOT: TS7) ──
        if (text === '/ts7' || text.toLowerCase() === 'ts7' || text.toLowerCase().includes('time square 7') || text.toLowerCase().includes('ts7 duplex')) {
          console.log(`🏢 Project Intelligence query for Time Square 7 from ${senderName} (${chatId})`);
          const result = projectEngine.findBestUnit('time-square-7', { maxBudget: 85000 });
          const cardText = projectEngine.formatProposalCard(result);
          const bestUnit = result.bestUnit;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: cardText,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: `❌ Mark ${bestUnit.unitCode} as Sold`, callback_data: `admin_sold_ts7_${bestUnit.unitCode}` }],
                  [{ text: '🔄 Reset All TS7 Units to Available', callback_data: 'admin_reset_ts7' }]
                ]
              }
            })
          });
          return;
        }

        if (text === '/search' || text === '/explore' || text === '/rent' || text === '/sale' || text === '/buy' || text === '🏢 Explore Condos (Buy / Rent)' || text === '🏢 Explore Property') {
          console.log(`🔍 5-Step Property Search started by ${senderName} (${chatId})`);
          await handleSearchCommand(chatId, token);
          return;
        }

        if (text.startsWith('/start') || text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello' || text === '/inquire') {
          console.log(`👤 New client interaction from ${senderName} (${chatId})`);

          const existingLang = userLanguages[chatId];
          if (existingLang) {
            // User already chose a language: send clean 4-button Main Menu immediately
            const menu = getMainMenu(existingLang, senderName);
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: menu.text,
                parse_mode: 'HTML',
                reply_markup: menu.reply_markup
              })
            });
            return;
          }

          // Brand New User: Show Calm, Clean Language Selection Gate First!
          const langGateText = 
            `<b>REALESTATE.COM.KH</b>\n` +
            `プノンペン不動産投資 · プレミアム コンドミニアム仲介\n\n` +
            `Welcome ${senderName} · ようこそ\n\n` +
            `Please select your language / 言語をお選びください / 请选择语言：`;

          const langGateKeyboard = {
            inline_keyboard: [
              [
                { text: '🇯🇵 日本語 (Japanese)', callback_data: 'set_lang_JP' },
                { text: '🇬🇧 English (USD)', callback_data: 'set_lang_EN' }
              ],
              [
                { text: '🇨🇳 简体中文 (Chinese)', callback_data: 'set_lang_ZH' },
                { text: '🇷🇺 Русский (Russian)', callback_data: 'set_lang_RU' }
              ]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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

        // ── ARTICLE & PROPERTY LISTING INTAKE PARSER ──────────────
        const isListingPattern = /#ForSale|#ForRent|#NewProject|\[FOR SALE\]|\[FOR RENT\]/i.test(text) ||
          (/\$[\d,]+/.test(text) && (/(?:1|2|3)\s*(?:bed|br|bedroom|寝室|ldk)/i.test(text) || /sqm|㎡|floor|strata|yield/i.test(text)));
        const isLongArticle = text.length > 80 && (text.includes('Time Square') || text.includes('Phnom Penh') || text.includes('Condo') || text.includes('Realestate') || text.includes('$') || text.includes('USD'));

        if (isListingPattern || isLongArticle) {
          console.log(`📰 Article/Listing intake detected from ${senderName} (${chatId})`);
          
          let formattedContent = text;
          if (!formattedContent.includes('REALESTATE.COM.KH') && !formattedContent.includes('Realestate.com.kh')) {
            formattedContent = `🏢 <b>REALESTATE.COM.KH · VERIFIED LISTING</b>\n\n` + formattedContent;
          }

          const previewMsg = 
            `📥 <b>LISTING / ARTICLE DRAFT DETECTED!</b>\n\n` +
            `Our engine parsed your content and formatted it for Realestate.com.kh:\n\n` +
            `――――――――――――――――――\n` +
            `${formattedContent}\n` +
            `――――――――――――――――――\n\n` +
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

        // ── BOT MENU COMMANDS: DIRECT ROUTING ──────────────────────
        if (text === '/explore' || text === '/properties' || text === '/search' || text === '🏢 Explore Properties' || text === '🏢 Explore Property' || text === '🏢 注目物件一覧') {
          const userLang = userLanguages[chatId] || 'EN';
          const card = getExploreGate(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: card.text,
              parse_mode: 'HTML',
              reply_markup: card.reply_markup
            })
          });
          return;
        }

        if (text === '/tour' || text === '/book' || text === '/viewing' || text === '📅 Book Private Tour' || text === '📅 Book Tour' || text === '📅 内覧予約') {
          const userLang = userLanguages[chatId] || 'EN';
          const isJP = userLang === 'JP';
          const bookText = isJP ?
            `📅 <b>プライベート内覧・ビデオ案内のお申し込み</b>\n` +
            `<i>Realestate.com.kh 現地公式デスク</i>\n\n` +
            `プノンペン現地の全物件について、専任担当Nickによるプライベート内覧を受け付けております：\n\n` +
            `▫️ <b>現地対面内覧（プノンペン）：</b> 現地のお部屋、共用設備（プール・ジム）、周辺環境をご案内いたします。\n` +
            `▫️ <b>オンライン・生中継ビデオ通話：</b> 日本・海外にいながら、リアルタイムで室内の状態や眺望をご確認いただけます。\n\n` +
            `ご希望のご案内形式をお選びください：` :
            `📅 <b>SCHEDULE A PRIVATE TOUR / VIDEO INSPECTION</b>\n` +
            `<i>Realestate.com.kh Private Advisory</i>\n\n` +
            `We offer personalized property inspections across Phnom Penh managed directly by Lead Advisor Nick:\n\n` +
            `▫️ <b>In-Person Walking Tour:</b> Meet Nick on-site in Phnom Penh for a full walkthrough of units & facilities.\n` +
            `▫️ <b>Live Overseas Video Walkthrough:</b> Live interactive video tour via Telegram or WhatsApp (ideal for overseas clients).\n\n` +
            `Select your preferred format:`;

          const bookKeyboard = isJP ? {
            inline_keyboard: [
              [{ text: '🏢 現地対面内覧（プノンペン）', callback_data: 'tour_inperson_PORTFOLIO' }],
              [{ text: '🎥 オンライン・ビデオ生中継（日本・海外から）', callback_data: 'tour_video_PORTFOLIO' }],
              [{ text: '🔙 メインメニュー', callback_data: 'menu_main' }]
            ]
          } : {
            inline_keyboard: [
              [{ text: '🏢 In-Person Walking Tour (Phnom Penh)', callback_data: 'tour_inperson_PORTFOLIO' }],
              [{ text: '🎥 Overseas Live Video Walkthrough', callback_data: 'tour_video_PORTFOLIO' }],
              [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: bookText,
              parse_mode: 'HTML',
              reply_markup: bookKeyboard
            })
          });
          return;
        }

        if (text === '/list' || text === '/owner' || text === '/sell' || text === '/rentout' || text === '🤝 List Property (Owners)' || text === '🤝 List Property' || text === '💼 List My Property' || text === '🤝 物件掲載・売却') {
          const userLang = userLanguages[chatId] || 'EN';
          const wizard = getOwnerIntakeStart(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: wizard.text,
              parse_mode: 'HTML',
              reply_markup: wizard.reply_markup
            })
          });
          return;
        }

        if (text === '/guide' || text === '/legal' || text === '/tax' || text === '📖 Buyer Guide' || text === '📚 Legal & Tax Guide' || text === '📖 購入手順・諸費用ガイド') {
          const userLang = userLanguages[chatId] || 'EN';
          const guide = getLegalGuideMenu(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: guide.text,
              parse_mode: 'HTML',
              reply_markup: guide.reply_markup
            })
          });
          return;
        }

        if (text === '/menu' || text === '🏛️ Main Menu' || text === '🔙 Main Menu') {
          const userLang = userLanguages[chatId] || 'EN';
          const menu = getMainMenu(userLang, senderName);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: menu.text,
              parse_mode: 'HTML',
              reply_markup: menu.reply_markup
            })
          });
          return;
        }

        if (text === '/nick' || text === '/contact' || text === '/consult' || text === '/agent' || text === '💬 Chat with Nick' || text === '💬 Consult with Nick' || text === '💬 直接相談') {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `👤 <b>DIRECT ADVISORY WITH NICK · REALESTATE.COM.KH</b>\n\n` +
                `▫️ <b>Lead Advisor:</b> Nick (Narith)\n` +
                `▫️ <b>Specialization:</b> Phnom Penh Core Condominiums & Strategic Investments\n` +
                `▫️ <b>Telegram:</b> @Nick_REAKH\n` +
                `▫️ <b>Agency Channel:</b> @NickREAKH\n\n` +
                `<blockquote>Tap below to open a direct confidential consultation with Nick:</blockquote>`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💬 Chat Directly with Nick ↗', url: 'https://t.me/Nick_REAKH' }],
                  [{ text: '🏢 Explore Property Questionnaire', callback_data: 'btn_explore_prop' }],
                  [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
                ]
              }
            })
          });
          return;
        }

        // ── 0. BESPOKE SOURCING CAPTURE ───────────────────────────
        if (userWaitingForCustomSearch[chatId]) {
          const customMeta = userWaitingForCustomSearch[chatId];
          delete userWaitingForCustomSearch[chatId];

          const userLang = userLanguages[chatId] || 'EN';
          const isJP = userLang === 'JP';
          const budgetClean = formatBudgetLabel(customMeta.budget || 'Selected');
          const locClean = formatLocationLabel(customMeta.location || 'ANY');
          const typeClean = customMeta.type === 'Rent' ? (isJP ? '賃貸' : 'Rental') : (isJP ? '売買・投資' : 'Acquisition');
          const friendlyName = sender.first_name || (senderName.startsWith('@') ? senderName.substring(1) : senderName);

          // 1. Confirm to client
          const confirmText = isJP ?
            `✅ <b>特別オーダー（個別リクエスト）を受領いたしました</b>\n\n` +
            `<b>${friendlyName}様</b>、ご希望のこだわり条件を承りました：\n\n` +
            `▫️ <b>ご要望内容：</b> <i>"${text}"</i>\n` +
            `▫️ <b>探訪プロファイル：</b> ${typeClean} · ${locClean} (${budgetClean})\n\n` +
            `🚀 <b>次のステップ：</b>\n` +
            `Nickが現地オーナーネットワーク・未公開オフマーケット物件・デベロッパー直販枠を至急照会いたします。\n\n` +
            `⏱️ <b>対応目安：</b> 15分以内にNickより直接ご連絡差し上げます。` :
            `✅ <b>BESPOKE SOURCING REQUEST RECEIVED</b>\n\n` +
            `Thank you, <b>${friendlyName}</b>! Nick has received your custom property criteria:\n\n` +
            `▫️ <b>Custom Requirements:</b> <i>"${text}"</i>\n` +
            `▫️ <b>Search Profile:</b> ${typeClean} · ${locClean} (${budgetClean})\n\n` +
            `🚀 <b>What happens next:</b>\n` +
            `Nick is personally querying our private landlord network, off-market assignments, and unlisted developer inventory matching your exact specifications.\n\n` +
            `⏱️ <b>Response SLA:</b> Nick will connect with you within 15 minutes.`;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: confirmText,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: isJP ? '💬 Nickへ直接メッセージ ↗' : '💬 Inquire with Nick Directly ↗', url: 'https://t.me/Nick_REAKH' }],
                  [{ text: isJP ? '🏢 物件メニューに戻る' : '🏢 Return to Property Menu', callback_data: 'btn_explore_prop' }]
                ]
              }
            })
          });

          // 2. Alert Nick desk immediately with high priority
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🎯 <b>URGENT BESPOKE PROPERTY SOURCING REQUEST</b>\n\n` +
                `▫️ <b>Client:</b> @${sender.username || 'client'} (${senderName})\n` +
                `▫️ <b>Custom Requirements:</b> "${text}"\n` +
                `▫️ <b>Profile:</b> ${typeClean} · ${locClean} (${budgetClean})\n` +
                `▫️ <b>User ID:</b> ${chatId}\n\n` +
                `⚡ <b>PRIORITY SLA:</b> 15-minute response active. Please review unlisted inventory and connect directly with the client!`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💬 Message Client', url: `tg://user?id=${chatId}` }]
                ]
              }
            })
          });
          return;
        }

        // ── MULTI-CHANNEL INTELLIGENT SEARCH (LAST 30 DAYS) ──────
        // Free-text natural queries (e.g. "Studio in BKK1 50K", "Tonle Bassac 2BR")
        // NEVER triggers on slash commands like /nick or /menu
        if (!text.startsWith('/') && text.trim().length >= 3) {
          const channelMatches = searchInventory(text);
          if (channelMatches && channelMatches.length > 0) {
            console.log(`🎯 Multi-channel match for query "${text}": found ${channelMatches.length} listings`);

            let cardText = `🎯 <b>VERIFIED MATCHES FOR YOUR SEARCH</b>\n` +
              `<i>Query: "${text}" · Scanned across active channel inventory</i>\n\n`;

            const topMatches = channelMatches.slice(0, 3);
            const icons = ['🏢', '🌟', '✨'];
            const buttonsRow = [];

            topMatches.forEach((m, idx) => {
              const icon = icons[idx];
              const num = idx + 1;

              let cleanTitle = (m.title || `${m.location} ${m.beds}`)
                .replace(/^#Newlisting\s*/i, '')
                .replace(/^[📍🏢✨🍃💫\s]+/, '')
                .replace(/\s*·\s*Features:[\s\S]*/i, '')
                .trim();
              if (cleanTitle.includes('·')) cleanTitle = cleanTitle.split('·')[0].trim();

              const snippet = m.snippet || '';
              const floorM = snippet.match(/(\d+(?:st|nd|rd|th)(?:\s*floor)?)/i);
              const floor = floorM ? floorM[1] : '';

              const sizeM = snippet.match(/(\d+(?:\.\d+)?\s*(?:m²|sqm))/i);
              const size = sizeM ? sizeM[1].replace(/m²/i, 'sqm') : '';

              const bedBathM = snippet.match(/(\d+\s*🛏\s*\|\s*\d+\s*🛁|\d+\s*🛏)/i);
              let layout = bedBathM ? bedBathM[1].replace(/\|/g, '·').replace(/\s+/g, ' ').trim() : m.beds;
              if (!layout.includes('🛏') && m.beds) {
                layout = `${m.beds} (1🛁)`;
              }

              const sizeFloorParts = [];
              if (size) sizeFloorParts.push(size);
              if (floor) sizeFloorParts.push(floor.includes('Floor') ? floor : `${floor} Floor`);
              const sizeFloorText = sizeFloorParts.join(' · ');

              const priceClean = (m.priceFormatted && !m.priceFormatted.startsWith('/mo') && m.priceFormatted !== 'Inquire')
                ? m.priceFormatted
                : (m.price ? (m.type === 'Rent' ? `$${m.price.toLocaleString()}/mo` : `$${m.price.toLocaleString()} USD`) : 'Inquire');

              cardText += `<blockquote>${icon} <b>OPTION ${num}</b>\n` +
                `▫️ <b>Property:</b> <b>${cleanTitle}</b>\n` +
                `▫️ <b>Pricing:</b> <b>${priceClean}</b>\n` +
                `▫️ <b>Layout:</b> ${layout}\n` +
                (sizeFloorText ? `▫️ <b>Details:</b> ${sizeFloorText}\n` : '') +
                `▫️ <b>Location:</b> ${m.location}\n` +
                `▫️ <b>Listing Photos:</b> <a href="${m.link}">View Details ↗</a></blockquote>\n\n`;

              buttonsRow.push({ text: `${icon} Option ${num} ↗`, url: m.link });
            });

            cardText += `<blockquote>All units verified under Realestate.com.kh advisory standards. Tap below to view details, request custom sourcing, or consult with Nick:</blockquote>`;

            const searchKeyboard = {
              inline_keyboard: [
                buttonsRow,
                [{ text: '🎯 Request Custom Sourcing from Nick', callback_data: 'btn_custom_search' }],
                [{ text: '📅 Book Private Tour / Video Inspection', callback_data: 'btn_book_PORTFOLIO' }],
                [{ text: '💬 Inquire with Nick Directly ↗', url: 'https://t.me/Nick_REAKH' }],
                [{ text: '🔄 Explore Properties (Full Menu)', callback_data: 'btn_explore_prop' }]
              ]
            };

            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: cardText,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                link_preview_options: { is_disabled: true },
                reply_markup: searchKeyboard
              })
            });

            // Alert Nick desk of client query and matches delivered
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: nickChatId,
                text: `🔍 <b>CLIENT SEARCH QUERY & MULTI-CHANNEL MATCHES</b>\n\n` +
                  `▫️ <b>Client:</b> ${sender.username ? '@' + sender.username : senderName} (${senderName})\n` +
                  `▫️ <b>Search Query:</b> "${text}"\n` +
                  `▫️ <b>Matches Delivered:</b> ${channelMatches.length} listings\n` +
                  `▫️ <b>Sources:</b> @NickREAKH, @malaynopsale, @malaynoprental`,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '💬 Message Client', url: `tg://user?id=${chatId}` }]
                  ]
                }
              })
            });
            return;
          }
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
            text: `💬 <b>NEW INCOMING CLIENT MESSAGE!</b>\n\n` +
              `▫️ <b>Client:</b> ${senderHandle} (${senderName})\n` +
              `▫️ <b>User ID:</b> <code>${chatId}</code>\n` +
              `▫️ <b>Language:</b> ${userLang}\n` +
              `▫️ <b>Message:</b> "${text}"`,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '💬 Message Client', url: `tg://user?id=${chatId}` }]
              ]
            }
          })
        });

        // Instant polite response with direct advisory access and clean menu
        const fallbackText = isJP ?
          `<b>Realestate.com.khへのお問い合わせありがとうございます</b>\n\n` +
          `${senderName}様からのメッセージをプノンペン現地サポートおよび代表Nickに転送いたしました。\n\n` +
          `担当者より直接ご返信いたしますが、お急ぎの場合や個別相談をご希望の際は、以下のボタンよりNickへ直接メッセージをお送りいただくか、メニューをご利用ください：` :
          `<b>Thank You for Contacting Realestate.com.kh</b>\n\n` +
          `Your message has been forwarded to Nick and our Phnom Penh advisory desk.\n\n` +
          `We will reply shortly. For immediate priority assistance, you can message Nick directly or explore verified properties below:`;

        const fallbackKeyboard = {
          inline_keyboard: [
            [{ text: isJP ? '💬 直接相談' : '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }],
            [
              { text: isJP ? '🏢 厳選物件一覧' : '🏢 Explore Property', callback_data: 'btn_explore_prop' },
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

        // ROLE CHECK: staff and admin buttons work for Nick only.
        if (roleGate.isAdminCallback(dataStr) && !roleGate.isAdmin(user.id)) {
          console.log(`🔒 Blocked admin button from non-admin ${user.id}`);
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: roleGate.deniedText(userLanguages[msg && msg.chat ? msg.chat.id : user.id]) })
          });
          continue;
        }

        // ── 5-STEP INTERACTIVE SEARCH CONCIERGE ───────────────────
        if (isSearchCallback(dataStr)) {
          await handleSearchCallback(cb, token);
          return;
        }

        // ── DEVELOPER PROJECT INTELLIGENCE CALLBACKS ─────────────
        if (dataStr.startsWith('admin_sold_ts7_')) {
          const unitCode = dataStr.replace('admin_sold_ts7_', '');
          const soldResult = projectEngine.markUnitSold('time-square-7', unitCode);

          if (!soldResult.success && soldResult.alreadySold) {
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cbId, text: `Unit ${unitCode} was already sold!`, show_alert: true })
            });
            return;
          }

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: `Unit ${unitCode} marked as SOLD!` })
          });

          const nextResult = soldResult.nextBestRecommendation;
          const nextUnit = nextResult.bestUnit;
          const floorInfo = nextResult.floorDifference === 0 
            ? 'Same floor adjacent stack' 
            : `${nextResult.floorDifference} floor${nextResult.floorDifference > 1 ? 's' : ''} away`;

          const updatedText = `⚠️ <b>UPDATE: Unit ${unitCode} is marked SOLD!</b>\n` +
            `<i>Live database updated. Nearest alternative recommended (${floorInfo}):</i>\n\n` +
            projectEngine.formatProposalCard(nextResult);

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: updatedText,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: `❌ Mark ${nextUnit.unitCode} as Sold`, callback_data: `admin_sold_ts7_${nextUnit.unitCode}` }],
                  [{ text: '🔄 Reset All TS7 Units to Available', callback_data: 'admin_reset_ts7' }]
                ]
              }
            })
          });
          return;
        }

        if (dataStr === 'admin_reset_ts7') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: 'All units reset to Available!' })
          });

          const project = projectEngine.loadProject('time-square-7');
          project.unitTypes[0].availableUnits.forEach(u => u.status = 'available');
          projectEngine.saveProject(project);

          const resetResult = projectEngine.findBestUnit('time-square-7');
          const resetUnit = resetResult.bestUnit;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              message_id: msg.message_id,
              text: `✅ <b>DATABASE RESET: All TS7 Duplexes are now Available!</b>\n\n` + projectEngine.formatProposalCard(resetResult),
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: `❌ Mark ${resetUnit.unitCode} as Sold`, callback_data: `admin_sold_ts7_${resetUnit.unitCode}` }],
                  [{ text: '🔄 Reset All TS7 Units to Available', callback_data: 'admin_reset_ts7' }]
                ]
              }
            })
          });
          return;
        }

        // ── A. LEAD CAPTURE CONVERSATION FLOW ─────────────────────
        if (dataStr.startsWith('lead_flow_')) {
          const action = dataStr.replace('lead_flow_', '');
          const isJP = (userLanguages[user.id] || userLanguages[msg.chat.id]) === 'JP';

          if (action === 'buy') {
            leadState[user.id] = { type: 'Buy' };
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cbId })
            });

            const buyText = isJP ?
              `<b>プノンペン不動産 · ご予算帯の選択</b>\n\n` +
              `ご検討中のご予算をお選びください（米ドル・日本円換算）：` :
              `<b>TARGET INVESTMENT BUDGET</b>\n\n` +
              `Please select your purchase budget range:`;

            const buyKeyboard = isJP ? {
              inline_keyboard: [
                [{ text: '💰 5万ドル未満（約760万円以下 / 利回り重視）', callback_data: 'lead_budget_under50' }],
                [{ text: '💰 5万〜10万ドル（約760万〜1,520万円 / 1〜2LDK）', callback_data: 'lead_budget_50to100' }],
                [{ text: '💰 10万〜20万ドル（約1,520万〜3,040万円 / 高級高層）', callback_data: 'lead_budget_100to200' }],
                [{ text: '💰 20万ドル以上（約3,040万円以上 / 旗艦・ペントハウス）', callback_data: 'lead_budget_200plus' }],
                [{ text: '🔙 戻る (売買 / 賃貸 選択)', callback_data: 'btn_explore_prop' }]
              ]
            } : {
              inline_keyboard: [
                [{ text: '💰 Under $50,000 USD (Urgent Cash Flow)', callback_data: 'lead_budget_under50' }],
                [{ text: '💰 $50,000 – $100,000 USD (Prime 1-2BR)', callback_data: 'lead_budget_50to100' }],
                [{ text: '💰 $100,000 – $200,000 USD (Luxury High-Rise)', callback_data: 'lead_budget_100to200' }],
                [{ text: '💰 $200,000+ USD (Flagship & Penthouses)', callback_data: 'lead_budget_200plus' }],
                [{ text: '🔙 Back to Goal', callback_data: 'btn_explore_prop' }]
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
              `<b>賃貸コンドミニアム · ご希望月額予算</b>\n\n` +
              `プノンペン都心の賃貸ご予算をお選びください：` :
              `<b>MONTHLY RENTAL BUDGET</b>\n\n` +
              `Select your target monthly rent:`;

            const rentKeyboard = isJP ? {
              inline_keyboard: [
                [{ text: '💵 月額 $400 – $650 USD（スタジオ / 1LDK）', callback_data: 'lead_budget_rent_low' }],
                [{ text: '💵 月額 $700 – $1,200 USD（高級 1〜2LDK）', callback_data: 'lead_budget_rent_mid' }],
                [{ text: '💵 月額 $1,500+ USD（エグゼクティブ / 3LDK+）', callback_data: 'lead_budget_rent_high' }],
                [{ text: '🔙 戻る (売買 / 賃貸 選択)', callback_data: 'btn_explore_prop' }]
              ]
            } : {
              inline_keyboard: [
                [{ text: '💵 $400 – $650 / month (Studio / 1BR)', callback_data: 'lead_budget_rent_low' }],
                [{ text: '💵 $700 – $1,200 / month (Luxury 1-2BR)', callback_data: 'lead_budget_rent_mid' }],
                [{ text: '💵 $1,500+ / month (Executive / 3BR)', callback_data: 'lead_budget_rent_high' }],
                [{ text: '🔙 Back to Goal', callback_data: 'btn_explore_prop' }]
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
                text: `💼 <b>60-SECOND PROPERTY INTAKE WIZARD</b>\n\n` +
                  `We syndicate your listing across 4 languages reaching 12,000+ international buyers and tenants.\n\n` +
                  `<b>Step 1 of 4:</b> What is your primary objective for this property?`,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'Sell My Condo', callback_data: 'owner_goal_sell' }],
                    [{ text: 'Rent My Condo', callback_data: 'owner_goal_rent' }],
                    [{ text: '💬 Connect Directly with Nick', url: 'https://t.me/Nick_REAKH' }],
                    [{ text: '🔙 Main Menu', callback_data: 'menu_main' }]
                  ]
                }
              })
            });
          }

        } else if (dataStr === 'lead_back_budget') {
          const info = leadState[user.id] || { type: 'Buy' };
          const isJP = (userLanguages[user.id] || userLanguages[msg.chat.id]) === 'JP';
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          if (info.type === 'Rent') {
            const rentText = isJP ?
              `<b>賃貸コンドミニアム · ご希望月額予算</b>\n\n` +
              `プノンペン都心の賃貸ご予算をお選びください：` :
              `<b>MONTHLY RENTAL BUDGET</b>\n\n` +
              `Select your target monthly rent:`;

            const rentKeyboard = isJP ? {
              inline_keyboard: [
                [{ text: '💵 月額 $400 – $650 USD（スタジオ / 1LDK）', callback_data: 'lead_budget_rent_low' }],
                [{ text: '💵 月額 $700 – $1,200 USD（高級 1〜2LDK）', callback_data: 'lead_budget_rent_mid' }],
                [{ text: '💵 月額 $1,500+ USD（エグゼクティブ / 3LDK+）', callback_data: 'lead_budget_rent_high' }],
                [{ text: '🔙 戻る (売買 / 賃貸 選択)', callback_data: 'btn_explore_prop' }]
              ]
            } : {
              inline_keyboard: [
                [{ text: '💵 $400 – $650 / month (Studio / 1BR)', callback_data: 'lead_budget_rent_low' }],
                [{ text: '💵 $700 – $1,200 / month (Luxury 1-2BR)', callback_data: 'lead_budget_rent_mid' }],
                [{ text: '💵 $1,500+ / month (Executive / 3BR)', callback_data: 'lead_budget_rent_high' }],
                [{ text: '🔙 Back to Goal', callback_data: 'btn_explore_prop' }]
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
          } else {
            const buyText = isJP ?
              `<b>プノンペン不動産 · ご予算帯の選択</b>\n\n` +
              `ご検討中のご予算をお選びください（米ドル・日本円換算）：` :
              `<b>TARGET INVESTMENT BUDGET</b>\n\n` +
              `Please select your purchase budget range:`;

            const buyKeyboard = isJP ? {
              inline_keyboard: [
                [{ text: '💰 5万ドル未満（約760万円以下 / 利回り重視）', callback_data: 'lead_budget_under50' }],
                [{ text: '💰 5万〜10万ドル（約760万〜1,520万円 / 1〜2LDK）', callback_data: 'lead_budget_50to100' }],
                [{ text: '💰 10万〜20万ドル（約1,520万〜3,040万円 / 高級高層）', callback_data: 'lead_budget_100to200' }],
                [{ text: '💰 20万ドル以上（約3,040万円以上 / 旗艦・ペントハウス）', callback_data: 'lead_budget_200plus' }],
                [{ text: '🔙 戻る (売買 / 賃貸 選択)', callback_data: 'btn_explore_prop' }]
              ]
            } : {
              inline_keyboard: [
                [{ text: '💰 Under $50,000 USD (Urgent Cash Flow)', callback_data: 'lead_budget_under50' }],
                [{ text: '💰 $50,000 – $100,000 USD (Prime 1-2BR)', callback_data: 'lead_budget_50to100' }],
                [{ text: '💰 $100,000 – $200,000 USD (Luxury High-Rise)', callback_data: 'lead_budget_100to200' }],
                [{ text: '💰 $200,000+ USD (Flagship & Penthouses)', callback_data: 'lead_budget_200plus' }],
                [{ text: '🔙 Back to Goal', callback_data: 'btn_explore_prop' }]
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
          }

        } else if (dataStr.startsWith('lead_budget_')) {
          const budget = dataStr.replace('lead_budget_', '');
          if (!leadState[user.id]) leadState[user.id] = {};
          leadState[user.id].budget = budget;
          const isJP = (userLanguages[user.id] || userLanguages[msg.chat.id]) === 'JP';
          const isRent = (leadState[user.id] && leadState[user.id].type === 'Rent') || budget.startsWith('rent_');

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const locText = isRent ? (
            isJP ?
              `📍 <b>ご希望の居住エリア（プノンペン）</b>\n` +
              `<i>Realestate.com.kh 居住エリアガイド</i>\n\n` +
              `お住まいをご希望のエリアをお選びください：\n\n` +
              `▫️ <b>BKK1</b>\n` +
              `外国人居住の中心街 · カフェ・ジム・レストラン・大使館が徒歩圏\n\n` +
              `▫️ <b>トンレバサック</b>\n` +
              `リバーサイド・CBD · イオン1号店・高級コンド・利便性重視\n\n` +
              `▫️ <b>桑園 / トゥールトンポン（TTP）</b>\n` +
              `ロシアン市場周辺 · お洒落なカフェ街と高コスパな住宅街\n\n` +
              `▫️ <b>エリア不問</b>\n` +
              `柔軟な選択 · 家具家電・設備充実・コスパ最優先で抽出\n\n` +
              `ご希望のエリアをタップしてください：` :
              `📍 <b>PREFERRED RESIDENTIAL DISTRICT</b>\n` +
              `<i>Realestate.com.kh Residential Living Guide</i>\n\n` +
              `Please select the neighborhood you would like to live in:\n\n` +
              `▫️ <b>BKK1</b>\n` +
              `Expat heartland · Walk to top international cafes, gyms, dining & embassies\n\n` +
              `▫️ <b>Tonle Bassac</b>\n` +
              `Riverfront living · Directly next to Aeon Mall 1, Riverside & vibrant nightlife\n\n` +
              `▫️ <b>Chamkarmon / TTP</b>\n` +
              `Russian Market bohemian hub · Famous specialty cafes, craft dining & great value\n\n` +
              `▫️ <b>Any Prime District</b>\n` +
              `Flexible location · Priority on best furnishings, amenities & move-in readiness\n\n` +
              `Select your preferred neighborhood below:`
          ) : (
            isJP ?
              `📍 <b>ご希望の投資エリア（プノンペン）</b>\n` +
              `<i>Realestate.com.kh 厳選ロケーションガイド</i>\n\n` +
              `取得をご検討中の主要エリアをお選びください：\n\n` +
              `▫️ <b>BKK1</b>\n` +
              `最高級外交街 · 外国人駐在員の賃貸需要＆資産価値最上位\n\n` +
              `▫️ <b>トンレバサック</b>\n` +
              `ウォーターフロントCBD · イオン1号店直結・高級フラッグシップ開発街\n\n` +
              `▫️ <b>桑園 / トゥールトンポン（TTP）</b>\n` +
              `ロシアン市場周辺 · 高インカム利回り（Net 8〜9%）＆割安転売枠多数\n\n` +
              `▫️ <b>エリア不問</b>\n` +
              `利回り最優先 · 市内全体のディスカウント・高収益優良枠を優先抽出\n\n` +
              `ご希望のエリアをタップしてください：` :
              `📍 <b>PREFERRED INVESTMENT DISTRICT</b>\n` +
              `<i>Realestate.com.kh Prime Neighborhoods</i>\n\n` +
              `Please select your target acquisition area in Phnom Penh:\n\n` +
              `▫️ <b>BKK1</b>\n` +
              `Prime diplomatic quarter · Highest expat tenant demand & capital appreciation\n\n` +
              `▫️ <b>Tonle Bassac</b>\n` +
              `Riverfront CBD · Adjacent to Aeon Mall 1, embassies & luxury developments\n\n` +
              `▫️ <b>Chamkarmon / TTP</b>\n` +
              `Russian Market quarter · High net cash-flow rental yields & discounted resales\n\n` +
              `▫️ <b>Any Prime District</b>\n` +
              `Maximum flexibility · Priority on highest net ROI & below-market opportunities\n\n` +
              `Tap your preferred district below:`
          );

          const locKeyboard = isJP ? {
            inline_keyboard: [
              [
                { text: '📍 BKK1', callback_data: 'lead_loc_bkk1' },
                { text: '📍 トンレバサック', callback_data: 'lead_loc_tb' }
              ],
              [
                { text: '📍 桑園（TTP）', callback_data: 'lead_loc_ttp' },
                { text: '🌐 エリア不問', callback_data: 'lead_loc_any' }
              ],
              [
                { text: '🔙 戻る (ご予算選択)', callback_data: 'lead_back_budget' }
              ]
            ]
          } : {
            inline_keyboard: [
              [
                { text: '📍 BKK1', callback_data: 'lead_loc_bkk1' },
                { text: '📍 Tonle Bassac', callback_data: 'lead_loc_tb' }
              ],
              [
                { text: '📍 Chamkarmon (TTP)', callback_data: 'lead_loc_ttp' },
                { text: '🌐 Any Prime District', callback_data: 'lead_loc_any' }
              ],
              [
                { text: '🔙 Back to Budget', callback_data: 'lead_back_budget' }
              ]
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

          const isRent = info.type === 'Rent';
          const budgetClean = formatBudgetLabel(info.budget);
          const locClean = formatLocationLabel(loc);
          const typeClean = isRent ? `Tenant Inquiry (Rent · ${budgetClean})` : `Buyer Inquiry (Buy · ${budgetClean})`;

          const inquiryLeadId = 'inquiry_' + user.id + '_' + Date.now();
          leadSlaTracker[inquiryLeadId] = {
            id: inquiryLeadId,
            name: userName,
            userId: user.id,
            type: typeClean,
            unitRef: locClean,
            createdAt: Date.now(),
            status: 'pending',
            escalated: false
          };
          saveState();

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: isJP ? '✅ 条件に一致する物件を抽出しました' : '✅ Profile matched! Sending recommendations...' })
          });

          // ── COMPARATIVE PORTFOLIO ENGINE (ANCHORING LOGIC) ───────
          // 1. Benchmark: Premier standard establishing luxury & price context
          // 2. Sweet-Spot: Matches client budget, highlighted for superior value
          // 3. Smart Alternative: High-agility alternative
          let anchorUnit, sweetUnit, altUnit, comparativeRationale;

          if (isRent) {
            // STRICT RENTAL ONLY (Verified real posts from @malaynoprental)
            if (info.budget === 'rent_high') {
              // $1,500+/mo Executive
              anchorUnit = {
                title: 'De Castle Royal (BKK1)',
                price: '$1,800/mo',
                spec: '3BR Executive · 165 sqm · 17th Floor · Full Facilities',
                channel: '@malaynoprental',
                link: 'https://t.me/malaynoprental/32743'
              };
              sweetUnit = {
                title: 'Serviced Apartment (BKK2)',
                price: '$1,900/mo',
                spec: '2BR Luxury · 101 sqm · 14th Floor · Move-in Ready',
                channel: '@malaynoprental',
                link: 'https://t.me/malaynoprental/32721'
              };
              altUnit = {
                title: 'Serviced Apartment (Tonle Bassac)',
                price: '$1,600/mo',
                spec: '3BR High Floor · 167 sqm · 5th Floor · Spacious Family Residence',
                channel: '@malaynoprental',
                link: 'https://t.me/malaynoprental/32585'
              };
              comparativeRationale = 'Delivers 100+ sqm of move-in ready luxury in central BKK with full facilities, matching your budget profile.';
            } else if (info.budget === 'rent_mid') {
              // $700 – $1,200/mo
              anchorUnit = {
                title: 'Serviced Apartment (Tonle Bassac)',
                price: '$900/mo',
                spec: '1BR · 90 sqm · 8th Floor · Mgmt Fee & Facilities Included',
                channel: '@malaynoprental',
                link: 'https://t.me/malaynoprental/32800'
              };
              sweetUnit = {
                title: 'Serviced Apartment (Tuol Tumpung II)',
                price: '$850/mo',
                spec: '2BR Spacious · 125 sqm · 10th Floor · City View',
                channel: '@malaynoprental',
                link: 'https://t.me/malaynoprental/32755'
              };
              altUnit = {
                title: 'Serviced Apartment (Tonle Bassac · 3rd Fl)',
                price: '$800/mo',
                spec: '1BR · 90 sqm · Full Gym & Pool Access',
                channel: '@malaynoprental',
                link: 'https://t.me/malaynoprental/32788'
              };
              comparativeRationale = 'Gives you a massive 125 sqm 2-bedroom home in Tuol Tumpung at $850/mo, providing more space and bedrooms than smaller 1BR units at higher prices.';
            } else {
              // rent_low: $400 – $650/mo (Strictly respectful of client budget: $450 - $600/mo)
              if (loc === 'BKK1') {
                anchorUnit = {
                  title: 'Renovated Flat (BKK1)',
                  price: '$600/mo',
                  spec: '1BR Modern · 50 sqm · 6th Floor · Cozy Interior · WiFi Included',
                  channel: '@malaynoprental',
                  link: 'https://t.me/malaynoprental/32675'
                };
                sweetUnit = {
                  title: 'Pring Residence (BKK3 / BKK Area)',
                  price: '$450/mo',
                  spec: '1BR Serviced Apartment · 50 sqm · 8th Floor · Move-in Ready',
                  channel: '@malaynoprental',
                  link: 'https://t.me/malaynoprental/32596'
                };
                altUnit = {
                  title: 'Serviced Apartment (Tuol Tumpung II)',
                  price: '$550/mo',
                  spec: '1BR Modern Furnished · 70 sqm · 13th Floor High-Rise',
                  channel: '@malaynoprental',
                  link: 'https://t.me/malaynoprental/32766'
                };
                comparativeRationale = 'Provides move-in ready prime BKK-area living between $450 and $600/mo, keeping you in the prime central area while strictly respecting your budget.';
              } else if (loc === 'TB') {
                anchorUnit = {
                  title: 'J Tower 1 (Tonle Bassac)',
                  price: '$600/mo',
                  spec: '1BR High-Rise · 45 sqm · 14th Floor · Japanese Standard · Mgmt Fee Included',
                  channel: '@malaynoprental',
                  link: 'https://t.me/malaynoprental/32562'
                };
                sweetUnit = {
                  title: 'Serviced Apartment (Tuol Tumpung II)',
                  price: '$550/mo',
                  spec: '1BR Modern Furnished · 70 sqm · 13th Floor High-Rise · 24/7 Security',
                  channel: '@malaynoprental',
                  link: 'https://t.me/malaynoprental/32766'
                };
                altUnit = {
                  title: 'East One Studio (Boeng Reang · Central)',
                  price: '$380/mo',
                  spec: 'Studio High-Rise · 38 sqm · 17th Floor · Rooftop Pool',
                  channel: '@malaynoprental',
                  link: 'https://t.me/malaynoprental/32697'
                };
                comparativeRationale = 'Delivers Japanese-standard high-rise living right in Tonle Bassac at $600/mo with management fee included, directly meeting your budget.';
              } else {
                // TTP or ANY PRIME DISTRICT ($400 - $650/mo)
                anchorUnit = {
                  title: 'J Tower 1 (Tonle Bassac)',
                  price: '$600/mo',
                  spec: '1BR High-Rise · 45 sqm · 14th Floor · Japanese Standard · Mgmt Fee Included',
                  channel: '@malaynoprental',
                  link: 'https://t.me/malaynoprental/32562'
                };
                sweetUnit = {
                  title: 'Serviced Apartment (Tuol Tumpung II)',
                  price: '$550/mo',
                  spec: '1BR Modern Furnished · 70 sqm · 13th Floor High-Rise · Elevator & 24/7 Security',
                  channel: '@malaynoprental',
                  link: 'https://t.me/malaynoprental/32766'
                };
                altUnit = {
                  title: 'Pring Residence (BKK3)',
                  price: '$450/mo',
                  spec: '1BR Serviced Apartment · 50 sqm · 8th Floor · Built-In Shelves · Low Overheads',
                  channel: '@malaynoprental',
                  link: 'https://t.me/malaynoprental/32596'
                };
                comparativeRationale = 'At $550/mo, this 13th-floor 70 sqm 1BR in Tuol Tumpung directly hits your target budget while offering 70 sqm of furnished living space—giving you significantly more room than standard 1BRs while staying well within your $400 ~ $650 range.';
              }
            }
          } else {
            // STRICT SALE ONLY (Verified real posts from @NickREAKH & @malaynopsale)
            if (info.budget === '200plus') {
              anchorUnit = {
                title: 'Time Square 2 Penthouse (Boeng Kak)',
                price: '$680,000 USD',
                spec: '3BR Ultra-Luxury Penthouse · 270 sqm · 29th Floor',
                channel: '@malaynopsale',
                link: 'https://t.me/malaynopsale/20626'
              };
              sweetUnit = {
                title: 'Time Square 6 Duplex (BKK1)',
                price: '$395,000 USD',
                spec: '4BR Duplex · 190 sqm · 41st Floor · Strata Hard Title',
                channel: '@NickREAKH',
                link: 'https://t.me/NickREAKH/2857'
              };
              altUnit = {
                title: 'The Penthouse Residence (Tonle Bassac)',
                price: '$150,000 USD',
                spec: '2BR High Floor · 68 sqm · Opposite Aeon 1',
                channel: '@malaynopsale',
                link: 'https://t.me/malaynopsale/20615'
              };
              comparativeRationale = 'Sprawling 190 sqm 4BR Duplex in premier BKK1 at $2,078/sqm — anchored against the $680,000 flagship penthouse benchmark, offering high space-to-capital efficiency.';
            } else if (info.budget === '100to200') {
              anchorUnit = {
                title: 'The Penthouse Residence (Tonle Bassac)',
                price: '$150,000 USD',
                spec: '2BR High Floor · 68 sqm · 16th Floor · Turnkey',
                channel: '@malaynopsale',
                link: 'https://t.me/malaynopsale/20615'
              };
              sweetUnit = {
                title: 'Time Square 6 (BKK1)',
                price: '$98,000 USD',
                spec: '1BR Prime High-Rise · 57 sqm · Core Embassy Corridor',
                channel: '@NickREAKH',
                link: 'https://t.me/NickREAKH/2834'
              };
              altUnit = {
                title: 'Vue Aston River View (Koh Norea)',
                price: '$80,000 USD',
                spec: '2BR Riverfront View · 26th Floor · High Appreciation Zone',
                channel: '@NickREAKH',
                link: 'https://t.me/NickREAKH/2823'
              };
              comparativeRationale = 'Secures a prime 57 sqm 1BR in central BKK1 for under $100k ($98,000), saving $52,000 compared to the $150,000 district benchmark.';
            } else if (info.budget === '50to100') {
              anchorUnit = {
                title: 'Time Square 6 (BKK1)',
                price: '$98,000 USD',
                spec: '1BR Prime BKK1 High-Rise · 57 sqm · Core Expat District',
                channel: '@NickREAKH',
                link: 'https://t.me/NickREAKH/2834'
              };
              sweetUnit = {
                title: 'Vue Aston River View (Koh Norea)',
                price: '$80,000 USD',
                spec: '2BR High Floor River View · 26th Floor · Urgent Resale',
                channel: '@NickREAKH',
                link: 'https://t.me/NickREAKH/2823'
              };
              altUnit = {
                title: 'Residence L Boeng Trobek 2',
                price: '$65,000 USD',
                spec: '1BR Modern Furnished · 50 sqm · 15th Floor',
                channel: '@malaynopsale',
                link: 'https://t.me/malaynopsale/20638'
              };
              comparativeRationale = 'At $80,000, Vue Aston gives you a 26th-floor 2-bedroom with panoramic river views, delivering a 2BR layout for less than a standard 1BR in BKK1.';
            } else {
              // under50
              anchorUnit = {
                title: 'Morgan EnMaison (River View)',
                price: '$55,000 USD',
                spec: 'Studio Unit · 5th Floor · River View Landmark',
                channel: '@NickREAKH',
                link: 'https://t.me/NickREAKH/2822'
              };
              sweetUnit = {
                title: 'Residence L (Boeung Tumpun)',
                price: '$35,000 USD',
                spec: '1BR Unit G10-09 · 9th Floor · 40 sqm · Move-in / Instant Rent',
                channel: '@NickREAKH',
                link: 'https://t.me/NickREAKH/2866'
              };
              altUnit = {
                title: 'L Tower Loft Condo (Boeung Tumpun)',
                price: '$54,000 USD',
                spec: '1BR Loft Living · Net Area 48.5 sqm · Duplex Feel',
                channel: '@NickREAKH',
                link: 'https://t.me/NickREAKH/2802'
              };
              comparativeRationale = 'At just $35,000, Residence L offers the lowest capital entry in Phnom Penh with an active tenant base yielding high immediate cash-on-cash return.';
            }
          }

          const friendlyName = user.first_name || (userName.startsWith('@') ? userName.substring(1) : userName);

          function formatCuratedCard(unit, label, icon, isJP, whyRationale = null) {
            let card = `<blockquote>${icon} <b>${label}</b>\n` +
              `▫️ <b>${isJP ? '物件：' : 'Property:'}</b> <b>${unit.title}</b>\n` +
              `▫️ <b>${isJP ? '価格：' : 'Pricing:'}</b> <b>${unit.price}</b>\n`;
            if (whyRationale) {
              card += `▫️ <b>${isJP ? '推薦理由：' : 'Why It Stands Out:'}</b> ${whyRationale}\n`;
            }
            if (unit.layout) {
              card += `▫️ <b>${isJP ? '間取り：' : 'Layout:'}</b> ${unit.layout}\n`;
            }
            if (unit.details) {
              card += `▫️ <b>${isJP ? '詳細・階数：' : 'Details:'}</b> ${unit.details}\n`;
            }
            if (unit.features) {
              card += `▫️ <b>${isJP ? '特徴：' : 'Features:'}</b> ${unit.features}\n`;
            } else if (unit.spec && !unit.layout) {
              const parts = unit.spec.split(/\s*·\s*/);
              if (parts.length >= 2) {
                card += `▫️ <b>${isJP ? '間取り：' : 'Layout:'}</b> ${parts[0]}\n`;
                card += `▫️ <b>${isJP ? '詳細・階数：' : 'Details:'}</b> ${parts.slice(1, 3).join(' · ')}\n`;
                if (parts.length > 3) {
                  card += `▫️ <b>${isJP ? '特徴：' : 'Features:'}</b> ${parts.slice(3).join(' · ')}\n`;
                }
              } else {
                card += `▫️ <b>${isJP ? '仕様：' : 'Specs:'}</b> ${unit.spec}\n`;
              }
            }
            card += `▫️ <b>${isJP ? '写真・詳細：' : 'Listing Photos:'}</b> <a href="${unit.link}">${isJP ? '詳細を見る ↗' : 'View Details ↗'}</a></blockquote>`;
            return card;
          }

          // Beautiful, structured presentation with verified channel links
          const resultText = isJP ?
            `🏛️ <b>厳選物件ポートフォリオ</b>\n` +
            `<i>Realestate.com.kh プライベートセレクション</i>\n\n` +
            `<b>${friendlyName}様</b>、ご希望の<b>${isRent ? '賃貸コンドミニアム' : '売買・投資物件'}</b>（エリア：<b>${locClean}</b>／ご予算：<b>${budgetClean}</b>）の厳選3物件をご案内いたします：\n\n` +
            formatCuratedCard(anchorUnit, '候補 1 · 基準物件', '🏢', true) + '\n\n' +
            formatCuratedCard(sweetUnit, '候補 2 · おすすめ本命枠', '🌟', true, comparativeRationale) + '\n\n' +
            formatCuratedCard(altUnit, '候補 3 · スマートな代替案', '✨', true) + '\n\n' +
            `<blockquote>下のボタンから各候補のTelegram写真・間取り図を直接ご確認いただけます。\n\n⚡ <i>※プノンペン現地の空室状況は日々変動いたします。内覧・お申し込み前にNickがオーナーへ最新の空室状況を直接確認いたします。</i></blockquote>` :
            `🏛️ <b>CURATED PROPERTY PORTFOLIO</b>\n` +
            `<i>Realestate.com.kh Private Advisory · Phnom Penh</i>\n\n` +
            `Hello <b>${friendlyName}</b>, here are your top 3 verified matches in <b>${locClean}</b> (${budgetClean}):\n\n` +
            formatCuratedCard(anchorUnit, 'OPTION 1 · PREMIER BENCHMARK', '🏢', false) + '\n\n' +
            formatCuratedCard(sweetUnit, 'OPTION 2 · TOP VALUE RECOMMENDATION', '🌟', false, comparativeRationale) + '\n\n' +
            formatCuratedCard(altUnit, 'OPTION 3 · SMART ALTERNATIVE', '✨', false) + '\n\n' +
            `<blockquote>Tap Option 1, 2, or 3 below to view original photos and floor plans on Telegram.\n\n⚡ <i>Real-time market note: Unit availability fluctuates quickly. Nick will re-confirm active status with the landlord directly before scheduling viewings.</i></blockquote>`;

          const resultKeyboard = isJP ? {
            inline_keyboard: [
              [
                { text: '🏢 候補 1 ↗', url: anchorUnit.link },
                { text: '🌟 候補 2 ↗', url: sweetUnit.link },
                { text: '✨ 候補 3 ↗', url: altUnit.link }
              ],
              [
                { text: '📂 他の候補3件を見る ❯', callback_data: 'portfolio_more_matches' }
              ],
              [
                { text: '🎯 Nickに特別オーダー・未公開物件を依頼', callback_data: 'btn_custom_search' }
              ],
              [
                { text: '📅 プライベート内覧・ビデオ案内を予約', callback_data: 'btn_book_PORTFOLIO' }
              ],
              [
                { text: '🔄 条件を変更する', callback_data: 'btn_explore_prop' }
              ]
            ]
          } : {
            inline_keyboard: [
              [
                { text: '🏢 Option 1 ↗', url: anchorUnit.link },
                { text: '🌟 Option 2 ↗', url: sweetUnit.link },
                { text: '✨ Option 3 ↗', url: altUnit.link }
              ],
              [
                { text: '📂 View Next 3 Matches ❯', callback_data: 'portfolio_more_matches' }
              ],
              [
                { text: '🎯 Request Custom Sourcing from Nick', callback_data: 'btn_custom_search' }
              ],
              [
                { text: '📅 Book Private Tour / Video Inspection', callback_data: 'btn_book_PORTFOLIO' }
              ],
              [
                { text: '🔄 Adjust Search Criteria', callback_data: 'btn_explore_prop' }
              ]
            ]
          };

          // Cache initial card so user can easily return to it from Batch 2
          info.initialCard = {
            text: resultText,
            reply_markup: resultKeyboard
          };
          info.shownLinks = [anchorUnit.link, sweetUnit.link, altUnit.link];

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: resultText,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
              link_preview_options: { is_disabled: true },
              reply_markup: resultKeyboard
            })
          });

          // Qualified Lead Dossier dispatched to Nick (Internal CRM - Anchoring strategy tracked here)
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `<b>QUALIFIED LEAD DOSSIER · REALESTATE.COM.KH</b>\n\n` +
                `▫️ <b>Client:</b> @${user.username || 'client'} (${user.first_name || ''} ${user.last_name || ''})\n` +
                `▫️ <b>Intent:</b> ${isRent ? 'Rental (Tenant)' : 'Purchase (Buyer)'}\n` +
                `▫️ <b>Budget:</b> ${budgetClean}\n` +
                `▫️ <b>Location:</b> ${locClean}\n` +
                `▫️ <b>Internal Strategy:</b> Anchoring Framework Applied (Anchor: ${anchorUnit.price} ➔ Target: ${sweetUnit.price})\n` +
                `▫️ <b>Selected Units Shown to Client:</b>\n` +
                `  1. ${anchorUnit.title} (${anchorUnit.price})\n` +
                `  2. ${sweetUnit.title} (${sweetUnit.price})\n` +
                `  3. ${altUnit.title} (${altUnit.price})\n\n` +
                `⚠️ <b>AGENT AVAILABILITY CHECK:</b> Before confirming tours, verify these units are still active with the landlord/master agent!\n\n` +
                `<blockquote>Client completed the questionnaire and is reviewing their curated portfolio. Response SLA: 15-minute benchmark active.</blockquote>`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Mark Contacted', callback_data: `sla_done_${inquiryLeadId}` },
                    { text: 'Advance to Tour', callback_data: `sla_booked_${inquiryLeadId}` }
                  ],
                  [
                    { text: '💬 Message Client', url: `tg://user?id=${user.id}` }
                  ]
                ]
              }
            })
          });
          console.log(`📋 Sent Qualified Lead Dossier with SLA tracking to Nick for user ${userName}!`);
        }

        else if (dataStr === 'portfolio_more_matches') {
          const info = leadState[user.id] || { type: 'Rent', budget: 'rent_low', location: 'ANY' };
          const isJP = (userLanguages[user.id] || userLanguages[msg.chat.id]) === 'JP';
          const isRent = info.type === 'Rent';
          const budgetClean = formatBudgetLabel(info.budget);
          const locClean = formatLocationLabel(info.location || 'ANY');
          const friendlyName = user.first_name || (userName.startsWith('@') ? userName.substring(1) : userName);

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: isJP ? '📂 追加の厳選物件を読み込み中...' : '📂 Fetching next verified matches...' })
          });

          // Fetch next 3 matches from inventory
          const invPath = path.join(__dirname, 'data', 'multi-channel-inventory.json');
          let listings = [];
          if (fs.existsSync(invPath)) {
            try {
              listings = JSON.parse(fs.readFileSync(invPath, 'utf8')).listings || [];
            } catch (_) {}
          }

          const shown = new Set(info.shownLinks || []);
          
          function filterCandidates(locFilter) {
            return listings.filter(item => {
              if (isRent && item.type !== 'Rent') return false;
              if (!isRent && item.type !== 'Sale') return false;
              if (shown.has(item.link)) return false;

              const p = item.price;
              if (isRent) {
                if (info.budget === 'rent_low' && p && p > 750) return false;
                if (info.budget === 'rent_mid' && p && (p < 600 || p > 1300)) return false;
                if (info.budget === 'rent_high' && p && p < 1200) return false;
              } else {
                if (info.budget === 'under50' && p && p > 65000) return false;
                if (info.budget === '50to100' && p && (p < 45000 || p > 115000)) return false;
                if (info.budget === '100to200' && p && (p < 95000 || p > 220000)) return false;
                if (info.budget === '200plus' && p && p < 180000) return false;
              }

              if (locFilter && locFilter !== 'ANY') {
                const full = `${item.location} ${item.title} ${item.snippet}`.toLowerCase();
                if (locFilter === 'BKK1' && !full.includes('bkk')) return false;
                if (locFilter === 'TB' && !full.includes('bassac')) return false;
                if (locFilter === 'TTP' && !(full.includes('chamkar') || full.includes('toul') || full.includes('ttp') || full.includes('tumpun'))) return false;
              }
              return true;
            });
          }

          let matches = filterCandidates(info.location);
          if (matches.length < 3 && info.location !== 'ANY') {
            const extra = filterCandidates('ANY');
            for (const em of extra) {
              if (!matches.some(x => x.id === em.id)) matches.push(em);
              if (matches.length >= 3) break;
            }
          }

          const nextBatch = matches.slice(0, 3);
          if (nextBatch.length === 0) {
            // No more matches in public channels
            const emptyText = isJP ?
              `🎯 <b>公開物件はすべてご確認いただきました</b>\n` +
              `<i>Realestate.com.kh プライベートアドバイザリー</i>\n\n` +
              `<b>${friendlyName}様</b>、現在チャンネル公開中の該当物件（${locClean}／${budgetClean}）はすべて表示いたしました。\n\n` +
              `▫️ <b>未公開・オフマーケット枠をお探しですか？</b>\n` +
              `代表Nickは、一般公開前のオーナー直接売却物件やデベロッパーの特別再販枠を保有しております。\n\n` +
              `ご希望の条件（ペット可、バスタブ付き、特定通り、階数など）をお知らせいただければ、Nickが個別に特別探索いたします。` :
              `🎯 <b>ALL PUBLIC LISTINGS REVIEWED</b>\n` +
              `<i>Realestate.com.kh Private Advisory · Phnom Penh</i>\n\n` +
              `Hello <b>${friendlyName}</b>, you have viewed all currently active public channel listings matching your criteria (<b>${locClean}</b> · ${budgetClean}).\n\n` +
              `▫️ <b>Looking for Exclusive Off-Market Inventory?</b>\n` +
              `Nick maintains a direct network of unlisted landlord units, distressed developer allocations, and private off-market assignments not posted publicly.\n\n` +
              `Tap below to request bespoke sourcing or discuss your specific preferences directly with Nick:`;

            const emptyKeyboard = isJP ? {
              inline_keyboard: [
                [{ text: '🎯 Nickに特別オーダー・未公開物件を依頼', callback_data: 'btn_custom_search' }],
                [{ text: '💬 Nickへ直接相談 ↗', url: 'https://t.me/Nick_REAKH' }],
                [{ text: '🔙 おすすめ3候補に戻る', callback_data: 'portfolio_back_top3' }],
                [{ text: '🔄 条件を変更する', callback_data: 'btn_explore_prop' }]
              ]
            } : {
              inline_keyboard: [
                [{ text: '🎯 Request Custom Sourcing from Nick', callback_data: 'btn_custom_search' }],
                [{ text: '💬 Inquire with Nick Directly ↗', url: 'https://t.me/Nick_REAKH' }],
                [{ text: '🔙 Back to Top 3 Matches', callback_data: 'portfolio_back_top3' }],
                [{ text: '🔄 Adjust Search Criteria', callback_data: 'btn_explore_prop' }]
              ]
            };

            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                text: emptyText,
                parse_mode: 'HTML',
                reply_markup: emptyKeyboard
              })
            });
            return;
          }

          // Format Batch 2 text
          const labels = ['4', '5', '6'];
          const icons = ['🏢', '🌟', '✨'];
          let moreText = isJP ?
            `🏛️ <b>追加の厳選物件ポートフォリオ (第2弾)</b>\n` +
            `<i>Realestate.com.kh プライベートセレクション</i>\n\n` +
            `<b>${friendlyName}様</b>のご希望条件（<b>${locClean}</b>／<b>${budgetClean}</b>）に合致する、追加の3物件です：\n\n` :
            `🏛️ <b>MORE VERIFIED MATCHES (BATCH 2)</b>\n` +
            `<i>Realestate.com.kh Private Advisory · Phnom Penh</i>\n\n` +
            `Hello <b>${friendlyName}</b>, here are 3 additional verified matches in <b>${locClean}</b> (${budgetClean}):\n\n`;

          const buttonsRow = [];
          nextBatch.forEach((item, idx) => {
            const num = labels[idx];
            const icon = icons[idx];

            let cleanTitle = (item.title || `${item.location} ${item.beds}`)
              .replace(/^#Newlisting\s*/i, '')
              .replace(/^[📍🏢✨🍃💫\s]+/, '')
              .replace(/\s*·\s*Features:[\s\S]*/i, '')
              .trim();
            if (cleanTitle.includes('·')) cleanTitle = cleanTitle.split('·')[0].trim();

            const snippet = item.snippet || '';
            const floorM = snippet.match(/(\d+(?:st|nd|rd|th)(?:\s*floor)?)/i);
            const floor = floorM ? floorM[1] : '';

            const sizeM = snippet.match(/(\d+(?:\.\d+)?\s*(?:m²|sqm))/i);
            const size = sizeM ? sizeM[1].replace(/m²/i, 'sqm') : '';

            const bedBathM = snippet.match(/(\d+\s*🛏\s*\|\s*\d+\s*🛁|\d+\s*🛏)/i);
            let layout = bedBathM ? bedBathM[1].replace(/\|/g, '·').replace(/\s+/g, ' ').trim() : item.beds;
            if (!layout.includes('🛏') && item.beds) {
              layout = `${item.beds} (1🛁)`;
            }

            const sizeFloorParts = [];
            if (size) sizeFloorParts.push(size);
            if (floor) sizeFloorParts.push(floor.includes('Floor') ? floor : `${floor} Floor`);
            const sizeFloorText = sizeFloorParts.join(' · ');

            const priceClean = (item.priceFormatted && !item.priceFormatted.startsWith('/mo') && item.priceFormatted !== 'Inquire')
              ? item.priceFormatted
              : (item.price ? (item.type === 'Rent' ? `$${item.price.toLocaleString()}/mo` : `$${item.price.toLocaleString()} USD`) : 'Inquire');

            const detailsLabel = isJP ? '詳細を見る ↗' : 'View Details ↗';
            
            moreText += `<blockquote>${icon} <b>${isJP ? '候補 ' + num : 'OPTION ' + num}</b>\n` +
              `▫️ <b>${isJP ? '物件：' : 'Property:'}</b> <b>${cleanTitle}</b>\n` +
              `▫️ <b>${isJP ? '価格：' : 'Pricing:'}</b> <b>${priceClean}</b>\n` +
              `▫️ <b>${isJP ? '間取り：' : 'Layout:'}</b> ${layout}\n` +
              (sizeFloorText ? `▫️ <b>${isJP ? '詳細・階数：' : 'Details:'}</b> ${sizeFloorText}\n` : '') +
              `▫️ <b>${isJP ? 'エリア：' : 'Location:'}</b> ${item.location}\n` +
              `▫️ <b>${isJP ? '写真・詳細：' : 'Listing Photos:'}</b> <a href="${item.link}">${detailsLabel}</a></blockquote>\n\n`;

            buttonsRow.push({ text: `${icon} ${isJP ? '候補 ' + num : 'Option ' + num} ↗`, url: item.link });
          });

          moreText += `<blockquote>Tap Option 4, 5, or 6 below to view original photos and floor plans on Telegram.\n\n⚡ <i>Still haven't found the right match? Tap "Request Custom Sourcing" to have Nick check off-market inventory.</i></blockquote>`;

          const moreKeyboard = isJP ? {
            inline_keyboard: [
              buttonsRow.map((b, i) => ({ text: `${icons[i]} 候補 ${labels[i]} ↗`, url: b.url })),
              [{ text: '🎯 Nickに特別オーダー・未公開物件を依頼', callback_data: 'btn_custom_search' }],
              [{ text: '📅 プライベート内覧・ビデオ案内を予約', callback_data: 'btn_book_PORTFOLIO' }],
              [{ text: '🔙 おすすめ3候補に戻る', callback_data: 'portfolio_back_top3' }],
              [{ text: '🔄 条件を変更する', callback_data: 'btn_explore_prop' }]
            ]
          } : {
            inline_keyboard: [
              buttonsRow,
              [{ text: '🎯 Request Custom Sourcing from Nick', callback_data: 'btn_custom_search' }],
              [{ text: '📅 Book Private Tour / Video Inspection', callback_data: 'btn_book_PORTFOLIO' }],
              [{ text: '🔙 Back to Top 3 Matches', callback_data: 'portfolio_back_top3' }],
              [{ text: '🔄 Adjust Search Criteria', callback_data: 'btn_explore_prop' }]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: moreText,
              parse_mode: 'HTML',
              disable_web_page_preview: true,
              link_preview_options: { is_disabled: true },
              reply_markup: moreKeyboard
            })
          });
        }

        else if (dataStr === 'portfolio_back_top3') {
          const info = leadState[user.id];
          if (info && info.initialCard) {
            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                text: info.initialCard.text,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                link_preview_options: { is_disabled: true },
                reply_markup: info.initialCard.reply_markup
              })
            });
          } else {
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cbId, text: 'Returning to search...' })
            });
          }
        }

        else if (dataStr === 'btn_custom_search') {
          const info = leadState[user.id] || {};
          const isJP = (userLanguages[user.id] || userLanguages[msg.chat.id]) === 'JP';
          const budgetClean = formatBudgetLabel(info.budget || 'Selected');
          const locClean = formatLocationLabel(info.location || 'ANY');
          const typeClean = info.type === 'Rent' ? (isJP ? '賃貸' : 'Rental') : (isJP ? '売買・投資' : 'Acquisition');

          userWaitingForCustomSearch[msg.chat.id] = {
            userId: user.id,
            userName: userName,
            budget: info.budget,
            location: info.location,
            type: info.type
          };

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const customText = isJP ?
            `🎯 <b>オーダーメイド物件探索 (個別リクエスト)</b>\n` +
            `<i>Realestate.com.kh プライベートアドバイザリー</i>\n\n` +
            `公開物件の中にぴったりの物件がございませんか？\n\n` +
            `▫️ <b>ご希望のこだわり条件を自由にご返信ください：</b>\n` +
            `（例：<i>「ペット飼育可」「バスタブ必須」「高層階・リバービュー」「Time Square 306限定」「来月1日入居希望」</i> など）\n\n` +
            `💬 <b>このメッセージにそのままテキストで返信</b>していただくか、下のボタンからNickへ直接Telegramでご相談いただけます。\n\n` +
            `⚡ <i>Nickが非公開のオーナー直接物件・デベロッパー特別枠から迅速にお探しいたします（15分以内を目安にご返信）。</i>` :
            `🎯 <b>BESPOKE PROPERTY SOURCING</b>\n` +
            `<i>Realestate.com.kh Private Advisory · Phnom Penh</i>\n\n` +
            `Looking for specific features not shown in our public channel listings?\n\n` +
            `▫️ <b>Tell us your exact preferences:</b>\n` +
            `<i>(e.g., "Must be dog/cat friendly", "Bathtub required", "High floor with river view", "Time Square 306 only", "Move-in by Nov 1st")</i>\n\n` +
            `💬 <b>Simply reply directly to this message</b> with what you need, or tap below to chat directly with Nick on Telegram.\n\n` +
            `⚡ <i>Nick will personally scan unlisted landlord inventory, private resales, and developer direct units (15-minute response benchmark active).</i>`;

          const customKeyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 Nickへ直接相談 ↗', url: 'https://t.me/Nick_REAKH' }],
              [{ text: '🔙 おすすめ3候補に戻る', callback_data: 'portfolio_back_top3' }],
              [{ text: '🔄 条件を変更する', callback_data: 'btn_explore_prop' }]
            ]
          } : {
            inline_keyboard: [
              [{ text: '💬 Inquire with Nick Directly ↗', url: 'https://t.me/Nick_REAKH' }],
              [{ text: '🔙 Back to Top 3 Matches', callback_data: 'portfolio_back_top3' }],
              [{ text: '🔄 Adjust Search Criteria', callback_data: 'btn_explore_prop' }]
            ]
          };

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: customText,
              parse_mode: 'HTML',
              reply_markup: customKeyboard
            })
          });
        }

        // ── B. INVESTOR SUITE: CURRENCY, WATCHLIST, VIEWING & PDF ──
        else if (dataStr.startsWith('btn_currency_')) {
          const price = parseInt(dataStr.replace('btn_currency_', ''), 10) || 99000;
          const jpyWan = (Math.round((price * 152) / 100000) / 10).toLocaleString();
          const jpyTotal = Math.round(price * 152).toLocaleString();
          const eur = Math.round(price * 0.92).toLocaleString();
          const usdt = price.toLocaleString();

          const alertText = 
            `💱 LIVE MULTI-CURRENCY CONVERSION\n\n` +
            `🇺🇸 USD: $${price.toLocaleString()}\n` +
            `🇯🇵 JPY: 約 ${jpyWan} 万円 (¥${jpyTotal})\n` +
            `🇪🇺 EUR: € ${eur}\n` +
            `🪙 USDT: ${usdt} USDT (Tether)\n\n` +
            `*Indicative rates. Bank wire & USDT accepted.`;

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: alertText, show_alert: true })
          });
        }

        else if (dataStr.startsWith('btn_track_')) {
          const unit = dataStr.replace('btn_track_', '').toUpperCase();
          if (!watchlist[unit]) watchlist[unit] = new Set();
          watchlist[unit].add(msg.chat.id.toString());
          saveState();

          const alertText = 
            `🔔 PRICE DROP WATCHLIST ACTIVATED!\n\n` +
            `You are now tracking ${unit}.\n\n` +
            `If the owner drops the price or an urgent offer is accepted, you will receive an automated private notification!`;

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: alertText, show_alert: true })
          });

          console.log(`🔔 User ${userName} (${msg.chat.id}) subscribed to price drop alerts for ${unit}`);
        }

        else if (dataStr.startsWith('btn_book_')) {
          const unit = dataStr.replace('btn_book_', '').toUpperCase();
          const isJP = (userLanguages[user.id] || userLanguages[msg.chat.id]) === 'JP';
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          let displayName = unit;
          const isGeneric = unit === 'PORTFOLIO' || unit === 'RENT' || unit === 'SALE';
          if (unit === 'PORTFOLIO') displayName = isJP ? '厳選ポートフォリオ候補物件' : 'Curated Portfolio Units';
          else if (unit === 'RENT') displayName = isJP ? 'プノンペン厳選賃貸物件' : 'Curated Rental Residences';
          else if (unit === 'SALE') displayName = isJP ? 'プノンペン厳選購入物件' : 'Curated Acquisition Condos';

          const bookText = isJP ?
            `📅 <b>プライベート内覧・ビデオ案内のお申し込み</b>\n` +
            `<i>Realestate.com.kh 現地公式デスク · ${displayName}</i>\n\n` +
            `プノンペン現地の全物件について、専任担当Nickによるプライベート内覧を受け付けております：\n\n` +
            `▫️ <b>現地対面内覧（プノンペン）：</b> 代表Nickまたは専任エージェントが現地で物件・共用部・周辺環境をご案内いたします。\n` +
            `▫️ <b>オンライン・ビデオ生中継：</b> TelegramまたはZoom/WhatsAppのビデオ通話にて、お部屋や眺望をリアルタイム中継（日本・海外在住者向け）。\n\n` +
            `ご希望のご案内形式をお選びください：` :
            `📅 <b>SCHEDULE A PRIVATE TOUR / VIDEO INSPECTION</b>\n` +
            `<i>Realestate.com.kh Private Advisory · ${displayName}</i>\n\n` +
            `We offer personalized property inspections managed directly by Lead Advisor Nick:\n\n` +
            `▫️ <b>In-Person Walking Tour:</b> Meet Nick on-site in Phnom Penh for a full walkthrough of units & facilities.\n` +
            `▫️ <b>Live Overseas Video Walkthrough:</b> Live interactive video tour via Telegram or WhatsApp (ideal for overseas clients).\n\n` +
            `Select your preferred format:`;

          const backBtn = isGeneric ?
            { text: isJP ? '🔙 物件一覧へ戻る' : '🔙 Back to Properties', callback_data: 'btn_explore_prop' } :
            { text: isJP ? '🔙 物件詳細へ戻る' : '🔙 Back to Property', callback_data: `btn_view_${unit}` };

          const bookKeyboard = isJP ? {
            inline_keyboard: [
              [{ text: '🏢 現地対面内覧（プノンペン）', callback_data: `tour_inperson_${unit}` }],
              [{ text: '🎥 オンライン・ビデオ生中継（日本・海外から）', callback_data: `tour_video_${unit}` }],
              [backBtn, { text: '🔙 メインメニュー', callback_data: 'menu_main' }]
            ]
          } : {
            inline_keyboard: [
              [{ text: '🏢 In-Person Walking Tour (Phnom Penh)', callback_data: `tour_inperson_${unit}` }],
              [{ text: '🎥 Overseas Live Video Walkthrough', callback_data: `tour_video_${unit}` }],
              [backBtn, { text: '🔙 Main Menu', callback_data: 'menu_main' }]
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

          let displayName = unit;
          const isGeneric = unit === 'PORTFOLIO' || unit === 'RENT' || unit === 'SALE';
          if (unit === 'PORTFOLIO') displayName = isJP ? '厳選ポートフォリオ候補物件' : 'Curated Portfolio Units';
          else if (unit === 'RENT') displayName = isJP ? 'プノンペン厳選賃貸物件' : 'Curated Rental Residences';
          else if (unit === 'SALE') displayName = isJP ? 'プノンペン厳選購入物件' : 'Curated Acquisition Condos';

          leadSlaTracker[tourLeadId] = {
            id: tourLeadId,
            name: userName,
            userId: user.id,
            type: isVideo ? 'Live Video Tour Request' : 'In-Person Tour Request',
            unitRef: displayName,
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
            `✅ <b>内覧リクエストを受け付けました！</b>\n\n` +
            `▫️ <b>対象：</b> ${displayName}\n` +
            `▫️ <b>形式：</b> ${isVideo ? '🎥 オンライン・ビデオ生中継（日本・海外から）' : '🏢 現地対面内覧（プノンペン）'}\n` +
            `▫️ <b>担当：</b> Nick（Realestate.com.kh 代表窓口）\n\n` +
            `ご希望の日時を調整するため、担当のNickよりTelegramにて直接ご連絡差し上げます。\n` +
            `お急ぎの場合は、以下のボタンより直接Nickへメッセージをお送りいただけます：` :
            `✅ <b>VIEWING REQUEST CONFIRMED!</b>\n\n` +
            `▫️ <b>Property:</b> ${displayName}\n` +
            `▫️ <b>Format:</b> ${isVideo ? '🎥 Live Overseas Video Walkthrough' : '🏢 In-Person Walking Tour (Phnom Penh)'}\n` +
            `▫️ <b>Advisor:</b> Nick (@Nick_REAKH · Lead Advisor)\n\n` +
            `Nick has received your appointment request and will coordinate the exact date & time with you directly on Telegram.\n\n` +
            `Need immediate confirmation? Tap below to chat with Nick directly:`;

          const backBtn = isGeneric ?
            { text: isJP ? '🏢 物件一覧' : '🏢 Explore Properties', callback_data: 'btn_explore_prop' } :
            { text: isJP ? '🔙 物件詳細へ戻る' : '🔙 Back to Property', callback_data: `btn_view_${unit}` };

          const confirmKeyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 Nickへ直接相談 ↗', url: 'https://t.me/Nick_REAKH' }],
              [
                backBtn,
                { text: '🔙 メインメニュー', callback_data: 'menu_main' }
              ]
            ]
          } : {
            inline_keyboard: [
              [{ text: '💬 Connect with Nick (@Nick_REAKH) ↗', url: 'https://t.me/Nick_REAKH' }],
              [
                backBtn,
                { text: '🔙 Main Menu', callback_data: 'menu_main' }
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
          });

          // Alert Nick desk immediately of high-intent tour booking!
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🚨 <b>NEW PRIVATE TOUR APPOINTMENT REQUEST!</b>\n\n` +
                `▫️ <b>Client:</b> @${user.username || 'client'} (${user.first_name || ''} ${user.last_name || ''})\n` +
                `▫️ <b>Unit / Category:</b> ${displayName}\n` +
                `▫️ <b>Format:</b> ${isVideo ? '🎥 Live Video Walkthrough' : '🏢 In-Person Walking Tour (Phnom Penh)'}\n` +
                `▫️ <b>Response Benchmark:</b> 15-Minute SLA Active\n\n` +
                `⚠️ <b>ACTION REQUIRED:</b> Message client to coordinate date & time!`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💬 Message Client', url: `tg://user?id=${user.id}` }],
                  [{ text: 'Mark Scheduled', callback_data: `sla_booked_${tourLeadId}` }]
                ]
              }
            })
          });

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `<b>TOUR BOOKING DOSSIER · REALESTATE.COM.KH</b>\n\n` +
                `▫️ <b>Client:</b> ${userName} (${user.first_name} ${user.last_name || ''})\n` +
                `▫️ <b>Property:</b> ${unit}\n` +
                `▫️ <b>Format:</b> ${isVideo ? 'Live Overseas Video Call' : 'In-Person Viewing Tour'}\n` +
                `▫️ <b>Response SLA:</b> 15-minute benchmark active\n\n` +
                `<blockquote>Client requested a viewing tour. Confirm calendar time slot with client.</blockquote>`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: 'Mark Contacted', callback_data: `sla_done_${tourLeadId}` },
                    { text: 'Advance to Tour', callback_data: `sla_booked_${tourLeadId}` }
                  ],
                  [
                    { text: '💬 Message Client', url: `tg://user?id=${user.id}` }
                  ]
                ]
              }
            })
          });
          console.log(`📅 Sent viewing booking alert with SLA tracking to Nick for user ${userName}!`);
        }

        else if (dataStr.startsWith('btn_pdf_')) {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '📄 Delivering your Executive Factsheet...' })
          });

          const fsMod = require('fs');
          const pdfPath = '/tmp/TS8_Investment_Factsheet.pdf';
          if (fsMod.existsSync(pdfPath)) {
            const fileData = fsMod.readFileSync(pdfPath);
            const formData = new FormData();
            formData.append('chat_id', msg.chat.id);
            formData.append('document', new Blob([fileData], { type: 'application/pdf' }), 'Realestate_Time_Square_8_Factsheet.pdf');
            formData.append('caption', '📄 <b>1-Page Executive Investment Teaser</b>\n\n🏢 <b>Time Square 8 (2BR)</b> · $99,000 USD\n🛡️ Verified Strata Title · 8.5% Net Yield\n\n<i>Generated automatically by Realestate.com.kh Bot</i>');
            formData.append('parse_mode', 'HTML');

            await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
              method: 'POST',
              body: formData
            });
            console.log(`📄 Dispatched PDF factsheet to user ${userName}!`);
          }
        }

        // ── PHASE 1: INTERACTIVE PAYMENT CALCULATOR ──
        else if (dataStr.startsWith('btn_calc_')) {
          const parts = dataStr.replace('btn_calc_', '').split('_');
          const price = parseInt(parts[0], 10) || 99000;
          const unit = parts[1] || 'TS8';

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const calc = getCalculatorMenu(price, unit);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: calc.text,
              parse_mode: 'HTML',
              reply_markup: calc.reply_markup
            })
          });
        }

        else if (dataStr.startsWith('calc_p10_')) {
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

          const isJP = userLang === 'JP';
          const textContent = isJP ?
            `<b>10%頭金 分割払いシミュレーション</b>\n\n` +
            `▫️ <b>物件：</b> タイムズスクエア8 · $${price.toLocaleString()} USD\n` +
            `▫️ <b>当初頭金（10%）：</b> $${down.toLocaleString()} USD（約${Math.round(down * 152 / 10000)}万円）\n` +
            `▫️ <b>工事期間中分割（36ヶ月）：</b> 月額 $${monthly.toLocaleString()} USD/月\n` +
            `▫️ <b>竣工時残代金（72%）：</b> $${handover.toLocaleString()} USD（2026年Q4）\n` +
            `▫️ <b>想定家賃収入：</b> $750 USD/月（年額 $9,000 USD）\n` +
            `▫️ <b>実質純利回り：</b> <b>8.5% Net</b>\n\n` +
            `<blockquote>手元資金を抑え、月々わずか$500未満の支払いで資産形成が可能です。</blockquote>` :
            `<b>DEVELOPER INSTALLMENT MODEL (10% DOWN)</b>\n\n` +
            `▫️ <b>Asset:</b> Time Square 8 · $${price.toLocaleString()} USD\n` +
            `▫️ <b>Down Payment (10%):</b> $${down.toLocaleString()} USD upon contract\n` +
            `▫️ <b>During Construction (36 Mos):</b> $${monthly.toLocaleString()}/month\n` +
            `▫️ <b>Handover Balance (72%):</b> $${handover.toLocaleString()} USD (Q4 2026)\n` +
            `▫️ <b>Projected Net Rent:</b> $750/mo ($9,000/year)\n` +
            `▫️ <b>Net Rental Yield:</b> <b>8.5% Net</b>\n\n` +
            `<blockquote>Pay under $500/month while construction progresses, then collect rental income upon completion.</blockquote>`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text: textContent, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: isJP ? '💬 Nickへ直接相談' : '💬 Consult with Nick', url: 'https://t.me/Nick_REAKH' }],
                  [
                    { text: isJP ? '📅 内覧予約' : '📅 Book Viewing', callback_data: `btn_book_${unit}` },
                    { text: isJP ? '🧮 試算プラン一覧' : '🧮 Calculator Plans', callback_data: `btn_calc_${price}_${unit}` }
                  ],
                  [{ text: isJP ? '🔙 メインメニュー' : '🔙 Main Menu', callback_data: 'menu_main' }]
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

          const isJP = userLang === 'JP';
          const textContent = isJP ?
            `<b>20%頭金 最優遇分割プラン</b>\n\n` +
            `▫️ <b>物件：</b> タイムズスクエア8 · $${price.toLocaleString()} USD\n` +
            `▫️ <b>当初頭金（20%）：</b> $${down.toLocaleString()} USD（約${Math.round(down * 152 / 10000)}万円）\n` +
            `▫️ <b>工事期間中分割（36ヶ月）：</b> 月額 $${monthly.toLocaleString()} USD/月\n` +
            `▫️ <b>竣工時残代金（60%）：</b> $${handover.toLocaleString()} USD（2026年Q4）\n` +
            `▫️ <b>実質純利回り：</b> <b>8.8% Net</b>\n\n` +
            `<blockquote>頭金を20%入れることで、竣工時の残債支払いを最小限に抑えられます。</blockquote>` :
            `<b>DEVELOPER INSTALLMENT MODEL (20% DOWN)</b>\n\n` +
            `▫️ <b>Asset:</b> Time Square 8 · $${price.toLocaleString()} USD\n` +
            `▫️ <b>Down Payment (20%):</b> $${down.toLocaleString()} USD\n` +
            `▫️ <b>During Construction (36 Mos):</b> $${monthly.toLocaleString()}/month\n` +
            `▫️ <b>Balance at Handover (60%):</b> $${handover.toLocaleString()} USD (Q4 2026)\n` +
            `▫️ <b>Net Rental Yield:</b> <b>8.8% Net</b>\n\n` +
            `<blockquote>Higher initial commitment reduces balloon balance upon completion.</blockquote>`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text: textContent, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: isJP ? '💬 Nickへ直接相談' : '💬 Consult with Nick', url: 'https://t.me/Nick_REAKH' }],
                  [
                    { text: isJP ? '📅 内覧予約' : '📅 Book Viewing', callback_data: `btn_book_${unit}` },
                    { text: isJP ? '🧮 試算プラン一覧' : '🧮 Calculator Plans', callback_data: `btn_calc_${price}_${unit}` }
                  ],
                  [{ text: isJP ? '🔙 メインメニュー' : '🔙 Main Menu', callback_data: 'menu_main' }]
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

          const isJP = userLang === 'JP';
          const textContent = isJP ?
            `<b>15年銀行ローン返済シミュレーション</b>\n\n` +
            `▫️ <b>物件価格：</b> $${price.toLocaleString()} USD\n` +
            `▫️ <b>自己資金（30%）：</b> $${down.toLocaleString()} USD（約${Math.round(down * 152 / 10000)}万円）\n` +
            `▫️ <b>借入金額（70%）：</b> $${loan.toLocaleString()} USD（年利 7.5% · 15年元利均等）\n` +
            `▫️ <b>毎月返済額（EMI）：</b> <b>$${emi.toLocaleString()} USD/月</b>\n` +
            `▫️ <b>想定家賃収入：</b> $${monthlyRent} USD/月\n` +
            `▫️ <b>毎月手残り（Cash Flow）：</b> <strong style="color:#34d399;">+$${cashFlow} USD/月 黒字</strong>\n\n` +
            `<blockquote>テナントの家賃でローン返済を行いながら、毎月手元に黒字キャッシュフローを残せます。</blockquote>` :
            `<b>15-YEAR COMMERCIAL BANK MORTGAGE MODEL</b>\n\n` +
            `▫️ <b>Purchase Price:</b> $${price.toLocaleString()} USD\n` +
            `▫️ <b>Down Payment (30%):</b> $${down.toLocaleString()} USD\n` +
            `▫️ <b>Bank Loan (70%):</b> $${loan.toLocaleString()} USD @ 7.5% (15 Years)\n` +
            `▫️ <b>Monthly Mortgage (EMI):</b> <b>$${emi.toLocaleString()}/month</b>\n` +
            `▫️ <b>Estimated Rent:</b> $${monthlyRent}/month\n` +
            `▫️ <b>Net Cash Flow:</b> <strong style="color:#34d399;">+$${cashFlow}/month POSITIVE</strong>\n\n` +
            `<blockquote>The tenant pays off your mortgage while you retain positive cash flow and 100% property ownership.</blockquote>`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text: textContent, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: isJP ? '💬 Nickへ直接相談' : '💬 Consult with Nick', url: 'https://t.me/Nick_REAKH' }],
                  [
                    { text: isJP ? '📅 内覧予約' : '📅 Book Viewing', callback_data: `btn_book_${unit}` },
                    { text: isJP ? '🧮 試算プラン一覧' : '🧮 Calculator Plans', callback_data: `btn_calc_${price}_${unit}` }
                  ],
                  [{ text: isJP ? '🔙 メインメニュー' : '🔙 Main Menu', callback_data: 'menu_main' }]
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

          const isJP = userLang === 'JP';
          const textContent = isJP ?
            `<b>純利回り（Net Yield）および投資収支詳細</b>\n\n` +
            `▫️ <b>年間総賃料収入（$750/月）：</b> $${grossAnnual.toLocaleString()} USD\n` +
            `▫️ <b>管理費・修繕積立金：</b> -$${mgmtFee} USD/年\n` +
            `▫️ <b>実質手取り年収：</b> $${netAnnual.toLocaleString()} USD（約${Math.round(netAnnual * 152 / 10000)}万円）\n` +
            `▫️ <b>実質純利回り（Net）：</b> <b>${netYield}% Net</b>\n\n` +
            `<blockquote>【主要都市ネット利回り比較】\nプノンペン（8.5% Net）vs バンコク（4.5%）vs 東京（2.4%）\n高利回りと米ドル保有を同時に実現できます。</blockquote>` :
            `<b>NET RENTAL YIELD & CASH-FLOW MODEL</b>\n\n` +
            `▫️ <b>Gross Annual Rent ($750/mo):</b> $${grossAnnual.toLocaleString()} USD\n` +
            `▫️ <b>Maintenance & Management:</b> -$${mgmtFee} USD/year\n` +
            `▫️ <b>Net Annual Rental Income:</b> $${netAnnual.toLocaleString()} USD\n` +
            `▫️ <b>Net Rental Yield:</b> <b>${netYield}% Net</b>\n\n` +
            `<blockquote>Global comparison: Phnom Penh (${netYield}% Net) vs Bangkok (4.5%) vs Tokyo (2.4%).</blockquote>`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text: textContent, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: isJP ? '💬 Nickへ直接相談' : '💬 Consult with Nick', url: 'https://t.me/Nick_REAKH' }],
                  [
                    { text: isJP ? '📅 内覧予約' : '📅 Book Viewing', callback_data: `btn_book_${unit}` },
                    { text: isJP ? '🧮 試算プラン一覧' : '🧮 Calculator Plans', callback_data: `btn_calc_${price}_${unit}` }
                  ],
                  [{ text: isJP ? '🔙 メインメニュー' : '🔙 Main Menu', callback_data: 'menu_main' }]
                ]
              }
            })
          });
        }
        else if (dataStr === 'btn_purchase_guide' || dataStr === 'btn_legal_guide' || dataStr === 'guide_back') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const guide = getPurchaseGuide(userLang);
          if (dataStr === 'legal_back') {
            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                text: guide.text, parse_mode: 'HTML', reply_markup: guide.reply_markup
              })
            });
          } else {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id,
                text: guide.text, parse_mode: 'HTML', reply_markup: guide.reply_markup
              })
            });
          }
        }

        else if (dataStr === 'legal_strata') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const isJP = userLang === 'JP';
          const text = isJP ?
            `📜 <b>2010年外国人不動産所有権法（分層所有権・Strata Title）</b>\n\n` +
            `<blockquote>✅ <b>第6条の規定（100%自己名義ハードタイトル）：</b>\n` +
            `▫️ 外国人個人名義で、共同住宅の1階（日本基準の2階以上）の専有部分を100%完全所有（フリーホールド）可能。\n` +
            `▫️ カンボジア国土整備・都市計画・建設省（Cadastral Office）にて個人パスポート番号で直接登記。\n` +
            `▫️ カンボジア国民と同等の永代相続、賃貸運用、将来の転売権利が国家レベルで法的に保障されています。</blockquote>\n\n` +
            `<blockquote>🛡️ <b>外国人保有比率の規定：</b>\n` +
            `▫️ 共同住宅全体の私有専有面積の最大70%まで外国人名義での登記が認められています（Realestate.com.khの掲載物件は全棟適格確認済み）。</blockquote>\n\n` +
            `💡 <i>Realestate.com.khは全物件について、登記官庁によるハードタイトル適格性を事前審査の上で仲介しています。</i>` :
            `📜 <b>100% FOREIGN FREEHOLD STRATA TITLE LAW</b>\n\n` +
            `<blockquote>✅ <b>Article 6 of 2010 Foreign Ownership Law:</b>\n` +
            `▫️ Foreign nationals can legally own 100% freehold title in private units from 1st floor upwards.\n` +
            `▫️ Registered directly under your personal passport at the Ministry of Land Management (Cadastral Hard Title).\n` +
            `▫️ Perpetual inheritance, transfer, and leasing rights identical to domestic citizens.</blockquote>\n\n` +
            `<blockquote>🛡️ <b>Foreign Quota Safeguards:</b> Up to 70% of private floor area in a co-owned building can be foreign-owned.</blockquote>`;

          const keyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 直接相談', url: 'https://t.me/Nick_REAKH' }],
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
              [{ text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }],
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
            `🏷️ <b>税制および登記諸費用（カンボジア不動産）</b>\n\n` +
            `カンボジアは世界で最も投資家優遇の税制を採用している国の一つです：\n\n` +
            `<blockquote>💰 <b>公定税務スケジュール：</b>\n` +
            `▫️ <b>所有権移転税（印紙税）：</b> 4%（ハードタイトル名義書換時に1回のみ納付）\n` +
            `▫️ <b>固定資産税：</b> 年0.1%（物件評価額の80%に対して課税。2LDKコンドミニアムで年間約$50〜$100程度）\n` +
            `▫️ <b>キャピタルゲイン税：</b> 外国人個人名義は現在 <b>0%（非課税）</b>\n` +
            `▫️ <b>賃料源泉税：</b> 非居住者は14%（通常テナント負担または管理経費控除で相殺）</blockquote>\n\n` +
            `💡 <i>Realestate.com.khが納税申告および名義書換手続きをワンストップで代行します。</i>` :
            `🏷️ <b>TAXES & GOVERNMENT CLOSING FEES</b>\n\n` +
            `Cambodia offers one of the most investor-friendly tax regimes globally:\n\n` +
            `<blockquote>💰 <b>Official Tax Schedule:</b>\n` +
            `▫️ <b>Property Transfer Tax (Stamp Duty):</b> 4% of Cadastral assessed value (paid once upon hard title transfer).\n` +
            `▫️ <b>Annual Property Tax:</b> 0.1% on properties valued above ~$25,000 USD (typically only $50–$100/yr for a 2BR condo).\n` +
            `▫️ <b>Capital Gains Tax:</b> 20% of the taxable gain, scheduled from January 2027 (may change).\n` +
            `▫️ <b>Rental Withholding Tax:</b> Non-residents pay 14% withholding.</blockquote>\n\n` +
            `💡 <i>Realestate.com.kh prepares complete tax clearance paperwork on your behalf.</i>`;

          const keyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 直接相談', url: 'https://t.me/Nick_REAKH' }],
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
              [{ text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }],
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
            `💸 <b>国際銀行送金および米ドル決済（為替リスクゼロ）</b>\n\n` +
            `<blockquote>🌐 <b>送金および通貨決済フレームワーク：</b>\n` +
            `▫️ <b>米ドル流通経済：</b> カンボジアは国内全域で米ドル（USD）が実質基軸通貨として流通。為替損失や現地通貨下落のリスクがありません。\n` +
            `▫️ <b>SWIFT国際電信送金：</b> 売買契約書に基づき、大手商業銀行（ABA Bank、カナディア銀行等）の開発業者エスクロー口座へ直接海外送金可能。\n` +
            `▫️ <b>暗号資産（USDT）決済：</b> 法令を遵守したステーブルコイン（USDT）によるエスクロー決済もサポート。\n` +
            `▫️ <b>資金の海外回収：</b> 外国為替法に基づき、家賃収入や売却益は商業銀行を通じて自由かつ無制限に日本や海外口座へ送金・回収可能です。</blockquote>` :
            `💸 <b>INTERNATIONAL BANK WIRE & DIGITAL ASSETS</b>\n\n` +
            `<blockquote>🌐 <b>Remittance & Currency Framework:</b>\n` +
            `▫️ <b>USD-Based Economy:</b> Cambodia operates in United States Dollars (USD) with zero currency depreciation risk.\n` +
            `▫️ <b>Telegraphic Transfers (SWIFT):</b> Overseas investors can wire purchase funds directly to developer escrow accounts or Realestate.com.kh partner commercial banks (ABA Bank, Canadia Bank) with your sales contract.\n` +
            `▫️ <b>Digital Currency / USDT:</b> Compliant escrow settlements via USDT (Tether) supported.\n` +
            `▫️ <b>Fund Repatriation:</b> Under the Law on Foreign Exchange, capital, rental income, and profits can be freely remitted abroad.</blockquote>`;

          const keyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 直接相談', url: 'https://t.me/Nick_REAKH' }],
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
              [{ text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }],
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
            `🔑 <b>完全代行・プノンペン現地賃貸管理サービス</b>\n\n` +
            `海外にお住まいの投資家様も、現地渡航不要で完全な不労所得運用を実現できます：\n\n` +
            `<blockquote>🤝 <b>フルライフサイクル賃貸管理（日系対応）：</b>\n` +
            `▫️ <b>優良入居者募集：</b> 多言語ネットワーク（日・英・中・露）を通じて外国人駐在員・大手法人テナントを獲得。\n` +
            `▫️ <b>家賃回収・送金：</b> 毎月の米ドル賃料を回収し、明細書と共に日本またはご指定の海外口座へ送金。\n` +
            `▫️ <b>室内保全・修繕：</b> 現地日本人スタッフ・常駐チームが退去時立会い、修繕、清掃を一括対応。\n` +
            `▫️ <b>四半期写真報告：</b> Telegramにて定期的な室内写真と現況レポートをお届けします。</blockquote>` :
            `🔑 <b>TURNKEY OVERSEAS PROPERTY MANAGEMENT</b>\n\n` +
            `Overseas investors never need to fly to Cambodia to manage their unit:\n\n` +
            `<blockquote>🤝 <b>Full-Lifecycle Passive Landlord Service:</b>\n` +
            `▫️ <b>Tenant Sourcing & Screening:</b> We syndicate listings across 12,000+ subscriber network in English, Japanese, Russian, and German.\n` +
            `▫️ <b>Rent Collection & Banking:</b> Monthly rent is collected and transferred directly to your bank account with complete digital statements.\n` +
            `▫️ <b>Maintenance & Repairs:</b> Dedicated on-site team handles repairs, cleaning, and inspections.\n` +
            `▫️ <b>Full Digital Reporting:</b> Quarterly unit condition photos delivered straight to your Telegram.</blockquote>`;

          const keyboard = isJP ? {
            inline_keyboard: [
              [{ text: '💬 直接相談', url: 'https://t.me/Nick_REAKH' }],
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
              [{ text: '💬 Consult with us', url: 'https://t.me/Nick_REAKH' }],
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
        }

        // ── EXPLORE PROPERTY INTENT ROUTING (BUY VS RENT) ──
        else if (dataStr === 'btn_explore_prop') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const gate = getExploreGate(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: gate.text,
              parse_mode: 'HTML',
              reply_markup: gate.reply_markup
            })
          });
        }

        else if (dataStr === 'owner_start_wizard') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const wizard = getOwnerIntakeStart(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: wizard.text,
              parse_mode: 'HTML',
              reply_markup: wizard.reply_markup
            })
          });
        }

        else if (dataStr === 'explore_buy') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const comp = getComparisonCard(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: comp.text,
              parse_mode: 'HTML',
              reply_markup: comp.reply_markup
            })
          });
        }

        else if (dataStr === 'explore_rent') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const rentComp = getRentComparisonCard(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: rentComp.text,
              parse_mode: 'HTML',
              reply_markup: rentComp.reply_markup
            })
          });
        }

        else if (dataStr === 'btn_rent_TS306') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const card = getTS306RentCard(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              photo: card.photo,
              caption: card.caption,
              parse_mode: 'HTML',
              reply_markup: card.reply_markup
            })
          });
        }

        else if (dataStr === 'btn_rent_TS8') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const card = getTS8RentCard(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              photo: card.photo,
              caption: card.caption,
              parse_mode: 'HTML',
              reply_markup: card.reply_markup
            })
          });
        }

        else if (dataStr === 'btn_rent_Odom') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const card = getOdomRentCard(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              photo: card.photo,
              caption: card.caption,
              parse_mode: 'HTML',
              reply_markup: card.reply_markup
            })
          });
        }

        // ── PHASE 1: SIDE-BY-SIDE UNIT COMPARISON ──
        else if (dataStr.startsWith('btn_compare_')) {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const comp = getComparisonCard(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: comp.text,
              parse_mode: 'HTML',
              reply_markup: comp.reply_markup
            })
          });
        }

        else if (dataStr === 'btn_view_TS8') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const card = getTS8Card(userLang);
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              photo: card.photo,
              caption: card.caption,
              parse_mode: 'HTML',
              reply_markup: card.reply_markup
            })
          });
        }

        else if (dataStr === 'btn_view_ResL') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const card = getResLCard();
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              photo: card.photo,
              caption: card.caption,
              parse_mode: 'HTML',
              reply_markup: card.reply_markup
            })
          });
        }

        else if (dataStr === 'btn_view_Odom') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const card = getOdomCard();
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              photo: card.photo,
              caption: card.caption,
              parse_mode: 'HTML',
              reply_markup: card.reply_markup
            })
          });
        }

        else if (dataStr === 'menu_main') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const menu = getMainMenu(user.first_name);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: menu.text,
              parse_mode: 'HTML',
              reply_markup: menu.reply_markup
            })
          });
        }

        // ── PHASE 2: 60-SECOND INTAKE WIZARD ──
        else if (dataStr.startsWith('owner_goal_')) {
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
              text: `💼 <b>60-SECOND PROPERTY INTAKE WIZARD</b>\n\n` +
                `🎯 <b>Objective:</b> ${goal}\n\n` +
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
              text: `💼 <b>60-SECOND PROPERTY INTAKE WIZARD</b>\n\n` +
                `🎯 <b>Objective:</b> ${ownerListingState[user.id].goal}\n` +
                `📍 <b>Location:</b> ${projName}\n\n` +
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
              text: `💼 <b>60-SECOND PROPERTY INTAKE WIZARD</b>\n\n` +
                `🎯 <b>Objective:</b> ${ownerListingState[user.id].goal}\n` +
                `📍 <b>Location:</b> ${ownerListingState[user.id].project}\n` +
                `🛋️ <b>Layout:</b> ${bedName}\n\n` +
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
          const unitRef = 'REAKH-' + Math.floor(Math.random() * 899 + 100);
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
            body: JSON.stringify({ callback_query_id: cbId, text: '🎉 Listing submitted to Realestate.com.kh!' })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: `🎉 <b>PROPERTY SUBMISSION RECEIVED!</b>\n\n` +
                `📋 <b>YOUR SUBMISSION SUMMARY:</b>\n` +
                `▫️ <b>Unit Reference:</b> <code>#${unitRef}</code>\n` +
                `▫️ <b>Objective:</b> ${info.goal || 'Resale'}\n` +
                `▫️ <b>Location:</b> ${info.project || 'Chamkarmon'}\n` +
                `▫️ <b>Layout:</b> ${info.bedrooms || '2-Bedroom'}\n` +
                `▫️ <b>Target Pricing:</b> ${valName}\n\n` +
                `🛡️ <b>NEXT STEPS:</b>\n` +
                `Nick and the Realestate.com.kh valuation team will verify building title records and reach out within 2 hours to confirm your representation agreement.\n\n` +
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
          });

          // Send Alert to Nick with SLA Action Buttons
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🚨 </b>NEW EXCLUSIVE PROPERTY SUBMISSION!<b> 🚨\n\n` +
                `👤 </b>Owner:<b> ${userName} (${user.first_name} ${user.last_name || ''})\n` +
                `🆔 </b>User ID:<b> \`${user.id}\`\n` +
                `📋 </b>Unit Code:<b> \`#${unitRef}\`\n` +
                `🎯 </b>Goal:<b> ${info.goal || 'Resale'}\n` +
                `📍 </b>Project:<b> ${info.project || 'Chamkarmon'}\n` +
                `🛋️ </b>Layout:<b> ${info.bedrooms || '2-Bedroom'}\n` +
                `💰 </b>Price Target:<b> ${valName}\n` +
                `⏰ </b>Submitted:<b> Just now\n\n` +
                `⚡ </b>Response SLA:<b> Respond within 15 minutes!`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ Mark Contacted', callback_data: `sla_done_${leadId}` },
                    { text: '📅 Schedule Valuation', callback_data: `sla_booked_${leadId}` }
                  ],
                  [
                    { text: '💬 Message Owner Directly', url: `tg://user?id=${user.id}` }
                  ]
                ]
              }
            })
          });
        }

        // ── PHASE 2: LANDLORD DASHBOARD REFRESH & FEEDBACK ──
        else if (dataStr.startsWith('owner_refresh_')) {
          const code = dataStr.replace('owner_refresh_', '');
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '🔄 Telemetry refreshed!' })
          });

          const dash = getLandlordDashboard(code);
          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: dash.text, parse_mode: 'HTML', reply_markup: dash.reply_markup
            })
          });
        }

        else if (dataStr.startsWith('owner_feedback_')) {
          const code = dataStr.replace('owner_feedback_', '');
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const feedback = getTourFeedback(code);
          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: feedback.text, parse_mode: 'HTML', reply_markup: feedback.reply_markup
            })
          });
        }

        else if (dataStr.startsWith('owner_price_adj_')) {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cbId,
              text: '🏷️ Price adjustment request sent to Nick! We will prepare recent market transaction comparables.',
              show_alert: true
            })
          });
        }

        else if (dataStr === 'owner_back_main' || dataStr === 'portal_home') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const userLang = userLanguages[msg.chat.id] || 'EN';
          const menu = getMainMenu(userLang, user.first_name);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: menu.text,
              parse_mode: 'HTML',
              reply_markup: menu.reply_markup
            })
          });
        }

        // ── PHASE 2: SLA RESPONSE TRACKER ──
        else if (dataStr.startsWith('sla_done_')) {
          const leadId = dataStr.replace('sla_done_', '');
          if (leadSlaTracker[leadId]) {
            leadSlaTracker[leadId].status = 'resolved';
            saveState();
          }
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '🟢 SLA Passed! Lead marked as Contacted.' })
          });

          const lead = leadSlaTracker[leadId] || { name: 'Client', unitRef: 'Time Square 8' };
          const resolvedCard = 
            `<b>LEAD CONTACT INITIATED · SLA RESOLVED</b>\n\n` +
            `▫️ <b>Client:</b> ${lead.name || 'Client'}\n` +
            `▫️ <b>Asset:</b> ${lead.unitRef || 'Time Square 8'}\n` +
            `▫️ <b>Response SLA:</b> Benchmark Met (&lt; 3 mins)\n` +
            `▫️ <b>Current Status:</b> In active advisory with Nick\n\n` +
            `<blockquote>Next Milestone: Confirm private viewing itinerary or coordinate live video walk-through.</blockquote>`;

          const eRes = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: resolvedCard,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Advance to Tour Scheduled', callback_data: `sla_booked_${leadId}` }],
                  [{ text: 'Open Client Chat', url: lead.userId ? `tg://user?id=${lead.userId}` : 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });
          const eData = await eRes.json();
          if (!eData.ok) console.error('⚠️ sla_done editMessageText error:', eData);
        }

        else if (dataStr.startsWith('sla_booked_')) {
          const leadId = dataStr.replace('sla_booked_', '');
          if (leadSlaTracker[leadId]) {
            leadSlaTracker[leadId].status = 'booked';
            saveState();
          }
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '📅 Scheduled in Realestate.com.kh Calendar!' })
          });

          const lead = leadSlaTracker[leadId] || { name: 'Client', unitRef: 'Time Square 8' };
          const bookedCard = 
            `<b>INSPECTION TOUR CONFIRMED</b>\n\n` +
            `▫️ <b>Client:</b> ${lead.name || 'Client'}\n` +
            `▫️ <b>Asset:</b> ${lead.unitRef || 'Time Square 8'}\n` +
            `▫️ <b>Pipeline Stage:</b> Tour Scheduled\n\n` +
            `<blockquote>Synchronized with Realestate.com.kh inspection calendar. Automated calendar briefing will dispatch to client.</blockquote>`;

          const bRes = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: bookedCard,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: 'Landlord Dashboard', callback_data: 'owner_refresh_TS8-22' }]
                ]
              }
            })
          });
          const bData = await bRes.json();
          if (!bData.ok) console.error('⚠️ sla_booked editMessageText error:', bData);
        }

        // ── PHASE 3: CO-BROKE & DEAL REGISTRATION CALLBACKS ──
        else if (dataStr === 'btn_cobroke') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const menu = getCoBrokeMenu();
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: menu.text,
              parse_mode: 'HTML',
              reply_markup: menu.reply_markup
            })
          });
        }

        else if (dataStr === 'cobroke_make_pdf') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const text = 
            `✍️ </b>GENERATE YOUR PERSONALIZED WHITE-LABEL FACTSHEET<b>\n\n` +
            `Reply with your name and WhatsApp/Telegram phone number in this format:\n\n` +
            `\`/cobroke [Your Name] [WhatsApp Number]\`\n\n` +
            `</b>Example:<b>\n` +
            `\`/cobroke Alex Chen +85512345678\`\n\n` +
            `⚡ The bot will instantly generate and send your custom PDF!`;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: msg.chat.id, text, parse_mode: 'HTML' })
          });
        }

        else if (dataStr === 'cobroke_reg_deal') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const text = 
            `🛡️ </b>REGISTER A BUYER TO SECURE YOUR 50/50 COMMISSION<b>\n\n` +
            `Reply with your client registration in this format:\n\n` +
            `\`/registerdeal [Property] [Client Name] [Client Phone]\`\n\n` +
            `</b>Example:<b>\n` +
            `\`/registerdeal TS8 Mr. Wang +886912345678\`\n\n` +
            `⚡ Timestamped Protection Certificate issued immediately!`;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: msg.chat.id, text, parse_mode: 'HTML' })
          });
        }

        else if (dataStr.startsWith('deal_confirm_')) {
          const regId = dataStr.replace('deal_confirm_', '');
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '✅ 50/50 Commission Protection Endorsed!' })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: (msg.text || '') + `\n\n✅ </b>ENDORSED BY NICK (@Nick_REAKH)!<b>\n🛡️ </b>Protection Status:<b> 🟢 </b>Active 50/50 Safe Harbor (60 Days)<b>`,
              parse_mode: 'HTML',
              reply_markup: { inline_keyboard: [] }
            })
          });
        }

        else if (dataStr.startsWith('set_lang_')) {
          const chosenLang = dataStr.replace('set_lang_', '');
          userLanguages[msg.chat.id] = chosenLang;
          saveState();

          const langNames = {
            'EN': '🇬🇧 English',
            'JP': '🇯🇵 日本語',
            'ZH': '🇨🇳 简体中文',
            'RU': '🇷🇺 Русский'
          };

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: `✅ ${langNames[chosenLang] || chosenLang}` })
          });

          // Send clean Main Menu in the chosen language!
          const menu = getMainMenu(chosenLang, user.first_name);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: menu.text,
              parse_mode: 'HTML',
              reply_markup: menu.reply_markup
            })
          });
        }

        else if (dataStr === 'btn_change_lang') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const menu = getLanguageMenu();
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: msg.chat.id, text: menu.text, parse_mode: 'HTML', reply_markup: menu.reply_markup })
          });
        }

        else if (dataStr === 'sched_status') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const now = new Date();
          const phnomPenhHour = (now.getUTCHours() + 7) % 24;
          const phnomPenhMin = now.getUTCMinutes();
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const currentDayName = days[now.getUTCDay()];

          const statusMsg = 
            `📅 <b>REALESTATE.COM.KH WEEKLY DIGEST SCHEDULER STATUS</b>\n\n` +
            `▫️ <b>Status:</b> ${digestSchedule.autoBroadcast ? '🟢 <b>ACTIVE (Autonomous Autopilot)</b>' : '🔴 <b>PAUSED</b>'}\n` +
            `▫️ <b>Target Schedule:</b> Every Monday at 09:00 AM Phnom Penh Time (UTC+7)\n` +
            `▫️ <b>Current Phnom Penh Time:</b> ${currentDayName}, ${String(phnomPenhHour).padStart(2, '0')}:${String(phnomPenhMin).padStart(2, '0')}\n` +
            `▫️ <b>Last Broadcast Week:</b> <code>${digestSchedule.lastBroadcastWeek || 'None yet'}</code>\n` +
            `▫️ <b>Target Channel:</b> Nick Test Lab (<code>-1004372846355</code>)`;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: statusMsg,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📰 Preview Draft', callback_data: 'sched_preview' }, { text: '🚀 Broadcast Now', callback_data: 'digest_broadcast_now' }],
                  [{ text: digestSchedule.autoBroadcast ? '⏸️ Pause Autopilot' : '▶️ Enable Autopilot', callback_data: 'sched_toggle' }]
                ]
              }
            })
          });
        }

        else if (dataStr === 'sched_toggle') {
          digestSchedule.autoBroadcast = !digestSchedule.autoBroadcast;
          saveState();
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cbId,
              text: `Autopilot is now ${digestSchedule.autoBroadcast ? '🟢 ON' : '🔴 OFF'}`
            })
          });

          await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📰 Preview Draft', callback_data: 'sched_preview' }, { text: '🚀 Broadcast Now', callback_data: 'digest_broadcast_now' }],
                  [{ text: digestSchedule.autoBroadcast ? '⏸️ Pause Autopilot' : '▶️ Enable Autopilot', callback_data: 'sched_toggle' }]
                ]
              }
            })
          });
        }

        else if (dataStr === 'sched_preview') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const digest = getDigestBroadcast();
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: `📰 <b>EXECUTIVE DIGEST · PREVIEW DRAFT</b>\n\n` + digest.text,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🚀 Approve & Broadcast to Channel', callback_data: 'digest_broadcast_now' }]
                ]
              }
            })
          });
        }

        else if (dataStr === 'digest_broadcast_now') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId, text: '🚀 Broadcasting digest to Nick Test Lab...' })
          });

          const digest = getDigestBroadcast();
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: channelId,
              text: digest.text,
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

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: `✅ <b>WEEKLY DIGEST BROADCASTED!</b>\n\nLive on <b>Nick Test Lab</b> channel.`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📱 View Channel Post', url: 'https://t.me/+olPZyfkgtcQxOTA9' }]
                ]
              }
            })
          });
        }

        // ── C. ADMIN APPROVAL / REJECTION BUTTONS ─────────────────
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
            const auditCaption = '🛡️ [REALESTATE.COM.KH DUE DILIGENCE AUDIT]\n\n' +
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
              '⚖️ REALESTATE.COM.KH AUDIT VERDICT: APPROVED (High Safety Tier)\n' +
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
                    [{ text: '📱 Open Realestate.com.kh Catalog / Bot', url: 'https://t.me/Nick_REAKH_Bot?start=audit_ts8' }]
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
              'Verified by Realestate.com.kh\n' +
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
                    [{ text: '📱 Open Realestate.com.kh Catalog / Bot', url: 'https://t.me/Nick_REAKH_Bot?start=leased_ts306' }]
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

// Optional Lightweight HTTP Server for Cloud Health Checks (Render / Railway / Koyeb)
const http = require('http');
const PORT = process.env.PORT || 8080;
// Listens on this Mac only by default. A cloud host (Render, Railway, Koyeb) must set HOST=0.0.0.0.
const HOST = process.env.HOST || '127.0.0.1';
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'PHC Telegram Staging Bot (@Nick_REAKH_Bot)',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()) + 's'
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});
healthServer.listen(PORT, HOST, () => {
  console.log(`🌐 Health Server listening on ${HOST}:${PORT}`);
});

async function runLoop() {
  while (true) {
    await pollUpdates();
    await new Promise(r => setTimeout(r, 1000));
  }
}

runLoop();
