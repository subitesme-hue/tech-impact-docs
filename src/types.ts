// V3 episode shape. The writer (scripts/write.mjs) produces segments -> beats -> shots;
// scripts/voice.py adds word timings and the frame timeline; scripts/fetch_media.py adds media to footage shots.

export type Media = {src: string; kind: 'video' | 'image'; credit?: string};
export type Pt = {name: string; lat: number; lon: number};
export type IconItem = {icon: string; label: string};

export type Shot = (
  | {kind: 'globe'; focus: {lat: number; lon: number}; region?: string; points?: Pt[]; arcs?: [number, number][]; label?: string}
  | {kind: 'route'; points: Pt[]; mover?: string; compare?: {label: string; value: string}[]; label?: string}
  | {kind: 'flow'; nodes: IconItem[]; mover?: string; label?: string}
  | {kind: 'counter'; value: number; from?: number; prefix?: string; suffix?: string; decimals?: number; label: string; icon?: string; source?: string}
  | {kind: 'compare'; title?: string; left: IconItem & {value: string}; right: IconItem & {value: string}}
  | {kind: 'units'; total: number; highlight: number; icon: string; label: string}
  | {kind: 'chart'; chart: 'line' | 'bar'; title: string; unit?: string; prefix?: string; points: {label: string; value: number}[]; source?: string}
  | {kind: 'steps'; items: IconItem[]}
  | {kind: 'network'; center: IconItem; nodes: IconItem[]}
  | {kind: 'icons'; title?: string; items: IconItem[]}
  | {kind: 'timeline'; items: {year: string; text: string}[]}
  | {kind: 'kinetic'; text: string; emphasis?: string}
  | {kind: 'device'; device: 'phone' | 'laptop'; app: string; lines: string[]}
  | {kind: 'footage'; query: string; label?: string; media?: Media}
  | {kind: 'agenda'; items?: string[]}
) & {at?: string};

export type Beat = {narration: string; shots: Shot[]};
export type Segment = {kind: 'summary' | 'chapter'; title: string; beats: Beat[]};

export type TimelineItem = {
  kind: 'thumb' | 'shot' | 'outro';
  seg?: number;
  beat?: number;
  shot?: number;
  start: number; // frame
  dur: number; // frames
  sectionStart?: boolean;
};

export type DocProps = {
  id: string;
  date: string;
  look: number;
  region: string;
  sector: string;
  title: string;
  tech?: string;
  thumb: {kicker: string; headline: string; highlight?: string; query?: string; media?: Media; focus?: {lat: number; lon: number}};
  segments: Segment[];
  outro: {narration: string; line?: string};
  has_logo?: boolean;
  backdrops?: Media[];
  timeline?: {fps: number; total: number; summaryEnd: number; items: TimelineItem[]};
};

// Building blocks still used by the example-window / device scenes.
export type Caption = {text: string; start: number; end: number};
export type Visual =
  | {type: 'ui'; variant: 'chat' | 'dashboard' | 'list' | 'notify'; app: string; lines: string[]; kpis?: {label: string; value: string}[]}
  | {type: 'device'; kind: 'laptop' | 'phone'; query: string; media?: Media}
  | {type: 'agenda'; items?: string[]};
