import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PROMPT = `You check screenshots people receive while selling second-hand items (OLX, Vinted, WhatsApp, MB WAY, bank apps).
Look for signs of a scam or a faked payment: edited or inconsistent numbers/fonts, "payment pending" or "awaiting confirmation" claims,
MB WAY "request money" (pedido de dinheiro) disguised as receiving money, links to pay a fee or "receive" money, look-alike domains,
courier fee requests, requests for SMS codes or PINs, urgency or pressure.
Reply with JSON only: {"verdict":"danger"|"warn"|"clear","flags":[{"level":"danger"|"warn","title":"<max 8 words>","why":"<one plain sentence>"}]}.
Write for a non-technical person. Never claim a screenshot proves a payment: a screenshot can never prove one.`;

/** Screenshot check with Claude vision. Only active when ANTHROPIC_API_KEY is set; the page falls back to text checks. */
export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "Screenshot reading is off on this server." }, { status: 501 });
  const { image, type } = (await req.json().catch(() => ({}))) as { image?: string; type?: string };
  if (!image || !/^image\/(png|jpeg|webp|gif)$/.test(type ?? "") || image.length > 7_000_000)
    return NextResponse.json({ error: "Send a PNG or JPEG under 5MB." }, { status: 400 });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-5-5",
      max_tokens: 600,
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: type, data: image } }, { type: "text", text: PROMPT }] }],
    }),
  });
  if (!r.ok) return NextResponse.json({ error: "Couldn't read the screenshot right now." }, { status: 502 });
  const text: string = (await r.json()).content?.find((c: { type: string }) => c.type === "text")?.text ?? "";
  try {
    const out = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return NextResponse.json({ verdict: out.verdict, flags: (out.flags ?? []).slice(0, 6) });
  } catch {
    return NextResponse.json({ error: "Couldn't read the screenshot right now." }, { status: 502 });
  }
}
