import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import type {IconItem, Media} from '../types';
import {DISPLAY, Look, MONO, SANS, rand} from '../theme';
import {MediaLayer} from '../components/Layers';
import {Icon, Label, Node, Source, Stage, Title, ease, easeIO, fmt} from './kit';

type B = {look: Look; dur: number};

// A -> B -> C: how something works. A glowing packet travels along the chain.
export const Flow: React.FC<B & {nodes: IconItem[]; mover?: string; label?: string}> = ({look, dur, nodes, mover, label}) => {
  const f = useCurrentFrame();
  const n = Math.max(2, Math.min(4, nodes.length));
  const xs = Array.from({length: n}, (_, i) => 480 + (i * 1200) / (n - 1));
  const y = 500;
  const travel = easeIO(f, 20, Math.max(40, dur - 10));
  const px = interpolate(travel, [0, 1], [xs[0], xs[n - 1]]);
  return (
    <Stage look={look} dur={dur}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {xs.slice(1).map((x, i) => {
          const p = ease(f, 10 + i * 8, 28 + i * 8);
          return <line key={i} x1={xs[i] + 95} y1={y} x2={xs[i] + 95 + (x - xs[i] - 190) * p} y2={y} stroke="rgba(255,255,255,0.45)" strokeWidth={3} strokeDasharray="2 12" strokeLinecap="round" />;
        })}
      </svg>
      {nodes.slice(0, n).map((nd, i) => {
        const p = ease(f, 4 + i * 8, 18 + i * 8);
        const hot = Math.abs(px - xs[i]) < 120;
        return (
          <div key={i} style={{position: 'absolute', left: xs[i] - 90, top: y - 90, width: 180, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <Node icon={nd.icon} look={look} size={180} p={p} hot={hot} />
            <Label size={24} style={{marginTop: 30, textAlign: 'center', width: 340, opacity: p, lineHeight: 1.4}}>{nd.label}</Label>
          </div>
        );
      })}
      <div style={{position: 'absolute', left: px - 26, top: y - 150, width: 52, height: 52, borderRadius: 26, background: look.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 36px ${look.accent}`, opacity: ease(f, 18, 24)}}>
        <Icon name={mover || 'Package'} size={30} color="#0b0b10" stroke={2} />
      </div>
      {label ? <Title look={look} p={ease(f, 0, 14)} style={{position: 'absolute', left: 400, top: 140, fontSize: 52}}>{label}</Title> : null}
    </Stage>
  );
};

// Big number that counts up (or "from -> to").
export const Counter: React.FC<B & {value: number; from?: number; prefix?: string; suffix?: string; decimals?: number; label: string; icon?: string; source?: string}> = ({
  look, dur, value, from, prefix = '', suffix = '', decimals, label, icon, source,
}) => {
  const f = useCurrentFrame();
  const d = decimals ?? (Math.abs(value) < 10 && value % 1 ? 1 : 0);
  const p = interpolate(f, [6, Math.min(dur - 6, 42)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const v = from !== undefined ? from + (value - from) * p : value * p;
  return (
    <Stage look={look} dur={dur}>
      <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        {icon ? <div style={{opacity: ease(f, 0, 10), marginBottom: 26}}><Icon name={icon} size={86} color={look.accent} /></div> : null}
        <div style={{display: 'flex', alignItems: 'baseline', gap: 30}}>
          {from !== undefined ? <div style={{fontFamily: SANS, fontWeight: 300, fontSize: 120, color: look.dim, textDecoration: p > 0.95 ? 'line-through' : 'none'}}>
            {prefix}{fmt(from, d)}{suffix}</div> : null}
          <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 210, color: look.ink, letterSpacing: -4, lineHeight: 1}}>{prefix}{fmt(v, d)}{suffix}</div>
        </div>
        <Label size={30} color={look.accent2} style={{marginTop: 34, maxWidth: 1300, textAlign: 'center', lineHeight: 1.5, opacity: ease(f, 14, 28)}}>{label}</Label>
      </AbsoluteFill>
      <Source text={source} look={look} p={ease(f, 20, 34)} />
    </Stage>
  );
};

export const Compare: React.FC<B & {title?: string; left: IconItem & {value: string}; right: IconItem & {value: string}}> = ({look, dur, title, left, right}) => {
  const f = useCurrentFrame();
  const side = (it: IconItem & {value: string}, i: number) => {
    const p = ease(f, 8 + i * 12, 24 + i * 12);
    return (
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}>
        <Node icon={it.icon} look={look} size={170} p={p} hot={i === 1} />
        <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 120, color: i ? look.accent : look.ink, marginTop: 30}}>{it.value}</div>
        <Label size={26} color={look.dim} style={{marginTop: 10, textAlign: 'center', maxWidth: 560, lineHeight: 1.4}}>{it.label}</Label>
      </div>
    );
  };
  return (
    <Stage look={look} dur={dur}>
      {title ? <Label size={28} color={look.accent2} style={{position: 'absolute', top: 120, width: '100%', textAlign: 'center', opacity: ease(f, 0, 12)}}>{title}</Label> : null}
      <div style={{position: 'absolute', left: 380, right: 140, top: 250, display: 'flex', alignItems: 'flex-start'}}>
        {side(left, 0)}
        <div style={{width: 2, height: 520 * ease(f, 4, 24), background: 'rgba(255,255,255,0.25)', margin: '0 40px'}} />
        {side(right, 1)}
      </div>
    </Stage>
  );
};

// Unit chart: N of M icons light up (great for percentages and "1 in 5").
export const Units: React.FC<B & {total: number; highlight: number; icon: string; label: string}> = ({look, dur, total, highlight, icon, label}) => {
  const f = useCurrentFrame();
  const T = [10, 20, 50, 100].includes(total) ? total : 20;
  const cols = T === 100 ? 20 : T === 50 ? 10 : T;
  const rows = Math.ceil(T / cols);
  const size = T >= 50 ? 62 : 96;
  const lit = Math.round(Math.min(T, highlight) * ease(f, 16, Math.min(dur - 6, 50)));
  return (
    <Stage look={look} dur={dur}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 230, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18}}>
        {Array.from({length: rows}, (_, r) => (
          <div key={r} style={{display: 'flex', gap: 18}}>
            {Array.from({length: cols}, (_, c) => {
              const i = r * cols + c;
              if (i >= T) return null;
              return <div key={c} style={{opacity: ease(f, (i % cols) * 0.8, 8 + (i % cols) * 0.8)}}>
                <Icon name={icon} size={size} color={i < lit ? look.accent : 'rgba(255,255,255,0.25)'} stroke={i < lit ? 2 : 1.4} /></div>;
            })}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 150, textAlign: 'center'}}>
        <span style={{fontFamily: SANS, fontWeight: 800, fontSize: 84, color: look.accent}}>{lit} in {T}</span>
        <Label size={28} style={{marginTop: 14, opacity: ease(f, 20, 34)}}>{label}</Label>
      </div>
    </Stage>
  );
};

export const Chart: React.FC<B & {chart: 'line' | 'bar'; title: string; unit?: string; prefix?: string; points: {label: string; value: number}[]; source?: string}> = ({
  look, dur, chart, title, unit = '', prefix = '', points, source,
}) => {
  const f = useCurrentFrame();
  const pts = points.slice(0, 8);
  const max = Math.max(...pts.map((p) => p.value), 1);
  const X0 = 400, X1 = 1720, Y0 = 860, Y1 = 330;
  const x = (i: number) => X0 + ((X1 - X0) * (i + 0.5)) / pts.length;
  const y = (v: number) => Y0 - ((Y0 - Y1) * v) / max;
  const p = ease(f, 10, Math.min(dur - 6, 55));
  const u = unit && /^[a-z]{2,}/i.test(unit) ? ' ' + unit : unit;
  return (
    <Stage look={look} dur={dur}>
      <Title look={look} p={ease(f, 0, 12)} style={{position: 'absolute', left: X0, top: 150, fontSize: 54}}>{title}</Title>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <line x1={X0} y1={Y0} x2={X1} y2={Y0} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
        {chart === 'line' ? (
          <>
            <polyline fill="none" stroke={look.accent} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round"
              points={pts.map((pt, i) => `${x(i)},${y(pt.value)}`).join(' ')} strokeDasharray={`${p * 4000} 4000`} />
            {pts.map((pt, i) => (i / Math.max(1, pts.length - 1) <= p + 0.01 ? (
              <g key={i}>
                <circle cx={x(i)} cy={y(pt.value)} r={10} fill={look.bg} stroke={look.accent} strokeWidth={4} />
                <text x={x(i)} y={y(pt.value) - 26} textAnchor="middle" fill="#fff" fontFamily={SANS} fontWeight={700} fontSize={28}>{prefix}{fmt(pt.value, pt.value % 1 ? 1 : 0)}{u}</text>
              </g>) : null))}
          </>
        ) : pts.map((pt, i) => {
          const h = (Y0 - y(pt.value)) * ease(f, 8 + i * 5, 34 + i * 5);
          const w = Math.min(160, ((X1 - X0) / pts.length) * 0.55);
          return (
            <g key={i}>
              <rect x={x(i) - w / 2} y={Y0 - h} width={w} height={h} rx={8} fill={i === pts.length - 1 ? look.accent : 'rgba(255,255,255,0.35)'} />
              <text x={x(i)} y={Y0 - h - 20} textAnchor="middle" fill="#fff" fontFamily={SANS} fontWeight={700} fontSize={30} opacity={h > 4 ? 1 : 0}>{prefix}{fmt(pt.value, pt.value % 1 ? 1 : 0)}{u}</text>
            </g>
          );
        })}
        {pts.map((pt, i) => <text key={i} x={x(i)} y={Y0 + 46} textAnchor="middle" fill={look.dim} fontFamily={SANS} fontWeight={600} fontSize={22} letterSpacing={2}>{pt.label.toUpperCase()}</text>)}
      </svg>
      <Source text={source} look={look} p={ease(f, 20, 34)} />
    </Stage>
  );
};

export const Steps: React.FC<B & {items: IconItem[]}> = ({look, dur, items}) => {
  const f = useCurrentFrame();
  const n = Math.max(2, Math.min(4, items.length));
  const per = Math.min(14, Math.max(8, (dur - 16) / n));
  const xs = Array.from({length: n}, (_, i) => 520 + (i * 1160) / (n - 1));
  return (
    <Stage look={look} dur={dur}>
      <div style={{position: 'absolute', left: xs[0], top: 465, height: 4, width: (xs[n - 1] - xs[0]) * ease(f, 6, dur - 6), background: look.accent, opacity: 0.6}} />
      {items.slice(0, n).map((it, i) => {
        const p = ease(f, 6 + i * per, 18 + i * per);
        return (
          <div key={i} style={{position: 'absolute', left: xs[i] - 160, top: 300, width: 320, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <div style={{fontFamily: MONO, fontSize: 24, color: look.accent2, marginBottom: 18, opacity: p}}>STEP {i + 1}</div>
            <Node icon={it.icon} look={look} size={150} p={p} hot={p > 0.5 && i === Math.min(n - 1, Math.floor((f - 6) / per))} />
            <Label size={24} style={{marginTop: 28, textAlign: 'center', lineHeight: 1.4, opacity: p}}>{it.label}</Label>
          </div>
        );
      })}
    </Stage>
  );
};

// Ecosystem / who benefits: centre node with spokes.
export const Network: React.FC<B & {center: IconItem; nodes: IconItem[]}> = ({look, dur, center, nodes}) => {
  const f = useCurrentFrame();
  const ns = nodes.slice(0, 6);
  const cx = 1060, cy = 520, R = 340;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / ns.length + 0.0015 * f;
  return (
    <Stage look={look} dur={dur}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {ns.map((_, i) => {
          const p = ease(f, 10 + i * 6, 26 + i * 6);
          const ex = cx + Math.cos(ang(i)) * R * p, ey = cy + Math.sin(ang(i)) * R * 0.78 * p;
          return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke={`${look.accent}88`} strokeWidth={2.5} />;
        })}
        <circle cx={cx} cy={cy} r={R * 0.55} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
      </svg>
      <div style={{position: 'absolute', left: cx - 110, top: cy - 110}}><Node icon={center.icon} look={look} size={220} p={ease(f, 0, 12)} hot /></div>
      <Label size={26} color={look.accent} style={{position: 'absolute', left: cx - 300, width: 600, top: cy + 125, textAlign: 'center', opacity: ease(f, 6, 18), textShadow: '0 0 12px #000'}}>{center.label}</Label>
      {ns.map((nd, i) => {
        const p = ease(f, 16 + i * 6, 30 + i * 6);
        const ex = cx + Math.cos(ang(i)) * R, ey = cy + Math.sin(ang(i)) * R * 0.78;
        return (
          <div key={i} style={{position: 'absolute', left: ex - 60, top: ey - 60, width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <Node icon={nd.icon} look={look} size={120} p={p} />
            <Label size={20} style={{marginTop: 14, width: 280, textAlign: 'center', lineHeight: 1.35, opacity: p}}>{nd.label}</Label>
          </div>
        );
      })}
    </Stage>
  );
};

export const Icons: React.FC<B & {title?: string; items: IconItem[]}> = ({look, dur, title, items}) => {
  const f = useCurrentFrame();
  const its = items.slice(0, 4);
  const per = Math.min(12, Math.max(6, (dur - 20) / its.length));
  return (
    <Stage look={look} dur={dur}>
      {title ? <Title look={look} p={ease(f, 0, 12)} style={{position: 'absolute', left: 0, right: 0, top: 170, textAlign: 'center', fontSize: 56}}>{title}</Title> : null}
      <div style={{position: 'absolute', left: 360, right: 120, top: 360, display: 'flex', justifyContent: 'center', gap: 40}}>
        {its.map((it, i) => {
          const p = ease(f, 8 + i * per, 20 + i * per);
          return (
            <div key={i} style={{width: 360, padding: '46px 30px', borderRadius: 26, border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.04)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: p, transform: `translateY(${(1 - p) * 40}px)`}}>
              <Icon name={it.icon} size={92} color={look.accent} />
              <Label size={24} style={{marginTop: 30, textAlign: 'center', lineHeight: 1.45}}>{it.label}</Label>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

export const Timeline: React.FC<B & {items: {year: string; text: string}[]}> = ({look, dur, items}) => {
  const f = useCurrentFrame();
  const its = items.slice(0, 5);
  const per = Math.min(14, Math.max(8, (dur - 16) / its.length));
  const xs = its.map((_, i) => 520 + (i * 1200) / Math.max(1, its.length - 1));
  return (
    <Stage look={look} dur={dur}>
      <div style={{position: 'absolute', left: 400, top: 538, height: 3, width: 1400 * ease(f, 0, Math.min(dur - 4, 40)), background: 'rgba(255,255,255,0.35)'}} />
      {its.map((it, i) => {
        const p = ease(f, 6 + i * per, 18 + i * per);
        const up = i % 2 === 0;
        return (
          <div key={i} style={{position: 'absolute', left: xs[i] - 150, top: up ? 330 : 580, width: 300, textAlign: 'center', opacity: p}}>
            <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 70, color: look.accent, order: 1}}>{it.year}</div>
            <div style={{fontFamily: SANS, fontSize: 24, lineHeight: 1.4, color: look.ink, marginTop: 8}}>{it.text}</div>
            <div style={{position: 'absolute', left: 140, top: up ? 200 : -50, width: 20, height: 20, borderRadius: 10, background: look.accent}} />
          </div>
        );
      })}
    </Stage>
  );
};

// Kinetic typography: the key line, word by word.
export const Kinetic: React.FC<B & {text: string; emphasis?: string}> = ({look, dur, text, emphasis}) => {
  const f = useCurrentFrame();
  const words = text.split(/\s+/).slice(0, 10);
  const per = Math.min(5, Math.max(2, (dur * 0.4) / words.length));
  const em = (emphasis || '').toLowerCase().split(/\s+/).filter(Boolean);
  return (
    <Stage look={look} dur={dur} push={0.08}>
      <AbsoluteFill style={{display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 200px 0 400px'}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: words.length > 6 ? 104 : 136, lineHeight: 1.05, textTransform: 'uppercase', textAlign: 'center', color: look.ink}}>
          {words.map((w, i) => {
            const p = ease(f, i * per, i * per + 8);
            const hot = em.includes(w.toLowerCase().replace(/[^a-z0-9]/g, ''));
            return <span key={i} style={{display: 'inline-block', marginRight: 26, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, color: hot ? look.accent : look.ink}}>{w}</span>;
          })}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

// Real footage as an accent: graded, letterboxed, slow move, optional callout label.
export const FootageShot: React.FC<B & {media?: Media; label?: string; seed: number}> = ({look, dur, media, label, seed}) => {
  const f = useCurrentFrame();
  if (!media) return label ? <Kinetic look={look} dur={dur} text={label} /> : <Stage look={look} dur={dur} />;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <MediaLayer media={media} look={{...look, wash: undefined}} seed={seed} dur={dur} push={0.06} />
      <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 35%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 70, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, background: '#000'}} />
      {label ? (
        <div style={{position: 'absolute', left: 130, bottom: 140, display: 'flex', alignItems: 'center', gap: 20, opacity: ease(f, 10, 24)}}>
          <div style={{width: 80 * ease(f, 8, 24), height: 2, background: look.accent}} />
          <Label size={26}>{label}</Label>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const _r = rand;
