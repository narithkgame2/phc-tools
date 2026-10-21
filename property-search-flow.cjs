// ═══════════════════════════════════════════════════════════════
//  PHC 5-STEP INTERACTIVE PROPERTY SEARCH CONCIERGE
//  Steps: Buy/Rent -> Property Type -> Location -> Budget -> Purpose -> Results
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const INVENTORY_FILE = path.join(__dirname, 'data', 'multi-channel-inventory.json');
const userSearchState = {};

function getInventory() {
  if (!fs.existsSync(INVENTORY_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf8'));
    return data.listings || [];
  } catch (e) {
    return [];
  }
}

function isSearchCallback(data) {
  if (!data) return false;
  return data.startsWith('srch_') || data === 'btn_explore_prop' || data === 'lead_flow_buy' || data === 'lead_flow_rent';
}

// ── STEP 1: BUY VS RENT ───────────────────────────────────────
function renderStep1() {
  return {
    text: 
      '🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '<b>Step 1 of 5 · Target Objective</b>\n\n' +
      'Are you looking to purchase or rent a property in Phnom Penh?',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Buy a Property', callback_data: 'srch_step1_sale' },
          { text: '🔑 Rent a Home', callback_data: 'srch_step1_rent' }
        ]
      ]
    }
  };
}

// ── STEP 2: PROPERTY TYPE ─────────────────────────────────────
function renderStep2(type) {
  const isRent = type === 'Rent';
  return {
    text: 
      `🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Step 2 of 5 · Property Category (${isRent ? 'Rent' : 'Buy'})</b>\n\n` +
      `Which property category best fits your lifestyle?`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Modern Condo', callback_data: 'srch_step2_condo' },
          { text: '🛋️ Serviced Apt', callback_data: 'srch_step2_apt' }
        ],
        [
          { text: '🏡 Villa / Borey', callback_data: 'srch_step2_villa' },
          { text: '🌐 Any Category', callback_data: 'srch_step2_any' }
        ],
        [
          { text: '🔙 Back to Step 1', callback_data: 'srch_step0_start' }
        ]
      ]
    }
  };
}

// ── STEP 3: LOCATION ──────────────────────────────────────────
function renderStep3(state) {
  return {
    text: 
      `🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Step 3 of 5 · Target Location</b>\n\n` +
      `Select your preferred residential or investment district:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📍 BKK1', callback_data: 'srch_step3_bkk1' },
          { text: '📍 Tonle Bassac', callback_data: 'srch_step3_tb' }
        ],
        [
          { text: '📍 Chamkarmon (TTP)', callback_data: 'srch_step3_ttp' },
          { text: '📍 Toul Kork', callback_data: 'srch_step3_tk' }
        ],
        [
          { text: '🏡 Peng Huoth / Chbar Ampov', callback_data: 'srch_step3_ph' }
        ],
        [
          { text: '🌐 Any Location', callback_data: 'srch_step3_any' },
          { text: '🔙 Back', callback_data: 'srch_back_to_step2' }
        ]
      ]
    }
  };
}

// ── STEP 4: BUDGET ────────────────────────────────────────────
function renderStep4(state) {
  const isRent = state.type === 'Rent';
  if (isRent) {
    return {
      text: 
        `🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `<b>Step 4 of 5 · Monthly Rental Budget</b>\n\n` +
        `Select your target monthly budget range:`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '💵 Under $500 / mo', callback_data: 'srch_step4_rent_b1' },
            { text: '💵 $500 – $800 / mo', callback_data: 'srch_step4_rent_b2' }
          ],
          [
            { text: '💵 $800 – $1,500 / mo', callback_data: 'srch_step4_rent_b3' },
            { text: '💵 $1,500+ / mo', callback_data: 'srch_step4_rent_b4' }
          ],
          [
            { text: '🔙 Back to Location', callback_data: 'srch_back_to_step3' }
          ]
        ]
      }
    };
  }

  // Sale Budget
  return {
    text: 
      `🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Step 4 of 5 · Target Acquisition Budget</b>\n\n` +
      `Select your target investment budget range:`,
    reply_markup: {
      inline_keyboard: [
        [
          { text: '💰 Under $70,000 USD', callback_data: 'srch_step4_sale_b1' },
          { text: '💰 $70k – $120,000 USD', callback_data: 'srch_step4_sale_b2' }
        ],
        [
          { text: '💰 $120k – $250,000 USD', callback_data: 'srch_step4_sale_b3' },
          { text: '💰 $250,000+ USD', callback_data: 'srch_step4_sale_b4' }
        ],
        [
          { text: '🔙 Back to Location', callback_data: 'srch_back_to_step3' }
        ]
      ]
    }
  };
}

// ── STEP 5: PURPOSE ───────────────────────────────────────────
function renderStep5(state) {
  const isRent = state.type === 'Rent';
  if (isRent) {
    return {
      text: 
        `🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `<b>Step 5 of 5 · Primary Living Priority</b>\n\n` +
        `What is your main requirement for this rental?`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '💼 Work & Walkability to CBD', callback_data: 'srch_step5_rent_work' }],
          [{ text: '🏊 Full Facilities (Pool & Sky Gym)', callback_data: 'srch_step5_rent_amen' }],
          [{ text: '🧹 Serviced (Cleaning & Bills Included)', callback_data: 'srch_step5_rent_serv' }],
          [{ text: '🔙 Back to Budget', callback_data: 'srch_back_to_step4' }]
        ]
      }
    };
  }

  // Sale Purpose
  return {
    text: 
      `🏛️ <b>PROPERTY HUB CAMBODIA · SEARCH CONCIERGE</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `<b>Step 5 of 5 · Investment Objective</b>\n\n` +
      `What is your primary investment goal?`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '📈 High Rental Yield (8%+ Net ROI)', callback_data: 'srch_step5_sale_yield' }],
        [{ text: '🚀 Capital Appreciation & Prime Growth', callback_data: 'srch_step5_sale_growth' }],
        [{ text: '🏡 Personal Residence / Expat Living', callback_data: 'srch_step5_sale_home' }],
        [{ text: '🔙 Back to Budget', callback_data: 'srch_back_to_step4' }]
      ]
    }
  };
}

// ── INVENTORY FILTERING & RESULT CARDS ────────────────────────
function filterInventory(state) {
  const listings = getInventory();
  const isRent = state.type === 'Rent';

  let matches = listings.filter(l => l.type.toLowerCase() === state.type.toLowerCase());

  // Location filter
  if (state.location && state.location !== 'any') {
    const locMap = {
      bkk1: ['bkk1', 'bkk 1', 'boeung keng kang 1', 'bkk'],
      tb: ['tonle bassac', 'bassac', 'aeon'],
      ttp: ['chamkarmon', 'toul tompoung', 'russian market', 'ttp', 'tumpun'],
      tk: ['toul kork', 'boeng kak', 'sen sok'],
      ph: ['peng huoth', 'beoung snor', 'boeung snor', 'chbar ampov', 'national road 1']
    };
    const keywords = locMap[state.location] || [state.location];
    const locFiltered = matches.filter(l => {
      const text = `${l.location} ${l.title} ${l.snippet}`.toLowerCase();
      return keywords.some(k => text.includes(k));
    });
    if (locFiltered.length > 0) {
      matches = locFiltered;
    }
  }

  // Budget filter
  if (state.budget) {
    let minP = 0;
    let maxP = Infinity;
    if (isRent) {
      if (state.budget === 'rent_b1') { minP = 0; maxP = 500; }
      else if (state.budget === 'rent_b2') { minP = 450; maxP = 850; }
      else if (state.budget === 'rent_b3') { minP = 750; maxP = 1600; }
      else if (state.budget === 'rent_b4') { minP = 1400; maxP = 15000; }
    } else {
      if (state.budget === 'sale_b1') { minP = 0; maxP = 75000; }
      else if (state.budget === 'sale_b2') { minP = 65000; maxP = 130000; }
      else if (state.budget === 'sale_b3') { minP = 120000; maxP = 270000; }
      else if (state.budget === 'sale_b4') { minP = 240000; maxP = 2000000; }
    }
    const budgetFiltered = matches.filter(l => !l.price || (l.price >= minP && l.price <= maxP));
    if (budgetFiltered.length > 0) {
      matches = budgetFiltered;
    }
  }

  // Property type filter
  if (state.propType && state.propType !== 'any') {
    if (state.propType === 'apt') {
      const aptFiltered = matches.filter(l => /serviced|apartment|អាផាតមិន/i.test(`${l.title} ${l.snippet}`));
      if (aptFiltered.length > 0) matches = aptFiltered;
    } else if (state.propType === 'villa') {
      const villaFiltered = matches.filter(l => /villa|borey|វីឡា|link house|shophouse|ផ្ទះអាជីវកម្ម/i.test(`${l.title} ${l.snippet}`));
      if (villaFiltered.length > 0) matches = villaFiltered;
    } else if (state.propType === 'condo') {
      const condoFiltered = matches.filter(l => /condo|time square|tower|residence|ខុនដូ/i.test(`${l.title} ${l.snippet}`));
      if (condoFiltered.length > 0) matches = condoFiltered;
    }
  }

  return matches;
}

function renderResultsCard(state, page = 1) {
  const allMatches = filterInventory(state);
  const pageSize = 3;
  const startIndex = (page - 1) * pageSize;
  const displayed = allMatches.slice(startIndex, startIndex + pageSize);
  const totalCount = allMatches.length;

  const isRent = state.type === 'Rent';
  const filterSummary = `${state.type} · ${state.propTypeLabel || 'Prime Property'} · ${state.locLabel || 'Phnom Penh'} · ${state.budgetLabel || 'Budget Profile'}`;

  let text = 
    `⚖️ <b>PHC HANDPICKED ${isRent ? 'RENTAL' : 'INVESTMENT'} MATCHES</b>\n` +
    `<i>Filtered by: ${filterSummary}</i>\n\n`;

  const buttonsRow = [];

  if (displayed.length === 0) {
    text += `<blockquote>No direct matches found for this exact combination in our active channel catalog right now. Nick will source off-market units for you:</blockquote>`;
  } else {
    displayed.forEach((m, idx) => {
      const num = startIndex + idx + 1;
      const cleanTitle = (m.title || `${m.location} ${m.beds}`)
        .replace(/^#Newlisting\s*/i, '')
        .replace(/^[📍🏢✨🍃💫\s]+/, '')
        .replace(/\s*·\s*Features:[\s\S]*/i, '')
        .split('·')[0].trim();

      const snippet = m.snippet || '';
      const floorM = snippet.match(/(\d+(?:st|nd|rd|th)(?:\s*floor)?)/i);
      const floor = floorM ? floorM[1] : '';

      const sizeM = snippet.match(/(\d+(?:\.\d+)?\s*(?:m²|sqm))/i);
      const size = sizeM ? sizeM[1].replace(/m²/i, 'm²') : '';

      const bedBathM = snippet.match(/(\d+\s*🛏\s*\|\s*\d+\s*🛁|\d+\s*🛏)/i);
      let layout = bedBathM ? bedBathM[1].replace(/\|/g, '·').replace(/\s+/g, ' ').trim() : m.beds;
      if (!layout.includes('🛏') && m.beds) layout = `${m.beds} (1🛁)`;

      const specsLine = [floor, size, layout].filter(Boolean).join(' | ');

      const priceClean = (m.priceFormatted && !m.priceFormatted.startsWith('/mo') && m.priceFormatted !== 'Inquire')
        ? m.priceFormatted
        : (m.price ? (isRent ? `$${m.price.toLocaleString()}/mo` : `$${m.price.toLocaleString()} USD`) : 'Inquire');

      let yieldLine = '';
      if (!isRent && m.price) {
        // Calculate realistic net yield
        const estMonthlyRent = Math.round(m.price * 0.0075);
        const netYieldVal = ((estMonthlyRent * 12 * 0.88) / m.price * 100).toFixed(1);
        yieldLine = `▫️ <b>Est. Net Yield:</b> ~${netYieldVal}% Net\n`;
      }

      text += 
        `<blockquote>✨ <b>OPTION ${num}</b>\n` +
        `▫️ <b>Property:</b> ${cleanTitle}\n` +
        `▫️ <b>Pricing:</b> ${priceClean}\n` +
        `▫️ <b>Specs:</b> ${m.beds}\n` +
        `📍 <i>${m.location}</i>\n` +
        `${specsLine}\n` +
        yieldLine +
        `▫️ <b>Listing Photos:</b> <a href="${m.link}">View Details ↗</a></blockquote>\n\n`;

      buttonsRow.push({ text: `✨ Option ${num} ↗`, url: m.link });
    });
  }

  text += `💡 <i>Tap any option button below to inspect full photos, floor plans & details directly in the verified channel post.</i>`;

  const keyboard = [];
  if (buttonsRow.length > 0) {
    keyboard.push(buttonsRow);
  }

  // Pagination row
  const hasNext = startIndex + pageSize < totalCount;
  const hasPrev = page > 1;
  const navRow = [];
  if (hasPrev) {
    navRow.push({ text: '🔙 Previous 3', callback_data: `srch_page_${page - 1}` });
  }
  if (hasNext) {
    navRow.push({ text: '📂 View Next 3 Matches ❯', callback_data: `srch_page_${page + 1}` });
  }
  if (navRow.length > 0) {
    keyboard.push(navRow);
  }

  keyboard.push([
    { text: '🎯 Request Custom Sourcing from Nick', callback_data: 'btn_custom_search' },
    { text: '💬 Chat with Nick Directly ↗', url: 'https://t.me/Nick_REAKH' }
  ]);
  keyboard.push([
    { text: '🔄 Start New Search', callback_data: 'srch_step0_start' }
  ]);

  return { text, reply_markup: { inline_keyboard: keyboard } };
}

// ── CALLBACK ROUTER ───────────────────────────────────────────
async function handleSearchCallback(cb, botToken) {
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const data = cb.data;

  if (!userSearchState[chatId]) {
    userSearchState[chatId] = { type: 'Sale', page: 1 };
  }
  const state = userSearchState[chatId];

  // Acknowledge callback immediately
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: cb.id })
  }).catch(() => {});

  let card = null;

  if (data === 'srch_step0_start' || data === 'btn_explore_prop') {
    userSearchState[chatId] = { type: 'Sale', page: 1 };
    card = renderStep1();
  } else if (data === 'srch_step1_sale' || data === 'lead_flow_buy') {
    state.type = 'Sale';
    card = renderStep2('Sale');
  } else if (data === 'srch_step1_rent' || data === 'lead_flow_rent') {
    state.type = 'Rent';
    card = renderStep2('Rent');
  } else if (data.startsWith('srch_step2_')) {
    const pType = data.replace('srch_step2_', '');
    state.propType = pType;
    const pTypeNames = { condo: 'Modern Condo', apt: 'Serviced Apartment', villa: 'Villa / Borey', any: 'Any Type' };
    state.propTypeLabel = pTypeNames[pType] || 'All Types';
    card = renderStep3(state);
  } else if (data === 'srch_back_to_step2') {
    card = renderStep2(state.type);
  } else if (data.startsWith('srch_step3_')) {
    const loc = data.replace('srch_step3_', '');
    state.location = loc;
    const locNames = { bkk1: 'BKK1', tb: 'Tonle Bassac', ttp: 'Chamkarmon / TTP', tk: 'Toul Kork', ph: 'Peng Huoth / Chbar Ampov', any: 'Any Prime District' };
    state.locLabel = locNames[loc] || 'Phnom Penh';
    card = renderStep4(state);
  } else if (data === 'srch_back_to_step3') {
    card = renderStep3(state);
  } else if (data.startsWith('srch_step4_')) {
    const bgKey = data.replace('srch_step4_', '');
    state.budget = bgKey;
    const bgLabels = {
      rent_b1: 'Under $500/mo', rent_b2: '$500–$800/mo', rent_b3: '$800–$1,500/mo', rent_b4: '$1,500+/mo',
      sale_b1: 'Under $70k USD', sale_b2: '$70k–$120k USD', sale_b3: '$120k–$250k USD', sale_b4: '$250k+ USD'
    };
    state.budgetLabel = bgLabels[bgKey] || 'Budget Profile';
    card = renderStep5(state);
  } else if (data === 'srch_back_to_step4') {
    card = renderStep4(state);
  } else if (data.startsWith('srch_step5_')) {
    const pur = data.replace('srch_step5_', '');
    state.purpose = pur;
    state.page = 1;
    card = renderResultsCard(state, 1);
  } else if (data.startsWith('srch_page_')) {
    const pg = parseInt(data.replace('srch_page_', ''), 10) || 1;
    state.page = pg;
    card = renderResultsCard(state, pg);
  }

  if (card) {
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: card.text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: card.reply_markup
      })
    }).catch(async () => {
      // If edit fails (e.g. text identical), send new message
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: card.text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: card.reply_markup
        })
      });
    });
  }
}

function handleSearchCommand(chatId, botToken) {
  const card = renderStep1();
  userSearchState[chatId] = { type: 'Sale', page: 1 };
  return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: card.text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: card.reply_markup
    })
  });
}

module.exports = {
  isSearchCallback,
  handleSearchCallback,
  handleSearchCommand,
  renderStep1,
  renderStep2,
  renderStep3,
  renderStep4,
  renderStep5,
  renderResultsCard,
  filterInventory
};
