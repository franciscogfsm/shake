import { ImageResponse } from "next/og";
import { coinSrc } from "@/lib/server/og";

export const runtime = "nodejs";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 112, background: "radial-gradient(circle at 20% 0%, rgba(80,140,255,.55), #0d0f12 70%)" }}>
        <img src={coinSrc("rest")} width={340} height={340} alt="" />
      </div>
    ),
    size,
  );
}
