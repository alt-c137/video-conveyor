import React, { useLayoutEffect, useRef } from "react";
import { clearFrame, composite, createFrame, createFx } from "pixelfx";
import * as blizzard from "pixelfx/fx/weather/blizzard";
import * as snow from "pixelfx/fx/weather/snow";
import * as rain from "pixelfx/fx/weather/rain";
import * as storm from "pixelfx/fx/weather/storm";
import * as fog from "pixelfx/fx/weather/fog";
import * as rays from "pixelfx/fx/weather/god-rays";
import * as aurora from "pixelfx/fx/weather/aurora";
import * as clouds from "pixelfx/fx/weather/clouds";
import * as fireflies from "pixelfx/fx/weather/fireflies";
import * as leaves from "pixelfx/fx/weather/falling-leaves";
import * as campfire from "pixelfx/fx/fire/campfire";
import * as brazier from "pixelfx/fx/fire/brazier";

const FX: Record<string, any> = { blizzard, snow, rain, storm, fog, rays, aurora, clouds, fireflies, leaves, campfire, brazier };
const PW = 320, PH = 180;
const bgr = (hex: string) => { const n = parseInt(hex.replace("#", ""), 16); return ((n & 255) << 16) | (n & 0xff00) | (n >>> 16); };

/** Живой пиксельный фон из pixelfx: 320×180, крупные честные пиксели. Функция времени, симуляция прокручивается заново. */
export const PixelFx: React.FC<{ kind: string; t: number; bg: string; zoom?: number }> = ({ kind, t, bg, zoom = 1 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    const mod = FX[kind];
    if (!ctx || !mod) return;
    const frame = createFrame(PW, PH), img = new ImageData(PW, PH);
    const fx = createFx(mod, { x: PW / 2, y: mod.meta?.origin?.[1] ?? PH - 10, seed: 7 });
    fx.update(Math.max(0.001, t) + 2); // +2 с: эффект уже разгорелся, когда сцена появилась
    clearFrame(frame);
    fx.draw(frame, "back");
    fx.draw(frame, "front");
    composite(frame, img.data, bgr(bg));
    ctx.putImageData(img, 0, 0);
  }, [kind, t, bg]);
  return <canvas ref={ref} width={PW} height={PH} style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
    imageRendering: "pixelated", transform: `scale(${zoom})`, transformOrigin: "50% 100%" }} />;
};
