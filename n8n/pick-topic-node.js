// n8n Code node "Pick Topic" (Run Once for All Items). Input: rows of the "Tech Impact Docs" data table.
// Rotates region every day (8 regions), picks the least-recently-used sector, rotates voice and look.
const cfg = $('Config').first().json;
const rows = $input.all().map(i => i.json).filter(r => r && r.region);
const DAY = 86400000, DUBAI = 4 * 3600000;
const now = Date.now();
const day = Math.floor((now + DUBAI) / DAY);
const date = new Date(now + DUBAI).toISOString().slice(0, 10);

const region = cfg.regions[day % cfg.regions.length];
const last = {};
rows.forEach(r => { if (r.sector && (!last[r.sector] || r.video_date > last[r.sector])) last[r.sector] = r.video_date; });
const recentSectors = rows.slice().sort((a, b) => String(b.video_date).localeCompare(String(a.video_date))).slice(0, 4).map(r => r.sector);
const ranked = cfg.sectors.slice().sort((a, b) => String(last[a] || '').localeCompare(String(last[b] || '')) || ((day * 7 + a.length) % 5) - ((day * 7 + b.length) % 5));
const sectorChoices = ranked.filter(s => !recentSectors.includes(s));
const sector = (sectorChoices.length ? sectorChoices : ranked)[0];
const alternates = (sectorChoices.length ? sectorChoices : ranked).slice(1, 4);

// Today's post time: 23:30 Dubai (19:30 UTC)
const postAt = new Date(Date.UTC(...date.split('-').map((x, i) => i === 1 ? Number(x) - 1 : Number(x)), cfg.post_hour_dubai - 4, cfg.post_minute));
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const test = $execution.mode !== 'trigger' && $execution.mode !== 'webhook' ? true : cfg.force_test === true;

return [{ json: {
  date, region, sector, alternates,
  voice: cfg.voices[day % cfg.voices.length],
  look: day % 4,
  post_at: postAt.toISOString(),
  test,
  tag: `doc-${date}-${slug(region)}-${slug(sector)}-${String(now).slice(-5)}`,
  recent_titles: rows.slice(-120).map(r => r.title).filter(Boolean),
} }];
