import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";

/** Default mark: a plain white shield outline (swap for the project's logo). `delay` in frames. */
export const Logo: React.FC<{ size?: number; delay?: number; draw?: boolean }> = ({ size = 120, delay = 0, draw = true }) => {
  const f = useCurrentFrame() - delay;
  const { fps } = useVideoConfig();
  const p = draw ? interpolate(f, [0, fps * 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.65, 0, 0.35, 1) }) : 1;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ overflow: "visible" }}>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#0a0a0a" opacity={interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: "clamp" })} />
      <path d="M32 12 L48 18 V29 C48 39.5 41 47.5 32 51 C23 47.5 16 39.5 16 29 V18 Z" fill="none"
        stroke="#ffffff" strokeWidth={3.5} strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
    </svg>
  );
};
