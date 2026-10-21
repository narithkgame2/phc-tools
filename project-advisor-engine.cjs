// ═══════════════════════════════════════════════════════════════
//  PHC DEVELOPER & PROJECT INTELLIGENCE ENGINE (v2.0)
//  Verified Pilot: Time Square 7 (TK) — Off-Plan Duplex Analysis
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = path.join(__dirname, 'data', 'projects');

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
  const duplexType = project.unitTypes[0];
  return duplexType.availableUnits.find(u => u.unitCode.trim().toUpperCase() === normalized) || null;
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
 * Calculates payment plan breakdown with promotion discounts
 */
function calculatePaymentPlan(project, unit, customPromo = null) {
  const promo = customPromo || project.activePromotion;
  const listPrice = unit.listPrice;
  const grossAreaSqm = Number(unit.grossAreaSqm) || Number(project.unitTypes[0]?.grossAreaSqm) || 65.0;

  // 1. Calculate discount
  const discountAmount = Math.round(listPrice * (promo.discountPercent / 100));
  const afterDiscount = listPrice - discountAmount;
  const netPrice = afterDiscount - (promo.cashRebateUsd || 0);

  // 2. Schedule breakdown
  const plan = promo.standardPaymentPlan;
  const bookingDeposit = plan.bookingDepositUsd;
  const downPaymentTotal = Math.round(netPrice * (plan.downPaymentPercent / 100));
  const downPaymentDue = downPaymentTotal - bookingDeposit;

  const monthlyPercent = plan.constructionInstallmentPercentPerMonth;
  const durationMonths = plan.constructionDurationMonths;
  const monthlyInstallment = Math.round(netPrice * (monthlyPercent / 100));
  const totalInstallments = monthlyInstallment * durationMonths;

  const handoverBalance = netPrice - bookingDeposit - downPaymentDue - totalInstallments;
  const handoverPercent = Number(((handoverBalance / netPrice) * 100).toFixed(1));

  return {
    unitCode: unit.unitCode,
    floor: unit.floor,
    floorLabel: unit.floorLabel || `${unit.floor}F`,
    column: unit.column,
    orientation: unit.orientation,
    isOuter: isOuterPerimeter(project, unit),
    grossAreaSqm,
    listPrice,
    discountPercent: promo.discountPercent,
    discountAmount,
    cashRebateUsd: promo.cashRebateUsd,
    netPrice,
    pricePerSqmNet: Math.round(netPrice / grossAreaSqm),
    schedule: {
      bookingDeposit,
      downPaymentDue,
      downPaymentTotal,
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
  const duplexType = project.unitTypes[0];
  const available = duplexType.availableUnits.filter(u => u.status === 'available');

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
  const duplexType = project.unitTypes[0];
  const available = duplexType.availableUnits.filter(u => u.status === 'available');

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
 * Marks a unit as sold with validation and returns nearest alternative
 */
function markUnitSold(projectId, unitCode) {
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

  target.status = 'sold';
  target.soldAt = new Date().toISOString();
  saveProject(project);

  const nextBest = findNearestAlternative(projectId, target);
  return {
    success: true,
    message: `Unit ${target.unitCode} has been marked as SOLD.`,
    soldUnit: target,
    nextBestRecommendation: nextBest
  };
}

/**
 * Formats a verified, compliant Telegram client proposal card
 */
function formatProposalCard(analysis) {
  const { project, calculation, bestUnit, budgetMatched, requestedBudget, budgetVariance } = analysis;
  const s = calculation.schedule;
  const floorHeader = formatFloorLabel(bestUnit.floor, bestUnit.floorLabel);
  const isOuter = calculation.isOuter;

  let brokerInsight = '';
  if (isOuter) {
    brokerInsight = `▫️ <b>Advisor Insight:</b> Unit ${escapeHtml(bestUnit.unitCode)} is positioned on the outer perimeter, offering unobstructed city skyline views and maximum natural daylight.`;
  } else {
    brokerInsight = `▫️ <b>Advisor Insight:</b> Unit ${escapeHtml(bestUnit.unitCode)} faces the internal courtyard atrium sky garden, offering a quiet, temperature-buffered residence.`;
  }

  let budgetWarning = '';
  if (budgetMatched === false && requestedBudget) {
    budgetWarning = `⚠️ <b>Budget Advisory:</b> No units are currently available within the $${requestedBudget.toLocaleString()} USD budget. The entry unit shown below is $${budgetVariance.toLocaleString()} USD above target.\n\n`;
  }

  const provenanceNote = calculation.provenance?.priceListDate
    ? `\n📋 <i>Verified Developer Price List: ${escapeHtml(calculation.provenance.priceListDate)}</i>`
    : '';

  return (
    `🏢 <b>${escapeHtml(project.name.toUpperCase())} · ${escapeHtml(floorHeader)} DUPLEX PROPOSAL</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    budgetWarning +
    `▫️ <b>Unit Number:</b> ${escapeHtml(bestUnit.unitCode)} (${escapeHtml(floorHeader)})\n` +
    `▫️ <b>Layout:</b> 1-Bed Duplex Loft · Double-Height Void\n` +
    `▫️ <b>Size:</b> ${calculation.grossAreaSqm} sqm Gross Area\n` +
    `▫️ <b>Orientation:</b> ${escapeHtml(bestUnit.orientation)}\n` +
    `▫️ <b>Developer List Price:</b> $${bestUnit.listPrice.toLocaleString()} USD\n` +
    `🔥 <b>Promotional Net Price:</b> <b>$${calculation.netPrice.toLocaleString()} USD</b>\n` +
    `▫️ <b>Price / sqm:</b> $${calculation.pricePerSqmNet.toLocaleString()} / sqm Gross\n\n` +
    `💳 <b>36-MONTH DEVELOPER PAYMENT SCHEDULE:</b>\n` +
    `1. <b>Booking Deposit:</b> $${s.bookingDeposit.toLocaleString()} USD\n` +
    `2. <b>Down Payment (10%):</b> $${s.downPaymentDue.toLocaleString()} USD (Contract signing within 14 days)\n` +
    `3. <b>Monthly Installments:</b> <b>$${s.monthlyInstallment.toLocaleString()} / month</b> (Months 1 – ${s.durationMonths})\n` +
    `4. <b>Handover Balance (${s.handoverPercent}%):</b> $${s.handoverBalance.toLocaleString()} USD (Handover ${escapeHtml(project.projectDetails.handover)})\n\n` +
    brokerInsight +
    provenanceNote
  );
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
  formatProposalCard
};

if (require.main === module) {
  console.log("--- Testing Project Advisor Engine v2.0 ---");
  const result = findBestUnit('time-square-7', { maxBudget: 85000 });
  console.log(formatProposalCard(result));
}
