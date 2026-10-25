# Claude builds the whole video (Remotion) — playbook

Reference build: `E:\Adobe\Видео ИИ редактор\gray-car-2k` ("What your gray car says about you", Канал 5 / Видео 5,
2026-09-27). The user called it the best edit ever: dense custom animation + generated SFX + own design.
Its `ОТЧЁТ_ДЛЯ_ИИ.md` has architecture + 14 pitfalls — read it first (once), don't re-derive.

## Two modes — ask only if the user didn't say
- **«как это видео» (REPLICA)** — copy gray-car-2k, keep its look: light "paper" code scenes, UK-number-plate
  captions, 5-car section indicator, car-pass wipes, subscribe-car CTA, parking-lot end screen, same kit/character.
  Only rewrite `data2.ts` SCENES, the scene files and sfx cues for the new script.
- **«сделай круто» (FRESH)** — same quality bar and workflow, but a NEW design language derived from THIS video's
  topic: new caption object (plates were for cars — for money use receipts, for relationships notes, etc.), new
  transition motif, new CTA gag, new end screen, new palette. Reuse only plumbing (kit helpers, check.mjs,
  sheet.py, gen_sfx.py, render flags). Never a 1:1 copy of the previous video.

## What made it great (keep in both modes)
1. **~55 code scenes for 15 min** (one every ~15–20 s) that REPLACE images: counters, charts, scales, flip cards,
   split screens, stamps, calendars, dials, crowds of 100 dots, icebergs… each tied to exact words.
2. **Timing in absolute seconds** from Whisper words (`useT(start)`: `p(a,dur)`, `sp(a)`) — beats land on the word.
   Dump `word@sec` once to `out/words.txt` and grep it.
3. **Per-section structure:** title card → 3–6 scenes → reusable "world sees / he sees himself" split card.
   Persistent progress indicator of sections. Recap scene + roll-call at the end.
4. **Recurring motif** (gray car) turning into the punchline objects: receipt, armor, white flag, password keypad.
5. **Own SFX, no music** — procedural `gen_sfx.py` (car pass, stamp, cash, printer, beep, chime, clang, vroom,
   peel, flutter, spotlight, swish, tick, whirr, wah) at 0.1–0.5 volume under the voice. User adds music.
6. **Own character** drawn to match the image style (round head, dot eyes, legs+shoes), 5+ variants by outfit.
7. Missing Flow images → cover that range with code scenes (user liked it more than the images).

## Hard rules (user was furious when broken)
- Images: **Ken Burns push-in only, constant speed, centred.** NO sideways/vertical drift alternating per shot
  ("earthquake"), NO boil/wobble, NO parallax cut-outs, NO film grain. Shake only as a rare one-off accent.
- Don't copy the GLM/Z.AI projects' design (detachment-2k etc.) — only node_modules/flags.
- Cover revealing women's clothing in images (bare shoulders/legs) — `cover.py` pattern; images are hardlinks →
  break the link before writing, keep originals in `out/orig`.
- Render on GPU: `--gl=angle --concurrency=8`, check `nvidia-smi` shows `chrome-headless-shell`.
  Log progress to `out/render_log.txt` (`*>`), tell the user where to watch it. 16 min ≈ 25–35 min render.
- node/npx only via PowerShell (Git Bash can't run node here).

## Workflow (token-lean)
1. Verify image N == prompt N on a contact sheet; list missing numbers.
2. Copy project, hardlink images + voice (`mklink /H`), copy shotlist + transcript.
3. Write scenes in blocks of ~10; after each block `node check.mjs <secs>` + `python sheet.py` and LOOK.
4. `npx tsc --noEmit`, then one background render; verify with ffprobe + a few frames + motion check.
5. Leave/refresh `ОТЧЁТ_ДЛЯ_ИИ.md`; give the user title/description/tags on request.
