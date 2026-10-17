import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { C, fontFamily } from "../theme";
import type { CalloutSpec } from "../types";

/**
 * Highlight a region of the screen recording: optional spotlight dim, animated ring draw-on, label pill + leader.
 * Coordinates are in source-video pixels; render it INSIDE the zoom camera so it follows zooms.
 * `t` = seconds since scene start.
 */
export const Callout: React.FC<{ spec: CalloutSpec; t: number; dim?: boolean }> = ({ spec, t, dim = true }) => {
  const { fps } = useVideoConfig();
  const f = useCurrentFrame();
  const until = spec.until ?? spec.at + 2.5;
  if (t < spec.at - 0.05 || t > until + 0.5) return null;
  const local = (t - spec.at) * fps;
  const inP = spring({ frame: local, fps, config: { damping: 200 }, durationInFrames: Math.round(fps * 0.5) });
  const outP = interpolate(t, [until, until + 0.4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const vis = inP * outP;
  const draw = interpolate(local, [0, fps * 0.6], [0, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const w = spec.w ?? 160, h = spec.h ?? 80;
  const x = spec.x - w / 2, y = spec.y - h / 2;
  const color = spec.color ?? C.accent;
  const pulse = 1 + 0.03 * Math.sin((f / fps) * Math.PI * 2 * 1.2);
  const side = spec.side ?? "bottom";
  const r = spec.shape === "circle" ? Math.min(w, h) / 2 : 14;
  const labelPos: React.CSSProperties =
    side === "bottom" ? { left: spec.x, top: y + h + 34, transform: "translateX(-50%)" }
    : side === "top" ? { left: spec.x, top: y - 34, transform: "translate(-50%,-100%)" }
    : side === "left" ? { left: x - 34, top: spec.y, transform: "translate(-100%,-50%)" }
    : { left: x + w + 34, top: spec.y, transform: "translateY(-50%)" };
  return (
    <>
      {dim && (
        <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: r, boxShadow: `0 0 0 4000px rgba(2,6,15,${0.5 * vis})`, pointerEvents: "none" }} />
      )}
      <svg style={{ position: "absolute", left: x - 12, top: y - 12, overflow: "visible", opacity: vis }} width={w + 24} height={h + 24}>
        <rect x={12} y={12} width={w} height={h} rx={r} fill="none" stroke={color} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw}
          style={{ filter: `drop-shadow(0 0 10px ${color})`, transformOrigin: "50% 50%", transform: `scale(${pulse})` }} />
      </svg>
      {spec.label && (
        <div style={{ position: "absolute", ...labelPos, opacity: vis, fontFamily, fontSize: 30, fontWeight: 700, color: "#03130c", background: color, padding: "10px 20px", borderRadius: 12, whiteSpace: "nowrap", boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
          {spec.label}
        </div>
      )}
    </>
  );
};
