# T&I Tech Impact — weekly documentary (Thursday, 23:00 Dubai)

One documentary a day (up to 6 minutes) about technology and business applications with positive social impact,
rotating across the United States, Europe, Africa, the Middle East, the GCC, South Asia, East Asia and Asia Pacific.

**Every video:** frame 0 is the thumbnail → 30-second "In this film" summary → series ident → 4 short documentary
chapters → outro. Real stock footage and photos (Pexels, Pixabay), animated infographics (stat cards, bars, dotted world
map, timeline, newspaper, split screen, 3D screens, film strip, 3D photo parallax, multiframe panels), film grain, documentary
transitions (film burn, glitch, power zoom, flash), subtitles, a different Kokoro voice every day and a low ducked music bed.
Style references: see `REFERENCES.md`.

## How a day runs
1. **n8n** — workflow *T&I Tech Impact Docs — Daily Documentary*, 21:00 Dubai: picks region (daily rotation), sector
   (least recently used), voice and look, then starts `render.yml` here with that topic.
2. **GitHub Actions** (`.github/workflows/render.yml`):
   1. `scripts/write.mjs` — web research (OpenRouter web search), then the script; rejects drafts that are too short/long,
      use numbers not in the research, invent quotes, or repeat visuals. Up to 3 sectors / 3 drafts.
   2. `scripts/render.py` — Kokoro voice + timeline → stock media → Remotion render → music/SFX mix → -14 LUFS.
   3. Release with `video.mp4`, `summary.mp4` (30 s, for X), `cover.jpg`, `props.json`, `research.json`.
   4. `scripts/post.mjs` (only when posting is on) — waits for 23:00 Dubai (Thursday only), posts the full film to Facebook 7748,
      LinkedIn T&I News 9116 and YouTube 7751 (with chapters), then the 30 s summary to X 7747 with the YouTube link as a reply.

## Secrets (Settings → Secrets and variables → Actions)
`OPENROUTER_API_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `PE_API_KEY`. Optional variable `LOGO_URL` (PNG of the T&I logo).

## Local
`npm ci`, `pip install kokoro-onnx soundfile scipy numpy pillow`, Kokoro files in `models/`, then
`python3 scripts/render.py props.sample.json`. `npm run studio` previews the template.

## Your own assets
- `public/music/user-*.mp3` — licensed tracks are used before the built-in generated beds (`scripts/gen_music.py`).
- `public/logo.png` — your logo (otherwise a typographic T&I NEWS mark is drawn).
