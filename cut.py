"""Вырезать кусок озвучки [a, b) и сдвинуть ВСЕ тайминги проекта — без новой раскадровки и без ИИ.

  python stages.py cut <проект> <a> <b>        — секунды; оригиналы -> *_precut.*
  python stages.py cut <проект> welcome        — вырезать раздел «Welcome» (приветствие + план видео)

Зачем (урок 2026-10-29): у Brand 01 зрители уходили в первые 30-60 с. На 0:40-1:10 стоял блок
«Welcome back... subscribe... By the end you will know 1, 2, 3» — 22-30 с разговора о видео вместо видео.
У конкурентов (Nous Psychology, The Gen X Way, PsychToons, Throttle Psychology) такого нет вообще.
"""
import glob, json, os, re, shutil
import core
from core import rj, wj

norm = lambda x: re.sub(r"[^a-z']", "", x.lower())


AGENDA = re.compile(r"welcome|promise|what you will|today|this video", re.I)


def welcome_range(p):
    """«Welcome back...» (отдельным разделом или в конце зацепки) + следующие разделы-обещания («The Promise»,
    «What You Will Get») -> до первого слова первого содержательного раздела."""
    words = [w for s in rj(p.f("transcript.json"))["segments"] for w in s.get("words", []) if norm(w["word"])]
    secs = rj(p.f("sections.json"))["sections"]
    ws = [norm(w["word"]) for w in words]

    def find(text, after=0):
        key = [norm(w) for w in text.split()[:6] if norm(w)]
        return next((i for i in range(after, len(ws)) if ws[i:i + len(key)] == key), None)
    i = next((k for k in range(min(len(ws) - 1, 700)) if ws[k] == "welcome" and ws[k + 1] in ("back", "to")), None)
    if i is None:
        return None
    k = next((n for n, x in enumerate(secs) if n > 0 and find(x["text"]) is not None and find(x["text"]) > i
              and not AGENDA.search(x["name"]) and not AGENDA.search(x["text"][:60])), None)
    if k is None:
        return None
    j = find(secs[k]["text"], i)
    # режем от конца предыдущего слова (+0.25 с паузы) до начала содержательного раздела (-0.1 с)
    a = words[i - 1]["end"] + 0.25 if i else words[i]["start"]
    return round(min(a, words[i]["start"]), 2), round(words[j]["start"] - 0.1, 2)


def cut(p, a, b, log=print):
    d = b - a
    sh = lambda t: t if t < a else (t - d if t >= b else None)  # None = внутри выреза
    clip = lambda t: round(t if t < a else (a if t < b else t - d), 2)  # для концов интервалов

    def spans(items, keep_inside=False):
        out = []
        for x in items:
            s, e = x["start"], x.get("end", x["start"])
            if a <= s and e <= b and not keep_inside:
                continue  # целиком в вырезе
            if s < b and e > a and not keep_inside and not (s < a and e > b):
                if (min(e, b) - max(s, a)) > 0.5 * (e - s):
                    continue  # больше половины в вырезе — выкидываем
            x = dict(x, start=clip(s))
            if "end" in x:
                x["end"] = clip(e)
            out.append(x)
        return out

    # первый вырез в проекте: старые *_precut.* остались от прошлого прогона (откат, пересборка) и уже не оригинал —
    # убираем их в *_precut_stale.*, иначе вырез возьмёт устаревший монтаж (Logic 03, 2026-10-29: ролик без картинок)
    if not p.state.get("cuts"):
        for old in glob.glob(p.f("*_precut.*")) + glob.glob(p.f(os.path.join("public", "*_precut.*"))):
            root, ext = os.path.splitext(old)
            n, dst = 1, f"{root}_stale{ext}"
            while os.path.exists(dst):
                n += 1
                dst = f"{root}_stale{n}{ext}"
            os.replace(old, dst)

    # звук: оригинал сохраняем, стык — короткий кроссфейд
    for f in ("voice.mp3", os.path.join("public", "voice.mp3")):
        src = p.f(f)
        if not os.path.exists(src):
            continue
        bak = src.replace(".mp3", "_precut.mp3")
        if not os.path.exists(bak):
            shutil.copy2(src, bak)
        core.run(["ffmpeg", "-y", "-loglevel", "error", "-i", bak, "-filter_complex",
                  f"[0]atrim=0:{a},asetpts=PTS-STARTPTS[x];[0]atrim={b},asetpts=PTS-STARTPTS[y];"
                  f"[x][y]acrossfade=d=0.06[o]", "-map", "[o]", "-c:a", "libmp3lame", "-b:a", "256k", src], log=log)

    def backup(name):
        bak = p.f(name.replace(".json", "_precut.json"))
        if not os.path.exists(bak):
            shutil.copy2(p.f(name), bak)
        return rj(bak)

    tr = backup("transcript.json")
    segs = []
    for s in tr["segments"]:
        ws = [dict(w, start=sh(w["start"]), end=clip(w["end"])) for w in s.get("words", []) if sh(w["start"]) is not None]
        if not ws:
            continue
        segs.append(dict(s, start=ws[0]["start"], end=ws[-1]["end"], words=ws,
                         text=" " + " ".join(w["word"].strip() for w in ws)))
    wj(p.f("transcript.json"), dict(tr, segments=segs))
    core.wt(p.f("words.txt"), "\n".join(" ".join(f"{w['word'].strip()}@{w['start']:.2f}" for w in s["words"]) for s in segs))

    def shots_fix(shots):
        out = spans(shots)
        for i in range(len(out) - 1):  # без дыр: кадр тянется до следующего
            out[i]["end"] = out[i + 1]["start"]
        for x in out:
            if "duration" in x:
                x["duration"] = round(x["end"] - x["start"], 2)
        return out

    if os.path.exists(p.f("shotlist.json")):
        wj(p.f("shotlist.json"), shots_fix(backup("shotlist.json")))

    if os.path.exists(p.f("edit.json")):
        e = backup("edit.json")
        e["shots"] = shots_fix(e["shots"])
        e["scenes"] = [dict(x, cues=[sh(c) for c in x.get("cues", []) if sh(c) is not None]) for x in spans(e["scenes"])]
        caps = []
        for c in spans(e["captions"]):
            c["words"] = [dict(w, t=sh(w["t"])) for w in c.get("words", []) if sh(w["t"]) is not None]
            caps.append(c)
        e["captions"] = caps
        e["sections"] = [dict(x, start=sh(x["start"])) for x in e["sections"] if sh(x["start"]) is not None]
        e["sfx"] = [dict(x, t=sh(x["t"])) for x in e["sfx"] if sh(x["t"]) is not None]
        e["cta"] = {k: (sh(v) or 0) if v else 0 for k, v in e["cta"].items()}
        e["duration"] = round(e["duration"] - d, 2)
        wj(p.f("edit.json"), e)

    if p.state.get("duration"):
        p.state["duration"] = round(float(p.state["duration"]) - d, 2)
        p.save()
    cuts = p.state.setdefault("cuts", [])
    cuts.append([a, b])
    p.save()
    log(f"Вырезано {a:.2f}–{b:.2f} ({d:.1f} с); оригиналы *_precut.*. Дальше: render")
    return d
