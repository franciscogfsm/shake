// Sound effects and the score from ElevenLabs, cached by prompt. The score's sections follow src/vo.json,
// so the drops land on "So they shake on it" and "Paid".   node scripts/sound.mjs [sfx|music]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { XI } from "./env.mjs";

const only = process.argv[2];
const dir = new URL("../public/audio/", import.meta.url);
mkdirSync(new URL("sfx/", dir), { recursive: true });
const tag = (x) => createHash("sha1").update(JSON.stringify(x)).digest("hex").slice(0, 6);
async function get(url, body, file) {
  if (existsSync(file)) return;
  const res = await fetch(url, { method: "POST", headers: { "xi-api-key": XI, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log("made", file.pathname.split("/").pop());
}

export const SFX = {
  whoosh: ["Fast clean cinematic air whoosh transition, modern, short, no music", 1.0],
  swoosh: ["Deep powerful cinematic whoosh with low rumble, movie trailer transition", 1.4],
  slam: ["Massive cinematic impact hit, deep sub bass boom with a bright crystal glass shimmer tail, trailer", 2.6],
  glitch: ["Harsh digital glitch, data corruption stutter, electronic error buzz, short", 1.1],
  tick: ["Single soft clean UI tap click, minimal, crisp", 0.5],
  pop: ["Soft bubbly UI pop, chat message appearing, subtle and clean", 0.5],
  riser: ["Tension riser, rising synth swell with reverse cymbal building to a peak, cinematic", 2.4],
  chime: ["Bright crystalline success chime, two ascending notes, warm and premium, payment complete", 1.6],
  lock: ["Satisfying solid metallic lock click with a soft low thud, premium product sound", 0.8],
  heart: ["Low tense heartbeat, two deep beats, cinematic suspense", 1.4],
  beep: ["Short soft futuristic scanner confirmation beep", 0.6],
  blip: ["Soft digital blip, signal dropping out, minimal", 0.6],
  typing: ["Fast soft laptop keyboard typing, short burst", 1.3],
  shimmer: ["Delicate magical glass shimmer sparkle sweep, light glint, subtle", 1.5],
  denied: ["Short low muted error thud, access denied, soft and deep", 0.7],
};

if (only !== "music") {
  const out = {};
  for (const [id, [text, s]] of Object.entries(SFX)) {
    const name = `sfx/${id}-${tag([text, s])}.mp3`;
    await get("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", { text, duration_seconds: s, prompt_influence: 0.55 }, new URL(name, dir));
    out[id] = `audio/${name}`;
  }
  writeFileSync(new URL("../src/sfx.json", import.meta.url), JSON.stringify(out, null, 1));
}

if (only !== "sfx") {
  const vo = JSON.parse(readFileSync(new URL("../src/vo.json", import.meta.url)));
  const line = (id) => vo.lines.find((l) => l.id === id);
  // the three hits the film slams on: after "shake on it", just before "Paid", just before the closing "Shake."
  const hits = { shake: line("v06").words.at(-1).end + 0.1, paid: line("v10").start - 0.12, end: line("v15").start - 0.3 };
  const total = Math.round(vo.total * 1000);
  const cuts = [0, hits.shake * 1000, hits.paid * 1000, hits.end * 1000, total].map(Math.round);
  const style = [
    ["Suspense intro: sparse ticking pulse, low warm drone, a few soft felt-piano notes, tension and curiosity, quiet", "drums", "loud"],
    ["Confident build: a deep impact hit at the very start, then a driving modern electronic pulse, warm analog synth bass, clean hi-hats, rising", "vocals"],
    ["Release: a big uplifting drop at the very start, bright glassy arpeggios, full punchy beat, euphoric and fast moving", "vocals"],
    ["Ending: one final huge hit, then a warm resolving synth chord with a long reverb tail, fading out", "drums", "vocals"],
  ];
  const plan = {
    positive_global_styles: ["cinematic electronic", "Apple keynote product film", "minimal", "premium", "modern", "116 bpm", "instrumental"],
    negative_global_styles: ["vocals", "lo-fi", "guitar", "cheesy", "corporate ukulele"],
    sections: style.map(([desc, ...neg], i) => ({ section_name: `part ${i + 1}`, positive_local_styles: [desc], negative_local_styles: neg, duration_ms: cuts[i + 1] - cuts[i], lines: [] })),
  };
  const name = `music-${tag(plan)}.mp3`;
  await get("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", { composition_plan: plan, model_id: "music_v1" }, new URL(name, dir));
  writeFileSync(new URL("../src/music.json", import.meta.url), JSON.stringify({ file: `audio/${name}`, hits }, null, 1));
  console.log("music cuts", cuts.map((c) => (c / 1000).toFixed(2)).join(" "));
}
