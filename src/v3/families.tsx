// Scene formats that belong to one visual family, so episodes differ in how things are SHOWN, not only in colour.
// Editorial  <- Motion Array "Newspaper History", "Vintage Documentary", "Multiframe Media Slideshow": printed pages,
//               flat ink maps, magazine contents page, paper wipes between sections.
// Blueprint  <- "Tech Show", "AI Motion UI Kit" gauges, technical drawings: wireframe globe, arc gauges, typed
//               mono statements, spec-sheet contents, scan-line wipes.
// Night      <- "3D Technology World Map", "AI Motion UI Kit": the original glowing globe and glass diagrams.
import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {geoMercator, geoPath, geoGraticule10, geoOrthographic, geoDistance} from 'd3-geo';
import {feature} from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import type {Pt} from '../types';
import {Look, MONO, SANS} from '../theme';
import {regionCountries} from '../components/WorldMap';
import {Label, Stage, ease, easeIO, fmt} from './kit';

const COUNTRIES = (feature(world as any, (world as any).objects.countries) as any).features as any[];
const GRAT = geoGraticule10();

export const numFont = (look: Look) => (look.family === 'editorial' ? look.headlineFont : look.family === 'blueprint' ? MONO : SANS);

// ---------------- editorial: flat ink map on paper ----------------
export const PaperMap: React.FC<{look: Look; dur: number; focus: {lat: number; lon: number}; region?: string; points?: Pt[]; label?: string}> = ({
  look, dur, focus, region, points = [], label,
}) => {
  const f = useCurrentFrame();
  const hl = useMemo(() => new Set(regionCountries(region || '')), [region]);
  const span = 48;
  const corners = {type: 'MultiPoint', coordinates: [[focus.lon - span, focus.lat - span * 0.55], [focus.lon + span, focus.lat + span * 0.55]]} as any;
  const z = 1 + 0.08 * easeIO(f, 0, dur);
  const proj = geoMercator().fitExtent([[160, 120], [1760, 960]], corners);
  const path = geoPath(proj);
  return (
    <Stage look={look} dur={dur} push={0}>
      <AbsoluteFill style={{transform: `scale(${z})`}}>
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          {COUNTRIES.map((c, i) => {
            const on = hl.has(c.properties.name);
            return <path key={i} d={path(c) || ''} fill={on ? look.accent : `rgba(${look.fg},0.06)`} fillOpacity={on ? 0.18 + 0.5 * ease(f, 10, 34) : 1}
              stroke={`rgba(${look.fg},${on ? 0.8 : 0.45})`} strokeWidth={on ? 1.6 : 0.9} />;
          })}
          {points.slice(0, 4).map((pt, k) => {
            const xy = proj([pt.lon, pt.lat]);
            if (!xy) return null;
            const p = ease(f, 20 + k * 8, 32 + k * 8);
            return (
              <g key={k} opacity={p}>
                <circle cx={xy[0]} cy={xy[1]} r={11} fill={look.accent} stroke={look.bg} strokeWidth={3} />
                <line x1={xy[0]} y1={xy[1]} x2={xy[0] + 70} y2={xy[1] - 60 * p} stroke={look.ink} strokeWidth={1.5} />
                <text x={xy[0] + 78} y={xy[1] - 64} fill={look.ink} fontFamily={look.headlineFont} fontStyle="italic" fontSize={36}>{pt.name}</text>
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      {label ? <div style={{position: 'absolute', left: 150, bottom: 110, fontFamily: look.headlineFont, fontSize: 52, color: look.ink, opacity: ease(f, 12, 26),
        borderTop: `3px solid ${look.ink}`, paddingTop: 14}}>{label}</div> : null}
    </Stage>
  );
};

// ---------------- editorial: the line as a printed headline (Newspaper History) ----------------
export const Headline: React.FC<{look: Look; dur: number; text: string; emphasis?: string; date?: string}> = ({look, dur, text, emphasis, date}) => {
  const f = useCurrentFrame();
  const em = (emphasis || '').toLowerCase();
  const rot = interpolate(f, [0, dur], [-2.2, -0.6]);
  const s = 1.02 + 0.07 * easeIO(f, 0, dur);
  const words = text.split(/\s+/);
  const bars = Array.from({length: 18}, (_, i) => i);
  return (
    <AbsoluteFill style={{background: '#d9d2c5', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 170, top: 70, width: 1580, height: 1240, background: look.panel, boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
        transform: `rotate(${rot}deg) scale(${s})`, transformOrigin: '50% 30%', padding: '50px 80px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `4px double ${look.ink}`, paddingBottom: 14}}>
          <div style={{fontFamily: look.headlineFont, fontWeight: 900, fontSize: 64, color: look.ink}}>The T&amp;I Times</div>
          <div style={{fontFamily: SANS, fontSize: 20, letterSpacing: 4, color: look.dim}}>{(date || '').toUpperCase()} · TECHNOLOGY &amp; IMPACT</div>
        </div>
        <div style={{fontFamily: look.headlineFont, fontWeight: 900, fontSize: words.length > 6 ? 118 : 140, lineHeight: 1.02, color: look.ink, marginTop: 40}}>
          {words.map((w, i) => {
            const p = ease(f, 2 + i * 2.5, 10 + i * 2.5);
            const hot = em && em.split(/\s+/).includes(w.toLowerCase().replace(/[^a-z0-9]/g, ''));
            return <span key={i} style={{opacity: p, color: hot ? look.accent : look.ink, fontStyle: hot ? 'italic' : 'normal'}}>{w} </span>;
          })}
        </div>
        <div style={{display: 'flex', gap: 40, marginTop: 50}}>
          {[0, 1, 2].map((c) => (
            <div key={c} style={{flex: 1}}>
              {bars.map((b) => <div key={b} style={{height: 12, marginBottom: 16, background: `rgba(${look.fg},0.13)`, width: `${78 + ((b * 37 + c * 11) % 22)}%`}} />)}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------- blueprint: typed statement with a cursor ----------------
export const Typed: React.FC<{look: Look; dur: number; text: string; emphasis?: string}> = ({look, dur, text, emphasis}) => {
  const f = useCurrentFrame();
  const n = Math.round(text.length * ease(f, 2, Math.min(dur * 0.6, 34)));
  const shown = text.slice(0, n);
  const em = (emphasis || '').toLowerCase();
  const i = em ? shown.toLowerCase().indexOf(em) : -1;
  return (
    <Stage look={look} dur={dur} push={0.03}>
      <div style={{position: 'absolute', left: 380, right: 180, top: 380}}>
        <div style={{fontFamily: MONO, fontSize: 24, letterSpacing: 4, color: look.accent2, marginBottom: 26}}>// NOTE {String((text.length % 90) + 10).padStart(3, '0')}</div>
        <div style={{fontFamily: MONO, fontWeight: 500, fontSize: text.length > 40 ? 76 : 92, lineHeight: 1.2, color: look.ink}}>
          {i < 0 ? shown : <>{shown.slice(0, i)}<span style={{color: look.accent}}>{shown.slice(i, i + em.length)}</span>{shown.slice(i + em.length)}</>}
          <span style={{display: 'inline-block', width: '0.55em', height: '0.95em', marginLeft: 6, background: look.accent, verticalAlign: '-0.1em',
            opacity: Math.floor(f / 8) % 2 ? 0.2 : 1}} />
        </div>
      </div>
    </Stage>
  );
};

// ---------------- blueprint: arc gauge for a number (AI Motion UI Kit) ----------------
export const Gauge: React.FC<{look: Look; dur: number; value: number; prefix?: string; suffix?: string; decimals?: number; label: string; source?: string}> = ({
  look, dur, value, prefix = '', suffix = '', decimals, label, source,
}) => {
  const f = useCurrentFrame();
  const p = ease(f, 6, Math.min(dur - 6, 44));
  const pct = suffix.trim() === '%' ? Math.min(1, value / 100) : 0.82;
  const d = decimals ?? (Math.abs(value) < 10 && value % 1 ? 1 : 0);
  const R = 300, cx = 960, cy = 600, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
  const arc = (t: number) => {
    const a = a0 + (a1 - a0) * t;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0), x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    return `M ${x0} ${y0} A ${R} ${R} 0 ${a - a0 > Math.PI ? 1 : 0} 1 ${x} ${y}`;
  };
  const ticks = Array.from({length: 41}, (_, i) => i / 40);
  return (
    <Stage look={look} dur={dur} push={0.02}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {ticks.map((t, i) => {
          const a = a0 + (a1 - a0) * t;
          const r0 = R + 26, r1 = R + (i % 5 ? 40 : 56);
          return <line key={i} x1={cx + r0 * Math.cos(a)} y1={cy + r0 * Math.sin(a)} x2={cx + r1 * Math.cos(a)} y2={cy + r1 * Math.sin(a)}
            stroke={t <= pct * p ? look.accent : `rgba(${look.fg},0.3)`} strokeWidth={i % 5 ? 2 : 3} />;
        })}
        <path d={arc(1)} fill="none" stroke={`rgba(${look.fg},0.12)`} strokeWidth={18} strokeLinecap="round" />
        <path d={arc(Math.max(0.001, pct * p))} fill="none" stroke={look.accent} strokeWidth={18} strokeLinecap="round" />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 500, textAlign: 'center', fontFamily: MONO, fontWeight: 500, fontSize: 150, color: look.ink, letterSpacing: -4}}>
        {prefix}{fmt(value * p, d)}{suffix}</div>
      <Label size={26} color={look.accent2} style={{position: 'absolute', left: 360, right: 360, top: 700, textAlign: 'center', lineHeight: 1.5, opacity: ease(f, 14, 28)}}>{label}</Label>
      {source ? <div style={{position: 'absolute', right: 120, bottom: 70, fontFamily: MONO, fontSize: 19, letterSpacing: 2, color: look.dim}}>SRC · {source.toUpperCase()}</div> : null}
    </Stage>
  );
};

// ---------------- blueprint: wireframe globe ----------------
export const WireGlobe: React.FC<{look: Look; dur: number; focus: {lat: number; lon: number}; region?: string; points?: Pt[]; label?: string}> = ({
  look, dur, focus, region, points = [], label,
}) => {
  const f = useCurrentFrame();
  const hl = useMemo(() => new Set(regionCountries(region || '')), [region]);
  const t = easeIO(f, 0, Math.min(dur, 70));
  const lon = interpolate(t, [0, 1], [focus.lon - 70, focus.lon]);
  const lat = focus.lat * 0.7;
  const R = 420;
  const proj = geoOrthographic().scale(R).translate([1120, 560]).rotate([-lon, -lat]).clipAngle(90);
  const path = geoPath(proj);
  return (
    <Stage look={look} dur={dur} push={0.02}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <circle cx={1120} cy={560} r={R} fill="none" stroke={`rgba(${look.fg},0.6)`} strokeWidth={1.5} />
        <circle cx={1120} cy={560} r={R + 40} fill="none" stroke={`rgba(${look.fg},0.25)`} strokeWidth={1} strokeDasharray="6 10" />
        <path d={path(GRAT) || ''} fill="none" stroke={`rgba(${look.fg},0.22)`} strokeWidth={1} />
        {COUNTRIES.map((c, i) => {
          const on = hl.has(c.properties.name);
          return <path key={i} d={path(c) || ''} fill={on ? `${look.accent}33` : 'none'} stroke={on ? look.accent : `rgba(${look.fg},0.45)`} strokeWidth={on ? 1.6 : 0.8} />;
        })}
        {points.slice(0, 4).map((pt, k) => {
          if (geoDistance([pt.lon, pt.lat], [lon, lat]) > Math.PI / 2 - 0.05) return null;
          const xy = proj([pt.lon, pt.lat]);
          if (!xy) return null;
          const p = ease(f, 26 + k * 8, 38 + k * 8);
          return (
            <g key={k} opacity={p} stroke={look.accent} fill="none" strokeWidth={2}>
              <circle cx={xy[0]} cy={xy[1]} r={16} /><line x1={xy[0] - 30} y1={xy[1]} x2={xy[0] + 30} y2={xy[1]} /><line x1={xy[0]} y1={xy[1] - 30} x2={xy[0]} y2={xy[1] + 30} />
              <text x={xy[0] + 36} y={xy[1] - 20} fill={look.ink} stroke="none" fontFamily={MONO} fontSize={22}>{pt.name.toUpperCase()} {pt.lat.toFixed(1)}°,{pt.lon.toFixed(1)}°</text>
            </g>
          );
        })}
      </svg>
      {label ? <Label size={28} style={{position: 'absolute', left: 140, top: 470, width: 460, lineHeight: 1.5, opacity: ease(f, 20, 34)}}>{label}</Label> : null}
    </Stage>
  );
};

// ---------------- contents pages for the intro agenda ----------------
export const Contents: React.FC<{look: Look; dur: number; items: string[]; title: string}> = ({look, dur, items, title}) => {
  const f = useCurrentFrame();
  const per = Math.max(8, (dur - 20) / Math.max(1, items.length));
  const active = Math.min(items.length - 1, Math.floor((f - 12) / per));
  const ed = look.family === 'editorial';
  return (
    <Stage look={look} dur={dur} push={0.02}>
      <div style={{position: 'absolute', left: 150, top: 150, width: 640}}>
        <div style={{fontFamily: ed ? SANS : MONO, fontSize: 24, letterSpacing: 6, color: look.accent, opacity: ease(f, 0, 10)}}>{ed ? 'IN THIS ISSUE' : 'SPEC SHEET / EPISODE'}</div>
        <div style={{fontFamily: look.headlineFont, fontWeight: 700, fontSize: ed ? 92 : 86, lineHeight: 1.04, color: look.ink, marginTop: 24,
          textTransform: look.upper ? 'uppercase' : 'none', opacity: ease(f, 3, 16)}}>{title}</div>
      </div>
      <div style={{position: 'absolute', left: 900, top: 160, width: 880}}>
        {items.map((it, i) => {
          const p = ease(f, 10 + i * per, 20 + i * per);
          const on = i === active;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 30, padding: '20px 0', borderBottom: `${ed ? 1.5 : 1}px ${ed ? 'solid' : 'dashed'} rgba(${look.fg},${on ? 0.6 : 0.25})`,
              opacity: 0.3 + 0.7 * p}}>
              <div style={{fontFamily: ed ? look.headlineFont : MONO, fontStyle: ed ? 'italic' : 'normal', fontSize: 44, color: on ? look.accent : look.dim, width: 80}}>
                {String(i + 1).padStart(2, '0')}</div>
              <div style={{fontFamily: ed ? look.headlineFont : MONO, fontSize: on ? 46 : 40, fontWeight: on ? 700 : 400, color: look.ink,
                textTransform: ed ? 'none' : 'uppercase'}}>{it}</div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

// ---------------- section openers: a short family-specific move at each new section ----------------
export const SectionWipe: React.FC<{look: Look; title: string; n: number}> = ({look, title, n}) => {
  const f = useCurrentFrame();
  if (look.family === 'editorial') {
    // a paper slab slides across with the section number, then leaves (12 frames in, 6 hold, 12 out)
    const x = interpolate(f, [0, 10, 18, 28], [-1920, 0, 0, 1920], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return (
      <AbsoluteFill style={{transform: `translateX(${x}px)`, background: look.panel, borderRight: `14px solid ${look.accent}`,
        display: 'flex', alignItems: 'center', paddingLeft: 170, gap: 40}}>
        <div style={{fontFamily: look.headlineFont, fontStyle: 'italic', fontSize: 150, color: look.accent}}>{String(n).padStart(2, '0')}</div>
        <div style={{fontFamily: look.headlineFont, fontWeight: 700, fontSize: 88, color: look.ink}}>{title}</div>
      </AbsoluteFill>
    );
  }
  if (look.family === 'blueprint') {
    // a scan line sweeps down, leaving the section code behind for a moment
    const y = interpolate(f, [0, 16], [-10, 1090], {extrapolateRight: 'clamp'});
    const o = interpolate(f, [0, 4, 18, 26], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return (
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: y, height: 3, background: look.accent, boxShadow: `0 0 30px ${look.accent}`}} />
        <div style={{position: 'absolute', right: 120, top: 90, fontFamily: MONO, fontSize: 26, letterSpacing: 4, color: look.accent, opacity: o}}>
          SECTION {String(n).padStart(2, '0')} / {title.toUpperCase()}</div>
      </AbsoluteFill>
    );
  }
  return null;
};
