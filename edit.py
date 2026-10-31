"""Монтаж: собирает edit.json для движка (engine/) и рендерит видео.

ИИ выбирает код-сцены из каталога (prompts/edit.md) по таймингам голоса. Всё остальное
(картинки с наездом, подписи, разделы, подписка, концовка, звуки) раскладывается кодом.
"""
import glob, json, os, re, shutil
import core
from core import llm, prompt, rj, wj, rt

ENGINE = os.path.join(core.ROOT, "engine")
TYPES = {"clip", "question", "quote", "words", "big_number", "list", "recap", "myth_fact", "study", "split", "cards", "bars",
         "dots", "scale", "iceberg", "meter", "curve", "steps", "loop", "battery", "clock", "spotlight", "thought", "pile",
         "lineup", "drive", "timeline", "race", "morph", "sketch", "donut", "lines", "network", "funnel",
         "assemble", "map", "doc", "phone", "bubbles", "stage"}
DEFAULT_THEME = {"paper": "#EFEAE0", "ink": "#24272C", "a1": "#2F6F6B", "a2": "#D39B45", "a3": "#B8C9C1", "dark": "#1E2124"}
HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")


def norm(w):
    return re.sub(r"[^a-z0-9']", "", w.lower())


def all_words(tr):
    out = []
    for s in tr["segments"]:
        for w in s.get("words", []):
            out.append({"w": w["word"].strip(), "t": round(w["start"], 2), "e": round(w["end"], 2), "n": norm(w["word"])})
    return out


def find_phrase(words, text, after=0.0):
    """Время начала фразы (первые слова text) в транскрипте после after."""
    key = [norm(x) for x in text.split()[:6] if norm(x)]
    if not key:
        return None
    best, bt = 0, None
    for i, w in enumerate(words):
        if w["t"] < after:
            continue
        k = sum(1 for j, kw in enumerate(key) if i + j < len(words) and words[i + j]["n"] == kw)
        if k > best:
            best, bt = k, w["t"]
            if k == len(key):
                break
    return bt if best >= max(2, len(key) // 2) else None


def link_public(p, log):
    pub = p.f("public")
    os.makedirs(os.path.join(pub, "img"), exist_ok=True)
    os.makedirs(os.path.join(pub, "sfx"), exist_ok=True)

    def ln(src, dst):
        if os.path.exists(dst):
            os.remove(dst)
        try:
            os.link(src, dst)
        except OSError:
            shutil.copy2(src, dst)
    # голос громче на voice_gain_db (пользователь в CapCut поднимал до +4.8), лимитер от клиппинга
    gain = core.config().get("voice_gain_db", 4.8)
    vo = os.path.join(pub, "voice.mp3")
    if os.path.exists(vo):
        os.remove(vo)
    core.run(["ffmpeg", "-y", "-loglevel", "error", "-i", p.f("voice.mp3"), "-af",
              f"volume={gain}dB,alimiter=limit=0.95:level=false", "-c:a", "libmp3lame", "-b:a", "256k", vo], log=log)
    for f in glob.glob(os.path.join(ENGINE, "sfx", "*.wav")):
        ln(f, os.path.join(pub, "sfx", os.path.basename(f)))
    have = {}
    for d in ("images", "images_2x"):  # 2x перекрывает исходники
        for f in glob.glob(p.f(d, "*.*")):
            n = os.path.splitext(os.path.basename(f))[0]
            if n.isdigit():
                have[int(n)] = f
    for n, f in have.items():
        ln(f, os.path.join(pub, "img", f"{n}{os.path.splitext(f)[1].lower()}"))
    if glob.glob(p.f("layers", "*.*")):
        os.makedirs(os.path.join(pub, "layers"), exist_ok=True)
        for f in glob.glob(p.f("layers", "*.*")):
            ln(f, os.path.join(pub, "layers", os.path.basename(f)))
    clips = glob.glob(p.f("clips", "*.mp4"))  # вставки из HyperFrames: <проект>/clips/*.mp4 → сцена type "clip"
    if clips:
        os.makedirs(os.path.join(pub, "clips"), exist_ok=True)
        for f in clips:
            ln(f, os.path.join(pub, "clips", os.path.basename(f)))
    log(f"public: голос, {len(have)} картинок, {len(clips)} вставок, звуки")
    return {n: f"img/{n}{os.path.splitext(f)[1].lower()}" for n, f in have.items()}


# атмосфера поверх картинки по смыслу кадра (Images.tsx): чтобы кадр жил, а не стоял слайдом; порядок = приоритет
AMBIENT = (("snow", r"\b(snow\w*|blizzard|igloo|arctic|tundra|ice age|frost\w*|snowfall)\b"),
           ("rain", r"\b(rain\w*|downpour|monsoon|thunderstorm)\b"),
           ("embers", r"\b(fire|fires|fireplace|hearth|campfire|bonfire|forge|furnace|stove|embers?|torch\w*|flames?|burning)\b"),
           ("fog", r"\b(fog\w*|mist\w*|smoke|smoky|smog)\b"),
           ("dust", r"\b(desert|dust\w*|sandy|sandstorm|mine|attic|barn|workshop|factory|mill|dungeon|cellar)\b"))


def ambient(prompt):
    scene = (prompt or "").split("SCENE:")[-1].lower()
    return next((k for k, rx in AMBIENT if re.search(rx, scene)), None)


def build_shots(shots, have):
    """Картинки по кадрам; нет картинки — тянем предыдущую (или следующую в начале)."""
    out = []
    for s in shots:
        src = have.get(s["id"])
        if src:
            fx = ambient(s.get("prompt"))
            out.append({"id": s["id"], "start": s["start"], "end": s["end"], "src": src, **({"cam": s["cam"]} if s.get("cam") else {}), **({"fx": fx} if fx else {})})
        elif out:
            out[-1]["end"] = s["end"]
        else:
            out.append({"id": s["id"], "start": s["start"], "end": s["end"], "src": None})
    if out and out[0]["src"] is None and len(out) > 1:
        out[1]["start"] = out[0]["start"]
        out.pop(0)
    return out


TRANS = (("fade", 34), ("zoom", 22), ("whip", 14), ("mosaic", 10), ("flip", 8), ("iris", 7), ("wipe", 5))


AMB_SOUND = {"snow": "amb_wind", "fog": "amb_wind", "rain": "amb_rain", "embers": "amb_fire", "dust": "amb_dust"}


def plan_shots(p, shots, scenes, secs, sfx, log=print):
    """Режиссура кадров: слои, фокус, переходы, отрисовка, выход персонажа. Детерминированно по номеру кадра, звук к переходам."""
    lay = rj(p.f("layers.json"), {})
    last_tr, since_draw, since_pop, n_draw = None, 99, 99, 0
    marks = [x["start"] for x in secs]
    for s in shots:
        l, n = lay.get(str(s["id"])), s["id"]
        if not l or not s.get("src"):
            continue
        s["focus"], s["line"] = l["focus"], f"layers/{n}_line.webp"
        if not l.get("flat"):
            s["fg"], s["bg"] = f"layers/{n}_fg.webp", f"layers/{n}_bg.jpg"
        hidden = any(sc["start"] - 0.5 <= s["start"] < sc["end"] for sc in scenes)
        h = (n * 2654435761) % 4294967296
        since_draw, since_pop = since_draw + 1, since_pop + 1
        dur = s["end"] - s["start"]
        opens = any(abs(s["start"] - m) < 4 for m in marks)
        if dur >= 3.0 and since_draw >= 5 and (opens or h % 5 < 2):
            s["draw"], since_draw = True, 0
            n_draw += 1
            sfx.append({"t": s["start"] - 0.1, "name": "swish", "vol": 0.16})
            continue
        if s.get("fg") and since_pop >= 2 and h % 3 == 0:
            s["pop"], since_pop = True, 0
        if hidden or dur < 2:
            continue  # переход не виден или кадр слишком короткий
        opts = [(k, w) for k, w in TRANS if k != last_tr or k == "fade"]
        r = h % sum(w for _, w in opts)
        kind = next(k for k, w in opts if (r := r - w) < 0)
        s["tr"], last_tr = kind, kind
        if kind in ("zoom", "whip", "flip", "mosaic"):
            sfx.append({"t": s["start"] - 0.22, "name": "swish" if kind != "zoom" else "whoosh", "vol": 0.2})
    run = None  # атмосфера под голосом: соседние кадры с одной погодой — одна петля
    for s in shots + [{"start": 1e9, "end": 1e9}]:
        name = AMB_SOUND.get(s.get("fx"))
        if run and (name != run[0] or s["start"] - run[2] > 1):
            if run[2] - run[1] >= 3:
                sfx.append({"t": round(run[1], 2), "name": run[0], "vol": 0.1, "dur": round(run[2] - run[1], 2)})
            run = None
        if name:
            run = [name, run[1] if run else s["start"], s["end"]]
    log(f"Режиссура: слоёв {sum(1 for x in shots if x.get('fg'))} из {len(shots)}, отрисовок {n_draw}, "
        f"выходов {sum(1 for x in shots if x.get('pop'))}, переходов {sum(1 for x in shots if x.get('tr'))}")


def missing_ranges(shots, have):
    rng, cur = [], None
    for s in shots:
        if s["id"] not in have:
            cur = [cur[0], s["end"]] if cur else [s["start"], s["end"]]
        elif cur:
            rng.append(cur)
            cur = None
    if cur:
        rng.append(cur)
    return [r for r in rng if r[1] - r[0] > 2]


def captions(shots, words):
    caps = []
    for s in shots:
        ov = (s.get("overlay") or "").strip()
        if not ov:
            continue
        end = max(s["end"], s["start"] + 1.8)
        ws = [w for w in words if s["start"] - 0.3 <= w["t"] < end + 1.5]
        cw, j = [], 0
        for tok in ov.split():
            t = None
            for k in range(j, len(ws)):
                if ws[k]["n"] and ws[k]["n"] == norm(tok):
                    t, j = ws[k]["t"], k + 1
                    break
            cw.append({"w": tok, "t": t, "e": 0})
        base = s["start"] + 0.05
        for i, w in enumerate(cw):  # слов нет в речи (название, год) — равномерно
            if w["t"] is None or w["t"] > end:
                w["t"] = round(base + i * 0.16, 2)
        title = bool(re.match(r"^(part|law|step|rule|myth|fact)\b", ov, re.I)) or ov.isupper()
        caps.append({"start": s["start"], "end": end, "text": ov, "words": cw, "kind": "title" if title else "phrase"})
    for a, b in zip(caps, caps[1:]):
        a["end"] = min(a["end"], b["start"] - 0.05)
    return caps


def sections(p, words):
    d = rj(p.f("sections.json"))
    out, after = [], 0.0
    for i, s in enumerate(d["sections"]):
        t = find_phrase(words, s["text"], after) if i else 0.0
        if t is None:
            continue
        out.append({"n": len(out) + 1, "start": t, "title": s["name"]})
        after = t + 1
    return out


def lines_for(tr, lo, hi):
    return "\n".join(f"{s['start']:.1f}-{s['end']:.1f} {s['text'].strip()}" for s in tr["segments"] if lo <= s["start"] < hi)


def words_for(words, lo, hi):
    return " ".join(f"{w['w']}@{w['t']:.1f}" for w in words if lo <= w["t"] < hi)


def ask_scenes(p, tr, words, secs, miss, log):
    dur = tr["segments"][-1]["end"]
    every = core.config().get("code_scene_every_sec", 18)
    sec_txt = ", ".join(f"{s['start']:.1f}s {s['title']}" for s in secs)
    pieces, lo = [], 0.0
    while lo < dur:
        hi = min(dur + 1, lo + 240)
        if dur - hi < 60:
            hi = dur + 1
        pieces.append((lo, hi))
        lo = hi
    os.makedirs(p.f("edit_parts"), exist_ok=True)
    scenes, theme = [], None
    for i, (lo, hi) in enumerate(pieces, 1):
        fn = p.f("edit_parts", f"{i:02d}.json")
        if not os.path.exists(fn):
            first = i == 1
            shape = ('{"theme": {"paper": "#hex", "ink": "#hex", "a1": "#hex", "a2": "#hex", "a3": "#hex", "dark": "#hex"}, '
                     '"scenes": [{"type": "", "start": 0.0, "end": 0.0, "cues": [], "props": {}}]}') if first else \
                '{"scenes": [{"type": "", "start": 0.0, "end": 0.0, "cues": [], "props": {}}]}'
            treq = ("Also choose a THEME: 6 colours that suit this topic and sit well next to flat cartoon images "
                    "(paper = light warm background, ink = near-black, a1/a2 = two strong accents, a3 = soft tint, dark = deep background).") if first else ""
            mr = ", ".join(f"{a:.0f}-{b:.0f}s" for a, b in miss if a < hi and b > lo) or "none"
            out = llm(prompt("edit", every=str(every), count=str(max(2, round((hi - lo) / every))), sections=sec_txt,
                             missing=mr, theme_req=treq, answer_shape=shape, lines=lines_for(tr, lo, hi),
                             words=words_for(words, lo, hi), **{"from": f"{lo:.0f}", "to": f"{hi:.0f}"}),
                      stage="edit", log=log)
            wj(fn, core.extract_json(out))
            log(f"Монтаж: кусок {i}/{len(pieces)}")
        d = rj(fn)
        theme = theme or d.get("theme")
        scenes += d.get("scenes", [])
    return scenes, theme


def clean_scenes(scenes, secs, dur):
    out = []
    for s in sorted(scenes, key=lambda x: float(x.get("start", 0))):
        try:
            a, b = float(s["start"]), float(s["end"])
        except (KeyError, TypeError, ValueError):
            continue
        if s.get("type") not in TYPES or not isinstance(s.get("props"), dict):
            continue
        a = max(a, 0.5)
        b = min(b, dur - 0.2, a + 12)
        if b - a < 2.5:
            continue
        if any(sc["start"] - 0.2 <= a < sc["start"] + 3.2 for sc in secs if sc["n"] > 1):
            a2 = next(sc["start"] + 3.2 for sc in secs if sc["start"] - 0.2 <= a < sc["start"] + 3.2)
            if b - a2 < 2.5:
                continue
            a = a2
        if out and a < out[-1]["end"] + 1.5:
            continue
        cues = [float(c) for c in s.get("cues") or [] if isinstance(c, (int, float))]
        out.append({"type": s["type"], "start": round(a, 2), "end": round(b, 2), "props": s["props"], "cues": cues})
    # карточки разделов (кроме первого — там крючок)
    cards = []
    for sc in secs[1:]:
        st = sc["start"] - 0.15
        if any(x["start"] < st + 2.8 and x["end"] > st for x in out):
            continue
        cards.append({"type": "title_card", "start": round(st, 2), "end": round(st + 2.8, 2),
                      "props": {"n": sc["n"] - 1, "title": sc["title"], "fx": title_fx(sc["title"], sc["n"])}, "cues": []})
    return sorted(out + cards, key=lambda x: x["start"])


CARD_FX = (("blizzard", r"snow|ice|winter|frozen|arctic|freez|cold"), ("campfire", r"fire|stove|hearth|heat|warm|burn|hot\\b|flame"),
           ("storm", r"storm|war|fight|crash|collapse|disaster"), ("rain", r"rain|flood|sea|ship|ocean|river|water"),
           ("rays", r"desert|sun|light|truth|reveal|answer"), ("fog", r"fog|plague|hidden|secret|silent|unseen|shadow"))
CARD_LOOP = ("fireflies", "rays", "clouds", "aurora", "leaves")


def title_fx(title, n):
    """Живой пиксельный фон карточки раздела: по смыслу названия, иначе по кругу."""
    low = title.lower()
    return next((k for k, rx in CARD_FX if re.search(rx, low)), CARD_LOOP[n % len(CARD_LOOP)])


def sfx_for(scenes, cta):
    fx = []
    for s in scenes:
        if s["type"] == "title_card":
            fx += [{"t": s["start"] - 0.3, "name": "riser", "vol": 0.18}, {"t": s["start"] + 0.15, "name": "thud", "vol": 0.3}]
            continue
        fx.append({"t": s["start"], "name": "whoosh", "vol": 0.22})
        for c in s.get("cues", [])[:6]:
            fx.append({"t": c, "name": "pop", "vol": 0.16})
        if s["type"] == "study" and len(s.get("cues", [])) >= 3:
            fx.append({"t": s["cues"][2] + 0.4, "name": "stamp", "vol": 0.3})
        if s["type"] == "assemble":
            fx.append({"t": s["start"] + 0.2, "name": "riser", "vol": 0.14})
            fx.append({"t": s["start"] + 1.9, "name": "thud", "vol": 0.26})
        if s["type"] in ("morph", "doc") and s.get("cues"):
            fx.append({"t": s["cues"][0], "name": "swish", "vol": 0.2})
        if s["type"] == "map":
            fx.append({"t": s["start"] + 0.1, "name": "whirr", "vol": 0.12})
        if s["type"] == "big_number":
            fx.append({"t": s["start"] + 0.2, "name": "tick", "vol": 0.15})
        if s["type"] == "myth_fact" and len(s.get("cues", [])) >= 2:
            fx.append({"t": s["cues"][1] - 0.5, "name": "peel", "vol": 0.2})
    for at in (cta["intro"], cta["outro"]):
        if at:
            fx += [{"t": at + 1.4, "name": "click", "vol": 0.4}, {"t": at + 2.6, "name": "click", "vol": 0.4},
                   {"t": at + 3.7, "name": "click", "vol": 0.4}, {"t": at + 3.75, "name": "chime", "vol": 0.25}]
    return [f for f in fx if f["t"] >= 0]


def cta_times(words, dur):
    intro = next((w["t"] for w in words if w["t"] < 90 and w["n"] in ("subscribe", "welcome")), 0) or 0
    outro = next((w["t"] for w in reversed(words) if w["t"] > dur - 90 and w["n"] == "subscribe"), 0) or 0
    if outro and outro - intro < 60:
        outro = 0
    return {"intro": round(intro, 2), "outro": round(outro, 2)}


def make_edit(p, log=print):
    tr = rj(p.f("transcript.json"))
    words = all_words(tr)
    dur = float(p.state.get("duration") or tr["segments"][-1]["end"])
    shots = rj(p.f("shotlist.json"))
    import layers
    layers.run(p.path, log=log)
    have = link_public(p, log)
    miss = missing_ranges(shots, have)
    secs = sections(p, words)
    raw, theme = ask_scenes(p, tr, words, secs, miss, log)
    scenes = clean_scenes(raw, secs, dur)
    # ручные/авторские сцены (HyperFrames-вставки и т.п.): edit_extra.json = [{"type","start","end","props"}]
    # они главнее: автосцены, которые с ними пересекаются, убираются
    extra = [s for s in rj(p.f("edit_extra.json"), []) if s.get("type") in TYPES and s.get("end", 0) > s.get("start", 0)]
    if extra:
        scenes = [s for s in scenes if not any(s["start"] < x["end"] + 0.5 and x["start"] < s["end"] + 0.5 for x in extra)]
        scenes = sorted(scenes + extra, key=lambda s: s["start"])
        log(f"edit_extra.json: {len(extra)} авторских сцен")
    th = dict(DEFAULT_THEME)
    for k, v in (theme or {}).items():
        if k in th and isinstance(v, str) and HEX.match(v):
            th[k] = v
    cta = cta_times(words, dur)
    caps = captions(shots, [w for w in words])
    edit = {"fps": 30, "duration": round(dur, 2), "title": p.state.get("title", ""), "channel": p.channel.get("name", ""),
            "theme": th, "voice": "voice.mp3", "shots": build_shots(shots, have), "captions": caps,
            "sections": secs, "scenes": scenes, "sfx": sfx_for(scenes, cta), "cta": cta, "endSeconds": 20}
    plan_shots(p, edit["shots"], scenes, secs, edit["sfx"], log)
    edit["sfx"].sort(key=lambda x: x["t"])
    wj(p.f("edit.json"), edit)
    used = {}
    for s in scenes:
        used[s["type"]] = used.get(s["type"], 0) + 1
    log(f"edit.json: {len(scenes)} код-сцен ({len(used)} типов), {len(caps)} подписей, {len(secs)} разделов, "
        f"нет картинок: {len(shots) - len(have)}")
    stills(p, log)


def node(args, log):
    # кадры рендера (~10+ ГБ на 15 мин 2K) идут во временную папку: на C: места мало -> config render.tmp
    env, tmp = None, core.config().get("render", {}).get("tmp")
    if tmp:
        os.makedirs(tmp, exist_ok=True)
        env = dict(os.environ, TEMP=tmp, TMP=tmp)
    return core.run(["node", os.path.join(ENGINE, "render.mjs")] + args, log=log, cwd=ENGINE, env=env)


def stills(p, log, secs=None):
    """Контрольный лист: по стоп-кадру из каждой код-сцены + пара картинок с подписями."""
    e = rj(p.f("edit.json"))
    secs = secs or sorted({round((s["start"] + s["end"]) / 2 + 0.6, 1) for s in e["scenes"]})
    node([p.path, "--stills"] + [str(s) for s in secs], log)
    try:
        from PIL import Image
        # render.mjs пишет имя через JS Number: 269.0 -> "s_269.jpg"
        ims = [Image.open(p.f("out", "check", f"s_{s:g}.jpg")) for s in secs]
        w, h = 640, 360
        cols = 4
        sheet = Image.new("RGB", (cols * w, ((len(ims) + cols - 1) // cols) * h), "white")
        for i, im in enumerate(ims):
            sheet.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
        sheet.save(p.f("out", "check_sheet.jpg"), quality=82)
        log(f"Контрольный лист: out/check_sheet.jpg ({len(ims)} кадров)")
    except Exception as ex:  # PIL не обязателен
        log(f"лист не собран: {ex}")


def render(p, log=print):
    if not os.path.exists(p.f("edit.json")):
        make_edit(p, log)
    link_public(p, log)
    log("Рендер на видеокарте (gl=angle). Прогресс: out/render_log.txt")
    node([p.path], log)
    log(f"Готово: {p.f('out', 'final.mp4')}")
    check_images(p, log)


def check_images(p, log=print, n=12):
    """После рендера: кадры посреди КАРТИНОК (не код-сцен) -> out/check_images.jpg; почти чёрные = тревога.
    Урок 2026-10-27: апскейл дал чёрные кадры, лист код-сцен этого не видел, ролик ушёл на чёрном фоне."""
    import subprocess
    from PIL import Image, ImageStat
    e = rj(p.f("edit.json"))
    busy = [(s["start"] - 0.5, s["end"] + 0.5) for s in e["scenes"]]
    mids = [round((s["start"] + s["end"]) / 2, 2) for s in e["shots"]
            if s.get("src") and not any(a <= (s["start"] + s["end"]) / 2 <= b for a, b in busy)]
    pick = [mids[i * len(mids) // n] for i in range(n)] if len(mids) >= n else mids
    out_dir = p.f("out", "check")
    os.makedirs(out_dir, exist_ok=True)
    ims, dark = [], []
    for t in pick:
        f = os.path.join(out_dir, f"img_{t:g}.jpg")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", p.f("out", "final.mp4"), "-frames:v", "1",
                        "-vf", "scale=640:-1", f], check=False)
        if not os.path.exists(f):
            continue
        im = Image.open(f).convert("RGB")
        ims.append(im)
        if ImageStat.Stat(im.convert("L")).mean[0] < 12:
            dark.append(t)
    if ims:
        sheet = Image.new("RGB", (4 * 640, ((len(ims) + 3) // 4) * 360), "white")
        for i, im in enumerate(ims):
            sheet.paste(im.resize((640, 360)), ((i % 4) * 640, (i // 4) * 360))
        sheet.save(p.f("out", "check_images.jpg"), quality=82)
    if not ims:
        # ни одного кадра с картинкой — значит в edit.json нет картинок (Logic 03, 2026-10-29), а не «всё хорошо»
        log("ВНИМАНИЕ: в ролике нет ни одной картинки (edit.json shots без src) — проверь shotlist/edit, не отдавай ролик")
        return [-1]
    if dark:
        log(f"ВНИМАНИЕ: чёрные кадры на месте картинок ({len(dark)} из {len(ims)}): {dark} — проверь images_2x")
    else:
        log(f"Картинки в ролике видны: out/check_images.jpg ({len(ims)} кадров)")
    return dark
