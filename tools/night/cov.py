"""Промты обложек из youtube.md проектов в один файл по порядку A B C D At Bt Ct Dt. python cov.py <out.txt> <проект>..."""
import re, sys
out, projs = sys.argv[1], sys.argv[2:]
res = []
for p in projs:
    s = open(p + "/out/youtube.md", encoding="utf-8").read()
    d = {m.group(1): m.group(2).strip() for m in re.finditer(r"^(A|B|C|D|At|Bt|Ct|Dt)\. (.+)$", s, re.M)}
    res += [d[k] for k in ("A", "B", "C", "D", "At", "Bt", "Ct", "Dt")]
open(out, "w", encoding="utf-8").write("\n".join(res))
print(len(res), max(map(len, res)))
