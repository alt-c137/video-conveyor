import React from "react";
import { Img, interpolate, staticFile } from "remotion";
import { clamp, EO, FONT, H, useT, useTheme, W } from "../kit";
import type { Fx } from "../types";

/** Эффекты поверх картинок по сценарию монтажа (montage.json -> edit.json "fx"). Описание: docs/MONTAGE.md.
 *  Всё детерминировано (без Math.random), «дрожь» только у glitch/rewind и не дольше их 0.3–1.5 с. */

const live = (fx: Fx[], t: number) => fx.filter((f) => t >= f.start - 0.05 && t < f.end + 0.4);
const num = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d);

/** Стиль обёртки картинок: серый стоп-кадр, «плёнка» перемотки, наезд, сдвиг глитча. */
export const fxImageStyle = (fx: Fx[] | undefined, t: number, frame: number): React.CSSProperties => {
  if (!fx?.length) return {};
  const filters: string[] = [];
  let tr = "", origin = "50% 50%";
  for (const f of live(fx, t)) {
    const k = Math.min(interpolate(t, [f.start, f.start + 0.18], [0, 1], clamp), interpolate(t, [f.end - 0.15, f.end], [1, 0], clamp));
    if (k <= 0) continue;
    const pr = f.props || {};
    if (f.type === "freeze") filters.push(`grayscale(${k}) contrast(${1 + 0.15 * k}) brightness(${1 - 0.08 * k})`);
    if (f.type === "rewind") filters.push(`sepia(${0.5 * k}) saturate(${1 + 0.6 * k}) hue-rotate(${-12 * k}deg)`);
    if (f.type === "glitch") {
      const j = ((frame * 37) % 7) - 3;
      tr += ` translateX(${j * 7 * k}px)`;
      filters.push(`saturate(${1 + 1.5 * k}) hue-rotate(${(frame % 3) * 25 * k}deg)`);
    }
    if (f.type === "flash") filters.push(`brightness(${1 + 1.6 * k})`);
    if (f.type === "zoom") {
      const z = 1 + (num(pr.k, 1.25) - 1) * interpolate(t, [f.start, f.start + 0.22], [0, 1], { ...clamp, easing: EO }) * interpolate(t, [f.end - 0.2, f.end], [1, 0], clamp);
      tr += ` scale(${z})`;
      origin = `${num(pr.x, 0.5) * 100}% ${num(pr.y, 0.45) * 100}%`;
    }
  }
  return { filter: filters.join(" ") || undefined, transform: tr.trim() || undefined, transformOrigin: origin };
};

const Sticker: React.FC<{ it: Record<string, unknown>; end: number; i: number }> = ({ it, end, i }) => {
  const { t, sp } = useT();
  const at = num(it.t, 0);
  if (t < at - 0.05) return null;
  const k = sp(at, 11, 24);
  const out = interpolate(t, [end - 0.35, end], [0, 1], clamp);
  const from = String(it.from || "center");
  const dx = from === "left" ? -900 : from === "right" ? 900 : 0, dy = from === "top" ? -700 : from === "bottom" ? 700 : 0;
  const size = Math.min(0.4, Math.max(0.1, num(it.size, 0.25))) * H;
  const x = num(it.x, 0.5) * W, y = num(it.y, 0.45) * H;
  const float = Math.sin((t - at) * 1.6 + i) * 6; // мягкое парение, без дрожи
  const pop = from === "center" ? 0.2 + 0.8 * k : 1;
  return (
    <div style={{ position: "absolute", left: x, top: y + float, width: size, height: size,
      transform: `translate(-50%, -50%) translate(${dx * (1 - k)}px, ${dy * (1 - k)}px) scale(${pop * (1 - 0.6 * out)}) rotate(${(1 - k) * (dx ? 14 : -10)}deg)`,
      opacity: 1 - out }}>
      <Img src={staticFile("stickers/" + String(it.sticker) + ".png")} style={{ width: "100%", height: "100%", objectFit: "contain",
        filter: "drop-shadow(0 0 0 #fff) drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(0 14px 18px rgba(0,0,0,0.45))" }} />
    </div>
  );
};

const Number: React.FC<{ f: Fx }> = ({ f }) => {
  const th = useTheme();
  const { t, sp } = useT();
  const pr = f.props || {};
  const v = num(pr.value, 0);
  const cur = v * interpolate(t, [f.start + 0.1, f.start + 1.0], [0, 1], { ...clamp, easing: EO });
  const dec = Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0;
  const txt = String(pr.prefix || "") + cur.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + String(pr.suffix || "");
  const k = sp(f.start, 12), out = interpolate(t, [f.end - 0.3, f.end], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: num(pr.x, 0.5) * W, top: num(pr.y, 0.4) * H, transform: `translate(-50%, -50%) scale(${(0.6 + 0.4 * k) * (1 - 0.3 * out)})`, opacity: 1 - out, textAlign: "center" }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 190, lineHeight: 1, color: "#fff", WebkitTextStroke: `10px ${th.ink}`, paintOrder: "stroke", textShadow: "0 12px 30px rgba(0,0,0,0.5)", letterSpacing: "-0.02em" }}>{txt}</div>
      {pr.label ? <div style={{ marginTop: 10, display: "inline-block", background: th.a2, color: th.ink, fontFamily: FONT, fontWeight: 900, fontSize: 40, padding: "6px 22px", borderRadius: 12, border: `4px solid ${th.ink}`, letterSpacing: "0.04em" }}>{String(pr.label).toUpperCase()}</div> : null}
    </div>
  );
};

const Stamp: React.FC<{ f: Fx }> = ({ f }) => {
  const th = useTheme();
  const { t } = useT();
  const pr = f.props || {};
  const col = pr.color === "green" ? "#2E9E5B" : pr.color === "ink" ? th.ink : "#D7263D";
  const s = interpolate(t, [f.start, f.start + 0.14], [2.3, 1], { ...clamp, easing: EO });
  const out = interpolate(t, [f.end - 0.3, f.end], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: num(pr.x, 0.5) * W, top: num(pr.y, 0.42) * H, transform: `translate(-50%, -50%) rotate(-8deg) scale(${s})`, opacity: (t < f.start ? 0 : 1) * (1 - out) }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 130, color: col, border: `12px solid ${col}`, borderRadius: 22, padding: "4px 36px", background: "rgba(255,255,255,0.82)", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{String(pr.text || "").toUpperCase()}</div>
    </div>
  );
};

const Circle: React.FC<{ f: Fx }> = ({ f }) => {
  const { t } = useT();
  const pr = f.props || {};
  const x = num(pr.x, 0.5) * W, y = num(pr.y, 0.5) * H, r = num(pr.r, 0.1) * H;
  const k = interpolate(t, [f.start, f.start + 0.45], [0, 1], { ...clamp, easing: EO });
  const out = interpolate(t, [f.end - 0.3, f.end], [0, 1], clamp);
  if (pr.kind === "arrow") {
    const ax = x - r * 2.2, ay = y - r * 1.6;
    const len = Math.hypot(x - ax, y - ay);
    return (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
        <path d={`M${ax},${ay} Q${ax + len * 0.2},${y - r * 0.2} ${x - r * 0.35},${y - r * 0.25}`} fill="none" stroke="#D7263D" strokeWidth={14} strokeLinecap="round" strokeDasharray={len * 1.3} strokeDashoffset={len * 1.3 * (1 - k)} />
        {k > 0.9 ? <path d={`M${x - r * 0.35 - 40},${y - r * 0.25 - 30} L${x - r * 0.35},${y - r * 0.25} L${x - r * 0.35 - 48},${y - r * 0.25 + 16}`} fill="none" stroke="#D7263D" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" /> : null}
      </svg>
    );
  }
  // «от руки»: эллипс чуть больше круга, конец заходит за начало
  const pts = Array.from({ length: 41 }, (_, i) => {
    const a = -1.9 + (i / 40) * Math.PI * 2.15;
    const rr = r * (1 + 0.06 * Math.sin(i * 1.7));
    return `${x + Math.cos(a) * rr * 1.25},${y + Math.sin(a) * rr}`;
  });
  const L = r * 8.6;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
      <polyline points={pts.join(" ")} fill="none" stroke="#D7263D" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={L} strokeDashoffset={L * (1 - k)} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))" }} />
    </svg>
  );
};

const Label: React.FC<{ text: string; icon: string; o: number }> = ({ text, icon, o }) => (
  <div style={{ position: "absolute", left: 70, top: 60, opacity: o, display: "flex", gap: 18, alignItems: "center", fontFamily: FONT, fontWeight: 900, fontSize: 54, color: "#fff", textShadow: "0 4px 14px rgba(0,0,0,0.8)", letterSpacing: "0.06em" }}>
    <span style={{ fontSize: 60 }}>{icon}</span>{text}
  </div>
);

const Freeze: React.FC<{ f: Fx }> = ({ f }) => {
  const th = useTheme();
  const { t, sp } = useT();
  const o = Math.min(interpolate(t, [f.start, f.start + 0.15], [0, 1], clamp), interpolate(t, [f.end - 0.2, f.end], [1, 0], clamp));
  const txt = String(f.props?.text || f.props?.label || "WAIT.").toUpperCase();
  return (
    <>
      <Label text="PAUSED" icon="⏸" o={o} />
      <div style={{ position: "absolute", left: W / 2, top: H * 0.5, transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * sp(f.start + 0.1, 12)})`, opacity: o }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 120, color: "#fff", WebkitTextStroke: `9px ${th.ink}`, paintOrder: "stroke", whiteSpace: "nowrap", textShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>{txt}</div>
      </div>
    </>
  );
};

const Rewind: React.FC<{ f: Fx }> = ({ f }) => {
  const { t, frame } = useT();
  const o = Math.min(interpolate(t, [f.start, f.start + 0.1], [0, 1], clamp), interpolate(t, [f.end - 0.15, f.end], [1, 0], clamp));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const y = (((frame * 23 + i * 233) % H) + H) % H;
        return <div key={i} style={{ position: "absolute", left: 0, right: 0, top: y, height: 6 + (i % 3) * 5, background: "rgba(255,255,255,0.55)", mixBlendMode: "overlay" }} />;
      })}
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, rgba(0,0,0,0) 2px 5px)" }} />
      <Label text={String(f.props?.text || "REWIND").toUpperCase()} icon="◀◀" o={1} />
    </div>
  );
};

const Glitch: React.FC<{ f: Fx }> = ({ f }) => {
  const { frame } = useT();
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 4 }).map((_, i) => {
        const y = ((frame * 61 + i * 271) % 1000) / 1000 * H;
        const h = 18 + ((frame + i * 7) % 5) * 16;
        return <div key={i} style={{ position: "absolute", left: 0, right: 0, top: y, height: h, transform: `translateX(${(((frame + i) % 5) - 2) * 26}px)`,
          background: i % 2 ? "rgba(255,0,80,0.28)" : "rgba(0,220,255,0.28)", mixBlendMode: "screen" }} />;
      })}
    </div>
  );
};

const Flash: React.FC<{ f: Fx }> = ({ f }) => {
  const { t } = useT();
  const o = interpolate(t, [f.start, f.start + 0.05, f.end], [0, 0.85, 0], clamp);
  return <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: o }} />;
};

export const FxLayer: React.FC<{ fx?: Fx[] }> = ({ fx }) => {
  const { t } = useT();
  if (!fx?.length) return null;
  return (
    <>
      {live(fx, t).map((f, i) => {
        const key = f.type + f.start;
        if (t < f.start - 0.05 || t > f.end) return null;
        switch (f.type) {
          case "pop": return <React.Fragment key={key}>{((f.props?.items as Record<string, unknown>[]) || []).map((it, j) => <Sticker key={j} it={it} end={f.end} i={i + j} />)}</React.Fragment>;
          case "number": return <Number key={key} f={f} />;
          case "stamp": return <Stamp key={key} f={f} />;
          case "circle": return <Circle key={key} f={f} />;
          case "freeze": return <Freeze key={key} f={f} />;
          case "rewind": return <Rewind key={key} f={f} />;
          case "glitch": return <Glitch key={key} f={f} />;
          case "flash": return <Flash key={key} f={f} />;
          default: return null;
        }
      })}
    </>
  );
};
