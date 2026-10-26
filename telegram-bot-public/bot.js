// @Nick_Cambodia_Bot, Phase 1 (clients only). All Telegram calls go through the injected `api`, so tests run offline.
// createBot({ api, store, flow, nickId }) -> { handleUpdate(update) }
const R = require('./engines/render.js');
const L = require('./engines/listings.js');
const { createAgentArea } = require('./engines/agents.js');
const { createOps } = require('./engines/ops.js');
const { compareText } = require('./engines/compare.js');

const DISCLAIMER = {
  jp: '※利回り・価格は参考値であり、将来の収益を保証するものではありません。',
  en: 'Yields and prices are for reference only and do not guarantee future income.',
  kh: 'ផលចំណេញ និងតម្លៃគឺសម្រាប់ជាឯកសារយោងប៉ុណ្ណោះ ហើយមិនធានាប្រាក់ចំណូលនាពេលអនាគតទេ។',
};
const MSG = {
  calcTwo: {
    jp: (v) => '<b>試算結果</b>\nお送りいただいた数値のみに基づきます\n\n年間家賃: ' + v.rent + '\n表面利回り: ' + v.gross + '%\n手取り利回りの目安: ' + v.lo + '%から' + v.hi + '%\n\n手取りは、家賃から非居住者の源泉税14%と管理費5%から10%を引いた場合です。空室と修繕の費用は含まれません。',
    en: (v) => '<b>Estimate</b>\nBased only on the numbers you sent\n\nYearly rent: ' + v.rent + '\nGross yield: ' + v.gross + '%\nNet yield, roughly: ' + v.lo + '% to ' + v.hi + '%\n\nNet means rent minus 14% non-resident tax and a 5% to 10% management fee. Vacancy and repairs are not included.',
    kh: (v) => '<b>លទ្ធផលប៉ាន់ស្មាន</b>\nផ្អែកលើលេខដែលអ្នកផ្ញើប៉ុណ្ណោះ\n\nថ្លៃជួលប្រចាំឆ្នាំ៖ ' + v.rent + '\nផលចំណេញដុល៖ ' + v.gross + '%\nផលចំណេញសុទ្ធប្រហែល៖ ' + v.lo + '% ដល់ ' + v.hi + '%\n\nសុទ្ធ គឺថ្លៃជួល ដកពន្ធ 14% សម្រាប់អ្នកមិនមែនមានលំនៅដ្ឋាន និងថ្លៃគ្រប់គ្រង 5% ដល់ 10%។ មិនរាប់បញ្ចូលការទំនេរ និងការជួសជុលទេ។',
  },
  calcBad: {
    jp: '数字を読み取れませんでした。価格と月額家賃の2つ（年間費用が分かれば3つ）を、スペースで区切って送ってください。\n例: <code>68000 650</code>',
    en: 'I could not read the numbers. Send two numbers separated by a space: price and monthly rent (a third number, yearly costs, is optional).\nExample: <code>68000 650</code>',
    kh: 'មិនអាចអានលេខបានទេ។ សូមផ្ញើលេខពីរដោយដកឃ្លា៖ តម្លៃ និងថ្លៃជួលប្រចាំខែ (លេខទីបី ចំណាយប្រចាំឆ្នាំ គឺជាជម្រើស)។\nឧទាហរណ៍៖ <code>68000 650</code>',
  },
  calcCheck: {
    jp: '※数字をもう一度ご確認ください。',
    en: 'Please double check your numbers.',
    kh: 'សូមពិនិត្យលេខរបស់អ្នកម្តងទៀត។',
  },
  nick: {
    jp: 'ご相談は公式LINEで承ります。Nick本人が1営業日以内にお答えします。',
    en: 'Nick answers on LINE. He replies within 1 business day.',
    kh: 'Nick ឆ្លើយតបតាម LINE។ គាត់ឆ្លើយក្នុងរយៈពេល 1 ថ្ងៃធ្វើការ។',
  },
  nickBtn: { jp: 'LINEでNickに相談', en: 'Message Nick on LINE', kh: 'និយាយជាមួយ Nick តាម LINE' },
  listHead: { jp: '<b>ご希望に近い物件</b>', en: '<b>Available now, close to your search</b>', kh: '<b>ជម្រើសដែលសមនឹងការស្វែងរករបស់អ្នក</b>' },
  ask: { jp: 'この物件について聞く {id}', en: 'Ask about {id}', kh: 'សួរអំពី {id}' },
  askDone: {
    jp: 'Nickに伝えました。詳細は公式LINEでご案内します。',
    en: 'I told Nick. He will share details on LINE.',
    kh: 'ខ្ញុំបានប្រាប់ Nick ហើយ។ គាត់នឹងផ្តល់ព័ត៌មានលម្អិតតាម LINE។',
  },
  checkingMsg: { jp: '確認中です。分かり次第お知らせします。', en: 'I am checking this for you. I will tell you as soon as I know.', kh: 'កំពុងពិនិត្យ។ ខ្ញុំនឹងប្រាប់អ្នកភ្លាមៗនៅពេលដឹង។' },
  availableMsg: {
    jp: '確認が取れました。{name}は現在ご案内可能です。詳細と内覧のご相談は公式LINEで承ります。',
    en: 'Confirmed. {name} is available now. Details and viewings are arranged on LINE.',
    kh: 'បានបញ្ជាក់ហើយ។ {name} នៅទំនេរឥឡូវនេះ។ ព័ត៌មានលម្អិត និងការមើលជាក់ស្តែងតាម LINE។',
  },
  goneMsg: {
    jp: 'お問い合わせありがとうございます。{name}は成約済みまたは募集終了と確認しました。近い条件の物件をお探ししますので、メインメニューから条件を変えてご覧になるか、LINEでご相談ください。',
    en: 'Thank you for asking. {name} is no longer available. Go to the main menu to look again with other options, or message Nick on LINE.',
    kh: 'អរគុណសម្រាប់ការសួរ។ {name} លែងមានហើយ។ សូមត្រឡប់ទៅម៉ឺនុយមេដើម្បីស្វែងរកម្តងទៀត ឬផ្ញើសារទៅ Nick តាម LINE។',
  },
  alertOn: {
    jp: '登録しました。条件に合う新着物件があれば、1日1回までまとめてお知らせします（日本時間の朝9時以降）。停止はいつでも /stop と送信してください。保存する情報は、TelegramのID、言語、検索条件のみです。',
    en: 'Done. When a new listing fits your search, I will tell you at most once a day (after 9:00 Japan time). Send /stop at any time to end alerts. I only keep your Telegram ID, language and search choices.',
    kh: 'រួចរាល់។ នៅពេលមានបញ្ជីថ្មីដែលសមនឹងការស្វែងរករបស់អ្នក ខ្ញុំនឹងប្រាប់យ៉ាងច្រើនមួយដងក្នុងមួយថ្ងៃ (បន្ទាប់ម៉ោង 9:00 ម៉ោងជប៉ុន)។ ផ្ញើ /stop ដើម្បីបញ្ឈប់។ ខ្ញុំរក្សាទុកតែ Telegram ID ភាសា និងជម្រើសស្វែងរកប៉ុណ្ណោះ។',
  },
  alertStopBtn: { jp: '通知を停止する', en: 'Stop alerts', kh: 'បិទការជូនដំណឹង' },
  alertOff: { jp: '通知を停止しました。', en: 'Alerts are off.', kh: 'បានបិទការជូនដំណឹង។' },
  alertNone: { jp: '現在、通知は登録されていません。', en: 'You have no alerts set.', kh: 'អ្នកមិនមានការជូនដំណឹងទេ។' },
  alertHead: { jp: '<b>新着物件のお知らせ</b>', en: '<b>New listing that fits your search</b>', kh: '<b>បញ្ជីថ្មីដែលសមនឹងការស្វែងរករបស់អ្នក</b>' },
  alertKeep: {
    jp: '新着物件のお知らせは、まだご希望ですか？ ご希望の場合は下のボタンを押してください。押されない場合、7日後に自動で停止します。',
    en: 'Do you still want new listing alerts? Tap the button below to keep them. If you do not, they stop by themselves in 7 days.',
    kh: 'តើអ្នកនៅតែចង់បានការជូនដំណឹងទេ? សូមចុចប៊ូតុងខាងក្រោម។ បើមិនចុច វានឹងឈប់ដោយខ្លួនឯងក្នុងរយៈពេល 7 ថ្ងៃ។',
  },
  alertKeepBtn: { jp: '引き続き受け取る', en: 'Keep my alerts', kh: 'បន្តទទួលការជូនដំណឹង' },
  closed: {
    jp: '現在、公開に向けて準備中です。もうしばらくお待ちください。',
    en: 'We are getting ready to open. Please check back soon.',
    kh: 'កំពុងរៀបចំដើម្បីបើក។ សូមត្រឡប់មកវិញក្រោយ។',
  },
  photoBtn: { jp: '写真を見る {id}', en: 'Photos {id}', kh: 'រូបថត {id}' },
  cmpBtn: { jp: '3件を比較する', en: 'Compare these', kh: 'ប្រៀបធៀប' },
  dropHead: { jp: '<b>値下げのお知らせ</b>', en: '<b>Price drop</b>', kh: '<b>តម្លៃបានថយចុះ</b>' },
  refGone: {
    jp: 'この物件は現在ご案内できません。条件に近い物件はメインメニューからお探しいただけます。',
    en: 'This unit is not available now. You can look for similar units from the main menu.',
    kh: 'ឯកតានេះមិនមានទៀតទេ។ សូមស្វែងរកឯកតាស្រដៀងគ្នាពីម៉ឺនុយមេ។',
  },
  menuBtn: { jp: 'メインメニュー', en: 'Main menu', kh: 'ម៉ឺនុយមេ' },
  tenanted: { jp: 'テナント入居中', en: 'Tenanted', kh: 'មានអ្នកជួលរួចហើយ' },
  partner: {
    jp: '掲載: REAKH（Realestate.com.kh 公式リスティングパートナー）',
    en: 'Listings by REAKH, Official Listing Partner of Realestate.com.kh',
    kh: 'បញ្ជីដោយ REAKH ដៃគូបញ្ជីផ្លូវការរបស់ Realestate.com.kh',
  },
  avail: {
    jp: '※空室状況と価格は、お問い合わせいただいた時点で最新情報を確認します。',
    en: 'Availability and price are confirmed when you ask.',
    kh: 'ភាពអាចរកបាន និងតម្លៃនឹងត្រូវបញ្ជាក់នៅពេលអ្នកសួរ។',
  },
  myid: { jp: 'あなたのTelegram IDは {id} です。', en: 'Your Telegram ID is {id}.', kh: 'Telegram ID របស់អ្នកគឺ {id}។' },
};
const fmtUsd = (n) => '$' + Math.round(n).toLocaleString('en-US');

const nk = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9]/g, '');
// Sizes: Nick's Sheet has a Net size and a Gross size column (a post often states both). The card shows what is known, labelled,
// and a price per square metre on the net size first (the figure Japanese buyers compare), else on the gross size, else on an
// old single size only when its basis is known. Projects show a plain "from" size and no price per square metre.
const BASIS = { net: { jp: '（専有）', en: ' net', kh: ' net' }, gross: { jp: '（総面積）', en: ' gross', kh: ' gross' } };
const basisText = (l, lang) => (l.basis ? BASIS[l.basis][lang] || BASIS[l.basis].en : '');
const unitSqm = (n, lang) => n + (lang === 'jp' ? '㎡' : ' sqm');
function sizeText(l, lang) {
  const tag = (k) => (lang === 'jp' ? BASIS[k].jp : BASIS[k].en);
  const jp = lang === 'jp';
  if (l.net && l.gross) return jp ? l.net + '㎡' + BASIS.net.jp + ' / ' + l.gross + '㎡' + BASIS.gross.jp : l.net + ' sqm net / ' + l.gross + ' sqm gross';
  if (l.net) return jp ? l.net + '㎡' + BASIS.net.jp : l.net + ' sqm net';
  if (l.gross) return jp ? l.gross + '㎡' + BASIS.gross.jp : l.gross + ' sqm gross';
  if (!l.sqm) return '';
  return (l.from && !jp ? 'from ' : '') + unitSqm(l.sqm, lang) + (jp && l.from ? 'から' : '') + basisText(l, lang);
}
function perSqm(l, lang) {
  if (l.type !== 'buy' || l.from || !(l.price > 0)) return '';
  const pick = l.net ? ['net', l.net] : l.gross ? ['gross', l.gross] : l.basis && l.sqm ? [l.basis, l.sqm] : null;
  if (!pick) return '';
  return fmtUsd(l.price / pick[1]) + '/' + (lang === 'jp' ? '㎡' + BASIS[pick[0]].jp : 'sqm' + BASIS[pick[0]].en);
}
function areaText(l) {
  if (!l.district || l.district === 'Others') return l.khan || '';
  const n = nk(l.district);
  const agrees = !l.khan || [l.khan, l.sangkat].some((x) => nk(x).includes(n) || (nk(x) && n.includes(nk(x))));
  return agrees ? l.district : l.district + ' (' + l.khan + ')';
}

function parseThree(text) {
  const nums = String(text || '').replace(/[,，]/g, '').match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length !== 3) return null;
  const [price, rent, costs] = nums.map(Number);
  if (!(price > 0) || !(rent > 0) || costs < 0) return null;
  return { price, rent, costs };
}

// two numbers (price, monthly rent) or three (plus yearly costs)
function parseCalc(text) {
  const nums = String(text || '').replace(/[,，]/g, '').match(/-?\d+(?:\.\d+)?/g);
  if (nums && nums.length === 2) { const [price, rent] = nums.map(Number); return price > 0 && rent > 0 ? { price, rent, costs: null } : null; }
  return parseThree(text);
}

function createBot({ api, store, flow, nickId, onError, getListings, listingState, alertStore, testerIds, isPrivate, agentData, channels, places, events, botUsername, now }) {
  // Phase 2 agent units join the listings the Sheet and the website provide
  const baseListings = getListings || (async () => []);
  let agentArea = null;
  const rawListings = async () => (await baseListings()).concat(agentArea ? agentArea.listings() : []);
  const clock = now || (() => Date.now());
  const DAY = 86400000;
  // What Nick decided about each listing (Available / Not available) and who asked about it. It sits on top of the Sheet and the website:
  // the bot cannot write to either, so its own record decides until the Sheet says something newer.
  const mem = {};
  const state = listingState || { get: (k) => mem[k], set: (k, v) => { mem[k] = v; }, delete: (k) => { delete mem[k]; } };
  const amem = {};
  const alerts = alertStore || { get: (k) => amem[k], set: (k, v) => { amem[k] = v; }, delete: (k) => { delete amem[k]; }, all: () => Object.keys(amem).map((k) => amem[k]) };
  const evlog = [];
  const eventStore = events || { add: (e) => { evlog.push(e); }, since: (t) => evlog.filter((e) => e.t >= t) };
  const isNick = (id) => !!nickId && String(id) === String(nickId);
  const isTester = (id) => (testerIds || []).map(String).includes(String(id)); // Nick's own second accounts: they may see Preview listings
  const seesPreview = (id) => isNick(id) || isTester(id);
  function visible(l, viewerId) {
    if (l.preview && !seesPreview(viewerId)) return false;
    const st = state.get(l.id) || {};
    const sheet = Date.parse(l.checked) || 0;
    if (st.status === 'unavailable' && !(sheet > Date.parse(st.at))) return false; // a newer Last checked in the Sheet means Nick relisted it
    const fresh = Math.max(sheet, st.status === 'available' ? Date.parse(st.at) || 0 : 0);
    if (fresh && (clock() - fresh) / DAY > L.MAX_AGE_DAYS) return false; // not re-checked for too long
    return true;
  }
  const loadListings = async (viewerId) => (await rawListings()).filter((l) => visible(l, viewerId));
  const ops = createOps({ api, nickId, clock, state, events: eventStore, rawListings, alerts, L, esc: R.esc });
  const botLink = (ref) => 'https://t.me/' + (botUsername || 'Nick_Cambodia_Bot') + (ref ? '?start=' + ref : '');
  const byId = {};
  flow.steps.forEach((s) => { byId[s.id] = s; });
  const LINE = flow.line;

  const user = (from) => {
    let u = store.get(from.id);
    if (!u) { u = { id: from.id, lang: null, answers: {}, awaiting: null, firstSeen: new Date().toISOString() }; }
    if (from.username && u.username !== from.username.toLowerCase()) { u.username = from.username.toLowerCase(); store.set(u.id, u); } // lets Nick add an agent by @username
    return u;
  };
  const findUserByUsername = (name) => (store.all ? store.all().find((x) => x.username === String(name).toLowerCase()) : null) || null;
  const save = (u) => store.set(u.id, u);
  const nameOf = (from) => [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Client';

  function summaryFor(u, ids) {
    return ids.map((id) => u.answers[id]).filter(Boolean).join(' · ') || '-';
  }
  function varsFor(u, stepId) {
    const a = u.answers;
    if (stepId === 'bres') return { 'search summary': R.esc(summaryFor(u, ['b1', 'b2'])) };
    if (stepId === 'rres') return { 'search summary': R.esc(summaryFor(u, ['rr1', 'rr2'])) };
    if (stepId === 'tourok') return { day: R.esc(a.tourday || '-'), time: R.esc(a.tourtime || '-'), 'in person or video': R.esc(a.tour || '-') };
    if (stepId === 'calc2') return u.calc || {};
    return {};
  }

  async function send(chatId, u, step, vars, edit) {
    const body = R.render(step, u.lang || 'jp', vars);
    if (edit && edit.message_id) {
      const r = await api('editMessageText', Object.assign({ chat_id: chatId, message_id: edit.message_id }, body));
      if (r && r.ok) return r;
    }
    return api('sendMessage', Object.assign({ chat_id: chatId }, body));
  }

  async function notifyNick(u, from, step) {
    if (!nickId || !step.notify) return;
    if (isNick(u.id)) return;
    if (step.id === 'leaddone') ops.track('lead'); if (step.id === 'tourok') ops.track('tour'); // Nick testing his own bot does not need an alert about himself
    const lines = ['<b>' + R.esc(step.notify) + '</b>', 'Client: ' + R.esc(nameOf(from)) + (from.username ? ' (@' + R.esc(from.username) + ')' : '') + ' (' + u.id + ')',
      'Language: ' + String(u.lang || '-').toUpperCase()];
    const a = u.answers;
    const add = (k, label) => { if (a[k]) lines.push(label + ': ' + R.esc(a[k])); };
    if (step.id === 'bres') { add('b1', 'Budget'); add('b2', 'District'); }
    if (step.id === 'rres') { add('rr1', 'Monthly budget'); add('rr2', 'District'); }
    if (step.id === 'leaddone') { add('lead1', 'Goal'); add('lead2', 'Timeline'); add('lead3', 'Reply by'); if (a.b1 || a.rr1) lines.push('Last search: ' + R.esc(summaryFor(u, a.rr1 ? ['rr1', 'rr2'] : ['b1', 'b2']))); }
    if (step.id === 'tourok') { add('tour', 'Tour'); add('tourday', 'Day'); add('tourtime', 'Time'); }
    lines.push('Open chat: tg://user?id=' + u.id);
    await api('sendMessage', { chat_id: nickId, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true });
  }

  function listingText(l, lang) {
    const note = lang === 'jp' ? l.noteJp : l.noteEn;
    const price0 = l.type === 'buy' ? fmtUsd(l.price) : fmtUsd(l.rent) + (lang === 'jp' ? '/月' : lang === 'kh' ? '/ខែ' : '/mo');
    const price = l.from ? (lang === 'jp' ? price0 + 'から' : (lang === 'kh' ? 'ចាប់ពី ' : 'from ') + price0) : price0;
    const facts = [price, sizeText(l, lang), l.beds ? l.beds + (lang === 'jp' ? 'ベッドルーム' : 'BR') : '', l.floor ? (lang === 'jp' ? l.floor + '階' : 'Floor ' + l.floor) : '', perSqm(l, lang)].filter(Boolean).join(' · ');
    // Others is only a search bucket, so show the real khan. Otherwise show the label (Nick's market name, also used by the buttons)
    // and, when the official district differs, the khan beside it: "Tonle Bassac (Chba Ampov)".
    const area = areaText(l);
    const lines = [(l.preview ? '<i>PREVIEW, only you can see this</i>\n' : '') + '<b>' + R.esc(l.name) + '</b>' + (area ? ' · ' + R.esc(area) : '') + ' (' + R.esc(l.id) + ')', R.esc(facts)];
    if (l.netYield) lines.push((lang === 'jp' ? '手取り利回り 約' : lang === 'kh' ? 'ផលចំណេញសុទ្ធ ប្រហែល ' : 'Net yield about ') + l.netYield + '%*');
    if (l.tenanted) lines.push(MSG.tenanted[lang] + (l.tenantNote ? ': ' + R.esc(l.tenantNote) : l.rent ? ': ' + fmtUsd(l.rent) + (lang === 'jp' ? '/月' : '/mo') : ''));
    if (note) lines.push(R.esc(note));
    if (l.photo) lines.push('<a href="' + R.esc(l.photo) + '">' + (lang === 'jp' ? '写真' : lang === 'kh' ? 'រូបថត' : 'Photo') + '</a>');
    return '<blockquote>' + lines.join('\n') + '</blockquote>';
  }
  function composeListings(found, lang, head, stopRow) {
    let text = head + '\n\n' + found.map((l) => listingText(l, lang)).join('\n');
    text += '\n\n<i>' + MSG.avail[lang] + '</i>';
    if (found.some((l) => l.partner)) text += '\n<i>' + MSG.partner[lang] + '</i>';
    if (found.some((l) => l.netYield)) text += '\n\n<i>*' + DISCLAIMER[lang].replace(/^※/, '') + '</i>';
    const kb = [];
    found.forEach((l) => { kb.push([{ text: MSG.ask[lang].replace('{id}', l.id), callback_data: 'q:' + l.id }]); if (l.media && l.media.length) kb.push([{ text: MSG.photoBtn[lang].replace('{id}', l.id), callback_data: 'ph:' + l.id }]); });
    if (found.length >= 2) kb.push([{ text: MSG.cmpBtn[lang], callback_data: 'cmp:' + found.slice(0, 3).map((l) => l.id).join(',') }]);
    if (stopRow) kb.push([{ text: MSG.alertStopBtn[lang], callback_data: 'al:off' }]);
    return { chat: null, body: { text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard: kb } } };
  }
  async function sendListings(chatId, u, kind) {
    const k = u.keys || {};
    const found = L.match(await loadListings(u.id), kind, kind === 'buy' ? { budget: k.b1, district: k.b2 } : { budget: k.rr1, district: k.rr2 });
    if (!isNick(u.id)) ops.track('search', { kind, n: found.length });
    if (!found.length) return 0;
    await api('sendMessage', Object.assign({ chat_id: chatId }, composeListings(found, u.lang || 'jp', MSG.listHead[u.lang || 'jp']).body));
    return found.length;
  }

  // Client alerts: one saved search per client. A message goes out only when a NEW matching listing appears, at most once a day,
  // between 9:00 and 21:00 Japan time. Every listing visible when the alert is set counts as already seen. After 53 days the client is
  // asked once whether to keep it; with no tap it ends after 60 days. /stop ends it at once.
  const ALERT_DAYS = 60, ASK_DAYS = 53;
  async function setAlert(u) {
    const kind = u.lastKind; const k = u.keys || {};
    if (!kind || !(kind === 'buy' ? k.b1 || k.b2 : k.rr1 || k.rr2)) return false;
    const old = alerts.get(u.id);
    const seen = new Set((old && old.seen) || []);
    (await rawListings()).filter((l) => visible(l, u.id)).forEach((l) => seen.add(l.id));
    alerts.set(u.id, { id: u.id, lang: u.lang || 'jp', kind, keys: kind === 'buy' ? { budget: k.b1, district: k.b2 } : { budget: k.rr1, district: k.rr2 },
      createdAt: new Date(clock()).toISOString(), askedAt: '', lastDay: '', seen: Array.from(seen) });
    return true;
  }
  async function runAlerts() {
    const t = clock(), jst = new Date(t + 9 * 3600000), hour = jst.getUTCHours(), day = jst.toISOString().slice(0, 10);
    if (hour < 9 || hour >= 21) return 0;
    const all = await rawListings(); let sent = 0;
    for (const a of alerts.all()) {
      try {
        const ageDays = (t - Date.parse(a.createdAt)) / DAY;
        if (ageDays > ALERT_DAYS) { alerts.delete(a.id); continue; }
        if (a.lastDay === day) continue;
        const lang = a.lang || 'jp';
        let r;
        if (ageDays >= ASK_DAYS && !a.askedAt) {
          r = await api('sendMessage', { chat_id: a.id, text: MSG.alertKeep[lang], reply_markup: { inline_keyboard: [[{ text: MSG.alertKeepBtn[lang], callback_data: 'al:keep' }], [{ text: MSG.alertStopBtn[lang], callback_data: 'al:off' }]] } });
          a.askedAt = new Date(t).toISOString(); a.lastDay = day;
        } else {
          const fresh = all.filter((l) => visible(l, a.id) && !(a.seen || []).includes(l.id));
          const found = L.match(fresh, a.kind, a.keys, 3);
          if (!found.length) continue;
          r = await api('sendMessage', Object.assign({ chat_id: a.id }, composeListings(found, lang, MSG.alertHead[lang], true).body));
          a.seen = (a.seen || []).concat(found.map((l) => l.id)); a.lastDay = day; ops.track('alert_sent', { n: found.length });
        }
        if (r && r.ok === false && r.error_code === 403) { alerts.delete(a.id); continue; } // the client blocked the bot
        alerts.set(a.id, a); sent++;
      } catch (e) { if (onError) onError(e); }
    }
    return sent;
  }

  async function goto(chatId, from, u, stepId, edit, extraVars) {
    const step = byId[stepId] || byId.error;
    if (stepId === 'menu') { u.answers = {}; u.keys = {}; }
    if (step.id === 'bres') u.lastKind = 'buy'; else if (step.id === 'rres') u.lastKind = 'rent';
    u.awaiting = step.await || null;
    save(u);
    const shown = (step.id === 'bres' || step.id === 'rres') && await sendListings(chatId, u, step.id === 'bres' ? 'buy' : 'rent');
    await send(chatId, u, step, Object.assign(varsFor(u, step.id), extraVars || {}), shown ? null : edit);
    await notifyNick(u, from, step);
    if (step.id === 'forgetdone') { store.delete(u.id); alerts.delete(u.id); } // the client asked to delete everything
  }

  // tells every client who asked about a unit in the last 7 days that it is gone (used when an agent marks a unit sold)
  async function tellAskersGone(ref, name) {
    const st = state.get(ref) || {};
    const others = (st.askers || []).filter((x) => (clock() - Date.parse(x.at)) / DAY <= 7);
    for (const x of others) {
      const lg = x.lang || 'jp';
      await api('sendMessage', { chat_id: x.id, text: MSG.goneMsg[lg].replace('{name}', R.esc(name)), parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: MSG.nickBtn[lg], url: LINE }], [{ text: MSG.menuBtn[lg], callback_data: 'm:menu' }]] } });
    }
    return others.length;
  }
  // units already listed that look like the one an agent is adding: same project and floor and bedrooms, or the same net size
  async function findDuplicates(d) {
    const key = nk(d.name); if (!key) return [];
    const beds = String(d.beds === 0 || d.beds === undefined ? '' : d.beds);
    const same = (l) => nk(l.name) === key && ((l.floor && d.floor && String(l.floor) === String(d.floor) && String(l.beds || '') === beds) || (d.net && l.net && Math.abs(d.net - l.net) < 0.5 && String(l.beds || '') === beds));
    return (await rawListings()).filter(same).slice(0, 3).map((l) => ({ id: l.id, name: l.name, floor: l.floor, price: l.type === 'rent' ? l.rent : l.price }));
  }
  // Nick marks any unit (from the Sheet, the website or an agent) as gone with "SOLD REF"
  async function markUnavailable(ref) {
    const l = (await baseListings()).find((x) => x.id.toLowerCase() === String(ref).toLowerCase());
    if (!l) return null;
    const st = state.get(l.id) || {};
    state.set(l.id, Object.assign({}, st, { status: 'unavailable', at: new Date(clock()).toISOString(), prev: { status: st.status, at: st.at } }));
    ops.closeRef(l.id);
    return { name: l.name, told: await tellAskersGone(l.id, l.name) };
  }
  agentArea = createAgentArea({ api, nickId, clock, esc: R.esc, L, places, lineUrl: LINE, findUserByUsername, channels: channels || [],
    data: agentData || (() => { const ag = {}, un = {}; let seq = 0; return { getAgent: (k) => ag[String(k)], setAgent: (k, v) => { ag[String(k)] = v; }, deleteAgent: (k) => { delete ag[String(k)]; }, allAgents: () => Object.keys(ag).map((k) => ag[k]),
      getUnit: (k) => un[k], setUnit: (k, v) => { un[k] = v; }, allUnits: () => Object.keys(un).map((k) => un[k]), nextSeq: () => ++seq }; })(),
    getUser: (from) => user(from), saveUser: (u) => save(u), listingText: (l, lang) => listingText(l, lang), tellAskersGone,
    track: (type, d) => ops.track(type, d), botLink, availLine: MSG.avail.jp, findDuplicates, markUnavailable });

  // Nick's buttons on a listing inquiry: v:<a|n|c|u>:<ref>[:<client id>]. Only Nick can use them.
  async function handleVerdict(cb) {
    if (!isNick(cb.from.id)) return;
    const [, act, ref, clientId] = (cb.data || '').split(':');
    const listing = (await rawListings()).find((x) => x.id === ref);
    const name = R.esc(listing ? listing.name : ref);
    const lineKb = (lang) => ({ inline_keyboard: [[{ text: MSG.nickBtn[lang], url: LINE }]] });
    const st = state.get(ref) || {};
    const asker = (st.askers || []).find((x) => String(x.id) === String(clientId));
    const lang = (asker && asker.lang) || (store.get(clientId) || {}).lang || 'jp';
    const tellNick = (text, kb) => api('sendMessage', Object.assign({ chat_id: nickId, text, parse_mode: 'HTML' }, kb ? { reply_markup: kb } : {}));
    const at = new Date(clock()).toISOString();
    if (act === 'c' || act === 'a' || act === 'n') ops.askClosed(ref, clientId);
    if (act === 'c') {
      await api('sendMessage', { chat_id: clientId, text: MSG.checkingMsg[lang] });
      return tellNick('Holding message sent to the client for ' + R.esc(ref) + '.');
    }
    if (act === 'a') {
      state.set(ref, Object.assign({}, st, { status: 'available', at, prev: { status: st.status, at: st.at } }));
      await api('sendMessage', { chat_id: clientId, text: MSG.availableMsg[lang].replace('{name}', name), parse_mode: 'HTML', reply_markup: lineKb(lang) });
      return tellNick('<b>' + R.esc(ref) + '</b> marked Available, checked today. The 30 day clock starts again.');
    }
    if (act === 'n') {
      state.set(ref, Object.assign({}, st, { status: 'unavailable', at, prev: { status: st.status, at: st.at } }));
      const others = (st.askers || []).filter((x) => (clock() - Date.parse(x.at)) / DAY <= 7);
      const kb = (l) => ({ inline_keyboard: [[{ text: MSG.nickBtn[l], url: LINE }], [{ text: MSG.menuBtn[l], callback_data: 'm:menu' }]] });
      let told = 0;
      for (const x of others) { await api('sendMessage', { chat_id: x.id, text: MSG.goneMsg[x.lang || 'jp'].replace('{name}', name), parse_mode: 'HTML', reply_markup: kb(x.lang || 'jp') }); if (String(x.id) !== String(clientId)) told++; }
      if (!others.some((x) => String(x.id) === String(clientId))) await api('sendMessage', { chat_id: clientId, text: MSG.goneMsg[lang].replace('{name}', name), parse_mode: 'HTML', reply_markup: kb(lang) });
      return tellNick('<b>' + R.esc(ref) + '</b> is now hidden from every client. ' + told + ' other client(s) who asked in the last 7 days were told.\nPlease also set it to Sold or Rented in the Sheet or on the website.', { inline_keyboard: [[{ text: 'Undo', callback_data: 'v:u:' + ref }]] });
    }
    if (act === 'u') {
      const prev = st.prev;
      const next = Object.assign({}, st); delete next.prev;
      if (prev && prev.status) { next.status = prev.status; next.at = prev.at; } else { delete next.status; delete next.at; }
      state.set(ref, next);
      return tellNick('<b>' + R.esc(ref) + '</b> is back to how it was before your last tap.');
    }
  }

  async function sendPriceDrop(clientId, lang, l, old) {
    const now = l.type === 'buy' ? l.price : l.rent, pct = Math.round(((old - now) / old) * 100);
    const head = MSG.dropHead[lang] + '\n<b>' + fmtUsd(old) + ' → ' + fmtUsd(now) + '</b> (-' + pct + '%)';
    return api('sendMessage', Object.assign({ chat_id: clientId }, composeListings([l], lang, head).body));
  }
  // a link such as t.me/Nick_Cambodia_Bot?start=TS5-5008 opens that unit directly (for LINE, Instagram and channel posts)
  async function showRef(chatId, from, u, ref) {
    const l = (await loadListings(from.id)).find((x) => x.id.toLowerCase() === ref.toLowerCase());
    if (!isNick(u.id)) ops.track('deeplink', { ref });
    if (!l) return api('sendMessage', { chat_id: chatId, text: MSG.refGone[u.lang], reply_markup: { inline_keyboard: [[{ text: MSG.menuBtn[u.lang], callback_data: 'm:menu' }]] } });
    const body = composeListings([l], u.lang, MSG.listHead[u.lang]).body;
    body.reply_markup.inline_keyboard.push([{ text: MSG.menuBtn[u.lang], callback_data: 'm:menu' }]);
    return api('sendMessage', Object.assign({ chat_id: chatId }, body));
  }
  async function runOps() {
    let n = 0;
    n += await ops.runSla(); n += await ops.runDigest(); n += await ops.runPriceDrops(sendPriceDrop);
    return n;
  }

  async function handleCallback(cb) {
    const from = cb.from, data = cb.data || '', msg = cb.message;
    await api('answerCallbackQuery', { callback_query_id: cb.id });
    if (!msg) return;
    const chatId = msg.chat.id, u = user(from);
    if (data.startsWith('l:')) {
      const lang = data.slice(2);
      if (R.LANGS.includes(lang)) {
        u.lang = lang;
        if (u.pendingRef) { const r = u.pendingRef; delete u.pendingRef; save(u); return showRef(chatId, from, u, r); }
        return goto(chatId, from, u, 'menu', msg);
      }
      return;
    }
    if (data.startsWith('q:')) {
      const l = (await loadListings(from.id)).find((x) => x.id === data.slice(2));
      if (!l) return;
      if (!u.lang) u.lang = 'jp';
      save(u);
      const st = state.get(l.id) || {};
      st.askers = (st.askers || []).filter((x) => x.id !== u.id).concat([{ id: u.id, lang: u.lang, at: new Date(clock()).toISOString() }]).slice(-50);
      state.set(l.id, st);
      if (!isNick(u.id)) { ops.track('ask', { ref: l.id }); ops.askOpened(l.id, u.id, l.name, nameOf(from) + (from.username ? ' (@' + from.username + ')' : '')); }
      if (nickId) {
        const rent = l.type === 'rent';
        await api('sendMessage', { chat_id: nickId, text: '<b>Listing interest</b>' + (isNick(u.id) ? ' <i>(your own test)</i>' : isTester(u.id) ? ' <i>(tester account)</i>' : '') + '\nClient: ' + R.esc(nameOf(from)) + (from.username ? ' (@' + R.esc(from.username) + ')' : '') + ' (' + u.id + ')\nListing: ' + R.esc(l.id + ' ' + l.name) + (areaText(l) ? ', ' + R.esc(areaText(l)) : '') + ', ' + fmtUsd(rent ? l.rent : l.price) + (rent ? '/month' : '') + '\nOpen chat: tg://user?id=' + u.id, parse_mode: 'HTML', disable_web_page_preview: true,
          reply_markup: { inline_keyboard: [[{ text: 'Available', callback_data: 'v:a:' + l.id + ':' + u.id }, { text: 'Not available', callback_data: 'v:n:' + l.id + ':' + u.id }], [{ text: 'Checking now', callback_data: 'v:c:' + l.id + ':' + u.id }]] } });
      }
      return api('sendMessage', { chat_id: chatId, text: MSG.askDone[u.lang], reply_markup: { inline_keyboard: [[{ text: MSG.nickBtn[u.lang], url: LINE }]] } });
    }
    if (/^(aw|am|ac|ua|ur|uc|uw|pn|pa|pr):/.test(data)) { if (await agentArea.handleCallback(cb, u)) return; }
    if (data.startsWith('ph:')) {
      const l = (await loadListings(from.id)).find((x) => x.id === data.slice(3));
      if (!l || !l.media || !l.media.length) return;
      ops.track('photos', { ref: l.id });
      const items = l.media.slice(0, 10);
      if (items.length === 1) return items[0].t === 'video' ? api('sendVideo', { chat_id: chatId, video: items[0].id }) : api('sendPhoto', { chat_id: chatId, photo: items[0].id });
      return api('sendMediaGroup', { chat_id: chatId, media: items.map((x) => ({ type: x.t === 'video' ? 'video' : 'photo', media: x.id })) });
    }
    if (data.startsWith('cmp:')) {
      const ids = data.slice(4).split(',').slice(0, 3), all = await loadListings(from.id);
      const picked = ids.map((id) => all.find((x) => x.id === id)).filter(Boolean);
      if (picked.length < 2) return api('sendMessage', { chat_id: chatId, text: MSG.refGone[u.lang || 'jp'] });
      if (!u.lang) u.lang = 'jp';
      if (!isNick(u.id)) ops.track('compare');
      return api('sendMessage', { chat_id: chatId, text: compareText(picked, u.lang, { fmtUsd, esc: R.esc, areaText }), parse_mode: 'HTML', disable_web_page_preview: true,
        reply_markup: { inline_keyboard: picked.map((l) => [{ text: MSG.ask[u.lang].replace('{id}', l.id), callback_data: 'q:' + l.id }]) } });
    }
    if (data === 'al:on') {
      if (!u.lang) u.lang = 'jp';
      save(u);
      if (!(await setAlert(u))) return;
      if (!isNick(u.id)) ops.track('alert_on');
      return api('sendMessage', { chat_id: chatId, text: MSG.alertOn[u.lang], reply_markup: { inline_keyboard: [[{ text: MSG.alertStopBtn[u.lang], callback_data: 'al:off' }]] } });
    }
    if (data === 'al:off') {
      if (!u.lang) u.lang = 'jp';
      const had = !!alerts.get(u.id); alerts.delete(u.id); save(u);
      return api('sendMessage', { chat_id: chatId, text: (had ? MSG.alertOff : MSG.alertNone)[u.lang] });
    }
    if (data === 'al:keep') {
      const a = alerts.get(u.id); if (!a) return;
      alerts.set(u.id, Object.assign({}, a, { createdAt: new Date(clock()).toISOString(), askedAt: '' }));
      return api('sendMessage', { chat_id: chatId, text: MSG.alertOn[a.lang || 'jp'], reply_markup: { inline_keyboard: [[{ text: MSG.alertStopBtn[a.lang || 'jp'], callback_data: 'al:off' }]] } });
    }
    if (data === 'm:menu') { if (!u.lang) u.lang = 'jp'; return goto(chatId, from, u, 'menu', msg); }
    if (data.startsWith('v:')) return handleVerdict(cb);
    if (!data.startsWith('g:')) return;
    const [, fromId, idx] = data.split(':');
    const step = byId[fromId], btn = step && step.buttons[Number(idx)];
    if (!btn || !btn.to) return;
    if (!u.lang) u.lang = 'jp';
    // remember what the client chose, except for Back, Main menu and Cancel; the typed-area screen answers for its parent step
    if (!/^(back|main menu|cancel|language)/i.test(btn.l)) {
      const k = fromId.replace(/other$/, '');
      u.answers[k] = R.labelOf(step, Number(idx), u.lang);
      (u.keys = u.keys || {})[k] = btn.l; // English label, used to match listings whatever the client's language
    }
    return goto(chatId, from, u, btn.to, msg);
  }

  async function handleMessage(m) {
    const from = m.from, chatId = m.chat.id;
    if (m.chat.type !== 'private') return; // the bot only talks in private chats
    const text = (m.text || '').trim();
    const existed = !!store.get(from.id);
    const u = user(from);
    if (!existed && !isNick(u.id)) ops.track('new');
    const cmd = text.startsWith('/') ? text.split(/\s+/)[0].split('@')[0].toLowerCase() : '';

    if (cmd === '/start' || cmd === '/menu') {
      const payload = cmd === '/start' ? (text.split(/\s+/)[1] || '') : '';
      const ref = /^[A-Za-z0-9_-]{3,40}$/.test(payload) ? payload : '';
      if (!u.lang) {
        if (/^ja/i.test(from.language_code || '')) u.lang = 'jp';
        else { if (ref) u.pendingRef = ref; save(u); return goto(chatId, from, u, 'start'); }
      }
      if (ref) { save(u); return showRef(chatId, from, u, ref); }
      return goto(chatId, from, u, 'menu');
    }
    if (await agentArea.handleMessage(m, u, text, cmd)) return; // Phase 2: agent area and Nick's agent commands
    if (!u.lang) u.lang = /^ja/i.test(from.language_code || '') ? 'jp' : 'en';
    if (cmd === '/link' && isNick(from.id)) {
      const ref = (text.split(/\s+/)[1] || '').trim();
      return api('sendMessage', { chat_id: chatId, text: ref ? 'Link for ' + ref + ':\n' + botLink(ref) : 'Bot link:\n' + botLink() + '\n\nFor one unit send /link REF, for example /link TS5-5008', disable_web_page_preview: true });
    }
    if (cmd === '/stop') {
      const had = !!alerts.get(u.id); alerts.delete(u.id); save(u);
      return api('sendMessage', { chat_id: chatId, text: (had ? MSG.alertOff : MSG.alertNone)[u.lang] });
    }
    if (cmd === '/buy') return goto(chatId, from, u, 'b1');
    if (cmd === '/rent') return goto(chatId, from, u, 'rr1');
    if (cmd === '/tour') return goto(chatId, from, u, 'tour');
    if (cmd === '/estimate') return goto(chatId, from, u, 'calc1');
    if (cmd === '/nick') {
      save(u);
      return api('sendMessage', { chat_id: chatId, text: MSG.nick[u.lang], reply_markup: { inline_keyboard: [[{ text: MSG.nickBtn[u.lang], url: LINE }]] } });
    }
    if (cmd === '/myid') { save(u); return api('sendMessage', { chat_id: chatId, text: MSG.myid[u.lang].replace('{id}', String(from.id)) }); }
    if (cmd) return goto(chatId, from, u, 'refused');

    if (u.awaiting && u.awaiting.startsWith('area:')) {
      const [, nextId, stepId] = u.awaiting.split(':');
      const area = text.replace(/\s+/g, ' ').slice(0, 80);
      if (!area) { save(u); return goto(chatId, from, u, { b2: 'b2other', rr2: 'rr2other' }[stepId] || stepId); }
      u.answers[stepId] = area;
      (u.keys = u.keys || {})[stepId] = 'typed:' + area;
      return goto(chatId, from, u, nextId);
    }
    if (u.awaiting === 'calc') {
      const n = parseCalc(text);
      if (!n) { save(u); return api('sendMessage', { chat_id: chatId, text: MSG.calcBad[u.lang], parse_mode: 'HTML' }); }
      if (n.costs === null) {
        const yr = n.rent * 12, pct = (x) => ((x / n.price) * 100).toFixed(1);
        const v = { rent: R.esc(fmtUsd(yr)), gross: pct(yr), lo: pct(yr * (1 - 0.14 - 0.10)), hi: pct(yr * (1 - 0.14 - 0.05)) };
        u.awaiting = null; save(u);
        const body2 = R.render(byId.calc2, u.lang, {});
        let t2 = MSG.calcTwo[u.lang](v) + '\n\n<i>' + DISCLAIMER[u.lang] + '</i>';
        if (Number(v.gross) > 25) t2 += '\n\n' + MSG.calcCheck[u.lang];
        return api('sendMessage', Object.assign({ chat_id: chatId }, body2, { text: t2 }));
      }
      const yearlyRent = n.rent * 12, net = yearlyRent - n.costs, yld = (net / n.price) * 100;
      u.awaiting = null;
      const step = byId.calc2, body = R.render(step, u.lang, {});
      let t = body.text;
      const rows = [[R.esc(fmtUsd(yearlyRent))], [R.esc(fmtUsd(n.costs))], [R.esc(fmtUsd(net))]];
      // fill the three [amount] placeholders in order, then [result]
      t = t.replace('$[amount]', rows[0][0]).replace('$[amount]', rows[1][0]).replace('$[amount]', rows[2][0]).replace('[result]', yld.toFixed(1));
      if (yld > 25 || yld < 0) t += '\n\n' + MSG.calcCheck[u.lang];
      save(u);
      return api('sendMessage', Object.assign({ chat_id: chatId }, body, { text: t }));
    }
    if (u.awaiting === 'check') {
      await api('forwardMessage', { chat_id: nickId, from_chat_id: chatId, message_id: m.message_id });
      return goto(chatId, from, u, 'check2');
    }
    save(u);
    return goto(chatId, from, u, 'unknown');
  }

  async function handleUpdate(update) {
    try {
      // Private test mode: until Nick opens the bot, only he and his tester accounts can use it. Everyone else gets one polite line.
      if (isPrivate && isPrivate()) {
        const from = update.callback_query ? update.callback_query.from : update.message && update.message.from;
        const chat = update.callback_query ? update.callback_query.message && update.callback_query.message.chat : update.message && update.message.chat;
        if (from && !seesPreview(from.id)) {
          if (update.callback_query) await api('answerCallbackQuery', { callback_query_id: update.callback_query.id });
          if (chat && chat.type === 'private' && (!update.message || update.message.text)) {
            const lang = (store.get(from.id) || {}).lang || (/^ja/i.test(from.language_code || '') ? 'jp' : 'en');
            await api('sendMessage', { chat_id: chat.id, text: MSG.closed[lang] });
          }
          return;
        }
      }
      if (update.callback_query) return await handleCallback(update.callback_query);
      if (update.message) return await handleMessage(update.message);
    } catch (e) {
      if (onError) onError(e);
      try {
        const chat = update.callback_query ? update.callback_query.message && update.callback_query.message.chat : update.message && update.message.chat;
        if (chat && chat.type === 'private') {
          const lang = (store.get(chat.id) || {}).lang || 'jp';
          await api('sendMessage', Object.assign({ chat_id: chat.id }, R.render(byId.error, lang, {})));
        }
      } catch (e2) { /* nothing more to do */ }
    }
  }
  return { handleUpdate, byId, runAlerts, runOps, runAgentChecks: () => agentArea.runChecks(), botLink, ops };
}

module.exports = { createBot, parseThree, parseCalc, DISCLAIMER, MSG };
