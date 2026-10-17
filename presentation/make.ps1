# Deck pipeline: PPTX template + content.py -> out\deck.pptx -> PDF + PNGs -> checks.
#   .\make.ps1                         deck + render + check   (project folder = .\deck)
#   .\make.ps1 -Project projects\acme  same, for another deck project (template.pptx + content.py)
#   .\make.ps1 deck|render|check|text
#   .\make.ps1 render --only "3,5"     re-shoot those slides only (quote the list in PowerShell)
#   .\make.ps1 html graphics\x.html --no-pdf   HTML 1920x1080 stage -> PNG (diagrams / graphics)
#   .\make.ps1 py <args> | node <args>
# First time: ..\setup.ps1 -Presentation   (venv, npm deps, portable LibreOffice + fonts)
param([string]$Project = "deck", [Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
Set-Location $root
$py = "$root\.venv\Scripts\python.exe"
$node = Join-Path (Split-Path $root -Parent) 'vendor\node'
if (Test-Path $node) { $env:PATH = "$node;$env:PATH" }
$env:PYTHONIOENCODING = 'utf-8'
$env:DECK_DIR = (Resolve-Path $Project).Path
$cmd = if ($Rest.Count) { $Rest[0] } else { 'all' }
$args2 = if ($Rest.Count -gt 1) { $Rest[1..($Rest.Count - 1)] } else { @() }
switch ($cmd) {
  'all'    { & $py tools\build_deck.py; if ($LASTEXITCODE) { exit 1 }; & $py tools\render.py; & $py tools\check.py }
  'deck'   { & $py tools\build_deck.py @args2 }
  'render' { & $py tools\render.py @args2 }
  'check'  { & $py tools\check.py @args2 }
  'text'   { & "$root\.venv\Scripts\markitdown.exe" out\deck.pptx }
  'html'   { node tools\build.mjs @args2 }
  'py'     { & $py @args2 }
  'node'   { node @args2 }
  default  { Write-Host "unknown command '$cmd' (all | deck | render | check | text | html | py | node)"; exit 2 }
}
exit $LASTEXITCODE
