import { NextResponse } from "next/server";

export const runtime = "nodejs";

// only marketplaces we know, so this can't be used to fetch arbitrary URLs
const HOSTS = /(^|\.)(olx\.(pt|pl|ro|bg|ua|com\.br|in)|vinted\.[a-z.]{2,6}|wallapop\.com|depop\.com)$/i;

const meta = (html: string, prop: string) =>
  html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1] ??
  html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, "i"))?.[1];

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** The slug is the fallback when the marketplace blocks us: /items/123-iphone-13-128gb → "iPhone 13 128gb". */
function fromSlug(u: URL) {
  const last = u.pathname.split("/").filter(Boolean).pop() ?? "";
  const words = last.replace(/\.html?$/, "").replace(/-ID[0-9A-Za-z]+$/, "").replace(/^\d+-/, "").split("-").filter((w) => w && !/^\d{6,}$/.test(w));
  const t = words.join(" ");
  return t ? t[0].toUpperCase() + t.slice(1) : "";
}

/** Vinted/OLX link → item name and price, for the new-deal form. */
export async function GET(req: Request) {
  let u: URL;
  try {
    u = new URL(new URL(req.url).searchParams.get("url") ?? "");
  } catch {
    return NextResponse.json({ error: "Not a link" }, { status: 400 });
  }
  if (u.protocol !== "https:" || !HOSTS.test(u.hostname)) return NextResponse.json({ error: "Only OLX and Vinted links" }, { status: 400 });
  const source = u.hostname.includes("vinted") ? "Vinted" : u.hostname.includes("olx") ? "OLX" : u.hostname.split(".").slice(-2, -1)[0];
  let title = "";
  let price: number | null = null;
  try {
    const r = await fetch(u, { headers: { "user-agent": "Mozilla/5.0 (compatible; SHAKE link preview)", accept: "text/html" }, signal: AbortSignal.timeout(4000), redirect: "follow" });
    if (r.ok) {
      const html = (await r.text()).slice(0, 400_000);
      title = decode(meta(html, "og:title") ?? html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "").split(/ [|•·-] /)[0].trim();
      const p = meta(html, "product:price:amount") ?? meta(html, "og:price:amount") ?? html.match(/"price"\s*:\s*"?(\d+(?:[.,]\d{1,2})?)/)?.[1];
      if (p) price = Number(p.replace(",", "."));
    }
  } catch {}
  title = (title || fromSlug(u)).slice(0, 40);
  return NextResponse.json({ title, price: price && price > 0 ? price : null, source }, { headers: { "Cache-Control": "public, max-age=600" } });
}
