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

// A "look" is a whole visual language, not just a palette: background stage, node shape, typography, case,
// light/dark, photo treatment. Families: night (dark data), editorial (light paper, serif), blueprint (drafting grid).
// n8n rotates so consecutive episodes never share a family.
export type Look = {
  name: string;
  family: 'night' | 'editorial' | 'blueprint' | 'block';
  mode: 'dark' | 'light';
  stage: 'night' | 'paper' | 'blueprint';
  node: 'ring' | 'solid' | 'box';
  bg: string; // base background
  panel: string; // card / centre glow colour
  ink: string; // main text
  dim: string; // secondary text
  fg: string; // r,g,b of hairlines and faint fills (white on dark, ink on light)
  accent: string;
  accent2: string;
  onAccent: string; // text/icon colour on an accent fill
  grade: string; // CSS filter applied to footage
  wash?: string;
  grain: number;
  transitions: string[];
  headlineFont: string;
  labelFont: string;
  upper: boolean; // headlines in caps
};

const night = (name: string, bg: string, panel: string, ink: string, dim: string, accent: string, accent2: string): Look => ({
  name, family: 'night', mode: 'dark', stage: 'night', node: 'ring', bg, panel, ink, dim, fg: '255,255,255', accent, accent2, onAccent: '#0b0b10',
  grade: 'contrast(1.08) saturate(0.95) brightness(0.92)', grain: 0.2, transitions: [], headlineFont: DISPLAY, labelFont: SANS, upper: true,
});

export const LOOKS: Look[] = [
  night('night-amber', '#060b16', '#13213a', '#f4f1ea', '#93a0b8', '#f2b33d', '#ffd98a'),
  night('night-teal', '#05100f', '#0f2a2a', '#f1f7f5', '#8fb3ad', '#35d0b4', '#a8f0e0'),
  night('night-coral', '#0d0910', '#26182a', '#f7f0f2', '#b39aa8', '#ff7a59', '#ffc0a8'),
  night('night-azure', '#050a14', '#102341', '#eef3fb', '#8ea2c2', '#4ea8ff', '#bde0ff'),
  // editorial: warm newsprint, ink type, serif headlines, full-colour photos, solid tiles
  {name: 'editorial-red', family: 'editorial', mode: 'light', stage: 'paper', node: 'solid', bg: '#f2ece1', panel: '#fbf8f2', ink: '#16130f', dim: '#6d6455',
    fg: '22,19,15', accent: '#c7372a', accent2: '#1f3a5f', onAccent: '#ffffff', grade: 'contrast(1.04) saturate(1.02) sepia(0.06)', grain: 0.14, transitions: [],
    headlineFont: SERIF, labelFont: SANS, upper: false},
  {name: 'editorial-green', family: 'editorial', mode: 'light', stage: 'paper', node: 'solid', bg: '#eef0ea', panel: '#fafbf7', ink: '#111712', dim: '#5f6a60',
    fg: '17,23,18', accent: '#1f7a4d', accent2: '#b5651d', onAccent: '#ffffff', grade: 'contrast(1.04) saturate(1.0)', grain: 0.14, transitions: [],
    headlineFont: SERIF, labelFont: SANS, upper: false},
  // blueprint: drafting grid, mono labels, dashed boxes, technical drawing feel
  {name: 'blueprint-blue', family: 'blueprint', mode: 'dark', stage: 'blueprint', node: 'box', bg: '#0a2540', panel: '#113a63', ink: '#eaf3ff', dim: '#9cb9da',
    fg: '214,232,255', accent: '#ffd166', accent2: '#7fd1ff', onAccent: '#0a2540', grade: 'contrast(1.06) saturate(0.85)', grain: 0.12, transitions: [],
    headlineFont: DISPLAY, labelFont: MONO, upper: true},
  {name: 'blueprint-graphite', family: 'blueprint', mode: 'dark', stage: 'blueprint', node: 'box', bg: '#15171a', panel: '#23262b', ink: '#f0eee9', dim: '#a3a29c',
    fg: '240,238,233', accent: '#ff8a3d', accent2: '#ffd2a8', onAccent: '#15171a', grade: 'contrast(1.06) saturate(0.8)', grain: 0.12, transitions: [],
    headlineFont: DISPLAY, labelFont: MONO, upper: true},
  // block: a different ENGINE (src/v4/ColorBlock.tsx) — flat colour fields + one travelling dot; these values are only fallbacks
  ...[0, 1, 2].map((k): Look => ({name: `block-${k}`, family: 'block', mode: 'light', stage: 'paper', node: 'solid', bg: '#ECE8DF', panel: '#ECE8DF', ink: '#121212',
    dim: '#555', fg: '18,18,18', accent: '#FF4A1C', accent2: '#1D3BFF', onAccent: '#fff', grade: 'none', grain: 0, transitions: [], headlineFont: SANS, labelFont: MONO, upper: false})),
];

export const lookOf = (i: number) => LOOKS[((i % LOOKS.length) + LOOKS.length) % LOOKS.length];

// Deterministic pseudo-random from a seed (same video renders identically on every worker).
export const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};
