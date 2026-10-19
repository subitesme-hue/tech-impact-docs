// V2 research + script writer (runs on GitHub Actions; n8n Cloud runs are capped at 5 minutes).
// Usage: node scripts/write.mjs topic.json props.json
// Env: OPENROUTER_API_KEY, GH_TOKEN + GITHUB_REPOSITORY (past film titles are read from releases).
//
// Episode shape (2:30-3:30): podcast-style intro (what this episode covers) + 6 sections in a fixed order:
// tech in focus -> problem it solves -> challenges -> business opportunities -> how it's used today -> future impact.
import fs from 'node:fs';
import {execSync} from 'node:child_process';

const t = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = process.argv[3] || 'props.json';
const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) throw new Error('Add the OPENROUTER_API_KEY secret in GitHub (Settings -> Secrets and variables -> Actions).');
const cfg = {
  research_model: t.research_model || 'anthropic/claude-sonnet-5.5',
  script_model: t.script_model || 'anthropic/claude-sonnet-5.5',
  accounts: t.accounts || {facebook: 7748, linkedin: 9116, youtube: 7751, x: 7747},
};
try {
  t.recent_titles = JSON.parse(execSync(`gh api "repos/${process.env.GITHUB_REPOSITORY}/releases?per_page=100"`, {encoding: 'utf8'}))
    .map((r) => r.name).filter((n) => n && !n.startsWith('DIAG'));
} catch (e) { t.recent_titles = t.recent_titles || []; }
console.log(`topic: ${t.region} (sector hint ${t.sector}) | avoid ${t.recent_titles.length} past titles`);

const SECTIONS = ['The tech in focus', 'The problem it solves', 'The challenges', 'The business opportunity', 'How it is used today', 'What it means for the future'];

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
const reply = (d, label) => {
  const ch = d.choices?.[0] || {};
  const raw = String(ch.message?.content || '');
  console.log(`${label}: finish=${ch.finish_reason} chars=${raw.length} reasoning=${d.usage?.completion_tokens_details?.reasoning_tokens} cost=${d.usage?.cost}`);
  if (!raw && ch.finish_reason === 'length') throw new Error(`${label}: model spent the whole output budget on reasoning and wrote nothing.`);
  fs.mkdirSync('out/logs', {recursive: true}); fs.writeFileSync(`out/logs/${label.replace(/\W+/g, '-')}.txt`, raw);
  return {ch, raw, json: parseJson(raw)};
};

// ---------------------------------------------------------------- research
let res = null;
for (let run = 0; run < 3 && !res; run++) {
  const hint = run > 0 && t.alternates?.[run - 1] ? t.alternates[run - 1] : t.sector;
  const system = `You are the research desk of T&I News (tai.news): a tech journalist and analyst preparing a short documentary episode.
Find ONE technology that is TRENDING RIGHT NOW (major news, launches, funding, policy or deployments in the last 6 months) and is being applied in "${t.region}". It must have positive social impact and a clear business angle. Sector hint (use it only if a trending story fits): "${hint}".
Good examples of the kind of topic: AI agents in government services, humanoid or warehouse robots, satellite direct-to-phone internet, sovereign AI data centres, solid-state or sodium batteries, AI drug discovery, digital public infrastructure and instant payments, precision fermentation, drone delivery of medicine, quantum-safe security, smart grids, desalination tech, autonomous taxis. Do NOT default to these; find what is genuinely trending for ${t.region}.
Do not repeat any of these past episodes: ${JSON.stringify(t.recent_titles.slice(-60))}.
Rules: use the web results; prefer 2025-2026 sources (official data, company announcements, reputable tech/business media, research bodies). NEVER invent facts, numbers, names, dates or quotes. Copy numbers exactly. Politics/military/conflict are out of scope.
Return ONLY JSON:
{"found": boolean,
 "tech": string (the technology, plain words),
 "angle": string (the compelling question this episode answers, max 140 chars),
 "why_trending_now": string (what happened recently, with dates),
 "tech_in_focus": string (what it is and how it works, plain language),
 "problem_it_solves": string (who has the problem, how big),
 "challenges": [string] (2-4: cost, regulation, skills, trust, infrastructure...),
 "business_opportunities": [string] (2-4, concrete: who can earn, market sizes if sourced),
 "used_today": [{"who": string, "where": string, "what": string}] (2-4 real deployments, at least one in ${t.region}),
 "future_impact": string (credible outlook for society; label forecasts as forecasts),
 "places": [{"name": string, "lat": number, "lon": number}] (1-4 real coordinates),
 "facts": [{"text": string, "number": number|null, "unit": string|null, "source_name": string, "source_url": string, "year": string}] (10-16 items, at least 6 with numbers),
 "sources": [{"title": string, "url": string}] (4-8)}
English only.`;
  const d = await chat({model: cfg.research_model, plugins: [{id: 'web', max_results: 12}], response_format: {type: 'json_object'}, temperature: 0.3,
    max_tokens: 12000, reasoning: {effort: 'low'},
    messages: [{role: 'system', content: system}, {role: 'user', content: `Region: ${t.region}\nSector hint: ${hint}\nToday: ${t.date}`}]});
  const {ch, json: r} = reply(d, `research-${run + 1}`);
  const cited = (ch.message?.annotations || []).filter((a) => a.type === 'url_citation').map((a) => ({title: a.url_citation.title || a.url_citation.url, url: a.url_citation.url}));
  const facts = Array.isArray(r.facts) ? r.facts.filter((f) => f && f.text && f.source_url) : [];
  const seen = new Set();
  const uniq = [...(Array.isArray(r.sources) ? r.sources : []), ...cited].filter((s) => s && /^https?:\/\//.test(s.url || ''))
    .filter((s) => { const k = s.url.replace(/[#?].*$/, ''); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
  const problems = [];
  if (!r.found) problems.push('no story found');
  if (facts.length < 8) problems.push(`only ${facts.length} sourced facts`);
  if (facts.filter((f) => typeof f.number === 'number').length < 4) problems.push('fewer than 4 facts with numbers');
  if (uniq.length < 3) problems.push('fewer than 3 sources');
  if (!(r.used_today || []).length || !(r.business_opportunities || []).length || !(r.challenges || []).length) problems.push('missing used_today / business / challenges');
  r.facts = facts; r.sources = uniq;
  console.log(`research [${hint}]:`, problems.length ? problems.join('; ') : `OK "${r.tech}" — ${r.angle}`);
  if (!problems.length) res = {research: r, sector: hint};
}
if (!res) throw new Error('No well-sourced trending story found after 3 tries.');
fs.writeFileSync('research.json', JSON.stringify(res, null, 2));

// ---------------------------------------------------------------- script
const words = (x) => String(x || '').split(/\s+/).filter(Boolean).length;
const cut = (x, n) => String(x || '').trim().slice(0, n);
const TYPES = ['footage', 'photo3d', 'multiframe', 'stat', 'bars', 'map', 'newspaper', 'timeline', 'split', 'cards', 'filmstrip', 'ui', 'device', 'agenda'];
let final = null, prevProblems = [];
for (let run = 0; run < 3 && !final; run++) {
  const system = `You are an independent documentary maker: a seasoned executive producer, a techpreneur and a tech journalist. You make "T&I Tech Impact", a fast, smart 2:30-3:30 minute episode about one trending technology, for founders, executives, investors and curious viewers.

VOICE: a confident presenter talking straight to the viewer, like a great tech podcast or explainer channel: punchy, specific, curious, a little opinionated, never dull. Short sentences. Concrete names, places, numbers. No filler, no clichés, no hype words (delve, tapestry, testament, landscape, realm, unlock, harness, leverage, revolutionize, game-changer, seamless, cutting-edge, synergy, ever-evolving, imagine a world, in today's world). It must not sound AI-generated.

TRUTH: use ONLY the research. Every number, name and date must come from it. Forecasts must be said as forecasts. Never invent quotes, people or data.

STRUCTURE — "segments" is exactly 7 items in this order:
0) {"kind":"summary","title":"In this episode","beats":[B1,B2]}: the podcast-style opening, 60-75 words in total.
   B1 = the hook: one or two sentences with the most surprising fact or tension (visual: footage, photo3d or multiframe).
   B2 = the episode overview spoken to the viewer, e.g. "Today we look at X: the problem it solves, what is holding it back, where the money is, who is using it right now, and what it means for the rest of us." Visual MUST be {"type":"agenda"}.
1..6) {"kind":"chapter","title":T,"beats":[2-3 beats]} with these section titles in this order (you may sharpen the wording, keep the meaning):
   ${SECTIONS.map((s, i) => `${i + 1}. ${s}`).join('\n   ')}
- Each beat: {"narration": 1-2 sentences, 10-34 words, "visual": {...}}.
- Total narration across all beats + outro: 420-500 words.
- "outro": {"narration": 14-24 words, ending exactly "For more stories of technology with real impact, visit T and I News.", "line": closing thought, max 80 chars}.

VISUALS (one per beat; vary them; never the same type twice in a row except footage). Graphics carry the story; real footage only where the camera can literally show it.
- {"type":"ui","variant":"chat"|"dashboard"|"list"|"notify","app":window title max 28 chars,"lines":[2-4 short lines, max 64 chars],"kpis"?:[2-3 {"label":max 22,"value":string from the facts}]}
  = an on-screen EXAMPLE of the tech in use: what a user, operator or customer sees (a chat with an assistant, a dashboard, a checklist, a phone notification). Lines are illustrative examples consistent with the research; KPI values must come from the facts.
- {"type":"device","kind":"laptop"|"phone","query":Q}  = real footage shown inside a laptop or phone mockup.
- {"type":"stat","value":number,"prefix"?:"$","suffix"?:"%"|"+"|"B"|"M"|...,"decimals"?:0-1,"label":max 56 chars,"source":"Org, year","query":Q}
- {"type":"bars","title":max 40,"unit"?:string,"items":[2-4 {"label":max 36,"value":number}],"source":"Org, year"}
- {"type":"map","region":"${t.region}","label":place,"points":[1-4 {"name","lat","lon"}]}  (best in "How it is used today")
- {"type":"cards","heading":max 34,"items":[3 x max 24 chars]}   (great for challenges / opportunities)
- {"type":"split","heading":max 34,"bullets":[3 x max 58 chars],"query":Q}
- {"type":"timeline","items":[3-5 {"year","text":max 56}]}
- {"type":"newspaper","headline":max 58 (your words),"deck":max 76,"dateline":"Place · Year","query":Q}
- {"type":"footage","query":Q} / {"type":"photo3d","query":Q,"title"?:max 36} / {"type":"multiframe","queries":[Q,Q,Q],"word"?:1-2 words} / {"type":"filmstrip","queries":[Q,Q,Q],"caption":max 36}
Required: >=3 ui or device, >=2 stat or bars, >=1 cards or split, at most 5 footage/photo3d/multiframe beats in total.
Q = a stock-footage search a camera could literally film: 3-6 concrete words (subject + action + setting), e.g. "engineer inspecting server racks data center", "doctor using tablet hospital ward", "delivery drone flying over village". Never brand names, never abstract ideas, never text.

THUMBNAIL "thumb": {"kicker":"${t.region} · <the tech>", "headline": 5-9 words, a sharp curiosity hook with a real number or outcome, "highlight": 1-3 consecutive words copied from the headline, "query": a striking literal photo query}
"title": 3-7 words.

SOCIAL "post": "youtube_title" (max 90, truthful curiosity + keyword), "youtube_description" (2 short paragraphs, max 700 chars), "youtube_tags" (8-15), "linkedin" (120-200 words: insight-led opening, 3 takeaways incl. the business opportunity, a question, then "Watch the full episode: https://tai.news" and 3-5 hashtags), "facebook" (60-110 words, ends "Full episode on T&I News: https://tai.news" + 3 hashtags), "x" (max 200 chars, no emojis, no links, 1-2 hashtags).

Return ONLY JSON {"title","thumb","segments","outro","post"}. English only.`;
  let user = `Region: ${t.region}\nResearch (the only facts you may use):\n${JSON.stringify(res.research)}`;
  if (prevProblems.length) user += `\n\nYour previous draft was rejected for: ${prevProblems.join('; ')}. Fix all of these.`;
  const d = await chat({model: cfg.script_model, response_format: {type: 'json_object'}, temperature: 0.7, max_tokens: 16000, reasoning: {effort: 'low'},
    messages: [{role: 'system', content: system}, {role: 'user', content: user}]});
  const {json: s} = reply(d, `script-${run + 1}`);

  const problems = [];
  const segs = Array.isArray(s.segments) ? s.segments : [];
  if (segs.length !== 7) problems.push(`need 7 segments (intro + 6 sections), got ${segs.length}`);
  if (segs[0] && segs[0].kind !== 'summary') problems.push('segments[0] must be the intro (kind summary)');
  if (segs[0] && !(segs[0].beats || []).some((b) => b.visual?.type === 'agenda')) problems.push('intro needs an agenda beat');
  const beats = segs.flatMap((g) => (Array.isArray(g.beats) ? g.beats : []));
  const introWords = (segs[0]?.beats || []).reduce((a, b) => a + words(b.narration), 0);
  const total = beats.reduce((a, b) => a + words(b.narration), 0) + words(s.outro?.narration);
  if (introWords < 52 || introWords > 85) problems.push(`intro is ${introWords} words (need 60-75)`);
  if (total < 390 || total > 530) problems.push(`total narration is ${total} words (need 420-500)`);
  const researchText = JSON.stringify(res.research).replace(/,/g, '');
  const numOk = (v) => { const n = Number(v); if (!isFinite(n)) return false; return [String(n), n.toFixed(1), String(Math.round(n))].some((f) => researchText.includes(f)); };
  const count = {};
  let prevType = '';
  beats.forEach((b, i) => {
    const v = b.visual || {};
    if (!TYPES.includes(v.type)) { problems.push(`beat ${i + 1}: unknown visual "${v.type}"`); return; }
    count[v.type] = (count[v.type] || 0) + 1;
    if (v.type === prevType && v.type !== 'footage') problems.push(`beat ${i + 1}: same visual twice in a row (${v.type})`);
    prevType = v.type;
    const w = words(b.narration);
    if (w < 6 || w > 42) problems.push(`beat ${i + 1}: narration ${w} words`);
    const q = (x) => typeof x === 'string' && x.trim().split(/\s+/).length >= 3;
    if (['footage', 'photo3d', 'newspaper', 'split', 'device'].includes(v.type) && !q(v.query)) problems.push(`beat ${i + 1}: stock query needs 3+ concrete words`);
    if (['multiframe', 'filmstrip'].includes(v.type) && !(Array.isArray(v.queries) && v.queries.length >= 3 && v.queries.every(q))) problems.push(`beat ${i + 1}: needs 3 queries of 3+ words`);
    if (v.type === 'stat' && !numOk(v.value)) problems.push(`beat ${i + 1}: stat ${v.value} not in research`);
    if (v.type === 'bars') (v.items || []).forEach((it) => { if (!numOk(it.value)) problems.push(`beat ${i + 1}: bar ${it.value} not in research`); });
    if (v.type === 'map' && !(v.points || []).every((p) => isFinite(p.lat) && isFinite(p.lon))) problems.push(`beat ${i + 1}: map points need lat/lon`);
    if (v.type === 'ui' && !(Array.isArray(v.lines) && v.lines.length >= 2)) problems.push(`beat ${i + 1}: ui needs 2-4 lines`);
    if (v.type === 'ui') (v.kpis || []).forEach((k) => { const n = parseFloat(String(k.value).replace(/[^0-9.]/g, '')); if (isFinite(n) && !numOk(n)) problems.push(`beat ${i + 1}: ui kpi ${k.value} not in research`); });
  });
  if ((count.ui || 0) + (count.device || 0) < 3) problems.push('need at least 3 ui/device example scenes');
  if ((count.stat || 0) + (count.bars || 0) < 2) problems.push('need at least 2 stat/bars scenes');
  if ((count.footage || 0) + (count.photo3d || 0) + (count.multiframe || 0) > 6) problems.push('too many stock-footage beats (max 5)');
  if (!s.thumb || words(s.thumb.headline) < 4) problems.push('thumbnail headline missing');
  const banned = /\b(delve|tapestry|testament|realm|unlock|harness|leverage|revolutioni[sz]e|game-changer|seamless|cutting-edge|synergy|ever-evolving)\b/i;
  beats.forEach((b, i) => { if (banned.test(b.narration)) problems.push(`beat ${i + 1}: banned word`); });
  // agenda board items = the six section titles, in order
  segs.forEach((g) => (g.beats || []).forEach((b) => { if (b.visual?.type === 'agenda') b.visual.items = segs.slice(1).map((x) => cut(x.title, 40)); }));

  const p = s.post || {};
  const srcLines = (res.research.sources || []).slice(0, 6).map((x) => `- ${x.title}: ${x.url}`).join('\n');
  const ytDesc = `${cut(p.youtube_description, 900)}\n\nSources:\n${srcLines}\n\nStock footage and photos: Pexels and Pixabay contributors.\nMore episodes and news: https://tai.news\n\n#TechImpact #TandINews`;
  const props = {
    id: t.tag, date: t.date, look: t.look, voice: t.voice, region: t.region, sector: res.sector, tech: cut(res.research.tech, 60),
    title: cut(s.title, 70), thumb: s.thumb || {}, segments: segs,
    outro: s.outro || {narration: 'For more stories of technology with real impact, visit T and I News.'},
    captions_on: false, sources: res.research.sources || [],
    post: {
      post_at: t.post_at,
      main: {
        account_ids: [cfg.accounts.facebook, cfg.accounts.linkedin, cfg.accounts.youtube],
        content: cut(p.facebook, 2000),
        platform_content: {
          facebook: {content: cut(p.facebook, 2000)},
          linkedin: {content: cut(p.linkedin, 2900)},
          youtube: {content: ytDesc.slice(0, 4900), settings: {title: cut(p.youtube_title || s.title, 95), privacyStatus: 'public',
            tags: (p.youtube_tags || []).slice(0, 15).map((x) => cut(x, 30)), categoryId: '28', madeForKids: false}},
        },
      },
      x: {account_ids: [cfg.accounts.x], content: cut(String(p.x || '').replace(/https?:\/\/\S+/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''), 200),
        reply_prefix: 'Watch the full episode:'},
    },
  };
  console.log(`draft ${run + 1}: ${total} words, intro ${introWords}`, problems.length ? 'REJECTED: ' + problems.join('; ') : 'OK');
  if (!problems.length) final = props; else prevProblems = problems;
}
if (!final) throw new Error('Script rejected after 3 drafts: ' + prevProblems.join('; '));
fs.writeFileSync(OUT, JSON.stringify(final, null, 2));
console.log('wrote', OUT, '-', final.title);
