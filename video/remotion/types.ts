// Shape of public/gen/timeline.json (built by tools/assemble/render.mjs from script + timing).
export type Word = { w: string; s: number; e: number };

export type Zoom = { at: number; dur?: number; x: number; y: number; scale?: number; ease?: number };
export type CalloutSpec = {
  at: number; until?: number;
  x: number; y: number; w?: number; h?: number; // region in source-video pixels (1920x1080 space)
  label?: string; side?: "top" | "bottom" | "left" | "right"; shape?: "rect" | "circle"; color?: string;
};
export type StatSpec = { from: number; to: number; prefix?: string; suffix?: string; decimals?: number; label?: string; color?: string };

export type Visual =
  | { type: "title"; title: string; subtitle?: string; kicker?: string }
  | { type: "capture" | "video"; src: string; trimStart?: number; playbackRate?: number; zooms?: Zoom[]; callouts?: CalloutSpec[]; frame?: "full" | "window"; muted?: boolean }
  | { type: "still"; src: string; kenburns?: { from?: number; to?: number; x?: number; y?: number }; frame?: "full" | "window"; callouts?: CalloutSpec[]; zooms?: Zoom[] }
  | { type: "split"; left: { src: string; label?: string; trimStart?: number; still?: boolean }; right: { src: string; label?: string; trimStart?: number; still?: boolean }; tag?: string }
  | { type: "stats"; title?: string; stats: (StatSpec & { at?: number })[]; footnote?: string }
  | { type: "outro"; name?: string; tagline?: string; url?: string; credits?: string[] };

export type Overlay =
  | { type: "lowerThird"; at: number; until?: number; title: string; subtitle?: string }
  | { type: "text"; at: number; until?: number; text: string; position?: "top" | "center" | "bottom"; size?: number }
  | { type: "stat"; at: number; until?: number; x?: number; y?: number } & StatSpec
  | { type: "badge"; at: number; until?: number; text: string; x?: number; y?: number };

export type Sfx = { at: number; src: string; volume?: number };

export type Scene = {
  id: string;
  start: number;
  duration: number;
  visual: Visual;
  overlays?: Overlay[];
  sfx?: Sfx[];
  captions?: boolean | { style?: "kinetic" | "subtitle"; maxWords?: number; position?: "top" | "bottom" | "auto" };
  transition?: { in?: "fade" | "slide" | "wipe" | "zoom" | "none"; dur?: number };
  narration: { file: string | null; offset: number; duration: number; text: string };
  words: Word[];
};

export type Timeline = {
  meta: {
    fps: number; width: number; height: number; title?: string;
    music?: { src: string; volume?: number; duck?: number; fadeIn?: number; fadeOut?: number };
    captions?: boolean;
  };
  total: number;
  scenes: Scene[];
};
