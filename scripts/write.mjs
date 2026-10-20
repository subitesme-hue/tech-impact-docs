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
  const problems = [], soft = []; // soft = small issues the edit can absorb (voice.py spreads a missed cue evenly)
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

// ---------------------------------------------------------------- script (V3: animated documentary, cut on spoken words)
import {createRequire} from 'node:module';
// Every name the renderer can resolve: lucide-react exports icons AND their aliases (e.g. Building2) at the top level.
const LUCIDE = createRequire(import.meta.url)('lucide-react');
const iconOk = (n) => typeof n === 'string' && /^[A-Z]/.test(n) && !!LUCIDE[n] && n !== 'Icon' && n !== 'createLucideIcon';
const tok = (x) => String(x || '').toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, '')).filter(Boolean); // same as voice.py norm()
const words = (x) => String(x || '').split(/\s+/).filter(Boolean).length;
const cut = (x, n) => String(x || '').trim().slice(0, n);
const KINDS = ['globe', 'route', 'flow', 'counter', 'compare', 'units', 'chart', 'steps', 'network', 'icons', 'timeline', 'kinetic', 'device', 'footage', 'agenda'];
const EXAMPLE = {kind: 'summary', title: 'In this episode', beats: [
  {narration: 'Ninety minutes by road. Six minutes by air. In one of the biggest crowds on Earth, Saudi Arabia has just licensed drones to carry medicine.',
    shots: [{kind: 'kinetic', text: 'Ninety minutes by road', emphasis: 'ninety'}, {kind: 'kinetic', text: 'Six minutes by air', emphasis: 'six', at: 'Six'},
      {kind: 'globe', focus: {lat: 21.4, lon: 39.9}, region: 'GCC', points: [{name: 'Mina', lat: 21.41, lon: 39.89}], label: 'Makkah, Saudi Arabia', at: 'In one'},
      {kind: 'footage', query: 'delivery drone flying over city', at: 'licensed'}]},
  {narration: 'Today: how medical drones work, the problem they solve, what holds them back, where the money is, who flies them now, and what comes next.', shots: [{kind: 'agenda'}]}]};
let final = null, prevProblems = [], prevDraft = null, best = null;
for (let run = 0; run < 3 && !final; run++) {
  const system = `You are an independent documentary maker with the instincts of a top executive producer, a techpreneur and a tech journalist. You make "T&I Tech Impact": 2:30-3:30 minute animated documentary episodes (the feel of a Nat Geo / Vox explainer) about one trending technology. The goal: educate and entertain founders, executives and curious viewers so they subscribe and visit tai.news.

HOW THESE FILMS WORK (follow exactly):
- The narration is the spine. The picture changes on the words: a new shot every 7-12 spoken words (about every 2.5-4 seconds). Every shot must literally show what is being said at that moment.
- Shots are animated diagrams in one consistent style, with real footage only as an occasional accent. Hard cuts only.
- Storytelling: start with tension, then explain, then complicate (challenges), then reward (opportunity), then proof (who uses it now), then meaning (future). Every sentence earns its place. Concrete names, places, numbers. Confident, warm presenter voice. Short sentences. No filler. No hype words (delve, tapestry, testament, landscape, realm, unlock, harness, leverage, revolutionize, game-changer, seamless, cutting-edge, synergy, imagine a world).

TRUTH: use ONLY the research. Every number, name, date must come from it. Forecasts said as forecasts.

STRUCTURE — "segments": exactly 7, in order:
0) the intro, {"kind":"summary","title":"In this episode","beats":[B1,B2]}, about 30 seconds, 72-88 words: B1 = the COLD OPEN (2-3 sentences, 3-4 shots). Its first sentence is 3-8 words and must stop the scroll on its own: a startling number, a stark contrast or a human moment, said like a documentary narrator (e.g. "Ninety minutes by road. Six minutes by air." / "One phone call can save a harvest."). Never open with "In", "Today", "Imagine", "Have you ever", "What if" or a question. Then name the place and the stakes; B2 = the presenter tells the viewer what this episode covers, naming all six parts naturally (one shot: {"kind":"agenda"}).
1..6) {"kind":"chapter","title":T,"beats":[2-3 beats]} with titles: ${SECTIONS.join(' | ')} (you may sharpen wording, keep meaning and order).
- beat = {"narration": 1-2 sentences, 12-34 words, "shots": [...]}. Number of shots in a beat = about one per 9 words (so 2-4). Every shot after the first has "at": the exact first 1-2 words of the narration where that shot starts (copied from the narration).
- Total narration (all beats + outro): 440-520 words.
- "outro": {"narration": 14-24 words ending exactly "For more stories of technology with real impact, visit T and I News.", "line": closing thought, max 70 chars}.

SHOT KINDS (I = an icon name from the Lucide icon set, PascalCase, e.g. Drone, Hospital, Pill, Truck, Factory, Building2, Users, Smartphone, Laptop, Server, Cpu, Bot, BrainCircuit, Satellite, Wifi, Sun, Wind, Battery, Leaf, Wheat, Droplets, Banknote, Coins, TrendingUp, ShieldCheck, Lock, Scale, FileText, Clock, Thermometer, Activity, HeartPulse, Syringe, FlaskConical, GraduationCap, School, Car, Bus, Ship, Plane, Package, Warehouse, Store, ShoppingCart, Handshake, Briefcase, Globe, MapPin, Rocket, Lightbulb, Zap, Recycle, Radar, Gauge, Hourglass, Construction, Cable, Network, Fingerprint, QrCode):
- {"kind":"globe","focus":{"lat","lon"},"region"?:region name,"points"?:[1-4 {"name","lat","lon"}],"arcs"?:[[0,1]],"label"?:max 40}   where in the world
- {"kind":"route","points":[2-4 {"name","lat","lon"}],"mover":I,"compare"?:[2 {"label":max 12,"value":max 8}],"label"?:max 34}   movement from A to B on a map
- {"kind":"flow","nodes":[2-4 {"icon":I,"label":max 22}],"mover":I,"label"?:max 34}   how it works, step to step
- {"kind":"counter","value":number,"from"?:number,"prefix"?:"$","suffix"?:"%"|"+"|" kg"|"B"|"M"...,"decimals"?:0-1,"label":max 52,"icon"?:I,"source"?:"Org, year"}   one big number
- {"kind":"compare","title"?:max 40,"left":{"icon":I,"label":max 26,"value":max 8},"right":{"icon":I,"label":max 26,"value":max 8}}   before/after, A vs B
- {"kind":"units","total":10|20|50|100,"highlight":number,"icon":I,"label":max 52}   "1 in 5", percentages
- {"kind":"chart","chart":"line"|"bar","title":max 40,"prefix"?:"$","unit"?:"B"|"%"|"M"|...,"points":[2-6 {"label":max 14,"value":number}],"source"?:"Org, year"}   trends over time
- {"kind":"steps","items":[3-4 {"icon":I,"label":max 22}]}   a process or rollout
- {"kind":"network","center":{"icon":I,"label":max 26},"nodes":[3-6 {"icon":I,"label":max 20}]}   ecosystem, who benefits
- {"kind":"icons","title"?:max 30,"items":[2-4 {"icon":I,"label":max 22}]}   a short list (challenges, features)
- {"kind":"timeline","items":[3-5 {"year","text":max 40}]}   history
- {"kind":"kinetic","text":max 7 words,"emphasis"?:1 word}   a punchline said on screen (max 3 per episode)
- {"kind":"device","device":"phone"|"laptop","app":max 24,"lines":[2-3 x max 48]}   an EXAMPLE of the screen a user sees (max 2 per episode)
- {"kind":"footage","query":3-6 concrete filmable words that NAME THE COUNTRY or city where the scene is (e.g. "Kenyan farmer phone maize field", "Dubai metro station crowd"),"label":the place shown, max 26}   real stock footage accent (max 4 per episode; it is only used if the clip is really from that place)
- {"kind":"agenda"}   only in the intro
Variety rules: never the same kind twice in a row; any kind at most 5 times (kinetic 3, device 2, footage 4); use at least 9 different kinds. Numbers in counter/compare/units/chart must come from the facts.

EXAMPLE of the intro written correctly (different topic, do not copy): ${JSON.stringify(EXAMPLE)}

THUMBNAIL "thumb": {"kicker":"<Country or region> · <the tech>", "headline": 5-9 words with a real number or outcome, "highlight": 1-3 words copied from the headline, "query": a striking literal photo query that names the country (e.g. "Kenyan farmer holding phone in field"), "focus": {"lat","lon"} of the main place}
"title": 3-6 words.
SOCIAL "post": "youtube_title" (max 90, truthful curiosity + keyword), "youtube_description" (2 short paragraphs, max 700 chars), "youtube_tags" (8-15), "linkedin" (120-200 words: insight-led opening, 3 takeaways incl. the business opportunity, a question, then "Watch the full episode: https://tai.news" and 3-5 hashtags), "facebook" (60-110 words, ends "Full episode on T&I News: https://tai.news" + 3 hashtags), "x" (max 200 chars, no emojis, no links, 1-2 hashtags).
Return ONLY JSON {"title","thumb","segments","outro","post"}. English only.`;
  let user = `Region: ${t.region}\nResearch (the only facts you may use):\n${JSON.stringify(res.research)}`;
  if (prevDraft) user += `\n\nYOUR PREVIOUS DRAFT:\n${JSON.stringify(prevDraft)}\n\nIt was rejected for: ${prevProblems.join('; ')}.\nReturn the full corrected JSON. Change only what is needed to fix these problems; keep everything else.`;
  const d = await chat({model: cfg.script_model, response_format: {type: 'json_object'}, temperature: 0.7, max_tokens: 20000, reasoning: {effort: 'low'},
    messages: [{role: 'system', content: system}, {role: 'user', content: user}]});
  const {json: s} = reply(d, `script-${run + 1}`);

  const problems = [], soft = []; // soft = small issues the edit can absorb (voice.py spreads a missed cue evenly)
  const segs = Array.isArray(s.segments) ? s.segments : [];
  if (segs.length !== 7) problems.push(`need 7 segments (intro + 6 sections), got ${segs.length}`);
  if (segs[0] && segs[0].kind !== 'summary') problems.push('segments[0] must be the intro (kind summary)');
  const beats = segs.flatMap((g) => (Array.isArray(g.beats) ? g.beats : []));
  const introWords = (segs[0]?.beats || []).reduce((a, b) => a + words(b.narration), 0);
  const total = beats.reduce((a, b) => a + words(b.narration), 0) + words(s.outro?.narration);
  if (introWords < 55 || introWords > 105) problems.push(`intro is ${introWords} words (need 72-88)`); else if (introWords < 68 || introWords > 94) soft.push(`intro is ${introWords} words (need 72-88)`);
  if (total < 410 || total > 550) problems.push(`total narration is ${total} words (need 440-520)`);
  const researchText = JSON.stringify(res.research).replace(/,/g, '');
  const numOk = (v) => { const n = Number(v); if (!isFinite(n)) return false; return [String(n), n.toFixed(1), String(Math.round(n)), String(n * 1000), String(n / 1000)].some((f) => researchText.includes(f)); };
  const count = {};
  let prev = '', nShots = 0;
  const icons = [];
  beats.forEach((b, bi) => {
    const shots = Array.isArray(b.shots) ? b.shots : [];
    if (!shots.length) { problems.push(`beat ${bi + 1}: no shots`); return; }
    const w = words(b.narration);
    if (w < 6 || w > 50) problems.push(`beat ${bi + 1}: narration ${w} words`);
    if (shots[0].kind !== 'agenda' && w / shots.length > 13) (w / shots.length > 17 ? problems : soft).push(`beat ${bi + 1}: ${w} words but only ${shots.length} shots (need a new shot every 7-12 words)`);
    shots.forEach((sh, si) => {
      nShots++;
      if (!KINDS.includes(sh.kind)) { problems.push(`beat ${bi + 1} shot ${si + 1}: unknown kind "${sh.kind}"`); return; }
      count[sh.kind] = (count[sh.kind] || 0) + 1;
      if (sh.kind === prev) problems.push(`beat ${bi + 1} shot ${si + 1}: same kind twice in a row (${sh.kind})`);
      prev = sh.kind;
      if (si > 0) {
        const cue = tok(sh.at)[0];
        if (!cue || !tok(b.narration).includes(cue)) soft.push(`beat ${bi + 1} shot ${si + 1}: "at" cue "${sh.at}" is not a word in the narration`);
      }
      const collect = (x) => { if (x && x.icon !== undefined) icons.push(x.icon); };
      ['nodes', 'items'].forEach((k) => (sh[k] || []).forEach(collect));
      collect(sh.center); collect(sh.left); collect(sh.right);
      if (sh.mover) icons.push(sh.mover);
      if (sh.kind === 'counter' && !numOk(sh.value)) problems.push(`counter ${sh.value} not in research`);
      if (sh.kind === 'chart') (sh.points || []).forEach((p) => { if (!numOk(p.value)) problems.push(`chart value ${p.value} not in research`); });
      if (sh.kind === 'units' && !(isFinite(sh.highlight) && isFinite(sh.total))) problems.push('units needs total and highlight');
      if ((sh.kind === 'globe' && !(sh.focus && isFinite(sh.focus.lat))) || (sh.kind === 'route' && !(sh.points || []).every((p) => isFinite(p.lat) && isFinite(p.lon)))) problems.push(`${sh.kind}: needs real lat/lon`);
      if (sh.kind === 'footage' && String(sh.query || '').split(/\s+/).length < 3) problems.push('footage query needs 3+ concrete words');
    });
  });
  const bad = icons.filter((n) => !iconOk(n));
  if (bad.length) soft.push(`unknown icon names: ${[...new Set(bad)].slice(0, 8).join(', ')} (use Lucide PascalCase names)`);
  const caps = {kinetic: 3, device: 2, footage: 4, agenda: 1};
  Object.entries(count).forEach(([k, n]) => { if (n > (caps[k] || 5)) problems.push(`${k} used ${n} times (max ${caps[k] || 5})`); });
  if (Object.keys(count).length < 9) problems.push(`only ${Object.keys(count).length} different shot kinds (need 9+)`);
  if (!count.agenda) problems.push('intro needs an agenda shot');
  if (!s.thumb || words(s.thumb.headline) < 4) problems.push('thumbnail headline missing');
  const banned = /\b(delve|tapestry|testament|realm|unlock|harness|leverage|revolutioni[sz]e|game-changer|seamless|cutting-edge|synergy|ever-evolving)\b/i;
  beats.forEach((b, i) => { if (banned.test(b.narration)) problems.push(`beat ${i + 1}: banned word`); });

  const p = s.post || {};
  const srcLines = (res.research.sources || []).slice(0, 6).map((x) => `- ${x.title}: ${x.url}`).join('\n');
  const ytDesc = `${cut(p.youtube_description, 900)}\n\nSources:\n${srcLines}\n\nStock footage: Pexels and Pixabay contributors.\nMore episodes and news: https://tai.news\n\n#TechImpact #TandINews`;
  const props = {
    id: t.tag, date: t.date, look: t.look, voice: t.voice, region: t.region, sector: res.sector, tech: cut(res.research.tech, 60),
    title: cut(s.title, 70), thumb: s.thumb || {}, segments: segs,
    outro: s.outro || {narration: 'For more stories of technology with real impact, visit T and I News.'},
    sources: res.research.sources || [],
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
  const fixIcon = (x) => { if (x && x.icon !== undefined && !iconOk(x.icon)) x.icon = 'Circle'; };
  segs.forEach((g) => (g.beats || []).forEach((b) => (b.shots || []).forEach((sh) => {
    ['nodes', 'items'].forEach((k) => (sh[k] || []).forEach(fixIcon)); fixIcon(sh.center); fixIcon(sh.left); fixIcon(sh.right);
    if (sh.mover && !iconOk(sh.mover)) sh.mover = 'Circle';
  })));
  if (soft.length) console.log(`draft ${run + 1} small issues (accepted): ${soft.join('; ')}`);
  console.log(`draft ${run + 1}: ${total} words, intro ${introWords}, ${nShots} shots, ${Object.keys(count).length} kinds`, problems.length ? 'REJECTED: ' + problems.join('; ') : 'OK');
  if (!problems.length) final = props; else { prevProblems = [...problems, ...soft]; prevDraft = s; }
}
if (!final) throw new Error('Script rejected after 3 drafts: ' + prevProblems.join('; '));
fs.writeFileSync(OUT, JSON.stringify(final, null, 2));
console.log('wrote', OUT, '-', final.title);
