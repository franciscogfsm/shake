import { XI } from "./env.mjs";
const h = { "xi-api-key": XI };
const s = await (await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: h })).json();
console.log("tier", s.tier, "chars", s.character_count, "/", s.character_limit, s.status ?? "", s.detail ? JSON.stringify(s.detail) : "");
const v = await (await fetch("https://api.elevenlabs.io/v2/voices?page_size=60", { headers: h })).json();
console.log((v.voices ?? []).map((x) => `${x.name} ${x.voice_id} [${x.category}] ${x.labels ? Object.values(x.labels).join("/") : ""}`).join("\n"), v.detail ? JSON.stringify(v.detail) : "");
