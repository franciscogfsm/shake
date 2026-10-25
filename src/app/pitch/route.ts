import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-static";

/** Judge deck. The whole presentation is pitchdeck/index.html, served at /pitch. */
export async function GET() {
  const html = await readFile(path.join(process.cwd(), "pitchdeck", "index.html"));
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
