# SHAKE film (about 46 s)

This is a Remotion project, kept separate from the app.

The story: Sam finds a bike sold by a total stranger. Who pays first? The answer is the coin slam, then the real flow on real screens: lock, Ana sees it, they meet, scan, paid. Then come no signal, the Vinted/OLX extension, Claude/ChatGPT over MCP, and the use cases: cars, flats, parcels, an event crew paid at check-in. The film ends on the end card.

The phone screens are real captures from https://shake-lake.vercel.app, taken during real testnet deals. The voice, sound effects and music come from ElevenLabs, using the `ELEVEN-LABS` key in the root `.env.local`. Money is always written with the euro after the number: `400 €`.

```bash
cd video && npm install
npm run studio          # live preview with a timeline
npm run draft           # 960×540, fast → out/shake-draft.mp4
npm run final           # 1920×1080 → out/shake.mp4
```

## Tweaking

| Change | How |
| --- | --- |
| A spoken line or its pause | Edit `src/script.json` (`text`, `gap`), then run `node scripts/voice.mjs`. Each line is one natural take from ElevenLabs v3. The script makes 3 takes, transcribes each one back, and keeps the take that says the script exactly, preferring the tighter read. Add `"pick": n` to a line to force a take. On-screen words re-sync automatically. |
| The voice | Set `voice` in `src/script.json`. The current one is Veda Sky, Natural Conversations. Alternatives: Chris `iP95p4xoKVk53GoZ742B`, Eric `cjVigY5qzO86Huf0OWal`, George `JBFqnCBsd6RMkjVDRZzb`. List all voices with `node scripts/check.mjs`. |
| The score (after re-timing the voice) | Run `node scripts/sound.mjs music`. Its sections follow `src/vo.json`. The model never puts the drop exactly where it was asked, so the script finds the real drop and stores `lead`, and the film shifts the score so the drop lands on the slam. |
| A sound effect | Edit `SFX` in `scripts/sound.mjs`, run `node scripts/sound.mjs sfx`, then place the effect in `CUES` in `src/Film.tsx`. |
| The screenshots | Run `NODE_PATH=$TEMP/shotpw/node_modules node scripts/shots.cjs https://shake-lake.vercel.app [pages\|deal\|offline]`. This runs a real deal on testnet with locale `pt-PT`, so amounts read `400€`. |
| Visuals | `src/Film.tsx` holds the scenes, each placed on the words of the voice. `src/kit.tsx` holds the coin, phone, type and backdrop. |

Port 39123 is used for rendering because the app's dev server sits on 3000.
