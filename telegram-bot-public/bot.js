// @Nick_Cambodia_Bot, Phase 1 (clients only). All Telegram calls go through the injected `api`, so tests run offline.
// createBot({ api, store, flow, nickId }) -> { handleUpdate(update) }
const R = require('./engines/render.js');

const DISCLAIMER = {
  jp: '※利回り・価格は参考値であり、将来の収益を保証するものではありません。',
  en: 'Yields and prices are for reference only and do not guarantee future income.',
  kh: 'ផលចំណេញ និងតម្លៃគឺសម្រាប់ជាឯកសារយោងប៉ុណ្ណោះ ហើយមិនធានាប្រាក់ចំណូលនាពេលអនាគតទេ។',
};
const MSG = {
  calcBad: {
    jp: '数字を読み取れませんでした。価格、月額家賃、年間費用の3つを、スペースで区切って送ってください。\n例: <code>68000 650 1800</code>',
    en: 'I could not read the numbers. Send three numbers separated by spaces: price, monthly rent, yearly costs.\nExample: <code>68000 650 1800</code>',
    kh: 'មិនអាចអានលេខបានទេ។ សូមផ្ញើលេខបីដោយដកឃ្លា៖ តម្លៃ ថ្លៃជួលប្រចាំខែ និងចំណាយប្រចាំឆ្នាំ។\nឧទាហរណ៍៖ <code>68000 650 1800</code>',
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
  myid: { jp: 'あなたのTelegram IDは {id} です。', en: 'Your Telegram ID is {id}.', kh: 'Telegram ID របស់អ្នកគឺ {id}។' },
};
const fmtUsd = (n) => '$' + Math.round(n).toLocaleString('en-US');

function parseThree(text) {
  const nums = String(text || '').replace(/[,，]/g, '').match(/-?\d+(?:\.\d+)?/g);
  if (!nums || nums.length !== 3) return null;
  const [price, rent, costs] = nums.map(Number);
  if (!(price > 0) || !(rent > 0) || costs < 0) return null;
  return { price, rent, costs };
}

function createBot({ api, store, flow, nickId, onError }) {
  const byId = {};
  flow.steps.forEach((s) => { byId[s.id] = s; });
  const LINE = flow.line;

  const user = (from) => {
    let u = store.get(from.id);
    if (!u) { u = { id: from.id, lang: null, answers: {}, awaiting: null, firstSeen: new Date().toISOString() }; }
    return u;
  };
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

  async function goto(chatId, from, u, stepId, edit, extraVars) {
    const step = byId[stepId] || byId.error;
    if (stepId === 'menu') { u.answers = {}; }
    u.awaiting = step.await || null;
    save(u);
    await send(chatId, u, step, Object.assign(varsFor(u, step.id), extraVars || {}), edit);
    await notifyNick(u, from, step);
    if (step.id === 'forgetdone') store.delete(u.id); // the client asked to delete everything
  }

  async function handleCallback(cb) {
    const from = cb.from, data = cb.data || '', msg = cb.message;
    await api('answerCallbackQuery', { callback_query_id: cb.id });
    if (!msg) return;
    const chatId = msg.chat.id, u = user(from);
    if (data.startsWith('l:')) {
      const lang = data.slice(2);
      if (R.LANGS.includes(lang)) { u.lang = lang; return goto(chatId, from, u, 'menu', msg); }
      return;
    }
    if (!data.startsWith('g:')) return;
    const [, fromId, idx] = data.split(':');
    const step = byId[fromId], btn = step && step.buttons[Number(idx)];
    if (!btn || !btn.to) return;
    if (!u.lang) u.lang = 'jp';
    // remember what the client chose, except for Back, Main menu and Cancel; the typed-area screen answers for its parent step
    if (!/^(back|main menu|cancel|language)/i.test(btn.l)) u.answers[fromId.replace(/other$/, '')] = R.labelOf(step, Number(idx), u.lang);
    return goto(chatId, from, u, btn.to, msg);
  }

  async function handleMessage(m) {
    const from = m.from, chatId = m.chat.id;
    if (m.chat.type !== 'private') return; // the bot only talks in private chats
    const text = (m.text || '').trim();
    const u = user(from);
    const cmd = text.startsWith('/') ? text.split(/\s+/)[0].split('@')[0].toLowerCase() : '';

    if (cmd === '/start' || cmd === '/menu') {
      if (!u.lang) {
        if (/^ja/i.test(from.language_code || '')) u.lang = 'jp';
        else { save(u); return goto(chatId, from, u, 'start'); }
      }
      return goto(chatId, from, u, 'menu');
    }
    if (!u.lang) u.lang = /^ja/i.test(from.language_code || '') ? 'jp' : 'en';
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
      return goto(chatId, from, u, nextId);
    }
    if (u.awaiting === 'calc') {
      const n = parseThree(text);
      if (!n) { save(u); return api('sendMessage', { chat_id: chatId, text: MSG.calcBad[u.lang], parse_mode: 'HTML' }); }
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
  return { handleUpdate, byId };
}

module.exports = { createBot, parseThree, DISCLAIMER, MSG };
