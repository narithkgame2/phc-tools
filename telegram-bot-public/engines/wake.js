// Tells a real wake from macOS "dark wakes". With the lid closed the Mac still wakes in the background (maintenance, network
// checks). In those wakes the bot must not take Telegram back from the backup or tell it "the Mac is back".
// 2026-11-07: dark wakes of a few seconds every 15 minutes. Fixed with the 90 second rule below.
// 2026-11-11: on the charger, the bot's own caffeinate keeps a dark wake going for 1 to 1.7 hours, then the Mac sleeps 15
// minutes, so Nick still got a "silent" and a "back" message every hour or two all night. Now the Mac also has to be really
// awake: lid open, or (lid closed) the screen on through an external display. Lid closed all night = the backup answers
// until morning, one "silent" and one "back" message.
const { execFileSync } = require('child_process');

// true when the lid is open, or the lid is closed but macOS has its screen on (full wake). Dark wake: lid closed, no screen.
function macReallyAwake() {
  if (process.platform !== 'darwin') return true;
  try {
    const lid = execFileSync('/usr/sbin/ioreg', ['-r', '-k', 'AppleClamshellState', '-d', '1'], { encoding: 'utf8', timeout: 3000 });
    if (!/"AppleClamshellState" = Yes/.test(lid)) return true;
    const state = execFileSync('/usr/bin/pmset', ['-g', 'systemstate'], { encoding: 'utf8', timeout: 3000 });
    return /Capabilities are:.*Graphics/.test(state);
  } catch (e) { return true; } // cannot tell: the timing rule alone decides
}

// A gap in a 5 second ticker means the Mac slept; settled() is true once it has been awake again for 90 seconds
// and is really awake (above).
function createWakeWatch({ now = Date.now, tick = 5000, gap = 20000, settle = 90000, reallyAwake = macReallyAwake } = {}) {
  let last = now(), wokeAt = -Infinity;
  function check() { const t = now(); if (t - last > gap) wokeAt = t; last = t; }
  const timer = tick ? setInterval(check, tick) : null;
  if (timer && timer.unref) timer.unref();
  return { settled: () => { check(); return now() - wokeAt >= settle && reallyAwake(); }, stop: () => { if (timer) clearInterval(timer); } };
}
module.exports = { createWakeWatch, macReallyAwake };
