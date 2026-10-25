import React, { useMemo } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";
import { clamp, useT } from "../kit";
import type { Shot } from "../types";

const XF = 0.14; // кроссфейд, с

/** Камера по картинке: наезд, отъезд, панорамы влево/вправо, наклон вверх/вниз, наезд со сдвигом.
 * Плавный разгон/торможение, без дрожи и случайного дрейфа. Сдвиг всегда в пределах запаса масштаба (края не видны). */
export const CAMS = ["in", "out", "left", "right", "up", "down", "in_left", "in_right"] as const;
type Cam = (typeof CAMS)[number];
// [масштаб от, до, сдвиг x от, до, y от, до] — сдвиг в % кадра
const MOVES: Record<Cam, number[]> = {
  in: [1.0, 1.06, 0, 0, 0, 0],
  out: [1.06, 1.0, 0, 0, 0, 0],
  left: [1.08, 1.08, 3, -3, 0, 0], // камера идёт вправо — картинка уезжает влево
  right: [1.08, 1.08, -3, 3, 0, 0],
  up: [1.07, 1.07, 0, 0, 2.5, -2.5],
  down: [1.07, 1.07, 0, 0, -2.5, 2.5],
  in_left: [1.0, 1.07, 0, -2.5, 0, 0],
  in_right: [1.0, 1.07, 0, 2.5, 0, 0],
};
const WEIGHTS: [Cam, number][] = [["in", 36], ["out", 16], ["left", 10], ["right", 10], ["up", 4], ["down", 4],
  ["in_left", 10], ["in_right", 10]];
// разворот направления на соседнем кадре = «землетрясение» (урок 2026-09-27) — запрещён
const OPPOSITE: Partial<Record<Cam, Cam[]>> = { left: ["right", "in_right"], right: ["left", "in_left"], up: ["down"],
  down: ["up"], in_left: ["right", "in_right"], in_right: ["left", "in_left"] };
const ease = Easing.inOut(Easing.quad);

/** Движения всех кадров: из edit.json (shot.cam) или детерминированно по номеру; соседние не повторяются,
 * без разворота направления, короткие кадры (< 2 с) — только наезд/отъезд. */
export const camsFor = (shots: Shot[]): Cam[] => {
  const out: Cam[] = [];
  shots.forEach((s, i) => {
    if (s.cam && s.cam in MOVES) return out.push(s.cam as Cam);
    const short = s.end - s.start < 2;
    const opts = WEIGHTS.filter(([c]) => (!short || c === "in" || c === "out") && c !== out[i - 1] && !(OPPOSITE[out[i - 1]] ?? []).includes(c));
    const total = opts.reduce((a, [, w]) => a + w, 0);
    let r = ((s.id * 2654435761) >>> 0) % total;
    out.push(opts.find(([, w]) => (r -= w) < 0)?.[0] ?? "in");
  });
  return out;
};

const One: React.FC<{ s: Shot; cam: Cam; t: number }> = ({ s, cam, t }) => {
  const [k0, k1, x0, x1, y0, y1] = MOVES[cam];
  const p = interpolate(t, [s.start - XF, s.end + XF], [0, 1], { ...clamp, easing: ease });
  const k = k0 + (k1 - k0) * p, x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p;
  const o = interpolate(t, [s.start - XF, s.start], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: o, overflow: "hidden" }}>
      <Img src={staticFile(s.src!)} style={{ width: "100%", height: "100%", objectFit: "cover",
        transform: `scale(${k}) translate(${x / k}%, ${y / k}%)` }} />
    </AbsoluteFill>
  );
};

export const Images: React.FC<{ shots: Shot[] }> = ({ shots }) => {
  const { t } = useT();
  const cams = useMemo(() => camsFor(shots), [shots]);
  // только кадр сейчас и предыдущий (на время кроссфейда) — не монтируем сотни картинок
  let i = shots.findIndex((s) => t >= s.start - XF && t < s.end);
  if (i < 0) i = t < (shots[0]?.start ?? 0) ? 0 : shots.length - 1;
  const list = [shots[i - 1], shots[i]].filter((s) => s && s.src && t >= s.start - XF && t < s.end + XF) as Shot[];
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {list.map((s) => <One key={s.id} s={s} cam={cams[shots.indexOf(s)]} t={t} />)}
    </AbsoluteFill>
  );
};
