# SHAKE design system: Graphite Glacier (LOCKED)

The team chose this direction on 25 Oct 2026. Don't propose other directions, palettes or fonts unless the team asks.
- Visual reference: [`design/reference.html`](../design/reference.html) (open it in a browser). The live copy is https://claude.ai/artifact/TDbtfDh52KX4WCZ3Y3JCNe.
- Build the real components from this file and match that page.

## Feel
- Deep graphite stage. Slow-drifting blue and violet light behind real liquid glass.
- One signature colour, **glacier blue**, which means safe, locked or released money.
- **Red only** for the fake screenshot and for scams.
- Revolut-level clean: few elements, huge type, tight tracking, lots of space.

## Colour tokens (CSS variables; use nothing else)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0d0f12` | page background |
| `--surface` | `#14171b` | solid fallback for glass, cards |
| `--ink` | `#f3f5f7` | primary text |
| `--ink-2` | `#c3cad3` | secondary text |
| `--mute` | `#97a0ab` | labels, captions (passes AA on `--bg`) |
| `--line` | `rgba(255,255,255,.12)` | hairlines, tracks |
| `--safe` | `#8fd3ff` | safe money: amounts glow, "Verified", pulse, rings, the primary solid button |
| `--safe-rgb` | `143,211,255` | for `rgba()` glows |
| `--on-safe` | `#0b0b0c` | text on a `--safe` button |
| `--danger` | `#ff453a` | **only** the fake screenshot and scam states |
| `--glass` | `rgba(255,255,255,.07)` | glass fill |
| light 1 / 2 / 3 | `80,140,255` / `143,211,255` / `170,120,255` | background light blobs (alpha .5 / .38 / .28) |

The theme is dark only, and `<meta name="theme-color" content="#0d0f12">` sets the browser bar to match.

## Type
- **Display: Satoshi** at 500, tracking `-0.035em`, line-height about 0.98. It's free (Fontshare, ITF Free Font License) and is the closest free match to Revolut's Aeonik Pro.
  - Self-host the woff2 files with `next/font/local`, weights 500 and 700, from `https://api.fontshare.com/v2/css?f[]=satoshi@500,700`.
- **Text: Inter** (`next/font/google`) at 400, 500 and 600. Inter is Revolut's body font.
- **Mono: JetBrains Mono** at 400 and 500, for amounts' small labels, hashes, codes, timers and eyebrow labels.
  - Eyebrow labels are uppercase with `0.12em` tracking.
- **Scale:**
  - Hero: `clamp(40px, 9vw, 72px)`.
  - Amounts: `clamp(64px, 18vw, 120px)` at `-0.06em`, with `tabular-nums`.
  - Body: 16px minimum on mobile.
- The headline second line ("Shake on it.") is in `--safe` with a soft glow: `text-shadow 0 0 26px rgba(safe,.22)`.

## Spacing, radius, elevation
- **Spacing:** a 4px base, so use 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64.
- **Radius:** 12 / 20 / 28 / pill. Phone-sized glass cards use 28.
- **Elevation:** depth comes from light and glass: a top inner highlight, a rim gradient and a big soft shadow `0 24px 60px -24px rgba(0,0,0,.6)`. No hard drop shadows.

## Liquid glass recipe (chrome only, never paragraph text, at most 3–4 per view)
1. **Default:** `background: var(--surface)`, solid and readable.
2. **Frosted:** inside `@supports (backdrop-filter: blur(1px))`, use `background: rgba(255,255,255,.07); -webkit-backdrop-filter: blur(26px) saturate(170%); backdrop-filter: blur(26px) saturate(170%)`.
   - Hard-code the values in the `-webkit-` line, because Safari doesn't read CSS variables there.
3. **Rim:** a 1px gradient border via a mask: `linear-gradient(150deg, rgba(255,255,255,.75), rgba(255,255,255,.08) 35%, transparent 60%, rgba(143,211,255,.55))`.
4. **Inner highlight:** `inset 0 1px 0 rgba(255,255,255,.4)`.
5. **Specular sheen:** follows the pointer, or the gyroscope on iPhone. It's a radial `rgba(255,255,255,.16)` at `--mx/--my`.
6. **Refraction:** an SVG `feDisplacementMap` on Chromium desktop only, as an extra.
- **Background behind glass:** three drifting radial lights, 18s alternate, plus grain at 6% opacity. It must never be flat behind glass.
- **Never animate blur.** Animate transform and opacity only.

## The mark: a coin split in two
- The buyer's half (left) is **solid** white. The seller's half (right) is **glacier glass**, because they see the money before they get it.
- A tab on the left half fits a slot in the right half, so they only lock one way, and only together.
- **Not** overlapping circles (that looked like Mastercard; the team rejected it).

```svg
<!-- viewBox 0 0 24 24; both halves share the exact same seam so closed = perfect circle -->
<path id="left"  d="M12 2A10 10 0 0 0 12 22V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z"/>  <!-- fill #f3f5f7 + white→black shade -->
<path id="right" d="M12 2A10 10 0 0 1 12 22V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z"/>  <!-- fill #8fd3ff @ .62 + white sheen gradient + rim arc -->
```

| State | Left half | Right half | Extra |
|---|---|---|---|
| Resting (seam visible) | `translateX(-0.6)` | `translateX(+0.6)` | none |
| Holding (tension) | `-2.6` | `+2.6` | coin scales to 0.92 |
| Shaken (closed) | `0` | `0` | full circular rim (r 9.8) fades in |

**Slam choreography** (the same in the logo, hold-to-shake and the released moment):
1. Tension: pull apart and squeeze.
2. Accelerate shut, with ease-in `cubic-bezier(.85,0,.95,.4)`.
3. Pop to scale 1.09 with a −4° wobble, then settle (scale .98 / 2.5°, 1.015 / −1°, rest).
4. A diagonal light sheen sweeps across the coin.
5. Two expanding rings, 140ms apart.
6. A glacier glow flash.
7. Haptic `navigator.vibrate(30)`; on iOS a visual micro-shake.
8. The seal stamps in.

**Assets:**
- Favicon and app icon: the coin on a `#0d0f12` rounded square with a blue corner light.
- OG image: amount plus "funds locked" plus the coin.

## Motion
- **Spring presets (Framer Motion):**
  - `snappy`: stiffness 500, damping 32. For UI.
  - `smooth`: stiffness 260, damping 30. For layout.
  - `slam`: stiffness 700, damping 18, mass 0.8. Overshoot is intended.
- **Durations:** 150ms micro, 300–450ms transitions, 600–900ms hero moments. Nothing blocks the user for more than about 900ms.
- **Staggers:** 40–60ms per element. Numbers count up on a spring. Hashes type in with a short scramble.
- **Reduced motion:** use fades only; everything still works.

## Voice
- Short, human, confident. Never say "crypto", "gas", "seed", "wallet address" or **"escrow"**.
- Say "locked", "released", "refunded", "proof" and "meet face to face".
