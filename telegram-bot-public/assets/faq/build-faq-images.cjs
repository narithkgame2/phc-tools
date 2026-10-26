// Renders the Japanese FAQ images for Nick's bots (1080x1350 PNG). Facts: Trusted Agent training app (Cambodia Condo Investment Guide 2026).
const { chromium } = require('/Users/macbook/Desktop/PHC_Backup_2026/phc-website/node_modules/playwright');
const path = require('path');
const OUT = __dirname; // run: node assets/faq/build-faq-images.cjs (uses Playwright from ../phc-website), then node config/build-flow.cjs so the bot picks up the new pictures
const SRC = '出典：Realestate.com.kh「Cambodia Condo Investment Guide 2026」';
const DISC = '※利回り・価格は参考値であり、将来の収益を保証するものではありません。';

const css = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{word-break:auto-phrase;text-wrap:pretty;line-break:strict;width:1080px;height:1350px;background:#F6F3EC;color:#1D2A24;font-family:'Noto Sans JP','Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif;display:flex;flex-direction:column;padding:64px 72px 48px}
.kicker{display:flex;align-items:center;gap:14px;font-size:26px;font-weight:700;color:#1F5641;letter-spacing:.08em}
.kicker .no{background:#1F5641;color:#F6F3EC;border-radius:8px;padding:4px 14px;font-size:24px}
h1{font-size:58px;line-height:1.25;font-weight:900;margin-top:22px;letter-spacing:.01em}
.lead{font-size:30px;line-height:1.55;color:#3E4B44;margin-top:18px}
.main{flex:1;display:flex;flex-direction:column;gap:20px;margin-top:36px}
.card{background:#FFFFFF;border-radius:20px;padding:26px 30px;display:flex;gap:24px;align-items:flex-start;box-shadow:0 2px 0 #E4DFD3}
.num{flex:none;width:64px;height:64px;border-radius:50%;background:#1F5641;color:#fff;font-size:32px;font-weight:900;display:flex;align-items:center;justify-content:center}
.t{font-size:34px;font-weight:700;line-height:1.35}
.s{font-size:26px;line-height:1.55;color:#4C5953;margin-top:6px}
.gold{color:#9A7322}
.note{background:#EFE8D8;border-left:8px solid #B58A2E;border-radius:12px;padding:20px 26px;font-size:27px;line-height:1.55}
.foot{border-top:2px solid #D9D2C2;margin-top:28px;padding-top:20px;display:flex;flex-direction:column;gap:6px}
.brand{font-size:28px;font-weight:900;color:#1F5641;letter-spacing:.02em}
.small{font-size:19px;color:#6A746F;line-height:1.5}
table{width:100%;border-collapse:separate;border-spacing:0 12px}
td{background:#fff;padding:18px 22px;font-size:27px;line-height:1.4;vertical-align:middle}
td:first-child{border-radius:14px 0 0 14px;font-weight:700;width:36%}
td:last-child{border-radius:0 14px 14px 0;color:#1F5641;font-weight:700}
.sec{font-size:26px;font-weight:700;color:#9A7322;margin:10px 0 -4px 4px;letter-spacing:.06em}
.row{display:flex;gap:20px}
.box{flex:1;background:#fff;border-radius:20px;padding:26px 28px;box-shadow:0 2px 0 #E4DFD3}
.big{font-size:64px;font-weight:900;color:#1F5641;line-height:1.1}
.cap{font-size:25px;color:#4C5953;margin-top:8px;line-height:1.5}
.formula{background:#1F5641;color:#F6F3EC;border-radius:20px;padding:30px 34px;font-size:32px;font-weight:700;line-height:1.6}
.formula small{display:block;font-size:24px;font-weight:400;opacity:.85;margin-top:8px}
`;
const foot = (disc) => `<div class="foot"><div class="brand">NICK | カンボジア不動産投資</div><div class="small">${SRC}</div>${disc ? `<div class="small">${DISC}</div>` : ''}</div>`;
const page = (body) => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;

const pages = {
  'faq-01-ownership': page(`
    <div class="kicker"><span class="no">よくある質問 01</span>外国人の所有</div>
    <h1>外国人はカンボジアの<br>不動産を所有できますか？</h1>
    <div class="lead">はい。<b>3つのルール</b>を守れば、ご本人の名義で所有できます。</div>
    <div class="main">
      <div class="card"><div class="num">1</div><div><div class="t">地上階より上の部屋なら、ご本人名義でOK</div><div class="s">グラウンドフロア（地上階）は、外国人本人の名義にはできません。</div></div></div>
      <div class="card"><div class="num">2</div><div><div class="t">外国人枠は1棟の全戸数の<span class="gold">70%</span>まで</div><div class="s">人気の建物は枠が早く埋まります。購入前に残りの枠を必ず確認します。</div></div></div>
      <div class="card"><div class="num">3</div><div><div class="t">ストラタタイトルが必須</div><div class="s">国の土地管理省に登録される、区分所有の権利証です。ソフトタイトルはカンボジア国民のみが対象です。</div></div></div>
      <div class="note">土地そのものは、外国人本人の名義では所有できません。2010年以前の建物や、ストラタの許可がない建物ではストラタタイトルが発行されません。</div>
    </div>${foot(false)}`),
  'faq-02-process': page(`
    <div class="kicker"><span class="no">よくある質問 02</span>購入の流れ</div>
    <h1 style="font-size:54px">購入の流れ：6つのステップ</h1>
    <div class="lead" style="font-size:28px;margin-top:12px">手順はほぼ共通です。違うのは、各段階の金額と期間です。</div>
    <div class="main" style="gap:12px;margin-top:24px">
      <div class="card" style="padding:16px 26px;gap:20px"><div class="num" style="width:56px;height:56px;font-size:28px">1</div><div><div class="t" style="font-size:31px">予約</div><div class="s" style="font-size:25px;margin-top:2px">部屋を選び、予約金（通常500ドルから2,000ドル）で確保</div></div></div>
      <div class="card" style="padding:16px 26px;gap:20px"><div class="num" style="width:56px;height:56px;font-size:28px">2</div><div><div class="t" style="font-size:31px">頭金と売買契約書（SPA）</div><div class="s" style="font-size:25px;margin-top:2px">署名時に価格の約20%から30%。署名前に弁護士の確認を</div></div></div>
      <div class="card" style="padding:16px 26px;gap:20px"><div class="num" style="width:56px;height:56px;font-size:28px">3</div><div><div class="t" style="font-size:31px">建設中の分割払い</div><div class="s" style="font-size:25px;margin-top:2px">毎月、四半期ごと、または工事の段階ごと（例：月1%を35か月）</div></div></div>
      <div class="card" style="padding:16px 26px;gap:20px"><div class="num" style="width:56px;height:56px;font-size:28px">4</div><div><div class="t" style="font-size:31px">引き渡し時の残金</div><div class="s" style="font-size:25px;margin-top:2px">残りの40%から50%程度を、現金または銀行ローンで</div></div></div>
      <div class="card" style="padding:16px 26px;gap:20px"><div class="num" style="width:56px;height:56px;font-size:28px">5</div><div><div class="t" style="font-size:31px">引き渡し</div><div class="s" style="font-size:25px;margin-top:2px">完成した部屋を点検し、不具合を伝えてから鍵を受け取り</div></div></div>
      <div class="card" style="padding:16px 26px;gap:20px"><div class="num" style="width:56px;height:56px;font-size:28px">6</div><div><div class="t" style="font-size:31px">権利の登記</div><div class="s" style="font-size:25px;margin-top:2px">全額の支払い後、土地管理省でご本人の名義に登記</div></div></div>
    </div>${foot(true)}`),
  'faq-03-costs': page(`
    <div class="kicker"><span class="no">よくある質問 03</span>購入にかかる費用</div>
    <h1>物件価格のほかに<br>かかる費用</h1>
    <div class="main" style="gap:0;margin-top:24px">
      <div class="sec">購入時</div>
      <table>
        <tr><td>予約金</td><td>500ドルから2,000ドル（頭金に充当）</td></tr>
        <tr><td>頭金（SPA署名時）</td><td>価格の20%から30%</td></tr>
        <tr><td>移転税</td><td>物件価格の4%（免除の場合あり）</td></tr>
        <tr><td>弁護士・契約書の確認</td><td>物件価格の0.5%から1%</td></tr>
        <tr><td>家具・内装</td><td>5,000ドルから15,000ドルが目安</td></tr>
      </table>
      <div class="sec" style="margin-top:14px">保有中</div>
      <table>
        <tr><td>固定資産税</td><td>年0.1%（評価額の80%のうち2.5万ドル超の部分）</td></tr>
        <tr><td>建物の管理費</td><td>1㎡あたり月1ドルから2ドル</td></tr>
      </table>
    </div>${foot(true)}`),
  'faq-04-rental': page(`
    <div class="kicker"><span class="no">よくある質問 04</span>賃貸収入の税金と費用</div>
    <h1>家賃から何が<br>差し引かれますか？</h1>
    <div class="main">
      <div class="row">
        <div class="box"><div class="big">14%</div><div class="cap">賃貸収入の税金<br>（海外在住のオーナー）</div></div>
        <div class="box"><div class="big">10%</div><div class="cap">賃貸収入の税金<br>（カンボジア居住者）</div></div>
      </div>
      <div class="row">
        <div class="box"><div class="big" style="font-size:52px">月1から2ドル/㎡</div><div class="cap">建物の管理費（目安は約1.8ドル）</div></div>
      </div>
      <div class="row">
        <div class="box"><div class="big" style="font-size:52px">年に約10%</div><div class="cap">入居者が入れ替わる間の空室を見込みます</div></div>
      </div>
      <div class="formula">手取りの目安 ＝ 家賃 － 税金 － 管理費 － 空室分<small>海外オーナーの税金は、通常、家賃が届く前に差し引かれます。</small></div>
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
