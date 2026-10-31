"""Без токенов: кладёт At-Dt в thumbs/, запоминает выбор обложек и пересобирает youtube.md с главами из edit.json.
python pick.py <проект> [файл_с_выбором]; без файла берёт уже сохранённый thumbs/pick.md"""
import glob, os, shutil, sys
os.chdir("E:/Adobe/Видео ИИ редактор/conveyor")
sys.path.insert(0, ".")
import core, package
from PIL import Image
proj = sys.argv[1].rstrip("/")
p = core.Project(proj) if hasattr(core, "Project") else None
for f in glob.glob(p.f("thumbs", "raw", "?t.jpg")):
    package._fit(Image.open(f)).convert("RGB").save(p.f("thumbs", os.path.basename(f)), quality=90)
pick = p.f("thumbs", "pick.md")
if len(sys.argv) > 2:
    shutil.copy(sys.argv[2], pick)
package.youtube_md(p)
if os.path.exists(pick):
    open(p.f("out", "youtube.md"), "a", encoding="utf-8").write("\n" + open(pick, encoding="utf-8").read())
print(os.path.basename(proj), "ok")
