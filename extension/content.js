(() => {
  if (globalThis.ShakeMount) return;
  const ID = "shake-marketplace-assistant";
  let host, root, previousFocus, currentUrl = location.href, dismissedUrl = "";
  const el = (tag, attrs = {}, value = "") => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    n.textContent = value;
    return n;
  };
  function close() {
    host?.remove(); host = null; root = null;
    previousFocus?.focus();
  }
  function mount(open = false) {
    if (!/^https?:$/.test(location.protocol) || location.hostname === "shake-lake.vercel.app") return;
    const listing = globalThis.ShakeListing.read();
    if (!open && (!listing.isListing || dismissedUrl === location.href)) { close(); return; }
    if (host?.isConnected && !open) return;
    close();
    previousFocus = document.activeElement;
    host = el("div", { id: ID });
    // Shadow DOM keeps marketplace CSS from changing the SHAKE controls.
    root = host.attachShadow({ mode: "open" });
    const style = el("style");
    style.textContent = `
      :host{all:initial;position:fixed!important;inset:auto 24px 24px auto!important;z-index:2147483647!important;font:14px/1.5 system-ui,-apple-system,sans-serif;color:#f3f5f8;color-scheme:dark}
      *{box-sizing:border-box}button,input,select,a{font:inherit}button,a,input,select{outline-offset:4px}button{cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}
      .dock{display:flex;align-items:center;gap:14px;padding:10px 12px 10px 20px;border:1px solid #758eaa;border-radius:99px;background:linear-gradient(120deg,#233448,#171a24);box-shadow:0 12px 60px #0006}
      .launch{border:0;background:none;color:#f3f5f8;padding:6px 0;text-align:left}.launch strong{display:block;font-size:15px}.launch small{color:#afc2d6;font-size:11px}
      .x{border:0;background:transparent;color:#a9b5c4;border-radius:50%;width:32px;height:32px;font-size:21px}.x:hover{background:#ffffff12;color:white}
      .card{width:370px;max-width:calc(100vw - 32px);max-height:calc(100dvh - 40px);overflow:auto;border:1px solid #64768b;border-radius:24px;padding:24px;background:radial-gradient(ellipse at top left,#223b54,transparent 65%),#10151d;box-shadow:0 20px 90px #0008}
      header{display:flex;align-items:center;justify-content:space-between}.brand{letter-spacing:4px;font-size:12px;font-weight:750}.badge{font-size:10px;color:#9dd8fa;letter-spacing:1px;text-transform:uppercase}
      h2{font-size:30px;line-height:1.12;letter-spacing:-1px;margin:20px 0 10px}p{color:#b9c4d2;margin:0 0 18px}label{display:block;font-size:12px;color:#b9c4d2;margin:14px 0 5px}
      input,select{width:100%;padding:12px;border:1px solid #526171;border-radius:12px;background:#ffffff07;color:#f3f5f8}select option{background:#151c26}.row{display:grid;grid-template-columns:1fr 100px;gap:12px}
      .source{display:block;color:#a4d9fa;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:14px 0}.continue{width:100%;padding:14px;border-radius:99px;border:1px solid #bedff8;background:linear-gradient(100deg,#b5e2fa,#c1bbfa);color:#102033;font-weight:700;margin-top:12px}
      .note{font-size:11px;color:#97a6b8;margin:14px 0 0}.warning{font-size:12px;color:#f5d69b;min-height:18px;margin:12px 0 0}.steps{font-size:12px;color:#a4d9fa;margin-top:14px;word-spacing:2px}
      @media(max-width:480px){:host{right:16px!important;bottom:16px!important}.card{padding:20px}}
      @media(prefers-reduced-motion:no-preference){.card,.dock{animation:appear .2s ease-out}@keyframes appear{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}}
    `;
    root.append(style);
    if (!open) {
      const dock = el("div", { class: "dock" });
      const launch = el("button", { class: "launch", type: "button" });
      launch.append(el("strong", {}, "Pay safely with SHAKE"), el("small", {}, "Lock funds. Check the item. Release."));
      launch.onclick = () => mount(true);
      const dismiss = el("button", { class: "x", type: "button", "aria-label": "Dismiss SHAKE for this listing" }, "×");
      dismiss.onclick = () => { dismissedUrl = location.href; close(); };
      dock.append(launch, dismiss); root.append(dock);
    } else {
      const card = el("section", { class: "card", role: "dialog", "aria-label": "Pay safely with SHAKE" });
      const header = el("header");
      const x = el("button", { class: "x", type: "button", "aria-label": "Close SHAKE" }, "×");
      x.onclick = () => { close(); mount(); };
      header.append(el("span", { class: "brand" }, "SHAKE"), el("span", { class: "badge" }, "Stellar Testnet"), x);
      card.append(header, el("h2", {}, "Found it?\nShake on it."), el("p", {}, "Bring this listing into SHAKE. Check the details, then lock the agreed amount."));
      const form = el("form");
      const title = el("input", { id: "shake-item", maxlength: "40", required: "", minlength: "2", autocomplete: "off" });
      title.value = listing.title.slice(0, 40);
      const price = el("input", { id: "shake-price", type: "number", min: "1", max: "2000", step: "0.01", required: "", inputmode: "decimal" });
      price.value = listing.price;
      const code = el("select", { id: "shake-currency", required: "" });
      code.append(el("option", { value: "" }, "Choose"));
      for (const c of ["EUR", "USD", "GBP", "BRL"]) code.append(el("option", { value: c }, c));
      code.value = ["EUR", "USD", "GBP", "BRL"].includes(listing.currency) ? listing.currency : "";
      const row = el("div", { class: "row" });
      const a = el("div"), b = el("div");
      a.append(el("label", { for: "shake-price" }, "Agreed price"), price);
      b.append(el("label", { for: "shake-currency" }, "Currency"), code); row.append(a, b);
      const warning = el("p", { class: "warning", role: "status" });
      if (listing.currency && !code.value) {
        price.value = "";
        warning.textContent = `${listing.currency} isn’t supported. Agree an amount in EUR, USD, GBP or BRL; SHAKE does not convert currencies.`;
      } else if (!listing.price || !listing.currency) warning.textContent = "Check the price and currency. This page did not provide both reliably.";
      else warning.textContent = "Listing details imported. Confirm the agreed price with the seller.";
      const link = el("a", { class: "source", href: listing.url, target: "_blank", rel: "noopener noreferrer" }, `From ${listing.source} · view original listing`);
      const submit = el("button", { class: "continue", type: "submit" }, "Continue in SHAKE →");
      form.append(el("label", { for: "shake-item" }, "What are you buying?"), title, row, link, warning, submit);
      form.onsubmit = (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const p = globalThis.ShakeListing.amount(price.value);
        if (!p || !["EUR", "USD", "GBP", "BRL"].includes(code.value)) return;
        const url = new URL("https://shake-lake.vercel.app/deal/new");
        url.search = new URLSearchParams({ i: title.value.trim(), p, c: code.value, source: listing.url, via: "extension", k: "meet" }).toString();
        window.open(url.href, "_blank", "noopener,noreferrer");
      };
      card.append(form, el("div", { class: "steps" }, "Lock → Inspect → Shake"), el("p", { class: "note" }, "Independent SHAKE extension. Not affiliated with this marketplace. Continuing does not pay or contact the seller. Test assets have no cash value."));
      card.addEventListener("keydown", (event) => { if (event.key === "Escape") { event.preventDefault(); x.click(); } });
      root.append(card);
      setTimeout(() => title.focus(), 0);
    }
    document.documentElement.append(host);
  }
  globalThis.ShakeMount = mount;
  let timer;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (location.href !== currentUrl) { currentUrl = location.href; close(); mount(); }
      else if (!host?.isConnected) mount();
    }, 400);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  // popstate covers back/forward; mutations cover client-rendered marketplace routes.
  addEventListener("popstate", () => { currentUrl = location.href; close(); mount(); });
  mount();
})();
