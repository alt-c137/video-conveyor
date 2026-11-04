import React from "react";
import { Img, interpolate, staticFile } from "remotion";
import { loadFont as loadHand } from "@remotion/google-fonts/Caveat";
import { clamp, EO, FONT, H, useT, useTheme, W } from "../kit";
import type { Fx, FxLayer as L } from "../types";

/** Режиссёрский слой монтажа (montage.py -> edit.json "fx"): моменты истории, у каждого слои-инструменты.
 *  Описание инструментов: prompts/montage.md и docs/MONTAGE.md. Всё детерминировано; дёргаются только glitch/rewind. */

const HAND = loadHand("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily;
const n = (v: unknown, d: number) => (typeof v === "number" && isFinite(v) ? v : d);
const on = (l: L, t: number) => t >= l.t0 - 0.02 && t < l.t1;
/** 0..1: вход за a с, выход за b с */
const env = (l: L, t: number, a = 0.25, b = 0.3) => Math.min(interpolate(t, [l.t0, l.t0 + a], [0, 1], { ...clamp, easing: EO }), interpolate(t, [l.t1 - b, l.t1], [1, 0], clamp));
const layersAt = (fx: Fx[] | undefined, t: number) => (fx || []).filter((m) => t >= m.start - 0.05 && t < m.end + 0.05).flatMap((m) => m.layers).filter((l) => on(l, t));
const COL: Record<string, string> = { red: "#D7263D", green: "#2E9E5B" };

/** Что делаем с самой картинкой (обёртка слоя Images): цвет, наезд, пауза, фото, вынос персонажа. */
export const fxImageStyle = (fx: Fx[] | undefined, t: number, frame: number): React.CSSProperties => {
  const ls = layersAt(fx, t);
  if (!ls.length) return {};
  const f: string[] = [];
  let tr = "", origin = "50% 50%";
  for (const l of ls) {
    const k = env(l, t, 0.2, 0.2);
    switch (l.tool) {
      case "grade": {
        const s = n(l.strength, 0.8) * k, g = String(l.kind || "grey");
        if (g === "grey") f.push(`grayscale(${s})`);
        if (g === "sepia") f.push(`sepia(${s}) contrast(${1 - 0.08 * s})`);
        if (g === "night") f.push(`brightness(${1 - 0.45 * s}) saturate(${1 - 0.4 * s}) hue-rotate(${-25 * s}deg)`);
        if (g === "warm") f.push(`sepia(${0.35 * s}) saturate(${1 + 0.3 * s})`);
        if (g === "cold") f.push(`saturate(${1 - 0.35 * s}) hue-rotate(${18 * s}deg) brightness(${1 - 0.1 * s})`);
        if (g === "red") f.push(`sepia(${0.6 * s}) hue-rotate(${-35 * s}deg) saturate(${1 + 1.5 * s})`);
        if (g === "bleach") f.push(`contrast(${1 + 0.3 * s}) saturate(${1 - 0.6 * s}) brightness(${1 + 0.1 * s})`);
        break;
      }
      case "pause": f.push(`grayscale(${k}) contrast(${1 + 0.12 * k})`); break;
      case "rewind": f.push(`sepia(${0.5 * k}) saturate(${1 + 0.5 * k})`); tr += ` translateX(${(((frame * 13) % 5) - 2) * 3 * k}px)`; break;
      case "glitch": f.push(`saturate(${1 + 1.5 * k}) hue-rotate(${(frame % 3) * 25 * k}deg)`); tr += ` translateX(${(((frame * 37) % 7) - 3) * 7 * k}px)`; break;
      case "flash": f.push(`brightness(${1 + 1.4 * interpolate(t, [l.t0, l.t0 + 0.04, l.t1], [0, 1, 0], clamp)})`); break;
      case "lift": f.push(`brightness(${1 - n(l.dim, 0.5) * k}) blur(${7 * k}px)`); break;
      case "polaroid": {
        f.push(`sepia(${0.2 * k})`);
        tr += ` scale(${1 - 0.2 * k}) rotate(${-3 * k}deg)`;
        break;
      }
      case "camera": {
        const kind = String(l.kind || "punch");
        const a = kind === "punch" ? interpolate(t, [l.t0, l.t0 + 0.22], [0, 1], { ...clamp, easing: EO }) : interpolate(t, [l.t0, l.t1], [0, 1], { ...clamp, easing: EO });
        const back = interpolate(t, [l.t1 - 0.25, l.t1], [1, 0], clamp);
        const kk = n(l.k, kind === "pull" ? 1.25 : 1.2);
        if (kind === "punch") tr += ` scale(${1 + (kk - 1) * a * back})`;
        if (kind === "pull") tr += ` scale(${kk - (kk - 1) * a})`;
        if (kind === "drift_up") tr += ` scale(1.08) translateY(${(1 - a) * 40 - 20}px)`;
        if (kind === "drift_down") tr += ` scale(1.08) translateY(${a * 40 - 20}px)`;
        origin = `${n(l.x, 0.5) * 100}% ${n(l.y, 0.45) * 100}%`;
        break;
      }
    }
  }
  return { filter: f.join(" ") || undefined, transform: tr.trim() || undefined, transformOrigin: origin };
};

const StickerImg: React.FC<{ id: string; size: number }> = ({ id, size }) => (
  <Img src={staticFile("stickers/" + id + ".png")} style={{ width: size, height: size, objectFit: "contain",
    filter: "drop-shadow(4px 0 0 #fff) drop-shadow(-4px 0 0 #fff) drop-shadow(0 4px 0 #fff) drop-shadow(0 -4px 0 #fff) drop-shadow(0 14px 18px rgba(0,0,0,0.45))" }} />
);

const Sticker: React.FC<{ l: L }> = ({ l }) => {
  const { t, sp } = useT();
  const k = sp(l.t0, 11, 24), out = interpolate(t, [l.t1 - 0.3, l.t1], [0, 1], clamp);
  const e = String(l.enter || "pop"), size = Math.min(0.45, Math.max(0.08, n(l.size, 0.26))) * H;
  const dx = e === "fly_left" ? -1100 : e === "fly_right" ? 1100 : 0;
  const dy = e === "drop" ? -900 * (1 - k) : e === "rise" || e === "slide_up" ? 700 * (1 - k) : 0;
  const sc = e === "pop" ? k : e === "grow" ? interpolate(t, [l.t0, l.t0 + 0.8], [0.2, 1], { ...clamp, easing: EO }) : 1;
  const ex = String(l.exit || "pop");
  const float = Math.sin((t - l.t0) * 1.5) * 5;
  return (
    <div style={{ position: "absolute", left: n(l.x, 0.5) * W, top: n(l.y, 0.5) * H + float,
      transform: `translate(-50%, -50%) translate(${dx * (1 - k) + (ex === "fly" ? out * 1100 : 0)}px, ${dy}px) scale(${sc * (ex === "pop" ? 1 - out : 1)}) rotate(${n(l.tilt, 0) + (1 - k) * (dx ? 12 : 0)}deg)`,
      opacity: ex === "fade" ? 1 - out : 1 }}>
      <StickerImg id={String(l.id)} size={size} />
    </div>
  );
};

const Multiply: React.FC<{ l: L }> = ({ l }) => {
  const { t, sp } = useT();
  const cnt = Math.max(2, Math.min(40, Math.round(n(l.n, 12)))), ar = String(l.arrange || "grid");
  const out = interpolate(t, [l.t1 - 0.3, l.t1], [0, 1], clamp);
  const size = (ar === "rain" || cnt > 20 ? 0.11 : 0.16) * H;
  const stag = Math.min(1.0, cnt * 0.05);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - out }}>
      {Array.from({ length: cnt }).map((_, i) => {
        const h1 = ((i * 7919) % 1000) / 1000, h2 = ((i * 104729) % 1000) / 1000;
        const at = l.t0 + (stag * i) / cnt;
        const k = sp(at, 12, 18);
        let x = 0.5, y = 0.5;
        if (ar === "row") { x = 0.08 + (0.84 * i) / Math.max(1, cnt - 1); y = 0.55; }
        if (ar === "grid") { const c = Math.ceil(Math.sqrt(cnt * 1.7)); x = 0.1 + 0.8 * ((i % c) + 0.5) / c; y = 0.15 + 0.7 * (Math.floor(i / c) + 0.5) / Math.ceil(cnt / c); }
        if (ar === "pile") { x = 0.3 + 0.4 * h1; y = 0.82 - 0.35 * (i / cnt) - 0.05 * h2; }
        if (ar === "crowd") { x = 0.06 + 0.88 * h1; y = 0.3 + 0.55 * h2; }
        if (ar === "rain") { x = 0.05 + 0.9 * h1; y = -0.2 + ((t - at) * (0.35 + 0.25 * h2)) % 1.4; }
        return t < at ? null : (
          <div key={i} style={{ position: "absolute", left: x * W, top: y * H, transform: `translate(-50%, -50%) scale(${ar === "rain" ? 1 : k}) rotate(${(h2 - 0.5) * 24}deg)` }}>
            <StickerImg id={String(l.id)} size={size} />
          </div>
        );
      })}
    </div>
  );
};

const Text: React.FC<{ l: L }> = ({ l }) => {
  const th = useTheme();
  const { t, sp } = useT();
  const st = String(l.style || "label"), txt = String(l.text || "");
  const col = COL[String(l.colour || l.color)] || (l.colour === "accent" ? th.a2 : th.ink);
  // ниже 0.72 живут субтитры, текст туда не пускаем
  const k = env(l, t), x = Math.min(0.85, Math.max(0.15, n(l.x, 0.5))) * W, y = Math.min(0.72, Math.max(0.1, n(l.y, 0.3))) * H;
  const pos: React.CSSProperties = { position: "absolute", left: x, top: y, whiteSpace: "nowrap" };
  if (st === "typewriter") {
    const c = Math.floor(interpolate(t, [l.t0, l.t0 + Math.min(1.2, txt.length * 0.06)], [0, txt.length], clamp));
    return <div style={{ ...pos, transform: "translate(-50%,-50%)", opacity: k, fontFamily: "Courier New, monospace", fontWeight: 700, fontSize: 64, color: th.ink, background: "#FBF6EA", padding: "8px 22px", border: `3px solid ${th.ink}` }}>{txt.slice(0, c)}<span style={{ opacity: Math.floor(t * 3) % 2 }}>▍</span></div>;
  }
  if (st === "handwritten") return <div style={{ ...pos, transform: `translate(-50%,-50%) rotate(-4deg) scale(${0.85 + 0.15 * sp(l.t0, 14)})`, opacity: k, fontFamily: HAND, fontWeight: 700, fontSize: 96, color: COL[String(l.colour)] || "#fff", textShadow: "0 3px 0 rgba(0,0,0,0.65), 0 8px 18px rgba(0,0,0,0.5)" }}>{txt}</div>;
  if (st === "whisper") return <div style={{ ...pos, transform: "translate(-50%,-50%)", opacity: k * 0.85, fontFamily: FONT, fontStyle: "italic", fontWeight: 600, fontSize: 44, color: "#fff", textShadow: "0 3px 12px rgba(0,0,0,0.9)" }}>{txt}</div>;
  if (st === "stamp") {
    const c = COL[String(l.colour)] || "#D7263D";
    return <div style={{ ...pos, transform: `translate(-50%,-50%) rotate(-8deg) scale(${interpolate(t, [l.t0, l.t0 + 0.14], [2.3, 1], { ...clamp, easing: EO })})`, opacity: k, fontFamily: FONT, fontWeight: 900, fontSize: 120, color: c, border: `11px solid ${c}`, borderRadius: 20, padding: "2px 34px", background: "rgba(255,255,255,0.85)" }}>{txt.toUpperCase()}</div>;
  }
  if (st === "headline") return <div style={{ ...pos, transform: `translate(-50%,-50%) scale(${0.7 + 0.3 * sp(l.t0, 12)})`, opacity: k, fontFamily: FONT, fontWeight: 900, fontSize: 118, color: "#fff", WebkitTextStroke: `9px ${col}`, paintOrder: "stroke", textShadow: "0 10px 26px rgba(0,0,0,0.5)" }}>{txt.toUpperCase()}</div>;
  return <div style={{ ...pos, transform: `translate(-50%,-50%) translateY(${(1 - k) * 20}px)`, opacity: k, fontFamily: FONT, fontWeight: 900, fontSize: 52, color: th.ink, background: th.a2, border: `4px solid ${th.ink}`, borderRadius: 12, padding: "6px 22px", letterSpacing: "0.03em" }}>{txt.toUpperCase()}</div>;
};

const Num: React.FC<{ l: L }> = ({ l }) => {
  const th = useTheme();
  const { t, sp } = useT();
  const v = n(l.value, 0), cur = v * interpolate(t, [l.t0 + 0.1, l.t0 + 1], [0, 1], { ...clamp, easing: EO });
  const dec = Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0;
  const txt = String(l.prefix || "") + cur.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + String(l.suffix || "");
  const k = env(l, t);
  return (
    <div style={{ position: "absolute", left: n(l.x, 0.5) * W, top: n(l.y, 0.4) * H, transform: `translate(-50%,-50%) scale(${0.6 + 0.4 * sp(l.t0, 12)})`, opacity: k, textAlign: "center" }}>
      <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 180, lineHeight: 1, color: "#fff", WebkitTextStroke: `10px ${th.ink}`, paintOrder: "stroke", textShadow: "0 12px 30px rgba(0,0,0,0.5)" }}>{txt}</div>
      {l.label ? <div style={{ marginTop: 10, display: "inline-block", background: th.a2, color: th.ink, fontFamily: FONT, fontWeight: 900, fontSize: 40, padding: "6px 22px", borderRadius: 12, border: `4px solid ${th.ink}` }}>{String(l.label).toUpperCase()}</div> : null}
    </div>
  );
};

const Mark: React.FC<{ l: L }> = ({ l }) => {
  const { t } = useT();
  const x = n(l.x, 0.5) * W, y = n(l.y, 0.5) * H, r = n(l.r, 0.1) * H, kind = String(l.kind || "circle");
  const k = interpolate(t, [l.t0, l.t0 + 0.45], [0, 1], { ...clamp, easing: EO }), o = interpolate(t, [l.t1 - 0.3, l.t1], [1, 0], clamp);
  const st = { fill: "none", stroke: "#D7263D", strokeWidth: 13, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  let d = "", L0 = 1;
  if (kind === "circle") { d = Array.from({ length: 41 }, (_, i) => { const a = -1.9 + (i / 40) * Math.PI * 2.15, rr = r * (1 + 0.06 * Math.sin(i * 1.7)); return `${i ? "L" : "M"}${x + Math.cos(a) * rr * 1.25},${y + Math.sin(a) * rr}`; }).join(" "); L0 = r * 8.6; }
  if (kind === "underline") { d = `M${x - r * 1.6},${y} Q${x},${y + r * 0.18} ${x + r * 1.6},${y - r * 0.05}`; L0 = r * 3.4; }
  if (kind === "cross") { d = `M${x - r},${y - r} L${x + r},${y + r} M${x + r},${y - r} L${x - r},${y + r}`; L0 = r * 5.8; }
  if (kind === "check") { d = `M${x - r},${y} L${x - r * 0.3},${y + r * 0.7} L${x + r * 1.1},${y - r * 0.9}`; L0 = r * 3.2; }
  if (kind === "arrow") { const ax = x - r * 2.4, ay = y - r * 1.7; d = `M${ax},${ay} Q${ax + r * 0.6},${y - r * 0.2} ${x - r * 0.3},${y - r * 0.2} M${x - r * 0.75},${y - r * 0.6} L${x - r * 0.3},${y - r * 0.2} L${x - r * 0.85},${y + 0.05 * r}`; L0 = r * 5; }
  return <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: o }}><path d={d} {...st} strokeDasharray={L0} strokeDashoffset={L0 * (1 - k)} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.35))" }} /></svg>;
};

/** Вынос персонажа: его вырезка (layers/N_fg) выходит вперёд, фон под ним затемнён и размыт в fxImageStyle. */
const Lift: React.FC<{ l: L }> = ({ l }) => {
  const { t, sp } = useT();
  const k = sp(l.t0, 14, 22), o = interpolate(t, [l.t1 - 0.3, l.t1], [1, 0], clamp);
  return <Img src={staticFile(String(l.fg))} style={{ position: "absolute", inset: 0, width: W, height: H, objectFit: "cover", opacity: o,
    transform: `scale(${1 + 0.06 * k}) translateY(${-14 * k}px)`, transformOrigin: "50% 80%", filter: `drop-shadow(0 ${24 * k}px ${30 * k}px rgba(0,0,0,0.55))` }} />;
};

const Focus: React.FC<{ l: L }> = ({ l }) => {
  const { t } = useT();
  const k = env(l, t, 0.35, 0.35), kind = String(l.kind || "spotlight");
  const r = n(l.r, 0.22) * H, x = n(l.x, 0.5) * 100, y = n(l.y, 0.45) * 100;
  const bf = kind === "blur" ? "blur(9px)" : kind === "colour" || kind === "color" ? "grayscale(1)" : "brightness(0.32)";
  const mask = `radial-gradient(circle ${r}px at ${x}% ${y}%, transparent 70%, black 100%)`;
  return <div style={{ position: "absolute", inset: 0, opacity: k, backdropFilter: bf, WebkitBackdropFilter: bf, maskImage: mask, WebkitMaskImage: mask }} />;
};

const Bars: React.FC<{ l: L }> = ({ l }) => {
  const { t } = useT();
  const k = env(l, t, 0.45, 0.4), h = 0.115 * H * k;
  return <><div style={{ position: "absolute", left: 0, right: 0, top: 0, height: h, background: "#000" }} /><div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h, background: "#000" }} /></>;
};

const Split: React.FC<{ l: L }> = ({ l }) => {
  const th = useTheme();
  const { t, sp } = useT();
  const k = env(l, t, 0.35, 0.3);
  const side = (id: unknown, label: unknown, left: boolean, d: number) => (
    <div style={{ position: "absolute", top: 0, bottom: 0, left: left ? 0 : W / 2, width: W / 2, background: left ? "rgba(20,22,26,0.5)" : "rgba(250,246,236,0.35)", backdropFilter: "blur(6px)", transform: `translateX(${(left ? -1 : 1) * (1 - k) * W * 0.5}px)` }}>
      <div style={{ position: "absolute", left: W / 4, top: H * 0.45, transform: `translate(-50%,-50%) scale(${sp(l.t0 + d, 12)})` }}>{id ? <StickerImg id={String(id)} size={H * 0.42} /> : null}</div>
      {label ? <div style={{ position: "absolute", left: 0, right: 0, top: H * 0.76, textAlign: "center" }}><span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 56, color: th.ink, background: left ? th.a1 : th.a2, border: `4px solid ${th.ink}`, borderRadius: 12, padding: "6px 24px" }}>{String(label).toUpperCase()}</span></div> : null}
    </div>
  );
  return <>{side(l.left, l.left_label, true, 0.2)}{side(l.right, l.right_label, false, 0.45)}<div style={{ position: "absolute", left: W / 2 - 4, top: 0, bottom: 0, width: 8, background: th.ink, opacity: k }} /></>;
};

const Polaroid: React.FC<{ l: L }> = ({ l }) => {
  const { t } = useT();
  const k = env(l, t, 0.2, 0.25);
  // рамка совпадает с картинкой, сжатой в fxImageStyle (scale 0.8, rotate -3°)
  return (
    <div style={{ position: "absolute", inset: 0, opacity: k }}>
      <div style={{ position: "absolute", left: W * 0.1, top: H * 0.1, width: W * 0.8, height: H * 0.8, transform: "rotate(-3deg)", border: "26px solid #FBF8F1", borderBottomWidth: 110, boxShadow: "0 0 0 2000px rgba(30,28,26,0.55), 0 20px 40px rgba(0,0,0,0.5)", boxSizing: "border-box" }}>
        {l.caption ? <div style={{ position: "absolute", left: 0, right: 0, bottom: -92, textAlign: "center", fontFamily: HAND, fontWeight: 700, fontSize: 62, color: "#2A2622" }}>{String(l.caption)}</div> : null}
      </div>
    </div>
  );
};

const Tag: React.FC<{ text: string; icon: string; o: number }> = ({ text, icon, o }) => (
  <div style={{ position: "absolute", left: 70, top: 60, opacity: o, display: "flex", gap: 18, alignItems: "center", fontFamily: FONT, fontWeight: 900, fontSize: 52, color: "#fff", textShadow: "0 4px 14px rgba(0,0,0,0.8)", letterSpacing: "0.06em" }}><span>{icon}</span>{text}</div>
);

const Pause: React.FC<{ l: L }> = ({ l }) => {
  const th = useTheme();
  const { t, sp } = useT();
  const k = env(l, t, 0.15, 0.2);
  return <><Tag text="PAUSED" icon="⏸" o={k} />{l.text ? <div style={{ position: "absolute", left: W / 2, top: H / 2, transform: `translate(-50%,-50%) scale(${0.7 + 0.3 * sp(l.t0 + 0.1)})`, opacity: k, fontFamily: FONT, fontWeight: 900, fontSize: 110, color: "#fff", WebkitTextStroke: `9px ${th.ink}`, paintOrder: "stroke", whiteSpace: "nowrap" }}>{String(l.text).toUpperCase()}</div> : null}</>;
};

const Rewind: React.FC<{ l: L }> = ({ l }) => {
  const { t, frame } = useT();
  const k = env(l, t, 0.1, 0.15);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: k }}>
      {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ position: "absolute", left: 0, right: 0, top: (((frame * 23 + i * 233) % H) + H) % H, height: 6 + (i % 3) * 5, background: "rgba(255,255,255,0.5)", mixBlendMode: "overlay" }} />)}
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, rgba(0,0,0,0) 2px 5px)" }} />
      <Tag text={String(l.text || "REWIND").toUpperCase()} icon="◀◀" o={1} />
    </div>
  );
};

const Glitch: React.FC = () => {
  const { frame } = useT();
  return <>{Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ position: "absolute", left: 0, right: 0, top: (((frame * 61 + i * 271) % 1000) / 1000) * H, height: 18 + ((frame + i * 7) % 5) * 16, transform: `translateX(${(((frame + i) % 5) - 2) * 26}px)`, background: i % 2 ? "rgba(255,0,80,0.28)" : "rgba(0,220,255,0.28)", mixBlendMode: "screen" }} />)}</>;
};

const DRAW: Record<string, React.FC<{ l: L }>> = { sticker: Sticker, multiply: Multiply, text: Text, number: Num, mark: Mark, lift: Lift,
  focus: Focus, bars: Bars, split: Split, polaroid: Polaroid, pause: Pause, rewind: Rewind, glitch: Glitch };
// порядок наложения: фокус и полосы под предметами, текст сверху
const ORDER = ["focus", "polaroid", "lift", "split", "multiply", "sticker", "mark", "number", "text", "bars", "pause", "rewind", "glitch"];

export const FxLayer: React.FC<{ fx?: Fx[] }> = ({ fx }) => {
  const { t } = useT();
  const ls = layersAt(fx, t).filter((l) => DRAW[l.tool]).sort((a, b) => ORDER.indexOf(a.tool) - ORDER.indexOf(b.tool));
  if (!ls.length) return null;
  return <>{ls.map((l, i) => { const C = DRAW[l.tool]; return <C key={l.tool + l.t0 + "_" + i} l={l} />; })}</>;
};
