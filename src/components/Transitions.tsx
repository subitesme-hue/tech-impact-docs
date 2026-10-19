import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {Look, rand} from '../theme';

export type TransitionKind = 'zoom' | 'glitch' | 'burn' | 'flash' | 'cut';

// Wraps the incoming shot: power-zoom pull, glitch jitter, burn/flash exposure pump.
export const Entry: React.FC<{kind: TransitionKind; children: React.ReactNode}> = ({kind, children}) => {
  const f = useCurrentFrame();
  let transform = 'none', filter = 'none';
  if (kind === 'zoom') {
    const p = interpolate(f, [0, 10], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
    transform = `scale(${1.35 - 0.35 * p})`;
    filter = `blur(${(1 - p) * 14}px) brightness(${1 + (1 - p) * 0.5})`;
  } else if (kind === 'glitch' && f < 8) {
    transform = `translateX(${(rand(f * 3) - 0.5) * 60}px) skewX(${(rand(f * 7) - 0.5) * 6}deg)`;
    filter = `hue-rotate(${rand(f) * 90}deg) contrast(1.4)`;
  } else if ((kind === 'burn' || kind === 'flash') && f < 14) {
    const b = interpolate(f, [0, 14], [kind === 'flash' ? 2.2 : 1.7, 1], {extrapolateRight: 'clamp'});
    filter = `brightness(${b}) saturate(${kind === 'burn' ? 1.3 : 1})`;
  }
  return <AbsoluteFill style={{transform, filter}}>{children}</AbsoluteFill>;
};

// Overlay drawn around the cut (sequence starts 6 frames before the cut).
export const CutOverlay: React.FC<{kind: TransitionKind; look: Look; seed: number}> = ({kind, look, seed}) => {
  const f = useCurrentFrame() - 6; // 0 == the cut
  if (kind === 'cut') return null;
  if (kind === 'flash') {
    const o = interpolate(f, [-2, 0, 5], [0, 0.85, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return <AbsoluteFill style={{background: '#fff', opacity: o, mixBlendMode: 'screen'}} />;
  }
  if (kind === 'burn') {
    const o = interpolate(f, [-6, 0, 12], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const x = 30 + rand(seed) * 40, y = 30 + rand(seed + 1) * 40;
    return (
      <AbsoluteFill style={{opacity: o, mixBlendMode: 'screen', pointerEvents: 'none'}}>
        <AbsoluteFill style={{background: `radial-gradient(circle at ${x}% ${y}%, #fff6d8 0%, #ffb347 18%, #ff5a1f 38%, rgba(120,20,0,0) 70%)`}} />
        <AbsoluteFill style={{background: `linear-gradient(${90 + rand(seed + 2) * 60}deg, rgba(255,120,40,0) 20%, rgba(255,170,90,0.7) 50%, rgba(255,120,40,0) 80%)`,
          transform: `translateX(${(f / 12) * 600 - 300}px)`}} />
      </AbsoluteFill>
    );
  }
  if (kind === 'zoom') {
    const o = interpolate(f, [-3, 0, 6], [0, 0.6, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return <AbsoluteFill style={{background: `radial-gradient(circle, rgba(255,255,255,0) 30%, ${look.accent}aa 100%)`, opacity: o}} />;
  }
  // glitch: displaced slices, colour bars, scanlines (glitch overlays reference)
  if (f < -3 || f > 8) return null;
  const slices = Array.from({length: 9}, (_, i) => i);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {slices.map((i) => {
        const r = rand(seed * 13 + f * 17 + i);
        if (r < 0.45) return null;
        const top = rand(seed + f * 5 + i * 3) * 1000;
        const h = 8 + rand(seed + f + i * 11) * 70;
        const col = [look.accent, look.accent2, '#ffffff', '#000000'][i % 4];
        return <div key={i} style={{position: 'absolute', left: (rand(f + i) - 0.5) * 300, top, width: 1920 + 300, height: h, background: col, opacity: 0.55, mixBlendMode: i % 2 ? 'difference' : 'screen'}} />;
      })}
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 2px, transparent 2px, transparent 5px)'}} />
    </AbsoluteFill>
  );
};
