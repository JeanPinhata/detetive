$ErrorActionPreference = 'Stop'
$skillCli = 'C:\Users\jean_\.codex\skills\.system\imagegen\scripts\image_gen.py'
$promptFile = Join-Path $PSScriptRoot 'cinematic-prompts.jsonl'
$outputDir = Join-Path $PSScriptRoot '..\static\assets\generated'
$runner = Get-Command py -ErrorAction SilentlyContinue
if (-not $runner) { $runner = Get-Command python -ErrorAction SilentlyContinue }
if (-not $runner) { throw 'Python não foi encontrado. Instale o Python e execute este script novamente.' }
if (-not $env:OPENAI_API_KEY) { throw 'OPENAI_API_KEY não está disponível nesta janela do PowerShell.' }
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
& $runner.Source $skillCli generate-batch --input $promptFile --out-dir $outputDir --concurrency 2
if ($LASTEXITCODE -ne 0) { throw "A geração terminou com código $LASTEXITCODE." }
Write-Host "Assets gerados em $outputDir"
