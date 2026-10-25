# SHAKE film (45 s)

A Remotion project, kept separate from the app. Every screen is a real capture from https://shake-lake.vercel.app, taken during real testnet deals. The voice, sound effects and music come from ElevenLabs, using the `ELEVEN-LABS` key in the root `.env.local`.

```bash
cd video && npm install
npm run studio          # live preview with a timeline
npm run draft           # 960×540 render, fast → out/shake-draft.mp4
npm run final           # 1920×1080 → out/shake.mp4
```

## Tweaking

| Change | How |
| --- | --- |
| A spoken line or its pause | Edit `src/script.json` (`text`, `gap`, optional `speed`), then run `node scripts/voice.mjs`. Only changed lines are re-voiced, and on-screen words re-sync automatically from ElevenLabs word timestamps. |
| The voice | `voice` in `src/script.json`. To list the voices, run `node scripts/check.mjs`. |
| The score (after re-timing the voice) | `node scripts/sound.mjs music`. Its sections and the three slams follow `src/vo.json`. |
| A sound effect | Edit `SFX` in `scripts/sound.mjs`, run `node scripts/sound.mjs sfx`, then place it in `CUES` in `src/Film.tsx`. |
| The screenshots | `NODE_PATH=$TEMP/shotpw/node_modules node scripts/shots.cjs https://shake-lake.vercel.app [pages\|deal\|offline]`. Runs a real deal on testnet. |
| Visuals | `src/Film.tsx` holds the scenes; `src/kit.tsx` holds the coin, phone, type and backdrop. |

Port 39123 is used for rendering because the app's dev server sits on 3000.
