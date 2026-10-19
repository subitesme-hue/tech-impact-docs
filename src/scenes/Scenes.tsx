import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing} from 'remotion';
import type {Media, Visual} from '../types';
import {DISPLAY, Look, MONO, SANS, SERIF, rand} from '../theme';
import {Abstract, LowerThird, MediaLayer, ease} from '../components/Layers';
import {WorldMap} from '../components/WorldMap';

type P = {look: Look; seed: number; dur: number; ltDelay?: number};
const shadow = '0 4px 28px rgba(0,0,0,0.75)';

const fmt = (n: number, d = 0) => n.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});

// ---------------------------------------------------------------- footage
const Footage: React.FC<P & {v: Extract<Visual, {type: 'footage'}>}> = ({v, look, seed, dur, ltDelay}) => (
  <AbsoluteFill>
    <MediaLayer media={v.media} look={look} seed={seed} dur={dur} />
    <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 40%)'}} />
    {v.caption ? <LowerThird text={v.caption} look={look} delay={ltDelay} /> : null}
  </AbsoluteFill>
);

// ---------------------------------------------------------------- 3D photo (parallax push, 3D photo animator reference)
const Photo3D: React.FC<P & {v: Extract<Visual, {type: 'photo3d'}>}> = ({v, look, seed, dur, ltDelay}) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, dur], [0, 1], {extrapolateRight: 'clamp'});
  if (!v.media || v.media.kind !== 'image') return <Footage v={{type: 'footage', query: v.query, caption: v.caption, media: v.media}} look={look} seed={seed} dur={dur} />;
  const s = staticFile(v.media.src);
  const dir = rand(seed) > 0.5 ? 1 : -1;
  const img: React.CSSProperties = {position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: look.grade};
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      <Img src={s} style={{...img, transform: `scale(${1.12 + 0.05 * t}) translateX(${dir * t * -1.2}%)`, filter: `${look.grade} blur(3px) brightness(0.8)`}} />
      <Img src={s} style={{...img, transform: `scale(${1.08 + 0.2 * t}) translateX(${dir * t * 2.2}%)`,
        WebkitMaskImage: 'radial-gradient(ellipse 46% 58% at 50% 55%, #000 55%, transparent 100%)',
        maskImage: 'radial-gradient(ellipse 46% 58% at 50% 55%, #000 55%, transparent 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 45%)'}} />
      {v.title ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: '42%', textAlign: 'center', fontFamily: look.headlineFont, fontWeight: 800,
          fontSize: 92, color: look.ink, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: 1, textShadow: shadow,
          opacity: ease(f, 6, 20), transform: `scale(${0.96 + 0.04 * ease(f, 6, 30)})`}}>{v.title}</div>
      ) : null}
      {v.caption ? <LowerThird text={v.caption} look={look} delay={ltDelay} /> : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- multiframe (abenton panels / mosaic grid)
const Multiframe: React.FC<P & {v: Extract<Visual, {type: 'multiframe'}>}> = ({v, look, seed, dur}) => {
  const f = useCurrentFrame();
  const m = (v.medias || []).filter(Boolean);
  const n = Math.max(3, Math.min(4, m.length || 3));
  const grid = look.name === 'urban' || look.name === 'noir' ? rand(seed) > 0.5 : rand(seed) > 0.75;
  const tiles = Array.from({length: n}, (_, i) => i);
  const word = v.word ? (
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY,
      fontWeight: 700, fontSize: 150, color: '#fff', letterSpacing: 6, textTransform: 'uppercase', textShadow: '0 6px 40px rgba(0,0,0,0.6)',
      opacity: ease(f, 14, 26), transform: `scale(${1.08 - 0.08 * ease(f, 14, 40)})`}}>{v.word}</div>
  ) : null;
  if (grid) {
    // mosaic: big tile left, smaller tiles right (multiframe slideshow reference)
    const rects = n === 3 ? [[0, 0, 1060, 1080], [1072, 0, 848, 534], [1072, 546, 848, 534]]
      : [[0, 0, 1060, 640], [0, 652, 1060, 428], [1072, 0, 848, 534], [1072, 546, 848, 534]];
    return (
      <AbsoluteFill style={{background: look.bg}}>
        {tiles.map((i) => {
          const [x, y, w, h] = rects[i];
          const p = ease(f, i * 5, i * 5 + 14);
          return (
            <div key={i} style={{position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', opacity: p,
              transform: `translateY(${(1 - p) * (i % 2 ? 60 : -60)}px)`}}>
              <MediaLayer media={m[i]} look={look} seed={seed + i * 7} dur={dur} push={0.14} />
            </div>
          );
        })}
        {word}
      </AbsoluteFill>
    );
  }
  // tall rounded panels side by side
  const gap = 26, w = (1920 - 120 - gap * (n - 1)) / n;
  return (
    <AbsoluteFill style={{background: look.bg}}>
      {tiles.map((i) => {
        const p = ease(f, i * 4, i * 4 + 16);
        const drift = interpolate(f, [0, dur], [0, i % 2 ? -40 : 40]);
        return (
          <div key={i} style={{position: 'absolute', left: 60 + i * (w + gap), top: 90 + drift, width: w, height: 900, borderRadius: 34,
            overflow: 'hidden', opacity: p, transform: `translateY(${(1 - p) * 120}px)`, boxShadow: '0 20px 60px rgba(0,0,0,0.5)'}}>
            <MediaLayer media={m[i]} look={look} seed={seed + i * 7} dur={dur} push={0.12} />
          </div>
        );
      })}
      {word}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- stat card (AI motion UI kit reference)
const Stat: React.FC<P & {v: Extract<Visual, {type: 'stat'}>}> = ({v, look, seed, dur}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [8, 48], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const val = fmt(v.value * p, v.decimals ?? (Math.abs(v.value) < 10 && v.value % 1 ? 1 : 0));
  const r = 105, C = Math.PI * r;
  return (
    <AbsoluteFill>
      {v.media ? <MediaLayer media={v.media} look={look} seed={seed} dur={dur} dark={0.55} style={{filter: 'blur(6px)'}} /> : <Abstract look={look} seed={seed} />}
      <div style={{position: 'absolute', left: 260, right: 260, top: 210, height: 600, borderRadius: 40, background: look.panel,
        border: `1px solid ${look.accent}55`, backdropFilter: 'blur(14px)', boxShadow: `0 0 120px ${look.accent}33`,
        opacity: ease(f, 0, 12), transform: `translateY(${(1 - ease(f, 0, 16)) * 50}px)`}}>
        <svg width={1400} height={600} style={{position: 'absolute', left: 0, top: 0}}>
          <path d={`M ${700 - r} 545 A ${r} ${r} 0 0 1 ${700 + r} 545`} stroke={`${look.dim}44`} strokeWidth={16} fill="none" strokeLinecap="round" />
          <path d={`M ${700 - r} 545 A ${r} ${r} 0 0 1 ${700 + r} 545`} stroke={look.accent} strokeWidth={16} fill="none" strokeLinecap="round"
            strokeDasharray={`${C * p} ${C}`} />
        </svg>
        <div style={{position: 'absolute', top: 70, width: '100%', textAlign: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 168,
          color: look.ink, letterSpacing: -2}}>
          {v.prefix || ''}{val}{v.suffix || ''}
        </div>
        <div style={{position: 'absolute', top: 290, width: '100%', textAlign: 'center', fontFamily: SANS, fontWeight: 600, fontSize: 44,
          color: look.ink, padding: '0 90px', boxSizing: 'border-box', opacity: ease(f, 20, 34)}}>{v.label}</div>
        {v.source ? <div style={{position: 'absolute', bottom: 26, width: '100%', textAlign: 'center', fontFamily: MONO, fontSize: 20,
          color: look.dim, letterSpacing: 2, opacity: ease(f, 30, 44)}}>SOURCE: {v.source.toUpperCase()}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- bar infographic
const Bars: React.FC<P & {v: Extract<Visual, {type: 'bars'}>}> = ({v, look, seed}) => {
  const f = useCurrentFrame();
  const items = v.items.slice(0, 5);
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <AbsoluteFill>
      <Abstract look={look} seed={seed} />
      <div style={{position: 'absolute', left: 160, top: 120, fontFamily: look.headlineFont, fontWeight: 700, fontSize: 64, color: look.ink,
        textTransform: 'uppercase', letterSpacing: 1, opacity: ease(f, 0, 12)}}>{v.title}</div>
      <div style={{position: 'absolute', left: 160, top: 210, width: 120, height: 4, background: look.accent}} />
      {items.map((it, i) => {
        const p = interpolate(f, [10 + i * 7, 40 + i * 7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
        const w = (Math.abs(it.value) / max) * 1100 * p;
        const y = 300 + i * 130;
        return (
          <div key={i} style={{position: 'absolute', left: 160, top: y, opacity: ease(f, 6 + i * 7, 18 + i * 7)}}>
            <div style={{fontFamily: SANS, fontSize: 30, fontWeight: 600, color: look.dim, marginBottom: 10}}>{it.label}</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
              <div style={{width: w, height: 46, borderRadius: 10, background: `linear-gradient(90deg, ${look.accent}, ${look.accent2})`,
                boxShadow: `0 0 30px ${look.accent}55`}} />
              <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 40, color: look.ink}}>
                {fmt(it.value * p, it.value % 1 ? 1 : 0)}{v.unit || ''}
              </div>
            </div>
          </div>
        );
      })}
      {v.source ? <div style={{position: 'absolute', left: 160, top: 320 + items.length * 130, fontFamily: MONO, fontSize: 20, color: look.dim, letterSpacing: 2}}>
        SOURCE: {v.source.toUpperCase()}</div> : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- newspaper (newspaper history reference)
const Newspaper: React.FC<P & {v: Extract<Visual, {type: 'newspaper'}>}> = ({v, look, seed, dur}) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [0, dur], [0, 1], {extrapolateRight: 'clamp'});
  const ink = '#1b1a17';
  const lines = (n: number, w: number) => Array.from({length: n}, (_, i) => (
    <div key={i} style={{height: 10, width: i === n - 1 ? w * 0.6 : w, background: '#00000022', margin: '0 0 12px', borderRadius: 2}} />
  ));
  return (
    <AbsoluteFill style={{background: '#0c0b09', perspective: 1800}}>
      <div style={{position: 'absolute', left: -120, top: -120, width: 2160, height: 1320, background: '#efe9dc',
        transform: `rotateX(${14 - 6 * t}deg) rotateZ(${-4 + 3 * t}deg) scale(${1.05 + 0.15 * t}) translateY(${-40 * t}px)`,
        boxShadow: 'inset 0 0 180px rgba(80,60,20,0.35)', padding: '230px 240px 120px', boxSizing: 'border-box'}}>
        <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 64, color: ink, textAlign: 'center', borderBottom: `4px double ${ink}`, paddingBottom: 10}}>
          THE TECH IMPACT REVIEW
        </div>
        <div style={{fontFamily: MONO, fontSize: 18, color: ink, display: 'flex', justifyContent: 'space-between', padding: '8px 0 24px'}}>
          <span>{(v.dateline || '').toUpperCase()}</span><span>T&amp;I NEWS · DOCUMENTARY EDITION</span>
        </div>
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 108, lineHeight: 1.02, color: ink, textTransform: 'uppercase',
          opacity: ease(f, 4, 16)}}>{v.headline}</div>
        {v.deck ? <div style={{fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 40, color: '#3b372f', margin: '18px 0 26px'}}>{v.deck}</div> : null}
        <div style={{display: 'flex', gap: 40}}>
          <div style={{width: 1040, height: 560, overflow: 'hidden', filter: 'grayscale(1) contrast(1.15)'}}>
            <MediaLayer media={v.media} look={{...look, grade: 'none', wash: undefined}} seed={seed} dur={dur} push={0.05} />
          </div>
          <div style={{flex: 1}}>{lines(16, 560)}</div>
        </div>
      </div>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.6) 100%)'}} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- timeline
const Timeline: React.FC<P & {v: Extract<Visual, {type: 'timeline'}>}> = ({v, look, seed, dur}) => {
  const f = useCurrentFrame();
  const items = v.items.slice(0, 5);
  const step = 520;
  const pan = interpolate(f, [10, dur - 10], [0, Math.max(0, (items.length - 3) * step)], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  return (
    <AbsoluteFill>
      <Abstract look={look} seed={seed} />
      <div style={{position: 'absolute', left: 0, top: 0, width: 4000, height: 1080, transform: `translateX(${-pan}px)`}}>
        <div style={{position: 'absolute', left: 120, top: 540, height: 3, width: 260 + items.length * step * ease(f, 0, 30), background: look.accent}} />
        {items.map((it, i) => {
          const x = 260 + i * step;
          const p = ease(f, 8 + i * 12, 22 + i * 12);
          return (
            <div key={i} style={{position: 'absolute', left: x, top: 0, opacity: p}}>
              <div style={{position: 'absolute', left: -14, top: 527, width: 28, height: 28, borderRadius: 14, background: look.bg, border: `4px solid ${look.accent}`}} />
              <div style={{position: 'absolute', left: -10, top: i % 2 ? 600 : 330, fontFamily: DISPLAY, fontWeight: 700, fontSize: 104, color: look.ink,
                transform: `translateY(${(1 - p) * 30}px)`}}>{it.year}</div>
              <div style={{position: 'absolute', left: -6, top: i % 2 ? 730 : 460 - 0, width: 430, fontFamily: SANS, fontSize: 30, lineHeight: 1.3,
                color: look.dim, transform: i % 2 ? 'none' : 'translateY(-100%)'}}>{it.text}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- quote
const Quote: React.FC<P & {v: Extract<Visual, {type: 'quote'}>}> = ({v, look, seed, dur}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <MediaLayer media={v.media} look={look} seed={seed} dur={dur} dark={0.62} />
      <div style={{position: 'absolute', left: 220, right: 220, top: 250, fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700,
        fontSize: v.text.length > 120 ? 58 : 72, lineHeight: 1.25, color: look.ink, textShadow: shadow, opacity: ease(f, 4, 22)}}>
        <span style={{color: look.accent, fontSize: 160, lineHeight: 0, verticalAlign: '-0.45em', marginRight: 10}}>“</span>{v.text}
      </div>
      <div style={{position: 'absolute', left: 220, bottom: 210, fontFamily: MONO, fontSize: 26, letterSpacing: 4, color: look.accent2,
        opacity: ease(f, 20, 34)}}>— {v.attribution.toUpperCase()}</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- split (tech show reference)
const Split: React.FC<P & {v: Extract<Visual, {type: 'split'}>}> = ({v, look, seed, dur}) => {
  const f = useCurrentFrame();
  const open = ease(f, 0, 14);
  const bullets = v.bullets.slice(0, 3);
  const per = Math.max(18, (dur - 30) / Math.max(1, bullets.length));
  return (
    <AbsoluteFill style={{background: look.bg}}>
      <div style={{position: 'absolute', left: 860 + (1 - open) * 300, top: 0, right: 0, bottom: 0, overflow: 'hidden'}}>
        <MediaLayer media={v.media} look={look} seed={seed} dur={dur} />
      </div>
      <div style={{position: 'absolute', left: 860 + (1 - open) * 300, top: 0, width: 6, height: 1080,
        background: `linear-gradient(180deg, transparent, ${look.accent2}, transparent)`, boxShadow: `0 0 40px ${look.accent2}`}} />
      <div style={{position: 'absolute', left: 120, top: 220, width: 660}}>
        <div style={{fontFamily: look.headlineFont, fontWeight: 800, fontSize: 70, lineHeight: 1.05, color: look.ink, textTransform: 'uppercase',
          opacity: ease(f, 4, 16)}}>{v.heading}</div>
        <div style={{width: 110 * ease(f, 10, 24), height: 4, background: look.accent, margin: '30px 0 40px'}} />
        {bullets.map((b, i) => {
          const p = ease(f, 18 + i * per, 30 + i * per);
          return (
            <div key={i} style={{display: 'flex', gap: 20, marginBottom: 30, opacity: p, transform: `translateX(${(1 - p) * -30}px)`}}>
              <div style={{fontFamily: MONO, fontSize: 26, color: look.accent, paddingTop: 4}}>0{i + 1}</div>
              <div style={{fontFamily: SANS, fontSize: 34, lineHeight: 1.3, color: look.ink}}>{b}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- cards (shifting screens reference)
const Cards: React.FC<P & {v: Extract<Visual, {type: 'cards'}>}> = ({v, look, dur}) => {
  const f = useCurrentFrame();
  const items = v.items.slice(0, 4);
  const n = items.length;
  const cw = n > 3 ? 380 : 460, gap = 50;
  const rot = interpolate(f, [0, dur], [16, -12]);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, ${look.panel} 0%, ${look.bg} 75%)`, perspective: 2000}}>
      {v.heading ? <div style={{position: 'absolute', top: 150, width: '100%', textAlign: 'center', fontFamily: look.headlineFont, fontWeight: 700, fontSize: 56,
        color: look.ink, textTransform: 'uppercase', letterSpacing: 2, opacity: ease(f, 0, 12)}}>{v.heading}</div> : null}
      <div style={{position: 'absolute', left: 0, right: 0, top: 300, height: 560, display: 'flex', justifyContent: 'center', gap,
        transformStyle: 'preserve-3d', transform: `rotateY(${rot}deg)`}}>
        {items.map((it, i) => {
          const p = ease(f, 6 + i * 9, 22 + i * 9);
          const hi = i % 2 === 0;
          return (
            <div key={i} style={{width: cw, height: 520, borderRadius: 28, flexShrink: 0,
              background: hi ? `linear-gradient(160deg, ${look.accent}, ${look.accent2})` : look.panel, border: `1px solid ${look.ink}26`,
              opacity: p, transform: `translateY(${(1 - p) * 80 + (i % 2 ? 30 : -30)}px) translateZ(${(i % 2 ? -60 : 40)}px)`,
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 40, boxSizing: 'border-box',
              boxShadow: '0 30px 80px rgba(0,0,0,0.45)'}}>
              <div style={{fontFamily: MONO, fontSize: 22, letterSpacing: 4, color: hi ? '#0b0b10' : look.accent2, marginBottom: 16}}>0{i + 1}</div>
              <div style={{fontFamily: SANS, fontWeight: 800, fontSize: it.length > 22 ? 40 : 52, lineHeight: 1.1, color: hi ? '#0b0b10' : look.ink}}>{it}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- filmstrip (vintage documentary reference)
const Filmstrip: React.FC<P & {v: Extract<Visual, {type: 'filmstrip'}>}> = ({v, look, seed, dur}) => {
  const f = useCurrentFrame();
  const m = (v.medias || []).slice(0, 4);
  const frames = Math.max(3, m.length);
  const fw = 720, gap = 40;
  const x = interpolate(f, [0, dur], [80, -((frames * (fw + gap)) - 1920 + 80)]);
  const holes = Array.from({length: 40}, (_, i) => i);
  return (
    <AbsoluteFill style={{background: '#050505'}}>
      <div style={{position: 'absolute', top: 150, left: x, height: 780, width: frames * (fw + gap) + 200, background: '#0d0d0d'}}>
        {[0, 1].map((row) => (
          <div key={row} style={{position: 'absolute', left: 0, right: 0, top: row ? 742 : 12, display: 'flex', gap: 40}}>
            {holes.map((h) => <div key={h} style={{width: 34, height: 24, borderRadius: 5, background: '#2a2a2a'}} />)}
          </div>
        ))}
        {Array.from({length: frames}, (_, i) => (
          <div key={i} style={{position: 'absolute', left: 40 + i * (fw + gap), top: 70, width: fw, height: 640, overflow: 'hidden',
            filter: 'grayscale(1) contrast(1.2)'}}>
            <MediaLayer media={m[i]} look={{...look, wash: undefined}} seed={seed + i * 3} dur={dur} push={0.06} />
            <div style={{position: 'absolute', left: 12, top: 10, fontFamily: MONO, fontSize: 16, color: '#ffd166', opacity: 0.8}}>{12 + i}A</div>
          </div>
        ))}
      </div>
      {v.caption ? (
        <div style={{position: 'absolute', bottom: 70, width: '100%', textAlign: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: 64,
          color: '#fff', textTransform: 'uppercase', letterSpacing: 3, opacity: ease(f, 10, 24)}}>{v.caption}</div>
      ) : null}
    </AbsoluteFill>
  );
};

export const VisualScene: React.FC<P & {v: Visual; region: string}> = ({v, look, seed, dur, region, ltDelay}) => {
  switch (v.type) {
    case 'footage': return <Footage v={v} look={look} seed={seed} dur={dur} ltDelay={ltDelay} />;
    case 'photo3d': return <Photo3D v={v} look={look} seed={seed} dur={dur} ltDelay={ltDelay} />;
    case 'multiframe': return <Multiframe v={v} look={look} seed={seed} dur={dur} />;
    case 'stat': return <Stat v={v} look={look} seed={seed} dur={dur} />;
    case 'bars': return <Bars v={v} look={look} seed={seed} dur={dur} />;
    case 'map': return <WorldMap look={look} region={v.region || region} label={v.label} points={v.points} dur={dur} />;
    case 'newspaper': return <Newspaper v={v} look={look} seed={seed} dur={dur} />;
    case 'timeline': return <Timeline v={v} look={look} seed={seed} dur={dur} />;
    case 'quote': return <Quote v={v} look={look} seed={seed} dur={dur} />;
    case 'split': return <Split v={v} look={look} seed={seed} dur={dur} />;
    case 'cards': return <Cards v={v} look={look} seed={seed} dur={dur} />;
    case 'filmstrip': return <Filmstrip v={v} look={look} seed={seed} dur={dur} />;
    default: return <Abstract look={look} seed={seed} />;
  }
};

export type {Media};
