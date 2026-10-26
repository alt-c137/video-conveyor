#!/bin/bash
# озвучка+whisper по очереди (видеокарта занята рендером), сцены — параллельно по мере готовности
cd "/e/Adobe/Видео ИИ редактор/conveyor"
for d in projects/brand_couch/0*/; do
  python stages.py auto "$d" tts whisper >> "$d/run_av.out" 2>&1
  nohup python stages.py auto "$d" scenes >> "$d/run_scenes.out" 2>&1 &
done
wait
