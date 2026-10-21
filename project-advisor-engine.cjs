// ═══════════════════════════════════════════════════════════════
//  PHC DEVELOPER & PROJECT INTELLIGENCE ENGINE
//  Pilot: Time Square 7 (TK) — Off-Plan Duplex Analysis
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
 * Calculates payment plan breakdown with promotion discounts
 */
function calculatePaymentPlan(project, unit, customPromo = null) {
  const promo = customPromo || project.activePromotion;
  const listPrice = unit.listPrice;

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
  const handoverPercent = ((handoverBalance / netPrice) * 100).toFixed(1);

  return {
    unitCode: unit.unitCode,
    floor: unit.floor,
    column: unit.column,
    orientation: unit.orientation,
    grossAreaSqm: 65.0,
    listPrice,
    discountPercent: promo.discountPercent,
    discountAmount,
    cashRebateUsd: promo.cashRebateUsd,
    netPrice,
    pricePerSqmNet: Math.round(netPrice / 65.0),
    schedule: {
      bookingDeposit,
      downPaymentDue,
      downPaymentTotal,
      monthlyInstallment,
      durationMonths,
      totalInstallments,
      handoverBalance,
      handoverPercent
    }
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
    return { error: 'No units currently available in this project.' };
  }

  // Filter by budget if provided
  let candidates = available;
  if (options.maxBudget) {
    candidates = candidates.filter(u => u.netPrice <= options.maxBudget);
  }

  if (candidates.length === 0) {
    // If none under budget, get the lowest priced available unit
    candidates = available;
  }

  // Sort: prioritize Outer View first, then lowest price
  candidates.sort((a, b) => {
    const aIsOuter = a.orientation.includes('Outer') ? 1 : 0;
    const bIsOuter = b.orientation.includes('Outer') ? 1 : 0;
    if (aIsOuter !== bIsOuter) return bIsOuter - aIsOuter;
    return a.netPrice - b.netPrice;
  });

  const bestUnit = candidates[0];
  const calculation = calculatePaymentPlan(project, bestUnit);

  return {
    project,
    bestUnit,
    calculation,
    totalAvailable: available.length,
    alternativeOptions: candidates.slice(1, 4)
  };
}

/**
 * Marks a unit as sold and immediately recommends the next best available
 */
function markUnitSold(projectId, unitCode) {
  const project = loadProject(projectId);
  const duplexType = project.unitTypes[0];
  const target = duplexType.availableUnits.find(u => u.unitCode === unitCode);

  if (!target) {
    return { error: `Unit ${unitCode} was not found in project ${projectId}.` };
  }

  target.status = 'sold';
  saveProject(project);

  // Return the new best alternative
  const nextBest = findBestUnit(projectId);
  return {
    success: true,
    message: `Unit ${unitCode} has been marked as SOLD.`,
    nextBestRecommendation: nextBest
  };
}

/**
 * Formats a clean Telegram client proposal card
 */
function formatProposalCard(analysis) {
  const { project, calculation, bestUnit } = analysis;
  const s = calculation.schedule;

  return (
    `🏢 <b>${project.name.toUpperCase()} · ${bestUnit.floor}TH FLOOR DUPLEX OPPORTUNITY</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `▫️ <b>Unit Number:</b> ${bestUnit.unitCode} (Floor ${bestUnit.floor})\n` +
    `▫️ <b>Layout:</b> 1-Bed Duplex Loft · 3.0m Double-Height Void\n` +
    `▫️ <b>Size:</b> ${calculation.grossAreaSqm} sqm Gross Area\n` +
    `▫️ <b>Orientation:</b> 🌟 ${bestUnit.orientation}\n` +
    `▫️ <b>Developer List Price:</b> $${bestUnit.listPrice.toLocaleString()} USD\n` +
    `🔥 <b>Special Net Price:</b> <b>$${calculation.netPrice.toLocaleString()} USD</b>\n` +
    `▫️ <b>Price / sqm:</b> $${calculation.pricePerSqmNet.toLocaleString()} / sqm Gross\n\n` +
    `💳 <b>EASY 36-MONTH DEVELOPER PAYMENT SCHEDULE:</b>\n` +
    `1. <b>Booking Deposit:</b> $${s.bookingDeposit.toLocaleString()} USD\n` +
    `2. <b>Down Payment (10%):</b> $${s.downPaymentDue.toLocaleString()} USD (Contract signing within 14 days)\n` +
    `3. <b>Monthly Installments:</b> <b>$${s.monthlyInstallment.toLocaleString()} / month</b> (Months 1 – ${s.durationMonths})\n` +
    `4. <b>Handover Balloon (${s.handoverPercent}%):</b> $${s.handoverBalance.toLocaleString()} USD (Handover ${project.projectDetails.handover} / Bank Loan Eligible)\n\n` +
    `💡 <b>Broker Advantage:</b> Unit ${bestUnit.unitCode} is situated on the outer perimeter with unobstructed panoramic open city views, providing maximum rental appeal and capital appreciation.`
  );
}

module.exports = {
  loadProject,
  saveProject,
  findBestUnit,
  calculatePaymentPlan,
  markUnitSold,
  formatProposalCard
};

if (require.main === module) {
  console.log("--- Testing Project Advisor Engine ---");
  const result = findBestUnit('time-square-7', { maxBudget: 85000 });
  console.log(formatProposalCard(result));
}
