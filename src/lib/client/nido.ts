"use client";
// Nido passkey smart accounts (https://test.nido.fyi, testnet only).
// Ported from nidohq/guess-the-number (app-lib/session.ts, vendor/nido-wallet), Apache-2.0.
//
// A Nido account is a C… smart account whose owner passkey lives on Nido's own domain, and it can only
// approve calls on the account itself. So SHAKE acts for it through a session:
//   1. connect: Nido's picker popup returns the account's C… address;
//   2. SHAKE makes its own passkey on this site (the device keeps the private key; we keep only the public key);
//   3. the owner approves, once in Nido's popup, rules letting that passkey call our deal contract and pay
//      the test money only to it, capped, for 24h;
//   4. each lock/release is then signed here with one Face ID prompt and submitted by our own relayer.
import { Account, Address, Contract, Keypair, StrKey, TransactionBuilder, hash, nativeToScVal, rpc, scValToNative, xdr } from "@stellar/stellar-sdk";
import { CURRENCIES, DEAL_CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL, type CurrencyCode } from "@/lib/config";

export const NIDO_BASE = process.env.NEXT_PUBLIC_NIDO_BASE || "https://test.nido.fyi";
const ADDRESS_KEY = "nido:wallet-kit:address";
const SESSION_KEY = "shake.nido.session.v1:";
const SIM_SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const LEDGER_MS = 5_000;
const DAY_MS = 86_400_000;
const server = new rpc.Server(RPC_URL);

// --- popups ------------------------------------------------------------------

const apex = () => new URL(NIDO_BASE).origin;
const accountOrigin = (account: string) => {
  const u = new URL(NIDO_BASE);
  return `${u.protocol}//${account.toLowerCase()}.${u.host}`;
};

/** Open Nido's page in a popup; resolve with the query string it posts back. Call before any await in a click. */
function popup(url: string, expectedOrigin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = window.open(url, "nido-wallet", "popup,width=460,height=720");
    if (!w) return reject(new Error("Your browser blocked Nido's window. Allow pop-ups for this site and try again."));
    let done = false;
    const finish = () => {
      done = true;
      window.removeEventListener("message", onMessage);
      clearInterval(closed);
    };
    const onMessage = (e: MessageEvent) => {
      const d = e.data as { source?: string; search?: unknown } | null;
      if (e.origin !== expectedOrigin || e.source !== w || d?.source !== "nido-wallet" || typeof d.search !== "string") return;
      finish();
      try {
        w.close();
      } catch {}
      resolve(d.search);
    };
    window.addEventListener("message", onMessage);
    const closed = setInterval(() => {
      if (!done && w.closed) {
        finish();
        reject(new Error("Nido's window was closed before it finished."));
      }
    }, 500);
  });
}

// --- connect -----------------------------------------------------------------

export const nidoAddress = () => {
  try {
    const a = localStorage.getItem(ADDRESS_KEY);
    return a && StrKey.isValidContract(a) ? a : null;
  } catch {
    return null;
  }
};

/** Nido's account picker (it offers to create an account, which arrives with 5 test XLM). */
export async function connectNido() {
  const u = new URL("/connect/", apex());
  u.searchParams.set("dapp", location.origin);
  u.searchParams.set("return", location.href);
  const prev = nidoAddress();
  if (prev) u.searchParams.set("previous", prev);
  const p = new URLSearchParams(await popup(u.toString(), apex()));
  const address = p.get("nido_address")?.toUpperCase();
  if (address && StrKey.isValidContract(address)) {
    localStorage.setItem(ADDRESS_KEY, address);
    return address;
  }
  throw new Error(p.get("nido_connect") === "cancelled" ? "You closed Nido without picking an account." : p.get("nido_error") ?? "Nido didn't return an account.");
}

// Nido's on-chain registry (testnet); its factory derives a new account's address from the sign-up salt
const NIDO_REGISTRY = "CDBL7MNO7UI5OAAIC67UIWKQ4P3S6RVQSFCQXUHUW6TOFCXSYRPNHY4S";

async function simulate(contract: string, fn: string, ...args: xdr.ScVal[]) {
  const tx = new TransactionBuilder(new Account(SIM_SOURCE, "0"), { fee: "100", networkPassphrase: NETWORK_PASSPHRASE }).addOperation(new Contract(contract).call(fn, ...args)).setTimeout(30).build();
  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) throw new Error("Couldn't reach Nido on Stellar. Try again.");
  return scValToNative(sim.result.retval) as string;
}

/**
 * Nido's sign-up, straight to Face ID. Nido can't hand the address back from sign-up, but its factory derives it
 * from the salt we pass, so we know it up front: once that account is live on Stellar, we close Nido's window.
 * Call before any await in a click (it opens the window).
 */
export function createNidoAccount(): Promise<string> {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const salt = Array.from(seed, (b) => b.toString(16).padStart(2, "0")).join("");
  const w = window.open(`${apex()}/new-account/?setup=1#salt=${salt}`, "nido-wallet", "popup,width=460,height=720");
  if (!w) return Promise.reject(new Error("Your browser blocked Nido's window. Allow pop-ups for this site and try again."));
  return (async () => {
    const factory = await simulate(NIDO_REGISTRY, "fetch_contract_id", nativeToScVal("factory", { type: "string" }));
    const address = await simulate(factory, "get_c_address", xdr.ScVal.scvBytes(Buffer.from(Keypair.fromRawEd25519Seed(Buffer.from(seed)).rawPublicKey())));
    const live = () => server.getContractData(address, xdr.ScVal.scvLedgerKeyContractInstance(), rpc.Durability.Persistent).then(() => true, () => false);
    for (const started = Date.now(); Date.now() - started < 10 * 60_000; ) {
      if (await live()) {
        // let Nido finish its own last step (it shows "done" for a few seconds), then close it for the user
        await new Promise((r) => setTimeout(r, 2_500));
        try { w.close(); } catch {}
        localStorage.setItem(ADDRESS_KEY, address);
        return address;
      }
      if (w.closed) throw new Error("Nido's window was closed before your account was made.");
      await new Promise((r) => setTimeout(r, 1_500));
    }
    throw new Error("Nido took too long. Try again.");
  })();
}

export function disconnectNido() {
  const a = nidoAddress();
  localStorage.removeItem(ADDRESS_KEY);
  if (a) localStorage.removeItem(SESSION_KEY + a);
}

// --- the session: SHAKE's passkey + the rules the owner approved ---------------

type Grant = { target: string; functions: string[]; label: string; to?: string; limit?: string };
type Session = { account: string; credentialId: string; publicKey: string; approved: Record<string, number> };

const DEAL_FNS = ["lock", "lock_ship", "lock_hold", "approve", "agree", "release", "settle", "dispute", "refund"];

/** What SHAKE asks for: calls on the deal contract, and paying that currency's test money only into it (≤2000 a day). */
export const grantsFor = (currency: CurrencyCode): Grant[] => [
  { target: DEAL_CONTRACT_ID, functions: DEAL_FNS, label: "shake-deals" },
  { target: CURRENCIES[currency].token, functions: ["transfer"], to: DEAL_CONTRACT_ID, limit: "2000", label: `shake-${currency.toLowerCase()}` },
];

const load = (account: string): Session | null => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY + account) ?? "null");
  } catch {
    return null;
  }
};
const save = (s: Session) => localStorage.setItem(SESSION_KEY + s.account, JSON.stringify(s));

export type NidoStatus = "connect" | "passkey" | "approve" | "ready";
export function nidoStatus(currency: CurrencyCode): NidoStatus {
  const account = nidoAddress();
  if (!account) return "connect";
  const s = load(account);
  if (!s) return "passkey";
  // 2 minutes of margin so a call doesn't race the rule's last ledgers
  return grantsFor(currency).every((g) => (s.approved[g.label] ?? 0) > Date.now() + 120_000) ? "ready" : "approve";
}

const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string) => new Uint8Array(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);

/** Face ID once: SHAKE's own passkey for this account, on this site. Only its public key is stored. */
export async function createNidoPasskey() {
  const account = nidoAddress();
  if (!account) throw new Error("Connect Nido first.");
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { id: location.hostname, name: "SHAKE" },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: `SHAKE for ${account.slice(0, 4)}…${account.slice(-4)}`, displayName: "SHAKE session" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("The passkey wasn't created.");
  const res = cred.response as AuthenticatorAttestationResponse;
  const spki = res.getPublicKey();
  if (res.getPublicKeyAlgorithm() !== -7 || !spki) throw new Error("This device made a passkey the account can't check.");
  const point = new Uint8Array(spki).slice(-65); // a P-256 SPKI ends with 04‖X‖Y
  if (point[0] !== 4) throw new Error("Unexpected passkey format.");
  save({ account, credentialId: b64url(new Uint8Array(cred.rawId)), publicKey: toHex(point), approved: {} });
}

/** Nido's approval page in a popup: the owner reviews the rules and confirms once with their Nido passkey. */
export async function approveNido(currency: CurrencyCode) {
  const account = nidoAddress();
  const s = account && load(account);
  if (!account || !s) throw new Error("Make SHAKE's passkey first.");
  const grants = grantsFor(currency);
  const u = new URL("/security/delegate-doc/", accountOrigin(account));
  const set = (k: string, v: string) => u.searchParams.set(k, v);
  set("origin", location.origin);
  set("pubkey", s.publicKey);
  set("duration", "24h");
  grants.forEach((g, i) => {
    set(`grant.${i}.label`, g.label);
    set(`grant.${i}.target`, g.target);
    set(`grant.${i}.functions`, g.functions.join(","));
    set(`grant.${i}.limit`, g.limit ?? "none");
    if (g.limit) set(`grant.${i}.limit_period`, "day");
    if (g.to) set(`grant.${i}.to`, g.to);
  });
  const back = new URL(location.href);
  back.search = back.hash = "";
  set("return", back.toString());
  let answer: URLSearchParams;
  try {
    answer = new URLSearchParams(await popup(u.toString(), accountOrigin(account)));
  } catch (e) {
    // closed without an answer: the chain is the truth
    if (await checkNido(currency)) return;
    throw e;
  }
  const d = answer.get("delegation");
  if (d === "cancelled") throw new Error("You didn't approve SHAKE in Nido.");
  if (d !== "ok") {
    // a timeout can still have landed
    if (await checkNido(currency)) return;
    const code = answer.get("code") ?? "";
    throw new Error(/FEE_LIMIT|POOL_CAPACITY/.test(code) ? "Nido's test network budget is busy right now. Try again in a minute." : `Nido couldn't apply the approval${code ? ` (${code})` : ""}.`);
  }
  for (const g of grants) s.approved[g.label] = Date.now() + DAY_MS;
  save(s);
}

/** Read the account's installed rules and record which of ours are really on chain. */
export async function checkNido(currency: CurrencyCode) {
  const account = nidoAddress();
  const s = account && load(account);
  if (!account || !s) return false;
  const { rules, latestLedger } = await readRules(account);
  for (const g of grantsFor(currency)) {
    const r = rules.find((r) => r.name === g.label && r.contract === g.target && mine(r, s));
    if (r) s.approved[g.label] = r.validUntil === undefined ? Number.MAX_SAFE_INTEGER : Date.now() + (r.validUntil - latestLedger) * LEDGER_MS;
    else delete s.approved[g.label];
  }
  save(s);
  return nidoStatus(currency) === "ready";
}

// --- signing -----------------------------------------------------------------

type Rule = { id: number; name: string; contract?: string; functions?: string[]; external: { verifier: string; key: string }[]; validUntil?: number };
const mine = (r: Rule, s: Session) => r.external.some((e) => e.key.slice(0, 130) === s.publicKey);

async function read(account: string, method: string) {
  const tx = new TransactionBuilder(new Account(SIM_SOURCE, "0"), { fee: "100", networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(new Contract(account).call(method))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) throw new Error(`Couldn't read your Nido account (${method}).`);
  return { value: scValToNative(sim.result.retval) as unknown, latestLedger: sim.latestLedger };
}

// a contract enum variant as [tag, ...fields], from either shape scValToNative produces
const variant = (v: unknown): unknown[] | undefined => {
  if (Array.isArray(v) && typeof v[0] === "string") return v;
  if (!v || typeof v !== "object") return undefined;
  const [tag, fields] = Object.entries(v)[0] ?? [];
  return tag === undefined ? undefined : [tag, ...(Array.isArray(fields) ? fields : [fields])];
};

type NativeRule = { id: number; name: string; context_type: unknown; signers: unknown[]; valid_until?: number | null };
async function readRules(account: string) {
  const [installed, doc] = await Promise.all([read(account, "installed_rules"), read(account, "document").catch(() => undefined)]);
  const bytes = Array.isArray(doc?.value) ? doc.value[1] : undefined;
  const written = bytes instanceof Uint8Array ? (JSON.parse(new TextDecoder().decode(bytes)) as { rules: { name: string; functions?: string[]; scope: { address?: string } }[] }) : undefined;
  const rules: Rule[] = (installed.value as NativeRule[]).map((r) => {
    const scope = variant(r.context_type);
    const contract = scope?.[0] === "CallContract" ? String(scope[1]) : undefined;
    return {
      id: Number(r.id),
      name: String(r.name),
      contract,
      functions: written?.rules.find((w) => w.name === String(r.name) && w.scope.address === contract)?.functions,
      external: r.signers.map(variant).flatMap((s) => (s?.[0] === "External" ? [{ verifier: String(s[1]), key: toHex(s[2] as Uint8Array) }] : [])),
      validUntil: r.valid_until == null ? undefined : Number(r.valid_until),
    };
  });
  return { rules, latestLedger: installed.latestLedger };
}

const schemes = new Map<string, Promise<"addr_oz_v1" | "oz_rule_ids">>();
const digestScheme = (account: string) => {
  let p = schemes.get(account);
  if (!p) {
    p = read(account, "capabilities").then(({ value }) => ((value as { auth_digest?: string }).auth_digest === "oz_rule_ids" ? "oz_rule_ids" : "addr_oz_v1"));
    p.catch(() => schemes.delete(account));
    schemes.set(account, p);
  }
  return p;
};

/** The calls an auth entry authorizes, in __check_auth order: the root, then sub-calls depth first. */
const contexts = (inv: xdr.SorobanAuthorizedInvocation): { contract: string; fn: string }[] => {
  const f = inv.function();
  const own = f.switch().value === xdr.SorobanAuthorizedFunctionType.sorobanAuthorizedFunctionTypeContractFn().value
    ? { contract: Address.fromScAddress(f.contractFn().contractAddress()).toString(), fn: f.contractFn().functionName().toString() }
    : { contract: "create-contract", fn: "" };
  return [own, ...inv.subInvocations().flatMap(contexts)];
};

const sha256 = async (b: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", new Uint8Array(b)));
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) out.set(p, (at += p.length) - p.length);
  return out;
};

const P256_N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
/** DER ECDSA → 64-byte r‖s with low S (the host refuses high S). */
export function derToCompact(der: Uint8Array) {
  const int = (at: number) => {
    if (der[at] !== 0x02) throw new Error("Malformed passkey signature");
    const len = der[at + 1];
    return { value: BigInt(`0x${toHex(der.slice(at + 2, at + 2 + len)) || "0"}`), end: at + 2 + len };
  };
  if (der[0] !== 0x30) throw new Error("Malformed passkey signature");
  const r = int(2);
  let s = int(r.end).value;
  if (s > P256_N / 2n) s = P256_N - s;
  return fromHex(r.value.toString(16).padStart(64, "0") + s.toString(16).padStart(64, "0"));
}

/** Face ID signs one authorization entry for the Nido account, under the rules the owner approved. */
export async function signWithNido(entry: xdr.SorobanAuthorizationEntry, validUntil: number) {
  const account = nidoAddress();
  const s = account && load(account);
  if (!account || !s) throw new Error("Connect Nido first.");
  const [{ rules, latestLedger }, scheme] = await Promise.all([readRules(account), digestScheme(account)]);
  const labels = Object.keys(s.approved);
  const ruleIds = contexts(entry.rootInvocation()).map(({ contract, fn }) => {
    const fits = rules.filter((r) => r.contract === contract && (!r.functions || r.functions.includes(fn)) && mine(r, s) && (r.validUntil === undefined || r.validUntil >= latestLedger));
    const rule = fits.find((r) => labels.includes(r.name)) ?? fits[0];
    if (!rule) throw new Error("Your Nido approval doesn't cover this payment (or it expired). Approve SHAKE in Nido again.");
    return rule.id;
  });

  const creds = entry.credentials().address();
  creds.signatureExpirationLedger(validUntil);
  const payload = hash(
    xdr.HashIdPreimage.envelopeTypeSorobanAuthorization(
      new xdr.HashIdPreimageSorobanAuthorization({ networkId: hash(Buffer.from(NETWORK_PASSPHRASE)), nonce: creds.nonce(), signatureExpirationLedger: validUntil, invocation: entry.rootInvocation() }),
    ).toXDR(),
  );
  const ids = xdr.ScVal.scvVec(ruleIds.map((id) => xdr.ScVal.scvU32(id))).toXDR();
  const bound = scheme === "addr_oz_v1" ? await sha256(concat(new TextEncoder().encode("perch/account/auth-addr-v1"), StrKey.decodeContract(account), payload)) : new Uint8Array(payload);
  const challenge = await sha256(concat(bound, ids));

  const a = (await navigator.credentials.get({
    publicKey: { challenge, rpId: location.hostname, allowCredentials: [{ type: "public-key", id: fromB64url(s.credentialId) }], userVerification: "required", timeout: 120_000 },
  })) as PublicKeyCredential | null;
  if (!a) throw new Error("The passkey didn't sign.");
  const r = a.response as AuthenticatorAssertionResponse;
  const field = (name: string, bytes: Uint8Array) => new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol(name), val: nativeToScVal(Buffer.from(bytes)) });
  const sigData = xdr.ScVal.scvMap([
    field("authenticator_data", new Uint8Array(r.authenticatorData)),
    field("client_data", new Uint8Array(r.clientDataJSON)),
    field("signature", derToCompact(new Uint8Array(r.signature))),
  ]).toXDR();

  // the signer entries exactly as installed, sorted by verifier then key bytes (an ScMap's keys are sorted)
  const signers = new Map<string, { verifier: string; key: string }>();
  for (const rule of rules) if (ruleIds.includes(rule.id)) for (const e of rule.external) if (e.key.slice(0, 130) === s.publicKey) signers.set(`${e.verifier}:${e.key}`, e);
  const order = (e: { verifier: string; key: string }) => toHex(StrKey.decodeContract(e.verifier)) + ":" + e.key;
  const sorted = [...signers.values()].sort((x, y) => (order(x) < order(y) ? -1 : 1));
  creds.signature(
    xdr.ScVal.scvMap([
      new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol("context_rule_ids"), val: xdr.ScVal.scvVec(ruleIds.map((id) => xdr.ScVal.scvU32(id))) }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol("signers"),
        val: xdr.ScVal.scvMap(
          sorted.map((e) => new xdr.ScMapEntry({
            key: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("External"), new Address(e.verifier).toScVal(), nativeToScVal(Buffer.from(fromHex(e.key)))]),
            val: nativeToScVal(Buffer.from(sigData)),
          })),
        ),
      }),
    ]),
  );
  return entry;
}
