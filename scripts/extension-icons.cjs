// Render the existing SHAKE mark to Chrome's required PNG icon sizes.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const dir = path.resolve(__dirname, "../extension/icons");
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    for (const size of [16, 32, 48, 128]) {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-3 -3 30 30"><rect x="-3" y="-3" width="30" height="30" rx="8" fill="#111c29"/><defs><linearGradient id="g"><stop stop-color="#c6eaff"/><stop offset="1" stop-color="#658fae"/></linearGradient></defs><path d="M12 2A10 10 0 0 0 12 22V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z" fill="#f0f3f8" transform="translate(-.5)"/><path d="M12 2A10 10 0 0 1 12 22V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z" fill="url(#g)" transform="translate(.5)"/></svg>`);
      await page.screenshot({ path: path.join(dir, `${size}.png`), omitBackground: true });
    }
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
