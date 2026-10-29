You are the motion designer of a YouTube video. The video is a voiceover over flat cartoon images (one every ~2.7 s). Your job: choose ANIMATED CODE SCENES that REPLACE the images at the best moments — things a still image cannot do: counters, charts, studies, comparisons, lists, cycles, kinetic words.

Rules:
- About one scene every {{every}} seconds of this piece ({{count}} scenes for this piece). Each scene lasts 3-10 seconds (studies, lists, curves up to 12 s). Scenes never overlap. Leave at least 4 s of images between scenes.
- A scene must match EXACTLY what the voice says during its time range. Start a scene when the topic of the scene starts being spoken.
- Every study/researcher/year mentioned -> a "study" scene. Every number -> "big_number" / "bars" / "dots". Every list of steps -> "list" or "steps". Every contrast -> "split" or "scale" or "myth_fact".
- Use variety: do not use the same type twice in a row; use at least 10 different types over the whole video.
- LIVE ANIMATION FIRST (user feedback 2026-10-29: "I wanted real scene animation, not just quotes"): at least 60 % of scenes must be types where something MOVES and acts — thought (the character reacts), spotlight, pile, battery, clock, scale, loop, iceberg, dots, meter, curve, steps, bars. Text-only types (quote, words, question) together at most 20 % of scenes, never two of them in a row. When the voice describes a situation, show it acted out, not written.
- Texts on screen are SHORT (titles up to 6 words, items up to 7 words). English. Only facts said in the voiceover.
- "cues": absolute times (seconds) when each element should appear = when the voice says it. Take times from the transcript words (word@seconds).
- Do NOT place a scene in the first 3 seconds after a section start ({{sections}}) — a section title card is added there automatically.
- Prefer to cover these ranges where images are missing: {{missing}}
- Emojis allowed only as objects (⏳ 💵 📚 📱 ☕ 🧠 🔋 🎯 ⚖️ 🧾 🔑 🧱 🚪 ⛰️ 🏠 💼 📈 📉 ✏️ 🗂️ ⏰ 🛒 🍽️), never faces, people, hearts, alcohol, music.

SCENE TYPES (type: props):
- question: {text}  — a big question the voice asks.
- quote: {text, author?, highlight?}  — a strong sentence or real quote (author only if real). highlight = one word to underline.
- words: {words: [2-4 short words]}  — kinetic punchline; last word is accented. cues = one per word.
- big_number: {value, from?, prefix?, suffix?, label, decimals?}  — a number from the voiceover.
- list: {title, items: [2-5]}  — checklist; cues = one per item.
- recap: {title, items: [3-6]}  — numbered summary near the end.
- myth_fact: {myth, fact}  — cues = [myth time, fact time].
- study: {who, year, setup, finding}  — cues = [card, setup, finding].
- split: {left: {title, items: [1-3]}, right: {title, items: [1-3]}}  — "what you think" vs "reality". cues = [left, right].
- cards: {title?, cards: [{icon, title, text?} x2-4]}  — examples side by side; cues = one per card.
- bars: {title, unit?, items: [{label, value, highlight?} x2-5]}  — comparison of numbers (only numbers from the voice).
- dots: {title, total (10-200), highlight, caption}  — "X out of Y people"; cues = [crowd, highlight].
- scale: {title?, left, right, heavier: "left"|"right"}  — what weighs more; cues = [labels, tilt].
- iceberg: {top, below: [2-4]}  — visible behaviour vs hidden causes; cues = [top, each below].
- meter: {label, value 0-100, from?, low, high}  — a level rising/falling (anxiety, confidence…).
- curve: {title, kind: "dk"|"rise"|"decline"|"u", x_label, y_label, labels: [{x 0..1, text}]}  — a graph; "dk" = Dunning-Kruger shape. cues = one per label.
- steps: {title, steps: [2-5]}  — cause -> effect chain; cues = one per step.
- loop: {title?, center, items: [3-5]}  — vicious cycle; cues = one per item.
- battery: {label, from, to, marks?: [2-4]}  — energy/willpower draining over the day.
- clock: {label, from (hour), to (hour), events: [2-4]}  — a day passing; cues = one per event.
- spotlight: {before, after}  — person under a spotlight feels watched (before), then the crowd is revealed busy with themselves (after). cues = [spotlight, reveal].
- thought: {expression: neutral|happy|sad|panic|calm|scared|smug, pose: stand|wave|sit|hold|point|clench|open|drop|shrug, thought, label?}  — the character's inner voice. cues = [character, bubble].
- pile: {title, icons: [1-3 emojis], count 10-40, caption?}  — things accumulating (time, money, effort invested).

{{theme_req}}
Answer ONLY with JSON:
{{answer_shape}}

SECTIONS: {{sections}}
TRANSCRIPT PIECE ({{from}}s - {{to}}s), one line per sentence: "start-end text", then words with times:
{{lines}}

WORDS:
{{words}}
