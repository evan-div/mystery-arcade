# 🕹️ Mystery Arcade

An arcade-cabinet invitation for the **ITE work party — Friday, September 25, 2026**.

The landing screen is a dark arcade row where the middle cabinet's coin slot pulses.
Click it and you "insert a coin": the screen becomes a CRT monitor, an 8-bit bar boots
up, and a menu offers **LOCATION**, **DETAILS**, and **RSVP**. There's a hidden Snake
game in there too.

No build step, no dependencies, no framework. Plain HTML, CSS and JavaScript.

---

## Two things to do before you send the link out

### 1. Add the two images

Drop these into `assets/`:

| Filename | What it is |
| --- | --- |
| `hero-arcade.png` | The dark arcade row photo — must be **16:9** |
| `insert-coin.png` | The red "25¢ INSERT COIN TO PLAY" marquee, transparent background |

**The site works without them.** If either is missing it renders a CSS-drawn stand-in
instead of a broken image — stylized rather than photoreal, but nothing looks wrong.

### 2. Line up the coin slot

The glow is positioned as a percentage of the hero photo. Once your photo is in, open
`js/config.js` and nudge these until the glow sits exactly on the middle cabinet's slot:

```js
COIN_SLOT: { x: 47.4, y: 43.0 },   // % from the left / top of the image
```

The starting values are measured from the original photo, so they should already be
close. Reload after each tweak — it's the only tuning this site needs.

---

## Editing the content

**Everything lives in `js/config.js`.** Times, venues, addresses, perks, the RSVP
address — all of it. You should never need to touch the HTML to change a detail.

```js
RSVP_EMAIL: 'evanccordova@gmail.com',   // swap for a work address any time
```

---

## Running it locally

It's static files, so any web server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly via `file://` mostly works, but the clipboard button
needs a real server (or HTTPS), so prefer the command above.

---

## Deploying

### Netlify
Connect the repo and deploy — `netlify.toml` already sets publish directory `.` with no
build command. Or drag the folder onto the Netlify dashboard.

### Vercel
Import the repo. `vercel.json` is configured; accept the defaults (no framework, no
build command).

Both are free for a site like this, and both give you a shareable URL immediately.

---

## What's in here

```
index.html          every screen, plus a plain <noscript> invite
css/styles.css      design tokens, CRT layer, all screen styling
js/config.js        ← ALL content and tunable values
js/audio.js         8-bit sound synthesized with Web Audio (no audio files ship)
js/screens.js       screen state machine, hash routing, keyboard nav
js/loader.js        the boot sequence and loading bar
js/snake.js         the easter egg
js/main.js          renders content from config and wires everything up
```

## Notes

- **Sound is off by default** and there's a toggle in the top-right. Every effect is
  generated from oscillators at runtime, so no audio files are in the repo.
- **The gimmick never blocks the information.** Screens are deep-linkable
  (`#details`, `#location`, `#rsvp`), the browser Back button works, `Esc` returns to
  the menu, the boot sequence skips on any key, and disabling JavaScript shows the full
  invite as plain text.
- **Reduced motion is respected** — flicker, pulsing and typing all stop for anyone who
  has that preference set, and the loading bar resolves immediately.
- **The easter egg** is reachable from the blinking `?? ?????` cabinet on the menu, or
  by entering the Konami code (↑ ↑ ↓ ↓ ← → ← → B A) from any screen.
