// Daily topic picker (replaces the n8n "Config" + "Pick Topic" nodes; runs inside .github/workflows/daily.yml).
// Rotates region, least-recently-used sector, voice, visual family (night / editorial / blueprint — never the same family
// as the previous episode day) and storytelling format. Reads history.json; writes topic.json.
import fs from 'node:fs';

const CFG = {
  post_hour_dubai: 23, post_minute: 30,
  accounts: {facebook: 7748, linkedin: 9116, youtube: 7751, x: 7747},
  research_model: 'anthropic/claude-sonnet-5.5', script_model: 'anthropic/claude-sonnet-5.5',
  voices: ['am_michael', 'af_heart', 'bm_george', 'af_bella', 'am_fenrir', 'bf_emma', 'af_nicole', 'bm_fable'],
  regions: ['United States', 'Europe', 'Africa', 'Middle East', 'GCC', 'South Asia', 'East Asia', 'Asia Pacific'],
  sectors: ['Healthcare', 'Agriculture', 'Education', 'Energy', 'Water and sanitation', 'Financial inclusion', 'Manufacturing',
    'Logistics', 'Retail and e-commerce', 'Construction and housing', 'Transport and mobility', 'Tourism', 'Public services',
    'Climate and environment', 'Telecommunications', 'Food security', 'Insurance', 'Jobs and skills', 'Disaster response',
    'Accessibility', 'Mining and resources', 'Media and culture'],
  skip_dates: ['2026-10-20'],
};
const LOOK_ORDER = [0, 4, 6, 1, 5, 7, 2, 4, 6, 3, 5, 7]; // 0-3 night, 4-5 editorial, 6-7 blueprint (src/theme.ts)
const FAMILY = (l) => (l <= 3 ? 'night' : l <= 5 ? 'editorial' : 'blueprint');
const FORMATS = ['explainer', 'one-story', 'follow-the-money', 'then-now-next', 'myth-vs-reality'];

const rows = fs.existsSync('history.json') ? JSON.parse(fs.readFileSync('history.json', 'utf8')) : [];
const DAY = 86400000, DUBAI = 4 * 3600000;
const now = Date.now();
const day = Math.floor((now + DUBAI) / DAY);
const date = new Date(now + DUBAI).toISOString().slice(0, 10);
if (CFG.skip_dates.includes(date) || rows.some((r) => r.date === date)) {
  console.log(`No episode needed for ${date} (skip date or already made).`);
  fs.writeFileSync('topic.json', '');
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

const usedFamilies = lastDay.map((r) => FAMILY(Number(r.look)));
let look = LOOK_ORDER[day % LOOK_ORDER.length];
for (let k = 1; k < LOOK_ORDER.length && usedFamilies.includes(FAMILY(look)); k++) look = LOOK_ORDER[(day + k) % LOOK_ORDER.length];
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
