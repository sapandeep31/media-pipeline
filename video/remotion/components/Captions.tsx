import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { C, fontFamily } from "../theme";
import type { Word } from "../types";

/** Group words into caption phrases: break after sentence/clause punctuation or every maxWords. */
export function phrases(words: Word[], maxWords = 6): Word[][] {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length >= maxWords || /[.!?;:,—]$/.test(w.w)) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}

/**
 * Kinetic captions synced to whisper word timings: words pop in as spoken; the active word glows teal.
 * style="subtitle" gives plain accessible subtitles instead.
 */
export const Captions: React.FC<{ words: Word[]; style?: "kinetic" | "subtitle"; maxWords?: number; position?: "top" | "bottom" }> = ({ words, style = "kinetic", maxWords = 6, position = "bottom" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const groups = phrases(words, maxWords);
  const g = groups.find((p, i) => {
    const next = groups[i + 1];
    return t >= p[0].s - 0.12 && t < (next ? next[0].s - 0.12 : p[p.length - 1].e + 0.6);
  });
  if (!g) return null;
  const gIn = interpolate(t, [g[0].s - 0.12, g[0].s + 0.08], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, right: 0, ...(position === "top" ? { top: 64 } : { bottom: 70 }), display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ fontFamily, fontSize: style === "kinetic" ? 50 : 40, fontWeight: style === "kinetic" ? 700 : 500, letterSpacing: -0.5, color: C.text, background: "rgba(3,7,18,0.72)", backdropFilter: "blur(8px)", border: `1px solid ${C.line}`, borderRadius: 18, padding: "14px 30px", display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center", maxWidth: 1500, opacity: gIn, boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
        {g.map((w, i) => {
          if (style === "subtitle") return <span key={i}>{w.w}</span>;
          const pop = spring({ frame: Math.round((t - w.s) * fps) + 2, fps, config: { damping: 15, stiffness: 180, mass: 0.5 } });
          const active = t >= w.s && t < w.e + 0.05;
          const spoken = t >= w.s;
          return (
            <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - pop) * 16}px) scale(${active ? 1.04 : 1})`, opacity: spoken ? 1 : 0.28, color: active ? C.accent2 : C.text, textShadow: active ? "0 0 18px rgba(16,185,129,0.6)" : "none" }}>
              {w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};
