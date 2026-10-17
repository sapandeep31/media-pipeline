import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";

/** Night-map backdrop: navy gradient, drifting perspective grid, teal glow, vignette. */
export const Backdrop: React.FC<{ glow?: number; grid?: boolean }> = ({ glow = 1, grid = true }) => {
  const f = useCurrentFrame();
  const drift = (f * 0.6) % 80;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, ${C.bg2} 0%, ${C.bg} 60%, #03060d 100%)`, overflow: "hidden" }}>
      {grid && (
        <div
          style={{
            position: "absolute", left: "-50%", right: "-50%", top: "35%", height: "130%",
            transform: "perspective(900px) rotateX(62deg)", transformOrigin: "50% 0%",
            backgroundImage: `linear-gradient(rgba(16,185,129,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.16) 1px, transparent 1px)`,
            backgroundSize: "80px 80px", backgroundPosition: `0px ${drift}px`,
            maskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 60%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 60%, transparent 100%)",
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(40% 35% at 50% 45%, rgba(16,185,129,${0.18 * glow}) 0%, transparent 70%)` }} />
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 260px rgba(0,0,0,0.75)" }} />
    </AbsoluteFill>
  );
};
