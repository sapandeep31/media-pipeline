# Video tooling research

> **Context:** researched for a 2026 hackathon pitch video on a Windows laptop with no admin rights. The tool choices and lessons are general; event-specific rules are kept as an example of what to look for.

Date: 2026-10-15 (deadline 2026-10-18). Machine: Win 11, Ryzen 5 5500U, 16 GB RAM, GTX 1650 4 GB (Optimus, AMD iGPU drives the display), no admin.
Time-boxed: tools had to work **today** on this laptop. Everything marked "tested" was run here.

## Decision summary

| Need | Choice | Why | Status |
|---|---|---|---|
| Composition engine | **Remotion 4.0.528** (React) + portable **Node 24.21 LTS** | Best agent-drivable motion-graphics engine (TSX = code Claude writes well), frame-exact, official Claude skills, renders audio mix too. Bun can run some of it, but the Remotion renderer and compositor are only supported on Node, and the portable zip needs no admin. | tested: `out/sample.mp4` |
| Assembly / mastering | **ffmpeg 9** (already installed) | Two-pass loudnorm (-14 LUFS / -1.5 dBTP), 9:16 variant, frame extraction, level checks | tested |
| Narration TTS | **Kokoro-82M via `kokoro-onnx` 0.6.1** (CPU) | Apache-2.0 weights, good quality, ~2.5x faster than realtime on this CPU, no torch/CUDA, espeak-ng bundled by `espeakng-loader` (no MSI). 54 voices incl. `hf_*`/`hm_*` (Hindi) voices that read English with an Indian accent. | tested: whisper got 96–100% word match on all 9 voices tried |
| Word timing | **faster-whisper 1.2.1** `small.en`, int8, CPU, `word_timestamps=True` + difflib mapping back to the script text | Accurate word times; captions keep the script's spelling ("Acme", "₹14k") | tested: 100% match on sample |
| Screen capture | **puppeteer-core 25.12 + Edge, headless with ANGLE D3D11 on the GTX 1650** (`--force_high_performance_gpu`), CDP `Page.startScreencast` with per-frame timestamps → ffmpeg concat → CFR 30 fps H.264 | Doesn't take over the user's screen. WebGL ran at ~180 rAF fps on the 1650, and the screencast delivered 47–104 fps, so it resamples cleanly to 30 fps. A scripted fake cursor + click ripple gets injected because screencast has no OS cursor. | tested (probe + 3 recordings) |
| SFX | **Synthesised in-repo** (numpy: whoosh, riser, boom, shimmer, tick, blip) + **Kenney CC0 packs** (UI, interface, sci-fi, impact, digital) | Zero licence risk, no login, scripted download | installed |
| Music bed | **Synth "night_pulse"** (numpy-generated Am–F–C–G ambient pad + arp + sub pulse) as the default; **CC0 track "The Hope" by TAD (OpenGameArt)** as an alternative | Licence-clean today. A better human-made track (Pixabay, FMA CC0) can be dropped in by hand; see below. | installed |
| Claude skills | **remotion-dev/skills** (official, ~5.2k★) + 2 markdown skills from **digitalsamba/claude-code-video-toolkit** (~2.2k★, MIT) | Official Remotion API guidance; ffmpeg + playwright-recording recipes | copied to `skills/` (installing them needs your OK, see README) |

## 1. Claude Code skills / plugins for video

- **remotion-dev/skills**: https://github.com/remotion-dev/skills. Official, "Agent Skills", 5,187★, pushed 2026-10-12, version 4.0.535.
  - 12 skills: `remotion-best-practices` (router), `-create`, `-captions`, `-render`, `-multimedia`, `-studio`, `-docs` (Algolia docs search), `-maps`, `-markup`, `-interactivity`, `-saas`, `-upgrade`.
  - Install: `npx skills add remotion-dev/skills` or `npx remotion skills add`. Both write to `.agents/skills` and symlink `.claude/skills`. Docs: https://www.remotion.dev/docs/cli/skills
  - The skills are plain markdown, so copying the folders into `~/.claude/skills/` or `<project>/.claude/skills/` works too.
  - Reviewed: markdown plus small helper TS/MJS for maps. Nothing executes on install. The only "key" is Remotion's public Algolia search key.
- **digitalsamba/claude-code-video-toolkit**: https://github.com/digitalsamba/claude-code-video-toolkit. MIT, 2,239★.
  - 12 skills (remotion, ffmpeg, playwright-recording, moviepy, elevenlabs, acestep, ltx2, runpod…) and 15 commands (`/record-demo`, `/generate-voiceover`, `/video`).
  - Its full workflow expects `uv` and cloud GPUs or ElevenLabs. I took only `ffmpeg` and `playwright-recording` as reading material.
- **wilwaldon/Claude-Code-Video-Toolkit**: https://github.com/wilwaldon/Claude-Code-Video-Toolkit. Just a curated list; nothing to install.
- Small single-file ffmpeg skills exist (e.g. https://www.skills.sh/ychoi-kr/claude-ffmpeg-skill/ffmpeg-usage). The toolkit's ffmpeg skill already covers them.

## 2. Composition engines

- **Remotion** (chosen): https://www.remotion.dev.
  - React/TSX compositions, `@remotion/renderer` for programmatic renders, Studio for live preview, `@remotion/transitions`, `@remotion/google-fonts` (Geist available).
  - Rendering uses a downloaded Chrome Headless Shell (~113 MB, auto-downloaded) and a Rust compositor binary (`@remotion/compositor-win32-x64-msvc`).
  - **Licence:** free for individuals and companies of up to 3 people; larger companies need a company licence (https://www.remotion.dev/license). A hackathon team qualifies.
  - **Bun:** Remotion documents Bun as partially supported, and the renderer and compositor are tested on Node. With a 3-day deadline, a portable Node zip (SHA-256 verified, `vendor/node`) was the safer choice.
- **Motion Canvas / Revideo**: good for code-driven explainer animation. They are weaker for "screen recording + captions + audio mix", and Revideo's rendering service is less mature on Windows. Not chosen.
- **MoviePy**: Python, simple cuts and overlays. Motion design is slow and clunky compared with React/CSS. Not chosen. ffmpeg covers the Python-side needs.
- **ffmpeg filter graphs**: used for mastering and variants, not for design work.

## 3. Local TTS (judged for 4 GB VRAM / CPU)

- **Kokoro-82M** (chosen).
  - Sources: https://huggingface.co/hexgrad/Kokoro-82M, https://github.com/thewh1teagle/kokoro-onnx (release `model-files-v1.0`: `kokoro-v1.0.onnx` 325 MB, `voices-v1.0.bin` 28 MB; fp16/int8 variants also exist).
  - Voice grades: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md. `af_heart` is the flagship (A), `af_bella` A-, `bf_emma` B-, `am_michael`/`am_fenrir`/`bm_george` ~C+. Hindi `hf_alpha`, `hf_beta`, `hm_omega`, `hm_psi` are graded C (for Hindi).
  - Speed here: ~9 s of speech in ~4 s on CPU.
  - Intelligibility test (whisper on a 23-word line): all 9 voices scored 96%. The only miss was the product's invented name, so spell such names with `{say|show}`.
  - Gallery to listen to: `public/gen/voices/*.wav`.
- **pip `kokoro` (hexgrad)**: needs torch + misaki + the espeak-ng MSI (admin), and only supports Python < 3.13. Skipped.
- **Chatterbox** (Resemble AI): https://github.com/resemble-ai/chatterbox. MIT, with an imperceptible watermark on outputs.
  - Turbo (350M) is the most expressive, with zero-shot voice cloning (e.g. clone a warm Indian-English narrator from a 10 s clip), but its VRAM need on 4 GB is unverified and setup means torch + CUDA (~3–4 GB download).
  - Nano (110M) runs on CPU at ~3x realtime on 8 cores.
  - Verdict: the upgrade path if Kokoro sounds flat. Not installed today.
- **Piper**: GPL, robotic next to Kokoro. **F5-TTS**: weights CC-BY-NC. **XTTS-v2**: CPML non-commercial, Coqui defunct. **Dia 1.6B**: ~10 GB VRAM. **Orpheus 3B**: too heavy. **Kyutai TTS 1.6B**: GPU-heavy. All skipped.

## 4. Word-level timestamps

- **faster-whisper** (chosen): https://github.com/SYSTRAN/faster-whisper. int8 CPU is ~4x faster than openai-whisper. The `small.en` model (~480 MB) downloads to `models/whisper/`.
- **Gotcha found:** PyAV 19 breaks faster-whisper 1.2.1's decoder (`metadata_errors` kwarg). Fixed by decoding to 16 kHz float32 with the ffmpeg CLI and passing a numpy array (`tools/align/align.py:load16k`).
- **stable-ts** (forced alignment to known text) and **WhisperX** are both possible. Not needed: difflib mapping of script words onto whisper words gave 100% matches on TTS audio.

## 5. SFX and music (licensing)

- **Kenney audio, CC0**, direct zips, no login: https://kenney.nl/assets/ui-audio, /interface-sounds, /sci-fi-sounds, /impact-sounds, /digital-audio. Installed under `public/assets/sfx/kenney/`.
  - Kenney has no cinematic whooshes or risers, so those are **synthesised** (`tools/sfx/make_audio.py`).
- **Sonniss GDC bundles**: https://sonniss.com/gameaudiogdc. Royalty-free, no attribution, many GB, manual download. Use it for a premium whoosh/impact if you have time.
- **Pixabay music/SFX**: https://pixabay.com/service/terms/. Free for commercial use without attribution, but downloads are manual (no audio API). This is the best source of a polished "corporate/tech" music bed. Download by hand into `public/assets/music/`.
- **OpenGameArt CC0**: https://opengameart.org/content/cc0-cinematic-music. "The Hope" by TAD (CC0) was downloaded to `public/assets/music/cc0/`. Mostly orchestral game music.
- **Free Music Archive CC0** (e.g. John Bartmann, "Public Domain Soundtrack Music"): https://freemusicarchive.org/music/John_Bartmann/Public_Domain_Soundtrack_Music_Album_One. Manual.
- **Kevin MacLeod / incompetech**: CC-BY. Usable only with a credit line in the video/description.
- **Local generation**:
  - Stable Audio Open Small (341M) and the newer Stable Audio 3 Small-SFX/Music run on CPU. Community licence, free under $1M revenue.
  - Feasible, but tens of seconds per clip and uncertain quality, so skipped for the deadline.
  - MMAudio needs ~6 GB VRAM and has NC weights; AudioLDM2 is low quality. Skip.

## 6. Scripted capture of a WebGL app (tested here)

`tools/capture/probe.mjs` results, 3D scene loaded, 1920x1080:

| Mode | WebGL renderer | rAF fps | CDP screencast fps |
|---|---|---|---|
| headless + swiftshader (what `scripts/shot.ts` uses) | SwiftShader | **7.7** | 20 |
| headless + `--use-angle=d3d11` | AMD Radeon iGPU | 154 | 93 |
| headful + d3d11 | AMD Radeon iGPU | 160 | 86 |
| **headless + d3d11 + `--force_high_performance_gpu`** | **GTX 1650** | **179** | **104** |

- **Chosen:** headless on the dGPU. It's smooth and deterministic enough, and it leaves the desktop free.
- **Variable frame timing:** screencast frames arrive only when the compositor redraws. The recorder writes each JPEG with its CDP timestamp and rebuilds real timing via the ffmpeg concat demuxer (`duration` per frame), then resamples to CFR 30 fps. In-sync, no drift.
- **Alternatives considered:**
  - `page.screencast()` (puppeteer built-in): same CDP source, less control over timing and marks.
  - ffmpeg `ddagrab`/`gdigrab` of a headful kiosk window: captures the real cursor, but needs the window on screen and unobstructed. Optimus means the textures live on the iGPU.
  - Virtual-time frame stepping (timecut/timesnap): perfect 60 fps, but it fights the app's own clock and is slow. Not needed at these frame rates.
- **App quirks are handled in recipes, never in app source:** hide dev overlays with injected CSS, do slow first-run work off camera, and wait for auto-opening dialogs before the next click.
