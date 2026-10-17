# One-time setup on Windows (no admin needed). Downloads are checksum-verified where the vendor publishes one.
#   .\setup.ps1 -Video            portable Node, video npm deps, video/.venv, Kokoro model files
#   .\setup.ps1 -Chatterbox       also video/.venv-cb for voice cloning (big: torch + CUDA, ~4 GB)
#   .\setup.ps1 -Presentation     presentation npm deps, presentation/.venv, portable LibreOffice + fonts
#   .\setup.ps1 -All
# Needs: Python 3.12 on PATH (py/python), ffmpeg on PATH (winget install Gyan.FFmpeg), Microsoft Edge.
param([switch]$Video, [switch]$Chatterbox, [switch]$Presentation, [switch]$All)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
if ($All) { $Video = $true; $Presentation = $true }
if (-not ($Video -or $Presentation -or $Chatterbox)) { Write-Host "usage: .\setup.ps1 -Video | -Chatterbox | -Presentation | -All"; exit 2 }

$NODE_VER = '24.21.0'
$LO_VER = '26.2.6'
$dl = Join-Path $root 'vendor\_dl'
New-Item -ItemType Directory -Force $dl | Out-Null

function Get-File($url, $out) {
  if (Test-Path $out) { return }
  Write-Host "download $url"
  for ($i = 0; $i -lt 6; $i++) { & curl.exe -sL -C - --retry 3 --speed-limit 20000 --speed-time 30 -o $out $url; if ($LASTEXITCODE -eq 0) { break } }
  if (-not (Test-Path $out)) { throw "download failed: $url" }
}
function Assert-Sha256($file, $expected) {
  $h = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()
  if ($h -ne $expected.ToLower()) { Remove-Item $file; throw "SHA-256 mismatch for $file" }
  Write-Host "sha256 ok  $(Split-Path $file -Leaf)"
}
function New-Venv($dir, $req) {
  if (-not (Test-Path "$dir\Scripts\python.exe")) { & py -3.12 -m venv $dir 2>$null; if (-not $?) { & python -m venv $dir } }
  & "$dir\Scripts\python.exe" -m pip install -q --upgrade pip
  if ($req) { & "$dir\Scripts\python.exe" -m pip install -q -r $req }
}

# ---------------------------------------------------------------- portable Node (both pipelines)
$node = Join-Path $root 'vendor\node'
if (-not (Test-Path "$node\node.exe")) {
  $zip = "$dl\node-v$NODE_VER-win-x64.zip"
  Get-File "https://nodejs.org/dist/v$NODE_VER/node-v$NODE_VER-win-x64.zip" $zip
  $sums = (& curl.exe -sL "https://nodejs.org/dist/v$NODE_VER/SHASUMS256.txt") -split "`n" | Where-Object { $_ -match "node-v$NODE_VER-win-x64.zip" }
  Assert-Sha256 $zip ($sums -split '\s+')[0]
  Expand-Archive $zip "$dl\node-x" -Force
  Move-Item "$dl\node-x\node-v$NODE_VER-win-x64" $node
}
$env:PATH = "$node;$env:PATH"

# ---------------------------------------------------------------- video
if ($Video) {
  # official Remotion agent skills (no licence file upstream, so fetched here instead of vendored)
  if (-not (Test-Path "$root\skills\upstream\remotion")) { & git clone --depth 1 https://github.com/remotion-dev/skills.git "$root\skills\upstream\remotion" }
  Push-Location "$root\video"
  & "$node\npm.cmd" install --no-fund --no-audit
  New-Venv "$root\video\.venv" "$root\video\requirements.txt"
  $k = "$root\video\models\kokoro"; New-Item -ItemType Directory -Force $k | Out-Null
  Get-File "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx" "$k\kokoro-v1.0.onnx"
  Get-File "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin" "$k\voices-v1.0.bin"
  # faster-whisper small.en downloads itself into models\whisper on the first align run.
  if (-not (Test-Path "$root\video\public\assets\sfx\synth")) { & "$root\video\.venv\Scripts\python.exe" tools\sfx\make_audio.py }
  if (-not (Test-Path "$root\video\.env")) { Copy-Item "$root\video\.env.example" "$root\video\.env" }
  Pop-Location
}
if ($Chatterbox) {
  New-Venv "$root\video\.venv-cb" $null
  & "$root\video\.venv-cb\Scripts\python.exe" -m pip install -q torch==2.6.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124
  & "$root\video\.venv-cb\Scripts\python.exe" -m pip install -q -r "$root\video\requirements-chatterbox.txt"
  # model weights (ResembleAI/chatterbox) download into video\models\hf on the first cb_worker run
}

# ---------------------------------------------------------------- presentation
if ($Presentation) {
  Push-Location "$root\presentation"
  & "$node\npm.cmd" install --no-fund --no-audit
  New-Venv "$root\presentation\.venv" "$root\presentation\requirements.txt"
  $msi = "$root\presentation\vendor\_dl\LibreOffice_${LO_VER}_Win_x86-64.msi"
  New-Item -ItemType Directory -Force (Split-Path $msi) | Out-Null
  $u = "https://download.documentfoundation.org/libreoffice/stable/$LO_VER/win/x86_64/LibreOffice_${LO_VER}_Win_x86-64.msi"
  Get-File $u $msi
  Assert-Sha256 $msi ((& curl.exe -sL "$u.sha256") -split '\s+')[0]
  & "$root\presentation\.venv\Scripts\python.exe" tools\make_fonts.py
  & powershell -NoProfile -ExecutionPolicy Bypass -File tools\lo.ps1
  if (-not (Test-Path deck\template.pptx)) { & "$root\presentation\.venv\Scripts\python.exe" tools\new_template.py deck\template.pptx }
  Pop-Location
}
Write-Host "setup done"
