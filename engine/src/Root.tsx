import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import type { Edit } from "./types";

const EMPTY: Edit = {
  fps: 30, duration: 10, title: "", channel: "", voice: "voice.mp3",
  theme: { paper: "#EFEAE0", ink: "#24272C", a1: "#2F6F6B", a2: "#D39B45", a3: "#B8C9C1", dark: "#1E2124" },
  shots: [], captions: [], sections: [], scenes: [], sfx: [], cta: { intro: 0, outro: 0 }, endSeconds: 20,
};

export const Root: React.FC = () => (
  <Composition
    id="Video"
    component={Video as unknown as React.FC<Record<string, unknown>>}
    width={2560}
    height={1440}
    fps={30}
    durationInFrames={300}
    defaultProps={EMPTY as unknown as Record<string, unknown>}
    calculateMetadata={({ props }) => {
      const e = props as unknown as Edit;
      return { durationInFrames: Math.ceil((e.duration + (e.endSeconds ?? 20)) * (e.fps || 30)), fps: e.fps || 30 };
    }}
  />
);
