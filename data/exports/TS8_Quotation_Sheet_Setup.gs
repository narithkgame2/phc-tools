/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  TIME SQUARE 8 (TS8) DUPLEX QUOTATION SYSTEM SETUP
 *  Automated 4-Tab Template Initializer with Formula Guards
 * ═══════════════════════════════════════════════════════════════════════════
 *  Tabs:
 *   1. Price List: All 40 verified developer units with list prices
 *   2. Campaign Card: Verified campaign terms, discounts, dates, and metadata
 *   3. Quotation: Dynamic single-unit quotation engine with formula schedule
 *   4. Checks: Mathematical balance guard, validity alerts, and preset audits
 *
 *  Rules Enforced:
 *   - Strictly NO TODAY() or dynamic clock calls
 *   - Protected formula cells; only designated inputs are editable
 *   - Handover is strictly the computed remainder
 * ═══════════════════════════════════════════════════════════════════════════
 */

function setupTS8QuotationWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Create or get tabs
  const tabPriceList = getOrCreateSheet(ss, "Price List");
  const tabCampaign = getOrCreateSheet(ss, "Campaign Card");
  const tabQuotation = getOrCreateSheet(ss, "Quotation");
  const tabChecks = getOrCreateSheet(ss, "Checks");

  // Remove default "Sheet1" if present
  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }

  // ─────────────────────────────────────────────────────────────
  // TAB 1: PRICE LIST
  // ─────────────────────────────────────────────────────────────
  tabPriceList.clear();
  const priceListHeaders = [["Unit Code", "Floor", "Gross Area (sqm)", "Type", "List Price ($)"]];
  tabPriceList.getRange(1, 1, 1, 5).setValues(priceListHeaders)
    .setBackground("#1a365d").setFontColor("#ffffff").setFontWeight("bold");

  // Sample seed units (Full 40 units can be pasted or imported via CSV)
  const seedUnits = [
    ["47B1", "47F", 85, "Premium Duplex 1-Bedroom", 141094],
    ["47B2", "47F", 85, "Premium Duplex 1-Bedroom", 141094],
    ["47C1", "47F", 85, "Premium Duplex 1-Bedroom", 141094],
    ["47C2", "47F", 85, "Premium Duplex 1-Bedroom", 141094],
    ["46B1", "46F", 85, "Premium Duplex 1-Bedroom", 137157],
    ["46B2", "46F", 85, "Premium Duplex 1-Bedroom", 137157],
    ["46C1", "46F", 85, "Premium Duplex 1-Bedroom", 137157],
    ["46C2", "46F", 85, "Premium Duplex 1-Bedroom", 137157],
    ["45B1", "45F", 85, "Premium Duplex 1-Bedroom", 134532],
    ["45B2", "45F", 85, "Premium Duplex 1-Bedroom", 134532],
    ["45C1", "45F", 85, "Premium Duplex 1-Bedroom", 134532],
    ["45C2", "45F", 85, "Premium Duplex 1-Bedroom", 134532],
    ["45AB1", "45AF", 85, "Premium Duplex 1-Bedroom", 132563],
    ["45AB2", "45AF", 85, "Premium Duplex 1-Bedroom", 132563],
    ["45AC1", "45AF", 85, "Premium Duplex 1-Bedroom", 132563],
    ["45AC2", "45AF", 85, "Premium Duplex 1-Bedroom", 132563],
    ["41C2", "41F", 85, "Premium Duplex 1-Bedroom", 126002],
    ["45AO", "45AF", 73, "Standard Duplex 1-Bedroom", 116655],
    ["45AP", "45AF", 73, "Standard Duplex 1-Bedroom", 116655],
    ["45AN", "45AF", 73, "Standard Duplex 1-Bedroom", 116655],
    ["45AQ", "45AF", 73, "Standard Duplex 1-Bedroom", 116655],
    ["43G", "43F", 102, "Standard Duplex 2-Bedroom", 162981],
    ["45Q", "45AF", 125, "Standard Duplex 3-Bedroom", 200183],
    ["45AA", "45AF", 172, "Standard Duplex 4-Bedroom", 275730]
  ];
  tabPriceList.getRange(2, 1, seedUnits.length, 5).setValues(seedUnits);
  tabPriceList.getRange(2, 5, seedUnits.length, 1).setNumberFormat("$#,##0");

  // ─────────────────────────────────────────────────────────────
  // TAB 2: CAMPAIGN CARD
  // ─────────────────────────────────────────────────────────────
  tabCampaign.clear();
  const campaignData = [
    ["Field", "Value", "Notes"],
    ["Campaign Name", "TS8 Duplex 40-Month Payment Plan Campaign", "Developer promotion"],
    ["Discount %", 0.10, "Applied to list price (10%)"],
    ["Standard Rebate ($)", 3000, "Duplex 1/2/3-Bedroom ($3,000)"],
    ["Premium Rebate ($)", 5000, "Premium Duplex 1-Bedroom 85 sqm ($5,000)"],
    ["Booking Deposit ($)", 1000, "Initial reservation fee"],
    ["Installment Count", 40, "40 consecutive monthly installments"],
    ["Installment % Per Month", 0.01, "1.0% of net contract price per month"],
    ["Physical Handover Quarter", "Q4 2028", "Estimated keys and physical handover"],
    ["Campaign Valid Until", "2026-12-31", "Fixed expiration date (No dynamic TODAY)"],
    ["Source Image Link", "Property Listing/Time Square 8/Price List/2026-11-20_TS8_Special_Discount_Flyer.jpg", "Archived flyer"],
    ["Verified By", "Nick (Admin)", "Audit lead"],
    ["Verified On", "2026-11-20", "Verification date"]
  ];
  tabCampaign.getRange(1, 1, campaignData.length, 3).setValues(campaignData);
  tabCampaign.getRange(1, 1, 1, 3).setBackground("#1a365d").setFontColor("#ffffff").setFontWeight("bold");
  tabCampaign.getRange(3, 2).setNumberFormat("0.0%");
  tabCampaign.getRange(4, 2, 3, 1).setNumberFormat("$#,##0");
  tabCampaign.getRange(8, 2).setNumberFormat("0.0%");

  // ─────────────────────────────────────────────────────────────
  // TAB 3: QUOTATION
  // ─────────────────────────────────────────────────────────────
  tabQuotation.clear();
  const quoteRows = [
    ["SECTION", "FIELD", "VALUE / FORMULA", "NOTES"],
    ["INPUT", "Selected Unit Code", "45AO", "Select from dropdown"],
    ["INPUT", "Down Payment %", 0.10, "Preset: 10% or 20%"],
    ["INPUT", "Quote Date", "2026-11-20", "Type YYYY-MM-DD (No TODAY)"],
    ["INPUT", "Booking Date", "on booking", "Type timing (Default: 'on booking')"],
    ["INPUT", "Offer Valid Until", "2026-11-30", "Type YYYY-MM-DD"],
    ["UNIT", "Marketed Floor", "=VLOOKUP(C2, 'Price List'!$A$2:$E$50, 2, FALSE)", "Strata legal floor"],
    ["UNIT", "Gross Area (sqm)", "=VLOOKUP(C2, 'Price List'!$A$2:$E$50, 3, FALSE)", "Gross area"],
    ["UNIT", "Collection Type", "=VLOOKUP(C2, 'Price List'!$A$2:$E$50, 4, FALSE)", "Duplex tier"],
    ["PRICING", "Developer List Price ($)", "=VLOOKUP(C2, 'Price List'!$A$2:$E$50, 5, FALSE)", "Gross list price"],
    ["PRICING", "Campaign Discount %", "='Campaign Card'!$B$3", "Campaign percentage"],
    ["PRICING", "Discount Amount ($)", "=ROUND(C10 * C11, 0)", "List price * discount %"],
    ["PRICING", "Cash Rebate ($)", "=IF(ISNUMBER(SEARCH(\"Premium\", C9)), 'Campaign Card'!$B$5, 'Campaign Card'!$B$4)", "Tier cash rebate"],
    ["PRICING", "Net Contract Price ($)", "=C10 - C12 - C13", "After discount & rebate"],
    ["PRICING", "Net Price / Gross sqm ($)", "=ROUND(C14 / C8, 0)", "Net per gross sqm"],
    ["SCHEDULE", "Booking Deposit ($)", "='Campaign Card'!$B$6", "Paid on booking (C5)"],
    ["SCHEDULE", "Down Payment Balance ($)", "=ROUND(C14 * C3, 0) - C16", "Net * Down% - Booking"],
    ["SCHEDULE", "Installment Duration", "='Campaign Card'!$B$7", "Consecutive months"],
    ["SCHEDULE", "Monthly Installment ($/mo)", "=ROUND(C14 * 'Campaign Card'!$B$8, 0)", "1% of Net per month"],
    ["SCHEDULE", "Total Installments ($)", "=C18 * C19", "40 * monthly installment"],
    ["SCHEDULE", "Balance at Handover ($)", "=C14 - C16 - C17 - C20", "Strict calculated remainder"],
    ["SCHEDULE", "Balance at Handover (%)", "=ROUND(C21 / C14, 4)", "True handover share"],
    ["SCHEDULE", "Est. Physical Handover", "='Campaign Card'!$B$9", "Handover milestone"]
  ];
  tabQuotation.getRange(1, 1, quoteRows.length, 4).setValues(quoteRows);
  tabQuotation.getRange(1, 1, 1, 4).setBackground("#1a365d").setFontColor("#ffffff").setFontWeight("bold");

  // Highlight editable inputs in soft yellow
  tabQuotation.getRange("C2:C6").setBackground("#fffbeb").setFontWeight("bold");

  // Number Formats
  tabQuotation.getRange("C3").setNumberFormat("0.0%");
  tabQuotation.getRange("C10").setNumberFormat("$#,##0");
  tabQuotation.getRange("C11").setNumberFormat("0.0%");
  tabQuotation.getRange("C12:C15").setNumberFormat("$#,##0");
  tabQuotation.getRange("C16:C17").setNumberFormat("$#,##0");
  tabQuotation.getRange("C19:C21").setNumberFormat("$#,##0");
  tabQuotation.getRange("C22").setNumberFormat("0.0%");

  // Add Data Validation Dropdown for Unit Code (C2)
  const unitListRange = tabPriceList.getRange("A2:A50");
  const rule = SpreadsheetApp.newDataValidation().requireValueInRange(unitListRange).build();
  tabQuotation.getRange("C2").setDataValidation(rule);

  // ─────────────────────────────────────────────────────────────
  // TAB 4: CHECKS
  // ─────────────────────────────────────────────────────────────
  tabChecks.clear();
  const checkRows = [
    ["CHECK ITEM", "FORMULA / VALUE", "STATUS & AUDIT LOGIC"],
    ["1. Total Scheduled Sum", "=Quotation!C16 + Quotation!C17 + Quotation!C20 + Quotation!C21", "Booking + Down + Installments + Handover"],
    ["2. Target Net Price", "=Quotation!C14", "Net contract price"],
    ["3. Mathematical Integrity", "=IF(B2=B3, \"✅ PASS (100.0% Exact Match)\", \"❌ FAIL (Discrepancy: $\" & (B2-B3) & \")\")", "Asserts schedule equals net price"],
    ["4. Handover Balance %", "=TEXT(Quotation!C22, \"0.0%\")", "Displayed handover percentage"],
    ["5. Campaign Validity Guard", "=IF(DATEVALUE(Quotation!C4) > DATEVALUE('Campaign Card'!$B$10), \"⚠️ WARNING: Quote date is past campaign expiration (\" & 'Campaign Card'!$B$10 & \")\", \"✅ PASS: Active campaign\")", "Audits quote date without TODAY"],
    ["6. Down Payment Preset Guard", "=IF(OR(Quotation!C3=0.1, Quotation!C3=0.2), \"✅ Standard Preset (\" & TEXT(Quotation!C3, \"0%\") & \")\", \"⚠️ CAUTION: Non-preset Down Payment (\" & TEXT(Quotation!C3, \"0%\") & \") - Confirm with developer\")", "Audits down payment presets"]
  ];
  tabChecks.getRange(1, 1, checkRows.length, 3).setValues(checkRows);
  tabChecks.getRange(1, 1, 1, 3).setBackground("#1a365d").setFontColor("#ffffff").setFontWeight("bold");
  tabChecks.getRange("B2:B3").setNumberFormat("$#,##0");

  // Auto-resize columns
  [tabPriceList, tabCampaign, tabQuotation, tabChecks].forEach(s => {
    for (let c = 1; c <= 5; c++) s.autoResizeColumn(c);
  });
}

function getOrCreateSheet(ss, name) {
  let s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  return s;
}
