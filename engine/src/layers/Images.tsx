import React, { useMemo } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";
import { clamp, useT } from "../kit";
import type { Scene, Shot } from "../types";

const XF = 0.45; // кроссфейд, с: новая картинка проявляется поверх старой и полностью видна ровно на своём таймкоде

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
const MIN = 1.6; // картинка на экране не меньше, с

/** Что реально видно между код-сценами. Кадры под сценой не показываются; от кадра, который выглядывает
 * из-под сцены на 0.1-1 с, оставалась «мелькалка» (жалоба 2026-10-26: на 2:12 проскочили 2-3 картинки).
 * Теперь в каждом окне между сценами куски короче MIN сливаются с соседним кадром. */
export const visibleShots = (shots: Shot[], scenes: Scene[]): Shot[] => {
  const end = shots.length ? shots[shots.length - 1].end : 0;
  const sc = [...scenes].sort((a, b) => a.start - b.start);
  const free: [number, number][] = [];
  let a = 0;
  for (const s of sc) {
    if (s.start > a) free.push([a, s.start]);
    a = Math.max(a, s.end);
  }
  if (a < end) free.push([a, end]);
  const out: Shot[] = [];
  for (const [lo, hi] of free) {
    const ps = shots.filter((s) => s.src && s.end > lo && s.start < hi)
      .map((s) => ({ ...s, start: Math.max(s.start, lo), end: Math.min(s.end, hi) }));
    const win: Shot[] = [];
    for (const p of ps) {
      const last = win[win.length - 1];
      if (last && win.length === 1 && last.end - last.start < MIN) win[0] = { ...p, start: last.start }; // короткий первый — его место занимает следующий
      else if (last && last.end - last.start < MIN) last.end = p.end; // короткий предыдущий тянется дальше
      else if (last && p.end - p.start < MIN && p.end >= hi) last.end = p.end; // короткий хвост окна
      else win.push(p);
    }
    if (!win.length) continue;
    // запас под края сцены: пока сцена проявляется/гаснет, под ней уже/ещё нужная картинка
    if (lo > 0) win[0].start = lo - 0.4;
    if (hi < end) win[win.length - 1].end = hi + 0.4;
    out.push(...win);
  }
  return out;
};

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

const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const SW = 2560, SH = 1440;

/** Живая атмосфера поверх картинки. Чистая функция времени, движение в одну сторону: без дрожи и зерна. */
const Ambient: React.FC<{ kind: string; t: number }> = ({ kind, t }) => {
  const dots = useMemo(() => Array.from({ length: kind === "rain" ? 120 : kind === "snow" ? 150 : 70 }).map((_, i) => {
    const near = rnd(i + 9); // ближние крупнее и быстрее: глубина
    return { x: rnd(i), y: rnd(i + 3), near, ph: rnd(i + 5) * 6.28 };
  }), [kind]);
  const wrap = (v: number, m: number) => ((v % m) + m) % m;
  if (kind === "fog") return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen", opacity: 0.5 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", width: "130%", height: "70%", left: `${wrap(t * (5 + i * 2) + i * 47, 200) - 115}%`, top: `${12 + i * 26}%`,
          background: "radial-gradient(ellipse at center, #d9e0e0aa 0%, #d9e0e033 42%, transparent 70%)" }} />
      ))}
    </AbsoluteFill>
  );
  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {dots.map((d, i) => {
        const v = 0.45 + d.near;
        if (kind === "snow") {
          const y = wrap(d.y * SH + t * 95 * v, SH + 40) - 20, x = wrap(d.x * SW + t * 28 * v + Math.sin(t * 0.6 + d.ph) * 26, SW);
          return <circle key={i} cx={x} cy={y} r={3.5 + d.near * 8} fill="#fff" opacity={0.5 + d.near * 0.42} />;
        }
        if (kind === "rain") {
          const y = wrap(d.y * SH + t * 1500 * v, SH + 120) - 60, x = wrap(d.x * SW - t * 260 * v, SW);
          return <line key={i} x1={x} y1={y} x2={x + 13 * v} y2={y - 76 * v} stroke="#dbe9f4" strokeWidth={1.6 + d.near} opacity={0.2 + d.near * 0.26} />;
        }
        if (kind === "embers") {
          const life = wrap(t * 0.22 * v + d.y, 1), y = SH - life * SH * 0.8, x = d.x * SW + Math.sin(t * 0.9 + d.ph) * 22 + life * 90;
          return <circle key={i} cx={x} cy={y} r={3.2 + d.near * 5.4} fill={i % 3 ? "#ffb347" : "#ff7a2e"} opacity={Math.sin(life * Math.PI) * 0.85} />;
        }
        const y = wrap(d.y * SH - t * 12 * v, SH), x = wrap(d.x * SW + t * 20 * v, SW); // dust
        return <circle key={i} cx={x} cy={y} r={2.6 + d.near * 4} fill="#ffe9bd" opacity={0.26 + 0.34 * d.near * (0.6 + 0.4 * Math.sin(t * 0.7 + d.ph))} />;
      })}
    </svg>
  );
};

const One: React.FC<{ s: Shot; cam: Cam; t: number }> = ({ s, cam, t }) => {
  const [k0, k1, x0, x1, y0, y1] = MOVES[cam];
  const p = interpolate(t, [s.start - XF, s.end + XF], [0, 1], { ...clamp, easing: ease });
  const k = k0 + (k1 - k0) * p, x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p;
  const o = interpolate(t, [s.start - XF, s.start], [0, 1], clamp);
  // переход: не один наплыв, а разные чистые шторки (детерминированно по номеру кадра, направление одно — вправо/наружу)
  const m = ((s.id * 2654435761) >>> 0) % 10;
  const e = ease(o);
  const tr: React.CSSProperties = m < 5 || o >= 1 ? { opacity: o }
    : m < 7 ? { clipPath: `circle(${e * 115}% at 50% 50%)` }
    : m < 9 ? { WebkitMaskImage: `linear-gradient(90deg, #000 ${e * 130 - 30}%, transparent ${e * 130}%)`, maskImage: `linear-gradient(90deg, #000 ${e * 130 - 30}%, transparent ${e * 130}%)` }
    : { opacity: o, transform: `scale(${1.22 - 0.22 * e})` };
  return (
    <AbsoluteFill style={{ ...tr, overflow: "hidden" }}>
      <Img src={staticFile(s.src!)} style={{ width: "100%", height: "100%", objectFit: "cover",
        transform: `scale(${k}) translate(${x / k}%, ${y / k}%)` }} />
      {s.fx ? <Ambient kind={s.fx} t={t} /> : null}
    </AbsoluteFill>
  );
};

export const Images: React.FC<{ shots: Shot[]; scenes?: Scene[] }> = ({ shots: all, scenes = [] }) => {
  const { t } = useT();
  const shots = useMemo(() => visibleShots(all, scenes), [all, scenes]);
  const cams = useMemo(() => camsFor(shots), [shots]);
  // только кадр сейчас и предыдущий (на время кроссфейда) — не монтируем сотни картинок
  // берём ПОСЛЕДНИЙ начавшийся (с учётом проявления) кадр; раньше findIndex отдавал старый кадр,
  // и новый не рисовался во время перехода — выходила резкая склейка (жалоба 2026-10-26)
  let i = -1;
  for (let j = 0; j < shots.length && t >= shots[j].start - XF; j++) i = j;
  if (i < 0) i = 0;
  const list = [shots[i - 1], shots[i]].filter((s) => s && s.src && t >= s.start - XF && t < s.end + XF) as Shot[];
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      {list.map((s) => <One key={s.id} s={s} cam={cams[shots.indexOf(s)]} t={t} />)}
    </AbsoluteFill>
  );
};
