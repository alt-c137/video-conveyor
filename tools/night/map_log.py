"""Достаёт карту кадров задачи из журнала сессии, чтобы не перепечатывать 176 хэшей. python map_log.py <task> <out.txt>"""
import re, sys
task, out = sys.argv[1:3]
LOG = "C:/Users/Shoha/.claude/projects/E--Adobe-ilm4-flow-batch-extension/902807be-0708-4320-9379-0a36e1382656.jsonl"
tag = "MAP" + task + " "
best = ""
with open(LOG, encoding="utf-8") as f:
    for line in f:
        if tag in line:
            best = line[line.index(tag):]
pairs = re.findall(r"(\d+) ([0-9a-f]{32}\.\w+)", best)
open(out, "w", encoding="utf-8").write(";".join(f"{a} {b}" for a, b in pairs))
print(task, len(pairs))
