"""Narration (Kokoro, free) + the whole edit timeline.

Usage: python3 scripts/voice.py props.json work/
Reads the editorial props, speaks every beat sentence by sentence, and writes:
  work/vo.wav            full narration track, already placed on the timeline
  work/timeline.json     cut times + transition kinds + summary end (for the music/SFX mix)
  props.render.json      props + `timeline` (frames) + subtitles, for Remotion
Env: VOICE (Kokoro voice id), VOICE_SPEED (default 1.0), KOKORO_DIR (default models/).
"""
import json, os, re, sys
import numpy as np, soundfile as sf

FPS = 30
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
props_path, work = sys.argv[1], sys.argv[2]
os.makedirs(work, exist_ok=True)
props = json.load(open(props_path, encoding='utf-8'))

VOICES = ['am_michael', 'af_heart', 'bm_george', 'af_bella', 'am_fenrir', 'bf_emma', 'am_puck', 'af_nicole', 'bm_fable', 'bf_isabella']
voice = os.environ.get('VOICE') or props.get('voice') or VOICES[0]
speed = float(os.environ.get('VOICE_SPEED') or props.get('voice_speed') or 1.0)
MAX_SEC = float(os.environ.get('MAX_SEC', '360'))

# Same rotating transition sets as src/theme.ts LOOKS
LOOK_TX = [['burn', 'zoom', 'flash', 'burn'], ['glitch', 'zoom', 'glitch', 'flash'], ['zoom', 'flash', 'zoom', 'glitch'], ['zoom', 'burn', 'glitch', 'zoom']]
MIN_SEC = {'stat': 5.0, 'bars': 6.0, 'map': 5.5, 'timeline': 6.5, 'cards': 5.0, 'newspaper': 5.0, 'split': 6.0, 'multiframe': 3.5, 'filmstrip': 5.0}
THUMB_SEC, IDENT_SEC, GAP, SENT_PAUSE, CHAPTER_LEAD = 1.4, 3.4, 0.35, 0.16, 0.7

from kokoro_onnx import Kokoro
kdir = os.environ.get('KOKORO_DIR', os.path.join(ROOT, 'models'))
k = Kokoro(os.path.join(kdir, 'kokoro-v1.0.onnx'), os.path.join(kdir, 'voices-v1.0.bin'))
if voice not in k.get_voices():
    print('unknown voice', voice, '-> am_michael'); voice = 'am_michael'
lang = 'en-gb' if voice.startswith('b') else 'en-us'
SR = 24000


def clean(t):
    t = re.sub(r'\s+', ' ', str(t or '')).strip()
    # Kokoro reads "&" and "%" oddly in some voices; spell them out for speech only
    return t.replace('&', ' and ').replace('%', ' percent')


def sentences(t):
    parts = re.split(r'(?<=[.!?])\s+', t.strip())
    return [p for p in parts if p]


def speak(text):
    a, sr = k.create(clean(text), voice=voice, speed=speed, lang=lang)
    assert sr == SR, sr
    e = np.abs(a) > 0.008
    if not e.any():
        return np.zeros(int(0.3 * SR), dtype='float32')
    i = int(np.argmax(e)); j = len(a) - int(np.argmax(e[::-1]))
    return a[max(0, i - int(0.03 * SR)):min(len(a), j + int(0.08 * SR))].astype('float32')


def chunk_caption(sentence, start, end, out):
    words = sentence.split()
    n = max(1, -(-len(words) // 8))
    size = int(np.ceil(len(words) / n))
    groups = [' '.join(words[i:i + size]) for i in range(0, len(words), size)]
    total = sum(len(g) for g in groups) or 1
    t = start
    for g in groups:
        d = (end - start) * len(g) / total
        out.append({'text': g, 'start': round(t * FPS), 'end': round((t + d) * FPS)})
        t += d


def build():
    clips = []  # (start_sec, audio)
    items, caps = [], []
    tx_set = LOOK_TX[int(props.get('look', 0)) % 4]
    tx_i = 0

    def next_tx(strong):
        nonlocal tx_i
        if not strong and (tx_i % 5 in (1, 3)):  # plenty of plain cuts, like a real edit
            tx_i += 1
            return 'cut'
        tx = tx_set[tx_i % len(tx_set)]; tx_i += 1
        return tx

    t = 0.0
    items.append({'kind': 'thumb', 'start': 0, 'dur': round(THUMB_SEC * FPS), 'transition': 'cut'})
    t = THUMB_SEC
    summary_end = None
    for si, seg in enumerate(props['segments']):
        for bi, beat in enumerate(seg['beats']):
            chapter_start = seg['kind'] == 'chapter' and bi == 0
            lead = CHAPTER_LEAD if chapter_start else 0.12
            cursor = t + lead
            for s in sentences(beat['narration']):
                a = speak(s)
                clips.append((cursor, a))
                d = len(a) / SR
                chunk_caption(s, cursor, cursor + d, caps)
                cursor += d + SENT_PAUSE
            vo_end = cursor - SENT_PAUSE
            dur = max(vo_end - t + GAP, MIN_SEC.get(beat['visual'].get('type'), 3.0))
            items.append({'kind': 'beat', 'seg': si, 'beat': bi, 'start': round(t * FPS), 'dur': round(dur * FPS),
                          'chapterStart': chapter_start, 'transition': next_tx(chapter_start or bi == 0)})
            t += dur
        if seg['kind'] == 'summary':
            summary_end = t
            items.append({'kind': 'ident', 'start': round(t * FPS), 'dur': round(IDENT_SEC * FPS), 'transition': 'glitch' if tx_set[0] == 'glitch' else 'flash'})
            t += IDENT_SEC
    # outro
    cursor = t + 0.4
    for s in sentences(props['outro']['narration']):
        a = speak(s); clips.append((cursor, a)); d = len(a) / SR
        chunk_caption(s, cursor, cursor + d, caps); cursor += d + SENT_PAUSE
    outro = cursor - t + 2.2
    items.append({'kind': 'outro', 'start': round(t * FPS), 'dur': round(outro * FPS), 'transition': 'burn' if 'burn' in tx_set else 'zoom'})
    t += outro
    # frame-exact contiguity: each item starts where the previous ends
    for a, b in zip(items, items[1:]):
        a['dur'] = b['start'] - a['start']
    total = items[-1]['start'] + items[-1]['dur']
    return clips, items, caps, total, summary_end


clips, items, caps, total, summary_end = build()
total_sec = total / FPS
if total_sec > MAX_SEC and speed < 1.1:
    print(f'{total_sec:.1f}s is over {MAX_SEC}s; re-voicing at 1.08x')
    speed = 1.08
    clips, items, caps, total, summary_end = build()
    total_sec = total / FPS
if total_sec > MAX_SEC + 5:
    raise SystemExit(f'Video would be {total_sec:.0f}s (> {MAX_SEC:.0f}s). Shorten the script.')

track = np.zeros(int(total_sec * SR) + SR, dtype='float32')
for start, a in clips:
    i = int(start * SR); track[i:i + len(a)] += a[:max(0, len(track) - i)]
sf.write(os.path.join(work, 'vo.wav'), track, SR)

timeline = {'fps': FPS, 'total': total, 'summaryEnd': round(summary_end * FPS), 'items': items, 'captions': caps}
props['timeline'] = timeline
props['voice'] = voice
props['has_logo'] = os.path.exists(os.path.join(ROOT, 'public', 'logo.png'))
json.dump(props, open(os.path.join(ROOT, 'props.render.json'), 'w', encoding='utf-8'), ensure_ascii=False)
json.dump({'fps': FPS, 'total_sec': total_sec, 'summary_end_sec': summary_end,
           'cuts': [{'t': it['start'] / FPS, 'kind': it.get('transition', 'cut'), 'item': it['kind']} for it in items[1:]]},
          open(os.path.join(work, 'timeline.json'), 'w'))
print(f'voice={voice} speed={speed} total={total_sec:.1f}s summary_end={summary_end:.1f}s beats={sum(1 for i in items if i["kind"] == "beat")}')
