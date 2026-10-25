// Визуальные сцены: графики, толпа точек, весы, айсберг, шкала, кривая, шаги, цикл, батарейка, часы, прожектор, персонаж.
import React from "react";
import { interpolate } from "remotion";
import { At, BACK, Card, clamp, cueTimes, FONT, H, lerpColor, Paper, rnd, Txt, useT, useTheme, W } from "../kit";
import { Character } from "../Character";
import type { Scene } from "../types";

type P = { sc: Scene };

/** Столбики сравнения. */
export const Bars: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p } = useT();
  const items: { label: string; value: number; highlight?: boolean }[] = sc.props.items || [];
  const ts = cueTimes(sc, items.length, 0.4);
  const max = Math.max(1, ...items.map((i) => i.value));
  const bw = Math.min(260, 1300 / Math.max(1, items.length) - 60);
  const x0 = W / 2 - ((items.length - 1) * (bw + 70)) / 2;
  return (
    <Paper>
      <At x={W / 2} y={130}><Txt size={62} w={900}>{sc.props.title || ""}</Txt></At>
      <div style={{ position: "absolute", left: 200, right: 200, top: 880, height: 6, background: th.ink, borderRadius: 3 }} />
      {items.map((it, i) => {
        const k = p(ts[i], 0.8);
        const h = (it.value / max) * 560 * k;
        const x = x0 + i * (bw + 70);
        const c = it.highlight ? th.a2 : th.a1;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: x - bw / 2, top: 880 - h, width: bw, height: h, background: c, border: `5px solid ${th.ink}`, borderBottom: "none", borderRadius: "16px 16px 0 0" }} />
            <At x={x} y={880 - h - 50} o={p(ts[i] + 0.5, 0.3)}><Txt size={54} w={900}>{Math.round(it.value * k)}{sc.props.unit || ""}</Txt></At>
            <At x={x} y={950} o={p(ts[i], 0.3)}><Txt size={34} w={700} style={{ width: bw + 60 }}>{it.label}</Txt></At>
          </React.Fragment>
        );
      })}
    </Paper>
  );
};

/** Толпа точек-людей: выделяется N из total (например «1 из 10 заметил»). */
export const Dots: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p } = useT();
  const total = Math.min(200, Math.max(4, Number(sc.props.total) || 100));
  const hi = Math.min(total, Number(sc.props.highlight) || 0);
  const cols = total <= 20 ? total / 2 : total <= 50 ? 10 : 20;
  const rows = Math.ceil(total / cols);
  const cell = Math.min(1300 / cols, 560 / rows);
  const [a, b] = cueTimes(sc, 2, 0.2);
  const order = Array.from({ length: total }, (_, i) => i).sort((x, y) => rnd(x + 3) - rnd(y + 3));
  const hiSet = new Set(order.slice(0, hi));
  return (
    <Paper>
      <At x={W / 2} y={140}><Txt size={60} w={900}>{sc.props.title || ""}</Txt></At>
      {Array.from({ length: total }).map((_, i) => {
        const cx = W / 2 + (i % cols - (cols - 1) / 2) * cell;
        const cy = 560 + (Math.floor(i / cols) - (rows - 1) / 2) * cell;
        const k = p(a + (i / total) * 0.8, 0.25, BACK);
        const on = hiSet.has(i) ? p(b + order.indexOf(i) * 0.04, 0.3) : 0;
        const r = cell * 0.3;
        return (
          <svg key={i} width={cell} height={cell} style={{ position: "absolute", left: cx - cell / 2, top: cy - cell / 2, transform: `scale(${k * (1 + 0.25 * on)})` }}>
            <circle cx={cell / 2} cy={cell * 0.32} r={r * 0.55} fill={lerpColor(th.a3, th.a2, on)} stroke={th.ink} strokeWidth={2} />
            <path d={`M${cell / 2 - r * 0.8} ${cell * 0.85} Q${cell / 2} ${cell * 0.35} ${cell / 2 + r * 0.8} ${cell * 0.85} Z`} fill={lerpColor(th.a3, th.a2, on)} stroke={th.ink} strokeWidth={2} />
          </svg>
        );
      })}
      <At x={W / 2} y={960} o={p(b + 0.4, 0.4)}><Txt size={54} w={800} color={th.a1}>{sc.props.caption || ""}</Txt></At>
    </Paper>
  );
};

/** Весы: что перевешивает. */
export const Scale: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p } = useT();
  const { left = "", right = "", heavier = "left" } = sc.props;
  const [a, b] = cueTimes(sc, 2, 0.3);
  const tilt = interpolate(p(b, 1.1, BACK), [0, 1], [0, heavier === "left" ? -13 : 13]) + Math.sin(t * 2.2) * 0.6;
  const pan = (label: string, side: number) => {
    const rad = (tilt * Math.PI) / 180;
    const x = W / 2 + side * 430 * Math.cos(rad);
    const y = 380 + side * 430 * Math.sin(rad);
    return (
      <>
        <line x1={x} y1={y} x2={x - 170} y2={y + 250} stroke={th.ink} strokeWidth={5} />
        <line x1={x} y1={y} x2={x + 170} y2={y + 250} stroke={th.ink} strokeWidth={5} />
        <path d={`M${x - 220} ${y + 250} Q${x} ${y + 360} ${x + 220} ${y + 250} Z`} fill={side < 0 ? th.a1 : th.a2} stroke={th.ink} strokeWidth={6} />
        <foreignObject x={x - 260} y={y + 110} width={520} height={130}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 44, color: th.ink, textAlign: "center", opacity: p(side < 0 ? a : a + 0.4, 0.4) }}>{label}</div>
        </foreignObject>
      </>
    );
  };
  return (
    <Paper>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={`M${W / 2 - 150} 990 L${W / 2 + 150} 990 L${W / 2 + 40} 940 L${W / 2 - 40} 940 Z`} fill={th.ink} />
        <rect x={W / 2 - 14} y={380} width={28} height={570} fill={th.ink} />
        <g transform={`rotate(${tilt} ${W / 2} 380)`}><rect x={W / 2 - 450} y={368} width={900} height={24} rx={12} fill={th.ink} /></g>
        <circle cx={W / 2} cy={380} r={30} fill={th.a2} stroke={th.ink} strokeWidth={6} />
        {pan(left, -1)}
        {pan(right, 1)}
      </svg>
      <At x={W / 2} y={120}><Txt size={58} w={900}>{sc.props.title || ""}</Txt></At>
    </Paper>
  );
};

/** Айсберг: сверху видно одно, под водой — причины. */
export const Iceberg: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp, t } = useT();
  const below: string[] = sc.props.below || [];
  const ts = cueTimes(sc, below.length + 1, 0.3);
  const sea = 430;
  const bob = Math.sin(t * 1.4) * 6;
  return (
    <Paper grid={false}>
      <div style={{ position: "absolute", left: 0, right: 0, top: sea, bottom: 0, background: lerpColor(th.a1, "#10303A", 0.45) }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, transform: `translateY(${bob}px)` }}>
        <path d={`M${W / 2 - 230} ${sea} L${W / 2 - 60} 170 L${W / 2 + 40} 230 L${W / 2 + 120} 150 L${W / 2 + 250} ${sea} Z`} fill="#F4F7F7" stroke={th.ink} strokeWidth={6} strokeLinejoin="round" />
        <path d={`M${W / 2 - 230} ${sea} L${W / 2 - 520} 760 L${W / 2 - 300} 1040 L${W / 2 + 350} 1060 L${W / 2 + 560} 720 L${W / 2 + 250} ${sea} Z`} fill="#BFD9DD" fillOpacity={0.75} stroke={th.ink} strokeWidth={6} strokeLinejoin="round" />
      </svg>
      <At x={W / 2 + 10} y={300} s={sp(ts[0])}><Card pad={18} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 44 }}>{sc.props.top}</Card></At>
      {below.map((b, i) => (
        <At key={i} x={W / 2 + (i % 2 ? 190 : -190)} y={560 + i * (420 / Math.max(1, below.length))} o={p(ts[i + 1], 0.4)} s={0.9 + 0.1 * sp(ts[i + 1])}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 40, color: th.ink, background: "#FBF8F2dd", padding: "8px 22px", borderRadius: 12 }}>{b}</div>
        </At>
      ))}
    </Paper>
  );
};

/** Стрелочный прибор 0..100. */
export const Meter: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p } = useT();
  const { value = 70, from = 10, low = "LOW", high = "HIGH", label = "" } = sc.props;
  const k = p(sc.start + 0.4, Math.min(2, (sc.end - sc.start) * 0.5), BACK);
  const v = from + (value - from) * k + Math.sin(t * 9) * 0.6 * k;
  const ang = -90 + (v / 100) * 180;
  const cx = W / 2, cy = 720, R = 470;
  const arc = (a0: number, a1: number) => {
    const r0 = ((a0 - 180) * Math.PI) / 180, r1 = ((a1 - 180) * Math.PI) / 180;
    return `M${cx + R * Math.cos(r0)} ${cy + R * Math.sin(r0)} A${R} ${R} 0 0 1 ${cx + R * Math.cos(r1)} ${cy + R * Math.sin(r1)}`;
  };
  return (
    <Paper>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={arc(0, 60)} stroke={th.a3} strokeWidth={70} fill="none" />
        <path d={arc(60, 120)} stroke={th.a2} strokeWidth={70} fill="none" />
        <path d={arc(120, 180)} stroke="#C9573F" strokeWidth={70} fill="none" />
        {Array.from({ length: 11 }).map((_, i) => {
          const r = ((i * 18 - 180) * Math.PI) / 180;
          return <line key={i} x1={cx + (R - 60) * Math.cos(r)} y1={cy + (R - 60) * Math.sin(r)} x2={cx + (R - 90) * Math.cos(r)} y2={cy + (R - 90) * Math.sin(r)} stroke={th.ink} strokeWidth={5} />;
        })}
        <g transform={`rotate(${ang} ${cx} ${cy})`}><path d={`M${cx - 18} ${cy} L${cx} ${cy - R + 70} L${cx + 18} ${cy} Z`} fill={th.ink} /></g>
        <circle cx={cx} cy={cy} r={36} fill={th.ink} />
      </svg>
      <At x={cx - R} y={cy + 90}><Txt size={40} w={900}>{low}</Txt></At>
      <At x={cx + R} y={cy + 90}><Txt size={40} w={900}>{high}</Txt></At>
      <At x={W / 2} y={130}><Txt size={62} w={900}>{label}</Txt></At>
    </Paper>
  );
};

/** Кривая (Даннинг–Крюгер, спад, рост, U). Точка едет по кривой, подписи по cues. */
export const Curve: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p } = useT();
  const kind = sc.props.kind || "rise";
  const f = (x: number) => {
    if (kind === "dk") return x < 0.15 ? 0.15 + 5.2 * x : x < 0.45 ? 0.93 - 2.4 * (x - 0.15) * 1.0 : 0.21 + 1.1 * (x - 0.45) ** 1.2;
    if (kind === "decline") return 0.9 - 0.75 * Math.pow(x, 0.8);
    if (kind === "u") return 0.2 + 2.4 * (x - 0.5) ** 2;
    return 0.1 + 0.8 * Math.pow(x, 1.6);
  };
  const X0 = 300, X1 = 1650, Y0 = 880, Y1 = 230;
  const pt = (x: number) => [X0 + (X1 - X0) * x, Y0 - (Y0 - Y1) * Math.max(0, Math.min(1.05, f(x)))];
  const k = p(sc.start + 0.4, Math.min(3.5, (sc.end - sc.start) * 0.6));
  const N = 120;
  const d = Array.from({ length: N + 1 }, (_, i) => pt((i / N) * k)).map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const [hx, hy] = pt(k);
  const labels: { x: number; text: string }[] = sc.props.labels || [];
  const ts = cueTimes(sc, labels.length, 0.8);
  return (
    <Paper>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <line x1={X0} y1={Y0} x2={X1 + 40} y2={Y0} stroke={th.ink} strokeWidth={6} />
        <line x1={X0} y1={Y0} x2={X0} y2={Y1 - 40} stroke={th.ink} strokeWidth={6} />
        <path d={d} fill="none" stroke={th.a1} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={hx} cy={hy} r={20} fill={th.a2} stroke={th.ink} strokeWidth={5} />
      </svg>
      <div style={{ position: "absolute", left: X0, top: Y0 + 26, width: X1 - X0, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 34, color: th.ink }}>{sc.props.x_label || ""}</div>
      <div style={{ position: "absolute", left: X0 - 90, top: (Y0 + Y1) / 2, transform: "translate(-50%,-50%) rotate(-90deg)", fontFamily: FONT, fontWeight: 800, fontSize: 34, color: th.ink, whiteSpace: "nowrap" }}>{sc.props.y_label || ""}</div>
      <At x={W / 2} y={120}><Txt size={58} w={900}>{sc.props.title || ""}</Txt></At>
      {labels.map((l, i) => {
        const [x, y] = pt(l.x);
        return (
          <At key={i} x={x} y={y - 80} o={p(ts[i], 0.35)} s={0.85 + 0.15 * p(ts[i], 0.4, BACK)}>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 36, background: th.ink, color: "#F6F2EA", padding: "8px 18px", borderRadius: 12, whiteSpace: "nowrap" }}>{l.text}</div>
          </At>
        );
      })}
    </Paper>
  );
};

/** Цепочка «причина → следствие» стрелками. */
export const Steps: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp } = useT();
  const steps: string[] = sc.props.steps || [];
  const ts = cueTimes(sc, steps.length, 0.3);
  const n = Math.max(1, steps.length);
  const w = Math.min(380, (W - 240) / n - 70);
  return (
    <Paper>
      <At x={W / 2} y={170}><Txt size={62} w={900}>{sc.props.title || ""}</Txt></At>
      {steps.map((s, i) => {
        const x = W / 2 + (i - (n - 1) / 2) * (w + 90);
        const k = sp(ts[i]);
        return (
          <React.Fragment key={i}>
            {i > 0 ? (
              <svg width={90} height={60} style={{ position: "absolute", left: x - w / 2 - 90, top: H / 2 + 20 - 30, opacity: p(ts[i] - 0.15, 0.25) }}>
                <path d="M8 30 L70 30 M52 12 L74 30 L52 48" stroke={th.ink} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
            <At x={x} y={H / 2 + 20} s={0.7 + 0.3 * k} o={Math.min(1, k * 1.5)}>
              <Card pad={26} bg={i === n - 1 ? th.a2 : "#FBF8F2"} style={{ width: w, minHeight: 230, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, color: th.a1, textAlign: "center" }}>{i + 1}</div>
                <Txt size={w < 300 ? 34 : 40} w={800}>{s}</Txt>
              </Card>
            </At>
          </React.Fragment>
        );
      })}
    </Paper>
  );
};

/** Замкнутый круг (порочный цикл): пункты по кругу, стрелка вращается. */
export const Loop: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p, sp } = useT();
  const items: string[] = sc.props.items || [];
  const ts = cueTimes(sc, items.length, 0.3);
  const n = Math.max(1, items.length);
  const cx = W / 2, cy = H / 2 + 40, R = 330;
  const rot = (t - sc.start) * 40;
  return (
    <Paper>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={th.a3} strokeWidth={22} strokeDasharray="40 26" transform={`rotate(${rot} ${cx} ${cy})`} />
        <g transform={`rotate(${rot * 2} ${cx} ${cy})`}><path d={`M${cx + R - 30} ${cy - 10} L${cx + R} ${cy + 30} L${cx + R + 30} ${cy - 10} Z`} fill={th.a2} stroke={th.ink} strokeWidth={4} /></g>
      </svg>
      <At x={cx} y={cy} o={p(sc.start, 0.4)}><Txt size={52} w={900} color={th.a1} style={{ width: 420 }}>{sc.props.center || ""}</Txt></At>
      {items.map((it, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const k = sp(ts[i]);
        return (
          <At key={i} x={cx + R * Math.cos(a)} y={cy + R * Math.sin(a)} s={0.6 + 0.4 * k} o={Math.min(1, k * 1.5)}>
            <Card pad={18} style={{ fontFamily: FONT, fontWeight: 800, fontSize: 38, whiteSpace: "nowrap" }}>{it}</Card>
          </At>
        );
      })}
      <At x={W / 2} y={110}><Txt size={58} w={900}>{sc.props.title || ""}</Txt></At>
    </Paper>
  );
};

/** Батарейка, которая разряжается (усталость, силы). */
export const Battery: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p } = useT();
  const { from = 100, to = 15, label = "", marks = [] } = sc.props;
  const k = p(sc.start + 0.3, Math.max(1, (sc.end - sc.start) - 1));
  const v = from + (to - from) * k;
  const col = v > 50 ? th.a1 : v > 25 ? th.a2 : "#C9573F";
  const ts = cueTimes(sc, (marks as string[]).length, 0.6);
  return (
    <Paper>
      <At x={W / 2} y={130}><Txt size={62} w={900}>{label}</Txt></At>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <rect x={460} y={360} width={900} height={400} rx={50} fill="#FBF8F2" stroke={th.ink} strokeWidth={14} />
        <rect x={1360} y={480} width={60} height={160} rx={16} fill={th.ink} />
        <rect x={490} y={390} width={840 * (v / 100)} height={340} rx={30} fill={col} />
      </svg>
      <At x={W / 2} y={560}><Txt size={140} w={900} color={th.ink}>{Math.round(v)}%</Txt></At>
      {(marks as string[]).map((m, i) => (
        <At key={i} x={460 + (900 * (i + 0.5)) / (marks as string[]).length} y={850} o={p(ts[i], 0.3)}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 34, color: th.ink, background: "#FBF8F2", border: `3px solid ${th.ink}`, padding: "6px 16px", borderRadius: 10 }}>{m}</div>
        </At>
      ))}
    </Paper>
  );
};

/** Часы: день проходит (утро → вечер), подписи событий. */
export const Clock: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p } = useT();
  const { from = 8, to = 22, label = "", events = [] } = sc.props;
  const k = p(sc.start + 0.3, Math.max(1, sc.end - sc.start - 0.8), (x: number) => x);
  const hr = from + (to - from) * k;
  const cx = 620, cy = 560, R = 330;
  const sky = lerpColor("#F3E6C4", "#2B3550", Math.max(0, (hr - 14) / 8));
  const evs = events as string[];
  const ts = cueTimes(sc, evs.length, 0.6);
  return (
    <Paper>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 1240, background: sky, opacity: 0.55 }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="#FBF8F2" stroke={th.ink} strokeWidth={14} />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <line key={i} x1={cx + (R - 30) * Math.sin(a)} y1={cy - (R - 30) * Math.cos(a)} x2={cx + (R - 62) * Math.sin(a)} y2={cy - (R - 62) * Math.cos(a)} stroke={th.ink} strokeWidth={8} strokeLinecap="round" />;
        })}
        <g transform={`rotate(${(hr % 12) * 30} ${cx} ${cy})`}><line x1={cx} y1={cy} x2={cx} y2={cy - 170} stroke={th.ink} strokeWidth={18} strokeLinecap="round" /></g>
        <g transform={`rotate(${hr * 360} ${cx} ${cy})`}><line x1={cx} y1={cy} x2={cx} y2={cy - 260} stroke={th.a1} strokeWidth={10} strokeLinecap="round" /></g>
        <circle cx={cx} cy={cy} r={22} fill={th.a2} stroke={th.ink} strokeWidth={5} />
      </svg>
      <At x={cx} y={130}><Txt size={54} w={900}>{label}</Txt></At>
      <At x={cx} y={960}><Txt size={64} w={900} color={th.a1}>{String(Math.floor(hr)).padStart(2, "0")}:{String(Math.floor((hr % 1) * 60)).padStart(2, "0")}</Txt></At>
      {evs.map((e, i) => (
        <div key={i} style={{ position: "absolute", left: 1150, top: 260 + i * 130, opacity: p(ts[i], 0.3), transform: `translateX(${(1 - p(ts[i], 0.4)) * 60}px)`, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: th.a2, border: `4px solid ${th.ink}` }} />
          <Txt size={42} w={800} align="left">{e}</Txt>
        </div>
      ))}
    </Paper>
  );
};

/** Прожектор: герой на сцене в луче, толпа вокруг смотрит в свои дела. */
export const Spotlight: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p, sp } = useT();
  const [a, b] = cueTimes(sc, 2, 0.2);
  const reveal = p(b, 0.8); // во второй половине толпа видна: никто не смотрит
  const beam = p(a, 0.5);
  return (
    <Paper color={lerpColor("#1B1D21", th.paper, reveal * 0.85)} grid={false}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="sp" cx="50%" cy="100%" r="70%"><stop offset="0%" stopColor="#FFF6D8" stopOpacity={0.85} /><stop offset="100%" stopColor="#FFF6D8" stopOpacity={0} /></radialGradient>
        </defs>
        <path d={`M${W / 2 - 60} -20 L${W / 2 + 60} -20 L${W / 2 + 330} 1000 L${W / 2 - 330} 1000 Z`} fill="url(#sp)" opacity={beam * (1 - reveal * 0.7)} />
        <ellipse cx={W / 2} cy={1000} rx={330} ry={46} fill="#FFF6D8" opacity={0.5 * beam * (1 - reveal * 0.6)} />
      </svg>
      <At x={W / 2} y={760} s={0.95 + 0.05 * sp(a)}>
        <Character expression={reveal > 0.5 ? "calm" : "scared"} pose={reveal > 0.5 ? "shrug" : "stand"} size={470} coat={th.a1} />
      </At>
      {Array.from({ length: 8 }).map((_, i) => {
        const x = i < 4 ? 180 + i * 150 : W - 180 - (i - 4) * 150;
        const o = reveal;
        return (
          <At key={i} x={x} y={840 + (i % 2) * 40} o={o} s={0.9}>
            <div style={{ position: "relative" }}>
              <Character expression="neutral" pose={i % 3 ? "hold" : "stand"} size={300} coat={[th.a3, "#9B8F7E", "#7F8C99"][i % 3]} flip={i >= 4} />
              <div style={{ position: "absolute", left: "50%", top: -50, transform: "translateX(-50%)", fontSize: 44, opacity: p(b + 0.5 + i * 0.1, 0.3) }}>{["📱", "☕", "📖", "💭"][i % 4]}</div>
            </div>
          </At>
        );
      })}
      <At x={W / 2} y={120} o={p(a + 0.3, 0.4)}><Txt size={56} w={900} color={reveal > 0.5 ? th.ink : "#F6F2EA"}>{reveal > 0.5 ? sc.props.after || "" : sc.props.before || ""}</Txt></At>
      <div style={{ opacity: Math.sin(t) * 0 }} />
    </Paper>
  );
};

/** Персонаж с мысленным облаком. */
export const Thought: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp } = useT();
  const { expression = "neutral", pose = "stand", thought = "", label = "" } = sc.props;
  const [a, b] = cueTimes(sc, 2, 0.2);
  return (
    <Paper>
      <At x={620} y={640} s={0.9 + 0.1 * sp(a)}><Character expression={expression} pose={pose} size={600} coat={th.a1} /></At>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 830 + i * 60, top: 380 - i * 50, width: 30 + i * 16, height: 30 + i * 16, borderRadius: "50%", background: "#FBF8F2", border: `5px solid ${th.ink}`, transform: `scale(${p(b - 0.3 + i * 0.1, 0.25, BACK)})` }} />
      ))}
      <At x={1330} y={260} s={sp(b, 11)}>
        <div style={{ background: "#FBF8F2", border: `6px solid ${th.ink}`, borderRadius: 120, padding: "50px 70px", maxWidth: 820 }}>
          <Txt size={thought.length > 60 ? 44 : 56} w={800}>{thought}</Txt>
        </div>
      </At>
      {label ? <At x={620} y={1010} o={p(a + 0.3, 0.4)}><Txt size={44} w={900} color={th.a1}>{label}</Txt></At> : null}
    </Paper>
  );
};

/** Предметы-эмодзи накапливаются (например, «вложенное»: часы, деньги, силы). */
export const Pile: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p } = useT();
  const icons: string[] = sc.props.icons || ["⏳", "💵", "📚"];
  const count = Math.min(40, Number(sc.props.count) || 24);
  const span = Math.max(1, sc.end - sc.start - 1.2);
  return (
    <Paper>
      <At x={W / 2} y={130}><Txt size={62} w={900}>{sc.props.title || ""}</Txt></At>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <path d={`M${W / 2 - 420} 980 L${W / 2 + 420} 980`} stroke={th.ink} strokeWidth={8} strokeLinecap="round" />
      </svg>
      {Array.from({ length: count }).map((_, i) => {
        const row = Math.floor(Math.sqrt(i * 2));
        const ta = sc.start + 0.3 + (span * i) / count;
        const k = p(ta, 0.45, BACK);
        const x = W / 2 + (rnd(i + 1) - 0.5) * (760 - row * 70);
        const y = 920 - row * 92 - (1 - k) * 600;
        return <div key={i} style={{ position: "absolute", left: x - 50, top: y - 50, fontSize: 92, opacity: Math.min(1, k * 3), transform: `rotate(${(rnd(i + 9) - 0.5) * 40}deg)` }}>{icons[i % icons.length]}</div>;
      })}
      {sc.props.caption ? <At x={W / 2} y={1030} o={p(sc.end - 1.4, 0.4)}><Txt size={44} w={800} color={th.a1}>{sc.props.caption}</Txt></At> : null}
    </Paper>
  );
};
