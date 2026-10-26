"""Упаковка видео для YouTube: заголовки, 4 превью (A-D), описание с главами, теги, закреп.

  python stages.py package <проект>   — ИИ пишет package.json, код собирает out/youtube.md и thumbs/prompts.txt
  python stages.py thumbs <проект>    — когда картинки лежат в thumbs/raw/A.jpg..D.jpg: текст поверх -> thumbs/A.jpg..,
                                        лист проверки thumbs/sheet.jpg (крупно + как в мобильной ленте, 160 px)
Картинки превью: secretslider «Слайды с 1 персонажем» + style_ref канала, строки из thumbs/prompts.txt
(или Flow). Их генератор «Превью» не берём: он рисует фото-лица, а у нас мультяшный стиль с глазами-точками.
"""
import glob, json, os
import core
from core import llm, prompt, rj, wj, wt

FONT = os.path.join(core.ROOT, "assets", "fonts", "Anton-Regular.ttf")
W, H = 1280, 720


def script_text(p):
    s = rj(p.f("sections.json"), {})
    return "\n\n".join(f"[{x['name']}]\n{x['text']}" for x in s.get("sections", []))


def plan(p, log=print):
    ch, t = p.channel, p.state["topic"]
    out = llm(prompt("package", channel_name=ch["name"], niche=ch["niche"], audience=ch["audience"],
                     title=p.state.get("title") or t["title"], angle=t.get("angle", ""),
                     script=script_text(p)[:30000], rules=core.rt(os.path.join(core.PROMPTS, "rules.md"))),
              stage="package", log=log)
    pk = core.extract_json(out)
    wj(p.f("package.json"), pk)
    os.makedirs(p.f("thumbs", "raw"), exist_ok=True)
    wt(p.f("thumbs", "prompts.txt"), "\n".join(x["image_prompt"].replace("\n", " ") for x in pk["thumbs"]) + "\n")
    youtube_md(p, log)
    return pk


def chapters(p):
    """Главы из разделов монтажа: YouTube требует первую 0:00, минимум 3 главы, каждая >= 10 с."""
    secs = rj(p.f("edit.json"), {}).get("sections") or []
    out, last = [], -99
    for s in secs:
        t = 0 if not out else s["start"]
        if t - last < 10:
            continue
        out.append(f"{int(t // 60)}:{int(t % 60):02d} {s['title']}")
        last = t
    return out if len(out) >= 3 else []


def youtube_md(p, log=print):
    pk = rj(p.f("package.json"))
    ch = chapters(p)
    desc = pk["description"].strip()
    if ch:
        desc += "\n\nChapters:\n" + "\n".join(ch)
    tags = ", ".join(pk["tags"])
    md = [f"# Публикация: {p.state.get('title') or p.state['topic']['title']}", "",
          "## Название (выбери одно, первое — лучшее)", *[f"{i}. {x}" for i, x in enumerate(pk["titles"], 1)], "",
          "## Описание (вставить целиком)", "```", desc, "", " ".join(pk.get("hashtags", [])), "```", "",
          f"## Теги ({len(tags)} симв., поле «Теги»)", "```", tags, "```", "",
          "## Закреплённый комментарий", "```", pk.get("pinned_comment", ""), "```", "",
          "## Превью (A-D: загрузи 3 лучших в «Тест и сравнение» YouTube Studio)",
          *[f"- **{x['id']}** «{x['text']}» — {x['idea']}" for x in pk["thumbs"]], "",
          "### Промты обложек (secretslider «1 персонаж» + персонаж канала; без текста — текст кладёт `stages.py thumbs`)",
          *[f"{x['id']}. {x['image_prompt']}" for x in pk["thumbs"]], "",
          "### Те же, но генератор сам пишет текст (вариант на сравнение)",
          *[f"{x['id']}t. " + x['image_prompt'].replace("No text, no letters, no logos.", "").replace(" 16:9.", "")
            + f' Big bold all-caps headline text "{x["text"]}" in a heavy condensed font, white with a thick black outline,'
            + f' the word "{x.get("accent", "")}" in bright yellow, placed on the {x.get("text_side", "left")} third. 16:9.'
            for x in pk["thumbs"]], "",
          "Файлы: `thumbs/A.jpg`…; лист проверки `thumbs/sheet.jpg`. Видео: `out/final.mp4`."]
    os.makedirs(p.f("out"), exist_ok=True)
    wt(p.f("out", "youtube.md"), "\n".join(md) + "\n")
    log(f"Упаковка: out/youtube.md, {len(pk['thumbs'])} идей превью, глав: {len(ch)}")


def _fit(img):
    """Любой кадр -> 1280x720 по центру (cover)."""
    from PIL import Image
    k = max(W / img.width, H / img.height)
    img = img.convert("RGB").resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    x, y = (img.width - W) // 2, (img.height - H) // 2
    return img.crop((x, y, x + W, y + H))


def draw_text(img, text, accent="", side="left"):
    """Крупный текст в 1-2 строки на свободной трети кадра: белый + жёлтое акцентное слово, толстая обводка, тень."""
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    words = text.upper().split()
    lines = [" ".join(words)] if len(words) <= 2 else [" ".join(words[:len(words) // 2]), " ".join(words[len(words) // 2:])]
    box_w = W * 0.46
    size = 240
    while size > 60:
        f = ImageFont.truetype(FONT, size)
        if max(f.getlength(l) for l in lines) <= box_w and size * 1.05 * len(lines) <= H * 0.62:
            break
        size -= 6
    f = ImageFont.truetype(FONT, size)
    lh = round(size * 1.05)
    y0 = (H - lh * len(lines)) // 2 - round(H * 0.04)
    x_left = round(W * 0.04) if side == "left" else round(W * 0.96 - box_w)
    stroke = max(6, size // 14)
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    acc = {w.strip(".,!?").upper() for w in accent.split()}
    for i, line in enumerate(lines):
        lw = f.getlength(line)
        x = x_left + (box_w - lw) / 2
        y = y0 + i * lh
        sd.text((x + 8, y + 10), line, font=f, fill=(0, 0, 0, 170), stroke_width=stroke, stroke_fill=(0, 0, 0, 170))
        for w in line.split(" "):
            col = (255, 214, 0) if w.strip(".,!?") in acc else (255, 255, 255)
            d.text((x, y), w, font=f, fill=col, stroke_width=stroke, stroke_fill=(15, 15, 20))
            x += f.getlength(w + " ")
    img = img.convert("RGBA")
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(8)))
    img.alpha_composite(layer)
    return img.convert("RGB")


def thumbs(p, log=print):
    from PIL import Image, ImageDraw
    pk = rj(p.f("package.json"))
    done = []
    for x in pk["thumbs"]:
        src = (glob.glob(p.f("thumbs", "raw", x["id"] + ".*")) or [None])[0]
        if not src:
            continue
        im = draw_text(_fit(Image.open(src)), x["text"], x.get("accent", ""), x.get("text_side", "left"))
        out = p.f("thumbs", x["id"] + ".jpg")
        im.save(out, quality=90)
        if os.path.getsize(out) > 2_000_000:  # лимит YouTube 2 МБ
            im.save(out, quality=78)
        done.append((x["id"], im))
    if not done:
        log("превью: нет картинок в thumbs/raw (A.jpg..D.jpg)")
        return []
    # лист: сверху крупно 2x2, снизу как в мобильной ленте (160 px) — если там не читается, превью слабое
    big = Image.new("RGB", (W, H + 110), "white")
    for i, (_, im) in enumerate(done[:4]):
        big.paste(im.resize((W // 2, H // 2)), ((i % 2) * W // 2, (i // 2) * H // 2))
    dr = ImageDraw.Draw(big)
    for i, (k, im) in enumerate(done[:4]):
        big.paste(im.resize((160, 90)), (20 + i * 190, H + 10))
        dr.text((20 + i * 190, H + 102 - 8), k, fill="black")
    big.save(p.f("thumbs", "sheet.jpg"), quality=85)
    log(f"Превью: {', '.join(k for k, _ in done)} -> thumbs/, лист thumbs/sheet.jpg")
    return done
