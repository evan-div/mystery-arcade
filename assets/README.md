# Assets

| Filename | What it is |
| --- | --- |
| `hero-arcade.png` | The dark arcade row photo (16:9). This is the landing background. |
| `insert-coin.png` | The red "25¢ INSERT COIN TO PLAY" marquee, transparent background. |
| `hero-theme.mp3` | Music that loops continuously across every screen; the sound toggle mutes it. |

**Until these exist the site still works** — it renders a CSS-drawn arcade and a
CSS-drawn marquee instead. Nothing breaks, it just looks stylized rather than photoreal.

## After you add the photo

The glowing coin slot is positioned by percentage over the image. If the glow doesn't
sit exactly on the middle cabinet's coin slot, open `js/config.js` and nudge:

```js
COIN_SLOT: { x: 47.4, y: 43.0 },   // percentages of the image, left/top
```

Reload and repeat until it lines up. That's the only tuning this site needs.
