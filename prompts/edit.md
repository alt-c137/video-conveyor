You are the motion designer of a YouTube video. The video is a voiceover over flat cartoon images (one every ~2.7 s). Your job: choose ANIMATED CODE SCENES that REPLACE the images at the best moments — things a still image cannot do: counters, charts, studies, comparisons, lists, cycles, kinetic words.

Rules:
- About one scene every {{every}} seconds of this piece ({{count}} scenes for this piece). Each scene lasts 3-10 seconds (studies, lists, curves up to 12 s). Scenes never overlap. Leave at least 4 s of images between scenes.
- A scene must match EXACTLY what the voice says during its time range. Start a scene when the topic of the scene starts being spoken.
- Every study/researcher/year mentioned -> a "study" scene. Every number -> "big_number" / "bars" / "dots". Every list of steps -> "list" or "steps". Every contrast -> "split" or "scale" or "myth_fact".
- Use variety: do not use the same type twice in a row; use at least 10 different types over the whole video.
- ANIMATION, NOT A SLIDESHOW OF QUOTES (user 2026-10-29): the viewer must see beautiful animation that fits the MEANING of the words — graphs, comparisons, things moving, growing, filling, tipping, accumulating, a character reacting. Quotes and text cards stay, but they are the seasoning, not the meal:
  * at least 70 % of scenes are picture types where something moves (morph, lines, sketch, donut, map, stage, doc, phone, network, funnel, bubbles, assemble, bars, dots, curve, meter, scale, iceberg, loop, steps, battery, clock, pile, spotlight, thought, timeline, race, drive, lineup); text-card types (question, quote, words, myth_fact, list, cards, split) at most 20 %, never two in a row;
  * the film must feel made by a team of motion designers: in the first 60 seconds use a moving scene at least every 10 seconds; use at least 14 different types over the video; every section gets one "wow" scene (assemble, morph, map, stage, lines);
  * "stage" is the storytelling tool: whenever the voice tells a little scene with people (two brothers, a family in a blizzard, a person on a sofa) act it out with actors, an expression change (then) and falling props;
  * every named study -> "doc" or "study" (alternate them); every place or journey -> "map"; every share of a whole -> "donut" or sketch pie; every change over time -> "lines" or sketch line; only use numbers the voice says or that are stated in the sentence around it, never invent data points. For "lines" the points must follow numbers the voice says; if the voice only says the direction, use "curve" instead;
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

- morph: {from, to, label_from?, label_to?, title?, caption?} — one shape turns into another (idea becomes something). Shapes: circle, coin, square, triangle, star, burst, house, arrow_up, arrow_down, bolt, shield, drop, cloud, lock, key, flag, brain, check, cross, person, bar_chart. cues = [moment of the change].
- sketch: {kind: "bars"|"line"|"pie", title, items: [{label, value}] x2-7, unit?, caption?} — a hand-drawn chart draws itself; warm, human look. cues = one per item.
- donut: {title?, value 0-100, label, suffix?, caption?} — a big ring fills to a percentage. cues = [start].
- lines: {title, y_label?, x_labels?: [..], series: [{label, points: [numbers]}] x1-3, caption?} — glowing lines grow across the chart with their labels riding the tip. Best "beautiful graph".
- network: {title?, center, count 12-70, caption?} — from the centre links spread in waves: rumour, influence, an idea, a trade route, a chain of people.
- funnel: {title?, stages: [{label, value?}] x2-5, caption?} — a stream of particles falls through narrowing stages: who drops out at each step. cues = one per stage.
- assemble: {text (1-3 words), sub?} — thousands of particles swirl in and form the words. For the single biggest idea of a section, about 8 seconds. Max 3 per video.
- map: {title?, globe?: true, focus: [lon, lat], zoom 1-8, highlight?: ["Country name in English"...], arcs?: [{from: [lon,lat], to: [lon,lat], label?}], pins?: [{at: [lon,lat], label}], caption?} — the camera flies to a place, countries fill, routes draw, pins pop. Use real coordinates. cues = one per arc, then one per pin. Only for real places or journeys the voice names.
- doc: {kicker? (journal or source), title, lines: [3-5 short phrases, paraphrase of what the voice says], highlight (index of the key line), stamp? (1-2 words)} — a sheet of paper, a marker sweeps over the key line, camera pushes in. cues = [marker moment].
- phone: {title?, app?, items: [{text, from?: "me"|"them"}] x2-6, caption?} — a phone slides up, messages or reminders appear. For modern daily life. cues = one per item.
- bubbles: {title, items: [{label, value}] x2-5, unit?, caption?} — circles whose area is the value drop in, giant next to tiny. cues = one per item.
- stage: {color?: sky|mint|peach|lilac|sand|teal|night|dark, actors: [{x 0..1, pose, expression, then? (expression at the end), from?: left|right|bottom, label?, say? (under 6 words), scale?}] x1-3, items?: [{icon (allowed emoji), x 0..1, y 0..1, size?}], caption?} — a little animated scene: characters enter, react, objects fall in. Same pose and expression words as "thought". cues = one per actor, then one per item.

{{theme_req}}
Answer ONLY with JSON:
{{answer_shape}}

SECTIONS: {{sections}}
TRANSCRIPT PIECE ({{from}}s - {{to}}s), one line per sentence: "start-end text", then words with times:
{{lines}}

WORDS:
{{words}}
