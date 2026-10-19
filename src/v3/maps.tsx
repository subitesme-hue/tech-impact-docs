import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {geoOrthographic, geoMercator, geoPath, geoGraticule10, geoInterpolate, geoDistance} from 'd3-geo';
import {feature} from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import type {Pt} from '../types';
import {Look, SANS} from '../theme';
import {regionCountries} from '../components/WorldMap';
import {Icon, Label, Stage, ease, easeIO} from './kit';

const COUNTRIES = (feature(world as any, (world as any).objects.countries) as any).features as any[];
const GRAT = geoGraticule10();

// Rotating orthographic globe that turns to the focus, lights the region, pulses points and draws arcs between them.
export const Globe: React.FC<{look: Look; dur: number; focus: {lat: number; lon: number}; region?: string; points?: Pt[]; arcs?: [number, number][]; label?: string}> = ({
  look, dur, focus, region, points = [], arcs = [], label,
}) => {
  const f = useCurrentFrame();
  const hl = useMemo(() => new Set(regionCountries(region || '')), [region]);
  const t = easeIO(f, 0, Math.min(dur, 75));
  const lon = interpolate(t, [0, 1], [focus.lon + 55, focus.lon]);
  const lat = interpolate(t, [0, 1], [focus.lat * 0.3, focus.lat * 0.8]);
  const R = 430 + 40 * t;
  const proj = geoOrthographic().scale(R).translate([1120, 560]).rotate([-lon, -lat]).clipAngle(90);
  const path = geoPath(proj);
  const visible = (p: Pt) => geoDistance([p.lon, p.lat], [lon, lat]) < Math.PI / 2 - 0.05;
  return (
    <Stage look={look} dur={dur} push={0.03}>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <defs>
          <radialGradient id="oc" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor={look.panel} /><stop offset="100%" stopColor={look.bg} /></radialGradient>
        </defs>
        <circle cx={1120} cy={560} r={R + 18} fill="none" stroke={`${look.accent}22`} strokeWidth={30} />
        <circle cx={1120} cy={560} r={R} fill="url(#oc)" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
        <path d={path(GRAT) || ''} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
        {COUNTRIES.map((c, i) => {
          const on = hl.has(c.properties.name);
          return <path key={i} d={path(c) || ''} fill={on ? look.accent : 'rgba(255,255,255,0.13)'} fillOpacity={on ? 0.35 + 0.45 * ease(f, 20, 45) : 1}
            stroke={on ? look.accent : 'rgba(255,255,255,0.22)'} strokeWidth={on ? 1.4 : 0.6} />;
        })}
        {arcs.map(([a, b], k) => {
          const A = points[a], B = points[b];
          if (!A || !B) return null;
          const ip = geoInterpolate([A.lon, A.lat], [B.lon, B.lat]);
          const p = ease(f, 35 + k * 10, 70 + k * 10);
          const seg = {type: 'LineString', coordinates: Array.from({length: 41}, (_, i) => ip((i / 40) * p))} as any;
          return <path key={k} d={path(seg) || ''} fill="none" stroke={look.accent2} strokeWidth={3} strokeLinecap="round" />;
        })}
        {points.map((pt, k) => {
          if (!visible(pt)) return null;
          const xy = proj([pt.lon, pt.lat]);
          if (!xy) return null;
          const p = ease(f, 28 + k * 8, 40 + k * 8);
          const ring = ((f + k * 13) % 45) / 45;
          return (
            <g key={k} opacity={p}>
              <circle cx={xy[0]} cy={xy[1]} r={8 + ring * 36} fill="none" stroke={look.accent2} strokeWidth={2} opacity={1 - ring} />
              <circle cx={xy[0]} cy={xy[1]} r={8} fill={look.accent2} />
              <text x={xy[0] + 18} y={xy[1] - 14} fill="#fff" fontFamily={SANS} fontWeight={600} fontSize={24} letterSpacing={3}>{pt.name.toUpperCase()}</text>
            </g>
          );
        })}
      </svg>
      {label ? (
        <div style={{position: 'absolute', left: 140, top: 430, width: 480}}>
          <div style={{width: 70 * ease(f, 30, 50), height: 3, background: look.accent, marginBottom: 22}} />
          <Label size={30} style={{opacity: ease(f, 34, 50), lineHeight: 1.5}}>{label}</Label>
        </div>
      ) : null}
    </Stage>
  );
};

// Flat map fitted to the points; dashed route draws on, an icon travels along it; optional comparison chips.
export const Route: React.FC<{look: Look; dur: number; points: Pt[]; mover?: string; compare?: {label: string; value: string}[]; label?: string}> = ({
  look, dur, points, mover = 'Navigation', compare = [], label,
}) => {
  const f = useCurrentFrame();
  const pts = points.slice(0, 4);
  const lons = pts.map((p) => p.lon), lats = pts.map((p) => p.lat);
  const span = Math.max(Math.max(...lons) - Math.min(...lons), Math.max(...lats) - Math.min(...lats));
  const city = span < 0.8;
  const pad = city ? Math.max(0.012, span * 0.35) : Math.max(0.6, span * 0.45);
  const corners = {type: 'MultiPoint', coordinates: [[Math.min(...lons) - pad, Math.min(...lats) - pad], [Math.max(...lons) + pad, Math.max(...lats) + pad]]} as any;
  const proj = geoMercator().fitExtent([[420, 160], [1700, 920]], corners);
  const path = geoPath(proj);
  const xy = pts.map((p) => proj([p.lon, p.lat]) as [number, number]);
  const draw = ease(f, 14, Math.min(dur - 10, 70));
  // polyline length for dash animation + mover position
  const segs = xy.slice(1).map((b, i) => Math.hypot(b[0] - xy[i][0], b[1] - xy[i][1]));
  const L = segs.reduce((a, b) => a + b, 0) || 1;
  let d = draw * L, mx = xy[0][0], my = xy[0][1], ang = 0;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]) { const r = d / segs[i]; mx = xy[i][0] + (xy[i + 1][0] - xy[i][0]) * r; my = xy[i][1] + (xy[i + 1][1] - xy[i][1]) * r; ang = Math.atan2(xy[i + 1][1] - xy[i][1], xy[i + 1][0] - xy[i][0]); break; }
    d -= segs[i]; mx = xy[i + 1][0]; my = xy[i + 1][1];
  }
  const z = 1 + 0.06 * easeIO(f, 0, dur);
  return (
    <Stage look={look} dur={dur} push={0}>
      <AbsoluteFill style={{transform: `scale(${z})`}}>
        <svg width={1920} height={1080} style={{position: 'absolute'}}>
          {city ? (
            // city scale: country outlines mean nothing here, so draw a quiet street grid instead
            Array.from({length: 46}, (_, i) => {
              const r1 = Math.sin(i * 12.9898) * 43758.5453, r = r1 - Math.floor(r1);
              const r2 = Math.sin(i * 78.233) * 12543.123, q = r2 - Math.floor(r2);
              return i % 2 ? <line key={i} x1={0} y1={r * 1080} x2={1920} y2={r * 1080 + (q - 0.5) * 300} stroke="rgba(255,255,255,0.07)" strokeWidth={1 + q * 5} />
                : <line key={i} x1={r * 1920} y1={0} x2={r * 1920 + (q - 0.5) * 300} y2={1080} stroke="rgba(255,255,255,0.07)" strokeWidth={1 + q * 5} />;
            })
          ) : COUNTRIES.map((c, i) => <path key={i} d={path(c) || ''} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.28)" strokeWidth={1} />)}
          <polyline points={xy.map((p) => p.join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={4} strokeDasharray="4 14" strokeLinecap="round" />
          <polyline points={xy.map((p) => p.join(',')).join(' ')} fill="none" stroke={look.accent} strokeWidth={5} strokeLinecap="round"
            strokeDasharray={`${draw * L} ${L}`} />
          {xy.map((p, k) => {
            const o = ease(f, 6 + k * 6, 18 + k * 6);
            return (
              <g key={k} opacity={o}>
                <circle cx={p[0]} cy={p[1]} r={13} fill={look.bg} stroke={look.accent2} strokeWidth={4} />
                <text x={p[0]} y={p[1] + (k % 2 ? 56 : -30)} textAnchor="middle" fill="#fff" fontFamily={SANS} fontWeight={600} fontSize={26} letterSpacing={4}>
                  {pts[k].name.toUpperCase()}</text>
              </g>
            );
          })}
        </svg>
        <div style={{position: 'absolute', left: mx - 34, top: my - 34, width: 68, height: 68, borderRadius: 34, background: look.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 40px ${look.accent}`, opacity: ease(f, 12, 18)}}>
          <div style={{transform: `rotate(${(ang * 180) / Math.PI - (mover === 'Plane' ? -45 : 0)}deg)`}}><Icon name={mover} size={38} color="#0b0b10" stroke={2} /></div>
        </div>
      </AbsoluteFill>
      {compare.length ? (
        <div style={{position: 'absolute', right: 110, bottom: 100, display: 'flex', gap: 20}}>
          {compare.slice(0, 2).map((c, i) => (
            <div key={i} style={{padding: '18px 26px', borderRadius: 16, background: 'rgba(0,0,0,0.45)', border: `1px solid ${i ? look.accent : 'rgba(255,255,255,0.25)'}`,
              opacity: ease(f, 30 + i * 12, 44 + i * 12)}}>
              <Label size={18} color={look.dim}>{c.label}</Label>
              <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 54, color: i ? look.accent : '#fff', marginTop: 6}}>{c.value}</div>
            </div>
          ))}
        </div>
      ) : null}
      {label ? <Label size={28} style={{position: 'absolute', left: 120, bottom: 110, opacity: ease(f, 20, 36)}}>{label}</Label> : null}
    </Stage>
  );
};
