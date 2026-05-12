// ═══════════════════════════════════════════════════════════════
//  PHC Task Manager — Google Apps Script API
//  Spreadsheet: PHC CRM  |  Sheet: Tasks
//
//  HOW TO DEPLOY:
//  1. Open your PHC CRM Google Sheet
//  2. Extensions → Apps Script → paste this entire file
//  3. Run initializeTasks() once (to create & format the Tasks tab)
//  4. Deploy → New Deployment → Web App
//     • Execute as: Me
//     • Who has access: Anyone
//  5. Copy the Web App URL → paste into the Task Manager settings
// ═══════════════════════════════════════════════════════════════

const TASKS_HEADERS = [
  'id', 'name', 'status', 'priority', 'category',
  'due', 'assignees', 'memo', 'link', 'createdAt', 'updatedAt'
];

// ── HTTP entry points ────────────────────────────────────────────

function doGet(e) {
  try {
    const p = e.parameter || {};
    if (p.action === 'ping')   return respond({ ok: true, ts: new Date().toISOString() });
    if (p.action === 'getAll') return respond(getAllTasks());
    return respond({ error: 'Unknown action: ' + p.action });
  } catch (err) {
    return respond({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'insert') return respond(insertTask(body.data));
    if (body.action === 'update') return respond(updateTask(body.id, body.data));
    if (body.action === 'delete') return respond(deleteTask(body.id));
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

function getTasksSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Tasks');
  if (!sheet) {
    sheet = ss.insertSheet('Tasks');
    _formatTasksSheet(sheet);
  }
  return sheet;
}

function _formatTasksSheet(sheet) {
  const lastCol = TASKS_HEADERS.length;
  sheet.getRange(1, 1, 1, lastCol).setValues([TASKS_HEADERS]);
  sheet.getRange(1, 1, 1, lastCol)
    .setBackground('#083467')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(10);
  sheet.setFrozenRows(1);

  // Column widths
  const widths = { id: 200, name: 300, status: 120, priority: 80, category: 160,
                   due: 90, assignees: 90, memo: 260, link: 240, createdAt: 170, updatedAt: 170 };
  TASKS_HEADERS.forEach((h, i) => {
    if (widths[h]) sheet.setColumnWidth(i + 1, widths[h]);
  });

  // Alternate row colour will apply automatically via conditional formatting
  sheet.getRange('A2:K1000').applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
}

// ── CRUD ────────────────────────────────────────────────────────

function getAllTasks() {
  const sheet = getTasksSheet();
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1)
    .filter(row => row[0] !== '' && row[0] !== null && row[0] !== undefined)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const v = row[i];
        // Normalise Dates that Sheets auto-converts
        obj[h] = (v instanceof Date)
          ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd')
          : (v === null || v === undefined ? '' : String(v));
      });
      return obj;
    });
}

function insertTask(data) {
  if (!data || !data.id) return { error: 'Missing task id' };
  const sheet = getTasksSheet();
  const now   = new Date().toISOString();
  data.createdAt = data.createdAt || now;
  data.updatedAt = now;
  const row = TASKS_HEADERS.map(h => (data[h] !== undefined && data[h] !== null) ? data[h] : '');
  sheet.appendRow(row);
  return { success: true, id: data.id };
}

function updateTask(id, data) {
  if (!id) return { error: 'Missing id' };
  const sheet   = getTasksSheet();
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx   = headers.indexOf('id');
  const updIdx  = headers.indexOf('updatedAt');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]) === String(id)) {
      data.updatedAt = new Date().toISOString();
      const updatedRow = headers.map((h, colIdx) =>
        (data[h] !== undefined && data[h] !== null) ? data[h] : allData[i][colIdx]
      );
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
      return { success: true };
    }
  }
  return { error: 'Task not found: ' + id };
}

function deleteTask(id) {
  if (!id) return { error: 'Missing id' };
  const sheet   = getTasksSheet();
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idIdx   = headers.indexOf('id');

  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Task not found: ' + id };
}

// ── One-time setup ────────────────────────────────────────────────

/**
 * Run this ONCE from the Apps Script editor before deploying.
 * Creates and formats the Tasks sheet if it doesn't exist.
 */
function initializeTasks() {
  const sheet = getTasksSheet();
  Logger.log('✅ Tasks sheet ready: ' + sheet.getName());
  Logger.log('Row count (incl. header): ' + sheet.getLastRow());
}
