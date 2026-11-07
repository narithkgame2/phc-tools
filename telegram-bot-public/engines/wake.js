// Tells a real wake from macOS "dark wakes": with the lid closed the Mac still wakes for a few seconds every 15 minutes or so
// (maintenance, network checks). In those seconds the bot must not take Telegram back from the backup or tell it "the Mac
// is back", or Nick gets a "back" and a "silent" message every quarter of an hour (seen 2026-11-07).
// A gap in a 5 second ticker means the Mac slept; settled() is true once it has been awake again for 90 seconds.
function createWakeWatch({ now = Date.now, tick = 5000, gap = 20000, settle = 90000 } = {}) {
  let last = now(), wokeAt = -Infinity;
  function check() { const t = now(); if (t - last > gap) wokeAt = t; last = t; }
  const timer = tick ? setInterval(check, tick) : null;
  if (timer && timer.unref) timer.unref();
  return { settled: () => { check(); return now() - wokeAt >= settle; }, stop: () => { if (timer) clearInterval(timer); } };
}
module.exports = { createWakeWatch };
