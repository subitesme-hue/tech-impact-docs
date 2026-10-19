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
  transitions: ('zoom' | 'glitch' | 'burn' | 'flash')[];
  headlineFont: string;
};

export const LOOKS: Look[] = [
  {
    // "Noir documentary": vintage-documentary reference — gold on near-black, film burns
    name: 'noir',
    bg: '#07090f', panel: 'rgba(14,18,30,0.78)', ink: '#f5f1e8', dim: '#a9a69c',
    accent: '#d4a64a', accent2: '#f0d48a',
    grade: 'contrast(1.12) saturate(0.78) brightness(0.92) sepia(0.12)',
    grain: 0.55, transitions: ['burn', 'zoom', 'flash', 'burn'], headlineFont: DISPLAY,
  },
  {
    // "Signal": AI motion UI kit reference — indigo glass, electric blue/violet glow, glitch cuts
    name: 'signal',
    bg: '#0a0820', panel: 'rgba(30,26,80,0.62)', ink: '#eef0ff', dim: '#9aa0d6',
    accent: '#6f7dff', accent2: '#4fd8ff',
    grade: 'contrast(1.08) saturate(1.05) brightness(0.9) hue-rotate(-6deg)',
    grain: 0.25, transitions: ['glitch', 'zoom', 'glitch', 'flash'], headlineFont: SANS,
  },
  {
    // "Urban": multiframe/abenton reference — warm wash, rounded panels, clean white type
    name: 'urban',
    bg: '#120b0a', panel: 'rgba(30,18,16,0.7)', ink: '#ffffff', dim: '#e2c9bd',
    accent: '#ff6b4a', accent2: '#ffc29a',
    grade: 'contrast(1.06) saturate(1.1) brightness(0.95)', wash: 'rgba(160,40,20,0.18)',
    grain: 0.3, transitions: ['zoom', 'flash', 'zoom', 'glitch'], headlineFont: DISPLAY,
  },
  {
    // "Field report": tech-show/newspaper reference — teal + ivory, crisp, power zooms
    name: 'field',
    bg: '#06110f', panel: 'rgba(8,30,28,0.72)', ink: '#f4fbf8', dim: '#9cc4bb',
    accent: '#2ec4a6', accent2: '#e9d8a6',
    grade: 'contrast(1.1) saturate(0.95) brightness(0.93)',
    grain: 0.35, transitions: ['zoom', 'burn', 'glitch', 'zoom'], headlineFont: SANS,
  },
];

export const lookOf = (i: number) => LOOKS[((i % LOOKS.length) + LOOKS.length) % LOOKS.length];

// Deterministic pseudo-random from a seed (same video renders identically on every worker).
export const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
