# Конкуренты и что залетает — анализ 2026-10-29

Метод: yt-dlp, последние ~150 роликов канала, **x = просмотры / медиана канала**. x ≥ 3 значит, что залетела сама идея.
Сырые данные лежат в scratchpad сессии: brand_ch.json, logic_ch.json, субтитры первых 45 с в subs/.
Повторить: `python stages.py analyze <канал>`, конкуренты теперь вписаны в `channel.json → competitors`.

## Brand on the Couch (@WhyWeChoosehq): машины, бренды, деньги

| Канал | Подписчики | Медиана | Хиты (x) |
|---|---|---|---|
| Nous Psychology | 29k | 0.9k | Would Rather Fix Than Replace 642k (x703) · Know How To Work On Cars 620k · Modify Their Cars 407k · Drive Old Luxury Cars 259k · Keep Cars Spotless 114k |
| The Gen X Way | 10k | 1.1k | Upgrading vs Kept Old Car, 20 Years Later 800k (x727) · Driving The Same Car For 10 Years Says A Lot 734k · Still Driving Manual 239k · Keep Fixing Old Cars 211k |
| Throttle Psychology | 21k | 10k | Ride Motorcycles (Despite the Warnings) 402k · Why Men Want a Motorcycle After 40 235k |
| Unf*ck Everything | 75k | 3.9k | People Who Are Lazy but Ambitious 2.7M |

**Вывод.** Маленькие безликие каналы набирают по 200–800 тыс. на одной теме: **человек держит старое, чинит сам, не играет
в статус, платит сам**. Аудитория — мужчины 35–65 лет. Они устали, что их считают жадными или упрямыми, и смотрят, когда их
**защищают и уважают**. Цвет машины и логотипы — слабее (наши 01/03/04). Сильнее всего у нас ролик BMW/Mercedes/Audi (503),
это тот же «статусный» кластер.
Наши 02 (одна машина 10 лет) и 05 (богатые на скучных машинах) попадают прямо в эту жилу — их выкладывать первыми.

## Logic of the Psyche (@badass05): мышление, искажения

| Канал | Подписчики | Медиана | Хиты (x) |
|---|---|---|---|
| PsychToons | 211k | 4.5k | Psychology of Discipline 4.3M · Intelligence 3.3M · Polymaths 3.2M · People Who Go Quiet When They're Hurt 2.3M · Mechanical Intelligence 1.3M |
| Psychology Simplified | 274k | 14k | Psychology of Gen X 3.4M · Love Staying At Home 3.1M · Don't Obsess Over Sports 3.0M · Know How To Fix Everything 659k |
| Better Than Yesterday | 2.6M | 297k | Dopamine detox 28M · Dunning-Kruger (animated) 4.8M |

**Вывод.** Залетает не «объяснение искажения», а **узнай себя**: «Psychology of People Who…» про тихих, одиночек,
мастеров на все руки. Плюс обещание силы: «so calm it makes people nervous». Наши заголовки звучат как лекция
(«Why Smart People Believe Wrong Things»). Искажение оставляем как начинку, а снаружи подаём через человека:
«The Psychology of People Who Fix Everything Themselves» (IKEA effect).

## Почему уходят в первые 30–60 с (наш Brand 01)

Начало у всех четырёх конкурентов (субтитры, первые 45 с):
1. **Сразу внутри сцены** в настоящем времени, 3–5 деталей, которые узнаёшь: «His knuckles are scraped. Grease under his
   fingernails that will not fully wash out»; «They know exactly how hard to close the driver's side door».
2. **Снимают ярлык**: «This is not stubbornness. Not exactly.» / «They're not reckless.»
3. **Обещают глубже**: «Something older, quieter, and far more psychologically interesting…»
4. **Сразу дальше по сути.** Ни приветствия, ни просьбы подписаться, ни плана «today you will learn 1, 2, 3».

У нас на 0:40–1:10 стоял блок «Welcome back to Brand on the Couch… subscribe… By the end you will know…» — 22–30 с
разговора о видео. Исправлено: правило в `prompts/script.md` и `check.md`, автопроверка в `stages.py mech_issues`,
оценки `hook_score` и `interest_score` (ниже 8 — переписать). Уже озвученные ролики чинятся без переозвучки:
`python stages.py cut <проект> welcome`.

Оговорка: каналам по 6–10 подписчиков, YouTube ещё ищет им зрителя. Первые 100–300 показов — случайные люди, и удержание
у них ниже. Но вступление без воды помогает при любом зрителе.

## Превью (что видно у лидеров)
Одна крупная фигура, 2–3 цвета, 2–3 слова, которые **не повторяют заголовок**, эмоция на лице. Наши A–D уже так
сделаны (`prompts/package.md`). Для «мужского» кластера: старая машина или гараж с инструментами крупно, ведущий
гордый или спокойный, а не испуганный.
