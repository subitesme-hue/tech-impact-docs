"""V3 narration + edit timeline, cut on spoken words.

Usage: python3 scripts/voice.py props.json work/
For each beat, Kokoro speaks the narration and returns WORD timestamps (same method as the history-shorts pipeline:
kokoro.KPipeline tokens .start_ts/.end_ts). Each shot after the first starts on its cue word ("at"), so pictures change
exactly when the narrator says the thing. Sections flow straight on (no title cards, no dead air).
Writes work/vo.wav, work/timeline.json and props.render.json.
Env: VOICE, VOICE_SPEED (default 1.1), MAX_SEC (default 215).
"""
import json, os, re, sys
import numpy as np, soundfile as sf

FPS, SR = 30, 24000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
props_path, work = sys.argv[1], sys.argv[2]
os.makedirs(work, exist_ok=True)
props = json.load(open(props_path, encoding='utf-8'))
voice = os.environ.get('VOICE') or props.get('voice') or 'am_michael'
speed = float(os.environ.get('VOICE_SPEED') or 1.1)
MAX_SEC = float(os.environ.get('MAX_SEC', '215'))
THUMB_SEC, BEAT_GAP, SECTION_GAP, MIN_SHOT, OUTRO_TAIL = 1.0, 0.14, 0.32, 1.1, 2.2


def clean(t):
    return re.sub(r'\s+', ' ', str(t or '')).strip().replace('&', ' and ').replace('%', ' percent')


# ---------------- TTS with word timings ----------------
try:
    from kokoro import KPipeline
    _pipe = KPipeline(lang_code='b' if voice.startswith('b') else 'a')

    def tts(text):
        words, chunks, offset = [], [], 0.0
        for r in _pipe(clean(text), voice=voice, speed=speed, split_pattern=None):
            if r.audio is None:
                continue
            a = r.audio.detach().cpu().numpy() if hasattr(r.audio, 'detach') else np.asarray(r.audio)
            prev_ws = ' '
            for tk in r.tokens or []:
                has = tk.start_ts is not None and tk.end_ts is not None
                glue = words and (prev_ws == '' or re.fullmatch(r'[^\w]+', tk.text))
                if glue:
                    w = words[-1]; words[-1] = (w[0] + tk.text, w[1], (offset + tk.end_ts) if has else w[2])
                elif has and tk.text.strip():
                    words.append((tk.text, offset + tk.start_ts, offset + tk.end_ts))
                prev_ws = tk.whitespace
            chunks.append(a.astype('float32')); offset += len(a) / SR
        audio = np.concatenate(chunks) if chunks else np.zeros(int(0.3 * SR), 'float32')
        return audio, words
    ENGINE = 'kokoro (word timestamps)'
except Exception as e:  # local fallback: onnx voice, word times spread by length
    print('KPipeline unavailable -> onnx fallback:', e)
    from kokoro_onnx import Kokoro
    kdir = os.environ.get('KOKORO_DIR', os.path.join(ROOT, 'models'))
    _k = Kokoro(os.path.join(kdir, 'kokoro-v1.0.onnx'), os.path.join(kdir, 'voices-v1.0.bin'))

    def tts(text):
        a, sr = _k.create(clean(text), voice=voice, speed=speed, lang='en-gb' if voice.startswith('b') else 'en-us')
        ws = clean(text).split(); tot = sum(len(w) + 1 for w in ws) or 1; dur = len(a) / sr; t = 0.0; out = []
        for w in ws:
            d = dur * (len(w) + 1) / tot; out.append((w, t, t + d)); t += d
        return a.astype('float32'), out
    ENGINE = 'kokoro-onnx (estimated word times)'

norm = lambda s: re.sub(r'[^a-z0-9]+', '', s.lower())


def cue_index(words, phrase, after):
    target = [norm(x) for x in str(phrase or '').split() if norm(x)]
    if not target:
        return None
    ws = [norm(w[0]) for w in words]
    for i in range(after + 1, len(ws)):
        if ws[i] == target[0] or (len(target[0]) > 3 and ws[i].startswith(target[0][:5])):
            if all(i + k < len(ws) and ws[i + k] == target[k] for k in range(1, min(2, len(target)))):
                return i
    return None


def build():
    clips, items = [], []
    items.append({'kind': 'thumb', 'start': 0, 'dur': round(THUMB_SEC * FPS)})
    t = THUMB_SEC
    summary_end = None
    for si, seg in enumerate(props['segments']):
        for bi, beat in enumerate(seg['beats']):
            audio, words = tts(beat['narration'])
            beat_start = t
            clips.append((t + 0.06, audio))
            vo_end = t + 0.06 + len(audio) / SR
            shots = beat.get('shots') or [{'kind': 'kinetic', 'text': beat['narration'][:40]}]
            # shot start times from cue words
            starts, last_i = [beat_start], -1
            for j, sh in enumerate(shots[1:], 1):
                i = cue_index(words, sh.get('at'), last_i)
                if i is None:  # spread evenly over the words if the cue is missing
                    i = min(len(words) - 1, max(last_i + 1, round(len(words) * j / len(shots))))
                last_i = i
                starts.append(t + 0.06 + words[i][1] - 0.08 if words else beat_start + j)
            end = vo_end + (SECTION_GAP if bi == len(seg['beats']) - 1 else BEAT_GAP)
            # drop cuts that would make a shot too short
            keep = [0]
            for j in range(1, len(starts)):
                if starts[j] - starts[keep[-1]] >= MIN_SHOT and end - starts[j] >= MIN_SHOT:
                    keep.append(j)
            for n, j in enumerate(keep):
                s0 = starts[j]; s1 = starts[keep[n + 1]] if n + 1 < len(keep) else end
                items.append({'kind': 'shot', 'seg': si, 'beat': bi, 'shot': j, 'start': round(s0 * FPS), 'dur': max(1, round((s1 - s0) * FPS)),
                              'sectionStart': bi == 0 and n == 0 and seg['kind'] == 'chapter'})
            t = end
        if seg['kind'] == 'summary':
            summary_end = t
    audio, _ = tts(props['outro']['narration'])
    clips.append((t + 0.3, audio))
    items.append({'kind': 'outro', 'start': round(t * FPS), 'dur': round((0.3 + len(audio) / SR + OUTRO_TAIL) * FPS)})
    for a, b in zip(items, items[1:]):
        a['dur'] = b['start'] - a['start']
    total = items[-1]['start'] + items[-1]['dur']
    return clips, items, total, summary_end or THUMB_SEC


clips, items, total, summary_end = build()
if total / FPS > MAX_SEC and speed < 1.17:
    print(f'{total / FPS:.1f}s > {MAX_SEC}s: re-voicing at 1.18x'); speed = 1.18
    clips, items, total, summary_end = build()
if total / FPS > MAX_SEC + 15:
    raise SystemExit(f'Episode would be {total / FPS:.0f}s; shorten the script.')

track = np.zeros(int(total / FPS * SR) + SR, dtype='float32')
for start, a in clips:
    i = int(start * SR); track[i:i + len(a)] += a[:max(0, len(track) - i)]
sf.write(os.path.join(work, 'vo.wav'), track, SR)

props['timeline'] = {'fps': FPS, 'total': total, 'summaryEnd': round(summary_end * FPS), 'items': items}
props['voice'] = voice
props['voice_engine'] = ENGINE
props['has_logo'] = os.path.exists(os.path.join(ROOT, 'public', 'logo.png'))
json.dump(props, open(os.path.join(ROOT, 'props.render.json'), 'w', encoding='utf-8'), ensure_ascii=False)
json.dump({'fps': FPS, 'total_sec': total / FPS, 'summary_end_sec': summary_end,
           'cuts': [{'t': it['start'] / FPS, 'kind': 'section' if it.get('sectionStart') else 'cut', 'item': it['kind']} for it in items[1:]]},
          open(os.path.join(work, 'timeline.json'), 'w'))
n_shots = sum(1 for i in items if i['kind'] == 'shot')
print(f'{ENGINE} | voice={voice} speed={speed} | {total / FPS:.1f}s, intro ends {summary_end:.1f}s, {n_shots} shots '
      f'(avg {(total / FPS) / max(1, n_shots):.1f}s per shot)')
