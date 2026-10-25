import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile } from "remotion";
import { clamp, useT } from "../kit";
import type { Shot } from "../types";

const XF = 0.14; // кроссфейд, с

/** Кен Бёрнс: только медленный наезд 1.00→1.045, постоянная скорость, по центру. Без сдвигов в стороны. */
const One: React.FC<{ s: Shot; t: number }> = ({ s, t }) => {
  const k = interpolate(t, [s.start - XF, s.end + XF], [1.0, 1.045], clamp);
  const o = interpolate(t, [s.start - XF, s.start], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Img src={staticFile(s.src!)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${k})` }} />
    </AbsoluteFill>
  );
};

export const Images: React.FC<{ shots: Shot[] }> = ({ shots }) => {
  const { t } = useT();
  // только кадр сейчас и предыдущий (на время кроссфейда) — не монтируем сотни картинок
  let i = shots.findIndex((s) => t >= s.start - XF && t < s.end);
  if (i < 0) i = t < (shots[0]?.start ?? 0) ? 0 : shots.length - 1;
  const list = [shots[i - 1], shots[i]].filter((s) => s && s.src && t >= s.start - XF && t < s.end + XF) as Shot[];
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {list.map((s) => <One key={s.id} s={s} t={t} />)}
    </AbsoluteFill>
  );
};
