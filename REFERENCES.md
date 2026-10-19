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

## Rules every video follows
1. First frame = the thumbnail (headline readable at frame 0).
2. First ~30 s = "In this film" summary, then the documentary chapters (whole video ≤ 6 min).
3. Real footage and photos (Pexels, Pixabay) carry most shots; graphics carry the data.
4. Numbers only from the research sources; no invented quotes, names or figures.
5. One look per day (rotating palette, grade, type and transitions) and one voice per day (rotating).
