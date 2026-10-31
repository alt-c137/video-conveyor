"""Лист проверки готового ролика: отрисовка, переходы, слои, карточки и случайные секунды. python peek.py <проект> <out.jpg>"""
import json, os, subprocess, sys
p, out = sys.argv[1:3]
d = json.load(open(p + "/edit.json", encoding="utf-8"))
sh = d["shots"]
t = []
dr = [s for s in sh if s.get("draw")][1]
t += [dr["start"] + .35, dr["start"] + .9, dr["start"] + 1.5]
for k in ("flip", "mosaic", "whip"):
    s = next(x for x in sh[20:] if x.get("tr") == k)
    t += [s["start"] + .12]
pop = next(x for x in sh[30:] if x.get("pop"))
t += [pop["start"] + .3, pop["start"] + 1.2]
t += [d["duration"] * x for x in (.21, .47, .68, .93)]
tmp = os.path.dirname(out) + "/peek"
os.makedirs(tmp, exist_ok=True)
for i, x in enumerate(t):
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{x:.2f}", "-i", p + "/out/final.mp4", "-frames:v", "1", "-vf", "scale=560:-2", f"{tmp}/{i:02d}.jpg"])
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-framerate", "1", "-i", tmp + "/%02d.jpg", "-vf", "tile=3x4", "-frames:v", "1", out])
print([round(x, 1) for x in t])
