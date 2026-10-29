// Weekly topic picker: one episode every THURSDAY, published 23:00 Dubai (user, 30 Oct 2026; was daily 23:30) (replaces the n8n "Config" + "Pick Topic" nodes; runs inside .github/workflows/daily.yml).
// Rotates region, least-recently-used sector, voice, visual family (night / editorial / blueprint — never the same family
// as the previous episode day) and storytelling format. Reads history.json; writes topic.json.
import fs from 'node:fs';

const CFG = {
  post_hour_dubai: 23, post_minute: 0,
  post_weekdays: [4], // 4 = Thursday (Dubai date). Scheduled runs on any other day do nothing.
  accounts: {facebook: 7748, linkedin: 9116, youtube: 7751, x: 7747},
  research_model: 'anthropic/claude-sonnet-5.5', script_model: 'anthropic/claude-sonnet-5.5',
  voices: ['am_michael', 'af_heart', 'bm_george', 'af_bella', 'am_fenrir', 'bf_emma', 'af_nicole', 'bm_fable'],
  regions: ['United States', 'Europe', 'Africa', 'Middle East', 'GCC', 'South Asia', 'East Asia', 'Asia Pacific'],
  sectors: ['Healthcare', 'Agriculture', 'Education', 'Energy', 'Water and sanitation', 'Financial inclusion', 'Manufacturing',
    'Logistics', 'Retail and e-commerce', 'Construction and housing', 'Transport and mobility', 'Tourism', 'Public services',
    'Climate and environment', 'Telecommunications', 'Food security', 'Insurance', 'Jobs and skills', 'Disaster response',
    'Accessibility', 'Mining and resources', 'Media and culture'],
  skip_dates: ['2026-10-20', '2026-10-25'], // 25 Oct: 'Solar After Sunset' posted by hand
  look_override: {},
};
const LOOK_ORDER = [9, 5, 10, 7, 8, 1, 9, 4, 10, 6, 8, 3]; // 0-3 night, 4-5 editorial, 6-7 blueprint, 8-10 Color Block engine (src/theme.ts)
const FAMILY = (l) => (l <= 3 ? 'night' : l <= 5 ? 'editorial' : l <= 7 ? 'blueprint' : l <= 10 ? 'block' : 'desk');
const FORMATS = ['explainer', 'one-story', 'follow-the-money', 'then-now-next', 'myth-vs-reality'];

const rows = fs.existsSync('history.json') ? JSON.parse(fs.readFileSync('history.json', 'utf8')) : [];
const DAY = 86400000, DUBAI = 4 * 3600000;
const now = process.env.PICK_DATE ? Date.parse(process.env.PICK_DATE + 'T15:00:00Z') : Date.now(); // PICK_DATE: plan a given evening early
const day = Math.floor((now + DUBAI) / DAY);
// a scheduled run that GitHub starts very late (after midnight Dubai) still belongs to the previous evening's slot
const dubaiHour = new Date(now + DUBAI).getUTCHours();
const date = new Date(now + DUBAI - (process.env.SCHEDULED === 'true' && dubaiHour < 12 ? DAY : 0)).toISOString().slice(0, 10);
fs.writeFileSync('reuse.json', '');
const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
if (process.env.SCHEDULED === 'true' && !CFG.post_weekdays.includes(weekday)) {
  console.log(`No episode on ${date}: episodes are weekly, on Thursday only.`);
  fs.writeFileSync('topic.json', '');
  process.exit(0);
}
if (CFG.skip_dates.includes(date) || rows.some((r) => r.date === date && r.post !== 'false')) {
  console.log(`No episode needed for ${date} (skip date or already made).`);
  fs.writeFileSync('topic.json', '');
  process.exit(0);
}
// A test render made earlier today (post=false) becomes tonight's episode: post it instead of rendering again.
const preview = rows.filter((r) => r.date === date && r.post === 'false').pop();
if (preview && process.env.SCHEDULED === 'true') {
  const [yy, mm, dd] = date.split('-').map(Number);
  fs.writeFileSync('reuse.json', JSON.stringify({tag: preview.tag, post_at: new Date(Date.UTC(yy, mm - 1, dd, CFG.post_hour_dubai - 4, CFG.post_minute)).toISOString()}));
  fs.writeFileSync('topic.json', '');
  console.log(`Posting today's already-rendered episode ${preview.tag}`);
  process.exit(0);
}
const lastDate = rows.map((r) => r.date).sort().pop();
const lastDay = rows.filter((r) => r.date === lastDate);

let region = CFG.regions[day % CFG.regions.length];
for (let k = 1; k < CFG.regions.length && lastDay.some((r) => r.region === region); k++) region = CFG.regions[(day + k) % CFG.regions.length];

const lastUse = {};
rows.forEach((r) => { if (!lastUse[r.sector] || r.date > lastUse[r.sector]) lastUse[r.sector] = r.date; });
const recent = rows.slice(-4).map((r) => r.sector);
const ranked = CFG.sectors.slice().sort((a, b) => String(lastUse[a] || '').localeCompare(String(lastUse[b] || '')) || ((day * 7 + a.length) % 5) - ((day * 7 + b.length) % 5));
const choices = ranked.filter((s) => !recent.includes(s));
const sector = (choices.length ? choices : ranked)[0];
const alternates = (choices.length ? choices : ranked).slice(1, 4);

// Engine rotation (user, 26 Oct: every film must look and move differently from the previous ones, not a recolour).
// Pick the ENGINE used least recently (never-used engines first), then the least recently used look inside it.
// night / editorial / blueprint share one engine ('classic'), so they count as one.
const ENGINE = (l) => (l <= 7 ? 'classic' : FAMILY(l));
const ENGINE_LOOKS = {classic: [1, 4, 6, 0, 5, 7, 2, 3], block: [9, 10, 8], desk: [11, 12]};
const lastOf = (pred) => rows.filter((r) => pred(Number(r.look))).map((r) => r.date).sort().pop() || '';
const engine = Object.keys(ENGINE_LOOKS).sort((a, b) => lastOf((l) => ENGINE(l) === a).localeCompare(lastOf((l) => ENGINE(l) === b)))[0];
let look = ENGINE_LOOKS[engine].slice().sort((a, b) => lastOf((l) => (engine === 'classic' ? FAMILY(l) === FAMILY(a) : l === a)).localeCompare(lastOf((l) => (engine === 'classic' ? FAMILY(l) === FAMILY(b) : l === b))))[0];
if (CFG.look_override[date] !== undefined) look = CFG.look_override[date];
let format = FORMATS[day % FORMATS.length];
for (let k = 1; k < FORMATS.length && lastDay.some((r) => r.format === format); k++) format = FORMATS[(day + k) % FORMATS.length];
let voice = CFG.voices[day % CFG.voices.length];
for (let k = 1; k < CFG.voices.length && lastDay.some((r) => r.voice === voice); k++) voice = CFG.voices[(day + k) % CFG.voices.length];

const [y, m, d] = date.split('-').map(Number);
const postAt = new Date(Date.UTC(y, m - 1, d, CFG.post_hour_dubai - 4, CFG.post_minute)).toISOString();
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const topic = {
  date, region, sector, alternates, look, format, voice, post_at: postAt, test: false,
  tag: `doc-${date}-${slug(region)}-${slug(sector)}`,
  recent_titles: rows.map((r) => r.title).filter(Boolean).slice(-60),
  research_model: CFG.research_model, script_model: CFG.script_model, accounts: CFG.accounts, post_enabled: true,
};
fs.writeFileSync('topic.json', JSON.stringify(topic));
console.log(`${date}: ${region} | ${sector} | look ${look} (${FAMILY(look)}) | ${format} | ${voice} | posts ${postAt}`);
