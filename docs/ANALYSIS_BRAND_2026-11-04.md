# Анализ канала Brand on the Couch (@WhyWeChoosehq), 04.11.2026

Источник: YouTube Studio → Аналитика → Расширенный режим, «всё время», аккаунт obeme (роль Менеджер; переключить канал:
youtube.com/account → «Все каналы» → Brand on the Couch, или сразу URL со своим channel id).
Канал: `UCSyWiYsGB4x5kgMAWecROdA`, 11 подписчиков, 1473 просмотра, 11.6k показов, CTR 4.4 %, ср. просмотр 3:25.
Повторить: открыть ссылку ниже, подождать ~10 с, таблицу читать JS-ом по строкам `yta-explore-table-row`
(страница тяжёлая, скриншот часто виснет, get_page_text пустой).
`https://studio.youtube.com/channel/UCSyWiYsGB4x5kgMAWecROdA/analytics/tab-content/period-default/explore?entity_type=CHANNEL&entity_id=UCSyWiYsGB4x5kgMAWecROdA&time_period=lifetime&explore_type=TABLE_AND_CHART&metric=VIEWS&t_metrics=VIEWS&t_metrics=VIDEO_THUMBNAIL_IMPRESSIONS&t_metrics=VIDEO_THUMBNAIL_IMPRESSIONS_VTR&t_metrics=AVERAGE_WATCH_TIME&t_metrics=AVERAGE_WATCH_PERCENTAGE&t_metrics=SUBSCRIBERS_NET_CHANGE&dimension=VIDEO&o_column=VIEWS&o_direction=ANALYTICS_ORDER_DIRECTION_DESC`
(для источников трафика `dimension=TRAFFIC_SOURCE_TYPE`, для стран `dimension=COUNTRY`).

## Цифры по роликам
| Ролик | Длит. | Просм. | Показы | CTR | Ср. просмотр | % | Чей |
|---|---|---|---|---|---|---|---|
| Why You REALLY Chose BMW, Mercedes, or Audi | 9:56 | 641 | 4459 | **6.2 %** | 3:18 | 33 % | владельца |
| 5 Types of Men Who Drive Grey Cars (Which One Are You?) | 15:56 | 209 | 2277 | 3.3 % | 4:27 | 28 % | владельца |
| Why Every Car Seems to Have a Face (and a Mood) | 10:21 | 172 | 979 | 2.0 % | **0:43** | **7 %** | наш 01 (с приветствием) |
| The Psychology of People Who Drive Red Cars | 8:32 | 114 | 922 | 3.7 % | 3:23 | 40 % | владельца |
| Why So Many Millionaires Drive Boring Cars | 9:59 | 106 | 605 | 2.6 % | 2:50 | 28 % | наш 05 |
| What Your Car Says About You (It's Not Flattering) | 7:19 | 89 | 676 | 5.8 % | 2:55 | 40 % | владельца |
| Psychology of People Who Buy Cars They Can't Really Afford | 9:49 | 82 | 477 | **6.7 %** | 3:42 | 38 % | владельца |
| Why He Stopped Posting: 3 Types | 14:35 | 31 | 697 | 2.3 % | 5:08 | 35 % | владельца |
| People Who Fix Instead of Replace Aren't Cheap | 17:03 | 10 | 365 | **0.6 %** | 1:14 | 7 % | наш 08, 1 день |
| Why Do White Car Owners Keep Them So Clean? | 9:51 | 5 | 40 | 2.5 % | 8:08 | 83 % | наш 03 |
| What Does Driving an Old Car Really Say About You? | 10:22 | 4 | 50 | 0 % | — | — | наш 02 |
| Why Luxury Logos Get Smaller as Prices Get Bigger | 10:17 | 4 | 30 | 3.3 % | 0:30 | 5 % | наш 04 |
| Why Do the Rich Pay Extra for No Logo? (владелец сменил на «Why You Really Buy Plain Sneakers») | 17:53 | 2 | 18 | 0 % | — | — | наш 06, 1 день |

Источники трафика: главная («Функции выбора») 63 %, похожие видео 25 %, поиск 7 % (у поиска CTR 7.8 %). США 7.5 %, остальное
размазано. Наш ролик 07 «Kept the Old Car vs Upgraded» ещё НЕ выложен (готов в `projects/brand_couch/07_*`).
Обложки всех роликов: лист в scratchpad сессии `bthumbs/sheet.jpg` (собирается yt-dlp --flat-playlist + i.ytimg.com/vi/ID/mqdefault.jpg).

## Что это значит
1. **Канал живёт на главной.** YouTube показывает новые ролики тем, кто смотрел BMW/Mercedes/Audi. Новые темы держим в
   том же кластере: **марка / цвет / тип машины → что это говорит о ТЕБЕ** (мужчина 35–65). Уход в кроссовки и логотипы
   (наши 04, 06) показов почти не получил: алгоритм не знает, кому их показать.
2. **Обложка решает больше всего.** CTR 5.8–6.7 % только у обложек с **узнаваемой машиной конкретной марки** (решётка BMW,
   Porsche, Mercedes), детальной сценой (гараж, шоурум, закат), ведущим, который спокойно стоит рядом, и вопросом к зрителю
   (WHICH ONE ARE YOU? / YOU CAN'T AFFORD THIS / IT'S NOT JUST A CAR). Наши 2–3 % и ниже: плоский минимализм, абстрактный
   предмет (кроссовок под стеклом, «DAD WON»). Худшая 0.6 %: «CASH TRAP!» с орущим ведущим. Это кликбейт-паника,
   и она спорит с заголовком «Aren't Cheap»: мужчине 35+ нужна гордость, а не испуг.
3. **Заголовок.** Лучшие: «Why You REALLY Chose …», «Psychology of People Who …», «… (Which One Are You?)», прямо «ты» и марка.
   Наши «Why Luxury Logos Get Smaller…», «Why Do the Rich Pay Extra…» звучат как лекция о чужих людях.
4. **Первые 30–60 с.** У нашего 01 средний просмотр 43 с из 10 мин: уходили на приветствии (с 29.10 вырезается, правило в промптах).
   У новых 17-минутных (06, 08) данных 2–10 просмотров, выводы рано. Удержание у роликов владельца 28–40 %, это норма.
5. **Аудиторию YouTube ещё ищет:** 11 подписчиков, 1–2 дня у новых роликов, первые 300 показов случайные. Поэтому не
   разбрасываем темы: каждый новый ролик — «родственник» BMW-ролика, тогда главная подхватит.

## Уязвимости и что сделано в новых роликах (с 04.11)
| Уязвимость | Исправление |
|---|---|
| Темы вне кластера | 7 новых тем (n 12, 14, 15, 16, 18, 19, 20 в topics.json): Toyota, чёрные машины, пикап после 40, механика, знают каждую машину, старый люкс, платят наличными |
| Плоские абстрактные обложки | `prompts/package.md`, блок «Brand: что кликают»: детальная сцена, крупная узнаваемая машина конкретной марки, ведущий спокоен или горд, 2–4 слова-вопрос к зрителю, без паники и денежных взрывов |
| Заголовок-лекция | формула «Why You REALLY …» / «The Psychology of People Who …» / «5 Types of Men Who … (Which One Are You?)», марка в заголовке |
| Монтаж «слайд-шоу» | этап `montage` (сценарий монтажа по смыслу) + FX-слой, docs/MONTAGE.md |
| Публикация | отложенные, по одной в день, 15:00 по Нью-Йорку (США — главный рынок рекламы) |
| SEO | первая строка описания повторяет обещание заголовка, главы, теги: марка + car psychology + тема |

## Рынок (подробно docs/COMPETITORS.md)
Мелкие безликие каналы (Nous Psychology 29k, The Gen X Way 10k, Throttle Psychology 21k) берут 200–800 тыс. одной темой про
человека, который держит старое, чинит сам, платит сам, не играет в статус. Зритель хочет, чтобы его **поняли и уважали**.
Вступление у всех: сразу в сцене, 3–5 узнаваемых деталей, «This is not X. Not exactly.», обещание глубже, без приветствия.
Замечание: наш 08 начинается почти слово в слово как у Nous Psychology («knuckles are scraped… grease under fingernails…
This is not stubbornness. Not exactly.»). Каркас брать можно, фразы — нет: в новых сценариях свои детали.
