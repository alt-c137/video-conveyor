// Сцены «как у студии» (2026-10-31): морфинг фигур, рисованные графики (rough.js), пончик, линии, сеть, воронка с частицами,
// текст из частиц, карта/глобус (d3-geo), документ с маркером, телефон, пузыри, сценка с персонажами.
// Каждый кадр — чистая функция времени: все случайности из seed, ничего не дрожит, рендер детерминированный.
import React, { useLayoutEffect, useMemo, useRef } from "react";
import { interpolate } from "remotion";
import { interpolate as morphPath } from "flubber";
import rough from "roughjs/bin/rough";
import { geoInterpolate, geoMercator, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldData from "world-atlas/countries-110m.json";
import { At, BACK, Card, clamp, cueTimes, EO, FONT, H, lerpColor, OUTC, Paper, rnd, SERIF, Txt, useT, useTheme, W } from "../kit";
import { Character } from "../Character";
import type { Expression, Pose } from "../Character";
import type { Scene } from "../types";

type P = { sc: Scene };
const num = (x: unknown, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

/** Медленно живущий тёмный фон: два пятна света плывут в одну сторону, без зерна. */
export const Mesh: React.FC<{ children?: React.ReactNode; a?: string; b?: string; base?: string }> = ({ children, a, b, base }) => {
  const th = useTheme();
  const { t } = useT();
  const x1 = 20 + (t * 1.1) % 60, x2 = 80 - (t * 0.8) % 60;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: base || th.dark }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse 60% 70% at ${x1}% 30%, ${a || th.a1}66, transparent 70%), radial-gradient(ellipse 55% 60% at ${x2}% 75%, ${b || th.a2}44, transparent 70%)` }} />
      {children}
    </div>
  );
};

/** Canvas 1920×1080, рисуется заново на каждый кадр из функции времени. */
const Cv: React.FC<{ draw: (c: CanvasRenderingContext2D) => void; dep: number }> = ({ draw, dep }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, W, H);
    draw(c);
  }, [dep, draw]);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0 }} />;
};

// ---------- Морфинг фигур ----------
const star = (cx: number, cy: number, R: number, r: number, n = 5) =>
  "M" + Array.from({ length: n * 2 }).map((_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / n, q = i % 2 ? r : R;
    return `${(cx + q * Math.cos(a)).toFixed(1)} ${(cy + q * Math.sin(a)).toFixed(1)}`;
  }).join("L") + "Z";
const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}Z`;
export const SHAPES: Record<string, string> = {
  circle: circle(200, 200, 170), coin: circle(200, 200, 170),
  square: "M40 40H360V360H40Z",
  triangle: "M200 30L370 350H30Z",
  star: star(200, 205, 185, 80),
  burst: star(200, 200, 185, 115, 12),
  house: "M200 30L375 185H325V365H75V185H25Z",
  arrow_up: "M200 25L360 195H265V375H135V195H40Z",
  arrow_down: "M135 25H265V205H360L200 375L40 205H135Z",
  bolt: "M235 15L80 225H185L150 385L320 160H210Z",
  shield: "M200 20L350 75V195Q350 310 200 380Q50 310 50 195V75Z",
  drop: "M200 20Q345 190 345 255A145 125 0 1 1 55 255Q55 190 200 20Z",
  cloud: "M105 310A85 85 0 0 1 95 142A110 110 0 0 1 305 130A90 90 0 0 1 310 310Z",
  lock: "M110 170V115A90 90 0 0 1 290 115V170H335V370H65V170ZM155 170H245V115A45 45 0 0 0 155 115Z",
  key: "M130 55A85 85 0 0 1 200 190L350 340V375H285V330H240V285H195L155 245A85 85 0 1 1 130 55Z",
  flag: "M85 25H120V50H345L285 145L345 240H120V375H85Z",
  brain: "M140 65A62 62 0 0 1 200 48A62 62 0 0 1 262 65A68 68 0 0 1 332 128A66 66 0 0 1 350 225A68 68 0 0 1 300 312A66 66 0 0 1 200 348A66 66 0 0 1 100 312A68 68 0 0 1 50 225A66 66 0 0 1 68 128A68 68 0 0 1 140 65Z",
  check: "M35 215L100 150L165 215L305 60L370 125L165 345Z",
  cross: "M100 30L200 130L300 30L370 100L270 200L370 300L300 370L200 270L100 370L30 300L130 200L30 100Z",
  person: "M200 25A70 70 0 1 1 199 25ZM80 375V275Q80 170 200 170Q320 170 320 275V375Z",
  bar_chart: "M40 370V225H125V370ZM155 370V130H245V370ZM275 370V35H360V370Z",
};
const firstSub = (d: string) => d.split(/(?<=Z)/)[0];
const pickShape = (n: unknown) => firstSub(SHAPES[String(n || "").toLowerCase()] || SHAPES.circle);

/** props: {from, to, label_from?, label_to?, title?, caption?} — одно превращается в другое. cues = [момент превращения] */
export const Morph: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp, t } = useT();
  const f = useMemo(() => morphPath(pickShape(sc.props.from), pickShape(sc.props.to), { maxSegmentLength: 6 }), [sc.props.from, sc.props.to]);
  const at = sc.cues?.[0] && sc.cues[0] > sc.start ? sc.cues[0] : sc.start + (sc.end - sc.start) * 0.42;
  const k = p(at, 1.1, EO);
  const col = lerpColor(th.a1, th.a2, k);
  const rays = sp(at + 0.9, 12);
  return (
    <Mesh>
      {sc.props.title ? <At x={W / 2} y={120} o={p(sc.start + 0.1, 0.4)}><Txt size={64} w={900} color="#fff">{sc.props.title}</Txt></At> : null}
      <At x={W / 2} y={530} s={sp(sc.start + 0.05, 12) * (1 + 0.1 * Math.sin(k * Math.PI)) * (1 + (t - sc.start) * 0.006)} r={k * 360}>
        <svg width={560} height={560} viewBox="0 0 400 400" style={{ overflow: "visible", filter: `drop-shadow(0 24px 50px ${col}88)` }}>
          <path d={f(k)} fill={col} stroke="#fff" strokeWidth={7} strokeLinejoin="round" />
        </svg>
      </At>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * Math.PI * 2, r0 = 310 + 60 * rays, r1 = r0 + 90 * rays;
          return <line key={i} x1={W / 2 + r0 * Math.cos(a)} y1={530 + r0 * Math.sin(a)} x2={W / 2 + r1 * Math.cos(a)} y2={530 + r1 * Math.sin(a)} stroke={th.a2} strokeWidth={9} strokeLinecap="round" opacity={rays * (1 - p(at + 1.8, 0.6))} />;
        })}
      </svg>
      {sc.props.label_from ? <At x={W / 2} y={940} o={1 - p(at, 0.4)}><Txt size={62} w={900} color="#fff">{sc.props.label_from}</Txt></At> : null}
      {sc.props.label_to ? <At x={W / 2} y={940} o={p(at + 0.5, 0.4)} s={0.9 + 0.1 * p(at + 0.5, 0.4, BACK)}><Txt size={68} w={900} color="#fff">{sc.props.label_to}</Txt></At> : null}
      {sc.props.caption ? <At x={W / 2} y={1020} o={p(at + 1, 0.4)}><Txt size={36} w={700} color="#ffffffcc">{sc.props.caption}</Txt></At> : null}
    </Mesh>
  );
};

// ---------- Рисованный график (rough.js, seed постоянный: линии не дрожат) ----------
const roughPaths = (shape: { sets: { type: string; ops: { op: string; data: number[] }[] }[]; options: Record<string, unknown> }, gen: { toPaths: (d: unknown) => { d: string; stroke: string; fill?: string; strokeWidth: number }[] }) => gen.toPaths(shape);

/** props: {kind: "line"|"bars"|"pie", title, items: [{label, value}], unit?, caption?} — рисуется рукой на глазах. */
export const Sketch: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, t } = useT();
  const items: { label?: string; value?: number }[] = (sc.props.items || []).slice(0, 7);
  const kind = String(sc.props.kind || "bars");
  const n = Math.max(1, items.length);
  const max = Math.max(1, ...items.map((i) => num(i.value)));
  const cues = cueTimes(sc, n, 0.5);
  const x0 = 260, x1 = W - 260, y0 = 880, y1 = 270;
  const px = (i: number) => (n === 1 ? W / 2 : x0 + ((x1 - x0) * i) / (n - 1));
  const py = (v: number) => y0 - ((y0 - y1) * v) / max;
  const palette = [th.a1, th.a2, th.ink, th.a3, "#C8553D", "#7A5C99", "#5C6B77"];
  const layers = useMemo(() => {
    const g = rough.generator({ options: { seed: 7, roughness: 1.3, bowing: 1.4 } }) as never as { line: Function; linearPath: Function; rectangle: Function; arc: Function; toPaths: Function };
    const out: { paths: { d: string; stroke: string; fill?: string; strokeWidth: number }[]; i: number }[] = [];
    if (kind === "line") {
      items.forEach((it, i) => { if (i) out.push({ i, paths: roughPaths(g.line(px(i - 1), py(num(items[i - 1].value)), px(i), py(num(it.value)), { stroke: th.a1, strokeWidth: 8 }), g as never) }); });
    } else if (kind === "pie") {
      const sum = items.reduce((a, b) => a + num(b.value), 0) || 1;
      let a = -Math.PI / 2;
      items.forEach((it, i) => {
        const b = a + (num(it.value) / sum) * Math.PI * 2;
        out.push({ i, paths: roughPaths(g.arc(W / 2 - 200, 570, 600, 600, a, b, true, { stroke: th.ink, strokeWidth: 5, fill: palette[i % 7], fillStyle: "hachure", fillWeight: 5, hachureGap: 13 }), g as never) });
        a = b;
      });
    } else {
      const bw = Math.min(210, ((x1 - x0) / n) * 0.62), bx = (i: number) => x0 + ((x1 - x0) * (i + 0.5)) / n - bw / 2;
      items.forEach((it, i) => {
        const h = y0 - py(num(it.value));
        out.push({ i, paths: roughPaths(g.rectangle(bx(i), y0 - h, bw, h, { stroke: th.ink, strokeWidth: 5, fill: palette[i % 2], fillStyle: "hachure", fillWeight: 6, hachureGap: 15 }), g as never) });
      });
    }
    return out;
  }, [sc.props.items, kind]);
  const axis = p(sc.start + 0.15, 0.5);
  return (
    <Paper>
      <At x={W / 2} y={130} o={p(sc.start + 0.1, 0.4)}><Txt size={64} w={900}>{sc.props.title || ""}</Txt></At>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {kind !== "pie" ? <line x1={x0 - 60} y1={y0} x2={x0 - 60 + (x1 - x0 + 120) * axis} y2={y0} stroke={th.ink} strokeWidth={6} strokeLinecap="round" /> : null}
        {layers.map((l, j) => {
          const k = p(cues[l.i] - (kind === "line" ? 0.5 : 0), kind === "line" ? 0.55 : 0.9);
          if (k <= 0) return null;
          return (
            <g key={j} style={kind === "bars" ? { clipPath: `inset(${(1 - k) * 100}% 0 0 0)`, transformBox: "fill-box" } : undefined}>
              {l.paths.map((q, m) => (
                <path key={m} d={q.d} stroke={q.stroke === "none" ? "none" : q.stroke} fill={q.fill || "none"} strokeWidth={q.strokeWidth} pathLength={1} strokeDasharray={kind === "bars" ? undefined : 1} strokeDashoffset={kind === "bars" ? undefined : 1 - k} strokeLinecap="round" opacity={kind === "pie" ? Math.min(1, k * 1.5) : 1} />
              ))}
            </g>
          );
        })}
        {kind === "line" ? items.map((it, i) => { const k = p(cues[i], 0.3, BACK); return <circle key={i} cx={px(i)} cy={py(num(it.value))} r={17 * k} fill={th.a2} stroke={th.ink} strokeWidth={5} />; }) : null}
      </svg>
      {kind === "pie" ? items.map((it, i) => (
        <At key={i} x={1380} y={330 + i * Math.min(110, 500 / n)} o={p(cues[i], 0.35)}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, width: 620 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: palette[i % 7], border: `4px solid ${th.ink}` }} />
            <Txt size={42} w={800} align="left">{it.label}{it.value !== undefined ? ` — ${it.value}${sc.props.unit || ""}` : ""}</Txt>
          </div>
        </At>
      )) : items.map((it, i) => {
        const cx = kind === "line" ? px(i) : x0 + ((x1 - x0) * (i + 0.5)) / n;
        const v = num(it.value);
        return (
          <React.Fragment key={i}>
            <At x={cx} y={py(v) - 54} o={p(cues[i] + 0.2, 0.3)}><Txt size={46} w={900}>{Math.round(v * p(cues[i], 0.9)).toLocaleString("en-US")}{sc.props.unit || ""}</Txt></At>
            <At x={cx} y={y0 + 56} o={p(cues[i], 0.3)}><Txt size={32} w={700} style={{ width: 280 }}>{it.label}</Txt></At>
          </React.Fragment>
        );
      })}
      {sc.props.caption ? <At x={W / 2} y={1016} o={p(sc.end - 1.8, 0.4)}><Txt size={38} w={800} color={th.a1}>{sc.props.caption}</Txt></At> : null}
      <div style={{ display: "none" }}>{t}</div>
    </Paper>
  );
};

/** props: {title?, value 0-100, label, caption?, suffix?} — большой пончик заполняется, число бежит. */
export const Donut: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp } = useT();
  const v = Math.max(0, Math.min(100, num(sc.props.value)));
  const k = p(sc.cues?.[0] ?? sc.start + 0.4, 1.5);
  const R = 300, L = 2 * Math.PI * R;
  return (
    <Mesh>
      {sc.props.title ? <At x={W / 2} y={105} o={p(sc.start + 0.1, 0.4)}><Txt size={58} w={900} color="#fff">{sc.props.title}</Txt></At> : null}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <circle cx={W / 2} cy={560} r={R} fill="none" stroke="#ffffff22" strokeWidth={82} />
        <circle cx={W / 2} cy={560} r={R} fill="none" stroke={th.a2} strokeWidth={82} strokeDasharray={L} strokeDashoffset={L * (1 - (v / 100) * k)} strokeLinecap="round" transform={`rotate(-90 ${W / 2} 560)`} style={{ filter: `drop-shadow(0 0 26px ${th.a2}99)` }} />
      </svg>
      <At x={W / 2} y={530} s={sp(sc.start + 0.1, 12)}><Txt size={150} w={900} color="#fff">{Math.round(v * k)}{sc.props.suffix ?? "%"}</Txt></At>
      <At x={W / 2} y={640} o={p(sc.start + 0.7, 0.4)}><Txt size={40} w={700} color="#ffffffdd" style={{ width: 420 }}>{sc.props.label || ""}</Txt></At>
      {sc.props.caption ? <At x={W / 2} y={1000} o={p(sc.end - 1.8, 0.4)}><Txt size={38} w={800} color="#fff">{sc.props.caption}</Txt></At> : null}
    </Mesh>
  );
};

/** props: {title, y_label?, x_labels?: [..], series: [{label, points: [числа], color?}] x1-3, caption?} — линии растут, у конца бежит подпись. */
export const Lines: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p } = useT();
  const series: { label?: string; points?: number[]; color?: string }[] = (sc.props.series || []).slice(0, 3);
  const all = series.flatMap((s) => (s.points || []).map(Number));
  const hi = Math.max(1, ...all), lo = Math.min(0, ...all);
  const x0 = 210, x1 = W - 330, y0 = 880, y1 = 240;
  const cols = [th.a2, th.a1, "#C8553D"];
  const go = interpolate(t, [sc.start + 0.5, Math.max(sc.start + 2, sc.end - 1.2)], [0, 1], { ...clamp, easing: EO });
  const xl: string[] = sc.props.x_labels || [];
  return (
    <Mesh>
      <At x={W / 2} y={110} o={p(sc.start + 0.1, 0.4)}><Txt size={60} w={900} color="#fff">{sc.props.title || ""}</Txt></At>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>{series.map((_, i) => <linearGradient key={i} id={`lg${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={cols[i]} stopOpacity=".42" /><stop offset="1" stopColor={cols[i]} stopOpacity="0" /></linearGradient>)}</defs>
        {[0, 1, 2, 3].map((i) => { const y = y0 - ((y0 - y1) * i) / 3; return <line key={i} x1={x0} x2={x0 + (x1 - x0) * p(sc.start + 0.1, 0.6)} y1={y} y2={y} stroke="#ffffff22" strokeWidth={2} />; })}
        {series.map((s, i) => {
          const pts = (s.points || []).map(Number);
          if (pts.length < 2) return null;
          const f = go * (pts.length - 1), m = Math.floor(f), e = f - m;
          const xy = (j: number) => [x0 + ((x1 - x0) * j) / (pts.length - 1), y0 - ((pts[j] - lo) / (hi - lo)) * (y0 - y1)];
          const seen = pts.slice(0, m + 1).map((_, j) => xy(j));
          const [ax, ay] = xy(m), [bx, by] = m + 1 < pts.length ? xy(m + 1) : [ax, ay];
          const hx = ax + (bx - ax) * e, hy = ay + (by - ay) * e;
          const d = [...seen, [hx, hy]].map((q, j) => `${j ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join("");
          return (
            <g key={i}>
              <path d={`${d}L${hx} ${y0}L${x0} ${y0}Z`} fill={`url(#lg${i})`} />
              <path d={d} fill="none" stroke={cols[i]} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 16px ${cols[i]})` }} />
              <circle cx={hx} cy={hy} r={19} fill="#fff" stroke={cols[i]} strokeWidth={8} />
            </g>
          );
        })}
      </svg>
      {series.map((s, i) => {
        const pts = (s.points || []).map(Number);
        if (pts.length < 2) return null;
        const f = go * (pts.length - 1), m = Math.min(pts.length - 2, Math.floor(f)), v = pts[m] + (pts[m + 1] - pts[m]) * (f - m);
        return <div key={i} style={{ position: "absolute", left: Math.min(x0 + (x1 - x0) * go + 34, W - 300), top: y0 - ((v - lo) / (hi - lo)) * (y0 - y1) - 24, fontFamily: FONT, fontWeight: 800, fontSize: 36, color: "#fff", whiteSpace: "nowrap" }}>{s.label}</div>;
      })}
      {xl.map((x, i) => <At key={i} x={x0 + ((x1 - x0) * i) / Math.max(1, xl.length - 1)} y={930} o={p(sc.start + 0.3, 0.4)}><Txt size={32} w={700} color="#ffffffbb">{x}</Txt></At>)}
      {sc.props.y_label ? <At x={x0 + 30} y={205} o={p(sc.start + 0.3, 0.4)} style={{ whiteSpace: "nowrap" }}><Txt size={30} w={700} color="#ffffff99">{sc.props.y_label}</Txt></At> : null}
      {sc.props.caption ? <At x={W / 2} y={1015} o={p(sc.end - 1.8, 0.4)}><Txt size={38} w={800} color="#fff">{sc.props.caption}</Txt></At> : null}
    </Mesh>
  );
};

/** props: {title?, center?, count 12-70, caption?} — от центра волнами расходятся связи (слух, идея, влияние, рост). */
export const Network: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p, sp } = useT();
  const n = Math.max(12, Math.min(70, num(sc.props.count, 40)));
  const nodes = useMemo(() => {
    const out: { x: number; y: number; ring: number; par: number }[] = [];
    for (let i = 0; i < n; i++) {
      const ring = 1 + Math.floor(Math.sqrt(i * 0.8)), a = i * 2.39996, r = 120 + ring * 82 + rnd(i + 3) * 34;
      const x = W / 2 + Math.cos(a) * r * 1.5, y = 570 + Math.sin(a) * r * 0.78;
      // родитель — ближайший узел внутреннего кольца: дерево расходится от центра, линии не перечёркивают экран
      let par = -1, best = ring === 1 ? -1 : Infinity;
      out.forEach((q, j) => { const d = Math.hypot(q.x - x, q.y - y); if (q.ring < ring && d < best) { best = d; par = j; } });
      out.push({ x, y, ring, par });
    }
    return out;
  }, [n]);
  const span = sc.end - sc.start - 1.5;
  const maxR = Math.max(...nodes.map((q) => q.ring));
  const when = (i: number) => sc.start + 0.45 + (nodes[i].ring / maxR) * span * 0.75 + rnd(i * 7) * 0.25;
  const draw = React.useCallback((c: CanvasRenderingContext2D) => {
    nodes.forEach((q, i) => {
      const a = q.par < 0 ? { x: W / 2, y: 570 } : nodes[q.par];
      const k = interpolate(t, [when(i), when(i) + 0.45], [0, 1], { ...clamp, easing: EO });
      if (k <= 0) return;
      c.strokeStyle = th.a2 + "bb"; c.lineWidth = 4;
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(a.x + (q.x - a.x) * k, a.y + (q.y - a.y) * k); c.stroke();
      // импульс бежит по связи только один раз
      if (k < 1) { c.fillStyle = "#fff"; c.beginPath(); c.arc(a.x + (q.x - a.x) * k, a.y + (q.y - a.y) * k, 8, 0, 7); c.fill(); }
    });
    nodes.forEach((q, i) => {
      const k = interpolate(t, [when(i) + 0.35, when(i) + 0.6], [0, 1], { ...clamp, easing: OUTC });
      if (k <= 0) return;
      c.fillStyle = th.a1; c.strokeStyle = "#fff"; c.lineWidth = 4;
      c.beginPath(); c.arc(q.x, q.y, (15 + rnd(i) * 11) * k, 0, 7); c.fill(); c.stroke();
    });
  }, [t, nodes]);
  return (
    <Mesh>
      <Cv draw={draw} dep={t} />
      {sc.props.title ? <At x={W / 2} y={70} o={p(sc.start + 0.1, 0.4)}><div style={{ background: "#0009", padding: "8px 30px", borderRadius: 16 }}><Txt size={54} w={900} color="#fff">{sc.props.title}</Txt></div></At> : null}
      <At x={W / 2} y={570} s={sp(sc.start + 0.1, 10)}><div style={{ background: th.a2, color: th.ink, fontFamily: FONT, fontWeight: 900, fontSize: 40, padding: "20px 38px", borderRadius: 60, border: "6px solid #fff", maxWidth: 420, textAlign: "center" }}>{sc.props.center || ""}</div></At>
      {sc.props.caption ? <At x={W / 2} y={1022} o={p(sc.end - 1.8, 0.4)}><Txt size={38} w={800} color="#fff">{sc.props.caption}</Txt></At> : null}
    </Mesh>
  );
};

/** props: {title?, stages: [{label, value?}] x2-5, caption?} — поток частиц проходит сито этапов, с каждым этапом их меньше. */
export const Funnel: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p } = useT();
  const st: { label?: string; value?: string | number }[] = (sc.props.stages || []).slice(0, 5);
  const n = Math.max(2, st.length);
  const cues = cueTimes(sc, n, 0.4);
  const top = 230, bot = 930, hh = (bot - top) / n;
  const wid = (i: number) => 1120 * Math.pow(0.66, i);
  const draw = React.useCallback((c: CanvasRenderingContext2D) => {
    for (let i = 0; i < 260; i++) {
      const life = 2.6 + rnd(i) * 1.4, ph = rnd(i + 500) * life;
      const u = ((t - sc.start + ph) % life) / life;
      if (t - sc.start < 0.5) continue;
      const y = top - 40 + u * (bot - top + 90), lvl = Math.min(n - 1, Math.max(0, Math.floor((y - top) / hh)));
      // частица доходит только до своего этапа и исчезает
      const stop = Math.floor(rnd(i + 900) * rnd(i + 901) * (n + 1) * 1.6);
      if (lvl > stop) continue;
      const hw = wid(lvl) / 2 - 18;
      const x = W / 2 - 240 + (rnd(i + 200) - 0.5) * 2 * hw * 0.82;
      c.fillStyle = i % 5 ? "#ffffffcc" : th.a2;
      c.beginPath(); c.arc(x, y, 6 + rnd(i) * 5, 0, 7); c.fill();
    }
  }, [t, n]);
  return (
    <Mesh>
      {sc.props.title ? <At x={W / 2} y={110} o={p(sc.start + 0.1, 0.4)}><Txt size={60} w={900} color="#fff">{sc.props.title}</Txt></At> : null}
      {st.map((s, i) => {
        const w0 = wid(i), w1 = wid(i + 1), y = top + i * hh, k = p(cues[i], 0.5), cx = W / 2 - 240;
        return (
          <React.Fragment key={i}>
            <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: k }}>
              <path d={`M${cx - w0 / 2} ${y}H${cx + w0 / 2}L${cx + w1 / 2} ${y + hh - 12}H${cx - w1 / 2}Z`} fill={lerpColor(th.a1, th.a2, i / (n - 1)) + "55"} stroke="#fff" strokeWidth={4} strokeLinejoin="round" />
            </svg>
            <At x={1560} y={y + hh / 2 - 6} o={k} style={{ width: 620 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {s.value !== undefined ? <Txt size={56} w={900} color={th.a2} align="left">{String(s.value)}</Txt> : null}
                <Txt size={36} w={700} color="#fff" align="left">{s.label}</Txt>
              </div>
            </At>
          </React.Fragment>
        );
      })}
      <Cv draw={draw} dep={t} />
      {sc.props.caption ? <At x={W / 2} y={1015} o={p(sc.end - 1.8, 0.4)}><Txt size={38} w={800} color="#fff">{sc.props.caption}</Txt></At> : null}
    </Mesh>
  );
};

/** Точки текста (кэш по строке). */
const textDots = (() => {
  const cache = new Map<string, { x: number; y: number }[]>();
  return (text: string, size: number) => {
    const key = text + "|" + size;
    if (cache.has(key)) return cache.get(key)!;
    if (typeof document === "undefined") return [];
    const cv = document.createElement("canvas"); cv.width = W; cv.height = 420;
    const c = cv.getContext("2d", { willReadFrequently: true })!;
    c.font = `900 ${size}px ${FONT}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "#fff";
    c.fillText(text, W / 2, 210);
    const d = c.getImageData(0, 0, W, 420).data, pts: { x: number; y: number }[] = [];
    for (let y = 0; y < 420; y += 7) for (let x = 0; x < W; x += 7) if (d[(y * W + x) * 4 + 3] > 128) pts.push({ x, y: y - 210 });
    cache.set(key, pts);
    return pts;
  };
})();

/** props: {text (1-3 слова), sub?} — облако частиц собирается в слово. Лучшее для главной мысли раздела. */
export const Assemble: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p } = useT();
  const text = String(sc.props.text || "").toUpperCase();
  const size = text.length > 13 ? 130 : text.length > 8 ? 170 : 230;
  const draw = React.useCallback((c: CanvasRenderingContext2D) => {
    const pts = textDots(text, size);
    pts.forEach((q, i) => {
      const r = rnd(i + 11), a = rnd(i + 311) * 6.283, R = 500 + rnd(i + 77) * 800;
      const k = interpolate(t, [sc.start + 0.15 + r * 0.7, sc.start + 1.25 + r * 0.7], [0, 1], { ...clamp, easing: EO });
      const swirl = (1 - k) * 2.1;
      const fx = W / 2 + Math.cos(a + swirl) * R, fy = 500 + Math.sin(a + swirl) * R * 0.7;
      c.fillStyle = i % 9 === 0 ? th.a2 : "#fff";
      c.globalAlpha = Math.min(1, k * 2.5);
      c.beginPath(); c.arc(fx + (q.x - fx) * k, fy + (500 + q.y - fy) * k, 3.6, 0, 7); c.fill();
    });
    c.globalAlpha = 1;
  }, [t, text, size]);
  return (
    <Mesh>
      <Cv draw={draw} dep={t} />
      <At x={W / 2} y={500} o={p(sc.start + 2.0, 0.45)}><div style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, color: "#fff", whiteSpace: "nowrap", textShadow: `0 0 50px ${th.a2}` }}>{text}</div></At>
      {sc.props.sub ? <At x={W / 2} y={720} o={p(sc.start + 2.2, 0.4)}><Txt size={46} w={700} color="#ffffffdd">{sc.props.sub}</Txt></At> : null}
    </Mesh>
  );
};

// ---------- Карта и глобус ----------
const WORLD = feature(worldData as never, (worldData as never as { objects: { countries: never } }).objects.countries) as never as { features: { properties: { name: string } }[] };

/** props: {title?, globe?: true, focus: [lon, lat], zoom?: 1-8, highlight?: ["Country"...], arcs?: [{from:[lon,lat], to:[lon,lat], label?}], pins?: [{at:[lon,lat], label}], caption?}
 * Камера плавно летит к focus (без разворотов), страны заливаются, дуги рисуются, метки выскакивают. */
export const GeoMap: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p, sp } = useT();
  const focus: [number, number] = Array.isArray(sc.props.focus) ? [num(sc.props.focus[0]), num(sc.props.focus[1])] : [20, 25];
  const zoom = Math.max(1, Math.min(10, num(sc.props.zoom, 2)));
  const hl = new Set<string>((sc.props.highlight || []).map((s: string) => String(s).toLowerCase()));
  const arcs: { from: [number, number]; to: [number, number]; label?: string }[] = (sc.props.arcs || []).slice(0, 5);
  const pins: { at: [number, number]; label?: string }[] = (sc.props.pins || []).slice(0, 6);
  const cues = cueTimes(sc, Math.max(1, hl.size ? 1 : 0, arcs.length) + pins.length, 0.8);
  const k = interpolate(t, [sc.start, sc.end - 0.4], [0, 1], { ...clamp, easing: EO });
  const proj = sc.props.globe
    ? geoOrthographic().translate([W / 2, 560]).scale(430 * (1 + (zoom - 1) * 0.35 * k)).rotate([-(focus[0] - 80 * (1 - k)), -focus[1] * k, 0]).clipAngle(90)
    : geoMercator().translate([W / 2, 560]).scale((W / 6.28) * (1 + (zoom - 1) * k)).center([focus[0] * (0.5 + 0.5 * k), focus[1] * (0.5 + 0.5 * k)]);
  const path = geoPath(proj as never);
  const hlK = p(cues[0], 0.7);
  const line = (a: [number, number], b: [number, number], u: number) => {
    const f = geoInterpolate(a, b), N = 48;
    const pts = Array.from({ length: Math.max(2, Math.round(N * u)) }).map((_, i) => (proj as never as (c: [number, number]) => [number, number] | null)(f((i / (N - 1)))));
    return pts.filter(Boolean).map((q, i) => `${i ? "L" : "M"}${q![0].toFixed(1)} ${q![1].toFixed(1)}`).join("");
  };
  return (
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 80% at 50% 50%, #1D3B57, #0D1B2A)", overflow: "hidden" }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {sc.props.globe ? <circle cx={W / 2} cy={560} r={(proj as never as { scale: () => number }).scale()} fill="#14324C" stroke="#ffffff33" strokeWidth={3} style={{ filter: "drop-shadow(0 0 60px #4FA3D155)" }} /> : null}
        {WORLD.features.map((f, i) => {
          const on = hl.has(String(f.properties.name).toLowerCase());
          return <path key={i} d={path(f as never) || ""} fill={on ? lerpColor("#39566E", th.a2, hlK) : "#39566E"} stroke="#0D1B2A" strokeWidth={1.4} />;
        })}
        {arcs.map((a, i) => {
          const u = p(cues[i], 1.0);
          return u > 0 ? <path key={i} d={line(a.from, a.to, u)} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" strokeDasharray="1 14" /> : null;
        })}
      </svg>
      {arcs.map((a, i) => { const q = (proj as never as (c: [number, number]) => [number, number] | null)(a.to); return q && a.label ? <At key={i} x={q[0]} y={q[1] - 46} s={sp(cues[i] + 0.9, 11)}><Label>{a.label}</Label></At> : null; })}
      {pins.map((a, i) => {
        const q = (proj as never as (c: [number, number]) => [number, number] | null)(a.at);
        const c = cues[Math.max(1, arcs.length) + i] ?? sc.start + 1;
        const m = sp(c, 10);
        return q ? (
          <React.Fragment key={i}>
            <At x={q[0]} y={q[1]} s={m}><div style={{ width: 28, height: 28, borderRadius: "50%", background: th.a2, border: "5px solid #fff" }} /></At>
            {a.label ? <At x={q[0]} y={q[1] - 52} s={m}><Label>{a.label}</Label></At> : null}
          </React.Fragment>
        ) : null;
      })}
      {sc.props.title ? <At x={W / 2} y={92} o={p(sc.start + 0.15, 0.4)}><Txt size={54} w={900} color="#fff" style={{ textShadow: "0 3px 16px #000a" }}>{sc.props.title}</Txt></At> : null}
      {sc.props.caption ? <At x={W / 2} y={1015} o={p(sc.end - 1.9, 0.4)}><Txt size={38} w={800} color="#fff" style={{ textShadow: "0 3px 16px #000a" }}>{sc.props.caption}</Txt></At> : null}
    </div>
  );
};
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: "#fff", color: "#14202B", fontFamily: FONT, fontWeight: 800, fontSize: 32, padding: "8px 20px", borderRadius: 12, whiteSpace: "nowrap", boxShadow: "0 8px 22px #0007" }}>{children}</div>
);

/** props: {kicker?, title, lines: [3-5 фраз], highlight: индекс строки, stamp?} — лист с текстом, маркер проводит по главной фразе. */
export const Doc: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p, sp } = useT();
  const lines: string[] = (sc.props.lines || []).slice(0, 5);
  const hi = Math.max(0, Math.min(lines.length - 1, num(sc.props.highlight)));
  const mark = sc.cues?.[0] && sc.cues[0] > sc.start ? sc.cues[0] : sc.start + (sc.end - sc.start) * 0.45;
  const zoom = 1 + (t - sc.start) * 0.018 + p(mark, 0.9) * 0.1;
  const fy = (hi / Math.max(1, lines.length)) - 0.3;
  return (
    <Mesh a="#3C4A5A" b="#5A5040" base="#22262B">
      <At x={W / 2} y={570 - fy * 300 * p(mark, 0.9)} s={zoom * sp(sc.start + 0.02, 14)} r={-1.3 + 1.3 * p(sc.start, 1.2)}>
        <div style={{ width: 1180, background: "#FBF8F1", padding: "60px 80px 70px", boxShadow: "0 40px 90px #0009", borderRadius: 6, position: "relative" }}>
          {sc.props.kicker ? <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 26, letterSpacing: 3, color: th.a1, textTransform: "uppercase", marginBottom: 16 }}>{sc.props.kicker}</div> : null}
          <div style={{ fontFamily: SERIF, fontSize: 60, color: "#22262B", lineHeight: 1.12, marginBottom: 30 }}>{sc.props.title || ""}</div>
          {lines.map((l, i) => {
            const on = i === hi;
            return (
              <div key={i} style={{ position: "relative", fontFamily: SERIF, fontSize: 40, color: "#33373D", lineHeight: 1.42, marginBottom: 8, opacity: on ? 1 : 1 - 0.55 * p(mark, 0.5) }}>
                {on ? <div style={{ position: "absolute", left: -10, top: 4, bottom: 4, width: `calc(${p(mark, 0.8) * 100}% + 20px)`, background: "#FFD84D", zIndex: 0, borderRadius: 4 }} /> : null}
                <span style={{ position: "relative" }}>{l}</span>
              </div>
            );
          })}
          {sc.props.stamp ? <div style={{ position: "absolute", right: 50, bottom: 40, transform: `rotate(-9deg) scale(${1.5 - 0.5 * p(mark + 1.2, 0.2)})`, opacity: p(mark + 1.2, 0.12), border: "7px solid #C8352B", color: "#C8352B", fontFamily: FONT, fontWeight: 900, fontSize: 48, padding: "6px 22px", borderRadius: 10 }}>{sc.props.stamp}</div> : null}
        </div>
      </At>
    </Mesh>
  );
};

/** props: {title?, app?, items: [{text, from?: "me"|"them"}] x2-6, caption?} — телефон, сообщения/уведомления появляются по очереди. */
export const Phone: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp } = useT();
  const items: { text?: string; from?: string }[] = (sc.props.items || []).slice(0, 6);
  const cues = cueTimes(sc, items.length, 0.5);
  return (
    <Mesh>
      {sc.props.title ? <At x={480} y={500} o={p(sc.start + 0.1, 0.4)} style={{ width: 720 }}><Txt size={72} w={900} color="#fff" align="left">{sc.props.title}</Txt></At> : null}
      {sc.props.caption ? <At x={480} y={720} o={p(sc.end - 1.9, 0.4)} style={{ width: 720 }}><Txt size={42} w={700} color="#ffffffcc" align="left">{sc.props.caption}</Txt></At> : null}
      <At x={1300} y={1150 - 610 * sp(sc.start + 0.02, 15, 26)}>
        <div style={{ width: 520, height: 960, background: "#101214", borderRadius: 64, padding: 18, boxShadow: "0 40px 90px #000a" }}>
          <div style={{ width: "100%", height: "100%", background: "#F4F2EC", borderRadius: 48, overflow: "hidden", display: "flex", flexDirection: "column", padding: "36px 22px", gap: 16 }}>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 28, color: th.ink, textAlign: "center", marginBottom: 12 }}>{sc.props.app || ""}</div>
            {items.map((it, i) => {
              const k = sp(cues[i], 12), me = it.from === "me";
              return <div key={i} style={{ alignSelf: me ? "flex-end" : "flex-start", maxWidth: "86%", background: me ? th.a1 : "#fff", color: me ? "#fff" : th.ink, fontFamily: FONT, fontWeight: 700, fontSize: 28, lineHeight: 1.22, padding: "16px 22px", borderRadius: 26, boxShadow: "0 5px 14px #0002", opacity: k > 0 ? 1 : 0, transform: `translateY(${(1 - k) * 34}px) scale(${0.85 + 0.15 * k})` }}>{it.text}</div>;
            })}
          </div>
        </div>
      </At>
    </Mesh>
  );
};

/** props: {title, items: [{label, value}] x2-5, unit?, caption?} — пузыри, площадь = значение; огромный рядом с крошечным. */
export const Bubbles: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp } = useT();
  const items: { label?: string; value?: number }[] = (sc.props.items || []).slice(0, 5);
  const cues = cueTimes(sc, items.length, 0.5);
  const max = Math.max(1, ...items.map((i) => num(i.value)));
  const R = items.map((i) => Math.max(36, 330 * Math.sqrt(num(i.value) / max)));
  const gap = 46, tw = R.reduce((a, b) => a + b * 2 + gap, -gap);
  const sc2 = Math.min(1, 1680 / tw);
  let x = W / 2 - (tw * sc2) / 2;
  return (
    <Paper>
      <At x={W / 2} y={120} o={p(sc.start + 0.1, 0.4)}><Txt size={62} w={900}>{sc.props.title || ""}</Txt></At>
      {items.map((it, i) => {
        const r = R[i] * sc2, cx = x + r; x += r * 2 + gap * sc2;
        const k = sp(cues[i], 9, 26), c = i % 2 ? th.a2 : th.a1;
        return (
          <React.Fragment key={i}>
            <At x={cx} y={580} s={k}><div style={{ width: r * 2, height: r * 2, borderRadius: "50%", background: c, border: `6px solid ${th.ink}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 14px 0 ${th.ink}22` }}>
              {r > 110 ? <Txt size={Math.min(70, r / 2.4)} w={900} color="#fff">{num(it.value).toLocaleString("en-US")}{sc.props.unit || ""}</Txt> : null}
            </div></At>
            <At x={cx} y={R[0] * sc2 > 280 ? 955 : 870} o={p(cues[i], 0.35)}><Txt size={34} w={800} style={{ width: 300 }}>{r > 110 ? it.label : `${it.label}: ${num(it.value).toLocaleString("en-US")}${sc.props.unit || ""}`}</Txt></At>
          </React.Fragment>
        );
      })}
      {sc.props.caption ? <At x={W / 2} y={1025} o={p(sc.end - 1.8, 0.4)}><Txt size={36} w={800} color={th.a1}>{sc.props.caption}</Txt></At> : null}
    </Paper>
  );
};

/** Сценка: герои выходят и реагируют, вокруг них падают/появляются предметы.
 * props: {color?, actors: [{x 0..1, pose, expression, then?: expression после последнего cue, from?: "left"|"right"|"bottom", label?, scale?, say?}] x1-3,
 *  items?: [{icon (эмодзи-предмет), x 0..1, y 0..1, size?}], caption?}. cues = выход каждого героя, затем каждый предмет. */
export const Stage: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p, sp } = useT();
  const actors: { x?: number; pose?: Pose; expression?: Expression; then?: Expression; from?: string; label?: string; scale?: number; say?: string }[] = (sc.props.actors || []).slice(0, 3);
  const items: { icon?: string; x?: number; y?: number; size?: number }[] = (sc.props.items || []).slice(0, 8);
  const cues = cueTimes(sc, actors.length + items.length, 0.2);
  const last = cues[cues.length - 1] ?? sc.start;
  const bgs: Record<string, string> = { dark: th.dark, teal: th.a1, sand: th.paper, night: "#1B2A44", sky: "#BFDDEA", mint: "#CDE6D8", peach: "#F2D6BE", lilac: "#D9D2EA" };
  const bg = bgs[String(sc.props.color)] || "#EADFCB";
  const dark = ["dark", "night", "teal"].includes(String(sc.props.color));
  const push = 1 + (t - sc.start) * 0.012; // камера медленно наезжает на всю сцену, одна сторона
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${bg} 0 74%, ${lerpColor(bg, "#000000", 0.14)} 74% 100%)`, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${push})`, transformOrigin: "50% 70%" }}>
        {items.map((it, i) => {
          const c = cues[actors.length + i], k = sp(c, 11);
          const y = num(it.y, 0.4) * H - (1 - p(c, 0.45, EO)) * 260;
          return <At key={i} x={num(it.x, 0.5) * W} y={y} s={k} r={(1 - k) * 22}><div style={{ fontSize: num(it.size, 120), lineHeight: 1, filter: "drop-shadow(0 12px 12px #0003)" }}>{it.icon}</div></At>;
        })}
        {actors.map((a, i) => {
          const k = interpolate(t, [cues[i] - 0.35, cues[i] + 0.3], [0, 1], { ...clamp, easing: EO });
          const f = a.from === "right" ? [W * 0.6, 0] : a.from === "bottom" ? [0, 720] : a.from === "left" ? [-W * 0.6, 0] : [0, 0];
          const ex = a.then && t > last + 0.35 ? a.then : a.expression;
          const hop = Math.abs(Math.sin(k * Math.PI * 3)) * 26 * (1 - k * 0.3) * (k < 1 ? 1 : 0);
          return (
            <React.Fragment key={i}>
              <At x={num(a.x, 0.5) * W + f[0] * (1 - k)} y={610 + f[1] * (1 - k) - hop} s={num(a.scale, 1) * 1.9} o={a.from ? 1 : k}>
                <Character expression={ex || "neutral"} pose={a.pose || "stand"} coat={a.coat || [th.a1, th.a3, th.a2][i % 3]} />
              </At>
              {a.say ? (
                <At x={num(a.x, 0.5) * W} y={245} s={sp(cues[i] + 0.55, 12)}>
                  <div style={{ background: "#fff", border: `5px solid ${th.ink}`, borderRadius: 34, padding: "20px 32px", fontFamily: FONT, fontWeight: 800, fontSize: 38, color: th.ink, maxWidth: 560, textAlign: "center" }}>{a.say}</div>
                </At>
              ) : null}
              {a.label ? <At x={num(a.x, 0.5) * W} y={990} o={p(cues[i] + 0.2, 0.3)}><Txt size={40} w={900} color={dark ? "#fff" : th.ink}>{a.label}</Txt></At> : null}
            </React.Fragment>
          );
        })}
      </div>
      {sc.props.caption ? <At x={W / 2} y={70} o={p(sc.end - 2, 0.4)}><Card pad={18} r={18}><Txt size={38} w={800}>{sc.props.caption}</Txt></Card></At> : null}
    </div>
  );
};
