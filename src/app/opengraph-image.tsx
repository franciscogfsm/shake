import { OG_SIZE, card } from "@/lib/server/og";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "SHAKE: never trust a screenshot again";

export default async function Image() {
  return card({ eyebrow: "The safe way to pay a stranger", title: "Shake on it.", sub: "Money only moves when you meet", coin: "shut" });
}
