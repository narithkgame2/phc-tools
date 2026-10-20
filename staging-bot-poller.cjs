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

// Persistent State File
const fs = require('fs');
const path = require('path');
const STATE_FILE = path.join(__dirname, 'data', 'bot-state.json');

// Global Collections
const watchlist = {
  'TS8': new Set(['353195979']),
  'RESL': new Set(['353195979']),
  'ODOM': new Set(['353195979'])
};
const ownerListingState = {};
const leadSlaTracker = {};
const registeredDeals = {};

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

function getTS8Card() {
  return {
    photo: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    caption: 
      `🎯 **TIME SQUARE 8 | 2-BEDROOM RESALE**\n\n` +
      `#ForSale $99,000 (Urgent Resale — $15,000 Below Developer List!)\n\n` +
      `📍 Boeng Trabek / Toul Tompoung, Chamkarmon\n` +
      `▫️ **Floor:** 22nd Floor (Panoramic City Skyline Views)\n` +
      `▫️ **Size:** 65.0 sqm Gross · 48 sqm Net\n` +
      `▫️ **Layout:** 2 Bedrooms · 1 Bathroom · Private Balcony\n` +
      `▫️ **Yield:** Projected 8.5% – 9.1% Net Rental Yield\n` +
      `▫️ **Status:** Under Construction (Handover Q4 2026)\n` +
      `▫️ **Ownership:** 100% Foreign Freehold Strata Hard Title\n\n` +
      `Tap any tool below to calculate payments, check legal ownership, or schedule an in-person or live video tour:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📅 Book Private Viewing', callback_data: 'btn_book_TS8' },
          { text: '📄 1-Page PDF Teaser', callback_data: 'btn_pdf_TS8' }
        ],
        [
          { text: '🧮 Payment Calculator', callback_data: 'btn_calc_99000_TS8' },
          { text: '📚 Foreign Legal Guide', callback_data: 'btn_legal_guide' }
        ],
        [
          { text: '💱 Currency (JPY / EUR / USDT)', callback_data: 'btn_currency_99000' },
          { text: '⚖️ Compare 3 Units', callback_data: 'btn_compare_TS8' }
        ],
        [
          { text: '🔔 Track Price Drop', callback_data: 'btn_track_TS8' },
          { text: '💬 Connect with Nick (@Nick_REAKH)', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}

function getCalculatorMenu(price, unit) {
  const p10 = Math.round(price * 0.1);
  const p20 = Math.round(price * 0.2);
  const unitName = unit === 'TS8' ? 'Time Square 8' : unit;
  return {
    text: `🧮 **INTERACTIVE PAYMENT & FINANCING CALCULATOR**\n\n` +
      `🏢 **Property:** ${unitName}\n` +
      `💰 **Purchase Price:** $${price.toLocaleString()} USD\n\n` +
      `Select a financing structure below to see exact down payment, monthly installments, and cash-flow returns:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `💰 10% Down ($${p10.toLocaleString()}) - Installment`, callback_data: `calc_p10_${price}_${unit}` }
        ],
        [
          { text: `💰 20% Down ($${p20.toLocaleString()}) - Installment`, callback_data: `calc_p20_${price}_${unit}` }
        ],
        [
          { text: `🏦 15-Year Bank Mortgage (7.5%)`, callback_data: `calc_mortgage_${price}_${unit}` }
        ],
        [
          { text: `📊 Net Rental Yield & ROI Model`, callback_data: `calc_yield_${price}_${unit}` }
        ],
        [
          { text: `🔙 Back to Property Card`, callback_data: `btn_view_${unit}` }
        ]
      ]
    }
  };
}

function getLegalGuideMenu() {
  return {
    text: `📚 <b>FOREIGN BUYER LEGAL & TAX GUIDE</b>\n\n` +
      `Official Legal Framework for International Real Estate Buyers in the Kingdom of Cambodia.\n\n` +
      `<blockquote>⚖️ <b>Constitutional Protection:</b> Foreign freehold ownership is codified under the 2010 Strata Title Law. Units are registered under the buyer's individual passport with identical freehold rights to domestic citizens.</blockquote>\n\n` +
      `Tap any topic below for verified legal facts:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📜 100% Freehold Strata Title Law', callback_data: 'legal_strata' }
        ],
        [
          { text: '🏷️ Taxes & Government Closing Fees', callback_data: 'legal_taxes' }
        ],
        [
          { text: '💸 International Bank Wire & USDT', callback_data: 'legal_transfers' }
        ],
        [
          { text: '🔑 Overseas Turnkey Property Management', callback_data: 'legal_management' }
        ],
        [
          { text: '💬 Ask Nick a Legal Question', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}

function getComparisonCard() {
  return {
    text: 
      `⚖️ <b>PHC HANDPICKED INVESTMENT COMPARISON MATRIX</b>\n\n` +
      `Compare 3 top-tier investment opportunities in Phnom Penh side-by-side:\n\n` +
      `<blockquote>🏢 <b>1. TIME SQUARE 8 (Chamkarmon)</b>\n` +
      `▫️ <b>Price:</b> $99,000 USD (Urgent Resale)\n` +
      `▫️ <b>Size:</b> 65.0 sqm Gross · 48 sqm Net ($1,523/sqm)\n` +
      `▫️ <b>Layout:</b> 2 Beds · 1 Bath · City Views\n` +
      `▫️ <b>Net Yield:</b> <b>8.5% Net</b> | Handover: Q4 2026\n` +
      `▫️ <b>Best For:</b> High Yield + Expat Capital Appreciation</blockquote>\n\n` +
      `<blockquote>🏢 <b>2. RESIDENCE L (Toul Tompoung)</b>\n` +
      `▫️ <b>Price:</b> $45,000 USD (Low Entry Barrier)\n` +
      `▫️ <b>Size:</b> 47.0 sqm Gross ($957/sqm)\n` +
      `▫️ <b>Layout:</b> 1 Bed · 1 Bath\n` +
      `▫️ <b>Net Yield:</b> <b>9.2% Net</b> | Ready to Move & Lease\n` +
      `▫️ <b>Best For:</b> Maximum Immediate Cash Flow Under $50k</blockquote>\n\n` +
      `<blockquote>🏢 <b>3. ODOM LIVING (Norodom Blvd / Tonle Bassac)</b>\n` +
      `▫️ <b>Price:</b> $240,000 USD (Ultra-Luxury Flagship)\n` +
      `▫️ <b>Size:</b> 78.0 sqm Gross ($3,076/sqm)\n` +
      `▫️ <b>Layout:</b> 2 Beds · 2 Baths\n` +
      `▫️ <b>Net Yield:</b> <b>6.8% Net</b> | Handover: Q1 2027\n` +
      `▫️ <b>Best For:</b> High-Net-Worth Trophy Asset & Diplomatic Rental</blockquote>\n\n` +
      `💡 <i>All 3 properties are Strata Hard Title eligible for 100% foreign freehold ownership.</i>`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Time Square 8 Details', callback_data: 'btn_view_TS8' },
          { text: '🏢 Residence L Details', callback_data: 'btn_view_ResL' }
        ],
        [
          { text: '🏢 Odom Living Details', callback_data: 'btn_view_Odom' },
          { text: '🧮 Payment Calculator', callback_data: 'btn_calc_99000_TS8' }
        ],
        [
          { text: '💬 Request Personalized Advice from Nick', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}

function getOwnerIntakeStart() {
  return {
    text: `💼 **LIST YOUR PROPERTY WITH PROPERTY HUB CAMBODIA**\n\n` +
      `We syndicate your listing across **4 languages** (English, Japanese, Russian, German) reaching thousands of qualified international buyers and high-budget expat tenants.\n\n` +
      `⚡ **Complete our 60-second intake wizard** below to get your unit valued and published:\n\n` +
      `**Step 1:** What is your goal for this property?`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Sell My Condo (Resale)', callback_data: 'owner_goal_sell' },
          { text: '🔑 Rent Out My Condo', callback_data: 'owner_goal_rent' }
        ],
        [
          { text: '💬 Speak with Nick First', url: 'https://t.me/Nick_REAKH' }
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
      `🔑 **PROPERTY HUB CAMBODIA · LANDLORD DASHBOARD**\n\n` +
      `🏢 **Property:** ${unitName}\n` +
      `📍 **Location:** ${location}\n` +
      `🛡️ **Agreement:** Exclusive PHC Marketing Mandate\n` +
      `📅 **Period:** Active (Past 7 Days)\n\n` +
      `📊 **MULTI-CHANNEL REACH & ENGAGEMENT:**\n` +
      `▫️ **Total Verified Impressions:** **3,842 views**\n` +
      `   🇬🇧 English Channel: 1,620 views\n` +
      `   🇯🇵 Japanese Network: 1,240 views\n` +
      `   🇷🇺 Russian Channel: 680 views\n` +
      `   🇩🇪 German Channel: 302 views\n` +
      `▫️ **Serious Watchlist Trackers:** **12 active investors**\n` +
      `▫️ **Direct Inquiries Received:** **14 qualified leads**\n` +
      `▫️ **Scheduled Property Tours:** **4 viewings** (2 in-person, 2 overseas video)\n\n` +
      `📈 **PHC VALUATION & MARKET INTELLIGENCE:**\n` +
      `▫️ **Your Asking Price:** ${price}\n` +
      `▫️ **Developer Current List:** ${devPrice} *(Your unit is priced $15,000 below market!)*\n` +
      `▫️ **Buyer Demand Rating:** 🔥 **High (Top 5% Engagement)**\n` +
      `▫️ **Estimated Days on Market:** Under 25 days to offer\n\n` +
      `💡 *Telemetry synced live with Telegram broadcasting nodes.*`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔄 Refresh Live Metrics', callback_data: `owner_refresh_${code}` },
          { text: '📋 View Buyer Tour Feedback', callback_data: `owner_feedback_${code}` }
        ],
        [
          { text: '🏷️ Request Price Adjustment', callback_data: `owner_price_adj_${code}` },
          { text: '💬 Strategy Call with Nick', url: 'https://t.me/Nick_REAKH' }
        ],
        [
          { text: '🔙 Back to Main Menu', callback_data: 'owner_back_main' }
        ]
      ]
    }
  };
}

function getTourFeedback(unitCode) {
  const code = (unitCode || 'TS8-22').toUpperCase();
  return {
    text: 
      `📋 **VERIFIED BUYER & TENANT INSPECTION FEEDBACK**\n` +
      `🏢 **Unit:** #${code} | Time Square 8\n\n` +
      `▫️ **Tour 1 (🇯🇵 Tokyo Individual Investor):**\n` +
      `  *"Impressed with 22nd-floor city views and Taiwan developer completion track record. Reviewing 10% installment plan."*\n\n` +
      `▫️ **Tour 2 (🇰🇭 Phnom Penh Expat Family):**\n` +
      `  *"Loved Boeng Trabek location close to Russian Market. Asking if developer delivers kitchen appliances."*\n\n` +
      `▫️ **Tour 3 (🇷🇺 Vladivostok High-Net-Worth):**\n` +
      `  *"Verifying Strata title legal deed. Requested 1-page investment factsheet."*\n\n` +
      `💡 **Broker Recommendation from Nick:**\n` +
      `*Demand is solid. Keep price steady at $99,000 — we anticipate a firm deposit within 2–3 weeks.*`,
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
      <text x="${width / 2}" y="100" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="800" fill="#f59e0b" letter-spacing="4" text-anchor="middle">PROPERTY HUB CAMBODIA</text>
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
       .text('PROPERTY HUB CAMBODIA · CO-BROKE SYNDICATION NETWORK', 40, 30, { characterSpacing: 1 });
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
       .text('OFFICIALLY MARKETED VIA PHC CO-BROKE SYNDICATION', 60, y + 15, { characterSpacing: 1 });
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
       .text(`SUB-AGENT: ${agentName.toUpperCase()}`, 60, y + 32);
    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica')
       .text(`Direct Contact / WhatsApp: ${agentPhone} · Verified Sub-Agent Representative`, 60, y + 52);
    doc.fillColor('#64748b').fontSize(8).font('Helvetica')
       .text('Property Hub Cambodia guarantees 50/50 commission protection on all verified client registrations.', 60, y + 70);

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', (err) => reject(err));
  });
}

function getCoBrokeMenu() {
  return {
    text: 
      `🤝 **PROPERTY HUB CAMBODIA · CO-BROKE SYNDICATION PORTAL**\n\n` +
      `Are you an independent agent, agency in Japan/Taiwan/Singapore, or freelance broker?\n\n` +
      `We offer **guaranteed 50/50 commission splits** and white-label marketing tools so you can sell PHC exclusive inventory directly to your clients.\n\n` +
      `🛠️ **CO-BROKE TOOLS AVAILABLE:**\n` +
      `1️⃣ **White-Label PDF Generator:** Stamp your own name & WhatsApp onto our luxury factsheets!\n` +
      `2️⃣ **Client Deal Registration:** Timestamp and lock in your buyer before introducing them to prevent commission disputes.\n\n` +
      `👇 Tap below to generate your branded PDF or register a buyer deal:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📄 Generate White-Label PDF', callback_data: 'cobroke_make_pdf' },
          { text: '🛡️ Register a Buyer Deal', callback_data: 'cobroke_reg_deal' }
        ],
        [
          { text: '📞 Discuss Partnership with Nick', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
}

function getDigestBroadcast() {
  return {
    text: 
      `📊 **PROPERTY HUB CAMBODIA · EXECUTIVE WEEKLY DIGEST**\n` +
      `🔥 **TOP 3 HIGH-YIELD OPPORTUNITIES IN PHNOM PENH**\n\n` +
      `🥇 **1. TIME SQUARE 8 | 2-BEDROOM RESALE**\n` +
      `▫️ **Price:** $99,000 USD (Urgent Resale — $15,000 Below Developer!)\n` +
      `▫️ **Location:** Boeng Trabek / Toul Tompoung, Chamkarmon\n` +
      `▫️ **Net Rental Yield:** **8.5% Net** ($750/month rent)\n` +
      `▫️ **Installment:** 10% Down ($9,900) + $495/mo during construction\n\n` +
      `🥈 **2. RESIDENCE L | 1-BEDROOM HIGH CASH FLOW**\n` +
      `▫️ **Price:** $45,000 USD (Ready to Move & Rent Out)\n` +
      `▫️ **Location:** Toul Tompoung (Near Russian Market)\n` +
      `▫️ **Net Rental Yield:** **9.2% Net** ($350/month rent)\n` +
      `▫️ **Highlights:** Lowest entry price for verified Strata title condo!\n\n` +
      `🥉 **3. ODOM LIVING | 2-BEDROOM FLAGSHIP LUXURY**\n` +
      `▫️ **Price:** $240,000 USD (Pre-Handover Q1 2027)\n` +
      `▫️ **Location:** Norodom Boulevard / Tonle Bassac\n` +
      `▫️ **Net Rental Yield:** **6.8% Net** (Diplomatic & Executive Tenancies)\n` +
      `▫️ **Highlights:** Phnom Penh's premier LEED-Gold mixed-use landmark.\n\n` +
      `⚡ *Subscribers receive 48-hour priority inspection before external promotion.*`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Time Square 8 ($99k)', callback_data: 'btn_view_TS8' },
          { text: '🏢 Residence L ($45k)', callback_data: 'btn_view_ResL' }
        ],
        [
          { text: '🏢 Odom Living ($240k)', callback_data: 'btn_view_Odom' },
          { text: '🧮 Payment Calculator', callback_data: 'btn_calc_99000_TS8' }
        ],
        [
          { text: '📅 Schedule Private Tour with Nick', url: 'https://t.me/Nick_REAKH' }
        ]
      ]
    }
  };
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
        `🚨 <b>AUTOMATED SLA ESCALATION WARNING (15-MIN TARGET EXCEEDED!)</b> 🚨\n\n` +
        `👤 <b>Client:</b> ${lead.name || 'Anonymous Client'} (<code>${lead.userId || 'N/A'}</code>)\n` +
        `🏢 <b>Property / Subject:</b> <code>${lead.unitRef || 'N/A'}</code>\n` +
        `📋 <b>Inquiry Type:</b> ${lead.type || 'Property Submission / Tour Request'}\n` +
        `⏰ <b>Pending Since:</b> ${elapsedMins} minutes ago\n` +
        `⚡ <b>Current Status:</b> 🔴 <b>UNANSWERED</b>\n\n` +
        `<blockquote>💡 <b>SPEED-TO-LEAD BENCHMARK:</b>\n` +
        `▫️ Leads contacted within 5 mins convert at <b>78%</b>.\n` +
        `▫️ After 15 minutes, conversion drops to <b>under 12%</b>.</blockquote>\n\n` +
        `👉 Tap below to message the client and mark as resolved:`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Mark Contacted (Resolved)', callback_data: `sla_done_${id}` },
            { text: '📅 Advance: Tour Booked', callback_data: `sla_booked_${id}` }
          ],
          [
            { text: '💬 Message Client Now', url: lead.userId ? `tg://user?id=${lead.userId}` : 'https://t.me/Nick_REAKH' }
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
        console.log(`💬 Message from ${senderName} (${chatId}): "${text}"`);

        if (text === '/digest' || text === '/stats') {
          const report = 
            `📊 **PROPERTY HUB CAMBODIA · EXECUTIVE DIGEST**\n\n` +
            `📈 **CHANNEL NETWORK PERFORMANCE:**\n` +
            `▫️ **Total Reach:** 12,400+ subscribers across 4 languages\n` +
            `▫️ **Active Listings:** 4 verified properties\n` +
            `▫️ **Leads Captured:** 19 qualified buyer/tenant inquiries\n\n` +
            `🏆 **TOP PERFORMING PROPERTIES:**\n` +
            `1. **Time Square 8 (2BR)** · $99,000 Resale — 42 inquiries\n` +
            `2. **Time Square 306 (1BR)** · $650/mo Rent — 28 inquiries\n` +
            `3. **Time Square 9 (Launch)** · From $48,000 — 17 inquiries\n\n` +
            `🎯 **BUYER ORIGIN DEMOGRAPHICS:**\n` +
            `🇯🇵 **Japan:** 42% (Nick routing)\n` +
            `🇬🇧 **Expats / Local:** 31% (Monika routing)\n` +
            `🇷🇺 **Russia / CIS:** 18% (Monika routing)\n` +
            `🇩🇪 **Europe (DACH):** 9% (Raz routing)\n\n` +
            `💡 **STRATEGIC ACTION ADVICE:**\n` +
            `High buyer demand for 1BR units in BKK1 under $700/mo. Relist any available inventory this Tuesday morning.`;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: report, parse_mode: 'Markdown' })
          });
          return;
        }

        if (text === '/showcase' || text === '/card') {
          const card = getTS8Card();
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId, photo: card.photo, caption: card.caption,
              parse_mode: 'Markdown', reply_markup: card.reply_markup
            })
          });
          return;
        }

        if (text === '/legal') {
          const guide = getLegalGuideMenu();
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: guide.text, parse_mode: 'HTML', reply_markup: guide.reply_markup })
          });
          return;
        }

        if (text === '/compare') {
          const comp = getComparisonCard();
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: comp.text, parse_mode: 'HTML', reply_markup: comp.reply_markup })
          });
          return;
        }

        if (text.startsWith('/calc')) {
          const parts = text.split(/\s+/);
          const customPrice = parseInt(parts[1], 10) || 99000;
          const calc = getCalculatorMenu(customPrice, 'TS8');
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: calc.text, parse_mode: 'Markdown', reply_markup: calc.reply_markup })
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
            body: JSON.stringify({ chat_id: chatId, text: `🎨 Rendering High-Resolution Branded Signage Poster for **${title}**...`, parse_mode: 'Markdown' })
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
          formData.append('caption', `🖼️ <b>High-Resolution Branded Signage Poster</b>\n\n🏢 <b>${title}</b>\n💰 <b>Price:</b> ${price}\n📍 <b>Location:</b> ${loc}\n🔗 <b>Deep Link:</b> <code>${slug}</code>\n\n<i>Ready for A4/A3 physical printout, window displays, or site signage. When scanned by any smartphone, it opens the bot directly to this property!</i>`);
          formData.append('parse_mode', 'HTML');
          formData.append('reply_markup', JSON.stringify({
            inline_keyboard: [
              [{ text: '📱 Test Deep Link', url: slug.startsWith('http') ? slug : `https://t.me/Nick_REAKH_Bot?start=${slug}` }],
              [{ text: '💬 Share with Nick', url: 'https://t.me/Nick_REAKH' }]
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
            `🚨 **FLASH PRICE DROP ALERT!** 🚨\n\n` +
            `🏢 **${unitName} (Floor 22)**\n` +
            `📍 Boeng Trabek / Chamkarmon\n\n` +
            `💰 **Price Slashed:** ~~$${oldPrice.toLocaleString()}~~ ➔ **$${newPrice.toLocaleString()} USD**\n` +
            `🏷️ **Immediate Savings:** -$${discount.toLocaleString()} USD (-10% Instant Equity)\n` +
            `📈 **New Net Yield:** **9.4% Net** (boosted by lower entry price!)\n\n` +
            `⚡ *Exclusive 48-Hour Window for Watchlist Subscribers before public broadcast.*`;

          const dropKeyboard = {
            inline_keyboard: [
              [
                { text: '⚡ Claim Deal & Book Tour', callback_data: `btn_book_${unit}` },
                { text: '🧮 New Payment Plan', callback_data: `btn_calc_${newPrice}_${unit}` }
              ],
              [
                { text: '💬 Connect with Nick Directly', url: 'https://t.me/Nick_REAKH' }
              ]
            ]
          };

          const subscribers = watchlist[unit] || new Set([nickChatId]);
          let sentCount = 0;
          for (const subChatId of subscribers) {
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: subChatId, text: dropAlert, parse_mode: 'Markdown', reply_markup: dropKeyboard })
            });
            sentCount++;
          }
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `✅ Price drop alert broadcasted to ${sentCount} subscriber(s) for ${unit}!`, parse_mode: 'Markdown' })
          });
          return;
        }

        if (text.startsWith('/myunit') || text === '/dashboard') {
          const parts = text.split(/\s+/);
          const unitRef = parts[1] || 'TS8-22';
          const dash = getLandlordDashboard(unitRef);
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: dash.text, parse_mode: 'Markdown', reply_markup: dash.reply_markup })
          });
          return;
        }

        if (text === '/list') {
          const intake = getOwnerIntakeStart();
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: intake.text, parse_mode: 'Markdown', reply_markup: intake.reply_markup })
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
            `⚠️ <b>SLA ESCALATION WARNING (15-MIN TARGET EXCEEDED!)</b> 🚨\n\n` +
            `👤 <b>Client:</b> @Takahashi_Tokyo (Kenji Takahashi)\n` +
            `🏢 <b>Property:</b> Time Square 8 (2BR Resale)\n` +
            `💰 <b>Budget:</b> $99,000 USD (Cash / Installment)\n` +
            `⏰ <b>Inquiry Time:</b> 17 minutes ago\n` +
            `⚡ <b>Current Status:</b> 🔴 <b>UNANSWERED</b>\n\n` +
            `<blockquote>💡 <b>SPEED-TO-LEAD BENCHMARK:</b>\n` +
            `▫️ Leads contacted within 5 mins convert at <b>78%</b>.\n` +
            `▫️ After 15 minutes, conversion drops to <b>under 12%</b>.</blockquote>\n\n` +
            `👉 Tap below to message the buyer and mark as resolved:`;

          const urgentKeyboard = {
            inline_keyboard: [
              [
                { text: '✅ Mark Contacted (Resolved)', callback_data: `sla_done_${testLeadId}` },
                { text: '📅 Tour Booked', callback_data: `sla_booked_${testLeadId}` }
              ],
              [
                { text: '💬 Message Buyer Now (@Takahashi_Tokyo)', url: 'https://t.me/Nick_REAKH' }
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
              body: JSON.stringify({ chat_id: chatId, text: menu.text, parse_mode: 'Markdown', reply_markup: menu.reply_markup })
            });
            return;
          }

          const agentPhone = parts[parts.length - 1];
          const agentName = parts.slice(0, parts.length - 1).join(' ');

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: `⚙️ Generating custom Co-Broke Factsheet for **${agentName}**...` })
          });

          const pdfPath = await generateCoBrokePDF(agentName, agentPhone);
          const fs = require('fs');
          const fileData = fs.readFileSync(pdfPath);
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('document', new Blob([fileData], { type: 'application/pdf' }), `TS8_Factsheet_${agentName.replace(/\s+/g, '_')}.pdf`);
          formData.append('caption', `🤝 <b>Personalized Co-Broke Investment Memo</b>\n\n🏢 <b>Time Square 8 (2BR)</b> · $99,000 USD\n👤 <b>Sub-Agent:</b> ${agentName} (📞 ${agentPhone})\n🛡️ <b>50/50 Commission Protection Verified</b>\n\n<i>You can forward this PDF directly to your buyers. When they close, your split is guaranteed!</i>`);
          formData.append('parse_mode', 'HTML');

          await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: formData });

          // Alert Nick
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🤝 **NEW CO-BROKE SUB-AGENT ONBOARDED!**\n\n` +
                `👤 **Agent:** ${agentName}\n` +
                `📞 **Contact:** ${agentPhone} (${sender.username ? '@' + sender.username : senderName})\n` +
                `🏢 **Property:** Time Square 8 (Factsheet Dispatched)\n` +
                `⚡ **Split:** 50% PHC / 50% Sub-Agent Guaranteed`,
              parse_mode: 'Markdown'
            })
          });
          return;
        }

        if (text.startsWith('/registerdeal')) {
          const parts = text.split(/\s+/).slice(1);
          if (parts.length < 2) {
            const usage = 
              `🛡️ **PHC CO-BROKE DEAL REGISTRATION**\n\n` +
              `To protect your 50/50 commission before introducing a buyer, register them below:\n\n` +
              `**Usage:**\n` +
              `\`/registerdeal [Property] [Client Name] [Client Phone]\`\n\n` +
              `**Example:**\n` +
              `\`/registerdeal TS8 Mr. Wang +886912345678\``;
            await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: usage, parse_mode: 'Markdown' })
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
            `🛡️ **PHC CO-BROKE COMMISSION PROTECTION CERTIFICATE**\n\n` +
            `📜 **Certificate ID:** \`#${regId}\`\n` +
            `📅 **Timestamp:** ${new Date().toUTCString()}\n` +
            `👤 **Sub-Agent:** ${senderName} (${sender.username ? '@' + sender.username : ''})\n` +
            `👤 **Protected Client:** ${clientName} (${clientPhone.slice(0, 4)}****${clientPhone.slice(-3)})\n` +
            `🏢 **Property:** ${unit === 'TS8' ? 'Time Square 8' : unit}\n` +
            `💰 **Commission Split:** **50% PHC / 50% Sub-Agent**\n` +
            `⏳ **Protection Period:** **60 Days Exclusive Safe Harbor**\n\n` +
            `✅ *This deal registration is officially filed in Property Hub Cambodia's broker ledger.*`;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: cert, parse_mode: 'Markdown' })
          });

          // Alert Nick to confirm
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🛡️ **NEW DEAL REGISTRATION FILED!**\n\n` +
                `📜 **Cert ID:** \`#${regId}\`\n` +
                `👤 **Sub-Agent:** ${senderName} (${sender.username ? '@' + sender.username : ''})\n` +
                `👤 **Buyer:** ${clientName} (${clientPhone})\n` +
                `🏢 **Unit:** ${unit}\n` +
                `💰 **Commission Agreement:** 50% / 50% Split\n\n` +
                `Tap to endorse registration:`,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ Endorse 50/50 Protection', callback_data: `deal_confirm_${regId}` }],
                  [{ text: '💬 Message Sub-Agent', url: `tg://user?id=${sender.id}` }]
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
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '📱 View in PHC Bot', url: 'https://t.me/Nick_REAKH_Bot?start=catalog' },
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
              text: `✅ **DIGEST BROADCASTED TO NICK TEST LAB!**\n\n` + digest.text,
              parse_mode: 'Markdown',
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
              parse_mode: 'Markdown',
              reply_markup: card.reply_markup
            })
          });

          const senderHandle = sender.username ? `@${sender.username}` : senderName;
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🚨 **NEW QR CODE SCAN DETECTED!**\n\n` +
                `👤 **Visitor:** ${senderHandle} (${sender.first_name} ${sender.last_name || ''})\n` +
                `📍 **Source:** Scanned Open House Signage for **Time Square 8**!\n` +
                `⚡ **Status:** Active on property card right now.\n\n` +
                `👉 [Tap here to message visitor directly](tg://user?id=${sender.id})`,
              parse_mode: 'Markdown'
            })
          });
          return;
        }

        if (text.startsWith('/start') || text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello' || text === '/inquire') {
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
                { text: '🧮 Payment & Mortgage Calculator', callback_data: 'btn_calc_99000_TS8' },
                { text: '📚 Foreign Buyer Legal Guide', callback_data: 'btn_legal_guide' }
              ],
              [
                { text: '⚖️ Compare Top Investment Units', callback_data: 'btn_compare_TS8' },
                { text: '💼 List My Unit (Owners)', callback_data: 'lead_flow_list' }
              ],
              [
                { text: '🤝 Co-Broke & Agent Portal (50/50)', callback_data: 'btn_cobroke' },
                { text: '📱 Browse Mini App', web_app: { url: 'https://www.propertyhubcambodia.com' } }
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
            ownerListingState[user.id] = { step: 1 };
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cbId })
            });

            await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: msg.chat.id, message_id: msg.message_id,
                text: '💼 **60-SECOND PROPERTY INTAKE WIZARD**\n\n' +
                  'We syndicate your listing across 4 languages (English, Japanese, Russian, German) reaching thousands of qualified international buyers and high-budget expat tenants.\n\n' +
                  '**Step 1 of 4:** What is your primary objective for this property?',
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '🏢 Sell My Condo (Resale)', callback_data: 'owner_goal_sell' }],
                    [{ text: '🔑 Rent Out My Condo', callback_data: 'owner_goal_rent' }],
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

          // 🚨 INSTANT VIP LEAD ALERT SENT DIRECTLY TO NICK WITH SLA ACTIONS!
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🚨 **NEW QUALIFIED LEAD RECEIVED!** 🚨\n\n` +
                `👤 **Client:** ${userName} (${user.first_name} ${user.last_name || ''})\n` +
                `🎯 **Goal:** ${info.type}\n` +
                `💰 **Budget Category:** ${info.budget}\n` +
                `📍 **Preferred Area:** ${loc}\n` +
                `⏰ **Inquiry Time:** Just now\n\n` +
                `⚡ **Response SLA:** Respond within 15 minutes!`,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ Mark Contacted', callback_data: `sla_done_${inquiryLeadId}` },
                    { text: '📅 Tour Booked', callback_data: `sla_booked_${inquiryLeadId}` }
                  ],
                  [
                    { text: '💬 Message Buyer Directly', url: `tg://user?id=${user.id}` }
                  ]
                ]
              }
            })
          });
          console.log(`🚨 Sent VIP Lead Notification with SLA tracking to Nick for user ${userName}!`);
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
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              text: `📅 **Select Viewing Format for ${unit}**\n\nHow would you prefer to tour this property?`,
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
              text: `✅ **Viewing Request Confirmed for ${unit}!**\n\n` +
                `📋 **Format:** ${isVideo ? '🎥 Live Overseas Video Call' : '🏢 In-Person Walking Tour'}\n` +
                `Nick has received your appointment request and will coordinate the exact time with you directly:`,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💬 Connect with Nick (@Nick_REAKH)', url: 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `📅 **NEW VIEWING TOUR BOOKING!** 🚨\n\n` +
                `👤 **Client:** ${userName} (${user.first_name} ${user.last_name || ''})\n` +
                `🏢 **Property:** ${unit}\n` +
                `🎯 **Format:** ${isVideo ? '🎥 Live Overseas Video Call' : '🏢 In-Person Tour'}\n` +
                `⚡ **Response SLA:** Respond within 15 minutes!`,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ Mark Contacted', callback_data: `sla_done_${tourLeadId}` },
                    { text: '📅 Tour Booked', callback_data: `sla_booked_${tourLeadId}` }
                  ],
                  [
                    { text: '💬 Message Buyer Directly', url: `tg://user?id=${user.id}` }
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
            formData.append('document', new Blob([fileData], { type: 'application/pdf' }), 'PHC_Time_Square_8_Factsheet.pdf');
            formData.append('caption', '📄 <b>1-Page Executive Investment Teaser</b>\n\n🏢 <b>Time Square 8 (2BR)</b> · $99,000 USD\n🛡️ Verified Strata Title · 8.5% Net Yield\n\n<i>Generated automatically by Property Hub Cambodia Bot</i>');
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
              parse_mode: 'Markdown',
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

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const text = 
            `💰 **DEVELOPER INSTALLMENT PLAN (10% DOWN)**\n\n` +
            `🏢 **Unit:** ${unit === 'TS8' ? 'Time Square 8' : unit} · $${price.toLocaleString()} USD\n\n` +
            `▫️ **Down Payment (10%):** $${down.toLocaleString()} USD (Upon SPA contract)\n` +
            `▫️ **During Construction (36 Mos):** $${monthly.toLocaleString()}/mo ($17,820 total)\n` +
            `▫️ **Balance at Handover (72%):** $${handover.toLocaleString()} USD (Q4 2026)\n\n` +
            `📊 **Projected Rent:** $750/mo ($9,000/yr)\n` +
            `📈 **Net Rental Yield:** **8.5% Net**\n\n` +
            `💡 *Pay under $500/month while construction progresses, then rent out upon handover!*`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🏦 Compare with Bank Mortgage', callback_data: `calc_mortgage_${price}_${unit}` },
                    { text: '📊 ROI Model', callback_data: `calc_yield_${price}_${unit}` }
                  ],
                  [
                    { text: '📅 Book Private Viewing', callback_data: `btn_book_${unit}` },
                    { text: '💬 Discuss with Nick', url: 'https://t.me/Nick_REAKH' }
                  ],
                  [
                    { text: '🔙 Back to Calculator Options', callback_data: `btn_calc_${price}_${unit}` }
                  ]
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

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const text = 
            `💰 **DEVELOPER INSTALLMENT PLAN (20% DOWN - BEST TERMS)**\n\n` +
            `🏢 **Unit:** ${unit === 'TS8' ? 'Time Square 8' : unit} · $${price.toLocaleString()} USD\n\n` +
            `▫️ **Down Payment (20%):** $${down.toLocaleString()} USD\n` +
            `▫️ **During Construction (36 Mos):** $${monthly.toLocaleString()}/mo\n` +
            `▫️ **Balance at Handover (60%):** $${handover.toLocaleString()} USD (Q4 2026)\n\n` +
            `📊 **Projected Rent:** $750/mo ($9,000/yr)\n` +
            `📈 **Net Rental Yield:** **8.8% Net**\n\n` +
            `💡 *Higher down payment secures preferred unit selection and lower balloon at completion.*`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🏦 Compare with Bank Mortgage', callback_data: `calc_mortgage_${price}_${unit}` },
                    { text: '📊 ROI Model', callback_data: `calc_yield_${price}_${unit}` }
                  ],
                  [
                    { text: '📅 Book Private Viewing', callback_data: `btn_book_${unit}` },
                    { text: '💬 Discuss with Nick', url: 'https://t.me/Nick_REAKH' }
                  ],
                  [
                    { text: '🔙 Back to Calculator Options', callback_data: `btn_calc_${price}_${unit}` }
                  ]
                ]
              }
            })
          });
        }

        else if (dataStr.startsWith('calc_mortgage_')) {
          const parts = dataStr.replace('calc_mortgage_', '').split('_');
          const price = parseInt(parts[0], 10) || 99000;
          const unit = parts[1] || 'TS8';
          const down = Math.round(price * 0.3);
          const loan = Math.round(price * 0.7);
          const monthlyRent = 750;
          const r = 0.075 / 12;
          const n = 180;
          const emi = Math.round(loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
          const cashFlow = monthlyRent - emi;

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const text = 
            `🏦 **15-YEAR COMMERCIAL BANK MORTGAGE MODEL**\n\n` +
            `🏢 **Unit:** ${unit === 'TS8' ? 'Time Square 8' : unit} · $${price.toLocaleString()} USD\n\n` +
            `▫️ **Down Payment (30%):** $${down.toLocaleString()} USD\n` +
            `▫️ **Loan Amount (70%):** $${loan.toLocaleString()} USD\n` +
            `▫️ **Mortgage Term:** 15 Years (180 months) @ 7.5% p.a.\n` +
            `▫️ **Monthly Mortgage Payment (EMI):** **$${emi.toLocaleString()}/month**\n\n` +
            `💰 **Estimated Monthly Rent:** $${monthlyRent}/month\n` +
            `🎉 **Net Cash Flow to Owner:** **+$${cashFlow}/month POSITIVE**\n\n` +
            `💡 *The tenant pays 100% of your bank mortgage while you pocket extra cash flow and own the asset free & clear!*`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '💰 View 10% Down Installment', callback_data: `calc_p10_${price}_${unit}` },
                    { text: '📊 ROI Model', callback_data: `calc_yield_${price}_${unit}` }
                  ],
                  [
                    { text: '📅 Book Private Viewing', callback_data: `btn_book_${unit}` },
                    { text: '💬 Discuss with Nick', url: 'https://t.me/Nick_REAKH' }
                  ],
                  [
                    { text: '🔙 Back to Calculator Options', callback_data: `btn_calc_${price}_${unit}` }
                  ]
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

          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const text = 
            `📊 **NET RENTAL YIELD & CASH-ON-CASH ROI**\n\n` +
            `🏢 **Unit:** ${unit === 'TS8' ? 'Time Square 8' : unit} · $${price.toLocaleString()} USD\n\n` +
            `▫️ **Gross Annual Rent ($750/mo):** $${grossAnnual.toLocaleString()} USD\n` +
            `▫️ **Building Maintenance Fee:** -$${mgmtFee} USD/year\n` +
            `▫️ **Net Annual Rental Cash Flow:** **$${netAnnual.toLocaleString()} USD**\n` +
            `🎯 **Net Rental Yield:** **${netYield}% Net**\n\n` +
            `🌍 **GLOBAL REAL ESTATE BENCHMARK:**\n` +
            `🇰🇭 **Phnom Penh (PHC):** **${netYield}% Net**\n` +
            `🇹🇭 Bangkok: ~4.5% Net\n` +
            `🇸🇬 Singapore: ~3.1% Net\n` +
            `🇯🇵 Tokyo: ~2.4% Net\n\n` +
            `🚀 **5-Year Projected Appreciation:** +25% to +35% as Chamkarmon infrastructure matures.`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '💰 10% Down Plan', callback_data: `calc_p10_${price}_${unit}` },
                    { text: '🏦 Bank Mortgage', callback_data: `calc_mortgage_${price}_${unit}` }
                  ],
                  [
                    { text: '📅 Book Private Viewing', callback_data: `btn_book_${unit}` },
                    { text: '💬 Connect with Nick', url: 'https://t.me/Nick_REAKH' }
                  ],
                  [
                    { text: '🔙 Back to Calculator Options', callback_data: `btn_calc_${price}_${unit}` }
                  ]
                ]
              }
            })
          });
        }

        // ── PHASE 1: FOREIGN BUYER LEGAL & TAX GUIDE ──
        else if (dataStr === 'btn_legal_guide' || dataStr === 'legal_back') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const guide = getLegalGuideMenu();
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

          const text = 
            `📜 <b>100% FOREIGN FREEHOLD STRATA TITLE LAW</b>\n\n` +
            `<blockquote>✅ <b>Article 6 of 2010 Foreign Ownership Law:</b>\n` +
            `▫️ Foreign nationals can legally own 100% freehold title in private units of co-owned buildings from the 1st floor upwards.\n` +
            `▫️ Ownership is registered directly under your personal passport name at the Ministry of Land Management & Urban Planning.\n` +
            `▫️ Issued as an unassailable Cadastral "Hard Title" (Strata Title) with state-backed deed guarantee.\n` +
            `▫️ You possess absolute legal rights to sell, lease, transfer, or pass to heirs indefinitely.</blockquote>\n\n` +
            `<blockquote>🛡️ <b>Foreign Ownership Quota Safeguards:</b>\n` +
            `▫️ Up to 70% of total private unit floor area in a co-owned building can be foreign-owned.\n` +
            `▫️ Ground floor and subterranean levels are reserved for Cambodian nationals.\n` +
            `▫️ Land within 30km of international land borders is restricted.</blockquote>\n\n` +
            `💡 <i>Property Hub Cambodia only lists developments with verified 100% strata title eligibility.</i>`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🏷️ Taxes & Fees', callback_data: 'legal_taxes' }, { text: '💸 Bank Wires & USDT', callback_data: 'legal_transfers' }],
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
            `🏷️ <b>TAXES & GOVERNMENT CLOSING FEES</b>\n\n` +
            `Cambodia offers one of the most investor-friendly tax regimes globally:\n\n` +
            `<blockquote>💰 <b>Official Tax Schedule:</b>\n` +
            `▫️ <b>Property Transfer Tax (Stamp Duty):</b> 4% of Cadastral assessed value (paid once upon hard title transfer).\n` +
            `▫️ <b>Annual Property Tax:</b> 0.1% on properties valued above ~$25,000 USD (assessed on 80% baseline — typically only $50–$100/yr for a 2BR condo).\n` +
            `▫️ <b>Capital Gains Tax:</b> 0% for individual foreign buyers (corporate: 20%).\n` +
            `▫️ <b>Rental Withholding Tax:</b> Non-residents pay 14% withholding (often borne by tenant or offset by management expense deductions).</blockquote>\n\n` +
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
            `💸 <b>INTERNATIONAL BANK WIRE & DIGITAL ASSETS</b>\n\n` +
            `<blockquote>🌐 <b>Remittance & Currency Framework:</b>\n` +
            `▫️ <b>USD-Based Economy:</b> Cambodia is a dual-currency nation operating predominantly in United States Dollars (USD). There is zero currency exchange loss or depreciation risk.\n` +
            `▫️ <b>Telegraphic Transfers (SWIFT):</b> Overseas investors can wire purchase funds directly to developer escrow accounts or PHC partner commercial banks (ABA Bank, Canadia Bank, Prince Bank) with your sales contract.\n` +
            `▫️ <b>Digital Currency / USDT:</b> Property Hub Cambodia can facilitate compliant escrow settlements via USDT (Tether).\n` +
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
            `🔑 <b>TURNKEY OVERSEAS PROPERTY MANAGEMENT</b>\n\n` +
            `Overseas investors never need to fly to Cambodia to manage their unit:\n\n` +
            `<blockquote>🤝 <b>Full-Lifecycle Passive Landlord Service:</b>\n` +
            `▫️ <b>Tenant Sourcing & Screening:</b> We syndicate listings across our 12,000+ subscriber network in English, Japanese, Russian, and German.\n` +
            `▫️ <b>Rent Collection & Banking:</b> Monthly rent is collected and transferred directly to your bank account with complete digital statements.\n` +
            `▫️ <b>Maintenance & Repairs:</b> Dedicated on-site team handles repairs, cleaning, and routine inspections.\n` +
            `▫️ <b>Full Digital Reporting:</b> Quarterly unit condition photos and inspection reports delivered straight to your Telegram.</blockquote>`;

          await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id, text, parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📜 Strata Title Law', callback_data: 'legal_strata' }, { text: '🏷️ Taxes & Fees', callback_data: 'legal_taxes' }],
                  [{ text: '🔙 Back to Legal Menu', callback_data: 'legal_back' }, { text: '💬 Connect with Nick', url: 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });
        }

        // ── PHASE 1: SIDE-BY-SIDE UNIT COMPARISON ──
        else if (dataStr.startsWith('btn_compare_')) {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const comp = getComparisonCard();
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

          const card = getTS8Card();
          await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id,
              photo: card.photo,
              caption: card.caption,
              parse_mode: 'Markdown',
              reply_markup: card.reply_markup
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
              text: `💼 **60-SECOND PROPERTY INTAKE WIZARD**\n\n` +
                `🎯 **Objective:** ${goal}\n\n` +
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
              text: `💼 **60-SECOND PROPERTY INTAKE WIZARD**\n\n` +
                `🎯 **Objective:** ${ownerListingState[user.id].goal}\n` +
                `📍 **Location:** ${projName}\n\n` +
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
              text: `💼 **60-SECOND PROPERTY INTAKE WIZARD**\n\n` +
                `🎯 **Objective:** ${ownerListingState[user.id].goal}\n` +
                `📍 **Location:** ${ownerListingState[user.id].project}\n` +
                `🛋️ **Layout:** ${bedName}\n\n` +
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
              text: `🎉 **PROPERTY SUBMISSION RECEIVED!**\n\n` +
                `📋 **YOUR SUBMISSION SUMMARY:**\n` +
                `▫️ **Unit Reference:** \`#${unitRef}\`\n` +
                `▫️ **Objective:** ${info.goal || 'Resale'}\n` +
                `▫️ **Location:** ${info.project || 'Chamkarmon'}\n` +
                `▫️ **Layout:** ${info.bedrooms || '2-Bedroom'}\n` +
                `▫️ **Target Pricing:** ${valName}\n\n` +
                `🛡️ **NEXT STEPS:**\n` +
                `Nick and the PHC valuation team will verify building title records and reach out within 2 hours to confirm your representation agreement.\n\n` +
                `👉 *You can track your marketing analytics anytime by typing:* \`/myunit ${unitRef}\``,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔑 View Performance Dashboard', callback_data: `owner_refresh_${unitRef}` }],
                  [{ text: '💬 Connect Directly with Nick', url: 'https://t.me/Nick_REAKH' }]
                ]
              }
            })
          });

          // Send Alert to Nick with SLA Action Buttons
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: nickChatId,
              text: `🚨 **NEW EXCLUSIVE PROPERTY SUBMISSION!** 🚨\n\n` +
                `👤 **Owner:** ${userName} (${user.first_name} ${user.last_name || ''})\n` +
                `🆔 **User ID:** \`${user.id}\`\n` +
                `📋 **Unit Code:** \`#${unitRef}\`\n` +
                `🎯 **Goal:** ${info.goal || 'Resale'}\n` +
                `📍 **Project:** ${info.project || 'Chamkarmon'}\n` +
                `🛋️ **Layout:** ${info.bedrooms || '2-Bedroom'}\n` +
                `💰 **Price Target:** ${valName}\n` +
                `⏰ **Submitted:** Just now\n\n` +
                `⚡ **Response SLA:** Respond within 15 minutes!`,
              parse_mode: 'Markdown',
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
              text: dash.text, parse_mode: 'Markdown', reply_markup: dash.reply_markup
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
              text: feedback.text, parse_mode: 'Markdown', reply_markup: feedback.reply_markup
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

        else if (dataStr === 'owner_back_main') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const card = getTS8Card();
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, text: '👋 Returned to Property Hub Cambodia Master Portal.',
              parse_mode: 'Markdown', reply_markup: card.reply_markup
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
            `✅ <b>LEAD CONTACTED & RESOLVED!</b> 🟢\n\n` +
            `👤 <b>Client:</b> ${lead.name || 'Client'}\n` +
            `🏢 <b>Property:</b> ${lead.unitRef || 'Time Square 8'}\n` +
            `⏱️ <b>Response SLA:</b> 🟢 <b>EXCELLENT (&lt; 3 mins response)</b>\n` +
            `⚡ <b>Status:</b> In active direct consultation with Nick.\n\n` +
            `<blockquote>🎯 <b>Next Recommended Action:</b> Coordinate property viewing date or live video tour session.</blockquote>`;

          const eRes = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: resolvedCard,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '📅 Advance to: Tour Booked', callback_data: `sla_booked_${leadId}` }],
                  [{ text: '💬 Re-Open Client Chat', url: lead.userId ? `tg://user?id=${lead.userId}` : 'https://t.me/Nick_REAKH' }]
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
            body: JSON.stringify({ callback_query_id: cbId, text: '📅 Scheduled in PHC Calendar!' })
          });

          const lead = leadSlaTracker[leadId] || { name: 'Client', unitRef: 'Time Square 8' };
          const bookedCard = 
            `🎉 <b>VIEWING TOUR OFFICIALLY BOOKED!</b> 📅\n\n` +
            `👤 <b>Client:</b> ${lead.name || 'Client'}\n` +
            `🏢 <b>Property:</b> ${lead.unitRef || 'Time Square 8'}\n` +
            `⚡ <b>Lifecycle Stage:</b> 🟡 <b>Tour Scheduled (High Conversion Pipeline)</b>\n\n` +
            `<blockquote>📆 <b>Calendar Event:</b> Synchronized with PHC inspection schedule. Client will receive automated reminder 2 hours prior to inspection.</blockquote>`;

          const bRes = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: msg.chat.id, message_id: msg.message_id,
              text: bookedCard,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🔑 Open Landlord Dashboard', callback_data: 'owner_refresh_TS8-22' }]
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
              parse_mode: 'Markdown',
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
            `✍️ **GENERATE YOUR PERSONALIZED WHITE-LABEL FACTSHEET**\n\n` +
            `Reply with your name and WhatsApp/Telegram phone number in this format:\n\n` +
            `\`/cobroke [Your Name] [WhatsApp Number]\`\n\n` +
            `**Example:**\n` +
            `\`/cobroke Alex Chen +85512345678\`\n\n` +
            `⚡ The bot will instantly generate and send your custom PDF!`;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: msg.chat.id, text, parse_mode: 'Markdown' })
          });
        }

        else if (dataStr === 'cobroke_reg_deal') {
          await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cbId })
          });

          const text = 
            `🛡️ **REGISTER A BUYER TO SECURE YOUR 50/50 COMMISSION**\n\n` +
            `Reply with your client registration in this format:\n\n` +
            `\`/registerdeal [Property] [Client Name] [Client Phone]\`\n\n` +
            `**Example:**\n` +
            `\`/registerdeal TS8 Mr. Wang +886912345678\`\n\n` +
            `⚡ Timestamped Protection Certificate issued immediately!`;

          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: msg.chat.id, text, parse_mode: 'Markdown' })
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
              text: (msg.text || '') + `\n\n✅ **ENDORSED BY NICK (@Nick_REAKH)!**\n🛡️ **Protection Status:** 🟢 **Active 50/50 Safe Harbor (60 Days)**`,
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard: [] }
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
