import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { C, fontFamily, monoFamily, shadow } from "../theme";
import { Backdrop } from "./Backdrop";
import { Counter } from "./Overlays";
import { Logo } from "./Logo";
import type { StatSpec } from "../types";

/** Same-night split screen: two clips/stills with labels and a sweeping divider. */
export const SplitScreen: React.FC<{ left: { src: string; label?: string; trimStart?: number; still?: boolean }; right: { src: string; label?: string; trimStart?: number; still?: boolean }; tag?: string }> = ({ left, right, tag }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const open = interpolate(f, [0, fps * 0.9], [0, 1], { extrapolateRight: "clamp", easing: Easing.bezier(0.65, 0, 0.35, 1) });
  const pane = (p: typeof left, side: "l" | "r") => {
    const media = p.still
      ? <Img src={staticFile(p.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      : <OffthreadVideo src={staticFile(p.src)} muted trimBefore={Math.round((p.trimStart ?? 0) * fps)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
    const accent = side === "l" ? C.danger : C.accent;
    return (
      <div style={{ position: "relative", width: 900, height: 600, borderRadius: 20, overflow: "hidden", boxShadow: shadow, border: `2px solid ${accent}55`, transform: `translateX(${(1 - open) * (side === "l" ? -60 : 60)}px)`, opacity: open }}>
        {media}
        {p.label && (
          <div style={{ position: "absolute", top: 18, left: 18, fontFamily, fontWeight: 700, fontSize: 28, color: "#fff", background: `${accent}dd`, borderRadius: 10, padding: "6px 16px" }}>{p.label}</div>
        )}
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <Backdrop glow={0.6} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, flexDirection: "row" }}>
        {pane(left, "l")}
        {pane(right, "r")}
      </AbsoluteFill>
      {tag && (
        <div style={{ position: "absolute", top: 150, left: 0, right: 0, textAlign: "center", fontFamily: monoFamily, fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: C.accent2, opacity: open }}>{tag}</div>
      )}
    </AbsoluteFill>
  );
};

/** Big-number stat cards, e.g. "₹14k spent" → "risk −5.6". Each stat may have its own `at` (s). */
export const StatsPanel: React.FC<{ title?: string; stats: (StatSpec & { at?: number })[]; footnote?: string }> = ({ title, stats, footnote }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  return (
    <AbsoluteFill style={{ fontFamily, color: C.text }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 60 }}>
        {title && <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1.5, opacity: interpolate(t, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }) }}>{title}</div>}
        <div style={{ display: "flex", gap: 40 }}>
          {stats.map((s, i) => {
            const at = s.at ?? 0.3 + i * 0.5;
            const pop = spring({ frame: Math.round((t - at) * fps), fps, config: { damping: 16, stiffness: 140 } });
            return (
              <div key={i} style={{ minWidth: 380, padding: "40px 46px", borderRadius: 26, background: C.panel, border: `1px solid ${C.line}`, boxShadow: shadow, opacity: Math.min(1, pop * 1.3), transform: `translateY(${(1 - pop) * 40}px)` }}>
                <Counter {...s} t={t} at={at} size={110} color={s.color ?? (i === stats.length - 1 ? C.accent2 : C.text)} />
                {s.label && <div style={{ fontSize: 30, color: C.dim, marginTop: 8 }}>{s.label}</div>}
              </div>
            );
          })}
        </div>
        {footnote && <div style={{ fontFamily: monoFamily, fontSize: 22, color: C.dim, opacity: 0.8 }}>{footnote}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Logo outro with tagline + URL. */
export const Outro: React.FC<{ name?: string; tagline?: string; url?: string; credits?: string[] }> = ({ name: product = "", tagline, url, credits }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const name = spring({ frame: f - fps * 0.6, fps, config: { damping: 200 } });
  const tag = spring({ frame: f - fps * 1.0, fps, config: { damping: 200 } });
  const glow = 0.8 + 0.2 * Math.sin((f / fps) * 2.2);
  return (
    <AbsoluteFill style={{ fontFamily, color: C.text }}>
      <Backdrop glow={glow} grid />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 26 }}>
        <Logo size={170} />
        <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: -3, opacity: name, transform: `translateY(${(1 - name) * 30}px)` }}>{product}</div>
        {tagline && <div style={{ fontSize: 40, color: C.dim, opacity: tag, transform: `translateY(${(1 - tag) * 16}px)` }}>{tagline}</div>}
        {url && <div style={{ marginTop: 14, fontFamily: monoFamily, fontSize: 30, color: C.accent2, opacity: tag, border: `1px solid rgba(110,231,183,0.35)`, borderRadius: 999, padding: "10px 26px" }}>{url}</div>}
        {credits && <div style={{ marginTop: 30, fontSize: 22, color: C.dim, opacity: tag * 0.8, textAlign: "center", lineHeight: 1.5 }}>{credits.map((c, i) => <div key={i}>{c}</div>)}</div>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
