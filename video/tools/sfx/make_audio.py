"""Synthesise license-free cinematic SFX + an ambient 'night tech' music bed with numpy (no models, no downloads).

Usage: .venv\\Scripts\\python.exe tools/sfx/make_audio.py [--music-seconds 120] [--bpm 96]
Writes public/assets/sfx/synth/*.wav and public/assets/music/synth/night_pulse.wav (48 kHz stereo).
Everything here is generated from scratch, so it is ours to use (no attribution needed).
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 48000
ROOT = Path(__file__).resolve().parents[2]
rng = np.random.default_rng(7)


def t_axis(sec):
    return np.arange(int(SR * sec)) / SR


def env_adsr(n, a, d, s, r):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sus = max(0, n - a - d - r)
    e = np.concatenate([np.linspace(0, 1, a, False), np.linspace(1, s, d, False), np.full(sus, s), np.linspace(s, 0, r)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def onepole_lp(x, cutoff):
    """Time-varying one-pole low-pass; cutoff may be an array (Hz)."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def bandsweep(noise, f0, f1):
    n = len(noise)
    fc = np.geomspace(f0, f1, n)
    lo = onepole_lp(noise, fc * 1.6)
    return lo - onepole_lp(lo, fc * 0.6)


def stereo(x, width=0.25, delay_ms=11):
    d = int(SR * delay_ms / 1000)
    r = np.concatenate([np.zeros(d), x])[: len(x)]
    return np.stack([x * (1 - width) + r * width, r * (1 - width) + x * width], 1)


def reverb(x, sec=2.2, mix=0.3):
    n = int(SR * sec)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = onepole_lp(ir, 5000.0)
    wet = np.fft.irfft(np.fft.rfft(x, len(x) + n) * np.fft.rfft(ir, len(x) + n))[: len(x) + n]
    wet /= np.max(np.abs(wet)) + 1e-9
    out = np.pad(x, (0, n)) * (1 - mix) + wet * mix * np.max(np.abs(x))
    return out


def norm(x, db=-3.0):
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (db / 20)


def write(path: Path, x):
    path.parent.mkdir(parents=True, exist_ok=True)
    if x.ndim == 1:
        x = stereo(x)
    sf.write(path, x.astype(np.float32), SR)
    print(f"{path.relative_to(ROOT)}  {len(x) / SR:.2f}s")


def whoosh(sec=0.9, f0=300, f1=4500, reverse=False):
    n = int(SR * sec)
    x = bandsweep(rng.standard_normal(n), f0, f1)
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    x = x * e
    return norm(x[::-1] if reverse else x, -4)


def riser(sec=2.0):
    t = t_axis(sec)
    f = np.geomspace(120, 1400, len(t))
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.2
    noise = bandsweep(rng.standard_normal(len(t)), 400, 8000) * 0.8
    e = np.linspace(0, 1, len(t)) ** 2.2
    return norm((tone + noise) * e, -4)


def boom(sec=2.5):
    t = t_axis(sec)
    f = 38 + 60 * np.exp(-t * 9)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    click = onepole_lp(rng.standard_normal(len(t)), 3000.0) * np.exp(-t * 40) * 0.6
    return norm(reverb(sub + click, 2.0, 0.25), -2)


def tick(sec=0.12, freq=2400):
    t = t_axis(sec)
    return norm(np.sin(2 * np.pi * freq * t) * np.exp(-t * 60) + 0.3 * np.sin(2 * np.pi * freq * 2.01 * t) * np.exp(-t * 90), -6)


def shimmer(sec=1.6):
    t = t_axis(sec)
    x = sum(np.sin(2 * np.pi * f * t + i) * np.exp(-t * (2 + i)) for i, f in enumerate([1318.5, 1975.5, 2637, 3951]))
    return norm(reverb(x * env_adsr(len(t), 0.01, 0.2, 0.5, 1.0), 2.5, 0.45), -6)


def blip_up(sec=0.35):
    t = t_axis(sec)
    f = np.geomspace(600, 1800, len(t))
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_adsr(len(t), 0.005, 0.1, 0.4, 0.2), -6)


# ---------------- music bed ----------------
def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def pad_voice(freq, sec):
    t = t_axis(sec)
    x = np.zeros_like(t)
    for det in (-0.12, 0.0, 0.11):  # detuned saws (band-limited-ish via few harmonics)
        f = freq * 2 ** (det / 12)
        for h in range(1, 9):
            x += np.sin(2 * np.pi * f * h * t + rng.uniform(0, 6.28)) / h
    return x * env_adsr(len(t), 1.2, 0.5, 0.8, 1.5)


def night_pulse(seconds=120, bpm=96):
    """Dark, hopeful ambient bed: Am - F - C - G pads, soft 8th-note pluck arp, sub pulse on beats; loops cleanly."""
    beat = 60 / bpm
    bar = beat * 4
    prog = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]  # Am F C G (voicings)
    bars = int(np.ceil(seconds / bar))
    n = int(SR * bars * bar)
    L = np.zeros(n + SR * 4)
    R = np.zeros(n + SR * 4)
    for b in range(bars):
        root, chord = prog[b % 4]
        s0 = int(b * bar * SR)
        pad = sum(pad_voice(note(m), bar + 1.5) for m in chord)
        pad = onepole_lp(pad, 1400.0) * 0.05
        L[s0 : s0 + len(pad)] += pad
        R[s0 : s0 + len(pad)] += np.roll(pad, 300)
        # sub pulse on each beat (sidechain-ish feel)
        for k in range(4):
            t = t_axis(beat * 0.9)
            sub = np.sin(2 * np.pi * note(root - 24) * t) * np.exp(-t * 4) * 0.22
            i = s0 + int(k * beat * SR)
            L[i : i + len(sub)] += sub
            R[i : i + len(sub)] += sub
        # arpeggio from bar 2 onward (intro = pads only)
        if b >= 2:
            arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24]
            for k in range(8):
                t = t_axis(beat * 0.6)
                f = note(arp[k % 4])
                pl = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * np.exp(-t * 7) * 0.06
                i = s0 + int(k * beat / 2 * SR)
                pan = 0.5 + 0.35 * np.sin(k * 0.9)
                L[i : i + len(pl)] += pl * (1 - pan)
                R[i : i + len(pl)] += pl * pan
    L, R = reverb(L, 3.0, 0.35)[: len(L)], reverb(R, 3.2, 0.35)[: len(R)]
    x = np.stack([L, R], 1)[:n]
    # loop crossfade: blend the reverb tail into the start
    x = norm(x, -1.0)
    return x


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--music-seconds", type=float, default=120)
    ap.add_argument("--bpm", type=float, default=96)
    a = ap.parse_args()
    out = ROOT / "public" / "assets" / "sfx" / "synth"
    write(out / "whoosh.wav", whoosh())
    write(out / "whoosh_fast.wav", whoosh(0.45, 500, 7000))
    write(out / "whoosh_rev.wav", whoosh(1.2, 200, 3500, reverse=True))
    write(out / "riser.wav", riser())
    write(out / "boom.wav", boom())
    write(out / "tick.wav", tick())
    write(out / "shimmer.wav", shimmer())
    write(out / "blip_up.wav", blip_up())
    write(ROOT / "public" / "assets" / "music" / "synth" / "night_pulse.wav", night_pulse(a.music_seconds, a.bpm))


if __name__ == "__main__":
    main()
