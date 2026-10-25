// SHAKE · the 45-second film. Every moment is placed on the voice (src/vo.json) and the score's hits (src/music.json),
// so re-voicing a line re-times the cut. Screens are real captures from shake-lake.vercel.app (scripts/shots.cjs).
import React from "react";
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Burst, C, Chip, Coin, F, FPS, Grain, HIT, LINES, P, Phone, Plane, SPR, Say, Stage, TOTAL, V, W, Words, eyebrow, glacier, lerp, easeIn, sec, shake, spr, win, type Layer } from "./kit";
import sfx from "./sfx.json";
import music from "./music.json";

/** crossfade a list of [time, screenshot] cuts */
const cuts = (t: number, list: [number, string][], fade = 0.14): Layer[] =>
  list.map(([at, src], i) => {
    const next = list[i + 1]?.[0];
    const shown = i === 0 ? 1 : lerp(t, [at, at + fade]);
    return { src, o: next !== undefined && t > next + fade ? 0 : shown }; // later cuts stack on top, so hide one only once the next is fully in
  });

/** a scene: fades/blurs in and out of its window */
function Scene({ t, a, b, children, fin = 0.28, fout = 0.28 }: { t: number; a: number; b: number; children: React.ReactNode; fin?: number; fout?: number }) {
  if (t < a - 0.02 || t > b + 0.02) return null;
  const i = lerp(t, [a, a + fin]), o = lerp(t, [b - fout, b]);
  return <AbsoluteFill style={{ opacity: Math.min(i, 1 - o), transform: `scale(${1 + (1 - i) * 0.05 - o * 0.04 + (t - a) * 0.006})`, filter: i < 1 || o > 0 ? `blur(${(1 - i) * 14 + o * 14}px)` : undefined }}>{children}</AbsoluteFill>;
}
const Col = ({ x, y, w = 780, children, align = "left" }: { x: number; y: number; w?: number; children: React.ReactNode; align?: "left" | "center" }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, transform: "translateY(-50%)", textAlign: align, display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap: 6 }}>{children}</div>
);
const Rise = ({ t, at, children, style }: { t: number; at: number; children: React.ReactNode; style?: React.CSSProperties }) => {
  const p = spr(t, at), o = lerp(t, [at, at + 0.25]);
  return <div style={{ opacity: o, transform: `translateY(${(1 - p) * 30}px)`, ...style }}>{children}</div>;
};

/* ───────── 1 · Sam, Ana, a bike, and a screenshot that lies ───────── */
function Intro({ t }: { t: number }) {
  const S = 380, cx = 960, cy = 450;
  const half = (side: -1 | 1, enter: number, tense: number) => {
    const inn = spr(t, enter, { stiffness: 170, damping: 22 });
    const pull = lerp(t, [tense, tense + 0.9], [0, 70]);
    const rush = lerp(t, [11.72, HIT.shake], [0, 1], easeIn);
    return side * (1500 - inn * 960 + pull) * (1 - rush);
  };
  const l = half(-1, 0.32, 5.76), r = half(1, 1.48, 7.2);
  const fake = win(t, 9.35, 11.75, 0.2, 0.3);
  const dim = 1 - fake * 0.65;
  const shut = t >= HIT.shake ? t - HIT.shake : undefined;
  const leave = lerp(t, [13.25, 13.7]);
  const [sx, sy] = shake(t - HIT.shake, 18);
  const nameX = (off: number, side: -1 | 1) => cx + off + side * S * 0.21;
  const names = 1 - lerp(t, [11.5, 11.85]);
  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
      {/* the two halves: Sam and Ana */}
      <div style={{ position: "absolute", left: cx - S / 2, top: cy - S / 2 - leave * 140, opacity: 1 - leave, transform: `scale(${1 - leave * 0.35})` }}>
        <Coin size={S} l={l} r={r} lo={dim} ro={dim} shut={shut} glow={shut !== undefined ? 0.9 : 0.4} />
      </div>
      {[["Sam", "the buyer", l, -1, W("v01", "Sam")], ["Ana", "the seller", r, 1, W("v02", "Ana")]].map(([name, role, off, side, at]) => (
        <div key={name as string} style={{ position: "absolute", left: nameX(off as number, side as -1 | 1), top: cy + S / 2 + 40, transform: "translateX(-50%)", textAlign: "center", opacity: names * dim }}>
          <Words t={t} text={name as string} at={(at as number) - 0.05} size={78} />
          <Rise t={t} at={(at as number) + 0.15}><div style={{ ...eyebrow, marginTop: 10 }}>{role as string}</div></Rise>
        </div>
      ))}
      {/* what each of them won't do */}
      <div style={{ position: "absolute", left: nameX(l, -1), top: cy + S / 2 + 190, width: 420, transform: "translateX(-50%)", textAlign: "center", opacity: names * dim }}>
        <Words t={t} text="won't pay first." times={V("v04").words.slice(1, 4).map((w) => w.start)} size={38} color={C.ink2} weight={500} />
      </div>
      <div style={{ position: "absolute", left: nameX(r, 1), top: cy + S / 2 + 190, width: 440, transform: "translateX(-50%)", textAlign: "center", opacity: names * dim }}>
        <Words t={t} text="won't hand it over for a screenshot." times={V("v04").words.slice(5).map((w) => w.start)} size={38} color={C.ink2} />
      </div>
      {/* strangers · one bike · €400 */}
      <div style={{ position: "absolute", left: 0, right: 0, top: cy, transform: "translateY(-50%)", display: "flex", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 900, height: 260 }}>
          {[["Strangers.", P("v03", 0).start, P("v03", 1).start], ["One bike.", P("v03", 1).start, P("v03", 2).start]].map(([txt, a, b]) => (
            <div key={txt as string} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <Words t={t} text={txt as string} at={(a as number) - 0.04} size={118} out={(b as number) - 0.12} />
            </div>
          ))}
          <Price t={t} at={P("v03", 2).start} out={5.62} />
        </div>
      </div>
      <FakeShot t={t} />
      <Burst s={t - HIT.shake} x={cx} y={cy} />
      {/* SHAKE */}
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + S / 2 + 70 - leave * 140, display: "flex", justifyContent: "center", gap: 2, opacity: 1 - leave }}>
        {"SHAKE".split("").map((ch, i) => {
          const a = HIT.shake + 0.14 + i * 0.045, p = spr(t, a, SPR.snappy), o = lerp(t, [a, a + 0.18]);
          return <span key={i} style={{ fontFamily: F.display, fontWeight: 700, fontSize: 64, letterSpacing: "0.3em", color: C.ink, opacity: o, transform: `translateY(${(1 - p) * 40}px)`, display: "inline-block" }}>{ch}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
}
function Price({ t, at, out }: { t: number; at: number; out: number }) {
  const p = spr(t, at - 0.04, SPR.slam), o = Math.min(lerp(t, [at - 0.04, at + 0.18]), 1 - lerp(t, [out, out + 0.3]));
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: o }}>
      <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 230, letterSpacing: "-0.06em", lineHeight: 0.9, transform: `scale(${0.7 + p * 0.3})`, ...glacier, filter: "drop-shadow(0 0 40px rgba(143,211,255,.35))" }}>
        <span style={{ fontSize: 150, marginRight: 10 }}>€</span>400
      </div>
    </div>
  );
}

/** the pitch's bank-app "Paid ✓" card (src/components/pitch/Story.tsx), torn apart by a glitch */
function FakeShot({ t }: { t: number }) {
  const a = 9.4, lie = W("v05", "lie") - 0.04, gone = 11.62;
  if (t < a || t > gone + 0.5) return null;
  const inn = spr(t, a, { stiffness: 210, damping: 20 });
  const out = lerp(t, [gone, gone + 0.45], [0, 1], easeIn);
  const g = t >= lie && t < gone ? 1 : 0;
  const f = Math.floor(t * FPS);
  const jit = (n: number) => (g ? (Math.sin(f * 12.9898 + n * 78.233) * 43758.5453) % 1 : 0);
  const card = (filter?: string) => (
    <div style={{ width: 300, borderRadius: 26, border: "1px solid rgba(255,255,255,.1)", background: "#15181d", padding: 24, filter }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: F.text, fontSize: 11, color: C.mute }}><span>Bank app</span><span>14:02</span></div>
      <div style={{ margin: "24px auto 0", width: 48, height: 48, borderRadius: 48, display: "grid", placeItems: "center", background: "rgba(52,211,153,.15)", color: "#6ee7b7", fontSize: 22 }}>✓</div>
      <div style={{ marginTop: 16, textAlign: "center", fontFamily: F.text, fontSize: 13, color: C.ink2 }}>Transfer complete</div>
      <div style={{ marginTop: 4, textAlign: "center", fontFamily: F.display, fontWeight: 500, fontSize: 46, letterSpacing: "-0.06em", color: C.ink }}>€400.00</div>
      <div style={{ marginTop: 4, textAlign: "center", fontFamily: F.text, fontSize: 13, color: C.mute }}>to Ana R. · ref 88213</div>
      <div style={{ marginTop: 24, borderRadius: 12, background: "rgba(255,255,255,.04)", padding: "10px 12px", fontFamily: F.text, fontSize: 12, color: C.ink2 }}>“Paid ✅ send the bike pls”</div>
    </div>
  );
  const stamp = spr(t, lie + 0.08, SPR.slam);
  return (
    <div style={{ position: "absolute", left: 960, top: 470, transform: `translate(-50%, -50%) translateY(${(1 - inn) * 380 + out * 420}px) rotate(${-4 + (1 - inn) * -10 + out * 14}deg) scale(1.9)`, opacity: Math.min(inn * 1.5, 1) * (1 - out) }}>
      <div style={{ position: "relative" }}>
        {g ? (
          <>
            <div style={{ position: "absolute", inset: 0, transform: `translateX(${-8 + jit(1) * 10}px)`, mixBlendMode: "screen", opacity: 0.7 }}>{card("hue-rotate(-60deg) saturate(3)")}</div>
            <div style={{ position: "absolute", inset: 0, transform: `translateX(${7 + jit(2) * 10}px)`, mixBlendMode: "screen", opacity: 0.7 }}>{card("hue-rotate(150deg) saturate(3)")}</div>
          </>
        ) : null}
        <div style={{ transform: `translateX(${jit(3) * 6}px) skewX(${jit(4) * 6}deg)` }}>{card(g ? "saturate(.4) brightness(.85)" : undefined)}</div>
        {/* torn slices */}
        {g
          ? [0.18, 0.41, 0.66, 0.83].map((y, i) => (
              <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${y * 100}%`, height: 8 + Math.abs(jit(i + 9)) * 22, overflow: "hidden", transform: `translateX(${jit(i + 5) * 46}px)`, opacity: 0.85 }}>
                <div style={{ transform: `translateY(-${y * 100}%)`, height: 430 }}>{card()}</div>
              </div>
            ))
          : null}
        {t >= lie + 0.08 && (
          <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%, -50%) rotate(-12deg) scale(${2.2 - stamp * 1.2})`, opacity: lerp(t, [lie + 0.08, lie + 0.16]), border: `3px solid ${C.danger}`, borderRadius: 12, padding: "8px 22px", fontFamily: F.mono, fontWeight: 700, fontSize: 34, letterSpacing: "0.18em", color: C.danger, background: "rgba(13,15,18,.55)", whiteSpace: "nowrap", boxShadow: `0 0 30px rgba(255,69,58,.35)` }}>
            FAKE
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── 2 · Sam locks the money ───────── */
function Lock({ t }: { t: number }) {
  const a = 13.25, tap = W("v07", "tap") - 0.05, steps = W("v07", "No");
  const p = spr(t, a, { stiffness: 140, damping: 22 });
  const k = 400 / 393;
  const press = lerp(t, [tap - 0.2, tap - 0.05]) * (1 - lerp(t, [tap + 0.15, tap + 0.35]));
  const ripple = lerp(t, [tap, tap + 0.5]);
  return (
    <>
      <Stage x={620} y={560 + (1 - p) * 760} rx={4 + (1 - p) * 18} ry={14 - lerp(t, [a, 17], [0, 6])} rz={-1}>
        <Phone w={400} glow={0.5} layers={cuts(t, [[a, "d-pay.png"], [tap, "d-picked.png"], [steps, "d-locking.png"], [steps + 0.75, "d-locking2.png"]])}>
          <div style={{ position: "absolute", left: 108 * k - 34, top: (433 + 50) * k - 34, width: 68, height: 68, borderRadius: 68, background: "rgba(255,255,255,.35)", opacity: press, transform: `scale(${0.6 + press * 0.4})` }} />
          {ripple > 0 && ripple < 1 && <div style={{ position: "absolute", left: 108 * k - 90 * ripple, top: (433 + 50) * k - 90 * ripple, width: 180 * ripple, height: 180 * ripple, borderRadius: 999, border: `2px solid ${C.safe}`, opacity: 1 - ripple }} />}
        </Phone>
      </Stage>
      <Col x={1060} y={540}>
        <Rise t={t} at={13.45}><div style={{ ...eyebrow, color: C.safe, marginBottom: 18 }}>Sam · the buyer</div></Rise>
        <Say t={t} id="v07" i={0} size={96} />
        <Say t={t} id="v07" i={1} size={96} grad />
        <Say t={t} id="v07" i={2} size={96} color={C.ink2} />
        <Rise t={t} at={steps + 0.35} style={{ marginTop: 34 }}><Chip tone="mute">Test mode · real Stellar transactions</Chip></Rise>
      </Col>
    </>
  );
}

/* ───────── 3 · Ana sees it's real ───────── */
function Proof({ t }: { t: number }) {
  const a = 16.78, zoom = W("v08", "Locked") - 0.1;
  const p = spr(t, a, { stiffness: 140, damping: 22 });
  const z = lerp(t, [zoom, zoom + 0.9], [1, 1.12]);
  return (
    <>
      <Stage x={1300 + (1 - p) * 900} y={560} rx={4} ry={-14 + lerp(t, [a, 21], [0, 5])} rz={1}>
        <Phone w={400} glow={0.4 + lerp(t, [W("v08", "real") - 0.1, W("v08", "real") + 0.4]) * 0.6} layers={[{ src: "d-seller.png", o: 1, scale: z, origin: "50% 45%" }]} />
      </Stage>
      <Col x={150} y={540}>
        <Rise t={t} at={a + 0.2}><div style={{ ...eyebrow, color: C.safe, marginBottom: 18 }}>Ana · the seller</div></Rise>
        <Say t={t} id="v08" i={0} size={92} />
        <Say t={t} id="v08" i={1} size={92} grad />
        <Say t={t} id="v08" i={2} size={92} color={C.ink2} />
        <Rise t={t} at={W("v08", "Stellar")} style={{ marginTop: 34 }}><Chip>Read live · contract CAQ6…2JW</Chip></Rise>
      </Col>
    </>
  );
}

/* ───────── 4 · they meet, scan, hold… paid ───────── */
function Meet({ t }: { t: number }) {
  const a = 21.0, scan = W("v09", "scans"), turn = W("v09", "and") - 0.1, hold = W("v09", "holds") - 0.05, paid = HIT.paid;
  const pin = spr(t, a, { stiffness: 120, damping: 22 });
  const slam = spr(t, paid, SPR.slam);
  const s = t - paid;
  const [sx, sy] = shake(s, 16);
  const push = lerp(t, [a, paid], [1, 1.07], Easing.inOut(Easing.quad)) - (t > paid ? lerp(t, [paid, paid + 0.6], [0, 0.07]) : 0);
  const w = 362, k = w / 393;
  const turnP = spr(t, turn, { stiffness: 160, damping: 24 });
  const samRy = t < turn ? 58 : 58 - turnP * 46;
  const tension = lerp(t, [hold, paid]);
  const qrTop = (402 + 50) * k, qrH = (685 - 402) * k, qrL = 55 * k, qrW = (338 - 55) * k;
  const beam = win(t, scan - 0.05, W("v09", "and"), 0.15, 0.25);
  const sweep = ((t - scan) / 0.55) % 1;
  const samX = 690 - (1 - pin) * 900 + slam * 70, anaX = 1230 + (1 - pin) * 900 - slam * 70;
  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${push})` }}>
      {/* headline */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 30 }}>
        {t < paid - 0.1 ? (
          <>
            <Say t={t} id="v09" i={0} size={64} out={paid - 0.35} />
            <Say t={t} id="v09" i={1} size={64} color={C.ink2} out={paid - 0.35} />
            <Say t={t} id="v09" i={2} size={64} grad out={paid - 0.35} />
          </>
        ) : (
          <>
            <Say t={t} id="v10" i={0} size={120} grad />
            <Say t={t} id="v10" i={1} size={64} />
          </>
        )}
      </div>
      {/* light from Sam's camera to Ana's code */}
      <div style={{ position: "absolute", inset: 0, opacity: beam * 0.8, background: `linear-gradient(90deg, transparent ${(samX + 80) / 19.2}%, rgba(143,211,255,.22) ${(anaX - 200) / 19.2}%, transparent ${(anaX - 40) / 19.2}%)`, clipPath: `polygon(${samX + 90}px 560px, ${anaX - 160}px ${600 - qrH * 0.6}px, ${anaX - 160}px ${600 + qrH * 0.4}px)`, filter: "blur(6px)" }} />
      <Stage x={samX} y={640} ry={samRy + (t > paid ? -slam * 4 : 0)} rx={3}>
        <Phone w={w} glow={0.3 + tension * 0.7} layers={cuts(t, [[a, "d-scan0.png"], [turn, "d-confirm.png"], [hold, "d-hold0.png"], [hold + 0.35, "d-hold1.png"], [hold + 0.8, "d-hold2.png"], [paid, "d-shaken3.png"]], 0.1)}>
          {t < turn + 0.12 && <Viewfinder k={k} t={t} />}
          {t > hold - 0.2 && t < paid && <div style={{ position: "absolute", left: 196 * k - 34, top: (621 + 50) * k - 34, width: 68, height: 68, borderRadius: 68, background: "rgba(255,255,255,.3)", boxShadow: "0 0 30px rgba(143,211,255,.6)", opacity: lerp(t, [hold - 0.2, hold]) }} />}
          <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: lerp(s, [0, 0.35], [0.7, 0]) * (s >= 0 ? 1 : 0) }} />
        </Phone>
      </Stage>
      <Stage x={anaX} y={640} ry={-22 + slam * 10} rx={3}>
        <Phone w={w} glow={0.35 + (s > 0 ? 0.6 : 0)} layers={cuts(t, [[a, "d-qr.png"], [paid, "d-seller-paid.png"]], 0.1)}>
          {beam > 0.01 && (
            <div style={{ position: "absolute", left: qrL, top: qrTop, width: qrW, height: qrH, opacity: beam }}>
              {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], i) => (
                <div key={i} style={{ position: "absolute", [x ? "right" : "left"]: -6, [y ? "bottom" : "top"]: -6, width: 34, height: 34, borderColor: C.safe, borderStyle: "solid", borderWidth: `${y ? 0 : 4}px ${x ? 4 : 0}px ${y ? 4 : 0}px ${x ? 0 : 4}px`, borderRadius: 6, boxShadow: `0 0 16px ${C.safe}` } as React.CSSProperties} />
              ))}
              <div style={{ position: "absolute", left: 0, right: 0, top: `${Math.max(0, sweep) * 100}%`, height: 4, background: C.safe, boxShadow: `0 0 24px 6px rgba(143,211,255,.7)` }} />
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: lerp(s, [0, 0.35], [0.7, 0]) * (s >= 0 ? 1 : 0) }} />
        </Phone>
      </Stage>
      {/* the handshake: the halves pull apart while Sam holds, then slam */}
      <div style={{ position: "absolute", left: (samX + anaX) / 2 - 70, top: 600 - 70, opacity: lerp(t, [hold - 0.3, hold]) * (1 - lerp(s, [0.9, 1.3])) }}>
        <Coin size={140} gap={t < paid ? 6 + tension * 26 : 0} tension={t < paid ? tension * 0.4 : 0} shut={s >= 0 ? s : undefined} glow={0.4 + tension * 0.6} />
      </div>
      <Burst s={s} x={(samX + anaX) / 2} y={600} scale={1.1} />
    </AbsoluteFill>
  );
}

/** Sam's camera, filming Ana's phone, until he turns his phone to hold */
function Viewfinder({ k, t }: { k: number; t: number }) {
  const sc = 0.55, box = { l: 18 * k, t: 130 * k, w: 357 * k, h: 698 * k };
  const pw = 393 * sc * k, ph = 852 * sc * k;
  return (
    <div style={{ position: "absolute", left: box.l, top: box.t, width: box.w, height: box.h, borderRadius: 30 * k, overflow: "hidden", background: "radial-gradient(80% 70% at 50% 45%, #1a2230, #050607)" }}>
      <div style={{ position: "absolute", left: box.w / 2 - pw / 2 + Math.sin(t * 3) * 3 * k, top: box.h / 2 - ph / 2 + Math.cos(t * 2.3) * 3 * k, width: pw, height: ph, borderRadius: 30 * sc * k, overflow: "hidden", border: `${3 * k}px solid #22262c`, transform: "rotate(-4deg)", filter: "blur(0.5px)" }}>
        <Img src={staticFile("shots/d-qr.png")} style={{ width: pw, height: ph }} />
      </div>
      {/* the scanner's frame */}
      <div style={{ position: "absolute", left: box.w * 0.2, top: box.h * 0.28, width: box.w * 0.6, height: box.w * 0.6, borderRadius: 18 * k, boxShadow: `0 0 0 ${1.5 * k}px rgba(143,211,255,.9), 0 0 ${24 * k}px rgba(143,211,255,.5)` }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(75% 65% at 50% 50%, transparent 55%, rgba(0,0,0,.6))" }} />
    </div>
  );
}

/* ───────── 5 · the montage: no signal, the extension, the AI, the crew ───────── */
function NoSignal({ t }: { t: number }) {
  const a = 27.15;
  const p1 = spr(t, a, { stiffness: 150, damping: 22 }), p2 = spr(t, a + 0.12, { stiffness: 150, damping: 22 });
  const paid = W("v11", "Still") - 0.1;
  return (
    <>
      <Col x={150} y={520}>
        <Rise t={t} at={a + 0.05}><div style={{ marginBottom: 22, width: 92, height: 92, borderRadius: 92, display: "grid", placeItems: "center", border: `1px solid ${C.safe}55`, background: `${C.safe}14`, boxShadow: `0 0 40px rgba(143,211,255,.25)` }}><Plane size={46} /></div></Rise>
        <Say t={t} id="v11" i={0} size={110} />
        <Say t={t} id="v11" i={1} size={110} grad />
        <Rise t={t} at={paid + 0.35} style={{ marginTop: 30 }}>
          <div style={{ ...eyebrow, fontSize: 19, lineHeight: 1.7 }}>Each phone holds half the key<br />Lands on Stellar when back online</div>
        </Rise>
      </Col>
      <Stage x={1170 + (1 - p1) * 800} y={545} ry={12} rx={3}>
        <Phone w={300} airplane layers={[{ src: "o-half.png", o: 1 }]} glow={0.4} />
      </Stage>
      <Stage x={1560 + (1 - p2) * 800} y={545} ry={-12} rx={3}>
        <Phone w={300} airplane layers={cuts(t, [[a, "o-seller-qr.png"], [paid, "o-paid1.png"]])} glow={0.4 + lerp(t, [paid, paid + 0.3]) * 0.5} />
      </Stage>
      <Burst s={(t - paid) * 1.3} x={1560} y={500} scale={0.5} />
    </>
  );
}

function Extension({ t }: { t: number }) {
  const a = 29.1, p = spr(t, a, { stiffness: 140, damping: 22 });
  const click = W("v12", "OLX") + 0.15;
  const W0 = 1000, crop = 125, sc = W0 / 1280;
  const ripple = lerp(t, [click, click + 0.5]);
  const shops = ["Vinted", "OLX", "eBay", "Wallapop", "Depop", "Etsy", "Facebook Marketplace", "+9 more"];
  return (
    <>
      <Col x={150} y={500} w={720}>
        <Rise t={t} at={a + 0.05}><div style={{ ...eyebrow, color: C.safe, marginBottom: 18 }}>Found it? Shake on it.</div></Rise>
        <Say t={t} id="v12" i={0} size={96} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 34, maxWidth: 660 }}>
          {shops.map((s, i) => (
            <Rise key={s} t={t} at={W("v12", "OLX") + 0.05 + i * 0.05}>
              <div style={{ padding: "9px 18px", borderRadius: 999, border: `1px solid ${C.line}`, background: "rgba(255,255,255,.04)", fontFamily: F.text, fontSize: 20, color: i < 2 ? C.ink : C.ink2 }}>{s}</div>
            </Rise>
          ))}
        </div>
      </Col>
      <Stage x={1370 + (1 - p) * 700} y={540} ry={-10 + (1 - p) * -12} rx={3}>
        <div style={{ width: W0, borderRadius: 18, overflow: "hidden", background: "#0b0c0e", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 50px 140px rgba(0,0,0,.6), 0 0 90px rgba(143,211,255,.18)" }}>
          <div style={{ height: 46, display: "flex", alignItems: "center", gap: 8, padding: "0 16px", background: "#1b1e23" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => <i key={c} style={{ width: 12, height: 12, borderRadius: 12, background: c }} />)}
            <div style={{ marginLeft: 18, flex: 1, height: 28, borderRadius: 8, background: "rgba(255,255,255,.07)", display: "flex", alignItems: "center", padding: "0 12px", fontFamily: F.text, fontSize: 14, color: C.mute }}>a second-hand listing</div>
            <div style={{ width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(143,211,255,.15)" }}><Coin size={20} gap={1} glow={0.2} /></div>
          </div>
          <div style={{ position: "relative", height: (720 - crop) * sc, overflow: "hidden" }}>
            <Img src={staticFile("shots/extension-preview.png")} style={{ width: W0, display: "block", marginTop: -crop * sc }} />
            {ripple > 0 && ripple < 1 && <div style={{ position: "absolute", left: 1083 * sc - 120 * ripple, top: (591 - crop) * sc - 120 * ripple, width: 240 * ripple, height: 240 * ripple, borderRadius: 999, border: `3px solid ${C.safe}`, opacity: 1 - ripple }} />}
          </div>
        </div>
      </Stage>
    </>
  );
}

type Beat = { at: number; k: "you" | "tool" | "shake"; text: string; refused?: boolean; link?: boolean };
function Ai({ t }: { t: number }) {
  const a = 31.25, p = spr(t, a, { stiffness: 140, damping: 22 });
  const ask = W("v13", "everything") - 0.4, refuse = W("v13", "except") - 0.05;
  const beats: Beat[] = [
    { at: 31.55, k: "you", text: "Vinted seller wants a €4 courier fee by link first. Safe?" },
    { at: 32.2, k: "tool", text: "check_seller_message" },
    { at: 32.6, k: "shake", text: "No. Fake courier fee is a known trick. Pay through this instead:", link: true },
    { at: ask, k: "you", text: "Locked it. Now release the €60 to her." },
    { at: ask + 0.7, k: "tool", text: "release_payment", refused: true },
    { at: refuse, k: "shake", text: "I can’t. Nobody can. Only your phone, scanning her QR, when you meet.", refused: true },
  ];
  const locked = t >= ask, refused = t >= refuse;
  const nudge = refused ? Math.sin((t - refuse) * 60) * 9 * (1 - lerp(t, [refuse, refuse + 0.45])) : 0;
  return (
    <>
      <Col x={150} y={520} w={760}>
        <Rise t={t} at={a + 0.05}><div style={{ ...eyebrow, color: C.safe, marginBottom: 18 }}>Claude · ChatGPT · Cursor</div></Rise>
        <div style={{ opacity: 1 - lerp(t, [W("v13", "It"), W("v13", "It") + 0.3], [0, 0.55]) }}><Say t={t} id="v13" i={0} size={84} /></div>
        <Say t={t} id="v13" i={1} size={84} color={C.ink2} />
        <Say t={t} id="v13" i={2} size={84} grad />
        <Rise t={t} at={refuse + 0.4} style={{ marginTop: 30 }}><Chip>MCP server · holds no keys</Chip></Rise>
      </Col>
      <Stage x={1390 + (1 - p) * 700} y={545} ry={-9} rx={3}>
        <div style={{ width: 780, borderRadius: 28, border: `1px solid ${C.line}`, background: "rgba(20,23,27,.92)", boxShadow: "0 50px 140px rgba(0,0,0,.6), 0 0 90px rgba(143,211,255,.15)", overflow: "hidden", fontFamily: F.text }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 22px", borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 17, color: C.ink2 }}>
              {[0, 1, 2].map((i) => <i key={i} style={{ width: 12, height: 12, borderRadius: 12, background: "rgba(255,255,255,.15)" }} />)}
              <span style={{ marginLeft: 8 }}>Your assistant</span>
            </div>
            <span style={{ display: "flex", alignItems: "center", gap: 8, borderRadius: 999, border: `1px solid ${C.safe}4d`, background: `${C.safe}1a`, padding: "6px 14px", fontFamily: F.mono, fontSize: 13, letterSpacing: "0.08em", color: C.safe, textTransform: "uppercase" }}>
              <i style={{ width: 7, height: 7, borderRadius: 7, background: C.safe }} />SHAKE connected
            </span>
          </div>
          <div style={{ height: 470, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 12, padding: "20px 22px 16px" }}>
            {beats.map((b, i) => {
              const q = spr(t, b.at, SPR.snappy), o = lerp(t, [b.at, b.at + 0.18]);
              if (t < b.at) return null;
              const box: React.CSSProperties = { opacity: o, transform: `translateY(${(1 - q) * 14}px) scale(${0.98 + q * 0.02})`, maxHeight: q * 260, alignSelf: b.k === "you" ? "flex-end" : "flex-start", maxWidth: b.k === "you" ? "86%" : "92%" };
              if (b.k === "tool") return <div key={i} style={{ ...box, fontFamily: F.mono, fontSize: 15, color: b.refused ? C.danger : C.mute }}>↳ {b.text} <span style={{ color: b.refused ? C.danger : C.safe }}>{b.refused ? "· refused" : "· ok"}</span></div>;
              if (b.k === "you") return <div key={i} style={{ ...box, borderRadius: "20px 20px 6px 20px", background: "rgba(255,255,255,.12)", padding: "12px 18px", fontSize: 20, color: C.ink, lineHeight: 1.35 }}>{b.text}</div>;
              return (
                <div key={i} style={{ ...box, borderRadius: "20px 20px 20px 6px", background: "rgba(255,255,255,.08)", padding: "12px 18px", fontSize: 20, color: C.ink2, lineHeight: 1.35, boxShadow: b.refused ? `0 0 0 1.5px ${C.safe}88, 0 0 30px rgba(143,211,255,.25)` : undefined }}>
                  <span style={{ color: C.safe }}>SHAKE · </span>{b.text}
                  {b.link && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 14, borderRadius: 14, border: `1px solid ${C.line}`, background: "rgba(0,0,0,.25)", padding: 12 }}>
                      <Coin size={34} gap={3} glow={0.2} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, color: C.ink }}>Denim jacket · €60</div>
                        <div style={{ fontFamily: F.mono, fontSize: 13, color: C.mute }}>shake · deal K3X9A2</div>
                      </div>
                      <span style={{ borderRadius: 999, background: C.safe, padding: "6px 14px", fontSize: 15, fontWeight: 500, color: "#0b0b0c" }}>Lock €60</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 22px", borderTop: `1px solid ${locked ? C.safe + "40" : C.line}`, background: locked ? "rgba(143,211,255,.07)" : undefined, transform: `translateX(${nudge}px)` }}>
            <Coin size={26} gap={locked ? 0 : 3} glow={0.2} shut={locked ? t - ask : undefined} />
            <span style={{ flex: 1, fontSize: 18, color: locked ? C.safe : C.mute }}>{refused ? "Still locked. The AI never had the money." : locked ? "€60 locked on Stellar" : "Nothing locked yet"}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={locked ? C.safe : C.mute} strokeWidth="2" strokeLinecap="round"><rect x="4" y="11" width="16" height="10" rx="2.5" /><path d={locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.5-2"} /></svg>
          </div>
        </div>
      </Stage>
    </>
  );
}

/** the night-crew use case from /use-cases (src/components/UseCases.tsx), played by time instead of scroll */
const CREW = ["DJ", "Bar", "Door", "Sound", "Lights", "Bar"];
const NO_SHOW = 4;
function Crew({ t }: { t: number }) {
  const a = 36.8, b = 40.3, lp = lerp(t, [a + 0.05, b - 0.55], [0, 1], (x) => x);
  const p = spr(t, a, { stiffness: 140, damping: 22 });
  const m = (x: number[], y: number[]) => interpolate(lp, x, y, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.3, 0, 0.2, 1) });
  const pool = m([0.04, 0.16, 0.78, 0.9], [0, 720, 720, 0]);
  const words = V("v14").words.slice(1);
  return (
    <>
      <Col x={150} y={520} w={760}>
        <Rise t={t} at={a + 0.05}><Chip style={{ marginBottom: 26 }}>Coming next</Chip></Rise>
        <Words t={t} text="Pay a whole event crew, the moment they check in." times={words.map((w) => w.start)} size={84} />
      </Col>
      <div style={{ position: "absolute", left: 960 + (1 - p) * 600, top: 230, opacity: p }}>
        <svg width={860} height={602} viewBox="0 0 400 280" style={{ overflow: "visible" }}>
          <defs><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fd3ff" stopOpacity=".13" /><stop offset="1" stopColor="#8fd3ff" stopOpacity="0" /></linearGradient></defs>
          <g opacity={m([0.3, 0.36, 0.7, 0.76], [0, 1, 1, 0])}>
            <path d="M90 -10L40 260H150Z" fill="url(#beam)" transform={`rotate(${m([0.3, 0.72], [-28, 22])} 90 -10)`} />
            <path d="M310 -10L250 260H360Z" fill="url(#beam)" transform={`rotate(${-m([0.3, 0.72], [-28, 22])} 310 -10)`} />
          </g>
          <line x1="10" y1="246" x2="390" y2="246" stroke="rgba(255,255,255,.12)" />
          <circle cx={200} cy={52} r={26} fill="rgba(143,211,255,.08)" stroke="rgba(143,211,255,.35)" strokeWidth={1.2} />
          <g transform="translate(185 37) scale(1.25)"><path d={"M12 2A10 10 0 0 0 12 22V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z"} fill={C.safe} opacity={0.85} /><path d={"M12 2A10 10 0 0 1 12 22V16H14A1 1 0 0 0 15 15V9A1 1 0 0 0 14 8H12Z"} fill={C.safe} opacity={0.85} /></g>
          <text x={200} y={98} fontSize={14} fill={C.ink} textAnchor="middle" fontFamily={F.display} fontWeight={500}>€{Math.round(pool)}</text>
          <text x={200} y={20} fontSize={7} fill={C.mute} textAnchor="middle" fontFamily={F.mono} letterSpacing="1">HACKMERIDIAN · TONIGHT&apos;S CREW PAY</text>
          <text x={392} y={24} fontSize={10} fill={C.ink2} textAnchor="end" fontFamily={F.mono} opacity={m([0.3, 0.36, 0.74, 0.78], [0, 1, 1, 0])}>{(() => { const c = m([0.28, 0.76], [22 * 60, 27 * 60]); return `${String(Math.floor(c / 60) % 24).padStart(2, "0")}:${String(Math.floor((c % 60) / 15) * 15).padStart(2, "0")}`; })()}</text>
          <text x={200} y={114} fontSize={8} fill={C.safe} textAnchor="middle" fontFamily={F.mono} opacity={m([0.92, 0.96], [0, 1])}>€120 BACK TO YOU</text>
          {CREW.map((who, i) => {
            const x0 = 45 + i * 62, show = i !== NO_SHOW, inAt = 0.36 + i * 0.06, payAt = 0.8 + i * 0.012;
            const cx = m([0.16 + i * 0.015, 0.26 + i * 0.015, 0.84, 0.92], [200, x0, x0, show ? x0 : 200]);
            const cy = show ? m([0.16 + i * 0.015, 0.26 + i * 0.015, payAt, payAt + 0.05], [52, 150, 150, 186]) : m([0.16 + i * 0.015, 0.26 + i * 0.015, 0.84, 0.92], [52, 150, 150, 52]);
            const co = show ? m([0.15 + i * 0.015, 0.17 + i * 0.015, payAt + 0.04, payAt + 0.06], [0, 1, 1, 0]) : m([0.15 + i * 0.015, 0.17 + i * 0.015, 0.9, 0.93], [0, 1, 1, 0]);
            const lit = show ? m([inAt, inAt + 0.02], [0, 1]) : 0;
            const hop = show ? m([inAt, inAt + 0.015, inAt + 0.035], [0, -9, 0]) : 0;
            const walk = show ? m([inAt - 0.05, inAt], [16, 0]) : 0;
            const dim = show ? m([0.28, 0.3], [0.35, 1]) : m([0.6, 0.66], [0.35, 0.2]);
            const body = `M${x0 - 17} 236q0 -24 17 -24t17 24`;
            return (
              <g key={i}>
                <g transform={`translate(${walk} ${hop})`} opacity={dim}>
                  <circle cx={x0} cy={194} r={10} fill="#1a1f26" stroke="rgba(255,255,255,.3)" strokeWidth={1.2} />
                  <path d={body} fill="#1a1f26" stroke="rgba(255,255,255,.3)" strokeWidth={1.2} />
                  <g opacity={lit}><circle cx={x0} cy={194} r={10} fill="none" stroke={C.safe} strokeWidth={1.6} /><path d={body} fill="none" stroke={C.safe} strokeWidth={1.6} /></g>
                  <text x={x0} y={230} fontSize={7} fill={C.ink2} textAnchor="middle" fontFamily={F.mono}>{who.toUpperCase()}</text>
                </g>
                {show ? (
                  <>
                    <text x={x0} y={266} fontSize={11} fill={C.safe} textAnchor="middle" opacity={m([inAt + 0.01, inAt + 0.03, payAt, payAt + 0.02], [0, 1, 1, 0])}>✓</text>
                    <text x={x0} y={266} fontSize={9} fill={C.safe} textAnchor="middle" fontFamily={F.mono} opacity={m([payAt + 0.04, payAt + 0.07], [0, 1])}>€120 ✓</text>
                  </>
                ) : (
                  <text x={x0} y={266} fontSize={8} fill={C.mute} textAnchor="middle" fontFamily={F.mono} opacity={m([0.64, 0.68], [0, 1])}>NO-SHOW</text>
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
    </>
  );
}

/* ───────── 6 · the end card ───────── */
function End({ t }: { t: number }) {
  const S = 300, cy = 340, hit = HIT.end;
  const rush = lerp(t, [hit - 0.5, hit], [0, 1], easeIn);
  const off = 1300 * (1 - rush);
  const s = t - hit;
  const [sx, sy] = shake(s, 16);
  const logos: [string, string][] = [["stellar", "Stellar"], ["token", "Soroban"], ["openzeppelin", "OpenZeppelin"], ["passkey", "Passkeys"], ["anchor", "SEP-24"], ["proof", "On-chain receipts"]];
  const bottom = P("v15", 2).end + 0.1;
  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px)` }}>
      <div style={{ position: "absolute", left: 960 - S / 2, top: cy - S / 2 }}>
        <Coin size={S} l={-off} r={off} shut={s >= 0 ? s : undefined} glow={s >= 0 ? 0.9 : 0.5} />
      </div>
      <Burst s={s} x={960} y={cy} />
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + S / 2 + 40, display: "flex", justifyContent: "center" }}>
        {"SHAKE".split("").map((ch, i) => {
          const a = W("v15", "Shake") - 0.05 + i * 0.045, p = spr(t, a, SPR.snappy), o = lerp(t, [a, a + 0.18]);
          return <span key={i} style={{ fontFamily: F.display, fontWeight: 700, fontSize: 60, letterSpacing: "0.3em", color: C.ink, opacity: o, transform: `translateY(${(1 - p) * 40}px)`, display: "inline-block" }}>{ch}</span>;
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: cy + S / 2 + 140, display: "flex", justifyContent: "center", gap: 26 }}>
        <Say t={t} id="v15" i={1} size={90} />
        <Say t={t} id="v15" i={2} size={90} grad />
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
  ["whoosh", W("v01", "Sam") - 0.35, 0.45], ["whoosh", W("v02", "Ana") - 0.3, 0.45, 1.1],
  ["tick", P("v03", 0).start, 0.35], ["tick", P("v03", 1).start, 0.35], ["lock", P("v03", 2).start, 0.4],
  ["heart", 5.8, 0.55],
  ["swoosh", 9.35, 0.4], ["glitch", W("v05", "lie") - 0.04, 0.75], ["denied", W("v05", "lie") + 0.08, 0.6],
  ["riser", HIT.shake - 2.3, 0.5], ["slam", HIT.shake - 0.04, 0.6], ["shimmer", HIT.shake + 0.1, 0.45],
  ["swoosh", 13.2, 0.45], ["tick", W("v07", "tap") - 0.05, 0.7], ["lock", W("v07", "No") + 0.7, 0.55],
  ["whoosh", 16.72, 0.45], ["shimmer", W("v08", "Locked"), 0.4],
  ["whoosh", 20.95, 0.5, 0.9], ["beep", W("v09", "code") + 0.1, 0.55], ["riser", HIT.paid - 2.3, 0.55], ["heart", W("v09", "holds") - 0.3, 0.45],
  ["slam", HIT.paid - 0.04, 0.55], ["chime", HIT.paid + 0.12, 0.45], ["shimmer", HIT.paid + 0.15, 0.35],
  ["blip", 27.15, 0.5], ["whoosh", 27.1, 0.4], ["chime", W("v11", "Still"), 0.35, 1.15],
  ["whoosh", 29.05, 0.4], ["tick", W("v12", "OLX") + 0.15, 0.55],
  ["whoosh", 31.2, 0.4], ["pop", 31.55, 0.35], ["pop", 32.6, 0.35], ["pop", W("v13", "everything") - 0.4, 0.35], ["denied", W("v13", "except") - 0.05, 0.6],
  ["whoosh", 36.75, 0.4],
  ...CREW.map((_, i): Cue => ["tick", 36.85 + (0.36 + i * 0.06) * 2.9, 0.22, 1 + i * 0.05]).filter((_, i) => i !== NO_SHOW),
  ["riser", HIT.end - 2.3, 0.45], ["slam", HIT.end - 0.04, 0.6], ["shimmer", HIT.end + 0.1, 0.5], ["chime", P("v15", 2).start, 0.35],
  ["shimmer", P("v15", 2).end + 0.1, 0.4, 0.8], ["heart", P("v15", 2).end + 0.6, 0.25, 0.8],
];
// the score dips under the voice
const speaking = (t: number) => Math.max(0, ...LINES.map((l) => Math.min(lerp(t, [l.start - 0.15, l.start]), 1 - lerp(t, [l.start + l.dur, l.start + l.dur + 0.3]))));
const musicVol = (t: number) => (0.62 - 0.27 * speaking(t)) * (1 - lerp(t, [TOTAL - 0.8, TOTAL]));

export function Film() {
  const t = useCurrentFrame() / FPS;
  const danger = win(t, W("v05", "lie") - 0.04, 11.75, 0.08, 0.4);
  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: F.text }}>
      <Backdrop t={t} danger={danger} calm={win(t, HIT.paid - 2.2, HIT.paid, 0.8, 0.1) * 0.8} />
      <Scene t={t} a={0} b={13.75} fin={0.01}><Intro t={t} /></Scene>
      <Scene t={t} a={13.2} b={16.85}><Lock t={t} /></Scene>
      <Scene t={t} a={16.72} b={21.05}><Proof t={t} /></Scene>
      <Scene t={t} a={20.95} b={27.2}><Meet t={t} /></Scene>
      <Scene t={t} a={27.1} b={29.15}><NoSignal t={t} /></Scene>
      <Scene t={t} a={29.05} b={31.3}><Extension t={t} /></Scene>
      <Scene t={t} a={31.2} b={36.8}><Ai t={t} /></Scene>
      <Scene t={t} a={36.75} b={40.15}><Crew t={t} /></Scene>
      <Scene t={t} a={39.95} b={TOTAL + 1} fin={0.15}><End t={t} /></Scene>
      <Grain t={t} />
      <AbsoluteFill style={{ background: "#000", opacity: Math.max(1 - lerp(t, [0, 0.4]), lerp(t, [TOTAL - 0.5, TOTAL])) }} />

      <Audio src={staticFile(music.file)} volume={(f) => musicVol(f / FPS)} />
      {LINES.map((l) => (
        <Sequence key={l.id} from={sec(l.start)} layout="none"><Audio src={staticFile(l.file)} volume={1} /></Sequence>
      ))}
      {CUES.map(([id, at, vol = 0.5, rate = 1], i) => (
        <Sequence key={i} from={Math.max(0, sec(at))} layout="none"><Audio src={staticFile(sfx[id])} volume={vol} playbackRate={rate} /></Sequence>
      ))}
    </AbsoluteFill>
  );
}
