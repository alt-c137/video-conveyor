# Конвейер: этапы и файлы

Видео = папка `projects/<канал>/NN_slug/`. Состояние — `state.json` (этапы todo/running/done/error, pid), лог — `log.txt`.
Этапы идут по порядку; перезапуск этапа сам сбрасывает следующие (старые файлы переименовываются, не удаляются).

| # | Этап | Что делает | Вход → выход | ИИ |
|---|---|---|---|---|
| 0 | analyze | YouTube-данные канала, конкурентов, поиска (yt-dlp, без ключа) → темы | channel.json → topics.json | да |
| 1 | script | сценарий по теме | topics.json → script.md, narration.txt, sections.json | да |
| 2 | check | до 3 раундов: проверка (халяль, акида, факты, крючки, длина) → правка | → check_N.json, обновлённый script | да |
| 3 | tts | Fish Audio (голос канала), куски ~1800 симв., склейка ffmpeg | narration.txt → tts/, voice.mp3 | — |
| 4 | whisper | слова с таймингами (GPU) | voice.mp3 → transcript.json, words.txt | — |
| 5 | scenes | мотивы видео + кадр каждые ~2.6 с, промты | → motifs.json, scenes_parts/, shotlist.json, prompts_numbered.txt, prompts_lines.txt | да |
| 6 | images | ждёт кадры: Flow-расширение или ZIP/папка из Загрузок | → images/N.jpg | — |
| 7 | upscale | Upscayl CLI, модель digital-art-4x, ×2 (≈2.7K) | images/ → images_2x/N.png | — |
| 8 | edit | ИИ выбирает код-сцены по транскрипту (каждые ~18 с), подписи, разделы, CTA, SFX | → edit.json, out/check_sheet.jpg | да |
| 9 | render | Remotion 2560×1440, 30 fps, голос +4.8 дБ | edit.json → out/final.mp4 | — |

## Команды
```
python stages.py status                         # сводка → ai/STATUS_PROJECTS.md
python stages.py analyze <канал> 10             # новые темы
python stages.py new <канал> <n темы> [минуты]  # создать видео
python stages.py auto <проект> [от] [до]        # этапы подряд (например: auto <проект> images render)
python stages.py <этап> <проект>                # один этап
python stages.py import <проект> <zip|папка>    # вручную подложить кадры
python server.py                                # панель http://127.0.0.1:8765 (+ авто-приём ZIP раз в минуту)
```
Автопилот в панели: «🚀 Автопилот» = анализ (если тем мало) → N новых видео → всё до рендера.

## Длина и темп
Цель = минуты × `wpm` канала (Then Life 2 ≈ 185). `check` подгоняет длину ±12 %. Канал: `minutes: [13, 16]`.
Человек может задать минуты при создании; иначе берётся середина диапазона канала.

## Ключевые файлы проекта
- `script.md` — `===TITLE===`, `===SCRIPT===` с `[SECTION: имя]`, `===SELFCHECK===`. Править можно руками (панель → файл),
  затем перезапустить с `check` или `tts`.
- `shotlist.json` — `{id, file: "N.png", start, end, duration, overlay, prompt}`; кадр N ↔ промт N ↔ файл N.
- `edit.json` — весь монтаж (см. docs/MONTAGE.md). `edit_extra.json` — авторские сцены поверх автоматических.
- `flow_job.json` — задание для расширения Flow (taken/done/left/finished).

## Этапы, где нужен человек
Только картинки (если не настроено расширение) и публикация. Всё остальное — агент/конвейер.
