import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Inter, JetBrains_Mono } from "next/font/google";
import { GlassSheen } from "@/components/GlassSheen";
import "./globals.css";

const satoshi = localFont({
  src: [
    { path: "./fonts/Satoshi-Medium.woff2", weight: "500" },
    { path: "./fonts/Satoshi-Bold.woff2", weight: "700" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-jetbrains", display: "swap" });

const site =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "SHAKE: never trust a screenshot again", template: "%s · SHAKE" },
  description: "The safe way to pay a stranger. Money only releases when you meet face to face.",
  applicationName: "SHAKE",
  appleWebApp: { capable: true, title: "SHAKE", statusBarStyle: "black-translucent" },
  openGraph: { title: "SHAKE", description: "Never trust a screenshot again. Shake on it.", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0d0f12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${satoshi.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>
        <div className="backdrop" aria-hidden />
        <GlassSheen />
        {children}
      </body>
    </html>
  );
}
