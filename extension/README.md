# SHAKE for marketplaces

Bring a public listing into a SHAKE payment without copying its details by hand.

## Try it after a Vercel deployment

1. Deploy the repository, including `public/shake-extension.zip` and `public/extension-preview.png`.
2. On the homepage select **Add SHAKE to your browser**, or open `https://shake-lake.vercel.app/extension` directly.
3. Choose Chrome or Edge, select **Add SHAKE**, then follow the page's three installation steps. The button downloads the ZIP; local installation still needs Developer mode and Load unpacked.
4. Open an individual OLX or Vinted listing and refresh it. Select **Pay safely with SHAKE**, check the imported details, and select **Continue in SHAKE**.
5. Check the prefilled payment, lock the test funds, and share the deal link with the seller. The seller must join before you complete the handover.

The extension's payment destination is the production origin `https://shake-lake.vercel.app`. A Vercel preview deployment does not change this destination. If production moves to another domain, update the destination in `content.js`, rebuild the ZIP, redeploy, and reload the extension. Deploying the website alone does not update an already installed unpacked extension; use its Reload button and refresh the listing after replacing its files.

## Install locally in Chrome or Edge

1. Download `https://shake-lake.vercel.app/shake-extension.zip` after deployment, and extract the ZIP. You can also use this repository's `extension` folder directly.
2. Open `chrome://extensions` (or `edge://extensions`). Enable **Developer mode**.
3. Select **Load unpacked**, then select the extracted folder containing `manifest.json`.
4. Pin **SHAKE — Pay safely** from the browser's extensions menu.
5. Open or refresh a listing. Select **Pay safely with SHAKE**, review the details, then **Continue in SHAKE**. The item, agreed price, currency, and source link arrive in the new-payment form. No funds move until you explicitly lock them in SHAKE.

There is no Web Store listing yet. Local installation is required. Desktop Chrome and Edge only.

## Marketplace coverage

Automatic listing detection includes Vinted, OLX, Wallapop, Depop, eBay, Etsy, Gumtree, Leboncoin, Marktplaats, Kleinanzeigen, Facebook Marketplace, Mercari, Poshmark, OfferUp, Craigslist, and Carousell, on the country domains listed in `manifest.json`. It does not display on their search/home pages. Automatic detection is based on listing URL patterns; availability of title and price varies by page.

For other public shops, click the toolbar icon. It reads Product JSON-LD, Open Graph metadata, or visible product headings and price fields. Dynamic, login-only, regional, auction, bundle, and delivery-inclusive prices need manual review. Marketplace layouts and data can change. No marketplace affiliation or seller verification is implied; this does not replace a site's checkout or buyer protection, and users should follow its terms.

EUR, USD, GBP, and BRL are supported test settlement currencies. Unsupported currencies clear the amount and require an explicit agreed price. A bare `$` is ambiguous and requires a currency choice. There is no automatic FX. Test deal limits remain 1–2,000 units.

## Privacy and permissions

No analytics, external scripts, cookies, account credentials, background API requests, or wallet access. Listing extraction runs on the current page. The extension transfers the reviewed title, amount, currency, and public source URL to SHAKE in a new tab only after **Continue in SHAKE**. Query parameters and fragments are stripped from the source URL. Imported titles and source URLs appear in the resulting SHAKE URL and browser history.

Static content scripts run only on the named marketplaces. `activeTab` and `scripting` allow toolbar use on another page after the user clicks. The destination is fixed to `https://shake-lake.vercel.app` in `content.js`. All JavaScript is packaged locally, as required for Manifest V3.

## Maintain and verify

- `node --test scripts/extension.test.cjs`: Chromium tests with controlled marketplace fixtures, including an actual unpacked extension load. These verify extraction, currency handling, editable review, handoff, SPA navigation, and safe text rendering. Fixtures do not establish live-site compatibility.
- `node scripts/extension-handoff.cjs http://localhost:3110`: checks all four currencies in the running app, localized editable amounts, the installation page, and the downloadable ZIP. No payment is submitted.
- After editing, reload the extension in `chrome://extensions`, then reload the listing tab.
- `powershell -ExecutionPolicy Bypass -File scripts/package-extension.ps1`: rebuild the downloadable ZIP on Windows.

The screenshot in `docs/assets/extension-review.png` is a controlled listing fixture for visual verification.

Live smoke checks on 25 October 2026: an installed extension automatically appeared on an OLX Portugal bicycle listing and a Vinted Spain clothing listing, and imported their titles, EUR currencies, and prices (150.00 and 2.00 respectively). This verifies those two pages at that time; other marketplace families have fixture coverage.

The implementation follows Chrome's [content script model](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) and [activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab).
