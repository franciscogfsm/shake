const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const EXT = path.resolve(__dirname, "../extension");
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

test("the unpacked Manifest V3 extension loads and injects its own content scripts", async () => {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "shake-extension-"));
  const ctx = await chromium.launchPersistentContext(profile, {
    headless: false, ignoreDefaultArgs: ["--disable-extensions"],
    args: ["--headless=new", `--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  try {
    const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker", { timeout: 15000 });
    assert.match(sw.url(), /chrome-extension:\/\//);
    const page = await ctx.newPage();
    await page.route("https://www.vinted.pt/items/123-coat", (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: '<h1>Coat</h1><meta property="product:price:amount" content="25"><meta property="product:price:currency" content="EUR">' }));
    await page.goto("https://www.vinted.pt/items/123-coat");
    await page.getByRole("button", { name: "Pay safely with SHAKE" }).click();
    assert.equal(await page.locator("#shake-price").inputValue(), "25.00");
    assert.equal(await page.locator("#shake-currency").inputValue(), "EUR");
  } finally {
    await ctx.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
});

async function listing(url, html) {
  const page = await browser.newPage();
  await page.route("**/*", (r) => r.fulfill({ contentType: "text/html; charset=utf-8", body: html }));
  await page.goto(url);
  await page.addScriptTag({ path: path.join(EXT, "extract.js") });
  return page;
}

const cases = [
  ["Vinted", "https://www.vinted.pt/items/123456-jacket"],
  ["OLX", "https://www.olx.pt/d/anuncio/nintendo-ID123.html"],
  ["Wallapop", "https://es.wallapop.com/item/nintendo-123"],
  ["Depop", "https://www.depop.com/products/jacket-123/"],
  ["eBay", "https://www.ebay.co.uk/itm/123456"],
  ["Etsy", "https://www.etsy.com/listing/123456/lamp"],
  ["Gumtree", "https://www.gumtree.com/p/bicycles/bike/123"],
  ["Leboncoin", "https://www.leboncoin.fr/ad/velos/123"],
  ["Marktplaats", "https://www.marktplaats.nl/v/fietsen/m123"],
  ["Kleinanzeigen", "https://www.kleinanzeigen.de/s-anzeige/bike/123"],
  ["Facebook Marketplace", "https://www.facebook.com/marketplace/item/123"],
  ["Mercari", "https://www.mercari.com/us/item/m123/"],
  ["Poshmark", "https://poshmark.com/listing/jacket-123"],
  ["OfferUp", "https://offerup.com/item/detail/123"],
  ["Craigslist", "https://lisbon.craigslist.org/bik/d/bike/123.html"],
  ["Carousell", "https://www.carousell.sg/p/bike-123/"],
];
for (const [market, url] of cases) test(`${market}: detects listing and structured offer`, async () => {
  const page = await listing(url, `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "Product", name: "Vintage jacket", offers: { "@type": "Offer", price: "25.50", priceCurrency: "EUR" } }] })}</script><h1>Vintage jacket</h1>`);
  try {
    const result = await page.evaluate(() => ShakeListing.read());
    assert.equal(result.source, market);
    assert.equal(result.isListing, true);
    assert.equal(result.price, "25.50"); assert.equal(result.currency, "EUR");
  } finally { await page.close(); }
});

test("Vinted DOM fallback opens the review and sends an encoded, editable prefill", async () => {
  const page = await listing("https://www.vinted.pt/items/123-jacket?tracking=secret#foo", '<h1 data-testid="item-title">Jacket & boots</h1><div data-testid="item-price">25,50 €</div>');
  try {
    await page.addScriptTag({ path: path.join(EXT, "content.js") });
    await page.getByRole("button", { name: "Pay safely with SHAKE" }).click();
    assert.equal(await page.locator("#shake-price").inputValue(), "25.50");
    await page.locator("#shake-item").fill("Agreed jacket");
    await page.locator("#shake-price").fill("24.50");
    await page.evaluate(() => { window.open = (url) => { window.testOpened = url; }; });
    await page.getByRole("button", { name: "Continue in SHAKE" }).click();
    const next = new URL(await page.evaluate(() => window.testOpened));
    assert.equal(next.origin, "https://shake-lake.vercel.app");
    assert.equal(next.searchParams.get("i"), "Agreed jacket");
    assert.equal(next.searchParams.get("p"), "24.50");
    assert.equal(next.searchParams.get("c"), "EUR");
    assert.equal(next.searchParams.get("source"), "https://www.vinted.pt/items/123-jacket");
    // Screenshot is a labelled fixture, not evidence of marketplace endorsement.
    fs.mkdirSync(path.resolve(__dirname, "../docs/assets"), { recursive: true });
    await page.evaluate(() => {
      const css = document.createElement("style");
      css.textContent = 'body{margin:0;padding:64px;background:#edf1f5;font:16px system-ui;color:#223044}body>h1,body>[data-testid="item-price"]{margin-left:24px}body>h1{font-size:32px;letter-spacing:-1px}body>[data-testid="item-price"]{font-size:25px}.fixture{max-width:680px;padding:24px;border:1px solid #d4dce5;border-radius:24px;background:#fff}.fixture small{letter-spacing:3px;color:#768499}.fixture figure{display:grid;place-items:center;margin:24px 0 0;height:320px;border-radius:16px;background:linear-gradient(135deg,#d8e1e9,#eae7e0)}.fixture p{color:#69798a;max-width:42ch}';
      document.head.append(css);
      const preview = document.createElement("article"); preview.className = "fixture";
      preview.innerHTML = '<small>LISTING FIXTURE · EXTENSION PREVIEW</small><figure><svg width="260" height="250" viewBox="0 0 260 250" aria-hidden="true"><path d="M82 35l30-12h36l30 12 53 44-28 39-25-20v126H82V98l-25 20-28-39z" fill="#354e62" stroke="#243b4c" stroke-width="3"/><path d="M112 23l18 24 18-24M130 47v177M82 98V35M178 98V35" fill="none" stroke="#718a9c" stroke-width="3"/><path d="M98 140h20v29H98zM142 140h20v29h-20z" fill="#2a4052"/><circle cx="138" cy="95" r="2" fill="#cedce5"/><circle cx="138" cy="125" r="2" fill="#cedce5"/></svg></figure><p>A second-hand find, ready for a safer handover. Review the listing in SHAKE and agree the payment with the seller.</p>';
      document.body.prepend(preview);
      preview.insertBefore(document.querySelector("h1"), preview.querySelector("p"));
      preview.insertBefore(document.querySelector('[data-testid="item-price"]'), preview.querySelector("p"));
    });
    await page.screenshot({ path: path.resolve(__dirname, "../docs/assets/extension-review.png") });
  } finally { await page.close(); }
});

test("unsupported currencies never reuse the listing amount in a different currency", async () => {
  const page = await listing("https://www.vinted.pl/items/123-bike", '<h1>Bike</h1><meta property="product:price:amount" content="120"><meta property="product:price:currency" content="PLN">');
  try {
    await page.addScriptTag({ path: path.join(EXT, "content.js") });
    await page.getByRole("button", { name: "Pay safely with SHAKE" }).click();
    assert.equal(await page.locator("#shake-price").inputValue(), "");
    assert.equal(await page.locator("#shake-currency").inputValue(), "");
    assert.match(await page.getByRole("status").textContent(), /PLN isn’t supported/);
  } finally { await page.close(); }
});

test("home/search pages stay untouched; toolbar fallback works on other shops", async () => {
  const page = await listing("https://shop.example.com/products/lamp", '<h1>Desk lamp</h1><meta property="product:price:amount" content="39"><meta property="product:price:currency" content="GBP">');
  try {
    await page.addScriptTag({ path: path.join(EXT, "content.js") });
    assert.equal(await page.locator("#shake-marketplace-assistant").count(), 0);
    await page.evaluate(() => ShakeMount(true));
    assert.equal(await page.locator("#shake-item").inputValue(), "Desk lamp");
    assert.equal(await page.locator("#shake-currency").inputValue(), "GBP");
  } finally { await page.close(); }
});

test("choosing a different currency requires a newly agreed amount", async () => {
  const page = await listing("https://www.vinted.pt/items/123-coat", '<h1>Coat</h1><meta property="product:price:amount" content="25"><meta property="product:price:currency" content="EUR">');
  try {
    await page.addScriptTag({ path: path.join(EXT, "content.js") });
    await page.getByRole("button", { name: "Pay safely with SHAKE" }).click();
    await page.locator("#shake-currency").selectOption("USD");
    assert.equal(await page.locator("#shake-price").inputValue(), "");
    assert.match(await page.getByRole("status").textContent(), /amount agreed with the seller in USD/);
  } finally { await page.close(); }
});

test("SPA navigation removes old listing controls and avoids duplicates", async () => {
  const page = await listing("https://www.vinted.pt/items/123-coat", '<h1>Coat</h1>');
  try {
    await page.addScriptTag({ path: path.join(EXT, "content.js") });
    await page.addScriptTag({ path: path.join(EXT, "content.js") });
    assert.equal(await page.locator("#shake-marketplace-assistant").count(), 1);
    await page.evaluate(() => { history.pushState({}, "", "/catalog"); document.body.append(document.createElement("div")); });
    await page.locator("#shake-marketplace-assistant").waitFor({ state: "detached" });
    await page.evaluate(() => { history.pushState({}, "", "/items/456-shoes"); document.querySelector("h1").textContent = "Shoes"; });
    await page.getByRole("button", { name: "Pay safely with SHAKE" }).click();
    assert.equal(await page.locator("#shake-item").inputValue(), "Shoes");
  } finally { await page.close(); }
});

test("untrusted title stays text; bare dollars are ambiguous; locale prices parse", async () => {
  const page = await listing("https://www.ebay.com/itm/123", '<h1>&lt;img src=x onerror=alert(1)&gt;</h1>');
  try {
    const result = await page.evaluate(() => ({
      title: ShakeListing.read().title,
      dollar: ShakeListing.currency("$25.00"),
      brl: ShakeListing.amount("R$ 1.234,56"),
      arabic: ShakeListing.amount("١٢٫٥٠"),
      range: ShakeListing.amount("10–20 EUR"),
    }));
    assert.equal(result.title, "<img src=x onerror=alert(1)>");
    assert.equal(result.dollar, ""); assert.equal(result.brl, "1234.56");
    assert.equal(result.arabic, "12.50"); assert.equal(result.range, "");
    await page.addScriptTag({ path: path.join(EXT, "content.js") });
    await page.getByRole("button", { name: "Pay safely with SHAKE" }).click();
    assert.equal(await page.locator("#shake-marketplace-assistant img").count(), 0);
  } finally { await page.close(); }
});
