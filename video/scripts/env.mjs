import { readFileSync } from "node:fs";
// reads ../.env.local without printing it
export const env = Object.fromEntries(readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
export const XI = env["ELEVEN-LABS"] ?? env.ELEVENLABS_API_KEY;
