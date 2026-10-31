"""Глубина для кадров: разрезает картинку на фон и передний план, чтобы камера давала параллакс (2.5D),
а персонаж мог выскочить отдельно от фона. Ещё готовит контур для «отрисовки» и точку фокуса для наездов.

python layers.py <папка проекта> [номера кадров]
Результат: <проект>/layers/N_fg.webp, N_bg.jpg, N_line.webp и layers.json {N: {"focus": [x, y], "area": доля}}.
Обработанные кадры не трогает, можно перезапускать. Если вырезать нечего, кадр просто остаётся плоским."""
import glob, json, os, sys
os.environ.setdefault("U2NET_HOME", "D:/u2net")
import cv2
import numpy as np
from PIL import Image

MODEL = "isnet-anime"  # плоский мультик вырезает чище, чем u2net
W_MASK, W_FILL = 1024, 640
AREA = (0.025, 0.62)  # меньше — нечего двигать, больше — кадр весь «передний план»


def _session():
    from rembg import new_session
    return new_session(MODEL)


def _mask(im, ses):
    from rembg import remove
    small = im.resize((W_MASK, round(im.height * W_MASK / im.width)), Image.LANCZOS)
    m = np.array(remove(small, session=ses, only_mask=True, post_process_mask=True))
    m = cv2.resize(m, im.size, interpolation=cv2.INTER_CUBIC)
    n, lab, st, _ = cv2.connectedComponentsWithStats((m > 128).astype(np.uint8), 8)
    keep = np.zeros_like(m)
    for i in range(1, n):  # крошки-острова дают мусор на параллаксе
        if st[i, cv2.CC_STAT_AREA] > m.size * 0.004:
            keep[lab == i] = 255
    return cv2.GaussianBlur(cv2.bitwise_and(m, cv2.dilate(keep, np.ones((9, 9), np.uint8))), (3, 3), 0)


def _fill(rgb, m):
    """Фон без объекта: каждую строку дыры тянем от левого края к правому. Плоским заливкам и горизонталям (стол, пол, стена)
    это подходит лучше обычного inpaint: нет мазни и призрачного контура."""
    h, w = rgb.shape[:2]
    sw, sh = W_FILL, round(h * W_FILL / w)
    hole = cv2.dilate((m > 30).astype(np.uint8), np.ones((37, 37), np.uint8))
    sm = cv2.resize(rgb, (sw, sh), interpolation=cv2.INTER_AREA).astype(np.float32)
    hs = cv2.resize(hole, (sw, sh), interpolation=cv2.INTER_NEAREST) > 0
    for y in range(sh):
        x = 0
        while x < sw:
            if not hs[y, x]:
                x += 1
                continue
            e = x
            while e < sw and hs[y, e]:
                e += 1
            l, r = sm[y, x - 1] if x else None, sm[y, e] if e < sw else None
            l, r = (r if l is None else l), (l if r is None else r)
            if l is None:
                l = r = sm[y].mean(axis=0)
            sm[y, x:e] = l + (r - l) * (np.arange(e - x)[..., None] + 1) / (e - x + 1)
            x = e
    v = cv2.GaussianBlur(sm, (0, 0), 2.2)
    sm[hs] = v[hs]
    big = cv2.resize(sm, (w, h), interpolation=cv2.INTER_CUBIC)
    a = cv2.GaussianBlur(hole.astype(np.float32) * 255, (0, 0), 4)[..., None] / 255
    return np.clip(rgb * (1 - a) + big * a, 0, 255).astype(np.uint8)


def _line(rgb):
    """Контур как перо: тонкие тёмные линии и границы цветов, крупные тёмные заливки (тёмная кофта, ночь) убираем."""
    g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41))
    ink = (g < 82).astype(np.uint8) * 255
    thin = cv2.subtract(ink, cv2.morphologyEx(ink, cv2.MORPH_OPEN, k))
    edge = cv2.Canny(cv2.GaussianBlur(g, (5, 5), 0), 34, 95)
    a = cv2.GaussianBlur(cv2.dilate(cv2.max(thin, edge), np.ones((2, 2), np.uint8)), (3, 3), 0)
    out = np.dstack([np.full_like(a, 34), np.full_like(a, 30), np.full_like(a, 28), a])
    return Image.fromarray(out, "RGBA")


def _focus(m):
    """Куда наезжать: верх самой большой фигуры (голова), а не центр массы."""
    ys, xs = np.nonzero(m > 128)
    if not len(ys):
        return [0.5, 0.45]
    top, bot = ys.min(), ys.max()
    head = ys < top + (bot - top) * 0.32
    return [round(float(xs[head].mean() / m.shape[1]), 3), round(float((top + (bot - top) * 0.16) / m.shape[0]), 3)]


def run(proj, only=None, log=print):
    src = os.path.join(proj, "images_2x")
    if not os.path.isdir(src):
        src = os.path.join(proj, "images")
    out = os.path.join(proj, "layers")
    os.makedirs(out, exist_ok=True)
    jf = os.path.join(proj, "layers.json")
    res = json.load(open(jf, encoding="utf-8")) if os.path.exists(jf) else {}
    ses = None
    files = sorted(glob.glob(os.path.join(src, "*.*")), key=lambda f: int("".join(c for c in os.path.basename(f).split(".")[0] if c.isdigit()) or 0))
    done = 0
    for f in files:
        n = "".join(c for c in os.path.basename(f).split(".")[0] if c.isdigit())
        if not n or n in res or (only and n not in only):
            continue
        ses = ses or _session()
        im = Image.open(f).convert("RGB")
        m = _mask(im, ses)
        rgb = np.array(im)
        area = float((m > 128).mean())
        _line(rgb).save(os.path.join(out, f"{n}_line.webp"), quality=80, method=2)
        if AREA[0] <= area <= AREA[1]:
            Image.fromarray(np.dstack([rgb, m]), "RGBA").save(os.path.join(out, f"{n}_fg.webp"), quality=90, method=2)
            Image.fromarray(_fill(rgb, m)).save(os.path.join(out, f"{n}_bg.jpg"), quality=90)
            res[n] = {"focus": _focus(m), "area": round(area, 3)}
        else:
            res[n] = {"focus": [0.5, 0.42], "area": round(area, 3), "flat": True}
        done += 1
        if done % 20 == 0:
            json.dump(res, open(jf, "w", encoding="utf-8"))
            log(f"слои: {done}")
    json.dump(res, open(jf, "w", encoding="utf-8"))
    log(f"Слои: готово {len(res)}, плоских {sum(1 for v in res.values() if v.get('flat'))}")
    return res


if __name__ == "__main__":
    run(sys.argv[1], set(sys.argv[2:]) or None)
