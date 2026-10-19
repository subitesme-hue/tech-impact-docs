import React from 'react';
import {AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame} from 'remotion';
import type {DocProps, Shot} from '../types';
import {DISPLAY, Look, MONO, SANS, lookOf} from '../theme';
import {MediaLayer} from '../components/Layers';
import {UiExample} from '../scenes/Examples';
import {Logo} from '../scenes/Brand';
import {Globe, Route} from './maps';
import {Chart, Compare, Counter, Flow, FootageShot, Icons, Kinetic, Network, Steps, Timeline, Units} from './diagrams';
import {Label, Stage, ease} from './kit';

const ShotView: React.FC<{s: Shot; look: Look; dur: number; seed: number; sections: string[]; p: DocProps}> = ({s, look, dur, seed, sections, p}) => {
  switch (s.kind) {
    case 'globe': return <Globe look={look} dur={dur} focus={s.focus} region={s.region || p.region} points={s.points} arcs={s.arcs} label={s.label} />;
    case 'route': return <Route look={look} dur={dur} points={s.points} mover={s.mover} compare={s.compare} label={s.label} />;
    case 'flow': return <Flow look={look} dur={dur} nodes={s.nodes} mover={s.mover} label={s.label} />;
    case 'counter': return <Counter look={look} dur={dur} {...s} />;
    case 'compare': return <Compare look={look} dur={dur} title={s.title} left={s.left} right={s.right} />;
    case 'units': return <Units look={look} dur={dur} total={s.total} highlight={s.highlight} icon={s.icon} label={s.label} />;
    case 'chart': return <Chart look={look} dur={dur} chart={s.chart} title={s.title} unit={s.unit} prefix={(s as any).prefix} points={s.points} source={s.source} />;
    case 'steps': return <Steps look={look} dur={dur} items={s.items} />;
    case 'network': return <Network look={look} dur={dur} center={s.center} nodes={s.nodes} />;
    case 'icons': return <Icons look={look} dur={dur} title={s.title} items={s.items} />;
    case 'timeline': return <Timeline look={look} dur={dur} items={s.items} />;
    case 'kinetic': return <Kinetic look={look} dur={dur} text={s.text} emphasis={s.emphasis} />;
    case 'device': return <UiExample look={look} seed={seed} dur={dur} v={{type: 'ui', variant: s.device === 'phone' ? 'notify' : 'list', app: s.app, lines: s.lines}} />;
    case 'footage': return <FootageShot look={look} dur={dur} media={s.media} label={s.label} seed={seed} />;
    case 'agenda': return <Agenda look={look} dur={dur} items={sections} tech={p.title || p.tech || ''} />;
    default: return <Stage look={look} dur={dur} />;
  }
};

// "In this episode": the six parts light up while the presenter names them.
const Agenda: React.FC<{look: Look; dur: number; items: string[]; tech: string}> = ({look, dur, items, tech}) => {
  const f = useCurrentFrame();
  const per = Math.max(8, (dur - 20) / Math.max(1, items.length));
  const active = Math.min(items.length - 1, Math.floor((f - 12) / per));
  return (
    <Stage look={look} dur={dur} push={0.03}>
      <div style={{position: 'absolute', left: 140, top: 230, width: 700}}>
        <Label size={24} color={look.accent} style={{opacity: ease(f, 0, 10)}}>In this episode</Label>
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 96, lineHeight: 1.0, color: look.ink, textTransform: 'uppercase', marginTop: 26, opacity: ease(f, 3, 16)}}>{tech}</div>
      </div>
      <div style={{position: 'absolute', left: 1000, top: 220}}>
        {items.map((it, i) => {
          const p = ease(f, 10 + i * per, 20 + i * per);
          const on = i === active;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, height: 92, opacity: 0.3 + 0.7 * p}}>
              <div style={{width: on ? 22 : 14, height: on ? 22 : 14, borderRadius: 11, background: on ? look.accent : 'rgba(255,255,255,0.5)', marginLeft: on ? 0 : 4}} />
              <div style={{fontFamily: SANS, fontWeight: on ? 700 : 500, fontSize: on ? 40 : 34, color: on ? '#fff' : 'rgba(255,255,255,0.75)'}}>{it}</div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

// Nat Geo-style section rail on the left: where we are in the episode.
const Rail: React.FC<{look: Look; sections: string[]; active: number}> = ({look, sections, active}) => (
  <div style={{position: 'absolute', left: 54, top: 340, width: 420, pointerEvents: 'none'}}>
    <div style={{position: 'absolute', left: 7, top: 8, width: 1.5, height: (sections.length - 1) * 64, background: 'rgba(255,255,255,0.3)'}} />
    {sections.map((s, i) => (
      <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, height: 64}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: i === active ? look.accent : i < active ? 'rgba(255,255,255,0.75)' : 'transparent',
          border: `1.5px solid ${i === active ? look.accent : 'rgba(255,255,255,0.6)'}`, zIndex: 1}} />
        {i === active ? <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 19, letterSpacing: 3, textTransform: 'uppercase', color: '#fff',
          textShadow: '0 2px 10px rgba(0,0,0,0.8)'}}>{s}</div> : null}
      </div>
    ))}
  </div>
);

const Thumb3: React.FC<{p: DocProps; look: Look; dur: number}> = ({p, look, dur}) => {
  const h = p.thumb.headline || p.title;
  const hi = p.thumb.highlight || '';
  const i = hi ? h.toLowerCase().indexOf(hi.toLowerCase()) : -1;
  const parts = i < 0 ? [h] : [h.slice(0, i), h.slice(i, i + hi.length), h.slice(i + hi.length)];
  return (
    <AbsoluteFill>
      {p.thumb.media ? <MediaLayer media={p.thumb.media} look={look} seed={3} dur={dur} push={0.02} />
        : <Globe look={look} dur={1} focus={p.thumb.focus || {lat: 25, lon: 45}} region={p.region} />}
      <AbsoluteFill style={{background: `linear-gradient(90deg, ${look.bg}f5 0%, ${look.bg}c0 48%, rgba(0,0,0,0) 100%)`}} />
      <div style={{position: 'absolute', left: 110, top: 96}}><Logo look={look} hasLogo={p.has_logo} /></div>
      <div style={{position: 'absolute', left: 110, top: 320, width: 1100}}>
        <div style={{display: 'inline-block', background: look.accent, color: '#0b0b10', fontFamily: MONO, fontSize: 28, letterSpacing: 4, padding: '10px 18px',
          textTransform: 'uppercase'}}>{p.thumb.kicker}</div>
        <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: h.length > 44 ? 108 : 126, lineHeight: 1.0, color: look.ink, textTransform: 'uppercase', marginTop: 28}}>
          {parts.map((t, k) => <span key={k} style={{color: k === 1 ? look.accent : look.ink}}>{t}</span>)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Outro3: React.FC<{p: DocProps; look: Look; dur: number}> = ({p, look, dur}) => {
  const f = useCurrentFrame();
  return (
    <Stage look={look} dur={dur}>
      <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{opacity: ease(f, 0, 14)}}><Logo look={look} hasLogo={p.has_logo} size={1.6} /></div>
        {p.outro.line ? <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 42, color: look.ink, marginTop: 40, maxWidth: 1300, textAlign: 'center',
          opacity: ease(f, 8, 24)}}>{p.outro.line}</div> : null}
        <Label size={26} color={look.accent} style={{marginTop: 40, opacity: ease(f, 18, 32)}}>Subscribe · more episodes at tai.news</Label>
      </AbsoluteFill>
    </Stage>
  );
};

export const Doc3: React.FC<DocProps> = (p) => {
  const look = lookOf(p.look);
  const tl = p.timeline;
  const f = useCurrentFrame();
  if (!tl) return <AbsoluteFill style={{background: look.bg}} />;
  const sections = p.segments.filter((s) => s.kind === 'chapter').map((s) => s.title);
  const cur = tl.items.filter((i) => i.start <= f).pop();
  const curSeg = cur && cur.seg !== undefined ? p.segments[cur.seg] : undefined;
  const activeSection = curSeg && curSeg.kind === 'chapter' ? sections.indexOf(curSeg.title) : -1;
  const curShot = cur && cur.kind === 'shot' ? p.segments[cur.seg!].beats[cur.beat!].shots[cur.shot!] : undefined;
  return (
    <AbsoluteFill style={{background: look.bg}}>
      {tl.items.map((it, i) => {
        let body: React.ReactNode = null;
        if (it.kind === 'thumb') body = <Thumb3 p={p} look={look} dur={it.dur} />;
        else if (it.kind === 'outro') body = <Outro3 p={p} look={look} dur={it.dur} />;
        else {
          const s = p.segments[it.seg!].beats[it.beat!].shots[it.shot!];
          body = <ShotView s={s} look={look} dur={it.dur} seed={i * 17 + 3} sections={sections} p={p} />;
        }
        return <Sequence key={i} from={it.start} durationInFrames={it.dur} name={`${it.kind}-${i}`}>{body}</Sequence>;
      })}
      {activeSection >= 0 && curShot?.kind !== 'agenda' ? <Rail look={look} sections={sections} active={activeSection} /> : null}
      <AbsoluteFill style={{pointerEvents: 'none', backgroundImage: `url(${staticFile('grain.png')})`, mixBlendMode: 'overlay', opacity: 0.07,
        backgroundPosition: `${(f * 37) % 512}px ${(f * 91) % 512}px`}} />
    </AbsoluteFill>
  );
};
export const _img = Img;
