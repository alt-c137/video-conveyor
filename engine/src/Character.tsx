import React from "react";

export type Expression = "neutral" | "happy" | "sad" | "panic" | "calm" | "scared" | "smug";
export type Pose = "stand" | "wave" | "sit" | "hold" | "point" | "clench" | "open" | "drop" | "shrug";

interface CharacterProps {
  expression?: Expression;
  pose?: Pose;
  size?: number; // px, full height
  color?: string; // skin
  coat?: string; // top
  flip?: boolean;
  style?: React.CSSProperties;
  armL?: number; // degrees away from hanging straight down, outward
  armR?: number;
}

const INK = "#2B2D31";

const mouths: Record<Expression, React.ReactNode> = {
  neutral: <line x1="90" y1="120" x2="110" y2="120" stroke={INK} strokeWidth="4" strokeLinecap="round" />,
  calm: <line x1="92" y1="120" x2="108" y2="120" stroke={INK} strokeWidth="4" strokeLinecap="round" />,
  happy: <path d="M86 115 Q100 130 114 115" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />,
  sad: <path d="M88 124 Q100 113 112 124" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />,
  panic: <ellipse cx="100" cy="121" rx="8" ry="10" fill="#6B2E2A" stroke={INK} strokeWidth="3.5" />,
  scared: <path d="M89 122 Q94 117 100 122 Q106 127 111 122" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />,
  smug: <path d="M88 118 Q102 126 113 113" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />,
};

const eyes: Record<Expression, React.ReactNode> = {
  neutral: (
    <>
      <circle cx="82" cy="96" r="5.6" fill={INK} />
      <circle cx="118" cy="96" r="5.6" fill={INK} />
    </>
  ),
  calm: (
    <>
      <path d="M75 97 Q82 101 89 97" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M111 97 Q118 101 125 97" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  happy: (
    <>
      <path d="M75 98 Q82 90 89 98" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M111 98 Q118 90 125 98" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
    </>
  ),
  sad: (
    <>
      <circle cx="82" cy="98" r="5.2" fill={INK} />
      <circle cx="118" cy="98" r="5.2" fill={INK} />
      <path d="M73 86 L89 90" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M127 86 L111 90" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  panic: (
    <>
      <circle cx="82" cy="96" r="8" fill="#fff" stroke={INK} strokeWidth="3" />
      <circle cx="118" cy="96" r="8" fill="#fff" stroke={INK} strokeWidth="3" />
      <circle cx="82" cy="96" r="3.2" fill={INK} />
      <circle cx="118" cy="96" r="3.2" fill={INK} />
    </>
  ),
  scared: (
    <>
      <circle cx="82" cy="96" r="6.4" fill={INK} />
      <circle cx="118" cy="96" r="6.4" fill={INK} />
      <circle cx="84" cy="94" r="2" fill="#fff" />
      <circle cx="120" cy="94" r="2" fill="#fff" />
      <path d="M74 84 Q82 80 90 84" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M110 84 Q118 80 126 84" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  smug: (
    <>
      <path d="M75 96 L89 96" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M111 96 L125 96" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
    </>
  ),
};

const arms: Record<Pose, { left: number; right: number }> = {
  stand: { left: 12, right: 12 },
  wave: { left: 12, right: 150 },
  sit: { left: 30, right: 30 },
  hold: { left: -38, right: -38 },
  point: { left: 12, right: 92 },
  clench: { left: 30, right: 30 },
  open: { left: 55, right: 55 },
  drop: { left: 5, right: 5 },
  shrug: { left: 112, right: 112 },
};

const Arm: React.FC<{ x: number; y: number; angle: number; coat: string; skin: string }> = ({ x, y, angle, coat, skin }) => (
  <g transform={`rotate(${angle} ${x} ${y})`}>
    <path d={`M${x} ${y} Q${x - 3} ${y + 26} ${x} ${y + 46}`} stroke={INK} strokeWidth="19" strokeLinecap="round" fill="none" />
    <path d={`M${x} ${y} Q${x - 3} ${y + 26} ${x} ${y + 46}`} stroke={coat} strokeWidth="13" strokeLinecap="round" fill="none" />
    <circle cx={x} cy={y + 52} r="8.5" fill={skin} stroke={INK} strokeWidth="3" />
  </g>
);

/**
 * Round-head flat character drawn to match the channel's images:
 * big head, dot eyes, line mouth, short torso, two legs with shoes.
 */
export const Character: React.FC<CharacterProps> = ({
  expression = "neutral",
  pose = "stand",
  size = 320,
  color = "#EFCFAE",
  coat = "#4A4E55",
  flip = false,
  style,
  armL,
  armR,
}) => {
  const a = arms[pose];
  const sitting = pose === "sit";
  return (
    <svg width={size * (200 / 260)} height={size} viewBox="0 0 200 260" style={{ transform: flip ? "scaleX(-1)" : undefined, overflow: "visible", ...style }}>
      {/* legs */}
      {sitting ? (
        <>
          <path d="M80 204 L80 222 L60 222" stroke={INK} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M120 204 L120 222 L140 222" stroke={INK} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M80 204 L80 222 L60 222" stroke="#3B4150" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M120 204 L120 222 L140 222" stroke="#3B4150" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      ) : (
        <>
          <rect x="78" y="198" width="17" height="48" rx="7" fill="#3B4150" stroke={INK} strokeWidth="3.5" />
          <rect x="105" y="198" width="17" height="48" rx="7" fill="#3B4150" stroke={INK} strokeWidth="3.5" />
          <path d="M70 250 Q70 240 86 240 L96 240 L96 252 Z" fill="#26282C" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M130 250 Q130 240 114 240 L104 240 L104 252 Z" fill="#26282C" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        </>
      )}
      {/* torso */}
      <path d="M68 150 Q100 138 132 150 L136 204 Q100 212 64 204 Z" fill={coat} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M100 150 L100 204" stroke="rgba(0,0,0,0.12)" strokeWidth="3" />
      <Arm x={70} y={154} angle={armL ?? a.left} coat={coat} skin={color} />
      <Arm x={130} y={154} angle={-(armR ?? a.right)} coat={coat} skin={color} />
      {/* head */}
      <circle cx="100" cy="95" r="47" fill={color} stroke={INK} strokeWidth="3.5" />
      <ellipse cx="80" cy="108" rx="7" ry="4" fill="rgba(226,120,110,0.25)" />
      <ellipse cx="120" cy="108" rx="7" ry="4" fill="rgba(226,120,110,0.25)" />
      {eyes[expression]}
      {mouths[expression]}
    </svg>
  );
};
