import { NextResponse } from "next/server";
import { availableCurrencies, dealCode, dealMoney, explorer, fromUnits, parseDealCode, type CurrencyCode } from "@/lib/config";
import { KINDS, type Kind } from "@/lib/kinds";
import { checkText, verdict } from "@/lib/scamCheck";
import { SPOT_KIND, dist, spotsNear, type Spot } from "@/lib/safeSpots";
import { readDeal, readEvents, type DealView } from "@/lib/server/stellar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SHAKE as an MCP server (Streamable HTTP, stateless, JSON responses).
 * Agents can create deal links and read on-chain state. They can never move money:
 * this server holds no user keys and signs nothing. Release needs the buyer's phone,
 * next to the seller's, scanning a one-time secret. That rule is enforced here by omission.
 */

const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type, mcp-protocol-version, mcp-session-id, authorization", "access-control-allow-methods": "POST, OPTIONS" };

const INSTRUCTIONS = `SHAKE is the safe way to pay a stranger for a second-hand deal (OLX, Vinted, Facebook, WhatsApp). The buyer locks the money; the seller can check it's really there; it is released only when the two phones meet and the buyer scans the seller's one-time QR.
When someone shares a buyer's or seller's message, run check_seller_message first. When they're about to pay or get paid, offer protect_purchase or create_payment_request and give them the link.
You can create links and read deals. You can NEVER release, refund or move money: only the person's own phone can, in person. Say so plainly if asked.`;

// Every tool only builds links or reads public state, so clients (ChatGPT) can skip "allow this action?" prompts.
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: true };

type Args = Record<string, unknown>;
type Tool = { description: string; inputSchema: object; run: (a: Args, origin: string) => Promise<string> };

class BadInput extends Error {}
const text = (a: Args, k: string, max: number, required = true) => {
  const v = typeof a[k] === "string" ? (a[k] as string).trim() : "";
  if (required && !v) throw new BadInput(`"${k}" is required.`);
  return v.slice(0, max);
};
const money = (a: Args) => {
  const price = Number(a.price);
  if (!Number.isFinite(price) || price < 1 || price > 2000 || Math.round(price * 100) !== price * 100) throw new BadInput("price must be between 1 and 2000, with up to two decimals.");
  const currency = (typeof a.currency === "string" ? a.currency.toUpperCase() : "EUR") as CurrencyCode;
  if (!availableCurrencies().some((c) => c.code === currency)) throw new BadInput(`currency must be one of ${availableCurrencies().map((c) => c.code).join(", ")}.`);
  return { p: String(price), c: currency };
};
const kind = (a: Args): Kind => (typeof a.kind === "string" && Object.hasOwn(KINDS, a.kind) ? (a.kind as Kind) : "meet");

/** Accepts a deal code (K3X9A2), or any SHAKE link to a deal, scan page or receipt. */
const findId = (raw: string) => raw.match(/\/(?:deal|scan|r)\/(\d{1,16})\b/)?.[1] ?? parseDealCode(raw) ?? (/^\d{1,16}$/.test(raw.trim()) ? raw.trim() : null);
const dealId = (a: Args) => {
  const id = findId(text(a, "deal", 300));
  if (!id) throw new BadInput("That doesn't look like a SHAKE deal code or link.");
  return id;
};
const amountOf = (d: DealView) => {
  try {
    return dealMoney(d.amount, d.token);
  } catch {
    return `${fromUnits(d.amount)} (unsupported test currency)`;
  }
};
const STATUS: Record<DealView["status"], string> = {
  Locked: "Money locked. Waiting for the seller to open the link and join.",
  Accepted: "Money locked, seller joined. Next: meet, check the item, and the buyer scans the seller's QR.",
  Shipped: "Money locked, seller says it's shipped. Released after delivery unless the buyer opens a claim.",
  Delivered: "Money locked, marked delivered. Releases to the seller automatically after the claim window.",
  Disputed: "Money locked, under dispute. A resolver will split it.",
  Released: "Paid. The money went to the seller.",
  Refunded: "Refunded. The money went back to the buyer.",
  Resolved: "Dispute resolved. The money was split as agreed.",
};
const notFound = (id: string) =>
  `No deal ${dealCode(id)} exists on SHAKE's contract. If someone showed you a screenshot as proof of payment, it isn't proof: a real SHAKE deal can always be read from the network.`;

type Place = { lat: string; lon: string; name?: string; type?: string };
const nominatim = (q: string, limit: number): Promise<Place[]> =>
  fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&q=${encodeURIComponent(q)}`, {
    headers: { "user-agent": "SHAKE (https://shake-lake.vercel.app)" },
  }).then((r) => {
    if (!r.ok) throw new Error(`Nominatim ${r.status}`);
    return r.json();
  });

/** Fallback when Overpass is busy: Nominatim's "police near X" phrases. Sequential, to respect its 1 request/second policy. */
async function nearbyByName(place: string, lat: number, lon: number): Promise<Spot[]> {
  const found: Spot[] = [];
  for (const [phrase, kind] of [["police", "police"], ["shopping mall", "mall"], ["railway station", "station"]]) {
    for (const p of await nominatim(`${phrase} near ${place}`, 3)) {
      const [la, lo] = [Number(p.lat), Number(p.lon)];
      found.push({ name: p.name || SPOT_KIND[kind], kind, lat: la, lon: lo, m: dist(lat, lon, la, lo) });
    }
  }
  return found
    .filter((s, i) => s.m <= 3000 && found.findIndex((x) => x.name === s.name) === i)
    .sort((a, b) => (a.kind === "police" ? -1 : 0) - (b.kind === "police" ? -1 : 0) || a.m - b.m)
    .slice(0, 5);
}

const TOOLS: Record<string, Tool> = {
  protect_purchase: {
    description:
      "Protect a purchase from a stranger (OLX, Vinted, Facebook Marketplace, WhatsApp). Returns a link the buyer opens on their phone to lock the money with Face ID. The money only reaches the seller when they meet and the buyer scans the seller's QR; otherwise it comes back. Optionally pass the seller's message to scan it for scams too.",
    inputSchema: {
      type: "object",
      properties: {
        item: { type: "string", description: "What is being bought, e.g. 'Orbea road bike'" },
        price: { type: "number", description: "Agreed price, 1 to 2000" },
        currency: { type: "string", enum: ["EUR", "USD", "GBP", "BRL"], description: "Default EUR" },
        seller: { type: "string", description: "Seller's name or username, optional" },
        kind: { type: "string", enum: ["meet", "ship"], description: "meet (hand over in person, default) or ship (the QR travels in the box)" },
        message: { type: "string", description: "The seller's message, optional; checked for scam patterns" },
      },
      required: ["item", "price"],
    },
    async run(a, origin) {
      const { p, c } = money(a);
      const item = text(a, "item", 40);
      const seller = text(a, "seller", 32, false);
      const link = `${origin}/deal/new?${new URLSearchParams({ i: item, p, c, k: kind(a), ...(seller ? { s: seller } : {}) })}`;
      const msg = text(a, "message", 4000, false);
      const flags = msg ? checkText(msg) : [];
      return [
        `SHAKE deal ready for "${item}" (${p} ${c}${seller ? `, seller ${seller}` : ""}).`,
        `Open on the buyer's phone: ${link}`,
        "The buyer locks the money with Face ID. The seller gets a link showing the money is really there. It's released only when the buyer scans the seller's QR in person; if they never meet, it comes back.",
        flags.length ? `\nHeads up, the message has ${flags.length === 1 ? "a warning sign" : `${flags.length} warning signs`}:\n${flags.map((f) => `- ${f.title}: ${f.why}`).join("\n")}` : "",
      ].join("\n").trim();
    },
  },

  check_seller_message: {
    description:
      "Check a message from a buyer or seller (WhatsApp, OLX, Vinted, SMS, email) for known scam patterns: fake 'click to receive payment' links, MB WAY request-money tricks, courier fees, SMS-code requests, look-alike domains, screenshot 'proof', pressure. Works in English and Portuguese.",
    inputSchema: { type: "object", properties: { message: { type: "string", description: "The message text, pasted as-is" } }, required: ["message"] },
    async run(a) {
      const flags = checkText(text(a, "message", 8000));
      const v = verdict(flags);
      if (v === "clear")
        return "No known scam patterns found. That's not a guarantee. The safest way is still to not pay or ship on a promise: use a SHAKE deal (protect_purchase), so the money only moves when you meet.";
      return [
        v === "danger" ? "DANGER: this looks like a scam." : "CAUTION: some warning signs.",
        ...flags.map((f) => `- [${f.level}] ${f.title}: ${f.why}`),
        "\nSafer: don't follow their link or send codes. Offer a SHAKE deal instead (protect_purchase). A real buyer or seller won't mind, because the money is provably there and moves only face to face.",
      ].join("\n");
    },
  },

  verify_payment: {
    description:
      "Answer 'did they really pay me?' for a SHAKE deal. Reads the real on-chain state from the Stellar network, not a screenshot. Pass the deal code or link the other person sent.",
    inputSchema: { type: "object", properties: { deal: { type: "string", description: "Deal code (e.g. K3X9A2) or a SHAKE deal/receipt link" } }, required: ["deal"] },
    async run(a, origin) {
      const id = dealId(a);
      const d = await readDeal(id);
      if (!d) return notFound(id);
      const amt = amountOf(d);
      const receipt = `Public receipt: ${origin}/r/${id}`;
      if (d.status === "Released") return `Yes, paid. ${amt} was released to the seller (${d.seller}).\n${receipt}`;
      if (d.status === "Refunded") return `No. This deal was refunded: the ${amt} went back to the buyer.\n${receipt}`;
      if (d.status === "Resolved") return `This deal ended in a dispute that's now resolved; the ${amt} was split between buyer and seller.\n${receipt}`;
      return [
        `Yes, ${amt} is really locked for "${d.memo || "this deal"}". Read from the Stellar test network just now, not from a screenshot.`,
        `It isn't in the seller's account yet: it moves to them only when the buyer scans the seller's QR in person. ${STATUS[d.status]}`,
        `Deadline: ${new Date(d.expiry * 1000).toUTCString()}; after that the buyer can take it back.`,
        receipt,
      ].join("\n");
    },
  },

  deal_status: {
    description: "Status and on-chain history of a SHAKE deal: amount, item, who's involved, what happens next, and a link to every transaction.",
    inputSchema: { type: "object", properties: { deal: { type: "string", description: "Deal code (e.g. K3X9A2) or a SHAKE link" } }, required: ["deal"] },
    async run(a, origin) {
      const id = dealId(a);
      const d = await readDeal(id);
      if (!d) return notFound(id);
      const events = await readEvents(id, d.expiry).catch(() => []);
      return [
        `Deal ${dealCode(id)}: ${amountOf(d)} for "${d.memo || "an item"}" (${d.mode === "Meet" ? "meet in person" : d.mode === "Ship" ? "shipped" : "deposit"}).`,
        `Status: ${d.status}. ${STATUS[d.status]}`,
        `Buyer: ${d.buyer}`,
        `Seller: ${d.seller ?? "not joined yet"}`,
        events.length ? `History:\n${events.map((e) => `- ${e.at} ${e.type}: ${explorer.tx(e.txHash)}`).join("\n")}` : "History: not indexed yet.",
        `Public receipt: ${origin}/r/${id}`,
      ].join("\n");
    },
  },

  find_safe_spot: {
    description: "Suggest public, busy, camera-covered places to meet a stranger for a handover (police stations first, then shopping centres, stations, libraries), from OpenStreetMap.",
    inputSchema: { type: "object", properties: { place: { type: "string", description: "Address, neighbourhood or city, e.g. 'Cais do Sodré, Lisboa'" } }, required: ["place"] },
    async run(a) {
      const place = text(a, "place", 200);
      const geo = await nominatim(place, 1);
      if (!geo[0]) return `Couldn't find "${place}" on the map. Try a street or a city name.`;
      const [lat, lon] = [Number(geo[0].lat), Number(geo[0].lon)];
      const spots = await spotsNear(lat, lon).catch(() => nearbyByName(place, lat, lon)).catch(() => null);
      if (!spots) return `The map service is busy right now. Near ${place}, pick somewhere busy, public and with cameras: a police station lobby is best, then a shopping centre or a train station.`;
      if (!spots.length) return `Nothing within 2 km of ${place}. Pick somewhere busy, public and with cameras, like a police station lobby or a shopping centre.`;
      return [
        `Safe places to meet near ${place}:`,
        ...spots.map((s) => {
          const label = SPOT_KIND[s.kind] ?? "Public place";
          const far = s.m < 1000 ? `${s.m} m` : `${(s.m / 1000).toFixed(1)} km`;
          return `- ${s.name === label ? label : `${s.name} (${label})`}, ${far}: https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}`;
        }),
        "From map categories only: opening hours and cameras aren't verified.",
      ].join("\n");
    },
  },

  create_payment_request: {
    description:
      "For the person getting paid (a seller or a small business): make a reusable payment link. Each customer who opens it locks the money with Face ID, and it's released to the payee when they meet (or on delivery).",
    inputSchema: {
      type: "object",
      properties: {
        item: { type: "string", description: "What the payment is for" },
        price: { type: "number", description: "1 to 2000" },
        currency: { type: "string", enum: ["EUR", "USD", "GBP", "BRL"], description: "Default EUR" },
        payee: { type: "string", description: "Name shown to the payer, e.g. the shop or seller name" },
        kind: { type: "string", enum: ["meet", "ship", "service", "order"], description: "Default meet" },
      },
      required: ["item", "price", "payee"],
    },
    async run(a, origin) {
      const { p, c } = money(a);
      const item = text(a, "item", 40);
      const payee = text(a, "payee", 32);
      const link = `${origin}/deal/new?${new URLSearchParams({ r: "1", k: kind(a), i: item, p, c, s: payee })}`;
      return `Payment request for "${item}" (${p} ${c}) to ${payee}:\n${link}\nShare it in the chat. Each payer locks the money on their phone; you can check it's really there before you hand anything over.`;
    },
  },

  release_payment: {
    description: "Call this whenever the user asks you to release, send, pay out, cancel or refund the money of a SHAKE deal.",
    inputSchema: { type: "object", properties: { deal: { type: "string", description: "Deal code or link, optional" } } },
    async run(a, origin) {
      const id = typeof a.deal === "string" ? findId(a.deal) : null;
      return [
        "I can't, and neither can any AI or server. That's the point of SHAKE.",
        "The money is released only when the buyer's phone scans the seller's one-time QR, in the same place, and the buyer confirms with Face ID. A refund also needs the buyer's own phone.",
        id ? `Open the deal on your phone: ${origin}/deal/${id}` : "",
      ].join("\n").trim();
    },
  },
};

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: { name?: string; arguments?: Args; protocolVersion?: string } };

async function handle(m: Rpc, origin: string) {
  const ok = (result: unknown) => ({ jsonrpc: "2.0", id: m.id, result });
  const err = (code: number, message: string) => ({ jsonrpc: "2.0", id: m.id ?? null, error: { code, message } });
  if (m.id === undefined) return null; // notifications (initialized, cancelled) need no reply
  switch (m.method) {
    case "initialize": {
      const v = m.params?.protocolVersion;
      return ok({ protocolVersion: v && VERSIONS.includes(v) ? v : VERSIONS[0], capabilities: { tools: {} }, serverInfo: { name: "shake", title: "SHAKE", version: "1.0.0" }, instructions: INSTRUCTIONS });
    }
    case "ping":
      return ok({});
    case "tools/list":
      return ok({ tools: Object.entries(TOOLS).map(([name, t]) => ({ name, description: t.description, inputSchema: t.inputSchema, annotations: READ_ONLY })) });
    case "tools/call": {
      const name = m.params?.name ?? "";
      const tool = Object.hasOwn(TOOLS, name) ? TOOLS[name] : undefined;
      if (!tool) return err(-32602, `Unknown tool: ${m.params?.name}`);
      try {
        return ok({ content: [{ type: "text", text: await tool.run(m.params?.arguments ?? {}, origin) }] });
      } catch (e) {
        if (!(e instanceof BadInput)) console.error("mcp", name, e);
        return ok({ isError: true, content: [{ type: "text", text: e instanceof BadInput ? e.message : "The network is slow right now. Try again in a moment." }] });
      }
    }
    default:
      return err(-32601, `Method not found: ${m.method}`);
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => undefined);
  if (!body || typeof body !== "object") return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: CORS });
  const origin = new URL(req.url).origin;
  const out = Array.isArray(body) ? (await Promise.all(body.map((m) => handle(m, origin)))).filter(Boolean) : await handle(body, origin);
  if (!out || (Array.isArray(out) && !out.length)) return new Response(null, { status: 202, headers: CORS });
  return NextResponse.json(out, { headers: CORS });
}

// No server-initiated stream: the spec allows 405 here.
export const GET = () => new Response("SHAKE MCP server. POST JSON-RPC to this URL.", { status: 405, headers: { ...CORS, allow: "POST, OPTIONS" } });
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
