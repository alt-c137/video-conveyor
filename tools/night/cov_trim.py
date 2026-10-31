"""Укорачивает промты обложек до лимита 1000: снимает последние предложения описания (цвет, композиция), сцену и заголовок не трогает."""
import re, sys
f = sys.argv[1]
L = open(f, encoding="utf-8").read().split("\n")
for n, l in enumerate(L):
    if len(l) <= 985:
        continue
    i = l.find(" Big bold")
    if i < 0:
        i = l.rfind(" No ") if " No " in l else l.rfind(" 16:9")
    head, tail = l[:i], l[i:]
    s = re.split(r"(?<=\.) ", head)
    cut = []
    while len(" ".join(s)) + len(tail) > 985 and len(s) > 3:
        cut.append(s.pop())
    L[n] = " ".join(s) + tail
    print(n, len(l), "->", len(L[n]), "| снято:", " / ".join(x[:60] for x in cut))
open(f, "w", encoding="utf-8").write("\n".join(L))
print(len(L), max(map(len, L)))
