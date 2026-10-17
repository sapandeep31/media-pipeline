import React from "react";
import { AbsoluteFill, Freeze, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { shadow } from "../theme";
import { Backdrop } from "./Backdrop";
import { Callout } from "./Callout";
import type { CalloutSpec, Zoom } from "../types";

const SRC_W = 1920, SRC_H = 1080;
const smooth = Easing.bezier(0.45, 0, 0.2, 1);

/** Camera state (scale + focus point) from a list of zoom keyframes at time t (s). */
export function cameraAt(zooms: Zoom[] | undefined, t: number) {
  let s = 1, fx = SRC_W / 2, fy = SRC_H / 2;
  for (const z of zooms ?? []) {
    const e = z.ease ?? 0.7, dur = z.dur ?? 2.5;
    const w = interpolate(t, [z.at, z.at + e, z.at + dur - e, z.at + dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: smooth });
    if (w <= 0) continue;
    const target = z.scale ?? 1.8;
    s = 1 + (target - 1) * w;
    fx = SRC_W / 2 + (z.x - SRC_W / 2) * w;
    fy = SRC_H / 2 + (z.y - SRC_H / 2) * w;
  }
  let tx = SRC_W / 2 - fx * s, ty = SRC_H / 2 - fy * s;
  tx = Math.min(0, Math.max(SRC_W - SRC_W * s, tx));
  ty = Math.min(0, Math.max(SRC_H - SRC_H * s, ty));
  return { s, tx, ty };
}

/**
 * Screen recording / still with smooth zoom-ins and callouts.
 * frame="window": floats the recording as a rounded window over the night backdrop (polished look);
 * frame="full": full-bleed.
 */
export const ScreenClip: React.FC<{
  src: string; still?: boolean; trimStart?: number; playbackRate?: number; clipDuration?: number;
  zooms?: Zoom[]; callouts?: CalloutSpec[]; frame?: "full" | "window"; muted?: boolean; kenburns?: { from?: number; to?: number; x?: number; y?: number };
  sceneDuration?: number;
}> = ({ src, still, trimStart = 0, playbackRate = 1, clipDuration, zooms, callouts, frame = "window", muted = true, kenburns, sceneDuration = 10 }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = f / fps;
  const cam = cameraAt(zooms, t);
  // slow Ken Burns push on stills (applied under the zoom camera, origin at kenburns.x/y)
  const kb = still && kenburns ? interpolate(t, [0, sceneDuration], [kenburns.from ?? 1, kenburns.to ?? 1.08]) : 1;
  const media = still ? (
    <div style={{ width: SRC_W, height: SRC_H, overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ width: SRC_W, height: SRC_H, objectFit: "cover", transform: `scale(${kb})`, transformOrigin: `${kenburns?.x ?? SRC_W / 2}px ${kenburns?.y ?? SRC_H / 2}px` }} />
    </div>
  ) : (
    <OffthreadVideo src={staticFile(src)} trimBefore={Math.round(trimStart * fps)} playbackRate={playbackRate} muted={muted} style={{ width: SRC_W, height: SRC_H }} />
  );
  // hold the last frame if the clip is shorter than the scene
  const lastFrame = clipDuration ? Math.max(0, Math.floor(((clipDuration - trimStart) / playbackRate) * fps) - 2) : Infinity;
  const body = !still && f > lastFrame ? <Freeze frame={lastFrame}>{media}</Freeze> : media;

  const camera = (
    <div style={{ position: "absolute", width: SRC_W, height: SRC_H, transformOrigin: "0 0", transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})` }}>
      {body}
      {(callouts ?? []).map((c, i) => <Callout key={i} spec={c} t={t} />)}
    </div>
  );

  if (frame === "full") {
    return <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}><div style={{ transform: `scale(${width / SRC_W})`, transformOrigin: "0 0" }}>{camera}</div></AbsoluteFill>;
  }
  const enter = interpolate(f, [0, fps * 0.8], [0, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const k = 0.86 * (width / SRC_W) * (0.97 + 0.03 * enter);
  return (
    <AbsoluteFill>
      <Backdrop glow={0.7} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: SRC_W * k, height: SRC_H * k, borderRadius: 22, overflow: "hidden", boxShadow: shadow, position: "relative", transform: `translateY(${(1 - enter) * 30}px)` }}>
          <div style={{ transform: `scale(${k})`, transformOrigin: "0 0", width: SRC_W, height: SRC_H, position: "relative", overflow: "hidden" }}>{camera}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
