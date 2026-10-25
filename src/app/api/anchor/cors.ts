import { NextResponse } from "next/server";
import { UserError } from "@/lib/server/stellar";

export const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type" };
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: CORS });
export function fail(e: unknown) {
  if (e instanceof UserError) return json({ error: e.message }, e.status);
  console.error(e);
  return json({ error: e instanceof Error ? e.message : "Anchor error" }, 400);
}
