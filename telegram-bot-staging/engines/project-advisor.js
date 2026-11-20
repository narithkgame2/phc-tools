// ═══════════════════════════════════════════════════════════════
//  PHC DEVELOPER & PROJECT INTELLIGENCE ENGINE (v2.0)
//  Verified Pilot: Time Square 7 (TK) — Off-Plan Duplex Analysis
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = fs.existsSync(path.join(__dirname, 'data', 'projects'))
  ? path.join(__dirname, 'data', 'projects')
  : path.join(__dirname, '..', 'data', 'projects');

function loadProject(projectId) {
  const filePath = path.join(PROJECTS_DIR, `${projectId}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Project ${projectId} not found in ${PROJECTS_DIR}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveProject(project) {
  const filePath = path.join(PROJECTS_DIR, `${project.projectId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf8');
}

/**
 * Escapes characters for Telegram HTML parse_mode
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Formats floor number with proper ordinal suffix (38th, 41st, 42nd, 43rd, 45AF)
 */
function formatFloorLabel(floor, floorLabel) {
  if (floorLabel) return floorLabel;
  const num = Number(floor);
  if (isNaN(num)) return String(floor);
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;
  return `${num}th`;
}

/**
 * Finds a unit by unit code (case-insensitive, trimmed)
 */
function findUnit(project, unitCode) {
  if (!unitCode) return null;
  const normalized = String(unitCode).trim().toUpperCase();
  for (const t of project.unitTypes || []) {
    const found = (t.availableUnits || []).find(u => u.unitCode.trim().toUpperCase() === normalized);
    if (found) return found;
  }
  return null;
}

/**
 * Checks if a unit has an outer perimeter orientation
 */
function isOuterPerimeter(project, unit) {
  if (unit.isOuter !== undefined) return Boolean(unit.isOuter);
  const duplexType = project.unitTypes[0];
  const outerCols = duplexType.orientationGuide?.outerUnits || ['B1', 'C1', 'D1', 'E1'];
  return outerCols.includes(unit.column);
}

/**
 * Calculates payment plan breakdown with promotion discounts and parameters
 * @param {Object} project
 * @param {Object} unit
 * @param {Object} [options]
 * @param {number} [options.downPaymentPercent] - e.g. 10 or 20 (defaults to promo plan)
 * @param {number} [options.discountPercent] - custom discount %
 * @param {number} [options.cashRebateUsd] - custom cash rebate $
 * @param {string} [options.bookingDate] - defaults to 'on booking'
 * @param {string} [options.roundingRule] - 'round_whole' (default) or 'exact_cents'
 */
function calculatePaymentPlan(project, unit, options = {}) {
  // Support legacy signature where options was customPromo object
  const promo = (options && options.standardPaymentPlan) ? options : (project.activePromotion || {});
  const listPrice = unit.listPrice;
  const grossAreaSqm = Number(unit.grossAreaSqm) || Number(project.unitTypes[0]?.grossAreaSqm) || 65.0;

  // Separate inputs for discount and rebate
  const discountPercent = options.discountPercent !== undefined 
    ? options.discountPercent 
    : (unit.discountPercent !== undefined ? unit.discountPercent : (promo.discountPercent || 0));
  
  const cashRebateUsd = options.cashRebateUsd !== undefined 
    ? options.cashRebateUsd 
    : (unit.cashRebateUsd !== undefined ? unit.cashRebateUsd : (promo.cashRebateUsd || 0));

  // 1. Calculate discount and net price
  const discountAmount = Math.round(listPrice * (discountPercent / 100));
  const afterDiscount = listPrice - discountAmount;
  const hasCustomPricing = options.discountPercent !== undefined || options.cashRebateUsd !== undefined;
  const netPrice = (hasCustomPricing || !unit.netPrice) 
    ? (afterDiscount - cashRebateUsd) 
    : unit.netPrice;

  // 2. Schedule breakdown & Down payment parameter
  const plan = promo.standardPaymentPlan || {};
  const downPaymentPercent = options.downPaymentPercent !== undefined 
    ? options.downPaymentPercent 
    : (plan.downPaymentPercent || 10);
  
  const bookingDeposit = options.bookingDepositUsd !== undefined 
    ? options.bookingDepositUsd 
    : (plan.bookingDepositUsd || 1000);

  const durationMonths = options.durationMonths || plan.constructionDurationMonths || 40;
  const monthlyPercent = plan.constructionInstallmentPercentPerMonth || 1;
  const roundingRule = options.roundingRule || 'round_whole';

  const downPaymentTotal = Math.round(netPrice * (downPaymentPercent / 100));
  const downPaymentDue = downPaymentTotal - bookingDeposit;

  let monthlyInstallment = 0;
  if (roundingRule === 'exact_cents') {
    monthlyInstallment = Number((netPrice * (monthlyPercent / 100)).toFixed(2));
  } else {
    monthlyInstallment = Math.round(netPrice * (monthlyPercent / 100));
  }
  const totalInstallments = monthlyInstallment * durationMonths;

  // 3. Handover balance is ALWAYS the exact calculated remainder
  const handoverBalance = netPrice - bookingDeposit - downPaymentDue - totalInstallments;
  const handoverPercent = Number(((handoverBalance / netPrice) * 100).toFixed(1));

  // 4. Verification flag when down payment is not standard 10%
  const isStandardDownPayment = downPaymentPercent === 10;
  const developerConfirmationFlag = isStandardDownPayment 
    ? null 
    : `confirm with developer: terms at ${downPaymentPercent}% down payment subject to developer reconfirmation`;

  return {
    unitCode: unit.unitCode,
    floor: unit.floor,
    floorLabel: unit.floorLabel || `${unit.floor}F`,
    column: unit.column,
    orientation: unit.orientation,
    isOuter: isOuterPerimeter(project, unit),
    grossAreaSqm,
    listPrice,
    discountPercent,
    discountAmount,
    cashRebateUsd,
    netPrice,
    pricePerSqmNet: Math.round(netPrice / grossAreaSqm),
    downPaymentPercent,
    developerConfirmationFlag,
    roundingRule,
    bookingDate: options.bookingDate || 'on booking',
    schedule: {
      bookingDeposit,
      downPaymentDue,
      downPaymentTotal,
      downPaymentPercent,
      monthlyInstallment,
      durationMonths,
      totalInstallments,
      handoverBalance,
      handoverPercent
    },
    provenance: project.provenance || null
  };
}

/**
 * Recommends the best available unit matching budget and orientation
 */
function findBestUnit(projectId, options = {}) {
  const project = loadProject(projectId);
  const allUnits = (project.unitTypes || []).flatMap(t => t.availableUnits || []);
  let available = allUnits.filter(u => u.status === 'available');

  if (options.bedrooms) {
    const bedFiltered = available.filter(u => u.bedrooms === options.bedrooms);
    if (bedFiltered.length > 0) available = bedFiltered;
  }

  if (available.length === 0) {
    return {
      success: false,
      error: 'No units currently available in this project.',
      totalAvailable: 0
    };
  }

  let budgetMatched = true;
  let candidates = available;

  if (options.maxBudget) {
    const budgetFiltered = available.filter(u => u.netPrice <= options.maxBudget);
    if (budgetFiltered.length > 0) {
      candidates = budgetFiltered;
    } else {
      budgetMatched = false;
      // Sort available units by price to find the lowest entry
      candidates = [...available].sort((a, b) => a.netPrice - b.netPrice);
    }
  }

  // Sort candidates:
  // 1. If preferOuter is specified, prioritize outer units
  // 2. Otherwise prioritize Outer first, then lowest price
  candidates.sort((a, b) => {
    const aOuter = isOuterPerimeter(project, a) ? 1 : 0;
    const bOuter = isOuterPerimeter(project, b) ? 1 : 0;
    if (aOuter !== bOuter) return bOuter - aOuter;
    return a.netPrice - b.netPrice;
  });

  const bestUnit = candidates[0];
  const calculation = calculatePaymentPlan(project, bestUnit);

  return {
    success: true,
    project,
    bestUnit,
    calculation,
    totalAvailable: available.length,
    budgetMatched,
    requestedBudget: options.maxBudget || null,
    budgetVariance: options.maxBudget && !budgetMatched ? bestUnit.netPrice - options.maxBudget : 0,
    alternativeOptions: candidates.slice(1, 4)
  };
}

/**
 * Finds nearest alternative units when a specific unit is sold or unavailable.
 * Proximity metric:
 * 1. Same orientation tier (outer vs inner)
 * 2. Floor distance |u.floor - target.floor|
 * 3. Stack/column match (e.g. C1 if available)
 * 4. Price proximity
 */
function findNearestAlternative(projectId, targetUnit, options = {}) {
  const project = loadProject(projectId);
  const allUnits = (project.unitTypes || []).flatMap(t => t.availableUnits || []);
  const available = allUnits.filter(u => u.status === 'available');

  if (available.length === 0) {
    return {
      success: false,
      error: 'All duplex units in this project are currently marked as sold.',
      totalAvailable: 0
    };
  }

  const targetFloor = Number(targetUnit.floor);
  const targetIsOuter = isOuterPerimeter(project, targetUnit);
  const targetCol = targetUnit.column;

  const scored = available.map(u => {
    const uOuter = isOuterPerimeter(project, u);
    const floorDiff = Math.abs(Number(u.floor) - targetFloor);
    const sameOrientation = uOuter === targetIsOuter;
    const sameCol = u.column === targetCol;
    const priceDiff = Math.abs(u.netPrice - targetUnit.netPrice);

    return {
      unit: u,
      floorDiff,
      sameOrientation,
      sameCol,
      priceDiff
    };
  });

  scored.sort((a, b) => {
    // 1. Same orientation tier preferred
    if (a.sameOrientation !== b.sameOrientation) return b.sameOrientation ? 1 : -1;
    // 2. Nearest floor distance (e.g. 1 floor away beats 4 floors away)
    if (a.floorDiff !== b.floorDiff) return a.floorDiff - b.floorDiff;
    // 3. Same column / stack preferred
    if (a.sameCol !== b.sameCol) return b.sameCol ? 1 : -1;
    // 4. Lowest price difference
    return a.priceDiff - b.priceDiff;
  });

  const bestAlt = scored[0].unit;
  const calculation = calculatePaymentPlan(project, bestAlt);

  return {
    success: true,
    targetUnit,
    bestUnit: bestAlt,
    calculation,
    floorDifference: Math.abs(Number(bestAlt.floor) - targetFloor),
    sameColumn: bestAlt.column === targetCol,
    totalAvailable: available.length,
    alternativeOptions: scored.slice(1, 4).map(s => s.unit)
  };
}

/**
 * Marks a unit as sold with audit logging and returns nearest alternative
 */
function markUnitSold(projectId, unitCode, actor = 'Nick') {
  const project = loadProject(projectId);
  const target = findUnit(project, unitCode);

  if (!target) {
    return {
      success: false,
      error: `Unit "${unitCode}" was not found in project ${projectId}.`
    };
  }

  if (target.status === 'sold') {
    return {
      success: false,
      alreadySold: true,
      error: `Unit ${target.unitCode} is already marked as SOLD.`,
      targetUnit: target,
      nextBestRecommendation: findNearestAlternative(projectId, target)
    };
  }

  const previousStatus = target.status || 'available';
  target.status = 'sold';
  target.soldAt = new Date().toISOString();
  
  project.auditLog = project.auditLog || [];
  project.auditLog.push({
    action: 'mark_sold',
    who: actor,
    when: new Date().toISOString(),
    unitCode: target.unitCode,
    previousStatus
  });

  saveProject(project);

  const nextBest = findNearestAlternative(projectId, target);
  return {
    success: true,
    message: `Unit ${target.unitCode} has been marked as SOLD.`,
    soldUnit: target,
    nextBestRecommendation: nextBest,
    auditLog: project.auditLog[project.auditLog.length - 1]
  };
}

/**
 * Reverts a sold unit back to available with audit logging
 */
function undoUnitSold(projectId, unitCode, actor = 'Nick') {
  const project = loadProject(projectId);
  const target = findUnit(project, unitCode);

  if (!target) {
    return {
      success: false,
      error: `Unit "${unitCode}" was not found in project ${projectId}.`
    };
  }

  const previousStatus = target.status || 'sold';
  target.status = 'available';
  delete target.soldAt;

  project.auditLog = project.auditLog || [];
  project.auditLog.push({
    action: 'undo_sold',
    who: actor,
    when: new Date().toISOString(),
    unitCode: target.unitCode,
    previousStatus
  });

  saveProject(project);

  return {
    success: true,
    message: `Unit ${target.unitCode} status reverted to Available.`,
    unit: target,
    auditLog: project.auditLog[project.auditLog.length - 1]
  };
}

/**
 * Formats a verified, compliant Telegram client proposal card
 */
function formatProposalCard(analysis) {
  const { project, calculation, bestUnit, budgetMatched, requestedBudget, budgetVariance } = analysis;
  const s = calculation.schedule;
  const isOuter = calculation.isOuter;

  // 1.4 Advisor Notes: Plan-based visible facts only. If none, output no note.
  let advisorNote = '';
  if (bestUnit.planNote) {
    advisorNote = bestUnit.planNote;
  } else if (isOuter === false) {
    advisorNote = 'Faces the internal courtyard void per floor plan.';
  } else if (isOuter === true) {
    advisorNote = 'Perimeter unit facing outward per floor plan.';
  }

  let budgetWarning = '';
  if (budgetMatched === false && requestedBudget) {
    budgetWarning = `⚠️ <b>Budget Advisory:</b> No units are currently available within the $${requestedBudget.toLocaleString()} USD budget. The entry unit shown below is $${budgetVariance.toLocaleString()} USD above target.\n\n`;
  }

  // 1.3 Floor label: Display developer marketing floor directly without adding confusion
  const floorDisplay = bestUnit.floorLabel || bestUnit.floor;
  const sizeNum = calculation.grossAreaSqm;
  const listPrice = bestUnit.listPrice.toLocaleString();
  const netPrice = calculation.netPrice.toLocaleString();
  const pricePerSqm = calculation.pricePerSqmNet.toLocaleString();

  let discountStr = `${calculation.discountPercent || 10}%`;
  if (calculation.cashRebateUsd && calculation.cashRebateUsd > 0) {
    discountStr = `${calculation.discountPercent || 10}% + $${calculation.cashRebateUsd.toLocaleString()} Rebate`;
  }

  const booking = s.bookingDeposit.toLocaleString();
  // 1.2 Booking date: editable field, defaults to 'on booking'
  const bookingDateText = calculation.bookingDate || 'on booking';
  const downPayment = s.downPaymentDue.toLocaleString();
  const downPaymentPercent = s.downPaymentPercent || 10;
  const monthly = s.monthlyInstallment.toLocaleString();
  const duration = s.durationMonths;
  const totalInstallments = s.totalInstallments.toLocaleString();
  
  // 1.1 Balance at handover: computed remainder with true %
  const handoverPercent = s.handoverPercent;
  const handoverBalance = s.handoverBalance.toLocaleString();
  const handoverDate = project.projectDetails?.handover || 'Q4 2028';
  
  // 1.5 Last confirmed with developer date field
  const confirmedDate = project.provenance?.priceListDate || '2026-11-20';
  const roundingDisplay = calculation.roundingRule === 'exact_cents' ? 'Exact cents' : 'Rounded whole dollar';

  let devFlag = '';
  if (calculation.developerConfirmationFlag) {
    devFlag = `\n⚠️ <i>${escapeHtml(calculation.developerConfirmationFlag)}</i>\n`;
  }

  let advisorSection = '';
  if (advisorNote) {
    advisorSection = `\n▫️ <i>Advisor Note: ${escapeHtml(advisorNote)}</i>`;
  }

  // 4.3 Standard Risk & Due Diligence Profile
  const titleType = project.projectDetails?.titleType || 'Foreign Freehold Strata Title';
  const foreignQuota = project.projectDetails?.foreignQuotaRemaining || 'Available (Within 70% statutory quota)';
  const completionDate = project.projectDetails?.handover || 'Q4 2028';
  const developerRecord = project.projectDetails?.developerTrackRecord || 'Megakim World Corp: Completed Time Square 1, 2, 3, 5, 6, 7';

  // Fields without verified data print strictly "To be confirmed"
  const netYield = 'To be confirmed';
  const cgtImpact = 'To be confirmed';
  const exitLiquidity = 'To be confirmed';

  const riskSection = `\n\n⸻\n\n` +
    `<b>Due Diligence & Risk Profile</b>\n\n` +
    `• <b>Title Type:</b> ${escapeHtml(titleType)}\n` +
    `• <b>Foreign Quota Remaining:</b> ${escapeHtml(foreignQuota)}\n` +
    `• <b>Completion Date:</b> ${escapeHtml(completionDate)}\n` +
    `• <b>Developer Delivery Record:</b> ${escapeHtml(developerRecord)}\n` +
    `• <b>Net Yield:</b> ${netYield}\n` +
    `• <b>CGT Impact:</b> ${cgtImpact}\n` +
    `• <b>Exit Liquidity:</b> ${exitLiquidity}`;

  // 4.4 Closing execution requirements
  const closingSection = `\n\n⸻\n\n` +
    `<b>Contract Execution Details</b>\n\n` +
    `▫️ <i>The developer requires hand-signed original agreements.</i>\n\n` +
    `• <b>Booking Receipt:</b> $${booking} USD (Pending receipt confirmation)\n` +
    `• <b>Developer Beneficiary:</b> Megakim World Corp (⚠️ verify before sending: account name must match developer entity)\n` +
    `• <b>Countersigning Party:</b> Developer authorized signatory\n` +
    `• <b>Courier Tracking:</b> Pending dispatch / DHL tracking to be attached`;

  return (
    budgetWarning +
    `<b>Property Details:</b>\n\n` +
    `<b>${escapeHtml(project.name)} · Unit ${escapeHtml(bestUnit.unitCode)}</b>\n\n` +
    `<blockquote><b>Unit Details</b>\n\n` +
    `• <b>Unit:</b> ${escapeHtml(bestUnit.unitCode)}\n` +
    `• <b>Floor:</b> ${escapeHtml(String(floorDisplay))}\n` +
    `• <b>Size:</b> ${sizeNum} sqm Gross\n` +
    `• <b>Original Price:</b> $${listPrice}\n` +
    `• <b>Discount:</b> ${escapeHtml(discountStr)}\n` +
    `• <b>Final Price:</b> $${netPrice} ($${pricePerSqm} / sqm)\n` +
    `• <b>Status:</b> ${bestUnit.status === 'available' ? 'Available' : 'Sold'} (Last confirmed with developer: ${escapeHtml(confirmedDate)})\n\n` +
    `⸻\n\n` +
    `<b>Payment Schedule</b>\n\n` +
    `• <b>Booking:</b> $${booking} (${escapeHtml(bookingDateText)})\n` +
    `• <b>Down Payment (${downPaymentPercent}%):</b> $${downPayment}\n` +
    `• <b>Installments (${duration} months):</b> $${monthly} / mo ($${totalInstallments})\n` +
    `• <b>Balance at handover (${handoverPercent}%):</b> $${handoverBalance} (Est. ${escapeHtml(handoverDate)})\n` +
    `• <b>Interest:</b> 0%\n` +
    `• <b>Rounding Active:</b> ${roundingDisplay}` +
    devFlag +
    advisorSection +
    riskSection +
    closingSection +
    `</blockquote>`
  );
}

/**
 * Formats an inventory overview menu showing all available units ordered by lowest price
 */
function formatInventoryMenu(projectId) {
  const project = loadProject(projectId);
  const pName = escapeHtml(project.name.toUpperCase());
  const handover = escapeHtml(project.projectDetails?.handover || 'Q4 2028');
  const promo = project.activePromotion;
  const duration = promo.standardPaymentPlan?.constructionDurationMonths || 40;
  const handoverPct = promo.standardPaymentPlan?.handoverBalancePercent || 50;

  const premAvail = (project.unitTypes[0]?.availableUnits || []).filter(u => u.status === 'available');
  premAvail.sort((a, b) => a.netPrice - b.netPrice);

  const stdAvail = (project.unitTypes[1]?.availableUnits || []).filter(u => u.status === 'available');
  const b1Avail = stdAvail.filter(u => u.bedrooms === 1).sort((a, b) => a.netPrice - b.netPrice);
  const b2Avail = stdAvail.filter(u => u.bedrooms === 2).sort((a, b) => a.netPrice - b.netPrice);
  const b3Avail = stdAvail.filter(u => u.bedrooms === 3).sort((a, b) => a.netPrice - b.netPrice);
  const b4Avail = stdAvail.filter(u => u.bedrooms === 4).sort((a, b) => a.netPrice - b.netPrice);

  let text = `🏢 <b>${pName} · DUPLEX PRICE LIST</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<blockquote>▫️ <b>Campaign:</b> ${duration} Months @ 1%/mo · ${handoverPct}% Handover\n` +
    `▫️ <b>Handover:</b> ${handover} · ${project.projectDetails.floors} Storeys\n` +
    `▫️ <b>Location:</b> Boeng Trabaek, Chamkar Mon (Russian Market area)</blockquote>\n\n` +
    `📋 <b>AVAILABLE COLLECTIONS (LOWEST PRICE FIRST):</b>\n\n`;

  const categories = [
    { num: '①', label: 'Duplex 1-Bed (73 to 79 sqm)', tag: 'Lowest Project Entry', list: b1Avail },
    { num: '②', label: 'Premium Duplex 1-Bed (85 sqm)', tag: 'High Floor Special', list: premAvail },
    { num: '③', label: 'Duplex 2-Bed (104 to 112 sqm)', tag: 'Family Layout', list: b2Avail },
    { num: '④', label: 'Duplex 3-Bed (124 sqm)', tag: 'Executive Residence', list: b3Avail },
    { num: '⑤', label: 'Duplex 4-Bed (173 sqm)', tag: 'Top Penthouse Floor', list: b4Avail }
  ];

  categories.forEach(c => {
    if (c.list.length === 0) return;
    const lowest = c.list[0];
    const minP = lowest.netPrice;
    const minMonthly = Math.round(minP * 0.01);
    const sqmPrice = Math.round(minP / lowest.grossAreaSqm);

    text += `<blockquote>${c.num} <b>${escapeHtml(c.label)}</b> · <i>${escapeHtml(c.tag)}</i>\n` +
      `▫️ <b>Lowest Entry:</b> <b>$${minP.toLocaleString()} USD</b> ($${sqmPrice.toLocaleString()} / sqm)\n` +
      `▫️ <b>Monthly:</b> <b>$${minMonthly.toLocaleString()} / mo</b> (${duration} Months)\n` +
      `▫️ <b>Lead Unit:</b> <code>${escapeHtml(lowest.unitCode)}</code> · ${c.list.length} unit${c.list.length > 1 ? 's' : ''} available</blockquote>\n\n`;
  });

  text += `💡 <i>Tap any button below to view all units in that collection or send any unit code directly (e.g. <code>42B1</code>, <code>45AO</code>, <code>43G</code>, <code>46R</code>).</i>\n\n` +
    `📋 <i>Verified Developer Price List: ${escapeHtml(project.provenance?.priceListDate || '2026-11-20')}</i>`;

  return text;
}

module.exports = {
  loadProject,
  saveProject,
  escapeHtml,
  formatFloorLabel,
  findUnit,
  isOuterPerimeter,
  calculatePaymentPlan,
  findBestUnit,
  findNearestAlternative,
  markUnitSold,
  undoUnitSold,
  formatProposalCard,
  formatInventoryMenu
};

if (require.main === module) {
  console.log("--- Testing Project Advisor Engine v2.0 ---");
  const result = findBestUnit('time-square-7', { maxBudget: 85000 });
  console.log(formatProposalCard(result));
}
