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
  const nextRow = sheet.getLastRow() + 1;
  sheet.appendRow(row);

  // Force phone column to text format — prevents +country codes being parsed as formulas
  const phoneIdx = headers.indexOf('phone');
  if (phoneIdx !== -1) {
    const phoneCell = sheet.getRange(nextRow, phoneIdx + 1);
    phoneCell.setNumberFormat('@STRING@');
    phoneCell.setValue(String(row[phoneIdx]));
  }

  // Trigger confirmation email to client + alert to agent
  if (sheetName === 'Leads') {
    try { sendConfirmationEmails(data); } catch(err) { Logger.log('Email error: ' + err); }
  }

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

// ═══════════════════════════════════════════════════════════════
//  CONFIRMATION EMAIL SYSTEM
//
//  Fires automatically on every new Lead insert.
//  Sends: (1) branded confirmation to client, (2) lead alert to team.
//
//  SETUP NOTE:
//  GmailApp sends from the Google account that owns this Apps Script.
//  To send from propertyhubcambodia@gmail.com, either:
//    a) Paste + deploy this script while logged in as that account, OR
//    b) Add propertyhubcambodia@gmail.com as a "Send mail as" alias in
//       Gmail Settings → Accounts and Import, then verify it.
// ═══════════════════════════════════════════════════════════════

const FROM_EMAIL  = 'propertyhubcambodia@gmail.com';
const BCC_EMAIL   = 'propertyhubcambodia@gmail.com';
const WA_NUMBER   = '85511666952';
const AGENT_EMAIL = 'propertyhubcambodia@gmail.com';

// ── Orchestrator ──────────────────────────────────────────────────

function sendConfirmationEmails(lead) {
  const scenario = detectScenario(lead);
  const lang     = detectLang(lead);
  if (lead.email && lead.email.indexOf('@') !== -1) {
    sendClientConfirmation(lead, scenario, lang);
  }
  sendAgentNotification(lead, scenario, lang);
}

// ── Detection helpers ─────────────────────────────────────────────

function detectLang(lead) {
  // Phone prefix is the most reliable signal (set by the flag picker)
  const phone = (lead.phone || '').replace(/[\s\-\(\)\.]/g, '');
  if (phone.startsWith('+855')) return 'kh';
  if (phone.startsWith('+81'))  return 'ja';
  if (phone.startsWith('+49'))  return 'de';
  // Nationality fallback
  const nat = (lead.nationality || '').toLowerCase();
  if (nat === 'japanese')  return 'ja';
  if (nat === 'german')    return 'de';
  if (nat === 'cambodian') return 'kh';
  return 'en';
}

function detectScenario(lead) {
  if ((lead.stage || '') === 'Viewing') return 'viewing';
  const generic = ['Multiple/TBD', 'Not sure yet', ''];
  if (lead.interestedIn && generic.indexOf(lead.interestedIn) === -1) return 'property';
  return 'general';
}

function parseViewingDetails(lead) {
  const notes = lead.notes || '';
  const match  = notes.match(/Viewing request:\s*(\S+)\s+at\s+([^\n\r.]+)/);
  if (match) return { date: match[1], time: match[2].trim() };
  return { date: '—', time: '—' };
}

function parseInquiryType(lead) {
  const match = (lead.notes || '').match(/\[([^\]]+)\]/);
  return match ? match[1] : 'Property Inquiry';
}

function buildWaLink(lead, scenario) {
  const prop = lead.interestedIn || '';
  let text;
  if (scenario === 'viewing')       text = 'Hi, I submitted a viewing request' + (prop ? ' for ' + prop : '') + ' on your website.';
  else if (scenario === 'property') text = 'Hi, I enquired about ' + prop + ' on your website.';
  else                              text = 'Hi, I submitted an inquiry on your website.';
  return 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(text);
}

// ── Copy: 3 scenarios × 4 languages ──────────────────────────────

const INQUIRY_LABELS = {
  en: { 'Buying a Property':'Buying a Property', 'Selling a Property':'Selling a Property', 'Renting a Property':'Renting a Property', 'Property Investment':'Property Investment', 'General Consultation':'General Consultation' },
  ja: { 'Buying a Property':'不動産購入', 'Selling a Property':'不動産売却', 'Renting a Property':'賃貸', 'Property Investment':'不動産投資', 'General Consultation':'無料相談' },
  de: { 'Buying a Property':'Immobilienkauf', 'Selling a Property':'Immobilienverkauf', 'Renting a Property':'Mietimmobilie', 'Property Investment':'Immobilieninvestition', 'General Consultation':'Allgemeine Beratung' },
  kh: { 'Buying a Property':'ទិញអចលនទ្រព្យ', 'Selling a Property':'លក់អចលនទ្រព្យ', 'Renting a Property':'ជួលអចលនទ្រព្យ', 'Property Investment':'វិនិយោគអចលនទ្រព្យ', 'General Consultation':'ប្រឹក្សាទូទៅ' }
};

const CARD_LABELS = {
  en: { property:'Property', date:'Date', time:'Time', interest:'Inquiry',      budget:'Budget',   timeline:'Timeline'       },
  ja: { property:'物件',     date:'日付', time:'時間', interest:'ご関心',        budget:'ご予算',   timeline:'ご検討時期'     },
  de: { property:'Objekt',   date:'Datum',time:'Uhrzeit',interest:'Anfrage',    budget:'Budget',   timeline:'Zeitrahmen'     },
  kh: { property:'អចលនទ្រព្យ',date:'ថ្ងៃ',time:'ម៉ោង',interest:'ចំណាប់អារម្មណ៍',budget:'ថវិកា',timeline:'ពេលវេលា' }
};

function getClientCopy(scenario, lang, lead) {
  const n    = escH(lead.fullName || 'there');
  const prop = escH(lead.interestedIn || '');
  const cl   = CARD_LABELS[lang]    || CARD_LABELS.en;
  const il   = INQUIRY_LABELS[lang] || INQUIRY_LABELS.en;
  const ctas = { en:'Contact Us on WhatsApp', ja:'WhatsAppでお問い合わせ', de:'Per WhatsApp kontaktieren', kh:'ទំនាក់ទំនងតាម WhatsApp' };

  // ── Viewing ────────────────────────────────────────────────────
  if (scenario === 'viewing') {
    const vd = parseViewingDetails(lead);
    const dateTime = '📅 <strong>' + vd.date + '</strong> &nbsp;·&nbsp; 🕐 <strong>' + vd.time + '</strong>';
    return {
      subject: { en:'Your Viewing Request — '+(lead.interestedIn||'Property'), ja:'内覧ご予約を承りました — '+(lead.interestedIn||''), de:'Besichtigungsanfrage erhalten — '+(lead.interestedIn||''), kh:'បានទទួលការស្នើសុំទស្សនា — '+(lead.interestedIn||'') }[lang] || 'Your Viewing Request',
      greeting: { en:'Hi '+n+',', ja:n+' 様、こんにちは', de:'Hallo '+n+',', kh:n+' ជំរាបសួរ' }[lang],
      bodyHtml: {
        en: "We've received your request to view <strong>"+prop+"</strong>.<br><br>"+dateTime+"<br><br>Our team will confirm your slot within <strong>2 hours</strong> via WhatsApp.",
        ja: "<strong>"+prop+"</strong> の内覧ご予約を承りました。<br><br>"+dateTime+"<br><br>担当者より <strong>2時間以内</strong> にWhatsAppにてご連絡いたします。",
        de: "Wir haben Ihre Besichtigungsanfrage für <strong>"+prop+"</strong> erhalten.<br><br>"+dateTime+"<br><br>Unser Team bestätigt Ihren Termin innerhalb von <strong>2 Stunden</strong> via WhatsApp.",
        kh: "យើងបានទទួលការស្នើសុំទស្សនា <strong>"+prop+"</strong> របស់អ្នក។<br><br>"+dateTime+"<br><br>ក្រុមការងារនឹងទំនាក់ទំនងអ្នកតាម WhatsApp ក្នុងរយៈពេល <strong>2 ម៉ោង</strong>។"
      }[lang],
      ctaText: ctas[lang],
      detailRows: []
    };
  }

  // ── Property Inquiry ───────────────────────────────────────────
  if (scenario === 'property') {
    return {
      subject: { en:"We've Received Your Inquiry — "+(lead.interestedIn||'Property'), ja:'お問い合わせを承りました — '+(lead.interestedIn||''), de:'Ihre Anfrage ist eingegangen — '+(lead.interestedIn||''), kh:'បានទទួលការសាកសួររបស់អ្នក — '+(lead.interestedIn||'') }[lang] || 'Inquiry Received',
      greeting: { en:'Hi '+n+',', ja:n+' 様、こんにちは', de:'Hallo '+n+',', kh:n+' ជំរាបសួរ' }[lang],
      bodyHtml: {
        en: "Thank you for your interest in <strong>"+prop+"</strong>.<br><br>A member of our team will contact you within <strong>24 hours</strong> to answer your questions and guide you through the next steps.",
        ja: "<strong>"+prop+"</strong> へのお問い合わせをいただき、誠にありがとうございます。<br><br>担当者より <strong>24時間以内</strong> にご連絡いたします。",
        de: "Vielen Dank für Ihr Interesse an <strong>"+prop+"</strong>.<br><br>Ein Mitglied unseres Teams wird sich innerhalb von <strong>24 Stunden</strong> mit Ihnen in Verbindung setzen.",
        kh: "សូមអរគុណចំពោះការចាប់អារម្មណ៍លើ <strong>"+prop+"</strong>។<br><br>ក្រុមការងារនឹងទំនាក់ទំនងអ្នកក្នុងរយៈពេល <strong>24 ម៉ោង</strong>។"
      }[lang],
      ctaText: ctas[lang],
      detailRows: prop ? [{ label: cl.property, value: prop }] : []
    };
  }

  // ── General Inquiry ────────────────────────────────────────────
  const rawType   = parseInquiryType(lead);
  const localType = il[rawType] || rawType;
  const rows = [];
  if (localType)                                               rows.push({ label: cl.interest,  value: localType });
  if (lead.budget)                                             rows.push({ label: cl.budget,    value: escH(lead.budget) });
  if (lead.timeline)                                           rows.push({ label: cl.timeline,  value: escH(lead.timeline) });
  if (lead.interestedIn && lead.interestedIn !== 'Not sure yet') rows.push({ label: cl.property, value: escH(lead.interestedIn) });

  return {
    subject: { en:'Thank You — Property Hub Cambodia', ja:'お問い合わせを承りました', de:'Vielen Dank für Ihre Anfrage', kh:'សូមអរគុណ — Property Hub Cambodia' }[lang] || 'Thank You',
    greeting: { en:'Hi '+n+',', ja:n+' 様、こんにちは', de:'Hallo '+n+',', kh:n+' ជំរាបសួរ' }[lang],
    bodyHtml: {
      en: "We've received your inquiry and will be in touch within <strong>24 hours</strong>.<br><br>Here's what we noted:",
      ja: "お問い合わせをいただき、誠にありがとうございます。<br><br>担当者より <strong>24時間以内</strong> にご連絡いたします。<br><br>ご要望の内容：",
      de: "Wir haben Ihre Anfrage erhalten und melden uns innerhalb von <strong>24 Stunden</strong>.<br><br>Ihre Angaben:",
      kh: "យើងបានទទួលសំណើររបស់អ្នក ហើយនឹងទំនាក់ទំនងក្នុងរយៈពេល <strong>24 ម៉ោង</strong>។<br><br>ព័ត៌មានដែលបានទទួល:"
    }[lang],
    ctaText: ctas[lang],
    detailRows: rows
  };
}

// ── HTML builder ──────────────────────────────────────────────────

function escH(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildDetailTable(rows) {
  if (!rows || !rows.length) return '';
  const inner = rows.map(r =>
    '<tr>' +
    '<td style="padding:10px 16px;border-bottom:1px solid #f0f2f5;font-size:12px;color:#9ca3af;white-space:nowrap;width:110px">' + r.label + '</td>' +
    '<td style="padding:10px 16px;border-bottom:1px solid #f0f2f5;font-size:13px;color:#1f2437;font-weight:600">'              + r.value + '</td>' +
    '</tr>'
  ).join('');
  return '<table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;margin:20px 0 24px">' + inner + '</table>';
}

function buildClientEmailHtml(copy, waLink, gdpr) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>' +
  '<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif">' +
  '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:32px 16px"><tr><td align="center">' +
  '<table style="max-width:580px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.09)">' +

  // Header
  '<tr><td style="background:#083467;padding:28px 36px">' +
  '<p style="margin:0;font-size:20px;font-weight:bold;color:#cc9d4d;letter-spacing:.5px">Property Hub Cambodia</p>' +
  '<p style="margin:5px 0 0;font-size:11px;color:rgba(255,255,255,.55);letter-spacing:2px;text-transform:uppercase">Premium Real Estate Advisory</p>' +
  '</td></tr>' +

  // Body
  '<tr><td style="padding:36px 36px 28px">' +
  '<p style="margin:0 0 16px;font-size:16px;color:#1f2437;font-weight:600">'  + copy.greeting + '</p>' +
  '<p style="margin:0;font-size:15px;color:#5e6882;line-height:1.7">'         + copy.bodyHtml  + '</p>' +
  buildDetailTable(copy.detailRows) +

  // CTA button
  '<table cellpadding="0" cellspacing="0" style="margin:8px 0 0"><tr>' +
  '<td style="background:#cc9d4d;border-radius:8px">' +
  '<a href="' + waLink + '" target="_blank" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:bold;color:#083467;text-decoration:none">' + copy.ctaText + '</a>' +
  '</td></tr></table>' +
  '</td></tr>' +

  // Footer
  '<tr><td style="background:#083467;padding:22px 36px">' +
  '<p style="margin:0;font-size:13px;color:rgba(255,255,255,.75)">📞 011 666 952 &nbsp;·&nbsp; <a href="https://t.me/PropertyHubCambodia" style="color:#cc9d4d;text-decoration:none">t.me/PropertyHubCambodia</a></p>' +
  '<p style="margin:5px 0 0;font-size:11px;color:rgba(255,255,255,.4)">#12F Time Square 5, St. 306, BKK1, Phnom Penh, Cambodia</p>' +
  (gdpr || '') +
  '</td></tr>' +

  '</table></td></tr></table></body></html>';
}

function buildAgentEmailHtml(lead, scenario, lang) {
  const scenarioLabel = { viewing:'📅 Viewing Request', property:'🏠 Property Inquiry', general:'📋 General Inquiry' }[scenario] || 'New Lead';
  const langFlag      = { en:'🇬🇧', ja:'🇯🇵', de:'🇩🇪', kh:'🇰🇭' }[lang] || '🌐';
  const scoreNum      = parseInt(lead.score) || 0;
  const scoreTag      = scoreNum >= 5 ? '⭐ VIP' : scoreNum >= 4 ? '🔴 A' : scoreNum >= 3 ? '🟡 B' : '⚪ C';

  const rows = [
    ['Name',            escH(lead.fullName    || '—')],
    ['Phone/WhatsApp',  escH(lead.phone       || '—')],
    ['Email',           escH(lead.email       || '—')],
    ['Property',        escH(lead.interestedIn|| '—')],
    ['Budget',          escH(lead.budget      || '—')],
    ['Timeline',        escH(lead.timeline    || '—')],
    ['Language',        langFlag + ' ' + lang.toUpperCase()],
    ['Score',           scoreTag],
    ['Source',          'Website'],
  ];

  const rowsHtml = rows.map(r =>
    '<tr>' +
    '<td style="padding:9px 16px;border-bottom:1px solid #e8ecf2;font-size:12px;color:#7a8799;width:140px;white-space:nowrap">' + r[0] + '</td>' +
    '<td style="padding:9px 16px;border-bottom:1px solid #e8ecf2;font-size:13px;color:#1f2437;font-weight:600">'               + r[1] + '</td>' +
    '</tr>'
  ).join('');

  const phone    = (lead.phone || '').replace(/[^0-9+]/g, '');
  const waLink   = phone ? 'https://wa.me/' + phone.replace('+','') : '#';
  const callLink = phone ? 'tel:' + phone : '#';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>' +
  '<body style="margin:0;padding:0;background:#f0f2f7;font-family:Arial,Helvetica,sans-serif">' +
  '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f7;padding:24px 16px"><tr><td align="center">' +
  '<table style="max-width:560px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.10)">' +

  // Header
  '<tr><td style="background:#083467;padding:16px 24px">' +
  '<p style="margin:0;font-size:11px;font-weight:bold;color:#cc9d4d;letter-spacing:2px;text-transform:uppercase">PHC Lead Alert</p>' +
  '<p style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700">' + scenarioLabel + '</p>' +
  '</td></tr>' +

  // Lead data
  '<tr><td><table style="width:100%;border-collapse:collapse">' + rowsHtml + '</table></td></tr>' +

  // Action buttons
  '<tr><td style="padding:16px 20px;background:#f8fafc;border-top:1px solid #e8ecf2">' +
  '<table cellpadding="0" cellspacing="0"><tr>' +
  (phone ? '<td style="padding-right:8px"><a href="'+waLink+'" style="display:inline-block;padding:10px 18px;background:#25D366;border-radius:7px;font-size:12px;font-weight:bold;color:#ffffff;text-decoration:none">📱 WhatsApp</a></td>' : '') +
  (phone ? '<td style="padding-right:8px"><a href="'+callLink+'" style="display:inline-block;padding:10px 18px;background:#083467;border-radius:7px;font-size:12px;font-weight:bold;color:#ffffff;text-decoration:none">📞 Call</a></td>' : '') +
  '<td><a href="https://narithkgame2.github.io/phc-tools/PHC_Lead_Tracker.html" style="display:inline-block;padding:10px 18px;background:#cc9d4d;border-radius:7px;font-size:12px;font-weight:bold;color:#083467;text-decoration:none">📋 Open CRM</a></td>' +
  '</tr></table>' +
  '</td></tr>' +

  '</table></td></tr></table></body></html>';
}

// ── Senders ───────────────────────────────────────────────────────

function sendClientConfirmation(lead, scenario, lang) {
  const copy   = getClientCopy(scenario, lang, lead);
  const waLink = buildWaLink(lead, scenario);
  const gdpr   = lang === 'de'
    ? '<p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,.4)">Sie erhalten diese E-Mail, weil Sie eine Anfrage auf cambodiapropertyhub.com gestellt haben. Zur Datenlöschung antworten Sie bitte auf diese E-Mail.</p>'
    : '';

  GmailApp.sendEmail(lead.email, copy.subject, '', {
    htmlBody: buildClientEmailHtml(copy, waLink, gdpr),
    name:     'Property Hub Cambodia',
    from:     FROM_EMAIL,
    replyTo:  FROM_EMAIL,
    bcc:      BCC_EMAIL,
  });
}

function sendAgentNotification(lead, scenario, lang) {
  const label   = { viewing:'Viewing Request', property:'Property Inquiry', general:'General Inquiry' }[scenario] || 'New Lead';
  const subject = '🔔 New ' + label + ' — ' + escH(lead.fullName || 'Unknown') + ' · ' + escH(lead.interestedIn || lead.budget || 'Website');

  GmailApp.sendEmail(AGENT_EMAIL, subject, '', {
    htmlBody: buildAgentEmailHtml(lead, scenario, lang),
    name:     'PHC CRM',
    from:     FROM_EMAIL,
  });
}
