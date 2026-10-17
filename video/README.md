# Video pipeline

An agent-drivable video framework that runs on a Windows laptop with no admin rights.

**Default route:** you write a YAML scene list and one command produces a 1080p H.264 MP4 with:
- narration
- word-synced captions
- app screen recordings with zooms and callouts
- motion graphics
- SFX and a ducked music bed
- mastering to -14 LUFS

**Hand-built route:** for a showpiece, build a Remotion composition by hand. It can use the 3D avatars, voice-timed beats and a cinematic hook.

```
script/*.yaml ──► tools/tts (Kokoro | Gemini | Chatterbox) ──► tools/align (faster-whisper) ──► tools/capture (puppeteer + Edge)
                                                                         └─► tools/assemble (Remotion render ─► ffmpeg master) ──► out/<name>.mp4
```

Process (script approval comes first): `../SOP.md`. Research and decisions: `RESEARCH.md`. Agent skill: `../skills/video-studio/SKILL.md`.

## Quick start

```powershell
..\setup.ps1 -Video                          # once: portable Node, npm deps, .venv, Kokoro models
cd video
.\make.ps1 script\sample.yaml --skip-capture # whole chain, no app needed -> out\sample.mp4 (+ .srt, check frames)
.\make.ps1 script\sample.yaml                # with the capture scene (an app on BASE_URL, default http://localhost:3000)
.\make.ps1 studio                            # Remotion Studio: scrub every composition on :3001
.\make.ps1 still AvatarB 100                 # one frame of a composition -> out\AvatarB-100.png
.\make.ps1 typecheck
```

| Flag | Effect |
|---|---|
| `--recapture` | Re-record every capture scene |
| `--skip-capture` | Reuse existing clips |
| `--only-capture` | Stop after capture |
| `--no-whisper` | Even word spacing instead of real alignment (fast, rough) |
| `--name foo` | Write `out/foo.mp4` |
| `--scale 0.5` | Half-resolution draft |
| `--vertical` | Also write a 9:16 variant |

Running the steps one at a time:

```powershell
.\.venv\Scripts\python.exe tools\tts\tts.py script\x.yaml [--only demo] [--force]
.\.venv\Scripts\python.exe tools\align\align.py script\x.yaml          # -> public\gen\timing.json
.\make.ps1 node tools\capture\record.mjs --recipe click-cta --out public\gen\clips\demo.mp4 --scene demo --timing public\gen\timing.json
.\make.ps1 node tools\assemble\render.mjs script\x.yaml [--frames 0-120] [--scale 0.5]
```

## What worked in production (the decisions to start from)

The last real project shipped a 3:49 hackathon pitch video built this way:

- **Structure:** a cinematic hook made of 3D avatars in a room, a product walkthrough recorded from the live app, then the close. Each part was a **hand-built composition** (`HookV3S2` followed by `Walkthrough`, joined as `FullVideo`), rendered as PNG frames, then H.264 at CRF 14, then `master()` from `tools/assemble/render.mjs`. The YAML route was used for the first drafts.
- **Voices:**
  - **Narrator A** was the ElevenLabs premade voice "Roger" (model `eleven_v3`). It was the most natural-sounding option.
  - **Narrator B** was a **Chatterbox** zero-shot clone of a 10-second reference recording (`tools/tts/cb_worker.py` in `.venv-cb`, run on the GPU).
  - **Kokoro** (local, Apache-2.0) is the default for drafts. `af_heart` is the best Kokoro voice, and the `hf_*`/`hm_*` voices read English with an Indian accent.
  - Always audition 2–3 takes per line before locking a voice.
- **Timing:** faster-whisper `small.en` word timestamps drive every caption, beat, zoom and cut. Keep `meta.vocab` short, because a long prompt makes whisper transcribe only the tail of a scene.
- **Capture:** headless Edge on the discrete GPU (`DGPU=1`), recorded at DPR 2 so 2x zooms stay crisp, with a fake cursor and click ripple injected.
- **Audio:** synthesised whooshes and risers plus Kenney CC0 UI sounds. Music is a synth bed or a CC0 track, ducked under the voice. The master is -14 LUFS with the limiter at 0.74, which keeps AAC true peaks at -1.5 dBTP or lower.

## Layout

```
make.ps1                  entry point (puts ../vendor/node on PATH)
script/sample.yaml        reference scene list covering every feature
tools/tts/                tts.py (Kokoro + Gemini TTS engines, cached by hash), cb_worker.py (Chatterbox clone), voice_check.py
tools/align/align.py      whisper word timings -> resolves "word:..." time refs -> public/gen/timing.json
tools/capture/            lib.mjs (Edge launch, fake cursor, smooth mouse, clickText, CDP recorder), record.mjs, recipes.mjs, probe.mjs
tools/assemble/render.mjs timeline -> Remotion render -> loudnorm master, SRT, 9:16; exports master()
tools/sfx/                synthesise whoosh/riser/boom/shimmer/tick/blip + ambient music bed (numpy, no downloads)
tools/avatars/            glb-plain.mjs, glb2obj.mjs, reskin_a.py (see ../avatars/README.md)
tools/qa/tile.py          contact sheet of check frames
remotion/                 Main.tsx (YAML-driven), Root.tsx, components/ (title, capture, panels, captions, overlays),
                          rig/ (rigged-GLB avatars: RigCharacter, gestures, AvatarDemo), lib/ (AppShot, Graphics, Presenter)
public/assets/            sfx/ (synth + Kenney CC0, library.json aliases, SOURCES.md), music/, models3d/ (team avatars)
public/gen/               generated: tts/, clips/, timing.json, timeline.json (gitignored)
models/                   kokoro, whisper, hf caches (gitignored; setup downloads)
out/                      renders, .srt, <name>_frames/ check PNGs (gitignored)
```

## Script format (`script/*.yaml`)

```yaml
meta:
  fps: 30
  width: 1920
  height: 1080
  voice: af_heart            # or a blend: "af_heart:0.6,bf_emma:0.4"
  speed: 1.0
  lang: en-us
  vocab: "Acme, Gemini."     # short whisper hint
  pad: [0.35, 0.6]           # silence before/after narration inside each scene
  captions: true
  music: { src: assets/music/synth/night_pulse.wav, volume: 0.32, duck: 0.3, fadeIn: 0.8, fadeOut: 2 }
scenes:
  - id: demo
    narration: "Click {Start|START} to ..."    # {say|show}: speak "say", caption "show"
    voice: hm_omega                            # optional per-scene voice/speed/lang/engine
    visual: { type: capture, recipe: click-cta, frame: window, zooms: [...], callouts: [...] }
    beats: { click: "word:Start-0.6" }         # handed to the capture recipe
    overlays: [ { type: lowerThird, at: 0.8, until: "word:gates", title: "...", subtitle: "..." } ]
    sfx: [ { at: "word:Start", name: click, volume: 0.7 } ]
    captions: { style: kinetic, position: auto, maxWords: 6 }
    transition: { in: wipe, dur: 0.5 }         # fade | slide | wipe | zoom | none
    min_duration: 4
    overlap: 0.5
```

### Time references

| Form | Resolves to |
|---|---|
| `3.2` | Seconds from the scene start |
| `"word:Jev"`, `"word:night#2"`, `"word:run+0.3"` | Start of the first (or nth) word starting with the token, plus or minus an offset |
| `"wordend:twin"` | End of that word |
| `"narr_end-0.5"`, `"end-1.5"` | Relative to the end of the speech or the end of the scene |

### Visual types (`remotion/types.ts`)

| Type | Fields | Notes |
|---|---|---|
| `title` | `title`, `subtitle`, `kicker`, `logo` | |
| `capture` | `recipe`, `frame`, `zooms`, `callouts` | Recorded automatically |
| `video` | `src`, plus the `capture` options | Any MP4 under `public/` |
| `still` | `src`, `kenburns`, `zooms`, `callouts` | |
| `split` | `left`, `right`, `tag` | Before and after |
| `stats` | `title`, `stats[]`, `footnote` | |
| `outro` | `name`, `tagline`, `url`, `credits[]` | |

- **Zooms:** `{ at, dur, x, y, scale }`, with x and y in source pixels.
- **Callouts:** `{ at, until, x, y, w, h, label, side, shape }`. They track zooms and dim the rest of the frame.

## Common tasks

- **Choose a voice:**
  - Audition with `tts.py --gallery "line" --voices af_heart,bf_emma,hm_omega` and listen to `public\gen\voices\*.wav`.
  - For a cloud voice, set `engine: gemini` with a `voice` and a `style`. Keys go in `video/.env`.
  - Clone a voice with Chatterbox from a 10–20 s clean reference recording. **Only clone a voice whose owner has agreed.**
- **Pronunciation:** use `{Ak-mee|Acme}` (spoken form, then caption form), or spell numbers out.
- **New capture recipe:** add `{ preroll, record }` to `tools/capture/recipes.mjs`. Test it with `.\make.ps1 node tools\capture\record.mjs --recipe <id> --duration 8`, then look at a frame. Never edit the app you are recording.
- **Hand-built composition:**
  - Create `projects/<name>/remotion/MyFilm.tsx`.
  - Import it from `remotion/Root.tsx` (or a project Root).
  - Use `lib/AppShot.tsx` for app footage with camera moves, `lib/Presenter.tsx` and `rig/` for avatars, and Remotion `<Audio>` for the voice.
  - Render with `npx remotion render`, then `master()`.
- **Music:** drop a licensed track into `public/assets/music/` and point `meta.music.src` at it. Regenerate the synth bed with `tools\sfx\make_audio.py --music-seconds 180 --bpm 92`.

## QA after every render

- **Frames:**
  - Read `out/<name>_frames/<scene>.png`.
  - Grab extra frames with `ffmpeg -ss <t> -i out\x.mp4 -frames:v 1 -vf scale=1280:-1 out\x_frames\t<t>.png`.
  - Make a contact sheet with `tools\qa\tile.py`.
- **Audio:**
  - About -14 LUFS integrated, true peak -1.5 dBTP or lower.
  - Music at least 12 dB under the voice. Check it with `ffmpeg -ss A -t B -i out\x.mp4 -af volumedetect -f null -`.
- **Captions:** they must match the narration word for word, and names must be spelled right.

## Gotchas

- **UTF-8:** PowerShell 5.1 `Get-Content`/`Set-Content` corrupt UTF-8. Use the Edit tool or Python.
- **Whisper:** faster-whisper and PyAV 19 are incompatible. `align.py` decodes with the ffmpeg CLI; keep it that way. Whisper also clamps the first word to 0 s; snap it with the RMS envelope.
- **Remotion `Target closed` after a GPU capture:** `render.mjs` retries with `gl=swangle`.
- **Render format:** render finals as PNG frames. JPEG q80 softens 3D textures.
- **Gemini TTS:** newer models read inline stage directions aloud, so put the direction in the system instruction.
- **Remotion licence:** free for individuals and companies of up to 3 people. Larger teams need a company licence.
