"""Narration TTS: one WAV per scene with Kokoro-82M (kokoro-onnx, CPU).

Usage:
  .venv\\Scripts\\python.exe tools/tts/tts.py script/sample.yaml [--only scene_id ...] [--force]
  .venv\\Scripts\\python.exe tools/tts/tts.py --gallery "Text to read" [--voices af_heart,am_michael,...]

Voice settings (script meta, overridable per scene with `voice:` / `speed:`):
  voice: af_heart            single voice
  voice: "af_heart:0.7,bf_emma:0.3"   weighted blend of voice styles
  speed: 1.0                 0.8 - 1.3
  lang:  en-us | en-gb       phonemizer language (accent of pronunciation)
Writes public/gen/tts/<scene>.wav (24 kHz mono) and public/gen/tts/manifest.json with real durations.
Caches by hash of (text, voice, speed, lang) so unchanged scenes are not re-synthesised.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import yaml

ROOT = Path(__file__).resolve().parents[2]
MODEL = ROOT / "models" / "kokoro" / "kokoro-v1.0.onnx"
VOICES = ROOT / "models" / "kokoro" / "voices-v1.0.bin"
OUT = ROOT / "public" / "gen" / "tts"

_kokoro = None


def kokoro():
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro

        _kokoro = Kokoro(str(MODEL), str(VOICES))
    return _kokoro


def voice_style(spec: str):
    """'af_heart' or 'af_heart:0.7,bf_emma:0.3' -> name or blended style array."""
    if "," not in spec and ":" not in spec:
        return spec
    parts = []
    for p in spec.split(","):
        name, _, w = p.strip().partition(":")
        parts.append((kokoro().get_voice_style(name.strip()), float(w or 1)))
    total = sum(w for _, w in parts)
    return sum(s * (w / total) for s, w in parts)


def clean(text: str) -> str:
    # Pronunciation helpers: write "{say|display}" in narration to speak "say" but show "display" in captions.
    text = re.sub(r"\{([^|}]+)\|[^}]*\}", r"\1", text)
    text = text.replace("₹", " rupees ").replace("—", ", ").replace("–", ", ")
    return re.sub(r"\s+", " ", text).strip()


def synth(text: str, voice: str, speed: float, lang: str, pause_s: float = 0.0):
    """Synthesise paragraph-by-paragraph (Kokoro is best on <= ~400 chars) and join with short pauses."""
    chunks = [c.strip() for c in re.split(r"\n\s*\n|(?<=[.!?])\s+(?=\S)", text) if c.strip()]
    sr = 24000
    pieces = []
    for i, c in enumerate(chunks):
        samples, sr = kokoro().create(clean(c), voice=voice_style(voice), speed=speed, lang=lang)
        pieces.append(samples.astype(np.float32))
        if i < len(chunks) - 1:
            pieces.append(np.zeros(int(sr * (0.18 + pause_s)), dtype=np.float32))
    audio = np.concatenate(pieces) if pieces else np.zeros(1, dtype=np.float32)
    # trim leading/trailing near-silence, then normalise peak to -1 dBFS
    nz = np.where(np.abs(audio) > 1e-3)[0]
    if len(nz):
        audio = audio[max(0, nz[0] - int(0.02 * sr)) : nz[-1] + int(0.08 * sr)]
    peak = float(np.max(np.abs(audio))) or 1.0
    audio = audio * (10 ** (-1 / 20) / peak)
    return audio, sr


# ---------------------------------------------------------------------------------------------------------------
# Gemini TTS engine (per scene: `engine: gemini`, `voice: Puck`, `style: "Say ... cheerfully"`).
# Results are cached on disk by sha1(text, voice, style) in public/gen/tts/gemini_cache/ (model-independent), so a
# re-render never re-requests. Keys come from GEMINI_API_KEYS (comma separated) in video/.env (or the environment) and are never
# printed. Every HTTP request is appended to public/gen/tts/gemini_calls.log (model, key index, status; no secrets).
GEMINI_DIR = OUT / "gemini_cache"
GEMINI_LOG = OUT / "gemini_calls.log"
GEMINI_MODELS = ["gemini-2.5-flash-preview-tts", "gemini-3.1-flash-tts-preview", "gemini-3.8-flash-tts"]
_key_idx = 0


def gemini_keys() -> list[str]:
    import os

    raw = os.environ.get("GEMINI_API_KEYS", "")
    if not raw:
        env = ROOT / ".env"
        if env.exists():
            for ln in env.read_text(encoding="utf-8", errors="ignore").splitlines():
                if ln.strip().startswith("GEMINI_API_KEYS"):
                    raw = ln.split("=", 1)[1].strip().strip("'\"")
    return [k.strip() for k in raw.split(",") if k.strip()]


def _log(model: str, ki: int, status) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with GEMINI_LOG.open("a", encoding="utf-8") as f:
        f.write(f"{model}\tkey#{ki}\t{status}\n")


def gemini_request(prompt: str, voice: str, models: list[str]):
    """Try models in order; on 429 rotate keys; returns (float32 audio, sr, model)."""
    import base64
    import urllib.error
    import urllib.request

    global _key_idx
    keys = gemini_keys()
    if not keys:
        raise RuntimeError("no GEMINI_API_KEYS")
    last = None
    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        body = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["AUDIO"],
                "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
            },
        }).encode()
        tried = 0
        while tried < len(keys):
            ki = _key_idx % len(keys)
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", "x-goog-api-key": keys[ki]})
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    j = json.loads(r.read())
                _log(model, ki, 200)
            except urllib.error.HTTPError as e:
                _log(model, ki, e.code)
                last = f"{model} HTTP {e.code}"
                if e.code in (429, 403):  # quota / key problem -> next key
                    _key_idx += 1
                    tried += 1
                    continue
                break  # 400/404/500: this model is unusable -> next model
            except Exception as e:  # network
                _log(model, ki, type(e).__name__)
                last = f"{model} {type(e).__name__}"
                break
            try:
                part = j["candidates"][0]["content"]["parts"][0]["inlineData"]
                raw = base64.b64decode(part["data"])
            except Exception:
                last = f"{model} no audio in response"
                _log(model, ki, "noaudio")
                break
            m = re.search(r"rate=(\d+)", part.get("mimeType", ""))
            sr = int(m.group(1)) if m else 24000
            if raw[:4] == b"RIFF":
                import io

                data, sr = sf.read(io.BytesIO(raw), dtype="float32")
                if data.ndim > 1:
                    data = data.mean(axis=1)
                return data, sr, model
            return np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0, sr, model
    raise RuntimeError(f"Gemini TTS failed ({last})")


def gemini_synth(text: str, voice: str, style: str, models: list[str]):
    key = hashlib.sha1(json.dumps([text, voice, style]).encode()).hexdigest()[:16]
    GEMINI_DIR.mkdir(parents=True, exist_ok=True)
    cf = GEMINI_DIR / f"{key}.wav"
    meta_f = GEMINI_DIR / f"{key}.json"
    if cf.exists():
        audio, sr = sf.read(cf, dtype="float32")
        model = json.loads(meta_f.read_text()).get("model", "?") if meta_f.exists() else "?"
        return audio, sr, model, True
    prompt = f"{style}: {text}" if style else text
    audio, sr, model = gemini_request(prompt, voice, models)
    sf.write(cf, audio, sr, subtype="PCM_16")  # raw result cached untouched
    meta_f.write_text(json.dumps({"model": model, "voice": voice, "style": style, "text": text}), encoding="utf-8")
    return audio, sr, model, False


def trim_norm(audio, sr):
    nz = np.where(np.abs(audio) > 2e-3)[0]
    if len(nz):
        audio = audio[max(0, nz[0] - int(0.02 * sr)) : nz[-1] + int(0.12 * sr)]
    # voices must sit clearly on top of SFX: bring the speech RMS up to about -17 dBFS, tame peaks with a soft limiter
    act = audio[np.abs(audio) > 0.02]
    rms = float(np.sqrt(np.mean(act ** 2))) if len(act) else 0.1
    audio = audio * (10 ** (-17 / 20) / max(rms, 1e-4))
    audio = np.tanh(audio / 0.9) * 0.9
    peak = float(np.max(np.abs(audio))) or 1.0
    return audio * (10 ** (-1 / 20) / peak)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("script", nargs="?")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--gallery")
    ap.add_argument("--voices", default="af_heart,af_bella,am_michael,am_fenrir,bf_emma,bm_george,bm_fable,hf_alpha,hm_omega")
    ap.add_argument("--speed", type=float, default=1.0)
    a = ap.parse_args()

    if a.gallery:
        gdir = ROOT / "public" / "gen" / "voices"
        gdir.mkdir(parents=True, exist_ok=True)
        for v in a.voices.split(","):
            audio, sr = synth(a.gallery, v, a.speed, "en-us")
            sf.write(gdir / f"{v.replace(':', '_').replace(',', '+')}.wav", audio, sr)
            print(f"{v}: {len(audio) / sr:.2f}s")
        print("gallery ->", gdir)
        return

    if not a.script:
        ap.error("script path required")
    script = yaml.safe_load(Path(a.script).read_text(encoding="utf-8"))
    meta = script.get("meta", {})
    OUT.mkdir(parents=True, exist_ok=True)
    man_path = OUT / "manifest.json"
    manifest = json.loads(man_path.read_text(encoding="utf-8")) if man_path.exists() else {}

    for sc in script["scenes"]:
        sid = sc["id"]
        text = (sc.get("narration") or "").strip()
        if not text:
            manifest[sid] = {"file": None, "duration": 0.0, "text": ""}
            continue
        if a.only and sid not in a.only:
            continue
        if sc.get("engine", meta.get("engine")) == "gemini":
            gv = sc["voice"]
            style = sc.get("style", "")
            wav = OUT / f"{sid}.wav"
            try:
                audio, sr, model, cached = gemini_synth(clean(text), gv, style, meta.get("gemini_models", GEMINI_MODELS))
                audio = trim_norm(audio, sr)
                sf.write(wav, audio, sr)
                manifest[sid] = {"file": f"gen/tts/{sid}.wav", "duration": round(len(audio) / sr, 3), "engine": "gemini",
                                 "model": model, "voice": gv, "text": text, "style": style}
                print(f"[gemini{' cached' if cached else ''}] {sid}: {len(audio) / sr:.2f}s ({model}, {gv})")
                continue
            except Exception as e:
                fb = sc.get("fallback")
                print(f"[gemini FAILED] {sid}: {e}")
                if not fb:
                    raise
                print(f"[fallback to kokoro] {sid}")
                sc = {**sc, **fb}
        voice = sc.get("voice", meta.get("voice", "af_heart"))
        speed = float(sc.get("speed", meta.get("speed", 1.0)))
        lang = sc.get("lang", meta.get("lang", "en-us"))
        key = hashlib.sha1(json.dumps([text, voice, speed, lang]).encode()).hexdigest()[:12]
        wav = OUT / f"{sid}.wav"
        if not a.force and wav.exists() and manifest.get(sid, {}).get("hash") == key:
            print(f"[cached] {sid}: {manifest[sid]['duration']:.2f}s")
            continue
        audio, sr = synth(text, voice, speed, lang, float(sc.get("pause", 0)))
        sf.write(wav, audio, sr)
        dur = len(audio) / sr
        manifest[sid] = {"file": f"gen/tts/{sid}.wav", "duration": round(dur, 3), "hash": key, "voice": voice, "speed": speed, "text": text}
        print(f"[tts] {sid}: {dur:.2f}s  ({voice}, x{speed})")
    man_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print("manifest ->", man_path)


if __name__ == "__main__":
    sys.exit(main())
