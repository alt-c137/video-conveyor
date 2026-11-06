# 10 новых каналов (ноябрь 2026): купленные аккаунты. «Из 10 выстрелят 2», но каждый делаем на совесть

Метод владельца (от друга): 10 каналов × 3 видео, смотрим, что пошло, и вкладываемся в живые. Сначала по 1 видео на канал, потом по 3.

Как отбирали ниши (06.11):
- Живого поиска не было: лимит 90 %.
- Отбирали форматы, где малые каналы без лица получают миллионы: анимированные объяснялки, высокая RPM в США, вечнозелёные темы.
- Сильные стороны нашего движка: 2D-мульт, карты и глобус, схемы-разрезы, сборка, хост-персонаж.
- Халяль: без ширка, рибы, азарта, алкоголя и свинины, романтики, музыки. У героев точки вместо глаз, скромная одежда.
- Каналы не должны быть похожи друг на друга: разные ниши, разные герои, по возможности разные голоса Fish. Иначе YouTube их свяжет.

**ПОСЛЕ СБРОСА ЛИМИТА:** проверить каждую нишу через vidIQ или поиск Studio на свежие outliers малых каналов. Слабую нишу заменить запасной.

| # | id | Название / хендл | Ниша | Длина | Голос | Первое видео | Статус |
|---|---|---|---|---|---|---|---|
| 1 | `creepy_animals` | **Nature's Nightmares** @NaturesNightmaresHQ | Why is X the most disturbing animal? 5 true facts that get worse as they go, comedy cartoon with a hoodie host. Long 10- | 10–12 мин | Then Life 2 | Why the Hagfish Is the Most Disturbing Animal in the Ocean | нужно: герой, лого, видео 1 |
| 2 | `entire_history` | **History, Simply Told** @HistorySimplyTold | The ENTIRE history of a country/empire/city in one funny animated story, chapters by era, anachronism gags, maps on ever | 14–16 мин | Warm Storyteller | The Entire History of the Mongol Empire, Simply Told | нужно: герой, лого, видео 1 |
| 3 | `body_explained` | **Inside Your Body** @InsideYourBodyHQ | What happens to your body when/if you ... - human body explained with friendly cartoon organs and a curious host; only v | 10–12 мин | Адам | What Happens to Your Body When You Stop Eating Sugar for 30 Days | нужно: герой, лого, видео 1 |
| 4 | `weird_geography` | **Map Logic** @MapLogicHQ | Why does this country/place look like this? Strange borders, empty regions, cities in impossible places - animated maps, | 10–12 мин | Then Life 2 | Why Almost Nobody Lives in 90% of Canada | нужно: герой, лого, видео 1 |
| 5 | `how_its_built` | **Built Impossible** @BuiltImpossible | How did they build that? Mega-projects and everyday engineering step by step (bridges, tunnels, dams, ships), cutaways,  | 10–12 мин | Адам | How Did They Build a Tunnel Under the Ocean? | нужно: герой, лого, видео 1 |
| 6 | `business_collapse` | **Empty Stores** @EmptyStoresHQ | How a famous company died (or almost died): the decisions, the psychology, the lesson - animated business case stories;  | 12–14 мин | Then Life 2 | How Blockbuster Died: The $50 Million Mistake | нужно: герой, лого, видео 1 |
| 7 | `forgotten_inventors` | **Forgotten Genius** @ForgottenGeniusHQ | The forgotten people behind inventions we use every day (who really invented it, no religion topics)  | 12–14 мин | Warm Storyteller | The Forgotten Man Who Invented the Traffic Light | нужно: герой, лого, видео 1 |
| 8 | `deep_ocean` | **Below the Surface** @BelowTheSurfaceHQ | What is really down there? Ocean depths, shipwrecks, trenches and scale comparisons - depth meter, sonar, cutaways. | 10–12 мин | Адам | What's Really at the Bottom of the Mariana Trench | нужно: герой, лого, видео 1 |
| 9 | `quiet_wealth` | **Quiet Wealth** @QuietWealthHQ | Habits and psychology of people who quietly build wealth - frugality, ownership, patience, debt-free living, honest trad | 12–14 мин | Then Life 2 | Old Money Habits That Look Cheap but Aren't | нужно: герой, лого, видео 1 |
| 10 | `food_origins` | **Why We Eat This** @WhyWeEatThis | Where everyday food really comes from and why it tastes the way it does - origins, factories, flavour science (halal onl | 10–12 мин | Warm Storyteller | Why Bread Goes Stale (and How People Kept It Fresh) | нужно: герой, лого, видео 1 |

**Запасные ниши:** авиация («Why planes don't fly over X»), насекомые и микромир, древние технологии, психология городов.
**Уже есть:** How They Survived, What If Earth, Brand on the Couch, Logic of the Psyche.

## Что оставить на каждый канал (папка `channels/<id>/`)
- `channel.json`: ниша, голос, герой, `topics_seed` (3 темы), `logo_prompt`, `handle`. Уже созданы.
- `BRANDING.md`: название, хендл, описание канала, ключевые слова. Образец: `channels/how_they_survived/BRANDING.md`.
- `logo.jpg` 800×800: 1 генерация в Flow по `logo_prompt`, проверить на превью в круге.
- `host.jpg`: герой, 1 генерация, в стиле обложек Brand и Выживания.
- Видео:
  - `projects/<id>/01_*/out/final.mp4`;
  - `out/youtube.md`: название, описание, теги;
  - обложка `thumbs/flow/*_yt.jpg` (стиль style_bmw: подробная сцена, герой, 2–4 слова).

## Порядок производства (после сброса лимита, 08.11 около 04:00)
1. Герой и лого для каждого канала.
2. Видео по конвейеру по `AGENTS.md`: тема → script → check → voice → whisper → scenes → images → edit → render (ночная очередь `tools/night/`). 10–12 мин — это примерно 1900–2300 слов.
3. Обложка, затем `package`.
4. Ничего не заливать до 7-го дня прогрева и смены названия. Урок How They Survived: на 4-й день YouTube не дал сменить имя.
5. Голоса: сейчас их 3 (Then Life 2, Warm Storyteller, Адам). Подобрать в Fish ещё 7 разных, чтобы каналы не звучали одинаково.

Цена: всё на ИИ-этапах идёт через `claude -p`, то есть через тот же недельный лимит. Сколько процентов недели уходит на одно видео, ещё не замеряли: замерить на первом (get_usage до и после) и записать сюда.
10 видео в одну неделю не влезут без ключа DeepSeek или GLM (а это решение владельца: деньги).
