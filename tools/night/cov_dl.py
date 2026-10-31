"""Скачивает обложки задачи в thumbs/raw проектов по порядку. python cov_dl.py <task> <проект1> <проект2>... <<< 'хэши через пробел'"""
import os, subprocess, sys, urllib.request
task, projs = sys.argv[1], sys.argv[2:]
hs = sys.stdin.read().split()
assert len(hs) == 8 * len(projs), len(hs)
keys = ("A", "B", "C", "D", "At", "Bt", "Ct", "Dt")
for n, p in enumerate(projs):
    raw = p + "/thumbs/raw"
    os.makedirs(raw, exist_ok=True)
    for k, h in zip(keys, hs[n * 8:n * 8 + 8]):
        tmp = f"{raw}/{k}.{h.rsplit('.', 1)[1]}"
        req = urllib.request.Request(f"https://secretslider.com/media/task_results/{task}/{h}", headers={"User-Agent": "Mozilla/5.0"})
        open(tmp, "wb").write(urllib.request.urlopen(req, timeout=60).read())
        if not tmp.endswith(".jpg"):
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", tmp, "-q:v", "2", f"{raw}/{k}.jpg"], check=True)
            os.remove(tmp)
    print(p.rsplit("/", 1)[1], sorted(os.listdir(raw)))
