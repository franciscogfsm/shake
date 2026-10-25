import { ImageResponse } from "next/og";
import { coinSrc } from "@/lib/server/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so the square stays full-bleed
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 20% 0%, rgba(80,140,255,.55), #0d0f12 70%)" }}>
        <img src={coinSrc("rest")} width={118} height={118} alt="" />
      </div>
    ),
    size,
  );
}
