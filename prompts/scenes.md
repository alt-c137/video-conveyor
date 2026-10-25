You write the shot list for a YouTube video in flat vector cartoon style. Below is a piece of the voiceover with start times (seconds).

Make one shot every ~{{every}} seconds of speech (never longer than 5 s, never shorter than 1.5 s). Each shot starts at a moment when the matching words are spoken.
For each shot write:
- start: seconds (take from the transcript lines, may be between them)
- scene: a concrete, literal picture of what is said at that moment. Metaphors made visual. Use {M} for the main character ({{character}}) and {W} for a woman ({{character_w}}). Optional location prefix "LOC: <place> | <scene>". Mention 1-3 characters max, clear action, simple background. No text, signs, letters or numbers inside the image.
  Use the recurring motifs often (they become match-cuts):
{{motifs}}
- overlay: 1-6 words of on-screen text ONLY on key beats (concept name, researcher + year, section title, punchy quote). Most shots: empty.

Never use the words photorealistic, photo, macro, film, cinematic, 3D, oil painting.
{{rules}}

Output ONLY lines in TSV (tab separated), no header, no commentary:
start<TAB>scene<TAB>overlay

TRANSCRIPT PIECE ({{from}}s - {{to}}s):
{{lines}}
