// The Japanese channel post, built the way the Content Bot builds its translations: the post itself is the master and it is
// translated LINE BY LINE, so the layout stays exactly as written (title, price line, 📍, dividers, sections, ✅ lines).
// Per line: the fixed tables first (prices, bedrooms and bathrooms, sizes, floors, labels, section headings, title words), then
// the glossary of Nick's own phrases, then Google (lines in `mt`, translated beforehand through the Apps Script). Names are never
// translated. Promotional claims stay out of the Japanese post (Nick's rule for this channel) and are reported. The contact block
// of the source is always replaced by the channel's own contact line.
const { translateFeature } = require('./compose.js');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const usd = (n) => '$' + Math.round(n).toLocaleString('en-US');
const BOLD_RANGES = [[0x1D5D4, 65], [0x1D5EE, 97], [0x1D7EC, 48]];
function fromBold(s) {
  return Array.from(String(s)).map((ch) => {
    const c = ch.codePointAt(0);
    if (c >= 0x1D5D4 && c <= 0x1D5ED) return String.fromCharCode(65 + c - 0x1D5D4);
    if (c >= 0x1D5EE && c <= 0x1D607) return String.fromCharCode(97 + c - 0x1D5EE);
    if (c >= 0x1D7EC && c <= 0x1D7F5) return String.fromCharCode(48 + c - 0x1D7EC);
    return ch;
  }).join('');
}

const DIVIDER = /^[―\-_=⎯—─]{3,}$/;
const CONTACT = /^(?:📞|📱|☎|✆|🏠|📧|✉|🌐|🔗)|t\.me\/|wa\.me\/|whatsapp|https?:\/\/|@[A-Za-z0-9_]{4,}/iu;
const BULLET = /^(✅|☑️|☑|✔️|✔|✓|▫️|▫|•|●|▪️|▪|■|★|➡️|⁃|💧|⚡|🚗|💼|💳|🔑|🏢|🛏️?|🛁)\s*/u;
// the tick-style markers of a source post all become the channel's own bullet (▫️ for @Nick_Cambodia, Nick 2026-10-26); utility icons stay
const TICKS = /^(✅|☑️|☑|✔️|✔|✓|▫️|▫|•|●|▪️|▪|■|★|➡️|⁃|🛏️?|🛁)$/u;
const HEADINGS = {
  'unit details': '物件情報', 'details': '物件情報', 'property details': '物件情報', 'features': '特徴', 'key features': '特徴', 'highlights': '特徴',
  'facilities': '共用施設', 'amenities': '共用施設', 'payment plan': 'お支払いプラン', 'payment plans': 'お支払いプラン', 'payment terms': 'お支払い条件',
  'utilities': '光熱費', 'location': '立地', 'project details': 'プロジェクト情報', 'resale highlights': 'リセールのポイント', 'rental details': '賃貸条件',
};
const LABELS = {
  handover: '引き渡し', completion: '完成', 'completion date': '完成時期', furnished: '家具', furnishing: '家具', facing: '向き', orientation: '向き', view: '眺望', views: '眺望',
  title: '権利', ownership: '権利', tenure: '権利', 'unit type': 'タイプ', type: 'タイプ', price: '価格', 'selling price': '販売価格', 'rental price': '賃料', rent: '賃料',
  deposit: 'デポジット', 'booking fee': '予約金', 'down payment': '頭金', 'monthly payment': '月々のお支払い', 'management fee': '管理費', parking: '駐車場', available: '入居可能日', availability: '入居可能日',
  'unit no': '部屋番号', floor: '階数', size: '広さ', 'gross size': '総面積', 'net size': '専有面積', developer: 'デベロッパー', tenant: '入居者', lease: '賃貸契約',
};
const CITY = { 'phnom penh': 'プノンペン', 'siem reap': 'シェムリアップ', 'sihanoukville': 'シアヌークビル', 'kampot': 'カンポット', 'kep': 'ケップ' };
const TITLE_WORDS = { resale: 'リセール', unit: '', units: '', condo: 'コンドミニアム', duplex: 'デュープレックス', penthouse: 'ペントハウス', studio: 'スタジオ', 'for sale': '売出', 'for rent': '賃貸',
  sale: '売出', rent: '賃貸', rental: '賃貸', loft: 'ロフト', 'sky villa': 'スカイヴィラ', villa: 'ヴィラ', office: 'オフィス', shophouse: 'ショップハウス', 'new': '新築', 'off-plan': '建設中', 'off plan': '建設中' };

// "1 Bedroom | 1 Bathroom", "57㎡", "32 sqm net / 41 sqm gross", "26th Floor", "Studio": a line made only of facts like these
function factSegment(seg, o) {
  const s = seg.trim(); let m; o = o || {};
  if (/^studio$/i.test(s)) return 'スタジオ';
  if ((m = s.match(/^(\d+)\s*[- ]?(?:bed(?:room)?s?|br)$/i))) return m[1] + 'ベッドルーム';
  if ((m = s.match(/^(\d+(?:[.,]\d+)?)\s*[- ]?bath(?:room)?s?$/i))) return m[1] + 'バスルーム';
  if ((m = s.match(/^(?:(gross|net)\s*(?:size|area)?\s*[:：]?\s*)?(\d+(?:[.,]\d+)?)\s*(?:㎡|m²|m2|sqm|sq\.?\s?m)(?:\s*(gross|net))?(?:\s*(?:size|area))?$/i))) {
    let kind = (m[1] || m[3] || '').toLowerCase();
    // the post says only "57㎡": the answer to the bot's net or gross question labels it
    const v = Number(m[2].replace(',', '.'));
    if (!kind && o.gross && v === Number(o.gross)) kind = 'gross'; else if (!kind && o.net && v === Number(o.net)) kind = 'net';
    return m[2] + '㎡' + (kind === 'gross' ? '（総面積）' : kind === 'net' ? '（専有）' : '');
  }
  if ((m = s.match(/^(\d{1,3})(?:st|nd|rd|th)?\s*floor$/i)) || (m = s.match(/^floor\s*[:#]?\s*(\d{1,3})(?:st|nd|rd|th)?$/i))) return m[1] + '階';
  if (/^(?:ground floor|floor\s*g)$/i.test(s)) return '1階（グラウンドフロア）';
  return null;
}
function factLine(t, o) {
  const segs = t.split(/\s*\|\s*|\s+\/\s+/).filter(Boolean);
  if (!segs.length) return null;
  const out = segs.map((x) => factSegment(x, o));
  return out.every(Boolean) ? out.join(' | ') : null;
}
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
function dateText(v) {
  const s = v.trim().toLowerCase().replace(/,/g, ''); let m;
  if ((m = s.match(/^(20\d\d)$/))) return m[1] + '年';
  if ((m = s.match(/^(early|beginning of|start of)\s+(20\d\d)$/))) return m[2] + '年初頭';
  if ((m = s.match(/^(mid|middle of|mid-)\s*-?\s*(20\d\d)$/))) return m[2] + '年半ば';
  if ((m = s.match(/^(late|end of)\s+(20\d\d)$/))) return m[2] + '年後半';
  if ((m = s.match(/^q([1-4])\s*(20\d\d)$/)) || (m = s.match(/^(20\d\d)\s*q([1-4])$/))) { const q = /^q/.test(s) ? m[1] : m[2], y = /^q/.test(s) ? m[2] : m[1]; return y + '年第' + q + '四半期'; }
  if ((m = s.match(/^([a-z]+)\s+(20\d\d)$/)) && MONTHS.indexOf(m[1]) !== -1) return m[2] + '年' + (MONTHS.indexOf(m[1]) + 1) + '月';
  if (/^(ready|now|immediately|completed)$/.test(s)) return '完成済み';
  return null;
}
// "$98,000 → $94,000": the old price crossed out, the new one after the arrow
function priceText(s, current, from) {
  const arrow = s.match(/\$\s*([\d,]+)\s*(?:→|->|=>|➡️?|➜|\bto\b)\s*\$\s*([\d,]+)/i);
  const monthly = /\/\s*(?:month|mo)\b|per\s+month/i.test(s) ? '/月' : '';
  const cur = current || (arrow ? Number(arrow[2].replace(/,/g, '')) : Number((s.match(/\$\s*([\d,]+)/) || [])[1] ? (s.match(/\$\s*([\d,]+)/))[1].replace(/,/g, '') : 0));
  const old = from || (arrow ? Number(arrow[1].replace(/,/g, '')) : 0);
  if (!cur) return null;
  return (old && old !== cur ? '<s>' + usd(old) + '</s> → ' : '') + usd(cur) + monthly;
}

// Splits the source into lines with a bold flag (Telegram bold marks, or the bold sans serif letters of Nick's titles).
function sourceLines(text, entities) {
  const t = String(text || '');
  const bold = new Array(t.length).fill(false);
  (entities || []).forEach((e) => { if (e && e.type === 'bold') for (let i = e.offset; i < e.offset + e.length && i < t.length; i++) bold[i] = true; });
  const lines = []; let pos = 0;
  t.split('\n').forEach((raw) => {
    let b = raw.trim().length > 0;
    for (let i = 0; i < raw.length; i++) if (raw[i].trim() && !bold[pos + i]) { b = false; break; }
    const plain = fromBold(raw);
    if (plain !== raw && /[A-Za-z]/.test(plain)) b = true;
    lines.push({ raw, text: plain.trim(), bold: b });
    pos += raw.length + 1;
  });
  // the contact block at the end (phone, t.me links, separators) is dropped: the channel adds its own
  let end = lines.length;
  while (end > 0 && (!lines[end - 1].text || DIVIDER.test(lines[end - 1].text) || CONTACT.test(lines[end - 1].text))) end--;
  return lines.slice(0, end);
}

// Plans one line. Returns { out } when the line is done, { google: english } when it needs the translator, or { drop, claim }.
function planLine(l, o, state) {
  const t = l.text;
  if (!t) return { out: '' };
  if (DIVIDER.test(t)) return { out: '――――――――――' };
  if (CONTACT.test(t)) return { drop: true };
  // price lines: "#ForSale $94,000", "💰 $98,000 → $94,000", "Selling Price: $94,000"
  const tag = t.match(/^#(ForSale|ForRent|NewProject)\b/i);
  if (tag || /^💰/u.test(t) || (/\$\s*\d/.test(t) && /\b(price|rent)\b/i.test(t) && !BULLET.test(t))) {
    // every price line is the unit's price: the current one, with the old one crossed out after a reduction
    const p = priceText(t, o.price, o.priceFrom);
    const urgent = /urgent/i.test(t) ? '（緊急）' : '';
    if (p) {
      if (tag) return { out: (/rent/i.test(tag[1]) ? '#賃貸 ' : /new/i.test(tag[1]) ? '#新築プロジェクト ' : '#売出中 ') + p + urgent };
      const label = /monthly rent|rental price|\brent\b/i.test(t) ? '月額賃料：' : /selling price|sale price|asking price|\bprice\b/i.test(t) ? '販売価格：' : '';
      return { out: (/^💰/u.test(t) ? '💰 ' : '') + label + p + urgent };
    }
  }
  if (/^📍/u.test(t)) {
    const parts = t.replace(/^📍\s*/u, '').split(',').map((x) => x.trim()).filter(Boolean);
    return { out: '📍 ' + parts.map((p) => CITY[p.toLowerCase()] || p).join('、') };
  }
  // section headings (UNIT DETAILS, FEATURES ...)
  const head = t.replace(/[:：]\s*$/, '').toLowerCase();
  if (HEADINGS[head] && !BULLET.test(t)) return { out: HEADINGS[head], heading: true };
  // the title "TIME SQUARE 6 | 1BR RESALE": the name stays, the words after the bar come from the table
  if (!state.titleDone && t.includes('|') && !BULLET.test(t) && !/\$/.test(t)) {
    state.titleDone = true;
    const [name, ...rest] = t.split('|');
    const words = rest.join(' ').trim();
    const mapped = mapTitleWords(words);
    return mapped !== null ? { out: name.trim() + (mapped ? ' | ' + mapped : ''), heading: true } : { name: name.trim(), google: words, title: true, heading: true };
  }
  const bm = t.match(BULLET);
  const icon = bm ? (TICKS.test(bm[1]) ? (o.bullet || '✅') : bm[1]) : '';
  const body = bm ? t.slice(bm[0].length).trim() : t;
  if (!body) return { drop: true };
  const pre = icon ? icon + ' ' : '';
  const fl = factLine(body, o);
  if (fl) return { out: pre + fl };
  // "Handover: Early 2027": the label from the table, the value as written when it is a number or a name, else translated
  const lv = body.match(/^([A-Za-z][A-Za-z .\/&]{1,24}?)\s*[:：]\s*(\S.*)$/);
  if (lv && LABELS[lv[1].trim().toLowerCase()]) {
    const label = LABELS[lv[1].trim().toLowerCase()], value = lv[2].trim();
    const fv = factLine(value, o) || dateText(value) || (/^[\d$.,%\s\-–\/]+$/.test(value) ? value : null) || (translateFeature(value).kind === 'fact' ? translateFeature(value).jp : null);
    return fv ? { out: pre + label + '：' + fv } : { pre: pre + label + '：', google: value };
  }
  const r = translateFeature(body);
  if (r.kind === 'fact') return { out: pre + r.jp };
  if (r.kind === 'claim') return { drop: true, claim: body };
  return { pre, google: body };
}
function mapTitleWords(words) {
  if (!words) return '';
  let w = ' ' + words.toLowerCase().replace(/\s+/g, ' ') + ' ';
  const out = [];
  const bed = w.match(/\s(\d+)\s*-?\s*(?:br|bed(?:room)?s?)\s/);
  if (bed) { out.push(bed[1] + 'ベッドルーム'); w = w.replace(bed[0], ' '); }
  Object.keys(TITLE_WORDS).sort((a, b) => b.length - a.length).forEach((k) => {
    const re = new RegExp('\\s' + k.replace(/[-]/g, '\\-') + '\\s');
    if (re.test(w)) { if (TITLE_WORDS[k]) out.push(TITLE_WORDS[k]); w = w.replace(re, ' '); }
  });
  return w.trim() ? null : out.join('・');
}

// Lines that need the translator (for the Apps Script call), before the post can be built.
function linesToTranslate(text, entities, o) {
  const state = {}, need = [];
  sourceLines(text, entities).forEach((l) => { const p = planLine(l, o || {}, state); if (p.google && !need.includes(p.google)) need.push(p.google); });
  return need;
}

// o: { mt (English to Japanese, from Google), price, priceFrom, rent, phone }
function buildJP(text, entities, o) {
  o = o || {};
  const mt = o.mt || {}, state = {}, out = [], left = { claims: [], unknown: [], machine: [] };
  sourceLines(text, entities).forEach((l) => {
    const p = planLine(l, o, state);
    if (p.drop) { if (p.claim) left.claims.push(p.claim); return; }
    let line;
    if (p.google !== undefined) {
      const jp = mt[p.google];
      if (jp) left.machine.push(p.google); else left.unknown.push(p.google);
      const val = jp || p.google; // no translation available: the English line stays, and Nick is told
      line = p.title ? p.name + ' | ' + val : (p.pre || '') + val;
    } else line = p.out;
    if (line === '' && out.length && out[out.length - 1] === '') return; // one blank line at most
    const html = /<s>/.test(line) ? line.split(/(<\/?s>)/).map((x) => (/^<\/?s>$/.test(x) ? x : esc(x))).join('') : esc(line);
    out.push(line && (l.bold || p.heading) ? '<b>' + html + '</b>' : html);
  });
  while (out.length && out[out.length - 1] === '') out.pop();
  while (out.length && out[0] === '') out.shift();
  if (o.phone) out.push('', '――――――――――', '📞 ' + esc(o.phone));
  return { text: out.join('\n'), left };
}

module.exports = { buildJP, linesToTranslate, sourceLines, fromBold, priceText, mapTitleWords, factLine, dateText };
