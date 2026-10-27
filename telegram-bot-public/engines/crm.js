// Links the bot to the PHC CRM (Leads tab) through the CRM's own bot actions (PHC_AppsScript.gs botUpsert_ / botForget_).
// The bot key only lets the bot add or update its own clients (ids TG-<telegram id>) and anonymize them; it never reads the CRM.
// A client becomes a CRM row only when they show real interest (guide, Ask, search request, tour, Ask Nick form).
// Off (returns null) until CRM_URL and CRM_KEY are set by deploy/crm/setup-crm.sh.

const NATIONALITY = { jp: 'Japanese', kh: 'Cambodian', en: 'Other' };
// the bot's buy budget bands, mapped to the CRM's own bands (Lead Tracker scores and filters on these)
const BUDGET = { 'Under $50,000': 'Under $100K', '$50,000 to $100,000': 'Under $100K', '$100,000 to $200,000': '$100K-$200K', 'Above $200,000': '$200K-$300K' };
const TIMELINE = { 'Now': '0-3 months', 'In 3 to 6 months': '3-6 months' }; // "Later" stays empty: no honest band for it
// the same scoring as the website form (phc-website src/lib/phcCrm.ts), so bot and website leads compare fairly
const natScore = (n) => (n === 'Japanese' ? 5 : n === 'Cambodian' ? 3 : 2);
const budgetScore = (b) => ({ '$500K+': 5, '$300K-$500K': 4, '$200K-$300K': 3, '$100K-$200K': 2 }[b] || 1);
const timelineScore = (t) => ({ '0-3 months': 5, '3-6 months': 4, '6-12 months': 2, '12+ months': 1 }[t] || 2);

// u: the bot's client record; from: Telegram's user object. tester: Nick's own second account, so the row is easy to spot and delete.
function leadFor(u, from, { tester } = {}) {
  const nationality = NATIONALITY[u.lang] || 'Other';
  const it = u.int || {};
  const budget = BUDGET[it.budget] || '';
  const timeline = TIMELINE[it.timeline] || '';
  const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || 'Telegram client';
  return {
    id: 'TG-' + u.id,
    fullName: (tester ? 'TEST ' : '') + name,
    nationality,
    telegram: (from.username ? '@' + from.username + ' ' : '') + 'tg:' + u.id,
    budget, timeline,
    score: Math.round((natScore(nationality) + budgetScore(budget) + timelineScore(timeline)) / 3),
    notes: "From Nick's Telegram bot @Nick_Cambodia_Bot (language " + String(u.lang || '-').toUpperCase() + '). ' +
      (u.lang === 'jp' ? 'Reply on LINE (official account).' : 'Reply on Telegram.') + (tester ? ' TEST ACCOUNT, delete after testing.' : ''),
  };
}

function createCrm({ url, key, fetchImpl, onError }) {
  if (!url || !key) return null;
  const f = fetchImpl || ((...a) => fetch(...a));
  async function call(body) {
    try {
      // Apps Script answers a POST with a redirect to the result; fetch follows it
      const r = await f(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, redirect: 'follow', body: JSON.stringify(Object.assign({ key, sheet: 'Leads' }, body)) });
      const j = await r.json().catch(() => null);
      if (!j || j.error) throw new Error('CRM ' + body.action + ': ' + ((j && j.error) || 'no answer (HTTP ' + r.status + ')'));
      return j;
    } catch (e) { if (onError) onError(e); return null; }
  }
  return {
    upsert: (lead, event) => call({ action: 'botUpsert', lead, event: String(event || '').slice(0, 500) }),
    forget: (userId) => call({ action: 'botForget', id: 'TG-' + userId }),
  };
}

module.exports = { createCrm, leadFor, BUDGET, TIMELINE };
