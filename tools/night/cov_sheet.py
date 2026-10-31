"""Лист всех 8 вариантов обложки проекта для просмотра. python cov_sheet.py <проект> <out.jpg>"""
import sys
from PIL import Image
p, out = sys.argv[1].rstrip("/"), sys.argv[2]
keys = ("A", "B", "C", "D", "At", "Bt", "Ct", "Dt")
sh = Image.new("RGB", (480 * 4, 270 * 2), "white")
for i, k in enumerate(keys):
    sh.paste(Image.open(f"{p}/thumbs/raw/{k}.jpg").convert("RGB").resize((480, 270)), ((i % 4) * 480, (i // 4) * 270))
sh.save(out, quality=82)
