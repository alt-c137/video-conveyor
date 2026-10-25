# Remotion brief — "{{TITLE}}" ({{DURATION}}, 2560x1440, 30fps)

Remotion's job is ANIMATION that stills can't do: code-drawn scenes, infographics, parallax, morphs,
recurring animated motifs, CTA. Not just zoom on pictures.

## Inputs
- `voice.mp3`, `{{TRANSCRIPT}}` (Whisper; `segments[].words[]` has per-word timestamps)
- `shotlist.json` — `{id, file, start, end, duration, motion, overlay, prompt}`, images `images/001.png…` (flat vector cartoon)
- Shots whose time range is covered by a CODE SCENE are NOT shown — the code scene replaces them.

## Format & encoding
- 2560x1440, 30fps. `const S = 2560/1920`; multiply every px value in this brief by `S`.
- Images `objectFit: cover`, never upscale beyond 1.15x.
- Render: `npx remotion render Video out/final.mp4 --codec h264 --crf 20 --x264-preset slow --audio-bitrate 192k --pixel-format yuv420p`

## Global style
Flat vector, palette: charcoal `#2E3136`, beige `#E9DFCF`, muted teal `#4F7C7A`, amber `#D9A45B`, off-white `#F4EFE6`.
Code-drawn characters = round head + dot eyes + line mouth + simple body; reusable SVG `<Character pose expression/>`.
Motion via `spring({damping: 200})` or `Easing.bezier(0.33,0,0.2,1)`. Nothing linear.

## Base layer for image shots
- Camera on stills: smooth, eased, varied — push-in, pull-out, pan left/right, tilt up/down, push+pan (scale ≤1.08, pan ≤6% of frame per shot). Never reverse direction on the next shot (reads as an earthquake), short shots (<2 s) push/pull only. Break it up with code animations every ~15-20 s. NO boil/wobble, NO jitter, NO grain.
- 4-frame crossfade between shots; occasional themed wipe on a new thought; dip to black before section title cards.

## On-screen text (the `overlay` field)
- `Montserrat` 800, 64px, `#F4EFE6`; key word amber `#D9A45B`.
- Backing pill `rgba(20,22,26,0.72)` + `backdropFilter: blur(10px)`, padding 14/28, radius 18, `text-shadow: 0 3px 14px rgba(0,0,0,.85)`.
- Bottom third (y ≈ 78%), never over a face. Max 6 words.
- Word-by-word pop synced to word timestamps (scale .85→1, 6-frame spring).

## Subscribe + Like CTA — `<SubscribeCTA variant="intro"|"outro"/>`
**Intro** at the "Welcome back" moment (after the hook, NOT at 0:00), lower-right, ≤5.5s:
Character slides up and waves → glass pill card (avatar, red SUBSCRIBE, 👍, 🔔, amber 2px border) → animated cursor clicks LIKE (bounce, amber, particle burst, pop SFX) → clicks SUBSCRIBE (squish, grey, morph to `SUBSCRIBED ✓`, click SFX) → bell wiggles ±18° ×3 (ding) → slides away.
**Outro**: on "share with someone" a paper plane flies off; on "subscribe" a big centered card (1.6x) with the same clicks, amber rays, confetti of the video's motif; then 20s end screen: blurred bg, Character on the left, two 16:9 placeholders + round subscribe placeholder on the right (real elements added in YouTube Studio), music only.

## Section title cards
The section's key object assembles from flat shapes, then the title writes on. 3s, whoosh SFX.
Persistent small progress indicator of sections (e.g. "6 laws") top-right, current one lit.

## CODE SCENES (video-specific)
{{CODE_SCENES}}

## Audio
Music ducked −4 dB under speech (timings from transcript), swell on title cards and the last 30s. SFX as listed in scenes.

## Self-check at every stage (mandatory)
1. After each scene: `npx remotion still Video out/check/<scene>_<frame>.png --frame=<N>` for start/middle/end.
2. OPEN and LOOK at the PNGs: text readable, nothing clipped, faces not covered, palette correct, no empty frames.
3. Render the scene clip (`--frames=a-b`), check timing against word timestamps.
4. Fix → re-check → next scene. One line per scene in `out/check/log.md`.
5. Build first: the opening scene, the key-motif scene and the CTA — show them before the rest.
6. Before final: `ffprobe out/final.mp4` → 2560x1440, 30fps, correct duration, audio present.
