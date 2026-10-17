# Voice casting notes

| Engine | Where it runs | Licence / cost | Quality | Use for |
|---|---|---|---|---|
| **ElevenLabs** (`eleven_v3`, premade voice "Roger") | Cloud API, key in `video/.env` | Paid credits | Most natural narration | Final lead narrator |
| **Chatterbox** (ResembleAI, `tools/tts/cb_worker.py`) | Local GPU, `.venv-cb` | MIT, watermarks its output | Good zero-shot clone from a 10–20 s reference | A second narrator with a real teammate's voice, **with their consent** |
| **Kokoro-82M** (`kokoro-onnx`) | Local CPU, about 2.5x realtime | Apache-2.0 | Good. `af_heart` is the best; `hf_*`/`hm_*` read English with an Indian accent | Drafts, scratch tracks, fallback |
| **Gemini TTS** (`engine: gemini`) | Cloud API | Free tier hits rate limits quickly | Expressive with a `style` prompt | Auditions. Newer models read inline directions aloud, so put the direction in the system instruction |

How to choose a voice:
1. Write 2–3 lines that carry the tone of the piece.
2. Make 2–3 takes per candidate voice.
3. Play them to the user and lock the cast before rendering scenes.

Whisper intelligibility check: `tools/tts/voice_check.py`. Product names are the usual misses, so fix them with `{say|show}` in the script.

Licences:
- **Skipped:** Piper is GPL and sounds robotic. F5-TTS has non-commercial weights. XTTS-v2 is non-commercial, and Coqui has shut down.
- **Hardware:**
  - Dia 1.6B needs about 10 GB of VRAM.
  - Orpheus 3B is too heavy for a 4 GB GPU.
