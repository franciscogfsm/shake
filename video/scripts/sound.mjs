// Sound effects and the score from ElevenLabs, cached by prompt. The score's sections follow src/vo.json,
// so the drops land on "So they shake on it", "she's paid" and the closing "SHAKE.".   node scripts/sound.mjs [sfx|music]
import { execFileSync } from "node:child_process";
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
  coin: ["Single bright clean coin clink, premium, short", 0.6],
  stamp: ["Heavy rubber stamp slammed on paper, short punchy thud", 0.6],
  dissolve: ["Digital particles disintegrating, soft sparkling dissolve whoosh", 1.2],
  outro: ["Cinematic final impact hit followed by a warm uplifting resolving synth pad chord with a long shimmering reverb tail, premium, no drums after the hit", 6],
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
  const word = (id, w) => line(id).words.find((x) => x.w.toLowerCase().replace(/[^a-z]/g, "") === w).start;
  // the three hits the film slams on: after "shake on it", on "paid", just before the closing "SHAKE."
  const hits = { shake: line("turn").words.at(-1).end + 0.12, paid: word("flow", "paid") - 0.04, end: line("end").start - 0.2 };
  const total = Math.round(vo.total * 1000);
  const cuts = [0, hits.shake * 1000, hits.paid * 1000, hits.end * 1000, total].map(Math.round);
  const style = [
    ["Intro: soft warm ambient pad, a curious glassy synth pluck motif, a muted low pulse creeping in halfway, gentle tension and anticipation, building quietly", "loud", "vocals"],
    ["Drop: a deep impact hit at the very start, then a confident driving beat, clean four-on-the-floor kick, crisp claps, warm analog synth bass, glassy plucks", "vocals"],
    ["Lift: a bright impact at the very start, then the full beat with shimmering arpeggios, uplifting and euphoric, steady forward momentum", "vocals"],
    ["Ending: one final huge impact hit at the very start, then a warm resolving synth chord with a long reverb tail, fading out", "drums", "vocals"],
  ];
  const plan = {
    positive_global_styles: ["modern minimal electronic", "sleek tech product film", "premium", "clean punchy kick", "glassy synth plucks", "120 bpm", "instrumental"],
    negative_global_styles: ["vocals", "lo-fi", "guitar", "cheesy", "orchestral trailer", "dubstep", "corporate ukulele"],
    sections: style.map(([desc, ...neg], i) => ({ section_name: `part ${i + 1}`, positive_local_styles: [desc], negative_local_styles: neg, duration_ms: cuts[i + 1] - cuts[i], lines: [] })),
  };
  const name = `music-${tag(plan)}.mp3`;
  await get("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", { composition_plan: plan, model_id: "music_v1" }, new URL(name, dir));
  // the model doesn't put the drop exactly where it was asked: find the real one (the biggest jump in loudness
  // near the "shake" hit) and start the score early or late by that much, so the drop lands on the slam
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", new URL(name, dir).pathname.slice(process.platform === "win32" ? 1 : 0).replace(/%20/g, " "), "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  const db = (from, n) => { let e = 0; for (let i = from; i < from + n; i++) { const v = pcm.readInt16LE(i * 2) / 32768; e += v * v; } return 10 * Math.log10(e / n + 1e-12); };
  const W = 2000, at = (s) => Math.round(s * 8000);
  let lead = 0, best = -Infinity;
  for (let s = hits.shake - 1.5; s <= hits.shake + 1.5; s += 0.01) {
    const jump = db(at(s), W) - db(at(s) - W, W);
    if (jump > best) { best = jump; lead = s - hits.shake; }
  }
  writeFileSync(new URL("../src/music.json", import.meta.url), JSON.stringify({ file: `audio/${name}`, hits, lead: +lead.toFixed(2) }, null, 1));
  console.log(`drop found ${lead.toFixed(2)}s after the slam (+${best.toFixed(1)} dB), the film starts the score that much in`);
  console.log("music cuts", cuts.map((c) => (c / 1000).toFixed(2)).join(" "));
}
