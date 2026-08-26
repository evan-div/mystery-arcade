/* =============================================================================
   Bootstrap: render content from CONFIG, wire every control, start the show.
   ========================================================================== */

(function () {
  'use strict';

  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ═══════════════════════════════════════════ 1. Content rendering ═══ */

  function mapsUrl(query) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  }

  function renderVenues() {
    $('#venueList').innerHTML = CONFIG.VENUES.map(v => `
      <article class="venue venue--${v.accent}">
        <span class="venue__order">STAGE ${v.order}</span>
        <p class="venue__time">${v.time}</p>
        <h3 class="venue__name">${v.name}</h3>
        <p class="venue__sub">${v.sub}</p>
        <ul class="venue__notes">${v.notes.map(n => `<li>${n}</li>`).join('')}</ul>
        <a class="venue__map" href="${mapsUrl(v.name + ', ' + v.address)}"
           target="_blank" rel="noopener noreferrer">📍 OPEN IN MAPS</a>
        <p class="venue__addr">${v.address}</p>
      </article>`).join('');
  }

  function renderTimeline() {
    $('#timelineList').innerHTML = CONFIG.TIMELINE.map(t => `
      <li>
        <span class="timeline__time">${t.time}</span>
        <span>
          <span class="timeline__label">${t.label}</span>
          <span class="timeline__detail">${t.detail}</span>
        </span>
      </li>`).join('');
  }

  function renderPerks() {
    $('#perkList').innerHTML = CONFIG.PERKS.map(p => `
      <li>
        <span class="perks__icon" aria-hidden="true">${p.icon}</span>
        <span>
          <span class="perks__title">${p.title}</span>
          <span class="perks__detail">${p.detail}</span>
        </span>
      </li>`).join('');
  }

  function renderRsvp() {
    const mail = 'mailto:' + CONFIG.RSVP_EMAIL
      + '?subject=' + encodeURIComponent(CONFIG.RSVP_SUBJECT)
      + '&body='    + encodeURIComponent(CONFIG.RSVP_BODY);
    $('#rsvpMail').href = mail;
    $('#rsvpAddr').textContent = CONFIG.RSVP_EMAIL;
  }

  function renderStatics() {
    $('.attract__date').textContent = CONFIG.EVENT_DATE_SHORT;
    $$('.glitch').forEach(el => {
      el.textContent = CONFIG.EVENT_NAME;
      el.dataset.text = CONFIG.EVENT_NAME;
    });
    $('.menu__sub').textContent = CONFIG.EVENT_DATE_SHORT + ' · SELECT AN OPTION';
    document.title = CONFIG.EVENT_NAME + ' — Insert Coin';
  }

  /* ═══════════════════════════════════════ 2. Hero image + hotspot ═══ */

  function positionCoinSlot() {
    const anchor = $('#coinAnchor');
    anchor.style.setProperty('--coin-x', CONFIG.COIN_SLOT.x + '%');
    anchor.style.setProperty('--coin-y', CONFIG.COIN_SLOT.y + '%');
  }

  /* If an asset is missing, fall back rather than showing a broken image. */
  function watchImage(img, bodyClass) {
    const fail = () => document.body.classList.add(bodyClass);
    if (img.complete) {
      if (img.naturalWidth === 0) fail();
    } else {
      img.addEventListener('error', fail);
    }
  }

  /* ═══════════════════════════════════════════ 3. Calendar (.ics) ═══ */

  function downloadIcs() {
    /* RFC 5545 wants content lines folded at 75 octets, continued with a
       leading space. Long DESCRIPTION lines break strict parsers without it. */
    function fold(line) {
      const bytes = new TextEncoder().encode(line);
      if (bytes.length <= 75) return line;
      const out = [];
      let cur = '';
      let curBytes = 0;
      for (const ch of line) {                     // iterate by code point
        const n = new TextEncoder().encode(ch).length;
        if (curBytes + n > (out.length ? 74 : 75)) {
          out.push(cur);
          cur = ch; curBytes = n;
        } else {
          cur += ch; curBytes += n;
        }
      }
      out.push(cur);
      return out[0] + out.slice(1).map(s => '\r\n ' + s).join('');
    }

    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    // Sept 25 2026 is MDT (UTC-6) in Salt Lake City. Stamped in UTC, which
    // every calendar client understands without shipping timezone definitions.
    // Kept to plain ASCII so older clients can't mangle the punctuation.
    const description = [
      "It's a half day - office hours 9:00 AM-1:00 PM on the 25th.",
      '7:00-9:00 PM - The Green Pig Pub rooftop patio (private to us).',
      'Food and drinks covered by ITE. Each employee gets a +1.',
      '9:00-10:30 PM - Walk over to Quarters Arcade Bar.',
      'Two rolls of quarters per employee. Drinks covered until 10:30 PM.',
      'Lyfts and Ubers will be reimbursed.',
    ].join('\\n');

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ITE//Mystery Arcade//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:ite-party-2026-09-25@mystery-arcade',
      'DTSTAMP:' + stamp,
      'DTSTART:20260926T010000Z',
      'DTEND:20260926T043000Z',
      'SUMMARY:ITE Party',
      fold('LOCATION:' + CONFIG.VENUES[0].name + ', ' + CONFIG.VENUES[0].address),
      fold('DESCRIPTION:' + description),
      'END:VEVENT',
      'END:VCALENDAR',
    ];

    const blob = new Blob([lines.join('\r\n') + '\r\n'],
                          { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ite-party-2026-09-25.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ═════════════════════════════════════════════════ 4. Clipboard ═══ */

  async function copyEmail() {
    const hint = $('#rsvpCopyHint');
    try {
      await navigator.clipboard.writeText(CONFIG.RSVP_EMAIL);
      hint.textContent = 'COPIED ✓';
    } catch (_) {
      // Clipboard API needs HTTPS and permission; fall back to selection.
      const range = document.createRange();
      range.selectNodeContents($('#rsvpAddr'));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      hint.textContent = 'PRESS ⌘/CTRL+C';
    }
    Sound.blip();
    setTimeout(() => { hint.textContent = 'COPY'; }, 2200);
  }

  /* ═══════════════════════════════════════════════ 5. Konami code ═══ */

  function watchKonami(onFound) {
    const SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                 'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let pos = 0;
    document.addEventListener('keydown', (e) => {
      const scr = Screens.get();
      if (scr === 'snake' || scr === 'runner') return;  // arrows drive the games there
      const want = SEQ[pos];
      const got = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (got === want) {
        pos++;
        if (pos === SEQ.length) { pos = 0; onFound(); }
      } else {
        pos = (got === SEQ[0]) ? 1 : 0;
      }
    });
  }

  /* ═════════════════════════════════════════════════ 6. Sound UI ═══ */

  function initSoundToggle() {
    const btn  = $('#soundToggle');
    const icon = btn.querySelector('.sound-toggle__icon');
    const txt  = btn.querySelector('.sound-toggle__txt');

    function paint(on) {
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
      icon.textContent = on ? '🔊' : '🔇';
      txt.textContent  = on ? 'SOUND ON' : 'SOUND OFF';
    }

    paint(Sound.isEnabled());
    btn.addEventListener('click', () => {
      const on = Sound.toggle();
      paint(on);
      Music.onSoundToggle(on);
    });
  }

  /* ══════════════════════════════════════════════════ 7. Wiring ═══ */

  function initNav() {
    // Anything with data-goto navigates.
    $$('[data-goto]').forEach(el => {
      el.addEventListener('click', () => {
        const to = el.dataset.goto;
        if (to === 'menu') Sound.back(); else Sound.select();
        Screens.set(to);
      });
    });

    // Escape backs out to the menu from any sub-screen.
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const s = Screens.get();
      // Games step back to the picker; everything else back to the menu.
      const to = (s === 'runner' || s === 'snake') ? 'arcade'
               : ['location', 'details', 'rsvp', 'arcade'].includes(s) ? 'menu'
               : null;
      if (to) { Sound.back(); Screens.set(to); }
    });
  }

  function insertCoin() {
    Sound.unlock();      // must happen inside the click for browsers to allow audio
    Sound.coin();
    Screens.set('boot');
    Loader.start(() => {
      MenuNav.reset();
      Screens.set('menu');
    });
  }

  /* ═══════════════════════════════════════════════════ 8. Start ═══ */

  function init() {
    renderStatics();
    renderVenues();
    renderTimeline();
    renderPerks();
    renderRsvp();
    positionCoinSlot();

    watchImage($('#heroPhoto'),   'no-photo');
    watchImage($('#coinMarquee'), 'no-marquee');

    Loader.init({
      log:    $('#bootLog'),
      blocks: $('#bootBlocks'),
      pct:    $('#bootPct'),
      status: $('#bootStatus'),
    });

    RunnerGame.init({
      canvas:   $('#runCanvas'),
      overlay:  $('#runOverlay'),
      big:      $('#runBig'),
      msg:      $('#runMsg'),
      startBtn: $('#runStart'),
      dist:     $('#runDist'),
      coins:    $('#runCoins'),
      best:     $('#runBest'),
      jumpBtn:  $('#runJump'),
      slideBtn: $('#runSlide'),
    });

    SnakeGame.init({
      canvas:   $('#snakeCanvas'),
      overlay:  $('#snakeOverlay'),
      big:      $('#snakeBig'),
      msg:      $('#snakeMsg'),
      startBtn: $('#snakeStart'),
      score:    $('#snakeScore'),
      best:     $('#snakeBest'),
      dpad:     $('#dpad'),
    });

    MenuNav.init($('#menuList'));
    Music.init($('#heroMusic'));
    initSoundToggle();
    initNav();

    $('#coinBtn').addEventListener('click', insertCoin);
    $('#skipIntro').addEventListener('click', () => {
      Sound.unlock();
      Sound.select();
      MenuNav.reset();
      Screens.set('menu');
    });

    $('#icsBtn').addEventListener('click', () => { Sound.select(); downloadIcs(); });
    $('#rsvpCopy').addEventListener('click', copyEmail);

    $('#secretBtn').addEventListener('click', () => {
      Sound.powerUp();
      Screens.set('arcade');
    });
    watchKonami(() => { Sound.powerUp(); Screens.set('arcade'); });

    // Start / stop the game loop as the snake screen comes and goes.
    // (Background music plays across every screen — see js/music.js.)
    Screens.onChange((now, prev) => {
      if (now === 'snake') SnakeGame.enter();
      else if (prev === 'snake') SnakeGame.leave();
      if (now === 'runner') RunnerGame.enter();
      else if (prev === 'runner') RunnerGame.leave();
    });

    // Open on whatever the URL asked for, without pushing a duplicate entry.
    const first = Screens.initial();
    Screens.set(first, { push: false, focus: false });
    history.replaceState({ screen: first }, '', location.hash || ' ');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
