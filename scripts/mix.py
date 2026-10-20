"""Final soundtrack: narration on top, low documentary music ducked under the voice, soft transition SFX.

Usage: python3 scripts/mix.py work/ <seed-string>
Reads work/vo.wav + work/timeline.json, picks a music bed (public/music/user-*.mp3 first, else doc-*.mp3),
writes work/mix.wav (48 kHz stereo). Loudness is normalised later in render.py (-14 LUFS).
"""
import glob, json, os, subprocess, sys
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from scipy.ndimage import uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
work, seed = sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'x'
SR = 48000
tl = json.load(open(os.path.join(work, 'timeline.json')))
TOTAL = int(tl['total_sec'] * SR) + SR


def load(path):
    if path.endswith('.wav'):
        a, sr = sf.read(path, dtype='float32', always_2d=True)
    else:
        tmp = os.path.join(work, '_dec.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-ar', str(SR), '-ac', '2', tmp], check=True)
        a, sr = sf.read(tmp, dtype='float32', always_2d=True)
    if sr != SR:
        a = resample_poly(a, SR, sr, axis=0).astype('float32')
    if a.shape[1] == 1:
        a = np.repeat(a, 2, axis=1)
    return a


def fit(a, n):
    out = np.zeros((n, 2), dtype='float32')
    out[:min(n, len(a))] = a[:n]
    return out


vo = fit(load(os.path.join(work, 'vo.wav')), TOTAL)
vo /= max(1e-6, np.abs(vo).max()) / 0.9

# ---- music: user tracks win; same video id -> same track, consecutive days -> different tracks
tracks = sorted(glob.glob(os.path.join(ROOT, 'public', 'music', 'user-*.mp3'))) or sorted(glob.glob(os.path.join(ROOT, 'public', 'music', 'doc-*.mp3')))
h = 0
for ch in seed:
    h = (h * 31 + ord(ch)) & 0xFFFFFFFF
music = np.zeros((TOTAL, 2), dtype='float32')
if tracks:
    m = load(tracks[h % len(tracks)])
    xf = int(3 * SR)
    fade = np.linspace(0, 1, xf, dtype='float32')[:, None]
    body = m[int(3 * SR):-int(4.5 * SR)]  # generated beds have a baked fade in/out; loop only the steady body
    out = m[:-int(4.5 * SR)].copy()
    while len(out) < TOTAL:  # crossfade loop
        out = np.concatenate([out[:-xf], out[-xf:] * (1 - fade) + body[:xf] * fade, body[xf:]])
    music = out[:TOTAL]
    music /= max(1e-6, np.sqrt((music ** 2).mean()))
    print('music:', os.path.basename(tracks[h % len(tracks)]))

# speech envelope -> ducking curve
env = np.abs(vo[:, 0])
win = int(0.05 * SR)
env = uniform_filter1d(env, win)
speech = (env > 0.01).astype('float32')
att, rel = int(0.08 * SR), int(0.5 * SR)
speech = np.minimum(1, uniform_filter1d(speech, rel) * 3)
vo_rms = np.sqrt((vo[env > 0.01] ** 2).mean()) if (env > 0.01).any() else 0.1
LOW, HIGH = 0.15, 0.48  # music: clearly present under the voice, rising to fill every pause
gain = (HIGH - (HIGH - LOW) * speech) * vo_rms
gain[:int(1.0 * SR)] = np.maximum(gain[:int(1.0 * SR)], 0.55 * vo_rms)  # opening swell on the title frame
for c in tl['cuts']:  # lift at each new section and under the outro
    if c['kind'] == 'section' or c['item'] == 'outro':
        a_, b_ = int((c['t'] - 0.9) * SR), int((c['t'] + 0.4) * SR)
        gain[max(0, a_):b_] = np.maximum(gain[max(0, a_):b_], 0.5 * vo_rms)
gain = uniform_filter1d(gain, int(0.25 * SR))  # smooth rides, no pumping
fo = int(3 * SR)
gain[-fo:] *= np.linspace(1, 0, fo)
music *= gain[:, None]


# ---- sound design: synthesised (owned, no claims), placed exactly on the cuts the picture makes
def tone(f0, dur, decay, partials=(1, 2.01, 3.02), amp=(1, .35, .15)):
    t = np.arange(int(dur * SR)) / SR
    w = sum(a * np.sin(2 * np.pi * f0 * k * t) for k, a in zip(partials, amp)) * np.exp(-t / decay)
    return np.repeat((w / np.abs(w).max()).astype('float32')[:, None], 2, axis=1)


def riser(dur):
    t = np.arange(int(dur * SR)) / SR
    rng = np.random.default_rng(7)
    noise = uniform_filter1d(rng.standard_normal(len(t)).astype('float32'), 6)
    sweep = np.sin(2 * np.pi * np.cumsum(np.linspace(180, 900, len(t))) / SR)
    w = (0.6 * noise / np.abs(noise).max() + 0.4 * sweep) * (t / dur) ** 2.2
    return np.repeat(w.astype('float32')[:, None], 2, axis=1)


sfx = np.zeros((TOTAL, 2), dtype='float32')
wh = load(os.path.join(ROOT, 'public', 'sfx', 'whoosh.wav'))
hit = load(os.path.join(ROOT, 'public', 'sfx', 'hit.wav'))
wh /= max(1e-6, np.abs(wh).max()); hit /= max(1e-6, np.abs(hit).max())
blip = tone(1320, 0.35, 0.07)
pulse = tone(55, 1.2, 0.35, (1, 2), (1, .3))
rise = riser(0.9)
R = vo_rms


def put(clip, t, level):
    i = int(t * SR)
    if i < 0:
        clip, i = clip[-i:], 0
    j = min(TOTAL, i + len(clip))
    if j > i:
        sfx[i:j] += clip[:j - i] * level * R


put(hit, 1.0, 0.9); put(pulse, 1.0, 0.7)  # cold open lands with an impact as the narration starts
for c in tl['cuts']:
    t, k = c['t'], c.get('shot')
    if c['kind'] == 'section':
        put(rise, t - 0.9, 0.35); put(wh, t - 0.25, 0.45); put(pulse, t, 0.45)
    elif k == 'kinetic':
        put(hit, t, 0.5)
    elif k in ('counter', 'compare', 'units', 'chart'):
        put(blip, t + 0.05, 0.22)
    elif k in ('globe', 'route', 'footage', 'agenda'):
        put(wh, t - 0.2, 0.25)
    elif k == 'outro':
        put(hit, t, 0.6); put(pulse, t, 0.5)

mix = vo + music + sfx
mix /= max(1.0, np.abs(mix).max() / 0.95)
sf.write(os.path.join(work, 'mix.wav'), mix, SR)
print('mix written', round(TOTAL / SR, 1), 's')
