---
name: video-studio
description: Plan, script and produce pitch, demo, launch or explainer videos with the media-pipeline video pipeline (YAML scene script -> TTS -> whisper word timing -> scripted Edge capture -> Remotion -> ffmpeg master, plus hand-built Remotion compositions with rigged 3D team avatars). Use for any request to write or edit a video script, choose voices, record app footage, add zooms, callouts, captions, SFX or music, animate the team avatars, or render and QA a video.
---

# Video studio

The code lives in `video/` of the media-pipeline repo. Read `video/README.md` before touching it. The order of work is fixed by `SOP.md`.

## The order of work

1. **Brief.** Get the audience, the job of the video, the length limit, the deadline and the brand. Ask if any is unknown.
2. **Research.**
   - Read the rubric or rules.
   - Gather one sourced number per question a viewer will ask. Record it in `projects/<name>/sources.md`.
   - For a judged event, use `knowledge/hackathon-judging.md`.
3. **Script, then get approval. Stop here until the user approves.**
   - Write a scene table: time | action title (12 words or fewer) | narration | visual | motion | SFX.
   - Method: `knowledge/pitch-structure.md`.
   - Put the hook in the first 8 s and the governing thought in the first 20 s.
   - The demo takes 50–70% of the runtime.
   - Plan one memorable moment.
   - Name every AI model and say what it does.
4. **Voices.** Play 2–3 audition takes per narrator. Lock the cast: which avatar or voice says which line.
5. **One sample.** Render the hook or the key scene at `--scale 0.5`, and get an OK on the look and the pacing.
6. **Build.**
   - Short or simple pieces use the YAML route: `projects/<name>/script.yaml`, then `.\make.ps1 ..\projects\<name>\script.yaml`.
   - Showpieces get a hand-built Remotion composition in `projects/<name>/remotion/`.
   - Build blocks for showpieces: `remotion/rig/` (avatars), `remotion/lib/AppShot.tsx` (app footage with camera moves), `remotion/lib/Presenter.tsx` (talking presenter).
7. **QA.** Look at the frames for every scene and every key moment. Check audio levels (-14 LUFS, true peak -1.5 dBTP or lower). Captions must match the narration exactly. Listen for mispronunciations.
8. **Deliver.**
   - Export the MP4 and the .srt.
   - If the video is uploaded, check that the link is set to "anyone with the link".
   - Add what you learned to `knowledge/lessons.md`.

## Rules

- **People:** never show real photos of team members. Use the avatars in `avatars/` (a = Sapandeep, b = Nida). Only clone a voice whose owner agreed.
- **The app being recorded:** never edit it. Recipes only click, type, move the mouse or inject CSS.
- **Facts:** every number on screen carries its kind (measured, simulated or estimate). Nothing invented.
- **Secrets:** they live in `video/.env`. Never print or commit them, and never let them appear in a capture.
- **File editing:** use the Edit/Write tools or Python, because PowerShell 5.1 `Set-Content` mangles UTF-8.
- **Remotion API questions:** `skills/upstream/remotion/skills/remotion-best-practices/` (official, fetched by `setup.ps1 -Video`).
- **ffmpeg recipes:** `skills/toolkit-ffmpeg/`.
- **Browser recording:** `skills/toolkit-playwright-recording/`.
