/* Shared by automatic listing detection and the toolbar action. No network requests. */
(() => {
  const markets = [
    ["Vinted", /^vinted\.(com|co\.uk|pt|fr|de|es|it|nl|be|at|pl|cz|sk|lt|lu|ie|se|dk|fi|ro|hu|hr|gr)$/, /\/items\/\d+/],
    ["OLX", /^olx\.(pt|pl|ro|bg|ua|com\.br|in)$/, /\/(anuncio|d\/oferta|oferta|item)\//],
    ["Wallapop", /^(?:[a-z]{2}\.)?wallapop\.com$/, /\/item\//],
    ["Depop", /^depop\.com$/, /\/products\//],
    ["eBay", /^ebay\.(com|co\.uk|de|fr|es|it|nl|ie|at|be|ca|com\.au)$/, /\/itm\//],
    ["Etsy", /^etsy\.com$/, /\/(?:[a-z]{2}\/)?listing\//],
    ["Gumtree", /^gumtree\.com$/, /\/p\//],
    ["Leboncoin", /^leboncoin\.fr$/, /\/(ad|vi)\//],
    ["Marktplaats", /^marktplaats\.nl$/, /\/v\//],
    ["Kleinanzeigen", /^kleinanzeigen\.de$/, /\/s-anzeige\//],
    ["Facebook Marketplace", /^facebook\.com$/, /\/marketplace\/item\//],
    ["Mercari", /^(?:[a-z]{2}\.)?mercari\.com$/, /\/item\//],
    ["Poshmark", /^poshmark\.(com|ca)$/, /\/listing\//],
    ["OfferUp", /^offerup\.com$/, /\/item\/detail\//],
    ["Craigslist", /^(?:[a-z0-9-]+\.)?craigslist\.org$/, /\/d\/.+\.html$/],
    ["Carousell", /^carousell\.(sg|com\.hk|com\.my|com\.ph|com\.tw)$/, /\/p\//],
  ];
  const text = (v) => typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
  function amount(value) {
    if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value.toFixed(2) : "";
    let s = text(value).normalize("NFKC").replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) % 16));
    if (/[-−–]/.test(s)) return ""; // negative values and ranges need manual review
    s = s.replace(/[^\d.,\u066b\u066c]/g, "").replace(/\u066b/g, ".").replace(/\u066c/g, ",");
    if (!s) return "";
    const decimal = /[.,]\d{1,2}$/.exec(s);
    s = decimal ? s.slice(0, decimal.index).replace(/[.,]/g, "") + "." + decimal[0].slice(1) : s.replace(/[.,]/g, "");
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n.toFixed(2) : "";
  }
  function currency(value) {
    const s = text(value).toUpperCase();
    const code = s.match(/\b(EUR|USD|GBP|BRL|PLN|SEK|DKK|NOK|CHF|CAD|AUD|JPY|INR|RON|CZK|HUF|SGD|HKD|MYR|PHP|TWD)\b/)?.[1];
    if (code) return code;
    if (s.includes("R$")) return "BRL";
    if (s.includes("€")) return "EUR";
    if (s.includes("£")) return "GBP";
    // A bare dollar sign is ambiguous: never assume USD.
    return "";
  }
  function read(doc = document, href = location.href) {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");
    const market = markets.find(([, domain]) => domain.test(host));
    const meta = (name) => text(doc.querySelector(`meta[property="${name}"],meta[name="${name}"]`)?.content);
    let product;
    const walk = (node, depth = 0) => {
      if (!node || depth > 12 || typeof node !== "object" || product) return;
      if (Array.isArray(node)) { node.slice(0, 80).forEach((n) => walk(n, depth + 1)); return; }
      const types = [].concat(node["@type"] || []);
      if (types.some((t) => /^(Product|IndividualProduct|Vehicle)$/.test(t)) && node.name) { product = node; return; }
      // Avoid selecting a recommended product from a search results ItemList.
      for (const key of ["@graph", "mainEntity", "mainEntityOfPage"]) walk(node[key], depth + 1);
    };
    for (const script of [...doc.querySelectorAll('script[type="application/ld+json"]')].slice(0, 30)) {
      if (script.textContent.length > 500000) continue;
      try { walk(JSON.parse(script.textContent)); } catch { /* broken marketplace metadata */ }
    }
    const offer = [].concat(product?.offers || [])[0] || {};
    const specific = (...selectors) => selectors.map((s) => doc.querySelector(s)).find(Boolean);
    const titleNode = specific('[data-testid="item-title"]', '[data-cy="ad_title"] h1', '[data-testid="x-item-title"] h1', 'h1[itemprop="name"]', 'main h1', 'h1');
    const priceNode = specific('[data-testid="item-price"]', '[data-testid="x-price-primary"]', '[data-testid="ad-price-container"]', '[data-cy="ad_price"]', '[itemprop="price"]');
    const rawPrice = offer.price ?? offer.priceSpecification?.price ?? meta("product:price:amount") ?? "";
    const price = amount(rawPrice || meta("og:price:amount") || priceNode?.getAttribute("content") || priceNode?.textContent);
    const code = currency(offer.priceCurrency || offer.priceSpecification?.priceCurrency || meta("product:price:currency") || meta("og:price:currency") || doc.querySelector('[itemprop="priceCurrency"]')?.getAttribute("content") || priceNode?.textContent);
    const title = text(product?.name || titleNode?.textContent || meta("og:title") || doc.title).slice(0, 160);
    const isListing = !!market && market[2].test(url.pathname);
    // Strip tracking parameters and fragments before passing a public source link.
    url.search = ""; url.hash = ""; url.username = ""; url.password = "";
    return { title, price, currency: code, source: market?.[0] || host, url: url.href, isListing, structured: !!product };
  }
  // Manual entry must never use the permissive metadata-price extractor.
  function parseInput(value, locale) {
    const parts = new Intl.NumberFormat(locale, { useGrouping: "always" }).formatToParts(12345.6);
    const decimal = parts.find((p) => p.type === "decimal")?.value || ".";
    const group = parts.find((p) => p.type === "group")?.value || ",";
    let s = String(value).normalize("NFKC").replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) % 16)).replace(/[\u200e\u200f\u061c]/g, "").trim();
    if (!s || /[^\d.,\s\u066b\u066c]/.test(s)) return "";
    // NFKC makes narrow and non-breaking grouping spaces ordinary spaces.
    const separator = group.normalize("NFKC");
    if (decimal !== "." && !s.includes(decimal) && /\.\d{1,2}$/.test(s) && s.split(".").length === 2) s = s.replace(".", decimal);
    else if (decimal === "." && !s.includes(".") && /,\d{1,2}$/.test(s) && s.split(",").length === 2) s = s.replace(",", ".");
    const chunks = s.split(decimal);
    if (chunks.length > 2 || (chunks.length === 2 && !/^\d{1,2}$/.test(chunks[1]))) return "";
    const integer = chunks[0];
    const digits = integer.split(separator).join("");
    if (!/^\d+$/.test(digits)) return "";
    if (integer.includes(separator)) {
      const grouped = new Intl.NumberFormat(locale, { useGrouping: "always", maximumFractionDigits: 0 }).format(Number(digits)).normalize("NFKC").replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) % 16));
      if (integer !== grouped) return "";
    }
    const n = Number(`${digits}.${chunks[1] || "00"}`);
    return Number.isFinite(n) && n > 0 && Number.isSafeInteger(Math.round(n * 100)) ? n.toFixed(2) : "";
  }
  globalThis.ShakeListing = { read, amount, currency, parseInput };
})();
