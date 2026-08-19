/* =============================================================================
   Screen state machine + hash routing + keyboard navigation.
   Every screen lives in the DOM at all times; a class on <body> reveals one.
   ========================================================================== */

const Screens = (() => {
  const ALL = ['attract', 'boot', 'menu', 'location', 'details', 'rsvp', 'snake'];

  // Screens you can deep-link to. 'boot' is a transition, never a destination.
  const ROUTABLE = ['menu', 'location', 'details', 'rsvp', 'snake'];

  let current = null;
  const listeners = [];

  function onChange(fn) { listeners.push(fn); }

  /**
   * Show a screen.
   * @param {string} name
   * @param {{push?: boolean, focus?: boolean}} opts
   */
  function set(name, opts = {}) {
    const { push = true, focus = true } = opts;
    if (!ALL.includes(name) || name === current) return;

    const prev = current;
    current = name;

    document.body.classList.remove(...ALL.map(s => `screen-${s}`));
    document.body.classList.add(`screen-${name}`);
    document.body.classList.remove('is-loading');

    if (push) {
      const hash = ROUTABLE.includes(name) ? `#${name}` : ' ';
      if (location.hash !== `#${name}`) {
        history.pushState({ screen: name }, '', hash);
      }
    }

    // Move focus to the new screen's heading so keyboard and screen-reader
    // users land in the right place instead of at the top of the document.
    if (focus) {
      const section = document.getElementById(`screen-${name}`);
      const heading = section && section.querySelector('[tabindex="-1"]');
      if (heading) heading.focus({ preventScroll: true });
      const scroller = section && section.querySelector('.monitor__inner');
      if (scroller) scroller.scrollTop = 0;
    }

    listeners.forEach(fn => fn(name, prev));
  }

  function get() { return current; }

  /* Resolve the screen to open on first load from the URL hash. */
  function initial() {
    const hash = location.hash.replace('#', '');
    return ROUTABLE.includes(hash) ? hash : 'attract';
  }

  /* Browser back/forward. */
  window.addEventListener('popstate', (e) => {
    const name = (e.state && e.state.screen) || initial();
    set(name, { push: false });
  });

  return { set, get, onChange, initial, ROUTABLE };
})();

/* ═══════════════════════════════════════════════ Menu keyboard nav ═══ */

const MenuNav = (() => {
  let items = [];
  let index = 0;

  function paint() {
    items.forEach((el, i) => el.classList.toggle('sel', i === index));
  }

  function move(delta) {
    index = (index + delta + items.length) % items.length;
    paint();
    items[index].focus();
    Sound.blip();
  }

  function init(listEl) {
    items = Array.from(listEl.querySelectorAll('.menu__item'));
    paint();

    // Keep the visual selector in sync when someone uses Tab or a mouse.
    items.forEach((el, i) => {
      el.addEventListener('focus', () => { index = i; paint(); });
      el.addEventListener('mouseenter', () => { index = i; paint(); });
    });

    document.addEventListener('keydown', (e) => {
      if (Screens.get() !== 'menu') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement && document.activeElement.classList.contains('menu__item')) return;
        e.preventDefault();
        items[index].click();
      }
    });
  }

  function reset() { index = 0; paint(); }

  return { init, reset };
})();
