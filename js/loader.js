/* =============================================================================
   The boot sequence: typed BIOS lines, then a chunky 8-bit loading bar.
   Any click or keypress fast-forwards it — nobody gets trapped behind it.
   ========================================================================== */

const Loader = (() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LINES = [
    'ITE ARCADE SYSTEMS  v9.25.26',
    'MEMORY CHECK ....... OK',
    'ROOFTOP MODULE ..... OK',
    'QUARTER DISPENSER .. OK',
    'GOOD TIMES ......... UNLIMITED',
    '',
    'LOADING PARTY.EXE',
  ];

  let els = {};
  let cells = [];
  let running = false;
  let skipped = false;
  let doneCb = null;
  let timers = [];

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function buildCells() {
    els.blocks.innerHTML = '';
    cells = [];
    for (let i = 0; i < CONFIG.LOADER_BLOCKS; i++) {
      const c = document.createElement('span');
      c.className = 'boot__cell';
      els.blocks.appendChild(c);
      cells.push(c);
    }
  }

  function setProgress(pct) {
    const lit = Math.round((pct / 100) * cells.length);
    cells.forEach((c, i) => c.classList.toggle('on', i < lit));
    els.pct.textContent = String(Math.round(pct));
    els.status.textContent = `Loading ${Math.round(pct)}%`;
  }

  function typeLines(onDone) {
    if (reduced || skipped) { els.log.textContent = LINES.join('\n'); onDone(); return; }

    let li = 0, ci = 0;
    els.log.textContent = '';

    (function step() {
      if (skipped) { els.log.textContent = LINES.join('\n'); onDone(); return; }
      if (li >= LINES.length) { onDone(); return; }

      const line = LINES[li];
      if (ci < line.length) {
        els.log.textContent += line[ci];
        ci++;
        later(step, 11);
      } else {
        els.log.textContent += '\n';
        li++; ci = 0;
        later(step, 90);
      }
    })();
  }

  function runBar(onDone) {
    const duration = skipped || reduced ? 220 : CONFIG.BOOT_DURATION_MS;
    const start = performance.now();
    let lastLit = -1;

    (function frame(now) {
      const elapsed = now - start;
      // Ease-out so it surges then settles, like real arcade loaders.
      const t = Math.min(elapsed / duration, 1);
      const pct = (1 - Math.pow(1 - t, 2.2)) * 100;

      setProgress(pct);

      const lit = Math.round((pct / 100) * cells.length);
      if (lit !== lastLit) { lastLit = lit; Sound.tick(); }

      if (t < 1) requestAnimationFrame(frame);
      else onDone();
    })(start);
  }

  function skip() {
    if (!running || skipped) return;
    skipped = true;
    clearTimers();
  }

  function start(onDone) {
    running = true;
    skipped = false;
    doneCb = onDone;

    buildCells();
    setProgress(0);

    typeLines(() => {
      runBar(() => {
        setProgress(100);
        Sound.powerUp();
        running = false;
        later(() => doneCb && doneCb(), reduced ? 60 : 420);
      });
    });
  }

  function init(refs) {
    els = refs;

    // Any input during boot jumps to the end.
    const fastForward = () => { if (running) skip(); };
    document.addEventListener('keydown', (e) => {
      if (Screens.get() === 'boot') { e.preventDefault(); fastForward(); }
    });
    document.getElementById('screen-boot').addEventListener('click', fastForward);
  }

  return { init, start };
})();
