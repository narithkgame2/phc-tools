// Renders the FAQ pictures for Nick's bots (1080x1350 PNG) in Japanese, English and Khmer.
// Facts: the Trusted Agent training app (Cambodia Condo Investment Guide 2026); buying from abroad: Nick (2026-10-26).
// Run: node assets/faq/build-faq-images.cjs   (uses Playwright from ../phc-website)
// Then: node config/build-flow.cjs   so the bot picks up the new pictures (each file gets a fresh fingerprint).
// Output: faq-0N-topic.png (Japanese), faq-0N-topic-en.png, faq-0N-topic-kh.png. Khmer stays a draft until Nick checks it.
const { chromium } = require('/Users/macbook/Desktop/PHC_Backup_2026/phc-website/node_modules/playwright');
const path = require('path');
const OUT = __dirname;
const ONLY = process.argv[2]; // optional: jp, en or kh

const L = {
  jp: {
    font: "'Noto Sans JP','Hiragino Sans',sans-serif", fontUrl: 'Noto+Sans+JP:wght@400;700;900', suffix: '',
    faq: (n) => 'よくある質問 0' + n,
    src: '出典：Realestate.com.kh「Cambodia Condo Investment Guide 2026」',
    disc: '※利回り・価格は参考値であり、将来の収益を保証するものではありません。',
    p1: { title: '外国人も<br>所有できます', lead: '3つのルールがあります', items: [['地上階より上の部屋', '地上階は本人名義にできません'], ['外国人枠は1棟の70%まで', '購入前に残りの枠を確認'], ['ストラタタイトルが必要', '国に登録される権利証']], note: '※ 土地は外国人の名義では所有できません' },
    p2: { title: '購入の流れ', small: '6つのステップ', items: [['予約', '予約金 500ドルから2,000ドル'], ['頭金と契約', '価格の20%から30%'], ['建設中の分割払い', '毎月など、物件ごとに決まります'], ['引き渡し時の残金', '割合は物件によります'], ['引き渡し', '部屋を点検して鍵を受け取り'], ['登記', 'ご本人の名義の権利証']] },
    p3: { title: '物件価格以外の費用', buy: '購入時', own: '保有中', opt: '物件による', rows: [['移転税', '4%'], ['弁護士', '500ドル※'], ['所有権移転の手続き費用', '物件による']], rows2: [['固定資産税', '年0.1%（約2万5,000ドル超の部分）'], ['建物の管理費', '月1から2ドル/㎡'], ['賃貸管理費', '家賃の5%から10%'], ['賃貸収入の税金', '海外在住14%、居住者10%']], sell: '売却時', rows4: [['キャピタルゲイン税', '売却益の20%（2027年1月から予定）']], rows3: [['家具', '家具付きの物件もあります']], star: '※カンボジアでの一般的な費用。日本人弁護士の場合は高くなります。', note: '予約金と頭金は、物件価格に含まれます。' },
    p4: { title: '家賃から<br>引かれるもの', tiles: [['税金', '14%', '海外在住（居住者は10%）'], ['賃貸管理費', '5%から10%', '家賃に対して'], ['建物の管理費', '月1から2ドル', '1㎡あたり'], ['空室', '年に約10%', '入居者の入れ替わり']], formula: '手取り ＝ 家賃 － 税金 － 賃貸管理費<br>－ 建物の管理費 － 空室' },
    p5: { title: '海外からでも<br>購入できます', lead: '現地に来なくても大丈夫です', items: [['やり取りはオンラインで', '物件選び、ご相談、送金まで'], ['契約書は原本に署名', '電子署名は使えません'], ['原本は国際宅配便で', 'DHLなどで、売主側も原本に署名']], note: '※ 委任状による購入も可能（手続きは複雑）' },
  },
  en: {
    font: "'Noto Sans','Helvetica Neue',sans-serif", fontUrl: 'Noto+Sans:wght@400;700;900', suffix: '-en',
    faq: (n) => 'FAQ 0' + n,
    src: 'Source: Realestate.com.kh, Cambodia Condo Investment Guide 2026',
    disc: 'Yields and prices are for reference only and do not guarantee future income.',
    p1: { title: 'Foreigners can<br>own property', lead: 'There are 3 rules', items: [['Above the ground floor', 'The ground floor cannot be in your name'], ['Up to 70% per building', 'Check the foreign quota left'], ['Strata title required', 'The national ownership certificate']], note: 'Foreigners cannot own land in their own name' },
    p2: { title: 'How buying works', small: '6 steps', items: [['Booking', 'Fee of $500 to $2,000'], ['Down payment and contract', '20% to 30% of the price'], ['Instalments', 'During construction'], ['Balance', 'At handover, share depends on the project'], ['Handover', 'Inspect, then collect the keys'], ['Title', 'Registered in your name']] },
    p3: { title: 'Costs beyond the price', buy: 'When you buy', own: 'While you own it', opt: 'Depends on the project', rows: [['Transfer tax', '4%'], ['Lawyer', '$500*'], ['Title transfer fee', 'depends on the project']], rows2: [['Property tax', '0.1% a year above ~$25,000'], ['Building management', '$1 to $2/sqm a month'], ['Rental management', '5% to 10% of the rent'], ['Rental income tax', '14% abroad, 10% resident']], sell: 'When you sell', rows4: [['Capital gains tax', '20% of the gain, from Jan 2027']], rows3: [['Furniture', 'some units come furnished']], star: '*The usual fee in Cambodia. A foreign lawyer may cost more.', note: 'The booking fee and down payment are part of the price.' },
    p4: { title: 'What comes<br>off the rent', tiles: [['Tax', '14%', 'living abroad (residents 10%)'], ['Rental management', '5% to 10%', 'of the rent'], ['Building management', '$1 to $2', 'per sqm a month'], ['Empty months', 'about 10%', 'a year']], formula: 'You keep = rent − tax<br>− management fees − vacancy' },
    p5: { title: 'You can buy<br>from abroad', lead: 'No need to travel', items: [['Arranged online', 'Unit, questions and transfers'], ['Signed by hand', 'On the originals, no e-signature'], ['Originals by courier', 'DHL or similar, the seller signs too']], note: 'A power of attorney is possible, but more involved' },
  },
  kh: {
    font: "'Noto Sans Khmer','Khmer Sangam MN',sans-serif", fontUrl: 'Noto+Sans+Khmer:wght@400;700;900', suffix: '-kh',
    faq: (n) => 'សំណួរញឹកញាប់ 0' + n,
    src: 'ប្រភព៖ Realestate.com.kh «Cambodia Condo Investment Guide 2026»',
    disc: 'ផលចំណេញ និងតម្លៃគឺសម្រាប់ជាឯកសារយោងប៉ុណ្ណោះ ហើយមិនធានាប្រាក់ចំណូលនាពេលអនាគតទេ។',
    p1: { title: 'ជនបរទេសអាច<br>កាន់កាប់បាន', lead: 'មានច្បាប់ ៣', items: [['បន្ទប់ពីជាន់ទី ១ ឡើងទៅ', 'ជាន់ផ្ទាល់ដីមិនអាចដាក់ឈ្មោះជនបរទេសបាន'], ['កូតាជនបរទេស 70% ក្នុងមួយអគារ', 'ពិនិត្យកូតាដែលនៅសល់មុនទិញ'], ['ត្រូវមានប្លង់ Strata Title', 'ប័ណ្ណកម្មសិទ្ធិដែលចុះបញ្ជីនៅក្រសួង']], note: '※ ជនបរទេសមិនអាចកាន់កាប់ដីក្នុងនាមខ្លួនបានទេ' },
    p2: { title: 'ដំណើរការទិញ', small: '៦ ជំហាន', items: [['កក់ទុក', 'ប្រាក់កក់ 500 ដល់ 2,000 ដុល្លារ'], ['ប្រាក់បង់ដំបូង និងកិច្ចសន្យា', '20% ដល់ 30% នៃតម្លៃ'], ['បង់រំលោះ', 'ក្នុងអំឡុងពេលសាងសង់'], ['ប្រាក់នៅសល់', 'ពេលប្រគល់ អាស្រ័យលើគម្រោង'], ['ការប្រគល់', 'ពិនិត្យបន្ទប់ ហើយទទួលកូនសោ'], ['ចុះបញ្ជីកម្មសិទ្ធិ', 'ក្នុងនាមរបស់អ្នក']] },
    p3: { title: 'ចំណាយក្រៅពីតម្លៃ', buy: 'ពេលទិញ', own: 'ពេលកាន់កាប់', opt: 'អាស្រ័យលើគម្រោង', rows: [['ពន្ធផ្ទេរកម្មសិទ្ធិ', '4%'], ['មេធាវី', '500 ដុល្លារ*'], ['ថ្លៃផ្ទេរកម្មសិទ្ធិ', 'អាស្រ័យលើគម្រោង']], rows2: [['ពន្ធលើអចលនទ្រព្យ', '0.1% ក្នុងមួយឆ្នាំ លើសពី 25,000 ដុល្លារ'], ['ថ្លៃគ្រប់គ្រងអគារ', '1 ដល់ 2 ដុល្លារ/ម៉ែត្រការ៉េ'], ['ថ្លៃគ្រប់គ្រងការជួល', '5% ដល់ 10% នៃថ្លៃជួល'], ['ពន្ធលើចំណូលជួល', '14% នៅក្រៅប្រទេស, 10% និវាសនជន']], sell: 'ពេលលក់', rows4: [['ពន្ធលើចំណេញមូលធន', '20% ចាប់ពីខែមករា 2027']], rows3: [['គ្រឿងសង្ហារិម', 'ខ្លះមានស្រាប់']], star: '*តម្លៃធម្មតានៅកម្ពុជា។ អាស្រ័យលើមេធាវី ហើយមេធាវីជប៉ុនអាចថ្លៃជាង។', note: 'ប្រាក់កក់ និងប្រាក់បង់ដំបូង ជាផ្នែកនៃតម្លៃ មិនមែនជាចំណាយបន្ថែមទេ។' },
    p4: { title: 'អ្វីដែលកាត់<br>ពីថ្លៃជួល', tiles: [['ពន្ធ', '14%', 'រស់នៅក្រៅប្រទេស (និវាសនជន 10%)'], ['ថ្លៃគ្រប់គ្រងការជួល', '5% ដល់ 10%', 'នៃថ្លៃជួល'], ['ថ្លៃគ្រប់គ្រងអគារ', '1 ដល់ 2 ដុល្លារ', 'ក្នុងមួយម៉ែត្រការ៉េ ក្នុងមួយខែ'], ['ខែទំនេរ', 'ប្រហែល 10%', 'ក្នុងមួយឆ្នាំ']], formula: 'ចំណូលសុទ្ធ = ថ្លៃជួល − ពន្ធ − ថ្លៃគ្រប់គ្រង − ខែទំនេរ' },
    p5: { title: 'អាចទិញពី<br>ក្រៅប្រទេសបាន', lead: 'មិនចាំបាច់មកកម្ពុជា', items: [['តាមអនឡាញ', 'ជ្រើសបន្ទប់ សួរព័ត៌មាន និងផ្ទេរប្រាក់'], ['ចុះហត្ថលេខាដោយដៃ', 'លើច្បាប់ដើម មិនទទួលហត្ថលេខាអេឡិចត្រូនិក'], ['ផ្ញើច្បាប់ដើមតាម DHL', 'អ្នកលក់ក៏ចុះហត្ថលេខាលើច្បាប់ដើមដែរ']], note: '※ អាចប្រើលិខិតប្រគល់សិទ្ធិ ប៉ុន្តែស្មុគស្មាញជាង' },
  },
};

const css = (t) => `
@import url('https://fonts.googleapis.com/css2?family=${t.fontUrl}&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{word-break:auto-phrase;line-break:strict;width:1080px;height:1350px;background:#F6F3EC;color:#1D2A24;font-family:${t.font};display:flex;flex-direction:column;padding:80px 84px 56px}
.kicker{font-size:30px;font-weight:700;color:#1F5641;letter-spacing:.06em}
h1{font-size:76px;line-height:1.2;font-weight:900;margin-top:20px}
.lead{font-size:40px;color:#3E4B44;margin-top:20px;font-weight:700}
.main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:26px}
.item{display:flex;align-items:center;gap:28px;background:#FFFFFF;border-radius:24px;padding:24px 30px;box-shadow:0 3px 0 #E2DBCB}
.num{flex:none;width:76px;height:76px;border-radius:50%;background:#1F5641;color:#fff;font-size:38px;font-weight:900;display:flex;align-items:center;justify-content:center}
.t{font-size:42px;font-weight:700;line-height:1.3}
.v{font-size:31px;color:#5A6660;margin-top:2px;line-height:1.35}
.proc .item{padding:16px 28px}
.proc .t{font-size:38px}
.proc .v{font-size:29px}
.row{display:flex;justify-content:space-between;align-items:center;gap:20px;background:#FFFFFF;border-radius:18px;padding:18px 28px;margin-top:12px;box-shadow:0 3px 0 #E2DBCB}
.row .l{font-size:36px;font-weight:700}
.row .r{font-size:36px;font-weight:900;color:#1F5641;text-align:right}
.tight .row{padding:7px 26px;margin-top:6px}.tight .row .l,.tight .row .r{font-size:31px}.tight .row .l{white-space:nowrap}
.sec{font-size:30px;font-weight:700;color:#9A7322;letter-spacing:.06em;margin-top:8px}
.tile{background:#fff;border-radius:24px;padding:18px 36px;display:flex;justify-content:space-between;align-items:center;gap:24px}
.tile .l{font-size:40px;font-weight:700}
.tile .r{font-size:46px;font-weight:900;color:#1F5641;text-align:right;line-height:1.2}
.tile .r small{display:block;font-size:28px;color:#5A6660;font-weight:400}
.note{font-size:32px;color:#5A6660}
.formula{background:#1F5641;color:#F6F3EC;border-radius:24px;padding:24px 36px;font-size:34px;font-weight:700;text-align:center;line-height:1.4}
.foot{margin-top:24px;border-top:2px solid #D9D2C2;padding-top:20px;display:flex;flex-direction:column;gap:6px}
.brand{font-size:32px;font-weight:900;color:#1F5641}
.small{font-size:22px;color:#6A746F;line-height:1.5}
`;
function pages(t) {
  const page = (body) => `<!doctype html><html><head><meta charset="utf-8"><style>${css(t)}</style></head><body>${body}</body></html>`;
  const foot = (disc, noSource) => `<div class="foot"><div class="brand">NICK | カンボジア不動産投資</div>${noSource ? '' : `<div class="small">${t.src}</div>`}${disc ? `<div class="small">${t.disc}</div>` : ''}</div>`;
  const item = (n, a) => `<div class="item"><div class="num">${n}</div><div><div class="t">${a[0]}</div><div class="v">${a[1]}</div></div></div>`;
  const row = (a) => `<div class="row"><span class="l">${a[0]}</span><span class="r">${a[1]}</span></div>`;
  return {
    'faq-01-ownership': page(`<div class="kicker">${t.faq(1)}</div><h1>${t.p1.title}</h1><div class="lead">${t.p1.lead}</div>
      <div class="main">${t.p1.items.map((a, i) => item(i + 1, a)).join('')}<div class="note">${t.p1.note}</div></div>${foot(false)}`),
    'faq-02-process': page(`<div class="kicker">${t.faq(2)}</div><h1 style="font-size:66px">${t.p2.title} <span style="font-size:38px;color:#3E4B44">${t.p2.small}</span></h1>
      <div class="main proc" style="gap:14px;margin-top:24px">${t.p2.items.map((a, i) => item(i + 1, a)).join('')}</div>${foot(true)}`),
    'faq-03-costs': page(`<div class="kicker">${t.faq(3)}</div><h1 style="font-size:60px">${t.p3.title}</h1>
      <div class="main tight" style="gap:0;justify-content:flex-start;margin-top:8px"><div class="sec">${t.p3.buy}</div>${t.p3.rows.map(row).join('')}
      <div class="sec" style="margin-top:8px">${t.p3.own}</div>${t.p3.rows2.map(row).join('')}
      <div class="sec" style="margin-top:8px">${t.p3.sell}</div>${t.p3.rows4.map(row).join('')}
      <div class="sec" style="margin-top:8px">${t.p3.opt}</div>${t.p3.rows3.map(row).join('')}
      <div class="formula" style="margin-top:14px;font-size:28px;padding:16px 30px">${t.p3.note}</div>
      <div style="font-size:24px;color:#3E4B44;margin-top:14px">${t.p3.star}</div></div>${foot(true)}`),
    'faq-04-rental': page(`<div class="kicker">${t.faq(4)}</div><h1>${t.p4.title}</h1>
      <div class="main" style="gap:14px">${t.p4.tiles.map((a) => `<div class="tile"><span class="l">${a[0]}</span><span class="r">${a[1]}<small>${a[2]}</small></span></div>`).join('')}
      <div class="formula">${t.p4.formula}</div></div>${foot(true)}`),
    'faq-05-abroad': page(`<div class="kicker">${t.faq(5)}</div><h1>${t.p5.title}</h1><div class="lead">${t.p5.lead}</div>
      <div class="main">${t.p5.items.map((a, i) => item(i + 1, a)).join('')}<div class="note">${t.p5.note}</div></div>${foot(false, true)}`), // facts from Nick, not from the guide
  };
}

(async () => {
  const browser = await chromium.launch();
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const lang of Object.keys(L)) {
    if (ONLY && ONLY !== lang) continue;
    for (const [name, html] of Object.entries(pages(L[lang]))) {
      await pg.setContent(html, { waitUntil: 'networkidle' });
      await pg.evaluate(() => document.fonts.ready);
      await pg.screenshot({ path: path.join(OUT, name + L[lang].suffix + '.png') });
      console.log('wrote', name + L[lang].suffix + '.png');
    }
  }
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
