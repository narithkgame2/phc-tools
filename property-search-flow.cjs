// ═══════════════════════════════════════════════════════════════
//  PHC LUXURY PROPERTY SEARCH CONCIERGE (v2.0)
//  Minimal, Premium, Aligned with Website Filters
//  Status (Off-Plan vs Resale) -> Type -> Location -> Budget
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const INVENTORY_FILE = path.join(__dirname, 'data', 'multi-channel-inventory.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'chat-tree-config.json');
const userSearchState = {};

function getTreeConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    // fallback
  }
  return null;
}

function getStepDef(stepId, defaultDef) {
  const cfg = getTreeConfig();
  if (cfg && cfg.steps && cfg.steps[stepId]) {
    const s = cfg.steps[stepId];
    const header = s.header || 'SEARCH CONCIERGE';
    const label = s.stepLabel || defaultDef.stepLabel;
    const prompt = s.prompt || defaultDef.prompt;
    const text = `<b>${header}</b>\n──────────\n<b>${label}</b>\n\n${prompt}`;
    
    let inline_keyboard = [];
    if (Array.isArray(s.buttons) && s.buttons.length > 0) {
      if (s.layout === '2_per_row') {
        for (let i = 0; i < s.buttons.length; i += 2) {
          const row = [{ text: s.buttons[i].label, callback_data: s.buttons[i].callback || s.buttons[i].callback_data }];
          if (s.buttons[i + 1]) {
            row.push({ text: s.buttons[i + 1].label, callback_data: s.buttons[i + 1].callback || s.buttons[i + 1].callback_data });
          }
          inline_keyboard.push(row);
        }
      } else {
        for (const b of s.buttons) {
          inline_keyboard.push([{ text: b.label, callback_data: b.callback || b.callback_data }]);
        }
      }
    } else {
      inline_keyboard = defaultDef.reply_markup.inline_keyboard;
    }

    if (Array.isArray(s.fullWidthButtons)) {
      for (const b of s.fullWidthButtons) {
        inline_keyboard.push([{ text: b.label, callback_data: b.callback || b.callback_data }]);
      }
    }

    if (s.backButton) {
      inline_keyboard.push([{ text: s.backButton.label, callback_data: s.backButton.callback || s.backButton.callback_data }]);
    }

    return { text, reply_markup: { inline_keyboard } };
  }
  return defaultDef;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeUtf8(str) {
  if (!str) return '';
  const s = typeof str.toWellFormed === 'function' ? str.toWellFormed() : String(str);
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/g, '')
    .normalize('NFC')
    .trim();
}

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
  const defaultDef = {
    stepLabel: 'Step 1 of 4 · Objective',
    prompt: 'Are you looking to acquire or rent a property in Phnom Penh?',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏢 Buy Property', callback_data: 'srch_step1_sale' }],
        [{ text: '🔑 Rent a Home', callback_data: 'srch_step1_rent' }]
      ]
    }
  };
  return getStepDef('step1_objective', defaultDef);
}

// ── STEP 2: STATUS (FOR SALE) OR PROPERTY TYPE (FOR RENT) ─────
function renderStep2(state) {
  const isRent = state.type === 'Rent';

  if (!isRent) {
    // Buy -> Choose Status (Full-width un-truncatable pills)
    const defaultDef = {
      stepLabel: 'Step 2 of 4 · Property Status (Buy)',
      prompt: 'Select your preferred development status:',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏗️ Off-Plan (New Developments)', callback_data: 'srch_status_offplan' }],
          [{ text: '🔑 Resale (Ready to Move-In)', callback_data: 'srch_status_resale' }],
          [{ text: '🌐 Any Status (Show All)', callback_data: 'srch_status_any' }],
          [{ text: '⬅️ Back to Objective', callback_data: 'srch_step0_start' }]
        ]
      }
    };
    return getStepDef('step2_buy_status', defaultDef);
  }

  // Rent -> Choose Property Type
  const defaultDef = {
    stepLabel: 'Step 2 of 4 · Property Type (Rent)',
    prompt: 'Which property type best fits your lifestyle?',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🏢 Modern Condo', callback_data: 'srch_type_condo' },
          { text: '🛋️ Serviced Apt', callback_data: 'srch_type_apt' }
        ],
        [
          { text: '🏡 Villa / House', callback_data: 'srch_type_villa' },
          { text: '🌐 Any Property Type', callback_data: 'srch_type_any' }
        ],
        [
          { text: '⬅️ Back to Objective', callback_data: 'srch_step0_start' }
        ]
      ]
    }
  };
  return getStepDef('step2_rent_type', defaultDef);
}

// ── STEP 3: TYPE (FOR BUY) OR LOCATION (FOR RENT) ─────────────
function renderStep3(state) {
  const isRent = state.type === 'Rent';

  if (!isRent) {
    // Buy Step 3: Property Type
    const defaultDef = {
      stepLabel: 'Step 3 of 4 · Property Type',
      prompt: 'Which category do you want to invest in?',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🏢 Modern Condo', callback_data: 'srch_type_condo' },
            { text: '🛋️ Serviced Apt', callback_data: 'srch_type_apt' }
          ],
          [
            { text: '🏡 Villa / Borey', callback_data: 'srch_type_villa' },
            { text: '🌐 Any Property Type', callback_data: 'srch_type_any' }
          ],
          [
            { text: '⬅️ Back to Status', callback_data: 'srch_back_to_step2' }
          ]
        ]
      }
    };
    return getStepDef('step3_buy_type', defaultDef);
  }

  // Rent Step 3: Location
  return renderLocationStep(state);
}

// ── STEP 4: LOCATION (FOR BUY) OR BUDGET (FOR RENT) ───────────
function renderStep4(state) {
  const isRent = state.type === 'Rent';

  if (!isRent) {
    // Buy Step 4: Location
    return renderLocationStep(state);
  }

  // Rent Step 4: Budget
  return renderBudgetStep(state);
}

// ── STEP 5: BUDGET (FOR BUY) ──────────────────────────────────
function renderStep5(state) {
  return renderBudgetStep(state);
}

// ── HELPER: LOCATION SELECTOR (CLEAN BALANCED GRID) ───────────
function renderLocationStep(state) {
  const stepNum = state.type === 'Rent' ? '3 of 4' : '4 of 5';
  const defaultDef = {
    stepLabel: `Step ${stepNum} · Prime District`,
    prompt: 'Select your preferred location in Phnom Penh:',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📍 BKK1', callback_data: 'srch_loc_bkk1' },
          { text: '📍 Tonle Bassac', callback_data: 'srch_loc_tb' }
        ],
        [
          { text: '📍 Toul Kork', callback_data: 'srch_loc_tk' },
          { text: '📍 Chamkarmon', callback_data: 'srch_loc_ttp' }
        ],
        [
          { text: '📍 Chroy Changvar', callback_data: 'srch_loc_ph' },
          { text: '📍 Peng Huoth', callback_data: 'srch_loc_ph' }
        ],
        [
          { text: '🌐 Any Prime District', callback_data: 'srch_loc_any' }
        ],
        [
          { text: '⬅️ Back', callback_data: state.type === 'Rent' ? 'srch_back_to_step2' : 'srch_back_to_step3' }
        ]
      ]
    }
  };
  const res = getStepDef('location_districts', defaultDef);
  const backCallback = state.type === 'Rent' ? 'srch_back_to_step2' : 'srch_back_to_step3';
  if (res.reply_markup?.inline_keyboard) {
    const lastRow = res.reply_markup.inline_keyboard[res.reply_markup.inline_keyboard.length - 1];
    if (lastRow && lastRow[0]?.text?.includes('Back')) {
      lastRow[0].callback_data = backCallback;
    } else {
      res.reply_markup.inline_keyboard.push([{ text: '⬅️ Back', callback_data: backCallback }]);
    }
  }
  return res;
}

// ── HELPER: BUDGET SELECTOR (FULL-WIDTH READABLE BUTTONS) ──────
function renderBudgetStep(state) {
  const isRent = state.type === 'Rent';
  const stepNum = isRent ? '4 of 4' : '5 of 5';
  const stepKey = isRent ? 'budget_rent' : 'budget_buy';

  const defaultRentDef = {
    stepLabel: `Step ${stepNum} · Monthly Budget (Rent)`,
    prompt: 'Select your target monthly budget:',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💵 Under $600 / month', callback_data: 'srch_bg_rent_1' }],
        [{ text: '💵 $600 – $1,200 / month', callback_data: 'srch_bg_rent_2' }],
        [{ text: '💵 $1,200 – $2,500 / month', callback_data: 'srch_bg_rent_3' }],
        [{ text: '💵 $2,500+ / month (Luxury)', callback_data: 'srch_bg_rent_4' }],
        [{ text: '🌐 Any Budget', callback_data: 'srch_bg_rent_any' }],
        [{ text: '⬅️ Back to District', callback_data: 'srch_back_to_loc' }]
      ]
    }
  };

  const defaultBuyDef = {
    stepLabel: `Step ${stepNum} · Target Budget (Buy)`,
    prompt: 'Select your acquisition budget bracket:',
    reply_markup: {
      inline_keyboard: [
        [{ text: '💰 Under $100,000 USD', callback_data: 'srch_bg_sale_1' }],
        [{ text: '💰 $100,000 – $200,000 USD', callback_data: 'srch_bg_sale_2' }],
        [{ text: '💰 $200,000 – $500,000 USD', callback_data: 'srch_bg_sale_3' }],
        [{ text: '💰 $500,000+ USD (Prime Luxury)', callback_data: 'srch_bg_sale_4' }],
        [{ text: '🌐 Any Budget', callback_data: 'srch_bg_sale_any' }],
        [{ text: '⬅️ Back to District', callback_data: 'srch_back_to_loc' }]
      ]
    }
  };

  const res = getStepDef(stepKey, isRent ? defaultRentDef : defaultBuyDef);
  const hasBack = res.reply_markup?.inline_keyboard?.some(row => row.some(b => b.text?.includes('Back')));
  if (!hasBack && res.reply_markup?.inline_keyboard) {
    res.reply_markup.inline_keyboard.push([{ text: '⬅️ Back to District', callback_data: 'srch_back_to_loc' }]);
  }
  return res;
}

// ── FILTER INVENTORY ──────────────────────────────────────────
function filterInventory(state) {
  const listings = getInventory();
  const isRent = state.type === 'Rent';

  let matches = listings.filter(l => l.type.toLowerCase() === state.type.toLowerCase());

  // 1. Status Filter (Off-Plan vs Resale for Buy)
  if (!isRent && state.status && state.status !== 'any') {
    const isOffPlanTarget = state.status === 'offplan';
    const statusFiltered = matches.filter(l => {
      const text = `${l.title} ${l.snippet}`.toLowerCase();
      const isOffPlan = /off-plan|under-construction|handover|completion|installment|payment plan|time square|j tower|odom|le conde|picasso|diamond bay/i.test(text);
      return isOffPlanTarget ? isOffPlan : !isOffPlan;
    });
    if (statusFiltered.length > 0) {
      matches = statusFiltered;
    }
  }

  // 2. Location Filter
  if (state.location && state.location !== 'any') {
    const locMap = {
      bkk1: ['bkk1', 'bkk 1', 'boeung keng kang 1', 'bkk'],
      tb: ['tonle bassac', 'bassac', 'aeon'],
      ttp: ['chamkarmon', 'toul tompoung', 'russian market', 'ttp', 'tumpun'],
      tk: ['toul kork', 'boeng kak', 'sen sok'],
      ph: ['peng huoth', 'beoung snor', 'boeung snor', 'chbar ampov', 'chroy changvar', 'national road 1']
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

  // 3. Property Type Filter
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

  // 4. Budget Filter
  if (state.budget && state.budget !== 'any') {
    let minP = 0;
    let maxP = Infinity;
    if (isRent) {
      if (state.budget === 'rent_1') { minP = 0; maxP = 600; }
      else if (state.budget === 'rent_2') { minP = 550; maxP = 1250; }
      else if (state.budget === 'rent_3') { minP = 1150; maxP = 2600; }
      else if (state.budget === 'rent_4') { minP = 2400; maxP = 25000; }
    } else {
      if (state.budget === 'sale_1') { minP = 0; maxP = 105000; }
      else if (state.budget === 'sale_2') { minP = 95000; maxP = 210000; }
      else if (state.budget === 'sale_3') { minP = 190000; maxP = 520000; }
      else if (state.budget === 'sale_4') { minP = 480000; maxP = 10000000; }
    }
    const budgetFiltered = matches.filter(l => !l.price || (l.price >= minP && l.price <= maxP));
    if (budgetFiltered.length > 0) {
      matches = budgetFiltered;
    }
  }

  return matches;
}

// ── RENDER RESULTS CARD (ANCHORING FRAMEWORK) ─────────────────
function renderResultsCard(state, page = 1) {
  const allMatches = filterInventory(state);
  const pageSize = 3;
  const startIndex = (page - 1) * pageSize;
  const rawBatch = allMatches.slice(startIndex, startIndex + pageSize);
  const totalCount = allMatches.length;

  const isRent = state.type === 'Rent';
  const statusStr = state.statusLabel ? `${state.statusLabel} · ` : '';
  const filterSummary = `${statusStr}${state.type} · ${state.propTypeLabel || 'All Types'} · ${state.locLabel || 'All Districts'}`;

  let text = 
    `<b>SEARCH CONCIERGE</b>\n` +
    `──────────\n` +
    `<b>Comparative Portfolio (${totalCount} Matches)</b>\n` +
    `<i>${escapeHtml(filterSummary)}</i>\n\n`;

  if (rawBatch.length === 0) {
    text += `<blockquote>No exact listings match this filter combination in our active catalog right now. Contact Nick directly for off-market units.</blockquote>\n\n`;
  } else {
    // Apply PHC 3-Property Anchoring Framework
    // If 3 items in batch, sort by price and frame as:
    // 1. ⭐️ Top Recommendation (Sweet Spot)
    // 2. ⚓ Premier Benchmark (Luxury Anchor)
    // 3. 💡 Smart Value (Agile Alternative)
    const cfg = getTreeConfig();
    const anchorCfg = cfg?.steps?.anchoring_framework;
    let framedItems = [];
    if (rawBatch.length === 3) {
      const sorted = [...rawBatch].sort((a, b) => (a.price || 0) - (b.price || 0));
      framedItems = [
        {
          badge: anchorCfg?.sweetSpot?.badge || '⭐️ TOP RECOMMENDATION · Sweet Spot',
          item: sorted[1],
          rationale: anchorCfg?.sweetSpot?.rationale || 'Best value balance of layout, usable floor area, and pricing.'
        },
        {
          badge: anchorCfg?.luxuryAnchor?.badge || '⚓ PREMIER BENCHMARK · Luxury Anchor',
          item: sorted[2],
          rationale: anchorCfg?.luxuryAnchor?.rationale || 'Higher-tier specification establishing the quality benchmark.'
        },
        {
          badge: anchorCfg?.smartValue?.badge || '💡 SMART VALUE · Agile Alternative',
          item: sorted[0],
          rationale: anchorCfg?.smartValue?.rationale || 'Lowest entry price point while retaining prime location access.'
        }
      ];
    } else {
      framedItems = rawBatch.map((item, idx) => ({
        badge: idx === 0 ? '⭐️ RECOMMENDED OPTION' : `💡 COMPARATIVE OPTION ${idx + 1}`,
        item,
        rationale: 'Matches your selected district, property type, and budget target.'
      }));
    }

    framedItems.forEach((f) => {
      const m = f.item;
      const snippet = sanitizeUtf8(m.snippet || '');

      // 1. Extract Real Building/Project Name from snippet or title
      let building = '';
      const bldgMatch = snippet.match(/📍\s*([^·|\n🏷]+)/);
      if (bldgMatch) {
        building = bldgMatch[1].trim();
      }

      if (!building || building.length < 3 || /phnom penh|chamkarmon|toul kork|bkk/i.test(building)) {
        let t = (m.title || '').replace(/^(#Newlisting|#ForSale|#ForRent)\s*/iu, '').trim();
        if (!/ខុនដូ|អាផាតមិន|វីឡា|condo for sale|for rent/i.test(t)) {
          building = t.split('·')[0].split('|')[0].trim();
        }
      }

      if (!building) {
        building = m.location ? `${m.location} Residence` : 'Phnom Penh Property';
      }

      building = building.replace(/^[\p{Extended_Pictographic}\p{Emoji}\p{Symbol}\s]+/u, '').trim();

      // 2. Extract Specs (Floor, Size, Bed, Bath)
      const floorM = snippet.match(/(\d+(?:st|nd|rd|th)(?:\s*floor)?|Ground-Floor)/i);
      const floor = floorM ? floorM[1] : '';

      const sizeM = snippet.match(/(\d+(?:\.\d+)?\s*(?:m²|sqm))/i);
      const size = sizeM ? sizeM[1].replace(/sqm/i, 'm²') : '';

      const bedM = snippet.match(/(\d+)\s*🛏/);
      const bathM = snippet.match(/(\d+)\s*🛁/);
      const beds = bedM ? `${bedM[1]} Bed` : (m.beds || '');
      const baths = bathM ? `${bathM[1]} Bath` : '';

      const specsLine = [floor, size, beds, baths].filter(Boolean).join(' · ');

      const priceClean = (m.priceFormatted && !m.priceFormatted.startsWith('/mo') && m.priceFormatted !== 'Inquire')
        ? m.priceFormatted
        : (m.price ? (isRent ? `$${m.price.toLocaleString()}/mo` : `$${m.price.toLocaleString()} USD`) : 'Inquire');

      text += 
        `<blockquote><b>${f.badge}</b>\n` +
        `🏢 <b>${escapeHtml(building)}</b>\n` +
        `▫️ <b>Price:</b> <b>${escapeHtml(priceClean)}</b>\n` +
        (specsLine ? `▫️ <b>Specs:</b> ${escapeHtml(specsLine)}\n` : '') +
        `📍 <i>${escapeHtml(m.location || 'Phnom Penh')}</i>\n` +
        `💡 <i>Why this fits: ${f.rationale}</i>\n` +
        `🔗 <a href="${escapeHtml(m.link)}">View Photos & Channel Post ↗</a></blockquote>\n\n`;
    });
  }

  const keyboard = [];

  // Pagination row (if > 3 matches)
  const hasNext = startIndex + pageSize < totalCount;
  const hasPrev = page > 1;
  const navRow = [];
  if (hasPrev) {
    navRow.push({ text: '⬅️ Previous 3', callback_data: `srch_pg_${page - 1}` });
  }
  if (hasNext) {
    navRow.push({ text: '📂 Next 3 Listings ❯', callback_data: `srch_pg_${page + 1}` });
  }
  if (navRow.length > 0) {
    keyboard.push(navRow);
  }

  // Action Buttons: Clean, minimal, non-confusing
  keyboard.push([
    { text: '💬 Inquire with Nick Directly', url: 'https://t.me/Nick_REAKH' }
  ]);
  keyboard.push([
    { text: '🔄 Refine Filters', callback_data: 'srch_step0_start' },
    { text: '🌐 Website Catalog ↗', url: 'https://propertyhubcambodia.com/properties' }
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
    card = renderStep2(state);
  } else if (data === 'srch_step1_rent' || data === 'lead_flow_rent') {
    state.type = 'Rent';
    card = renderStep2(state);
  } else if (data.startsWith('srch_status_')) {
    const st = data.replace('srch_status_', '');
    state.status = st;
    const stLabels = { offplan: 'Off-Plan', resale: 'Resale', any: 'All' };
    state.statusLabel = stLabels[st] || 'All';
    card = renderStep3(state);
  } else if (data === 'srch_back_to_step2') {
    card = renderStep2(state);
  } else if (data.startsWith('srch_type_')) {
    const pt = data.replace('srch_type_', '');
    state.propType = pt;
    const ptLabels = { condo: 'Condo', apt: 'Serviced Apt', villa: 'Villa / Borey', any: 'All Types' };
    state.propTypeLabel = ptLabels[pt] || 'All Types';
    card = state.type === 'Rent' ? renderStep3(state) : renderStep4(state);
  } else if (data === 'srch_back_to_step3') {
    card = renderStep3(state);
  } else if (data.startsWith('srch_loc_')) {
    const loc = data.replace('srch_loc_', '');
    state.location = loc;
    const locLabels = { bkk1: 'BKK1', tb: 'Tonle Bassac', tk: 'Toul Kork', ttp: 'Chamkarmon', ph: 'Peng Huoth / Chroy Changvar', any: 'All Districts' };
    state.locLabel = locLabels[loc] || 'All Districts';
    card = state.type === 'Rent' ? renderStep4(state) : renderStep5(state);
  } else if (data === 'srch_back_to_loc') {
    card = state.type === 'Rent' ? renderStep3(state) : renderStep4(state);
  } else if (data.startsWith('srch_bg_')) {
    const bg = data.replace('srch_bg_', '');
    state.budget = bg;
    state.page = 1;
    card = renderResultsCard(state, 1);
  } else if (data.startsWith('srch_pg_')) {
    const pg = parseInt(data.replace('srch_pg_', ''), 10) || 1;
    state.page = pg;
    card = renderResultsCard(state, pg);
  }

  if (card) {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
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
    });

    const resJson = await res.json().catch(() => ({}));
    if (!resJson.ok) {
      console.error('⚠️ [Telegram editMessageText Error]:', resJson.description);
      // Fallback: Send new message without parse_mode if entity error
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: card.text.replace(/<[^>]+>/g, ''), // strip tags if parse error
          disable_web_page_preview: true,
          reply_markup: card.reply_markup
        })
      });
    }
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
