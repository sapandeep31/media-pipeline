import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, fontFamily, monoFamily } from "../theme";
import { Backdrop } from "./Backdrop";
import { Logo } from "./Logo";

/** Opening / chapter title: logo draw-on, kicker pill, staggered word rise, underline sweep. */
export const TitleCard: React.FC<{ title: string; subtitle?: string; kicker?: string; logo?: boolean }> = ({ title, subtitle, kicker, logo = true }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = title.split(" ");
  const base = logo ? Math.round(fps * 0.5) : 0;
  const sweep = interpolate(f, [base + fps * 0.5, base + fps * 1.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subIn = spring({ frame: f - base - fps * 0.8, fps, config: { damping: 200 } });
  const kickIn = spring({ frame: f - 4, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ fontFamily, color: C.text }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 28 }}>
        {logo && <Logo size={132} />}
        {kicker && (
          <div style={{ opacity: kickIn, transform: `translateY(${(1 - kickIn) * 14}px)`, fontFamily: monoFamily, fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: C.accent2, border: `1px solid rgba(110,231,183,0.35)`, padding: "8px 18px", borderRadius: 999, background: "rgba(16,185,129,0.08)" }}>
            {kicker}
          </div>
        )}
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", justifyContent: "center", maxWidth: 1500 }}>
          {words.map((w, i) => {
            const s = spring({ frame: f - base - i * 3, fps, config: { damping: 14, stiffness: 120, mass: 0.7 } });
            return (
              <span key={i} style={{ display: "inline-block", fontSize: 118, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02, opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * 60}px)` }}>
                {w}
              </span>
            );
          })}
        </div>
        <div style={{ height: 6, width: 520, borderRadius: 3, background: `linear-gradient(90deg, transparent, ${C.accent}, ${C.accent2}, transparent)`, transform: `scaleX(${sweep})`, opacity: 0.9 }} />
        {subtitle && (
          <div style={{ fontSize: 40, fontWeight: 500, color: C.dim, opacity: subIn, transform: `translateY(${(1 - subIn) * 18}px)`, maxWidth: 1300, textAlign: "center", lineHeight: 1.3 }}>
            {subtitle}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
