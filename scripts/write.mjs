// Research + script writer (runs on GitHub Actions; n8n Cloud runs are capped at 5 minutes).
// Same prompts and checks as the n8n/*-node.js files. Usage: node scripts/write.mjs topic.json props.json
// Env: OPENROUTER_API_KEY, GH_TOKEN + GITHUB_REPOSITORY (to read past film titles from releases).
import fs from 'node:fs';
import {execSync} from 'node:child_process';

const t = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = process.argv[3] || 'props.json';
const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) throw new Error('Add the OPENROUTER_API_KEY secret in GitHub (Settings -> Secrets and variables -> Actions).');
const cfg = { research_model: t.research_model || 'anthropic/claude-sonnet-5.5', script_model: t.script_model || 'anthropic/claude-sonnet-5.5',
  accounts: t.accounts || { facebook: 7748, linkedin: 9116, youtube: 7751, x: 7747 }, post_enabled: !!t.post_enabled };
try {
  t.recent_titles = JSON.parse(execSync(`gh api "repos/${process.env.GITHUB_REPOSITORY}/releases?per_page=100"`, {encoding: 'utf8'})).map((r) => r.name).filter(Boolean);
} catch (e) { t.recent_titles = t.recent_titles || []; }
console.log(`topic: ${t.region} / ${t.sector} | avoid ${t.recent_titles.length} past titles`);

const chat = async (body) => {
  for (let a = 0; a < 3; a++) {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {method: 'POST',
      headers: {Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-Title': 'T&I Tech Impact Docs'}, body: JSON.stringify(body)});
    const txt = await r.text();
    if (r.ok) return JSON.parse(txt);
    console.log('OpenRouter', r.status, txt.slice(0, 300));
    await new Promise((x) => setTimeout(x, 15000));
  }
  throw new Error('OpenRouter failed 3 times');
};
const parseJson = (raw) => { try { raw = String(raw || ''); return JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch (e) { return {}; } };

// ---------- research (up to 3 sectors) ----------
let res = null;
for (let run = 0; run < 3 && !res; run++) {
  const sector = run > 0 && t.alternates?.[run - 1] ? t.alternates[run - 1] : t.sector;
  const system = `You are the lead researcher for T&I News (tai.news) documentaries about technology and business applications that create POSITIVE SOCIAL IMPACT.
Find ONE real, specific, well-documented story from the region "${t.region}" in the "${sector}" sector: a technology, digital platform, AI system, device or tech-enabled business model that measurably improved people's lives (health, income, jobs, inclusion, education, safety, climate, access to services).
Rules:
- Use the web results. Prefer outcomes reported 2022-2026 by credible sources: official/government data, peer-reviewed studies, multilateral bodies (World Bank, WHO, UN agencies), reputable media, or company/NGO impact reports with numbers.
- Pick something concrete and engaging (a named programme, company, city or community), not a generic trend.
- Do not pick any of these previous films: ${JSON.stringify(t.recent_titles.slice(-60))}.
- NEVER invent facts, numbers, names, quotes or dates. Every fact must be supported by a cited web result. Copy numbers exactly as the source states them.
- Include honest limits or challenges.
- Politics, military and conflict topics are out of scope.
Return ONLY JSON:
{"found": boolean,
 "title_idea": string (max 60 chars),
 "one_line": string (max 160 chars),
 "technology": string,
 "organisations": [string],
 "places": [{"name": string, "country": string, "lat": number, "lon": number}] (1-4, real coordinates),
 "timeframe": string,
 "people_affected": string (who benefits, concretely),
 "how_it_works": string (plain language, max 400 chars),
 "facts": [{"text": string (one verifiable sentence), "number": number|null, "unit": string|null, "source_name": string, "source_url": string, "year": string}] (8-14 items, at least 5 with numbers),
 "verbatim_quotes": [{"text": string, "speaker": string, "role": string, "source_url": string}] (0-2, only exact quotes that appear in the sources),
 "challenges": [string] (1-3),
 "global_relevance": string (why this matters beyond ${t.region}),
 "sources": [{"title": string, "url": string}] (3-8)}
English only.`;
  const d = await chat({ model: cfg.research_model, plugins: [{ id: 'web', max_results: 10 }], response_format: { type: 'json_object' }, temperature: 0.3, max_tokens: 5000,
    messages: [{ role: 'system', content: system }, { role: 'user', content: `Region: ${t.region}\nSector: ${sector}\nToday: ${t.date}` }] });
  const msg = d.choices?.[0]?.message || {};
  const r = parseJson(msg.content);
  const cited = (msg.annotations || []).filter((a) => a.type === 'url_citation').map((a) => ({ title: a.url_citation.title || a.url_citation.url, url: a.url_citation.url }));
  const facts = Array.isArray(r.facts) ? r.facts.filter((f) => f && f.text && f.source_url) : [];
  const sources = [...(Array.isArray(r.sources) ? r.sources : []), ...cited].filter((s) => s && /^https?:\/\//.test(s.url || ''));
  const seen = new Set();
  const uniq = sources.filter((s) => { const k = s.url.replace(/[#?].*$/, ''); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
  const problems = [];
  if (!r.found) problems.push('no story found');
  if (facts.length < 6) problems.push(`only ${facts.length} sourced facts`);
  if (facts.filter((f) => typeof f.number === 'number').length < 3) problems.push('fewer than 3 facts with numbers');
  if (uniq.length < 2) problems.push('fewer than 2 sources');
  r.facts = facts; r.sources = uniq;
  console.log(`research [${sector}]:`, problems.length ? problems.join('; ') : `OK "${r.title_idea}" (${facts.length} facts, ${uniq.length} sources)`);
  if (!problems.length) res = { research: r, sector };
}
if (!res) throw new Error('No well-sourced story found today after 3 sectors.');
fs.writeFileSync('research.json', JSON.stringify(res, null, 2));

// ---------- script (up to 3 drafts) ----------
let final = null, prevProblems = [];
for (let run = 0; run < 3 && !final; run++) {
  const system = `You are an award-winning documentary writer and editor for T&I News (tai.news). You write a daily 5-6 minute documentary about technology and business applications that create positive social impact.

VOICE: write like a seasoned human documentary narrator (BBC, Vox, Wendover style): concrete, warm, curious, specific. Mix short and long sentences. Use real places and people's roles. Show, don't tell. No hype, no buzzwords, no rhetorical-question strings. Banned words: delve, tapestry, testament, landscape, realm, unlock, harness, leverage, revolutionize, game-changer, seamless, cutting-edge, synergy, ever-evolving, in today's world, imagine a world. It must NOT sound AI-generated.

TRUTH: use ONLY the research facts provided. Every number, name, date and claim must come from them. Never invent quotes, people, numbers or outcomes. Round nothing that the source did not round. Include one honest challenge or limit. Spell numbers in narration the way a narrator says them ("nineteen thousand", "eighteen and a half percent").

STRUCTURE
- segments[0]: {"kind":"summary","title":"In this film","beats":[4 beats]} = the 30-second summary, 64-72 words in total. Sentence 1 is the hook (a surprising concrete fact or a vivid moment). Then what the film reveals. Last beat sets up the story.
- then exactly 4 chapters {"kind":"chapter","title": 2-5 words, "beats":[4-5 beats]}:
  1) the problem, through the people who live it; 2) the technology and how it works, in plain language; 3) the evidence and the impact, with numbers; 4) challenges, scale and what it means for the world.
- Every beat: {"narration": 1-2 sentences, 12-40 words, "visual": {...}}.
- Total narration (all beats + outro): 640-760 words.
- outro: {"narration": 18-30 words ending exactly with "For more stories of technology with real impact, visit T and I News.", "line": closing reflection, max 90 chars}.

VISUALS (one per beat; vary them; never the same type twice in a row (except footage); real footage/photos carry most beats):
- {"type":"footage","query":Q,"caption"?:C}
- {"type":"photo3d","query":Q,"title"?:max 40 chars,"caption"?:C}
- {"type":"multiframe","queries":[Q,Q,Q],"word"?:1-2 words}
- {"type":"stat","value":number,"prefix"?:"$","suffix"?:"%"|"+"|"M"|" km"...,"decimals"?:0-1,"label":max 60 chars,"source":"Org, year","query":Q}
- {"type":"bars","title":max 40 chars,"unit"?:string,"items":[2-4 {"label":max 40,"value":number}],"source":"Org, year"}  (only comparable numbers from the facts)
- {"type":"map","region":"${t.region}","label":place name,"points":[1-4 {"name","lat","lon"}]}  (exactly once, in chapter 1 or 2)
- {"type":"newspaper","headline":max 60,"deck":max 80,"dateline":"Place · Year","query":Q}  (at most once; headline is your own words)
- {"type":"timeline","items":[3-5 {"year","text":max 60}]}  (at most once, only with dated facts)
- {"type":"quote","text":exact quote,"attribution":"Name, role","query":Q}  (ONLY if verbatim_quotes has it; otherwise never)
- {"type":"split","heading":max 34 chars,"bullets":[3 x max 60 chars],"query":Q}
- {"type":"cards","heading":max 34 chars,"items":[3 x max 24 chars]}
- {"type":"filmstrip","queries":[Q,Q,Q],"caption":max 40 chars}
Required: >=1 map, >=2 of stat/bars, >=1 split or cards, >=2 multiframe, >=3 photo3d, >=5 footage. Every stat/bars number must appear in the facts.
Q (stock search query): 2-5 plain English words describing what is VISIBLE on camera, for Pexels/Pixabay: people, places, objects, actions, e.g. "farmer smartphone rice field", "nurse tablet rural clinic", "solar panels village rooftop". Add a country only when it helps the look ("nairobi street"). Never brand names, never abstract words (impact, innovation, future), never text or logos.
C (lower third): a place or short context, max 28 chars.

THUMBNAIL: "thumb": {"kicker":"${t.region} · <Sector>", "headline": 6-11 words, a curiosity hook with a concrete number or outcome from the facts, "highlight": 1-3 consecutive words copied from the headline, "query": a striking human photo query}
"title": 3-7 words.

SOCIAL POSTS ("post"):
- "youtube_title": max 90 chars, keyword-rich, curiosity, truthful.
- "youtube_description": 2 short paragraphs (what the film shows, why it matters), max 700 chars.
- "youtube_tags": 8-15 strings.
- "linkedin": 120-200 words for executives and founders: insight-led opening line, 3 short takeaways, the business lesson, a question to the reader, then "Watch the full documentary: https://tai.news" and 3-5 hashtags.
- "facebook": 60-120 words, warm and human, ends with "Full documentary on T&I News: https://tai.news" and 3 hashtags.
- "x": max 200 characters, no emojis, no links, 1-2 hashtags.

Return ONLY JSON: {"title","thumb","segments","outro","post"}. English only.`;
  let user = `Region: ${t.region}\nSector: ${res.sector}\nResearch (the only facts you may use):\n${JSON.stringify(res.research)}`;
  if (prevProblems.length) user += `\n\nYour previous draft was rejected for: ${prevProblems.join('; ')}. Fix all of these.`;
  const d = await chat({ model: cfg.script_model, response_format: { type: 'json_object' }, temperature: 0.6, max_tokens: 12000,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }] });
  const ch = d.choices?.[0] || {};
  const rawText = String(ch.message?.content || '');
  console.log(`draft ${run + 1} raw: finish=${ch.finish_reason} native=${ch.native_finish_reason || ''} chars=${rawText.length} usage=${JSON.stringify(d.usage || {})}`);
  console.log('  head:', rawText.slice(0, 300).replace(/\n/g, ' '));
  console.log('  tail:', rawText.slice(-300).replace(/\n/g, ' '));
  if (d.error) console.log('  error:', JSON.stringify(d.error).slice(0, 500));
  fs.mkdirSync('out/logs', {recursive: true}); fs.writeFileSync(`out/logs/script-draft-${run + 1}.txt`, rawText);
  const s = parseJson(rawText);
  const problems = [];
  const words = x => String(x || '').split(/\s+/).filter(Boolean).length;
  const cut = (x, n) => String(x || '').trim().slice(0, n);
  const TYPES = ['footage', 'photo3d', 'multiframe', 'stat', 'bars', 'map', 'newspaper', 'timeline', 'quote', 'split', 'cards', 'filmstrip'];
  const segs = Array.isArray(s.segments) ? s.segments : [];
  if (segs.length !== 5) problems.push(`need 5 segments (summary + 4 chapters), got ${segs.length}`);
  if (segs[0] && segs[0].kind !== 'summary') problems.push('segments[0] must be the summary');
  const beats = segs.flatMap(g => Array.isArray(g.beats) ? g.beats : []);
  const sumWords = (segs[0]?.beats || []).reduce((a, b) => a + words(b.narration), 0);
  const total = beats.reduce((a, b) => a + words(b.narration), 0) + words(s.outro?.narration);
  if (sumWords < 56 || sumWords > 80) problems.push(`summary is ${sumWords} words (need 64-72)`);
  if (total < 600 || total > 790) problems.push(`total narration is ${total} words (need 640-760)`);
  
  // numbers on screen must exist in the research
  const researchText = JSON.stringify(res.research).replace(/,/g, '');
  const numOk = v => { const n = Number(v); if (!isFinite(n)) return false; const forms = [String(n), n.toFixed(1), String(Math.round(n))]; return forms.some(f => researchText.includes(f)); };
  const count = {};
  let prevType = '';
  beats.forEach((b, i) => {
    const v = b.visual || {};
    if (!TYPES.includes(v.type)) { problems.push(`beat ${i + 1}: unknown visual type "${v.type}"`); return; }
    count[v.type] = (count[v.type] || 0) + 1;
    if (v.type === prevType && v.type !== 'footage') problems.push(`beat ${i + 1}: same visual type twice in a row (${v.type})`);
    prevType = v.type;
    const w = words(b.narration);
    if (w < 6 || w > 48) problems.push(`beat ${i + 1}: narration ${w} words`);
    const q = x => typeof x === 'string' && x.trim().split(/\s+/).length >= 2;
    if (['footage', 'photo3d', 'newspaper', 'quote', 'split'].includes(v.type) && !q(v.query)) problems.push(`beat ${i + 1}: missing stock query`);
    if (['multiframe', 'filmstrip'].includes(v.type) && !(Array.isArray(v.queries) && v.queries.length >= 3 && v.queries.every(q))) problems.push(`beat ${i + 1}: needs 3 queries`);
    if (v.type === 'stat' && !numOk(v.value)) problems.push(`beat ${i + 1}: stat ${v.value} not found in research`);
    if (v.type === 'bars') (v.items || []).forEach(it => { if (!numOk(it.value)) problems.push(`beat ${i + 1}: bar value ${it.value} not found in research`); });
    if (v.type === 'map' && !(v.points || []).every(p => isFinite(p.lat) && isFinite(p.lon))) problems.push(`beat ${i + 1}: map points need lat/lon`);
    if (v.type === 'quote') {
      const qs = (res.research.verbatim_quotes || []).map(x => String(x.text || '').toLowerCase());
      if (!qs.some(x => x && x.includes(String(v.text || '').toLowerCase().slice(0, 40)))) problems.push(`beat ${i + 1}: quote not found verbatim in research`);
    }
  });
  if (!count.map) problems.push('no map scene');
  if ((count.stat || 0) + (count.bars || 0) < 2) problems.push('need at least 2 stat/bars scenes');
  if (!s.thumb || words(s.thumb.headline) < 4) problems.push('thumbnail headline missing');
  const banned = /\b(delve|tapestry|testament|realm|unlock|harness|leverage|revolutioni[sz]e|game-changer|seamless|cutting-edge|synergy|ever-evolving)\b/i;
  beats.forEach((b, i) => { if (banned.test(b.narration)) problems.push(`beat ${i + 1}: banned word`); });
  
  
  const p = s.post || {};
  const yt = cut(p.youtube_title || s.title, 95);
  const srcLines = (res.research.sources || []).slice(0, 6).map(x => `- ${x.title}: ${x.url}`).join('\n');
  const ytDesc = `${cut(p.youtube_description, 900)}\n\nSources:\n${srcLines}\n\nStock footage and photos: Pexels and Pixabay contributors.\nMore documentaries and news: https://tai.news\n\n#TechImpact #TandINews`;
  const props = {
    id: t.tag, date: t.date, look: t.look, voice: t.voice,
    region: t.region, sector: res.sector, title: cut(s.title, 70),
    thumb: s.thumb || {}, segments: segs, outro: s.outro || { narration: 'For more stories of technology with real impact, visit T and I News.' },
    captions_on: true,
    sources: res.research.sources || [],
    post: {
      post_at: t.post_at,
      main: {
        account_ids: [cfg.accounts.facebook, cfg.accounts.linkedin, cfg.accounts.youtube],
        content: cut(p.facebook, 2000),
        platform_content: {
          facebook: { content: cut(p.facebook, 2000) },
          linkedin: { content: cut(p.linkedin, 2900) },
          youtube: { content: ytDesc.slice(0, 4900), settings: { title: yt, privacyStatus: 'public', tags: (p.youtube_tags || []).slice(0, 15).map(x => cut(x, 30)), categoryId: '28', madeForKids: false } },
        },
      },
      x: { account_ids: [cfg.accounts.x], content: cut(String(p.x || '').replace(/https?:\/\/\S+/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''), 200), reply_prefix: 'Watch the full documentary:' },
    },
  };
  
  console.log(`draft ${run + 1}: ${total} words, summary ${sumWords}`, problems.length ? 'REJECTED: ' + problems.join('; ') : 'OK');
  if (!problems.length) final = props; else prevProblems = problems;
}
if (!final) throw new Error('Script rejected after 3 drafts: ' + prevProblems.join('; '));
fs.writeFileSync(OUT, JSON.stringify(final, null, 2));
console.log('wrote', OUT, '-', final.title);
