"""Качает кадры задачи secretslider прямо на D: python ss_dl.py <проект> <task> <map.txt>
map.txt: строки или ';'-список «N hash» из ZIP-каталога. Картинки публичные, мимо Загрузок на C:."""
import os, re, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
proj, task, mp = sys.argv[1:4]
os.chdir("E:/Adobe/Видео ИИ редактор/conveyor")
pairs = re.findall(r"(\d+) ([0-9a-f]{32}\.\w+|[0-9a-f]{32})", open(mp, encoding="utf-8").read())
out = os.path.join(proj, "_dl"); os.makedirs(out, exist_ok=True)

def one(a):
    n, h = a
    name = h if "." in h else h + ".jpg"
    dst = os.path.join(out, f"{n}.jpg")
    if os.path.exists(dst) and os.path.getsize(dst) > 5000:
        return 1
    for _ in range(4):
        try:
            req = urllib.request.Request(f"https://secretslider.com/media/task_results/{task}/{name}", headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=60).read()
            open(dst, "wb").write(data)
            return 1
        except Exception:
            pass
    print("FAIL", n)
    return 0

with ThreadPoolExecutor(8) as ex:
    ok = sum(ex.map(one, pairs))
print(proj[-30:], "скачано", ok, "из", len(pairs))
if ok == len(pairs):
    print(subprocess.run([sys.executable, "-X", "utf8", "stages.py", "import", proj, out, "--force"], capture_output=True, text=True, encoding="utf-8", errors="replace").stdout[-300:])
