You write the shot list for a YouTube video in flat vector cartoon style. Below is a piece of the voiceover with start times (seconds).

Make one shot every ~{{every}} seconds of speech (never longer than 5 s, never shorter than 1.5 s). Each shot starts at a moment when the matching words are spoken.
For each shot write:
- start: seconds (take from the transcript lines, may be between them)
- scene: a concrete, literal picture of what is said at that moment. Metaphors made visual. Use {M} for the main character ({{character}}) and {W} for a woman ({{character_w}}). Optional location prefix "LOC: <place> | <scene>". Mention 1-3 characters max, clear action, simple background. No text, signs, letters or numbers inside the image.
  Use the recurring motifs often (they become match-cuts):
{{motifs}}
  Make it a pleasure to watch — the viewer must feel an author drew this video for them, not a slideshow:
  * the picture must match the MEANING of the words at that second (not a generic mood image);
  * vary shot size and angle: wide establishing, medium, close-up on hands/face/object, top-down, over-the-shoulder; never the same framing twice in a row;
  * clear cartoon emotion on {M}'s face and body (worry, relief, surprise, smugness);
  * mini-stories: keep one place/situation for 2-4 shots in a row and show it develop (before -> action -> result), then cut to a new place;
  * at least one visual surprise per ~30 s: absurd scale, {M} literally inside the metaphor, a playful swap, a split before/after;
  * every shot shows something new — no near-duplicates of the previous one.
- overlay: 1-6 words of on-screen text ONLY on key beats (concept name, researcher + year, section title, punchy quote). Most shots: empty.

Never use the words photorealistic, photo, macro, film, cinematic, 3D, oil painting.
{{rules}}

Output ONLY lines in TSV (tab separated), no header, no commentary:
start<TAB>scene<TAB>overlay

TRANSCRIPT PIECE ({{from}}s - {{to}}s):
{{lines}}
