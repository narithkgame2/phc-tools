// Renders the Japanese FAQ images for Nick's bots (1080x1350 PNG). Facts: Trusted Agent training app (Cambodia Condo Investment Guide 2026).
const { chromium } = require('/Users/macbook/Desktop/PHC_Backup_2026/phc-website/node_modules/playwright');
const path = require('path');
const OUT = __dirname; // run: node assets/faq/build-faq-images.cjs (uses Playwright from ../phc-website), then node config/build-flow.cjs so the bot picks up the new pictures
const SRC = '出典：Realestate.com.kh「Cambodia Condo Investment Guide 2026」';
const DISC = '※利回り・価格は参考値であり、将来の収益を保証するものではありません。';

const css = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{word-break:auto-phrase;line-break:strict;width:1080px;height:1350px;background:#F6F3EC;color:#1D2A24;font-family:'Noto Sans JP','Hiragino Sans',sans-serif;display:flex;flex-direction:column;padding:80px 84px 56px}
.kicker{font-size:30px;font-weight:700;color:#1F5641;letter-spacing:.08em}
h1{font-size:78px;line-height:1.2;font-weight:900;margin-top:20px}
.lead{font-size:40px;color:#3E4B44;margin-top:20px;font-weight:700}
.main{flex:1;display:flex;flex-direction:column;justify-content:center;gap:26px}
.item{display:flex;align-items:center;gap:28px;background:#FFFFFF;border-radius:24px;padding:24px 30px;box-shadow:0 3px 0 #E2DBCB}
.num{flex:none;width:76px;height:76px;border-radius:50%;background:#1F5641;color:#fff;font-size:38px;font-weight:900;display:flex;align-items:center;justify-content:center}
.t{font-size:42px;font-weight:700;line-height:1.3}
.v{font-size:31px;color:#5A6660;margin-top:2px}
.row{display:flex;justify-content:space-between;align-items:center;background:#FFFFFF;border-radius:18px;padding:18px 28px;margin-top:12px;box-shadow:0 3px 0 #E2DBCB}
.row .l{font-size:36px;font-weight:700}
.row .r{font-size:36px;font-weight:900;color:#1F5641}
.sec{font-size:30px;font-weight:700;color:#9A7322;letter-spacing:.08em;margin-top:8px}
.tile{background:#fff;border-radius:24px;padding:30px 36px;display:flex;justify-content:space-between;align-items:center}
.tile .l{font-size:40px;font-weight:700}
.tile .r{font-size:52px;font-weight:900;color:#1F5641;text-align:right;line-height:1.2}
.tile .r small{display:block;font-size:28px;color:#5A6660;font-weight:400}
.note{font-size:34px;color:#5A6660}
.formula{background:#1F5641;color:#F6F3EC;border-radius:24px;padding:30px 36px;font-size:40px;font-weight:700;text-align:center}
.proc .item{padding:16px 28px}
.proc .t{font-size:38px}
.proc .v{font-size:29px}
.foot{margin-top:24px;border-top:2px solid #D9D2C2;padding-top:20px;display:flex;flex-direction:column;gap:6px}
.brand{font-size:32px;font-weight:900;color:#1F5641}
.small{font-size:22px;color:#6A746F;line-height:1.5}
`;
const foot = (disc) => `<div class="foot"><div class="brand">NICK | カンボジア不動産投資</div><div class="small">${SRC}</div>${disc ? `<div class="small">${DISC}</div>` : ''}</div>`;
const page = (body) => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
const item = (n, t, v) => `<div class="item"><div class="num">${n}</div><div><div class="t">${t}</div>${v ? `<div class="v">${v}</div>` : ''}</div></div>`;
const row = (l, r) => `<div class="row"><span class="l">${l}</span><span class="r">${r}</span></div>`;

const pages = {
  'faq-01-ownership': page(`
    <div class="kicker">よくある質問 01</div>
    <h1>外国人も<br>所有できます</h1>
    <div class="lead">3つのルールがあります</div>
    <div class="main">
      ${item(1, '地上階より上の部屋', '地上階は本人名義にできません')}
      ${item(2, '外国人枠は1棟の70%まで', '購入前に残りの枠を確認')}
      ${item(3, 'ストラタタイトルが必要', '国に登録される権利証')}
      <div class="note">※ 土地は外国人の名義では所有できません</div>
    </div>${foot(false)}`),
  'faq-02-process': page(`
    <div class="kicker">よくある質問 02</div>
    <h1 style="font-size:70px">購入の流れ <span style="font-size:40px;color:#3E4B44">6つのステップ</span></h1>
    <div class="main proc" style="gap:14px;margin-top:24px">
      ${item(1, '予約', '予約金 500ドルから2,000ドル')}
      ${item(2, '頭金と契約', '価格の20%から30%')}
      ${item(3, '建設中の分割払い', '毎月など、物件ごとに決まります')}
      ${item(4, '引き渡し時の残金', '価格の40%から50%')}
      ${item(5, '引き渡し', '部屋を点検して鍵を受け取り')}
      ${item(6, '登記', 'ご本人の名義の権利証')}
    </div>${foot(true)}`),
  'faq-03-costs': page(`
    <div class="kicker">よくある質問 03</div>
    <h1 style="font-size:72px">物件価格以外の費用</h1>
    <div class="main" style="gap:0;justify-content:flex-start;margin-top:30px">
      <div class="sec">購入時</div>
      ${row('予約金', '500から2,000ドル')}
      ${row('頭金', '20%から30%')}
      ${row('移転税', '4%')}
      ${row('弁護士', '0.5%から1%')}
      ${row('家具', '5,000ドルから')}
      <div class="sec" style="margin-top:26px">保有中</div>
      ${row('固定資産税', '年0.1%')}
      ${row('建物の管理費', '月1から2ドル/㎡')}
    </div>${foot(true)}`),
  'faq-04-rental': page(`
    <div class="kicker">よくある質問 04</div>
    <h1>家賃から<br>引かれるもの</h1>
    <div class="main" style="gap:22px">
      <div class="tile"><span class="l">税金</span><span class="r">14%<small>海外在住（居住者は10%）</small></span></div>
      <div class="tile"><span class="l">建物の管理費</span><span class="r">月1から2ドル<small>1㎡あたり</small></span></div>
      <div class="tile"><span class="l">空室</span><span class="r">年に約10%<small>入居者の入れ替わり</small></span></div>
      <div class="formula">手取り ＝ 家賃 － 税金 － 管理費 － 空室</div>
    </div>${foot(true)}`),
};

(async () => {
  const browser = await chromium.launch();
  const pg = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  for (const [name, html] of Object.entries(pages)) {
    await pg.setContent(html, { waitUntil: 'networkidle' });
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(OUT, name + '.png') });
    console.log('wrote', name + '.png');
  }
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
