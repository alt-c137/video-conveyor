#!/bin/bash
# $1 = project path under conveyor. One render at a time (shared lock), up to 3 tries on browser timeouts.
cd "/e/Adobe/Видео ИИ редактор/conveyor"
P=$1; L=/d/remotion_tmp/logic_render.lock
until mkdir $L 2>/dev/null; do sleep 60; done
for t in 1 2 3; do
  REMOTION_CONCURRENCY=6 python -X utf8 stages.py render $P > $P/run_render2.out 2>&1 && break
  sleep 30
done
rmdir $L
echo "$(basename $P) try $t: $(grep -E 'Готово|ВНИМАНИЕ|Картинки в|Error' $P/run_render2.out | tail -3 | tr '\n' ' ')"
S="/e/Adobe/Видео ИИ редактор/conveyor/tools/night"
python -X utf8 "$S/pick.py" "$P" 2>&1 | tail -2 | cut -c1-100
python -X utf8 "$S/peek.py" "$P" "$P/out/peek.jpg" 2>&1 | tail -1 | cut -c1-120
