# Установка конвейера на этот ПК. Запуск: powershell -ExecutionPolicy Bypass -File setup.ps1
# Ставит Python-пакеты, node-зависимости движка, наши скиллы для агентов, проверяет внешние программы.
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
function ok($t) { Write-Host "  OK  $t" -ForegroundColor Green }
function bad($t) { Write-Host "  !!  $t" -ForegroundColor Yellow }

Write-Host "1. Программы"
foreach ($c in @("python", "node", "npm", "ffmpeg", "ffprobe", "git")) {
  if (Get-Command $c -ErrorAction SilentlyContinue) { ok $c } else { bad "$c не найден (см. INSTALL.md)" }
}
if (Get-Command claude -ErrorAction SilentlyContinue) { ok "claude CLI" } else { bad "claude CLI нет: npm i -g @anthropic-ai/claude-code (или переключи этапы на DeepSeek/GLM в панели)" }

Write-Host "2. Python-пакеты"
python -m pip install -q -r requirements.txt
if ($?) { ok "requests, yt-dlp, pillow" }

Write-Host "3. Движок монтажа (Remotion)"
if (-not (Test-Path "engine\node_modules")) { Push-Location engine; npm install; Pop-Location }
if (Test-Path "engine\node_modules\remotion") { ok "engine/node_modules" } else { bad "npm install в engine не прошёл" }
if (-not (Test-Path "engine\sfx\pop.wav")) { python engine\gen_sfx.py }

Write-Host "4. Конфиг"
if (-not (Test-Path "config.json")) { python -c "open('config.json','w').write('{}')"; ok "создан пустой config.json (ключи - в панели)" } else { ok "config.json есть" }
$cfg = python -c "import json,core;c=core.config();print(json.dumps({k:c[k] for k in ('fish','whisper','upscayl','flow')}))" | ConvertFrom-Json
foreach ($p in @($cfg.fish.config, $cfg.whisper.exe, $cfg.upscayl.exe, $cfg.flow.downloads)) {
  if (Test-Path $p) { ok $p } else { bad "нет пути $p — поправь в config.json (см. INSTALL.md)" }
}

Write-Host "5. Скиллы для агентов (Claude, ZCode/GLM, общие ~/.agents)"
foreach ($dst in @("$HOME\.claude\skills", "$HOME\.agents\skills", "$HOME\.zcode\skills")) {
  New-Item -ItemType Directory -Force $dst | Out-Null
  foreach ($s in Get-ChildItem "skills" -Directory) {
    $d = Join-Path $dst $s.Name
    New-Item -ItemType Directory -Force $d | Out-Null
    Copy-Item -Recurse -Force (Join-Path $s.FullName "*") $d
  }
  ok ("$dst : " + ((Get-ChildItem skills -Directory).Name -join ', '))
}
if (Test-Path "$HOME\.agents\skills\hyperframes") { ok "скиллы hyperframes есть" } else { bad "скиллов hyperframes нет: npx hyperframes skills install (см. INSTALL.md)" }

Write-Host "6. Проверка"
python stages.py status | Select-Object -First 5
Write-Host "Готово. Панель: СТАРТ_КОНВЕЙЕР.bat -> http://127.0.0.1:8765"
