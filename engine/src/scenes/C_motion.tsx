// Живые сцены (как в сборке «серая машина» 2026-09-27): шеренга человечков-типов, машина едет, лента времени, гонка.
// Простая плоская отрисовка, движение только в одну сторону (без разворотов и дрожи).
import React from "react";
import { interpolate } from "remotion";
import { At, BACK, Card, clamp, cueTimes, EO, H, Paper, Txt, useT, useTheme, W } from "../kit";
import { Character } from "../Character";
import type { Expression, Pose } from "../Character";
import type { Scene } from "../types";

type P = { sc: Scene };
const INK = "#2B2D31";
const PALETTE = ["#C8553D", "#3E6FA8", "#D39B45", "#4F8A5B", "#7A5C99", "#5C6B77"];
const COLORS: Record<string, string> = {
  red: "#C8553D", blue: "#3E6FA8", yellow: "#E0B23F", green: "#4F8A5B", white: "#F4F2EC", black: "#2E3136",
  gray: "#9AA1A8", silver: "#C3C8CD", orange: "#E0803A", brown: "#8A6A4F", purple: "#7A5C99", beige: "#D9CBB0",
};
const col = (c: unknown, i = 0) => (typeof c === "string" && (COLORS[c.toLowerCase()] || (/^#[0-9a-f]{6}$/i.test(c) ? c : ""))) || PALETTE[i % PALETTE.length];

/** Машина сбоку, viewBox 400×170, колёса крутятся по wheel (градусы). */
export const Car: React.FC<{ color?: string; w?: number; wheel?: number; flip?: boolean; driver?: string }> = ({ color = "#9AA1A8", w = 420, wheel = 0, flip, driver }) => (
  <svg viewBox="0 0 400 170" width={w} height={(w * 170) / 400} style={{ overflow: "visible", transform: flip ? "scaleX(-1)" : undefined }}>
    <ellipse cx="200" cy="158" rx="178" ry="9" fill="rgba(0,0,0,0.16)" />
    <path d="M24 128 Q20 98 44 92 L108 84 Q140 44 196 40 L262 42 Q300 46 330 84 L366 92 Q386 98 382 128 Z" fill={color} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    {/* водитель: голова и плечи за полупрозрачным стеклом */}
    {driver ? (
      <g>
        <path d="M222 84 Q224 74 244 72 Q264 74 266 84 Z" fill={driver} />
        <circle cx="244" cy="66" r="14" fill="#EFCFAE" stroke={INK} strokeWidth="2.5" />
        <circle cx="249" cy="64" r="2" fill={INK} /><circle cx="256" cy="64" r="2" fill={INK} />
      </g>
    ) : null}
    <path d="M124 84 Q150 54 196 52 L200 84 Z" fill="rgba(191,211,222,0.6)" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M214 84 L212 52 L258 54 Q290 58 312 84 Z" fill="rgba(191,211,222,0.6)" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M60 100 Q200 86 350 100" stroke="rgba(255,255,255,0.5)" strokeWidth="5" fill="none" strokeLinecap="round" />
    <rect x="360" y="100" width="18" height="10" rx="4" fill="#F3E3A0" stroke={INK} strokeWidth="2.5" />
    <rect x="26" y="102" width="14" height="10" rx="3" fill="#D2493A" stroke={INK} strokeWidth="2.5" />
    {[110, 296].map((cx) => (
      <g key={cx} transform={`rotate(${wheel} ${cx} 130)`}>
        <circle cx={cx} cy="130" r="26" fill="#2A2C30" stroke={INK} strokeWidth="3" />
        <circle cx={cx} cy="130" r="12" fill="#AEB3B8" />
        <line x1={cx - 12} y1="130" x2={cx + 12} y2="130" stroke="#6F757C" strokeWidth="3" />
      </g>
    ))}
  </svg>
);

/** Дорога: асфальт и разметка, разметка бежит назад со скоростью speed (пикс/с). */
const Road: React.FC<{ y: number; h?: number; t: number; speed?: number }> = ({ y, h = 220, t, speed = 0 }) => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, top: y, height: h, background: "#5E636A" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: y - 10, height: 10, background: "#C9CDC4" }} />
    {Array.from({ length: 14 }).map((_, i) => {
      const x = ((i * 180 - t * speed) % (W + 180) + W + 180) % (W + 180) - 180;
      return <div key={i} style={{ position: "absolute", left: x, top: y + h / 2 - 6, width: 100, height: 12, borderRadius: 6, background: "#F1E7C8" }} />;
    })}
  </>
);

/** N типов людей: человечки выходят по одному, у каждого подпись (и при желании своя машина).
 * props: {title?, people: [{label, color?, expression?, pose?, car?}] x2-6, highlight? (индекс)} */
export const Lineup: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp, t } = useT();
  const people: { label?: string; color?: string; expression?: Expression; pose?: Pose; car?: string }[] = (sc.props.people || []).slice(0, 6);
  const n = Math.max(1, people.length);
  const cues = cueTimes(sc, n + 1, 0.25);
  const title = sc.props.title || "";
  const hi = typeof sc.props.highlight === "number" ? sc.props.highlight : -1;
  const hiOn = hi >= 0 ? p(sc.end - 1.6, 0.5) : 0;
  const gap = Math.min(340, 1760 / n);
  const anyCar = people.some((q) => q.car);
  return (
    <Paper>
      {title ? <At x={W / 2} y={120} s={sp(sc.start + 0.1)}><Txt size={72} w={900}>{title}</Txt></At> : null}
      {people.map((q, i) => {
        const x = W / 2 + (i - (n - 1) / 2) * gap;
        const a = cues[Math.min(i + (title ? 1 : 0), cues.length - 1)];
        const k = sp(a, 11);
        const walk = interpolate(t, [a, a + 0.6], [140, 0], { ...clamp, easing: EO });
        const dim = hi >= 0 && i !== hi ? 1 - 0.55 * hiOn : 1;
        const lift = i === hi ? -30 * hiOn : 0;
        const c = col(q.color, i);
        return (
          <React.Fragment key={i}>
            <At x={x} y={anyCar ? 440 : 540} o={dim} style={{ marginTop: walk + lift, opacity: Math.min(1, k * 2) * dim }}>
              <div style={{ width: gap * 0.82, height: gap * 0.82, borderRadius: "50%", background: c, opacity: 0.22, position: "absolute", left: "50%", top: "52%", transform: "translate(-50%,-50%)" }} />
              <div style={{ position: "relative" }}>
                <Character size={Math.min(560, gap * (anyCar ? 1.45 : 1.8))} coat={c} expression={q.expression || "neutral"} pose={q.pose || "stand"} />
              </div>
            </At>
            {q.car ? (
              <At x={x} y={790} s={k} o={dim}><Car color={col(q.car, i)} w={gap * 0.92} /></At>
            ) : null}
            <At x={x} y={anyCar ? 950 : 900} o={p(a + 0.25, 0.35) * dim}>
              <div style={{ background: i === hi ? th.a1 : "#FBF8F2", border: `4px solid ${th.ink}`, borderRadius: 18, padding: "10px 18px", maxWidth: gap * 0.95 }}>
                <Txt size={n > 4 ? 36 : 44} w={900} color={i === hi ? "#FBF8F2" : th.ink}>{q.label || ""}</Txt>
              </div>
            </At>
          </React.Fragment>
        );
      })}
    </Paper>
  );
};

/** Машина въезжает и едет по дороге слева направо, можно «из» → «в» и подпись.
 * props: {label?, color?, from?, to?, driver? (true — человечек за рулём), stop? (true — тормозит в центре)} */
export const Drive: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p, sp } = useT();
  const dur = sc.end - sc.start;
  const stop = !!sc.props.stop;
  const k = stop
    ? interpolate(t, [sc.start, sc.start + Math.min(2.4, dur * 0.5)], [0, 0.5], { ...clamp, easing: EO })
    : interpolate(t, [sc.start, sc.end], [0.02, 1], clamp);
  const x = -450 + k * (W + 900);
  const speed = stop ? 600 * (1 - p(sc.start + 1.6, 0.8)) : 520;
  return (
    <Paper grid={false} color="#DCE6E4">
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 640, background: "linear-gradient(180deg,#BFD8E2,#E4ECE6)" }} />
      {[260, 760, 1300, 1720].map((hx, i) => (
        <div key={i} style={{ position: "absolute", left: ((hx - t * 40) % (W + 300) + W + 300) % (W + 300) - 300, top: 470 - (i % 2) * 40, width: 220 + i * 30, height: 170 + (i % 2) * 40, borderRadius: "50% 50% 0 0", background: "#B9CFAE" }} />
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: 900, bottom: 0, background: "#B9CFAE" }} />
      <Road y={620} h={280} t={t} speed={speed} />
      {sc.props.from ? <At x={260} y={560} o={1 - p(sc.start + dur * 0.45, 0.5)}><Sign text={sc.props.from} /></At> : null}
      {sc.props.to ? <At x={W - 260} y={560} s={sp(sc.start + dur * 0.4)}><Sign text={sc.props.to} accent={th.a1} /></At> : null}
      <At x={x} y={680}>
        <div style={{ position: "relative" }}>
          <Car color={col(sc.props.color, 1)} w={800} wheel={(t - sc.start) * speed * 1.4} driver={sc.props.driver ? th.a1 : undefined} />
        </div>
      </At>
      {sc.props.label ? <At x={W / 2} y={150} s={sp(sc.start + 0.3)}><Card><Txt size={64} w={900}>{sc.props.label}</Txt></Card></At> : null}
    </Paper>
  );
};

const Sign: React.FC<{ text: string; accent?: string }> = ({ text, accent }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    <div style={{ background: accent || "#FBF8F2", border: `5px solid ${INK}`, borderRadius: 14, padding: "12px 24px" }}>
      <Txt size={40} w={900} color={accent ? "#FBF8F2" : INK}>{text}</Txt>
    </div>
    <div style={{ width: 12, height: 90, background: INK }} />
  </div>
);

/** Лента времени: точки-события зажигаются по очереди, маркер идёт вправо.
 * props: {title?, events: [{year, text}] x2-6} */
export const Timeline: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp, t } = useT();
  const ev: { year?: string | number; text?: string }[] = (sc.props.events || []).slice(0, 6);
  const n = Math.max(1, ev.length);
  const cues = cueTimes(sc, n, 0.25);
  const x0 = 200, x1 = W - 200, y = 560;
  const xs = ev.map((_, i) => (n === 1 ? W / 2 : x0 + ((x1 - x0) * i) / (n - 1)));
  // маркер доезжает до события ровно к его cue и только вперёд
  const mx = Math.max(x0, ...xs.map((x, i) => interpolate(t, [cues[i] - 0.3, cues[i] + 0.3], [i ? xs[i - 1] : x0, x], { ...clamp, easing: EO })));
  return (
    <Paper>
      {sc.props.title ? <At x={W / 2} y={150} s={sp(sc.start + 0.1)}><Txt size={70} w={900}>{sc.props.title}</Txt></At> : null}
      <div style={{ position: "absolute", left: x0, top: y - 6, width: x1 - x0, height: 12, borderRadius: 6, background: "rgba(0,0,0,0.14)" }} />
      <div style={{ position: "absolute", left: x0, top: y - 6, width: mx - x0, height: 12, borderRadius: 6, background: th.a1 }} />
      {ev.map((e, i) => {
        const k = sp(cues[i], 10);
        const up = i % 2 === 0;
        return (
          <React.Fragment key={i}>
            <At x={xs[i]} y={y} s={0.4 + 0.6 * k}><div style={{ width: 46, height: 46, borderRadius: "50%", background: k > 0.5 ? th.a2 : "#FBF8F2", border: `6px solid ${th.ink}` }} /></At>
            <At x={xs[i]} y={up ? y - 150 : y + 170} o={p(cues[i] + 0.1, 0.35)} s={0.8 + 0.2 * k}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 1500 / n }}>
                <Txt size={66} w={900} color={th.a1}>{String(e.year ?? "")}</Txt>
                <Txt size={n > 4 ? 36 : 44} w={800}>{e.text || ""}</Txt>
              </div>
            </At>
          </React.Fragment>
        );
      })}
    </Paper>
  );
};

/** Гонка/сравнение путей: 2-4 машины на своих полосах, у каждой своя скорость; самая быстрая доезжает до флажка.
 * props: {title?, lanes: [{label, color?, speed 0.2..1}] x2-4, caption?} */
export const Race: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p, sp } = useT();
  const lanes: { label?: string; color?: string; speed?: number }[] = (sc.props.lanes || []).slice(0, 4);
  const n = Math.max(1, lanes.length);
  const top = 250, laneH = Math.min(240, 740 / n);
  const go = interpolate(t, [sc.start + 0.6, sc.end - 0.8], [0, 1], { ...clamp, easing: EO });
  const finish = W - 250;
  return (
    <Paper>
      {sc.props.title ? <At x={W / 2} y={130} s={sp(sc.start + 0.1)}><Txt size={68} w={900}>{sc.props.title}</Txt></At> : null}
      {lanes.map((l, i) => {
        const y = top + i * laneH;
        const s = Math.max(0.15, Math.min(1, Number(l.speed) || 0.5));
        const x = 260 + (finish - 260 - 120) * go * s;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: 0, right: 0, top: y, height: laneH - 18, background: "#6A6F76" }} />
            {Array.from({ length: 12 }).map((_, j) => <div key={j} style={{ position: "absolute", left: 300 + j * 140, top: y + laneH - 34, width: 70, height: 8, background: "#EDE3C3", opacity: 0.8 }} />)}
            <At x={x} y={y + laneH / 2 - 12}><Car color={col(l.color, i)} w={Math.min(420, laneH * 2.1)} wheel={(t - sc.start) * 700 * s} /></At>
            <At x={130} y={y + laneH / 2 - 10} o={p(sc.start + 0.2 + i * 0.15, 0.35)}>
              <div style={{ background: "#FBF8F2", border: `4px solid ${th.ink}`, borderRadius: 14, padding: "8px 16px", maxWidth: 240 }}>
                <Txt size={36} w={900}>{l.label || ""}</Txt>
              </div>
            </At>
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: finish, top: top - 20, width: 16, height: n * laneH + 10, background: `repeating-linear-gradient(180deg, ${th.ink} 0 26px, #FBF8F2 26px 52px)` }} />
      {sc.props.caption ? <At x={W / 2} y={H - 90} o={p(sc.end - 1.6, 0.4)} s={0.9 + 0.1 * p(sc.end - 1.6, 0.4, BACK)}><Txt size={58} w={900} color={th.a1}>{sc.props.caption}</Txt></At> : null}
    </Paper>
  );
};
