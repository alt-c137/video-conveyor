---
name: video-conveyor
description: Operate and improve the user's local YouTube video conveyor (E:\Adobe\Видео ИИ редактор\conveyor) — channel analysis, topics, script, halal/fact check, Fish voice, Whisper, storyboard prompts, images (secretslider ZIP / Flow Batch Multi), Upscayl, Remotion edit with code animations, HyperFrames inserts, 2K render. Use when the user says «конвейер», «сделай видео/N видео», «анализ канала», «что с видео», «продолжи», or mentions projects/topics of the channels.
---

# Video conveyor — operator skill

1. `cd "E:\Adobe\Видео ИИ редактор\conveyor"` and read `AGENTS.md` (rules, where everything is).
2. `python stages.py status` → what each video is doing. Then `ai/STATUS.md`, `ai/LESSONS.md`.
3. Work in the loop of `ai/LOOP.md`: one task → small steps → check with your eyes → write STATUS/CHANGELOG/LESSONS → git commit.
4. Docs by topic: `docs/PIPELINE.md` (stages/commands), `docs/SCRIPT.md` (+ skill `youtube-script`),
   `docs/IMAGES.md`, `docs/MONTAGE.md` (+ skills `hyperframes*` for custom inserts — load `hyperframes` first),
   `docs/ANALYSIS.md`.
5. Reply to the user in Russian, short and warm: what is ready, where, what you need from them (1-2 items).

Never: kill user processes, delete old versions, print API keys, publish to YouTube, spend the user's image credits
without being asked, break the montage rules (Ken Burns push-in only, no drift/boil/grain).
