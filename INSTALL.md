# Установка на новый ПК (для агента: делай по шагам, проверяй каждый)

## 1. Программы (Windows 10/11)
| Что | Как поставить | Зачем |
|---|---|---|
| Git | `winget install Git.Git` | клон этого репо |
| Python 3.11+ | `winget install Python.Python.3.13` | конвейер |
| Node.js 20+ | `winget install OpenJS.NodeJS.LTS` | Remotion, HyperFrames, claude CLI |
| FFmpeg | `winget install Gyan.FFmpeg` | склейка звука, проверка видео |
| Claude Code CLI (по желанию) | `npm i -g @anthropic-ai/claude-code`, затем `claude` и вход | этапы ИИ по подписке; иначе DeepSeek/GLM по ключу |
| Whisper | отдельный venv: `python -m venv C:\whisper\.venv`, `C:\whisper\.venv\Scripts\pip install -U openai-whisper` + torch с CUDA (`pip install torch --index-url https://download.pytorch.org/whl/cu124`) | тайминги слов |
| Upscayl | https://upscayl.org (установщик) — нужен `resources/bin/upscayl-bin.exe` и `resources/models` | апскейл ×2 |
| NVIDIA-драйвер | свежий | Whisper и рендер на GPU |

## 2. Репо
```
git clone <url этого репо> conveyor
cd conveyor
powershell -ExecutionPolicy Bypass -File setup.ps1
```
`setup.ps1` ставит Python-пакеты, `npm install` в `engine/`, генерирует SFX, копирует наши скиллы в
`~/.claude/skills`, `~/.agents/skills`, `~/.zcode/skills` и проверяет пути.

## 3. Локальный config.json (НЕ в git)
Всё по умолчанию — в `config.example.json`. В `config.json` пишутся только отличия этого ПК, например:
```json
{
 "fish": {"config": "D:/keys/fish_config.json"},
 "whisper": {"exe": "C:/whisper/.venv/Scripts/whisper.exe"},
 "upscayl": {"exe": "C:/Program Files/Upscayl/resources/bin/upscayl-bin.exe", "models": "C:/Program Files/Upscayl/resources/models"},
 "flow": {"downloads": "C:/Users/<имя>/Downloads"}
}
```
Ключи ИИ (DeepSeek, GLM…) вводятся в панели «⚙ ИИ и ключи» — они сохраняются в config.json.
`fish_config.json` (вне репо): `{"api_key": "...", "voices": {"Then Life 2": "<reference_id>", ...}}` — ключ Fish Audio
и id голосов. Попроси у владельца, в чат не выводи.

## 4. Скиллы HyperFrames (для авторских анимаций)
Если их нет в `~/.agents/skills`: `npx hyperframes skills install` (или по инструкции скилла `hyperframes`, раздел
skill-lifecycle). Проверка: `npx hyperframes usage --json`.

## 5. Расширение для Google Flow (если картинки через Flow)
Репо `alt-c137/flow-batch` (ветка `multi` = Flow Batch Multi). Chrome → chrome://extensions → режим разработчика →
«Загрузить распакованное» → папка расширения → в панели ⚙ галочка «🏭 Конвейер видео».

## 6. Проверка
`python stages.py status`, затем `СТАРТ_КОНВЕЙЕР.bat` → http://127.0.0.1:8765.
Тест движка: в PowerShell `cd engine; node render.mjs test --stills 5 20` → `engine/test/out/check/`.
