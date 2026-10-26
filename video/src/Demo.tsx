// SHAKE · the live demo. Two real recordings of shake-lake.vercel.app (Playwright, 26 Oct 2026, deal 186662115765 on
// Stellar testnet), cut on one clock. Waiting for the network is sped up, and the film says so on screen.
import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, C, Chip, Coin, F, FPS, Grain, Phone, SPR, Stage, eyebrow, glacier, lerp, sec, spr, win } from "./kit";

// the recordings started a few seconds before the script's clock (events.json): video time = event time − offset
const OFF = { buyer: 3.5, seller: 4.8 };
const DEAL = "186662115765";

type Cap = { eye: string; title: string; sub: string; fast?: string };
// a: start on the event clock, b: end, rate: playback speed; seller: show Francisco's phone
type Seg = { a: number; b: number; rate: number; seller?: boolean; cap: Cap };
const SEGS: Seg[] = [
  { a: 2.6, b: 11.6, rate: 1, cap: { eye: "01 · Pay", title: "Pedro buys a bike. 40 €.", sub: "He pays the way he always does. Test money, nothing charged." } },
  { a: 11.6, b: 27.8, rate: 2.5, cap: { eye: "01 · Lock", title: "It locks on Stellar.", sub: "Our contract holds the 40 €. Pedro pays no fees.", fast: "2.5× · real time 16 s" } },
  { a: 27.8, b: 32.4, rate: 1, cap: { eye: "01 · Lock", title: "Locked. He sends the link.", sub: "In WhatsApp, or the OLX or Vinted chat." } },
  { a: 32.4, b: 38.6, rate: 1, seller: true, cap: { eye: "02 · See", title: "Francisco sees the real 40 €.", sub: "Verified on the Stellar network. Not a screenshot." } },
  { a: 38.6, b: 59.4, rate: 4, seller: true, cap: { eye: "02 · Meet", title: "They meet.", sub: "Francisco's phone shows a one-time QR.", fast: "4× · real time 21 s" } },
  { a: 59.4, b: 67.8, rate: 1, seller: true, cap: { eye: "03 · Scan", title: "Pedro checks the bike and scans.", sub: "Only that code can release the money. No camera here, so we type the QR's code." } },
  { a: 67.8, b: 78.2, rate: 1, seller: true, cap: { eye: "03 · Shake", title: "Hold to shake.", sub: "Released on Stellar in about 5 seconds." } },
  { a: 78.2, b: 84.6, rate: 1, seller: true, cap: { eye: "03 · Paid", title: "Francisco is paid.", sub: "Final. No chargebacks, no screenshots." } },
  { a: 84.6, b: 90.8, rate: 1, seller: true, cap: { eye: "Proof", title: "Every step is public.", sub: "Lock, join, release: three real transactions." } },
];
const INTRO = 3.2, EXPERT = 7, OUTRO = 4.5;
// where each segment starts on the film's clock
const AT: number[] = [];
SEGS.reduce((t, s, i) => ((AT[i] = t), t + (s.b - s.a) / s.rate), INTRO);
const PHONES_END = AT[AT.length - 1] + (SEGS[SEGS.length - 1].b - SEGS[SEGS.length - 1].a);
export const DEMO_TOTAL = PHONES_END + EXPERT + OUTRO;
const SELLER_IN = AT[SEGS.findIndex((s) => s.seller)];
const SHAKE_AT = AT[6] + 2.2, PAID_AT = AT[7] + 1.2;

const PW = 372; // phone screen width
function Screen({ who }: { who: "buyer" | "seller" }) {
  const k = PW / 393;
  return (
    <>
      {SEGS.map((s, i) =>
        who === "seller" && !s.seller ? null : (
          <Sequence key={i} from={sec(AT[i])} durationInFrames={sec((s.b - s.a) / s.rate) + 1} layout="none">
            <div style={{ position: "absolute", left: 0, top: 32 * k, width: PW, height: 852 * k, WebkitMaskImage: `linear-gradient(transparent, #000 ${16 * k}px)` }}>
              <OffthreadVideo src={staticFile(`demo/${who}.webm`)} trimBefore={Math.round((s.a - OFF[who]) * FPS)} playbackRate={s.rate} muted style={{ width: PW, height: 852 * k, display: "block" }} />
            </div>
          </Sequence>
        ),
      )}
    </>
  );
}

function Caption({ t }: { t: number }) {
  const i = SEGS.findIndex((_, j) => t >= AT[j] && (j === SEGS.length - 1 || t < AT[j + 1]));
  if (i < 0 || t > PHONES_END) return null;
  const s = SEGS[i], prev = SEGS[i - 1];
  const sameEye = prev && prev.cap.eye === s.cap.eye;
  const p = spr(t, AT[i], SPR.smooth), fade = 1 - lerp(t, [PHONES_END - 0.4, PHONES_END]);
  const end = AT[i] + (s.b - s.a) / s.rate;
  return (
    <div style={{ position: "absolute", left: 130, top: 330, width: 640, opacity: fade }}>
      <div style={{ ...eyebrow, color: C.safe, fontSize: 24, opacity: sameEye ? 1 : p }}>{s.cap.eye}</div>
      <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 70, lineHeight: 1.04, letterSpacing: "-0.02em", color: C.ink, marginTop: 22, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>{s.cap.title}</div>
      <div style={{ fontFamily: F.text, fontSize: 30, lineHeight: 1.35, color: C.ink2, marginTop: 24, opacity: lerp(t, [AT[i] + 0.15, AT[i] + 0.6]) }}>{s.cap.sub}</div>
      {s.cap.fast && (
        <div style={{ marginTop: 36, opacity: win(t, AT[i] + 0.2, end, 0.3, 0.2) }}>
          <Chip tone="mute">⏩ {s.cap.fast}</Chip>
        </div>
      )}
    </div>
  );
}

const Label = ({ text, o }: { text: string; o: number }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: -64, textAlign: "center", opacity: o, fontFamily: F.mono, fontSize: 20, letterSpacing: "0.14em", color: C.ink2 }}>{text}</div>
);

export const Demo = () => {
  const t = useCurrentFrame() / FPS;
  const inP = spr(t, INTRO - 0.5, SPR.smooth);
  const sell = spr(t, SELLER_IN - 0.2, SPR.smooth);
  const away = lerp(t, [PHONES_END - 0.5, PHONES_END + 0.3]);
  const ex = t - PHONES_END;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Backdrop t={t} calm={0.3} />

      {/* intro */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: win(t, 0, INTRO, 0.3, 0.45) }}>
        <Chip>Live demo · Stellar testnet</Chip>
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 132, letterSpacing: "-0.03em", marginTop: 36, ...glacier }}>Nothing staged.</div>
        <div style={{ fontFamily: F.text, fontSize: 34, color: C.ink2, marginTop: 24 }}>Two phones, one real payment. Recorded on shake-lake.vercel.app.</div>
      </AbsoluteFill>

      {/* the two phones */}
      <div style={{ opacity: (1 - away) * lerp(t, [INTRO - 0.5, INTRO]) }}>
        <Stage x={1300 - sell * 220 + (1 - inP) * 60} y={560} s={0.94 + inP * 0.06} ry={-4 + sell * 2}>
          <div style={{ position: "relative" }}>
            <Label text="PEDRO · BUYING" o={inP} />
            <Phone w={PW} layers={[]} glow={0.35}><Screen who="buyer" /></Phone>
          </div>
        </Stage>
        <Stage x={1540 + (1 - sell) * 280} y={560} o={sell} s={0.94 + sell * 0.06} ry={4}>
          <div style={{ position: "relative" }}>
            <Label text="FRANCISCO · SELLING" o={sell} />
            <Phone w={PW} layers={[]} glow={0.35 + 0.5 * win(t, PAID_AT, PAID_AT + 3, 0.3, 1)}>{t >= SELLER_IN - 0.3 && <Screen who="seller" />}</Phone>
          </div>
        </Stage>
        <Caption t={t} />
      </div>

      {/* the proof on Stellar Expert */}
      {ex > -0.5 && ex < EXPERT + 0.5 && <Expert t={ex} />}

      {/* end card */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: lerp(t, [DEMO_TOTAL - OUTRO, DEMO_TOTAL - OUTRO + 0.5]) }}>
        <Coin size={150} shut={spr(t, DEMO_TOTAL - OUTRO + 0.2, SPR.slam)} glow={0.8} />
        <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 92, letterSpacing: "-0.03em", marginTop: 40, color: C.ink }}>SHAKE</div>
        <div style={{ fontFamily: F.text, fontSize: 34, color: C.ink2, marginTop: 14 }}>Pay strangers. It only releases when you meet.</div>
        <div style={{ fontFamily: F.mono, fontSize: 24, color: C.safe, marginTop: 36, letterSpacing: "0.04em" }}>shake-lake.vercel.app</div>
      </AbsoluteFill>
      <Grain t={t} />

      <Sequence from={0} durationInFrames={sec(DEMO_TOTAL)} layout="none">
        <Audio src={staticFile("audio/music-e6193e.mp3")} volume={(f) => 0.32 * lerp(f / FPS, [0, 1]) * (1 - lerp(f / FPS, [46, 49.4]))} />
      </Sequence>
      <Sequence from={sec(46)} layout="none">
        <Audio src={staticFile("audio/music-17b6a4.mp3")} volume={(f) => 0.32 * lerp(f / FPS, [0, 3]) * (1 - lerp(f / FPS + 46, [DEMO_TOTAL - 2.5, DEMO_TOTAL]))} />
      </Sequence>
      <Sequence from={sec(SHAKE_AT)} layout="none"><Audio src={staticFile("audio/sfx/slam-c84b3a.mp3")} volume={0.5} /></Sequence>
      <Sequence from={sec(PAID_AT)} layout="none"><Audio src={staticFile("audio/sfx/chime-548d1c.mp3")} volume={0.5} /></Sequence>
    </AbsoluteFill>
  );
};

// the release transaction, zooming onto the call that moved the money
function Expert({ t }: { t: number }) {
  const z = lerp(t, [1.2, 3.2]);
  const W = 1500, k = W / 1600; // the screenshot is a 1600×900 page
  const fx = 520 * k, fy = 378 * k; // the release(...) row
  const s = 1 + z * 0.55;
  return (
    <AbsoluteFill style={{ opacity: win(t, 0, EXPERT, 0.5, 0.5) }}>
      <div style={{ position: "absolute", left: 130, top: 70 }}>
        <div style={{ ...eyebrow, color: C.safe, fontSize: 24 }}>Proof · Stellar Expert</div>
        <div style={{ fontFamily: F.display, fontWeight: 500, fontSize: 60, color: C.ink, marginTop: 14, letterSpacing: "-0.02em" }}>
          release({DEAL}) · <span style={{ color: C.safe }}>Successful</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: (1920 - W) / 2, top: 250, width: W, height: 900 * k * 0.86, overflow: "hidden", borderRadius: 26, border: `1px solid ${C.line}`, boxShadow: "0 40px 120px rgba(0,0,0,.6)" }}>
        <div style={{ transform: `scale(${s})`, transformOrigin: `${fx}px ${fy}px` }}>
          <Img src={staticFile("demo/expert.png")} style={{ width: W, display: "block" }} />
          <div style={{ position: "absolute", left: 140 * k, top: 342 * k, width: 1340 * k, height: 76 * k, borderRadius: 12, border: `3px solid ${C.safe}`, boxShadow: `0 0 40px ${C.safe}88`, opacity: lerp(t, [2.6, 3.2]) }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 130, bottom: 60, fontFamily: F.text, fontSize: 30, color: C.ink2, opacity: lerp(t, [3.2, 3.8]) }}>
        The fee was paid by SHAKE's sponsor account, not by Pedro.
      </div>
    </AbsoluteFill>
  );
}
