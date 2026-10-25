"""Сборка промтов и раскадровки для видео канала.

Использование:
  python build_shots.py --transcript X.json --scenes scenes.tsv --out OUT_DIR [--prompts existing.txt]

scenes.tsv — по строке на кадр: start_sec<TAB>scene<TAB>overlay
  scene может содержать {M} (главный герой) и {W} (героиня).
  Если передан --prompts (уже готовые промты "N. ..."), колонку scene можно оставить пустой —
  промт берётся из файла по номеру строки.
"""
import argparse, json, os, re

M = "the main character, a man in a charcoal coat"
W = "a woman in a beige coat"
HEAD = "Flat vector cartoon style. LOCATION: {loc}. SCENE: "
TAIL = (" Flat vector cartoon style. All characters (main and background) drawn with plain round heads, "
        "small simple black dot eyes, a simple straight-line mouth, minimal facial features, no detailed hair, "
        "flat cartoon style. No text, no captions, no titles. 16:9.")
DEFAULT_LOC = "a plain neutral background, soft even light"
MOTIONS = ["zoomIn", "panLeft", "zoomOut", "panRight"]


def load_existing(path):
    txt = open(path, encoding="utf-8").read()
    parts = re.split(r"(?m)^\s*(\d+)[.)]\s+", txt)
    return {int(parts[i]): parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--scenes", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--prompts")
    a = ap.parse_args()

    end_total = json.load(open(a.transcript, encoding="utf-8"))["segments"][-1]["end"]
    rows = []
    for line in open(a.scenes, encoding="utf-8"):
        if not line.strip() or line.startswith("#"):
            continue
        cols = line.rstrip("\n").split("\t") + ["", ""]
        rows.append((float(cols[0]), cols[1].strip(), cols[2].strip()))
    rows.sort(key=lambda r: r[0])
    existing = load_existing(a.prompts) if a.prompts else {}

    os.makedirs(a.out, exist_ok=True)
    shots, numbered = [], []
    for i, (t, scene, ov) in enumerate(rows):
        n = i + 1
        end = rows[i + 1][0] if i + 1 < len(rows) else end_total
        if scene:
            loc = DEFAULT_LOC
            m = re.match(r"LOC:\s*(.+?)\s*\|\s*(.+)", scene)  # "LOC: kitchen at night | scene..."
            if m:
                loc, scene = m.group(1), m.group(2)
            s = scene.replace("{M}", M).replace("{W}", W)
            prompt = HEAD.format(loc=loc) + s[0].upper() + s[1:].rstrip(".") + "." + TAIL
        else:
            prompt = existing.get(n, "")
            if not prompt:
                print(f"!! shot {n}: no scene and no existing prompt")
        motion = "zoomIn" if (ov.upper().startswith("LAW") or end - t < 1.8) else MOTIONS[i % 4]
        shots.append({"id": n, "file": f"{n:03d}.png", "start": round(t, 2), "end": round(end, 2),
                      "duration": round(end - t, 2), "motion": motion, "overlay": ov, "prompt": prompt})
        numbered.append(f"{n}. {prompt}")

    open(os.path.join(a.out, "prompts_numbered.txt"), "w", encoding="utf-8").write("\n\n".join(numbered) + "\n")
    json.dump(shots, open(os.path.join(a.out, "shotlist.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    long_ = [s["id"] for s in shots if s["duration"] > 5.5]
    print(f"{len(shots)} shots, video {end_total:.1f}s, avg {end_total/len(shots):.2f}s/shot")
    if long_:
        print("!! shots longer than 5.5s:", long_)
    if existing and len(existing) != len(shots):
        print(f"!! existing prompts {len(existing)} != shots {len(shots)}")


if __name__ == "__main__":
    main()
