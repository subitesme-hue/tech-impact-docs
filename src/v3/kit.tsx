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

// The episode's look, for small parts that do not receive it as a prop (labels).
export const LookCtx = React.createContext<Look | undefined>(undefined);

// The recurring "node" of every diagram: ring (night), square tile (editorial) or drafting box (blueprint).
export const Node: React.FC<{icon?: string; look: Look; size?: number; p: number; hot?: boolean}> = ({icon, look, size = 150, p, hot}) => {
  const sq = look.node !== 'ring';
  const solid = look.node === 'solid';
  return (
    <div style={{width: size, height: size, borderRadius: sq ? (solid ? size * 0.16 : 4) : size / 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: hot ? (solid ? look.accent : `${look.accent}22`) : solid ? look.panel : `rgba(${look.fg},0.04)`,
      border: `${look.node === 'box' ? 1.5 : 2}px ${look.node === 'box' && !hot ? 'dashed' : 'solid'} ${hot ? look.accent : `rgba(${look.fg},${solid ? 0.18 : 0.35})`}`,
      boxShadow: hot && look.mode === 'dark' ? `0 0 60px ${look.accent}55` : solid ? '0 10px 30px rgba(0,0,0,0.08)' : 'none',
      transform: `scale(${0.7 + 0.3 * p})`, opacity: p}}>
      <Icon name={icon} size={size * 0.46} color={hot ? (solid ? look.onAccent : look.accent) : look.ink} />
    </div>
  );
};

export const Label: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({children, color, size = 26, style}) => {
  const look = React.useContext(LookCtx);
  return <div style={{fontFamily: look?.labelFont || SANS, fontWeight: 600, fontSize: size, letterSpacing: size * 0.16, textTransform: 'uppercase',
    color: color || look?.ink || '#fff', ...style}}>{children}</div>;
};

export const Title: React.FC<{children: React.ReactNode; look: Look; p: number; style?: React.CSSProperties}> = ({children, look, p, style}) => (
  <div style={{fontFamily: look.headlineFont, fontWeight: 700, fontSize: 64, lineHeight: 1.05, color: look.ink, textTransform: look.upper ? 'uppercase' : 'none',
    letterSpacing: look.upper ? 2 : 0, opacity: p, transform: `translateY(${(1 - p) * 18}px)`, ...style}}>{children}</div>
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
      <AbsoluteFill style={{background: look.mode === 'dark' ? `linear-gradient(120deg, ${look.bg} 0%, ${look.panel} 45%, ${look.accent} 130%)`
        : `linear-gradient(120deg, ${look.bg} 0%, ${look.panel} 60%, ${look.accent2}55 130%)`}} />
      <Img src={src.startsWith('http') ? src : staticFile(src)} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover',
        filter: `grayscale(1) contrast(${look.mode === 'dark' ? 1.25 : 1.1}) brightness(1.05)`, mixBlendMode: look.mode === 'dark' ? 'screen' : 'multiply',
        opacity: look.mode === 'dark' ? 0.55 : 0.75, transform: `scale(${s})`}} />
    </AbsoluteFill>
  );
};

// Shared cinematic stage behind every diagram: deep gradient, faint dot grid, vignette, slow camera push.
export const Stage: React.FC<{look: Look; dur: number; children?: React.ReactNode; push?: number}> = ({look, dur, children, push = 0.05}) => {
  const f = useCurrentFrame();
  const s = 1 + push * easeIO(f, 0, Math.max(1, dur));
  const back = React.useContext(BackdropCtx);
  const base = look.stage === 'paper' ? `radial-gradient(ellipse at 50% 40%, ${look.panel} 0%, ${look.bg} 80%)`
    : look.stage === 'blueprint' ? `radial-gradient(ellipse at 50% 45%, ${look.panel} 0%, ${look.bg} 85%)`
      : `radial-gradient(ellipse at 50% 45%, ${look.panel} 0%, ${look.bg} 72%)`;
  const texture: React.CSSProperties = look.stage === 'paper'
    ? {backgroundImage: `linear-gradient(rgba(${look.fg},0.9), rgba(${look.fg},0.9)), linear-gradient(rgba(${look.fg},0.9), rgba(${look.fg},0.9))`,
      backgroundSize: '1680px 2px, 1680px 1px', backgroundPosition: '120px 64px, 120px 1012px', backgroundRepeat: 'no-repeat'} // newspaper rules top & bottom
    : look.stage === 'blueprint'
      ? {backgroundImage: `linear-gradient(rgba(${look.fg},0.12) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(${look.fg},0.12) 1.5px, transparent 1.5px),
          linear-gradient(rgba(${look.fg},0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(${look.fg},0.05) 1px, transparent 1px)`,
        backgroundSize: '240px 240px, 240px 240px, 40px 40px, 40px 40px'}
      : {backgroundImage: `radial-gradient(rgba(${look.fg},0.09) 1.2px, transparent 1.2px)`, backgroundSize: '42px 42px'};
  return (
    <AbsoluteFill style={{background: base, overflow: 'hidden'}}>
      {back ? <>
        <Duotone src={back} look={look} dur={dur} strength={look.mode === 'dark' ? 0.6 : 0.45} />
        {/* keep the diagram readable: calm the middle where the content sits */}
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 55% 50%, ${look.bg}d9 0%, ${look.bg}a6 55%, ${look.bg}59 100%)`}} />
      </> : null}
      <AbsoluteFill style={{...texture, transform: look.stage === 'paper' ? undefined : `scale(${s * 1.02})`}} />
      <AbsoluteFill style={{transform: `scale(${s})`}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{background: look.mode === 'dark' ? 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)'
        : 'radial-gradient(ellipse at center, rgba(0,0,0,0) 65%, rgba(60,40,10,0.12) 100%)', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

export const fmt = (n: number, d = 0) => n.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
