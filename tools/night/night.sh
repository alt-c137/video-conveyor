#!/bin/bash
# Ночная очередь без токенов: как только у проекта готовы картинки — апскейл, монтаж (со слоями), рендер.
# Список night_list.txt перечитывается каждый круг, туда можно дописывать проекты. Выход: файл night_stop.
S="/e/Adobe/Видео ИИ редактор/conveyor/tools/night"
cd "/e/Adobe/Видео ИИ редактор/conveyor"
export TEMP=D:/remotion_tmp TMP=D:/remotion_tmp
st(){ python -X utf8 -c "import json,sys;print(json.load(open(sys.argv[1]+'/state.json',encoding='utf-8'))['stages'].get(sys.argv[2],{}).get('status',''))" "$1" "$2"; }
say(){ echo "[$(date +%H:%M)] $*" >> "$S/night.log"; }
gpu_free(){ ! tasklist 2>/dev/null | grep -qi "whisper.exe"; }

until [ -e "$S/night_stop" ]; do
  did=0
  while read -r P; do
    [ -z "$P" ] && continue
    [ "$(st "$P" images)" = done ] || continue
    [ "$(st "$P" render)" = done ] && continue
    [ -e "$P/night_failed" ] && continue
    if [ "$(st "$P" edit)" != done ]; then
      until gpu_free; do sleep 30; done
      say "$(basename "$P"): апскейл и монтаж"
      python -X utf8 stages.py auto "$P" upscale edit > "$P/run_edit.out" 2>&1
      if [ "$(st "$P" edit)" != done ]; then
        say "$(basename "$P"): ОШИБКА монтажа: $(tail -1 "$P/run_edit.out" | cut -c1-200)"
        touch "$P/night_failed"; continue
      fi
    fi
    say "$(basename "$P"): рендер"
    bash "$S/render_one.sh" "$P" >> "$S/night.log" 2>&1
    if [ "$(st "$P" render)" = done ]; then say "$(basename "$P"): ГОТОВО"; else say "$(basename "$P"): рендер не вышел"; touch "$P/night_failed"; fi
    did=1
    break
  done < "$S/night_list.txt"
  [ $did = 0 ] && sleep 60
done
