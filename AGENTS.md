# Agent guide (Claude Code, Codex, any coding agent)

This repo is a harness for making **pitch and demo videos** and **presentation decks** with an agent in the loop. It holds the tools, the skills, the research and an SOP. It is general purpose: hackathons, GTM launches, investor and customer decks, explainers.

## Start here, every time

1. **Read `SOP.md`.** The order is fixed: brief, then research, then the **script or outline with explicit approval**, then one sample, then the build, then QA, then delivery.
2. **Pick the skill for the task:**
   - Video: `skills/video-studio/SKILL.md`. For Remotion API questions, use `skills/upstream/remotion/skills/remotion-best-practices/` (the official skills; `setup.ps1 -Video` fetches them).
   - Deck: `skills/deck-studio/SKILL.md`. Taste comes from `skills/frontend-design/`. Copy rules come from `skills/plinth/references/voice.md`.
   - Story and structure: `knowledge/pitch-structure.md` and `knowledge/hackathon-judging.md`.
3. **Put project material in `projects/<name>/`.** Keep `video/` and `presentation/` generic.
4. **Look at what you render** (frames, PNGs, contact sheets) before saying something is done.

## Rules

- **Facts:** never invent numbers, users, quotes or results. Every number gets a source and its kind (measured, simulated or estimate).
- **People:** never use real photos of team members. Use the stylised avatars in `avatars/` (a = Sapandeep, b = Nida).
- **Approval:** show one sample and wait for an OK before building a full set of slides, scenes, voices or images.
- **Secrets:** secrets live in `video/.env`, which is gitignored. Never print them, commit them or show them in a capture.
- **File edits on Windows:** use the Edit/Write tools or Python. PowerShell 5.1 `Set-Content` mangles UTF-8 (₹, →, —).
- **Third-party apps:** never edit an app you are recording. Capture recipes may only click, type, move the mouse or inject CSS.
- **Installing:** don't install anything into `~/.claude`. Give the user the copy command from the README.

## Map

| Path | What |
|---|---|
| `SOP.md` | The workflow and the house rules |
| `video/` | YAML script → TTS → whisper word timing → scripted browser capture → Remotion → ffmpeg master |
| `presentation/` | PPTX template + `content.py` → python-pptx → portable LibreOffice render → checks; also an HTML stage for diagrams |
| `avatars/` | Rigged 3D avatars of the two team members, a style guide, and how to pose them |
| `skills/` | Agent skills: our own (`video-studio`, `deck-studio`) plus vetted copies of upstream skills |
| `knowledge/` | Research and lessons that apply to any project |
| `projects/` | Your projects (gitignored by default; commit a project deliberately if you want it in the repo) |
