const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const EXT = path.resolve(__dirname, "../extension");
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

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
