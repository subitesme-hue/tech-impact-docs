import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import type {Media} from '../types';
import {Look, MONO, rand} from '../theme';

const src = (s: string) => (s.startsWith('http') ? s : staticFile(s));

// Real footage or photo, graded per look, always moving (slow push / drift) so nothing sits still.
export const MediaLayer: React.FC<{media?: Media; look: Look; seed: number; dur: number; push?: number; style?: React.CSSProperties; dark?: number}> = ({
  media, look, seed, dur, push = 0.1, style, dark = 0,
}) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, Math.max(1, dur)], [0, 1], {extrapolateRight: 'clamp'});
  const dir = rand(seed) > 0.5 ? 1 : -1;
  const zoomOut = rand(seed + 3) > 0.7; // some shots pull back instead of pushing in
  const s = zoomOut ? 1.04 + push * (1 - t) : 1.04 + push * t;
  const tx = dir * interpolate(t, [0, 1], [-1.2, 1.2]);
  const ty = interpolate(t, [0, 1], [0.6, -0.6]) * (rand(seed + 1) > 0.5 ? 1 : -1);
  const inner: React.CSSProperties = {
    width: '100%', height: '100%', objectFit: 'cover',
    transform: `scale(${s}) translate(${tx}%, ${ty}%)`, filter: look.grade,
  };
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: look.bg, ...style}}>
      {!media ? (
        <Abstract look={look} seed={seed} />
      ) : media.kind === 'video' ? (
        <OffthreadVideo src={src(media.src)} muted style={inner} />
      ) : (
        <Img src={src(media.src)} style={inner} />
      )}
      {look.wash && media ? <AbsoluteFill style={{background: look.wash, mixBlendMode: 'multiply'}} /> : null}
      {dark > 0 ? <AbsoluteFill style={{background: `rgba(0,0,0,${dark})`}} /> : null}
    </AbsoluteFill>
  );
};

// Fallback / designed background: tech "cyclone" of light streaks over a grid (broadcast-background reference).
export const Abstract: React.FC<{look: Look; seed: number}> = ({look, seed}) => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const lines = Array.from({length: 26}, (_, i) => i);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 55%, ${look.accent}33 0%, ${look.bg} 62%)`}}>
      <svg width={width} height={height} style={{position: 'absolute', opacity: 0.35}}>
        {Array.from({length: 33}, (_, i) => (
          <line key={'v' + i} x1={i * 60} y1={0} x2={i * 60} y2={height} stroke={look.dim} strokeWidth={0.6} opacity={0.25} />
        ))}
        {Array.from({length: 19}, (_, i) => (
          <line key={'h' + i} x1={0} y1={i * 60} x2={width} y2={i * 60} stroke={look.dim} strokeWidth={0.6} opacity={0.25} />
        ))}
      </svg>
      <svg width={width} height={height} style={{position: 'absolute'}}>
        {lines.map((i) => {
          const r = 120 + i * 26;
          const a = (f * (0.6 + rand(seed + i) * 0.8) + i * 37) % 360;
          const len = 40 + rand(seed + i * 2) * 90;
          return (
            <circle key={i} cx={width / 2} cy={height / 2} r={r} fill="none" stroke={i % 3 ? look.accent : look.accent2}
              strokeWidth={1.4} strokeDasharray={`${len} ${2 * Math.PI * r}`} strokeDashoffset={-((a / 360) * 2 * Math.PI * r)}
              opacity={0.15 + 0.5 * rand(seed + i * 5)} />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// Film grain + dust + vignette: removes the "too clean, too digital" feel of generated video.
export const FilmTexture: React.FC<{look: Look}> = ({look}) => {
  const f = useCurrentFrame();
  const ox = Math.floor(rand(f) * 512), oy = Math.floor(rand(f + 99) * 512);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{
        backgroundImage: `url(${staticFile('grain.png')})`, backgroundPosition: `${ox}px ${oy}px`,
        mixBlendMode: 'overlay', opacity: 0.18 * look.grain + 0.05,
      }} />
      {f % 3 === 0 ? (
        <AbsoluteFill style={{
          backgroundImage: `url(${staticFile('dust.png')})`, backgroundSize: 'cover',
          transform: `translate(${(rand(f + 5) - 0.5) * 300}px, ${(rand(f + 6) - 0.5) * 200}px) rotate(${Math.floor(rand(f + 7) * 4) * 90}deg)`,
          opacity: 0.35 * look.grain, mixBlendMode: 'screen',
        }} />
      ) : null}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'}} />
    </AbsoluteFill>
  );
};

// Viewfinder corner brackets + small mono labels (film-artefact + AI UI kit references).
export const Hud: React.FC<{look: Look; left: string; right: string}> = ({look, left, right}) => {
  const c = look.ink;
  const L = 34;
  const corner = (x: number, y: number, sx: number, sy: number) => (
    <path d={`M ${x} ${y + sy * L} L ${x} ${y} L ${x + sx * L} ${y}`} stroke={c} strokeWidth={2} fill="none" opacity={0.55} />
  );
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {corner(48, 44, 1, 1)}
        {corner(1872, 44, -1, 1)}
        {corner(48, 1036, 1, -1)}
        {corner(1872, 1036, -1, -1)}
      </svg>
      <div style={{position: 'absolute', left: 96, top: 52, fontFamily: MONO, fontSize: 19, letterSpacing: 3, color: c, opacity: 0.75}}>{left}</div>
      <div style={{position: 'absolute', right: 96, top: 52, fontFamily: MONO, fontSize: 19, letterSpacing: 3, color: c, opacity: 0.75, textAlign: 'right'}}>{right}</div>
    </AbsoluteFill>
  );
};

// Location / context tag that slides in like a documentary lower third.
export const LowerThird: React.FC<{text: string; look: Look; delay?: number}> = ({text, look, delay = 8}) => {
  const f = useCurrentFrame();
  const p = interpolate(f - delay, [0, 16], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <div style={{position: 'absolute', left: 110, bottom: 210, display: 'flex', alignItems: 'center', gap: 18, opacity: p}}>
      <div style={{width: 70 * p, height: 3, background: look.accent}} />
      <div style={{fontFamily: MONO, fontSize: 26, letterSpacing: 5, color: look.ink, textTransform: 'uppercase',
        transform: `translateX(${(1 - p) * -20}px)`, textShadow: '0 2px 12px rgba(0,0,0,0.8)'}}>{text}</div>
    </div>
  );
};

export const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
