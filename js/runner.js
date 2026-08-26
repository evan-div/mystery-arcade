/* =============================================================================
   QUARTER RUN — the walk from the Green Pig to Quarters Arcade Bar.
   An auto-runner: time your jumps and slides past the construction on 400 S.

   Physics run on a fixed substep accumulator so behaviour is identical on a
   60Hz laptop and a 144Hz monitor. Obstacle spacing is measured in SECONDS,
   not pixels, which is what keeps the game fair as it speeds up — a gap that
   is clearable at 250px/s stays clearable at 560px/s.
   ========================================================================== */

const RunnerGame = (() => {

  /* ── Fixed geometry ───────────────────────────────────────────────────
     Vertical layout and physics never change; only the camera width does. */
  const P_W        = 20;
  const P_H        = 36;         // standing height
  const P_SLIDE_H  = 18;         // sliding height

  const GRAVITY    = 2600;       // px/s²
  const JUMP_V     = 570;        // px/s  → apex ≈ 62px, below the 70px tower
  const MAX_JUMPS  = 2;

  /* Fairness helpers players never notice but always feel. */
  const COYOTE_TIME  = 0.10;     // jump still works just after leaving ground
  const JUMP_BUFFER  = 0.12;     // jump pressed just before landing still fires
  const MIN_SLIDE    = 0.42;     // a quick tap still gives a usable slide
  const HITBOX_INSET = 3;        // forgiving collisions

  /* ── Camera ───────────────────────────────────────────────────────────
     On phones the canvas is only ~330px wide, which made everything tiny.
     Scaling the whole world uniformly would NOT help: at a fixed display
     width that leaves objects exactly the same apparent size. The only way
     to draw them bigger is to show less world horizontally — which costs
     look-ahead. So we shrink the camera AND scale speed by the same factor,
     which keeps look-ahead TIME (and therefore the difficulty) identical
     while making everything ~1.5× larger on screen. */
  const REF_W = 640, REF_PX = 88;                 // desktop reference camera
  let W, H, GROUND_Y, PLAYER_X, K;
  let START_SPEED, MAX_SPEED, SPEED_PER_M, PX_PER_M;

  function isPortraitPhone() {
    return window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
  }

  function configureViewport() {
    /* Landscape is the right shape for a side-scroller, so a rotated phone
       gets the full desktop camera. Portrait still plays, using a tighter
       camera so the sprites stay legible on a ~330px-wide canvas. */
    const landscapePhone = window.matchMedia(
      '(orientation: landscape) and (max-height: 560px)').matches;
    if (isPortraitPhone())    { W = 430; H = 300; PLAYER_X = 64;  }
    else if (landscapePhone)  { W = 760; H = 300; PLAYER_X = 96;  }
    else                      { W = REF_W; H = 280; PLAYER_X = REF_PX; }
    GROUND_Y = H - 54;

    // Visible runway ahead of the player, relative to the desktop camera.
    K = (W - PLAYER_X - P_W) / (REF_W - REF_PX - P_W);

    START_SPEED = 250 * K;
    MAX_SPEED   = 680 * K;
    SPEED_PER_M = 0.26 * K;
    PX_PER_M    = 20 * K;        // scaled too, so metres still tick at the same rate

    cv.width = W * 2; cv.height = H * 2;
    cv.style.aspectRatio = W + ' / ' + H;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
  }

  const STORAGE_KEY = 'ite-arcade-run-best';

  /* ── Obstacles ────────────────────────────────────────────────────────
     Heights are tuned against JUMP_V: the tower is deliberately taller than
     a single jump's apex so it genuinely requires the double jump. */
  const TYPES = {
    cone:  { w: 26, h: 26, ground: true,  color: '#ffb000', label: 'cone'  },
    tower: { w: 30, h: 70, ground: true,  color: '#ff2ec4', label: 'tower' },
    beam:  { w: 78, h: 38, ground: false, color: '#35e6ff', label: 'beam',
             bottom: 24 },     // gap under it: 24px — standing (36) hits, sliding (18) clears
  };

  const MILESTONES = [
    { m:   50, text: 'PAST THE PIG' },
    { m:  100, text: 'HALFWAY DOWN 400 SOUTH' },
    { m:  200, text: 'YOU MADE IT — QUARTERS, 9:00 PM' },
    { m:  350, text: 'TWO ROLLS OF QUARTERS' },
    { m:  500, text: 'DRINKS TIL 10:30' },
    { m:  750, text: 'STILL GOING? IT GETS WORSE' },
    { m: 1000, text: 'ARCADE LEGEND' },
    { m: 1500, text: 'SHOW OFF' },
    { m: 2000, text: 'GO OUTSIDE' },
    { m: 3000, text: 'OK YOU WIN' },
  ];

  /* ── State ────────────────────────────────────────────────────────────── */
  let cv, ctx, els = {};
  let obstacles, coins, player, speed, meters, coinCount, best;
  let alive, started, spawnIn, obstaclesSpawned, milestoneIdx, clusterLeft;
  let banner, bannerT, runPhase, scroll;
  let raf = null, last = 0, acc = 0;
  let jumpBufferT = 0, coyoteT = 0, slideHeldT = 0, slideHeld = false;

  try { best = parseInt(localStorage.getItem(STORAGE_KEY), 10) || 0; }
  catch (_) { best = 0; }

  /* ── Setup ────────────────────────────────────────────────────────────── */

  function reset() {
    obstacles = [];
    coins = [];
    player = { y: 0, vy: 0, jumps: 0, sliding: false, onGround: true };
    speed = START_SPEED;
    meters = 0;
    coinCount = 0;
    alive = true;
    started = false;
    spawnIn = 260 * K;             // first obstacle gets a generous runway
    obstaclesSpawned = 0;
    milestoneIdx = 0;
    clusterLeft = 0;
    banner = null; bannerT = 0;
    runPhase = 0; scroll = 0;
    jumpBufferT = 0; coyoteT = 0; slideHeldT = 0; slideHeld = false;
    updateHud();
  }

  function updateHud() {
    els.dist.textContent = Math.floor(meters);
    els.coins.textContent = coinCount;
    els.best.textContent = best;
  }

  /* ── Spawning ─────────────────────────────────────────────────────────── */

  function pickType() {
    // Open with cones so the first thing anyone meets is a plain single jump.
    if (obstaclesSpawned < 2) return 'cone';
    if (obstaclesSpawned < 4) return Math.random() < 0.5 ? 'cone' : 'beam';
    if (clusterLeft > 0) return 'cone';               // clusters are jump-only
    const d = diff();
    const coneShare = 0.40 - 0.10 * d;                // fewer easy ones later
    const r = Math.random();
    if (r < coneShare) return 'cone';
    if (r < coneShare + 0.30 + 0.05 * d) return 'tower';
    return 'beam';
  }

  /* Difficulty. Because gaps are measured in TIME, raising speed alone barely
     changes the challenge — the real lever is gap time, so that is what
     tightens. Past 750m ("STILL GOING?") clusters start appearing too. */
  function diff()     { return Math.min(meters / 1000, 1); }
  function latePress(){ return Math.min(Math.max(0, (meters - 750) / 1250), 1); }

  function nextGapTime() {
    const d = diff(), l = latePress();
    const lo     = 1.02 - 0.22 * d - 0.14 * l;          // 1.02s → 0.66s
    const spread = Math.max(0.12, 0.62 - 0.30 * d - 0.10 * l);
    // Floor stays above one full jump airtime (0.44s) plus reaction time.
    return Math.max(0.62, lo + Math.random() * spread);
  }

  function spawnObstacle() {
    const key = pickType();
    const t = TYPES[key];
    const y = t.ground ? GROUND_Y - t.h : GROUND_Y - t.bottom - t.h;
    obstacles.push({ key, x: W + 20, y, w: t.w, h: t.h, color: t.color });
    obstaclesSpawned++;

    /* Gap measured in TIME, then converted to distance at the current speed.
       This is the whole fairness mechanism: faster speed ⇒ proportionally
       wider pixel gap, so reaction time never shrinks below what's clearable. */
    let gapTime = nextGapTime();

    /* Clusters: a burst of cones at tighter-than-normal spacing. Only cones,
       and only after 750m. They are always visible before the first one
       lands, so reacting to them is anticipation rather than a blind guess —
       and the run gets a longer breather immediately afterwards. */
    if (clusterLeft > 0) {
      clusterLeft--;
      gapTime = 0.56 + Math.random() * 0.10;
      if (clusterLeft === 0) gapTime += 0.38;          // recovery gap
    } else if (meters > 750 && Math.random() < Math.min(0.55, (meters - 750) / 3000)) {
      // Bursts get longer as well as more frequent, so the ceiling keeps
      // rising past 2000m instead of flattening into another cruise.
      clusterLeft = 1 + ((Math.random() * (meters > 2000 ? 3 : 2)) | 0);
      gapTime = 0.56 + Math.random() * 0.10;
    }

    const gapPx = speed * gapTime;
    spawnIn = gapPx;

    // Drop a quarter arc into the middle of the upcoming gap.
    if (clusterLeft === 0 && Math.random() < 0.5) spawnCoinArc(W + 20 + gapPx * 0.5);
  }

  function spawnCoinArc(cx) {
    const n = 3 + ((Math.random() * 3) | 0);          // 3–5 quarters
    const spread = 26;
    const peak = 52;                                  // within single-jump reach
    const startX = cx - ((n - 1) * spread) / 2;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const arc = Math.sin(t * Math.PI);              // 0 → 1 → 0
      coins.push({
        x: startX + i * spread,
        y: GROUND_Y - 20 - arc * peak,
        got: false,
      });
    }
  }

  /* ── Input ────────────────────────────────────────────────────────────── */

  function jump() {
    if (!started || !alive) return;
    // Buffer the press if we're a hair early; it fires the moment we land.
    if (player.jumps >= MAX_JUMPS) { jumpBufferT = JUMP_BUFFER; return; }

    const isFirst = player.jumps === 0;
    player.vy = -JUMP_V;
    player.jumps++;
    player.onGround = false;
    player.sliding = false;
    coyoteT = 0;
    isFirst ? Sound.blip() : Sound.select();
  }

  function slideStart() {
    if (!started || !alive) return;
    slideHeld = true;
    if (player.onGround) {
      player.sliding = true;
      slideHeldT = 0;
      Sound.back();
    } else {
      // Slide pressed mid-air acts as a fast-fall, which feels right and
      // gives players a way to recover from an early jump.
      player.vy = Math.max(player.vy, 420);
    }
  }

  function slideEnd() {
    slideHeld = false;
  }

  /* ── Simulation ───────────────────────────────────────────────────────── */

  function step(dt) {
    // Speed ramps with distance, hard-capped.
    speed = Math.min(MAX_SPEED, START_SPEED + meters * SPEED_PER_M);

    const move = speed * dt;
    meters += move / PX_PER_M;
    scroll += move;
    runPhase += dt * (speed / 60);

    // Timers
    if (jumpBufferT > 0) jumpBufferT -= dt;
    if (coyoteT > 0) coyoteT -= dt;
    if (player.sliding) slideHeldT += dt;

    // Vertical motion
    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    if (player.y >= 0) {                     // y is height ABOVE ground, inverted
      player.y = 0;
      if (!player.onGround) {
        player.onGround = true;
        player.jumps = 0;
        coyoteT = COYOTE_TIME;
        if (jumpBufferT > 0) { jumpBufferT = 0; jump(); }
        if (slideHeld) { player.sliding = true; slideHeldT = 0; }
      }
      player.vy = 0;
    } else if (player.onGround) {
      player.onGround = false;
      coyoteT = COYOTE_TIME;
    }

    // Stand back up once the tap's minimum slide has elapsed and the
    // button is released.
    if (player.sliding && !slideHeld && slideHeldT >= MIN_SLIDE) {
      player.sliding = false;
    }
    if (player.sliding && !player.onGround) player.sliding = false;

    // Scroll the world
    for (const o of obstacles) o.x -= move;
    for (const c of coins) c.x -= move;
    obstacles = obstacles.filter(o => o.x + o.w > -40);
    coins = coins.filter(c => c.x > -40 && !c.got);

    spawnIn -= move;
    if (spawnIn <= 0) spawnObstacle();

    // Milestones
    while (milestoneIdx < MILESTONES.length && meters >= MILESTONES[milestoneIdx].m) {
      banner = MILESTONES[milestoneIdx].text;
      bannerT = 2.0;
      milestoneIdx++;
      Sound.powerUp();
    }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) banner = null; }

    // Collisions
    const pr = playerRect();
    for (const c of coins) {
      if (!c.got && Math.abs(c.x - (pr.x + pr.w / 2)) < 16 &&
          Math.abs(c.y - (pr.y + pr.h / 2)) < 20) {
        c.got = true;
        coinCount++;
        meters += 10;                        // quarters are worth bonus distance
        Sound.eat();
      }
    }
    for (const o of obstacles) {
      if (hits(pr, o)) return die();
    }

    updateHud();
  }

  function playerRect() {
    const h = player.sliding ? P_SLIDE_H : P_H;
    return {
      x: PLAYER_X + HITBOX_INSET,
      y: GROUND_Y + player.y - h + HITBOX_INSET,
      w: P_W - HITBOX_INSET * 2,
      h: h - HITBOX_INSET * 2,
    };
  }

  function hits(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function die() {
    alive = false;
    started = false;
    const dist = Math.floor(meters);
    if (dist > best) {
      best = dist;
      try { localStorage.setItem(STORAGE_KEY, String(best)); } catch (_) {}
    }
    updateHud();
    Sound.gameOver();
    stop();
    showOverlay('GAME OVER',
      `${dist} m` + (coinCount ? ` · ${coinCount} quarter${coinCount === 1 ? '' : 's'}` : '') +
      `. See you on 400 South, Sept 25.`,
      'RUN AGAIN');
  }

  /* ── Rendering ────────────────────────────────────────────────────────── */

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Night sky
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#07091a');
    sky.addColorStop(1, '#160c22');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, GROUND_Y);

    drawSkyline(scroll * 0.18, 150, '#0f1430', 62);
    drawSkyline(scroll * 0.42, 176, '#171a3d', 46);

    drawGround();
    coins.forEach(drawCoin);
    obstacles.forEach(drawObstacle);
    drawPlayer();

    if (banner) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, bannerT * 2);
      ctx.fillStyle = '#4dff7c';
      ctx.font = 'bold 15px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#4dff7c';
      ctx.shadowBlur = 12;
      ctx.fillText(banner, W / 2, 44);
      ctx.restore();
    }
  }

  function drawSkyline(off, baseY, color, maxH) {
    ctx.fillStyle = color;
    const bw = 54;
    const start = -((off % bw) + bw);
    for (let x = start, i = 0; x < W + bw; x += bw, i++) {
      // Deterministic pseudo-random heights so buildings don't shimmer.
      const seed = Math.abs(Math.floor((x + off) / bw)) % 7;
      const h = 18 + (seed * 9) % maxH;
      ctx.fillRect(x, baseY - h, bw - 6, h + 40);
      ctx.fillStyle = 'rgba(255,200,80,.10)';
      for (let wy = baseY - h + 6; wy < baseY + 20; wy += 12) {
        for (let wx = x + 5; wx < x + bw - 12; wx += 12) ctx.fillRect(wx, wy, 4, 5);
      }
      ctx.fillStyle = color;
    }
  }

  function drawGround() {
    ctx.fillStyle = '#0a0713';
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    // Neon kerb line
    ctx.save();
    ctx.strokeStyle = '#ff2d1a';
    ctx.shadowColor = '#ff2d1a';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke();
    ctx.restore();

    // Scrolling pavement dashes
    ctx.fillStyle = 'rgba(53,230,255,.22)';
    const dash = 46;
    for (let x = -(scroll % dash); x < W; x += dash) ctx.fillRect(x, GROUND_Y + 16, 24, 3);
    ctx.fillStyle = 'rgba(255,46,196,.14)';
    for (let x = -(scroll * 1.4 % 70); x < W; x += 70) ctx.fillRect(x, GROUND_Y + 34, 34, 2);
  }

  function drawObstacle(o) {
    ctx.save();
    ctx.shadowColor = o.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = o.color;

    if (o.key === 'beam') {
      // Truss: two rails plus diagonal webbing.
      ctx.fillRect(o.x, o.y, o.w, 5);
      ctx.fillRect(o.x, o.y + o.h - 5, o.w, 5);
      ctx.lineWidth = 3; ctx.strokeStyle = o.color;
      ctx.beginPath();
      for (let i = 0; i < o.w; i += 18) {
        ctx.moveTo(o.x + i, o.y + o.h - 5);
        ctx.lineTo(o.x + i + 9, o.y + 5);
        ctx.lineTo(o.x + i + 18, o.y + o.h - 5);
      }
      ctx.stroke();
    } else if (o.key === 'tower') {
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      for (let y = o.y + 8; y < o.y + o.h - 4; y += 14) ctx.fillRect(o.x + 3, y, o.w - 6, 3);
    } else {
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(o.x + 4, o.y + 8, o.w - 8, 4);
      ctx.fillRect(o.x + 4, o.y + 16, o.w - 8, 4);
    }
    ctx.restore();
  }

  function drawCoin(c) {
    ctx.save();
    ctx.shadowColor = '#ffb000';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffb000';
    ctx.beginPath(); ctx.arc(c.x, c.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#4a3400';
    ctx.font = 'bold 8px ui-sans-serif, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('25', c.x, c.y + 0.5);
  }

  function drawPlayer() {
    const h = player.sliding ? P_SLIDE_H : P_H;
    const x = PLAYER_X;
    const y = GROUND_Y + player.y - h;

    ctx.save();
    ctx.shadowColor = '#4dff7c';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#4dff7c';

    if (player.sliding) {
      ctx.fillRect(x - 4, y + 4, P_W + 10, h - 4);       // body, laid out flat
      ctx.fillRect(x + P_W + 4, y, 10, 10);              // head, out front
    } else {
      ctx.fillRect(x + 4, y, 12, 11);                    // head
      ctx.fillRect(x + 3, y + 12, 14, 13);               // torso
      // Legs alternate on a run cycle; frozen mid-stride while airborne.
      const swing = player.onGround ? Math.sin(runPhase * 2.2) : 0.7;
      ctx.fillRect(x + 4, y + 25, 5, 11 * (0.6 + 0.4 * (1 + swing) / 2));
      ctx.fillRect(x + 11, y + 25, 5, 11 * (0.6 + 0.4 * (1 - swing) / 2));
    }
    ctx.restore();
  }

  /* ── Loop ─────────────────────────────────────────────────────────────── */

  const SUBSTEP = 1 / 120;

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!last) last = now;
    let delta = (now - last) / 1000;
    last = now;
    if (delta > 0.25) delta = 0.25;          // returning from a background tab

    if (started && alive) {
      acc += delta;
      while (acc >= SUBSTEP) {
        acc -= SUBSTEP;
        step(SUBSTEP);
        if (!alive) break;
      }
    }
    draw();
  }

  function play()  { if (!raf) { last = 0; acc = 0; raf = requestAnimationFrame(loop); } }
  function stop()  { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  /* ── Overlay ──────────────────────────────────────────────────────────── */

  function showOverlay(big, msg, btn) {
    els.big.textContent = big;
    els.msg.textContent = msg;
    els.startBtn.textContent = btn;
    els.overlay.hidden = false;
  }
  function hideOverlay() { els.overlay.hidden = true; }

  /* ── Public ───────────────────────────────────────────────────────────── */

  function begin() {
    if (!alive) reset();
    started = true;
    hideOverlay();
    play();
  }

  function enter() {
    configureViewport();      // picks up rotation / resize between sessions
    reset();
    draw();
    showOverlay('QUARTER RUN',
      (isPortraitPhone() ? '↻ Turn your phone sideways for a bigger view. ' : '') +
      'Green Pig to Quarters, down 400 South. Jump the cones, double-jump the towers, slide under the beams.',
      'START');
    play();
  }

  function leave() { stop(); }

  function init(refs) {
    els = refs;
    cv = els.canvas;
    ctx = cv.getContext('2d');

    configureViewport();      // sets canvas size and the 2× render transform
    reset();

    els.startBtn.addEventListener('click', () => { Sound.select(); begin(); });

    document.addEventListener('keydown', (e) => {
      if (Screens.get() !== 'runner') return;
      if (e.repeat) return;
      if (['ArrowUp', 'w', 'W', ' ', 'Spacebar'].includes(e.key)) {
        e.preventDefault();
        started ? jump() : begin();
      } else if (['ArrowDown', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        started ? slideStart() : begin();
      }
    });
    document.addEventListener('keyup', (e) => {
      if (Screens.get() !== 'runner') return;
      if (['ArrowDown', 's', 'S'].includes(e.key)) slideEnd();
    });

    /* Pointer events cover mouse and touch in one path. Slide is
       press-and-hold; a quick tap still yields MIN_SLIDE seconds. */
    const bind = (el, down, up) => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); down(); });
      if (up) {
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
          el.addEventListener(ev, (e) => { e.preventDefault(); up(); }));
      }
    };
    bind(els.jumpBtn,  () => { started ? jump() : begin(); });
    bind(els.slideBtn, () => { started ? slideStart() : begin(); }, slideEnd);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (Screens.get() === 'runner') play();
    });

    /* Rotating changes the camera, and obstacle positions are stored in the
       old scale, so the safe move is to reconfigure and start fresh. */
    const onRotate = () => {
      if (Screens.get() !== 'runner') return;
      const wasRunning = started;
      configureViewport();
      reset();
      draw();
      showOverlay(wasRunning ? 'ROTATED' : 'QUARTER RUN',
        wasRunning ? 'Screen changed shape, so that run ended. Tap START to go again.'
                   : (isPortraitPhone() ? '↻ Turn your phone sideways for a bigger view. ' : '') +
                     'Jump the cones, double-jump the towers, slide under the beams.',
        wasRunning ? 'RUN AGAIN' : 'START');
      play();
    };
    window.matchMedia('(orientation: portrait)').addEventListener('change', onRotate);
  }

  return { init, enter, leave };
})();
