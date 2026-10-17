"""Objective intelligibility check for the voice gallery (we can't listen): whisper-transcribe each
public/gen/voices/*.wav and report word-match % against the reference text.
Usage: .venv\\Scripts\\python.exe tools/tts/voice_check.py "reference text"
"""
import difflib
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "align"))
from align import norm, transcribe  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
ref = [norm(w) for w in sys.argv[1].split()]
for wav in sorted((ROOT / "public" / "gen" / "voices").glob("*.wav")):
    heard = transcribe(wav, "small.en", "")
    r = difflib.SequenceMatcher(a=ref, b=[norm(h["w"]) for h in heard]).ratio()
    print(f"{wav.stem:14s} {r:6.0%}  {' '.join(h['w'] for h in heard)}")
