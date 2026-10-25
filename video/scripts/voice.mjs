// Voices src/script.json with ElevenLabs (one clip per line, cached by voice + speed + text) and writes src/vo.json:
// when each line, sentence and word is spoken. Edit a line's text or gap, re-run, and the film re-times itself.
//   node scripts/voice.mjs
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { XI } from "./env.mjs";

const script = JSON.parse(readFileSync(new URL("../src/script.json", import.meta.url)));
const dir = new URL("../public/audio/vo/", import.meta.url);
mkdirSync(dir, { recursive: true });
const path = (u) => fileURLToPath(u);
const r3 = (x) => +x.toFixed(3);

async function voice(l, i) {
  const speed = l.speed ?? script.speed ?? 1;
  const name = `${l.id}-${createHash("sha1").update(`${script.voice}|${speed}|${l.text}|2`).digest("hex").slice(0, 8)}`;
  const mp3 = new URL(`${name}.mp3`, dir), meta = new URL(`${name}.json`, dir);
  if (existsSync(mp3) && existsSync(meta)) return { file: `audio/vo/${name}.mp3`, ...JSON.parse(readFileSync(meta)) };
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${script.voice}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": XI, "content-type": "application/json" },
    body: JSON.stringify({
      text: l.text,
      model_id: "eleven_multilingual_v2",
      previous_text: script.lines[i - 1]?.text,
      next_text: script.lines[i + 1]?.text,
      voice_settings: { stability: 0.42, similarity_boost: 0.8, style: 0.4, use_speaker_boost: true, speed },
    }),
  });
  if (!res.ok) throw new Error(`${l.id}: ${res.status} ${await res.text()}`);
  const { audio_base64, alignment: a } = await res.json();
  // characters → words
  const words = [];
  a.characters.forEach((c, k) => {
    if (/\s/.test(c)) return void (words.at(-1)?.open && (words.at(-1).open = false));
    const w = words.at(-1);
    // punctuation can carry the pause after it, so only letters and digits move a word's end
    if (w?.open) { w.w += c; if (/[\p{L}\p{N}]/u.test(c)) w.end = a.character_end_times_seconds[k]; }
    else words.push({ w: c, start: a.character_start_times_seconds[k], end: a.character_end_times_seconds[k], open: true });
  });
  // keep a breath before the first word and let the last one ring out
  const from = Math.max(0, words[0].start - 0.05), to = words.at(-1).end + 0.18;
  const raw = new URL(`${name}.raw.mp3`, dir);
  writeFileSync(raw, Buffer.from(audio_base64, "base64"));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path(raw), "-ss", String(from), "-to", String(to), "-af", "afade=t=out:st=" + (to - from - 0.06) + ":d=0.06", "-b:a", "160k", path(mp3)]);
  execFileSync(process.platform === "win32" ? "cmd" : "rm", process.platform === "win32" ? ["/c", "del", path(raw)] : [path(raw)]);
  const out = { dur: r3(to - from), words: words.map(({ w, start, end }) => ({ w, start: r3(start - from), end: r3(end - from) })) };
  writeFileSync(meta, JSON.stringify(out));
  console.log("voiced", l.id, l.text);
  return { file: `audio/vo/${name}.mp3`, ...out };
}

let t = 0;
const lines = [];
for (const [i, l] of script.lines.entries()) {
  const v = await voice(l, i);
  t += l.gap;
  const words = v.words.map((w) => ({ ...w, start: r3(t + w.start), end: r3(t + w.end) }));
  // sentences: split after . ? ! : …
  const phrases = [];
  for (const w of words) {
    const p = phrases.at(-1);
    if (p && !p.closed) { p.text += " " + w.w; p.end = w.end; }
    else phrases.push({ text: w.w, start: w.start, end: w.end });
    if (/[.?!:…]$/.test(w.w)) phrases.at(-1).closed = true;
  }
  lines.push({ id: l.id, text: l.text, file: v.file, start: r3(t), dur: v.dur, words, phrases: phrases.map(({ closed, ...p }) => p) });
  t += v.dur;
}
writeFileSync(new URL("../src/vo.json", import.meta.url), JSON.stringify({ total: r3(t + script.tail), lines }, null, 1));
for (const l of lines) console.log(l.id, l.phrases.map((p) => `${p.start.toFixed(2)}-${p.end.toFixed(2)} ${p.text}`).join(" | "));
console.log("total", (t + script.tail).toFixed(2));
