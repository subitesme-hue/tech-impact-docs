// Shape of one documentary. n8n's script step writes the editorial fields;
// scripts/voice.py adds `timeline`, scripts/fetch_media.py adds `media` to each visual.

export type Media = {src: string; kind: 'video' | 'image'; credit?: string};

export type Visual =
  | {type: 'footage'; query: string; caption?: string; media?: Media}
  | {type: 'photo3d'; query: string; caption?: string; title?: string; media?: Media}
  | {type: 'multiframe'; queries: string[]; word?: string; medias?: Media[]}
  | {type: 'stat'; value: number; decimals?: number; prefix?: string; suffix?: string; label: string; source?: string; query?: string; media?: Media}
  | {type: 'bars'; title: string; unit?: string; items: {label: string; value: number}[]; source?: string}
  | {type: 'map'; region: string; label?: string; points?: {name: string; lat: number; lon: number}[]}
  | {type: 'newspaper'; headline: string; deck?: string; dateline?: string; query: string; media?: Media}
  | {type: 'timeline'; items: {year: string; text: string}[]}
  | {type: 'quote'; text: string; attribution: string; query: string; media?: Media}
  | {type: 'split'; heading: string; bullets: string[]; query: string; media?: Media}
  | {type: 'cards'; heading?: string; items: string[]}
  | {type: 'filmstrip'; queries: string[]; caption?: string; medias?: Media[]};

export type Beat = {narration: string; visual: Visual};

export type Segment = {kind: 'summary' | 'chapter'; title: string; beats: Beat[]};

export type TimelineItem = {
  kind: 'thumb' | 'beat' | 'ident' | 'outro';
  seg?: number;
  beat?: number;
  start: number; // frame
  dur: number; // frames
  chapterStart?: boolean;
  transition?: 'zoom' | 'glitch' | 'burn' | 'flash' | 'cut';
};

export type Caption = {text: string; start: number; end: number}; // frames

export type DocProps = {
  id: string;
  date: string;
  look: number; // 0..3 rotating look
  region: string;
  sector: string;
  title: string;
  thumb: {kicker: string; headline: string; highlight?: string; query?: string; media?: Media};
  segments: Segment[];
  outro: {narration: string; line?: string};
  captions_on?: boolean;
  timeline?: {fps: number; total: number; summaryEnd: number; items: TimelineItem[]; captions: Caption[]};
};
