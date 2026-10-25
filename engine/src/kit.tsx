import React, { createContext, useContext } from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadMont } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import type { Scene, Theme } from "./types";

export const FONT = loadMont("normal", { weights: ["500", "700", "800", "900"], subsets: ["latin"] }).fontFamily;
export const SERIF = loadSerif("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

export const W = 1920; // все код-сцены рисуются в 1920×1080 и масштабируются
export const H = 1080;

export const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };
export const EO = Easing.bezier(0.33, 0, 0.2, 1);
export const OUTC = Easing.out(Easing.cubic);
export const BACK = Easing.out(Easing.back(1.7));

export const ThemeCtx = createContext<Theme>({ paper: "#EFEAE0", ink: "#24272C", a1: "#2F6F6B", a2: "#D39B45", a3: "#B8C9C1", dark: "#1E2124" });
export const useTheme = () => useContext(ThemeCtx);

/** Время в абсолютных секундах видео. p(a, d) — 0..1 от момента a за d секунд; sp(a) — пружина. */
export const useT = (offset = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = offset + frame / fps;
  const p = (a: number, d = 0.5, ease = EO) => interpolate(t, [a, a + d], [0, 1], { ...clamp, easing: ease });
  const sp = (a: number, damping = 13, dur = 20) => (t < a ? 0 : spring({ frame: Math.round((t - a) * fps), fps, config: { damping }, durationInFrames: dur }));
  return { t, frame, fps, p, sp };
};

/** Моменты появления элементов сцены: cues из edit.json, иначе равномерно по сцене. */
export const cueTimes = (sc: Scene, n: number, lead = 0.35) => {
  const out: number[] = [];
  const span = Math.max(0.6, sc.end - sc.start - lead - 1.2);
  for (let i = 0; i < n; i++) {
    const c = sc.cues?.[i];
    out.push(typeof c === "number" && c >= sc.start - 0.2 && c < sc.end ? c : sc.start + lead + (n > 1 ? (Math.min(span * 0.6, 1.1 * (n - 1)) * i) / (n - 1) : 0));
  }
  return out;
};

export const At: React.FC<{ x: number; y: number; s?: number; r?: number; o?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, s = 1, r = 0, o = 1, children, style }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${s}) rotate(${r}deg)`, opacity: o, ...style }}>{children}</div>
);

/** Фон код-сцены: тёплая бумага + тонкая сетка «тетради» (статичная, без зерна). */
export const Paper: React.FC<{ children?: React.ReactNode; color?: string; grid?: boolean }> = ({ children, color, grid = true }) => {
  const th = useTheme();
  return (
    <div style={{ position: "absolute", inset: 0, background: color || th.paper, overflow: "hidden" }}>
      {grid ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.09 }}>
          {Array.from({ length: 33 }).map((_, i) => <line key={"v" + i} x1={i * 60} y1={0} x2={i * 60} y2={H} stroke={th.ink} strokeWidth={1} />)}
          {Array.from({ length: 19 }).map((_, i) => <line key={"h" + i} x1={0} y1={i * 60} x2={W} y2={i * 60} stroke={th.ink} strokeWidth={1} />)}
        </svg>
      ) : null}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 75% 70% at 50% 45%, rgba(255,255,255,0.4), rgba(0,0,0,0) 60%, rgba(0,0,0,0.10))" }} />
      {children}
    </div>
  );
};

export const Txt: React.FC<{ children: React.ReactNode; size?: number; w?: number; color?: string; serif?: boolean; align?: "left" | "center" | "right"; style?: React.CSSProperties }> = ({ children, size = 56, w = 800, color, serif, align = "center", style }) => {
  const th = useTheme();
  return <div style={{ fontFamily: serif ? SERIF : FONT, fontWeight: serif ? 400 : w, fontSize: size, color: color || th.ink, textAlign: align, lineHeight: 1.12, letterSpacing: serif ? 0 : "-0.01em", ...style }}>{children}</div>;
};

/** Карточка-«стикер» с тенью */
export const Card: React.FC<{ children: React.ReactNode; bg?: string; pad?: number; r?: number; style?: React.CSSProperties; border?: string }> = ({ children, bg = "#FBF8F2", pad = 36, r = 22, style, border }) => {
  const th = useTheme();
  return <div style={{ background: bg, borderRadius: r, padding: pad, border: `4px solid ${border || th.ink}`, boxShadow: `0 10px 0 ${th.ink}22, 0 22px 40px rgba(0,0,0,0.12)`, ...style }}>{children}</div>;
};

/** Слово-штамп: появляется с отскоком */
export const pop = (k: number) => ({ transform: `scale(${0.6 + 0.4 * k})`, opacity: Math.min(1, k * 1.6) });

export const rnd = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

export const lerpColor = (a: string, b: string, k: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, k))).toString(16).padStart(2, "0")).join("");
};

/** Выход сцены: последние 0.35 с — лёгкое затухание (сцена сама не «дёргается») */
export const useSceneFade = (sc: Scene) => {
  const { t } = useT();
  const inK = interpolate(t, [sc.start, sc.start + 0.28], [0, 1], clamp);
  const outK = interpolate(t, [sc.end - 0.3, sc.end], [1, 0], clamp);
  return Math.min(inK, outK);
};
