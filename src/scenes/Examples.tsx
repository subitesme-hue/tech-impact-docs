import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import type {Visual} from '../types';
import {DISPLAY, Look, MONO, SANS, rand} from '../theme';
import {MediaLayer, ease} from '../components/Layers';

type P = {look: Look; seed: number; dur: number};

// Soft moving gradient backdrop (the "product demo on a gradient" look from the Claude explainer reference).
export const Gradient: React.FC<{look: Look; seed: number}> = ({look, seed}) => {
  const f = useCurrentFrame();
  const a = 30 + 20 * Math.sin(f / 90 + seed), b = 70 + 15 * Math.cos(f / 110 + seed);
  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at ${a}% ${b}%, ${look.accent}cc 0%, transparent 55%),
      radial-gradient(circle at ${100 - a}% ${100 - b}%, ${look.accent2}99 0%, transparent 50%), ${look.bg}`}} />
  );
};

const typed = (text: string, f: number, start: number, cps = 1.6) => {
  const n = Math.max(0, Math.floor((f - start) * cps));
  return text.slice(0, n);
};

// ---------------------------------------------------------------- example UI window
export const UiExample: React.FC<P & {v: Extract<Visual, {type: 'ui'}>}> = ({v, look, seed, dur}) => {
  const f = useCurrentFrame();
  const lines = (v.lines || []).slice(0, 4);
  const per = Math.max(20, (dur - 30) / Math.max(1, lines.length));
  const pop = ease(f, 0, 16);
  const tilt = interpolate(f, [0, dur], [-4, 3]);
  const glass: React.CSSProperties = {background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)',
    backdropFilter: 'blur(18px)', borderRadius: 28, boxShadow: '0 40px 120px rgba(0,0,0,0.45)'};
  const chrome = (
    <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '18px 26px', borderBottom: '1px solid rgba(255,255,255,0.14)'}}>
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />)}
      <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 24, color: '#fff', marginLeft: 16, opacity: 0.9}}>{v.app}</div>
      <div style={{marginLeft: 'auto', fontFamily: MONO, fontSize: 16, letterSpacing: 3, color: '#0b0b10', background: look.accent2,
        padding: '5px 12px', borderRadius: 20}}>EXAMPLE</div>
    </div>
  );

  let body: React.ReactNode = null;
  if (v.variant === 'chat') {
    body = (
      <div style={{padding: '30px 40px', display: 'flex', flexDirection: 'column', gap: 22}}>
        {lines.map((l, i) => {
          const start = 14 + i * per;
          if (f < start) return null;
          const me = i % 2 === 0;
          return (
            <div key={i} style={{alignSelf: me ? 'flex-end' : 'flex-start', maxWidth: '78%', padding: '18px 24px', borderRadius: 22,
              background: me ? look.accent : 'rgba(255,255,255,0.16)', color: me ? '#0b0b10' : '#fff', fontFamily: SANS, fontSize: 30,
              lineHeight: 1.35, fontWeight: me ? 600 : 400}}>{typed(l, f, start)}</div>
          );
        })}
      </div>
    );
  } else if (v.variant === 'dashboard') {
    const kp = (v.kpis || []).slice(0, 3);
    body = (
      <div style={{padding: '30px 40px'}}>
        <div style={{display: 'flex', gap: 22}}>
          {kp.map((k, i) => (
            <div key={i} style={{flex: 1, padding: '22px 26px', borderRadius: 20, background: 'rgba(255,255,255,0.12)', opacity: ease(f, 10 + i * 8, 24 + i * 8)}}>
              <div style={{fontFamily: SANS, fontSize: 22, color: 'rgba(255,255,255,0.75)'}}>{k.label}</div>
              <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 52, color: '#fff', marginTop: 6}}>{k.value}</div>
            </div>
          ))}
        </div>
        <svg width={1220} height={150} style={{marginTop: 26}}>
          <polyline fill="none" stroke={look.accent2} strokeWidth={5} strokeLinecap="round"
            points={Array.from({length: 24}, (_, i) => `${i * 53},${120 - (i * 3 + 40 * rand(seed + i)) * ease(f, 14, 50)}`).join(' ')} />
        </svg>
        {lines.map((l, i) => (
          <div key={i} style={{fontFamily: SANS, fontSize: 26, color: '#fff', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.12)',
            opacity: ease(f, 30 + i * per * 0.6, 42 + i * per * 0.6)}}>• {l}</div>
        ))}
      </div>
    );
  } else if (v.variant === 'notify') {
    return (
      <AbsoluteFill>
        <Gradient look={look} seed={seed} />
        <div style={{position: 'absolute', left: 960 - 230, top: 90 + (1 - pop) * 80, width: 460, height: 920, borderRadius: 64, background: '#0d0d12',
          border: '10px solid #1d1d24', boxShadow: '0 50px 140px rgba(0,0,0,0.55)', overflow: 'hidden', transform: `rotate(${tilt * 0.4}deg)`}}>
          <div style={{textAlign: 'center', fontFamily: SANS, fontWeight: 600, fontSize: 96, color: '#fff', marginTop: 90}}>09:41</div>
          <div style={{textAlign: 'center', fontFamily: MONO, fontSize: 16, letterSpacing: 3, color: look.accent2, marginTop: 8}}>EXAMPLE</div>
          {lines.map((l, i) => {
            const p = ease(f, 18 + i * per, 30 + i * per);
            return (
              <div key={i} style={{margin: '20px 22px 0', padding: '18px 20px', borderRadius: 24, background: 'rgba(255,255,255,0.14)', opacity: p,
                transform: `translateY(${(1 - p) * -30}px)`}}>
                <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 18, color: look.accent2}}>{v.app}</div>
                <div style={{fontFamily: SANS, fontSize: 22, color: '#fff', lineHeight: 1.3, marginTop: 4}}>{l}</div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  } else {
    // list / checklist (the "set instructions" glass panel reference)
    body = (
      <div style={{padding: '34px 44px'}}>
        {lines.map((l, i) => {
          const start = 14 + i * per;
          const done = f > start + l.length / 1.6 + 6;
          return (
            <div key={i} style={{display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 26, opacity: f >= start ? 1 : 0}}>
              <div style={{width: 30, height: 30, borderRadius: 15, marginTop: 6, flexShrink: 0, border: '3px solid #fff', background: done ? look.accent2 : 'transparent'}} />
              <div style={{fontFamily: SANS, fontSize: 34, lineHeight: 1.35, color: '#fff'}}>{typed(l, f, start)}</div>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <AbsoluteFill style={{perspective: 2200}}>
      <Gradient look={look} seed={seed} />
      <div style={{position: 'absolute', left: 300, top: '50%', width: 1320, minHeight: 360, ...glass, opacity: pop, marginTop: -260,
        transform: `translateY(${(1 - pop) * 60}px) rotateX(${4 - 4 * pop}deg) rotateY(${tilt}deg)`}}>
        {chrome}
        {body}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- laptop / phone mockup with real footage
export const Device: React.FC<P & {v: Extract<Visual, {type: 'device'}>}> = ({v, look, seed, dur}) => {
  const f = useCurrentFrame();
  const p = ease(f, 0, 18);
  const rot = interpolate(f, [0, dur], [-14, 10], {easing: Easing.inOut(Easing.sin)});
  const float = Math.sin(f / 30) * 8;
  if (v.kind === 'phone') {
    return (
      <AbsoluteFill style={{perspective: 2000}}>
        <Gradient look={look} seed={seed} />
        <div style={{position: 'absolute', left: 960 - 250, top: 70 + float, width: 500, height: 940, borderRadius: 70, background: '#0d0d12',
          border: '12px solid #22222a', overflow: 'hidden', opacity: p, transform: `rotateY(${rot}deg) translateY(${(1 - p) * 80}px)`,
          boxShadow: '0 60px 160px rgba(0,0,0,0.55)'}}>
          <MediaLayer media={v.media} look={look} seed={seed} dur={dur} push={0.08} />
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{perspective: 2400}}>
      <Gradient look={look} seed={seed} />
      <div style={{position: 'absolute', left: 260, top: 130 + float, width: 1400, transformStyle: 'preserve-3d', opacity: p,
        transform: `rotateY(${rot}deg) rotateX(6deg) translateY(${(1 - p) * 80}px)`}}>
        <div style={{width: 1400, height: 800, borderRadius: 30, background: '#111117', padding: 22, boxSizing: 'border-box',
          boxShadow: '0 60px 160px rgba(0,0,0,0.5)'}}>
          <div style={{width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden', position: 'relative'}}>
            <MediaLayer media={v.media} look={look} seed={seed} dur={dur} push={0.06} />
          </div>
        </div>
        <div style={{width: 1560, marginLeft: -80, height: 34, borderRadius: '0 0 30px 30px', background: 'linear-gradient(180deg, #3a3a44, #1a1a20)'}} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- "In this episode" agenda board (podcast-style intro)
export const Agenda: React.FC<P & {items: string[]; title?: string; tech?: string}> = ({items, look, seed, dur, title, tech}) => {
  const f = useCurrentFrame();
  const list = items.slice(0, 6);
  const per = Math.max(10, (dur - 24) / Math.max(1, list.length));
  const active = Math.min(list.length - 1, Math.floor((f - 14) / per));
  return (
    <AbsoluteFill>
      <Gradient look={look} seed={seed} />
      <AbsoluteFill style={{background: 'rgba(0,0,0,0.35)'}} />
      <div style={{position: 'absolute', left: 130, top: 170, width: 640}}>
        <div style={{fontFamily: MONO, fontSize: 24, letterSpacing: 6, color: look.accent2, opacity: ease(f, 0, 10)}}>IN THIS EPISODE</div>
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 92, lineHeight: 1.0, color: '#fff', textTransform: 'uppercase', marginTop: 24,
          opacity: ease(f, 4, 18)}}>{tech || title}</div>
        <div style={{width: 140 * ease(f, 10, 30), height: 5, background: look.accent, marginTop: 34}} />
      </div>
      <div style={{position: 'absolute', left: 930, top: 150, width: 860}}>
        {list.map((it, i) => {
          const p = ease(f, 14 + i * per, 24 + i * per);
          const on = i === active;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 26, padding: '20px 30px', marginBottom: 16, borderRadius: 22,
              background: on ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)', border: `1px solid ${on ? look.accent2 : 'rgba(255,255,255,0.12)'}`,
              opacity: 0.25 + 0.75 * p, transform: `translateX(${(1 - p) * 40}px) scale(${on ? 1.02 : 1})`}}>
              <div style={{fontFamily: MONO, fontSize: 26, color: on ? look.accent2 : 'rgba(255,255,255,0.6)'}}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{fontFamily: SANS, fontWeight: 700, fontSize: 36, color: '#fff'}}>{it}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
