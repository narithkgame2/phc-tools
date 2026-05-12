// ═══════════════════════════════════════════════════════════════
//  PHC CRM — Google Apps Script API
//  Sheets: Tasks | Leads | Clients | Deals
//
//  HOW TO DEPLOY:
//  1. Open your PHC CRM Google Sheet
//  2. Extensions → Apps Script → paste this entire file
//  3. Run initializeAll() once (creates + formats all four tabs)
//  4. Deploy → New Deployment → Web App
//     • Execute as: Me
//     • Who has access: Anyone
//  5. Copy the Web App URL → paste into each tool's settings
// ═══════════════════════════════════════════════════════════════

const SHEET_HEADERS = {
  Tasks: [
    'id', 'name', 'status', 'priority', 'category',
    'due', 'assignees', 'memo', 'link', 'createdAt', 'updatedAt'
  ],
  Leads: [
    'id', 'createdAt', 'updatedAt', 'fullName', 'nationality',
    'phone', 'telegram', 'email', 'source', 'budget', 'timeline',
    'interestedIn', 'stage', 'score', 'agent', 'notes',
    'lastContact', 'followUpDate', 'followUpAction', 'activities'
  ],
  Clients: [
    'id', 'createdAt', 'updatedAt', 'name', 'nat',
    'telegram', 'phone', 'project', 'unit', 'floor',
    'bookingDate', 'spa', 'titleStatus', 'payDay', 'payAmount',
    'payTotal', 'payMade', 'bank', 'status', 'notes'
  ],
  Deals: [
    'id', 'createdAt', 'updatedAt', 'closedDate', 'clientName',
    'project', 'unit', 'salePrice', 'commissionRate', 'commissionTotal',
    'nickPct', 'monikaPct', 'rezaPct', 'nickAmt', 'monikaAmt', 'rezaAmt',
    'agent', 'notes'
  ]
};

// ── HTTP entry points ────────────────────────────────────────────

function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.action === 'ping')   return respond({ ok: true, ts: new Date().toISOString() });
    if (p.action === 'getAll') return respond(getAllRows(p.sheet || 'Tasks'));
    return respond({ error: 'Unknown action: ' + p.action });
  } catch (err) {
    return respond({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const body  = JSON.parse(e.postData.contents);
    const sheet = body.sheet || 'Tasks';
    if (body.action === 'insert') return respond(insertRow(sheet, body.data));
    if (body.action === 'update') return respond(updateRow(sheet, body.id, body.data));
    if (body.action === 'delete') return respond(deleteRow(sheet, body.id));
    return respond({ error: 'Unknown action: ' + body.action });
  } catch (err) {
    return respond({ error: err.toString() });
  }
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Sheet helpers ────────────────────────────────────────────────

function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    const headers = SHEET_HEADERS[name];
    if (headers) {
      const lastCol = headers.length;
      sheet.getRange(1, 1, 1, lastCol).setValues([headers]);
      sheet.getRange(1, 1, 1, lastCol)
        .setBackground('#083467')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setFontSize(10);
      sheet.setFrozenRows(1);
      // Banding — column letter from count (works for ≤26 columns)
      const lastColLetter = String.fromCharCode(64 + lastCol);
      sheet.getRange('A2:' + lastColLetter + '1000')
        .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    }
  }
  return sheet;
}

// ── CRUD (generic) ───────────────────────────────────────────────

function getAllRows(sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1)
    .filter(row => row[0] !== '' && row[0] !== null && row[0] !== undefined)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const v = row[i];
        obj[h] = (v instanceof Date)
          ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')
          : (v === null || v === undefined ? '' : String(v));
      });
      return obj;
    });
}

function insertRow(sheetName, data) {
  if (!data || !data.id) return { error: 'Missing id' };
  const headers = SHEET_HEADERS[sheetName];
  if (!headers) return { error: 'Unknown sheet: ' + sheetName };
  const sheet = getOrCreateSheet(sheetName);
  const now = new Date().toISOString();
  data.createdAt = data.createdAt || now;
  data.updatedAt = now;
  const row = headers.map(h => {
    const v = data[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v); // arrays → JSON string
    return v;
  });
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateRow(sheetName, id, data) {
  if (!id) return { error: 'Missing id' };
  const headers = SHEET_HEADERS[sheetName];
  if (!headers) return { error: 'Unknown sheet: ' + sheetName };
  const sheet   = getOrCreateSheet(sheetName);
  const allData = sheet.getDataRange().getValues();
  const sheetHdrs = allData[0];
  const idIdx = sheetHdrs.indexOf('id');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]) === String(id)) {
      data.updatedAt = new Date().toISOString();
      const updatedRow = sheetHdrs.map((h, colIdx) => {
        if (data[h] !== undefined && data[h] !== null) {
          const v = data[h];
          return typeof v === 'object' ? JSON.stringify(v) : v;
        }
        return allData[i][colIdx];
      });
      sheet.getRange(i + 1, 1, 1, sheetHdrs.length).setValues([updatedRow]);
      return { success: true };
    }
  }
  return { error: 'Row not found: ' + id };
}

function deleteRow(sheetName, id) {
  if (!id) return { error: 'Missing id' };
  const sheet   = getOrCreateSheet(sheetName);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx   = headers.indexOf('id');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Row not found: ' + id };
}

// ── Backward-compatible aliases (Task Manager v4 still works) ────

function getTasksSheet() { return getOrCreateSheet('Tasks'); }
function getAllTasks()    { return getAllRows('Tasks'); }
function insertTask(d)   { return insertRow('Tasks', d); }
function updateTask(id, d) { return updateRow('Tasks', id, d); }
function deleteTask(id)  { return deleteRow('Tasks', id); }

// ── One-time setup ────────────────────────────────────────────────

/**
 * Run this ONCE from the Apps Script editor after pasting.
 * Creates and formats Tasks, Leads, and Clients tabs.
 */
function initializeAll() {
  ['Tasks', 'Leads', 'Clients', 'Deals'].forEach(name => {
    const sheet = getOrCreateSheet(name);
    Logger.log('✅ ' + name + ' ready — rows: ' + sheet.getLastRow());
  });
}

// Alias so old initializeTasks() calls still work
function initializeTasks() { initializeAll(); }

// ── Schema migration ──────────────────────────────────────────────

/**
 * Run once after adding 'telegram' to Leads SHEET_HEADERS.
 * Inserts the new column after 'phone' without destroying existing data.
 */
function migrateLeadsSchema() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Leads');
  if (!sheet) { Logger.log('❌ Leads sheet not found'); return; }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headers.includes('telegram')) {
    Logger.log('✅ telegram column already exists — no migration needed');
    return;
  }

  const phoneIdx = headers.indexOf('phone'); // 0-based
  if (phoneIdx === -1) { Logger.log('❌ phone column not found'); return; }

  // Insert blank column after phone (Sheets column = 1-based, so +2)
  sheet.insertColumnAfter(phoneIdx + 1);
  sheet.getRange(1, phoneIdx + 2).setValue('telegram');

  // Re-apply header style to the new cell
  sheet.getRange(1, phoneIdx + 2)
    .setBackground('#083467')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(10);

  Logger.log('✅ telegram column added to Leads at position ' + (phoneIdx + 2));
}
