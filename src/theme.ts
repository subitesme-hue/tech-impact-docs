import '@fontsource/oswald/500.css';
import '@fontsource/oswald/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/900.css';
import '@fontsource/playfair-display/700-italic.css';
import '@fontsource/jetbrains-mono/500.css';

export const FPS = 30;
export const W = 1920;
export const H = 1080;

export const DISPLAY = "'Oswald', 'Inter', sans-serif"; // condensed documentary caps
export const SANS = "'Inter', sans-serif";
export const SERIF = "'Playfair Display', serif";
export const MONO = "'JetBrains Mono', monospace";

// One look per day. Each look changes palette, footage grade, card style and the transition mix,
// so consecutive videos never feel like the same template.
export type Look = {
  name: string;
  bg: string; // base background
  panel: string; // card glass colour
  ink: string; // main text
  dim: string; // secondary text
  accent: string;
  accent2: string;
  grade: string; // CSS filter applied to footage
  wash?: string; // optional colour wash over footage (multiframe reference)
  grain: number; // 0..1 film grain strength
  transitions: string[];
  headlineFont: string;
};

// One look per episode (rotates daily). Every shot inside an episode uses the same palette and grade,
// like a single documentary series — no look changes mid-film.
export const LOOKS: Look[] = [
  {name: 'amber', bg: '#060b16', panel: '#13213a', ink: '#f4f1ea', dim: '#93a0b8', accent: '#f2b33d', accent2: '#ffd98a',
    grade: 'contrast(1.08) saturate(0.95) brightness(0.92)', grain: 0.2, transitions: [], headlineFont: DISPLAY},
  {name: 'teal', bg: '#05100f', panel: '#0f2a2a', ink: '#f1f7f5', dim: '#8fb3ad', accent: '#35d0b4', accent2: '#a8f0e0',
    grade: 'contrast(1.08) saturate(0.9) brightness(0.92)', grain: 0.2, transitions: [], headlineFont: DISPLAY},
  {name: 'coral', bg: '#0d0910', panel: '#26182a', ink: '#f7f0f2', dim: '#b39aa8', accent: '#ff7a59', accent2: '#ffc0a8',
    grade: 'contrast(1.08) saturate(0.95) brightness(0.92)', grain: 0.2, transitions: [], headlineFont: DISPLAY},
  {name: 'azure', bg: '#050a14', panel: '#102341', ink: '#eef3fb', dim: '#8ea2c2', accent: '#4ea8ff', accent2: '#bde0ff',
    grade: 'contrast(1.08) saturate(0.92) brightness(0.92)', grain: 0.2, transitions: [], headlineFont: DISPLAY},
];

export const lookOf = (i: number) => LOOKS[((i % LOOKS.length) + LOOKS.length) % LOOKS.length];

// Deterministic pseudo-random from a seed (same video renders identically on every worker).
export const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
