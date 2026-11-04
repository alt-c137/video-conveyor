"""Сценарий монтажа (04.11.2026, просьба владельца): после голоса, транскрипта и раскадровки ИИ пишет, какие эффекты
и где играют ПОВЕРХ картинок, по смыслу фраз. Подробно: docs/MONTAGE.md, раздел «Сценарий монтажа».

python montage.py plan <проект>     -> montage.json (+ stickers_lines.txt: промты стикеров, идут в ту же задачу картинок
                                       ПОСЛЕ кадров, т.е. номера N+1..N+k, где N = число строк prompts_lines.txt)
python montage.py stickers <проект> -> public/stickers/<id>.png (вырезка rembg из images[_2x]/N+k или stickers/<id>.*)
python montage.py show <проект>     -> список эффектов по времени (проверка глазами)
В монтаже (edit.make_edit) resolve() превращает montage.json в edit.json -> "fx"; без montage.json fx = [] (старые ролики не меняются)."""
import glob, json, os, sys
import core

# Инструменты режиссёра (prompts/montage.md). Моменты = смысловые точки истории, у каждого свои слои.
TOOLS = {"sticker", "multiply", "text", "number", "mark", "lift", "focus", "grade", "camera", "bars", "split", "polaroid",
         "pause", "rewind", "glitch", "flash"}
SFX = {"sticker": "pop", "multiply": "pop", "number": "tick", "pause": "spot", "rewind": "whirr", "glitch": "beep",
       "flash": "swish", "polaroid": "click", "split": "swish", "lift": "whoosh"}
STICKER_TOOLS = ("sticker", "multiply", "split")


def _sticker_ids(layer):
    if layer.get("tool") == "split":
        return [layer.get("left"), layer.get("right")]
    return [layer.get("id")]


def _busy(p):
    out = []
    for f in sorted(glob.glob(p.f("edit_parts", "*.json"))):
        for s in core.rj(f).get("scenes", []):
            try:
                out.append((float(s["start"]), float(s["end"])))
            except (KeyError, TypeError, ValueError):
                pass
    return out


def plan(p, log=print, force=False):
    if os.path.exists(p.f("montage.json")) and not force:
        log("montage.json уже есть")
        return core.rj(p.f("montage.json"))
    ch = p.channel
    tr = core.rj(p.f("transcript.json"))
    shots = core.rj(p.f("shotlist.json"), [])
    lines = [l for l in core.rt(p.f("prompts_lines.txt")).split("\n") if l.strip()] if os.path.exists(p.f("prompts_lines.txt")) else []
    dur = tr["segments"][-1]["end"]
    busy = _busy(p)
    sh = []
    for i, s in enumerate(shots):
        txt = s.get("scene") or s.get("prompt") or (lines[i] if i < len(lines) else "")
        txt = txt.split("SCENE:")[-1].strip()[:110]
        sh.append(f"{float(s.get('start', 0)):.1f}: {txt}")
    trs = "\n".join(f"{s['start']:.1f}: {s['text'].strip()}" for s in tr["segments"])
    mins = dur / 60
    out = core.llm(core.prompt("montage", channel_name=ch["name"], max_stickers=str(min(18, max(6, round(mins)))),
                               character_rule=f"the host is {ch.get('character', 'a young man')}; women only as {ch.get('character_w', 'a woman in long loose clothing and a headscarf')}; dot eyes",
                               rules=core.rt(os.path.join(core.PROMPTS, "rules.md")),
                               busy=", ".join(f"{a:.0f}-{b:.0f}" for a, b in busy) or "none",
                               shots="\n".join(sh), transcript=trs),
                   stage="scenes", log=log)
    d = core.extract_json(out)
    beats = [x for x in d.get("beats", []) if x.get("phrase")]
    for x in beats:
        x["layers"] = [l for l in x.get("layers", []) if l.get("tool") in TOOLS] if x.get("action") == "touch" else []
    used = {i for x in beats for l in x["layers"] if l["tool"] in STICKER_TOOLS for i in _sticker_ids(l) if i}
    st = [s for s in d.get("stickers", []) if s.get("id") in used and s.get("prompt")]
    m = {"beats": beats, "stickers": st, "wish": d.get("wish", []), "base": len(lines)}
    core.wj(p.f("montage.json"), m)
    with open(p.f("stickers_lines.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(s["prompt"].replace("\n", " ") for s in st) + ("\n" if st else ""))
    touch = [x for x in beats if x["layers"]]
    kinds = {}
    for x in touch:
        for l in x["layers"]:
            kinds[l["tool"]] = kinds.get(l["tool"], 0) + 1
    log(f"Сценарий монтажа: {len(beats)} смысловых моментов, тронуто {len(touch)}, слои {kinds}, стикеров {len(st)} "
        f"(номера картинок {len(lines) + 1}..{len(lines) + len(st)}), пожеланий к движку {len(m['wish'])}")
    return m


def stickers(p, log=print):
    """Стикеры: картинка N+k (та же задача, что кадры) или stickers/<id>.* -> вырезка -> public/stickers/<id>.png."""
    m = core.rj(p.f("montage.json"), {})
    if not m.get("stickers"):
        return 0
    os.environ.setdefault("U2NET_HOME", "D:/u2net")
    from PIL import Image
    out = p.f("public", "stickers")
    os.makedirs(out, exist_ok=True)
    ses, n = None, 0
    for k, s in enumerate(m["stickers"], 1):
        dst = os.path.join(out, s["id"] + ".png")
        if os.path.exists(dst):
            n += 1
            continue
        src = None
        for d in ("stickers", "images_2x", "images"):
            for name in ((s["id"],) if d == "stickers" else (str(m.get("base", 0) + k),)):
                g = glob.glob(p.f(d, name + ".*"))
                if g:
                    src = g[0]
                    break
            if src:
                break
        if not src:
            log(f"стикер {s['id']}: нет картинки")
            continue
        if ses is None:
            from rembg import new_session
            ses = new_session("isnet-anime")
        from rembg import remove
        im = Image.open(src).convert("RGB")
        im.thumbnail((1400, 1400))
        cut = remove(im, session=ses, post_process_mask=True)
        bb = cut.getbbox()
        if bb:
            cut = cut.crop(bb)
        cut.thumbnail((900, 900))
        cut.save(dst)
        n += 1
    log(f"Стикеры: {n}/{len(m['stickers'])}")
    return n


def resolve(p, words, scenes, dur, shots=None, log=print):
    """montage.json -> edit.json "fx": [{start, end, idea, shot, layers:[{tool, t0, t1, ...}]}]. Время по фразе,
    без наложения на код-сцены; слой со стикером, которого нет, выпадает; момент без слоёв выпадает."""
    m = core.rj(p.f("montage.json"), {})
    if not m.get("beats"):
        return [], []
    from edit import find_phrase
    pub = p.f("public")
    have = {os.path.splitext(f)[0] for f in os.listdir(os.path.join(pub, "stickers"))} if os.path.isdir(os.path.join(pub, "stickers")) else set()
    busy = [(s["start"] - 0.3, s["end"] + 0.3) for s in scenes]
    out, sfx, last, after = [], [], -99.0, 0.0
    for x in m["beats"]:
        if not x.get("layers"):
            continue
        t = find_phrase(words, x["phrase"], after=max(0.0, after - 30))
        if t is None:
            t = find_phrase(words, x["phrase"])
        if t is None:
            continue
        lays = []
        for l in x["layers"]:
            if l["tool"] in STICKER_TOOLS and not all(i in have for i in _sticker_ids(l) if i):
                continue
            t0 = t + max(0.0, float(l.get("at") or 0))
            d = min(6.0, max(0.25, float(l.get("dur") or 2)))
            if l["tool"] in ("glitch", "rewind"):
                d = min(d, 1.5)
            lays.append({**{k: v for k, v in l.items() if k not in ("at", "dur")}, "t0": round(t0, 2), "t1": round(t0 + d, 2)})
        if not lays:
            continue
        end = min(dur, max(l["t1"] for l in lays))
        if t - last < 1.5 or any(a < end and t < b for a, b in busy):
            continue
        shot = None
        for s in shots or []:
            if s["start"] - 0.05 <= t < s["end"]:
                shot = s
        if any(l["tool"] == "lift" for l in lays):
            if not (shot and shot.get("fg")):
                lays = [l for l in lays if l["tool"] != "lift"]
            else:  # вырезка живёт только в своём кадре
                for l in lays:
                    if l["tool"] == "lift":
                        l["t1"] = min(l["t1"], shot["end"])
                        l["fg"] = shot["fg"]
        if not lays:
            continue
        for l in lays:
            if l["tool"] in SFX:
                sfx.append({"t": l["t0"], "name": SFX[l["tool"]], "vol": 0.2})
        out.append({"start": round(t, 2), "end": round(end, 2), "idea": x.get("idea", ""), "layers": lays})
        last, after = end, t
    log(f"Монтаж по сценарию: {len(out)} моментов из {sum(1 for x in m['beats'] if x.get('layers'))}")
    return out, sfx


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    from core import Project
    pr = Project(sys.argv[2])
    if sys.argv[1] == "plan":
        plan(pr, force="--force" in sys.argv)
    elif sys.argv[1] == "stickers":
        stickers(pr)
    elif sys.argv[1] == "show":
        for x in core.rj(pr.f("montage.json"), {}).get("beats", []):
            print(x.get("beat"), "|", x["phrase"][:50], "|", x.get("action"), "|", x.get("idea", "")[:110], "|", ",".join(l["tool"] for l in x.get("layers", [])))
