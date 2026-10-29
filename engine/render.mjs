// Рендер одного видео конвейера.
//   node render.mjs <папка проекта>                 -> <проект>/out/final.mp4 (прогресс в out/render_log.txt)
//   node render.mjs <папка проекта> --stills 12 60  -> стоп-кадры <проект>/out/check/s_<сек>.jpg
// publicDir = <проект>/public (там жёсткие ссылки на голос, картинки и sfx — готовит conveyor/edit.py)
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const proj = path.resolve(process.argv[2]);
const args = process.argv.slice(3);
const inputProps = JSON.parse(fs.readFileSync(path.join(proj, "edit.json"), "utf-8"));
const out = path.join(proj, "out");
fs.mkdirSync(path.join(out, "check"), { recursive: true });
const log = (s) => { fs.appendFileSync(path.join(out, "render_log.txt"), s + "\n"); console.log(s); };

const serveUrl = await bundle({ entryPoint: path.join(here, "src/index.ts"), publicDir: path.join(proj, "public") });
const composition = await selectComposition({ serveUrl, id: "Video", inputProps });
const chromiumOptions = { gl: "angle" };

if (args[0] === "--stills") {
  for (const s of args.slice(1).map(Number)) {
    await renderStill({ composition, serveUrl, inputProps, frame: Math.round(s * 30), output: path.join(out, "check", `s_${s}.jpg`), imageFormat: "jpeg", jpegQuality: 80, scale: 0.5, chromiumOptions });
    console.log("still", s);
  }
} else {
  fs.writeFileSync(path.join(out, "render_log.txt"), "");
  const t0 = Date.now();
  let last = -1;
  await renderMedia({
    composition, serveUrl, inputProps, codec: "h264", crf: 20, x264Preset: "slow", audioBitrate: "192k", pixelFormat: "yuv420p",
    // когда машина занята (upscayl, второй рендер) кадр может грузиться дольше 30 с — ждём до 3 мин
    outputLocation: path.join(out, "final.mp4"), concurrency: Number(process.env.REMOTION_CONCURRENCY || 8), chromiumOptions,
    timeoutInMilliseconds: 180000, imageFormat: "jpeg", jpegQuality: 92,
    onProgress: ({ progress, renderedFrames, encodedFrames }) => {
      const pc = Math.floor(progress * 100);
      if (pc !== last) {
        last = pc;
        const el = (Date.now() - t0) / 1000;
        const eta = progress > 0.01 ? Math.round((el / progress - el) / 60) : "?";
        log(`${pc}% кадров ${renderedFrames}/${composition.durationInFrames} закодировано ${encodedFrames} — осталось ~${eta} мин`);
      }
    },
  });
  log(`ГОТОВО за ${Math.round((Date.now() - t0) / 60000)} мин: ${path.join(out, "final.mp4")}`);
}
