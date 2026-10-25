# SHAKE pitch deck

`index.html` is the whole deck in one file: open it in a desktop browser.

- Arrow keys or the dots at the top move between slides.
- Leaving the first slide locks 10€ of test money; the decision slide releases or refunds it.
- `index.html?present` hides the "What you're seeing" captions for the live stage version.
- Phones and tablets get an "Open this on a computer" screen.

Settings live at the top of the script in `CFG`: `API` (empty = the app serving /pitch runs real testnet deals through `/api/pitch/deck`; `null` = demo mode), `DEMO_VIDEO` for the 30s demo slide, `TRY_URL` for the closing QR.
