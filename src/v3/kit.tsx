import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing} from 'remotion';
import * as Lucide from 'lucide-react';
import {Look, SANS, DISPLAY, MONO} from '../theme';

export const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
export const easeIO = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});

// Line icon by name from the Lucide set (1,800+ icons). Unknown names fall back to a neutral circle.
export const Icon: React.FC<{name?: string; size: number; color: string; stroke?: number}> = ({name, size, color, stroke = 1.6}) => {
  const C = ((name && (Lucide as any)[name]) || (Lucide as any).Circle) as React.FC<any>;
  return <C size={size} color={color} strokeWidth={stroke} absoluteStrokeWidth={false} />;
};

// Icon inside a ring (the recurring "node" of every diagram).
export const Node: React.FC<{icon?: string; look: Look; size?: number; p: number; hot?: boolean}> = ({icon, look, size = 150, p, hot}) => (
  <div style={{width: size, height: size, borderRadius: size / 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: hot ? `${look.accent}22` : 'rgba(255,255,255,0.04)', border: `2px solid ${hot ? look.accent : 'rgba(255,255,255,0.35)'}`,
    boxShadow: hot ? `0 0 60px ${look.accent}55` : 'none', transform: `scale(${0.7 + 0.3 * p})`, opacity: p}}>
    <Icon name={icon} size={size * 0.46} color={hot ? look.accent : '#ffffff'} />
  </div>
);

export const Label: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({children, color = '#fff', size = 26, style}) => (
  <div style={{fontFamily: SANS, fontWeight: 600, fontSize: size, letterSpacing: size * 0.16, textTransform: 'uppercase', color, ...style}}>{children}</div>
);

export const Title: React.FC<{children: React.ReactNode; look: Look; p: number; style?: React.CSSProperties}> = ({children, look, p, style}) => (
  <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, lineHeight: 1.05, color: look.ink, textTransform: 'uppercase', letterSpacing: 2,
    opacity: p, transform: `translateY(${(1 - p) * 18}px)`, ...style}}>{children}</div>
);

export const Source: React.FC<{text?: string; look: Look; p: number}> = ({text, look, p}) =>
  text ? <div style={{position: 'absolute', right: 120, bottom: 70, fontFamily: MONO, fontSize: 19, letterSpacing: 2, color: look.dim, opacity: 0.8 * p}}>SOURCE · {text.toUpperCase()}</div> : null;

// Regional photo shown behind the diagrams of one section, as a duotone (EVP-studio style). Set per shot by Doc3.
export const BackdropCtx = React.createContext<string | undefined>(undefined);

// Duotone: grayscale photo multiplied onto a shadow->accent gradient, so it carries the episode palette.
export const Duotone: React.FC<{src: string; look: Look; dur: number; strength?: number}> = ({src, look, dur, strength = 1}) => {
  const f = useCurrentFrame();
  const s = 1.06 + 0.06 * easeIO(f, 0, Math.max(1, dur));
  return (
    <AbsoluteFill style={{overflow: 'hidden', opacity: strength}}>
      <AbsoluteFill style={{background: `linear-gradient(120deg, ${look.bg} 0%, ${look.panel} 45%, ${look.accent} 130%)`}} />
      <Img src={src.startsWith('http') ? src : staticFile(src)} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover',
        filter: 'grayscale(1) contrast(1.25) brightness(1.05)', mixBlendMode: 'screen', opacity: 0.55, transform: `scale(${s})`}} />
    </AbsoluteFill>
  );
};

// Shared cinematic stage behind every diagram: deep gradient, faint dot grid, vignette, slow camera push.
export const Stage: React.FC<{look: Look; dur: number; children?: React.ReactNode; push?: number}> = ({look, dur, children, push = 0.05}) => {
  const f = useCurrentFrame();
  const s = 1 + push * easeIO(f, 0, Math.max(1, dur));
  const back = React.useContext(BackdropCtx);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, ${look.panel} 0%, ${look.bg} 72%)`, overflow: 'hidden'}}>
      {back ? <>
        <Duotone src={back} look={look} dur={dur} strength={0.6} />
        {/* keep the diagram readable: darken the middle where the content sits */}
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 55% 50%, ${look.bg}d9 0%, ${look.bg}a6 55%, ${look.bg}59 100%)`}} />
      </> : null}
      <AbsoluteFill style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1.2px, transparent 1.2px)', backgroundSize: '42px 42px',
        transform: `scale(${s * 1.02})`}} />
      <AbsoluteFill style={{transform: `scale(${s})`}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

export const fmt = (n: number, d = 0) => n.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
