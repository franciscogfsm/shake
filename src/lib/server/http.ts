import "server-only";
import { NextResponse } from "next/server";
import { UserError } from "./stellar";

export function errorResponse(e: unknown) {
  if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "The network is slow right now. Try again in a moment." }, { status: 503 });
}
