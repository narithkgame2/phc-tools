// Builds Nick's small guides (the free guide button in the bot, and the LINE gift): a cover, the 5 FAQ pictures, a contacts page.
// Japanese and English (Khmer clients get the English one until the Khmer FAQ is approved).
// A bigger guide Nick sends to the bot with /setguide (for example the full Japanese condo report) replaces these in the bot.
// Run after build-faq-images.cjs:  node assets/faq/build-guide-pdf.cjs   (uses Playwright from ../phc-website)
// Output: assets/faq/guide-5-things-2026-jp.pdf and -en.pdf (1080x1350 pages, links clickable)
const { chromium } = require('/Users/macbook/Desktop/PHC_Backup_2026/phc-website/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const T = {
  jp: {
    font: 'Noto+Sans+JP', suffix: '',
    kicker: 'NICK | カンボジア不動産投資', title: '購入前に<br>知っておきたい<br>5つのこと', lead: 'プノンペンのコンドミニアム　2026年版',
    topics: [['外国人も所有できます', '階数、外国人枠、権利証'], ['購入の流れ', '予約から登記までの6ステップ'], ['物件価格以外の費用', '購入時と保有中にかかるもの'],
      ['家賃から引かれるもの', '税金、管理費、空室'], ['海外からでも購入できます', '原本への署名と郵送']],
    date: '2026年10月時点の情報です。', src: '出典：Realestate.com.kh「Cambodia Condo Investment Guide 2026」ほか',
    endTitle: '物件のご相談は<br>LINEで', endLead: 'Nick本人が1営業日以内にお答えします。',
    cta: ['https://line.me/ti/p/@615ueovq', '公式LINE　@615ueovq', 'line.me/ti/p/@615ueovq'],
    items: [['https://t.me/Nick_Cambodia', 'TG', 'Telegramチャンネル', '@Nick_Cambodia　市場の解説と厳選物件'], ['https://t.me/Nick_Cambodia_Bot', 'BOT', '物件検索ボット', 't.me/Nick_Cambodia_Bot　予算とエリアで検索']],
    disc: '※利回り・価格は参考値であり、将来の収益を保証するものではありません。',
  },
  en: {
    font: 'Noto+Sans', suffix: '-en',
    kicker: 'NICK | カンボジア不動産投資', title: '5 things<br>to know<br>before you buy', lead: 'Phnom Penh condominiums, 2026 edition',
    topics: [['Foreigners can own property', 'Floor, foreign quota, title'], ['The buying process', 'Six steps from booking to title'], ['Costs beyond the price', 'When you buy and while you own it'],
      ['What comes off the rent', 'Tax, management, empty months'], ['You can buy from abroad', 'Signing originals and the courier']],
    date: 'Information as of October 2026.', src: 'Source: Realestate.com.kh, Cambodia Condo Investment Guide 2026, and others',
    endTitle: 'Questions about<br>a property?', endLead: 'Nick answers himself within 1 business day.',
    cta: ['https://t.me/Nick_REAKH', 'Message Nick on Telegram', 't.me/Nick_REAKH'],
    items: [['https://t.me/NickREAKH', 'TG', 'Telegram channel', '@NickREAKH  listings and market notes'], ['https://t.me/Nick_Cambodia_Bot', 'BOT', 'Property search bot', 't.me/Nick_Cambodia_Bot  search by budget and area']],
    disc: 'Yields and prices are for reference only and do not guarantee future income.',
  },
};
const pics = ['faq-01-ownership', 'faq-02-process', 'faq-03-costs', 'faq-04-rental', 'faq-05-abroad'];
const img = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, f + '.png')).toString('base64');

const css = (t) => `
@import url('https://fonts.googleapis.com/css2?family=${t.font}:wght@400;700;900&family=Noto+Sans+JP:wght@700;900&display=swap');
@page{size:1080px 1350px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'${t.font.replace(/\+/g, ' ')}','Noto Sans JP',sans-serif;color:#1D2A24;word-break:auto-phrase;line-break:strict}
.page{width:1080px;height:1350px;background:#F6F3EC;display:flex;flex-direction:column;padding:80px 84px 56px;page-break-after:always;overflow:hidden}
.pic{padding:0}
.pic img{width:1080px;height:1350px;display:block}
.kicker{font-size:30px;font-weight:700;color:#1F5641;letter-spacing:.06em;font-family:'Noto Sans JP',sans-serif}
h1{font-size:78px;line-height:1.18;font-weight:900;margin-top:20px}
.lead{font-size:38px;color:#3E4B44;margin-top:22px;font-weight:700}
.main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:14px;margin-top:20px}
.item{display:flex;align-items:center;gap:28px;background:#FFFFFF;border-radius:24px;padding:16px 30px;box-shadow:0 3px 0 #E2DBCB;color:inherit;text-decoration:none}
.num{flex:none;width:72px;height:72px;border-radius:50%;background:#1F5641;color:#fff;font-size:30px;font-weight:900;display:flex;align-items:center;justify-content:center}
.t{font-size:38px;font-weight:700;line-height:1.3}
.v{font-size:28px;color:#5A6660;margin-top:2px;line-height:1.35}
.cta{background:#1F5641;color:#F6F3EC;border-radius:24px;padding:30px 36px;font-size:36px;font-weight:700;text-align:center;line-height:1.5;text-decoration:none;display:block}
.cta small{display:block;font-size:28px;font-weight:400;opacity:.85}
.foot{margin-top:24px;border-top:2px solid #D9D2C2;padding-top:20px;display:flex;flex-direction:column;gap:6px}
.brand{font-size:32px;font-weight:900;color:#1F5641;font-family:'Noto Sans JP',sans-serif}
.small{font-size:22px;color:#6A746F;line-height:1.5}
`;

function html(t) {
  const cover = `<div class="page">
  <div class="kicker">${t.kicker}</div>
  <h1>${t.title}</h1>
  <div class="lead">${t.lead}</div>
  <div class="main">${t.topics.map((a, i) => `<div class="item"><div class="num">0${i + 1}</div><div><div class="t">${a[0]}</div><div class="v">${a[1]}</div></div></div>`).join('')}</div>
  <div class="foot"><div class="small">${t.date}</div><div class="small">${t.src}</div></div>
</div>`;
  const closing = `<div class="page">
  <div class="kicker">${t.kicker}</div>
  <h1>${t.endTitle}</h1>
  <div class="lead">${t.endLead}</div>
  <div class="main">
    <a class="cta" href="${t.cta[0]}">${t.cta[1]}<small>${t.cta[2]}</small></a>
    ${t.items.map((x) => `<a class="item" href="${x[0]}"><div class="num"${x[1].length > 2 ? ' style="font-size:24px"' : ''}>${x[1]}</div><div><div class="t">${x[2]}</div><div class="v">${x[3]}</div></div></a>`).join('')}
  </div>
  <div class="foot"><div class="brand">NICK | カンボジア不動産投資</div><div class="small">${t.disc}</div></div>
</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css(t)}</style></head><body>${cover}${pics.map((p) => `<div class="page pic"><img src="${img(p + t.suffix)}"></div>`).join('')}${closing}</body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  const preview = process.argv[2]; // optional: a folder for cover and closing previews
  for (const [lang, t] of Object.entries(T)) {
    const out = path.join(__dirname, 'guide-5-things-2026-' + lang + '.pdf');
    await pg.setContent(html(t), { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    await pg.pdf({ path: out, width: '1080px', height: '1350px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    if (preview) {
      for (const [i, name] of [[0, 'cover'], [6, 'closing']]) {
        await pg.evaluate((k) => { document.querySelectorAll('.page').forEach((el, j) => { el.style.display = j === k ? 'flex' : 'none'; }); }, i);
        await pg.screenshot({ path: path.join(preview, 'guide-' + lang + '-' + name + '.png') });
      }
    }
    console.log('wrote', path.basename(out), Math.round(fs.statSync(out).size / 1024) + ' KB');
  }
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
