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
LOW, HIGH = 0.075, 0.2  # music level relative to voice RMS: well under the voice, a little fuller in pauses
gain = (HIGH - (HIGH - LOW) * speech) * vo_rms
# swells on the thumbnail and the series ident (no narration there)
for c in tl['cuts']:
    if c['item'] == 'ident':
        a, b = int(c['t'] * SR), int((c['t'] + 3.4) * SR)
        gain[a:b] = np.maximum(gain[a:b], 0.42 * vo_rms)
gain[:int(1.4 * SR)] = np.maximum(gain[:int(1.4 * SR)], 0.35 * vo_rms)
fo = int(3 * SR)
gain[-fo:] *= np.linspace(1, 0, fo)
music *= gain[:, None]

# ---- transition SFX
sfx = np.zeros((TOTAL, 2), dtype='float32')
wh = load(os.path.join(ROOT, 'public', 'sfx', 'whoosh.wav'))
hit = load(os.path.join(ROOT, 'public', 'sfx', 'hit.wav'))
wh /= max(1e-6, np.abs(wh).max()); hit /= max(1e-6, np.abs(hit).max())
for c in tl['cuts']:
    if c['kind'] == 'cut':
        continue
    s = wh if c['kind'] in ('zoom', 'glitch', 'burn') else hit
    i = max(0, int((c['t'] - 0.25) * SR))
    j = min(TOTAL, i + len(s))
    sfx[i:j] += s[:j - i] * 0.12

mix = vo + music + sfx
mix /= max(1.0, np.abs(mix).max() / 0.95)
sf.write(os.path.join(work, 'mix.wav'), mix, SR)
print('mix written', round(TOTAL / SR, 1), 's')
