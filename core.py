"""Ядро конвейера: пути, настройки, проекты, журнал, вызов любого ИИ.

Проект видео = папка projects/<канал>/<NN_slug>/ со state.json.
Каждый этап читает и пишет файлы в этой папке, поэтому любой этап можно
перезапустить отдельно, а работу может подхватить другой ИИ.
"""
import json, os, re, subprocess, sys, time, datetime, shutil
import requests

ROOT = os.path.dirname(os.path.abspath(__file__))
PROMPTS = os.path.join(ROOT, "prompts")
CHANNELS = os.path.join(ROOT, "channels")
PROJECTS = os.path.join(ROOT, "projects")

STAGES = ["script", "check", "tts", "whisper", "scenes", "images", "upscale", "edit", "render"]
STAGE_RU = {
    "analyze": "Анализ канала", "script": "Сценарий", "check": "Проверка сценария",
    "tts": "Озвучка", "whisper": "Тайминги (Whisper)", "scenes": "Сцены и промты",
    "images": "Картинки (Flow)", "upscale": "Апскейл", "edit": "Монтаж (анимации)",
    "render": "Рендер",
}


# ---------- файлы ----------
def rj(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def wj(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def rt(path, default=""):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return default


def wt(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def config():
    """config.example.json (в git, пути по умолчанию) + config.json (локально: ключи и свои пути, НЕ в git)."""
    base = rj(os.path.join(ROOT, "config.example.json"), {})
    for k, v in rj(os.path.join(ROOT, "config.json"), {}).items():
        base[k] = {**base[k], **v} if isinstance(v, dict) and isinstance(base.get(k), dict) else v
    return base


def save_config(cfg):
    wj(os.path.join(ROOT, "config.json"), cfg)


def slug(s, n=40):
    s = re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_").lower()
    return s[:n] or "video"


# ---------- каналы и проекты ----------
def channel(cid):
    return rj(os.path.join(CHANNELS, cid, "channel.json"))


def channels():
    out = []
    if os.path.isdir(CHANNELS):
        for cid in sorted(os.listdir(CHANNELS)):
            ch = channel(cid)
            if ch:
                ch["id"] = cid
                out.append(ch)
    return out


class Project:
    def __init__(self, path):
        self.path = os.path.abspath(path)
        self.state_path = os.path.join(self.path, "state.json")
        self.state = rj(self.state_path, {})

    @classmethod
    def create(cls, cid, topic, minutes=None, note=""):
        cdir = os.path.join(PROJECTS, cid)
        os.makedirs(cdir, exist_ok=True)
        n = 1 + max([int(d[:2]) for d in os.listdir(cdir) if d[:2].isdigit()] or [0])
        p = cls(os.path.join(cdir, f"{n:02d}_{slug(topic.get('title', 'video'))}"))
        os.makedirs(p.path, exist_ok=True)
        p.state = {"channel": cid, "topic": topic, "minutes": minutes, "note": note,
                   "created": now(), "stages": {s: {"status": "todo"} for s in STAGES}}
        p.save()
        return p

    def save(self):
        wj(self.state_path, self.state)

    def f(self, *parts):
        return os.path.join(self.path, *parts)

    @property
    def channel(self):
        return channel(self.state["channel"]) or {}

    def mark(self, stage, status, **extra):
        self.state = rj(self.state_path, self.state)
        st = self.state.setdefault("stages", {}).setdefault(stage, {})
        st.update(status=status, at=now(), pid=os.getpid(), **extra)
        self.save()

    def log(self, msg):
        line = f"[{datetime.datetime.now():%H:%M:%S}] {msg}"
        print(line, flush=True)
        with open(self.f("log.txt"), "a", encoding="utf-8") as fh:
            fh.write(line + "\n")


def pid_alive(pid):
    import ctypes
    h = ctypes.windll.kernel32.OpenProcess(0x1000, False, int(pid))  # PROCESS_QUERY_LIMITED_INFORMATION
    if not h:
        return False
    code = ctypes.c_ulong()
    ctypes.windll.kernel32.GetExitCodeProcess(h, ctypes.byref(code))
    ctypes.windll.kernel32.CloseHandle(h)
    return code.value == 259  # STILL_ACTIVE


def running_stage(p):
    """Этап, который сейчас идёт в любом процессе (панель или консоль)."""
    for s, st in p.state.get("stages", {}).items():
        if st.get("status") == "running" and st.get("pid") and pid_alive(st["pid"]):
            return s
    return None


def projects(cid=None, archived=False):
    """Проекты; архивные (state "archived") скрыты: им не подкладывают картинки и не отдают задания Flow."""
    out = []
    if not os.path.isdir(PROJECTS):
        return out
    for c in sorted(os.listdir(PROJECTS)):
        if cid and c != cid:
            continue
        for d in sorted(os.listdir(os.path.join(PROJECTS, c))):
            sp = os.path.join(PROJECTS, c, d, "state.json")
            if os.path.exists(sp):
                q = Project(os.path.dirname(sp))
                if archived or not q.state.get("archived"):
                    out.append(q)
    return out


def now():
    return datetime.datetime.now().isoformat(timespec="seconds")


# ---------- шаблоны промтов ----------
def prompt(name, **kw):
    """prompts/<name>.md, подстановка {{key}}."""
    t = rt(os.path.join(PROMPTS, name + ".md"))
    for k, v in kw.items():
        t = t.replace("{{" + k + "}}", v if isinstance(v, str) else json.dumps(v, ensure_ascii=False, indent=1))
    return t


# ---------- ИИ ----------
def llm(text, stage=None, provider=None, system="", log=print, retries=2):
    """Один запрос к ИИ. provider: имя из config.llm.providers; иначе берётся по этапу."""
    cfg = config()["llm"]
    name = provider or cfg["stages"].get(stage or "", "") or "claude"
    p = cfg["providers"][name]
    last = None
    for attempt in range(retries + 1):
        try:
            t0 = time.time()
            if p["type"] == "claude_cli":
                out = _claude_cli(text, system, p)
            else:
                out = _openai(text, system, p)
            log(f"ИИ {name}: {len(out)} симв. за {time.time() - t0:.0f} с")
            return out
        except Exception as e:  # сеть, лимиты — пробуем ещё
            last = e
            log(f"ИИ {name}: ошибка ({e}); попытка {attempt + 2}")
            time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"ИИ {name} не ответил: {last}")


def _claude_cli(text, system, p):
    exe = shutil.which("claude") or "claude"
    cmd = [exe, "-p", "--output-format", "text"]
    if p.get("model"):
        cmd += ["--model", p["model"]]
    if system:
        cmd += ["--append-system-prompt", system]
    r = subprocess.run(cmd, input=text, capture_output=True, text=True, encoding="utf-8",
                       timeout=p.get("timeout", 1800))
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout)[-400:])
    return r.stdout.strip()


def _openai(text, system, p):
    if not p.get("api_key"):
        raise RuntimeError("нет api_key в config.json")
    msgs = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": text}]
    r = requests.post(p["base_url"].rstrip("/") + "/chat/completions",
                      headers={"Authorization": "Bearer " + p["api_key"]},
                      json={"model": p["model"], "messages": msgs, "temperature": p.get("temperature", 0.7),
                            "max_tokens": p.get("max_tokens", 16000)},
                      timeout=p.get("timeout", 900))
    if r.status_code != 200:
        raise RuntimeError(f"{r.status_code} {r.text[:300]}")
    return r.json()["choices"][0]["message"]["content"].strip()


def extract_json(text):
    """Достаёт JSON из ответа ИИ (```json ...``` или первый {...}/[...])."""
    m = re.search(r"```(?:json)?\s*(.+?)```", text, re.S)
    s = m.group(1) if m else text
    i = min([x for x in (s.find("{"), s.find("[")) if x >= 0] or [0])
    s = s[i:]
    for end in range(len(s), 0, -1):
        if s[end - 1] in "}]":
            try:
                return json.loads(s[:end])
            except json.JSONDecodeError:
                continue
    raise ValueError("в ответе ИИ нет JSON:\n" + text[:500])


def run(cmd, log=print, cwd=None, shell=False):
    log("$ " + (cmd if isinstance(cmd, str) else " ".join(map(str, cmd)))[:300])
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=shell)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout)[-1500:])
    return r.stdout
