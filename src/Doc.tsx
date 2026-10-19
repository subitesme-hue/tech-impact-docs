import React from 'react';
import {AbsoluteFill, Sequence} from 'remotion';
import type {DocProps, Media, Visual} from './types';
import {lookOf} from './theme';
import {FilmTexture, Hud} from './components/Layers';
import {CutOverlay, Entry} from './components/Transitions';
import {VisualScene} from './scenes/Scenes';
import {ChapterCard, Ident, Outro, Subtitles, Thumb} from './scenes/Brand';

const firstMedia = (v: Visual): Media | undefined =>
  (v as any).media || ((v as any).medias || []).find(Boolean);

export const Doc: React.FC<DocProps> = (p) => {
  const look = lookOf(p.look);
  const tl = p.timeline;
  if (!tl) return <AbsoluteFill style={{background: look.bg}} />;
  const medias = p.segments.flatMap((s) => s.beats.map((b) => firstMedia(b.visual))).filter(Boolean) as Media[];
  const chapters = p.segments.filter((s) => s.kind === 'chapter');
  return (
    <AbsoluteFill style={{background: look.bg}}>
      {tl.items.map((it, i) => {
        const seg = it.seg !== undefined ? p.segments[it.seg] : undefined;
        const beat = seg && it.beat !== undefined ? seg.beats[it.beat] : undefined;
        const seed = i * 17 + 5;
        const chapterNo = seg && seg.kind === 'chapter' ? chapters.indexOf(seg) + 1 : 0;
        let body: React.ReactNode = null;
        if (it.kind === 'thumb') body = <Thumb p={p} look={look} dur={it.dur} />;
        else if (it.kind === 'ident') body = <Ident p={p} look={look} medias={medias} dur={it.dur} />;
        else if (it.kind === 'outro') body = <Outro p={p} look={look} media={medias[medias.length - 1]} dur={it.dur} />;
        else if (beat) {
          body = (
            <>
              <VisualScene v={beat.visual} look={look} seed={seed} dur={it.dur} region={p.region} ltDelay={it.chapterStart ? 84 : 8} />
              <Hud look={look}
                left={seg!.kind === 'summary' ? 'IN THIS FILM' : `CH ${String(chapterNo).padStart(2, '0')} · ${seg!.title.toUpperCase()}`}
                right={`${p.region.toUpperCase()} · ${p.sector.toUpperCase()}`} />
              {it.chapterStart ? <ChapterCard n={chapterNo} title={seg!.title} look={look} /> : null}
            </>
          );
        }
        return (
          <React.Fragment key={i}>
            <Sequence from={it.start} durationInFrames={it.dur} name={`${it.kind}-${i}`}>
              <Entry kind={i === 0 ? 'cut' : it.transition || 'cut'}>{body}</Entry>
            </Sequence>
            {i > 0 && it.transition && it.transition !== 'cut' ? (
              <Sequence from={Math.max(0, it.start - 6)} durationInFrames={22} name={`tx-${i}`}>
                <CutOverlay kind={it.transition} look={look} seed={seed} />
              </Sequence>
            ) : null}
          </React.Fragment>
        );
      })}
      <FilmTexture look={look} />
      {p.captions_on !== false ? <Subtitles caps={tl.captions} look={look} hideFrom={tl.items[tl.items.length - 1].start} /> : null}
    </AbsoluteFill>
  );
};
