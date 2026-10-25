# Procedural SFX (no music). Writes public/audio/<name>.wav, 48 kHz mono 16-bit.
import numpy as np, wave, os

SR = 48000
rng = np.random.default_rng(7)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sfx")


def save(name, x):
    x = np.asarray(x, dtype=np.float64)
    x = x / max(1e-9, np.max(np.abs(x))) * 0.89
    fade = min(len(x), int(0.006 * SR))
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade:] *= np.linspace(1, 0, fade)
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def t_(d):
    return np.arange(int(d * SR)) / SR


def env(t, a, d):
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def lp(x, k):  # one-pole lowpass, k in (0,1]
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += k * (v - acc)
        y[i] = acc
    return y


def bp_noise(d, k_lo, k_hi):
    n = rng.standard_normal(int(d * SR))
    return lp(n, k_hi) - lp(n, k_lo)


# car pass-by: engine hum with doppler + tyre noise, loud in the middle
t = t_(1.3)
f = 95 * (1 + 0.18 * np.tanh((0.65 - t) * 6))
ph = 2 * np.pi * np.cumsum(f) / SR
hum = np.sign(np.sin(ph)) * 0.3 + np.sin(2 * ph) * 0.4
tyre = bp_noise(1.3, 0.02, 0.25)
shape = np.exp(-((t - 0.65) / 0.28) ** 2)
save("car_pass", lp(hum, 0.08) * shape + tyre * shape * 0.8)

# stamp: low thud + paper slap
t = t_(0.45)
thud = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 30)) * t) * env(t, 0.002, 0.09)
slap = bp_noise(0.45, 0.05, 0.6) * env(t, 0.001, 0.03)
save("stamp", thud + slap * 0.7)

# thud (heavier, for scale / lock / armor)
t = t_(0.6)
save("thud", np.sin(2 * np.pi * (55 + 50 * np.exp(-t * 25)) * t) * env(t, 0.002, 0.15) + bp_noise(0.6, 0.01, 0.2) * env(t, 0.001, 0.05) * 0.5)

# ka-ching: coin rattle + two bell partials
t = t_(1.1)
bell = sum(np.sin(2 * np.pi * fr * t) * env(t, 0.002, 0.35) * a for fr, a in [(2093, 1), (2637, 0.7), (4186, 0.3)])
bell2 = np.concatenate([np.zeros(int(0.09 * SR)), bell[: len(t) - int(0.09 * SR)]])
coins = bp_noise(1.1, 0.3, 0.95) * env(t, 0.001, 0.08) * 0.6
save("cash", bell * 0.6 + bell2 * 0.6 + coins)

# printer: rhythmic buzz
t = t_(1.4)
buzz = np.sign(np.sin(2 * np.pi * 180 * t)) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 7 * t)))
save("printer", lp(buzz, 0.2) * 0.6 + bp_noise(1.4, 0.1, 0.5) * 0.15)

# keypad beep
t = t_(0.12)
save("beep", np.sin(2 * np.pi * 1320 * t) * env(t, 0.002, 0.05))

# success chime (two rising tones)
t = t_(0.7)
a = np.sin(2 * np.pi * 880 * t) * env(t, 0.003, 0.2)
b = np.sin(2 * np.pi * 1318 * t) * env(t, 0.003, 0.25)
save("chime", a + np.concatenate([np.zeros(int(0.12 * SR)), b[: len(t) - int(0.12 * SR)]]))

# metal clang
t = t_(1.2)
save("clang", sum(np.sin(2 * np.pi * fr * t) * np.exp(-t * dcy) for fr, dcy in [(420, 4), (1130, 6), (1870, 7), (2990, 9)]) * env(t, 0.001, 0.5))

# engine rev (vroom)
t = t_(1.8)
f = 70 + 160 * np.sin(np.pi * np.minimum(t / 1.5, 1)) ** 2
ph = 2 * np.pi * np.cumsum(f) / SR
x = np.tanh(3 * (np.sin(ph) + 0.5 * np.sin(2 * ph) + 0.3 * np.sin(3.01 * ph)))
save("vroom", lp(x, 0.12) * np.minimum(1, t / 0.1) * np.exp(-np.maximum(0, t - 1.3) * 6) + bp_noise(1.8, 0.02, 0.2) * 0.25)

# peel / tear: rising noise sweep
t = t_(1.6)
n = rng.standard_normal(len(t))
out = np.zeros_like(n)
acc = 0.0
for i in range(len(n)):
    k = 0.03 + 0.4 * (i / len(n))
    acc += k * (n[i] - acc)
    out[i] = acc
save("peel", out * (0.3 + 0.7 * np.abs(np.sin(2 * np.pi * 13 * t))) * np.minimum(1, t / 0.1))

# page flutter (calendar flip)
t = t_(1.6)
flut = bp_noise(1.6, 0.05, 0.5) * (0.4 + 0.6 * (np.sin(2 * np.pi * 14 * t) > 0.6))
save("flutter", flut * np.minimum(1, t / 0.05) * np.minimum(1, (1.6 - t) / 0.3))

# spotlight clunk + electric hum
t = t_(1.2)
save("spot", np.sin(2 * np.pi * 60 * t) * env(t, 0.001, 0.08) * 1.2 + np.sin(2 * np.pi * 100 * t) * 0.15 * np.exp(-t * 1.5) + bp_noise(1.2, 0.02, 0.3) * env(t, 0.001, 0.04))

# soft whoosh-up (short)
t = t_(0.6)
n = rng.standard_normal(len(t))
save("swish", lp(n, 0.15) * np.sin(np.pi * t / 0.6) ** 2)

# small pop tick (tally)
t = t_(0.08)
save("tick", np.sin(2 * np.pi * (900 - 4000 * t) * t) * env(t, 0.001, 0.02))

# gear/whirr loop 2.5s
t = t_(2.5)
save("whirr", lp(np.sign(np.sin(2 * np.pi * 42 * t)) + 0.3 * rng.standard_normal(len(t)), 0.05) * np.minimum(1, t / 0.3) * np.minimum(1, (2.5 - t) / 0.4))

# sad trombone-ish low "wah" (joy -> 0)
t = t_(1.2)
f = 196 * np.exp(-t * 0.4)
save("wah", lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 0.06) * env(t, 0.03, 0.6))

print("ok", sorted(os.listdir(OUT)))

# --- conveyor additions ---
t = t_(0.12)
save("pop", np.sin(2 * np.pi * (380 + 900 * np.exp(-t * 40)) * t) * env(t, 0.001, 0.035))
t = t_(0.05)
save("click", bp_noise(0.05, 0.3, 0.9) * env(t, 0.0005, 0.008))
t = t_(1.2)
n = rng.standard_normal(len(t))
save("riser", (lp(n, 0.03) * (1 - (t / 1.2)) + lp(n, 0.3) * (t / 1.2)) * (t / 1.2) ** 1.5)
t = t_(0.5)
save("whoosh", lp(rng.standard_normal(len(t)), 0.08) * np.sin(np.pi * t / 0.5) ** 3)
print("sfx ok")
