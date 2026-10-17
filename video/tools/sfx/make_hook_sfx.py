"""Synthesise the cartoon/thriller SFX + short music cues used by the Hook composition (numpy/scipy only).

Usage: .venv\\Scripts\\python.exe tools/sfx/make_hook_sfx.py
Writes public/assets/sfx/hook/*.wav and public/assets/music/hook/*.wav (48 kHz stereo).
Everything is generated from scratch here (no samples), so it is ours / CC0-equivalent. See public/assets/sfx/SOURCES.md.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
ROOT = Path(__file__).resolve().parents[2]
SFX = ROOT / "public" / "assets" / "sfx" / "hook"
MUS = ROOT / "public" / "assets" / "music" / "hook"
rng = np.random.default_rng(11)


def T(sec):
    return np.arange(int(SR * sec)) / SR


def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR * 0.45) / (SR / 2), "low")
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x)


def bp(x, f0, f1, order=2):
    b, a = signal.butter(order, [f0 / (SR / 2), min(f1, SR * 0.45) / (SR / 2)], "band")
    return signal.lfilter(b, a, x)


def sweep_bp(x, f0, f1, q=1.4, blocks=64):
    """Block-wise moving band-pass (cheap time-varying filter)."""
    n = len(x)
    out = np.zeros(n)
    fc = np.geomspace(f0, f1, blocks)
    edges = np.linspace(0, n, blocks + 1).astype(int)
    for i in range(blocks):
        lo, hi = fc[i] / q, fc[i] * q
        seg = bp(x[max(0, edges[i] - 2000) : edges[i + 1]], lo, hi)
        out[edges[i] : edges[i + 1]] = seg[-(edges[i + 1] - edges[i]) :]
    return out


def osc(freq, sr=SR, shape="sin"):
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(freq, freq.shape if np.ndim(freq) else (1,))) / sr
    if shape == "sin":
        return np.sin(ph)
    if shape == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if shape == "sq":
        return np.sign(np.sin(ph))
    raise ValueError(shape)


def reverb(x, sec=1.6, mix=0.25, damp=5000.0):
    n = int(SR * sec)
    ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = lp(ir, damp)
    ir /= np.sqrt(np.sum(ir**2)) + 1e-9
    wet = np.pad(signal.fftconvolve(x, ir), (0, 1))[: len(x) + n]
    dry = np.pad(x, (0, n))
    return dry * (1 - mix) + wet * mix * 3.0


def norm(x, db=-3.0):
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (db / 20)


def fade(x, fin=0.003, fout=0.02):
    a, b = int(fin * SR), int(fout * SR)
    x = x.copy()
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def stereo(x, width=0.2, pan=0.0, delay_ms=9):
    d = int(SR * delay_ms / 1000)
    r = np.concatenate([np.zeros(d), x])[: len(x)]
    L = x * (1 - width) + r * width
    R = r * (1 - width) + x * width
    return np.stack([L * (1 - max(0, pan)), R * (1 + min(0, pan))], 1)


def write(dirp: Path, name: str, x, db=-3.0, **st):
    dirp.mkdir(parents=True, exist_ok=True)
    x = fade(norm(x, db)) if x.ndim == 1 else x
    if x.ndim == 1:
        x = stereo(x, **st)
    sf.write(dirp / f"{name}.wav", x.astype(np.float32), SR)
    print(f"{(dirp / name).relative_to(ROOT)}.wav  {len(x) / SR:.2f}s")


def mix_at(dst, src, t):
    i = int(t * SR)
    j = min(len(dst), i + len(src))
    dst[i:j] += src[: j - i]
    return dst


def note(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def kenney_mono(rel: str):
    x, sr = sf.read(ROOT / "public" / "assets" / "sfx" / "kenney" / rel, always_2d=True)
    x = x.mean(axis=1)
    if sr != SR:
        x = signal.resample_poly(x, SR, sr)
    return x


# ------------------------------------------------------------------ cartoon
def stage_pop():
    t = T(1.2)
    thump = osc(70 + 90 * np.exp(-t * 30)) * np.exp(-t * 9)
    click = hp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 120) * 0.5
    hum = osc(np.full(len(t), 120.0)) * 0.05 * np.exp(-t * 3)
    return reverb(thump + click + hum, 1.4, 0.3)


def boing():
    t = T(0.75)
    f = 140 + 320 * (1 - np.exp(-t * 9)) + 38 * np.sin(2 * np.pi * 17 * t) * np.exp(-t * 3)
    x = osc(f) + 0.35 * osc(f * 2.01) + 0.15 * osc(f * 3.02)
    return x * np.exp(-t * 4.5) * np.minimum(1, t * 400)


def land_thud():
    t = T(0.5)
    return osc(55 + 60 * np.exp(-t * 40)) * np.exp(-t * 14) + lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 35) * 0.6


def spin_whoosh():
    t = T(0.62)
    n = rng.standard_normal(len(t))
    x = sweep_bp(n, 500, 3200, 1.6)
    am = 0.55 + 0.45 * np.sin(2 * np.pi * (10 + 12 * t / t[-1]) * t) ** 2
    return x * am * np.sin(np.linspace(0, np.pi, len(t))) ** 1.5 * np.linspace(0.4, 1, len(t))


def bonk():
    t = T(0.9)
    f1 = 610 * (1 - 0.18 * np.minimum(1, t * 6))
    wood = osc(f1) * np.exp(-t * 22) + 0.5 * osc(f1 * 2.27) * np.exp(-t * 35) + 0.25 * osc(f1 * 3.9) * np.exp(-t * 50)
    body = osc(110 + 120 * np.exp(-t * 25)) * np.exp(-t * 12) * 0.9
    click = hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 300) * 0.7
    return reverb(wood + body + click, 0.8, 0.15)


def twinkle():
    t = T(1.4)
    x = np.zeros(len(t))
    for k, m in enumerate([88, 91, 95, 100, 96, 93]):
        tt = T(0.5)
        p = osc(np.full(len(tt), note(m))) * np.exp(-tt * 9) + 0.3 * osc(np.full(len(tt), note(m) * 2.76)) * np.exp(-tt * 16)
        mix_at(x, p * (0.9 - k * 0.08), 0.05 + k * 0.13)
    return reverb(x, 1.2, 0.35)[: len(t) + SR // 2]


def ko_pop():
    """Little 'K.O.!' comic pop: rising chirp + bell from Kenney."""
    t = T(0.25)
    chirp = osc(np.geomspace(500, 1600, len(t))) * np.exp(-t * 14)
    bell = kenney_mono("impact-sounds/Audio/impactBell_heavy_000.ogg")[: int(SR * 1.4)]
    x = np.zeros(int(SR * 1.5))
    mix_at(x, chirp * 0.6, 0)
    mix_at(x, bell * 0.8, 0.02)
    return x


def footsteps(n=4, gap=0.17, rel="impact-sounds/Audio/footstep_wood_00{}.ogg", lowpass=None, accel=1.0):
    x = np.zeros(int(SR * (gap * n + 0.6)))
    tt = 0.0
    for i in range(n):
        s = kenney_mono(rel.format(i % 5))
        if lowpass:
            s = lp(s, lowpass)
        mix_at(x, s * (0.85 + 0.15 * (i % 2)), tt)
        tt += gap
        gap *= accel
    return x


def roller_pull():
    """Ratchet clicks speeding up + cloth slide + spring rattle at the end."""
    sec = 0.9
    x = np.zeros(int(SR * sec))
    tt, g = 0.0, 0.07
    while tt < 0.55:
        c = T(0.02)
        mix_at(x, hp(rng.standard_normal(len(c)), 2000) * np.exp(-c * 400) * 0.8 + osc(np.full(len(c), 2300.0)) * np.exp(-c * 300) * 0.4, tt)
        tt += g
        g = max(0.022, g * 0.85)
    cloth = sweep_bp(rng.standard_normal(len(x)), 1800, 700, 1.8) * np.sin(np.linspace(0, np.pi, len(x))) * 0.6
    return x + cloth


def screen_bounce():
    t = T(0.7)
    th = osc(80 + 40 * np.exp(-t * 30)) * np.exp(-t * 10)
    rattle = bp(rng.standard_normal(len(t)), 600, 3000) * np.exp(-t * 9) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 26 * t))) * 0.35
    spring = osc(260 + 30 * np.sin(2 * np.pi * 9 * t)) * np.exp(-t * 6) * 0.2
    return th + rattle + spring


def lights_down():
    t = T(1.4)
    clunk = lp(rng.standard_normal(len(t)), 1200) * np.exp(-t * 40) + osc(np.full(len(t), 60.0)) * np.exp(-t * 8)
    hum = (osc(np.full(len(t), 100.0)) + 0.3 * osc(np.full(len(t), 200.0))) * 0.15 * np.exp(-t * 2.2)
    sweep = osc(np.geomspace(900, 90, len(t))) * 0.12 * np.exp(-t * 2.5)
    return reverb(clunk + hum + sweep, 1.5, 0.3)


def fabric_swoosh():
    t = T(0.7)
    n = rng.standard_normal(len(t))
    x = sweep_bp(n, 2400, 500, 1.7)
    flutter = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 21 * t + 3 * np.sin(2 * np.pi * 3 * t)))
    return x * flutter * np.sin(np.linspace(0, np.pi, len(t))) ** 1.2


# ------------------------------------------------------------------ thriller
def heartbeat_track(sec=5.4, bpm0=70, bpm1=118, accel_at=2.2):
    """Lub-dub that speeds up after `accel_at` s (H3 'followed home')."""
    x = np.zeros(int(SR * sec))
    tt = 0.15
    while tt < sec - 0.5:
        k = np.clip((tt - accel_at) / 1.5, 0, 1)
        bpm = bpm0 + (bpm1 - bpm0) * k
        for off, amp, f in ((0, 1.0, 58), (0.16, 0.7, 50)):
            b = T(0.35)
            beat = osc(f + 30 * np.exp(-b * 30)) * np.exp(-b * 13) * amp
            beat += lp(rng.standard_normal(len(b)), 200) * np.exp(-b * 30) * 0.25 * amp
            mix_at(x, beat * (0.8 + 0.3 * k), tt + off)
        tt += 60 / bpm
    return lp(x, 300)


def tense_drone(sec=5.6):
    t = T(sec)
    x = np.zeros(len(t))
    for f, a in ((41.2, 1.0), (43.7, 0.6), (82.4, 0.4), (116.5, 0.18)):  # E1, F1 (minor 2nd rub), E2, Bb2 (tritone)
        for det in (-0.08, 0.07):
            x += osc(np.full(len(t), f * 2 ** (det / 12)), shape="saw") * a
    x = lp(x, 340)
    trem = hp(rng.standard_normal(len(t)), 3000)
    trem = bp(trem, 3000, 7000) * 0.02 * (0.5 + 0.5 * np.sin(2 * np.pi * 7 * t))
    high = osc(np.full(len(t), note(76)) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t))) * 0.05
    env = np.minimum(1, t / 0.6) * np.minimum(1, (sec - t) / 0.08)
    swell = 0.7 + 0.3 * (t / sec)
    return stereo(reverb((x + trem + high) * env * swell, 2.0, 0.25)[: len(t)], width=0.35)


def paper_slam():
    t = T(1.0)
    n = rng.standard_normal(len(t))
    spin = sweep_bp(n, 600, 2600, 1.6) * np.abs(np.sin(2 * np.pi * 14 * t)) * np.clip(1 - t / 0.42, 0, 1) * 0.45
    hit_t = 0.42
    x = np.zeros(len(t))
    x += spin
    h = T(0.6)
    thud = osc(65 + 70 * np.exp(-h * 35)) * np.exp(-h * 11) * 1.1
    crinkle = bp(rng.standard_normal(len(h)), 1500, 7000) * np.exp(-h * 18) * (0.5 + 0.5 * (rng.random(len(h)) > 0.7)) * 0.5
    mix_at(x, thud + crinkle, hit_t)
    return x


def scooter():
    """Two-stroke scooter revving and speeding away (doppler + fade + lowpass with distance)."""
    sec = 1.8
    t = T(sec)
    rpm = np.interp(t, [0, 0.35, 0.6, 1.8], [38, 72, 66, 92])
    dop = np.interp(t, [0, 0.5, 0.8, 1.8], [1.06, 1.06, 0.9, 0.86])
    f = rpm * dop
    eng = osc(f, shape="saw") + 0.6 * osc(f * 2, shape="sq") * 0.3
    eng *= 1 + 0.3 * np.sign(np.sin(2 * np.pi * f / 2 * t))  # put-put
    eng = bp(eng, 120, 2400)
    dist = np.interp(t, [0, 0.4, 1.8], [1.0, 1.0, 0.08])
    eng = eng * dist
    eng = lp(eng, 2600) * 0.7 + lp(eng, 700) * 0.3
    return stereo(eng * np.minimum(1, t / 0.05), pan=0.0, width=0.3) * np.stack([np.interp(t, [0, 1.8], [0.7, 1.0]), np.interp(t, [0, 1.8], [1.0, 0.5])], 1)


def glass_smash():
    sec = 1.6
    x = np.zeros(int(SR * sec))
    t = T(sec)
    burst = hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 14) * 0.8
    x += burst
    for _ in range(70):
        tt = rng.uniform(0.0, 0.9) ** 1.6
        f = rng.uniform(2500, 9000)
        d = T(0.25)
        mix_at(x, osc(np.full(len(d), f)) * np.exp(-d * rng.uniform(25, 60)) * rng.uniform(0.15, 0.5) * np.exp(-tt * 2), tt)
    try:
        g = kenney_mono("impact-sounds/Audio/impactGlass_heavy_002.ogg")
        mix_at(x, g * 0.9, 0)
    except Exception:
        pass
    return reverb(x, 1.0, 0.18)


def footsteps_behind():
    x = footsteps(6, 0.36, "impact-sounds/Audio/footstep_concrete_00{}.ogg", lowpass=1600, accel=0.86)
    return reverb(x, 1.8, 0.4)


def shutter():
    x = np.zeros(int(SR * 0.5))
    for tt, a in ((0.0, 1.0), (0.075, 0.7)):
        c = T(0.04)
        mix_at(x, (hp(rng.standard_normal(len(c)), 1200) * np.exp(-c * 180) + osc(np.full(len(c), 1800.0)) * np.exp(-c * 200) * 0.5) * a, tt)
    w = T(0.2)
    mix_at(x, osc(np.geomspace(700, 1300, len(w)), shape="sq") * 0.04 * np.sin(np.linspace(0, np.pi, len(w))), 0.12)
    return x


def sad_whomp():
    """Sad trombone 'wah wah wah wahhh'."""
    seq = [(55, 0.28), (54, 0.28), (53, 0.28), (52, 0.95)]
    x = np.zeros(int(SR * 2.2))
    tt = 0
    for i, (m, d) in enumerate(seq):
        t = T(d + 0.05)
        vib = 1 + (0.012 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.3) if i == 3 else 0)
        f = note(m) * vib
        s = osc(f, shape="saw")
        wah = np.interp(t, [0, 0.08, d], [300, 1500, 600 if i < 3 else 380])
        # "wah": blend a dark and a bright low-pass with the mute-opening envelope
        k = (wah - 300) / 1200
        out = lp(s, 450) * (1 - k) + lp(s, 1700) * k
        out = out * np.minimum(1, t / 0.03) * np.minimum(1, (d + 0.05 - t) / 0.05)
        mix_at(x, out * (0.9 if i < 3 else 1.0), tt)
        tt += d
    return reverb(x, 1.2, 0.2)


def siren_rise(sec=1.4):
    t = T(sec)
    f = 620 + 280 * (0.5 + 0.5 * np.sin(2 * np.pi * 1.6 * t - np.pi / 2))
    x = osc(f) + 0.3 * osc(f * 2) + 0.1 * osc(f * 3)
    x = lp(x, 1800) * (t / sec) ** 1.8
    return reverb(x, 2.2, 0.45)[: len(t) + int(0.05 * SR)]


def pile_rumble(sec=1.0):
    t = T(sec)
    x = lp(rng.standard_normal(len(t)), 160) * 4 + osc(np.full(len(t), 45.0)) * 0.5
    x += bp(rng.standard_normal(len(t)), 900, 4000) * 0.08 * (rng.random(len(t)) > 0.97)
    return x * (t / sec) ** 1.2


# ------------------------------------------------------------------ music cues
def ks_pluck(freq, sec, damp=0.996):
    n = int(SR * sec)
    p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = damp * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return out


def playful_bed(sec=5.0, bpm=128):
    """Bouncy ukulele-ish plucks + soft bass (comedy intro bed, ducks under voices)."""
    beat = 60 / bpm
    x = np.zeros(int(SR * (sec + 1)))
    prog = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]]
    k = 0
    tt = 0.0
    while tt < sec:
        ch = prog[int(tt / (beat * 4)) % 4]
        if k % 2 == 0:
            mix_at(x, ks_pluck(note(ch[0] - 24), 0.4, 0.993) * 0.6, tt)
        mix_at(x, ks_pluck(note(ch[(k * 2) % 3] + 12), 0.25, 0.992) * (0.5 if k % 2 else 0.35), tt + (0.012 if k % 2 else 0))
        tt += beat / 2
        k += 1
    return stereo(reverb(lp(x, 5000), 0.8, 0.12)[: int(SR * sec)], width=0.35)


def piano_note(m, sec):
    t = T(sec)
    f = note(m)
    x = np.zeros(len(t))
    for h, a in enumerate([1.0, 0.45, 0.22, 0.12, 0.06], 1):
        x += osc(np.full(len(t), f * h * (1 + 0.0004 * h * h))) * a * np.exp(-t * (1.2 + h * 0.9))
    hammer = lp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 200) * 0.05
    return (x + hammer) * np.minimum(1, t / 0.004)


def hopeful_cue(sec=5.5):
    """Soft pad + gentle piano: Fmaj7 -> C/E -> Am7 -> G(add9) (hopeful lift)."""
    x = np.zeros(int(SR * (sec + 2)))
    chords = [[53, 57, 60, 64], [52, 55, 60, 67], [57, 60, 64, 67], [55, 59, 62, 69]]
    bar = sec / 3.2
    for i, ch in enumerate(chords):
        t0 = i * bar
        if t0 > sec:
            break
        # pad
        pt = T(bar + 1.2)
        pad = sum(sum(osc(np.full(len(pt), note(m) * 2 ** (d / 1200)), shape="saw") for d in (-7, 6)) for m in ch)
        pad = lp(pad, 900) * np.minimum(1, pt / 0.9) * np.minimum(1, np.maximum(0, (bar + 1.2 - pt)) / 0.9) * 0.05
        mix_at(x, pad, t0)
        # piano arpeggio
        arp = [ch[0] + 12, ch[2] + 12, ch[3] + 12, ch[1] + 24]
        for j, m in enumerate(arp):
            mix_at(x, piano_note(m, 2.2) * 0.28, t0 + j * bar / 4)
    x = x[: int(SR * (sec + 1.5))]
    env = np.minimum(1, T(len(x) / SR) / 0.6)
    return stereo(reverb(x * env, 2.6, 0.35)[: len(x)], width=0.4)


def main():
    write(SFX, "stage_pop", stage_pop(), -4)
    write(SFX, "boing", boing(), -5)
    write(SFX, "land_thud", land_thud(), -6)
    write(SFX, "spin_whoosh", spin_whoosh(), -5)
    write(SFX, "bonk", bonk(), -2)
    write(SFX, "twinkle", twinkle(), -9)
    write(SFX, "ko_pop", ko_pop(), -6)
    write(SFX, "footsteps_b", footsteps(4, 0.15), -7)
    write(SFX, "roller_pull", roller_pull(), -6)
    write(SFX, "screen_bounce", screen_bounce(), -6)
    write(SFX, "lights_down", lights_down(), -6)
    write(SFX, "fabric_swoosh", fabric_swoosh(), -4)
    write(SFX, "heartbeat", heartbeat_track(), -3, width=0.0)
    write(SFX, "paper_slam", paper_slam(), -3)
    write(SFX, "scooter", norm(scooter(), -4))
    write(SFX, "glass_smash", glass_smash(), -4)
    write(SFX, "footsteps_behind", footsteps_behind(), -5)
    write(SFX, "shutter", shutter(), -5)
    write(SFX, "sad_whomp", sad_whomp(), -5)
    write(SFX, "siren_rise", siren_rise(), -6)
    write(SFX, "pile_rumble", pile_rumble(), -5)
    write(MUS, "tense_drone", norm(tense_drone(), -2))
    write(MUS, "playful_bed", norm(playful_bed(), -2))
    write(MUS, "hopeful_cue", norm(hopeful_cue(), -2))


if __name__ == "__main__":
    sys.exit(main())
