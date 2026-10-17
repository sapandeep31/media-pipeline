import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { C } from "./theme";
import type { Scene, Timeline } from "./types";
import { TitleCard } from "./components/TitleCard";
import { ScreenClip } from "./components/ScreenClip";
import { SplitScreen, StatsPanel, Outro } from "./components/Panels";
import { OverlayLayer } from "./components/Overlays";
import { Captions } from "./components/Captions";

const VisualLayer: React.FC<{ scene: Scene }> = ({ scene }) => {
  const v = scene.visual as any;
  switch (v.type) {
    case "title": return <TitleCard title={v.title} subtitle={v.subtitle} kicker={v.kicker} logo={v.logo} />;
    case "capture":
    case "video": return <ScreenClip src={v.src} trimStart={v.trimStart} playbackRate={v.playbackRate} clipDuration={v.clipDuration} zooms={v.zooms} callouts={v.callouts} frame={v.frame} muted={v.muted ?? true} sceneDuration={scene.duration} />;
    case "still": return <ScreenClip src={v.src} still zooms={v.zooms} callouts={v.callouts} frame={v.frame} kenburns={v.kenburns ?? { from: 1, to: 1.06 }} sceneDuration={scene.duration} />;
    case "split": return <SplitScreen left={v.left} right={v.right} tag={v.tag} />;
    case "stats": return <StatsPanel title={v.title} stats={v.stats} footnote={v.footnote} />;
    case "outro": return <Outro name={v.name} tagline={v.tagline} url={v.url} credits={v.credits} />;
    default: return <AbsoluteFill style={{ background: C.bg }} />;
  }
};

/** Scene-entry transition (the scene stacks above the previous one, so `overlap:` in the script gives a cross-transition). */
const Enter: React.FC<{ scene: Scene; children: React.ReactNode }> = ({ scene, children }) => {
  const f = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const kind = scene.transition?.in ?? "fade";
  const dur = Math.max(1, Math.round((scene.transition?.dur ?? 0.45) * fps));
  const p = interpolate(f, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.65, 0, 0.35, 1) });
  if (kind === "none" || p >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  if (kind === "slide") return <AbsoluteFill style={{ transform: `translateX(${(1 - p) * width}px)` }}>{children}</AbsoluteFill>;
  if (kind === "zoom") return <AbsoluteFill style={{ opacity: p, transform: `scale(${1.08 - 0.08 * p})`, filter: `blur(${(1 - p) * 12}px)` }}>{children}</AbsoluteFill>;
  if (kind === "wipe")
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{ clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>{children}</AbsoluteFill>
        <div style={{ position: "absolute", top: 0, bottom: 0, width: 10, left: `calc(${p * 100}% - 5px)`, background: C.accent, boxShadow: `0 0 40px 10px ${C.accent}` }} />
      </AbsoluteFill>
    );
  return <AbsoluteFill style={{ opacity: p }}>{children}</AbsoluteFill>;
};

const SceneView: React.FC<{ scene: Scene; captionsDefault: boolean }> = ({ scene, captionsDefault }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const cap = scene.captions ?? captionsDefault;
  const capOpts: { style?: "kinetic" | "subtitle"; maxWords?: number; position?: "top" | "bottom" | "auto" } = typeof cap === "object" ? cap : {};
  // auto: move captions to the top while a callout highlights something in the lower part of the frame
  const v = scene.visual as any;
  const lowCallout = (v.callouts ?? []).some((c: any) => t >= c.at - 0.3 && t <= (c.until ?? c.at + 2.5) + 0.3 && c.y > 650);
  const capPos = capOpts.position && capOpts.position !== "auto" ? capOpts.position : lowCallout ? "top" : "bottom";
  return (
    <Enter scene={scene}>
      <VisualLayer scene={scene} />
      {(scene.overlays ?? []).map((o, i) => <OverlayLayer key={i} o={o} t={t} sceneDuration={scene.duration} />)}
      {cap && scene.words.length > 0 && <Captions words={scene.words} style={capOpts.style} maxWords={capOpts.maxWords} position={capPos} />}
      {scene.narration.file && (
        <Sequence from={Math.round(scene.narration.offset * fps)} layout="none">
          <Audio src={staticFile(scene.narration.file)} />
        </Sequence>
      )}
      {(scene.sfx ?? []).map((s, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(s.at * fps))} layout="none">
          <Audio src={staticFile(s.src)} volume={s.volume ?? 0.6} />
        </Sequence>
      ))}
    </Enter>
  );
};

/** Music gain at absolute time t: ducked under narration with smooth 0.3 s ramps, faded in/out at the ends. */
function musicGain(tl: Timeline, t: number) {
  const m = tl.meta.music!;
  const base = m.volume ?? 0.35, duck = m.duck ?? 0.35;
  let near = 0;
  for (const s of tl.scenes) {
    if (!s.narration.file) continue;
    const a = s.start + s.narration.offset, b = a + s.narration.duration;
    const w = interpolate(t, [a - 0.35, a, b, b + 0.5], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    near = Math.max(near, w);
  }
  const fade = interpolate(t, [0, m.fadeIn ?? 1, tl.total - (m.fadeOut ?? 2), tl.total], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return base * (1 - near * (1 - duck)) * fade;
}

export const Main: React.FC<{ timeline: Timeline }> = ({ timeline }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {timeline.scenes.map((s) => (
        <Sequence key={s.id} name={s.id} from={Math.round(s.start * fps)} durationInFrames={Math.max(1, Math.round(s.duration * fps))} premountFor={fps}>
          <SceneView scene={s} captionsDefault={timeline.meta.captions ?? true} />
        </Sequence>
      ))}
      {timeline.meta.music && <Audio src={staticFile(timeline.meta.music.src)} loop volume={(f) => musicGain(timeline, f / fps)} />}
    </AbsoluteFill>
  );
};
