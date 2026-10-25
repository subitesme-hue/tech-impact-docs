// Alternative animations for the Color Block engine, so the same kind of information is never shown the same way twice
// in one film. Each variant draws only from the shot's own data (its icons, labels and numbers come from the script, so
// the pictures stay tied to the topic: cars for robotaxis, wheat for farming, batteries for storage...).
import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile} from 'remotion';
import * as Lucide from 'lucide-react';
import {MONO, SANS} from '../theme';
import DOTS from '../components/dots.json';

export type Pal = {bg: string; ink: string; dot: string; soft: string};
export type VCtx = {f: number; dur: number; fps: number; pal: Pal};
const ease = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const easeOut = (f: number, a: number, b: number) => {
  const t = ease(f, a, b);
  return 1 - Math.pow(1 - t, 3);
};
const sp = (f: number, fps: number, delay = 0, stiff = 120, damping = 12) => spring({frame: f - delay, fps, config: {damping, stiffness: stiff, mass: 0.8}});
const Ico: React.FC<{name?: string; size: number; color: string; stroke?: number}> = ({name, size, color, stroke = 2.2}) => {
  const C = ((name && (Lucide as any)[name]) || (Lucide as any).Circle) as React.FC<any>;
  return <C size={size} color={color} strokeWidth={stroke} />;
};
const fmt = (n: number, d = 0) => n.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
const BIG: React.CSSProperties = {fontFamily: SANS, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.95};
const SMALL: React.CSSProperties = {fontFamily: MONO, fontSize: 22, letterSpacing: 3, textTransform: 'uppercase'};
const num = (v: any) => {
  const m = String(v ?? '').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};
const decOf = (s: any) => s.decimals ?? (Math.abs(s.value) < 10 && s.value % 1 ? 1 : 0);

type R = (s: any, c: VCtx) => React.ReactNode;

// ---------------- counter ----------------
const odometer: R = (s, c) => {
  // digits roll into place like a mechanical counter; the topic icon sits large beside it
  const txt = `${s.prefix || ''}${fmt(s.value, decOf(s))}${s.suffix || ''}`;
  return <>
    <div style={{position: 'absolute', left: 140, top: 250, opacity: easeOut(c.f, 0, 10)}}><Ico name={s.icon} size={150} color={c.pal.ink} stroke={1.6} /></div>
    <div style={{position: 'absolute', left: 140, top: 450, display: 'flex', overflow: 'hidden', height: 230}}>
      {txt.split('').map((ch, i) => {
        const p = easeOut(c.f, 2 + i * 2, 16 + i * 2);
        return <div key={i} style={{...BIG, fontSize: 220, lineHeight: 1.05, color: c.pal.ink, transform: `translateY(${(1 - p) * 110}%)`}}>{ch}</div>;
      })}
    </div>
    <div style={{position: 'absolute', left: 140, top: 720, width: 1500, ...BIG, fontSize: 54, color: c.pal.ink, opacity: easeOut(c.f, 12, 22)}}>{s.label}</div>
  </>;
};
const bar: R = (s, c) => {
  // a thick bar races across the frame; the number rides on its tip
  const p = easeOut(c.f, 4, Math.min(c.dur - 4, 34));
  const w = 1560 * p;
  return <>
    <div style={{position: 'absolute', left: 140, top: 250, width: 1600, ...BIG, fontSize: 70, color: c.pal.ink, opacity: easeOut(c.f, 0, 10)}}>{s.label}</div>
    <div style={{position: 'absolute', left: 140, top: 560, width: w, height: 150, background: c.pal.ink, borderRadius: 6}} />
    <div style={{position: 'absolute', left: 140 + Math.max(0, w - 520), top: 400, width: 520, textAlign: 'right', ...BIG, fontSize: 130, color: c.pal.ink}}>
      {s.prefix || ''}{fmt(s.value * p, decOf(s))}{s.suffix || ''}</div>
    {s.source ? <div style={{position: 'absolute', left: 140, bottom: 110, ...SMALL, color: c.pal.ink, opacity: 0.6}}>Source · {s.source}</div> : null}
  </>;
};
const pictogram: R = (s, c) => {
  // the topic's own icon repeated in a grid that fills in, with the figure set huge above it
  const n = 24;
  return <>
    <div style={{position: 'absolute', left: 140, top: 150, ...BIG, fontSize: 190, color: c.pal.ink, transform: `scale(${0.9 + 0.1 * sp(c.f, c.fps)})`, transformOrigin: 'left center'}}>
      {s.prefix || ''}{fmt(s.value, decOf(s))}{s.suffix || ''}</div>
    <div style={{position: 'absolute', left: 140, top: 360, width: 1600, ...BIG, fontSize: 50, color: c.pal.ink, opacity: easeOut(c.f, 8, 18)}}>{s.label}</div>
    <div style={{position: 'absolute', left: 140, top: 560, display: 'grid', gridTemplateColumns: 'repeat(12, 120px)', gap: 18}}>
      {Array.from({length: n}, (_, i) => <div key={i} style={{opacity: easeOut(c.f, 6 + i * 0.9, 12 + i * 0.9), transform: `translateY(${(1 - easeOut(c.f, 6 + i * 0.9, 12 + i * 0.9)) * 30}px)`}}>
        <Ico name={s.icon} size={84} color={i % 5 === 4 ? c.pal.dot : c.pal.ink} stroke={1.8} /></div>)}
    </div>
  </>;
};
const stamp: R = (s, c) => {
  // the number lands like a rubber stamp (overshoot + tilt), the label sits in a ribbon
  const a = sp(c.f, c.fps, 2, 220, 9);
  return <>
    <div style={{position: 'absolute', left: 960, top: 470, transform: `translate(-50%,-50%) scale(${2.2 - 1.2 * a}) rotate(${-8 + 3 * a}deg)`, opacity: Math.min(1, a * 2),
      ...BIG, fontSize: 250, color: c.pal.ink, border: `14px solid ${c.pal.ink}`, padding: '10px 60px 30px', borderRadius: 24}}>{s.prefix || ''}{fmt(s.value, decOf(s))}{s.suffix || ''}</div>
    <div style={{position: 'absolute', left: 960, top: 800, transform: `translateX(-50%) scaleX(${easeOut(c.f, 10, 18)})`, background: c.pal.ink, color: c.pal.bg, padding: '18px 36px',
      ...BIG, fontSize: 46, whiteSpace: 'nowrap'}}>{s.label}</div>
  </>;
};

// ---------------- compare ----------------
const split: R = (s, c) => {
  // the frame splits: left half is "before", right half floods in with the new colour
  const L = s.left || {}, Rr = s.right || {};
  const p = easeOut(c.f, 6, 18);
  return <>
    <div style={{position: 'absolute', left: 960, top: 0, width: 960, height: 1080, background: c.pal.ink, transform: `translateY(${(1 - p) * 100}%)`}} />
    {[L, Rr].map((it: any, i: number) => {
      const q = easeOut(c.f, 4 + i * 12, 16 + i * 12);
      return <div key={i} style={{position: 'absolute', left: i ? 1440 : 480, top: 540, transform: `translate(-50%,-50%) translateY(${(1 - q) * 40}px)`, opacity: q, textAlign: 'center', width: 800}}>
        <Ico name={it.icon} size={110} color={i ? c.pal.bg : c.pal.ink} />
        <div style={{...BIG, fontSize: 150, color: i ? c.pal.bg : c.pal.ink, marginTop: 20}}>{it.value}</div>
        <div style={{...SMALL, fontSize: 28, color: i ? c.pal.bg : c.pal.ink, marginTop: 20}}>{it.label}</div>
      </div>;
    })}
    {s.title ? <div style={{position: 'absolute', left: 140, top: 110, ...SMALL, color: c.pal.ink, opacity: 0.75}}>{s.title}</div> : null}
  </>;
};
const twinBars: R = (s, c) => {
  const L = s.left || {}, Rr = s.right || {};
  const a = num(L.value), b = num(Rr.value);
  const mx = Math.max(a || 1, b || 1);
  const ha = isFinite(a) ? (a / mx) * 560 : 300, hb = isFinite(b) ? (b / mx) * 560 : 520;
  return <>
    {s.title ? <div style={{position: 'absolute', left: 140, top: 140, ...BIG, fontSize: 70, color: c.pal.ink}}>{s.title}</div> : null}
    {[[L, ha, 700], [Rr, hb, 1160]].map(([it, h, x]: any, i: number) => {
      const p = easeOut(c.f, 4 + i * 8, 24 + i * 8);
      return <React.Fragment key={i}>
        <div style={{position: 'absolute', left: x, bottom: 200, width: 220, height: Math.max(8, h * p), background: i ? c.pal.dot : c.pal.ink, borderRadius: '10px 10px 0 0'}} />
        <div style={{position: 'absolute', left: x + 110, bottom: 220 + h * p, transform: 'translateX(-50%)', ...BIG, fontSize: 70, color: c.pal.ink, whiteSpace: 'nowrap'}}>{it.value}</div>
        <div style={{position: 'absolute', left: x + 110, bottom: 130, transform: 'translateX(-50%)', ...SMALL, fontSize: 24, color: c.pal.ink, whiteSpace: 'nowrap'}}>{it.label}</div>
      </React.Fragment>;
    })}
  </>;
};

// ---------------- chart ----------------
const chartBars: R = (s, c) => {
  const pts = (s.points || []).slice(0, 6);
  const max = Math.max(...pts.map((q: any) => q.value), 1);
  const bw = Math.min(200, 1300 / pts.length - 40);
  const u = s.unit && /^[a-z]{2,}/i.test(s.unit) ? ' ' + s.unit : s.unit || '';
  return <>
    <div style={{position: 'absolute', left: 140, top: 120, ...BIG, fontSize: 64, color: c.pal.ink}}>{s.title}</div>
    {pts.map((q: any, i: number) => {
      const p = easeOut(c.f, 4 + i * 5, 26 + i * 5);
      const h = (q.value / max) * 520 * p, x = 300 + (i * 1320) / Math.max(1, pts.length - 1 || 1) - bw / 2;
      return <React.Fragment key={i}>
        <div style={{position: 'absolute', left: x, bottom: 200, width: bw, height: Math.max(6, h), background: i === pts.length - 1 ? c.pal.dot : c.pal.ink}} />
        <div style={{position: 'absolute', left: x + bw / 2, bottom: 215 + h, transform: 'translateX(-50%)', ...BIG, fontSize: 48, color: c.pal.ink, whiteSpace: 'nowrap', opacity: p}}>{s.prefix || ''}{fmt(q.value, q.value % 1 ? 1 : 0)}{u}</div>
        <div style={{position: 'absolute', left: x + bw / 2, bottom: 140, transform: 'translateX(-50%)', ...SMALL, color: c.pal.ink, whiteSpace: 'nowrap'}}>{q.label}</div>
      </React.Fragment>;
    })}
  </>;
};
const chartArea: R = (s, c) => {
  const pts = (s.points || []).slice(0, 6);
  const max = Math.max(...pts.map((q: any) => q.value), 1);
  const X0 = 140, X1 = 1780, Y0 = 900, Y1 = 380;
  const x = (i: number) => X0 + ((X1 - X0) * i) / Math.max(1, pts.length - 1);
  const y = (v: number) => Y0 - ((Y0 - Y1) * v) / max;
  const p = easeOut(c.f, 2, Math.min(c.dur - 4, 36));
  const d = `M ${X0} ${Y0} ` + pts.map((q: any, i: number) => `L ${x(i)} ${Y0 - (Y0 - y(q.value)) * p}`).join(' ') + ` L ${x(pts.length - 1)} ${Y0} Z`;
  const last = pts[pts.length - 1] || {value: 0};
  return <>
    <svg width={1920} height={1080} style={{position: 'absolute'}}><path d={d} fill={c.pal.ink} /></svg>
    <div style={{position: 'absolute', left: 140, top: 120, ...BIG, fontSize: 64, color: c.pal.ink}}>{s.title}</div>
    <div style={{position: 'absolute', right: 140, top: 230, ...BIG, fontSize: 150, color: c.pal.ink, opacity: p}}>{s.prefix || ''}{fmt(last.value * p, last.value % 1 ? 1 : 0)}{s.unit || ''}</div>
    {pts.map((q: any, i: number) => <div key={i} style={{position: 'absolute', left: x(i), top: Y0 + 30, transform: 'translateX(-50%)', ...SMALL, color: c.pal.ink}}>{q.label}</div>)}
  </>;
};

// ---------------- flow ----------------
const track: R = (s, c) => {
  // a road with stops; the topic's mover icon (car, drone, package...) drives through each stop
  const ns = (s.nodes || []).slice(0, 4);
  const xs = ns.map((_: any, i: number) => 260 + (i * 1400) / Math.max(1, ns.length - 1));
  const t = easeOut(c.f, 6, Math.max(10, c.dur - 6)) * (ns.length - 1);
  const mx = 260 + (t * 1400) / Math.max(1, ns.length - 1);
  return <>
    {s.label ? <div style={{position: 'absolute', left: 140, top: 140, ...BIG, fontSize: 70, color: c.pal.ink}}>{s.label}</div> : null}
    <div style={{position: 'absolute', left: 200, top: 600, width: 1520, height: 70, background: c.pal.ink, borderRadius: 35}} />
    <div style={{position: 'absolute', left: 240, top: 632, width: 1440, height: 6, backgroundImage: `repeating-linear-gradient(90deg, ${c.pal.bg} 0 40px, transparent 40px 80px)`}} />
    {ns.map((n: any, i: number) => <div key={i} style={{position: 'absolute', left: xs[i], top: 420, transform: 'translateX(-50%)', textAlign: 'center', width: 360,
      opacity: easeOut(c.f, i * 5, 8 + i * 5)}}>
      <Ico name={n.icon} size={80} color={t >= i - 0.05 ? c.pal.dot : c.pal.ink} />
      <div style={{...BIG, fontSize: 38, color: c.pal.ink, marginTop: 10}}>{n.label}</div>
    </div>)}
    <div style={{position: 'absolute', left: mx, top: 635, transform: 'translate(-50%,-100%)'}}><Ico name={s.mover || ns[0]?.icon} size={110} color={c.pal.ink} stroke={2} /></div>
  </>;
};
const cards: R = (s, c) => {
  // big cards slide in one after another and stack, like a process being dealt out
  const ns = (s.nodes || s.items || []).slice(0, 4);
  const per = Math.max(6, (c.dur - 8) / ns.length);
  return <>
    {s.label ? <div style={{position: 'absolute', left: 140, top: 120, ...BIG, fontSize: 64, color: c.pal.ink}}>{s.label}</div> : null}
    {ns.map((n: any, i: number) => {
      const a = sp(c.f, c.fps, i * per, 140, 14);
      return <div key={i} style={{position: 'absolute', left: 160 + i * 420, top: 330 + i * 40, width: 380, height: 440, borderRadius: 28, background: i % 2 ? c.pal.ink : c.pal.dot,
        transform: `translateX(${(1 - a) * 900}px) rotate(${(1 - a) * 10}deg)`, padding: 36, boxShadow: '0 30px 60px rgba(0,0,0,0.2)'}}>
        <div style={{...BIG, fontSize: 90, color: i % 2 ? c.pal.bg : c.pal.ink, opacity: 0.35}}>{String(i + 1).padStart(2, '0')}</div>
        <div style={{marginTop: 30}}><Ico name={n.icon} size={90} color={i % 2 ? c.pal.bg : c.pal.ink} /></div>
        <div style={{...BIG, fontSize: 44, color: i % 2 ? c.pal.bg : c.pal.ink, marginTop: 30}}>{n.label}</div>
      </div>;
    })}
  </>;
};

// ---------------- icons ----------------
const tiles: R = (s, c) => {
  const its = (s.items || []).slice(0, 4);
  const per = Math.max(5, (c.dur - 10) / its.length);
  return <>
    {s.title ? <div style={{position: 'absolute', left: 140, top: 110, ...BIG, fontSize: 72, color: c.pal.ink}}>{s.title}</div> : null}
    {its.map((it: any, i: number) => {
      const a = easeOut(c.f, 4 + i * per, 14 + i * per);
      const col = i % 2, row = Math.floor(i / 2);
      return <div key={i} style={{position: 'absolute', left: 140 + col * 840, top: 280 + row * 360, width: 800, height: 320, borderRadius: 30, background: c.pal.ink,
        transform: `perspective(1200px) rotateX(${(1 - a) * 90}deg)`, transformOrigin: 'top', display: 'flex', alignItems: 'center', gap: 40, padding: '0 50px'}}>
        <Ico name={it.icon} size={120} color={c.pal.dot} />
        <div style={{...BIG, fontSize: 56, color: c.pal.bg}}>{it.label}</div>
      </div>;
    })}
  </>;
};
const list: R = (s, c) => {
  const its = (s.items || []).slice(0, 4);
  const per = Math.max(5, (c.dur - 10) / its.length);
  const y0 = 600 - its.length * 105; // block sits in the middle of the frame, not hanging from the top
  return <>
    {s.title ? <div style={{position: 'absolute', left: 140, top: y0 - 90, ...SMALL, fontSize: 28, color: c.pal.ink}}>{s.title}</div> : null}
    {its.map((it: any, i: number) => {
      const a = easeOut(c.f, 3 + i * per, 13 + i * per);
      return <div key={i} style={{position: 'absolute', left: 140, top: y0 + i * 210, display: 'flex', alignItems: 'center', gap: 40, opacity: a, transform: `translateX(${(1 - a) * -120}px)`}}>
        <Ico name={it.icon} size={96} color={c.pal.ink} />
        <div style={{...BIG, fontSize: 104, color: c.pal.ink, borderBottom: `8px solid ${c.pal.dot}`, paddingBottom: 6}}>{it.label}</div>
      </div>;
    })}
  </>;
};

// ---------------- network ----------------
const orbit: R = (s, c) => {
  const ns = (s.nodes || []).slice(0, 6);
  const rot = c.f * 0.6;
  return <>
    <div style={{position: 'absolute', left: 960, top: 540, transform: 'translate(-50%,-50%)', width: 860, height: 860, borderRadius: '50%', border: `3px dashed ${c.pal.ink}`, opacity: 0.35}} />
    <div style={{position: 'absolute', left: 960, top: 540, transform: 'translate(-50%,-50%)', textAlign: 'center', width: 520}}>
      <Ico name={s.center?.icon} size={130} color={c.pal.ink} />
      <div style={{...BIG, fontSize: 60, color: c.pal.ink, marginTop: 16}}>{s.center?.label}</div>
    </div>
    {ns.map((n: any, i: number) => {
      const a = ((i / ns.length) * 360 + rot) * Math.PI / 180;
      const x = 960 + Math.cos(a) * 430, y = 540 + Math.sin(a) * 430;
      const q = easeOut(c.f, 4 + i * 3, 12 + i * 3);
      return <div key={i} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${q})`, background: c.pal.ink, color: c.pal.bg, borderRadius: 40,
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14, ...BIG, fontSize: 32, whiteSpace: 'nowrap'}}><Ico name={n.icon} size={40} color={c.pal.dot} />{n.label}</div>;
    })}
  </>;
};

// ---------------- steps ----------------
const stairs: R = (s, c) => {
  const its = (s.items || []).slice(0, 4);
  const per = Math.max(6, (c.dur - 8) / its.length);
  return <>{its.map((it: any, i: number) => {
    const a = easeOut(c.f, i * per, 10 + i * per);
    const h = 180 + i * 150;
    return <div key={i} style={{position: 'absolute', left: 180 + i * 400, bottom: 120, width: 380, height: h * a, background: i === its.length - 1 ? c.pal.dot : c.pal.ink,
      borderRadius: '16px 16px 0 0', padding: 30, overflow: 'hidden'}}>
      <Ico name={it.icon} size={70} color={i === its.length - 1 ? c.pal.ink : c.pal.bg} />
      <div style={{...BIG, fontSize: 40, color: i === its.length - 1 ? c.pal.ink : c.pal.bg, marginTop: 16}}>{it.label}</div>
    </div>;
  })}</>;
};

// ---------------- timeline ----------------
const flipCards: R = (s, c) => {
  const its = (s.items || []).slice(0, 5);
  const per = Math.max(6, (c.dur - 6) / its.length);
  const k = Math.min(its.length - 1, Math.floor(c.f / per));
  const lf = c.f - k * per;
  const it = its[k] || {};
  return <>
    <div style={{position: 'absolute', left: 140, top: 180, ...BIG, fontSize: 300, color: c.pal.ink, transform: `perspective(1400px) rotateX(${(1 - easeOut(lf, 0, 8)) * -80}deg)`, transformOrigin: 'top'}}>{it.year}</div>
    <div style={{position: 'absolute', left: 140, top: 560, width: 1500, ...BIG, fontSize: 70, color: c.pal.ink, opacity: easeOut(lf, 4, 12)}}>{it.text}</div>
    <div style={{position: 'absolute', left: 140, bottom: 140, display: 'flex', gap: 14}}>{its.map((_: any, i: number) => <div key={i} style={{width: i === k ? 90 : 40, height: 8, background: i <= k ? c.pal.dot : c.pal.soft}} />)}</div>
  </>;
};

// ---------------- units ----------------
const bar100: R = (s, c) => {
  const T = s.total || 100, pct = (s.highlight / T) * 100;
  const p = easeOut(c.f, 4, Math.min(c.dur - 4, 34));
  return <>
    <div style={{position: 'absolute', left: 140, top: 200, ...BIG, fontSize: 260, color: c.pal.ink}}>{Math.round(pct * p)}%</div>
    <div style={{position: 'absolute', left: 140, top: 520, width: 1640, height: 120, background: c.pal.soft, borderRadius: 60, overflow: 'hidden'}}>
      <div style={{width: `${pct * p}%`, height: '100%', background: c.pal.dot}} />
    </div>
    <div style={{position: 'absolute', left: 140, top: 700, width: 1600, ...BIG, fontSize: 60, color: c.pal.ink, opacity: easeOut(c.f, 10, 20)}}>{s.label}</div>
  </>;
};

// ---------------- globe ----------------
const radar: R = (s, c) => {
  const name = s.label || (s.points && s.points[0]?.name) || s.region;
  return <>
    {[0, 1, 2, 3].map((i) => {
      const t = ((c.f + i * 15) % 60) / 60;
      return <div key={i} style={{position: 'absolute', left: 1300, top: 540, width: 80 + t * 900, height: 80 + t * 900, transform: 'translate(-50%,-50%)', borderRadius: '50%',
        border: `4px solid ${c.pal.ink}`, opacity: 1 - t}} />;
    })}
    <div style={{position: 'absolute', left: 1300, top: 540, transform: 'translate(-50%,-50%)'}}><Ico name="MapPin" size={120} color={c.pal.dot} stroke={2.4} /></div>
    <div style={{position: 'absolute', left: 140, top: 380, width: 760, ...BIG, fontSize: 110, color: c.pal.ink, opacity: easeOut(c.f, 4, 14)}}>{name}</div>
    <div style={{position: 'absolute', left: 140, top: 320, ...SMALL, color: c.pal.ink, opacity: 0.7}}>{s.focus ? `${Number(s.focus.lat).toFixed(2)}° · ${Number(s.focus.lon).toFixed(2)}°` : ''}</div>
  </>;
};

// ---------------- kinetic ----------------
const typewriter: R = (s, c) => {
  const t = String(s.text || '');
  const n = Math.round(t.length * easeOut(c.f, 0, Math.min(c.dur * 0.6, 28)));
  return <div style={{position: 'absolute', left: 140, top: 380, width: 1640, ...BIG, fontSize: 140, color: c.pal.ink}}>
    {t.slice(0, n)}<span style={{display: 'inline-block', width: 18, height: 130, background: c.pal.dot, marginLeft: 8, verticalAlign: '-0.1em', opacity: Math.floor(c.f / 7) % 2 ? 0.2 : 1}} />
  </div>;
};
const stack: R = (s, c) => {
  const ws = String(s.text || '').split(/\s+/).filter(Boolean).slice(0, 6);
  const em = String(s.emphasis || '').toLowerCase();
  const size = ws.length > 4 ? 140 : 180;
  return <div style={{position: 'absolute', left: 140, top: 540 - (ws.length * size * 0.95) / 2, transform: `scale(${1 + 0.06 * ease(c.f, 0, c.dur)})`, transformOrigin: '0% 50%'}}>
    {ws.map((w, i) => {
      const a = sp(c.f, c.fps, i * 3, 160);
      const hot = em && em.includes(w.toLowerCase().replace(/[^a-z0-9]/g, ''));
      return <div key={i} style={{...BIG, fontSize: size, color: hot ? c.pal.dot : c.pal.ink, transform: `scaleY(${a})`, transformOrigin: 'bottom', height: size * 0.95}}>{w}</div>;
    })}
  </div>;
};

// ---------------- footage ----------------
const slide: R = (s, c) => {
  const m = s.media;
  const a = easeOut(c.f, 0, 10);
  if (!m) return null;
  return <>
    <AbsoluteFill style={{transform: `translateX(${(1 - a) * 100}%)`}}>
      {m.kind === 'video' ? <OffthreadVideo src={staticFile(m.src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        : <Img src={staticFile(m.src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.05 + 0.05 * ease(c.f, 0, c.dur)})`}} />}
    </AbsoluteFill>
    {s.label ? <div style={{position: 'absolute', left: 0, bottom: 120, background: c.pal.dot, color: c.pal.ink, padding: '16px 40px 16px 140px', ...BIG, fontSize: 44,
      transform: `translateX(${(1 - easeOut(c.f, 8, 16)) * -100}%)`}}>{s.label}</div> : null}
  </>;
};
const frame: R = (s, c) => {
  const m = s.media;
  if (!m) return null;
  const a = sp(c.f, c.fps, 0, 90, 14);
  return <>
    <div style={{position: 'absolute', left: 960, top: 540, width: 1500, height: 844, transform: `translate(-50%,-50%) scale(${0.6 + 0.4 * a}) rotate(${(1 - a) * -6}deg)`, borderRadius: 36,
      overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,0.35)'}}>
      {m.kind === 'video' ? <OffthreadVideo src={staticFile(m.src)} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        : <Img src={staticFile(m.src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />}
    </div>
    {s.label ? <div style={{position: 'absolute', left: 210, top: 80, ...SMALL, fontSize: 26, color: c.pal.ink, opacity: easeOut(c.f, 8, 16)}}>● {s.label}</div> : null}
  </>;
};


// ---------------- more variants (so a film with several maps / charts / lists still never repeats one) ----------------
const flatmap: R = (s, c) => {
  // the whole world as a dot field; the place lights up and the frame drifts toward it
  const lat = Number(s.focus?.lat ?? s.points?.[0]?.lat ?? 0), lon = Number(s.focus?.lon ?? s.points?.[0]?.lon ?? 0);
  const px = 960 + lon * (1920 / 360), py = 600 - lat * (1920 / 360);
  const z = 1 + 0.9 * easeOut(c.f, 0, Math.max(10, c.dur - 4));
  const name = s.label || (s.points && s.points[0]?.name) || s.region;
  return <>
    <div style={{position: 'absolute', inset: 0, transform: `scale(${z})`, transformOrigin: `${px}px ${py}px`}}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {(DOTS as any[]).map((d, i) => <circle key={i} cx={d[0]} cy={d[1]} r={3.2} fill={c.pal.ink} opacity={0.35} />)}
        <circle cx={px} cy={py} r={14} fill={c.pal.dot} />
        <circle cx={px} cy={py} r={14 + 40 * ((c.f % 30) / 30)} fill="none" stroke={c.pal.dot} strokeWidth={4} opacity={1 - (c.f % 30) / 30} />
      </svg>
    </div>
    <div style={{position: 'absolute', left: 140, bottom: 140, background: c.pal.ink, color: c.pal.bg, padding: '18px 34px', ...BIG, fontSize: 60, opacity: easeOut(c.f, 6, 14)}}>{name}</div>
  </>;
};
const jump: R = (s, c) => {
  // first value -> last value, set as one huge statement with the growth factor
  const pts = (s.points || []);
  const a = pts[0] || {value: 0, label: ''}, b = pts[pts.length - 1] || a;
  const u = s.unit && /^[a-z]{2,}/i.test(s.unit) ? ' ' + s.unit : s.unit || '';
  const x = a.value ? b.value / a.value : 0;
  const q = easeOut(c.f, 10, 22);
  // 1,000K reads as 1M
  const show = (v: number) => (/^k$/i.test(String(s.unit || '').trim()) && v >= 1000 ? `${s.prefix || ''}${fmt(v / 1000, v % 1000 ? 1 : 0)}M` : `${s.prefix || ''}${fmt(v, v % 1 ? 1 : 0)}${u}`);
  return <>
    <div style={{position: 'absolute', left: 140, top: 140, ...SMALL, fontSize: 28, color: c.pal.ink}}>{s.title}</div>
    <div style={{position: 'absolute', left: 140, top: 300, ...BIG, fontSize: 150, color: c.pal.ink, opacity: 0.4}}>{show(a.value)}</div>
    <div style={{position: 'absolute', left: 140, top: 270 + 190, ...SMALL, color: c.pal.ink}}>{a.label}</div>
    <div style={{position: 'absolute', left: 140 + 760 * q, top: 600, ...BIG, fontSize: 200, color: c.pal.ink, opacity: q}}>{show(b.value)}</div>
    <div style={{position: 'absolute', left: 140 + 760 * q, top: 820, ...SMALL, color: c.pal.ink, opacity: q}}>{b.label}</div>
    {x >= 1.5 ? <div style={{position: 'absolute', right: 140, top: 300, ...BIG, fontSize: 120, color: c.pal.dot, opacity: easeOut(c.f, 18, 26)}}>×{fmt(x, x < 10 ? 1 : 0)}</div> : null}
  </>;
};
const tree: R = (s, c) => {
  const ns = (s.nodes || []).slice(0, 6);
  const xs = ns.map((_: any, i: number) => 960 - ((ns.length - 1) * 290) / 2 + i * 290);
  return <>
    <div style={{position: 'absolute', left: 960, top: 180, transform: 'translateX(-50%)', background: c.pal.ink, color: c.pal.bg, padding: '24px 44px', borderRadius: 20, ...BIG, fontSize: 60,
      display: 'flex', alignItems: 'center', gap: 20, whiteSpace: 'nowrap'}}><Ico name={s.center?.icon} size={60} color={c.pal.dot} />{s.center?.label}</div>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {xs.map((x: number, i: number) => <path key={i} d={`M 960 300 C 960 420, ${x} 420, ${x} ${300 + 250 * easeOut(c.f, 4 + i * 3, 14 + i * 3)}`} fill="none" stroke={c.pal.ink} strokeWidth={4} />)}
    </svg>
    {ns.map((n: any, i: number) => <div key={i} style={{position: 'absolute', left: xs[i], top: 580, transform: 'translateX(-50%)', textAlign: 'center', width: 260,
      opacity: easeOut(c.f, 10 + i * 3, 18 + i * 3)}}>
      <Ico name={n.icon} size={74} color={c.pal.ink} />
      <div style={{...BIG, fontSize: 36, color: c.pal.ink, marginTop: 12}}>{n.label}</div>
    </div>)}
  </>;
};
const chips: R = (s, c) => {
  const its = (s.items || []).slice(0, 4);
  const per = Math.max(5, (c.dur - 10) / its.length);
  return <>
    {s.title ? <div style={{position: 'absolute', left: 140, top: 250, ...BIG, fontSize: 130, color: c.pal.ink}}>{s.title}</div> : null}
    <div style={{position: 'absolute', left: 140, top: s.title ? 520 : 420, width: 1640, display: 'flex', flexWrap: 'wrap', gap: 26}}>
      {its.map((it: any, i: number) => {
        const a = sp(c.f, c.fps, 4 + i * per, 200, 12);
        return <div key={i} style={{display: 'flex', alignItems: 'center', gap: 20, background: i % 2 ? c.pal.dot : c.pal.ink, color: i % 2 ? c.pal.ink : c.pal.bg, borderRadius: 80,
          padding: '26px 44px', ...BIG, fontSize: 54, transform: `scale(${a})`}}><Ico name={it.icon} size={56} color={i % 2 ? c.pal.ink : c.pal.bg} />{it.label}</div>;
      })}
    </div>
  </>;
};
const toasts: R = (s, c) => {
  // the app's messages pop in as notifications over a blurred field (no phone drawn)
  const ls = (s.lines || []).slice(0, 3);
  return <>
    <div style={{position: 'absolute', left: 140, top: 160, ...SMALL, fontSize: 26, color: c.pal.ink, opacity: 0.7}}>Example · {s.app}</div>
    {ls.map((l: string, i: number) => {
      const a = sp(c.f, c.fps, 4 + i * 10, 170, 13);
      return <div key={i} style={{position: 'absolute', left: 300 + i * 120, top: 280 + i * 210, width: 1200, background: '#fff', color: '#111', borderRadius: 34, padding: '30px 40px',
        boxShadow: '0 30px 60px rgba(0,0,0,0.25)', display: 'flex', gap: 28, alignItems: 'center', transform: `translateY(${(1 - a) * -80}px) scale(${0.9 + 0.1 * a})`, opacity: Math.min(1, a * 1.5)}}>
        <div style={{width: 72, height: 72, borderRadius: 18, background: c.pal.dot, flexShrink: 0}} />
        <div><div style={{...SMALL, fontSize: 20, color: '#666'}}>{s.app} · now</div><div style={{fontFamily: SANS, fontWeight: 600, fontSize: 36, marginTop: 6}}>{l}</div></div>
      </div>;
    })}
  </>;
};

// ---------------- third set: enough distinct animations that a 40-shot film never needs to repeat one ----------------
const Media: React.FC<{m: any; style?: React.CSSProperties}> = ({m, style}) => m.kind === 'video'
  ? <OffthreadVideo src={staticFile(m.src)} muted style={{width: '100%', height: '100%', objectFit: 'cover', ...style}} />
  : <Img src={staticFile(m.src)} style={{width: '100%', height: '100%', objectFit: 'cover', ...style}} />;
const giant: R = (s, c) => {
  // the number fills the frame edge to edge and slowly drifts; the label slides under it
  const txt = `${s.prefix || ''}${fmt(s.value, decOf(s))}${s.suffix || ''}`;
  const a = sp(c.f, c.fps, 0, 110, 15);
  return <>
    <div style={{position: 'absolute', left: 80 - 60 * ease(c.f, 0, c.dur), top: 160, ...BIG, fontSize: Math.min(560, 2600 / Math.max(3, txt.length)), color: c.pal.ink,
      transform: `translateY(${(1 - a) * 300}px)`, whiteSpace: 'nowrap'}}>{txt}</div>
    <div style={{position: 'absolute', left: 140, bottom: 170, width: 1500, ...BIG, fontSize: 56, color: c.pal.ink, opacity: easeOut(c.f, 10, 20),
      transform: `translateX(${(1 - easeOut(c.f, 10, 20)) * 80}px)`}}>{s.label}</div>
  </>;
};
const blinds: R = (s, c) => {
  // footage revealed through vertical strips that open one after another
  const m = s.media; if (!m) return null;
  const N = 8;
  return <>
    {Array.from({length: N}).map((_, i) => {
      const a = easeOut(c.f, i * 1.5, i * 1.5 + 12);
      return <div key={i} style={{position: 'absolute', left: (1920 / N) * i, top: 0, width: 1920 / N + 1, height: 1080, overflow: 'hidden', clipPath: `inset(${(1 - a) * 50}% 0 ${(1 - a) * 50}% 0)`}}>
        <div style={{position: 'absolute', left: -(1920 / N) * i, top: 0, width: 1920, height: 1080}}><Media m={m} /></div>
      </div>;
    })}
    {s.label ? <div style={{position: 'absolute', right: 120, bottom: 110, ...SMALL, fontSize: 28, color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '12px 22px',
      opacity: easeOut(c.f, 14, 22)}}>{s.label}</div> : null}
  </>;
};
const duo: R = (s, c) => {
  // split screen: footage on the right, a solid colour panel with the place name on the left
  const m = s.media; if (!m) return null;
  const a = easeOut(c.f, 0, 14);
  return <>
    <div style={{position: 'absolute', left: 1920 - 1150 * a, top: 0, width: 1150, height: 1080, overflow: 'hidden'}}><Media m={m} /></div>
    <div style={{position: 'absolute', left: 120, top: 380, width: 560, ...BIG, fontSize: 70, color: c.pal.ink, opacity: easeOut(c.f, 8, 18)}}>{s.label || s.region}</div>
    <div style={{position: 'absolute', left: 120, top: 330, width: 120 * easeOut(c.f, 4, 14), height: 10, background: c.pal.dot}} />
  </>;
};
const grid: R = (s, c) => {
  // the network as a grid of tiles that switch on and link up to the centre tile
  const ns = (s.nodes || []).slice(0, 8);
  const pos = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
  const X = (i: number) => 560 + i * 400, Y = (j: number) => 140 + j * 290;
  return <>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {ns.map((_: any, i: number) => { const [a, b] = pos[i]; const q = easeOut(c.f, 10 + i * 2, 20 + i * 2);
        return <line key={i} x1={X(1) + 140} y1={Y(1) + 110} x2={X(1) + 140 + (X(a) - X(1)) * q} y2={Y(1) + 110 + (Y(b) - Y(1)) * q} stroke={c.pal.ink} strokeWidth={4} strokeDasharray="10 10" />; })}
    </svg>
    <div style={{position: 'absolute', left: X(1), top: Y(1), width: 280, height: 220, background: c.pal.ink, borderRadius: 20, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12, transform: `scale(${sp(c.f, c.fps, 0, 150, 12)})`}}>
      <Ico name={s.center?.icon} size={70} color={c.pal.dot} /><div style={{...BIG, fontSize: 34, color: c.pal.bg, textAlign: 'center'}}>{s.center?.label}</div></div>
    {ns.map((n: any, i: number) => { const [a, b] = pos[i]; const q = sp(c.f, c.fps, 6 + i * 3, 160, 13);
      return <div key={i} style={{position: 'absolute', left: X(a), top: Y(b), width: 280, height: 220, background: c.pal.bg, border: `4px solid ${c.pal.ink}`, borderRadius: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, transform: `scale(${q})`}}>
        <Ico name={n.icon} size={60} color={c.pal.ink} /><div style={{...BIG, fontSize: 30, color: c.pal.ink, textAlign: 'center'}}>{n.label}</div></div>; })}
  </>;
};
const chevrons: R = (s, c) => {
  // the process as one long arrow of chevron segments that fill in left to right
  const ns = (s.nodes || []).slice(0, 4);
  const w = 1640 / Math.max(1, ns.length);
  return <>
    {s.label ? <div style={{position: 'absolute', left: 140, top: 180, ...BIG, fontSize: 64, color: c.pal.ink}}>{s.label}</div> : null}
    {ns.map((n: any, i: number) => { const q = easeOut(c.f, 4 + i * 8, 14 + i * 8);
      return <div key={i} style={{position: 'absolute', left: 140 + i * w, top: 420, width: w + 40, height: 300, background: i % 2 ? c.pal.ink : c.pal.dot,
        clipPath: 'polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%, 12% 50%)', opacity: q, transform: `translateX(${(1 - q) * -60}px)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18}}>
        <Ico name={n.icon} size={64} color={i % 2 ? c.pal.bg : c.pal.ink} /><div style={{...BIG, fontSize: 38, color: i % 2 ? c.pal.bg : c.pal.ink, maxWidth: w - 180}}>{n.label}</div></div>; })}
  </>;
};
const checklist: R = (s, c) => {
  // each step is ticked off as the narrator reaches it
  const its = (s.items || []).slice(0, 4);
  const per = Math.max(6, (c.dur - 8) / its.length);
  return <>
    {s.title ? <div style={{position: 'absolute', left: 160, top: 130, ...BIG, fontSize: 70, color: c.pal.ink}}>{s.title}</div> : null}
    {its.map((it: any, i: number) => { const q = easeOut(c.f, 4 + i * per, 10 + i * per); const t = easeOut(c.f, 8 + i * per, 14 + i * per);
      return <div key={i} style={{position: 'absolute', left: 160, top: 300 + i * 165, display: 'flex', alignItems: 'center', gap: 40, opacity: 0.25 + 0.75 * q}}>
        <svg width={96} height={96}><rect x={4} y={4} width={88} height={88} rx={16} fill={t > 0 ? c.pal.dot : 'none'} stroke={c.pal.ink} strokeWidth={5} />
          <path d="M 24 50 L 42 68 L 74 30" fill="none" stroke={c.pal.ink} strokeWidth={9} strokeLinecap="round" strokeDasharray={80} strokeDashoffset={80 * (1 - t)} /></svg>
        <div style={{...BIG, fontSize: 58, color: c.pal.ink}}>{it.label}</div></div>; })}
  </>;
};
const ring: R = (s, c) => {
  // icons arranged round a ring that turns a quarter as each one lights up
  const its = (s.items || []).slice(0, 5);
  const rot = -90 * easeOut(c.f, 0, c.dur);
  return <>
    {s.title ? <div style={{position: 'absolute', left: 960, top: 540, transform: 'translate(-50%,-50%)', width: 520, textAlign: 'center', ...BIG, fontSize: 60, color: c.pal.ink}}>{s.title}</div> : null}
    <svg width={1920} height={1080} style={{position: 'absolute'}}><circle cx={960} cy={540} r={380} fill="none" stroke={c.pal.ink} strokeWidth={3}
      strokeDasharray={2 * Math.PI * 380} strokeDashoffset={2 * Math.PI * 380 * (1 - easeOut(c.f, 0, 18))} /></svg>
    {its.map((it: any, i: number) => { const a = ((i / its.length) * 360 + rot - 90) * Math.PI / 180; const q = sp(c.f, c.fps, 8 + i * 5, 160, 12);
      return <div key={i} style={{position: 'absolute', left: 960 + 380 * Math.cos(a), top: 540 + 380 * Math.sin(a), transform: `translate(-50%,-50%) scale(${q})`, textAlign: 'center'}}>
        <div style={{width: 150, height: 150, borderRadius: 75, background: c.pal.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'}}>
          <Ico name={it.icon} size={72} color={c.pal.ink} /></div>
        <div style={{...BIG, fontSize: 32, color: c.pal.ink, marginTop: 10, width: 300}}>{it.label}</div></div>; })}
  </>;
};
const postcard: R = (s, c) => {
  // a postcard with the place name and its coordinates drops in and lands at an angle
  const lat = Number(s.focus?.lat ?? s.points?.[0]?.lat ?? 0), lon = Number(s.focus?.lon ?? s.points?.[0]?.lon ?? 0);
  const name = s.label || (s.points && s.points[0]?.name) || s.region;
  const a = sp(c.f, c.fps, 0, 90, 13);
  return <div style={{position: 'absolute', left: 960, top: 540, width: 1200, height: 680, transform: `translate(-50%,-50%) translateY(${(1 - a) * -900}px) rotate(${-4 + (1 - a) * 12}deg)`,
    background: c.pal.bg, border: `6px solid ${c.pal.ink}`, borderRadius: 18, boxShadow: '0 40px 80px rgba(0,0,0,0.3)', padding: 70}}>
    <div style={{...SMALL, fontSize: 28, color: c.pal.ink}}>Greetings from</div>
    <div style={{...BIG, fontSize: 130, color: c.pal.ink, marginTop: 30}}>{name}</div>
    <div style={{position: 'absolute', left: 70, bottom: 70, ...SMALL, fontSize: 30, color: c.pal.ink}}>{Math.abs(lat).toFixed(2)}°{lat >= 0 ? 'N' : 'S'} · {Math.abs(lon).toFixed(2)}°{lon >= 0 ? 'E' : 'W'}</div>
    <div style={{position: 'absolute', right: 70, top: 70, width: 150, height: 180, border: `5px dashed ${c.pal.ink}`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{width: 80, height: 80, borderRadius: 40, background: c.pal.dot, transform: `scale(${sp(c.f, c.fps, 14, 200, 10)})`}} /></div>
  </div>;
};
const dotplot: R = (s, c) => {
  // each value is a column of dots that stack up; the last column is highlighted
  const pts = (s.points || []).slice(0, 6);
  const max = Math.max(...pts.map((q: any) => q.value), 1);
  const u = s.unit && /^[a-z]{2,}/i.test(s.unit) ? ' ' + s.unit : s.unit || '';
  const colW = 1400 / Math.max(1, pts.length);
  return <>
    <div style={{position: 'absolute', left: 140, top: 110, ...BIG, fontSize: 56, color: c.pal.ink}}>{s.title}</div>
    {pts.map((q: any, i: number) => { const n = Math.max(1, Math.round((q.value / max) * 12)); const shown = Math.ceil(n * easeOut(c.f, 4 + i * 4, 24 + i * 4));
      const hot = i === pts.length - 1;
      return <div key={i}>
        {Array.from({length: shown}).map((_, j) => <div key={j} style={{position: 'absolute', left: 260 + i * colW, top: 860 - j * 48, width: 38, height: 38, borderRadius: 19, background: hot ? c.pal.dot : c.pal.ink}} />)}
        <div style={{position: 'absolute', left: 230 + i * colW, top: 900, ...SMALL, color: c.pal.ink}}>{q.label}</div>
        <div style={{position: 'absolute', left: 230 + i * colW, top: 860 - n * 48 - 20, ...BIG, fontSize: 40, color: c.pal.ink, opacity: easeOut(c.f, 20 + i * 4, 28 + i * 4)}}>
          {s.prefix || ''}{fmt(q.value, q.value % 1 ? 1 : 0)}{u}</div>
      </div>; })}
  </>;
};

const marquee: R = (s, c) => {
  // the items travel past as one big band of icon + word, like a train of ideas
  const its = (s.items || []).slice(0, 5);
  const x = 1920 - (1920 + its.length * 620) * ease(c.f, 0, Math.max(20, c.dur)) * 0.75;
  return <>
    {s.title ? <div style={{position: 'absolute', left: 140, top: 160, ...BIG, fontSize: 64, color: c.pal.ink, opacity: easeOut(c.f, 0, 10)}}>{s.title}</div> : null}
    <div style={{position: 'absolute', left: 0, top: 420, width: 1920, height: 300, background: c.pal.ink}} />
    <div style={{position: 'absolute', left: x, top: 420, height: 300, display: 'flex', alignItems: 'center', gap: 120, whiteSpace: 'nowrap'}}>
      {its.map((it: any, i: number) => <div key={i} style={{display: 'flex', alignItems: 'center', gap: 30}}>
        <Ico name={it.icon} size={110} color={c.pal.dot} /><span style={{...BIG, fontSize: 90, color: c.pal.bg}}>{it.label}</span></div>)}
    </div>
  </>;
};
const hub: R = (s, c) => {
  // a bold star: thick spokes shoot out from the centre and each ends in a labelled block
  const ns = (s.nodes || []).slice(0, 6);
  return <>
    <svg width={1920} height={1080} style={{position: 'absolute'}}>
      {ns.map((_: any, i: number) => { const a = (i / ns.length) * 2 * Math.PI - Math.PI / 2; const q = easeOut(c.f, 4 + i * 2, 14 + i * 2);
        return <line key={i} x1={960} y1={540} x2={960 + Math.cos(a) * 640 * q} y2={540 + Math.sin(a) * 380 * q} stroke={c.pal.dot} strokeWidth={22} strokeLinecap="round" />; })}
      <circle cx={960} cy={540} r={110 * sp(c.f, c.fps, 0, 150, 12)} fill={c.pal.ink} />
    </svg>
    <div style={{position: 'absolute', left: 960, top: 540, transform: 'translate(-50%,-50%)'}}><Ico name={s.center?.icon} size={100} color={c.pal.bg} /></div>
    {ns.map((n: any, i: number) => { const a = (i / ns.length) * 2 * Math.PI - Math.PI / 2; const q = sp(c.f, c.fps, 12 + i * 2, 160, 13);
      return <div key={i} style={{position: 'absolute', left: 960 + Math.cos(a) * 640, top: 540 + Math.sin(a) * 380, transform: `translate(-50%,-50%) scale(${q})`,
        background: c.pal.ink, color: c.pal.bg, padding: '18px 30px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16, ...BIG, fontSize: 34, whiteSpace: 'nowrap'}}>
        <Ico name={n.icon} size={44} color={c.pal.dot} />{n.label}</div>; })}
  </>;
};

const marker: R = (s, c) => {
  // the line is set in one go and a highlighter stroke sweeps behind it, word block by word block
  const ws = String(s.text || '').split(/\s+/).filter(Boolean);
  const per = Math.max(3, Math.min(8, (c.dur * 0.6) / Math.max(1, ws.length)));
  return <div style={{position: 'absolute', left: 140, top: 300, width: 1640, display: 'flex', flexWrap: 'wrap', columnGap: 34, rowGap: 14}}>
    {ws.map((w, i) => { const q = easeOut(c.f, 4 + i * per, 10 + i * per);
      return <span key={i} style={{position: 'relative', ...BIG, fontSize: 120, color: c.pal.ink, padding: '0 8px'}}>
        <span style={{position: 'absolute', left: 0, top: '18%', height: '70%', width: `${q * 100}%`, background: c.pal.dot, zIndex: 0}} />
        <span style={{position: 'relative'}}>{w}</span></span>; })}
  </div>;
};

export const VARIANTS: Record<string, Record<string, R>> = {
  counter: {odometer, bar, pictogram, stamp, giant},
  compare: {split, bars: twinBars},
  chart: {bars: chartBars, area: chartArea, jump, dots: dotplot},
  flow: {track, cards, chevrons},
  steps: {stairs, cards, checklist},
  icons: {tiles, list, chips, ring, marquee, checklist, cards},
  network: {orbit, tree, grid, hub, chevrons},
  timeline: {cards: flipCards},
  units: {bar100},
  globe: {radar, flatmap, postcard},
  kinetic: {typewriter, stack, marker},
  footage: {slide, frame, blinds, duo},
  device: {toasts},
  route: {flatmap, postcard},
};
