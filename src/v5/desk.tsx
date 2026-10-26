// LIVE DESK — shared look, helpers and the animation library.
// One continuous newsroom map sits under the whole film; every idea arrives as a broadcast graphic
// (rundown rows, split-flap boards, lower thirds, video walls, market boards, hemicycles...). Each renderer below is a
// different animation; the engine never uses one twice in a film.
import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, Easing} from 'remotion';
import * as Lucide from 'lucide-react';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/ibm-plex-mono/500.css';
import type {DocProps} from '../types';

export const HEAD = "'Barlow Condensed', 'Oswald', sans-serif";
export const PLEX = "'IBM Plex Mono', monospace";

export type DPal = {bg: string; land: string; landHi: string; edge: string; ink: string; dim: string; red: string; amber: string; panel: string; line: string; good: string};
export const DESK_SETS: DPal[] = [
  {bg: '#07101F', land: '#122036', landHi: '#1D3A63', edge: '#2A4670', ink: '#F3F6FB', dim: '#8EA2BF', red: '#E8322D', amber: '#FFB31F', panel: 'rgba(8,17,33,0.9)', line: 'rgba(255,255,255,0.14)', good: '#3DDC97'},
  {bg: '#0D0D10', land: '#1B1C21', landHi: '#3B2A14', edge: '#3A3B42', ink: '#F5F3EE', dim: '#A19D94', red: '#E23B2E', amber: '#F6C343', panel: 'rgba(16,16,20,0.9)', line: 'rgba(255,255,255,0.13)', good: '#53D18B'},
];

export type DC = {f: number; dur: number; fps: number; s: any; p: DocProps; pal: DPal; idx: number; toScreen: (lat: number, lon: number) => [number, number]; home: {lat: number; lon: number}};
export type DR = (c: DC) => React.ReactNode;

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
export const eio = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
export const spr = (f: number, fps: number, d = 0, stiff = 140, damp = 15) => spring({frame: f - d, fps, config: {stiffness: stiff, damping: damp, mass: 0.9}});
export const fmt = (n: number, d = 0) => n.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
const decOf = (s: any) => s.decimals ?? (Math.abs(s.value) < 10 && s.value % 1 ? 1 : 0);
export const numTxt = (s: any, v = s.value) => `${s.prefix || ''}${fmt(v, decOf(s))}${s.suffix || ''}`;
const unitTxt = (s: any) => (s.unit && /^[a-z]{2,}/i.test(s.unit) ? ' ' + s.unit : s.unit || '');
const valTxt = (s: any, v: number) => (/^k$/i.test(String(s.unit || '').trim()) && v >= 1000 ? `${s.prefix || ''}${fmt(v / 1000, v % 1000 ? 1 : 0)}M` : `${s.prefix || ''}${fmt(v, v % 1 ? 1 : 0)}${unitTxt(s)}`);

export const Ico: React.FC<{name?: string; size: number; color: string; stroke?: number}> = ({name, size, color, stroke = 2}) => {
  const C = ((name && (Lucide as any)[name]) || (Lucide as any).Circle) as React.FC<any>;
  return <C size={size} color={color} strokeWidth={stroke} />;
};
export const Cap: React.FC<{children: React.ReactNode; size?: number; color: string; style?: React.CSSProperties}> = ({children, size = 22, color, style}) =>
  <div style={{fontFamily: PLEX, fontWeight: 500, fontSize: size, letterSpacing: size * 0.12, textTransform: 'uppercase', color, ...style}}>{children}</div>;
export const H: React.FC<{children: React.ReactNode; size: number; color: string; style?: React.CSSProperties}> = ({children, size, color, style}) =>
  <div style={{fontFamily: HEAD, fontWeight: 800, fontSize: size, lineHeight: 0.95, letterSpacing: '0.005em', textTransform: 'uppercase', color, ...style}}>{children}</div>;
export const Panel: React.FC<{x: number; y: number; w: number; h?: number; pal: DPal; tab?: string; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y, w, h, pal, tab, children, style}) =>
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: pal.panel, borderTop: `6px solid ${pal.red}`, boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
    backdropFilter: 'blur(6px)', ...style}}>
    {tab ? <div style={{position: 'absolute', left: 0, top: -50, background: pal.red, padding: '8px 18px 6px'}}><Cap size={20} color="#fff">{tab}</Cap></div> : null}
    {children}
  </div>;

const listOf = (s: any) => ((s.items || s.nodes || []) as any[]).map((it) => ({icon: it.icon, label: it.label || it.text || ''})).slice(0, 5);
const titleOf = (s: any) => s.title || s.label || s.center?.label || '';
const MediaFill: React.FC<{m: any; style?: React.CSSProperties; zoom?: number}> = ({m, style, zoom = 1}) => m.kind === 'video'
  ? <OffthreadVideo src={staticFile(m.src)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, ...style}} />
  : <Img src={staticFile(m.src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, ...style}} />;
const placeOf = (c: DC) => c.s.label || c.p.region;

// ========================= LISTS (icons / steps / flow / network) =========================
// 1. TV rundown table: rows slide in from the right, a red cursor walks down them
const rundown: DR = (c) => {
  const its = listOf(c.s); const per = Math.max(6, (c.dur - 12) / its.length);
  const cur = Math.min(its.length - 1, Math.floor(Math.max(0, c.f - 6) / per));
  return <Panel x={120} y={230} w={960} pal={c.pal} tab={titleOf(c.s) || 'Rundown'}>
    {its.map((it, i) => { const a = ease(c.f, 4 + i * 4, 16 + i * 4); const on = i === cur;
      return <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, height: 108, padding: '0 34px', borderBottom: `1px solid ${c.pal.line}`,
        background: on ? `${c.pal.red}2a` : 'transparent', transform: `translateX(${(1 - a) * 300}px)`, opacity: a, position: 'relative'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: on ? 8 : 0, background: c.pal.red}} />
        <Cap size={24} color={on ? c.pal.amber : c.pal.dim}>{String(i + 1).padStart(2, '0')}</Cap>
        <Ico name={it.icon} size={46} color={on ? c.pal.ink : c.pal.dim} />
        <H size={54} color={on ? c.pal.ink : c.pal.dim}>{it.label}</H>
      </div>; })}
  </Panel>;
};
// 2. lower thirds: each point arrives as a broadcast strap; earlier straps shrink and stack above it
const lowerThirds: DR = (c) => {
  const its = listOf(c.s); const per = Math.max(8, (c.dur - 10) / its.length);
  const n = Math.min(its.length, 1 + Math.floor(Math.max(0, c.f - 4) / per));
  return <>
    {titleOf(c.s) ? <div style={{position: 'absolute', left: 120, top: 150}}><Cap size={26} color={c.pal.amber}>● {titleOf(c.s)}</Cap></div> : null}
    {its.slice(0, n).map((it, i) => { const age = n - 1 - i; const a = spr(c.f, c.fps, 4 + i * per, 170, 16);
      const y = 700 - age * 130;
      return <div key={i} style={{position: 'absolute', left: 120, top: y, display: 'flex', alignItems: 'stretch', transform: `translateX(${(1 - a) * -900}px) scale(${age ? 0.8 : 1})`,
        transformOrigin: 'left center', opacity: age ? 0.55 : 1}}>
        <div style={{background: c.pal.red, width: 110, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Ico name={it.icon} size={56} color="#fff" /></div>
        <div style={{background: '#fff', padding: '18px 40px 14px'}}><H size={64} color="#0b0f17">{it.label}</H></div>
      </div>; })}
  </>;
};
// 3. video wall: each point switches on in its own monitor, CRT-style (a thin line opens to a picture)
const videoWall: DR = (c) => {
  const its = listOf(c.s).slice(0, 4); const cols = its.length <= 2 ? its.length : 2; const W = cols === 1 ? 800 : 560, Hh = 300;
  return <>
    {titleOf(c.s) ? <H size={60} color={c.pal.ink} style={{position: 'absolute', left: 120, top: 120, opacity: ease(c.f, 0, 10)}}>{titleOf(c.s)}</H> : null}
    {its.map((it, i) => { const x = 120 + (i % cols) * (W + 26), y = 240 + Math.floor(i / cols) * (Hh + 26); const on = ease(c.f, 6 + i * 7, 14 + i * 7);
      return <div key={i} style={{position: 'absolute', left: x, top: y, width: W, height: Hh, background: '#02050a', border: `10px solid #1a1d24`, borderRadius: 8, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, transform: `scaleY(${Math.max(0.01, on)})`, background: `linear-gradient(160deg, ${c.pal.landHi}, ${c.pal.bg})`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, filter: `brightness(${1 + (1 - on) * 3})`}}>
          <Ico name={it.icon} size={84} color={c.pal.amber} />
          <H size={46} color={c.pal.ink} style={{textAlign: 'center', padding: '0 20px'}}>{it.label}</H>
        </div>
        <div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 2px, transparent 2px 5px)'}} />
        <Cap size={16} color={c.pal.dim} style={{position: 'absolute', left: 14, top: 10}}>CAM {i + 1}</Cap>
      </div>; })}
  </>;
};
// 4. map pins: the points are pinned round the story's location on the newsroom map
const mapPins: DR = (c) => {
  const its = listOf(c.s); const [hx, hy] = c.toScreen(c.home.lat, c.home.lon);
  const ang = (i: number) => -Math.PI / 2 + (i / its.length) * Math.PI * 2;
  return <>
    {titleOf(c.s) ? <Panel x={120} y={190} w={560} pal={c.pal} tab="On the map"><H size={60} color={c.pal.ink} style={{padding: '26px 30px'}}>{titleOf(c.s)}</H></Panel> : null}
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {its.map((_, i) => { const q = ease(c.f, 6 + i * 6, 18 + i * 6); const x = hx + Math.cos(ang(i)) * 330, y = hy + Math.sin(ang(i)) * 250;
        return <line key={i} x1={hx} y1={hy} x2={hx + (x - hx) * q} y2={hy + (y - hy) * q} stroke={c.pal.amber} strokeWidth={2.5} strokeDasharray="6 8" />; })}
      <circle cx={hx} cy={hy} r={16} fill={c.pal.red} /><circle cx={hx} cy={hy} r={16 + 30 * ((c.f % 40) / 40)} fill="none" stroke={c.pal.red} strokeWidth={3} opacity={1 - (c.f % 40) / 40} />
    </svg>
    {its.map((it, i) => { const q = spr(c.f, c.fps, 14 + i * 6, 180, 14); const x = hx + Math.cos(ang(i)) * 330, y = hy + Math.sin(ang(i)) * 250;
      return <div key={i} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${q})`, display: 'flex', alignItems: 'center', gap: 12,
        background: c.pal.panel, border: `2px solid ${c.pal.amber}`, padding: '10px 18px', whiteSpace: 'nowrap'}}>
        <Ico name={it.icon} size={34} color={c.pal.amber} /><H size={36} color={c.pal.ink}>{it.label}</H></div>; })}
  </>;
};
// 5. pipeline: a glowing packet travels a pipe and each stage badge lights as it passes
const pipeline: DR = (c) => {
  const its = listOf(c.s).slice(0, 5); const n = its.length; const X = (i: number) => 220 + (i * 1480) / Math.max(1, n - 1);
  const t = eio(c.f, 8, Math.max(20, c.dur - 10)) * (n - 1); const px = 220 + (t * 1480) / Math.max(1, n - 1);
  return <>
    {titleOf(c.s) ? <H size={64} color={c.pal.ink} style={{position: 'absolute', left: 120, top: 190}}>{titleOf(c.s)}</H> : null}
    <div style={{position: 'absolute', left: 220, top: 556, width: 1480 * ease(c.f, 0, 12), height: 12, background: c.pal.line, borderRadius: 6}} />
    <div style={{position: 'absolute', left: 220, top: 556, width: px - 220, height: 12, background: c.pal.amber, borderRadius: 6, boxShadow: `0 0 30px ${c.pal.amber}`}} />
    {its.map((it, i) => { const lit = t >= i - 0.05; const q = spr(c.f, c.fps, 2 + i * 3, 160, 14);
      return <div key={i} style={{position: 'absolute', left: X(i), top: 562, transform: `translate(-50%,-50%) scale(${q})`, textAlign: 'center'}}>
        <div style={{width: 150, height: 130, clipPath: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)', background: lit ? c.pal.amber : c.pal.land,
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'}}><Ico name={it.icon} size={56} color={lit ? '#111' : c.pal.dim} /></div>
        <H size={38} color={lit ? c.pal.ink : c.pal.dim} style={{marginTop: 18, width: 300, marginLeft: -75}}>{it.label}</H></div>; })}
    <div style={{position: 'absolute', left: px, top: 562, width: 40, height: 40, borderRadius: 20, background: '#fff', transform: 'translate(-50%,-50%)', boxShadow: `0 0 40px ${c.pal.amber}`}} />
  </>;
};
// 6. bulletin: a printed wire bulletin; each line is typed out in mono with a red bullet
const bulletin: DR = (c) => {
  const its = listOf(c.s); const per = Math.max(8, (c.dur - 10) / its.length);
  return <Panel x={120} y={220} w={1100} pal={c.pal} tab="Wire bulletin" style={{padding: '40px 50px', background: '#F1EEE6', borderTop: `10px solid ${c.pal.red}`}}>
    {titleOf(c.s) ? <H size={70} color="#111" style={{marginBottom: 26}}>{titleOf(c.s)}</H> : null}
    {its.map((it, i) => { const k = Math.round(it.label.length * ease(c.f, 4 + i * per, 4 + i * per + Math.min(per * 0.7, 18)));
      return <div key={i} style={{display: 'flex', gap: 22, alignItems: 'center', minHeight: 70, opacity: c.f >= 4 + i * per ? 1 : 0}}>
        <div style={{width: 16, height: 16, background: c.pal.red}} />
        <div style={{fontFamily: PLEX, fontSize: 40, color: '#111'}}>{it.label.slice(0, k)}{k < it.label.length ? '▌' : ''}</div></div>; })}
  </Panel>;
};
// 7. split-flap board: every point clacks into place letter by letter, like a departures board
const FLAP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const flapTxt = (txt: string, f: number, start: number) => txt.toUpperCase().split('').map((ch, j) => {
  const settle = start + 4 + j * 1.2; if (f >= settle || ch === ' ') return ch;
  return f < start ? ' ' : FLAP[(Math.floor(f * 1.7) + j * 7) % FLAP.length];
}).join('');
const splitFlap: DR = (c) => {
  const its = listOf(c.s).slice(0, 5); const per = Math.max(6, Math.min(16, (c.dur - 20) / its.length));
  return <Panel x={120} y={220} w={1300} pal={c.pal} tab={titleOf(c.s) || 'The board'} style={{background: '#0a0a0c', padding: '30px 34px'}}>
    {its.map((it, i) => <div key={i} style={{display: 'flex', alignItems: 'center', gap: 20, height: 110, borderBottom: '2px solid #222'}}>
      <Ico name={it.icon} size={50} color={c.pal.amber} />
      <div style={{display: 'flex', gap: 5}}>{flapTxt(it.label.slice(0, 22), c.f, 4 + i * per).split('').map((ch, j) =>
        <div key={j} style={{width: 44, height: 74, background: '#1b1b1f', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          fontFamily: PLEX, fontSize: 46, color: c.pal.amber}}>{ch}<div style={{position: 'absolute', left: 0, right: 0, top: 36, height: 2, background: '#000'}} /></div>)}</div>
    </div>)}
  </Panel>;
};
// 8. card deck: points arrive as cards dealt onto a tilted desk, each landing on top of the last
const stackCards: DR = (c) => {
  const its = listOf(c.s).slice(0, 5); const per = Math.max(8, (c.dur - 10) / its.length);
  return <>
    {titleOf(c.s) ? <H size={64} color={c.pal.ink} style={{position: 'absolute', left: 120, top: 150}}>{titleOf(c.s)}</H> : null}
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, perspective: 1600}}>
      {its.map((it, i) => { const a = spr(c.f, c.fps, 4 + i * per, 120, 15);
        const gap = Math.min(470, 1380 / its.length);
        return <div key={i} style={{position: 'absolute', left: 200 + i * gap, top: 330 + i * 40, width: Math.min(440, gap + 120), height: 330, background: i % 2 ? c.pal.landHi : '#fff',
          transform: `rotateX(22deg) rotateZ(${-3 + i * 1.5}deg) translateY(${(1 - a) * -700}px)`, boxShadow: '0 40px 70px rgba(0,0,0,0.45)', padding: 40, borderLeft: `14px solid ${c.pal.red}`}}>
          <Ico name={it.icon} size={70} color={i % 2 ? c.pal.amber : c.pal.red} />
          <H size={56} color={i % 2 ? c.pal.ink : '#0b0f17'} style={{marginTop: 26}}>{it.label}</H></div>; })}
    </div>
  </>;
};
// 9. ladder: rungs build upward and a marker climbs to each stage in turn
const ladder: DR = (c) => {
  const its = listOf(c.s).slice(0, 5); const n = its.length; const per = Math.max(8, (c.dur - 12) / n);
  const step = Math.min(n - 1, Math.floor(Math.max(0, c.f - 6) / per)); const y = (i: number) => 860 - i * (600 / Math.max(1, n - 1 || 1));
  const my = interpolate(c.f, [6 + step * per, 14 + step * per], [y(Math.max(0, step - 1)), y(step)], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  return <>
    <div style={{position: 'absolute', left: 300, top: y(n - 1) - 30, width: 10, height: 600 + 60, background: c.pal.edge}} />
    <div style={{position: 'absolute', left: 470, top: y(n - 1) - 30, width: 10, height: 600 + 60, background: c.pal.edge}} />
    {its.map((it, i) => { const q = ease(c.f, 2 + i * 3, 10 + i * 3); const on = i <= step;
      return <React.Fragment key={i}>
        <div style={{position: 'absolute', left: 300, top: y(i), width: 180 * q, height: 10, background: on ? c.pal.amber : c.pal.edge}} />
        <div style={{position: 'absolute', left: 540, top: y(i) - 34, display: 'flex', alignItems: 'center', gap: 20, opacity: 0.35 + 0.65 * (on ? 1 : 0)}}>
          <Ico name={it.icon} size={52} color={on ? c.pal.amber : c.pal.dim} /><H size={58} color={c.pal.ink}>{it.label}</H></div>
      </React.Fragment>; })}
    <div style={{position: 'absolute', left: 385, top: my, width: 50, height: 50, borderRadius: 25, background: c.pal.red, transform: 'translate(-50%,-50%)', boxShadow: `0 0 30px ${c.pal.red}`}} />
    {titleOf(c.s) ? <Cap size={26} color={c.pal.amber} style={{position: 'absolute', left: 300, top: 130}}>{titleOf(c.s)}</Cap> : null}
  </>;
};
// 10. org chart: the hub sits on top and its parts drop into a tree with right-angled connectors
const orgChart: DR = (c) => {
  const its = listOf(c.s).slice(0, 5); const n = its.length; const X = (i: number) => 960 - ((n - 1) * 330) / 2 + i * 330;
  const ctr = c.s.center || {label: titleOf(c.s), icon: 'Building2'};
  return <>
    <div style={{position: 'absolute', left: 960, top: 200, transform: `translateX(-50%) scale(${spr(c.f, c.fps, 0)})`, background: c.pal.red, padding: '22px 40px', display: 'flex', gap: 18, alignItems: 'center'}}>
      <Ico name={ctr.icon} size={56} color="#fff" /><H size={58} color="#fff">{ctr.label}</H></div>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <line x1={960} y1={310} x2={960} y2={310 + 80 * ease(c.f, 4, 10)} stroke={c.pal.ink} strokeWidth={4} />
      <line x1={960 - (960 - X(0)) * ease(c.f, 8, 16)} y1={390} x2={960 + (X(n - 1) - 960) * ease(c.f, 8, 16)} y2={390} stroke={c.pal.ink} strokeWidth={4} />
      {its.map((_, i) => <line key={i} x1={X(i)} y1={390} x2={X(i)} y2={390 + 80 * ease(c.f, 14 + i * 3, 20 + i * 3)} stroke={c.pal.ink} strokeWidth={4} />)}
    </svg>
    {its.map((it, i) => <div key={i} style={{position: 'absolute', left: X(i), top: 480, transform: `translateX(-50%) translateY(${(1 - ease(c.f, 18 + i * 3, 28 + i * 3)) * 40}px)`,
      opacity: ease(c.f, 18 + i * 3, 28 + i * 3), width: 300, background: c.pal.panel, borderTop: `5px solid ${c.pal.amber}`, padding: '24px 18px', textAlign: 'center'}}>
      <Ico name={it.icon} size={56} color={c.pal.amber} /><H size={38} color={c.pal.ink} style={{marginTop: 14}}>{it.label}</H></div>)}
  </>;
};
// 11. constellation: parts appear as stars over the map and are joined one by one into a figure
const constellation: DR = (c) => {
  const its = listOf(c.s).slice(0, 6); const n = its.length;
  const P = its.map((_, i) => [700 + 900 * (0.15 + 0.7 * ((i * 0.618) % 1)), 260 + 560 * (0.1 + 0.8 * ((i * 0.382 + 0.2) % 1))]);
  const ctr = c.s.center;
  return <>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {P.map((p, i) => { const q = P[(i + 1) % n]; const a = ease(c.f, 10 + i * 5, 18 + i * 5);
        return i < n - 1 || n > 2 ? <line key={i} x1={p[0]} y1={p[1]} x2={p[0] + (q[0] - p[0]) * a} y2={p[1] + (q[1] - p[1]) * a} stroke={c.pal.ink} strokeOpacity={0.5} strokeWidth={2} /> : null; })}
      {P.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={10 + 4 * Math.sin((c.f + i * 9) / 7)} fill={c.pal.amber} opacity={ease(c.f, 4 + i * 4, 10 + i * 4)} />)}
    </svg>
    {its.map((it, i) => <div key={i} style={{position: 'absolute', left: P[i][0] + 24, top: P[i][1] - 22, display: 'flex', gap: 10, alignItems: 'center', opacity: ease(c.f, 8 + i * 4, 16 + i * 4)}}>
      <Ico name={it.icon} size={34} color={c.pal.ink} /><H size={36} color={c.pal.ink}>{it.label}</H></div>)}
    {ctr ? <Panel x={120} y={330} w={480} pal={c.pal} tab="The system"><div style={{padding: '30px 30px', display: 'flex', gap: 18, alignItems: 'center'}}>
      <Ico name={ctr.icon} size={64} color={c.pal.amber} /><H size={56} color={c.pal.ink}>{ctr.label}</H></div></Panel> : null}
  </>;
};
// 12. checkpoints: a route is driven across the frame, each stage a checkpoint flag that pops up as it is reached
const checkpoints: DR = (c) => {
  const its = listOf(c.s).slice(0, 5); const n = its.length;
  const pt = (t: number) => [180 + 1560 * t, 640 + 120 * Math.sin(t * Math.PI * 2)];
  const d = Array.from({length: 61}, (_, j) => pt(j / 60)).map((q, j) => `${j ? 'L' : 'M'} ${q[0]} ${q[1]}`).join(' ');
  const t = eio(c.f, 6, Math.max(20, c.dur - 8)); const [mx, my] = pt(t);
  return <>
    {titleOf(c.s) ? <H size={64} color={c.pal.ink} style={{position: 'absolute', left: 120, top: 160}}>{titleOf(c.s)}</H> : null}
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <path d={d} fill="none" stroke={c.pal.edge} strokeWidth={26} strokeLinecap="round" />
      <path d={d} fill="none" stroke={c.pal.amber} strokeWidth={8} strokeDasharray="30 22" pathLength={1000} strokeDashoffset={-c.f * 3} opacity={0.8} />
    </svg>
    {its.map((it, i) => { const ti = n === 1 ? 0.5 : i / (n - 1); const [x, y] = pt(ti); const up = spr(c.f, c.fps, 6 + ti * (c.dur - 14), 200, 12);
      return <div key={i} style={{position: 'absolute', left: x, top: y, transform: `translate(-6px, -100%) scaleY(${up})`, transformOrigin: 'bottom left'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, background: t >= ti ? c.pal.red : c.pal.land, padding: '10px 18px'}}><Ico name={it.icon} size={34} color="#fff" /><H size={34} color="#fff">{it.label}</H></div>
        <div style={{width: 6, height: 90, background: c.pal.ink}} /></div>; })}
    <div style={{position: 'absolute', left: mx, top: my, transform: 'translate(-50%,-50%)', width: 70, height: 70, borderRadius: 35, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Ico name={c.s.mover || 'Navigation'} size={40} color="#111" /></div>
  </>;
};

// ========================= NUMBERS =========================
// 13. split-flap number: digits clatter through before settling, like a stock exchange board
const flipNumber: DR = (c) => {
  const txt = numTxt(c.s);
  return <>
    <Cap size={26} color={c.pal.amber} style={{position: 'absolute', left: 140, top: 260}}>{c.s.source ? `Source · ${c.s.source}` : 'By the numbers'}</Cap>
    <div style={{position: 'absolute', left: 140, top: 320, display: 'flex', gap: 10}}>
      {txt.split('').map((ch, j) => { const done = c.f >= 6 + j * 3; const shown = done || !/\d/.test(ch) ? ch : String((Math.floor(c.f * 1.9) + j * 3) % 10);
        return <div key={j} style={{width: /\d/.test(ch) ? 150 : 90, height: 220, background: '#111216', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', fontFamily: HEAD, fontWeight: 800, fontSize: 190, color: done ? '#fff' : c.pal.dim, opacity: c.f >= j * 2 ? 1 : 0}}>
          {shown}<div style={{position: 'absolute', left: 0, right: 0, top: 109, height: 3, background: '#000'}} /></div>; })}
    </div>
    <H size={56} color={c.pal.ink} style={{position: 'absolute', left: 140, top: 600, width: 1300, opacity: ease(c.f, 14, 24)}}>{c.s.label}</H>
  </>;
};
// 14. market board: the figure rides a live sparkline, with a ticker-style label and an up arrow
const marketBoard: DR = (c) => {
  const pts = Array.from({length: 40}, (_, j) => 0.2 + 0.75 * (j / 39) + 0.07 * Math.sin(j * 1.7));
  const k = Math.max(2, Math.round(40 * ease(c.f, 4, 30)));
  const d = pts.slice(0, k).map((v, j) => `${j ? 'L' : 'M'} ${j * 26} ${300 - v * 280}`).join(' ');
  const v = c.s.value * ease(c.f, 4, 30);
  return <Panel x={120} y={240} w={1180} h={560} pal={c.pal} tab="Market board">
    <div style={{display: 'flex', alignItems: 'center', gap: 20, padding: '36px 44px 0'}}>
      <Ico name={c.s.icon} size={48} color={c.pal.amber} /><Cap size={26} color={c.pal.dim}>{c.s.label}</Cap></div>
    <div style={{display: 'flex', alignItems: 'baseline', gap: 26, padding: '10px 44px'}}>
      <H size={170} color={c.pal.ink}>{numTxt(c.s, v)}</H>
      <H size={60} color={c.pal.good} style={{opacity: ease(c.f, 24, 30)}}>▲</H></div>
    <svg width={1040} height={220} style={{position: 'absolute', left: 44, bottom: 30}} viewBox="0 0 1040 320" preserveAspectRatio="none">
      <path d={d + ` L ${(k - 1) * 26} 320 L 0 320 Z`} fill={`${c.pal.good}22`} /><path d={d} fill="none" stroke={c.pal.good} strokeWidth={5} />
    </svg>
  </Panel>;
};
// 15. map callout: the figure hangs off the story's location on the map on a leader line
const mapCallout: DR = (c) => {
  const [x, y] = c.toScreen(c.home.lat, c.home.lon); const q = ease(c.f, 6, 16);
  const bx = Math.max(140, Math.min(1100, x - 700)), by = Math.max(170, y - 380);
  return <>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <circle cx={x} cy={y} r={12} fill={c.pal.amber} /><circle cx={x} cy={y} r={12 + 26 * ((c.f % 30) / 30)} fill="none" stroke={c.pal.amber} strokeWidth={3} opacity={1 - (c.f % 30) / 30} />
      <polyline points={`${x},${y} ${x - 80 * q},${by + 200} ${bx + 640},${by + 200}`} fill="none" stroke={c.pal.amber} strokeWidth={3} strokeDasharray={1400} strokeDashoffset={1400 * (1 - q)} />
    </svg>
    <div style={{position: 'absolute', left: bx, top: by, width: 640, opacity: ease(c.f, 12, 20), transform: `translateY(${(1 - ease(c.f, 12, 20)) * 30}px)`}}>
      <H size={170} color={c.pal.ink}>{numTxt(c.s, c.s.value * ease(c.f, 12, 34))}</H>
      <div style={{background: c.pal.amber, padding: '10px 18px', marginTop: 8}}><H size={38} color="#111">{c.s.label}</H></div>
    </div>
  </>;
};
// 16. level meter: a tall studio meter fills with the value; segments light from the bottom up
const levelMeter: DR = (c) => {
  const seg = 18; const lit = Math.round(seg * ease(c.f, 4, 30) * 0.86);
  return <>
    <div style={{position: 'absolute', left: 1320, top: 180, width: 180, height: 740, display: 'flex', flexDirection: 'column-reverse', gap: 8, padding: 12, background: '#0b0c10', border: `2px solid ${c.pal.edge}`}}>
      {Array.from({length: seg}).map((_, i) => <div key={i} style={{flex: 1, background: i < lit ? (i > seg * 0.75 ? c.pal.red : i > seg * 0.5 ? c.pal.amber : c.pal.good) : '#1a1c22'}} />)}
    </div>
    <div style={{position: 'absolute', left: 140, top: 300}}><Ico name={c.s.icon} size={80} color={c.pal.amber} /></div>
    <H size={200} color={c.pal.ink} style={{position: 'absolute', left: 140, top: 410}}>{numTxt(c.s, c.s.value * ease(c.f, 4, 30))}</H>
    <H size={54} color={c.pal.dim} style={{position: 'absolute', left: 140, top: 640, width: 1050, opacity: ease(c.f, 12, 22)}}>{c.s.label}</H>
  </>;
};
// 17. number strap: a full-width red band slams in with the figure and wipes the label out of it
const numberStrap: DR = (c) => {
  const a = spr(c.f, c.fps, 0, 200, 18);
  return <>
    <div style={{position: 'absolute', left: 0, top: 380, width: 1920, height: 260, background: c.pal.red, transform: `scaleX(${a})`, transformOrigin: 'left', display: 'flex', alignItems: 'center', padding: '0 140px', gap: 50}}>
      <H size={220} color="#fff" style={{opacity: ease(c.f, 6, 12)}}>{numTxt(c.s)}</H>
    </div>
    <div style={{position: 'absolute', left: 140, top: 640, background: '#fff', padding: '16px 30px', clipPath: `inset(0 ${100 - 100 * ease(c.f, 12, 24)}% 0 0)`}}><H size={52} color="#111">{c.s.label}</H></div>
    {c.s.source ? <Cap size={20} color={c.pal.dim} style={{position: 'absolute', left: 140, top: 760, opacity: ease(c.f, 20, 28)}}>Source · {c.s.source}</Cap> : null}
  </>;
};

// ========================= COMPARE =========================
// 18. versus: two sides split by a diagonal blade that cuts in from the top
const versus: DR = (c) => {
  const L = c.s.left || {}, R = c.s.right || {}; const cut = ease(c.f, 0, 12);
  return <>
    <div style={{position: 'absolute', inset: 0, background: c.pal.landHi, clipPath: `polygon(0 0, ${50 + 6 * cut}% 0, ${50 - 6 * cut}% 100%, 0 100%)`, opacity: 0.92}} />
    <div style={{position: 'absolute', inset: 0, background: c.pal.red, clipPath: `polygon(${50 + 6 * cut}% 0, 100% 0, 100% 100%, ${50 - 6 * cut}% 100%)`, opacity: 0.92}} />
    {[L, R].map((sd: any, i) => <div key={i} style={{position: 'absolute', left: i ? 1060 : 160, top: 330, width: 680, opacity: ease(c.f, 8 + i * 6, 18 + i * 6),
      transform: `translateX(${(1 - ease(c.f, 8 + i * 6, 18 + i * 6)) * (i ? 80 : -80)}px)`}}>
      <Ico name={sd.icon} size={70} color="#fff" /><H size={150} color="#fff" style={{marginTop: 16}}>{sd.value}</H><Cap size={26} color="#fff" style={{marginTop: 14}}>{sd.label}</Cap></div>)}
    <div style={{position: 'absolute', left: 960, top: 540, transform: `translate(-50%,-50%) scale(${spr(c.f, c.fps, 14, 220, 10)})`, width: 130, height: 130, borderRadius: 65, background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center'}}><H size={60} color="#111">VS</H></div>
    {c.s.title ? <Cap size={26} color="#fff" style={{position: 'absolute', left: 160, top: 180}}>{c.s.title}</Cap> : null}
  </>;
};
// 19. data table: a two-row comparison table whose cells fill like a results screen
const dataTable: DR = (c) => {
  const rows = [c.s.left || {}, c.s.right || {}];
  return <Panel x={160} y={280} w={1400} pal={c.pal} tab={c.s.title || 'Side by side'}>
    <div style={{display: 'flex', padding: '20px 40px', borderBottom: `2px solid ${c.pal.line}`}}><Cap size={22} color={c.pal.dim} style={{flex: 1}}>Who / what</Cap><Cap size={22} color={c.pal.dim}>Figure</Cap></div>
    {rows.map((r: any, i) => { const a = ease(c.f, 6 + i * 8, 16 + i * 8);
      return <div key={i} style={{display: 'flex', alignItems: 'center', padding: '0 40px', height: 170, borderBottom: `1px solid ${c.pal.line}`, position: 'relative'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${a * 100}%`, background: i ? `${c.pal.red}30` : `${c.pal.landHi}`}} />
        <div style={{position: 'relative', flex: 1, display: 'flex', gap: 24, alignItems: 'center'}}><Ico name={r.icon} size={60} color={c.pal.amber} /><H size={60} color={c.pal.ink}>{r.label}</H></div>
        <H size={110} color={c.pal.ink} style={{position: 'relative', opacity: a}}>{r.value}</H></div>; })}
  </Panel>;
};
// 20. balance: the two sides sit on a scale beam that tips toward the bigger side
const balance: DR = (c) => {
  const L = c.s.left || {}, R = c.s.right || {}; const lv = parseFloat(String(L.value).replace(/[^\d.]/g, '')) || 1, rv = parseFloat(String(R.value).replace(/[^\d.]/g, '')) || 1;
  const tilt = Math.max(-12, Math.min(12, (rv - lv) / Math.max(lv, rv) * 12)) * spr(c.f, c.fps, 10, 60, 6);
  return <>
    {c.s.title ? <H size={60} color={c.pal.ink} style={{position: 'absolute', left: 120, top: 140}}>{c.s.title}</H> : null}
    <div style={{position: 'absolute', left: 950, top: 470, width: 20, height: 420, background: c.pal.edge}} />
    <div style={{position: 'absolute', left: 860, top: 880, width: 200, height: 20, background: c.pal.edge}} />
    <div style={{position: 'absolute', left: 360, top: 460, width: 1200, height: 16, background: c.pal.ink, transform: `rotate(${tilt}deg)`, transformOrigin: '50% 50%'}}>
      {[L, R].map((sd: any, i) => <div key={i} style={{position: 'absolute', left: i ? 1200 - 380 : -60, top: 16, width: 440, transform: `rotate(${-tilt}deg)`, textAlign: 'center'}}>
        <div style={{width: 4, height: 60, background: c.pal.ink, margin: '0 auto'}} />
        <div style={{background: i ? c.pal.red : c.pal.landHi, padding: '22px 20px'}}><Ico name={sd.icon} size={50} color="#fff" /><H size={90} color="#fff">{sd.value}</H><Cap size={20} color="#fff">{sd.label}</Cap></div></div>)}
    </div>
  </>;
};

// ========================= CHARTS =========================
// 21. trading screen: the line draws itself with a price tag riding the tip over a grid
const tradingLine: DR = (c) => {
  const pts = (c.s.points || []).slice(0, 8); const max = Math.max(...pts.map((q: any) => q.value), 1);
  const X = (i: number) => 220 + (1320 * i) / Math.max(1, pts.length - 1), Y = (v: number) => 860 - (v / max) * 520;
  const t = ease(c.f, 6, Math.min(c.dur - 6, 50)) * (pts.length - 1); const i0 = Math.floor(t), fr = t - i0;
  const tip = pts.length > 1 ? [X(i0) + (X(Math.min(i0 + 1, pts.length - 1)) - X(i0)) * fr, Y(pts[i0].value) + (Y(pts[Math.min(i0 + 1, pts.length - 1)].value) - Y(pts[i0].value)) * fr] : [X(0), Y(pts[0]?.value || 0)];
  const tv = pts.length > 1 ? pts[i0].value + (pts[Math.min(i0 + 1, pts.length - 1)].value - pts[i0].value) * fr : pts[0]?.value || 0;
  const d = pts.slice(0, i0 + 1).map((q: any, i: number) => `${i ? 'L' : 'M'} ${X(i)} ${Y(q.value)}`).join(' ') + ` L ${tip[0]} ${tip[1]}`;
  return <>
    <H size={60} color={c.pal.ink} style={{position: 'absolute', left: 140, top: 150}}>{c.s.title}</H>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {[0, 1, 2, 3, 4].map((g) => <line key={g} x1={220} x2={1540} y1={340 + g * 130} y2={340 + g * 130} stroke={c.pal.line} strokeWidth={1.5} />)}
      <path d={d} fill="none" stroke={c.pal.good} strokeWidth={7} strokeLinejoin="round" />
      <circle cx={tip[0]} cy={tip[1]} r={12} fill="#fff" />
    </svg>
    {pts.map((q: any, i: number) => <Cap key={i} size={20} color={c.pal.dim} style={{position: 'absolute', left: X(i) - 60, top: 890, width: 120, textAlign: 'center'}}>{q.label}</Cap>)}
    <div style={{position: 'absolute', left: tip[0] + 26, top: tip[1] - 34, background: c.pal.good, padding: '6px 16px'}}><H size={50} color="#06120c">{valTxt(c.s, tv)}</H></div>
  </>;
};
// 22. election bars: horizontal bars race out with their values, the leader marked
const raceBars: DR = (c) => {
  const pts = (c.s.points || []).slice(0, 6); const max = Math.max(...pts.map((q: any) => q.value), 1); const top = pts.reduce((a: number, q: any, i: number) => (q.value > pts[a].value ? i : a), 0);
  return <Panel x={140} y={230} w={1500} pal={c.pal} tab={c.s.title || 'Results'} style={{padding: '30px 40px'}}>
    {pts.map((q: any, i: number) => { const a = ease(c.f, 6 + i * 4, 30 + i * 4);
      return <div key={i} style={{display: 'flex', alignItems: 'center', gap: 24, height: 560 / Math.max(3, pts.length)}}>
        <Cap size={24} color={c.pal.dim} style={{width: 230}}>{q.label}</Cap>
        <div style={{height: 64, width: 900 * (q.value / max) * a, background: i === top ? c.pal.red : c.pal.landHi}} />
        <H size={58} color={c.pal.ink} style={{opacity: a}}>{valTxt(c.s, q.value * a)}</H>
        {i === top ? <Cap size={18} color={c.pal.amber} style={{opacity: ease(c.f, 34, 40)}}>▲ Highest</Cap> : null}</div>; })}
  </Panel>;
};
// 23. delta card: start figure, arrow and end figure, with the change computed between them
const deltaCard: DR = (c) => {
  const pts = c.s.points || []; const a = pts[0] || {value: 0, label: ''}, b = pts[pts.length - 1] || a;
  const ch = a.value ? ((b.value - a.value) / a.value) * 100 : 0; const q = ease(c.f, 10, 26);
  return <>
    <Cap size={26} color={c.pal.amber} style={{position: 'absolute', left: 140, top: 200}}>{c.s.title}</Cap>
    <Panel x={140} y={290} w={600} pal={c.pal}><div style={{padding: 40}}><Cap size={22} color={c.pal.dim}>{a.label}</Cap><H size={130} color={c.pal.dim}>{valTxt(c.s, a.value)}</H></div></Panel>
    <svg width={1920} height={1080} style={{position: 'absolute'}}><line x1={780} y1={440} x2={780 + 300 * q} y2={440} stroke={c.pal.amber} strokeWidth={10} /><polygon points={`${1080 * 1},420 ${1110},440 ${1080},460`} fill={c.pal.amber} opacity={q} /></svg>
    <Panel x={1150} y={290} w={620} pal={c.pal} style={{opacity: q, transform: `translateX(${(1 - q) * 60}px)`}}><div style={{padding: 40}}><Cap size={22} color={c.pal.dim}>{b.label}</Cap><H size={130} color={c.pal.ink}>{valTxt(c.s, b.value)}</H></div></Panel>
    {Math.abs(ch) >= 1 ? <div style={{position: 'absolute', left: 140, top: 640, background: ch >= 0 ? c.pal.good : c.pal.red, padding: '16px 30px', opacity: ease(c.f, 24, 32)}}>
      <H size={72} color="#06120c">{ch >= 0 ? '+' : ''}{fmt(ch, Math.abs(ch) < 10 ? 1 : 0)}%</H></div> : null}
  </>;
};

// ========================= MAP SHOTS =========================
const ptsOf = (s: any) => (s.points && s.points.length ? s.points : s.focus ? [{name: s.label || s.region, lat: s.focus.lat, lon: s.focus.lon}] : []).slice(0, 5);
// 24. pin drop: the camera has flown in; pins fall onto each place with a ripple and a name flag
const pinDrop: DR = (c) => <>
  {ptsOf(c.s).map((q: any, i: number) => { const [x, y] = c.toScreen(q.lat, q.lon); const d = spr(c.f, c.fps, 8 + i * 6, 220, 12);
    return <React.Fragment key={i}>
      <div style={{position: 'absolute', left: x, top: y - (1 - d) * 300, transform: 'translate(-50%,-100%)', opacity: Math.min(1, d * 2)}}><Ico name="MapPin" size={64} color={c.pal.red} stroke={2.4} /></div>
      <div style={{position: 'absolute', left: x - 60, top: y - 20, width: 120, height: 40, borderRadius: '50%', border: `3px solid ${c.pal.red}`, opacity: d * (1 - ((c.f + i * 7) % 36) / 36), transform: `scale(${0.5 + ((c.f + i * 7) % 36) / 36})`}} />
      <div style={{position: 'absolute', left: x + 34, top: y - 70, background: '#fff', padding: '6px 14px', opacity: ease(c.f, 14 + i * 6, 20 + i * 6)}}><H size={34} color="#111">{q.name}</H></div>
    </React.Fragment>; })}
  {c.s.label ? <Panel x={120} y={760} w={760} pal={c.pal} tab="Location"><H size={64} color={c.pal.ink} style={{padding: '20px 30px'}}>{c.s.label}</H></Panel> : null}
</>;
// 25. coverage sweep: the region's countries fill in a sweep from west to east, with a count
const coverage: DR = (c) => <>
  <div style={{position: 'absolute', left: 1920 * eio(c.f, 0, Math.min(c.dur, 60)) - 200, top: 0, width: 200, height: 1080, background: `linear-gradient(90deg, transparent, ${c.pal.amber}55)`, borderRight: `3px solid ${c.pal.amber}`}} />
  <div style={{position: 'absolute', left: 120, top: 200, width: 640}}>
    <Cap size={26} color={c.pal.amber}>Coverage</Cap>
    <H size={110} color={c.pal.ink} style={{marginTop: 10}}>{c.s.label || c.s.region}</H>
    <div style={{height: 10, width: 640 * ease(c.f, 4, 40), background: c.pal.amber, marginTop: 30}} />
  </div>
</>;
// 26. dateline: a big dateline card with coordinates and a typed place name over the zoomed map
const dateline: DR = (c) => {
  const q = ptsOf(c.s)[0] || {lat: c.home.lat, lon: c.home.lon, name: c.p.region}; const name = String(c.s.label || q.name || c.p.region);
  const k = Math.round(name.length * ease(c.f, 4, 22));
  return <div style={{position: 'absolute', left: 120, top: 620}}>
    <Cap size={26} color={c.pal.amber}>Dateline · {Math.abs(q.lat).toFixed(2)}°{q.lat >= 0 ? 'N' : 'S'} {Math.abs(q.lon).toFixed(2)}°{q.lon >= 0 ? 'E' : 'W'}</Cap>
    <H size={150} color={c.pal.ink} style={{marginTop: 10}}>{name.slice(0, k)}<span style={{color: c.pal.red}}>{k < name.length || Math.floor(c.f / 8) % 2 ? '_' : ' '}</span></H>
  </div>;
};
// 27. flight arcs: arcs are drawn between the places, like a routes map
const flightArcs: DR = (c) => {
  const ps = ptsOf(c.s); const S: [number, number][] = ps.map((q: any) => c.toScreen(q.lat, q.lon));
  return <>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {S.slice(1).map((b, i) => { const a = S[i]; const mx = (a[0] + b[0]) / 2, my = Math.min(a[1], b[1]) - 120 - Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.2; const q = ease(c.f, 6 + i * 10, 24 + i * 10);
        return <path key={i} d={`M ${a[0]} ${a[1]} Q ${mx} ${my} ${b[0]} ${b[1]}`} fill="none" stroke={c.pal.amber} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - q} />; })}
      {S.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={12} fill={c.pal.red} stroke="#fff" strokeWidth={3} opacity={ease(c.f, 2 + i * 10, 8 + i * 10)} />)}
    </svg>
    {ps.map((q: any, i: number) => <div key={i} style={{position: 'absolute', left: S[i][0] + 18, top: S[i][1] + 10, opacity: ease(c.f, 4 + i * 10, 12 + i * 10)}}><Cap size={22} color={c.pal.ink}>{q.name}</Cap></div>)}
    {c.s.label ? <Cap size={26} color={c.pal.amber} style={{position: 'absolute', left: 120, top: 200}}>{c.s.label}</Cap> : null}
  </>;
};
// 28. convoy: a marker travels the route stop to stop while a counter of stops ticks
const convoy: DR = (c) => {
  const ps = ptsOf(c.s); const S: [number, number][] = ps.map((q: any) => c.toScreen(q.lat, q.lon)); if (S.length < 2) return dateline(c);
  const t = eio(c.f, 6, Math.max(20, c.dur - 8)) * (S.length - 1); const i0 = Math.min(S.length - 2, Math.floor(t)), fr = t - i0;
  const m = [S[i0][0] + (S[i0 + 1][0] - S[i0][0]) * fr, S[i0][1] + (S[i0 + 1][1] - S[i0][1]) * fr];
  return <>
    <svg width={1920} height={1080} style={{position: 'absolute'}}><polyline points={S.map((p) => p.join(',')).join(' ')} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={4} strokeDasharray="4 10" /></svg>
    {S.map((p, i) => <div key={i} style={{position: 'absolute', left: p[0], top: p[1], transform: 'translate(-50%,-50%)', width: 26, height: 26, background: t >= i ? c.pal.amber : c.pal.edge}} />)}
    <div style={{position: 'absolute', left: m[0], top: m[1], transform: 'translate(-50%,-50%)', width: 64, height: 64, borderRadius: 32, background: c.pal.red, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <Ico name={c.s.mover || 'Truck'} size={36} color="#fff" /></div>
    <Panel x={120} y={200} w={520} pal={c.pal} tab={c.s.label || 'Route'}><div style={{padding: '24px 30px'}}><Cap size={22} color={c.pal.dim}>Stop</Cap>
      <H size={90} color={c.pal.ink}>{Math.min(S.length, Math.floor(t) + 1)} / {S.length}</H><H size={44} color={c.pal.amber}>{ps[Math.min(S.length - 1, Math.round(t))].name}</H></div></Panel>
  </>;
};

// ========================= WORDS =========================
// 29. headline strap: the line arrives as a two-tier news strap, red tab first, white text bar second
const headlineStrap: DR = (c) => {
  const a = ease(c.f, 0, 8), b = ease(c.f, 5, 16); const t = String(c.s.text || '');
  return <div style={{position: 'absolute', left: 120, top: 560}}>
    <div style={{background: c.pal.red, display: 'inline-block', padding: '10px 26px', clipPath: `inset(0 ${100 - a * 100}% 0 0)`}}><Cap size={26} color="#fff">T&I Desk · {c.p.region}</Cap></div>
    <div style={{background: '#fff', padding: '22px 36px 16px', marginTop: 4, clipPath: `inset(0 ${100 - b * 100}% 0 0)`, maxWidth: 1600}}>
      <H size={t.length > 30 ? 92 : 120} color="#0b0f17">{t}</H></div>
  </div>;
};
// 30. pull quote: a huge quotation mark swings in and the line is set word by word beneath it
const pullQuote: DR = (c) => {
  const ws = String(c.s.text || '').split(/\s+/).filter(Boolean); const em = String(c.s.emphasis || '').toLowerCase();
  return <>
    <div style={{position: 'absolute', left: 120, top: 120, fontFamily: 'Georgia, serif', fontSize: 400, lineHeight: 1, color: c.pal.red, transform: `rotate(${(1 - spr(c.f, c.fps, 0, 120, 10)) * -40}deg)`}}>“</div>
    <div style={{position: 'absolute', left: 160, top: 420, width: 1500, display: 'flex', flexWrap: 'wrap', columnGap: 26}}>
      {ws.map((w, i) => <H key={i} size={120} color={em && em.includes(w.toLowerCase().replace(/[^a-z0-9]/g, '')) ? c.pal.amber : c.pal.ink} style={{opacity: ease(c.f, 6 + i * 3, 12 + i * 3)}}>{w}</H>)}
    </div>
  </>;
};
// 31. word wall: the line is split across a wall of broadcast tiles that flip on in a random order
const wordWall: DR = (c) => {
  const ws = String(c.s.text || '').split(/\s+/).filter(Boolean).slice(0, 8); const order = ws.map((_, i) => (i * 5 + 3) % ws.length);
  return <div style={{position: 'absolute', left: 120, top: 260, width: 1680, display: 'flex', flexWrap: 'wrap', gap: 14}}>
    {ws.map((w, i) => { const q = ease(c.f, 4 + order[i] * 3, 12 + order[i] * 3);
      return <div key={i} style={{background: i % 3 === 1 ? c.pal.red : c.pal.panel, padding: '26px 40px', transform: `rotateY(${(1 - q) * 90}deg)`, border: `1px solid ${c.pal.line}`}}>
        <H size={130} color="#fff">{w}</H></div>; })}
  </div>;
};

// ========================= DEVICES =========================
// 32. desk monitor: the app runs on a studio monitor, its lines appear as live feed entries
const deskMonitor: DR = (c) => <>
  <div style={{position: 'absolute', left: 560, top: 150, width: 1240, height: 720, background: '#0d0f14', border: '16px solid #24272f', borderRadius: 18, boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
    transform: `perspective(1800px) rotateY(${-14 + 6 * ease(c.f, 0, c.dur)}deg)`, overflow: 'hidden'}}>
    <div style={{height: 64, background: '#1a1d24', display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px'}}>
      {['#ff5f57', '#febc2e', '#28c840'].map((k) => <div key={k} style={{width: 16, height: 16, borderRadius: 8, background: k}} />)}<Cap size={20} color={c.pal.dim} style={{marginLeft: 16}}>{c.s.app}</Cap></div>
    {(c.s.lines || []).slice(0, 4).map((l: string, i: number) => { const q = ease(c.f, 6 + i * 10, 14 + i * 10);
      return <div key={i} style={{margin: '26px 30px 0', padding: '22px 26px', background: '#161a22', borderLeft: `6px solid ${i ? c.pal.amber : c.pal.good}`, opacity: q, transform: `translateY(${(1 - q) * 30}px)`}}>
        <Cap size={16} color={c.pal.dim}>{c.s.app} · update</Cap><div style={{fontFamily: HEAD, fontWeight: 600, fontSize: 46, color: '#fff', marginTop: 6}}>{l}</div></div>; })}
  </div>
  <div style={{position: 'absolute', left: 120, top: 380, width: 400}}><Cap size={22} color={c.pal.amber}>Example screen</Cap><H size={70} color={c.pal.ink} style={{marginTop: 10}}>{c.s.app}</H></div>
</>;
// 33. lock screen: a phone rises and its lock screen collects the app's alerts
const lockScreen: DR = (c) => {
  const up = spr(c.f, c.fps, 0, 110, 16);
  return <>
    <div style={{position: 'absolute', left: 1120, top: 120 + (1 - up) * 900, width: 470, height: 900, borderRadius: 64, background: `linear-gradient(170deg, ${c.pal.landHi}, #05070c)`, border: '12px solid #111', overflow: 'hidden'}}>
      <div style={{textAlign: 'center', marginTop: 90}}><div style={{fontFamily: HEAD, fontWeight: 500, fontSize: 130, color: '#fff'}}>9:41</div><Cap size={18} color="#ccd">Example</Cap></div>
      {(c.s.lines || []).slice(0, 3).map((l: string, i: number) => { const q = spr(c.f, c.fps, 14 + i * 10, 170, 15);
        return <div key={i} style={{margin: '18px 20px 0', background: 'rgba(255,255,255,0.86)', borderRadius: 24, padding: '16px 18px', transform: `scale(${q})`, opacity: q}}>
          <Cap size={14} color="#555">{c.s.app} · now</Cap><div style={{fontFamily: HEAD, fontWeight: 600, fontSize: 30, color: '#111', marginTop: 4}}>{l}</div></div>; })}
    </div>
    <H size={86} color={c.pal.ink} style={{position: 'absolute', left: 140, top: 420, width: 820}}>{c.s.app}</H>
  </>;
};

// ========================= TIMELINE / UNITS =========================
// 34. scrubber: an edit timeline; the playhead moves along and each date's clip lights up
const scrubber: DR = (c) => {
  const its = (c.s.items || []).slice(0, 5); const n = its.length; const t = eio(c.f, 4, Math.max(20, c.dur - 6)) * (n - 1); const cur = Math.round(t);
  return <>
    <div style={{position: 'absolute', left: 140, top: 600, width: 1640, height: 120, background: '#0b0c10', border: `2px solid ${c.pal.edge}`}} />
    {its.map((it: any, i: number) => <div key={i} style={{position: 'absolute', left: 150 + (i * 1620) / n, top: 610, width: 1620 / n - 10, height: 100, background: i <= cur ? c.pal.landHi : '#15171c', borderTop: `5px solid ${i === cur ? c.pal.amber : 'transparent'}`, padding: '12px 16px'}}>
      <Cap size={22} color={i === cur ? c.pal.amber : c.pal.dim}>{it.year}</Cap></div>)}
    <div style={{position: 'absolute', left: 150 + ((t + 0.5) * 1620) / n, top: 560, width: 4, height: 190, background: c.pal.red}}><div style={{width: 26, height: 26, background: c.pal.red, marginLeft: -11, clipPath: 'polygon(0 0,100% 0,50% 100%)'}} /></div>
    <H size={140} color={c.pal.ink} style={{position: 'absolute', left: 140, top: 200}}>{its[cur]?.year}</H>
    <H size={60} color={c.pal.dim} style={{position: 'absolute', left: 140, top: 360, width: 1500}}>{its[cur]?.text}</H>
  </>;
};
// 35. calendar: tear-off calendar pages fall away, one per date
const calendar: DR = (c) => {
  const its = (c.s.items || []).slice(0, 5); const per = Math.max(10, (c.dur - 6) / its.length); const k = Math.min(its.length - 1, Math.floor(c.f / per)); const lf = c.f - k * per;
  return <>
    {its.map((it: any, i: number) => i < k - 1 || i > k + 1 ? null : <div key={i} style={{position: 'absolute', left: 200, top: 220, width: 560, height: 620, background: '#F4F1EA', borderTop: `90px solid ${c.pal.red}`,
      zIndex: 10 - i, transformOrigin: 'top center', transform: i < k ? `rotateX(${-100}deg)` : i === k && k < its.length - 1 && lf > per - 8 ? `perspective(1200px) rotateX(${-100 * ease(lf, per - 8, per)}deg)` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, textAlign: 'center', boxShadow: '0 30px 60px rgba(0,0,0,0.4)'}}>
      <H size={150} color="#111">{it.year}</H></div>)}
    <H size={70} color={c.pal.ink} style={{position: 'absolute', left: 860, top: 420, width: 900, opacity: ease(lf, 2, 10)}}>{its[k]?.text}</H>
  </>;
};
// 36. hemicycle: 100 seats in a parliament arc; the share lights up seat by seat
const hemicycle: DR = (c) => {
  const T = c.s.total || 100, n = 100, hi = Math.round((c.s.highlight / T) * n); const lit = Math.round(hi * ease(c.f, 6, 34));
  const seats: [number, number][] = []; const rows = [10, 14, 18, 22, 26, 10]; let k = 0;
  for (let r = 0; r < 5 && k < n; r++) { const cnt = rows[r]; const R = 200 + r * 60; for (let j = 0; j < cnt && k < n; j++, k++) { const a = Math.PI - (j / (cnt - 1)) * Math.PI; seats.push([1300 + Math.cos(a) * R, 760 - Math.sin(a) * R]); } }
  while (seats.length < n) seats.push([1300, 760]);
  const order = seats.map((s, i) => i).sort((a, b) => seats[a][0] - seats[b][0]);
  const on = new Set(order.slice(0, lit));
  return <>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>{seats.map((s, i) => <circle key={i} cx={s[0]} cy={s[1]} r={17} fill={on.has(i) ? c.pal.red : c.pal.land} stroke={c.pal.edge} />)}</svg>
    <H size={170} color={c.pal.ink} style={{position: 'absolute', left: 140, top: 300}}>{Math.round((lit / n) * 100)}%</H>
    <H size={52} color={c.pal.dim} style={{position: 'absolute', left: 140, top: 500, width: 680}}>{c.s.label}</H>
  </>;
};
// 37. donut: a ring closes around the share while the rest stays dim
const donut: DR = (c) => {
  const T = c.s.total || 100, sh = c.s.highlight / T; const q = ease(c.f, 4, 30); const R = 260, C = 2 * Math.PI * R;
  return <>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      <circle cx={1300} cy={540} r={R} fill="none" stroke={c.pal.land} strokeWidth={70} />
      <circle cx={1300} cy={540} r={R} fill="none" stroke={c.pal.amber} strokeWidth={70} strokeDasharray={`${C * sh * q} ${C}`} transform="rotate(-90 1300 540)" />
    </svg>
    <div style={{position: 'absolute', left: 1300, top: 540, transform: 'translate(-50%,-50%)'}}><Ico name={c.s.icon} size={110} color={c.pal.ink} /></div>
    <H size={170} color={c.pal.ink} style={{position: 'absolute', left: 140, top: 330}}>{fmt(sh * 100 * q, 0)}%</H>
    <H size={52} color={c.pal.dim} style={{position: 'absolute', left: 140, top: 520, width: 700}}>{c.s.label}</H>
  </>;
};

// ========================= FOOTAGE =========================
const LocStrap: React.FC<{c: DC; f0?: number}> = ({c, f0 = 8}) => <div style={{position: 'absolute', left: 120, bottom: 150, display: 'flex', clipPath: `inset(0 ${100 - 100 * ease(c.f, f0, f0 + 10)}% 0 0)`}}>
  <div style={{background: c.pal.red, padding: '12px 20px'}}><Cap size={22} color="#fff">On location</Cap></div>
  <div style={{background: '#fff', padding: '8px 26px'}}><H size={44} color="#111">{placeOf(c)}</H></div></div>;
// 38. on location: the clip fills the frame with a slow push and a location strap
const onLocation: DR = (c) => c.s.media ? <>
  <AbsoluteFill><MediaFill m={c.s.media} zoom={1.04 + 0.06 * ease(c.f, 0, c.dur)} /></AbsoluteFill>
  <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(0,0,0,0.55), transparent 40%)'}} /><LocStrap c={c} />
</> : dateline(c);
// 39. picture in picture: the clip opens as a window over the map, tied to the place by a leader line
const pip: DR = (c) => {
  if (!c.s.media) return dateline(c);
  const [x, y] = c.toScreen(c.home.lat, c.home.lon); const q = spr(c.f, c.fps, 0, 120, 16);
  return <>
    <svg width={1920} height={1080} style={{position: 'absolute'}}><line x1={x} y1={y} x2={760} y2={560} stroke={c.pal.amber} strokeWidth={3} opacity={q} /><circle cx={x} cy={y} r={12} fill={c.pal.amber} /></svg>
    <div style={{position: 'absolute', left: 120, top: 200, width: 1100, height: 620, overflow: 'hidden', border: '6px solid #fff', transform: `scale(${q})`, transformOrigin: `${x - 120}px ${y - 200}px`, boxShadow: '0 40px 90px rgba(0,0,0,0.6)'}}>
      <MediaFill m={c.s.media} zoom={1.05} /></div>
    <div style={{position: 'absolute', left: 120, top: 840, opacity: ease(c.f, 10, 18)}}><Cap size={24} color={c.pal.ink}>● {placeOf(c)}</Cap></div>
  </>;
};
// 40. three-screen wall: the clip is split across three tall screens that slide in one by one
const tripleWall: DR = (c) => {
  if (!c.s.media) return dateline(c);
  return <>{[0, 1, 2].map((i) => { const q = ease(c.f, i * 5, 12 + i * 5);
    return <div key={i} style={{position: 'absolute', left: 120 + i * 570, top: 160, width: 540, height: 760, overflow: 'hidden', transform: `translateY(${(1 - q) * (i % 2 ? -900 : 900)}px)`}}>
      <div style={{position: 'absolute', left: -i * 570 - 120 + 120, top: -160, width: 1920, height: 1080}}><MediaFill m={c.s.media} zoom={1.02 + 0.05 * ease(c.f, 0, c.dur)} /></div></div>; })}
    <LocStrap c={c} f0={16} /></>;
};
// 41. split desk: clip on the left two-thirds, an info column on the right with place and date
const splitDesk: DR = (c) => {
  if (!c.s.media) return dateline(c);
  const a = ease(c.f, 0, 12);
  return <>
    <div style={{position: 'absolute', left: 0, top: 0, width: 1240 * a, height: 1080, overflow: 'hidden'}}><div style={{width: 1240, height: 1080}}><MediaFill m={c.s.media} zoom={1.05} /></div></div>
    <div style={{position: 'absolute', left: 1290, top: 300, width: 520, opacity: ease(c.f, 8, 18)}}>
      <Cap size={22} color={c.pal.amber}>Filmed in</Cap><H size={92} color={c.pal.ink} style={{marginTop: 10}}>{placeOf(c)}</H>
      <div style={{height: 6, width: 120, background: c.pal.red, margin: '30px 0'}} /><Cap size={22} color={c.pal.dim}>Stock footage · Pexels / Pixabay</Cap></div>
  </>;
};

// ========================= AGENDA =========================
export const agendaDesk = (c: DC & {sections: string[]; marks?: number[]}) => {
  const ms = c.marks || []; let k = -1; ms.forEach((m, i) => { if (c.f >= m) k = i; });
  return <Panel x={120} y={190} w={1000} pal={c.pal} tab="On the desk today">
    {c.sections.map((t, i) => { const a = ease(c.f, (ms[i] ?? i * 20) - 6, (ms[i] ?? i * 20) + 4); const on = i === k;
      return <div key={i} style={{display: 'flex', alignItems: 'center', gap: 26, height: 108, padding: '0 34px', borderBottom: `1px solid ${c.pal.line}`, opacity: 0.25 + 0.75 * a,
        background: on ? c.pal.red : 'transparent'}}>
        <Cap size={26} color={on ? '#fff' : c.pal.amber}>{String(i + 1).padStart(2, '0')}</Cap><H size={58} color={c.pal.ink}>{t}</H></div>; })}
  </Panel>;
};

// Which animations each kind of idea may use. A renderer may serve several kinds; the engine still uses each at most once.
export const DESK: Record<string, Record<string, DR>> = {
  icons: {rundown, lowerThirds, videoWall, bulletin, splitFlap, stackCards, mapPins},
  steps: {ladder, rundown, splitFlap, bulletin, stackCards, lowerThirds, checkpoints},
  flow: {pipeline, checkpoints, ladder, stackCards, rundown, lowerThirds},
  network: {orgChart, constellation, mapPins, videoWall, stackCards},
  counter: {flipNumber, marketBoard, mapCallout, levelMeter, numberStrap},
  compare: {versus, dataTable, balance},
  chart: {tradingLine, raceBars, deltaCard},
  globe: {pinDrop, coverage, dateline, flightArcs},
  route: {flightArcs, convoy, pinDrop},
  kinetic: {headlineStrap, pullQuote, wordWall},
  device: {deskMonitor, lockScreen},
  timeline: {scrubber, calendar},
  units: {hemicycle, donut},
  footage: {onLocation, pip, tripleWall, splitDesk},
};
