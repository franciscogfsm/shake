// SHAKE · the 45-second film. Every moment is placed on the voice (src/vo.json) and the score's hits (src/music.json),
// so re-voicing a line re-times the cut. Phone screens are real captures from shake-lake.vercel.app (scripts/shots.cjs).
// Money is always written the Portuguese way: "400 €".
import React from "react";
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Burst, C, Chip, Coin, F, FPS, Grain, HIT, LINES, P, Phone, Plane, SPR, Stage, TOTAL, W, Words, eyebrow, lerp, easeIn, sec, shake, spr, win, type Layer } from "./kit";
import sfx from "./sfx.json";
import music from "./music.json";

const io = Easing.inOut(Easing.cubic);
const EUR = (n: string) => `${n} €`;

/** crossfade a list of [time, screenshot] cuts */
const cuts = (t: number, list: [number, string][], fade = 0.14): Layer[] =>
  list.map(([at, src], i) => {
    const next = list[i + 1]?.[0];
    const shown = i === 0 ? 1 : lerp(t, [at, at + fade]);
    return { src, o: next !== undefined && t > next + fade ? 0 : shown }; // later cuts stack on top, so hide one only once the next is fully in
  });

/** a shot: glides in from the right and out to the left, like one camera panning through the story */
function Shot({ t, a, b, children, fin = 0.45, fout = 0.4, pan = 160 }: { t: number; a: number; b: number; children: React.ReactNode; fin?: number; fout?: number; pan?: number }) {
  if (t < a - 0.02 || t > b + 0.02) return null;
  const i = lerp(t, [a, a + fin], [0, 1], io), o = lerp(t, [b - fout, b], [0, 1], io);
  return (
    <AbsoluteFill style={{ opacity: Math.min(i * 1.4, 1 - o), transform: `translateX(${(1 - i) * pan - o * pan}px) scale(${1.015 + (t - a) * 0.004})`, filter: i < 1 || o > 0 ? `blur(${(1 - i) * 10 + o * 10}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  );
}

type Tone = "ink" | "ink2" | "mute" | "grad";
/** a two-tone headline: each part rises in on its own word */
function Head({ t, parts, size, out, align = "left", style, gap = 0 }: { t: number; parts: [string, number, Tone?][]; size: number; out?: number; align?: "left" | "center"; style?: React.CSSProperties; gap?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap, alignItems: align === "center" ? "center" : "flex-start", textAlign: align, ...style }}>
      {parts.map(([text, at, tone = "ink"], i) => (
        <Words key={i} t={t} text={text} at={at - 0.08} stagger={0.055} size={size} grad={tone === "grad"} color={tone === "mute" ? C.mute : tone === "ink2" ? C.ink2 : C.ink} out={out} />
      ))}
    </div>
  );
}

/** the little feature name, bottom-left, like a product film's lower third */
function Label({ t, a, b, children }: { t: number; a: number; b: number; children: React.ReactNode }) {
  const o = win(t, a, b, 0.3, 0.25), p = spr(t, a, SPR.smooth);
  return (
    <div style={{ position: "absolute", left: 72, bottom: 62, opacity: o, transform: `translateY(${(1 - p) * 18}px)`, display: "flex", alignItems: "center", gap: 14, padding: "13px 22px 13px 18px", borderRadius: 999, background: "rgba(255,255,255,.055)", border: `1px solid ${C.line}`, backdropFilter: "blur(14px)", fontFamily: F.text, fontSize: 22, color: C.ink2, letterSpacing: "-0.01em" }}>
      <span style={{ width: 9, height: 9, borderRadius: 9, background: C.safe, boxShadow: `0 0 12px ${C.safe}` }} />
      {children}
    </div>
  );
}
const Rise = ({ t, at, children, style }: { t: number; at: number; children: React.ReactNode; style?: React.CSSProperties }) => {
  const p = spr(t, at), o = lerp(t, [at, at + 0.25]);
  return <div style={{ opacity: o, transform: `translateY(${(1 - p) * 30}px)`, ...style }}>{children}</div>;
};

/* ───────── 1 · Sam, a bike, a stranger. Who pays first? ───────── */
const SAM = { x: 400, y: 520 }, ANA = { x: 1520, y: 520 }, CARD = { x: 960, y: 500 }, R = 96;

function Avatar({ x, y, letter, tone, o = 1, s = 1, lit = 0 }: { x: number; y: number; letter: string; tone: "sam" | "ana"; o?: number; s?: number; lit?: number }) {
  return (
    <div style={{ position: "absolute", left: x - R, top: y - R, width: R * 2, height: R * 2, borderRadius: "50%", opacity: o, transform: `scale(${s})`, background: tone === "sam" ? "linear-gradient(150deg,#ffffff,#c9ced6)" : "linear-gradient(150deg,#d9f0ff,#8fd3ff)", display: "grid", placeItems: "center", fontFamily: F.display, fontWeight: 700, fontSize: 88, letterSpacing: "-0.04em", color: C.bg, boxShadow: `0 0 0 7px rgba(255,255,255,.05), 0 0 ${60 + lit * 60}px rgba(143,211,255,${0.22 + lit * 0.4}), inset 0 -10px 24px rgba(0,0,0,.14)` }}>
      {letter}
    </div>
  );
}

/** a city bike that draws itself (p: 0 → 1) */
const BIKE = [
  "M25 170a55 55 0 1 0 110 0a55 55 0 1 0 -110 0", "M245 170a55 55 0 1 0 110 0a55 55 0 1 0 -110 0",
  "M80 170L185 170L262 85", "M80 170L150 85L185 170", "M150 85L262 85L300 170", "M150 85L143 60M124 58H166", "M262 85L256 56L288 50", "M175 170a10 10 0 1 0 20 0a10 10 0 1 0 -20 0",
];
function Bike({ p, w = 340, color = C.safe, dim = 0 }: { p: number; w?: number; color?: string; dim?: number }) {
  return (
    <svg width={w} height={(w * 240) / 380} viewBox="0 0 380 240" fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: "visible", filter: `drop-shadow(0 0 14px rgba(143,211,255,${0.45 * (1 - dim)}))`, opacity: 1 - dim * 0.6 }}>
      {BIKE.map((d, i) => {
        const q = Math.min(1, Math.max(0, p * BIKE.length - i));
        return q > 0 ? <path key={i} d={d} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - q} /> : null;
      })}
    </svg>
  );
}

function MoneyChip({ x, y, o = 1, s = 1, blur = 0 }: { x: number; y: number; o?: number; s?: number; blur?: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${s})`, opacity: o, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, display: "flex", alignItems: "center", gap: 12, padding: "12px 24px 12px 14px", borderRadius: 999, background: "rgba(22,27,34,.9)", border: `1px solid ${C.safe}66`, boxShadow: `0 0 44px rgba(143,211,255,.3)`, fontFamily: F.display, fontWeight: 500, fontSize: 36, letterSpacing: "-0.03em", color: C.ink, whiteSpace: "nowrap" }}>
      <Coin size={36} glow={0.3} />{EUR("400")}
    </div>
  );
}

function Intro({ t }: { t: number }) {
  const meet = W("intro", "Meet"), he = W("intro", "He"), stranger = W("intro", "stranger");
  const who = W("problem", "who") - 0.15, up = W("problem", "upfront"), never = W("problem", "never");
  const ana = W("problem", "Ana") - 0.35, fake = W("problem", "fake"), before = P("problem", 3).end;
  const so = W("turn", "So"), shk = W("turn", "shake"), hit = HIT.shake;
  const s = t - hit;
  const [sx, sy] = shake(s, 20);

  // Ana's side of the story: the camera turns to her
  const focus = lerp(t, [ana, ana + 0.7], [0, 1], io) * (1 - lerp(t, [so - 0.45, so + 0.15], [0, 1], io));
  const samIn = spr(t, meet - 0.12, { stiffness: 170, damping: 17 }), anaIn = spr(t, W("intro", "from") - 0.05, { stiffness: 170, damping: 17 });
  const anaX = ANA.x + (560 - ANA.x) * focus;
  // the two of them become the two halves, and meet
  const morph = lerp(t, [shk - 0.2, shk + 0.05]);
  const rush = lerp(t, [shk - 0.05, hit], [0, 1], easeIn);
  const S = 270, half = SAM.x - 960 + S * 0.18;
  const leave = lerp(t, [W("flow", "Sam") - 0.7, W("flow", "Sam") - 0.15], [0, 1], io);

  // the listing
  const cardP = spr(t, he - 0.2, { stiffness: 150, damping: 22 });
  const draw = lerp(t, [he - 0.05, he + 1.5], [0, 1], Easing.inOut(Easing.quad));
  const gone = lerp(t, [never - 0.15, never + 0.5], [0, 1], io);
  const cardO = lerp(t, [he - 0.2, he + 0.15]) * (1 - focus) * (1 - lerp(t, [so - 0.45, so]));
  // the money: who goes first? Sam pays upfront… and the bike never shows
  const chipP = spr(t, who, SPR.snappy);
  const fly = lerp(t, [up - 0.05, up + 0.6], [0, 1], io);
  const chip = (q: number) => ({ x: 612 + (CARD.x - 612) * q, y: SAM.y + 10 + (CARD.y - 60 - SAM.y - 10) * q - Math.sin(Math.PI * q) * 190 });
  const wobble = Math.sin((t - who) * 10) * 9 * (1 - fly) * lerp(t, [who, who + 0.3]) * (1 - lerp(t, [up - 0.3, up]));
  const swallowed = lerp(t, [up + 0.48, up + 0.62]);
  const names = (1 - morph) * (1 - lerp(t, [so - 0.2, so + 0.1], [0, 0.4]));

  // the opening shot: close on Sam, pulling back (and into focus) to reveal the deal
  const dolly = interpolate(t, [0.2, 3.2], [1.45, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const focusPull = lerp(t, [0.3, 1.4], [7, 0]);
  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${dolly})`, transformOrigin: `${SAM.x + 120}px ${SAM.y}px`, filter: focusPull > 0.2 ? `blur(${focusPull}px)` : undefined }}>
      {/* who pays first? */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 108, display: "flex", justifyContent: "center", opacity: 1 - lerp(t, [ana - 0.1, ana + 0.3]) }}>
        <Head t={t} size={96} align="center" parts={[["Who pays first?", who]]} />
      </div>

      {/* the listing Sam found */}
      <div style={{ position: "absolute", left: CARD.x - 230, top: CARD.y - 245, width: 460, opacity: cardO, transform: `translateY(${(1 - cardP) * 70}px) scale(${0.94 + cardP * 0.06})` }}>
        <div style={{ borderRadius: 34, overflow: "hidden", background: "linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.03))", border: `1.5px ${gone > 0.5 ? "dashed" : "solid"} rgba(255,255,255,${0.14 - gone * 0.04})`, boxShadow: `0 40px 120px rgba(0,0,0,.55), 0 0 ${80 * lerp(t, [up + 0.5, up + 0.6]) * (1 - gone)}px rgba(143,211,255,.35)`, backdropFilter: "blur(20px)" }}>
          <div style={{ position: "relative", height: 270, display: "grid", placeItems: "center", background: "radial-gradient(70% 80% at 50% 60%, rgba(143,211,255,.12), transparent 70%)" }}>
            <Bike p={draw * (1 - gone)} w={330} />
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: F.display, fontWeight: 500, fontSize: 150, color: C.mute, opacity: gone * 0.7, transform: `scale(${0.8 + gone * 0.2})` }}>?</div>
          </div>
          <div style={{ padding: "22px 30px 28px" }}>
            <div style={{ fontFamily: F.text, fontSize: 24, color: C.ink2 }}>City bike · like new</div>
            <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 74, letterSpacing: "-0.05em", color: gone > 0.5 ? C.mute : C.ink, marginTop: 4 }}>
              400<span style={{ fontSize: 50, marginLeft: 8, color: C.ink2 }}>€</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, fontFamily: F.text, fontSize: 19, color: C.mute }}>
              <span style={{ width: 30, height: 30, borderRadius: 30, background: "linear-gradient(150deg,#d9f0ff,#8fd3ff)", display: "grid", placeItems: "center", fontFamily: F.display, fontWeight: 700, fontSize: 15, color: C.bg }}>A</span>
              Ana · no reviews yet
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 22, ...eyebrow, fontSize: 18, opacity: gone }}>The bike never shows</div>
      </div>

      {/* the money, deciding who goes first */}
      {t > who - 0.05 && swallowed < 1 && (
        <>
          {fly > 0.02 && fly < 0.98 && [0.16, 0.11, 0.06].map((d, i) => { const q = chip(Math.max(0, fly - d)); return <MoneyChip key={i} x={q.x} y={q.y} o={0.12 + i * 0.08} s={0.92} blur={6 - i * 2} />; })}
          <MoneyChip x={chip(fly).x + wobble} y={chip(fly).y} o={lerp(t, [who, who + 0.15]) * (1 - swallowed)} s={(0.6 + chipP * 0.4) * (1 - swallowed * 0.5)} />
        </>
      )}

      {/* the fake screenshot Ana has seen before */}
      <FakeShot t={t} a={ana + 0.35} lie={fake} gone={before + 0.15} />

      {/* Sam and Ana */}
      <Avatar x={SAM.x - focus * 260} y={SAM.y} letter="S" tone="sam" o={Math.min(samIn * 1.5, 1) * (1 - focus * 0.92) * (1 - morph)} s={samIn} />
      <Avatar x={anaX} y={ANA.y} letter="A" tone="ana" o={Math.min(anaIn * 1.5, 1) * (1 - morph)} s={anaIn} lit={focus} />
      <div style={{ position: "absolute", left: SAM.x - 200 - focus * 260, width: 400, top: SAM.y + R + 30, textAlign: "center", opacity: names * (1 - focus * 0.92) }}>
        <Words t={t} text="Sam" at={meet} size={64} weight={700} />
        <Rise t={t} at={meet + 0.2}><div style={{ ...eyebrow, marginTop: 12 }}>Buying</div></Rise>
      </div>
      <div style={{ position: "absolute", left: anaX - 220, width: 440, top: ANA.y + R + 30, textAlign: "center", opacity: names }}>
        <Words t={t} text="Ana" at={W("intro", "from")} size={64} weight={700} />
        <Rise t={t} at={stranger}><div style={{ ...eyebrow, marginTop: 12, color: C.safe }}>A total stranger</div></Rise>
      </div>

      {/* …and they shake on it */}
      {morph > 0 && (
        <div style={{ position: "absolute", left: 960 - S / 2, top: 520 - S / 2 - leave * 160, opacity: 1 - leave, transform: `scale(${1 - leave * 0.3})`, filter: rush > 0.55 && s < 0 ? `blur(${(rush - 0.55) * 9}px)` : undefined }}>
          <Coin size={S} l={half * (1 - rush)} r={-half * (1 - rush)} lo={morph} ro={morph} shut={s >= 0 ? s : undefined} glow={s >= 0 ? 0.95 : 0.45} />
        </div>
      )}
      <Burst s={s} x={960} y={520} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 520 + S / 2 + 46 - leave * 160, display: "flex", justifyContent: "center", opacity: 1 - leave }}>
        {"SHAKE".split("").map((ch, i) => {
          const a = hit + 0.14 + i * 0.045, p = spr(t, a, SPR.snappy), o = lerp(t, [a, a + 0.18]);
          return <span key={i} style={{ fontFamily: F.display, fontWeight: 700, fontSize: 68, letterSpacing: "0.32em", marginRight: "-0.32em", color: C.ink, opacity: o, transform: `translateY(${(1 - p) * 40}px)`, display: "inline-block" }}>{ch}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
}

/** a bank-app "Transfer complete ✓" screenshot, torn apart by a glitch: screenshots lie */
function FakeShot({ t, a, lie, gone }: { t: number; a: number; lie: number; gone: number }) {
  if (t < a || t > gone + 0.6) return null;
  const inn = spr(t, a, { stiffness: 190, damping: 20 });
  const out = lerp(t, [gone, gone + 0.5], [0, 1], easeIn);
  const g = t >= lie && t < gone ? 1 : 0;
  const f = Math.floor(t * FPS);
  const jit = (n: number) => (g ? (Math.sin(f * 12.9898 + n * 78.233) * 43758.5453) % 1 : 0);
  const card = (filter?: string) => (
    <div style={{ width: 300, borderRadius: 26, border: "1px solid rgba(255,255,255,.1)", background: "#15181d", padding: 24, filter }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.text, fontSize: 11, color: C.mute }}><span>Bank app</span><span>14:02</span></div>
      <div style={{ margin: "24px auto 0", width: 48, height: 48, borderRadius: 48, display: "grid", placeItems: "center", background: "rgba(52,211,153,.15)", color: "#6ee7b7", fontSize: 22 }}>✓</div>
      <div style={{ marginTop: 16, textAlign: "center", fontFamily: F.text, fontSize: 13, color: C.ink2 }}>Transfer complete</div>
      <div style={{ marginTop: 4, textAlign: "center", fontFamily: F.display, fontWeight: 500, fontSize: 46, letterSpacing: "-0.05em", color: C.ink }}>400,00 €</div>
      <div style={{ marginTop: 4, textAlign: "center", fontFamily: F.text, fontSize: 13, color: C.mute }}>to Ana R. · ref 88213</div>
      <div style={{ marginTop: 24, borderRadius: 12, background: "rgba(255,255,255,.04)", padding: "10px 12px", fontFamily: F.text, fontSize: 12, color: C.ink2 }}>“Paid ✅ send the bike pls”</div>
    </div>
  );
  const stamp = spr(t, lie + 0.1, SPR.slam);
  return (
    <div style={{ position: "absolute", left: 1210, top: 480, transform: `translate(-50%, -50%) translateY(${(1 - inn) * 420 + out * 460}px) rotate(${-5 + (1 - inn) * -12 + out * 16}deg) scale(1.75)`, opacity: Math.min(inn * 1.5, 1) * (1 - out) }}>
      <div style={{ position: "relative" }}>
        {g ? (
          <>
            <div style={{ position: "absolute", inset: 0, transform: `translateX(${-8 + jit(1) * 10}px)`, mixBlendMode: "screen", opacity: 0.7 }}>{card("hue-rotate(-60deg) saturate(3)")}</div>
            <div style={{ position: "absolute", inset: 0, transform: `translateX(${7 + jit(2) * 10}px)`, mixBlendMode: "screen", opacity: 0.7 }}>{card("hue-rotate(150deg) saturate(3)")}</div>
          </>
        ) : null}
        <div style={{ transform: `translateX(${jit(3) * 6}px) skewX(${jit(4) * 6}deg)` }}>{card(g ? "saturate(.4) brightness(.85)" : undefined)}</div>
        {g
          ? [0.18, 0.41, 0.66, 0.83].map((y, i) => (
              <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${y * 100}%`, height: 8 + Math.abs(jit(i + 9)) * 22, overflow: "hidden", transform: `translateX(${jit(i + 5) * 46}px)`, opacity: 0.85 }}>
                <div style={{ transform: `translateY(-${y * 100}%)`, height: 430 }}>{card()}</div>
              </div>
            ))
          : null}
        {t >= lie + 0.1 && (
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%, -50%) rotate(-12deg) scale(${2.2 - stamp * 1.2})`, opacity: lerp(t, [lie + 0.1, lie + 0.18]), border: `3px solid ${C.danger}`, borderRadius: 12, padding: "8px 22px", fontFamily: F.mono, fontWeight: 700, fontSize: 34, letterSpacing: "0.18em", color: C.danger, background: "rgba(13,15,18,.6)", whiteSpace: "nowrap", boxShadow: `0 0 30px rgba(255,69,58,.35)` }}>
            FAKE
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── 2 · lock → Ana sees it → they meet → paid. One continuous camera, real screens. ───────── */
function Flow({ t }: { t: number }) {
  const a = W("flow", "Sam") - 0.5, tap = W("flow", "tap") - 0.12;
  const ana = W("flow", "Ana") - 0.32, real = W("flow", "real"), locked = W("flow", "locked");
  const meet = W("flow", "They") - 0.3, scans = W("flow", "scans"), her = W("flow", "her") - 0.05;
  const hold = P("flow", 2).end - 0.12, paid = HIT.paid;
  const s = t - paid;
  const [sx, sy] = shake(s, 16);
  const rise = spr(t, a, { stiffness: 110, damping: 20 });
  const away = lerp(t, [ana, ana + 0.75], [0, 1], io), back = lerp(t, [meet, meet + 0.8], [0, 1], io);
  const samX = 720 - 1080 * away + 1050 * back, phoneY = 560 + 60 * back, samY = phoneY + (1 - rise) * 820;
  const anaX = 2300 - 1080 * lerp(t, [ana, ana + 0.75], [0, 1], io) + 20 * back;
  const k = 420 / 393;
  // overlays are in the phone's own pixels, then shifted by the status bar the frame draws on top
  const tapAt = { x: 107, y: 520 + 50 }; // Apple Pay, measured on d-pay.png
  const holdAt = { x: 199, y: 557 + 50 }; // the coin, measured on the hold frames
  // Sam's phone faces Ana's while it scans, then turns back so we see him hold
  const turn = spr(t, her, { stiffness: 150, damping: 24 });
  const samRy = 13 * (1 - back) + back * (t < her ? 34 : 34 - turn * 26);
  const anaRy = -13 - back * 10;
  const tension = lerp(t, [hold, paid]);
  const push = 1 + lerp(t, [meet + 0.6, paid], [0, 0.06], Easing.inOut(Easing.quad)) - (s > 0 ? lerp(s, [0, 0.7], [0, 0.06]) : 0);
  const midX = (samX + anaX) / 2;
  const scale = 1 - 0.2 * back;
  const beam = win(t, scans - 0.15, her + 0.05, 0.15, 0.2);
  const sweep = ((t - scans + 0.15) / 0.55) % 1;
  const press = lerp(t, [tap - 0.18, tap - 0.04]) * (1 - lerp(t, [tap + 0.12, tap + 0.3]));
  const ripple = lerp(t, [tap, tap + 0.5]);
  const flash = s >= 0 ? lerp(s, [0, 0.35], [0.7, 0]) : 0;
  const qr = { l: 55 * k, t: (412 + 50) * k, w: 282 * k, h: 272 * k }; // the white code on d-qr.png

  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
      {/* 2a · Sam locks */}
      <div style={{ position: "absolute", left: 1120, top: 540, transform: `translate(${-away * 900}px, -50%)`, opacity: lerp(t, [a + 0.2, a + 0.5]) * (1 - lerp(t, [ana, ana + 0.4])) }}>
        <Rise t={t} at={a + 0.3}><div style={{ ...eyebrow, color: C.safe, marginBottom: 22 }}>Sam · buying</div></Rise>
        <Head t={t} size={104} parts={[[`Locks ${EUR("400")}`, W("flow", "locks")], ["in one tap.", W("flow", "one"), "grad"]]} />
        <Rise t={t} at={tap + 0.35} style={{ marginTop: 34, fontFamily: F.text, fontSize: 28, color: C.ink2 }}>No sign-up. No app to install.</Rise>
      </div>
      {/* 2b · Ana sees it */}
      <div style={{ position: "absolute", left: 150, top: 540, transform: `translate(${(1 - lerp(t, [ana, ana + 0.75], [0, 1], io)) * 900 - back * 900}px, -50%)`, opacity: lerp(t, [ana + 0.2, ana + 0.5]) * (1 - lerp(t, [meet, meet + 0.35])) }}>
        <Rise t={t} at={ana + 0.3}><div style={{ ...eyebrow, color: C.safe, marginBottom: 22 }}>Ana · selling</div></Rise>
        <Head t={t} size={104} parts={[["Sees it's real.", W("flow", "sees")], ["Locked on Stellar.", locked, "grad"]]} />
        <Rise t={t} at={locked + 0.3} style={{ marginTop: 34, fontFamily: F.text, fontSize: 28, color: C.ink2 }}>Real money. Not a screenshot.</Rise>
      </div>
      {/* 2c · they meet */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 34, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 28, zIndex: 2 }}>
        {t < paid - 0.05 ? (
          <>
            <Words t={t} text="They meet." at={W("flow", "They") - 0.08} size={64} out={paid - 0.3} />
            <Words t={t} text="Sam scans." at={scans - 0.1} size={64} color={C.mute} out={paid - 0.3} />
          </>
        ) : (
          <>
            <Words t={t} text="Paid." at={paid + 0.02} size={112} grad weight={500} />
            <Words t={t} text="Only face to face." at={paid + 0.32} size={64} />
          </>
        )}
      </div>

      <div style={{ position: "absolute", inset: 0, transform: `scale(${push})` }}>
        {/* light from Sam's camera to Ana's code */}
        <div style={{ position: "absolute", inset: 0, opacity: beam * 0.75, background: "linear-gradient(90deg, transparent, rgba(143,211,255,.25), transparent)", clipPath: `polygon(${samX + 100}px ${phoneY + 40}px, ${anaX - 140}px ${phoneY + 40 - qr.h * 0.45}px, ${anaX - 140}px ${phoneY + 40 + qr.h * 0.35}px)`, filter: "blur(8px)" }} />
        <Stage x={samX} y={samY} ry={samRy + Math.sin(t * 0.7) * 2} rx={3 + Math.sin(t * 0.5) * 1.2} s={scale}>
          <Phone w={420} glow={0.35 + tension * 0.7} layers={cuts(t, [[a, "d-pay.png"], [tap, "d-picked.png"], [tap + 0.42, "d-locking.png"], [tap + 0.95, "d-locking2.png"], [ana - 0.15, "d-share.png"], [meet, "d-scan0.png"], [her, "d-confirm.png"], [hold, "d-hold0.png"], [hold + 0.25, "d-hold1.png"], [hold + 0.5, "d-hold2.png"], [paid, "d-shaken3.png"]], 0.12)}>
            <div style={{ position: "absolute", left: tapAt.x * k - 36, top: tapAt.y * k - 36, width: 72, height: 72, borderRadius: 72, background: "rgba(255,255,255,.38)", opacity: press, transform: `scale(${0.6 + press * 0.4})` }} />
            {ripple > 0 && ripple < 1 && <div style={{ position: "absolute", left: tapAt.x * k - 95 * ripple, top: tapAt.y * k - 95 * ripple, width: 190 * ripple, height: 190 * ripple, borderRadius: 999, border: `2px solid ${C.safe}`, opacity: 1 - ripple }} />}
            {t > hold - 0.2 && t < paid && <div style={{ position: "absolute", left: holdAt.x * k - 38, top: holdAt.y * k - 38, width: 76, height: 76, borderRadius: 76, background: "rgba(255,255,255,.3)", boxShadow: "0 0 34px rgba(143,211,255,.7)", opacity: lerp(t, [hold - 0.2, hold]) }} />}
            <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} />
          </Phone>
        </Stage>
        <Stage x={anaX} y={phoneY} ry={anaRy} rx={3} s={scale}>
          <Phone w={420} glow={0.35 + lerp(t, [real - 0.1, real + 0.4]) * 0.5 * (1 - back) + (s > 0 ? 0.6 : 0)} layers={cuts(t, [[ana, "d-seller.png"], [meet + 0.15, "d-qr.png"], [paid, "d-seller-paid.png"]], 0.14)}>
            {beam > 0.01 && (
              <div style={{ position: "absolute", left: qr.l, top: qr.t, width: qr.w, height: qr.h, opacity: beam }}>
                {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => (
                  <div key={i} style={{ position: "absolute", [x ? "right" : "left"]: -6, [y ? "bottom" : "top"]: -6, width: 36, height: 36, borderColor: C.safe, borderStyle: "solid", borderWidth: `${y ? 0 : 4}px ${x ? 4 : 0}px ${y ? 4 : 0}px ${x ? 0 : 4}px`, borderRadius: 6, boxShadow: `0 0 16px ${C.safe}` } as React.CSSProperties} />
                ))}
                <div style={{ position: "absolute", left: 0, right: 0, top: `${Math.max(0, sweep) * 100}%`, height: 4, background: C.safe, boxShadow: `0 0 24px 6px rgba(143,211,255,.7)` }} />
              </div>
            )}
            <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: flash }} />
          </Phone>
        </Stage>
        {/* the handshake: the halves pull apart while Sam holds, then slam */}
        <div style={{ position: "absolute", left: midX - 80, top: phoneY + 40 - 80, opacity: lerp(t, [hold - 0.25, hold]) * (1 - lerp(s, [0.9, 1.3])) }}>
          <Coin size={160} gap={t < paid ? 8 + tension * 30 : 0} tension={t < paid ? tension * 0.45 : 0} shut={s >= 0 ? s : undefined} glow={0.4 + tension * 0.6} />
        </div>
        <Burst s={s} x={midX} y={phoneY + 40} scale={1.1} />
      </div>

      <Label t={t} a={tap + 0.5} b={ana + 0.2}>Apple Pay, cards or MB WAY · no account</Label>
      <Label t={t} a={locked + 0.1} b={meet + 0.1}>Read live from the Stellar network</Label>
      <Label t={t} a={paid + 0.4} b={W("more", "No") - 0.3}>Released in about 5 seconds · on-chain receipt</Label>
    </AbsoluteFill>
  );
}

/* ───────── 3 · no signal · inside Vinted and OLX · Claude and ChatGPT ───────── */
function NoSignal({ t }: { t: number }) {
  const a = W("more", "No") - 0.3, still = W("more", "Still") - 0.08;
  const p1 = spr(t, a, { stiffness: 140, damping: 22 }), p2 = spr(t, a + 0.1, { stiffness: 140, damping: 22 });
  return (
    <>
      <div style={{ position: "absolute", left: 150, top: 520, transform: "translateY(-50%)" }}>
        <Rise t={t} at={a + 0.05}><div style={{ marginBottom: 26, width: 96, height: 96, borderRadius: 96, display: "grid", placeItems: "center", border: `1px solid ${C.safe}55`, background: `${C.safe}14`, boxShadow: `0 0 40px rgba(143,211,255,.25)` }}><Plane size={48} /></div></Rise>
        <Head t={t} size={118} parts={[["No signal?", W("more", "No")], ["Still works.", still, "grad"]]} />
      </div>
      <Stage x={1130 + (1 - p1) * 900} y={545} ry={12} rx={3}>
        <Phone w={320} airplane layers={[{ src: "o-half.png", o: 1 }]} glow={0.4} />
      </Stage>
      <Stage x={1550 + (1 - p2) * 900} y={545} ry={-12} rx={3}>
        <Phone w={320} airplane layers={cuts(t, [[a, "o-seller-qr.png"], [still - 0.3, "o-paid0.png"], [still + 0.12, "o-paid1.png"]])} glow={0.4 + lerp(t, [still, still + 0.3]) * 0.5} />
      </Stage>
      <Burst s={(t - still) * 1.3} x={1550} y={500} scale={0.5} />
      <Label t={t} a={still + 0.3} b={W("more", "It's") - 0.1}>Each phone holds half the key · lands on Stellar later</Label>
    </>
  );
}

// Every marketplace the extension reads. Real favicons, sitting under the headline. eBay's favicon is a broken colour bar, so that one is the wordmark.
const MORE: { name: string; file?: string; ebay?: boolean }[] = [
  { name: "Vinted", file: "markets/vinted.png" },
  { name: "OLX", file: "markets/olx.png" },
  { name: "Wallapop", file: "markets/wallapop.png" },
  { name: "Depop", file: "markets/depop.png" },
  { name: "eBay", ebay: true },
  { name: "Etsy", file: "markets/etsy.png" },
  { name: "Gumtree", file: "markets/gumtree.png" },
  { name: "Leboncoin", file: "markets/leboncoin.png" },
  { name: "Marktplaats", file: "markets/marktplaats.png" },
  { name: "Kleinanzeigen", file: "markets/kleinanzeigen.png" },
  { name: "Facebook", file: "markets/facebook.png" },
  { name: "Mercari", file: "markets/mercari.png" },
  { name: "Poshmark", file: "markets/poshmark.png" },
  { name: "OfferUp", file: "markets/offerup.png" },
  { name: "Craigslist", file: "markets/craigslist.png" },
  { name: "Carousell", file: "markets/carousell.png" },
];

/** the SHAKE extension on a listing. The window stays one simple panel; the other markets sit under the title. */
function Extension({ t }: { t: number }) {
  const a = W("more", "It's") - 0.3, vinted = W("more", "Vinted"), olx = W("more", "OLX");
  const p = spr(t, a, { stiffness: 130, damping: 22 });
  const panel = spr(t, vinted - 0.1, { stiffness: 170, damping: 22 });
  const click = olx + 0.35, ripple = lerp(t, [click, click + 0.5]), press = win(t, click - 0.12, click + 0.18, 0.08, 0.12);
  const site = t < olx - 0.05 ? "vinted.pt/items/city-bike" : "olx.pt/d/anuncio/city-bike";
  const swap = win(t, olx - 0.15, olx + 0.05, 0.08, 0.08);
  return (
    <>
      <div style={{ position: "absolute", left: 150, top: 500, transform: "translateY(-50%)" }}>
        <Rise t={t} at={a + 0.1}><div style={{ ...eyebrow, color: C.safe, marginBottom: 22 }}>Browser extension</div></Rise>
        <Head t={t} size={104} parts={[["Right inside", W("more", "right")], ["Vinted & OLX.", vinted, "grad"]]} />
        <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 10, width: 470 }}>
          {MORE.map((m, i) => {
            const inn = spr(t, a + 0.12 + i * 0.03, SPR.snappy);
            const hot = (m.name === "Vinted" && t >= vinted - 0.06 && t < olx - 0.12) || (m.name === "OLX" && t >= olx - 0.06);
            return (
              <div key={m.name} title={m.name} style={{ width: 50, height: 50, borderRadius: 14, overflow: "hidden", display: "grid", placeItems: "center", background: m.ebay ? "#fff" : "transparent", opacity: inn, transform: `translateY(${(1 - inn) * 12}px) scale(${hot ? 1.12 : 1})`, boxShadow: hot ? `0 0 0 2px ${C.safe}, 0 0 22px rgba(143,211,255,.55)` : "0 8px 18px rgba(0,0,0,.28)" }}>
                {m.ebay
                  ? <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 16, letterSpacing: "-0.06em", lineHeight: 1 }}><span style={{ color: "#E53238" }}>e</span><span style={{ color: "#0064D2" }}>b</span><span style={{ color: "#F5AF02" }}>a</span><span style={{ color: "#86B817" }}>y</span></span>
                  : <Img src={staticFile(m.file!)} style={{ width: 50, height: 50, objectFit: "cover" }} />}
              </div>
            );
          })}
        </div>
      </div>
      <Stage x={1330 + (1 - p) * 900} y={545} ry={-9} rx={3}>
        <div style={{ width: 980, borderRadius: 20, overflow: "hidden", background: "#f3f4f6", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 50px 140px rgba(0,0,0,.6), 0 0 90px rgba(143,211,255,.16)", fontFamily: F.text }}>
          <div style={{ height: 50, display: "flex", alignItems: "center", gap: 8, padding: "0 18px", background: "#1b1e23" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => <i key={c} style={{ width: 12, height: 12, borderRadius: 12, background: c }} />)}
            <div style={{ marginLeft: 18, flex: 1, height: 30, borderRadius: 8, background: "rgba(255,255,255,.08)", display: "flex", alignItems: "center", padding: "0 14px", fontSize: 15, color: C.ink2, opacity: 1 - swap }}>{site}</div>
            <div style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(143,211,255,.18)", boxShadow: `0 0 ${18 * panel}px rgba(143,211,255,.5)` }}><Coin size={20} gap={1} glow={0.2} /></div>
          </div>
          <div style={{ position: "relative", height: 560, padding: 34, display: "flex", gap: 30 }}>
            <div style={{ width: 400, borderRadius: 16, background: "#e7e9ee", display: "grid", placeItems: "center" }}><Bike p={1} w={300} color="#334155" dim={0} /></div>
            <div style={{ flex: 1, color: "#0f172a" }}>
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>City bike · like new</div>
              <div style={{ fontSize: 26, marginTop: 8, color: "#334155" }}>{EUR("400")}</div>
              {[260, 220, 240].map((w, i) => <div key={i} style={{ width: w, height: 12, borderRadius: 6, background: "#d5d9e0", marginTop: i ? 12 : 26 }} />)}
              <div style={{ marginTop: 30, width: 190, height: 46, borderRadius: 12, background: "#cfd5de" }} />
            </div>
            <div style={{ position: "absolute", right: 22, top: 22, width: 360, borderRadius: 24, padding: 24, background: "linear-gradient(180deg,#1d2228,#12151a)", border: "1px solid rgba(255,255,255,.12)", boxShadow: "0 30px 80px rgba(0,0,0,.45)", transform: `translateX(${(1 - panel) * 420}px)`, opacity: Math.min(panel * 1.4, 1) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.display, fontWeight: 700, fontSize: 15, letterSpacing: "0.2em", color: C.ink }}><Coin size={22} gap={1} glow={0.2} />SHAKE</span>
                <span style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.1em", color: C.safe, border: `1px solid ${C.safe}55`, borderRadius: 999, padding: "4px 10px" }}>TESTNET</span>
              </div>
              <div style={{ marginTop: 22, fontFamily: F.display, fontWeight: 500, fontSize: 34, letterSpacing: "-0.03em", lineHeight: 1.05, color: C.ink }}>Found it?<br /><span style={{ color: C.safe }}>Shake on it.</span></div>
              <div style={{ marginTop: 10, fontSize: 14, color: C.mute }}>Review the listing. Lock the agreed amount in SHAKE.</div>
              {[["What are you buying?", "City bike"], ["Agreed price", EUR("400")]].map(([k, v]) => (
                <div key={k} style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: C.mute }}>{k}</div>
                  <div style={{ marginTop: 6, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.04)", padding: "11px 14px", fontSize: 17, color: C.ink }}>{v}</div>
                </div>
              ))}
              <div style={{ position: "relative", marginTop: 20, borderRadius: 999, padding: "14px 0", textAlign: "center", fontSize: 16, fontWeight: 600, color: "#0b0c0e", background: "linear-gradient(90deg,#bfe6ff,#8fd3ff)", boxShadow: `0 0 ${30 * press}px rgba(143,211,255,.8)`, transform: `scale(${1 - press * 0.04})` }}>
                Continue in SHAKE →
                {ripple > 0 && ripple < 1 && <div style={{ position: "absolute", left: "50%", top: "50%", width: 260 * ripple, height: 260 * ripple, transform: "translate(-50%,-50%)", borderRadius: 999, border: `2px solid ${C.safe}`, opacity: 1 - ripple }} />}
              </div>
              <div style={{ marginTop: 14, textAlign: "center", fontFamily: F.mono, fontSize: 11, letterSpacing: "0.08em", color: C.mute }}>01 Lock · 02 Inspect · 03 Shake</div>
            </div>
          </div>
        </div>
      </Stage>
      <Label t={t} a={olx + 0.15} b={W("more", "Claude") - 0.2}>Chrome & Edge · the same extension</Label>
    </>
  );
}

type Beat = { at: number; k: "you" | "tool" | "shake"; text: string; refused?: boolean; link?: boolean };
/** Claude or ChatGPT with the SHAKE MCP server: it does the work, never the money (same story as /ai) */
function Ai({ t }: { t: number }) {
  const a = W("more", "Claude") - 0.4, p = spr(t, a, { stiffness: 130, damping: 22 });
  const ask = W("more", "but") - 0.35, refuse = W("more", "touch") - 0.1;
  const beats: Beat[] = [
    { at: a + 0.35, k: "you", text: `Buying a bike from a stranger on OLX, ${EUR("400")}. Make it safe.` },
    { at: a + 1.05, k: "tool", text: "create_deal" },
    { at: a + 1.45, k: "shake", text: "Done. Lock it here. It only releases when you two meet.", link: true },
    { at: ask, k: "you", text: "Now send her the money." },
    { at: ask + 0.45, k: "tool", text: "release_payment", refused: true },
    { at: refuse, k: "shake", text: "I can’t. Nobody can. Only your phone, scanning her QR, face to face.", refused: true },
  ];
  const locked = t >= ask - 0.3, refused = t >= refuse;
  const nudge = refused ? Math.sin((t - refuse) * 60) * 9 * (1 - lerp(t, [refuse, refuse + 0.45])) : 0;
  return (
    <>
      <div style={{ position: "absolute", left: 150, top: 520, width: 760, transform: "translateY(-50%)" }}>
        <Rise t={t} at={a + 0.1}><div style={{ ...eyebrow, color: C.safe, marginBottom: 22 }}>MCP server · Claude · ChatGPT</div></Rise>
        <Head t={t} size={96} parts={[["Your AI sets it up.", W("more", "Claude")], ["It never touches", W("more", "never"), "ink2"], ["your money.", W("more", "your"), "grad"]]} />
      </div>
      <Stage x={1380 + (1 - p) * 900} y={545} ry={-9} rx={3}>
        <div style={{ width: 760, borderRadius: 28, border: `1px solid ${C.line}`, background: "rgba(20,23,27,.94)", boxShadow: "0 50px 140px rgba(0,0,0,.6), 0 0 90px rgba(143,211,255,.15)", overflow: "hidden", fontFamily: F.text }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, color: C.ink2 }}>
              {[0, 1, 2].map((i) => <i key={i} style={{ width: 12, height: 12, borderRadius: 12, background: "rgba(255,255,255,.15)" }} />)}
              <span style={{ marginLeft: 8 }}>Your assistant</span>
            </div>
            <span style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 999, border: `1px solid ${C.safe}4d`, background: `${C.safe}1a`, padding: "6px 14px", fontFamily: F.mono, fontSize: 13, letterSpacing: "0.08em", color: C.safe, textTransform: "uppercase" }}>
              <i style={{ width: 7, height: 7, borderRadius: 7, background: C.safe }} />SHAKE connected
            </span>
          </div>
          <div style={{ height: 440, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12, padding: "20px 22px 16px" }}>
            {beats.map((b, i) => {
              if (t < b.at) return null;
              const q = spr(t, b.at, SPR.snappy), o = lerp(t, [b.at, b.at + 0.18]);
              const box: React.CSSProperties = { opacity: o, transform: `translateY(${(1 - q) * 14}px) scale(${0.98 + q * 0.02})`, maxHeight: q * 260, alignSelf: b.k === "you" ? "flex-end" : "flex-start", maxWidth: b.k === "you" ? "86%" : "92%" };
              if (b.k === "tool") return <div key={i} style={{ ...box, fontFamily: F.mono, fontSize: 15, color: C.mute }}>↳ {b.text} <span style={{ color: b.refused ? C.ink2 : C.safe }}>{b.refused ? "· not allowed" : "· ok"}</span></div>;
              if (b.k === "you") return <div key={i} style={{ ...box, borderRadius: "20px 20px 6px 20px", background: "rgba(255,255,255,.12)", padding: "12px 18px", fontSize: 21, color: C.ink, lineHeight: 1.35 }}>{b.text}</div>;
              return (
                <div key={i} style={{ ...box, borderRadius: "20px 20px 20px 6px", background: "rgba(255,255,255,.08)", padding: "12px 18px", fontSize: 21, color: C.ink2, lineHeight: 1.35, boxShadow: b.refused ? `0 0 0 1.5px ${C.safe}88, 0 0 30px rgba(143,211,255,.25)` : undefined }}>
                  <span style={{ color: C.safe }}>SHAKE · </span>{b.text}
                  {b.link && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 14, borderRadius: 14, border: `1px solid ${C.line}`, background: "rgba(0,0,0,.25)", padding: 12 }}>
                      <Coin size={34} gap={3} glow={0.2} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 18, color: C.ink }}>City bike · {EUR("400")}</div>
                        <div style={{ fontFamily: F.mono, fontSize: 13, color: C.mute }}>shake · deal 757180718407</div>
                      </div>
                      <span style={{ borderRadius: 999, background: C.safe, padding: "7px 15px", fontSize: 15, fontWeight: 600, color: "#0b0b0c" }}>Lock {EUR("400")}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 22px", borderTop: `1px solid ${locked ? C.safe + "40" : C.line}`, background: locked ? "rgba(143,211,255,.07)" : undefined, transform: `translateX(${nudge}px)` }}>
            <Coin size={26} gap={locked ? 0 : 3} glow={0.2} shut={locked ? t - (ask - 0.3) : undefined} />
            <span style={{ flex: 1, fontSize: 18, color: locked ? C.safe : C.mute }}>{refused ? "Still locked. The AI never had the money." : locked ? `${EUR("400")} locked on Stellar` : "Nothing locked yet"}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={locked ? C.safe : C.mute} strokeWidth="2" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d={locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.5-2"} /></svg>
          </div>
        </div>
      </Stage>
      <Label t={t} a={refuse + 0.3} b={W("cases", "Cars") - 0.2}>Holds no keys · releasing takes both phones</Label>
    </>
  );
}

/* ───────── 4 · cars, flats, parcels… and the crew ───────── */
const ICON: Record<string, string> = {
  car: "M3 16V12.5L5.2 7.4A2 2 0 0 1 7 6.2h10a2 2 0 0 1 1.8 1.2L21 12.5V16a1 1 0 0 1-1 1h-1M3 16a1 1 0 0 0 1 1h1M3 12.5h18M9 17h6M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
  key: "M4 15a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M10.8 12.2L20 3M16.5 6.5l2.5 2.5M14 9l2 2",
  box: "M3 7.5l9-4.5 9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9M7.5 5.25l9 4.5",
};
const CASES: [string, string, string, string, string][] = [
  ["Cars", "car", "Buying a car", "8 500", "Keys in hand, then it pays."],
  ["flats", "key", "Flat deposit", "1 200", "Pays once you're inside."],
  ["parcels", "box", "Shipped parcel", "45", "The QR travels in the box."],
];
function Cases({ t }: { t: number }) {
  const leave = lerp(t, [W("cases", "even") - 0.3, W("cases", "even") + 0.2], [0, 1], io);
  return (
    <>
      {CASES.map(([word, icon, title, amount, line], i) => {
        const at = W("cases", word) - 0.12, p = spr(t, at, { stiffness: 190, damping: 20 }), o = lerp(t, [at, at + 0.2]);
        return (
          <div key={word} style={{ position: "absolute", left: 960 + (i - 1) * 470 - 210, top: 540 - 250, width: 420, opacity: o * (1 - leave), transform: `translateY(${(1 - p) * 120 - leave * 80}px) scale(${0.9 + p * 0.1})`, filter: leave ? `blur(${leave * 10}px)` : undefined }}>
            <div style={{ borderRadius: 34, padding: "40px 38px 38px", background: "linear-gradient(180deg, rgba(255,255,255,.075), rgba(255,255,255,.025))", border: `1px solid ${C.line}`, boxShadow: "0 40px 120px rgba(0,0,0,.5)", backdropFilter: "blur(20px)" }}>
              <div style={{ width: 92, height: 92, borderRadius: 26, display: "grid", placeItems: "center", background: `${C.safe}14`, border: `1px solid ${C.safe}44` }}>
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke={C.safe} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={ICON[icon]} /></svg>
              </div>
              <div style={{ marginTop: 34, fontFamily: F.text, fontSize: 28, color: C.ink2 }}>{title}</div>
              <div style={{ marginTop: 6, fontFamily: F.display, fontWeight: 500, fontSize: 88, letterSpacing: "-0.05em", color: C.ink, lineHeight: 1 }}>{amount}<span style={{ fontSize: 56, marginLeft: 10, color: C.ink2 }}>€</span></div>
              <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 10, fontFamily: F.text, fontSize: 22, color: C.mute }}>
                <Coin size={24} glow={0.15} />{line}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** the night-crew story from /use-cases (src/components/UseCases.tsx): each person is paid the moment they check in */
const CREW = ["DJ", "Bar", "Door", "Sound", "Lights", "Bar"];
const NO_SHOW = 4;
const crewAt = (i: number) => 0.2 + i * 0.1; // when person i checks in, on the crew clock (0 → 1)
const crewSpan = () => [W("cases", "even") - 0.15, P("cases", 1).end + 0.05] as const;
function Crew({ t }: { t: number }) {
  const [a, b] = crewSpan();
  const lp = lerp(t, [a, b], [0, 1], (x) => x);
  const p = spr(t, a - 0.1, { stiffness: 130, damping: 22 });
  const m = (x: number[], y: number[]) => interpolate(lp, x, y, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const spent = CREW.reduce((sum, _, i) => sum + (i === NO_SHOW ? 0 : m([crewAt(i) + 0.02, crewAt(i) + 0.09], [0, 120])), 0);
  const pool = m([0.0, 0.12], [0, 720]) - spent - m([0.8, 0.88], [0, 120]);
  return (
    <>
      <div style={{ position: "absolute", left: 150, top: 520, width: 760, transform: "translateY(-50%)" }}>
        <Rise t={t} at={a}><div style={{ ...eyebrow, color: C.safe, marginBottom: 22 }}>HackMeridian · tonight's crew</div></Rise>
        <Head t={t} size={104} parts={[["Your event crew,", W("cases", "event")], ["paid at check-in.", W("cases", "check") - 0.35, "grad"]]} />
      </div>
      <div style={{ position: "absolute", left: 980 + (1 - p) * 700, top: 230, opacity: p }}>
        <svg width={860} height={602} viewBox="0 0 400 280" style={{ overflow: "visible" }}>
          <defs><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fd3ff" stopOpacity=".14" /><stop offset="1" stopColor="#8fd3ff" stopOpacity="0" /></linearGradient></defs>
          <g opacity={m([0.12, 0.2, 0.8, 0.9], [0, 1, 1, 0])}>
            <path d="M90 -10L40 260H150Z" fill="url(#beam)" transform={`rotate(${m([0.12, 0.85], [-28, 22])} 90 -10)`} />
            <path d="M310 -10L250 260H360Z" fill="url(#beam)" transform={`rotate(${-m([0.12, 0.85], [-28, 22])} 310 -10)`} />
          </g>
          <line x1="10" y1="246" x2="390" y2="246" stroke="rgba(255,255,255,.12)" />
          <circle cx={200} cy={52} r={26} fill="rgba(143,211,255,.08)" stroke="rgba(143,211,255,.35)" strokeWidth={1.2} />
          <g transform="translate(185 37) scale(1.25)"><path d={"M12 2A10 10 0 0 0 12 22V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z"} fill={C.safe} opacity={0.85} /><path d={"M12 2A10 10 0 0 1 12 22V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z"} fill={C.safe} opacity={0.85} /></g>
          <text x={200} y={98} fontSize={14} fill={C.ink} textAnchor="middle" fontFamily={F.display} fontWeight={500}>{EUR(String(Math.round(pool / 10) * 10))}</text>
          <text x={200} y={20} fontSize={7} fill={C.mute} textAnchor="middle" fontFamily={F.mono} letterSpacing="1">LOCKED FOR TONIGHT&apos;S CREW</text>
          <text x={200} y={114} fontSize={8} fill={C.safe} textAnchor="middle" fontFamily={F.mono} opacity={m([0.86, 0.92], [0, 1])}>{EUR("120")} BACK TO YOU</text>
          {CREW.map((who, i) => {
            const x0 = 45 + i * 62, show = i !== NO_SHOW, inAt = crewAt(i);
            const fly = m([inAt + 0.02, inAt + 0.09], [0, 1]);
            const cx = 200 + (x0 - 200) * fly, cy = 52 + (180 - 52) * fly - Math.sin(Math.PI * fly) * 34;
            const co = show ? m([inAt, inAt + 0.02, inAt + 0.09, inAt + 0.11], [0, 1, 1, 0]) : 0;
            const lit = show ? m([inAt, inAt + 0.02], [0, 1]) : 0;
            const hop = show ? m([inAt + 0.09, inAt + 0.105, inAt + 0.125], [0, -9, 0]) : 0;
            const walk = show ? m([inAt - 0.06, inAt], [16, 0]) : 0;
            const dim = show ? m([inAt - 0.06, inAt - 0.01], [0.35, 1]) : m([0.68, 0.74], [0.35, 0.2]);
            const body = `M${x0 - 17} 236q0 -24 17 -24t17 24`;
            return (
              <g key={i}>
                <g transform={`translate(${walk} ${hop})`} opacity={m([0.02 + i * 0.015, 0.08 + i * 0.015], [0, 1]) * dim}>
                  <circle cx={x0} cy={194} r={10} fill="#1a1f26" stroke="rgba(255,255,255,.3)" strokeWidth={1.2} />
                  <path d={body} fill="#1a1f26" stroke="rgba(255,255,255,.3)" strokeWidth={1.2} />
                  <g opacity={lit}><circle cx={x0} cy={194} r={10} fill="none" stroke={C.safe} strokeWidth={1.6} /><path d={body} fill="none" stroke={C.safe} strokeWidth={1.6} /></g>
                  <text x={x0} y={230} fontSize={7} fill={C.ink2} textAnchor="middle" fontFamily={F.mono}>{who.toUpperCase()}</text>
                </g>
                {show ? (
                  <text x={x0} y={266} fontSize={9} fill={C.safe} textAnchor="middle" fontFamily={F.mono} opacity={m([inAt + 0.08, inAt + 0.11], [0, 1])}>{EUR("120")} ✓</text>
                ) : (
                  <text x={x0} y={266} fontSize={8} fill={C.mute} textAnchor="middle" fontFamily={F.mono} opacity={m([0.72, 0.78], [0, 1])}>NO-SHOW</text>
                )}
                <g transform={`translate(${cx} ${cy})`} opacity={co}>
                  <circle r={8} fill="#0d0f12" stroke={C.safe} strokeWidth={1.4} />
                  <text y={3} fontSize={8} fontWeight={700} fill={C.safe} textAnchor="middle" fontFamily={F.display}>€</text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
      <Label t={t} a={W("cases", "check")} b={b + 0.3}>They scan in at the door · no-shows come back to you</Label>
    </>
  );
}

/* ───────── 5 · the end card ───────── */
function End({ t }: { t: number }) {
  const S = 300, cy = 330, hit = HIT.end;
  const rush = lerp(t, [hit - 0.55, hit], [0, 1], easeIn);
  const off = 1000 * (1 - rush);
  const s = t - hit;
  const [sx, sy] = shake(s, 16);
  const logos: [string, string][] = [["stellar", "Stellar"], ["token", "Soroban"], ["openzeppelin", "OpenZeppelin"], ["passkey", "Passkeys"], ["anchor", "SEP-24"], ["proof", "On-chain receipts"]];
  const bottom = W("end", "SHAKE") + 0.55;
  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
      <div style={{ position: "absolute", left: 960 - S / 2, top: cy - S / 2, filter: rush > 0.5 && s < 0 ? `blur(${(rush - 0.5) * 10}px)` : undefined }}>
        <Coin size={S} l={-off} r={off} shut={s >= 0 ? s : undefined} glow={s >= 0 ? 0.9 : 0.5} />
      </div>
      <Burst s={s} x={960} y={cy} />
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + S / 2 + 36, display: "flex", justifyContent: "center" }}>
        {"SHAKE".split("").map((ch, i) => {
          const a = W("end", "SHAKE") - 0.06 + i * 0.045, p = spr(t, a, SPR.snappy), o = lerp(t, [a, a + 0.18]);
          return <span key={i} style={{ fontFamily: F.display, fontWeight: 700, fontSize: 62, letterSpacing: "0.32em", marginRight: "-0.32em", color: C.ink, opacity: o, transform: `translateY(${(1 - p) * 40}px)`, display: "inline-block" }}>{ch}</span>;
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + S / 2 + 140, display: "flex", justifyContent: "center", gap: 26 }}>
        <Words t={t} text="Pay a stranger." at={W("end", "Pay") - 0.08} size={92} />
        <Words t={t} text="Only when you meet." at={W("end", "only") - 0.08} size={92} grad />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 870, display: "flex", justifyContent: "center", alignItems: "center", gap: 18 }}>
        <Rise t={t} at={bottom}><div style={{ fontFamily: F.mono, fontSize: 28, color: C.ink, padding: "12px 26px", borderRadius: 999, border: `1px solid ${C.line}`, background: "rgba(255,255,255,.05)" }}>shake-lake.vercel.app</div></Rise>
        <Rise t={t} at={bottom + 0.1}><Chip>Live on Stellar Testnet</Chip></Rise>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 975, display: "flex", justifyContent: "center", gap: 34 }}>
        {logos.map(([f, name], i) => (
          <Rise key={f} t={t} at={bottom + 0.25 + i * 0.06}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: F.mono, fontSize: 17, letterSpacing: "0.12em", textTransform: "uppercase", color: C.mute }}>
              <Img src={staticFile(`integrations/${f}.svg`)} style={{ width: 22, height: 22 }} />{name}
            </div>
          </Rise>
        ))}
      </div>
    </AbsoluteFill>
  );
}

/* ───────── sound ───────── */
type Cue = [keyof typeof sfx, number, number?, number?]; // effect, at (s), volume, rate
const CUES: Cue[] = [
  // Sam, the bike, Ana
  ["pop", W("intro", "Meet") - 0.1, 0.45], ["whoosh", W("intro", "He") - 0.3, 0.35], ["shimmer", W("intro", "He") + 0.2, 0.3], ["pop", W("intro", "from"), 0.45, 1.1],
  // who pays first?
  ["tick", W("problem", "who") - 0.15, 0.4], ["coin", W("problem", "upfront") - 0.05, 0.5], ["whoosh", W("problem", "upfront"), 0.35, 1.2], ["dissolve", W("problem", "never") - 0.15, 0.5],
  ["swoosh", W("problem", "Ana") - 0.35, 0.35], ["pop", W("problem", "Ana") + 0.1, 0.35],
  ["glitch", W("problem", "fake"), 0.7], ["stamp", W("problem", "fake") + 0.1, 0.6], ["heart", P("problem", 3).end - 0.2, 0.45],
  // they shake on it
  ["riser", HIT.shake - 2.4, 0.5], ["slam", HIT.shake - 0.04, 0.55], ["shimmer", HIT.shake + 0.1, 0.45],
  // lock · see · meet · paid
  ["whoosh", W("flow", "Sam") - 0.5, 0.4], ["tick", W("flow", "tap") - 0.12, 0.7], ["lock", W("flow", "tap") + 0.9, 0.55],
  ["whoosh", W("flow", "Ana") - 0.32, 0.45, 1.1], ["shimmer", W("flow", "real"), 0.4],
  ["whoosh", W("flow", "They") - 0.3, 0.45, 0.9], ["beep", W("flow", "her") - 0.1, 0.55], ["heart", P("flow", 2).end - 0.3, 0.4], ["riser", HIT.paid - 1.6, 0.4, 1.3],
  ["slam", HIT.paid - 0.04, 0.5], ["chime", HIT.paid + 0.12, 0.45], ["shimmer", HIT.paid + 0.15, 0.35],
  // no signal · extension · AI
  ["blip", W("more", "No") - 0.25, 0.5], ["whoosh", W("more", "No") - 0.3, 0.4], ["chime", W("more", "Still") - 0.05, 0.35, 1.15],
  ["whoosh", W("more", "It's") - 0.3, 0.4], ["pop", W("more", "Vinted") - 0.1, 0.4], ["tick", W("more", "OLX") + 0.35, 0.55],
  ["whoosh", W("more", "Claude") - 0.4, 0.4], ["pop", W("more", "Claude") - 0.05, 0.35], ["pop", W("more", "set") + 0.1, 0.35], ["pop", W("more", "but") - 0.35, 0.35], ["denied", W("more", "touch") - 0.1, 0.55],
  // cars, flats, parcels, crew
  ["whoosh", W("cases", "Cars") - 0.15, 0.4], ["pop", W("cases", "Cars") - 0.05, 0.32], ["pop", W("cases", "flats") - 0.05, 0.32, 1.08], ["pop", W("cases", "parcels") - 0.05, 0.32, 1.16],
  ["whoosh", W("cases", "even") - 0.25, 0.4],
  ...CREW.map((_, i): Cue => { const [a, b] = crewSpan(); return ["coin", a + (crewAt(i) + 0.08) * (b - a), 0.3, 1 + i * 0.06]; }).filter((_, i) => i !== NO_SHOW),
  // the end
  ["riser", HIT.end - 2.2, 0.45], ["slam", HIT.end - 0.04, 0.42], ["outro", HIT.end - 0.04, 0.4], ["shimmer", HIT.end + 0.1, 0.45], ["chime", W("end", "only"), 0.3],
  ["shimmer", P("end", 1).end + 0.1, 0.4, 0.8],
];
// mix headroom: voice + effects + score must stay under 0 dBFS where they stack (fake, paid, the end)
const VOICE = 0.85, SFX = 0.72;
// the score dips under the voice
const speaking = (t: number) => Math.max(0, ...LINES.map((l) => Math.min(lerp(t, [l.start - 0.15, l.start]), 1 - lerp(t, [l.start + l.dur, l.start + l.dur + 0.3]))));
// …and hands over to the outro sting on the final slam
const musicVol = (t: number) => (0.6 - 0.28 * speaking(t)) * (1 - lerp(t, [HIT.end - 0.15, HIT.end + 0.5]));

export function Film() {
  const t = useCurrentFrame() / FPS;
  const fake = W("problem", "fake");
  const danger = win(t, fake, P("problem", 3).end + 0.3, 0.08, 0.4);
  const flowA = W("flow", "Sam") - 0.6, more = W("more", "No") - 0.35;
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: F.text }}>
      <Backdrop t={t} danger={danger} calm={(1 - lerp(t, [HIT.shake - 0.2, HIT.shake + 0.3])) * 0.55 + win(t, HIT.paid - 1.6, HIT.paid, 0.6, 0.1) * 0.5} />
      {t < flowA + 0.6 && <Intro t={t} />}
      <Shot t={t} a={flowA} b={more + 0.3} fin={0.01} fout={0.4}><Flow t={t} /></Shot>
      <Shot t={t} a={more} b={W("more", "It's") - 0.05}><NoSignal t={t} /></Shot>
      <Shot t={t} a={W("more", "It's") - 0.4} b={W("more", "Claude") - 0.2}><Extension t={t} /></Shot>
      <Shot t={t} a={W("more", "Claude") - 0.55} b={W("cases", "Cars") - 0.15}><Ai t={t} /></Shot>
      <Shot t={t} a={W("cases", "Cars") - 0.3} b={W("cases", "even") + 0.3} fin={0.3}><Cases t={t} /></Shot>
      <Shot t={t} a={W("cases", "even") - 0.4} b={HIT.end - 0.25}><Crew t={t} /></Shot>
      <Shot t={t} a={HIT.end - 0.6} b={TOTAL + 1} fin={0.2}><End t={t} /></Shot>
      <Grain t={t} />
      <AbsoluteFill style={{ background: "#000", opacity: Math.max(1 - lerp(t, [0, 0.5]), lerp(t, [TOTAL - 0.5, TOTAL])) }} />

      {/* lead: how late the score's real drop is (scripts/sound.mjs measures it), so its drop lands on the slam */}
      <Sequence from={Math.max(0, sec(-music.lead))} layout="none">
        <Audio src={staticFile(music.file)} trimBefore={Math.max(0, sec(music.lead))} volume={(f) => musicVol(f / FPS + Math.max(0, -music.lead))} />
      </Sequence>
      {LINES.map((l) => (
        <Sequence key={l.id} from={sec(l.start)} layout="none"><Audio src={staticFile(l.file)} volume={VOICE} /></Sequence>
      ))}
      {CUES.map(([id, at, vol = 0.5, rate = 1], i) => (
        <Sequence key={i} from={Math.max(0, sec(at))} layout="none"><Audio src={staticFile(sfx[id])} volume={vol * SFX} playbackRate={rate} /></Sequence>
      ))}
    </AbsoluteFill>
  );
}
