// Voices src/script.json with ElevenLabs v3 and writes src/vo.json: when each line, sentence and word is spoken.
// Each line is one natural take (several sentences). We generate `takes` versions, transcribe each one back
// (speech-to-text), and keep the take that says exactly the script, preferring the tighter read.
// Set "pick": n on a line to force a take. Edit text or gap, re-run, and the film re-times itself.
//   node scripts/voice.mjs
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { XI } from "./env.mjs";

const script = JSON.parse(readFileSync(new URL("../src/script.json", import.meta.url)));
const dir = new URL("../public/audio/vo/", import.meta.url);
mkdirSync(dir, { recursive: true });
const path = (u) => fileURLToPath(u);
const r3 = (x) => +x.toFixed(3);
const model = script.model ?? "eleven_v3";

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
// similarity of two strings, 1 = identical (Levenshtein on letters only, so "O.L.X." == "OLX")
function sim(a, b) {
  a = norm(a); b = norm(b);
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) { const tmp = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; }
  }
  return 1 - d[b.length] / Math.max(a.length, b.length, 1);
}
console.assert(sim("Vinted and O.L.X.", "Vinted and OLX") === 1 && sim("abcd", "abce") === 0.75, "sim");

async function stt(file) {
  const form = new FormData();
  form.append("model_id", "scribe_v1");
  form.append("file", new Blob([readFileSync(file)], { type: "audio/mpeg" }), "take.mp3");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": XI }, body: form });
  if (!res.ok) throw new Error(`stt ${res.status} ${await res.text()}`);
  return (await res.json()).text;
}

async function take(l, n) {
  const settings = model === "eleven_v3" ? { stability: script.stability ?? 0.5 } : { stability: 0.4, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true };
  const name = `${l.id}-${createHash("sha1").update(`${script.voice}|${model}|${JSON.stringify(settings)}|${l.text}|${n}`).digest("hex").slice(0, 8)}`;
  const mp3 = new URL(`${name}.mp3`, dir), meta = new URL(`${name}.json`, dir);
  if (existsSync(mp3) && existsSync(meta)) return { file: `audio/vo/${name}.mp3`, ...JSON.parse(readFileSync(meta)) };
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${script.voice}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": XI, "content-type": "application/json" },
    body: JSON.stringify({ text: l.text, model_id: model, voice_settings: settings }),
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
  const from = Math.max(0, words[0].start - 0.06), to = words.at(-1).end + 0.22;
  const raw = new URL(`${name}.raw.mp3`, dir);
  writeFileSync(raw, Buffer.from(audio_base64, "base64"));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", path(raw), "-ss", String(from), "-to", String(to), "-af", "afade=t=out:st=" + (to - from - 0.08) + ":d=0.08", "-b:a", "160k", path(mp3)]);
  unlinkSync(raw);
  const heard = await stt(path(mp3));
  const out = { dur: r3(to - from), heard, score: r3(sim(heard, l.text)), words: words.map(({ w, start, end }) => ({ w, start: r3(start - from), end: r3(end - from) })) };
  writeFileSync(meta, JSON.stringify(out));
  return { file: `audio/vo/${name}.mp3`, ...out };
}

async function best(l) {
  const takes = await Promise.all(Array.from({ length: l.takes ?? script.takes ?? 3 }, (_, n) => take(l, n)));
  for (const [n, t] of takes.entries()) console.log(`  ${l.id}#${n} ${t.dur.toFixed(2)}s score ${t.score} "${t.heard}"`);
  if (l.pick != null) return takes[l.pick];
  const top = Math.max(...takes.map((t) => t.score));
  // every take that says the script as well as the best one; of those, the tighter read
  return takes.filter((t) => t.score >= top - 0.02).sort((a, b) => a.dur - b.dur)[0];
}

let t = 0;
const lines = [];
for (const l of script.lines) {
  const v = await best(l);
  if (v.score < 0.9) console.warn(`! ${l.id}: best take only scores ${v.score}, listen to it`);
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
