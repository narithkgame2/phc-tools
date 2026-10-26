// Builds Nick's small Japanese guide (the LINE gift): a cover, the 5 Japanese FAQ pictures, a closing page with the contacts.
// Run after build-faq-images.cjs:  node assets/faq/build-guide-pdf.cjs   (uses Playwright from ../phc-website)
// Output: assets/faq/guide-5-things-2026-jp.pdf (1080x1350 pages, links clickable)
const { chromium } = require('/Users/macbook/Desktop/PHC_Backup_2026/phc-website/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'guide-5-things-2026-jp.pdf');
const LINE = 'https://line.me/ti/p/@615ueovq';

const pics = ['faq-01-ownership', 'faq-02-process', 'faq-03-costs', 'faq-04-rental', 'faq-05-abroad'];
const topics = [['外国人も所有できます', '階数、外国人枠、権利証'], ['購入の流れ', '予約から登記までの6ステップ'], ['物件価格以外の費用', '購入時と保有中にかかるもの'],
  ['家賃から引かれるもの', '税金、管理費、空室'], ['海外からでも購入できます', '原本への署名と郵送']];
const img = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, f + '.png')).toString('base64');

const css = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');
@page{size:1080px 1350px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans JP',sans-serif;color:#1D2A24;word-break:auto-phrase;line-break:strict}
.page{width:1080px;height:1350px;background:#F6F3EC;display:flex;flex-direction:column;padding:80px 84px 56px;page-break-after:always;overflow:hidden}
.pic{padding:0}
.pic img{width:1080px;height:1350px;display:block}
.kicker{font-size:30px;font-weight:700;color:#1F5641;letter-spacing:.06em}
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
.brand{font-size:32px;font-weight:900;color:#1F5641}
.small{font-size:22px;color:#6A746F;line-height:1.5}
`;

const cover = `<div class="page">
  <div class="kicker">NICK | カンボジア不動産投資</div>
  <h1>購入前に<br>知っておきたい<br>5つのこと</h1>
  <div class="lead">プノンペンのコンドミニアム　2026年版</div>
  <div class="main">${topics.map((a, i) => `<div class="item"><div class="num">0${i + 1}</div><div><div class="t">${a[0]}</div><div class="v">${a[1]}</div></div></div>`).join('')}</div>
  <div class="foot"><div class="small">2026年10月時点の情報です。</div><div class="small">出典：Realestate.com.kh「Cambodia Condo Investment Guide 2026」ほか</div></div>
</div>`;

const closing = `<div class="page">
  <div class="kicker">NICK | カンボジア不動産投資</div>
  <h1>物件のご相談は<br>LINEで</h1>
  <div class="lead">Nick本人が1営業日以内にお答えします。</div>
  <div class="main">
    <a class="cta" href="${LINE}">公式LINE　@615ueovq<small>line.me/ti/p/@615ueovq</small></a>
    <a class="item" href="https://t.me/Nick_Cambodia"><div class="num">TG</div><div><div class="t">Telegramチャンネル</div><div class="v">@Nick_Cambodia　市場の解説と厳選物件</div></div></a>
    <a class="item" href="https://t.me/Nick_Cambodia_Bot"><div class="num" style="font-size:24px">BOT</div><div><div class="t">物件検索ボット</div><div class="v">t.me/Nick_Cambodia_Bot　予算とエリアで検索</div></div></a>
  </div>
  <div class="foot"><div class="brand">NICK | カンボジア不動産投資</div><div class="small">※利回り・価格は参考値であり、将来の収益を保証するものではありません。</div></div>
</div>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${cover}${pics.map((p) => `<div class="page pic"><img src="${img(p)}"></div>`).join('')}${closing}</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await pg.setContent(html, { waitUntil: 'networkidle' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.pdf({ path: OUT, width: '1080px', height: '1350px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  // previews of the two new pages, to check the layout
  for (const [i, name] of [[0, 'guide-cover-preview'], [6, 'guide-closing-preview']]) {
    await pg.evaluate((k) => { document.querySelectorAll('.page').forEach((el, j) => { el.style.display = j === k ? 'flex' : 'none'; }); }, i);
    await pg.screenshot({ path: path.join(__dirname, name + '.png') });
  }
  await browser.close();
  console.log('wrote', path.basename(OUT), Math.round(fs.statSync(OUT).size / 1024) + ' KB');
})().catch((e) => { console.error(e.message); process.exit(1); });
