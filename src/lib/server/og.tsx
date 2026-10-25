import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { dealMoney } from "@/lib/config";
import { readDeal } from "./stellar";

export const OG_SIZE = { width: 1200, height: 630 };

const fonts = async () => {
  const dir = join(process.cwd(), "src", "assets");
  const [medium, bold] = await Promise.all([readFile(join(dir, "Satoshi-Medium.ttf")), readFile(join(dir, "Satoshi-Bold.ttf"))]);
  return [
    { name: "Satoshi", data: medium, weight: 500 as const, style: "normal" as const },
    { name: "Satoshi", data: bold, weight: 700 as const, style: "normal" as const },
  ];
};

/** The split coin as an SVG data URI (Satori renders images more faithfully than inline SVG). */
export function coinSrc(state: "rest" | "shut" = "rest") {
  const o = state === "shut" ? 0 : 0.6;
  const seam = "V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 26 26">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfd3da"/></linearGradient>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bfe6ff" stop-opacity=".9"/><stop offset=".55" stop-color="#8fd3ff" stop-opacity=".55"/><stop offset="1" stop-color="#8fd3ff" stop-opacity=".8"/></linearGradient></defs>
<path transform="translate(${-o} 0)" d="M12 2A10 10 0 0 0 12 22${seam}" fill="url(#s)"/>
<path transform="translate(${o} 0)" d="M12 2A10 10 0 0 1 12 22${seam}" fill="url(#g)"/>
${state === "shut" ? '<circle cx="12" cy="12" r="9.8" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".4"/>' : ""}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}


/** Graphite Glacier card: big amount, one line of status, the coin. */
export async function card({ eyebrow, title, sub, tone = "safe", coin = "rest" }: { eyebrow: string; title: string; sub: string; tone?: "safe" | "mute"; coin?: "rest" | "shut" }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0d0f12", fontFamily: "Satoshi", color: "#f3f5f7", position: "relative" }}>
        <div style={{ position: "absolute", left: -200, top: -260, width: 900, height: 700, borderRadius: 9999, background: "radial-gradient(circle, rgba(80,140,255,.55), rgba(80,140,255,0) 65%)" }} />
        <div style={{ position: "absolute", right: -220, bottom: -320, width: 900, height: 800, borderRadius: 9999, background: "radial-gradient(circle, rgba(143,211,255,.35), rgba(143,211,255,0) 65%)" }} />
        <div style={{ position: "absolute", left: 520, top: -300, width: 600, height: 500, borderRadius: 9999, background: "radial-gradient(circle, rgba(170,120,255,.28), rgba(170,120,255,0) 65%)" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: "100%", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700, letterSpacing: 8 }}>
            <img src={coinSrc("rest")} width={48} height={48} alt="" />
            SHAKE
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 28, letterSpacing: 5, textTransform: "uppercase", color: "#97a0ab" }}>{eyebrow}</div>
              <div style={{ fontSize: 132, fontWeight: 500, letterSpacing: -6, lineHeight: 1, marginTop: 14, color: tone === "safe" ? "#f3f5f7" : "#c3cad3" }}>{title}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 36, marginTop: 22, color: tone === "safe" ? "#8fd3ff" : "#c3cad3" }}>
                <div style={{ width: 14, height: 14, borderRadius: 99, background: tone === "safe" ? "#8fd3ff" : "#c3cad3" }} />
                {sub}
              </div>
            </div>
            <img src={coinSrc(coin)} width={230} height={230} alt="" />
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts(), headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
  );
}

/** Link preview for a deal, read live from the chain: the preview itself is proof. */
export async function dealCard(id: string) {
  const deal = /^\d{1,16}$/.test(id) ? await readDeal(id).catch(() => null) : null;
  if (!deal) return card({ eyebrow: "Safe payment", title: "Shake on it.", sub: "Never trust a screenshot again" });
  const item = deal.memo || "Second-hand deal";
  if (deal.status === "Released") return card({ eyebrow: item, title: dealMoney(deal.amount, deal.token), sub: "Released · final on Stellar", coin: "shut" });
  if (deal.status === "Refunded") return card({ eyebrow: item, title: dealMoney(deal.amount, deal.token), sub: "Refunded to the buyer", tone: "mute" });
  const hours = Math.max(0, Math.round((deal.expiry - Date.now() / 1000) / 3600));
  return card({ eyebrow: item, title: dealMoney(deal.amount, deal.token), sub: `Locked for you ✓ · ${hours}h left · verified on Stellar` });
}
