"""Find real stock footage / photos that actually match each line (Pexels + Pixabay, checked by a vision model).

Usage: python3 scripts/fetch_media.py props.render.json
Env: PEXELS_API_KEY, PIXABAY_API_KEY, OPENROUTER_API_KEY (vision check; without it the first keyword match is used).
For every shot: collect up to ~10 candidates from both libraries -> a vision model looks at their preview images next to the
narration and picks the one that literally shows it (or none) -> download, cut to the shot length, 1920x1080 @30fps.
A shot with no good match gets no footage: the scene falls back to its designed graphic background (never a random clip).
API shapes verified against pexels.com/api/documentation, pixabay.com/api/docs and OpenRouter image-understanding docs (Oct 2026).
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
ORK = os.environ.get('OPENROUTER_API_KEY', '').strip()
VISION_MODEL = os.environ.get('VISION_MODEL', 'openai/gpt-4o-mini')
UA = {'User-Agent': 'tech-impact-docs/2.0 (T&I News)'}

p = json.load(open(PROPS, encoding='utf-8'))
used_list = json.load(open(USED_PATH)) if os.path.exists(USED_PATH) else []
used = set() if p.get('reuse_media') else set(used_list)  # reuse_media: re-render of an approved episode may pick the same clips again
fresh, credits = [], []
stats = {'pexels_http': {}, 'pixabay_http': {}, 'vision_calls': 0, 'vision_rejects': 0, 'shots': 0, 'filled': 0}
cache = {}
taken = set()  # ids used in this episode


def get_json(url, headers=None, provider='x'):
    if url in cache:
        return cache[url]
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={**UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=30) as r:
                stats[f'{provider}_http'][str(r.status)] = stats[f'{provider}_http'].get(str(r.status), 0) + 1
                cache[url] = json.load(r)
                return cache[url]
        except urllib.error.HTTPError as e:
            stats[f'{provider}_http'][str(e.code)] = stats[f'{provider}_http'].get(str(e.code), 0) + 1
            if e.code == 429:
                time.sleep(20); continue
            if e.code != 404:
                print(f'  {provider} HTTP {e.code}: {e.read()[:200]!r}')
            return None
        except Exception as e:
            print('  fetch error', provider, e); time.sleep(3)
    return None


def download(url, path):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as r, open(path, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            f.write(b)


# ---------------- providers (each candidate carries a preview image for the vision check) ----------------
def pexels_videos(q):
    if not PEX:
        return []
    qs = urllib.parse.urlencode({'query': q, 'orientation': 'landscape', 'size': 'medium', 'per_page': 8})
    d = get_json('https://api.pexels.com/videos/search?' + qs, {'Authorization': PEX}, 'pexels') or \
        get_json('https://api.pexels.com/v1/videos/search?' + qs, {'Authorization': PEX}, 'pexels') or {}
    out = []
    for v in d.get('videos', []):
        files = [f for f in v.get('video_files', []) if f.get('file_type') == 'video/mp4' and (f.get('width') or 0) >= 1280]
        if not files or not v.get('image'):
            continue
        best = min(files, key=lambda f: abs((f.get('width') or 0) - 1920))
        desc = re.sub(r'[-/]', ' ', urllib.parse.urlparse(v.get('url', '')).path.split('/')[-2] if v.get('url') else '')
        out.append({'id': f"pexels-v-{v['id']}", 'url': best['link'], 'duration': v.get('duration') or 0, 'thumb': v['image'],
                    'desc': desc, 'credit': f"Video by {v.get('user', {}).get('name', 'Pexels')} on Pexels", 'page': v.get('url', '')})
    return out


def pixabay_videos(q):
    if not PIX:
        return []
    qs = urllib.parse.urlencode({'key': PIX, 'q': q[:100], 'per_page': 8, 'safesearch': 'true', 'video_type': 'film'})
    d = get_json('https://pixabay.com/api/videos/?' + qs, None, 'pixabay') or {}
    out = []
    for h in d.get('hits', []):
        vs = h.get('videos', {})
        f = next((vs[k] for k in ('medium', 'large', 'small') if vs.get(k, {}).get('url') and vs[k].get('width', 0) >= 1280), None)
        th = (vs.get('small') or vs.get('medium') or {}).get('thumbnail')
        if f and th:
            out.append({'id': f"pixabay-v-{h['id']}", 'url': f['url'], 'duration': h.get('duration') or 0, 'thumb': th,
                        'desc': h.get('tags', ''), 'credit': f"Video by {h.get('user', 'Pixabay')} on Pixabay", 'page': h.get('pageURL', '')})
    return out


def pexels_photos(q):
    if not PEX:
        return []
    qs = urllib.parse.urlencode({'query': q, 'orientation': 'landscape', 'per_page': 8})
    d = get_json('https://api.pexels.com/v1/search?' + qs, {'Authorization': PEX}, 'pexels') or {}
    return [{'id': f"pexels-p-{x['id']}", 'url': x['src'].get('large2x') or x['src']['original'], 'thumb': x['src'].get('medium'),
             'desc': x.get('alt', ''), 'credit': f"Photo by {x.get('photographer', 'Pexels')} on Pexels", 'page': x.get('url', '')}
            for x in d.get('photos', []) if x.get('src', {}).get('medium')]


def pixabay_photos(q):
    if not PIX:
        return []
    qs = urllib.parse.urlencode({'key': PIX, 'q': q[:100], 'image_type': 'photo', 'orientation': 'horizontal',
                                 'min_width': 1280, 'per_page': 8, 'safesearch': 'true'})
    d = get_json('https://pixabay.com/api/?' + qs, None, 'pixabay') or {}
    return [{'id': f"pixabay-p-{h['id']}", 'url': h['largeImageURL'], 'thumb': h.get('webformatURL'), 'desc': h.get('tags', ''),
             'credit': f"Photo by {h.get('user', 'Pixabay')} on Pixabay", 'page': h.get('pageURL', '')} for h in d.get('hits', []) if h.get('webformatURL')]


def variants(q):
    """The query, then shorter versions that keep at least 2 meaningful words (never a single generic word)."""
    w = [x for x in re.sub(r'[^\w\s-]', ' ', q).split() if x]
    yield ' '.join(w)
    if len(w) >= 4:
        yield ' '.join(w[:3])
        yield ' '.join(w[-3:])
    elif len(w) == 3:
        yield ' '.join(w[:2])


# ---------------- region lock: a clip/photo is used only if its own title/tags/page name the episode's region ----------------
# (the vision model cannot tell a Kenyan maize field from a Mexican one; the uploader's description can)
REGION_WORDS = {
    'africa': 'africa african kenya kenyan nairobi nigeria nigerian lagos ghana ghanaian accra ethiopia ethiopian addis tanzania tanzanian '
              'uganda ugandan kampala rwanda rwandan kigali senegal senegalese dakar morocco moroccan egypt egyptian cairo zambia malawi '
              'mozambique zimbabwe cameroon ivory coast abidjan sudan somalia botswana namibia angola congo tunisia algeria south africa '
              'johannesburg cape town durban maasai masai swahili zanzibar benin togo mali niger burkina sahel madagascar',
    'middle east': 'middle east arab arabic jordan amman lebanon beirut iraq baghdad egypt cairo turkey istanbul israel palestine syria iran '
                   'saudi riyadh jeddah uae dubai abu dhabi qatar doha kuwait bahrain oman muscat gulf desert',
    'gcc': 'gcc gulf arab arabic saudi riyadh jeddah makkah mecca medina neom uae emirates emirati dubai abu dhabi sharjah qatar doha '
           'kuwait bahrain manama oman muscat',
    'south asia': 'south asia india indian delhi mumbai bangalore bengaluru kolkata chennai hyderabad pakistan pakistani karachi lahore '
                  'bangladesh bangladeshi dhaka sri lanka colombo nepal kathmandu bhutan maldives punjab kerala rajasthan',
    'east asia': 'east asia china chinese beijing shanghai shenzhen hong kong japan japanese tokyo osaka kyoto korea korean seoul busan '
                 'taiwan taipei mongolia',
    'asia pacific': 'asia pacific asian australia australian sydney melbourne new zealand indonesia indonesian jakarta bali vietnam '
                    'vietnamese hanoi saigon thailand thai bangkok philippines filipino manila malaysia kuala lumpur singapore cambodia '
                    'myanmar laos papua fiji',
    'europe': 'europe european uk britain british london england scotland ireland dublin france french paris germany german berlin '
              'munich spain spanish madrid barcelona italy italian rome milan netherlands dutch amsterdam belgium brussels sweden '
              'stockholm norway oslo denmark copenhagen finland helsinki poland warsaw portugal lisbon austria vienna switzerland zurich '
              'greece athens czech prague estonia',
    'us': 'usa united states america american new york manhattan california san francisco los angeles texas houston austin chicago '
          'seattle boston miami washington florida silicon valley',
}


def region_terms():
    r = str(p.get('region', '')).lower()
    key = next((k for k in REGION_WORDS if k in r or (k == 'us' and r in ('us', 'usa', 'united states', 'north america'))), None)
    words = set(REGION_WORDS.get(key, '').split()) if key else set()
    # plus every place the script itself names (map points, footage labels, thumbnail focus)
    for g in p.get('segments', []):
        for b in g.get('beats', []):
            for sh in b.get('shots', []):
                names = [pt.get('name', '') for pt in (sh.get('points') or [])] + ([sh.get('label', '')] if sh.get('kind') == 'footage' else [])
                for nm in names:
                    words.update(w.lower() for w in re.findall(r'[A-Za-z]{4,}', nm))
    words.update(w.lower() for w in re.findall(r'[A-Za-z]{4,}', str(p.get('thumb', {}).get('kicker', '')).split('·')[0]))
    words -= {'east', 'west', 'north', 'south', 'central', 'county', 'city', 'region', 'rural', 'urban', 'global', 'world'}
    return words, key


RTERMS, RKEY = region_terms()
# a country-level word to add to search queries (e.g. "Kenya")
GENERIC = {'africa', 'african', 'asia', 'asian', 'europe', 'european', 'middle', 'gulf', 'arab', 'arabic', 'america', 'american', 'pacific', 'desert'}
labels = 3 * [sh.get('label', '') for g in p.get('segments', []) for b in g.get('beats', []) for sh in b.get('shots', []) if sh.get('kind') == 'footage']
labels += [pt.get('name', '') for g in p.get('segments', []) for b in g.get('beats', []) for sh in b.get('shots', []) for pt in (sh.get('points') or [])]
hits = [w for l in labels for w in re.findall(r'[A-Za-z]+', l) if w.lower() in RTERMS and w.lower() not in GENERIC and len(w) > 3]
known = set(REGION_WORDS.get(RKEY, '').split()) if RKEY else set()
COUNTRY = max(set(hits), key=lambda w: (w.lower() in known, hits.count(w))) if hits else (str(p.get('region', '')).split()[0] if RKEY else None)
print('region lock:', RKEY, '| search word:', COUNTRY, '| terms:', len(RTERMS))


def regional(c):
    if not RTERMS:
        return True
    text = ' ' + re.sub(r'[^a-z ]', ' ', (c.get('desc', '') + ' ' + c.get('page', '')).lower().replace('-', ' ')) + ' '
    return any(f' {w} ' in text for w in RTERMS)


def fix_label(sh):
    """The on-screen place label must match where the clip was filmed (per its own title/tags), never just the script's wish."""
    m = sh.get('media')
    if not m or not sh.get('label'):
        return
    about = ' ' + re.sub(r'[^a-z ]', ' ', m.pop('about', '').replace('-', ' ')) + ' '
    words = [w.lower() for w in re.findall(r'[A-Za-z]{4,}', sh['label'])]
    if any(f' {w} ' in about for w in words if w in RTERMS):
        return  # label's place is named by the clip itself
    named = [w for w in RTERMS if f' {w} ' in about and w not in GENERIC]
    old = sh['label']
    sh['label'] = max(named, key=len).title() if named else ''
    print(f'  label "{old}" -> "{sh["label"]}" (clip is not from there)')

def vision_pick(cands, narration, query):
    """Ask a vision model which preview literally shows the line. Returns index or -1."""
    if not ORK:
        return 0 if cands else -1
    content = [{'type': 'text', 'text': (
        'You are a documentary picture editor. Choose the ONE image that a viewer would accept as literally showing this moment.\n'
        f'Narration: "{narration}"\nWanted shot: "{query}"\n'
        'Reject images that only loosely relate (wrong subject, wrong setting, staged lifestyle shots unrelated to the topic, '
        'text/logos, alcohol, animals unless asked, and any clearly identifiable place, landmark or country that differs from the one in the narration). '
        'The main object and action must match the line: a phone is not a camera, a farmer is not a photographer, an office is not a field. If none fits well, answer 0.\n'
        'Reply ONLY JSON: {"best": <1-based index or 0>, "score": <0-10 how well it fits>, "why": "<max 12 words>"}')}]
    for i, c in enumerate(cands):
        content.append({'type': 'text', 'text': f'Image {i + 1}:'})
        content.append({'type': 'image_url', 'image_url': {'url': c['thumb']}})
    body = {'model': VISION_MODEL, 'temperature': 0, 'max_tokens': 200, 'response_format': {'type': 'json_object'},
            'messages': [{'role': 'user', 'content': content}]}
    stats['vision_calls'] += 1
    for attempt in range(2):
        try:
            req = urllib.request.Request('https://openrouter.ai/api/v1/chat/completions', data=json.dumps(body).encode(),
                                         headers={'Authorization': f'Bearer {ORK}', 'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=90) as r:
                d = json.load(r)
            raw = d['choices'][0]['message']['content'] or ''
            j = json.loads(raw[raw.index('{'):raw.rindex('}') + 1])
            best, score = int(j.get('best', 0)), float(j.get('score', 0))
            print(f'    vision: best={best} score={score} ({j.get("why", "")})')
            if 1 <= best <= len(cands) and score >= 6:
                return best - 1
            stats['vision_rejects'] += 1
            return -1
        except Exception as e:
            print('    vision error', e); time.sleep(5)
    return -1


n = 0


def prepare_video(c, need, path):
    tmp = path + '.src.mp4'
    download(c['url'], tmp)
    dur = c.get('duration') or need
    vf = 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080'
    args = ['ffmpeg', '-v', 'error', '-y']
    if dur < need and need / max(dur, 0.1) <= 1.7:
        vf = f'setpts={need / dur:.3f}*PTS,' + vf
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
    im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS).save(path, 'JPEG', quality=88)  # strips metadata
    os.remove(tmp)


def find(query, kind, need, narration, local=True):
    global n
    stats['shots'] += 1
    qs = list(variants(query or ''))
    if local and COUNTRY:  # ask the libraries for the place first, e.g. "farmer phone Kenya"
        base = [w for w in (query or '').split() if w.lower() not in RTERMS]
        qs = [' '.join(base[:4] + [COUNTRY]), ' '.join(base[:2] + [COUNTRY])] + ([f'{COUNTRY} {RKEY}'] if RKEY and RKEY != COUNTRY.lower() else []) + qs
    seen_q = set()
    for q in qs:
        if q in seen_q:
            continue
        seen_q.add(q)
        if not q:
            continue
        if kind == 'video':
            a, b = pexels_videos(q), pixabay_videos(q)
            cands = [c for pair in zip(a, b) for c in pair] + a[len(b):] + b[len(a):]  # interleave providers
            cands.sort(key=lambda c: 0 if c['duration'] >= need * 0.6 else 1)
        else:
            a, b = pexels_photos(q), pixabay_photos(q)
            cands = [c for pair in zip(a, b) for c in pair] + a[len(b):] + b[len(a):]
        cands = [c for c in cands if c['id'] not in used]
        if local:
            before = len(cands)
            cands = [c for c in cands if regional(c)]
            stats['region_rejects'] = stats.get('region_rejects', 0) + before - len(cands)
        cands = cands[:10]
        if not cands:
            continue
        i = vision_pick(cands, narration, q)
        if i < 0:
            continue
        c = cands[i]
        n += 1
        path = os.path.join(OUT, f"{'v' if kind == 'video' else 'p'}{n}.{'mp4' if kind == 'video' else 'jpg'}")
        try:
            prepare_video(c, need, path) if kind == 'video' else prepare_image(c, path)
        except Exception as e:
            print('  skip', c['id'], e); continue
        used.add(c['id']); fresh.append(c['id']); taken.add(c['id'])
        credits.append({'credit': c['credit'], 'page': c['page']})
        stats['filled'] += 1
        print(f'  {kind} "{q}" -> {c["id"]} ({c["desc"][:60]})')
        return {'src': 'media/' + os.path.basename(path), 'kind': kind, 'credit': c['credit'], 'about': (c.get('desc', '') + ' ' + c.get('page', '')).lower()}
    print(f'  no good match for "{query}" -> designed graphic background')
    return None


tl = {(i['seg'], i['beat'], i['shot']): i['dur'] / 30 for i in p['timeline']['items'] if i['kind'] == 'shot'}
if not (PEX or PIX):
    print('No PEXELS_API_KEY / PIXABAY_API_KEY: footage shots fall back to designed graphics.')
else:
    print(f'keys: pexels={"yes" if PEX else "NO"} pixabay={"yes" if PIX else "NO"} vision={"yes" if ORK else "NO"} ({VISION_MODEL})')
    th = p.get('thumb', {})
    if th.get('image_url'):  # a hand-picked thumbnail photo (e.g. one already approved) wins
        try:
            path = os.path.join(OUT, 'thumb.jpg')
            prepare_image({'url': th['image_url']}, path)
            th['media'] = {'src': 'media/thumb.jpg', 'kind': 'image', 'credit': th.get('image_credit', '')}
            if th.get('image_credit'):
                credits.append({'credit': th['image_credit'], 'page': th.get('image_page', '')})
            print('thumbnail: hand-picked photo')
        except Exception as e:
            print('thumbnail image_url failed:', e); th.pop('image_url', None)
    if not th.get('media') and th.get('query'):  # the cover is key art: prefer a photo from the place, else the best literal match
        th['media'] = find(th['query'], 'image', 0, th.get('headline', p['title'])) or find(th['query'], 'image', 0, th.get('headline', p['title']), local=False)
    for si, seg in enumerate(p['segments']):
        for bi, b in enumerate(seg['beats']):
            for ki, sh in enumerate(b['shots']):
                if sh.get('kind') != 'footage':
                    continue
                need = tl.get((si, bi, ki), 3.0) + 0.4
                print(f'[{si}.{bi}.{ki}] footage "{sh.get("query", "")}"')
                sh['media'] = find(sh.get('query', ''), 'video', need, b['narration']) or find(sh.get('query', ''), 'image', need, b['narration'])
                fix_label(sh)

    # duotone backdrops behind the diagrams (EVP-studio style): one regional photo per section
    bq = [th.get('query') or ''] + [sh.get('query', '') for g in p['segments'] for b in g['beats'] for sh in b['shots'] if sh.get('kind') == 'footage']
    bq += [f'{COUNTRY} city skyline', f'{COUNTRY} people', f'{COUNTRY} landscape', f'{COUNTRY} street'] if COUNTRY else []
    backs = []
    for q in bq:
        if len(backs) >= len(p['segments']) or not q:
            continue
        print(f'[backdrop] "{q}"')
        m = find(q, 'image', 0, f"Calm background photo for a documentary about {p.get('tech') or p['title']} in {p.get('region')}. It must show the "
                 f"subject of the story or ordinary daily life, land or cities of that region. Reject protests, crowds with placards, conflict, police, "
                 f"politics, religious ceremonies, disasters with visible injury, and anything that could read as a political statement.")
        if m:
            backs.append(m)
    p['backdrops'] = backs
    print('backdrops:', len(backs))

p['media_credits'] = credits
p['media_stats'] = stats
json.dump(p, open(PROPS, 'w', encoding='utf-8'), ensure_ascii=False)
json.dump((used_list + fresh)[-4000:], open(USED_PATH, 'w'))
print('media stats:', json.dumps(stats))
