// ENGINE "Color Block" — a completely different film grammar from the v3 families.
// Reference: awe0_io motion piece (X, 22 Oct 2026): every scene is ONE flat saturated colour field, a single recurring
// object (the "dot") travels through every cut and BECOMES the data (a number's circle, a chart's marker, a map pin, the
// mask that reveals footage), giant tight sans type, spring physics with overshoot, hard colour cuts, no frames/rails/cards.
import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as Lucide from 'lucide-react';
import type {DocProps, Shot, TimelineItem} from '../types';
import {MONO, SANS} from '../theme';

type Pal = {bg: string; ink: string; dot: string; soft: string};
// palettes cycle per shot; each episode picks a rotation (props.look) so two Color Block episodes still differ
const SETS: Pal[][] = [
  [{bg: '#ECE8DF', ink: '#121212', dot: '#FF4A1C', soft: '#12121222'}, {bg: '#FF4A1C', ink: '#121212', dot: '#ECE8DF', soft: '#12121233'},
    {bg: '#1D3BFF', ink: '#F4F1EA', dot: '#FF4A1C', soft: '#F4F1EA33'}, {bg: '#111214', ink: '#ECE8DF', dot: '#FF4A1C', soft: '#ECE8DF22'}],
  [{bg: '#F3EFE6', ink: '#0E1A2B', dot: '#1BB37A', soft: '#0E1A2B22'}, {bg: '#0E1A2B', ink: '#F3EFE6', dot: '#C8F135', soft: '#F3EFE633'},
    {bg: '#C8F135', ink: '#0E1A2B', dot: '#0E1A2B', soft: '#0E1A2B33'}, {bg: '#1BB37A', ink: '#0E1A2B', dot: '#F3EFE6', soft: '#0E1A2B33'}],
  [{bg: '#FAF4EC', ink: '#2A1033', dot: '#FF2E88', soft: '#2A103322'}, {bg: '#2A1033', ink: '#FAF4EC', dot: '#FFC23A', soft: '#FAF4EC33'},
    {bg: '#FFC23A', ink: '#2A1033', dot: '#FF2E88', soft: '#2A103333'}, {bg: '#FF2E88', ink: '#FAF4EC', dot: '#2A1033', soft: '#FAF4EC33'}],
];
const W = 1920, H = 1080;
const ease = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const sp = (f: number, fps: number, delay = 0, stiff = 120) => spring({frame: f - delay, fps, config: {damping: 11, stiffness: stiff, mass: 0.8}});
const Ico: React.FC<{name?: string; size: number; color: string}> = ({name, size, color}) => {
  const C = ((name && (Lucide as any)[name]) || (Lucide as any).Circle) as React.FC<any>;
  return <C size={size} color={color} strokeWidth={2.2} />;
};
const fmt = (n: number, d = 0) => n.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
const BIG: React.CSSProperties = {fontFamily: SANS, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.95};
const SMALL: React.CSSProperties = {fontFamily: MONO, fontSize: 22, letterSpacing: 3, textTransform: 'uppercase'};

type Ball = {x: number; y: number; r: number};
type Ctx = {f: number; dur: number; fps: number; pal: Pal; p: DocProps; sections: string[]; marks?: number[]; idx: number};
type Kind = {render: (s: any, c: Ctx) => React.ReactNode; ball: (s: any, c: Ctx) => Ball};

const words = (t: string) => String(t || '').split(/\s+/).filter(Boolean);
const BigWords: React.FC<{text: string; c: Ctx; size: number; accent?: string; x?: number; y?: number; width?: number}> = ({text, c, size, accent, x = 140, y = 300, width = 1500}) => {
  const ws = words(text);
  const em = (accent || '').toLowerCase();
  return (
    <div style={{position: 'absolute', left: x, top: y, width, ...BIG, fontSize: size, color: c.pal.ink}}>
      {ws.map((w, i) => {
        const s = sp(c.f, c.fps, i * 2.5, 160);
        const hot = em && em.split(/\s+/).includes(w.toLowerCase().replace(/[^a-z0-9]/g, ''));
        return <span key={i} style={{display: 'inline-block', marginRight: size * 0.22, transform: `translateY(${(1 - s) * 90}px)`, opacity: Math.min(1, s * 1.6),
          color: hot ? c.pal.dot : c.pal.ink}}>{w}</span>;
      })}
    </div>
  );
};
const Tag: React.FC<{c: Ctx; text?: string}> = ({c, text}) => text
  ? <div style={{position: 'absolute', left: 140, top: 110, ...SMALL, color: c.pal.ink, opacity: 0.75 * ease(c.f, 2, 10)}}>{text}</div> : null;

const K: Record<string, Kind> = {
  kinetic: {
    render: (s, c) => <BigWords text={s.text} c={c} size={words(s.text).length > 5 ? 150 : 190} accent={s.emphasis} y={360} />,
    ball: (s, c) => ({x: 1700, y: 760, r: 26 + 4 * Math.sin(c.f / 6)}),
  },
  counter: {
    render: (s, c) => {
      const d = s.decimals ?? (Math.abs(s.value) < 10 && s.value % 1 ? 1 : 0);
      const p = ease(c.f, 6, Math.min(c.dur - 4, 40));
      const v = s.from !== undefined ? s.from + (s.value - s.from) * p : s.value * p;
      return <>
        <div style={{position: 'absolute', left: 1240, top: 540, width: 600, transform: 'translate(-50%,-50%)', textAlign: 'center', ...BIG, fontSize: 132, color: c.pal.bg,
          opacity: ease(c.f, 8, 14)}}>{s.prefix || ''}{fmt(v, d)}{s.suffix || ''}</div>
        <div style={{position: 'absolute', left: 140, top: 420, width: 760, ...BIG, fontSize: 72, color: c.pal.ink, opacity: ease(c.f, 10, 20)}}>{s.label}</div>
        {s.source ? <div style={{position: 'absolute', left: 140, bottom: 110, ...SMALL, color: c.pal.ink, opacity: 0.6}}>Source · {s.source}</div> : null}
      </>;
    },
    ball: (s, c) => ({x: 1240, y: 540, r: 26 + 300 * sp(c.f, c.fps, 0, 90)}),
  },
  compare: {
    render: (s, c) => {
      const L = s.left || {}, R = s.right || {};
      const a = sp(c.f, c.fps, 2), b = sp(c.f, c.fps, 10);
      return <>
        {s.title ? <Tag c={c} text={s.title} /> : null}
        <div style={{position: 'absolute', left: 560, top: 520, width: 360 * a, height: 360 * a, borderRadius: '50%', background: c.pal.soft, transform: 'translate(-50%,-50%)'}} />
        <div style={{position: 'absolute', left: 560, top: 520, transform: 'translate(-50%,-50%)', ...BIG, fontSize: 96, color: c.pal.ink, opacity: a}}>{L.value}</div>
        <div style={{position: 'absolute', left: 560, top: 780, width: 600, transform: 'translateX(-50%)', textAlign: 'center', ...SMALL, fontSize: 26, color: c.pal.ink, opacity: a}}>{L.label}</div>
        <div style={{position: 'absolute', left: 1360, top: 520, transform: 'translate(-50%,-50%)', ...BIG, fontSize: 110, color: c.pal.bg, opacity: b}}>{R.value}</div>
        <div style={{position: 'absolute', left: 1360, top: 820, width: 600, transform: 'translateX(-50%)', textAlign: 'center', ...SMALL, fontSize: 26, color: c.pal.ink, opacity: b}}>{R.label}</div>
      </>;
    },
    ball: (s, c) => ({x: 1360, y: 520, r: 30 + 220 * sp(c.f, c.fps, 8, 90)}),
  },
  chart: {
    render: (s, c) => {
      const pts = (s.points || []).slice(0, 6);
      const max = Math.max(...pts.map((q: any) => q.value), 1);
      const X0 = 260, X1 = 1680, Y0 = 880, Y1 = 330;
      const x = (i: number) => X0 + ((X1 - X0) * i) / Math.max(1, pts.length - 1);
      const y = (v: number) => Y0 - ((Y0 - Y1) * v) / max;
      const p = ease(c.f, 4, Math.min(c.dur - 6, 50));
      const k = p * (pts.length - 1);
      return <>
        <Tag c={c} text={s.title} />
        <svg width={W} height={H} style={{position: 'absolute'}}>
          <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke={c.pal.ink} strokeWidth={3} opacity={0.4} />
          <polyline fill="none" stroke={c.pal.ink} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"
            points={pts.filter((_: any, i: number) => i <= Math.ceil(k)).map((q: any, i: number) => {
              const t = Math.min(1, k - i + 1);
              const xx = i === 0 ? x(0) : x(i - 1) + (x(i) - x(i - 1)) * Math.min(1, Math.max(0, k - (i - 1)));
              const yy = i === 0 ? y(q.value) : y(pts[i - 1].value) + (y(q.value) - y(pts[i - 1].value)) * Math.min(1, Math.max(0, k - (i - 1)));
              return `${xx},${yy}${t ? '' : ''}`;
            }).join(' ')} />
          {pts.map((q: any, i: number) => (i <= k + 0.01 ? <text key={i} x={x(i)} y={y(q.value) - 46} textAnchor="middle" fill={c.pal.ink}
            style={{...BIG, fontSize: 44} as any}>{s.prefix || ''}{fmt(q.value, q.value % 1 ? 1 : 0)}{s.unit && /^[a-z]{2,}/i.test(s.unit) ? ' ' + s.unit : s.unit || ''}</text> : null))}
          {pts.map((q: any, i: number) => <text key={'l' + i} x={x(i)} y={Y0 + 50} textAnchor="middle" fill={c.pal.ink} opacity={0.7} style={{...SMALL} as any}>{q.label}</text>)}
        </svg>
      </>;
    },
    ball: (s, c) => {
      const pts = (s.points || []).slice(0, 6);
      const max = Math.max(...pts.map((q: any) => q.value), 1);
      const X0 = 260, X1 = 1680, Y0 = 880, Y1 = 330;
      const p = ease(c.f, 4, Math.min(c.dur - 6, 50));
      const k = p * (pts.length - 1);
      const i = Math.min(pts.length - 2, Math.floor(k)), t = k - i;
      const xa = X0 + ((X1 - X0) * i) / Math.max(1, pts.length - 1), xb = X0 + ((X1 - X0) * (i + 1)) / Math.max(1, pts.length - 1);
      const ya = Y0 - ((Y0 - Y1) * (pts[i]?.value || 0)) / max, yb = Y0 - ((Y0 - Y1) * (pts[i + 1]?.value ?? pts[i]?.value ?? 0)) / max;
      return {x: xa + (xb - xa) * t, y: ya + (yb - ya) * t, r: 22};
    },
  },
  flow: {
    render: (s, c) => {
      const ns = (s.nodes || []).slice(0, 4);
      const xs = ns.map((_: any, i: number) => 300 + (i * 1320) / Math.max(1, ns.length - 1));
      return <>
        {s.label ? <Tag c={c} text={s.label} /> : null}
        <svg width={W} height={H} style={{position: 'absolute'}}>
          <line x1={xs[0]} y1={540} x2={xs[0] + (xs[xs.length - 1] - xs[0]) * ease(c.f, 0, 16)} y2={540} stroke={c.pal.ink} strokeWidth={4} opacity={0.35} />
        </svg>
        {ns.map((n: any, i: number) => {
          const a = sp(c.f, c.fps, 3 + i * 5);
          return <div key={i} style={{position: 'absolute', left: xs[i], top: 540, transform: `translate(-50%,-50%) scale(${a})`, width: 170, height: 170, borderRadius: '50%',
            border: `5px solid ${c.pal.ink}`, background: c.pal.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Ico name={n.icon} size={72} color={c.pal.ink} /></div>;
        })}
        {ns.map((n: any, i: number) => <div key={'t' + i} style={{position: 'absolute', left: xs[i], top: 660, width: 380, transform: 'translateX(-50%)', textAlign: 'center',
          ...BIG, fontSize: 40, color: c.pal.ink, opacity: ease(c.f, 6 + i * 5, 14 + i * 5)}}>{n.label}</div>)}
      </>;
    },
    ball: (s, c) => {
      const ns = (s.nodes || []).slice(0, 4);
      const t = ease(c.f, 8, Math.max(12, c.dur - 6)) * (ns.length - 1);
      const x = 300 + (t * 1320) / Math.max(1, ns.length - 1);
      return {x, y: 540 - 150 - 60 * Math.abs(Math.sin(t * Math.PI)), r: 26};
    },
  },
  steps: {
    render: (s, c) => {
      const its = (s.items || []).slice(0, 4);
      const per = Math.max(6, (c.dur - 10) / its.length);
      return its.map((it: any, i: number) => {
        const a = sp(c.f, c.fps, i * per);
        return <div key={i} style={{position: 'absolute', left: 300, top: 220 + i * 180, display: 'flex', alignItems: 'center', gap: 40, opacity: Math.min(1, a * 1.4),
          transform: `translateX(${(1 - a) * 80}px)`}}>
          <div style={{...BIG, fontSize: 110, color: c.pal.ink, opacity: 0.25, width: 160}}>{String(i + 1).padStart(2, '0')}</div>
          <Ico name={it.icon} size={70} color={c.pal.ink} />
          <div style={{...BIG, fontSize: 76, color: c.pal.ink}}>{it.label}</div>
        </div>;
      });
    },
    ball: (s, c) => {
      const n = Math.max(1, (s.items || []).slice(0, 4).length);
      const per = Math.max(6, (c.dur - 10) / n);
      const k = Math.min(n - 1, Math.floor(c.f / per));
      return {x: 230, y: 220 + k * 180 + 60, r: 24};
    },
  },
  units: {
    render: (s, c) => {
      const T = [10, 20, 50, 100].includes(s.total) ? s.total : 20;
      const cols = T === 100 ? 20 : T === 50 ? 10 : T, rows = Math.ceil(T / cols);
      const lit = Math.round(Math.min(T, s.highlight) * ease(c.f, 8, Math.min(c.dur - 4, 40)));
      const sz = T >= 50 ? 46 : 80;
      return <>
        <div style={{position: 'absolute', left: 140, top: 160, ...BIG, fontSize: 150, color: c.pal.ink}}>{lit}<span style={{opacity: 0.35}}> / {T}</span></div>
        <div style={{position: 'absolute', left: 140, top: 330, width: 1600, ...BIG, fontSize: 54, color: c.pal.ink, opacity: ease(c.f, 10, 20)}}>{s.label}</div>
        <div style={{position: 'absolute', left: 140, top: 520, display: 'grid', gridTemplateColumns: `repeat(${cols}, ${sz}px)`, gap: 18}}>
          {Array.from({length: T}, (_, i) => <div key={i} style={{width: sz, height: sz, borderRadius: '50%', background: i < lit ? c.pal.dot : c.pal.soft,
            transform: `scale(${ease(c.f, (i % cols) * 0.6, 6 + (i % cols) * 0.6)})`}} />)}
        </div>
      </>;
    },
    ball: (s, c) => ({x: 140 + 23, y: 520 + 23, r: 23}),
  },
  globe: {
    render: (s, c) => {
      const N = 900, R = 360, cx = 1300, cy = 540, rot = c.f * 0.012;
      const pts = [] as React.ReactNode[];
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963 + rot;
        const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
        if (z < -0.05) continue;
        pts.push(<circle key={i} cx={cx + x * R} cy={cy + y * R} r={2 + 2.5 * z} fill={c.pal.ink} opacity={0.25 + 0.6 * z} />);
      }
      return <>
        <svg width={W} height={H} style={{position: 'absolute', opacity: ease(c.f, 0, 10)}}>{pts}</svg>
        <div style={{position: 'absolute', left: 140, top: 400, width: 700, ...BIG, fontSize: 92, color: c.pal.ink, opacity: ease(c.f, 6, 16)}}>{s.label || (s.points && s.points[0]?.name) || s.region}</div>
        <div style={{position: 'absolute', left: 140, top: 340, ...SMALL, color: c.pal.ink, opacity: 0.7}}>{s.focus ? `${Number(s.focus.lat).toFixed(2)}° · ${Number(s.focus.lon).toFixed(2)}°` : ''}</div>
      </>;
    },
    ball: (s, c) => ({x: 1300 + 120, y: 540 - 80, r: 18 + 6 * Math.sin(c.f / 5)}),
  },
  route: {
    render: (s, c) => {
      const pts = (s.points || []).slice(0, 2);
      return <>
        <svg width={W} height={H} style={{position: 'absolute'}}>
          <path d="M 300 720 Q 960 160 1620 620" fill="none" stroke={c.pal.ink} strokeWidth={4} strokeDasharray="6 18" opacity={0.5} />
        </svg>
        {pts.map((q: any, i: number) => <div key={i} style={{position: 'absolute', left: i ? 1620 : 300, top: (i ? 620 : 720) + 50, transform: 'translateX(-50%)', ...BIG, fontSize: 52,
          color: c.pal.ink, opacity: ease(c.f, 4 + i * 6, 12 + i * 6)}}>{q.name}</div>)}
        {s.label ? <Tag c={c} text={s.label} /> : null}
      </>;
    },
    ball: (s, c) => {
      const t = ease(c.f, 6, Math.max(12, c.dur - 6));
      const x = (1 - t) * (1 - t) * 300 + 2 * (1 - t) * t * 960 + t * t * 1620, y = (1 - t) * (1 - t) * 720 + 2 * (1 - t) * t * 160 + t * t * 620;
      return {x, y, r: 28};
    },
  },
  network: {
    render: (s, c) => {
      const ns = (s.nodes || []).slice(0, 6);
      return <>
        <div style={{position: 'absolute', left: 960, top: 540 + 150, transform: 'translateX(-50%)', ...BIG, fontSize: 48, color: c.pal.bg, opacity: 0}}>.</div>
        <div style={{position: 'absolute', left: 960, top: 540, transform: 'translate(-50%,-50%)', zIndex: 3, ...BIG, fontSize: 40, color: c.pal.bg, width: 220, textAlign: 'center',
          opacity: ease(c.f, 10, 18)}}>{s.center?.label}</div>
        {ns.map((n: any, i: number) => {
          const a = (i / ns.length) * Math.PI * 2 - Math.PI / 2, R = 380 * sp(c.f, c.fps, 4 + i * 3);
          const x = 960 + Math.cos(a) * R * 1.4, y = 540 + Math.sin(a) * R;
          return <React.Fragment key={i}>
            <svg width={W} height={H} style={{position: 'absolute'}}><line x1={960} y1={540} x2={x} y2={y} stroke={c.pal.ink} strokeWidth={3} opacity={0.35} /></svg>
            <div style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
              <div style={{width: 96, height: 96, borderRadius: '50%', background: c.pal.ink, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Ico name={n.icon} size={46} color={c.pal.bg} /></div>
              <div style={{...BIG, fontSize: 34, color: c.pal.ink, width: 320, textAlign: 'center'}}>{n.label}</div>
            </div>
          </React.Fragment>;
        })}
      </>;
    },
    ball: (s, c) => ({x: 960, y: 540, r: 30 + 110 * sp(c.f, c.fps, 0, 90)}),
  },
  icons: {
    render: (s, c) => {
      const its = (s.items || []).slice(0, 4);
      const per = Math.max(5, (c.dur - 12) / its.length);
      return <>
        {s.title ? <BigWords text={s.title} c={c} size={84} y={140} /> : null}
        {its.map((it: any, i: number) => {
          const a = sp(c.f, c.fps, 4 + i * per);
          const x = 300 + (i * 1320) / Math.max(1, its.length - 1 || 1);
          return <div key={i} style={{position: 'absolute', left: its.length === 1 ? 960 : x, top: 560, transform: `translate(-50%,-50%) scale(${a})`, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 26}}>
            <div style={{width: 220, height: 220, borderRadius: '50%', background: c.pal.ink, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Ico name={it.icon} size={100} color={c.pal.bg} /></div>
            <div style={{...BIG, fontSize: 44, color: c.pal.ink, width: 380, textAlign: 'center'}}>{it.label}</div>
          </div>;
        })}
      </>;
    },
    ball: (s, c) => {
      const its = (s.items || []).slice(0, 4);
      const per = Math.max(5, (c.dur - 12) / its.length);
      const k = Math.min(its.length - 1, Math.floor(c.f / per));
      const x = 300 + (k * 1320) / Math.max(1, its.length - 1 || 1);
      return {x: its.length === 1 ? 960 + 110 : x + 110, y: 560 - 110, r: 26};
    },
  },
  timeline: {
    render: (s, c) => {
      const its = (s.items || []).slice(0, 5);
      const xs = its.map((_: any, i: number) => 260 + (i * 1400) / Math.max(1, its.length - 1));
      return <>
        <svg width={W} height={H} style={{position: 'absolute'}}><line x1={200} y1={620} x2={200 + 1520 * ease(c.f, 0, 18)} y2={620} stroke={c.pal.ink} strokeWidth={4} /></svg>
        {its.map((it: any, i: number) => <div key={i} style={{position: 'absolute', left: xs[i], top: 300, width: 320, transform: 'translateX(-50%)', textAlign: 'center',
          opacity: ease(c.f, 4 + i * 6, 12 + i * 6)}}>
          <div style={{...BIG, fontSize: 96, color: c.pal.ink}}>{it.year}</div>
          <div style={{fontFamily: SANS, fontSize: 28, lineHeight: 1.3, color: c.pal.ink, marginTop: 14, fontWeight: 600}}>{it.text}</div>
        </div>)}
      </>;
    },
    ball: (s, c) => {
      const n = Math.max(1, (s.items || []).slice(0, 5).length);
      const t = ease(c.f, 4, Math.max(10, c.dur - 4)) * (n - 1);
      const x = 260 + (t * 1400) / Math.max(1, n - 1);
      return {x, y: 620 - 26 - 90 * Math.abs(Math.sin(t * Math.PI)), r: 26};
    },
  },
  device: {
    render: (s, c) => {
      const a = sp(c.f, c.fps, 0, 90);
      return <>
        <div style={{position: 'absolute', left: 1220, top: 540, width: 470, height: 900, borderRadius: 70, background: c.pal.ink, transform: `translate(-50%,-50%) translateY(${(1 - a) * 300}px) rotate(${(1 - a) * 8}deg)`,
          padding: '120px 40px'}}>
          {(s.lines || []).slice(0, 3).map((l: string, i: number) => <div key={i} style={{background: c.pal.bg, color: c.pal.ink, borderRadius: 28, padding: '22px 26px', marginBottom: 22,
            fontFamily: SANS, fontWeight: 600, fontSize: 26, lineHeight: 1.3, opacity: ease(c.f, 10 + i * 8, 16 + i * 8), transform: `translateY(${(1 - ease(c.f, 10 + i * 8, 16 + i * 8)) * 30}px)`}}>{l}</div>)}
        </div>
        <div style={{position: 'absolute', left: 140, top: 400, ...BIG, fontSize: 96, color: c.pal.ink, width: 700}}>{s.app}</div>
        <div style={{position: 'absolute', left: 140, top: 340, ...SMALL, color: c.pal.ink, opacity: 0.7}}>Example</div>
      </>;
    },
    ball: (s, c) => ({x: 1220 + 190, y: 540 - 390, r: 22}),
  },
  footage: {
    render: (s, c) => {
      // the dot grows into a circular window that reveals the real footage, then fills the frame
      const r = interpolate(c.f, [0, 14, Math.max(15, c.dur - 1)], [30, 900, 1250], {extrapolateRight: 'clamp'});
      const m = s.media;
      return <>
        {m ? <AbsoluteFill style={{clipPath: `circle(${r}px at 960px 540px)`}}>
          {m.kind === 'video' ? <OffthreadVideo src={staticFile(m.src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            : <Img src={staticFile(m.src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.05 + 0.05 * ease(c.f, 0, c.dur)})`}} />}
        </AbsoluteFill> : <BigWords text={s.label || ''} c={c} size={150} y={400} />}
        {m && s.label ? <div style={{position: 'absolute', left: 140, bottom: 120, ...SMALL, fontSize: 26, color: '#fff', background: '#00000066', padding: '10px 16px', opacity: ease(c.f, 12, 20)}}>● {s.label}</div> : null}
      </>;
    },
    ball: (s, c) => ({x: 960, y: 540, r: s.media ? 0 : 26}),
  },
  agenda: {
    render: (s, c) => {
      const n = c.sections.length;
      const ms = c.marks && c.marks.length === n ? c.marks : c.sections.map((_, i) => Math.round(12 + ((c.dur - 12) * i) / n));
      let k = -1;
      for (let i = 0; i < n; i++) if (c.f >= ms[i]) k = i;
      const lf = k < 0 ? c.f : c.f - ms[k];
      const pal = k < 0 ? c.pal : SET_OF(c)[(c.idx + k + 1) % 4];
      const cc = {...c, f: lf, pal};
      return <AbsoluteFill style={{background: pal.bg}}>
        {k < 0 ? <BigWords text={c.p.title} c={cc} size={150} y={380} /> : <>
          <div style={{position: 'absolute', left: 140, top: 230, ...BIG, fontSize: 260, color: pal.ink, opacity: 0.18}}>{String(k + 1).padStart(2, '0')}</div>
          <BigWords key={k} text={c.sections[k]} c={cc} size={130} y={470} />
        </>}
        <div style={{position: 'absolute', left: 140, top: 110, ...SMALL, color: pal.ink, opacity: 0.75}}>In this episode</div>
      </AbsoluteFill>;
    },
    ball: (s, c) => ({x: 1700, y: 300, r: 26}),
  },
};
const SET_OF = (c: Ctx) => SETS[((c.p.look || 0) % SETS.length + SETS.length) % SETS.length];

const kindOf = (s: Shot) => (K[s.kind] ? s.kind : 'kinetic');

export const ColorBlockDoc: React.FC<DocProps> = (p) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tl = p.timeline;
  if (!tl) return <AbsoluteFill style={{background: '#ECE8DF'}} />;
  const set = SETS[((p.look || 0) % SETS.length + SETS.length) % SETS.length];
  const sections = p.segments.filter((s) => s.kind === 'chapter').map((s) => s.title);
  const items = tl.items;
  const shotOf = (it: TimelineItem) => p.segments[it.seg!].beats[it.beat!].shots[it.shot!];
  const ctxOf = (it: TimelineItem, i: number, lf: number): Ctx => ({f: lf, dur: it.dur, fps, pal: set[i % set.length], p, sections, marks: it.marks, idx: i});
  const ballOf = (it: TimelineItem, i: number, lf: number): Ball | null => {
    if (it.kind !== 'shot') return it.kind === 'thumb' ? {x: 1650, y: 820, r: 60} : {x: 960, y: 640, r: 26};
    const s = shotOf(it);
    return K[kindOf(s)].ball(s, ctxOf(it, i, lf));
  };
  const ci = items.findIndex((it) => f >= it.start && f < it.start + it.dur);
  const cur = items[Math.max(0, ci)];
  const lf = f - cur.start;
  let ball = ballOf(cur, ci, lf);
  if (ci > 0 && ball) { // the dot glides from where it was to where it needs to be: one continuous object across cuts
    const prev = items[ci - 1];
    const pb = ballOf(prev, ci - 1, prev.dur - 1);
    const t = spring({frame: lf, fps, config: {damping: 14, stiffness: 140}});
    if (pb) ball = {x: pb.x + (ball.x - pb.x) * t, y: pb.y + (ball.y - pb.y) * t, r: pb.r + (ball.r - pb.r) * t};
  }
  const pal = cur.kind === 'shot' ? set[ci % set.length] : set[0];
  const showBall = ball && ball.r > 0.5 && cur.kind !== 'thumb';
  const ballEl = showBall ? <div style={{position: 'absolute', left: ball!.x - ball!.r, top: ball!.y - ball!.r, width: ball!.r * 2, height: ball!.r * 2, borderRadius: '50%',
    background: pal.dot, pointerEvents: 'none'}} /> : null;
  return (
    // the colour field is the root; the travelling dot sits ON the field but UNDER each scene's text, so numbers read on top of it
    <AbsoluteFill style={{background: cur.kind === 'thumb' ? set[1].bg : cur.kind === 'outro' ? set[3].bg : pal.bg, overflow: 'hidden'}}>
      {ballEl}
      {items.map((it, i) => {
        let body: React.ReactNode = null;
        if (it.kind === 'thumb') body = <Thumb p={p} pal={set[1]} />;
        else if (it.kind === 'outro') body = <Outro p={p} pal={set[3]} />;
        else {
          const s = shotOf(it);
          body = <ShotFrame it={it} i={i} s={s} make={(lf2) => ctxOf(it, i, lf2)} />;
        }
        return <Sequence key={i} from={it.start} durationInFrames={it.dur}>{body}</Sequence>;
      })}
      <div style={{position: 'absolute', right: 120, top: 110, ...SMALL, color: pal.ink, opacity: cur.kind === 'shot' ? 0.6 : 0}}>T&I · {cur.seg !== undefined && p.segments[cur.seg].kind === 'chapter' ? String(sections.indexOf(p.segments[cur.seg].title) + 1).padStart(2, '0') : '00'}</div>
    </AbsoluteFill>
  );
};

const ShotFrame: React.FC<{it: TimelineItem; i: number; s: Shot; make: (lf: number) => Ctx}> = ({s, make}) => {
  const f = useCurrentFrame();
  return <>{K[kindOf(s)].render(s, make(f))}</>;
};

const Thumb: React.FC<{p: DocProps; pal: Pal}> = ({p, pal}) => {
  const h = p.thumb.headline || p.title;
  const hi = (p.thumb.highlight || '').toLowerCase();
  return (
    <AbsoluteFill style={{background: pal.bg}}>
      <div style={{position: 'absolute', left: 120, top: 110, ...SMALL, fontSize: 28, color: pal.ink}}>{p.thumb.kicker}</div>
      <div style={{position: 'absolute', left: 120, top: 250, width: 1500, ...BIG, fontSize: h.length > 40 ? 150 : 176, color: pal.ink}}>
        {words(h).map((w, i) => <span key={i} style={{color: hi && hi.includes(w.toLowerCase()) ? pal.dot : pal.ink, marginRight: 30, display: 'inline-block'}}>{w}</span>)}
      </div>
      <div style={{position: 'absolute', left: 1590, top: 760, width: 120, height: 120, borderRadius: '50%', background: pal.dot}} />
      <div style={{position: 'absolute', left: 120, bottom: 100, ...SMALL, fontSize: 26, color: pal.ink}}>T&I News · Tech Impact</div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{p: DocProps; pal: Pal}> = ({p, pal}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: pal.bg}}>
      <div style={{position: 'absolute', left: 140, top: 360, width: 1500, ...BIG, fontSize: 120, color: pal.ink, opacity: ease(f, 0, 10)}}>{p.outro.line || 'Technology with real impact.'}</div>
      <div style={{position: 'absolute', left: 140, top: 640, ...SMALL, fontSize: 30, color: pal.ink, opacity: ease(f, 10, 20)}}>Subscribe · tai.news</div>
    </AbsoluteFill>
  );
};
