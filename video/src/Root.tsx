import { Composition } from "remotion";
import { Film } from "./Film";
import { Demo, DEMO_TOTAL } from "./Demo";
import { FPS, TOTAL } from "./kit";

export const Root = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={Math.ceil(TOTAL * FPS)} fps={FPS} width={1920} height={1080} />
    <Composition id="Demo" component={Demo} durationInFrames={Math.ceil(DEMO_TOTAL * FPS)} fps={FPS} width={1920} height={1080} />
  </>
);
