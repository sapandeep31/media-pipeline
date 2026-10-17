# media-pipeline

An agent-ready harness for making **pitch and demo videos** and **presentation decks**. It suits hackathons, GTM launches, investor and customer pitches, and explainers.

The repo holds three things:
- **The tools**, which run locally on Windows and need no admin rights.
- **The skills and SOP** that coding agents (Claude Code and others) follow.
- **The research and lessons** from real projects, so every new piece starts from what already worked.

```
media-pipeline/
├── SOP.md            the workflow: brief → research → script/outline + APPROVAL → one sample → build → QA → deliver
├── AGENTS.md         rules + map for coding agents (CLAUDE.md imports it)
├── setup.ps1         one-time setup: portable Node, Python venvs, models, portable LibreOffice (checksum-verified)
├── video/            YAML script → TTS → whisper word timing → scripted Edge capture → Remotion → ffmpeg master (-14 LUFS)
├── presentation/     any PPTX template + content.py → python-pptx → LibreOffice render → PDF/PNG + checks
├── avatars/          rigged 3D avatars of the team (a = Sapandeep, b = Nida), style guide, how to pose/make them
├── skills/           agent skills: video-studio, deck-studio (ours) + vetted upstream skills (Remotion, plinth, frontend-slides, …)
└── knowledge/        pitch structure, what judges reward, voice casting, lessons log, tooling research
```

## Quick start

```powershell
git clone https://github.com/sapandeep31/media-pipeline; cd media-pipeline
.\setup.ps1 -All                    # add -Chatterbox for local voice cloning (GPU, ~4 GB)
cd video;        .\make.ps1 script\sample.yaml --skip-capture   # -> video\out\sample.mp4
cd ..\presentation; .\make.ps1                                   # -> presentation\out\deck.pdf + PNGs
```

Requirements: Windows 10/11, Python 3.12, ffmpeg on PATH (`winget install Gyan.FFmpeg`), Microsoft Edge. An NVIDIA GPU is optional; it speeds up app capture and voice cloning.

## Working with an agent

Open the repo in Claude Code (or any coding agent) and describe the piece:

> "Make a 3-minute demo video for <product>, for <audience>. Rules: <link>. Use avatars a and b."

The agent then works through `SOP.md`. It asks for the brief, researches, and brings you a **scene table or slide map to approve**. It shows **one sample** before building the full set, and checks the render before calling anything done.

To make the skills available in every Claude Code session, run this yourself:

```powershell
Copy-Item -Recurse .\skills\video-studio, .\skills\deck-studio "$env:USERPROFILE\.claude\skills\"
```

## Projects

Put each piece in `projects/<name>/` (gitignored by default). Use `presentation/projects/<name>/` for decks and `projects/<name>/script.yaml` or `remotion/` for videos. The framework folders stay generic. When a project teaches something, add it to `knowledge/lessons.md`.

## Licence

- **The code in this repo:** MIT (see `LICENSE`).
- **Third-party skills, fonts, icons, SFX and music:** they keep their own licences (see `THIRD_PARTY.md`).
- **The avatars:** they depict real people. Ask before using them outside this team's work.
