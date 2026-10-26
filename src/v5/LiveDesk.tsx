// LIVE DESK engine — a newsroom map wall. One continuous world map runs under the whole film and the camera flies
// between places (no hard cuts between ideas). Ideas arrive as broadcast graphics over the map, the desk chrome
// (bug, dateline, ticker) stays on screen, and chapters change with a three-bar stinger. Built after the user's
// "map news-desk" reference on X; deliberately unlike the night/editorial/blueprint and Color Block films.
import React, {useMemo} from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';
import {geoEquirectangular, geoPath, geoGraticule10} from 'd3-geo';
import {feature} from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import type {DocProps, Shot, TimelineItem} from '../types';
import {regionCountries} from '../components/WorldMap';
import {DESK, DESK_SETS, DPal, DC, Cap, H, PLEX, HEAD, ease, eio, spr, numTxt, agendaDesk} from './desk';

const P0 = geoEquirectangular().scale(1920 / (2 * Math.PI)).translate([960, 540]);
const PATH = geoPath(P0);
const COUNTRIES = (feature(world as any, (world as any).objects.countries) as any).features as any[];
const GRAT = PATH(geoGraticule10()) || '';
const CX = 1180, CY = 540;

type Cam = {x: number; y: number; z: number};
const HOMES: Record<string, {lat: number; lon: number; z: number}> = {
  'united states': {lat: 38, lon: -97, z: 3.2}, europe: {lat: 50, lon: 12, z: 4.6}, africa: {lat: 3, lon: 20, z: 2.6}, 'middle east': {lat: 28, lon: 45, z: 4.2},
  gcc: {lat: 24.5, lon: 51.5, z: 7}, 'south asia': {lat: 23, lon: 79, z: 4}, 'east asia': {lat: 34, lon: 118, z: 3.4}, 'asia pacific': {lat: 2, lon: 122, z: 2.7},
};
const homeOf = (p: DocProps) => {
  const k = p.region.toLowerCase();
  const h = HOMES[k] || HOMES[Object.keys(HOMES).find((x) => k.includes(x)) || ''];
  if (h) return h;
  const f = p.thumb.focus || {lat: 20, lon: 20};
  return {lat: f.lat, lon: f.lon, z: 4};
};
const px = (lat: number, lon: number) => P0([lon, lat]) as [number, number];
const kindOf = (s: Shot) => (DESK[s.kind] ? s.kind : 'kinetic');

// pick an animation for every shot: never the same function twice; animations shared by several kinds are kept back
const SHARE: Record<string, number> = {};
for (const k of Object.keys(DESK)) for (const v of Object.values(DESK[k])) SHARE[v.name] = (SHARE[v.name] || 0) + 1;
export const assignDesk = (shots: Shot[], seed: number) => {
  const used: Record<string, number> = {};
  return shots.map((s) => {
    if (s.kind === 'agenda') return 'agenda';
    const k = kindOf(s); const names = Object.keys(DESK[k]);
    const order = names.map((_, j) => names[(j + seed) % names.length]);
    let best = order[0], score = 1e9;
    for (const v of order) { const fn = DESK[k][v].name; const sc = (used[fn] || 0) * 100 + (SHARE[fn] || 1); if (sc < score) { score = sc; best = v; } }
    const fn = DESK[k][best].name; used[fn] = (used[fn] || 0) + 1;
    return best;
  });
};

const pointsOf = (s: any): {lat: number; lon: number; name: string}[] =>
  s.points && s.points.length ? s.points : s.focus ? [{lat: s.focus.lat, lon: s.focus.lon, name: s.label || s.region || ''}] : [];

export const LiveDeskDoc: React.FC<DocProps> = (p) => {
  const F = useCurrentFrame();
  const {fps} = useVideoConfig();
  const tl = p.timeline;
  const pal: DPal = DESK_SETS[((p.look || 0) % DESK_SETS.length + DESK_SETS.length) % DESK_SETS.length];
  const home = homeOf(p);
  const hl = useMemo(() => new Set(regionCountries(p.region)), [p.region]);
  if (!tl) return <AbsoluteFill style={{background: pal.bg}} />;
  const items = tl.items;
  const shotOf = (it: TimelineItem) => p.segments[it.seg!].beats[it.beat!].shots[it.shot!];
  const shotItems = items.filter((it) => it.kind === 'shot');
  const vars = useMemo(() => assignDesk(shotItems.map(shotOf), p.look || 0), [p]);
  const varOf = (it: TimelineItem) => vars[shotItems.indexOf(it)];
  const sections = p.segments.filter((s) => s.kind === 'chapter').map((s) => s.title);

  // camera target for every item
  const [hx, hy] = px(home.lat, home.lon);
  const targets: Cam[] = useMemo(() => items.map((it, i) => {
    if (it.kind === 'thumb') return {x: hx, y: hy, z: home.z * 0.7};
    if (it.kind === 'outro') { const [x, y] = px(18, 20); return {x, y, z: 1.05}; }
    const s: any = shotOf(it);
    const pts = pointsOf(s);
    if ((s.kind === 'globe' || s.kind === 'route') && pts.length) {
      const P = pts.map((q) => px(q.lat, q.lon)); const xs = P.map((q) => q[0]), ys = P.map((q) => q[1]);
      const span = Math.max(Math.max(...xs) - Math.min(...xs), (Math.max(...ys) - Math.min(...ys)) * 1.6, 1);
      const z = Math.max(1.4, Math.min(home.z * 2.2, 900 / span));
      return {x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2, z: pts.length === 1 ? home.z * 1.8 : z};
    }
    const z = home.z * (0.85 + 0.3 * ((i * 0.618) % 1));
    return {x: hx + (((i * 37) % 7) - 3) * (24 / z), y: hy + (((i * 53) % 5) - 2) * (18 / z), z};
  }), [p]);
  const camAt = (fr: number): Cam => {
    let i = items.findIndex((it) => fr >= it.start && fr < it.start + it.dur); if (i < 0) i = fr < 0 ? 0 : items.length - 1;
    const it = items[i]; const a = i ? targets[i - 1] : targets[0], b = targets[i];
    const t = eio(fr - it.start, 0, Math.min(45, Math.max(10, it.dur * 0.6)));
    const z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * t) * (1 + 0.025 * Math.sin(fr / 80));
    return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z};
  };
  const cam = camAt(F);
  const toScreenAt = (fr: number) => (lat: number, lon: number): [number, number] => { const c = camAt(fr); const [x, y] = px(lat, lon); return [CX + (x - c.x) * c.z, CY + (y - c.y) * c.z]; };

  // pins that stay on the map once a place has been visited
  const pins = useMemo(() => {
    const out: {x: number; y: number; name: string; from: number}[] = [];
    items.forEach((it) => { if (it.kind !== 'shot') return; const s: any = shotOf(it); if (s.kind !== 'globe' && s.kind !== 'route') return;
      pointsOf(s).forEach((q) => { const [x, y] = px(q.lat, q.lon); if (!out.some((o) => Math.hypot(o.x - x, o.y - y) < 2)) out.push({x, y, name: q.name, from: it.start + 20}); }); });
    return out;
  }, [p]);

  // ticker: the film's numbers, in order
  const ticker = useMemo(() => {
    const parts: string[] = [];
    p.segments.forEach((sg) => sg.beats.forEach((b) => b.shots.forEach((s: any) => {
      if (s.kind === 'counter') parts.push(`${numTxt(s)} — ${s.label}`);
      if (s.kind === 'units') parts.push(`${Math.round((s.highlight / (s.total || 100)) * 100)}% — ${s.label}`);
    })));
    if (!parts.length) parts.push(p.title);
    const one = [`T&I Tech Impact · ${p.region} · ${p.sector}`, ...parts].join('   ■   ') + '   ■   ';
    return one.repeat(Math.ceil(36000 / Math.max(400, one.length * 15)) + 1);
  }, [p]);

  const ci = Math.max(0, items.findIndex((it) => F >= it.start && F < it.start + it.dur));
  const cur = items[ci];
  const curSeg = cur.seg !== undefined ? p.segments[cur.seg] : undefined;
  const secNo = curSeg && curSeg.kind === 'chapter' ? sections.indexOf(curSeg.title) + 1 : 0;
  const fullFootage = cur.kind === 'shot' && shotOf(cur).kind === 'footage';
  const OV = 8;
  const secStarts = items.filter((it) => it.sectionStart).map((it) => it.start);
  const date = new Date(p.date + 'T12:00:00Z').toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).toUpperCase();

  return (
    <AbsoluteFill style={{background: pal.bg, overflow: 'hidden'}}>
      {/* the map wall */}
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <rect width={1920} height={1080} fill={pal.bg} />
        <g transform={`translate(${CX - cam.x * cam.z} ${CY - cam.y * cam.z}) scale(${cam.z})`}>
          <path d={GRAT} fill="none" stroke={pal.line} strokeWidth={1} vectorEffect="non-scaling-stroke" opacity={0.6} />
          {COUNTRIES.map((c, i) => { const on = hl.has(c.properties.name);
            return <path key={i} d={PATH(c) || ''} fill={on ? pal.landHi : pal.land} stroke={on ? pal.amber : pal.edge} strokeOpacity={on ? 0.7 : 1} strokeWidth={on ? 1.4 : 0.8} vectorEffect="non-scaling-stroke" />; })}
        </g>
        {pins.map((q, i) => F < q.from ? null : <g key={i} opacity={ease(F, q.from, q.from + 10) * 0.8}>
          <rect x={CX + (q.x - cam.x) * cam.z - 6} y={CY + (q.y - cam.y) * cam.z - 6} width={12} height={12} fill={pal.amber} transform={`rotate(45 ${CX + (q.x - cam.x) * cam.z} ${CY + (q.y - cam.y) * cam.z})`} />
        </g>)}
      </svg>
      {/* scanlines + left scrim so graphics stay readable */}
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px)'}} />
      <AbsoluteFill style={{background: `linear-gradient(90deg, ${pal.bg}e6 0%, ${pal.bg}99 38%, ${pal.bg}11 70%)`}} />

      {/* the ideas */}
      {items.map((it, i) => {
        const next = items[i + 1];
        const exitKind = ['left', 'drop', 'fold', 'shrink'][i % 4];
        return <Sequence key={i} from={it.start} durationInFrames={it.dur}>
          <Graphic it={it} i={i} exitKind={exitKind} OV={OV}>
            {(f: number) => {
              if (it.kind === 'thumb') return <Thumb p={p} pal={pal} f={f} />;
              if (it.kind === 'outro') return <Outro p={p} pal={pal} f={f} />;
              const s: any = shotOf(it);
              const c: DC = {f, dur: it.dur, fps, s, p, pal, idx: i, toScreen: toScreenAt(it.start + f), home};
              if (s.kind === 'agenda') return agendaDesk({...c, sections, marks: it.marks});
              return DESK[kindOf(s)][varOf(it)](c);
            }}
          </Graphic>
        </Sequence>;
      })}

      {/* desk chrome: bug, dateline, chapter tab, ticker */}
      <div style={{position: 'absolute', left: 60, top: 50, display: 'flex', alignItems: 'stretch', opacity: fullFootage ? 0.85 : 1}}>
        <div style={{background: pal.red, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 12, height: 12, borderRadius: 6, background: '#fff', opacity: 0.5 + 0.5 * Math.abs(Math.sin(F / 12))}} /><Cap size={22} color="#fff">T&I Desk</Cap></div>
        <div style={{background: 'rgba(0,0,0,0.55)', padding: '8px 18px'}}><Cap size={22} color={pal.ink}>{secNo ? `${String(secNo).padStart(2, '0')} · ${sections[secNo - 1]}` : 'Tech Impact'}</Cap></div>
      </div>
      <div style={{position: 'absolute', right: 60, top: 50, background: 'rgba(0,0,0,0.55)', padding: '8px 18px'}}><Cap size={22} color={pal.dim}>{date} · {p.region}</Cap></div>
      {cur.kind !== 'thumb' ? <div style={{position: 'absolute', left: 0, bottom: 0, width: 1920, height: 62, background: '#05070b', display: 'flex', alignItems: 'center', overflow: 'hidden', borderTop: `3px solid ${pal.red}`}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 2, background: pal.red, padding: '0 22px', display: 'flex', alignItems: 'center'}}><Cap size={22} color="#fff">The numbers</Cap></div>
        <div style={{whiteSpace: 'nowrap', transform: `translateX(${260 - F * 3.2}px)`, fontFamily: HEAD, fontWeight: 600, fontSize: 32, letterSpacing: 1, color: pal.ink, textTransform: 'uppercase'}}>{ticker}</div>
      </div> : null}

      {/* chapter stinger: three slanted bars sweep across as the chapter changes */}
      {secStarts.map((s0, k) => { const t = F - (s0 - 9); if (t < 0 || t > 20) return null;
        return <AbsoluteFill key={k}>{[pal.red, '#ffffff', pal.bg].map((col, j) => { const q = eio(t, j * 2, 18 + j * 2);
          return <div key={j} style={{position: 'absolute', top: -200, height: 1480, width: 900, left: -1100 + q * 3300, background: col, transform: 'skewX(-18deg)'}} />; })}</AbsoluteFill>; })}
      {secStarts.map((s0, k) => { const t = F - s0; if (t < 0 || t > 80) return null; const a = ease(t, 2, 12) * (1 - ease(t, 66, 80));
        return <div key={'c' + k} style={{position: 'absolute', right: 60, bottom: 90, display: 'flex', alignItems: 'stretch', opacity: a, transform: `translateX(${(1 - ease(t, 2, 12)) * 60}px)`}}>
          <div style={{background: '#fff', padding: '10px 20px'}}><H size={54} color="#111">Chapter {String(k + 1).padStart(2, '0')}</H></div>
          <div style={{background: pal.red, padding: '10px 24px'}}><H size={54} color="#fff">{sections[k]}</H></div></div>; })}
    </AbsoluteFill>
  );
};

// a graphic's life: its own entrance (inside the renderer) and one of four broadcast exits while the next one arrives
const Graphic: React.FC<{it: TimelineItem; i: number; exitKind: string; OV: number; children: (f: number) => React.ReactNode}> = ({it, exitKind, OV, children}) => {
  const f = useCurrentFrame();
  // the graphic clears in the last OV frames of its own shot, so two graphics never overlap; the map carries the gap
  const e = it.dur > 3 * OV && f >= it.dur - OV ? eio(f - (it.dur - OV), 0, OV) : 0;
  const st: React.CSSProperties = !e ? {} : exitKind === 'left' ? {transform: `translateX(${-e * 1200}px)`, opacity: 1 - e}
    : exitKind === 'drop' ? {transform: `translateY(${e * 500}px)`, opacity: 1 - e}
      : exitKind === 'fold' ? {transform: `perspective(1400px) rotateX(${e * 85}deg)`, transformOrigin: '50% 0%', opacity: 1 - e * 0.8}
        : {transform: `scale(${1 - 0.3 * e})`, opacity: 1 - e};
  return <AbsoluteFill style={st}>{children(f)}</AbsoluteFill>;
};

const Thumb: React.FC<{p: DocProps; pal: DPal; f: number}> = ({p, pal, f}) => {
  const h = p.thumb.headline || p.title; const hi = (p.thumb.highlight || '').toLowerCase();
  return <>
    <div style={{position: 'absolute', left: 100, top: 300, background: pal.red, padding: '12px 26px'}}><Cap size={30} color="#fff">{p.thumb.kicker || `${p.region} · Tech Impact`}</Cap></div>
    <div style={{position: 'absolute', left: 100, top: 370, width: 1500, background: '#fff', padding: '30px 44px 22px'}}>
      <H size={h.length > 44 ? 116 : 136} color="#0b0f17">{h.split(/\s+/).map((w, i) => <span key={i} style={{color: hi && hi.includes(w.toLowerCase().replace(/[^a-z0-9$%.,]/g, '')) ? pal.red : '#0b0f17'}}>{w} </span>)}</H>
    </div>
    <div style={{position: 'absolute', left: 100, top: 840}}><Cap size={26} color={pal.ink}>T&I News · Tech Impact desk</Cap></div>
  </>;
};
const Outro: React.FC<{p: DocProps; pal: DPal; f: number}> = ({p, pal, f}) => <>
  <div style={{position: 'absolute', left: 120, top: 330, width: 1300, opacity: ease(f, 6, 18), transform: `translateY(${(1 - ease(f, 6, 18)) * 40}px)`}}>
    <Cap size={26} color={pal.amber}>From the desk</Cap>
    <H size={130} color={pal.ink} style={{marginTop: 16}}>{p.outro.line || 'Technology with real impact.'}</H>
  </div>
  <div style={{position: 'absolute', left: 120, top: 720, display: 'flex', opacity: ease(f, 20, 30)}}>
    <div style={{background: pal.red, padding: '12px 22px'}}><Cap size={26} color="#fff">Subscribe</Cap></div>
    <div style={{background: '#fff', padding: '8px 26px'}}><H size={52} color="#111">tai.news</H></div></div>
</>;
