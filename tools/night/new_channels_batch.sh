#!/bin/bash
# Первое видео на каждый новый канал (ноябрь 2026): new -> script -> check -> tts -> whisper -> scenes. Картинки/рендер — отдельно.
cd "/e/Adobe/Видео ИИ редактор/conveyor"
for ch in creepy_animals entire_history body_explained weird_geography how_its_built business_collapse forgotten_inventors deep_ocean quiet_wealth food_origins; do
  P=$(ls -d projects/$ch/01_* 2>/dev/null | head -1)
  if [ -z "$P" ]; then m=$(python -X utf8 -c "import json;print(json.load(open('channels/$ch/channel.json',encoding='utf-8'))['minutes'][1])"); python -X utf8 stages.py new $ch 1 $m >/dev/null 2>&1; P=$(ls -d projects/$ch/01_* | head -1); fi
  for st in script check tts whisper scenes; do
    s=$(python -X utf8 -c "import json;print(json.load(open('$P/state.json',encoding='utf-8'))['stages']['$st']['status'])")
    [ "$s" = "done" ] && continue
    echo "$(date +%H:%M) $ch $st"; python -X utf8 stages.py $st "$P" >> "$P/run_batch.out" 2>&1 || { echo "$(date +%H:%M) FAIL $ch $st"; break; }
  done
done
echo "$(date +%H:%M) ALL DONE"
