// Builds pitchdeck/single/index.html: the deck with the demo video and team photo inlined, for single-file submissions.
// Needs ffmpeg on PATH. Run: node pitchdeck/build-single.cjs
const fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const here = __dirname, pub = path.join(here, "../public"), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shake-single-"));
const ff = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a], { cwd: tmp, stdio: "inherit" });

// 1080p at ~1.55 Mbps keeps the 51s film near 11 MB, so the base64 file stays under the 20 MB limit.
const src = path.join(pub, "videos/shake-v6.mp4"), v = ["-i", src, "-c:v", "libx264", "-preset", "slow", "-b:v", "1550k"];
ff(...v, "-pass", "1", "-an", "-f", "mp4", os.platform() === "win32" ? "NUL" : "/dev/null");
ff(...v, "-pass", "2", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", "-pix_fmt", "yuv420p", "video.mp4");
ff("-i", path.join(pub, "teamimage.jpeg"), "-vf", "scale=1024:-2", "-q:v", "4", "team.jpg");

const b64 = (f, type) => `data:${type};base64,` + fs.readFileSync(path.join(tmp, f)).toString("base64");
const video = b64("video.mp4", "video/mp4"), team = b64("team.jpg", "image/jpeg");

let html = fs.readFileSync(path.join(here, "index.html"), "utf8");
const swap = (from, to) => { if (!html.includes(from)) throw new Error("not found in index.html: " + from); html = html.split(from).join(to); };
swap('DEMO_VIDEO:"/videos/shake-v6.mp4"', `DEMO_VIDEO:"${video}"`);
swap('v.src=location.protocol==="file:"?new URL("../public"+CFG.DEMO_VIDEO,location.href).href:CFG.DEMO_VIDEO;', "v.src=CFG.DEMO_VIDEO;");
swap('const src=["/teamimage.jpeg","../public/teamimage.jpeg"]', "const src=[img.src]");
swap('src="/teamimage.jpeg"', `src="${team}"`);

fs.mkdirSync(path.join(here, "single"), { recursive: true });
const out = path.join(here, "single/index.html");
fs.writeFileSync(out, html);
fs.rmSync(tmp, { recursive: true, force: true });
const mb = fs.statSync(out).size / 1e6;
console.log(`${out}: ${mb.toFixed(2)} MB`);
if (mb >= 20) throw new Error("over the 20 MB limit");
