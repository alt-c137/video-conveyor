# STATUS — что сейчас (обновляй в конце каждой сессии)

Обновлено: 2026-10-25, Claude Opus 5.5.

## Сейчас
- Канал **logic_psyche** (Logic of the Psyche, https://www.youtube.com/@badass05): 5 видео по 14–15.4 мин,
  сценарий + проверка + озвучка (Then Life 2) + Whisper + раскадровка готовы. Все 5 **ждут картинки** (этап images).
  Точные цифры: `python stages.py status`.
- Промты для картинок: `projects/logic_psyche/0N_*/prompts_lines.txt` (1 строка = 1 промт) — формат с «the host».

## Ждёт человека
1. Картинки. Вариант А (сейчас основной): secretslider.com → «Слайды с 1 персонажем» → Персонаж = `ава.png` →
   вставить `prompts_lines.txt` видео → скачать ZIP в Загрузки. Конвейер сам узнает видео по числу кадров и продолжит.
   Вариант Б: Flow Batch Multi 2.7.0 (⟳ в chrome://extensions + галочка «🏭 Конвейер видео»).
2. После готовых видео — публикация (агент не публикует).

## Следующие шаги агента
- Когда кадры придут: апскейл → монтаж (`edit`) → посмотреть `out/check_sheet.jpg` → рендер. Сделать 3–6 авторских
  HyperFrames-вставок на видео (`docs/MONTAGE.md` §4), если есть время.
- Тем в плане больше нет → сделать анализ: `python stages.py analyze logic_psyche 10` и проверить темы на дубли
  с уже вышедшими видео (02 частично повторяет вышедшее «Why You Think Everyone Is Looking At You»).
- BACKLOG: `ai/BACKLOG.json`.
