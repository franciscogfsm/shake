// The real Face ID flow with Nido, end to end on testnet, in two phones:
// the buyer creates a Nido account (test.nido.fyi), connects it, lets SHAKE make its passkey, approves SHAKE's
// rules in Nido, locks; the seller joins and shows the QR; the buyer enters its code and holds to shake.
// Virtual passkeys stand in for Face ID (shared across the buyer's tabs and Nido's popups).
//   node scripts/nido-flow.cjs [baseUrl] [screenshotDir]      (needs `playwright`)
const { chromium } = require('playwright');
const B = process.argv[2] || 'http://localhost:3000', OUT = process.argv[3];
const t0 = Date.now(); const lap = (m) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', m);
const shot = (p, name) => (OUT ? p.screenshot({ path: `${OUT}/${name}.png` }).catch(() => {}) : null);

(async () => {
  const br = await chromium.launch();
  const phone = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 };
  const buyerCtx = await br.newContext(phone);
  const creds = new Map(), armed = [];
  const arm = async (page) => {
    page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    const s = await buyerCtx.newCDPSession(page);
    await s.send('WebAuthn.enable', { enableUI: false });
    const { authenticatorId } = await s.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
    const me = { s, authenticatorId };
    armed.push(me);
    for (const c of creds.values()) await s.send('WebAuthn.addCredential', { authenticatorId, credential: c }).catch(() => {});
    const share = async ({ credential }) => {
      creds.set(credential.credentialId, credential);
      for (const o of armed) if (o !== me) await o.s.send('WebAuthn.addCredential', { authenticatorId: o.authenticatorId, credential }).catch(() => {});
    };
    s.on('WebAuthn.credentialAdded', share);
    s.on('WebAuthn.credentialAsserted', share);
  };
  const popups = [];
  buyerCtx.on('page', (p) => popups.push(arm(p).then(() => p)));
  const buyer = await buyerCtx.newPage();
  await new Promise((r) => setTimeout(r, 300));
  await popups.shift();
  const popup = async (click) => {
    const next = buyerCtx.waitForEvent('page', { timeout: 30000 });
    await click();
    const w = await next;
    await popups.shift();
    await w.waitForLoadState('load');
    return w;
  };
  const visibleText = (w, text) => w.locator(`text=${text}`).locator('visible=true').first();

  // 1. a Nido account, made on Nido's own site (once per person)
  const nido = await buyerCtx.newPage();
  await popups.shift();
  await nido.goto('https://test.nido.fyi/', { timeout: 120000 });
  await nido.getByRole('button', { name: 'Get started' }).first().click();
  await nido.getByRole('button', { name: 'Set up with your face' }).first().click();
  await visibleText(nido, 'Continue').waitFor({ timeout: 120000 });
  await visibleText(nido, 'Continue').click();
  await nido.getByText('Continue to my wallet').waitFor({ timeout: 120000 });
  await nido.getByText('Continue to my wallet').click();
  await nido.locator('h1', { hasText: 'Your Nido is ready' }).waitFor({ timeout: 180000 });
  const account = new URL(nido.url()).hostname.split('.')[0].toUpperCase();
  lap('Nido account ' + account);
  await nido.close();

  // 2. lock with Face ID: connect → SHAKE's passkey → approve in Nido → pay
  await buyer.goto(B + '/deal/new', { timeout: 180000 });
  await buyer.fill('#item', 'Nido test bike');
  await buyer.fill('#price', '12');
  await shot(buyer, 'n1-form');
  await buyer.click('button[type=submit]');
  await buyer.getByRole('button', { name: 'Connect Nido' }).waitFor({ timeout: 20000 });
  await shot(buyer, 'n2-connect');
  const picker = await popup(() => buyer.getByRole('button', { name: 'Connect Nido' }).click());
  await picker.getByText(account).click({ timeout: 60000 });
  await buyer.getByRole('button', { name: 'Create with Face ID' }).waitFor({ timeout: 30000 });
  lap('connected');
  await shot(buyer, 'n3-passkey');
  await buyer.getByRole('button', { name: 'Create with Face ID' }).click();
  await buyer.getByRole('button', { name: 'Approve in Nido' }).waitFor({ timeout: 30000 });
  await buyer.waitForTimeout(900);
  await shot(buyer, 'n4-approve');
  const grant = await popup(() => buyer.getByRole('button', { name: 'Approve in Nido' }).click());
  await grant.getByText('Let this key spend without any cap').first().click({ timeout: 60000 });
  await grant.getByText('Review & continue').click();
  await grant.getByRole('button', { name: 'Confirm' }).click({ timeout: 60000 });
  await buyer.getByText('Choose how to pay').waitFor({ timeout: 180000 }).catch(async (e) => {
    console.log('BUYER:', (await buyer.locator('[role=dialog]').innerText().catch(() => '')).slice(0, 600));
    console.log('NIDO:', grant.isClosed() ? 'closed' : (await grant.evaluate(() => document.body.innerText)).slice(0, 800));
    throw e;
  });
  lap('approved in Nido');
  await buyer.getByRole('button', { name: /^Pay with / }).first().click();
  await buyer.waitForURL(/\/deal\/\d+/, { timeout: 180000 });
  const id = buyer.url().match(/deal\/(\d+)/)[1];
  lap('locked → deal ' + id);
  await buyer.getByText(/locked by you/i).waitFor({ timeout: 60000 });
  await shot(buyer, 'n5-locked');

  // 3. the seller joins on another phone and shows the QR
  const seller = await (await br.newContext(phone)).newPage();
  await seller.goto(buyer.url().replace(/&?new=1/, ''), { timeout: 180000 });
  await seller.getByText("I'm meeting them").click({ timeout: 60000 });
  await seller.getByText('Let the buyer scan this.').waitFor({ timeout: 120000 });
  const code = await seller.evaluate((id) => localStorage.getItem('shake.code.' + id), id);
  lap('seller joined, code ' + code);

  // 4. the shake: the release is signed by SHAKE's passkey under the Nido rules
  await buyer.goto(`${B}/scan/${id}`, { timeout: 180000 });
  await buyer.fill('#code', code);
  await buyer.getByRole('button', { name: 'Go' }).click();
  const hold = buyer.getByRole('button', { name: 'Hold to shake' });
  await hold.waitFor({ timeout: 30000 });
  await buyer.waitForTimeout(900); // let the sheet settle before aiming at the button
  const box = await hold.boundingBox();
  await buyer.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await buyer.mouse.down(); await buyer.waitForTimeout(2200); await buyer.mouse.up();
  await buyer.getByText('Shaken.').waitFor({ timeout: 120000 });
  lap('released from Nido');
  await shot(buyer, 'n6-shaken');
  await seller.getByText('Paid to you').waitFor({ timeout: 60000 });
  lap('seller paid');

  const deal = await (await fetch(`${B}/api/deal/${id}`)).json();
  if (deal.deal.buyer !== account || deal.deal.status !== 'Released') throw new Error(`chain says buyer ${deal.deal.buyer}, ${deal.deal.status}`);
  console.log('events', deal.events.map((e) => `${e.type} ${e.txHash}`).join(' | '));
  await br.close();
  console.log('NIDO FLOW OK');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
