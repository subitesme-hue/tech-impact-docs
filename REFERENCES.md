# Style references (current + future videos)

The creative library for **T&I Tech Impact** documentaries. Each Motion Array link below was studied from its preview,
and the look is rebuilt in code inside `src/` (the automation cannot download Motion Array files — they are licensed,
manual downloads with no API). Add new links here any time; note which scene/effect they inspire.

If you download licensed Motion Array music yourself, drop it in `public/music/user-*.mp3` — those tracks are used
before the built-in generated beds. (Licensed overlay/transition clips can be wired in later on request.)

| Reference | What we took from it | Where in the template |
|---|---|---|
| [AI Motion UI Kit](https://motionarray.com/after-effects-templates/ai-motion-ui-kit-3702988/?subcategories=infographics) | Deep indigo glass cards, big counting numbers, arc gauges, glowing orbit lines | `StatCard`, `Bars`, HUD corners |
| [Glitch Symbols Overlays](https://motionarray.com/stock-motion-graphics/glitch-symbols-overlays-pack-243974/?subcategories=overlays) | Flickering digital symbol fields, data noise | `Glitch` transition, chapter cards |
| [Text and Dirt Glitchy Overlay 2](https://motionarray.com/stock-motion-graphics/text-and-dirt-glitchy-overlay-2-210543/) | Dirt / scratches / text flicker texture | film grain + dust layer |
| [40 Film Artefact Transitions](https://motionarray.com/stock-motion-graphics/pack-of-40-film-artefact-transitions-in-2-formats-3076193/?subcategories=transitions) | Camera viewfinder frame marks, inverted colour flashes, light burns | `FilmBurn` transition, viewfinder marks |
| [Tech Show](https://motionarray.com/after-effects-templates/tech-show/?q=tech&subcategories=slideshows) | Split screen: dark HUD text panel + moving footage, blue light streak | `Split` scene |
| [Multiframe Media Slideshow](https://motionarray.com/after-effects-templates/multiframe-media-slideshow-1163676/) | Mosaic of 4–5 tiles with thin gaps and a warm colour wash | `Multiframe` (grid layout) |
| [Abenton Urban Multiframe Opener](https://motionarray.com/after-effects-templates/abenton-urban-multiframe-media-opener-3459823/) | Rounded-corner tall panels side by side, one bold word over the centre | `Multiframe` (panels layout), title ident |
| [Shifting Screens](https://motionarray.com/final-cut-pro-templates/shifting-screens-3205178/) | 3D stack of floating screens in perspective, rotating camera | `Cards` scene |
| [Multiscreen Typo Logo Intro](https://motionarray.com/final-cut-pro-templates/multiscreen-typo-logo-intro-3387700/) | Collage of photo tiles + bold type tiles revealing the logo | series title ident |
| [Newspaper History](https://motionarray.com/premiere-pro-templates/newspaper-history-539752/?q=documentary) | Printed newspaper page, huge headline, photo, slow tilted camera drift | `Newspaper` scene |
| [Vintage Documentary](https://motionarray.com/premiere-pro-templates/vintage-documentary-1163492/) | Film-strip frames with sprocket marks, B&W photos, condensed white caps | `Filmstrip` scene, documentary typography |
| [History Timeline – The Documentary](https://motionarray.com/premiere-pro-templates/history-timeline-the-documentary-556175/) | Epic timeline with dates and photos | `Timeline` scene |
| [Black and White Social Media Stories](https://motionarray.com/premiere-pro-templates/black-and-white-social-media-stories-1171172/) | Minimal monochrome bars and clean type | lower thirds |
| [3D Photo Animator](https://motionarray.com/after-effects-presets/3d-photo-animator-996265/?sort_by=most-popular) | Still photos made to move with depth (parallax push-in) + bold title | `Photo3D` scene |
| [Power Zoom Transitions](https://motionarray.com/after-effects-presets/power-zoom-transitions-272772/) | Fast zoom-through with motion blur between shots | `PowerZoom` transition |
| [City traffic timelapse at night](https://motionarray.com/stock-video/timelapse-of-busy-city-traffic-at-night-2959910/?q=timelapse&search_header=1) | Establishing-shot energy | stock search hints ("city timelapse night") |
| [Time lapse of car traffic](https://motionarray.com/stock-video/time-lapse-of-car-traffic-1300185/) | Movement / economy b-roll | stock search hints |
| [Traffic of cars and people, modern city](https://motionarray.com/stock-video/traffic-of-cars-and-people-in-a-modern-2187313/) | Human-scale city life | stock search hints |
| [Technology Cyclone](https://motionarray.com/stock-video/technology-cyclone-2328306/?q=technology&search_header=1) | Abstract tech vortex | generated `Abstract` background |
| [Broadcast Background](https://motionarray.com/stock-video/broadcast-background-2191074/) | News-studio looping background | outro / ident background |
| [3D Technology World Map](https://motionarray.com/stock-video/3d-technology-world-map-2180946/) | Dotted digital world map with glowing hot spots | `WorldMap` scene |

## YouTube references you shared (studied frame by frame)
| Reference | What we took from it | Where it lives now |
|---|---|---|
| [jOsI3ghC6zQ](https://www.youtube.com/watch?v=jOsI3ghC6zQ) | Podcast-style opening: the presenter says what the episode covers | 30 s intro = cold open + agenda reel (`AgendaReel`) |
| [wU_bmWb6bhg](https://www.youtube.com/watch?v=wU_bmWb6bhg) | Independent-documentary voice: tension → explanation → stakes | writer prompt (story arc, cold-open rules) |
| [28TGfTZweqw](https://www.youtube.com/watch?v=28TGfTZweqw) | Text only as on-screen examples (UI windows), never captions | `device` shot (phone / laptop example screens) |
| [cQ9X8U68zM4](https://www.youtube.com/watch?v=cQ9X8U68zM4) | What NOT to do: don't copy its viewfinder frame/HUD | no HUD frame in any family |
| [jAa58N4Jlos](https://www.youtube.com/watch?v=jAa58N4Jlos) | Hard cuts every ~2–4 s, each picture literally shows the words | cut-on-the-word timing (`voice.py` cues), max ~14 words per picture |
| [G4H1N_yXBiA](https://www.youtube.com/watch?v=G4H1N_yXBiA) | Nat Geo explainer: diagrams, left chapter rail, one consistent style | Night family, section rail, maps & diagrams |
| [6ctQqDG6l4A](https://www.youtube.com/watch?v=6ctQqDG6l4A) | Warm single grade, tracked titles with callout lines | footage callout labels, one grade per episode |
| [0dLBro4qt6Y](https://www.youtube.com/watch?v=0dLBro4qt6Y) | Beat-synced cuts, smooth camera moves | sound design on cuts, continuous section backdrops |

## Your own films (Projects/my-video on your computer)
| Reference | What we took from it | Where it lives now |
|---|---|---|
| RiyadaX9 brand film (`out/riyadax9-brand-film.mp4`) | Heavy headline + one italic serif accent word, blur-to-sharp word reveal, odometer-rolling numbers, 3–4 s scenes | `AgendaReel` (intro), accent words in Editorial/Blueprint |
| RiyadaX9 daily series (`out/day-01…42.mp4`) | Minimal light-paper layouts, one accent phrase, strike-through contrast | Editorial family |
| (excluded on purpose) the corner-bracket HUD + timecode | you asked not to copy that frame | — |

## Visual families (rotate daily, never the same family two days running)
| Family | Built from these references | What changes |
|---|---|---|
| **Night data** (looks 0–3) | AI Motion UI Kit, 3D Technology World Map, Broadcast Background | dark glow stage, dotted grid, ring nodes, 3D globe, kinetic caps type, letterboxed footage, hard cuts |
| **Editorial** (looks 4–5) | Newspaper History, Vintage Documentary, Multiframe Media Slideshow, 3D Photo Animator | newsprint paper, serif headlines, solid tiles, flat ink map, printed newspaper headline pages, magazine contents page, photos printed on the page with captions, paper wipe between sections |
| **Blueprint** (looks 6–7) | Tech Show, AI Motion UI Kit (gauges), technical drawing | drafting grid, mono labels, dashed boxes, wireframe globe with coordinates, arc gauges for numbers, typed statements with cursor, spec-sheet contents, scan-line between sections, crop marks on footage |

## Storytelling formats (rotate daily; the six sections stay)
explainer · one-story (one real deployment as the thread) · follow-the-money · then-now-next · myth-vs-reality

## Rules every video follows
1. First frame = the thumbnail (headline readable at frame 0).
2. First ~30 s = "In this film" summary, then the documentary chapters (whole video ≤ 6 min).
3. Real footage and photos (Pexels, Pixabay) carry most shots; graphics carry the data.
4. Numbers only from the research sources; no invented quotes, names or figures.
5. One look per day (rotating palette, grade, type and transitions) and one voice per day (rotating).
