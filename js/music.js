/* =============================================================================
   Background music loop (assets/hero-theme.mp3).
   Plays continuously across every screen, gated only by the sound toggle,
   and defaults to on — but browsers block audible autoplay before any user
   gesture, so a blocked first attempt is armed to retry on the very first
   interaction anywhere on the page rather than waiting for the coin click.
   ========================================================================== */

const Music = (() => {
  let el = null;
  let armed = false;

  function shouldPlay() {
    return !!el && Sound.isEnabled();
  }

  function tryPlay() {
    if (!shouldPlay() || !el.paused) return;
    const p = el.play();
    // play() returns a promise in modern browsers; a pre-gesture autoplay
    // attempt rejects rather than throws, so this is the normal path on
    // first load, not an error condition.
    if (p && typeof p.catch === 'function') {
      p.catch(() => arm());
    }
  }

  function pause() {
    if (el && !el.paused) el.pause();
  }

  /* Retry on the first real interaction anywhere on the page — click,
     keypress, or touch — so sound starts as close to "on load" as the
     platform allows, without needing a "click to enable sound" prompt. */
  function arm() {
    if (armed) return;
    armed = true;
    const retry = () => { armed = false; tryPlay(); };
    ['pointerdown', 'keydown', 'touchstart', 'click'].forEach((evt) =>
      document.addEventListener(evt, retry, { once: true, capture: true })
    );
  }

  function init(audioEl) {
    el = audioEl;
    el.loop = true;
    el.volume = 0.45;
    tryPlay();
  }

  function onSoundToggle(enabled) {
    if (enabled) tryPlay();
    else pause();
  }

  return { init, onSoundToggle, tryPlay };
})();
