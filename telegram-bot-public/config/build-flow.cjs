// Builds config/flow.json from the Studio's Phase 1 export (config/phase1.source.json) plus the Phase 1 changes.
// Edit screens in the Studio, export, save as config/phase1.source.json, then run: node config/build-flow.cjs
const fs = require('fs'), path = require('path');
const LINE = 'https://line.me/ti/p/@615ueovq';
const TELEGRAM = 'https://t.me/Nick_REAKH'; // Nick's own Telegram, for English and Khmer clients
const src = JSON.parse(fs.readFileSync(path.join(__dirname, 'phase1.source.json'), 'utf8'));
const by = {}; src.forEach(s => by[s.id] = s);
function setTr(s, lang, t, b) { s.tr = s.tr || {}; s.tr[lang] = { t, b }; }
function request(id, back, enT, jpT, khT) {
  const s = by[id];
  s.title = s.title.replace('results', 'request');
  s.text = enT; s.notify = 'Search request';
  s.buttons = [{ l: 'Message Nick on LINE', to: '', half: false, url: LINE }, { l: 'Alert me to new matches', to: '', half: false, url: '', cb: 'al:on' }, { l: 'Change my search', to: back, half: false, url: '' }, { l: 'Main menu', to: 'menu', half: false, url: '' }];
  setTr(s, 'jp', jpT, ['LINEでNickに相談', '新着物件を通知する', '条件を変更する', 'メインメニュー']);
  setTr(s, 'kh', khT, ['និយាយជាមួយ Nick តាម LINE', 'ជូនដំណឹងពេលមានថ្មី', 'ប្តូរលក្ខខណ្ឌ', 'ម៉ឺនុយមេ']);
  s.note = 'Matching listings from the Sheet are shown above this screen when there are any. Either way Nick checks availability by hand and replies within 1 business day.';
}
request('bres', 'b1',
  '<b>Your search is saved</b>\n<i>[search summary]</i>\n\nNick will check availability and send you the three best options for this search within 1 business day.\nYou can also message him now on LINE.',
  '<b>ご希望の条件を承りました</b>\n<i>[search summary]</i>\n\nNickが空室状況を確認し、この条件に合う物件を3件、数字つきで1営業日以内にお送りします。\nお急ぎの場合は、今すぐLINEでもご相談いただけます。',
  '<b>យើងបានទទួលលក្ខខណ្ឌស្វែងរករបស់អ្នក</b>\n<i>[search summary]</i>\n\nNick នឹងពិនិត្យភាពអាចរកបាន ហើយផ្ញើជម្រើសល្អបំផុតចំនួន 3 ជូនអ្នកក្នុងរយៈពេល 1 ថ្ងៃធ្វើការ។\nអ្នកក៏អាចផ្ញើសារទៅគាត់តាម LINE ភ្លាមៗបានដែរ។');
request('rres', 'rr1',
  '<b>Your search is saved</b>\n<i>[search summary]</i>\n\nNick will check availability and send you the three best rental options for this search within 1 business day.\nYou can also message him now on LINE.',
  '<b>ご希望の条件を承りました</b>\n<i>[search summary]</i>\n\nNickが空室状況を確認し、この条件に合う賃貸物件を3件、1営業日以内にお送りします。\nお急ぎの場合は、今すぐLINEでもご相談いただけます。',
  '<b>យើងបានទទួលលក្ខខណ្ឌស្វែងរករបស់អ្នក</b>\n<i>[search summary]</i>\n\nNick នឹងពិនិត្យភាពអាចរកបាន ហើយផ្ញើជម្រើសសម្រាប់ជួលល្អបំផុតចំនួន 3 ជូនអ្នកក្នុងរយៈពេល 1 ថ្ងៃធ្វើការ។\nអ្នកក៏អាចផ្ញើសារទៅគាត់តាម LINE ភ្លាមៗបានដែរ។');
// wording fixes found in the Japanese review: the bot has no favourites and no keyword search, so the screens must not mention them
function retext(id, en, jp, kh) { const s = by[id]; s.text = en; s.tr.jp.t = jp; s.tr.kh.t = kh; }
retext('forget',
  '<b>Delete my data</b>\n\nThis removes your saved searches, new listing alerts and enquiry history.\nTap Confirm to delete.',
  '<b>データの削除</b>\n\n保存した検索条件、新着通知の設定、相談履歴を削除します。\n「確認」をタップすると削除されます。',
  '<b>លុបទិន្នន័យរបស់ខ្ញុំ</b>\n\nវានឹងលុបការស្វែងរកដែលបានរក្សាទុក ការជូនដំណឹងអំពីបញ្ជីថ្មី និងប្រវត្តិសាកសួរ។\nចុច \"បញ្ជាក់\" ដើម្បីលុប។');
retext('unknown',
  '<b>I did not catch that</b>\n\nPlease pick an option below.',
  '<b>うまく理解できませんでした</b>\n\n下のメニューから選んでください。',
  '<b>ខ្ញុំមិនយល់ទេ</b>\n\nសូមជ្រើសរើសជម្រើសខាងក្រោម។');
// results no longer branch to refine or "no match"
['bref', 'nores', 'offline'].forEach(id => delete by[id]);
by.more.tr.kh.b[0] = 'ពិនិត្យបញ្ជីអចលនទ្រព្យ'; // shorter, so Telegram does not cut it
// lead 3: LINE or Telegram only (WhatsApp is for non-Japanese leads, phone needs a number the bot does not collect)
const l3 = by.lead3;
[3, 2].forEach(i => { l3.buttons.splice(i, 1); ['jp', 'kh'].forEach(g => l3.tr && l3.tr[g] && l3.tr[g].b && l3.tr[g].b.splice(i, 1)); });
// free text steps: the client types, the bot reads it
by.calc1.await = 'calc'; by.check1.await = 'check';
[by.calc1, by.check1].forEach(s => { s.buttons = s.buttons.filter(b => !/^Simulate/.test(b.l)); if (s.tr) ['jp', 'kh'].forEach(g => { if (s.tr[g] && s.tr[g].b) s.tr[g].b = s.tr[g].b.filter(x => !/^Simulate/.test(x)); }); });
// buy budget: 4 bands plus "not decided" (decided with Nick 2026-10-24, from the budgets his Japanese clients really have)
(function () {
  const b1 = by.b1, last = b1.buttons[b1.buttons.length - 1];
  const en = ['Under $50,000', '$50,000 to $100,000', '$100,000 to $200,000', 'Above $200,000', 'Not decided yet'];
  const jp = ['5万ドル未満', '5万から10万ドル', '10万から20万ドル', '20万ドル以上', 'まだ決めていない'];
  const kh = ['តិចជាង $50,000', '$50,000 ដល់ $100,000', '$100,000 ដល់ $200,000', 'លើស $200,000', 'មិនទាន់សម្រេច'];
  const jpLast = b1.tr.jp.b[b1.tr.jp.b.length - 1], khLast = b1.tr.kh.b[b1.tr.kh.b.length - 1];
  b1.buttons = en.map(l => ({ l, to: 'b2', half: false, url: '' })).concat([last]);
  b1.tr.jp.b = jp.concat([jpLast]); b1.tr.kh.b = kh.concat([khLast]);
  b1.note = 'Four bands from what Nick\'s Japanese clients actually have, plus "not decided". Nick asks the exact budget on LINE.';
})();
// rent budget: same pattern, four bands plus "not decided" (Nick accepted the bands 2026-10-24)
(function () {
  const r1 = by.rr1, last = r1.buttons[r1.buttons.length - 1];
  const en = ['Under $500', '$500 to $800', '$800 to $1,500', 'Above $1,500', 'Not decided yet'];
  const jp = ['500ドル未満', '500から800ドル', '800から1,500ドル', '1,500ドル以上', 'まだ決めていない'];
  const kh = ['តិចជាង $500', '$500 ដល់ $800', '$800 ដល់ $1,500', 'លើស $1,500', 'មិនទាន់សម្រេច'];
  const jpLast = r1.tr.jp.b[r1.tr.jp.b.length - 1], khLast = r1.tr.kh.b[r1.tr.kh.b.length - 1];
  r1.buttons = en.map(l => ({ l, to: 'rr2', half: false, url: '' })).concat([last]);
  r1.tr.jp.b = jp.concat([jpLast]); r1.tr.kh.b = kh.concat([khLast]);
})();
// districts (decided with Nick 2026-10-25): six buttons in three rows of two (five areas and "Others"), then Back.
// "Others" opens a screen where the client types an area or a project name, or taps "No preference".
(function () {
  const en = ['Daun Penh', 'Tonle Bassac', 'BKK1', 'TTP', 'Toul Kork', 'Others'];
  const jp = ['ダウンペン', 'トンレバサック', 'BKK1', 'TTP', 'トゥールコック', 'その他'];
  const kh = ['ដូនពេញ', 'ទន្លេបាសាក់', 'BKK1', 'TTP', 'ទួលគោក', 'ផ្សេងៗ'];
  function make(id, next, other) {
    const s = by[id], back = s.buttons[s.buttons.length - 1];
    const jpBack = s.tr.jp.b[s.tr.jp.b.length - 1], khBack = s.tr.kh.b[s.tr.kh.b.length - 1];
    s.buttons = en.map((l, i) => ({ l, to: i === 5 ? other : next, half: true, url: '' })).concat([back]);
    s.tr.jp.b = jp.concat([jpBack]); s.tr.kh.b = kh.concat([khBack]);
    s.note = 'Three rows of two, then Back. TTP is Toul Tompoung. Others opens a screen to type an area or project name, or to skip.';
    const o = JSON.parse(JSON.stringify(s));
    o.id = other; o.title = id === 'b2' ? 'Buy 2: Others (typed)' : 'Rent 2: Others (typed)';
    o.text = '<b>Other area</b>\n\nType the area or the project name in the message box below, then press send.\n<i>Example: BKK3, Time Square 8</i>\n\nNo preference? Tap the button.';
    o.buttons = [{ l: 'No preference', to: next, half: false, url: '' }, { l: 'Back', to: id, half: false, url: '' }];
    o.tr = {
      jp: { t: '<b>その他のエリア</b>\n\n下のメッセージ欄に、エリア名または物件名を入力して送信してください。\n<i>例: BKK3、Time Square 8</i>\n\n特にご希望がなければ、下のボタンを押してください。', b: ['指定なし', '戻る'] },
      kh: { t: '<b>តំបន់ផ្សេងទៀត</b>\n\nសូមវាយឈ្មោះតំបន់ ឬឈ្មោះគម្រោង នៅក្នុងប្រអប់សារខាងក្រោម រួចចុចផ្ញើ។\n<i>ឧទាហរណ៍៖ BKK3, Time Square 8</i>\n\nបើគ្មានចំណូលចិត្តពិសេស សូមចុចប៊ូតុងខាងក្រោម។', b: ['មិនកំណត់', 'ត្រឡប់ក្រោយ'] },
    };
    o.await = 'area:' + next + ':' + id; o.note = 'The next message the client types is saved as the area, then the search request is sent. No preference skips it.';
    by[other] = o;
  }
  make('b2', 'bres', 'b2other'); make('rr2', 'rres', 'rr2other');
})();
// budget screens: buttons only on screen. If a client types a number anyway, the next message is saved as the budget.
[['b1', 'b2'], ['rr1', 'rr2']].forEach(([id, next]) => { by[id].await = 'area:' + next + ':' + id; });
// FAQ (Part 4): facts from the website FAQ, no company names, no contact channels other than the LINE button.
// Japanese wording needs a native review before launch. Khmer uses the English text for now (placeholder).
(function () {
  const LINEBTN = { l: 'Message Nick on LINE', to: '', half: false, url: LINE };
  const items = [
    // faq1 to faq4 follow the Trusted Agent training app (Nick, 2026-10-26: it holds the newest figures, from the Cambodia Condo Investment Guide 2026)
    // 2026-10-28 (Nick): faq2/faq3 matched to the guide: rental management 5% to 10%, lawyer back to $500* and a title transfer fee that depends on the project (Nick, same day), property tax above about $25,000, CGT from January 2027
    ['faq1', 'Foreign ownership', '外国人の所有', 'Foreign ownership',
      '<b>Foreigners can own property</b>\n\n▫️ <b>Floor:</b> a unit above the ground floor\n▫️ <b>Foreign quota:</b> up to 70% of a building\n▫️ <b>Title:</b> a strata title is required\n\n<blockquote>Foreigners cannot own land in their own name.</blockquote>\nAsk Nick on LINE for the details.',
      '<b>外国人も所有できます</b>\n\n▫️ <b>階数：</b>地上階より上の部屋\n▫️ <b>外国人枠：</b>1棟の70%まで\n▫️ <b>権利証：</b>ストラタタイトルが必要\n\n<blockquote>土地は、外国人の名義では所有できません。</blockquote>\n詳しくはLINEでご相談ください。'],
    ['faq2', 'Extra costs', '購入にかかる費用', 'Extra costs',
      '<b>Costs beyond the price</b>\n\n<b>When you buy</b>\n▫️ <b>Transfer tax:</b> 4%\n▫️ <b>Lawyer:</b> $500*\n▫️ <b>Title transfer fee:</b> depends on the project\n\n<b>While you own it</b>\n▫️ <b>Property tax:</b> 0.1% a year on the value above about $25,000\n▫️ <b>Building management:</b> $1 to $2 per sqm a month\n▫️ <b>Rental management:</b> 5% to 10% of the rent\n▫️ <b>Rental income tax:</b> 14% if you live abroad, 10% if resident\n\n<b>When you sell</b>\n▫️ <b>Capital gains tax:</b> 20% of the gain, scheduled from January 2027, may change\n\n<b>Depends on the project</b>\n▫️ <b>Furniture:</b> some units come furnished\n\n<i>*The usual fee in Cambodia. It depends on the lawyer, and a Japanese lawyer may cost more.</i>\n\n<blockquote>The booking fee and down payment are part of the price, not extra costs.</blockquote>\nSome developers pay the transfer tax as a promotion. Nick confirms the figures for each project.',
      '<b>物件価格以外の費用</b>\n\n<b>購入時</b>\n▫️ <b>移転税：</b>4%\n▫️ <b>弁護士：</b>500ドル※\n▫️ <b>所有権移転の手続き費用：</b>物件による\n\n<b>保有中</b>\n▫️ <b>固定資産税：</b>年0.1%（評価額のうち約2万5,000ドルを超える部分）\n▫️ <b>建物の管理費：</b>1㎡あたり月1ドルから2ドル\n▫️ <b>賃貸管理費：</b>家賃の5%から10%\n▫️ <b>賃貸収入の税金：</b>海外在住14%、居住者10%\n\n<b>売却時</b>\n▫️ <b>キャピタルゲイン税：</b>売却益の20%（2027年1月から開始予定、変更の可能性あり）\n\n<b>物件による</b>\n▫️ <b>家具：</b>家具付きの物件もあります\n\n<i>※カンボジアでの一般的な費用です。弁護士によって異なり、日本人弁護士の場合は高くなります。</i>\n\n<blockquote>予約金と頭金は、物件価格に含まれます。追加の費用ではありません。</blockquote>\n移転税をデベロッパーが負担するキャンペーンもあります。金額は物件ごとに確認してお伝えします。'],
    ['faq3', 'Rental tax and fees', '賃貸収入の税金', 'Rental tax and fees',
      '<b>What comes off the rent</b>\n\n▫️ <b>Tax:</b> 14% if you live abroad, 10% if resident\n▫️ <b>Rental management:</b> 5% to 10% of the rent\n▫️ <b>Building management:</b> $1 to $2 per sqm a month\n▫️ <b>Empty months:</b> plan for about 10% a year\n\n<blockquote>What you keep = rent minus tax, rental management, building management and empty months</blockquote>\nAsk Nick for an estimate on a real unit.',
      '<b>家賃から引かれるもの</b>\n\n▫️ <b>税金：</b>海外在住14%、居住者10%\n▫️ <b>賃貸管理費：</b>家賃の5%から10%\n▫️ <b>建物の管理費：</b>1㎡あたり月1ドルから2ドル\n▫️ <b>空室：</b>年に約10%を見込みます\n\n<blockquote>手取り ＝ 家賃 － 税金 － 賃貸管理費 － 建物の管理費 － 空室</blockquote>\n実際の物件での試算はLINEでどうぞ。'],
    ['faq4', 'How buying works', '購入の流れ', 'How buying works',
      '<b>The buying process: 6 steps</b>\n\n① <b>Booking:</b> fee of $500 to $2,000\n② <b>Down payment and contract:</b> 20% to 30%\n③ <b>Instalments:</b> during construction\n④ <b>Balance:</b> 40% to 50% at handover\n⑤ <b>Handover:</b> inspect the unit, collect the keys\n⑥ <b>Title:</b> registered in your name\n\n<blockquote>The steps are almost always the same. What changes is the amount and timing of each payment.</blockquote>\nAsk Nick for the plan of a specific project.',
      '<b>購入の流れ（6ステップ）</b>\n\n① <b>予約：</b>予約金 500ドルから2,000ドル\n② <b>頭金と契約：</b>価格の20%から30%\n③ <b>分割払い：</b>建設中に支払い\n④ <b>残金：</b>引き渡し時に40%から50%\n⑤ <b>引き渡し：</b>部屋を点検して鍵を受け取り\n⑥ <b>登記：</b>ご本人の名義に\n\n<blockquote>手順はほぼ共通です。違うのは、各段階の金額と期間です。</blockquote>\n物件ごとの支払い計画はLINEでお伝えします。'],
    // faq5 corrected by Nick 2026-10-26: no e-signature; the originals are signed and sent by courier (DHL or similar)
    ['faq5', 'Buying from abroad', '海外から購入', 'Buying from abroad',
      '<b>You can buy from abroad</b>\n\n① <b>Online:</b> choosing the unit, questions and transfers\n② <b>Contract:</b> signed by hand on the originals (no e-signature)\n③ <b>Courier:</b> originals go by DHL or similar, and the developer or seller signs them too\n\n<blockquote>A power of attorney is also possible, but the process is more involved.</blockquote>\nPrices and rents are usually in US dollars.',
      '<b>海外からでも購入できます</b>\n\n① <b>オンライン：</b>物件選び、ご相談、送金まで\n② <b>契約書：</b>原本に手書きで署名（電子署名は不可）\n③ <b>国際宅配便：</b>DHLなどで原本を送り、デベロッパーや売主も署名します\n\n<blockquote>委任状による購入も可能ですが、手続きが複雑になります。</blockquote>\n価格と家賃は、通常、米ドルで取引されます。'],
  ];
  const labels = ['Foreign ownership', 'Extra costs', 'Rental tax and fees', 'How buying works', 'Buying from abroad'];
  by.faq = {
    id: 'faq', flow: 'FAQ', title: 'Common questions',
    text: '<b>Common questions</b>\n\nPick a topic.',
    buttons: items.map((it) => ({ l: it[1], to: it[0], half: false, url: '' })).concat([{ l: 'Back', to: 'more', half: false, url: '' }]),
    note: 'Facts come from the website FAQ. No company names, no WhatsApp. Japanese wording needs a native review. Khmer shows English for now.',
    tr: {
      jp: { t: '<b>よくある質問</b>\n\n知りたい項目をお選びください。', b: items.map((it) => it[2]).concat(['戻る']) },
      kh: { t: '<b>សំណួរញឹកញាប់</b>\n\nសូមជ្រើសរើសប្រធានបទ។', b: items.map((it) => it[3]).concat(['ត្រឡប់ក្រោយ']) },
    },
  };
  items.forEach((it) => {
    by[it[0]] = {
      id: it[0], flow: 'FAQ', title: 'FAQ: ' + it[1], text: it[4],
      buttons: [Object.assign({}, LINEBTN), { l: 'Back', to: 'faq', half: false, url: '' }],
      note: 'Facts from the website FAQ. Japanese needs a native review. Khmer shows English for now.',
      tr: { jp: { t: it[5], b: ['LINEでNickに相談', '戻る'] }, kh: { t: it[4], b: ['និយាយជាមួយ Nick តាម LINE', 'ត្រឡប់ក្រោយ'] } },
    };
  });
  // FAQ pictures (Nick 2026-10-26): shown with the answer as the caption, per language. English since 2026-10-26.
  // Khmer pictures exist as drafts (assets/faq/*-kh.png) and are switched on only after Nick has checked the Khmer: add 'kh' to LANGS_WITH_PICTURES.
  // v is a short fingerprint of the file, so Telegram fetches a changed picture again instead of a cached one.
  const LANGS_WITH_PICTURES = { jp: '', en: '-en' };
  const pics = { faq1: 'faq-01-ownership', faq2: 'faq-03-costs', faq3: 'faq-04-rental', faq4: 'faq-02-process', faq5: 'faq-05-abroad' };
  Object.keys(pics).forEach((id) => {
    by[id].photo = {};
    Object.keys(LANGS_WITH_PICTURES).forEach((lang) => {
      const name = pics[id] + LANGS_WITH_PICTURES[lang] + '.png';
      const v = require('crypto').createHash('sha1').update(fs.readFileSync(path.join(__dirname, '..', 'assets', 'faq', name))).digest('hex').slice(0, 8);
      by[id].photo[lang] = 'faq/' + name + '?v=' + v;
    });
  });
  // the More menu gets the FAQ as its first button
  by.more.buttons.unshift({ l: 'Common questions', to: 'faq', half: false, url: '' });
  by.more.tr.jp.b.unshift('よくある質問'); by.more.tr.kh.b.unshift('សំណួរញឹកញាប់');
  // the estimate (Nick 2026-10-28): one question at a time (price, rent, size), the result is a money breakdown (bot.js + engines/estimate.js);
  // a client may instead send their own calculation, which reaches Nick first as a draft he sends or answers himself
  const KH_BACK = 'ត្រឡប់ក្រោយ';
  by.calc1.text = '<b>Estimate with my numbers</b>\n\nThree short questions, then you see what you keep each year.\n\n<b>① What is the price?</b> (USD)\nExample: <code>68000</code>\n\n<i>You can also send all three at once: price, rent, size, like <code>68000 650 35</code></i>';
  by.calc1.tr.jp.t = '<b>ご自身の数値で試算</b>\n\n3つの質問のあと、年間の手取りが分かります。\n\n<b>① 物件の価格は？</b>（ドル）\n例：<code>68000</code>\n\n<i>価格、家賃、広さの3つをまとめて <code>68000 650 35</code> と送ることもできます。</i>';
  by.calc1.tr.kh.t = by.calc1.text;
  by.calc1.await = 'calc_price';
  by.calc1.buttons = [{ l: 'Send my own calculation', to: 'calcown', half: false, url: '' }, { l: 'Back', to: 'more', half: false, url: '' }];
  by.calc1.tr.jp.b = ['自分の計算を送る', '戻る']; by.calc1.tr.kh.b = ['Send my own calculation', KH_BACK];
  by.calcrent = { id: 'calcrent', flow: 'Estimate', title: 'Estimate: rent', await: 'calc_rent',
    text: '<b>② What is the monthly rent?</b> (USD)\nExample: <code>650</code>',
    buttons: [{ l: 'Ask Nick about the rent', to: '', half: false, url: LINE }, { l: 'Back', to: 'calc1', half: false, url: '' }],
    tr: { jp: { t: '<b>② 月額家賃は？</b>（ドル）\n例：<code>650</code>', b: ['家賃をNickに聞く', '戻る'] }, kh: { t: '<b>② What is the monthly rent?</b> (USD)\nExample: <code>650</code>', b: ['Ask Nick about the rent', KH_BACK] } } };
  by.calcsize = { id: 'calcsize', flow: 'Estimate', title: 'Estimate: size', await: 'calc_size',
    text: '<b>③ What is the size?</b> (sqm)\nExample: <code>35</code>\nIt is used for the building management fee.',
    buttons: [{ l: 'I do not know', to: '', half: false, url: '', cb: 'es:nosize' }, { l: 'Back', to: 'calcrent', half: false, url: '' }],
    tr: { jp: { t: '<b>③ 広さは？</b>（㎡）\n例：<code>35</code>\n建物の管理費の計算に使います。', b: ['分からない', '戻る'] }, kh: { t: '<b>③ What is the size?</b> (sqm)\nExample: <code>35</code>\nIt is used for the building management fee.', b: ['I do not know', KH_BACK] } } };
  by.calcown = { id: 'calcown', flow: 'Estimate', title: 'Estimate: my own calculation', await: 'calcown',
    text: '<b>Send your own calculation</b>\n\nSend it as it is, as text or a screenshot. Nick checks it and replies within 1 business day.\n\nExample:\n<code>Time Square 5\nRent $500 a month\nBuilding fee $1 per sqm\nSize 50 sqm</code>',
    buttons: [{ l: 'Back', to: 'calc1', half: false, url: '' }],
    note: 'Whatever the client sends is forwarded to Nick with a draft check (engines/estimate.js). Nothing goes back to the client until Nick taps Send.',
    tr: { jp: { t: '<b>ご自身の計算を送る</b>\n\n文字でもスクリーンショットでも、そのまま送ってください。Nickが確認し、1営業日以内にご返信いたします。\n\n例：\n<code>Time Square 5\n家賃 500ドル/月\n建物の管理費 1ドル/㎡\n広さ 50㎡</code>', b: ['戻る'] },
      kh: { t: '<b>Send your own calculation</b>\n\nSend it as it is, as text or a screenshot. Nick checks it and replies within 1 business day.\n\nExample:\n<code>Time Square 5\nRent $500 a month\nBuilding fee $1 per sqm\nSize 50 sqm</code>', b: [KH_BACK] } } };
  // the result screen keeps its buttons; its text is written by bot.js
  by.calc2.buttons = [{ l: 'Ask Nick to review it', to: 'lead1', half: false, url: '' }, { l: 'Try other numbers', to: 'calc1', half: false, url: '' }, { l: 'Main menu', to: 'menu', half: false, url: '' }];
  by.calc2.tr.jp.b = ['Nickに確認を依頼', '別の数値で試す', 'メインメニュー']; by.calc2.tr.kh.b = ['សុំ Nick ពិនិត្យ', 'សាកល្បងលេខផ្សេង', 'ម៉ឺនុយមេ'];
  // the "check a listing" screen also takes the client's own numbers
  by.check1.tr.jp.t = by.check1.tr.jp.t.replace('リンクまたはスクリーンショットをお送りください。', 'リンク、スクリーンショット、またはご自身の計算をお送りください。');
  by.check1.text = by.check1.text.replace('Send the link or a screenshot.', 'Send the link, a screenshot or your own calculation.');
})();
// free guide (2026-10-27): a main menu button; the bot sends the PDF itself (bot.js sendGuide), so it has a callback, not a screen
(function () {
  const m = by.menu, at = m.buttons.findIndex(b => b.to === 'tour') + 1;
  m.buttons.splice(at, 0, { l: 'Free guide (PDF)', to: '', half: false, url: '', cb: 'gd:get' });
  m.tr.jp.b.splice(at, 0, '無料資料（PDF）を受け取る');
  m.tr.kh.b.splice(at, 0, 'ឯកសារឥតគិតថ្លៃ (PDF)');
})();
// privacy (2026-10-27): the bot now also keeps the topics and units a client looks at, and serious requests go into Nick's client list
by.privacy.text = '<b>Privacy and my data</b>\n\nWe store your Telegram ID, your language, your answers and the topics and units you look at, so Nick can help you. When you ask about a unit, request the guide or book a tour, your name and these interests are saved in Nick\'s client list. We do not sell or share them.\n\nYou can delete everything at any time.';
by.privacy.tr.jp.t = '<b>プライバシーとデータ</b>\n\nNickがご相談に対応するため、TelegramのID、言語、ご回答内容、ご覧になったテーマと物件を保存します。物件へのお問い合わせ、資料のご請求、内覧のご予約をいただいた場合は、お名前とこれらの内容をNickの顧客リストに記録します。第三者への販売や共有は行いません。\n\nデータはいつでも削除できます。';
by.privacy.tr.kh.t = '<b>ឯកជនភាព និងទិន្នន័យរបស់ខ្ញុំ</b>\n\nយើងរក្សាទុក Telegram ID ភាសា ចម្លើយរបស់អ្នក និងប្រធានបទ និងបន្ទប់ដែលអ្នកបានមើល ដើម្បីឱ្យ Nick អាចជួយអ្នកបាន។ នៅពេលអ្នកសួរអំពីបន្ទប់ ស្នើសុំឯកសារ ឬកក់ពេលទស្សនា ឈ្មោះរបស់អ្នក និងព័ត៌មានទាំងនេះនឹងត្រូវកត់ត្រាក្នុងបញ្ជីអតិថិជនរបស់ Nick។ យើងមិនលក់ ឬចែករំលែកវាទេ។\n\nអ្នកអាចលុបទាំងអស់បានគ្រប់ពេល។';
// steps that tell Nick
by.leaddone.notify = 'Ask Nick'; by.tourok.notify = 'Tour request'; by.check2.notify = 'Listing to check';
const keep = Object.keys(by);
const order = []; src.forEach(s => { if (by[s.id]) order.push(s.id); if (s.id === 'more') ['faq','faq1','faq2','faq3','faq4','faq5'].forEach(i => order.push(i)); if (s.id === 'calc1') ['calcrent', 'calcsize', 'calcown'].forEach(i => order.push(i)); if (s.id === 'b2') order.push('b2other'); if (s.id === 'rr2') order.push('rr2other'); });
// the estimate is hidden from clients until Nick is happy with it (2026-10-28): no button on the More menu, /estimate works for Nick and testers only
(function () {
  const m = by.more, i = m.buttons.findIndex(b => b.to === 'calc1');
  if (i >= 0) { m.buttons.splice(i, 1); ['jp', 'kh'].forEach(g => m.tr && m.tr[g] && m.tr[g].b && m.tr[g].b.splice(i, 1)); }
})();
const steps = order.map(id => by[id]);
steps.forEach(s => s.buttons = s.buttons.filter(b => b.url || !b.to || keep.includes(b.to)));
// Only Japanese clients use LINE (Nick, 2026-10-26). English and Khmer clients reach Nick on his own Telegram:
// every LINE button carries the Telegram link for en and kh, and the en and kh words say Telegram.
steps.forEach(s => {
  s.buttons.forEach((b, i) => {
    if (b.url !== LINE) return;
    b.urls = { en: TELEGRAM, kh: TELEGRAM };
    b.l = b.l.replace('LINE', 'Telegram');
    if (s.tr && s.tr.kh && s.tr.kh.b && s.tr.kh.b[i]) s.tr.kh.b[i] = s.tr.kh.b[i].replace('LINE', 'Telegram');
  });
  s.text = s.text.replace(/LINE/g, 'Telegram');
  if (s.tr && s.tr.kh && s.tr.kh.t) s.tr.kh.t = s.tr.kh.t.replace(/LINE/g, 'Telegram');
});
// Ask Nick step 3 in English and Khmer: both answers are Telegram, so they say who writes first
by.lead3.buttons[0].l = 'I will message Nick now'; by.lead3.buttons[1].l = 'Nick messages me first';
by.lead3.tr.kh.b[0] = 'ផ្ញើសារទៅ Nick ឥឡូវនេះ'; by.lead3.tr.kh.b[1] = 'ឲ្យ Nick ផ្ញើសារមកខ្ញុំមុន';
fs.writeFileSync(path.join(__dirname, 'flow.json'), JSON.stringify({ line: LINE, telegram: TELEGRAM, steps }, null, 1));
console.log('flow.json written:', steps.length, 'steps');
