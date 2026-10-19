import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {geoEquirectangular} from 'd3-geo';
import {Look, MONO, DISPLAY} from '../theme';

const GCC = ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman'];
const REGIONS: Record<string, string[]> = {
  'united states': ['United States of America'],
  us: ['United States of America'],
  usa: ['United States of America'],
  europe: ['Albania', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herz.', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia',
    'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Lithuania', 'Luxembourg',
    'Macedonia', 'Moldova', 'Montenegro', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania', 'Serbia', 'Slovakia', 'Slovenia', 'Spain',
    'Sweden', 'Switzerland', 'Ukraine', 'United Kingdom'],
  africa: ['Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon', 'Central African Rep.', 'Chad', 'Congo',
    "Côte d'Ivoire", 'Dem. Rep. Congo', 'Djibouti', 'Egypt', 'Eq. Guinea', 'Eritrea', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea',
    'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Morocco', 'Mozambique', 'Namibia',
    'Niger', 'Nigeria', 'Rwanda', 'S. Sudan', 'Senegal', 'Sierra Leone', 'Somalia', 'Somaliland', 'South Africa', 'Sudan', 'Tanzania', 'Togo',
    'Tunisia', 'Uganda', 'W. Sahara', 'Zambia', 'Zimbabwe', 'eSwatini'],
  'middle east': [...GCC, 'Iran', 'Iraq', 'Jordan', 'Lebanon', 'Syria', 'Israel', 'Palestine', 'Yemen', 'Turkey', 'Egypt'],
  gcc: GCC,
  'south asia': ['India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan', 'Afghanistan'],
  'east asia': ['China', 'Japan', 'South Korea', 'North Korea', 'Mongolia', 'Taiwan'],
  'asia pacific': ['Indonesia', 'Malaysia', 'Philippines', 'Vietnam', 'Thailand', 'Cambodia', 'Laos', 'Myanmar', 'Australia', 'New Zealand',
    'Papua New Guinea', 'Brunei', 'Timor-Leste', 'Fiji'],
};
export const regionCountries = (r: string) => {
  const k = r.toLowerCase().replace(/[-–]/g, ' ').replace(/\s+/g, ' ').trim();
  return REGIONS[k] || REGIONS[Object.keys(REGIONS).find((x) => k.includes(x)) || ''] || [];
};

import DOTS_RAW from './dots.json';
const proj = geoEquirectangular().scale(1920 / (2 * Math.PI)).translate([960, 600]);
const ALL = (DOTS_RAW as [number, number, string][]).map(([x, y, c]) => ({x, y, c}));
const GAP = 12;

export const WorldMap: React.FC<{look: Look; region: string; label?: string; points?: {name: string; lat: number; lon: number}[]; dur: number}> = ({
  look, region, label, points = [], dur,
}) => {
  const f = useCurrentFrame();
  const hl = useMemo(() => new Set(regionCountries(region)), [region]);
  const all = ALL;
  const lit = all.filter((d) => hl.has(d.c));
  const cx = lit.length ? lit.reduce((a, d) => a + d.x, 0) / lit.length : 960;
  const cy = lit.length ? lit.reduce((a, d) => a + d.y, 0) / lit.length : 540;
  const xs = lit.map((d) => d.x), ys = lit.map((d) => d.y);
  const bw = lit.length ? Math.max(60, Math.max(...xs) - Math.min(...xs)) : 1920, bh = lit.length ? Math.max(40, Math.max(...ys) - Math.min(...ys)) : 1080;
  const target = Math.max(1, Math.min(1400 / bw, 760 / bh, 4.5));
  const zoom = interpolate(f, [0, Math.min(dur, 90)], [1, target], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const reveal = interpolate(f, [0, 22], [0, 1], {extrapolateRight: 'clamp'});
  const tx = (960 - cx) * (zoom - 1) / zoom, ty = (540 - cy) * (zoom - 1) / zoom;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 60%, ${look.panel} 0%, ${look.bg} 70%)`}}>
      <AbsoluteFill style={{transform: `scale(${zoom}) translate(${tx}px, ${ty}px)`}}>
        <svg width={1920} height={1080}>
          {all.map((d, i) => {
            const on = hl.has(d.c);
            const tw = on ? 0.75 + 0.25 * Math.sin(f / 6 + i) : 0.22;
            return <rect key={i} x={d.x - 2} y={d.y - 2} width={on ? 5 : 3.5} height={on ? 5 : 3.5} rx={1}
              fill={on ? look.accent : look.dim} opacity={tw * reveal} />;
          })}
          {points.slice(0, 6).map((p, i) => {
            const [x, y] = proj([p.lon, p.lat]) as [number, number];
            const t = f - 18 - i * 10;
            if (t < 0) return null;
            const r = 6 + ((t % 40) / 40) * 40;
            return (
              <g key={p.name}>
                <circle cx={x} cy={y} r={r / zoom} fill="none" stroke={look.accent2} strokeWidth={2 / zoom} opacity={1 - (t % 40) / 40} />
                <circle cx={x} cy={y} r={6 / zoom} fill={look.accent2} />
                <text x={x + 14 / zoom} y={y + (i % 2 ? 30 : -14) / zoom} fill={look.ink} fontFamily={MONO} fontSize={22 / zoom}
                  opacity={interpolate(t, [0, 10], [0, 1], {extrapolateRight: 'clamp'})}>{p.name.toUpperCase()}</text>
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>
      <div style={{position: 'absolute', left: 110, bottom: 150, fontFamily: DISPLAY, fontSize: 84, fontWeight: 700, color: look.ink,
        letterSpacing: 2, textTransform: 'uppercase', opacity: reveal, textShadow: '0 4px 30px rgba(0,0,0,0.7)'}}>
        {label || region}
      </div>
    </AbsoluteFill>
  );
};
