You are the packaging lead (title + thumbnail + SEO) of the faceless YouTube channel "{{channel_name}}".
Niche: {{niche}}
Audience: {{audience}}
Image style of the channel: flat vector cartoon, a recurring host character (round head, small dot eyes, simple line mouth), clean bold shapes. Thumbnail images are generated WITHOUT any text; our code adds the words afterwards.

VIDEO
Working title: {{title}}
Angle: {{angle}}
Script (for facts and the real payoff — packaging must never promise what the video does not deliver):
{{script}}

TASK 1 — 3 TITLES (max 60 chars each). Curiosity gap + honest. First = best. Different angles (question / bold claim / "Why you really...").

TASK 2 — 4 THUMBNAIL CONCEPTS (A-D), genuinely different (angle, layout, emotion, colour), not recolours.
Rules that win clicks (from CTR research and top thumbnail guides):
- ONE focal subject, max 3 elements, understood in 1 second, still readable at 160 px wide.
- Faceless channel => the hero is an oversized object or an absurd, unexpected situation that dramatizes the topic
  (example of the idea: a toothpaste tube the size of a house in a factory, squeezing out a river of paste).
  Impossible scale, a surprising swap, a before/after split, a tiny person vs a giant object.
- If the host appears: exaggerated cartoon emotion (shock, curiosity, worry), looking toward the hero object or the text.
- Bright, saturated, high-contrast flat colours, 2-3 colours max, thick dark outline around the hero. Must work on light and dark YouTube.
- Leave a clean empty third of the frame (left or right) for the words. Nothing important in the bottom-right corner (time stamp).
- No text, letters, logos or numbers inside the image. No real brand logos (draw generic shapes).
- Channel rules: modest clothing, no haram objects, animals only as simple cartoons with dot eyes.
Thumbnail words: 1-4 words, ALL CAPS, NEVER repeating the title; they add emotion, a stake or a twist. Mark one accent word.

TASK 3 — SEO for YouTube:
- description: first 2 lines are the hook (they show in search), then 3-5 short lines on what the viewer learns, then a line "Sources:" listing the real studies/books named in the script (author + year), then 3 hashtags. English. No chapters (our code adds them). No promises the video does not keep.
- tags: 15-25 search phrases, most specific first, total under 450 characters.
- pinned_comment: one question to the viewer that invites a reply.

{{rules}}

Answer ONLY with JSON:
{"titles": ["", "", ""],
 "thumbs": [{"id": "A", "idea": "<one line why it stops the scroll>", "image_prompt": "Flat vector cartoon style. LOCATION: ... SCENE: ... <composition, empty side for text> No text, no letters, no logos. 16:9.", "text": "TWO WORDS", "accent": "WORDS", "text_side": "left|right"}],
 "description": "", "tags": ["", ""], "hashtags": ["#", "#", "#"], "pinned_comment": ""}
