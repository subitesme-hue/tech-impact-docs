// Posts the finished documentary through PostEverywhere (same calls as your working shorts pipeline):
// 1) POST /media/upload {filename, content_type, size} -> data.media_id, data.upload_url
// 2) PUT raw bytes to upload_url   3) POST /media/{id}/complete   4) POST /posts {...}
// Full film -> Facebook 7748, T&I News LinkedIn 9116, YouTube 7751 (one post).
// X 7747 -> the thumbnail image with the YouTube link in the post.
// Field names checked against posteverywhere.ai/docs (platforms/youtube, platforms/x-twitter, media-requirements).
import fs from 'node:fs';

const props = JSON.parse(fs.readFileSync(process.argv[2] ?? 'props.render.json', 'utf8'));
const BASE = (process.env.PE_BASE_URL || 'https://app.posteverywhere.ai/api/v1').replace(/\/$/, '');
const KEY = process.env.PE_API_KEY;
const post = props.post;
if (!post) { console.log('No "post" block in props -> nothing to post.'); process.exit(0); }
if (!KEY) throw new Error('Add the PE_API_KEY secret in GitHub (Settings -> Secrets and variables -> Actions).');
const auth = {Authorization: `Bearer ${KEY}`};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const call = async (url, opts) => {
  const r = await fetch(url, opts);
  const t = await r.text();
  if (!r.ok) throw new Error(`${opts.method || 'GET'} ${url} -> ${r.status} ${t.slice(0, 600)}`);
  return t ? JSON.parse(t) : {};
};

const upload = async (file, name) => {
  const bytes = fs.readFileSync(file);
  const up = await call(`${BASE}/media/upload`, {method: 'POST', headers: {...auth, 'Content-Type': 'application/json'},
    body: JSON.stringify({filename: name, content_type: 'video/mp4', size: bytes.length})});
  const put = await fetch(up.data.upload_url, {method: 'PUT', headers: {'Content-Type': 'video/mp4'}, body: bytes});
  if (!put.ok) throw new Error(`PUT bytes -> ${put.status} ${await put.text()}`);
  await call(`${BASE}/media/${up.data.media_id}/complete`, {method: 'POST', headers: auth});
  await sleep(5000);
  console.log(`uploaded ${name} (${(bytes.length / 1e6).toFixed(1)} MB) -> ${up.data.media_id}`);
  return up.data.media_id;
};

const create = (body) => call(`${BASE}/posts`, {method: 'POST', headers: {...auth, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});

// YouTube chapters from the real edit timeline (first one must be 0:00).
const yt = post.main?.platform_content?.youtube;
if (yt && props.timeline) {
  const ts = (f) => { const s = Math.floor(f / props.timeline.fps); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const lines = ['0:00 In this episode'];
  props.timeline.items.filter((i) => i.sectionStart || i.chapterStart).forEach((i) => lines.push(`${ts(i.start)} ${props.segments[i.seg].title}`));
  const block = `Chapters\n${lines.join('\n')}\n\n`;
  yt.content = yt.content.includes('Sources:') ? yt.content.replace('Sources:', block + 'Sources:') : yt.content + '\n\n' + block;
}

// Call to action on LinkedIn, Facebook and YouTube captions (user's wording, 21 Oct 2026). X keeps its own hook + link reply.
const CTA = 'Subscribe to https://tai.news for more coverage and stories';
const withCta = (t) => {
  if (!t) return t;
  let s = String(t)
    .replace(/(Watch the full (episode|documentary)|Full episode on T&I News|More episodes and news|Watch more at)\s*:?\s*https:\/\/tai\.news\/?/gi, CTA)
    .replace(/More at https:\/\/tai\.news\/?/gi, CTA);
  if (!s.includes(CTA)) s = s.replace(/(\n\s*(#\w+\s*)+)$/, `\n\n${CTA}$1`) === s ? `${s}\n\n${CTA}` : s.replace(/(\n\s*(#\w+\s*)+)$/, `\n\n${CTA}$1`);
  return s;
};
const pc = post.main.platform_content || {};
for (const k of ['linkedin', 'facebook', 'youtube']) if (pc[k]?.content) pc[k].content = withCta(pc[k].content);
post.main.content = withCta(post.main.content);

const results = {};
// ---- 1. full film
const mainMedia = await upload('out/video.mp4', `${props.id}.mp4`); // upload first, so the post goes out right on time
// Hold until the scheduled minute (renders start ~2 h early).
if (post.post_at) {
  const wait = new Date(post.post_at).getTime() - Date.now();
  if (wait > 0) { console.log(`waiting ${(wait / 60000).toFixed(1)} min until ${post.post_at}`); await sleep(wait); }
}
const main = await create({media_ids: [mainMedia], account_ids: post.main.account_ids, content: post.main.content,
  platform_content: post.main.platform_content || {}});
const postId = main?.data?.post_id || main?.data?.id;
console.log('main post created:', postId);
results.main = main;

// ---- 2. find the YouTube link (YouTube processing can take a few minutes)
let ytUrl = '';
for (let i = 0; i < 30 && postId; i++) {
  await sleep(30000);
  try {
    const r = await call(`${BASE}/posts/${postId}/results`, {headers: auth});
    const rows = r?.data?.results || [];
    results.main_results = rows;
    const yt = rows.find((x) => String(x.platform || '').toLowerCase().includes('youtube') && x.platform_post_url);
    if (yt) { ytUrl = yt.platform_post_url; break; }
    const pending = rows.filter((x) => !['published', 'failed', 'success'].includes(String(x.status || '').toLowerCase()));
    if (rows.length && !pending.length) break;
  } catch (e) { console.log('results check:', e.message); }
}
console.log('YouTube link:', ytUrl || '(not available yet, using tai.news)');

// ---- 3. X: the thumbnail image + the link to the full episode in the post itself.
// Image upload = PostEverywhere "direct mode": multipart/form-data with field `file`; completes in one request, no /complete
// (posteverywhere.ai/docs/api/init-media-upload + openapi.json; X images <= 5 MB, 16:9 is standard: media-requirements).
let failed = false;
if (post.x?.account_ids?.length && fs.existsSync('out/cover.jpg')) {
  try {
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync('out/cover.jpg')], {type: 'image/jpeg'}), `${props.id}-cover.jpg`);
    const up = await call(`${BASE}/media/upload`, {method: 'POST', headers: auth, body: form});
    const xMedia = up.data?.media_id || up.data?.id;
    if (!xMedia) throw new Error('image upload returned no media id: ' + JSON.stringify(up).slice(0, 300));
    console.log('uploaded cover.jpg ->', xMedia, up.data?.media_status || '');
    const link = ytUrl || 'https://tai.news';
    // X showed the hook + image but dropped a link placed in the tweet text (seen on the 20 Oct post), so the link goes in
    // settings.firstComment: "Text posted as a reply to your tweet immediately after publishing" (posteverywhere.ai/docs/platforms/x-twitter).
    const text = post.x.content; // hook, max 35 characters
    const reply = `Watch the full episode: ${link}`;
    results.x = await create({media_ids: [xMedia], account_ids: post.x.account_ids, content: text,
      platform_content: {x: {content: text, settings: {replySettings: 'everyone', firstComment: reply}}}});
    console.log('X post created');
  } catch (e) { console.error('X post FAILED (other platforms already posted):', e.message); failed = true; }
}
fs.writeFileSync('out/post_results.json', JSON.stringify({yt_url: ytUrl, ...results}, null, 2));
if (failed) process.exit(1);
