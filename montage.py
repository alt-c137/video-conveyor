"""Сценарий монтажа (04.11.2026, просьба владельца): после голоса, транскрипта и раскадровки ИИ пишет, какие эффекты
и где играют ПОВЕРХ картинок, по смыслу фраз. Подробно: docs/MONTAGE.md, раздел «Сценарий монтажа».

python montage.py plan <проект>     -> montage.json (+ stickers_lines.txt: промты стикеров, идут в ту же задачу картинок
                                       ПОСЛЕ кадров, т.е. номера N+1..N+k, где N = число строк prompts_lines.txt)
python montage.py stickers <проект> -> public/stickers/<id>.png (вырезка rembg из images[_2x]/N+k или stickers/<id>.*)
python montage.py show <проект>     -> список эффектов по времени (проверка глазами)
В монтаже (edit.make_edit) resolve() превращает montage.json в edit.json -> "fx"; без montage.json fx = [] (старые ролики не меняются)."""
import glob, json, os, sys
import core

TYPES = {"pop", "number", "freeze", "rewind", "glitch", "flash", "stamp", "circle", "zoom"}
DUR = {"pop": (2.5, 5.5), "number": (2, 4), "freeze": (1.2, 2.5), "rewind": (0.8, 1.5), "glitch": (0.3, 0.6),
       "flash": (0.15, 0.3), "stamp": (1.5, 2.5), "circle": (1.5, 3), "zoom": (0.4, 1.2)}
SFX = {"pop": "pop", "number": "tick", "freeze": "spot", "rewind": "whirr", "glitch": "beep", "flash": "swish",
       "stamp": "stamp", "circle": "swish", "zoom": "whoosh"}


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
    out = core.llm(core.prompt("montage", channel_name=ch["name"], per_minute="2-3", spice=str(max(2, round(mins / 6))),
                               max_stickers=str(min(18, max(6, round(mins)))),
                               character_rule=f"the host is {ch.get('character', 'a young man')}; women only as {ch.get('character_w', 'a woman in long loose clothing and a headscarf')}; dot eyes",
                               rules=core.rt(os.path.join(core.PROMPTS, "rules.md")),
                               busy=", ".join(f"{a:.0f}-{b:.0f}" for a, b in busy) or "none",
                               shots="\n".join(sh), transcript=trs),
                   stage="scenes", log=log)
    d = core.extract_json(out)
    fx = [f for f in d.get("fx", []) if f.get("type") in TYPES and f.get("phrase")]
    used = {it.get("sticker") for f in fx if f["type"] == "pop" for it in f.get("props", {}).get("items", [])}
    st = [s for s in d.get("stickers", []) if s.get("id") in used and s.get("prompt")]
    m = {"fx": fx, "stickers": st, "base": len(lines)}
    core.wj(p.f("montage.json"), m)
    with open(p.f("stickers_lines.txt"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(s["prompt"].replace("\n", " ") for s in st) + ("\n" if st else ""))
    kinds = {}
    for f in fx:
        kinds[f["type"]] = kinds.get(f["type"], 0) + 1
    log(f"Сценарий монтажа: {len(fx)} эффектов {kinds}, стикеров {len(st)} (номера картинок {len(lines) + 1}..{len(lines) + len(st)})")
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


def resolve(p, words, scenes, dur, log=print):
    """montage.json -> список fx для edit.json: время по фразе, без наложений на код-сцены и друг на друга."""
    m = core.rj(p.f("montage.json"), {})
    if not m.get("fx"):
        return [], []
    from edit import find_phrase, norm
    have = {os.path.splitext(f)[0] for f in os.listdir(p.f("public", "stickers"))} if os.path.isdir(p.f("public", "stickers")) else set()
    busy = [(s["start"] - 0.4, s["end"] + 0.4) for s in scenes]
    out, sfx, last, after = [], [], -99.0, 0.0
    for f in m["fx"]:
        t = find_phrase(words, f["phrase"], after=max(0.0, after - 30))
        if t is None:
            t = find_phrase(words, f["phrase"])
        if t is None:
            continue
        lo, hi = DUR[f["type"]]
        d = min(hi, max(lo, float(f.get("dur") or lo)))
        if t - last < 3.5 or t + d > dur or any(a < t + d and t < b for a, b in busy):
            continue
        pr = dict(f.get("props") or {})
        if f["type"] == "pop":
            items = []
            for it in pr.get("items", [])[:3]:
                if it.get("sticker") not in have:
                    continue
                at = find_phrase(words, it.get("at", ""), after=t - 0.2) if it.get("at") and len(it["at"].split()) > 1 else None
                if at is None and it.get("at"):  # одно слово: ищем его рядом с началом фразы
                    key = norm(it["at"].split()[0])
                    at = next((w["t"] for w in words if t - 0.2 <= w["t"] <= t + d - 1 and w["n"] == key), None)
                it["t"] = round(at if at is not None else t + 0.6 * len(items), 2)
                items.append(it)
            if not items:
                continue
            pr["items"] = items
            for it in items:
                sfx.append({"t": it["t"], "name": "pop", "vol": 0.22})
        else:
            sfx.append({"t": round(t, 2), "name": SFX[f["type"]], "vol": 0.22})
        out.append({"type": f["type"], "start": round(t, 2), "end": round(t + d, 2), "props": pr})
        last, after = t + d, t
    kinds = {}
    for f in out:
        kinds[f["type"]] = kinds.get(f["type"], 0) + 1
    log(f"Эффекты поверх картинок: {len(out)} из {len(m['fx'])} {kinds}")
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
        for f in core.rj(pr.f("montage.json"), {}).get("fx", []):
            print(f["type"], "|", f["phrase"][:60], "|", f.get("why", ""))
