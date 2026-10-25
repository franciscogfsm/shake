// Requires a running SHAKE app; never submits a payment.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.argv[2] || "http://localhost:3110";
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const currency of ["EUR", "USD", "GBP", "BRL"]) {
      const page = await browser.newPage({ locale: "pt-PT" });
      const params = new URLSearchParams({ i: "Vintage jacket", p: "25.50", c: currency, source: "https://www.vinted.pt/items/123-jacket", via: "extension" });
      await page.goto(`${base}/deal/new?${params}`, { waitUntil: "networkidle", timeout: 120000 });
      await page.waitForFunction(() => document.querySelector("#price")?.value === "25,5");
      assert.equal(await page.locator("#item").inputValue(), "Vintage jacket");
      assert.match(await page.getByRole("button", { name: /Country:/ }).getAttribute("aria-label"), new RegExp(`currency ${currency}`));
      assert.equal(await page.getByRole("link", { name: /view original listing/ }).getAttribute("href"), "https://www.vinted.pt/items/123-jacket");
      await page.locator("#price").fill("24,5");
      await page.locator("#item").fill("Agreed jacket");
      assert.equal(await page.locator("#price").inputValue(), "24,5");
      console.log(`${currency}: title, localized amount, original currency, source and editable form passed`);
      await page.close();
    }
    const page = await browser.newPage();
    await page.goto(`${base}/extension`, { waitUntil: "networkidle", timeout: 120000 });
    await page.getByRole("heading", { name: /Found it/ }).waitFor();
    const image = page.locator('img[alt^="SHAKE listing"]');
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const img = document.querySelector('img[alt^="SHAKE listing"]'); return img?.complete && img.naturalWidth > 0; });
    const download = await page.request.get(`${base}/shake-extension.zip`);
    assert.equal(download.status(), 200);
    assert.equal((await download.body()).subarray(0, 2).toString(), "PK");
    await page.screenshot({ path: "docs/assets/extension-install.png", fullPage: true });
    console.log("Installation page, preview image and downloadable ZIP passed");
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
