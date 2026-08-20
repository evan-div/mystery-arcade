/* =============================================================================
   8-bit sound, synthesized with the Web Audio API, plus control of the hero
   music loop (js/music.js). Sound defaults ON; the choice persists in
   localStorage once someone actually changes it.
   ========================================================================== */

const Sound = (() => {
  const STORAGE_KEY = 'ite-arcade-sound';
  let ctx = null;
  let enabled = true;

  try {
    // Only an explicit "off" overrides the default — a first-time visitor
    // (nothing stored yet) starts with sound on.
    if (localStorage.getItem(STORAGE_KEY) === 'off') enabled = false;
  } catch (_) { /* private browsing — default stands for the session */ }

  /* An AudioContext can only start from a user gesture, so we create it
     lazily on the first click rather than at page load. */
  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* One square/triangle blip. */
  function tone({ freq, dur = 0.1, type = 'square', vol = 0.14, delay = 0, slideTo = null }) {
    if (!enabled) return;
    const ac = ensureCtx();
    if (!ac) return;

    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);

    // Quick attack, exponential decay — the classic chiptune envelope.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function sequence(notes) { notes.forEach(n => tone(n)); }

  const api = {
    /* Called from the coin-slot click — this is the gesture that unlocks audio. */
    unlock() { ensureCtx(); },

    coin() {
      sequence([
        { freq: 988, dur: 0.07, vol: 0.16 },
        { freq: 784, dur: 0.09, vol: 0.16, delay: 0.07 },
        { freq: 523, dur: 0.20, vol: 0.14, delay: 0.15, slideTo: 300 },
      ]);
    },

    tick() { tone({ freq: 1180, dur: 0.022, vol: 0.05, type: 'square' }); },

    blip() { tone({ freq: 660, dur: 0.05, vol: 0.11, type: 'square' }); },

    select() {
      sequence([
        { freq: 880,  dur: 0.05, vol: 0.13 },
        { freq: 1320, dur: 0.09, vol: 0.13, delay: 0.05 },
      ]);
    },

    back() {
      sequence([
        { freq: 520, dur: 0.05, vol: 0.11 },
        { freq: 340, dur: 0.09, vol: 0.11, delay: 0.05 },
      ]);
    },

    powerUp() {
      sequence([
        { freq: 523,  dur: 0.08, vol: 0.13 },
        { freq: 659,  dur: 0.08, vol: 0.13, delay: 0.08 },
        { freq: 784,  dur: 0.08, vol: 0.13, delay: 0.16 },
        { freq: 1047, dur: 0.26, vol: 0.15, delay: 0.24 },
      ]);
    },

    eat() {
      sequence([
        { freq: 1046, dur: 0.04, vol: 0.11 },
        { freq: 1568, dur: 0.06, vol: 0.11, delay: 0.04 },
      ]);
    },

    gameOver() {
      sequence([
        { freq: 400, dur: 0.14, vol: 0.14, type: 'triangle' },
        { freq: 300, dur: 0.14, vol: 0.14, type: 'triangle', delay: 0.14 },
        { freq: 180, dur: 0.42, vol: 0.15, type: 'triangle', delay: 0.28, slideTo: 70 },
      ]);
    },

    isEnabled() { return enabled; },

    toggle() {
      enabled = !enabled;
      try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch (_) {}
      if (enabled) { ensureCtx(); api.blip(); }
      return enabled;
    },
  };

  return api;
})();
