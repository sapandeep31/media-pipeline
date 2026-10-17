import React from "react";
import { interpolate, spring, useVideoConfig, Easing } from "remotion";
import { C, fontFamily, monoFamily } from "../theme";
import type { Overlay, StatSpec } from "../types";

const win = (t: number, at: number, until: number, fadeIn = 0.35, fadeOut = 0.35) =>
  interpolate(t, [at, at + fadeIn, until - fadeOut, until], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Animated number with prefix/suffix, e.g. ₹14k or −5.6 */
export const Counter: React.FC<StatSpec & { t: number; at: number; size?: number; dur?: number }> = ({ from, to, prefix = "", suffix = "", decimals = 0, t, at, size = 96, color, dur = 1.3 }) => {
  const p = interpolate(t, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const v = from + (to - from) * p;
  const txt = `${prefix}${Math.abs(v).toFixed(decimals)}${suffix}`;
  return <span style={{ fontFamily, fontSize: size, fontWeight: 800, letterSpacing: -2, color: color ?? C.text, fontVariantNumeric: "tabular-nums" }}>{v < 0 ? "−" : ""}{txt}</span>;
};

export const LowerThird: React.FC<{ t: number; at: number; until: number; title: string; subtitle?: string }> = ({ t, at, until, title, subtitle }) => {
  const { fps } = useVideoConfig();
  const bar = spring({ frame: Math.round((t - at) * fps), fps, config: { damping: 200 }, durationInFrames: Math.round(fps * 0.45) });
  const txt = spring({ frame: Math.round((t - at - 0.15) * fps), fps, config: { damping: 200 } });
  const out = interpolate(t, [until - 0.35, until], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (t < at || t > until) return null;
  return (
    <div style={{ position: "absolute", left: 110, bottom: 150, opacity: out, fontFamily, display: "flex", alignItems: "stretch", gap: 0 }}>
      <div style={{ width: 8, borderRadius: 4, background: C.accent, transform: `scaleY(${bar})`, transformOrigin: "bottom", boxShadow: `0 0 18px ${C.accent}` }} />
      <div style={{ overflow: "hidden", background: "rgba(3,7,18,0.8)", backdropFilter: "blur(8px)", borderRadius: "0 14px 14px 0", padding: "16px 28px", clipPath: `inset(0 ${(1 - bar) * 100}% 0 0)` }}>
        <div style={{ fontSize: 40, fontWeight: 700, color: C.text, transform: `translateX(${(1 - txt) * -30}px)`, opacity: txt }}>{title}</div>
        {subtitle && <div style={{ fontFamily: monoFamily, fontSize: 22, color: C.accent2, marginTop: 4, letterSpacing: 1, opacity: txt }}>{subtitle}</div>}
      </div>
    </div>
  );
};

/** Renders one overlay at scene-relative time t. */
export const OverlayLayer: React.FC<{ o: Overlay; t: number; sceneDuration: number }> = ({ o, t, sceneDuration }) => {
  const until = o.until ?? sceneDuration;
  if (t < o.at - 0.05 || t > until + 0.05) return null;
  if (o.type === "lowerThird") return <LowerThird t={t} at={o.at} until={until} title={o.title} subtitle={o.subtitle} />;
  const a = win(t, o.at, until);
  if (o.type === "text") {
    const pos: React.CSSProperties = o.position === "top" ? { top: 90 } : o.position === "bottom" ? { bottom: 190 } : { top: "50%", transform: "translateY(-50%)" };
    return (
      <div style={{ position: "absolute", left: 0, right: 0, ...pos, textAlign: "center", opacity: a, fontFamily, fontWeight: 800, fontSize: o.size ?? 72, color: C.text, letterSpacing: -1.5, textShadow: "0 6px 30px rgba(0,0,0,0.7)" }}>
        <span style={{ transform: `translateY(${(1 - a) * 20}px)`, display: "inline-block" }}>{o.text}</span>
      </div>
    );
  }
  if (o.type === "badge") {
    return (
      <div style={{ position: "absolute", left: o.x ?? 120, top: o.y ?? 110, opacity: a, transform: `scale(${0.9 + 0.1 * a})`, fontFamily: monoFamily, fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: C.accent2, background: "rgba(3,7,18,0.8)", border: `1px solid rgba(110,231,183,0.4)`, borderRadius: 999, padding: "10px 20px" }}>
        ● {o.text}
      </div>
    );
  }
  if (o.type === "stat") {
    return (
      <div style={{ position: "absolute", left: o.x ?? 1380, top: o.y ?? 120, opacity: a, background: "rgba(3,7,18,0.82)", backdropFilter: "blur(10px)", border: `1px solid ${C.line}`, borderRadius: 20, padding: "22px 32px", fontFamily, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <Counter {...o} t={t} at={o.at} size={78} />
        {o.label && <div style={{ fontSize: 24, color: C.dim, marginTop: 6 }}>{o.label}</div>}
      </div>
    );
  }
  return null;
};
