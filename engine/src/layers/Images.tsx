import React, { useMemo } from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";
import { clamp, useT } from "../kit";
import type { Scene, Shot } from "../types";

const XF = 0.45; // кроссфейд, с: новая картинка проявляется поверх старой и полностью видна ровно на своём таймкоде

/** Камера по картинке: наезд, отъезд, панорамы влево/вправо, наклон вверх/вниз, наезд со сдвигом.
 * Плавный разгон/торможение, без дрожи и случайного дрейфа. Сдвиг всегда в пределах запаса масштаба (края не видны). */
export const CAMS = ["in", "out", "left", "right", "up", "down", "in_left", "in_right", "punch", "reveal"] as const;
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
  punch: [1.0, 1.2, 0, 0, 0, 0], // быстрый наезд на лицо: разгон в начале, дальше почти стоит
  reveal: [1.22, 1.0, 0, 0, 0, 0], // с крупного плана на общий
};
const WEIGHTS: [Cam, number][] = [["in", 36], ["out", 16], ["left", 10], ["right", 10], ["up", 4], ["down", 4],
  ["in_left", 10], ["in_right", 10], ["punch", 18], ["reveal", 10]];
// разворот направления на соседнем кадре = «землетрясение» (урок 2026-09-27) — запрещён
const OPPOSITE: Partial<Record<Cam, Cam[]>> = { left: ["right", "in_right"], right: ["left", "in_left"], up: ["down"],
  down: ["up"], in_left: ["right", "in_right"], in_right: ["left", "in_left"] };
const ease = Easing.inOut(Easing.quad);
const snap = Easing.bezier(0.16, 1, 0.3, 1);
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
    const opts = WEIGHTS.filter(([c]) => (!short || c === "in" || c === "out") && (s.focus || (c !== "punch" && c !== "reveal")) && c !== out[i - 1] && !(OPPOSITE[out[i - 1]] ?? []).includes(c));
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

const TD: Record<string, number> = { zoom: 0.36, whip: 0.3 }; // длительность перехода, если короче XF

/** Как кадр входит (role "in") и как уходит (role "out"), o = 0..1 внутри перехода. Направление всегда одно. */
const trans = (kind: string, role: "in" | "out", o: number): React.CSSProperties => {
  const e = ease(o);
  const none: React.CSSProperties = {};
  if (o >= 1 && role === "in") return none;
  if (kind === "zoom") return role === "in"
    ? { opacity: Math.min(1, o * 1.7), transform: `scale(${0.76 + 0.24 * e})`, filter: `blur(${(1 - e) * 12}px)` }
    : { transform: `scale(${1 + 0.95 * e})`, filter: `blur(${e * 14}px)` };
  if (kind === "whip") return role === "in"
    ? { transform: `translateX(${(1 - e) * 100}%)`, filter: "url(#whipblur)" }
    : { transform: `translateX(${-e * 100}%)`, filter: "url(#whipblur)" };
  if (kind === "flip") return role === "in"
    ? { transformOrigin: "0% 50%", transform: `perspective(3200px) translateX(${(1 - e) * 100}%) rotateY(${(1 - e) * 88}deg)` }
    : { transformOrigin: "100% 50%", transform: `perspective(3200px) translateX(${-e * 100}%) rotateY(${-e * 88}deg)` };
  if (kind === "mosaic") return role === "in" ? { opacity: o >= 0.5 ? 1 : 0, filter: "url(#pixelate)" } : { filter: "url(#pixelate)" };
  if (kind === "iris") return role === "in" ? { clipPath: `circle(${e * 115}% at 50% 50%)` } : none;
  if (kind === "wipe") return role === "in"
    ? { WebkitMaskImage: `linear-gradient(100deg, #000 ${e * 130 - 30}%, transparent ${e * 130}%)`, maskImage: `linear-gradient(100deg, #000 ${e * 130 - 30}%, transparent ${e * 130}%)` } : none;
  return role === "in" ? { opacity: o } : none;
};

/** Мазки кисти: открывает кадр полосами туда-обратно, край мазка рваный (неподвижный). k 0..1, в % кадра. */
const brush = (k: number, id: number, rows = 7) => {
  if (k <= 0) return "polygon(0 0, 0 0, 0 0)";
  if (k >= 1) return undefined;
  const pos = k * rows, i = Math.min(rows - 1, Math.floor(pos)), fr = pos - i, h = 100 / rows;
  const rag = (x: number, row: number) => (rnd(Math.round(x) * 7 + row * 31 + id) - 0.5) * h * 0.34;
  const edge = (y: number, row: number, from: number, to: number) => {
    const pts: string[] = [], n = Math.max(1, Math.round(Math.abs(to - from) / 3));
    for (let j = 0; j <= n; j++) { const x = from + ((to - from) * j) / n; pts.push(`${x}% ${y + rag(x, row)}%`); }
    return pts;
  };
  const y0 = i * h, y1 = (i + 1) * h, ltr = i % 2 === 0, tip = ltr ? fr * 104 - 2 : 102 - fr * 104;
  const mid = (y0 + y1) / 2, nose = ltr ? tip + 2.4 : tip - 2.4;
  const pts = ["0% 0%", "100% 0%"];
  if (ltr) pts.push(`100% ${y0}%`, ...edge(y0, i, 100, tip), `${nose}% ${mid}%`, ...edge(y1, i + 1, tip, 0));
  else pts.push(`100% ${y1}%`, ...edge(y1, i + 1, 100, tip), `${nose}% ${mid}%`, ...edge(y0, i, tip, 0));
  return `polygon(${pts.join(", ")})`;
};

const One: React.FC<{ s: Shot; cam: Cam; t: number; style: React.CSSProperties }> = ({ s, cam, t, style }) => {
  const [k0, k1, x0, x1, y0, y1] = MOVES[cam];
  const strong = cam === "punch" || cam === "reveal";
  const p = interpolate(t, [s.start - XF, s.end + XF], [0, 1], { ...clamp, easing: strong ? snap : ease });
  const k = k0 + (k1 - k0) * p, x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p;
  const zoomy = x0 === 0 && x1 === 0 && y0 === 0 && y1 === 0;
  const origin = s.focus && zoomy ? `${s.focus[0] * 100}% ${s.focus[1] * 100}%` : "50% 50%";
  const layered = !!(s.fg && s.bg);
  const fill: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transformOrigin: origin };
  const back: React.CSSProperties = { ...fill, transform: `scale(${k}) translate(${x / k}%, ${y / k}%)` };
  // передний план ближе к камере: и наезд, и сдвиг сильнее фона, это и есть глубина
  const kf = k * 1.02 + (k - Math.min(k0, k1)) * 0.35;
  const front: React.CSSProperties = { ...fill, transform: `scale(${kf}) translate(${(1.6 * x) / kf}%, ${(1.3 * y) / kf}%)` };
  const pk = s.pop ? interpolate(t, [s.start - 0.22, s.start + 0.26], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.7)) }) : 1;
  const pop: React.CSSProperties = s.pop ? { opacity: interpolate(t, [s.start - 0.22, s.start - 0.1], [0, 1], clamp),
    transform: `translateY(${(1 - pk) * 7}%) scale(${0.84 + 0.16 * pk})`, transformOrigin: "50% 85%" } : {};
  const pic = (
    <>
      <Img src={staticFile(layered ? s.bg! : s.src!)} style={back} />
      {layered ? <AbsoluteFill style={pop}><Img src={staticFile(s.fg!)} style={front} /></AbsoluteFill> : null}
      {s.fx ? <Ambient kind={s.fx} t={t} /> : null}
    </>
  );
  if (!(s.draw && s.line)) return <AbsoluteFill style={{ ...style, overflow: "hidden" }}>{pic}</AbsoluteFill>;
  // отрисовка: перо ведёт контур по бумаге, следом вторая кисть заливает цветом
  const k_line = interpolate(t, [s.start - 0.2, s.start + 0.9], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const k_col = interpolate(t, [s.start + 0.72, s.start + 1.6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) });
  return (
    <AbsoluteFill style={{ ...style, overflow: "hidden", background: "#F6F1E7" }}>
      {k_col < 1 ? <AbsoluteFill style={{ clipPath: brush(k_line, s.id) }}><Img src={staticFile(s.line)} style={back} /></AbsoluteFill> : null}
      <AbsoluteFill style={{ clipPath: brush(k_col, s.id + 3, 5) }}>{pic}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Images: React.FC<{ shots: Shot[]; scenes?: Scene[] }> = ({ shots: all, scenes = [] }) => {
  const { t } = useT();
  const shots = useMemo(() => visibleShots(all, scenes), [all, scenes]);
  const cams = useMemo(() => camsFor(shots), [shots]);
  // только кадр сейчас и предыдущий (на время перехода) — не монтируем сотни картинок
  // берём ПОСЛЕДНИЙ начавшийся (с учётом проявления) кадр; раньше findIndex отдавал старый кадр,
  // и новый не рисовался во время перехода — выходила резкая склейка (жалоба 2026-10-26)
  let i = -1;
  for (let j = 0; j < shots.length && t >= shots[j].start - XF; j++) i = j;
  if (i < 0) i = 0;
  const cur = shots[i], prev = shots[i - 1];
  const kind = cur?.tr || "fade", td = TD[kind] ?? XF;
  const o = cur ? interpolate(t, [cur.start - td, cur.start], [0, 1], clamp) : 1;
  const list = [prev, cur].filter((s) => s && s.src && t >= s.start - XF && t < s.end + XF) as Shot[];
  const px = Math.max(1, Math.round(2 + (1 - Math.abs(2 * o - 1)) * 78)); // размер блока мозаики: пик на середине перехода
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="whipblur" x="-15%" y="-5%" width="130%" height="110%"><feGaussianBlur stdDeviation="52 0" /></filter>
          <filter id="pixelate" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feFlood x={px / 2} y={px / 2} width={1} height={1} />
            <feComposite width={px} height={px} />
            <feTile result="dots" />
            <feComposite in="SourceGraphic" in2="dots" operator="in" />
            <feMorphology operator="dilate" radius={px / 2} />
          </filter>
        </defs>
      </svg>
      {list.map((s) => <One key={s.id} s={s} cam={cams[shots.indexOf(s)]} t={t}
        style={o >= 1 ? {} : trans(kind, s === cur ? "in" : "out", o)} />)}
    </AbsoluteFill>
  );
};
