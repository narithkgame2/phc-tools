// @Nick_Cambodia_Bot, Phase 1 (clients only). All Telegram calls go through the injected `api`, so tests run offline.
// createBot({ api, store, flow, nickId }) -> { handleUpdate(update) }
const R = require('./engines/render.js');
const L = require('./engines/listings.js');
const { createAgentArea } = require('./engines/agents.js');
const { createOps } = require('./engines/ops.js');
const { compareText } = require('./engines/compare.js');
const { leadFor } = require('./engines/crm.js');

const DISCLAIMER = {
  jp: '※利回り・価格は参考値であり、将来の収益を保証するものではありません。',
  en: 'Yields and prices are for reference only and do not guarantee future income.',
  kh: 'ផលចំណេញ និងតម្លៃគឺសម្រាប់ជាឯកសារយោងប៉ុណ្ណោះ ហើយមិនធានាប្រាក់ចំណូលនាពេលអនាគតទេ។',
};
const MSG = {
  // a unit opened from a channel link: the client did not search, so no "close to your search"
  refHead: { jp: '<b>物件の詳細</b>', en: '<b>Listing details</b>', kh: '<b>ព័ត៌មានលម្អិតអំពីអចលនទ្រព្យ</b>' },
  simHead: { jp: '<b>この物件と、似た条件の物件</b>', en: '<b>This unit and similar ones</b>', kh: '<b>អចលនទ្រព្យនេះ និងអចលនទ្រព្យស្រដៀងគ្នា</b>' },
  simNone: { jp: '似た条件の物件は、今はほかにありません。メインメニューから条件を変えて探せます。', en: 'No similar units right now. Use the main menu to search with other options.', kh: 'ឥឡូវនេះមិនទាន់មានអចលនទ្រព្យស្រដៀងគ្នាទេ។ សូមប្រើម៉ឺនុយមេដើម្បីស្វែងរកតាមជម្រើសផ្សេង។' },
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
    en: 'Nick answers on Telegram. He replies within 1 business day.',
    kh: 'Nick ឆ្លើយតបតាម Telegram។ គាត់ឆ្លើយក្នុងរយៈពេល 1 ថ្ងៃធ្វើការ។',
  },
  guideAsk: {
    jp: 'ご質問はLINEでどうぞ。Nick本人が1営業日以内にお答えします。',
    en: 'Questions? Message Nick on Telegram. He replies within 1 business day.',
    kh: 'មានសំណួរ? សូមផ្ញើសារទៅ Nick តាម Telegram។ គាត់ឆ្លើយក្នុងរយៈពេល 1 ថ្ងៃធ្វើការ។',
  },
  guideCap: {
    jp: '<b>購入前に知っておきたい5つのこと（2026年版）</b>\nご質問はLINEでどうぞ。Nick本人が1営業日以内にお答えします。',
    en: '<b>5 things to know before you buy (2026)</b>\nQuestions? Message Nick on Telegram. He replies within 1 business day.',
    kh: '<b>រឿង 5 ដែលគួរដឹងមុនពេលទិញ (2026)</b>\nឯកសារនេះជាភាសាអង់គ្លេស។ មានសំណួរ? សូមផ្ញើសារទៅ Nick តាម Telegram។ គាត់ឆ្លើយក្នុងរយៈពេល 1 ថ្ងៃធ្វើការ។',
  },
  nickBtn: { jp: 'LINEでNickに相談', en: 'Message Nick on Telegram', kh: 'និយាយជាមួយ Nick តាម Telegram' },
  listHead: { jp: '<b>ご希望に近い物件</b>', en: '<b>Available now, close to your search</b>', kh: '<b>ជម្រើសដែលសមនឹងការស្វែងរករបស់អ្នក</b>' },
  ask: { jp: 'この物件について聞く {id}', en: 'Ask about {id}', kh: 'សួរអំពី {id}' },
  askDone: {
    jp: 'Nickに伝えました。詳細は公式LINEでご案内します。',
    en: 'I told Nick. He will share details on Telegram.',
    kh: 'ខ្ញុំបានប្រាប់ Nick ហើយ។ គាត់នឹងផ្តល់ព័ត៌មានលម្អិតតាម Telegram។',
  },
  checkingMsg: { jp: '確認中です。分かり次第お知らせします。', en: 'I am checking this for you. I will tell you as soon as I know.', kh: 'កំពុងពិនិត្យ។ ខ្ញុំនឹងប្រាប់អ្នកភ្លាមៗនៅពេលដឹង។' },
  availableMsg: {
    jp: '確認が取れました。{name}は現在ご案内可能です。詳細と内覧のご相談は公式LINEで承ります。',
    en: 'Confirmed. {name} is available now. Details and viewings are arranged on Telegram.',
    kh: 'បានបញ្ជាក់ហើយ។ {name} នៅទំនេរឥឡូវនេះ។ ព័ត៌មានលម្អិត និងការមើលជាក់ស្តែងតាម Telegram។',
  },
  goneMsg: {
    jp: 'お問い合わせありがとうございます。{name}は成約済みまたは募集終了と確認しました。近い条件の物件をお探ししますので、メインメニューから条件を変えてご覧になるか、LINEでご相談ください。',
    en: 'Thank you for asking. {name} is no longer available. Go to the main menu to look again with other options, or message Nick on Telegram.',
    kh: 'អរគុណសម្រាប់ការសួរ។ {name} លែងមានហើយ។ សូមត្រឡប់ទៅម៉ឺនុយមេដើម្បីស្វែងរកម្តងទៀត ឬផ្ញើសារទៅ Nick តាម Telegram។',
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
  cmpBtn: { jp: '{n}件を比較する', en: 'Compare these {n}', kh: 'ប្រៀបធៀប {n}' },
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
// Japanese sizes carry tsubo too (Nick 2026-10-27): 32㎡（専有・約9.7坪）
const { jpSize, floorJP, floorEN } = require('./engines/sizes.js');
const unitSqm = (n, lang) => n + (lang === 'jp' ? '㎡' : ' sqm');
function sizeText(l, lang) {
  const jp = lang === 'jp';
  if (l.net && l.gross) return jp ? jpSize(l.net, 'net') + ' / ' + l.gross + '㎡' + BASIS.gross.jp : l.net + ' sqm net / ' + l.gross + ' sqm gross'; // one tsubo figure, on the net size
  if (l.net) return jp ? jpSize(l.net, 'net') : l.net + ' sqm net';
  if (l.gross) return jp ? jpSize(l.gross, 'gross') : l.gross + ' sqm gross';
  if (!l.sqm) return '';
  if (jp) return jpSize(l.sqm, l.basis) + (l.from ? 'から' : '');
  return (l.from ? 'from ' : '') + unitSqm(l.sqm, lang) + basisText(l, lang);
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

// Pictures used by screens (config/flow.json "photo"), served from the public repository so any copy of the bot can send them.
const GUIDE = { jp: 'guide-5-things-2026-jp.pdf', en: 'guide-5-things-2026-en.pdf' }; // built by assets/faq/build-guide-pdf.cjs
const MEDIA_BASE = process.env.MEDIA_BASE_URL || 'https://raw.githubusercontent.com/narithkgame2/phc-tools/feat/bot-color-cards-and-guards/telegram-bot-public/assets/';

// the ☰ command menu; Khmer clients get the English list until Nick has checked a Khmer one
const COMMANDS = {
  jp: [['start', 'メインメニュー'], ['buy', '購入物件を探す'], ['rent', '賃貸物件を探す'], ['tour', '内覧を予約する'], ['estimate', '手取りを計算する'], ['guide', '無料資料（PDF）を受け取る'], ['faq', 'よくある質問'], ['nick', 'Nickに相談する'], ['stop', '新着通知を停止する']],
  en: [['start', 'Main menu'], ['buy', 'Find a property to buy'], ['rent', 'Find a place to rent'], ['tour', 'Book a tour'], ['estimate', 'Estimate with my numbers'], ['guide', 'Get the free guide (PDF)'], ['faq', 'Common questions'], ['nick', 'Talk to Nick'], ['stop', 'Stop new listing alerts']],
};
const commandList = (lang) => (COMMANDS[lang] || COMMANDS.en).map(([command, description]) => ({ command, description }));

function createBot({ api, store, flow, nickId, onError, getListings, listingState, alertStore, testerIds, isPrivate, agentData, channels, places, events, botUsername, now, translate, crm, guideStore, later }) {
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
  const contactUrl = (lang) => (lang && lang !== 'jp' && flow.telegram) || LINE; // Japanese clients: LINE; English and Khmer: Nick's Telegram

  const user = (from) => {
    let u = store.get(from.id);
    if (!u) { u = { id: from.id, lang: null, answers: {}, awaiting: null, firstSeen: new Date().toISOString() }; }
    if (from.username && u.username !== from.username.toLowerCase()) { u.username = from.username.toLowerCase(); store.set(u.id, u); } // lets Nick add an agent by @username
    return u;
  };
  const findUserByUsername = (name) => (store.all ? store.all().find((x) => x.username === String(name).toLowerCase()) : null) || null;
  const save = (u) => store.set(u.id, u);
  const nameOf = (from) => [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Client';

  // What a client showed interest in. Kept across searches (u.answers is cleared at the main menu); shown to Nick on his
  // alerts and sent to the PHC CRM when the client shows real interest (guide, Ask, search request, tour, Ask Nick form).
  const noteInt = (u, k, v) => { if (!v) return; u.int = u.int || {}; u.int[k] = (u.int[k] || []).filter((x) => x !== v).concat([v]).slice(-5); };
  function interestLines(u, esc) {
    const e = esc || R.esc, it = u.int || {}, out = [];
    if (it.from) out.push('Came from: ' + e(it.from));
    if (it.searches && it.searches.length) out.push('Searched: ' + e(it.searches.join(' | ')));
    if (it.faq && it.faq.length) out.push('Read: ' + e(it.faq.join(', ')));
    if (it.asks && it.asks.length) out.push('Asked about: ' + e(it.asks.join(', ')));
    if (it.guide) out.push('Guide sent: ' + e(it.guide));
    return out;
  }
  async function toCrm(u, from, event, extra) {
    if (!crm || isNick(u.id)) return; // Nick testing his own bot never becomes a CRM row
    const lead = Object.assign(leadFor(u, from, { tester: isTester(u.id) }), extra || {});
    await crm.upsert(lead, [event].concat(interestLines(u, (x) => String(x))).join('. '));
  }

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
    // a screen with a picture: the picture carries the text as its caption and the buttons (a new message, a text message cannot become a photo)
    const pic = step.photo && step.photo[u.lang || 'jp'];
    if (pic) {
      const photo = MEDIA_BASE + pic, short = body.text.replace(/<[^>]+>/g, '').length <= 1000;
      const r = short
        ? await api('sendPhoto', { chat_id: chatId, photo, caption: body.text, parse_mode: 'HTML', reply_markup: body.reply_markup })
        : await api('sendPhoto', { chat_id: chatId, photo });
      if (r && r.ok !== false) return short ? r : api('sendMessage', Object.assign({ chat_id: chatId }, body));
      // the picture could not be sent: the answer still goes out as text
    }
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
    const det = [];
    const add = (k, label) => { if (a[k]) { lines.push(label + ': ' + R.esc(a[k])); det.push(label.toLowerCase() + ' ' + a[k]); } };
    if (step.id === 'bres') { add('b1', 'Budget'); add('b2', 'District'); }
    if (step.id === 'rres') { add('rr1', 'Monthly budget'); add('rr2', 'District'); }
    if (step.id === 'leaddone') { add('lead1', 'Goal'); add('lead2', 'Timeline'); add('lead3', 'Reply by'); if (a.b1 || a.rr1) lines.push('Last search: ' + R.esc(summaryFor(u, a.rr1 ? ['rr1', 'rr2'] : ['b1', 'b2']))); }
    if (step.id === 'tourok') { add('tour', 'Tour'); add('tourday', 'Day'); add('tourtime', 'Time'); }
    lines.push.apply(lines, interestLines(u));
    lines.push('Open chat: tg://user?id=' + u.id);
    await api('sendMessage', { chat_id: nickId, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true });
    await toCrm(u, from, step.notify + (det.length ? ' (' + det.join(', ') + ')' : ''));
  }

  function listingText(l, lang) {
    const note = lang === 'jp' ? l.noteJp : l.noteEn;
    const price0 = l.type === 'buy' ? fmtUsd(l.price) : fmtUsd(l.rent) + (lang === 'jp' ? '/月' : lang === 'kh' ? '/ខែ' : '/mo');
    const price = l.from ? (lang === 'jp' ? price0 + 'から' : (lang === 'kh' ? 'ចាប់ពី ' : 'from ') + price0) : price0;
    const facts = [price, sizeText(l, lang), l.beds ? l.beds + (lang === 'jp' ? 'ベッドルーム' : 'BR') : '', l.floor ? (lang === 'jp' ? floorJP(l.floor) : floorEN(l.floor)) : '', perSqm(l, lang)].filter(Boolean).join(' · ');
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
    if (found.length >= 2) kb.push([{ text: MSG.cmpBtn[lang].replace('{n}', String(Math.min(found.length, 3))), callback_data: 'cmp:' + found.slice(0, 3).map((l) => l.id).join(',') }]);
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
    if (step.id === 'bres' || step.id === 'rres') {
      noteInt(u, 'searches', (step.id === 'bres' ? 'buy ' : 'rent ') + summaryFor(u, step.id === 'bres' ? ['b1', 'b2'] : ['rr1', 'rr2']));
      if (step.id === 'bres' && u.keys && u.keys.b1) { u.int.budget = u.keys.b1; } // English label, mapped to the CRM's budget bands
    }
    if (/^faq[1-5]$/.test(step.id) && byId.faq) noteInt(u, 'faq', (byId.faq.buttons.find((b) => b.to === step.id) || {}).l);
    if (step.id === 'leaddone' && u.keys && u.keys.lead2) { u.int = u.int || {}; u.int.timeline = u.keys.lead2; }
    u.awaiting = step.await || null;
    save(u);
    const shown = (step.id === 'bres' || step.id === 'rres') && await sendListings(chatId, u, step.id === 'bres' ? 'buy' : 'rent');
    await send(chatId, u, step, Object.assign(varsFor(u, step.id), extraVars || {}), shown ? null : edit);
    await notifyNick(u, from, step);
    if (step.id === 'forgetdone') { store.delete(u.id); alerts.delete(u.id); if (crm) await crm.forget(u.id); } // the client asked to delete everything, the CRM row included
  }

  // tells every client who asked about a unit in the last 7 days that it is gone (used when an agent marks a unit sold)
  async function tellAskersGone(ref, name) {
    const st = state.get(ref) || {};
    const others = (st.askers || []).filter((x) => (clock() - Date.parse(x.at)) / DAY <= 7);
    for (const x of others) {
      const lg = x.lang || 'jp';
      await api('sendMessage', { chat_id: x.id, text: MSG.goneMsg[lg].replace('{name}', R.esc(name)), parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: MSG.nickBtn[lg], url: contactUrl(lg) }], [{ text: MSG.menuBtn[lg], callback_data: 'm:menu' }]] } });
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
    track: (type, d) => ops.track(type, d), translate: translate || null, later, botLink, availLine: MSG.avail.jp, findDuplicates, markUnavailable,
    reopen: (ref) => { const st = state.get(ref); if (st && st.status === 'unavailable') state.set(ref, Object.assign({}, st, { status: 'available', at: new Date(clock()).toISOString(), prev: { status: st.status, at: st.at } })); } });

  // Nick's buttons on a listing inquiry: v:<a|n|c|u>:<ref>[:<client id>]. Only Nick can use them.
  async function handleVerdict(cb) {
    if (!isNick(cb.from.id)) return;
    const [, act, ref, clientId] = (cb.data || '').split(':');
    const listing = (await rawListings()).find((x) => x.id === ref);
    const name = R.esc(listing ? listing.name : ref);
    const lineKb = (lang) => ({ inline_keyboard: [[{ text: MSG.nickBtn[lang], url: contactUrl(lang) }]] });
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
      const kb = (l) => ({ inline_keyboard: [[{ text: MSG.nickBtn[l], url: contactUrl(l) }], [{ text: MSG.menuBtn[l], callback_data: 'm:menu' }]] });
      let told = 0;
      for (const x of others) { await api('sendMessage', { chat_id: x.id, text: MSG.goneMsg[x.lang || 'jp'].replace('{name}', name), parse_mode: 'HTML', reply_markup: kb(x.lang || 'jp') }); if (String(x.id) !== String(clientId)) told++; }
      if (!others.some((x) => String(x.id) === String(clientId))) await api('sendMessage', { chat_id: clientId, text: MSG.goneMsg[lang].replace('{name}', name), parse_mode: 'HTML', reply_markup: kb(lang) });
      const posts = agentArea && agentArea.markGone ? await agentArea.markGone(ref) : null; // a unit this bot posted: its channel posts show 🔴 掲載終了
      return tellNick('<b>' + R.esc(ref) + '</b> is now hidden from every client. ' + told + ' other client(s) who asked in the last 7 days were told.' + (posts !== null ? (posts ? '\n' + posts + ' channel post(s) now show 🔴 no longer available.' : '') : '\nPlease also set it to Sold or Rented in the Sheet or on the website.'), { inline_keyboard: [[{ text: 'Undo', callback_data: 'v:u:' + ref }]] });
    }
    if (act === 'u') {
      const prev = st.prev;
      const next = Object.assign({}, st); delete next.prev;
      if (prev && prev.status) { next.status = prev.status; next.at = prev.at; } else { delete next.status; delete next.at; }
      state.set(ref, next);
      const back = agentArea && agentArea.undoGone ? await agentArea.undoGone(ref) : null;
      return tellNick('<b>' + R.esc(ref) + '</b> is back to how it was before your last tap.' + (back ? ' ' + back + ' channel post(s) restored.' : ''));
    }
  }

  async function sendPriceDrop(clientId, lang, l, old) {
    const now = l.type === 'buy' ? l.price : l.rent, pct = Math.round(((old - now) / old) * 100);
    const head = MSG.dropHead[lang] + '\n<b>' + fmtUsd(old) + ' → ' + fmtUsd(now) + '</b> (-' + pct + '%)';
    return api('sendMessage', Object.assign({ chat_id: clientId }, composeListings([l], lang, head).body));
  }
  // a link such as t.me/Nick_Cambodia_Bot?start=TS5-5008 opens that unit directly (for LINE, Instagram and channel posts)
  function sendMedia(chatId, media) {
    const items = (media || []).slice(0, 10);
    if (!items.length) return Promise.resolve(null);
    if (items.length === 1) return items[0].t === 'video' ? api('sendVideo', { chat_id: chatId, video: items[0].id }) : api('sendPhoto', { chat_id: chatId, photo: items[0].id });
    return api('sendMediaGroup', { chat_id: chatId, media: items.map((x) => ({ type: x.t === 'video' ? 'video' : 'photo', media: x.id })) });
  }
  async function showRef(chatId, from, u, ref) {
    const l = (await loadListings(from.id)).find((x) => x.id.toLowerCase() === ref.toLowerCase());
    if (!isNick(u.id)) ops.track('deeplink', { ref });
    if (!(u.int && u.int.from)) { u.int = u.int || {}; u.int.from = 'unit link ' + ref; save(u); }
    if (!l) return api('sendMessage', { chat_id: chatId, text: MSG.refGone[u.lang], reply_markup: { inline_keyboard: [[{ text: MSG.menuBtn[u.lang], callback_data: 'm:menu' }]] } });
    // a unit opened from a channel link shows its photos first, then the card with the buttons
    if (l.media && l.media.length) { ops.track('photos', { ref: l.id }); await sendMedia(chatId, l.media); }
    const body = composeListings([l], u.lang, MSG.refHead[u.lang]).body;
    body.reply_markup.inline_keyboard = body.reply_markup.inline_keyboard.filter((row) => !row.some((b) => /^ph:/.test(b.callback_data || '')));
    body.reply_markup.inline_keyboard.push([{ text: MSG.menuBtn[u.lang], callback_data: 'm:menu' }]);
    return api('sendMessage', Object.assign({ chat_id: chatId }, body));
  }
  // The free guide (cover, the 5 FAQ pages, contacts) as a PDF in the chat. Japanese clients get the Japanese guide,
  // everyone else the English one (the Khmer FAQ is not approved yet). Nick hears about it once, and the client becomes a CRM row.
  // A guide Nick sent to the bot himself (caption /setguide jp or /setguide en, for example the full Japanese condo report)
  // wins over the small built guide. Telegram keeps the file, so a big PDF is no problem and it is never put on a public website.
  const gmem = {};
  const guides = guideStore || { get: (k) => gmem[k], set: (k, v) => { gmem[k] = v; } };
  async function sendGuide(chatId, from, u) {
    if (!u.lang) u.lang = 'jp';
    const first = !(u.int && u.int.guide);
    u.int = u.int || {}; u.int.guide = new Date(clock()).toISOString().slice(0, 10); save(u);
    const own = guides.get(u.lang === 'jp' ? 'jp' : 'en');
    const file = own ? own.fileId : MEDIA_BASE + 'faq/' + (u.lang === 'jp' ? GUIDE.jp : GUIDE.en);
    const cap = own ? '<b>' + R.esc(own.title) + '</b>\n' + MSG.guideAsk[u.lang] : MSG.guideCap[u.lang];
    const kb = { inline_keyboard: [[{ text: MSG.nickBtn[u.lang], url: contactUrl(u.lang) }], [{ text: MSG.menuBtn[u.lang], callback_data: 'm:menu' }]] };
    const r = await api('sendDocument', { chat_id: chatId, document: file, caption: cap, parse_mode: 'HTML', reply_markup: kb });
    if (!r || r.ok === false) await api('sendMessage', { chat_id: chatId, text: MSG.guideCap[u.lang] + '\n' + MEDIA_BASE + 'faq/' + (u.lang === 'jp' ? GUIDE.jp : GUIDE.en), parse_mode: 'HTML', reply_markup: kb });
    if (isNick(u.id) || !first) return;
    ops.track('guide', { lang: u.lang });
    if (nickId) {
      await api('sendMessage', { chat_id: nickId, parse_mode: 'HTML', disable_web_page_preview: true, text: ['<b>Guide sent</b>' + (isTester(u.id) ? ' <i>(tester account)</i>' : ''),
        'Client: ' + R.esc(nameOf(from)) + (from.username ? ' (@' + R.esc(from.username) + ')' : '') + ' (' + u.id + ')', 'Language: ' + String(u.lang).toUpperCase()]
        .concat(interestLines(u).filter((x) => !/^Guide sent/.test(x)), ['Open chat: tg://user?id=' + u.id]).join('\n') });
    }
    await toCrm(u, from, 'Guide sent (' + (u.lang === 'jp' ? 'Japanese' : 'English') + ' PDF)');
  }

  // The channel button 似た物件を探す (t.me/...?start=sim_REF): the client has seen the post and its photos, so the bot shows
  // that unit's card and up to 3 similar units (same sale or rent, price within 25%, same area first), no photos again.
  async function showSimilar(chatId, from, u, ref) {
    const all = await loadListings(from.id);
    const l = all.find((x) => x.id.toLowerCase() === ref.toLowerCase());
    if (!isNick(u.id)) ops.track('deeplink', { ref, similar: true });
    if (!(u.int && u.int.from)) { u.int = u.int || {}; u.int.from = 'channel post ' + ref; save(u); }
    if (!l) return api('sendMessage', { chat_id: chatId, text: MSG.refGone[u.lang], reply_markup: { inline_keyboard: [[{ text: MSG.menuBtn[u.lang], callback_data: 'm:menu' }]] } });
    const price = (x) => (x.type === 'rent' ? x.rent : x.price) || 0, p0 = price(l);
    // the same flat listed twice (the Sheet and an agent, for example) is not a "similar" unit
    const same = (x) => nk(x.name) === nk(l.name) && ((x.floor && l.floor && String(x.floor) === String(l.floor) && String(x.beds || '') === String(l.beds || '')) || (x.net && l.net && Math.abs(x.net - l.net) < 0.5));
    const near = all.filter((x) => x.id !== l.id && !same(x) && x.type === l.type && p0 && price(x) && Math.abs(price(x) - p0) / p0 <= 0.25)
      .sort((a, b) => ((a.district === l.district ? 0 : 1) - (b.district === l.district ? 0 : 1)) || (Math.abs(price(a) - p0) - Math.abs(price(b) - p0))).slice(0, 3);
    const body = composeListings([l].concat(near), u.lang, MSG.simHead[u.lang]).body;
    if (!near.length) body.text += '\n\n' + MSG.simNone[u.lang];
    // the unit's own photos are in the channel already; the photo buttons stay for the similar units
    body.reply_markup.inline_keyboard = body.reply_markup.inline_keyboard.filter((row) => !row.some((b) => b.callback_data === 'ph:' + l.id));
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
        // the ☰ menu follows the language picked here, not the language of the client's Telegram app
        const set = await api('setMyCommands', { commands: commandList(lang), scope: { type: 'chat', chat_id: chatId } });
        if (set && set.ok) u.menuSet = true;
        if (u.pendingRef) { const r = u.pendingRef; delete u.pendingRef; save(u); return r.toLowerCase() === 'guide' ? sendGuide(chatId, from, u) : /^sim_/i.test(r) ? showSimilar(chatId, from, u, r.slice(4)) : showRef(chatId, from, u, r); }
        return goto(chatId, from, u, 'menu', msg);
      }
      return;
    }
    if (data.startsWith('q:')) {
      const l = (await loadListings(from.id)).find((x) => x.id === data.slice(2));
      if (!l) return;
      if (!u.lang) u.lang = 'jp';
      noteInt(u, 'asks', l.id);
      save(u);
      const st = state.get(l.id) || {};
      st.askers = (st.askers || []).filter((x) => x.id !== u.id).concat([{ id: u.id, lang: u.lang, at: new Date(clock()).toISOString() }]).slice(-50);
      state.set(l.id, st);
      if (!isNick(u.id)) { ops.track('ask', { ref: l.id }); ops.askOpened(l.id, u.id, l.name, nameOf(from) + (from.username ? ' (@' + from.username + ')' : '')); }
      if (nickId) {
        const rent = l.type === 'rent';
        await api('sendMessage', { chat_id: nickId, text: '<b>Listing interest</b>' + (isNick(u.id) ? ' <i>(your own test)</i>' : isTester(u.id) ? ' <i>(tester account)</i>' : '') + '\nClient: ' + R.esc(nameOf(from)) + (from.username ? ' (@' + R.esc(from.username) + ')' : '') + ' (' + u.id + ')\nListing: ' + R.esc(l.id + ' ' + l.name) + (areaText(l) ? ', ' + R.esc(areaText(l)) : '') + ', ' + fmtUsd(rent ? l.rent : l.price) + (rent ? '/month' : '') + interestLines(u).map((x) => '\n' + x).join('') + '\nOpen chat: tg://user?id=' + u.id, parse_mode: 'HTML', disable_web_page_preview: true,
          reply_markup: { inline_keyboard: [[{ text: 'Available', callback_data: 'v:a:' + l.id + ':' + u.id }, { text: 'Not available', callback_data: 'v:n:' + l.id + ':' + u.id }], [{ text: 'Checking now', callback_data: 'v:c:' + l.id + ':' + u.id }]] } });
      }
      const done = await api('sendMessage', { chat_id: chatId, text: MSG.askDone[u.lang], reply_markup: { inline_keyboard: [[{ text: MSG.nickBtn[u.lang], url: contactUrl(u.lang) }]] } });
      await toCrm(u, from, 'Asked about ' + l.id + ' ' + l.name + ', ' + fmtUsd(l.type === 'rent' ? l.rent : l.price) + (l.type === 'rent' ? '/month' : ''), { interestedIn: l.id + ' ' + l.name });
      return done;
    }
    if (data === 'gd:get') return sendGuide(chatId, from, u);
    if (/^(aw|am|ac|ak|ua|ur|uc|uw|pn|pa|pr|wp|wx):/.test(data)) { if (await agentArea.handleCallback(cb, u)) return; }
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
    // Nick sets the guide PDF: send the file to the bot with the caption /setguide jp (or /setguide en)
    if (isNick(from.id) && m.document && /^\/setguide\b/i.test(m.caption || '')) {
      const lg = /^\/setguide\s+en\b/i.test(m.caption) ? 'en' : 'jp';
      // the title clients see: the text after "/setguide jp", else the file name (Telegram may turn its dots and spaces into _)
      const title = (m.caption.replace(/^\/setguide\s*(jp|en)?\s*/i, '').trim() || String(m.document.file_name || 'Guide').replace(/\.pdf$/i, '')).slice(0, 200);
      guides.set(lg, { fileId: m.document.file_id, title, size: m.document.file_size || 0, at: new Date(clock()).toISOString() });
      return api('sendMessage', { chat_id: chatId, text: 'Saved. ' + (lg === 'jp' ? 'Japanese clients' : 'English and Khmer clients') + ' who tap the guide button now get:\n' + title + (m.document.file_size ? ' (' + (m.document.file_size / 1048576).toFixed(1) + ' MB)' : '') });
    }

    if (cmd === '/start' || cmd === '/menu') {
      const payload = cmd === '/start' ? (text.split(/\s+/)[1] || '') : '';
      const ref = /^[A-Za-z0-9_-]{3,40}$/.test(payload) ? payload : '';
      if (!u.lang) {
        if (/^ja/i.test(from.language_code || '')) u.lang = 'jp';
        else { if (ref) u.pendingRef = ref; save(u); return goto(chatId, from, u, 'start'); }
      }
      if (ref.toLowerCase() === 'guide') { if (!(u.int && u.int.from)) { u.int = u.int || {}; u.int.from = 'guide link'; } save(u); return sendGuide(chatId, from, u); }
      if (/^sim_/i.test(ref)) { save(u); return showSimilar(chatId, from, u, ref.slice(4)); }
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
    if (cmd === '/guide') return sendGuide(chatId, from, u);
    if (cmd === '/faq') return goto(chatId, from, u, 'faq');
    if (cmd === '/nick') {
      save(u);
      return api('sendMessage', { chat_id: chatId, text: MSG.nick[u.lang], reply_markup: { inline_keyboard: [[{ text: MSG.nickBtn[u.lang], url: contactUrl(u.lang) }]] } });
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
      if (update.channel_post) { agentArea.watchPost(update.channel_post); return; } // a post in Nick's own channel (watch)
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
  return { handleUpdate, byId, runAlerts, runOps, runAgentChecks: () => agentArea.runChecks(), botLink, ops, flushWatch: () => agentArea.flushWatch() };
}

module.exports = { createBot, parseThree, parseCalc, DISCLAIMER, MSG, commandList };
