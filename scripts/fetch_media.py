"""Find and prepare real stock footage / photos for every shot (Pexels first, Pixabay second).

Usage: python3 scripts/fetch_media.py props.render.json
Needs env PEXELS_API_KEY and/or PIXABAY_API_KEY. Writes files to public/media/ and fills `media` / `medias`
in props.render.json. Clips are cut to the shot length, scaled/cropped to 1920x1080 @30fps, no audio.
Never fails the render: a shot with nothing found falls back to the designed abstract background.
API shapes verified against pexels.com/api/documentation and pixabay.com/api/docs (Oct 2026).
"""
import json, os, re, subprocess, sys, time, urllib.parse, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROPS = sys.argv[1]
OUT = os.path.join(ROOT, 'public', 'media')
os.makedirs(OUT, exist_ok=True)
USED_PATH = os.path.join(ROOT, 'used_media.json')
PEX = os.environ.get('PEXELS_API_KEY', '').strip()
PIX = os.environ.get('PIXABAY_API_KEY', '').strip()
UA = {'User-Agent': 'tech-impact-docs/1.0 (T&I News)'}

p = json.load(open(PROPS, encoding='utf-8'))
used_list = json.load(open(USED_PATH)) if os.path.exists(USED_PATH) else []
used = set(used_list)
fresh = []
credits = []
cache = {}


def get_json(url, headers=None):
    if url in cache:
        return cache[url]
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={**UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=30) as r:
                cache[url] = json.load(r)
                return cache[url]
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(20); continue
            if e.code == 404:
                return None
            print('HTTP', e.code, url.split('?')[0]); return None
        except Exception as e:
            print('fetch error', e); time.sleep(3)
    return None


def download(url, path):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=120) as r, open(path, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            f.write(b)


# ---------------- providers ----------------
def pexels_videos(q):
    if not PEX:
        return []
    qs = urllib.parse.urlencode({'query': q, 'orientation': 'landscape', 'size': 'medium', 'per_page': 20})
    d = get_json('https://api.pexels.com/v1/videos/search?' + qs, {'Authorization': PEX}) or \
        get_json('https://api.pexels.com/videos/search?' + qs, {'Authorization': PEX}) or {}
    out = []
    for v in d.get('videos', []):
        files = [f for f in v.get('video_files', []) if f.get('file_type') == 'video/mp4' and (f.get('width') or 0) >= 1280]
        if not files:
            continue
        best = min(files, key=lambda f: abs((f.get('width') or 0) - 1920))
        out.append({'id': f"pexels-v-{v['id']}", 'url': best['link'], 'duration': v.get('duration') or 0,
                    'credit': f"Video by {v.get('user', {}).get('name', 'Pexels')} on Pexels", 'page': v.get('url', '')})
    return out


def pixabay_videos(q):
    if not PIX:
        return []
    qs = urllib.parse.urlencode({'key': PIX, 'q': q[:100], 'per_page': 20, 'safesearch': 'true', 'video_type': 'film'})
    d = get_json('https://pixabay.com/api/videos/?' + qs) or {}
    out = []
    for h in d.get('hits', []):
        vs = h.get('videos', {})
        f = next((vs[k] for k in ('medium', 'large', 'small') if vs.get(k, {}).get('url') and vs[k].get('width', 0) >= 1280), None)
        if f:
            out.append({'id': f"pixabay-v-{h['id']}", 'url': f['url'], 'duration': h.get('duration') or 0,
                        'credit': f"Video by {h.get('user', 'Pixabay')} on Pixabay", 'page': h.get('pageURL', '')})
    return out


def pexels_photos(q):
    if not PEX:
        return []
    qs = urllib.parse.urlencode({'query': q, 'orientation': 'landscape', 'per_page': 20})
    d = get_json('https://api.pexels.com/v1/search?' + qs, {'Authorization': PEX}) or {}
    return [{'id': f"pexels-p-{x['id']}", 'url': x['src'].get('large2x') or x['src']['original'],
             'credit': f"Photo by {x.get('photographer', 'Pexels')} on Pexels", 'page': x.get('url', '')} for x in d.get('photos', [])]


def pixabay_photos(q):
    if not PIX:
        return []
    qs = urllib.parse.urlencode({'key': PIX, 'q': q[:100], 'image_type': 'photo', 'orientation': 'horizontal',
                                 'min_width': 1280, 'per_page': 20, 'safesearch': 'true'})
    d = get_json('https://pixabay.com/api/?' + qs) or {}
    return [{'id': f"pixabay-p-{h['id']}", 'url': h['largeImageURL'], 'credit': f"Photo by {h.get('user', 'Pixabay')} on Pixabay",
             'page': h.get('pageURL', '')} for h in d.get('hits', [])]


def simpler(q):
    """Progressively shorter queries: 'african woman tailor sewing' -> 'woman tailor sewing' -> 'tailor sewing'."""
    w = re.sub(r'[^\w\s-]', ' ', q).split()
    yield ' '.join(w)
    for i in range(1, max(1, len(w) - 1)):
        yield ' '.join(w[i:])


n = 0


def prepare_video(c, need, path):
    tmp = path + '.src.mp4'
    download(c['url'], tmp)
    dur = c.get('duration') or need
    vf = 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080'
    args = ['ffmpeg', '-v', 'error', '-y']
    if dur < need and need / max(dur, 0.1) <= 1.7:
        vf = f'setpts={need / dur:.3f}*PTS,' + vf  # gentle slow motion instead of an obvious loop
    elif dur < need:
        args += ['-stream_loop', '-1']
    args += ['-i', tmp, '-t', f'{need:.2f}', '-vf', vf + ',fps=30,format=yuv420p', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', path]
    subprocess.run(args, check=True)
    os.remove(tmp)


def prepare_image(c, path):
    tmp = path + '.src'
    download(c['url'], tmp)
    im = Image.open(tmp).convert('RGB')
    w, h = im.size
    s = max(2400 / w, 1350 / h)
    im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    im.save(path, 'JPEG', quality=88)  # re-encode strips EXIF/metadata
    os.remove(tmp)


def find(query, kind, need, fallback):
    """kind: 'video' or 'image'. Returns a Media dict or None."""
    global n
    tries = list(simpler(query)) + ([fallback] if fallback else [])
    for q in tries:
        if not q:
            continue
        if kind == 'video':
            cands = pexels_videos(q) + pixabay_videos(q)
            cands.sort(key=lambda c: 0 if c['duration'] >= need else 1)  # keep provider relevance order within groups
        else:
            cands = pexels_photos(q) + pixabay_photos(q)
        for c in cands:
            if c['id'] in used:
                continue
            n += 1
            path = os.path.join(OUT, f"{'v' if kind == 'video' else 'p'}{n}.{'mp4' if kind == 'video' else 'jpg'}")
            try:
                prepare_video(c, need, path) if kind == 'video' else prepare_image(c, path)
            except Exception as e:
                print('  skip', c['id'], e); continue
            used.add(c['id']); fresh.append(c['id'])
            credits.append({'credit': c['credit'], 'page': c['page']})
            print(f'  {kind} "{q}" -> {c["id"]}')
            return {'src': 'media/' + os.path.basename(path), 'kind': kind, 'credit': c['credit']}
    print(f'  nothing for "{query}" ({kind})')
    return None


tl = {(i['seg'], i['beat']): i['dur'] / 30 for i in p['timeline']['items'] if i['kind'] == 'beat'}
generic = f"{p.get('sector', '')} technology".strip()
if not (PEX or PIX):
    print('No PEXELS_API_KEY / PIXABAY_API_KEY set: every shot uses the designed background.')
else:
    th = p.get('thumb', {})
    th['media'] = find(th.get('query') or p['title'], 'image', 0, generic)
    for si, seg in enumerate(p['segments']):
        for bi, b in enumerate(seg['beats']):
            v, need = b['visual'], tl[(si, bi)] + 0.6
            t = v['type']
            print(f'[{si}.{bi}] {t}')
            if t in ('footage', 'split', 'quote'):
                v['media'] = find(v.get('query', ''), 'video', need, generic)
            elif t == 'stat' and v.get('query'):
                v['media'] = find(v['query'], 'video', need, generic)
            elif t in ('photo3d', 'newspaper'):
                v['media'] = find(v.get('query', ''), 'image', need, generic)
            elif t == 'multiframe':
                v['medias'] = [find(q, 'video', need, generic) for q in (v.get('queries') or [])[:4]]
            elif t == 'filmstrip':
                v['medias'] = [find(q, 'image', need, generic) for q in (v.get('queries') or [])[:4]]

p['media_credits'] = credits
json.dump(p, open(PROPS, 'w', encoding='utf-8'), ensure_ascii=False)
json.dump((used_list + fresh)[-4000:], open(USED_PATH, 'w'))
print(f'{len(fresh)} new media files')
