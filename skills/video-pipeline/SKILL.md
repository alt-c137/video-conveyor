---
name: video-pipeline
description: Pipeline for the user's YouTube channel videos (psychology/self-improvement, English voiceover, flat vector cartoon images, Remotion edit). Use when the user gives a Whisper transcript JSON (e.g. E:\Adobe\Канал\виспер\out\XXXX.json) or a numbered prompts file and asks for image prompts, a storyboard, a Remotion/montage brief, or says "делаем видео", "промты для видео", "промты уже есть", or asks Claude to build/render the whole video in Remotion ("сделай видео", "смонтируй", "как это видео", "сделай круто").
---

# Video pipeline

The user writes in Russian — answer in Russian, short. Videos: ~10–12 min English narration,
images generated in Google Flow (batch extension), edited in Remotion by another AI (Z.AI / GLM)
or by Claude if the user asks. Save Claude's limits: don't re-read files or re-explain — produce files.

## Inputs (two cases)
- **A. Only transcript** `X.json` (Whisper: `segments[].start/end/text/words[]`) → write prompts from scratch.
- **B. Prompts already generated** (numbered file "1. ... 2. ...") + transcript → do NOT rewrite prompts,
  only align each prompt number to a start time and add overlays/code scenes.
If unclear which case, check whether the user attached/mentioned a prompts file.

## Output folder
`<folder of X.json>/<X>_video/` containing:
- `scenes.tsv` (source, written by Claude)
- `prompts_numbered.txt` — "N. prompt", blank line between, for Flow batch
- `shotlist.json` — timings for Remotion (file N ↔ `NNN.png`)
- `REMOTION_BRIEF.md` — from `brief_template.md`

## Step 1 — read transcript compactly
```bash
python -c "import json;d=json.load(open(r'X.json',encoding='utf-8'));[print('%.1f %s'%(s['start'],s['text'].strip())) for s in d['segments']];print('END',d['segments'][-1]['end'])"
```

## Step 2 — write `scenes.tsv`
One line per shot: `start<TAB>scene<TAB>overlay`.
- ~1 shot per 2.5 s (10 min ≈ 230–250 shots; user's baseline is 200/10 min). No shot > 5.5 s; split long segments.
- Scene = concrete, literal visual of what is said at that moment; metaphors made visual (fist vs open hand, storm vs shore…).
  Establish 3–5 **recurring motifs** per video and call back to them (they become Remotion match-cuts).
- `{M}` = main character, `{W}` = woman. Optional location: `LOC: kitchen at night | scene...`, default is plain neutral background.
- No photo/film words (photorealistic, macro, film grain, oil painting) — style is flat vector cartoon.
- Overlay = 1–6 words only on key beats: concept names, researcher + year, section titles `LAW N · Title`, punchy quotes. Most shots empty.
- Case B: leave scene column empty; line count must equal number of existing prompts.

## Step 3 — build
```bash
python "%USERPROFILE%/.claude/skills/video-pipeline/build_shots.py" --transcript X.json --scenes OUT/scenes.tsv --out OUT [--prompts existing.txt]
```
Fix any `!!` warnings.

## Step 4 — REMOTION_BRIEF.md
Copy `brief_template.md`, fill `{{TITLE}} {{DURATION}} {{TRANSCRIPT}}`, and write `{{CODE_SCENES}}`:
40–50 numbered scenes (something code-driven every ~20–30 s; reuse templates like a "world sees vs he sees" split card) with timecodes that REPLACE images and do what stills can't —
animated infographics for studies/numbers, multiplying objects, camera moves into/out of a scene,
continuous transitions (storm→shore), particle effects on key motif, section progress indicator,
section title cards, recap. Each: timecode, what animates, SFX. Include CTA timings (intro at "Welcome back").

## Rules (from user feedback — do not break)
- Remotion must do real animation. Never a brief that is just Ken Burns + text over images.
- Text on screen must be readable: bold font + dark blurred pill (already in template).
- NO film grain, NO boil/wobble, NO sideways drift of images (reads as an earthquake). Ken Burns push-in only.
- 2K output, self-check stages (template has them).
- Prompt format exactly: `N. Flat vector cartoon style. LOCATION: ... SCENE: ... 16:9.` with blank line between.

## Step 5 — Claude builds the video itself (when asked: «сделай видео», «смонтируй», «сделай как в прошлый раз / круто»)
Read `build_video.md` (this folder). Two modes: **«как это видео»** = replicate the gray-car-2k look;
**«сделай круто»** = same quality bar, NEW design language for this topic. Waiting for the render costs no tokens.

## Final reply to user (Russian, short)
Number of shots, the files and which one goes where (prompts → Flow, shotlist + brief → Z.AI), 1–2 risks.
Offer to build the video itself (Step 5) — the user loved the 2026-09-27 build.
