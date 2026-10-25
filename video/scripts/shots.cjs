// Films the real app for the SHAKE film: two phones doing a real €400 deal on testnet, a no-signal deal,
// and the AI/extension pages. The buyer's camera is fed the seller's real screen, so the real scanner reads the real QR.
//   NODE_PATH=$TEMP/shotpw/node_modules node video/scripts/shots.cjs [base-url] [deal|offline|pages]
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs"), { execFileSync } = require("child_process");
const B = process.argv[2] || "https://shake-lake.vercel.app";
const ONLY = process.argv[3];
const OUT = path.resolve(__dirname, "../public/shots"), TMP = path.resolve(__dirname, "../.tmp");
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });
const PHONE = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, locale: "en-PT", timezoneId: "Europe/Lisbon" };
const DESK = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "en-PT", timezoneId: "Europe/Lisbon" };
const t0 = Date.now(), lap = (m) => console.log(((Date.now() - t0) / 1000).toFixed(1) + "s", m);
const shot = (p, name) => p.screenshot({ path: `${OUT}/${name}.png` }).then(() => lap("shot " + name));
const seen = (loc, ms) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

// a fake camera filming a png (the other phone's screen)
function camera(png, name) {
  const out = `${TMP}/${name}.y4m`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-i", png, "-vf", "scale=-2:680,pad=1280:720:(ow-iw)/2:20:color=0x0b0c0e", "-r", "10", "-t", "1", "-pix_fmt", "yuv420p", out]);
  return out;
}
async function phone(cam, storageState) {
  const br = await chromium.launch({ args: cam ? ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${cam}`] : [] });
  const ctx = await br.newContext({ ...PHONE, storageState, permissions: cam ? ["camera"] : [] });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  return { br, ctx, p };
}
const handOver = async (ph) => { const s = await ph.ctx.storageState(); await ph.br.close(); return s; };

async function lock(item, price, tag) {
  const buyer = await phone();
  const { p } = buyer;
  await p.goto(B + "/deal/new");
  await p.fill("#item", item);
  await p.fill("#price", price);
  await p.waitForTimeout(500); await shot(p, `${tag}-new`);
  await p.click("button[type=submit]");
  if (await seen(p.getByText("Choose how to pay"), 8000)) {
    await p.waitForTimeout(900); await shot(p, `${tag}-pay`);
    await p.getByRole("button", { name: /Apple Pay/ }).first().click();
    await p.waitForTimeout(280); await shot(p, `${tag}-picked`);
  } else lap("no pay sheet on this deploy");
  await p.waitForTimeout(2200); await shot(p, `${tag}-locking`);
  await p.waitForTimeout(5000); await shot(p, `${tag}-locking2`);
  await p.waitForURL(/\/deal\/\d+/, { timeout: 180000 });
  const id = p.url().match(/deal\/(\d+)/)[1];
  lap(`locked ${id}`);
  await p.waitForTimeout(2500); await shot(p, `${tag}-share`);
  const link = p.url().replace(/[?&]new=1/, "");

  const seller = await phone();
  await seller.p.goto(link);
  const meet = seller.p.getByText("I'm meeting them");
  await meet.waitFor({ timeout: 90000 });
  await seller.p.waitForTimeout(1800); await shot(seller.p, `${tag}-seller`);
  await meet.click();
  await seller.p.getByText("Let the buyer scan this.").waitFor({ timeout: 180000 });
  await seller.p.waitForTimeout(1500); await shot(seller.p, `${tag}-qr`);
  lap("seller joined");
  return { id, link, buyer: await handOver(buyer), seller };
}

// the buyer points their camera at the seller's screen
async function scan(d, tag) {
  const b = await phone(camera(`${OUT}/${tag}-qr.png`, `${tag}-cam`), d.buyer);
  await b.p.goto(`${B}/scan/${d.id}`);
  const on = b.p.getByRole("button", { name: "Turn on camera" });
  if (await seen(on, 8000)) await on.click();
  for (let i = 0; i < 6; i++) { await b.p.waitForTimeout(350); await shot(b.p, `${tag}-scan${i}`); }
  await b.p.getByText("Code matches").waitFor({ timeout: 60000 });
  await b.p.waitForTimeout(700); await shot(b.p, `${tag}-confirm`);
  return b;
}
async function hold(b, tag) {
  const box = await b.p.getByRole("button", { name: /Hold to shake/ }).boundingBox();
  await b.p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await b.p.mouse.down();
  for (const [i, ms] of [[0, 250], [1, 400], [2, 450]].values()) { await b.p.waitForTimeout(ms); await shot(b.p, `${tag}-hold${i}`); }
  await b.p.waitForTimeout(500); await b.p.mouse.up();
}

async function deal() {
  const d = await lock("Bike", "400", "d");
  const b = await scan(d, "d");
  await hold(b, "d");
  await b.p.getByText("Shaken.").first().waitFor({ timeout: 120000 });
  for (let i = 0; i < 4; i++) { await shot(b.p, `d-shaken${i}`); await b.p.waitForTimeout(260); }
  await d.seller.p.getByText("Paid to you").first().waitFor({ timeout: 90000 });
  await d.seller.p.waitForTimeout(1500); await shot(d.seller.p, "d-seller-paid");
  await b.p.goto(`${B}/r/${d.id}`); await b.p.waitForTimeout(3500); await shot(b.p, "d-receipt");
  await b.br.close(); await d.seller.br.close();
  fs.writeFileSync(`${OUT}/deal.json`, JSON.stringify({ id: d.id, link: d.link }));
}

async function offline() {
  const d = await lock("Concert tickets", "90", "o");
  const b = await scan(d, "o");
  await b.ctx.setOffline(true);
  await b.p.waitForTimeout(400);
  await hold(b, "o");
  await b.p.getByText("to the seller.").first().waitFor({ timeout: 30000 });
  await b.p.waitForTimeout(1200); await shot(b.p, "o-half");
  const sState = await handOver(d.seller);
  const s = await phone(camera(`${OUT}/o-half.png`, "o-half-cam"), sState);
  await s.p.goto(d.link);
  const again = s.p.getByRole("button", { name: "Show my QR" });
  if (await seen(again, 60000)) await again.click();
  const noSignal = s.p.getByText("No signal? Scan the buyer");
  await noSignal.waitFor({ timeout: 90000 });
  await s.ctx.setOffline(true);
  await s.p.waitForTimeout(500); await shot(s.p, "o-seller-qr");
  await noSignal.click();
  const on = s.p.getByRole("button", { name: "Turn on camera" });
  if (await seen(on, 5000)) await on.click();
  await s.p.waitForTimeout(900); await shot(s.p, "o-seller-scan");
  await s.p.getByText("Paid to you · no signal").waitFor({ timeout: 60000 });
  for (let i = 0; i < 3; i++) { await s.p.waitForTimeout(400); await shot(s.p, `o-paid${i}`); }
  await s.ctx.setOffline(false);
  await s.p.getByText("Shaken with no signal at").waitFor({ timeout: 150000 });
  await s.p.waitForTimeout(1500); await shot(s.p, "o-landed");
  await b.br.close(); await s.br.close();
}

async function pages() {
  const br = await chromium.launch();
  const m = await (await br.newContext(PHONE)).newPage();
  await m.goto(B + "/"); await m.waitForTimeout(2500); await shot(m, "home");
  const ctx = await br.newContext(DESK), p = await ctx.newPage();
  await p.goto(B + "/"); await p.waitForTimeout(2500); await shot(p, "home-desk");
  // the bank-app "Paid ✓" card from the pitch, before it glitches (the film glitches it)
  await p.evaluate(() => { const s = [...document.querySelectorAll("section")].find((x) => x.textContent.includes("Transfer complete")); window.scrollTo(0, s.offsetTop + 2); });
  await p.waitForTimeout(1200);
  await p.locator("div.rounded-\\[26px\\]", { hasText: "Transfer complete" }).first().screenshot({ path: `${OUT}/fake-card.png` });
  await p.goto(B + "/ai"); await p.waitForTimeout(2000); await shot(p, "ai-desk");
  await p.goto(B + "/extension"); await p.waitForTimeout(2500); await shot(p, "ext-desk");
  await br.close();
}

(async () => {
  for (const [name, run] of [["pages", pages], ["deal", deal], ["offline", offline]]) {
    if (ONLY && ONLY !== name) continue;
    try { await run(); lap(`${name} OK`); } catch (e) { console.error(`${name} FAIL`, e.message); }
  }
  process.exit(0);
})();
