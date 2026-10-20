import React from 'react';
import {AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame} from 'remotion';
import type {DocProps, Shot} from '../types';
import {DISPLAY, Look, MONO, SANS, lookOf} from '../theme';
import {MediaLayer} from '../components/Layers';
import {UiExample} from '../scenes/Examples';
import {Logo} from '../scenes/Brand';
import {Globe, Route} from './maps';
import {Chart, Compare, Counter, Flow, FootageShot, Icons, Kinetic, Network, Steps, Timeline, Units} from './diagrams';
import {Contents, Gauge, Headline, PaperMap, SectionWipe, Typed, WireGlobe} from './families';
import {BackdropCtx, Duotone, Label, LookCtx, Stage, ease} from './kit';

// No regional footage found: the section's regional photo in duotone with the place callout (never a clip from the wrong country).
const PlaceShot: React.FC<{look: Look; dur: number; back?: string; label?: string}> = ({look, dur, back, label}) => {
  const f = useCurrentFrame();
  if (!back) return <Stage look={look} dur={dur}>{label ? <AbsoluteFill style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <Label size={44} style={{opacity: ease(f, 4, 16)}}>{label}</Label></AbsoluteFill> : null}</Stage>;
  return (
    <AbsoluteFill style={{background: look.bg}}>
      <Duotone src={back} look={look} dur={dur} />
      <AbsoluteFill style={{background: 'linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 40%)'}} />
      {label ? (
        <div style={{position: 'absolute', left: 130, bottom: 140, display: 'flex', alignItems: 'center', gap: 20, opacity: ease(f, 8, 20)}}>
          <div style={{width: 80 * ease(f, 6, 20), height: 2, background: look.accent}} />
          <Label size={30}>{label}</Label>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const ShotView: React.FC<{s: Shot; look: Look; dur: number; seed: number; sections: string[]; p: DocProps; back?: string}> = ({s, look, dur, seed, sections, p, back}) => {
  switch (s.kind) {
    case 'globe':
      if (look.family === 'editorial') return <PaperMap look={look} dur={dur} focus={s.focus} region={s.region || p.region} points={s.points} label={s.label} />;
      if (look.family === 'blueprint') return <WireGlobe look={look} dur={dur} focus={s.focus} region={s.region || p.region} points={s.points} label={s.label} />;
      return <Globe look={look} dur={dur} focus={s.focus} region={s.region || p.region} points={s.points} arcs={s.arcs} label={s.label} />;
    case 'route': return <Route look={look} dur={dur} points={s.points} mover={s.mover} compare={s.compare} label={s.label} />;
    case 'flow': return <Flow look={look} dur={dur} nodes={s.nodes} mover={s.mover} label={s.label} />;
    case 'counter':
      if (look.family === 'blueprint') return <Gauge look={look} dur={dur} value={s.value} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} label={s.label} source={s.source} />;
      return <Counter look={look} dur={dur} {...s} />;
    case 'compare': return <Compare look={look} dur={dur} title={s.title} left={s.left} right={s.right} />;
    case 'units': return <Units look={look} dur={dur} total={s.total} highlight={s.highlight} icon={s.icon} label={s.label} />;
    case 'chart': return <Chart look={look} dur={dur} chart={s.chart} title={s.title} unit={s.unit} prefix={(s as any).prefix} points={s.points} source={s.source} />;
    case 'steps': return <Steps look={look} dur={dur} items={s.items} />;
    case 'network': return <Network look={look} dur={dur} center={s.center} nodes={s.nodes} />;
    case 'icons': return <Icons look={look} dur={dur} title={s.title} items={s.items} />;
    case 'timeline': return <Timeline look={look} dur={dur} items={s.items} />;
    case 'kinetic':
      if (look.family === 'editorial') return <Headline look={look} dur={dur} text={s.text} emphasis={s.emphasis} date={p.date} />;
      if (look.family === 'blueprint') return <Typed look={look} dur={dur} text={s.text} emphasis={s.emphasis} />;
      return <Kinetic look={look} dur={dur} text={s.text} emphasis={s.emphasis} />;
    case 'device': return <UiExample look={look} seed={seed} dur={dur} v={{type: 'ui', variant: s.device === 'phone' ? 'notify' : 'list', app: s.app, lines: s.lines}} />;
    case 'footage': return s.media ? <FootageShot look={look} dur={dur} media={s.media} label={s.label} seed={seed} />
      : <PlaceShot look={look} dur={dur} back={back} label={s.label} />;
    case 'agenda':
      if (look.family !== 'night') return <Contents look={look} dur={dur} items={sections} title={p.title || p.tech || ''} />;
      return <Agenda look={look} dur={dur} items={sections} tech={p.title || p.tech || ''} />;
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
        <div style={{fontFamily: look.headlineFont, fontWeight: 700, fontSize: look.upper ? 96 : 88, lineHeight: 1.04, color: look.ink, textTransform: look.upper ? 'uppercase' : 'none',
          marginTop: 26, opacity: ease(f, 3, 16)}}>{tech}</div>
      </div>
      <div style={{position: 'absolute', left: 1000, top: 220}}>
        {items.map((it, i) => {
          const p = ease(f, 10 + i * per, 20 + i * per);
          const on = i === active;
          return (
            <div key={i} style={{display: 'flex', alignItems: 'center', gap: 28, height: 92, opacity: 0.3 + 0.7 * p}}>
              <div style={{width: on ? 22 : 14, height: on ? 22 : 14, borderRadius: 11, background: on ? look.accent : `rgba(${look.fg},0.5)`, marginLeft: on ? 0 : 4}} />
              <div style={{fontFamily: SANS, fontWeight: on ? 700 : 500, fontSize: on ? 40 : 34, color: on ? look.ink : `rgba(${look.fg},0.75)`}}>{it}</div>
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
    <div style={{position: 'absolute', left: 7, top: 8, width: 1.5, height: (sections.length - 1) * 64, background: `rgba(${look.fg},0.3)`}} />
    {sections.map((s, i) => (
      <div key={i} style={{display: 'flex', alignItems: 'center', gap: 18, height: 64}}>
        <div style={{width: 16, height: 16, borderRadius: 8, background: i === active ? look.accent : i < active ? `rgba(${look.fg},0.75)` : 'transparent',
          border: `1.5px solid ${i === active ? look.accent : `rgba(${look.fg},0.6)`}`, zIndex: 1}} />
        {i === active ? <div style={{fontFamily: SANS, fontWeight: 600, fontSize: 19, letterSpacing: 3, textTransform: 'uppercase', color: look.ink,
          textShadow: look.mode === 'dark' ? '0 2px 10px rgba(0,0,0,0.8)' : 'none'}}>{s}</div> : null}
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
        <div style={{display: 'inline-block', background: look.accent, color: look.onAccent, fontFamily: MONO, fontSize: 28, letterSpacing: 4, padding: '10px 18px',
          textTransform: 'uppercase'}}>{p.thumb.kicker}</div>
        <div style={{fontFamily: look.headlineFont, fontWeight: 700, fontSize: (h.length > 44 ? 108 : 126) * (look.upper ? 1 : 0.92), lineHeight: look.upper ? 1.0 : 1.06,
          color: look.ink, textTransform: look.upper ? 'uppercase' : 'none', marginTop: 28}}>
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
    <LookCtx.Provider value={look}>
    <AbsoluteFill style={{background: look.bg}}>
      {tl.items.map((it, i) => {
        let body: React.ReactNode = null;
        if (it.kind === 'thumb') body = <Thumb3 p={p} look={look} dur={it.dur} />;
        else if (it.kind === 'outro') body = <Outro3 p={p} look={look} dur={it.dur} />;
        else {
          const s = p.segments[it.seg!].beats[it.beat!].shots[it.shot!];
          const bs = p.backdrops || [];
          const back = bs.length ? bs[it.seg! % bs.length].src : undefined;
          // maps keep their own clean cartography; everything else sits on the section's duotone photo
          const useBack = back && !['globe', 'route', 'footage'].includes(s.kind) ? back : undefined;
          body = <BackdropCtx.Provider value={useBack}><ShotView s={s} look={look} dur={it.dur} seed={i * 17 + 3} sections={sections} p={p} back={back} /></BackdropCtx.Provider>;
        }
        const sec = it.sectionStart && it.seg !== undefined ? sections.indexOf(p.segments[it.seg].title) : -1;
        return <React.Fragment key={i}>
          <Sequence from={it.start} durationInFrames={it.dur} name={`${it.kind}-${i}`}>{body}</Sequence>
          {sec >= 0 && look.family !== 'night' ? <Sequence from={Math.max(0, it.start - 10)} durationInFrames={30} name={`wipe-${i}`}>
            <SectionWipe look={look} title={sections[sec]} n={sec + 1} /></Sequence> : null}
        </React.Fragment>;
      })}
      {activeSection >= 0 && curShot?.kind !== 'agenda' ? <Rail look={look} sections={sections} active={activeSection} /> : null}
      <AbsoluteFill style={{pointerEvents: 'none', backgroundImage: `url(${staticFile('grain.png')})`, mixBlendMode: look.mode === 'dark' ? 'overlay' : 'multiply', opacity: look.mode === 'dark' ? 0.07 : 0.05,
        backgroundPosition: `${(f * 37) % 512}px ${(f * 91) % 512}px`}} />
    </AbsoluteFill>
    </LookCtx.Provider>
  );
};
export const _img = Img;
