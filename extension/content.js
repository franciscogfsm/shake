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
  const symbol = () => {
    const node = el("span", { class: "symbol", "aria-hidden": "true" });
    node.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M11.5 2A10 10 0 0 0 11.5 22V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H11.5Z" fill="#eef5ff"/><path d="M12.5 2A10 10 0 0 1 12.5 22V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12.5Z" fill="#9acfe9"/><path d="M12.5 2.4A9.6 9.6 0 0 1 12.5 21.6" stroke="#d3efff" stroke-width=".6"/></svg>';
    return node;
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
      :host{font-size:13px;line-height:1.45;-webkit-font-smoothing:antialiased}
      .card,.dock{position:relative;isolation:isolate;background:linear-gradient(135deg,#ffffff15,#ffffff03 45%,#a8dcff13),linear-gradient(155deg,#26394cee,#11151ef5 60%,#181e2aee);border:1px solid #d7eaff45;backdrop-filter:blur(28px) saturate(145%);-webkit-backdrop-filter:blur(28px) saturate(145%);box-shadow:inset 0 1px 0 #ffffff6b,inset 0 -1px 0 #c7e8ff20,0 20px 65px #08101b55,0 2px 6px #0003}
      .card:before,.dock:before{content:"";pointer-events:none;position:absolute;inset:0;border-radius:inherit;background:radial-gradient(ellipse at 10% 0,#b4dcff20,transparent 50%),radial-gradient(ellipse at 100% 100%,#b5a6f218,transparent 55%);z-index:-1}
      .card{width:344px;padding:18px;border-radius:26px;scrollbar-width:thin;scrollbar-color:#8da7bf55 transparent}
      .dock{gap:11px;padding:8px 8px 8px 14px}.launch strong{font-size:13px;font-weight:650;letter-spacing:-.15px}.launch small{font-size:10px;color:#b7c7d8}.symbol{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;filter:drop-shadow(0 2px 7px #a3dbff25)}
      .brand{display:inline-flex;align-items:center;gap:8px;font-size:10px;letter-spacing:2.8px}.brand .symbol svg{width:23px;height:23px}.badge{display:inline-flex;align-items:center;gap:5px;font:9px ui-monospace,monospace;letter-spacing:1px;border:1px solid #c2e5ff2c;background:#b9e2ff09;padding:5px 8px;border-radius:99px;color:#c1e6ff}.badge:before{content:"";width:4px;height:4px;background:#9fdaff;border-radius:50%;box-shadow:0 0 8px #9fdaff}
      .x{width:28px;height:28px;font-size:19px}.x:focus-visible,input:focus-visible,select:focus-visible,a:focus-visible,summary:focus-visible{outline:2px solid #a4dcff;outline-offset:3px}
      h2{font-size:27px;font-weight:550;line-height:1.06;letter-spacing:-1.1px;margin:18px 0 9px;white-space:pre-line}h2 span{background:linear-gradient(100deg,#eaf7ff,#9dd9ff 48%,#b9aaff);background-clip:text;-webkit-background-clip:text;color:transparent}
      p{font-size:12px;line-height:1.5;margin-bottom:15px;color:#c1cbd8}label{font-size:10px;font-weight:500;letter-spacing:.2px;margin:11px 0 5px;color:#adbfd0}
      input,select{height:43px;padding:10px 12px;font-size:13px;border:1px solid #d1e5ff29;border-radius:13px;background:linear-gradient(150deg,#ffffff0a,#ffffff03);box-shadow:inset 0 1px 3px #0002,0 1px 0 #ffffff06;transition:border-color .15s,background .15s}input:hover,select:hover{border-color:#bfe5ff66}input:focus,select:focus{background:#b8dfff0b;border-color:#bfe5ff80}.row{grid-template-columns:1fr 92px;gap:10px}#shake-price{font-size:19px;letter-spacing:-.5px;font-variant-numeric:tabular-nums}
      .source{font-size:10px;margin:12px 0 0;text-decoration:none;color:#b7d8ee}.source:hover{text-decoration:underline}.warning{font-size:10px;line-height:1.45;color:#a8bacb;min-height:0;margin:8px 0 0}.warning[data-tone="warning"]{color:#f2d39c}
      .continue{position:relative;isolation:isolate;overflow:hidden;min-height:45px;padding:11px 18px;font-size:13px;font-weight:600;margin-top:15px;border:1px solid #e1f4ff99;background:linear-gradient(170deg,#e8f8ff 0%,#bce6ff 24%,#a7d8f7 60%,#bdbbf3 100%);box-shadow:inset 0 1px 1px #ffffffcf,inset 0 -2px 4px #56759d50,0 4px 18px #8dcfff22;transition:transform .15s,box-shadow .15s}.continue:before{content:"";position:absolute;inset:2px 12% 48%;border-radius:99px;background:linear-gradient(#fff9,#fff0);pointer-events:none}.continue:hover{box-shadow:inset 0 1px 1px white,inset 0 -2px 4px #56759d50,0 6px 25px #8dcfff44;transform:translateY(-1px)}.continue:active{transform:translateY(1px)}.continue:focus-visible{outline:2px solid #e7f6ff;outline-offset:4px}
      .steps{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:13px;font:9px ui-monospace,monospace;color:#a9c1d3;letter-spacing:.3px}.steps span{color:#5d7c95}.note{margin-top:14px;padding-top:11px;border-top:1px solid #d4e9ff14;font-size:9px;line-height:1.5;color:#90a5b8}.note summary{cursor:pointer;list-style:none;color:#a3b9cc}.note summary:after{content:" +";float:right}.note[open] summary:after{content:" −"}.note p{font-size:9px;color:#90a5b8;margin:8px 0 0}
      @media(max-width:480px){.card{padding:18px}}
      @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
      .amount-field{display:flex;align-items:center;gap:8px;height:46px;padding:0 12px;border:1px solid #d1e5ff29;border-radius:13px;background:linear-gradient(150deg,#ffffff0a,#ffffff03);box-shadow:inset 0 1px 3px #0002,0 1px 0 #ffffff06}
      .amount-field:focus-within{border-color:#bfe5ff80;outline:2px solid #a4dcff;outline-offset:3px;background:#b8dfff0b}.amount-symbol{flex-shrink:0;font-size:17px;font-weight:500;color:#bad9ed;letter-spacing:-.5px}
      .amount-field #shake-price{min-width:0;width:100%;height:42px;padding:0;border:0;outline:none;background:transparent;box-shadow:none;font-size:23px;font-weight:500;letter-spacing:-.7px;-moz-appearance:textfield}.amount-field #shake-price::-webkit-inner-spin-button,.amount-field #shake-price::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
      .row{grid-template-columns:minmax(0,1fr) 110px;gap:9px}#shake-currency{height:46px;padding-left:10px;font-size:12px}
    `;
    root.append(style);
    if (!open) {
      const dock = el("div", { class: "dock" });
      const launch = el("button", { class: "launch", type: "button" });
      launch.append(el("strong", {}, "Pay safely with SHAKE"), el("small", {}, "Lock funds. Check the item. Release."));
      launch.onclick = () => mount(true);
      const dismiss = el("button", { class: "x", type: "button", "aria-label": "Dismiss SHAKE for this listing" }, "×");
      dismiss.onclick = () => { dismissedUrl = location.href; close(); };
      dock.append(symbol(), launch, dismiss); root.append(dock);
    } else {
      const card = el("section", { class: "card", role: "dialog", "aria-label": "Pay safely with SHAKE" });
      const header = el("header");
      const x = el("button", { class: "x", type: "button", "aria-label": "Close SHAKE" }, "×");
      x.onclick = () => { close(); mount(); root?.querySelector(".launch")?.focus(); };
      const brand = el("span", { class: "brand" });
      brand.append(symbol(), el("span", {}, "SHAKE"));
      header.append(brand, el("span", { class: "badge" }, "Testnet"), x);
      const heading = el("h2", {}, "Found it?\n");
      heading.append(el("span", {}, "Shake on it."));
      card.append(header, heading, el("p", {}, "Review the listing. Lock the agreed amount in SHAKE."));
      const form = el("form");
      const title = el("input", { id: "shake-item", maxlength: "40", required: "", minlength: "2", autocomplete: "off" });
      title.value = listing.title.slice(0, 40);
      const price = el("input", { id: "shake-price", type: "number", min: "1", max: "2000", step: "0.01", required: "", inputmode: "decimal" });
      price.value = listing.price;
      const code = el("select", { id: "shake-currency", required: "" });
      code.append(el("option", { value: "" }, "Choose"));
      const symbols = { EUR: "€", USD: "US$", GBP: "£", BRL: "R$" };
      for (const c of ["EUR", "USD", "GBP", "BRL"]) code.append(el("option", { value: c }, `${symbols[c]} ${c}`));
      code.value = ["EUR", "USD", "GBP", "BRL"].includes(listing.currency) ? listing.currency : "";
      const amountSymbol = el("span", { class: "amount-symbol", "aria-hidden": "true" }, symbols[code.value] || "—");
      const amountField = el("div", { class: "amount-field" });
      amountField.append(amountSymbol, price);
      const row = el("div", { class: "row" });
      const a = el("div"), b = el("div");
      a.append(el("label", { for: "shake-price" }, "Agreed price"), amountField);
      b.append(el("label", { for: "shake-currency" }, "Currency"), code); row.append(a, b);
      const warning = el("p", { class: "warning", role: "status" });
      if (listing.currency && !code.value) {
        warning.dataset.tone = "warning";
        price.value = "";
        warning.textContent = `${listing.currency} isn’t supported. Agree an amount in EUR, USD, GBP or BRL; SHAKE does not convert currencies.`;
      } else if (!listing.price || !listing.currency) {
        warning.dataset.tone = "warning";
        warning.textContent = "Check the price and currency. This page did not provide both reliably.";
      } else warning.textContent = "Details imported. Confirm the price with the seller.";
      code.onchange = () => {
        amountSymbol.textContent = symbols[code.value] || "—";
        if (code.value && code.value !== listing.currency) {
          price.value = "";
          warning.dataset.tone = "warning";
          warning.textContent = `Enter the amount agreed with the seller in ${code.value}. SHAKE does not convert the listing price.`;
          price.focus();
        }
      };
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
      const steps = el("div", { class: "steps" });
      steps.append(el("b", {}, "01 Lock"), el("span", {}, "→"), el("b", {}, "02 Inspect"), el("span", {}, "→"), el("b", {}, "03 Shake"));
      const note = el("details", { class: "note" });
      note.append(el("summary", {}, "Test mode · live on Stellar Testnet"), el("p", {}, "Independent of this marketplace. Continuing does not pay or contact the seller. Test assets have no cash value."));
      card.append(form, steps, note);
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
