import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import type {Caption, DocProps, Media} from '../types';
import {DISPLAY, Look, MONO, SANS, rand} from '../theme';
import {MediaLayer, ease} from '../components/Layers';

export const Logo: React.FC<{look: Look; hasLogo?: boolean; size?: number}> = ({look, hasLogo, size = 1}) =>
  hasLogo ? (
    <Img src={staticFile('logo.png')} style={{height: 64 * size, objectFit: 'contain', filter: 'brightness(0) invert(1)'}} />
  ) : (
    <div style={{display: 'flex', alignItems: 'center', gap: 14 * size}}>
      <svg width={46 * size} height={46 * size} viewBox="0 0 46 46">
        <circle cx={23} cy={23} r={19} fill="none" stroke={look.accent} strokeWidth={4} strokeDasharray="90 30" />
      </svg>
      <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 40 * size, letterSpacing: 4 * size, color: look.ink}}>T&amp;I NEWS</div>
    </div>
  );

const headlineParts = (h: string, hi?: string) => {
  if (!hi) return [h];
  const i = h.toLowerCase().indexOf(hi.toLowerCase());
  return i < 0 ? [h] : [h.slice(0, i), h.slice(i, i + hi.length), h.slice(i + hi.length)];
};

// Frame 0 IS the thumbnail: everything is fully drawn on the very first frame (no fade-in).
export const Thumb: React.FC<{p: DocProps; look: Look; dur: number}> = ({p, look, dur}) => {
  const f = useCurrentFrame();
  const parts = headlineParts(p.thumb.headline, p.thumb.highlight);
  const out = interpolate(f, [dur - 10, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <MediaLayer media={p.thumb.media} look={look} seed={11} dur={dur} push={0.06} />
      <AbsoluteFill style={{background: `linear-gradient(90deg, ${look.bg}f2 0%, ${look.bg}b3 45%, rgba(0,0,0,0.05) 100%)`}} />
      <div style={{position: 'absolute', left: 110, top: 96, opacity: out}}><Logo look={look} hasLogo={(p as any).has_logo} /></div>
      <div style={{position: 'absolute', left: 110, top: 300, width: 1150, opacity: out}}>
        <div style={{display: 'inline-block', background: look.accent, color: '#0b0b0f', fontFamily: MONO, fontWeight: 500, fontSize: 30,
          letterSpacing: 4, padding: '10px 20px', textTransform: 'uppercase'}}>{p.thumb.kicker}</div>
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: p.thumb.headline.length > 44 ? 108 : 124, lineHeight: 1.0, color: look.ink, textTransform: 'uppercase',
          marginTop: 30, textShadow: '0 6px 40px rgba(0,0,0,0.6)'}}>
          {parts.map((t, i) => <span key={i} style={{color: i === 1 ? look.accent : look.ink}}>{t}</span>)}
        </div>
        <div style={{fontFamily: MONO, fontSize: 28, letterSpacing: 6, color: look.dim, marginTop: 34}}>A T&amp;I NEWS DOCUMENTARY</div>
      </div>
      <div style={{position: 'absolute', right: 110, bottom: 96, width: 120, height: 120, borderRadius: 60, border: `4px solid ${look.ink}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: out}}>
        <div style={{width: 0, height: 0, borderTop: '24px solid transparent', borderBottom: '24px solid transparent', borderLeft: `40px solid ${look.ink}`, marginLeft: 10}} />
      </div>
    </AbsoluteFill>
  );
};

// Chapter card over the first shot of each chapter (glitch flicker, big outline number).
export const ChapterCard: React.FC<{n: number; title: string; look: Look}> = ({n, title, look}) => {
  const f = useCurrentFrame();
  const inn = ease(f, 0, 12), out = interpolate(f, [62, 76], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const flick = f < 10 && rand(f * 31) > 0.5 ? 0.4 : 1;
  if (f > 78) return null;
  return (
    <AbsoluteFill style={{background: `linear-gradient(90deg, rgba(0,0,0,${0.85 * out}) 0%, rgba(0,0,0,${0.45 * out}) 55%, rgba(0,0,0,0) 85%)`, opacity: out * flick}}>
      <div style={{position: 'absolute', left: 110, top: 300, fontFamily: DISPLAY, fontWeight: 700, fontSize: 300, lineHeight: 1,
        color: 'transparent', WebkitTextStroke: `3px ${look.accent}`, transform: `translateX(${(1 - inn) * -40}px)`}}>
        {String(n).padStart(2, '0')}
      </div>
      <div style={{position: 'absolute', left: 120, top: 630, fontFamily: MONO, fontSize: 24, letterSpacing: 6, color: look.accent2, opacity: inn}}>CHAPTER {n}</div>
      <div style={{position: 'absolute', left: 116, top: 674, width: 1300, fontFamily: DISPLAY, fontWeight: 700, fontSize: 88, lineHeight: 1.02,
        color: look.ink, textTransform: 'uppercase', opacity: inn, transform: `translateY(${(1 - inn) * 20}px)`, textShadow: '0 4px 24px rgba(0,0,0,0.8)'}}>{title}</div>
    </AbsoluteFill>
  );
};

// Series ident after the 30 s summary: photo tiles + type tiles collage (multiscreen typo intro reference).
export const Ident: React.FC<{p: DocProps; look: Look; medias: (Media | undefined)[]; dur: number}> = ({p, look, medias, dur}) => {
  const f = useCurrentFrame();
  const cols = 6, rows = 4, w = 1920 / cols, h = 1080 / rows;
  const words = ['TECH', 'IMPACT', p.region.toUpperCase(), p.sector.toUpperCase(), 'PEOPLE', 'PROGRESS'];
  const reveal = ease(f, dur * 0.45, dur * 0.7);
  return (
    <AbsoluteFill style={{background: look.bg}}>
      {Array.from({length: cols * rows}, (_, i) => {
        const r = rand(i * 7 + 3);
        const show = ease(f, r * 14, r * 14 + 8) * (1 - reveal * 0.88);
        const x = (i % cols) * w, y = Math.floor(i / cols) * h;
        const m = medias[i % Math.max(1, medias.length)];
        const isType = r > 0.62 || !m;
        return (
          <div key={i} style={{position: 'absolute', left: x + 6, top: y + 6, width: w - 12, height: h - 12, borderRadius: 18, overflow: 'hidden',
            opacity: show, background: isType ? (i % 2 ? look.accent : look.panel) : '#000', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {isType ? (
              <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 46, color: i % 2 ? '#0b0b0f' : look.ink, letterSpacing: 3}}>{words[i % words.length]}</div>
            ) : (
              <MediaLayer media={m} look={look} seed={i} dur={dur} push={0.2} />
            )}
          </div>
        );
      })}
      <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: reveal,
        background: `rgba(0,0,0,${0.72 * reveal})`}}>
        <Logo look={look} hasLogo={(p as any).has_logo} size={1.4} />
        <div style={{fontFamily: MONO, fontSize: 26, letterSpacing: 10, color: look.accent2, marginTop: 26}}>TECH IMPACT · DOCUMENTARY</div>
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 96, color: look.ink, textTransform: 'uppercase', marginTop: 20,
          textAlign: 'center', maxWidth: 1600, lineHeight: 1.02}}>{p.title}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Outro: React.FC<{p: DocProps; look: Look; media?: Media; dur: number}> = ({p, look, media, dur}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <MediaLayer media={media} look={look} seed={77} dur={dur} dark={0.7} style={{filter: 'blur(4px)'}} />
      <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{opacity: ease(f, 0, 14)}}><Logo look={look} hasLogo={(p as any).has_logo} size={1.6} /></div>
        {p.outro.line ? <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 44, color: look.ink, marginTop: 40, maxWidth: 1400,
          textAlign: 'center', opacity: ease(f, 10, 26)}}>{p.outro.line}</div> : null}
        <div style={{fontFamily: MONO, fontSize: 34, letterSpacing: 6, color: look.accent, marginTop: 40, opacity: ease(f, 20, 36)}}>
          MORE DOCUMENTARIES AT TAI.NEWS
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Subtitles: React.FC<{caps: Caption[]; look: Look; hideFrom?: number}> = ({caps, look, hideFrom = 1e9}) => {
  const f = useCurrentFrame();
  if (f >= hideFrom) return null;
  const c = caps.find((x) => f >= x.start && f < x.end);
  if (!c) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 74, display: 'flex', justifyContent: 'center'}}>
      <div style={{maxWidth: 1500, fontFamily: SANS, fontWeight: 600, fontSize: 40, lineHeight: 1.3, color: '#fff', textAlign: 'center',
        background: 'rgba(0,0,0,0.5)', padding: '8px 22px', borderRadius: 8}}>{c.text}</div>
    </div>
  );
};
