# Portable LibreOffice: administrative extract of the official MSI (no admin, nothing registered),
# then drop the static Google Sans Flex cuts into LibreOffice's own font folder.
#   powershell -File tools\lo.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$msi = Get-ChildItem "$root\vendor\_dl\LibreOffice_*_Win_x86-64.msi" | Select-Object -First 1
$target = "$root\vendor\libreoffice"
if (-not (Test-Path "$target\program\soffice.exe")) {
  if (-not $msi) { throw "no LibreOffice MSI in vendor\_dl" }
  New-Item -ItemType Directory -Force $target | Out-Null
  $p = Start-Process msiexec.exe -ArgumentList @('/a', "`"$($msi.FullName)`"", '/qn', "TARGETDIR=`"$target`"", '/l*', "`"$target\extract.log`"") -Wait -PassThru
  if ($p.ExitCode -ne 0) { throw "msiexec /a exited $($p.ExitCode); see $target\extract.log" }
}
$soffice = Get-ChildItem $target -Recurse -Filter soffice.exe | Select-Object -First 1
if (-not $soffice) { throw "soffice.exe not found under $target" }
$fontDir = Join-Path (Split-Path $soffice.DirectoryName -Parent) 'share\fonts\truetype'
New-Item -ItemType Directory -Force $fontDir | Out-Null
Copy-Item "$root\assets\fonts\static\*.ttf" $fontDir -Force
Write-Host "soffice: $($soffice.FullName)"
Write-Host "fonts:   $fontDir"
