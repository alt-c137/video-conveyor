import React from "react";
import { interpolate } from "remotion";
import { At, clamp, FONT, H, useT, useTheme, W } from "../kit";
import type { Caption, Section } from "../types";

/** Подпись: тёмная «плашка-ярлык» с акцентной полосой, слова появляются по голосу. */
export const Captions: React.FC<{ caps: Caption[]; hide: (t: number) => boolean }> = ({ caps, hide }) => {
  const th = useTheme();
  const { t } = useT();
  const c = caps.find((x) => t >= x.start - 0.1 && t < x.end + 0.25);
  if (!c || hide(t)) return null;
  const o = Math.min(interpolate(t, [c.start - 0.1, c.start + 0.08], [0, 1], clamp), interpolate(t, [c.end, c.end + 0.25], [1, 0], clamp));
  const title = c.kind === "title";
  const words = c.words.length ? c.words : c.text.split(" ").map((w, i) => ({ w, t: c.start + i * 0.18, e: 0 }));
  const size = c.text.length > 34 ? 50 : 60;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 104, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ display: "flex", alignItems: "stretch", background: title ? th.a2 : "rgba(20,22,26,0.78)", backdropFilter: "blur(10px)", borderRadius: 16, overflow: "hidden", boxShadow: "0 12px 30px rgba(0,0,0,0.35)", maxWidth: 1500 }}>
        <div style={{ width: 12, background: title ? th.ink : th.a2 }} />
        <div style={{ padding: "16px 30px 18px", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 0.3em", fontFamily: FONT, fontWeight: 800, fontSize: size, color: title ? th.ink : "#F6F2EA", textShadow: title ? "none" : "0 3px 14px rgba(0,0,0,0.8)", letterSpacing: "-0.005em", lineHeight: 1.15 }}>
          {words.map((w, i) => {
            const k = interpolate(t, [w.t - 0.05, w.t + 0.12], [0, 1], clamp);
            return <span key={i} style={{ display: "inline-block", opacity: 0.25 + 0.75 * k, transform: `translateY(${(1 - k) * 10}px) scale(${0.9 + 0.1 * k})` }}>{w.w}</span>;
          })}
        </div>
      </div>
    </div>
  );
};

/** Индикатор разделов: цепочка «нейронов» сверху справа. */
export const Progress: React.FC<{ sections: Section[]; hide: (t: number) => boolean; end: number }> = ({ sections, hide, end }) => {
  const th = useTheme();
  const { t, p } = useT();
  if (sections.length < 2 || t < sections[0].start + 1 || t > end) return null;
  let cur = 0;
  sections.forEach((s, i) => { if (t >= s.start) cur = i; });
  const o = hide(t) ? 0 : 1;
  const step = 46;
  const x0 = W - 70 - step * (sections.length - 1);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o * 0.95 }}>
      <svg width={W} height={140} style={{ position: "absolute", top: 0, left: 0 }}>
        <line x1={x0} y1={60} x2={W - 70} y2={60} stroke="rgba(20,22,26,0.55)" strokeWidth={10} strokeLinecap="round" />
        <line x1={x0} y1={60} x2={x0 + step * cur} y2={60} stroke={th.a2} strokeWidth={6} strokeLinecap="round" />
        {sections.map((s, i) => {
          const on = i <= cur;
          const k = i === cur ? p(s.start, 0.5) : 1;
          return <circle key={i} cx={x0 + step * i} cy={60} r={i === cur ? 9 + 5 * k : 9} fill={on ? th.a2 : "#F6F2EA"} stroke="rgba(20,22,26,0.8)" strokeWidth={3.5} />;
        })}
      </svg>
      <div style={{ position: "absolute", top: 86, right: 56, fontFamily: FONT, fontWeight: 800, fontSize: 24, color: "#F6F2EA", background: "rgba(20,22,26,0.62)", padding: "5px 14px", borderRadius: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {sections[cur].title}
      </div>
    </div>
  );
};

const Cursor: React.FC<{ x: number; y: number; press: boolean }> = ({ x, y, press }) => (
  <svg viewBox="0 0 24 32" width={46} height={61} style={{ position: "absolute", left: x, top: y, transform: `scale(${press ? 0.85 : 1})`, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))" }}>
    <path d="M2 2 L2 26 L8 20 L12 30 L16 28 L12 18 L20 18 Z" fill="#fff" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

/** Подписка: карточка-«мысль» выезжает снизу справа, курсор жмёт лайк, подписку, колокольчик. */
export const CTA: React.FC<{ at: number }> = ({ at }) => {
  const th = useTheme();
  const { t, p, sp } = useT();
  if (t < at - 0.2 || t > at + 6.2) return null;
  const inK = sp(at, 14);
  const out = p(at + 5.6, 0.45);
  const like = at + 1.4, sub = at + 2.6, bell = at + 3.7;
  const subbed = t >= sub;
  const cx = interpolate(t, [at + 0.6, like - 0.05, sub - 0.4, sub - 0.05, bell - 0.4, bell - 0.05, bell + 0.6], [420, 38, 38, 190, 190, 372, 520], { ...clamp });
  const cy = interpolate(t, [at + 0.6, like - 0.05, sub - 0.4, sub - 0.05, bell - 0.4, bell - 0.05, bell + 0.6], [240, 70, 70, 70, 70, 70, 260], { ...clamp });
  const press = [like, sub, bell].some((x) => Math.abs(t - x) < 0.08);
  const ring = t >= bell ? Math.sin((t - bell) * 20) * interpolate(t - bell, [0, 1], [22, 0], clamp) : 0;
  const lk = t >= like ? interpolate(t, [like, like + 0.12, like + 0.3], [1, 1.3, 1], clamp) : 1;
  return (
    <div style={{ position: "absolute", right: 60, bottom: 230, width: 470, height: 150, transform: `translateY(${(1 - inK) * 300 + out * 300}px)`, opacity: 1 - out }}>
      <div style={{ position: "absolute", inset: 0, background: "#FBF8F2", border: `4px solid ${th.ink}`, borderRadius: 26, boxShadow: "0 14px 34px rgba(0,0,0,0.35)" }} />
      <div style={{ position: "absolute", left: 22, top: 40, width: 74, height: 74, borderRadius: 37, background: t >= like ? th.a2 : "#EEE8DC", border: `4px solid ${th.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, transform: `scale(${lk})` }}>👍</div>
      <div style={{ position: "absolute", left: 112, top: 44, height: 66, width: 236, borderRadius: 33, background: subbed ? "#E9E4DA" : th.a1, color: subbed ? th.ink : "#fff", border: `4px solid ${th.ink}`, fontFamily: FONT, fontWeight: 900, fontSize: 25, display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "0.04em" }}>
        {subbed ? "SUBSCRIBED ✓" : "SUBSCRIBE"}
      </div>
      <div style={{ position: "absolute", left: 366, top: 40, fontSize: 60, transform: `rotate(${ring}deg)`, transformOrigin: "50% 12%", filter: t >= bell ? "none" : "grayscale(1)" }}>🔔</div>
      <Cursor x={cx} y={cy} press={press} />
    </div>
  );
};

/** Концовка после голоса: места под «следующее видео» и подписку (для конечной заставки YouTube). */
export const EndScreen: React.FC<{ from: number; title: string; channel: string }> = ({ from, title, channel }) => {
  const th = useTheme();
  const { t, p, sp } = useT();
  if (t < from) return null;
  const o = p(from, 0.6);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, background: th.paper }}>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.08 }}>
        {Array.from({ length: 33 }).map((_, i) => <line key={i} x1={i * 60} y1={0} x2={i * 60} y2={H} stroke={th.ink} />)}
        {Array.from({ length: 19 }).map((_, i) => <line key={"h" + i} x1={0} y1={i * 60} x2={W} y2={i * 60} stroke={th.ink} />)}
      </svg>
      <At x={W / 2} y={150} s={sp(from + 0.2)}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 64, color: th.ink, letterSpacing: "-0.01em" }}>Keep your mind clear.</div>
      </At>
      {[0, 1].map((i) => (
        <At key={i} x={W / 2 + (i ? 430 : -430)} y={560} s={sp(from + 0.5 + i * 0.2)}>
          <div style={{ width: 760, height: 428, borderRadius: 24, border: `5px dashed ${th.ink}55`, background: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 800, fontSize: 34, color: th.ink + "88", letterSpacing: "0.12em" }}>
            {i ? "BEST FOR YOU" : "NEXT VIDEO"}
          </div>
        </At>
      ))}
      <At x={W / 2} y={940} o={p(from + 1, 0.6)}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 32, color: th.ink, opacity: 0.75 }}>{channel}</div>
      </At>
    </div>
  );
};
