You are the motion designer of a YouTube video. The video is a voiceover over flat cartoon images (one every ~2.7 s). Your job: choose ANIMATED CODE SCENES that REPLACE the images at the best moments — things a still image cannot do: counters, charts, studies, comparisons, lists, cycles, kinetic words.

Rules:
- About one scene every {{every}} seconds of this piece ({{count}} scenes for this piece). Each scene lasts 3-10 seconds (studies, lists, curves up to 12 s). Scenes never overlap. Leave at least 4 s of images between scenes.
- A scene must match EXACTLY what the voice says during its time range. Start a scene when the topic of the scene starts being spoken.
- Every study/researcher/year mentioned -> a "study" scene. Every number -> "big_number" / "bars" / "dots". Every list of steps -> "list" or "steps". Every contrast -> "split" or "scale" or "myth_fact".
- Use variety: do not use the same type twice in a row; use at least 10 different types over the whole video.
- ANIMATION, NOT A SLIDESHOW OF QUOTES (user 2026-10-29): the viewer must see beautiful animation that fits the MEANING of the words — graphs, comparisons, things moving, growing, filling, tipping, accumulating, a character reacting. Quotes and text cards stay, but they are the seasoning, not the meal:
  * at least 60 % of scenes are picture types where something moves (bars, dots, curve, meter, scale, iceberg, loop, steps, battery, clock, pile, spotlight, thought, timeline, race, drive, lineup); text-card types (question, quote, words, myth_fact, list, cards, split) at most 30 %, never two in a row;
  * pick each scene ONLY because it shows what the voice says at that second. A type that does not fit the meaning is worse than a plain image. Never force one scene type everywhere: lineup only when the voice really introduces several kinds of people, drive/race only when the voice really talks about a car, a journey or paths compared, timeline only for real dates/history.
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
- lineup: {title?, people: [{label (1-3 words), color?, expression?, pose?, car? (colour name, if the topic is cars)} x2-6], highlight? (index)}  — N little people walk in one by one (the N types / kinds of people). cues = [title, each person].
- drive: {label?, color?, from?, to?, driver?: true, stop?: true}  — a car drives along a road left to right (a journey, years behind the wheel, "from A to B"). color = colour name (red, white, gray, silver, black, blue, beige...).
- timeline: {title?, events: [{year, text (2-5 words)}] x2-6}  — events light up left to right. cues = one per event.
- race: {title?, lanes: [{label, color?, speed 0.2-1}] x2-4, caption?}  — cars on parallel lanes at different speeds (which path/choice gets further). caption = the conclusion.

{{theme_req}}
Answer ONLY with JSON:
{{answer_shape}}

SECTIONS: {{sections}}
TRANSCRIPT PIECE ({{from}}s - {{to}}s), one line per sentence: "start-end text", then words with times:
{{lines}}

WORDS:
{{words}}
