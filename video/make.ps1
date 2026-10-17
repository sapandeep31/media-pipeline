# Video pipeline entry point (puts the repo's portable Node on PATH; run ..\setup.ps1 -Video once first).
#   .\make.ps1 script\<file>.yaml [--recapture] [--skip-capture] [--no-whisper] [--scale 0.5] [--vertical] [--name x]
#   .\make.ps1 studio          Remotion Studio (live preview of every composition) on http://localhost:3001
#   .\make.ps1 still <CompositionId> [frame] [out.png]   render one frame to check a look
#   .\make.ps1 typecheck       tsc over remotion/
#   .\make.ps1 node <args>     run the portable node directly
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeDir = Join-Path (Split-Path $here -Parent) "vendor\node"
if (-not (Test-Path "$nodeDir\node.exe")) { $nodeDir = Split-Path (Get-Command node).Source }   # fall back to system node
$env:PATH = "$nodeDir;$env:PATH"
Set-Location $here
if ($args.Count -eq 0) { Write-Host "usage: .\make.ps1 script\<file>.yaml [flags] | studio | still <id> [frame] [out] | typecheck | node <args>"; exit 2 }
switch ($args[0]) {
  "studio"    { & "$nodeDir\npx.cmd" remotion studio remotion/index.ts --port 3001 }
  "still"     { $id = $args[1]; $fr = if ($args.Count -gt 2) { $args[2] } else { 30 }; $out = if ($args.Count -gt 3) { $args[3] } else { "out\$id-$fr.png" }
                & "$nodeDir\npx.cmd" remotion still remotion/index.ts $id $out --frame=$fr --gl=angle }
  "typecheck" { & "$nodeDir\node.exe" node_modules/typescript/bin/tsc -p tsconfig.json }
  "node"      { & "$nodeDir\node.exe" @($args | Select-Object -Skip 1) }
  default     { & "$nodeDir\node.exe" tools/pipeline.mjs @args }
}
exit $LASTEXITCODE
