"""Word timing + scene timeline resolution.

Usage:
  .venv\\Scripts\\python.exe tools/align/align.py script/sample.yaml [--model small.en]

1. Runs faster-whisper (CPU, int8, word_timestamps) on every scene WAV from tools/tts.
2. Maps the *script's* words (display spelling, e.g. "Acme", "₹14k") onto whisper's word times with
   difflib alignment, so captions are spelled exactly as written but timed to the real audio.
3. Computes each scene's duration:  max(min_duration, pad_in + narration + pad_out) unless `duration:` is fixed.
4. Resolves every time reference in the scene (keys `at`, `start`, `end`, `until` and all `beats:` values):
      3.2                -> seconds from scene start
      "word:simulation"  -> start of first word matching 'simulation' (case/punct-insensitive, prefix ok)
      "word:night#2"     -> second occurrence;   "word:run+0.3" / "word:run-0.2" -> offset
      "wordend:night"    -> end of that word;    "end-1.5" -> 1.5 s before scene end;  "narr_end" -> end of speech
Writes public/gen/timing.json (consumed by tools/capture/record.mjs and tools/assemble/render.mjs).
"""
from __future__ import annotations

import argparse
import difflib
import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
GEN = ROOT / "public" / "gen"
TIME_KEYS = {"at", "start", "end", "until"}


def norm(w: str) -> str:
    w = w.lower().replace("₹", "rupees")
    return re.sub(r"[^a-z0-9]", "", w)


def display_words(text: str) -> list[str]:
    text = re.sub(r"\{[^|}]+\|([^}]*)\}", r"\1", text)  # {say|display} -> display
    return [w for w in re.split(r"\s+", text.strip()) if w]


def spoken_words(text: str) -> list[str]:
    text = re.sub(r"\{([^|}]+)\|[^}]*\}", r"\1", text)
    return [w for w in re.split(r"\s+", text.strip()) if w]


_model = None


def whisper(model_name: str):
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        _model = WhisperModel(model_name, device="cpu", compute_type="int8", download_root=str(ROOT / "models" / "whisper"))
    return _model


def load16k(path: Path):
    """Decode any audio to 16 kHz mono float32 with the ffmpeg CLI (PyAV 19 breaks faster-whisper's decoder)."""
    import subprocess

    import numpy as np

    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


# Vocabulary hint only: passing the scene's own narration as the prompt made whisper
# skip most of long scenes (it treated the prompt as already-transcribed text).
# Short vocabulary hint for whisper (product names, people). Set per project in the script YAML: meta.vocab.
# Keep it short: a long prompt (e.g. the whole narration) makes whisper transcribe only the tail of a scene.
VOCAB_PROMPT = ""


def transcribe(wav: Path, model_name: str, prompt: str):
    segs, _ = whisper(model_name).transcribe(load16k(wav), language="en", word_timestamps=True, beam_size=5, initial_prompt=VOCAB_PROMPT, vad_filter=False)
    out = []
    for s in segs:
        for w in s.words or []:
            out.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)})
    return out


def map_words(text: str, heard: list[dict], total: float) -> list[dict]:
    """Give every display word a time using an alignment of spoken script words to whisper words."""
    disp, spok = display_words(text), spoken_words(text)
    if len(disp) != len(spok):  # {say|display} with different word counts: fall back to display words
        spok = disp
    a = [norm(w) for w in spok]
    b = [norm(h["w"]) for h in heard]
    times: list[tuple[float, float] | None] = [None] * len(a)
    sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
    for blk in sm.get_opcodes():
        tag, i1, i2, j1, j2 = blk
        if tag == "equal":
            for k in range(i2 - i1):
                times[i1 + k] = (heard[j1 + k]["s"], heard[j1 + k]["e"])
        elif tag == "replace" and j2 > j1:  # spread the heard span across the script words
            s, e = heard[j1]["s"], heard[j2 - 1]["e"]
            n = i2 - i1
            for k in range(n):
                times[i1 + k] = (s + (e - s) * k / n, s + (e - s) * (k + 1) / n)
    # interpolate gaps
    known = [i for i, t in enumerate(times) if t]
    for i, t in enumerate(times):
        if t:
            continue
        prev = max([k for k in known if k < i], default=None)
        nxt = min([k for k in known if k > i], default=None)
        s = times[prev][1] if prev is not None else 0.0
        e = times[nxt][0] if nxt is not None else total
        times[i] = (s, max(s + 0.05, e))
    return [{"w": d, "s": round(t[0], 3), "e": round(t[1], 3)} for d, t in zip(disp, times)]


def resolver(words: list[dict], offset: float, duration: float, narr_end: float):
    def find(token: str, n: int, end: bool):
        t = norm(token)
        hits = [w for w in words if norm(w["w"]).startswith(t)]
        if len(hits) < n:
            raise ValueError(f"word '{token}'#{n} not found in narration")
        w = hits[n - 1]
        return offset + (w["e"] if end else w["s"])

    def resolve(v):
        if isinstance(v, (int, float)):
            return float(v)
        if not isinstance(v, str):
            return v
        m = re.fullmatch(r"(word|wordend):([^#+\-]+)(?:#(\d+))?([+\-]\d*\.?\d+)?", v.strip())
        if m:
            return round(find(m[2], int(m[3] or 1), m[1] == "wordend") + float(m[4] or 0), 3)
        m = re.fullmatch(r"end([+\-]\d*\.?\d+)?", v.strip())
        if m:
            return round(duration + float(m[1] or 0), 3)
        m = re.fullmatch(r"narr_end([+\-]\d*\.?\d+)?", v.strip())
        if m:
            return round(narr_end + float(m[1] or 0), 3)
        return v

    return resolve


def walk(obj, resolve, key=None, in_beats=False):
    if isinstance(obj, dict):
        return {k: walk(v, resolve, k, in_beats or k == "beats") for k, v in obj.items()}
    if isinstance(obj, list):
        return [walk(v, resolve, key, in_beats) for v in obj]
    if key in TIME_KEYS or in_beats:
        return resolve(obj)
    return obj


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--model", default="small.en")
    ap.add_argument("--no-whisper", action="store_true", help="estimate word times evenly (fast, rough)")
    a = ap.parse_args()

    script = yaml.safe_load(Path(a.script).read_text(encoding="utf-8"))
    meta = script.get("meta", {})
    global VOCAB_PROMPT
    VOCAB_PROMPT = meta.get("vocab", VOCAB_PROMPT)
    manifest = json.loads((GEN / "tts" / "manifest.json").read_text(encoding="utf-8"))
    cache_p = GEN / "align_cache.json"
    cache = json.loads(cache_p.read_text(encoding="utf-8")) if cache_p.exists() else {}

    t = 0.0
    scenes = []
    for sc in script["scenes"]:
        sid = sc["id"]
        m = manifest.get(sid, {"file": None, "duration": 0.0})
        narr = float(m.get("duration") or 0.0)
        pad_in, pad_out = (sc.get("pad") or meta.get("pad") or [0.4, 0.6])
        words = []
        if m.get("file"):
            key = m.get("hash", "") + a.model
            if a.no_whisper:
                ws = display_words(sc["narration"])
                words = [{"w": w, "s": round(narr * i / len(ws), 3), "e": round(narr * (i + 1) / len(ws), 3)} for i, w in enumerate(ws)]
            else:
                if cache.get(sid, {}).get("key") != key:
                    heard = transcribe(ROOT / "public" / m["file"], a.model, sc["narration"])
                    cache[sid] = {"key": key, "heard": heard}
                heard = cache[sid]["heard"]
                words = map_words(sc["narration"], heard, narr)
                hw = " ".join(h["w"] for h in heard)
                ratio = difflib.SequenceMatcher(a=[norm(x) for x in spoken_words(sc["narration"])], b=[norm(h["w"]) for h in heard]).ratio()
                print(f"[align] {sid}: {len(words)} words, match {ratio:.0%}  heard: {hw[:90]}")
        if "duration" in sc:
            dur = float(sc["duration"])
        else:
            dur = max(float(sc.get("min_duration", 0)), pad_in + narr + pad_out if narr else float(sc.get("min_duration", 3)))
        resolve = resolver(words, pad_in, dur, pad_in + narr)
        body = {k: v for k, v in sc.items() if k not in ("narration",)}
        body = walk(body, resolve)
        scenes.append({
            **body,
            "id": sid,
            "start": round(t, 3),
            "duration": round(dur, 3),
            "narration": {"file": m.get("file"), "offset": pad_in, "duration": narr, "text": sc.get("narration", "")},
            "words": [{**w, "s": round(w["s"] + pad_in, 3), "e": round(w["e"] + pad_in, 3)} for w in words],
        })
        t += dur - float(sc.get("overlap", 0))  # overlap = transition overlap with the next scene
    cache_p.write_text(json.dumps(cache, indent=1), encoding="utf-8")
    out = {"meta": meta, "total": round(t + float(script["scenes"][-1].get("overlap", 0)), 3), "scenes": scenes}
    (GEN / "timing.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"timing -> {GEN / 'timing.json'}  total {out['total']:.2f}s")


if __name__ == "__main__":
    main()
