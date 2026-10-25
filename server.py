"""Конвейер видео: локальная панель http://127.0.0.1:8765 и мост для расширения Flow Batch.

Запуск: python server.py  (или СТАРТ_КОНВЕЙЕР.bat)
"""
import json, os, sys, threading, traceback, urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
import core, stages
from core import Project, rj, wj, rt, wt

PORT = core.config().get("flow", {}).get("bridge_port", 8765)
RUNNING = {}          # путь проекта -> название этапа
LOCK = threading.Lock()


def project_info(p):
    st = p.state
    log = rt(p.f("log.txt")).splitlines()[-12:]
    job = rj(p.f("flow_job.json"))
    return {"path": p.path, "name": os.path.basename(p.path), "channel": st.get("channel"),
            "title": st.get("title") or st["topic"].get("title"), "minutes": stages.target_minutes(p),
            "stages": st.get("stages", {}), "running": RUNNING.get(p.path) or core.running_stage(p), "log": log,
            "duration": st.get("duration"), "check": st.get("check"),
            "flow": job and {k: job.get(k) for k in ("taken", "done", "left", "finished", "errors")},
            "files": [f for f in ("script.md", "narration.txt", "voice.mp3", "prompts_numbered.txt", "shotlist.json",
                                  "edit.json", "out/final.mp4") if os.path.exists(p.f(f))]}


def mask(cfg):
    c = json.loads(json.dumps(cfg))
    for p in c["llm"]["providers"].values():
        if p.get("api_key"):
            p["api_key"] = "•••" + p["api_key"][-4:]
    return c


def start(p, fn, label):
    with LOCK:
        if RUNNING.get(p.path) or core.running_stage(p):
            return False
        RUNNING[p.path] = label

    def work():
        try:
            fn()
        except Exception:
            p.log(traceback.format_exc().splitlines()[-1])
        finally:
            RUNNING.pop(p.path, None)
    threading.Thread(target=work, daemon=True).start()
    return True


def autopilot(cid, count, minutes, log):
    """ИИ сам: если свободных тем нет — анализ, потом проекты на N тем и все этапы подряд."""
    tp = rj(os.path.join(core.CHANNELS, cid, "topics.json"), {"topics": []})
    used = {p.state["topic"].get("title") for p in core.projects(cid)}
    free = [t for t in tp["topics"] if t["title"] not in used]
    if len(free) < count:
        stages.analyze(cid, max(10, count), log=log)
        tp = rj(os.path.join(core.CHANNELS, cid, "topics.json"))
        free = [t for t in tp["topics"] if t["title"] not in used]
    for t in free[:count]:
        p = Project.create(cid, t, minutes or t.get("minutes"))
        log(f"Автопилот: проект {os.path.basename(p.path)}")
        start(p, lambda p=p: stages.run_auto(p), "auto")


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def send(self, code, body, ctype="application/json; charset=utf-8"):
        if not isinstance(body, (bytes, bytearray)):
            body = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send(204, b"")

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}") if n else {}

    def proj(self, path):
        path = os.path.abspath(path)
        if not path.startswith(os.path.abspath(core.PROJECTS)) or not os.path.exists(os.path.join(path, "state.json")):
            raise ValueError("нет такого проекта")
        return Project(path)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        try:
            if u.path in ("/", "/index.html"):
                return self.send(200, open(os.path.join(core.ROOT, "ui", "index.html"), "rb").read(), "text/html; charset=utf-8")
            if u.path == "/api/state":
                chs = core.channels()
                for c in chs:
                    c["topics"] = rj(os.path.join(core.CHANNELS, c["id"], "topics.json"), {"topics": []})["topics"]
                return self.send(200, {"channels": chs, "projects": [project_info(p) for p in core.projects()],
                                       "config": mask(core.config()), "stages": core.STAGES, "stage_ru": core.STAGE_RU,
                                       "running": RUNNING})
            if u.path == "/api/file":
                p = self.proj(q["project"])
                name = q["name"]
                fp = os.path.abspath(p.f(name))
                if not fp.startswith(p.path):
                    raise ValueError("bad name")
                if name.endswith((".mp3", ".mp4")):
                    ctype = "audio/mpeg" if name.endswith(".mp3") else "video/mp4"
                    return self.send(200, open(fp, "rb").read(), ctype)
                return self.send(200, rt(fp).encode("utf-8"), "text/plain; charset=utf-8")
            # ---- мост для расширения Flow ----
            if u.path == "/flow/next":
                for p in core.projects():
                    job = rj(p.f("flow_job.json"))
                    if job and not job.get("taken"):
                        job["taken"] = core.now()
                        wj(p.f("flow_job.json"), job)
                        p.log("Flow: расширение взяло задание")
                        return self.send(200, {k: job[k] for k in ("id", "folder", "prompts")})
                return self.send(200, {})
            self.send(404, {"error": "not found"})
        except Exception as e:
            self.send(400, {"error": str(e)})

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        try:
            b = self.body()
            if u.path == "/flow/progress":
                for p in core.projects():
                    job = rj(p.f("flow_job.json"))
                    if job and job.get("id") == b.get("id") and job.get("taken"):
                        job.update({k: b.get(k) for k in ("done", "left", "errors", "finished")})
                        job.pop("retrying", None)
                        wj(p.f("flow_job.json"), job)
                return self.send(200, {"ok": True})
            if u.path == "/api/run":
                p = self.proj(b["project"])
                st = b.get("stage", "auto")
                if st == "auto":
                    ok = start(p, lambda: stages.run_auto(p, b.get("from"), b.get("to")), "auto")
                else:
                    ok = start(p, lambda: stages.run_stage(p, st), st)
                return self.send(200, {"ok": ok, "error": None if ok else "уже идёт этап"})
            if u.path == "/api/project/new":
                cid = b["channel"]
                if b.get("topic_n"):
                    t = next(t for t in rj(os.path.join(core.CHANNELS, cid, "topics.json"))["topics"]
                             if t["n"] == int(b["topic_n"]))
                else:
                    t = {"title": b["title"], "angle": b.get("angle", ""), "hedge": b.get("hedge", "")}
                p = Project.create(cid, t, float(b["minutes"]) if b.get("minutes") else None, b.get("note", ""))
                if b.get("voice"):
                    p.state["voice"] = b["voice"]
                    p.save()
                if b.get("go"):
                    start(p, lambda: stages.run_auto(p), "auto")
                return self.send(200, {"ok": True, "path": p.path})
            if u.path == "/api/analyze":
                cid = b["channel"]
                logf = lambda m: print(m, flush=True)
                threading.Thread(target=lambda: stages.analyze(cid, int(b.get("count", 10)), log=logf), daemon=True).start()
                return self.send(200, {"ok": True})
            if u.path == "/api/autopilot":
                threading.Thread(target=lambda: autopilot(b["channel"], int(b.get("count", 1)), b.get("minutes"),
                                                          lambda m: print(m, flush=True)), daemon=True).start()
                return self.send(200, {"ok": True})
            if u.path == "/api/file":
                p = self.proj(b["project"])
                if b["name"] not in ("script.md", "prompts_numbered.txt", "narration.txt"):
                    raise ValueError("этот файл менять нельзя")
                wt(p.f(b["name"]), b["text"])
                if b["name"] == "script.md":  # пересобрать разделы из правленого текста
                    body = b["text"].split("\n", 2)
                    title = body[0].lstrip("# ").strip()
                    _, _, sections, _ = stages.parse_script(f"===TITLE===\n{title}\n===SCRIPT===\n{body[-1]}")
                    stages.save_script(p, title, body[-1].strip(), sections)
                p.log(f"Файл {b['name']} изменён вручную")
                return self.send(200, {"ok": True})
            if u.path == "/api/flow/retry":
                p = self.proj(b["project"])
                _, missing = stages.collect_images(p)
                sh = {s["id"]: s["prompt"] for s in rj(p.f("shotlist.json"))}
                job = {"id": os.path.basename(p.path) + "_retry", "folder": stages.flow_folder(p), "retrying": True,
                       "prompts": "\n\n".join(f"{n}. {sh[n]}" for n in missing), "created": core.now()}
                wj(p.f("flow_job.json"), job)
                p.log(f"Flow: догенерация {len(missing)} кадров")
                return self.send(200, {"ok": True, "missing": len(missing)})
            if u.path == "/api/config":
                cfg = core.config()
                for name, pv in (b.get("providers") or {}).items():
                    tgt = cfg["llm"]["providers"].setdefault(name, {"type": "openai"})
                    for k, v in pv.items():
                        if k == "api_key" and (not v or v.startswith("•••")):
                            continue
                        tgt[k] = v
                cfg["llm"]["stages"].update(b.get("stages") or {})
                core.save_config(cfg)
                return self.send(200, {"ok": True})
            if u.path == "/api/channel":
                cid = core.slug(b.get("id") or b["name"], 30)
                ch = core.channel(cid) or {}
                ch.update({k: v for k, v in b.items() if k != "id"})
                wj(os.path.join(core.CHANNELS, cid, "channel.json"), ch)
                return self.send(200, {"ok": True, "id": cid})
            self.send(404, {"error": "not found"})
        except Exception as e:
            traceback.print_exc()
            self.send(400, {"error": str(e)})


def watch_images():
    """Раз в минуту: проектам, которые ждут картинки, подкладывает кадры из Загрузок (папка Flow или ZIP агрегатора)."""
    import time
    while True:
        try:
            stages.claim_zips()
        except Exception as e:
            print("ZIP:", e)
        for p in core.projects():
            if p.state["stages"].get("images", {}).get("status") == "running":
                try:
                    stages.collect_images(p)
                except Exception as e:
                    p.log(f"Картинки: {e}")
        time.sleep(60)


if __name__ == "__main__":
    print(f"Конвейер: http://127.0.0.1:{PORT}")
    threading.Thread(target=watch_images, daemon=True).start()
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
