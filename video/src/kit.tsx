// The SHAKE look, frame-driven: Graphite Glacier tokens, fonts, the split coin, the phone, kinetic type.
import React from "react";
import { AbsoluteFill, Easing, Img, continueRender, delayRender, interpolate, random, spring, staticFile } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import vo from "./vo.json";
import music from "./music.json";

export const FPS = 30;
export const C = { bg: "#0d0f12", surface: "#14171b", ink: "#f3f5f7", ink2: "#c3cad3", mute: "#97a0ab", line: "rgba(255,255,255,.12)", safe: "#8fd3ff", danger: "#ff453a", violet: "#b9a3ff" };
const inter = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
export const F = { display: `Satoshi, ${inter.fontFamily}, sans-serif`, text: `${inter.fontFamily}, sans-serif`, mono: `${mono.fontFamily}, monospace` };

const satoshi = delayRender("Satoshi");
Promise.all(
  [["Satoshi-Medium.woff2", "500"], ["Satoshi-Bold.woff2", "700"]].map(([f, w]) =>
    new FontFace("Satoshi", `url(${staticFile(f)}) format("woff2")`, { weight: w }).load().then((ff) => document.fonts.add(ff)),
  ),
).then(() => continueRender(satoshi));

/* ---------- time: everything is placed on the voice ---------- */
type Word = { w: string; start: number; end: number };
type Phrase = { text: string; start: number; end: number };
type Line = { id: string; text: string; file: string; start: number; dur: number; words: Word[]; phrases: Phrase[] };
export const LINES = vo.lines as Line[];
export const TOTAL = vo.total;
export const HIT = music.hits;
export const V = (id: string) => LINES.find((l) => l.id === id)!;
export const P = (id: string, i: number) => V(id).phrases[i];
/** when a word (first match, case-insensitive, punctuation ignored) is spoken in a line */
export const W = (id: string, word: string) => {
  const clean = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return V(id).words.find((w) => clean(w.w) === clean(word))!.start;
};

export const sec = (s: number) => Math.round(s * FPS);
export const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
export const easeIn = Easing.bezier(0.6, 0, 0.9, 0.4);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** map time t over [a,b] to [c,d], eased and clamped */
export const lerp = (t: number, ab: [number, number], cd: [number, number] = [0, 1], easing = ease) => interpolate(t, ab, cd, { ...clamp, easing });
export const SPR = { snappy: { stiffness: 500, damping: 32 }, smooth: { stiffness: 260, damping: 30 }, slam: { stiffness: 700, damping: 18, mass: 0.8 }, soft: { stiffness: 120, damping: 26 } };
/** the app's springs, started at time `at` */
export const spr = (t: number, at: number, cfg: { stiffness?: number; damping?: number; mass?: number } = SPR.smooth) => spring({ frame: Math.max(0, (t - at) * FPS), fps: FPS, config: cfg });
/** visible between a and b, with fades */
export const win = (t: number, a: number, b: number, fin = 0.25, fout = 0.25) => Math.min(lerp(t, [a, a + fin]), 1 - lerp(t, [b - fout, b], [0, 1], Easing.linear));

/* ---------- backdrop: graphite, drifting glacier light, film grain ---------- */
export function Backdrop({ t, danger = 0, calm = 0 }: { t: number; danger?: number; calm?: number }) {
  const dx = Math.sin(t * 0.21) * 5, dy = Math.cos(t * 0.17) * 4, r = Math.sin(t * 0.13) * 8;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: "-25%", opacity: (1 - danger) * (1 - calm * 0.45), transform: `translate(${dx}%, ${dy}%) rotate(${r}deg)`, background: "radial-gradient(40% 30% at 20% 25%, rgba(80,140,255,.5), transparent 70%), radial-gradient(35% 30% at 85% 70%, rgba(143,211,255,.38), transparent 70%), radial-gradient(30% 25% at 60% 10%, rgba(170,120,255,.28), transparent 70%)" }} />
      <div style={{ position: "absolute", inset: "-25%", opacity: danger, transform: `translate(${-dx}%, ${dy}%)`, background: "radial-gradient(40% 30% at 30% 35%, rgba(255,69,58,.42), transparent 70%), radial-gradient(35% 30% at 80% 70%, rgba(80,140,255,.22), transparent 70%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,.55) 100%)" }} />
    </AbsoluteFill>
  );
}
export function Grain({ t }: { t: number }) {
  const f = Math.floor(t * FPS);
  return (
    <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: "overlay", pointerEvents: "none", backgroundPosition: `${Math.floor(random(f) * 140)}px ${Math.floor(random(f + 0.5) * 140)}px`, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
  );
}

/* ---------- the split coin (src/components/Mark.tsx) ---------- */
const SEAM = "V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z";
export const LEFT = `M12 2A10 10 0 0 0 12 22${SEAM}`;
export const RIGHT = `M12 2A10 10 0 0 1 12 22${SEAM}`;
/** gap: px between the halves (0 = shut), or l/r: each half's own px offset. shut: seconds since it slammed. */
export function Coin({ size, gap = 0, l, r, lo = 1, ro = 1, shut, glow = 0.5, tension = 0 }: { size: number; gap?: number; l?: number; r?: number; lo?: number; ro?: number; shut?: number; glow?: number; tension?: number }) {
  const k = size / 24;
  const bounce = shut === undefined ? 1 : interpolate(shut, [0, 0.11, 0.25, 0.4, 0.55], [0.92, 1.09, 0.98, 1.015, 1], clamp);
  const rot = shut === undefined ? 0 : interpolate(shut, [0, 0.11, 0.25, 0.4, 0.55], [0, -4, 2.5, -1, 0], clamp);
  const ring = shut === undefined ? 0 : lerp(shut, [0.1, 0.35]);
  const sweep = shut === undefined ? -1 : lerp(shut, [0.12, 0.72], [0, 1], Easing.bezier(0.2, 0.6, 0.3, 1));
  const offL = -(l ?? -gap / 2) / k + tension * 2.6, offR = (r ?? gap / 2) / k + tension * 2.6;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ overflow: "visible", transform: `scale(${bounce}) rotate(${rot}deg)`, filter: `drop-shadow(0 0 ${size * 0.12}px rgba(143,211,255,${glow * 0.55}))` }}>
      <defs>
        <linearGradient id="cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#cfd3da" /></linearGradient>
        <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bfe6ff" stopOpacity=".95" /><stop offset=".55" stopColor="#8fd3ff" stopOpacity=".7" /><stop offset="1" stopColor="#8fd3ff" stopOpacity=".85" /></linearGradient>
        <linearGradient id="cr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".5" stopColor="#8fd3ff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity=".8" /></linearGradient>
        <linearGradient id="ch" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".9" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="cc"><circle cx="12" cy="12" r="10" /></clipPath>
      </defs>
      <path d={LEFT} fill="url(#cs)" opacity={lo} transform={`translate(${-offL + 0.2} 0)`} />
      <g transform={`translate(${offR - 0.2} 0)`} opacity={ro}>
        <path d={RIGHT} fill="url(#cg)" />
        <path d="M12 2.3A9.7 9.7 0 0 1 12 21.7" fill="none" stroke="url(#cr)" strokeWidth=".6" />
      </g>
      <circle cx="12" cy="12" r="9.8" fill="none" stroke="url(#cr)" strokeWidth=".45" opacity={ring} />
      {sweep >= 0 && sweep < 1 && (
        <g clipPath="url(#cc)"><g transform="rotate(22 12 12)"><rect x={-10 + sweep * 44} y="-4" width="5" height="32" fill="url(#ch)" opacity={1 - lerp(sweep, [0.7, 1])} /></g></g>
      )}
    </svg>
  );
}

/** the light that bursts when the halves meet: flash, shockwave rings, sparks */
export function Burst({ s, x = 960, y = 540, scale = 1 }: { s: number; x?: number; y?: number; scale?: number }) {
  if (s < 0 || s > 1.6) return null;
  const flash = lerp(s, [0, 0.4], [1, 0], Easing.out(Easing.quad));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `radial-gradient(${900 * scale}px ${900 * scale}px at ${x}px ${y}px, rgba(220,242,255,${0.85 * flash}), rgba(143,211,255,${0.35 * flash}) 35%, transparent 70%)`, mixBlendMode: "screen" }} />
      {[0, 0.09].map((d, i) => {
        const p = lerp(s, [d, d + 0.9], [0, 1], Easing.out(Easing.cubic));
        const r = (60 + p * 760) * scale;
        return <div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: "50%", border: `${(i ? 2 : 4) * (1 - p) + 1}px solid rgba(143,211,255,${(1 - p) * (i ? 0.5 : 0.85)})`, boxShadow: `0 0 ${40 * (1 - p)}px rgba(143,211,255,${0.6 * (1 - p)})` }} />;
      })}
      {Array.from({ length: 28 }, (_, i) => {
        const a = random(`a${i}`) * Math.PI * 2, v = 260 + random(`v${i}`) * 520, p = lerp(s, [0, 1.1], [0, 1], Easing.out(Easing.cubic));
        const sz = 3 + random(`s${i}`) * 6;
        return <div key={i} style={{ position: "absolute", left: x + Math.cos(a) * v * p * scale, top: y + Math.sin(a) * v * p * scale, width: sz, height: sz, borderRadius: 9, background: i % 3 ? C.safe : "#fff", opacity: (1 - p) * 0.9, boxShadow: `0 0 12px ${C.safe}` }} />;
      })}
    </AbsoluteFill>
  );
}
/** camera shake after an impact */
export const shake = (s: number, amp = 14) => (s < 0 || s > 0.45 ? [0, 0] : [Math.sin(s * 90) * amp * (1 - s / 0.45), Math.cos(s * 73) * amp * 0.7 * (1 - s / 0.45)]);

/* ---------- type ---------- */
export const glacier: React.CSSProperties = { background: `linear-gradient(100deg, ${C.ink} 0%, ${C.safe} 45%, ${C.violet} 100%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 0 28px rgba(143,211,255,.25))" };
export const eyebrow: React.CSSProperties = { fontFamily: F.mono, fontSize: 20, letterSpacing: "0.14em", textTransform: "uppercase", color: C.mute };

/** words rise in as they're spoken (pass times), or staggered from `at` */
export function Words({ t, text, at = 0, times, size, color = C.ink, grad, weight = 500, stagger = 0.07, style, out }: { t: number; text: string; at?: number; times?: number[]; size: number; color?: string; grad?: boolean; weight?: number; stagger?: number; style?: React.CSSProperties; out?: number }) {
  const words = text.split(" ");
  const gone = out === undefined ? 0 : lerp(t, [out, out + 0.3]);
  return (
    <div style={{ fontFamily: F.display, fontSize: size, fontWeight: weight, letterSpacing: "-0.035em", lineHeight: 1.02, color, opacity: 1 - gone, filter: gone ? `blur(${gone * 12}px)` : undefined, ...style }}>
      {words.map((w, i) => {
        const a = (times?.[i] ?? at + i * stagger) - 0.06;
        const p = spr(t, a, SPR.smooth), o = lerp(t, [a, a + 0.22]);
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", transform: `translateY(${(1 - p) * 0.45}em)`, opacity: o, filter: o < 1 ? `blur(${(1 - o) * 10}px)` : undefined, ...(grad ? { ...glacier, backgroundSize: "220% 100%", backgroundPosition: `${50 + Math.sin(t * 0.9 + i * 0.5) * 50}% 0` } : {}) }}>
            {w}{i < words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
}
/** a spoken sentence, word-synced */
export function Say({ t, id, i, size, grad, color, style, out, weight }: { t: number; id: string; i: number; size: number; grad?: boolean; color?: string; style?: React.CSSProperties; out?: number; weight?: number }) {
  const p = P(id, i);
  const words = V(id).words.filter((w) => w.start >= p.start - 0.001 && w.end <= p.end + 0.001);
  return <Words t={t} text={p.text} times={words.map((w) => w.start)} size={size} grad={grad} color={color} style={style} out={out} weight={weight} />;
}

export function Chip({ children, style, tone = "safe" }: { children: React.ReactNode; style?: React.CSSProperties; tone?: "safe" | "mute" | "danger" }) {
  const c = tone === "safe" ? C.safe : tone === "danger" ? C.danger : C.mute;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 22px", borderRadius: 999, border: `1px solid ${c}55`, background: `${c}14`, color: c, fontFamily: F.mono, fontSize: 19, letterSpacing: "0.1em", textTransform: "uppercase", backdropFilter: "blur(12px)", ...style }}>
      <span style={{ width: 9, height: 9, borderRadius: 9, background: c, boxShadow: `0 0 12px ${c}` }} />
      {children}
    </div>
  );
}

/* ---------- the phone: real screenshots behind an iPhone frame ---------- */
const SB = 50; // status bar, in logical px of a 393×852 screen
export type Layer = { src: string; o: number; scale?: number; origin?: string };
export function Phone({ w, layers, airplane, glow = 0.4, children, time = "9:41" }: { w: number; layers: Layer[]; airplane?: boolean; glow?: number; children?: React.ReactNode; time?: string }) {
  const k = w / 393, h = 852 * k, bez = 12 * k, R = 62 * k;
  const top = layers.find((l) => l.o > 0.01)?.src ?? layers[0].src;
  return (
    <div style={{ width: w + bez * 2, height: h + bez * 2, borderRadius: R + bez, padding: 3 * k, background: "linear-gradient(145deg,#5b626c,#1b1e23 32%,#2e333a 58%,#121417 80%,#454b54)", boxShadow: `0 ${50 * k}px ${140 * k}px rgba(0,0,0,.65), 0 0 ${120 * k}px rgba(143,211,255,${glow * 0.35})`, position: "relative" }}>
      <div style={{ width: "100%", height: "100%", borderRadius: R + bez - 3 * k, background: "#030405", padding: bez - 3 * k }}>
        <div style={{ position: "relative", width: w, height: h, borderRadius: R, overflow: "hidden", background: C.bg }}>
          {/* the app's own top light continues under the status bar */}
          <Img src={staticFile(`shots/${top}`)} style={{ position: "absolute", left: 0, top: 0, width: w, height: h, filter: "blur(18px)", transform: "scale(1.1)", opacity: 0.9 }} />
          {layers.map((l, i) =>
            l.o > 0.001 ? (
              <div key={i} style={{ position: "absolute", left: 0, top: SB * k, width: w, height: h - SB * k, overflow: "hidden", opacity: l.o, WebkitMaskImage: `linear-gradient(transparent, #000 ${14 * k}px)` }}>
                <div style={{ transform: `scale(${l.scale ?? 1})`, transformOrigin: l.origin ?? "50% 40%" }}>
                  <Img src={staticFile(`shots/${l.src}`)} style={{ width: w, height: h, display: "block" }} />
                </div>
              </div>
            ) : null,
          )}
          {children}
          {/* status bar + island */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: SB * k, display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${4 * k}px ${34 * k}px 0`, color: "#fff", fontFamily: F.text, fontWeight: 600, fontSize: 16 * k }}>
            <span>{time}</span>
            <span style={{ display: "flex", gap: 6 * k, alignItems: "center" }}>
              {airplane ? <Plane size={17 * k} color="#fff" /> : <Bars k={k} />}
              {!airplane && <WifiIcon k={k} />}
              <Battery k={k} />
            </span>
          </div>
          <div style={{ position: "absolute", left: (w - 122 * k) / 2, top: 11 * k, width: 122 * k, height: 35 * k, borderRadius: 20 * k, background: "#000" }} />
          {/* glass reflection */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,.09) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 70%, rgba(255,255,255,.04) 100%)", pointerEvents: "none" }} />
        </div>
      </div>
    </div>
  );
}
const Bars = ({ k }: { k: number }) => (
  <svg width={18 * k} height={12 * k} viewBox="0 0 18 12">{[0, 1, 2, 3].map((i) => <rect key={i} x={i * 4.7} y={9 - i * 3} width="3.4" height={3 + i * 3} rx="1" fill="#fff" />)}</svg>
);
const WifiIcon = ({ k }: { k: number }) => (
  <svg width={16 * k} height={12 * k} viewBox="0 0 16 12"><path d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.5 6.9a6.4 6.4 0 0 1 9 0L11.1 8.3a4.4 4.4 0 0 0-6.2 0zM1.3 4.7a9.5 9.5 0 0 1 13.4 0l-1.4 1.4a7.5 7.5 0 0 0-10.6 0z" fill="#fff" /></svg>
);
const Battery = ({ k }: { k: number }) => (
  <svg width={27 * k} height={13 * k} viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="#fff" strokeOpacity=".4" /><rect x="2" y="2" width="20" height="9" rx="2" fill="#fff" /><rect x="25" y="4.5" width="1.6" height="4" rx=".8" fill="#fff" fillOpacity=".4" /></svg>
);
export const Plane = ({ size, color = C.safe }: { size: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /></svg>
);

/** a 3D stage for a phone: position, tilt, entrance */
export function Stage({ x, y, rx = 0, ry = 0, rz = 0, s = 1, o = 1, blur = 0, children }: { x: number; y: number; rx?: number; ry?: number; rz?: number; s?: number; o?: number; blur?: number; children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", perspective: 2600, opacity: o, filter: blur > 0.2 ? `blur(${blur}px)` : undefined }}>
      <div style={{ transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`, transformStyle: "preserve-3d" }}>{children}</div>
    </div>
  );
}
