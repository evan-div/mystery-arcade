/* =============================================================================
   QUARTER SNAKE — the easter egg.
   Fixed-timestep loop so speed is identical on 60Hz and 144Hz displays.
   ========================================================================== */

const SnakeGame = (() => {
  const GRID   = 20;          // 20 x 20 cells
  const BASE_MS = 130;        // ms per step at the start
  const MIN_MS  = 62;         // fastest it ever gets
  const STORAGE_KEY = 'ite-arcade-snake-best';

  let cv, ctx, els = {};
  let cell = 21;

  let snake, dir, nextDir, food, score, best, alive, started;
  let acc = 0, last = 0, raf = null;

  try { best = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0; }
  catch (_) { best = 0; }

  /* ── Setup ───────────────────────────────────────────────────────────── */

  function reset() {
    snake  = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir     = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    alive = true;
    started = false;
    placeFood();
    updateHud();
  }

  function placeFood() {
    let spot;
    do {
      spot = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 };
    } while (snake.some(s => s.x === spot.x && s.y === spot.y));
    food = spot;
  }

  function updateHud() {
    els.score.textContent = score;
    els.best.textContent = best;
  }

  /* ── Simulation ──────────────────────────────────────────────────────── */

  function stepInterval() {
    return Math.max(MIN_MS, BASE_MS - score * 3);
  }

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Walls kill (classic rules — no wrapping).
    if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) return die();
    // So does biting yourself. The tail vacates this tick, so ignore the last cell.
    if (snake.some((s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y)) return die();

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      Sound.eat();
      if (score > best) {
        best = score;
        try { localStorage.setItem(STORAGE_KEY, String(best)); } catch (_) {}
      }
      updateHud();
      placeFood();
    } else {
      snake.pop();
    }
  }

  function die() {
    alive = false;
    started = false;
    Sound.gameOver();
    stop();
    showOverlay(
      'GAME OVER',
      `You collected ${score} quarter${score === 1 ? '' : 's'}. ` +
      `You'll get two real rolls at Quarters Arcade Bar on Sept 25.`,
      'PLAY AGAIN'
    );
  }

  /* ── Rendering ───────────────────────────────────────────────────────── */

  function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);

    // Faint grid
    ctx.strokeStyle = 'rgba(53,230,255,0.07)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      const p = i * cell + 0.5;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, cv.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(cv.width, p); ctx.stroke();
    }

    // Food: a quarter
    const fx = food.x * cell + cell / 2;
    const fy = food.y * cell + cell / 2;
    ctx.save();
    ctx.shadowColor = '#ffb000';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffb000';
    ctx.beginPath(); ctx.arc(fx, fy, cell * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#4a3400';
    ctx.font = `bold ${Math.floor(cell * 0.42)}px ui-sans-serif, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('25', fx, fy + 0.5);

    // Snake
    snake.forEach((s, i) => {
      const head = i === 0;
      ctx.save();
      ctx.shadowColor = head ? '#4dff7c' : 'rgba(53,230,255,.7)';
      ctx.shadowBlur = head ? 16 : 8;
      ctx.fillStyle = head ? '#4dff7c' : `rgba(53,230,255,${Math.max(0.35, 1 - i / snake.length)})`;
      ctx.fillRect(s.x * cell + 1.5, s.y * cell + 1.5, cell - 3, cell - 3);
      ctx.restore();
    });
  }

  /* ── Loop ────────────────────────────────────────────────────────────── */

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!last) last = now;
    let delta = now - last;
    last = now;
    // A backgrounded tab can hand us a huge delta; clamp it so the snake
    // doesn't teleport across the board on return.
    if (delta > 250) delta = 250;

    if (started && alive) {
      acc += delta;
      const interval = stepInterval();
      while (acc >= interval) {
        acc -= interval;
        step();
        if (!alive) break;
      }
    }
    draw();
  }

  function play() {
    if (raf) return;
    last = 0; acc = 0;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  /* ── Overlay ─────────────────────────────────────────────────────────── */

  function showOverlay(big, msg, btn) {
    els.big.textContent = big;
    els.msg.textContent = msg;
    els.startBtn.textContent = btn;
    els.overlay.hidden = false;
  }

  function hideOverlay() { els.overlay.hidden = true; }

  /* ── Input ───────────────────────────────────────────────────────────── */

  const DIRS = {
    up:    { x:  0, y: -1 },
    down:  { x:  0, y:  1 },
    left:  { x: -1, y:  0 },
    right: { x:  1, y:  0 },
  };

  function turn(name) {
    const d = DIRS[name];
    if (!d || !started || !alive) return;
    // No reversing directly into yourself.
    if (d.x === -dir.x && d.y === -dir.y) return;
    nextDir = d;
  }

  const KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    W: 'up', S: 'down', A: 'left', D: 'right',
  };

  /* ── Public ──────────────────────────────────────────────────────────── */

  function begin() {
    if (!alive) reset();
    started = true;
    hideOverlay();
    play();
  }

  function enter() {
    reset();
    draw();
    showOverlay('QUARTER SNAKE',
      'Collect the quarters. Mind the walls.', 'START');
    play();          // render the idle board
  }

  function leave() { stop(); }

  function init(refs) {
    els = refs;
    cv = els.canvas;
    ctx = cv.getContext('2d');

    // Match the backing store to the CSS box for crisp pixels on retina.
    const size = GRID * 21;
    cv.width = size; cv.height = size;
    cell = size / GRID;

    reset();

    els.startBtn.addEventListener('click', () => { Sound.select(); begin(); });

    document.addEventListener('keydown', (e) => {
      if (Screens.get() !== 'snake') return;
      if (KEYS[e.key]) { e.preventDefault(); turn(KEYS[e.key]); }
      else if ((e.key === ' ' || e.key === 'Enter') && !started) {
        e.preventDefault(); begin();
      }
    });

    els.dpad.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-dir]');
      if (!btn) return;
      if (!started) begin(); else turn(btn.dataset.dir);
    });

    // Swipe support on the board itself.
    let sx = 0, sy = 0;
    cv.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    cv.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 24 && Math.abs(dy) < 24) { if (!started) begin(); return; }
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left')
                                       : (dy > 0 ? 'down' : 'up'));
    }, { passive: true });

    // Don't run the loop for a tab nobody is looking at.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (Screens.get() === 'snake') play();
    });
  }

  return { init, enter, leave };
})();
