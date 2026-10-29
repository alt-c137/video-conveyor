import React, { useMemo } from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";
import { H, ThemeCtx, useSceneFade, useT, W } from "./kit";
import { Images } from "./layers/Images";
import { Captions, CTA, EndScreen, Progress } from "./layers/Overlay";
import * as A from "./scenes/A_text";
import * as B from "./scenes/B_visual";
import * as C from "./scenes/C_motion";
import type { Edit, Scene } from "./types";

export const REGISTRY: Record<string, React.FC<{ sc: Scene }>> = {
  title_card: A.TitleCard, question: A.Question, quote: A.Quote, words: A.Words, big_number: A.BigNumber,
  list: A.List, recap: A.Recap, myth_fact: A.MythFact, study: A.Study, split: A.Split, cards: A.Cards,
  bars: B.Bars, dots: B.Dots, scale: B.Scale, iceberg: B.Iceberg, meter: B.Meter, curve: B.Curve,
  steps: B.Steps, loop: B.Loop, battery: B.Battery, clock: B.Clock, spotlight: B.Spotlight, thought: B.Thought,
  pile: B.Pile, lineup: C.Lineup, drive: C.Drive, timeline: C.Timeline, race: C.Race,
};

/** Готовый ролик-вставка (HyperFrames и др.): public/clips/<файл>.mp4, без звука, на всю сцену. */
const Clip: React.FC<{ sc: Scene }> = ({ sc }) => {
  const { fps } = useVideoConfig();
  const src = String((sc.props as Record<string, unknown>).src || "");
  return (
    <Sequence from={Math.round(sc.start * fps)} layout="none">
      <OffthreadVideo src={staticFile(src)} muted style={{ width: W, height: H, objectFit: "cover" }} />
    </Sequence>
  );
};
REGISTRY.clip = Clip;

const SceneLayer: React.FC<{ sc: Scene }> = ({ sc }) => {
  const C = REGISTRY[sc.type];
  const o = useSceneFade(sc);
  if (!C) return null;
  return <AbsoluteFill style={{ opacity: o }}><C sc={sc} /></AbsoluteFill>;
};

/** Слой 1920×1080, растянутый на кадр (2560×1440): всё векторное, остаётся чётким. */
const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useVideoConfig();
  return <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `scale(${width / W})`, transformOrigin: "0 0", overflow: "hidden" }}>{children}</div>;
};

export const Video: React.FC<Edit> = (e0) => {
  const { t } = useT();
  // окно между двумя сценами короче 1.6 с — сцена держится до следующей, без мелькнувшей картинки
  const e = useMemo(() => {
    const sc = [...e0.scenes].sort((a, b) => a.start - b.start)
      .map((s, i, all) => (all[i + 1] && all[i + 1].start - s.end < 1.6 && all[i + 1].start > s.end ? { ...s, end: all[i + 1].start } : s));
    return { ...e0, scenes: sc };
  }, [e0]);
  const { fps } = useVideoConfig();
  const inScene = (x: number) => e.scenes.some((s) => x >= s.start - 0.1 && x < s.end + 0.1);
  const active = e.scenes.filter((s) => t >= s.start - 0.05 && t < s.end + 0.05);
  return (
    <ThemeCtx.Provider value={e.theme}>
      <AbsoluteFill style={{ background: "#111" }}>
        <Images shots={e.shots} scenes={e.scenes} />
        <Stage>
          {active.map((s, i) => <SceneLayer key={s.start + "_" + i} sc={s} />)}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 85% 80% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.22))" }} />
          <Progress sections={e.sections} hide={inScene} end={e.duration} />
          <Captions caps={e.captions} hide={inScene} />
          {e.cta.intro ? <CTA at={e.cta.intro} /> : null}
          {e.cta.outro ? <CTA at={e.cta.outro} /> : null}
          <EndScreen from={e.duration} title={e.title} channel={e.channel} />
        </Stage>
        <Audio src={staticFile(e.voice)} />
        {e.sfx.map((s, i) => (
          <Sequence key={i} from={Math.max(0, Math.round(s.t * fps))} durationInFrames={Math.round(3 * fps)} layout="none">
            <Audio src={staticFile("sfx/" + s.name + ".wav")} volume={s.vol ?? 0.3} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </ThemeCtx.Provider>
  );
};
