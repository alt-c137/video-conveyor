"""Этапы конвейера. Каждый этап: функция (project) -> None, пишет файлы в папку проекта.

Запуск из консоли:
  python stages.py <этап> <папка проекта>        # script, check, tts, whisper, scenes, images, upscale, edit, render
  python stages.py analyze <канал> [кол-во]
  python stages.py new <канал> <номер темы из topics.json> [минуты]
  python stages.py auto <папка проекта> [с этапа]  # все этапы подряд
"""
import difflib, glob, hashlib, json, os, re, shutil, subprocess, sys, time
import requests
import core
from core import Project, llm, prompt, rj, wj, rt, wt


def rules():
    return core.rt(os.path.join(core.PROMPTS, "rules.md"))


def target_minutes(p):
    m = p.state.get("minutes") or p.state["topic"].get("minutes") or p.channel.get("minutes") or 10
    if isinstance(m, list):
        m = sum(m) / 2
    return float(m)


def wpm(p):
    """Слов в минуту у голоса канала (замерено по готовой озвучке, см. calibrate_wpm)."""
    w = p.state.get("wpm") or p.channel.get("wpm")
    if not w:  # новый канал: берём темп того же голоса с другого канала (урок 2026-10-25: 150 -> видео короче на треть)
        for c in os.listdir(core.CHANNELS):
            ch = core.channel(c)
            if ch.get("voice") == p.channel.get("voice") and ch.get("wpm"):
                w = ch["wpm"]
                break
    return float(w or 180)


def words(text):
    return len(re.findall(r"[A-Za-z0-9'’-]+", text))


# ======================= АНАЛИЗ КАНАЛА =======================
def yt_list(url, limit=60):
    """Список видео канала через yt-dlp (без ключа API)."""
    url = url.rstrip("/")
    if "/videos" not in url:
        url += "/videos"
    r = subprocess.run([sys.executable, "-m", "yt_dlp", "--flat-playlist", "-J", "--playlist-end", str(limit), url],
                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)
    if r.returncode != 0:
        return {"error": r.stderr[-300:], "videos": []}
    d = json.loads(r.stdout)
    vids = [{"title": e.get("title"), "views": e.get("view_count"), "duration_min": round((e.get("duration") or 0) / 60, 1),
             "id": e.get("id")} for e in d.get("entries") or []]
    views = sorted(v["views"] for v in vids if v.get("views"))
    med = views[len(views) // 2] if views else 0
    for v in vids:  # x = во сколько раз видео обогнало медиану своего канала (x>=3 — «выстрелило»)
        v["x"] = round(v["views"] / med, 1) if med and v.get("views") else None
    return {"channel": d.get("channel") or d.get("title"), "subscribers": d.get("channel_follower_count"),
            "median_views": med, "videos": vids}


def compact(data):
    """Данные для ИИ без мусора: строка на видео, выбросы сверху."""
    out = []
    for name, d in data.items():
        vs = sorted(d.get("videos", []), key=lambda v: (-(v.get("x") or 0), -(v.get("views") or 0)))
        out.append(f"## {name}: {d.get('channel')} subs={d.get('subscribers')} median={d.get('median_views')}")
        out += [f"x{v.get('x')} | {v.get('views')} views | {v.get('duration_min')} min | {v.get('title')}" for v in vs]
    return "\n".join(out)


def free_topics(cid):
    """Темы из плана, по которым ещё нет проекта."""
    used = {(q.state.get("topic") or {}).get("title") for q in core.projects(archived=True)
            if q.state.get("channel") == cid}
    return [t for t in rj(os.path.join(core.CHANNELS, cid, "topics.json"), {"topics": []})["topics"]
            if t.get("title") not in used]


def analyze(cid, count=10, log=print):
    ch = core.channel(cid)
    cdir = os.path.join(core.CHANNELS, cid)
    data = {"own": yt_list(ch["url"])}
    log(f"Канал: {len(data['own']['videos'])} видео")
    for u in ch.get("competitors", []):
        data[u] = yt_list(u, 40)
        log(f"Конкурент {u}: {len(data[u]['videos'])} видео")
    # поиск по нише: что вообще смотрят (channel.json "search": ["cognitive bias explained", ...])
    for q in ch.get("search", [])[:6]:
        r = subprocess.run([sys.executable, "-m", "yt_dlp", "--flat-playlist", "-J", f"ytsearch25:{q}"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)
        if r.returncode == 0:
            es = json.loads(r.stdout).get("entries") or []
            data["search: " + q] = {"channel": "YouTube search", "videos": [
                {"title": f"{e.get('title')} [{e.get('channel')}]", "views": e.get("view_count"),
                 "duration_min": round((e.get("duration") or 0) / 60, 1), "x": None} for e in es]}
            log(f"Поиск «{q}»: {len(es)} видео")
    wj(os.path.join(cdir, "yt_data.json"), data)
    old = rj(os.path.join(cdir, "topics.json"), {"topics": []})
    taken = [t["title"] for t in old["topics"]] + [v["title"] for v in data["own"]["videos"] if v.get("title")]
    mins = ch.get("minutes", [13, 16])
    out = llm(prompt("analyze", channel_name=ch["name"], niche=ch["niche"], audience=ch["audience"], format=ch["format"],
                     honesty=ch.get("honesty", ""), minutes=f"{mins[0]}-{mins[-1]}",
                     data=compact(data)[:60000], taken="\n".join(taken) or "-",
                     count=str(count), rules=rules()), stage="analyze", log=log)
    res = core.extract_json(out)
    n0 = max([t.get("n", 0) for t in old["topics"]] or [0])
    for i, t in enumerate(res["topics"]):
        t["n"] = n0 + i + 1
    old["topics"] += res["topics"]
    day = time.strftime("%Y-%m-%d")
    old["diagnosis_" + day] = res.get("diagnosis", "")
    if res.get("niches"):
        old["niches_" + day] = res["niches"]
    old["last_analysis"] = day
    wj(os.path.join(cdir, "topics.json"), old)
    log(f"Новых тем: {len(res['topics'])}")
    return res


# ======================= СЦЕНАРИЙ =======================
def parse_script(text):
    m = re.search(r"===TITLE===\s*(.+?)\s*===SCRIPT===\s*(.+?)(?:===SELFCHECK===\s*(.*))?$", text, re.S)
    if not m:
        raise ValueError("ИИ вернул сценарий не в том формате:\n" + text[:400])
    title, body, selfcheck = m.group(1).strip(), m.group(2).strip(), (m.group(3) or "").strip()
    sections, cur = [], None
    for line in body.splitlines():
        s = line.strip()
        h = re.match(r"\[SECTION:\s*(.+?)\]", s)
        if h:
            cur = {"name": h.group(1), "text": ""}
            sections.append(cur)
        elif s:
            if cur is None:
                cur = {"name": "Intro", "text": ""}
                sections.append(cur)
            cur["text"] += s + "\n\n"
    for s in sections:
        s["text"] = s["text"].strip()
    return title, body, sections, selfcheck


def save_script(p, title, body, sections, selfcheck=""):
    wt(p.f("script.md"), f"# {title}\n\n{body}\n")
    wt(p.f("narration.txt"), "\n\n".join(s["text"] for s in sections) + "\n")
    wj(p.f("sections.json"), {"title": title, "sections": sections, "selfcheck": selfcheck})
    p.state["title"] = title
    p.save()


def stage_script(p, log=print):
    ch, t = p.channel, p.state["topic"]
    mins = target_minutes(p)
    nw = int(mins * wpm(p))
    out = llm(prompt("script", channel_name=ch["name"], niche=ch["niche"], audience=ch["audience"], format=ch["format"],
                     honesty=ch.get("honesty", ""), notes=ch.get("notes", ""), language=ch.get("language", "English"),
                     minutes=f"{mins:g}", words=str(nw), title=t["title"], angle=t["angle"],
                     hedge=("Required hedge: " + t["hedge"]) if t.get("hedge") else "",
                     extra=p.state.get("note", ""), sections=str(max(4, min(8, round(mins / 2.2)))), rules=rules()),
              stage="script", log=log)
    title, body, sections, sc = parse_script(out)
    save_script(p, title, body, sections, sc)
    n = words(body)
    log(f"Сценарий: «{title}», {len(sections)} блоков, {n} слов (~{n / wpm(p):.1f} мин)")


# ======================= ПРОВЕРКА =======================
def mech_issues(body, nw):
    iss = []
    n = words(body)
    if abs(n - nw) / nw > 0.12:
        iss.append({"severity": "fix", "type": "length", "quote": "", "why": f"{n} words, target {nw}",
                    "fix": "expand" if n < nw else "cut"})
    for sent in re.split(r"(?<=[.!?])\s+", re.sub(r"\[SECTION:.*?\]", "", body)):
        if words(sent) > 28:
            iss.append({"severity": "fix", "type": "voice", "quote": sent[:120], "why": "sentence too long for voiceover",
                        "fix": "split into short sentences"})
    return iss


def stage_check(p, log=print, rounds=3):
    ch = p.channel
    nw = int(target_minutes(p) * wpm(p))
    for r in range(1, rounds + 1):
        d = rj(p.f("sections.json"))
        body = rt(p.f("script.md")).split("\n", 2)[2]
        out = llm(prompt("check", channel_name=ch["name"], minutes=f"{target_minutes(p):g}", words=str(nw),
                         actual_words=str(words(body)), rules=rules(), script=body), stage="check", log=log)
        res = core.extract_json(out)
        res["issues"] = [i for i in res.get("issues", []) if i.get("severity") in ("block", "fix")] + mech_issues(body, nw)
        wj(p.f(f"check_{r}.json"), res)
        log(f"Проверка {r}: {len(res['issues'])} замечаний. {res.get('summary', '')}")
        if not res["issues"]:
            p.state["check"] = "ok"
            p.save()
            return
        if r == rounds:
            break
        out = llm(prompt("fix", words=str(nw), rules=rules(), issues=json.dumps(res["issues"], ensure_ascii=False, indent=1),
                         title=d["title"], script=body), stage="script", log=log)
        title, body2, sections, sc = parse_script(out)
        save_script(p, title, body2, sections, sc)
        log(f"Исправлено: {words(body2)} слов")
    blocks = [i for i in res["issues"] if i["severity"] == "block"]
    p.state["check"] = "block" if blocks else "minor"
    p.save()
    if blocks:
        raise RuntimeError(f"После {rounds} кругов остались серьёзные замечания: см. check_{rounds}.json")
    log("Остались мелкие замечания (не блокируют).")


# ======================= ОЗВУЧКА (Fish Audio) =======================
def chunks(text, limit):
    paras = [x.strip() for x in text.split("\n\n") if x.strip()]
    out, cur = [], ""
    for para in paras:
        if cur and len(cur) + len(para) + 2 > limit:
            out.append(cur)
            cur = para
        else:
            cur = (cur + "\n\n" + para) if cur else para
    if cur:
        out.append(cur)
    return out


def stage_tts(p, log=print):
    cfg = core.config()["fish"]
    fc = rj(cfg["config"])
    voice = p.state.get("voice") or p.channel.get("voice")
    ref = next((v for k, v in fc["voices"].items() if k.lower() == (voice or "").lower()), None)
    if not ref:
        raise RuntimeError(f"Голос «{voice}» не найден в {cfg['config']}")
    parts = chunks(rt(p.f("narration.txt")), cfg.get("chunk_chars", 1800))
    os.makedirs(p.f("tts"), exist_ok=True)
    files = []
    for i, text in enumerate(parts, 1):
        h = hashlib.md5((text + ref + cfg["model"]).encode()).hexdigest()[:8]
        fn = p.f("tts", f"{i:03d}_{h}.mp3")
        files.append(fn)
        if os.path.exists(fn):
            continue
        payload = {"text": text, "reference_id": ref, "temperature": cfg["temperature"], "top_p": cfg["top_p"],
                   "prosody": {"speed": cfg["speed"], "volume": 0, "normalize_loudness": True}, "chunk_length": 300,
                   "normalize": True, "format": "mp3", "mp3_bitrate": 192, "sample_rate": 44100, "latency": "normal",
                   "repetition_penalty": cfg["repetition_penalty"], "condition_on_previous_chunks": True}
        for attempt in range(4):
            r = requests.post("https://api.fish.audio/v1/tts", json=payload, timeout=600,
                              headers={"Authorization": "Bearer " + fc["api_key"], "model": cfg["model"]})
            if r.status_code == 200 and len(r.content) > 1000:
                break
            log(f"Fish {r.status_code}: {r.text[:200]}; повтор")
            time.sleep(15 * (attempt + 1))
        else:
            raise RuntimeError("Fish Audio не отдал озвучку")
        open(fn, "wb").write(r.content)
        log(f"Озвучка {i}/{len(parts)}")
    lst = p.f("tts", "list.txt")
    wt(lst, "".join(f"file '{os.path.basename(f)}'\n" for f in files))
    core.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
              "-af", "apad=pad_dur=0.6", "-c:a", "libmp3lame", "-b:a", "192k", p.f("voice.mp3")], log=log)
    dur = float(core.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p.f("voice.mp3")]))
    p.state["duration"] = round(dur, 2)
    p.save()
    real = words(rt(p.f("narration.txt"))) / (dur / 60)
    log(f"voice.mp3: {dur / 60:.1f} мин, темп {real:.0f} слов/мин")
    ch_path = os.path.join(core.CHANNELS, p.state["channel"], "channel.json")
    ch = rj(ch_path)
    ch["wpm"] = round(real if not ch.get("wpm") else 0.7 * ch["wpm"] + 0.3 * real)  # калибровка темпа голоса
    wj(ch_path, ch)
    lo = target_minutes(p) * 0.88
    if dur / 60 < lo:
        log(f"!! Озвучка короче цели ({dur / 60:.1f} < {lo:.1f} мин). Темп записан в канал; перезапусти «Проверку» — она удлинит текст.")


# ======================= WHISPER =======================
def stage_whisper(p, log=print):
    cfg = core.config()["whisper"]
    out = p.f("whisper")
    core.run([cfg["exe"], p.f("voice.mp3"), "--model", cfg["model"], "--language", "en", "--word_timestamps", "True",
              "--output_format", "json", "--output_dir", out, "--verbose", "False"], log=log)
    shutil.copy(os.path.join(out, "voice.json"), p.f("transcript.json"))
    d = rj(p.f("transcript.json"))
    wt(p.f("words.txt"), "\n".join(" ".join(f"{w['word'].strip()}@{w['start']:.2f}" for w in s.get("words", []))
                                    for s in d["segments"]))
    log(f"Транскрипт: {len(d['segments'])} сегментов, до {d['segments'][-1]['end']:.0f} с")
    tts_artifacts(p, d, log)


def tts_artifacts(p, d, log=print):
    """Лишние слова в озвучке, которых нет в сценарии, — вероятный мусор TTS («Baha!», «Night.», вздох).
    Выравниваем слова Whisper по словам сценария: вставка 1-3 слов без пары = подозрение (даже если Whisper уверен).
    Только предупреждение: глушить кусок в voice.mp3 (оригинал сохранить) до этапа монтажа."""
    src = p.f("narration.txt") if os.path.exists(p.f("narration.txt")) else p.f("script.md")
    if not os.path.exists(src):
        return []
    norm = lambda x: re.sub(r"[^a-z']", "", x.lower())
    ref = [t for t in map(norm, re.findall(r"\S+", rt(src))) if t]
    words = [w for s in d["segments"] for w in s.get("words", []) if norm(w["word"])]
    hyp = [norm(w["word"]) for w in words]
    sus = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, ref, hyp, autojunk=False).get_opcodes():
        if op == "insert" and j2 - j1 <= 3 and not any(c.isdigit() for w in words[j1:j2] for c in w["word"]):
            sus.append(f"{' '.join(w['word'].strip() for w in words[j1:j2])}@{words[j1]['start']:.1f}")
    if sus:
        log(f"ВНИМАНИЕ: возможный мусор в озвучке (нет в сценарии): {', '.join(sus[:20])} — послушай эти места")
    return sus


# ======================= СЦЕНЫ И ПРОМТЫ =======================
# Шаблон промта картинки. Канал может задать свой: channel.json "prompt_template" с {loc} и {scene}.
# По умолчанию — формат пользователя для генерации со стиль-референсом персонажа («ведущий» = host).
PROMPT_TEMPLATE = ("Flat 2D vector cartoon style, clean uniform black outlines, flat colors, no shading. "
                   "All characters drawn with the host's exact technique: same small dot eyes, same simple line mouth, "
                   "same round head, same outline weight, same flat colors. Pose each character naturally for the scene, "
                   "not a static pose. Everyone modestly dressed. LOCATION: {loc}. SCENE: {scene} "
                   "No text, no captions, no titles. 16:9.")
DEFAULT_LOC = "a plain neutral background, soft even light"


def stage_scenes(p, log=print):
    ch = p.channel
    d = rj(p.f("transcript.json"))
    segs = d["segments"]
    end_total = segs[-1]["end"]
    body = rt(p.f("script.md"))
    if not os.path.exists(p.f("motifs.json")):
        mo = core.extract_json(llm(prompt("motifs", rules=rules(), script=body), stage="scenes", log=log))
        wj(p.f("motifs.json"), mo)
    mo = rj(p.f("motifs.json"))
    motifs_txt = "\n".join(f"  - {m['name']}: {m['look']} ({m['meaning']})" for m in mo["motifs"])
    every = 600 / core.config().get("shots_per_10min", 220)
    # куски по ~150 с речи
    pieces, cur = [], []
    for s in segs:
        cur.append(s)
        if s["end"] - cur[0]["start"] > 150:
            pieces.append(cur)
            cur = []
    if cur:
        pieces.append(cur)
    os.makedirs(p.f("scenes_parts"), exist_ok=True)
    rows = []
    for i, pc in enumerate(pieces, 1):
        fn = p.f("scenes_parts", f"{i:02d}.tsv")
        if not os.path.exists(fn):
            lines = "\n".join(f"{s['start']:.1f} {s['text'].strip()}" for s in pc)
            out = llm(prompt("scenes", every=f"{every:.1f}", character=ch.get("character", "a young man"),
                             character_w=ch.get("character_w", "a young woman"), motifs=motifs_txt, rules=rules(),
                             lines=lines, **{"from": f"{pc[0]['start']:.0f}", "to": f"{pc[-1]['end']:.0f}"}),
                      stage="scenes", log=log)
            out = re.sub(r"```\w*", "", out)
            wt(fn, out.strip() + "\n")
            log(f"Сцены: кусок {i}/{len(pieces)}")
        lo, hi = pc[0]["start"], pc[-1]["end"]
        for line in rt(fn).splitlines():
            cols = line.split("\t")
            if len(cols) < 2 or not re.match(r"^\d+(\.\d+)?$", cols[0].strip()):
                continue
            t = float(cols[0])
            if lo - 1 <= t <= hi + 0.5 and cols[1].strip():
                rows.append([t, cols[1].strip(), (cols[2] if len(cols) > 2 else "").strip()])
    rows.sort(key=lambda r: r[0])
    rows[0][0] = 0.0
    clean = []
    for r in rows:  # минимум 1.3 с между кадрами
        if clean and r[0] - clean[-1][0] < 1.3:
            continue
        clean.append(r)
    if core.config().get("code_scenes_first", True):
        clean = skip_under_scenes(p, clean, end_total, log)
    build_shots(p, clean, end_total, log)


def skip_under_scenes(p, rows, end_total, log=print, MIN=1.6):
    """Код-сцены выбираются ДО картинок (edit_parts/ кэшируется — монтаж потом возьмёт те же сцены).
    Кадры под сценой не генерим (раньше ~половина картинок уходила под сцены — кредиты впустую),
    после сцены картинка встаёт ровно на её конец, ни одна не мелькает короче MIN (урок 2026-10-26)."""
    import edit
    tr = rj(p.f("transcript.json"))
    words = edit.all_words(tr)
    secs = edit.sections(p, words)
    raw, _ = edit.ask_scenes(p, tr, words, secs, [], log)
    sc = edit.clean_scenes(raw, secs, float(p.state.get("duration") or end_total))
    under = lambda t: any(s["start"] - 0.3 <= t < s["end"] for s in sc)
    kept = [list(r) for r in rows if not under(r[0])]
    for i, s in enumerate(sc):
        nxt_scene = sc[i + 1]["start"] if i + 1 < len(sc) else end_total
        if nxt_scene - s["end"] < MIN:
            continue  # окно крошечное — сцена держится до следующей (Video.tsx)
        nxt = next((r for r in kept if r[0] >= s["end"]), None)
        if nxt and nxt[0] - s["end"] < MIN:
            nxt[0] = s["end"]
        else:  # о чём говорили под сценой — то и показываем сразу после неё
            hid = [r for r in rows if s["start"] - 0.3 <= r[0] < s["end"]]
            if hid:
                kept.append([s["end"], hid[-1][1], ""])
    kept.sort(key=lambda r: r[0])

    def vis(i):
        a, b = kept[i][0], kept[i + 1][0] if i + 1 < len(kept) else end_total
        return b - a - sum(max(0, min(b, s["end"]) - max(a, s["start"])) for s in sc)
    i = 0
    while i < len(kept) and len(kept) > 1:
        if vis(i) < MIN:
            same = i + 1 < len(kept) and not any(kept[i][0] < s["start"] < kept[i + 1][0] for s in sc)
            del kept[i + 1 if same else i]
            i = max(0, i - 1)
            continue
        i += 1
    if kept:
        kept[0][0] = 0.0
    log(f"Код-сцен: {len(sc)}; картинок нужно {len(kept)} из {len(rows)} (под сценами не генерим)")
    return kept


def build_shots(p, rows, end_total, log=print):
    ch = p.channel
    tpl = ch.get("prompt_template") or PROMPT_TEMPLATE
    M, W = ch.get("character", "a young man"), ch.get("character_w", "a young woman")
    shots, numbered = [], []
    for i, (t, scene, ov) in enumerate(rows):
        n = i + 1
        end = rows[i + 1][0] if i + 1 < len(rows) else end_total
        loc = DEFAULT_LOC
        m = re.match(r"LOC:\s*(.+?)\s*\|\s*(.+)", scene)
        if m:
            loc, scene = m.group(1), m.group(2)
        s = scene.replace("{M}", M).replace("{W}", W).strip()
        pr = tpl.replace("{loc}", loc).replace("{scene}", s[0].upper() + s[1:].rstrip(".") + ".")
        shots.append({"id": n, "file": f"{n}.png", "start": round(t, 2), "end": round(end, 2),
                      "duration": round(end - t, 2), "overlay": ov, "prompt": pr})
        numbered.append(f"{n}. {pr}")
    wt(p.f("prompts_numbered.txt"), "\n\n".join(numbered) + "\n")
    wt(p.f("prompts_lines.txt"), "\n".join(numbered) + "\n")  # агрегаторы (secretslider): 1 строка = 1 промт
    wj(p.f("shotlist.json"), shots)
    long_ = [s["id"] for s in shots if s["duration"] > 5.5]
    log(f"{len(shots)} кадров на {end_total / 60:.1f} мин, в среднем {end_total / len(shots):.2f} с" +
        (f"; длинные (>5.5 с): {long_[:20]}" if long_ else ""))


# ======================= КАРТИНКИ (Flow или любой агрегатор → ZIP) =======================
def flow_folder(p):
    v = p.state.get("flow_v", 1)
    return f"conv_{p.state['channel']}_{os.path.basename(p.path)}" + (f"_v{v}" if v > 1 else "")


def stage_images(p, log=print):
    """Ставит задание для расширения Flow Batch (оно забирает его с локального сервера) и ждёт файлы."""
    job = {"id": os.path.basename(p.path), "project": p.path, "folder": flow_folder(p),
           "prompts": rt(p.f("prompts_numbered.txt")), "created": core.now()}
    if not os.path.exists(p.f("flow_job.json")):
        wj(p.f("flow_job.json"), job)
        log(f"Задание для Flow поставлено: папка загрузок «{job['folder']}». Расширение заберёт его само "
            f"(галочка «Конвейер» в панели) или сгенерируй prompts_lines.txt в агрегаторе — ZIP из Загрузок подхватится сам.")
    total = len(rj(p.f("shotlist.json")))
    while True:
        claim_zips(log)
        got, missing = collect_images(p)
        p.mark("images", "running", got=got, total=total)
        if not missing:
            log(f"Все {total} картинок на месте")
            return
        st = rj(p.f("flow_job.json"), {})
        if st.get("finished") and not st.get("retrying"):
            log(f"Flow закончил, нет кадров: {missing[:40]}{'…' if len(missing) > 40 else ''}. "
                f"Монтаж закроет их анимациями, если продолжить.")
            p.state["missing_images"] = missing
            p.save()
            return
        time.sleep(30)


def img_num(name):
    """Номер кадра из имени файла: «12.jpg», «012.png», «slide_12.jpg», «12 (1).png» → 12."""
    m = re.match(r"^\D*?(\d+)(?:\s*\(\d+\))?\.(jpg|jpeg|png|webp)$", os.path.basename(name), re.I)
    return (int(m.group(1)), m.group(2).lower().replace("jpeg", "jpg")) if m else None


def import_images(p, src, log=print, force=False):
    """Забрать кадры из ZIP или папки (Flow, secretslider и любой агрегатор). Номер = число в имени файла."""
    import zipfile
    dst = p.f("images")
    os.makedirs(dst, exist_ok=True)
    total = len(rj(p.f("shotlist.json"), []))
    n_ok = 0
    if os.path.isfile(src) and src.lower().endswith(".zip"):
        with zipfile.ZipFile(src) as z:
            for zi in z.infolist():
                r = img_num(zi.filename)
                if not r or zi.is_dir() or not (1 <= r[0] <= total):
                    continue
                out = os.path.join(dst, f"{r[0]}.{r[1]}")
                if force or not os.path.exists(out):
                    for old in glob.glob(os.path.join(dst, f"{r[0]}.*")):
                        os.remove(old)
                    with z.open(zi) as fi, open(out, "wb") as fo:
                        shutil.copyfileobj(fi, fo)
                    n_ok += 1
    elif os.path.isdir(src):
        for f in glob.glob(os.path.join(src, "**", "*.*"), recursive=True):
            r = img_num(f)
            if not r or not (1 <= r[0] <= total):
                continue
            out = os.path.join(dst, f"{r[0]}.{r[1]}")
            if force or not os.path.exists(out) or os.path.getmtime(f) > os.path.getmtime(out):
                for old in glob.glob(os.path.join(dst, f"{r[0]}.*")):
                    if old != out:
                        os.remove(old)
                shutil.copy2(f, out)
                n_ok += 1
    if n_ok:
        log(f"Картинки: взято {n_ok} из {os.path.basename(src)}")
    return n_ok


ZIPS = os.path.join(core.ROOT, "zips_seen.json")  # какой ZIP из Загрузок какому видео отдан


def zip_nums(zp):
    import zipfile
    try:
        with zipfile.ZipFile(zp) as z:
            return {r[0] for r in map(img_num, z.namelist()) if r}
    except Exception:
        return set()


def claim_zips(log=print):
    """ZIP с кадрами 1..N из Загрузок → видео, которое ждёт картинки и у которого ровно N кадров.
    Если подходят два видео (одинаковое N) или ZIP неполный — не угадываем: положи ZIP в <проект>/inbox/."""
    seen = rj(ZIPS, {})
    waiting = [q for q in core.projects() if q.state["stages"].get("images", {}).get("status") == "running"]
    for q in waiting:  # явная папка проекта — без угадывания
        for zp in glob.glob(q.f("inbox", "*.zip")):
            if zp not in seen:
                import_images(q, zp, log=q.log)
                seen[zp] = q.path
    if waiting:
        oldest = min(os.path.getmtime(q.f("shotlist.json")) for q in waiting)
        for zp in sorted(glob.glob(os.path.join(core.config()["flow"]["downloads"], "*.zip")), key=os.path.getmtime):
            if zp in seen or os.path.getmtime(zp) < oldest:
                continue
            nums = zip_nums(zp)
            if len(nums) < 5:
                seen[zp] = None
                continue
            tot = {q.path: len(rj(q.f("shotlist.json"), [])) for q in waiting}
            fit = [q for q in waiting if tot[q.path] == max(nums)] or \
                  [q for q in waiting if tot[q.path] - 3 <= max(nums) <= tot[q.path] and len(nums) >= 0.8 * tot[q.path]]
            if len(fit) == 1:
                import_images(fit[0], zp, log=fit[0].log)
                seen[zp] = fit[0].path
            else:
                seen[zp] = "?"
                log(f"ZIP {os.path.basename(zp)}: {len(nums)} кадров до №{max(nums)} — "
                    f"{'подходят несколько видео' if fit else 'не совпал ни с одним видео'}. "
                    f"Положи его в <проект>/inbox/ или: python stages.py import <проект> <zip>")
    wj(ZIPS, seen)


def collect_images(p):
    dl = core.config()["flow"]["downloads"]
    import_images(p, os.path.join(dl, flow_folder(p)), log=p.log)
    dst = p.f("images")
    os.makedirs(dst, exist_ok=True)
    have = {int(os.path.splitext(x)[0]) for x in os.listdir(dst) if os.path.splitext(x)[0].isdigit()}
    total = len(rj(p.f("shotlist.json"), []))
    return len(have), [n for n in range(1, total + 1) if n not in have]


# ======================= АПСКЕЙЛ =======================
def stage_upscale(p, log=print):
    cfg = core.config()["upscayl"]
    src, dst = p.f("images"), p.f("images_2x")
    os.makedirs(dst, exist_ok=True)
    todo = [f for f in os.listdir(src) if not os.path.exists(os.path.join(dst, os.path.splitext(f)[0] + ".png"))]
    if not todo:
        log("Апскейл: всё уже готово")
        return
    tmp = p.f("_up_in")
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(tmp)
    for f in todo:
        shutil.copy2(os.path.join(src, f), tmp)
    core.run([cfg["exe"], "-i", tmp, "-o", dst, "-m", cfg["models"], "-n", cfg["model"], "-s", str(cfg["scale"]),
              "-f", "png"], log=log)
    shutil.rmtree(tmp, ignore_errors=True)
    bad = black_upscales(src, dst, todo)
    if bad:  # видеокарта занята (рендер) -> upscayl молча пишет чёрные кадры; весь ролик выходил на чёрном фоне
        log(f"Апскейл: {len(bad)} чёрных картинок — повтор")
        for f in bad:
            os.remove(os.path.join(dst, os.path.splitext(f)[0] + ".png"))
        os.makedirs(tmp)
        for f in bad:
            shutil.copy2(os.path.join(src, f), tmp)
        core.run([cfg["exe"], "-i", tmp, "-o", dst, "-m", cfg["models"], "-n", cfg["model"], "-s", str(cfg["scale"]),
                  "-f", "png"], log=log)
        shutil.rmtree(tmp, ignore_errors=True)
        from PIL import Image
        for f in black_upscales(src, dst, bad):  # снова чёрная — берём оригинал, увеличенный обычным способом
            im = Image.open(os.path.join(src, f)).convert("RGB")
            im.resize((im.width * int(cfg["scale"]), im.height * int(cfg["scale"])), Image.LANCZOS)                 .save(os.path.join(dst, os.path.splitext(f)[0] + ".png"))
            log(f"Апскейл: {f} — взят оригинал")
    log(f"Апскейл: {len(todo)} картинок")


def black_upscales(src, dst, names):
    """Картинки, у которых апскейл почти чёрный, а оригинал нет."""
    from PIL import Image, ImageStat
    lum = lambda f: ImageStat.Stat(Image.open(f).convert("L").resize((32, 18))).mean[0]
    out = []
    for f in names:
        up = os.path.join(dst, os.path.splitext(f)[0] + ".png")
        if not os.path.exists(up) or (lum(up) < 3 and lum(os.path.join(src, f)) > 12):
            out.append(f)
    return out


# ======================= МОНТАЖ И РЕНДЕР =======================
def stage_edit(p, log=print):
    import edit
    edit.make_edit(p, log)


def stage_render(p, log=print):
    import edit
    edit.render(p, log)


STAGE_FN = {"script": stage_script, "check": stage_check, "tts": stage_tts, "whisper": stage_whisper,
            "scenes": stage_scenes, "images": stage_images, "upscale": stage_upscale, "edit": stage_edit,
            "render": stage_render}


DOWNSTREAM_CACHE = {"script": ["motifs.json", "scenes_parts", "edit_parts", "edit.json"],
                    "check": ["motifs.json", "scenes_parts", "edit_parts", "edit.json"],
                    "whisper": ["scenes_parts", "edit_parts", "edit.json"], "scenes": ["edit_parts", "edit.json"],
                    "edit": ["edit_parts"]}


def invalidate(p, stage):
    """Перезапуск этапа делает устаревшими кэши следующих этапов."""
    keep = {"edit_parts"} if stage == "edit" and core.config().get("code_scenes_first", True) else set()
    for f in DOWNSTREAM_CACHE.get(stage, []):
        if f in keep:  # код-сцены выбраны на этапе сцен, под них уже не генерили картинки — не выбрасывать
            continue
        fp = p.f(f)
        if os.path.isdir(fp):
            shutil.rmtree(fp, ignore_errors=True)
        elif os.path.exists(fp):
            os.remove(fp)
    later = core.STAGES[core.STAGES.index(stage) + 1:]
    redo_images = stage in ("script", "check", "whisper", "scenes") and os.path.isdir(p.f("images"))
    if redo_images:  # новые промты — старые картинки не подходят; не удаляем, а откладываем
        stamp = time.strftime("%m%d_%H%M")
        for d in ("images", "images_2x"):
            if os.path.isdir(p.f(d)):
                os.replace(p.f(d), p.f(f"{d}_old_{stamp}"))
        if os.path.exists(p.f("flow_job.json")):
            os.replace(p.f("flow_job.json"), p.f(f"flow_job_old_{stamp}.json"))
        p.state["flow_v"] = p.state.get("flow_v", 1) + 1
    for s in later:
        st = p.state.get("stages", {}).get(s)
        if st and st.get("status") == "done":
            st["status"] = "todo"
    p.save()


def run_stage(p, stage):
    invalidate(p, stage)
    p.mark(stage, "running")
    p.log(f"=== {core.STAGE_RU[stage]} ===")
    try:
        STAGE_FN[stage](p, log=p.log)
        p.mark(stage, "done")
    except Exception as e:
        p.log(f"ОШИБКА: {e}")
        p.mark(stage, "error", error=str(e)[:1500])
        raise


def run_auto(p, start=None, stop=None):
    stages = core.STAGES
    i = stages.index(start) if start else next(
        (k for k, s in enumerate(stages) if p.state["stages"].get(s, {}).get("status") != "done"), len(stages))
    j = stages.index(stop) + 1 if stop else len(stages)
    for s in stages[i:j]:
        run_stage(p, s)
        p = Project(p.path)


def status_md():
    """Одна страница: каналы, свободные темы (когда нужен новый анализ), каждое видео и его этапы."""
    out = [f"# Статус проектов (авто, {core.now()})", ""]
    for ch in core.channels():
        cid = ch["id"]
        tp = rj(os.path.join(core.CHANNELS, cid, "topics.json"), {"topics": []})
        free = free_topics(cid)
        need = ch.get("analysis_every", {}).get("min_free_topics", 3)
        out += [f"## Канал {cid} — {ch.get('name')}",
                f"- тем в плане: {len(tp['topics'])}, свободных (без проекта): {len(free)}; последний анализ: {tp.get('last_analysis', '—')}",
                f"- новый анализ: {'НУЖЕН СЕЙЧАС (`python stages.py analyze ' + cid + ' 10`)' if len(free) < need else f'когда свободных станет < {need}'}",
                ""]
        for q in core.projects():
            if q.state.get("channel") != cid:
                continue
            st = q.state["stages"]
            cur = next((s for s in core.STAGES if st[s]["status"] != "done"), None)
            row = " ".join(("✅" if st[s]["status"] == "done" else "⏳" if st[s]["status"] == "running" else
                            "❌" if st[s]["status"] == "error" else "·") + s for s in core.STAGES)
            extra = ""
            if st.get("images", {}).get("status") == "running":
                got, miss = collect_images(q)
                extra = f" — картинок {got}/{got + len(miss)}"
            dur = f"{q.state['duration'] / 60:.1f} мин" if q.state.get("duration") else ""
            out.append(f"- `{os.path.relpath(q.path, core.ROOT)}` {dur} — сейчас: **{cur or 'ГОТОВО'}**{extra}\n  {row}")
        out.append("")
    txt = "\n".join(out)
    os.makedirs(os.path.join(core.ROOT, "ai"), exist_ok=True)
    wt(os.path.join(core.ROOT, "ai", "STATUS_PROJECTS.md"), txt)
    return txt


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # консоль Windows cp1251 падает на ✅
    a = sys.argv[1:]
    if not a:
        print(__doc__)
    elif a[0] == "analyze":
        analyze(a[1], int(a[2]) if len(a) > 2 else 10)
    elif a[0] == "new":
        t = next(t for t in rj(os.path.join(core.CHANNELS, a[1], "topics.json"))["topics"] if t["n"] == int(a[2]))
        p = Project.create(a[1], t, float(a[3]) if len(a) > 3 else None)
        print(p.path)
    elif a[0] == "status":  # сводка для ИИ: ai/STATUS_PROJECTS.md
        print(status_md())
    elif a[0] == "import":  # python stages.py import <проект> <zip|папка> [--force]
        p = Project(a[1])
        import_images(p, a[2], force="--force" in a)
        print("есть %d, нет %s" % collect_images(p))
    elif a[0] == "package":  # заголовки, превью-идеи, описание, теги -> out/youtube.md
        import package
        package.plan(Project(a[1]))
    elif a[0] == "thumbs":  # thumbs/raw/A..D -> превью с текстом + лист проверки
        import package
        package.thumbs(Project(a[1]))
    elif a[0] == "auto":
        run_auto(Project(a[1]), a[2] if len(a) > 2 else None, a[3] if len(a) > 3 else None)
    else:
        run_stage(Project(a[1]), a[0])
