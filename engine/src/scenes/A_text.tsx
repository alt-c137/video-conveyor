// Текстовые сцены: карточки разделов, вопросы, цитаты, числа, списки, исследования, сравнения.
import { PixelFx } from "./E_pixel";
import React from "react";
import { interpolate } from "remotion";
import { At, BACK, Card, clamp, cueTimes, FONT, H, Paper, pop, SERIF, Txt, useT, useTheme, W } from "../kit";
import type { Scene } from "../types";

type P = { sc: Scene };

/** Карточка раздела: номер + название, линия «рисуется». */
export const TitleCard: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp, t } = useT();
  const a = sc.start;
  const { n = 1, title = "", kicker = "", fx = "" } = sc.props;
  return (
    <Paper color={th.dark} grid={false}>
      {fx ? <PixelFx kind={fx} t={t - a} bg={th.dark} zoom={fx === "campfire" || fx === "brazier" ? 1.7 : 1} /> : (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <circle cx={W / 2} cy={H / 2 - 40} r={300 * p(a, 1.2)} fill="none" stroke={th.a2} strokeOpacity={0.18} strokeWidth={3} />
          <circle cx={W / 2} cy={H / 2 - 40} r={420 * p(a + 0.15, 1.3)} fill="none" stroke={th.a2} strokeOpacity={0.1} strokeWidth={3} />
        </svg>
      )}
      {fx ? <div style={{ position: "absolute", left: 0, right: 0, top: H / 2 - 260, height: 400, background: "radial-gradient(ellipse at center, #000a 0%, #0006 50%, transparent 74%)" }} /> : null}
      <At x={W / 2} y={H / 2 - 170} s={sp(a, 11)}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: th.a2, letterSpacing: "0.3em" }}>{kicker || `PART ${n}`}</div>
      </At>
      <At x={W / 2} y={H / 2 - 30} s={0.92 + 0.08 * sp(a + 0.15)} o={p(a + 0.15, 0.4)}>
        <Txt size={title.length > 26 ? 92 : 120} w={900} color="#F6F2EA" style={{ maxWidth: 1600 }}>{title}</Txt>
      </At>
      <div style={{ position: "absolute", left: W / 2 - 260, top: H / 2 + (title.length > 18 ? 128 : 90), width: 520 * p(a + 0.4, 0.7), height: 8, borderRadius: 4, background: th.a2 }} />
    </Paper>
  );
};

/** Большой вопрос: знак «?» пульсирует, текст по словам. */
export const Question: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { t, p, sp } = useT();
  const words = String(sc.props.text || "").split(" ");
  const span = Math.min(2.2, (sc.end - sc.start) * 0.5);
  return (
    <Paper>
      <At x={W / 2} y={300} s={sp(sc.start, 9) * (1 + 0.04 * Math.sin(t * 4))} r={-6}>
        <div style={{ fontFamily: SERIF, fontSize: 330, color: th.a1, lineHeight: 1 }}>?</div>
      </At>
      <At x={W / 2} y={700}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 22px", maxWidth: 1500 }}>
          {words.map((w, i) => {
            const k = p(sc.start + 0.3 + (span * i) / words.length, 0.3, BACK);
            return <span key={i} style={{ fontFamily: FONT, fontWeight: 900, fontSize: words.length > 9 ? 70 : 88, color: th.ink, ...pop(k), display: "inline-block" }}>{w}</span>;
          })}
        </div>
      </At>
    </Paper>
  );
};

/** Цитата крупным шрифтом с засечками, подчёркивание ключевого слова. */
export const Quote: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p } = useT();
  const { text = "", author = "", highlight = "" } = sc.props;
  const words = String(text).split(" ");
  const span = Math.min(3, (sc.end - sc.start) * 0.6);
  return (
    <Paper>
      <div style={{ position: "absolute", left: 170, top: 120, fontFamily: SERIF, fontSize: 300, color: th.a2, opacity: p(sc.start, 0.4), lineHeight: 1 }}>“</div>
      <div style={{ position: "absolute", left: 260, right: 260, top: 300, display: "flex", flexWrap: "wrap", gap: "0 20px" }}>
        {words.map((w, i) => {
          const k = p(sc.start + 0.2 + (span * i) / words.length, 0.35);
          const hl = highlight && w.toLowerCase().replace(/[^a-z']/g, "").startsWith(String(highlight).toLowerCase());
          return (
            <span key={i} style={{ fontFamily: SERIF, fontSize: words.length > 18 ? 66 : 80, color: hl ? th.a1 : th.ink, opacity: k, transform: `translateY(${(1 - k) * 14}px)`, display: "inline-block", lineHeight: 1.25, borderBottom: hl ? `8px solid ${th.a2}` : "none" }}>{w}</span>
          );
        })}
      </div>
      {author ? (
        <div style={{ position: "absolute", right: 260, bottom: 170, fontFamily: FONT, fontWeight: 800, fontSize: 40, color: th.ink, opacity: p(sc.start + span, 0.5) }}>— {author}</div>
      ) : null}
    </Paper>
  );
};

/** Кинетическая типографика: слова вылетают по одному, последнее — акцент. */
export const Words: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp } = useT();
  const words: string[] = sc.props.words || [];
  const ts = cueTimes(sc, words.length, 0.2);
  return (
    <Paper>
      {words.map((w, i) => {
        const k = sp(ts[i], 10);
        const last = i === words.length - 1;
        const y = H / 2 - ((words.length - 1) * 130) / 2 + i * 130;
        return (
          <At key={i} x={W / 2} y={y} s={0.5 + 0.5 * k} o={Math.min(1, k * 2)}>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: last ? 128 : 96, color: last ? th.a1 : th.ink, textTransform: "uppercase", letterSpacing: "-0.02em", background: last ? th.a2 + "55" : "none", padding: "0 24px", borderRadius: 12 }}>{w}</div>
          </At>
        );
      })}
      <div style={{ opacity: p(sc.start, 0.1) }} />
    </Paper>
  );
};

/** Большое число со счётчиком. */
export const BigNumber: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp } = useT();
  const { value = 0, from = 0, prefix = "", suffix = "", label = "", decimals = 0 } = sc.props;
  const k = p(sc.start + 0.2, Math.min(1.8, (sc.end - sc.start) * 0.4));
  const v = from + (Number(value) - from) * k;
  return (
    <Paper>
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <circle cx={W / 2} cy={430} r={290} fill="none" stroke={th.a3} strokeWidth={26} />
        <circle cx={W / 2} cy={430} r={290} fill="none" stroke={th.a1} strokeWidth={26} strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 290 * k} 9999`} transform={`rotate(-90 ${W / 2} 430)`} />
      </svg>
      <At x={W / 2} y={430} s={0.8 + 0.2 * sp(sc.start)}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 190, color: th.ink, letterSpacing: "-0.03em" }}>{prefix}{v.toFixed(decimals)}{suffix}</div>
      </At>
      <At x={W / 2} y={880} o={p(sc.start + 0.6, 0.5)}>
        <Txt size={56} style={{ maxWidth: 1500 }}>{label}</Txt>
      </At>
    </Paper>
  );
};

/** Список / чек-лист: пункты появляются по cues, галочка «рисуется». */
export const List: React.FC<P & { recap?: boolean }> = ({ sc, recap }) => {
  const th = useTheme();
  const { p, sp } = useT();
  const items: string[] = sc.props.items || [];
  const ts = cueTimes(sc, items.length, 0.6);
  const rowH = Math.min(150, 760 / Math.max(1, items.length));
  return (
    <Paper>
      <div style={{ position: "absolute", left: 220, top: 110, opacity: p(sc.start, 0.4) }}>
        <Txt size={70} w={900} align="left" color={recap ? th.a1 : th.ink}>{sc.props.title || ""}</Txt>
        <div style={{ width: 340 * p(sc.start + 0.2, 0.6), height: 8, background: th.a2, borderRadius: 4, marginTop: 10 }} />
      </div>
      {items.map((it, i) => {
        const k = sp(ts[i], 14);
        const c = p(ts[i] + 0.15, 0.35);
        return (
          <div key={i} style={{ position: "absolute", left: 220, top: 290 + i * rowH, display: "flex", alignItems: "center", gap: 34, opacity: Math.min(1, k * 1.5), transform: `translateX(${(1 - k) * -60}px)` }}>
            <svg width={76} height={76}>
              <rect x={4} y={4} width={68} height={68} rx={14} fill="#FBF8F2" stroke={th.ink} strokeWidth={5} />
              {recap ? <text x={38} y={54} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={40} fill={th.a1}>{i + 1}</text>
                : <path d="M18 40 L32 54 L58 22" fill="none" stroke={th.a1} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={70} strokeDashoffset={70 * (1 - c)} />}
            </svg>
            <Txt size={rowH > 120 ? 58 : 46} w={700} align="left" style={{ maxWidth: 1350 }}>{it}</Txt>
          </div>
        );
      })}
    </Paper>
  );
};
export const Recap: React.FC<P> = ({ sc }) => <List sc={sc} recap />;

/** Миф → факт: штамп MYTH, зачёркивание, потом FACT. */
export const MythFact: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp } = useT();
  const [a, b] = cueTimes(sc, 2, 0.2);
  const strike = p(b - 0.5, 0.35);
  return (
    <Paper>
      <At x={W / 2} y={330} s={sp(a)}>
        <Card style={{ width: 1400 }} bg="#F3EEE6">
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 34, color: "#B5473B", letterSpacing: "0.25em" }}>MYTH</div>
          <div style={{ position: "relative" }}>
            <Txt size={56} w={700} align="left" style={{ marginTop: 10, opacity: 1 - 0.45 * strike }}>{sc.props.myth}</Txt>
            <div style={{ position: "absolute", left: 0, top: "52%", height: 9, width: `${strike * 100}%`, background: "#B5473B", borderRadius: 5 }} />
          </div>
        </Card>
      </At>
      <At x={W / 2} y={740} s={sp(b, 11)}>
        <Card style={{ width: 1400 }} border={th.a1}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 34, color: th.a1, letterSpacing: "0.25em" }}>WHAT RESEARCH SAYS</div>
          <Txt size={56} w={800} align="left" style={{ marginTop: 10 }}>{sc.props.fact}</Txt>
        </Card>
      </At>
    </Paper>
  );
};

/** Карточка исследования: кто, год, что делали, что нашли (+ штамп). */
export const Study: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp } = useT();
  const { who = "", year = "", setup = "", finding = "" } = sc.props;
  const [a, b, c] = cueTimes(sc, 3, 0.2);
  return (
    <Paper>
      <At x={W / 2} y={H / 2} s={0.9 + 0.1 * sp(a)} o={p(a, 0.3)} r={-1.2}>
        <div style={{ width: 1500, background: "#FBF8F2", border: `5px solid ${th.ink}`, borderRadius: 18, boxShadow: `0 16px 0 ${th.ink}22`, overflow: "hidden" }}>
          <div style={{ background: th.ink, color: "#F6F2EA", padding: "22px 44px", display: "flex", justifyContent: "space-between", fontFamily: FONT, fontWeight: 900, fontSize: 44 }}>
            <span>{who}</span><span style={{ color: th.a2 }}>{year}</span>
          </div>
          <div style={{ padding: "36px 44px 44px" }}>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 28, letterSpacing: "0.2em", color: th.a1, opacity: p(b, 0.3) }}>THE SETUP</div>
            <Txt size={46} w={600} align="left" style={{ opacity: p(b, 0.4), marginTop: 8 }}>{setup}</Txt>
            <div style={{ height: 3, background: th.ink + "22", margin: "28px 0" }} />
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 28, letterSpacing: "0.2em", color: th.a1, opacity: p(c, 0.3) }}>THE FINDING</div>
            <Txt size={52} w={800} align="left" style={{ opacity: p(c, 0.4), marginTop: 8 }}>{finding}</Txt>
          </div>
        </div>
      </At>
      <At x={W / 2 + 610} y={H / 2 + 330} s={interpolate(sp(c + 0.4, 9), [0, 1], [2.2, 1])} o={p(c + 0.4, 0.12)} r={-12}>
        <div style={{ border: `7px solid ${th.a1}`, color: th.a1, fontFamily: FONT, fontWeight: 900, fontSize: 46, padding: "6px 26px", borderRadius: 12, letterSpacing: "0.15em", background: "#FBF8F2cc" }}>STUDY</div>
      </At>
    </Paper>
  );
};

/** Два столбца: «как кажется / как на самом деле». */
export const Split: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { p, sp } = useT();
  const L = sc.props.left || {}, R = sc.props.right || {};
  const [a, b] = cueTimes(sc, 2, 0.2);
  const col = (d: any, x: number, at: number, accent: string, dark: boolean) => (
    <div style={{ position: "absolute", left: x, top: 0, width: W / 2, height: H, background: dark ? th.dark : "transparent", opacity: p(at, 0.35) }}>
      <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 40, letterSpacing: "0.22em", color: accent }}>{String(d.title || "").toUpperCase()}</div>
      {(d.items || []).map((it: string, i: number) => {
        const k = sp(at + 0.3 + i * 0.35);
        return (
          <div key={i} style={{ position: "absolute", top: 300 + i * 150, left: 110, right: 110, transform: `scale(${0.8 + 0.2 * k})`, opacity: k }}>
            <div style={{ background: dark ? "#2C3036" : "#FBF8F2", border: `4px solid ${dark ? accent : th.ink}`, borderRadius: 18, padding: "22px 30px", fontFamily: FONT, fontWeight: 700, fontSize: 44, color: dark ? "#F6F2EA" : th.ink, textAlign: "center" }}>{it}</div>
          </div>
        );
      })}
    </div>
  );
  return (
    <Paper>
      {col(L, 0, a, th.a2, false)}
      {col(R, W / 2, b, th.a2, true)}
      <At x={W / 2} y={H / 2} s={sp(b, 9)}>
        <div style={{ width: 120, height: 120, borderRadius: 60, background: th.a2, border: `5px solid ${th.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 900, fontSize: 44, color: th.ink }}>VS</div>
      </At>
    </Paper>
  );
};

/** Ряд карточек с иконками-эмодзи (только предметы, без лиц). */
export const Cards: React.FC<P> = ({ sc }) => {
  const th = useTheme();
  const { sp } = useT();
  const cards: { icon?: string; title: string; text?: string }[] = sc.props.cards || [];
  const ts = cueTimes(sc, cards.length, 0.3);
  const n = Math.max(1, cards.length);
  const w = Math.min(520, (W - 200) / n - 40);
  return (
    <Paper>
      {sc.props.title ? <At x={W / 2} y={150}><Txt size={64} w={900}>{sc.props.title}</Txt></At> : null}
      {cards.map((c, i) => {
        const k = sp(ts[i], 12);
        const x = W / 2 + (i - (n - 1) / 2) * (w + 50);
        return (
          <At key={i} x={x} y={H / 2 + 60} s={0.7 + 0.3 * k} o={Math.min(1, k * 1.6)} r={(i % 2 ? 1.5 : -1.5) * (1 - k)}>
            <Card style={{ width: w, minHeight: 470, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ fontSize: 120, lineHeight: 1 }}>{c.icon || "•"}</div>
              <Txt size={44} w={900}>{c.title}</Txt>
              {c.text ? <Txt size={32} w={600} style={{ opacity: 0.8 }}>{c.text}</Txt> : null}
            </Card>
          </At>
        );
      })}
    </Paper>
  );
};
