"""Chatterbox worker. Runs in the separate venv (.venv-cb), NOT the main .venv.

Usage: .venv-cb\\Scripts\\python.exe tools/tts/cb_worker.py jobs.json
jobs.json = list of {"text","ref","exaggeration","cfg_weight","out","seed"?,"temperature"?}
Loads the model once, writes each out wav (model sample rate, 24 kHz), prints one JSON line per job.
Cache/hash logic lives in tts.py (caller); this file only synthesises.
"""
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
os.environ.setdefault("HF_HOME", str(ROOT / "models" / "hf"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")


def main():
    import torch
    import soundfile as sf
    from chatterbox.tts import ChatterboxTTS

    jobs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    dev = os.environ.get("CB_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
    t0 = time.time()
    model = ChatterboxTTS.from_pretrained(device=dev)
    print(json.dumps({"event": "loaded", "device": dev, "s": round(time.time() - t0, 1),
                      "vram_mb": round(torch.cuda.memory_allocated() / 2**20) if dev == "cuda" else 0}), flush=True)
    for j in jobs:
        seed = int(j.get("seed", 0))
        torch.manual_seed(seed)
        if dev == "cuda":
            torch.cuda.manual_seed_all(seed)
            torch.cuda.reset_peak_memory_stats()
        t = time.time()
        wav = model.generate(j["text"], audio_prompt_path=j["ref"], exaggeration=float(j["exaggeration"]),
                             cfg_weight=float(j["cfg_weight"]), temperature=float(j.get("temperature", 0.8)))
        a = wav.squeeze().cpu().numpy()
        sf.write(j["out"], a, model.sr, subtype="PCM_16")
        print(json.dumps({"event": "done", "out": j["out"], "gen_s": round(time.time() - t, 2), "dur": round(len(a) / model.sr, 2),
                          "peak_vram_mb": round(torch.cuda.max_memory_allocated() / 2**20) if dev == "cuda" else 0}), flush=True)


if __name__ == "__main__":
    main()
