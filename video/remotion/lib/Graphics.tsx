// Walkthrough motion graphics: action titles, callouts, incident case files, lower thirds, badges, counters, backdrop.
// All take `t` = seconds into the scene (or absolute, as the caller decides) and an appear time.
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, fontFamily, monoFamily } from "../theme";
import { E, kf } from "./AppShot";

const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const prog = (t: number, a: number, d = 0.35) => cl((t - a) / d);
/** in/out envelope: 0 before `a`, eases to 1 over `d`, back to 0 over `d` ending at `b` */
export const life = (t: number, a: number, b: number, d = 0.3) => Math.min(E.out(prog(t, a, d)), 1 - E.in(prog(t, b - d, d)));
const back = (x: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

/* ------------------------------------------------------------------ backdrop */
export const Backdrop: React.FC<{ t: number; tone?: "night" | "warm" | "red" | "green" }> = ({ t, tone = "night" }) => {
  const glow = tone === "red" ? "rgba(239,68,68,0.18)" : tone === "green" ? "rgba(16,185,129,0.20)" : tone === "warm" ? "rgba(246,196,106,0.14)" : "rgba(56,189,248,0.13)";
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 80% at 50% 40%, #0f1b33 0%, #070d1a 60%, #03060d 100%)", overflow: "hidden" }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
        <defs>
          <pattern id="wb-grid" width="48" height="48" patternUnits="userSpaceOnUse" patternTransform={`translate(${(t * 6) % 48} ${(t * 3) % 48})`}>
            <path d="M48 0 L0 0 0 48" fill="none" stroke="rgba(148,163,184,0.07)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wb-grid)" />
      </svg>
      <div style={{ position: "absolute", left: "50%", top: "45%", width: 1500, height: 900, transform: "translate(-50%,-50%)", background: `radial-gradient(ellipse at center, ${glow}, rgba(0,0,0,0) 65%)` }} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ action title (top-left, full sentence) */
export const ActionTitle: React.FC<{ t: number; at: number; until: number; text: string; kicker: string; tone?: string }> = ({ t, at, until, text, kicker, tone = C.accent2 }) => {
  const o = life(t, at, until, 0.35);
  if (o <= 0.001) return null;
  const words = text.split(" ");
  return (
    <div style={{ position: "absolute", left: 56, top: 44, maxWidth: 1560, opacity: o, pointerEvents: "none" }}>
      {/* full-width dark strip: the app's top bar never shows through the title */}
      <div style={{ position: "absolute", left: -56, top: -44, width: 1920, height: 172, background: "linear-gradient(180deg, rgba(3,7,18,0.97) 0%, rgba(3,7,18,0.93) 62%, rgba(3,7,18,0.55) 84%, rgba(3,7,18,0) 100%)" }} />
      <div style={{ position: "relative", fontFamily: monoFamily, fontSize: 19, letterSpacing: 4, color: tone, textTransform: "uppercase", marginBottom: 8, transform: `translateX(${(1 - E.out(prog(t, at, 0.4))) * -30}px)` }}>
        <span style={{ display: "inline-block", width: 34 * E.out(prog(t, at, 0.5)), height: 2, background: tone, verticalAlign: "middle", marginRight: 12 }} />{kicker}
      </div>
      <div style={{ position: "relative", fontFamily, fontWeight: 700, fontSize: 42, lineHeight: 1.12, letterSpacing: -1.1, color: "#f8fafc", textShadow: "0 2px 18px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.9)" }}>
        {words.map((w, i) => {
          const p = E.out(prog(t, at + 0.08 + i * 0.035, 0.35));
          return <span key={i} style={{ display: "inline-block", marginRight: 13, opacity: p, transform: `translateY(${(1 - p) * 18}px)` }}>{w}</span>;
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ callout: ring or box + label, with leader */
export const Callout: React.FC<{
  t: number; at: number; until: number; x: number; y: number; r?: number; w?: number; h?: number; label: string; sub?: string;
  side?: "top" | "bottom" | "left" | "right"; color?: string; dist?: number; pulse?: boolean;
}> = ({ t, at, until, x, y, r = 34, w, h, label, sub, side = "top", color = C.accent2, dist = 70, pulse = false }) => {
  const o = life(t, at, until, 0.28);
  if (o <= 0.001) return null;
  const p = E.out(prog(t, at, 0.45));
  const box = w !== undefined && h !== undefined;
  const ext = box ? { top: h! / 2, bottom: h! / 2, left: w! / 2, right: w! / 2 }[side] : r;
  const dir = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[side];
  const ax = x + dir[0] * (ext + 6), ay = y + dir[1] * (ext + 6);
  const lx = x + dir[0] * (ext + dist * p), ly = y + dir[1] * (ext + dist * p);
  const pr = pulse ? 1 + 0.08 * Math.sin((t - at) * 6) : 1;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, pointerEvents: "none" }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {box ? (
          <rect x={x - w! / 2} y={y - h! / 2} width={w} height={h} rx={10} fill="none" stroke={color} strokeWidth={3}
            pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        ) : (
          <circle cx={x} cy={y} r={r * pr * (0.6 + 0.4 * p)} fill="none" stroke={color} strokeWidth={3.5} style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
        )}
        <line x1={ax} y1={ay} x2={lx} y2={ly} stroke={color} strokeWidth={2.5} />
        <circle cx={lx} cy={ly} r={4} fill={color} />
      </svg>
      <div style={{
        position: "absolute", left: lx, top: ly, transform: `translate(${side === "left" ? "-100%" : side === "right" ? "0" : "-50%"}, ${side === "top" ? "-100%" : side === "bottom" ? "0" : "-50%"}) translate(${dir[0] * 12}px, ${dir[1] * 12}px) scale(${0.85 + 0.15 * p})`,
        background: "rgba(5,10,22,0.9)", border: `2px solid ${color}`, borderRadius: 12, padding: "9px 16px", whiteSpace: "nowrap", boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 25, color: "#f8fafc", letterSpacing: -0.3 }}>{label}</div>
        {sub ? <div style={{ fontFamily: monoFamily, fontSize: 16, color, marginTop: 2 }}>{sub}</div> : null}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ incident: red alarm ring at a point */
export const AlarmRing: React.FC<{ t: number; at: number; until: number; x: number; y: number; r?: number }> = ({ t, at, until, x, y, r = 46 }) => {
  const o = life(t, at, until, 0.2);
  if (o <= 0.001) return null;
  const d = t - at;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o, overflow: "visible", pointerEvents: "none" }}>
      {[0, 0.45, 0.9].map((k) => { const u = ((d + k) % 1.35) / 1.35; return <circle key={k} cx={x} cy={y} r={r * (0.6 + u * 1.6)} fill="none" stroke="#ef4444" strokeWidth={3 * (1 - u)} opacity={1 - u} />; })}
      <circle cx={x} cy={y} r={r} fill="rgba(239,68,68,0.10)" stroke="#ef4444" strokeWidth={4} style={{ filter: "drop-shadow(0 0 12px #ef4444)" }} />
      {[0, 90, 180, 270].map((a) => { const rad = (a * Math.PI) / 180; return <line key={a} x1={x + Math.cos(rad) * (r + 6)} y1={y + Math.sin(rad) * (r + 6)} x2={x + Math.cos(rad) * (r + 20)} y2={y + Math.sin(rad) * (r + 20)} stroke="#ef4444" strokeWidth={3} />; })}
    </svg>
  );
};

/* ------------------------------------------------------------------ case file card (incident) */
export interface CaseFileData { n: number; type: string; time: string; place: string; outcome: string; why: string; fix: string; fixNote?: string }
export const CaseFile: React.FC<{ t: number; at: number; until: number; x: number; y: number; d: CaseFileData; from?: { x: number; y: number } }> = ({ t, at, until, x, y, d, from }) => {
  const o = life(t, at, until, 0.25);
  if (o <= 0.001) return null;
  const p = back(cl((t - at) / 0.42));
  const stamp = E.out(prog(t, at + 0.55, 0.22));
  const fix = E.out(prog(t, at + 0.9, 0.35));
  const W = 470;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, pointerEvents: "none" }}>
      {from ? (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <line x1={from.x} y1={from.y} x2={x + (from.x < x ? 0 : W)} y2={y + 70} stroke="#ef4444" strokeWidth={2.5} strokeDasharray="7 6" opacity={E.out(prog(t, at, 0.3))} />
        </svg>
      ) : null}
      <div style={{ position: "absolute", left: x, top: y, width: W, transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -4}deg)`, transformOrigin: from && from.x < x ? "0% 30%" : "100% 30%",
        background: "linear-gradient(180deg, #121a2b, #0a1120)", border: "1px solid rgba(239,68,68,0.55)", borderRadius: 16, boxShadow: "0 30px 70px rgba(0,0,0,0.6), 0 0 40px rgba(239,68,68,0.15)", overflow: "hidden", fontFamily }}>
        <div style={{ background: "linear-gradient(90deg, #7f1d1d, #b91c1c)", padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: monoFamily, fontSize: 17, letterSpacing: 3, color: "#fee2e2" }}>CASE FILE {String(d.n).padStart(2, "0")}</span>
          <span style={{ fontFamily: monoFamily, fontSize: 17, color: "#fecaca" }}>{d.time}</span>
        </div>
        <div style={{ padding: "14px 18px 16px" }}>
          <div style={{ fontSize: 31, fontWeight: 800, color: "#f8fafc", letterSpacing: -0.6 }}>{d.type}</div>
          <div style={{ fontSize: 19, color: C.dim, marginTop: 2 }}>📍 {d.place}</div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15, fontFamily: monoFamily, color: C.dim, letterSpacing: 2 }}>OUTCOME</span>
            <span style={{ fontSize: 21, fontWeight: 800, color: "#fff", background: "#dc2626", borderRadius: 7, padding: "3px 10px", transform: `scale(${1.6 - 0.6 * stamp}) rotate(${-3 * stamp}deg)`, opacity: stamp, display: "inline-block" }}>{d.outcome}</span>
          </div>
          <div style={{ fontSize: 18, color: "#fca5a5", marginTop: 6 }}>{d.why}</div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed rgba(148,163,184,0.3)", opacity: fix, transform: `translateY(${(1 - fix) * 10}px)` }}>
            <span style={{ fontSize: 15, fontFamily: monoFamily, color: C.accent2, letterSpacing: 2 }}>FIX </span>
            <span style={{ fontSize: 22, fontWeight: 700, color: C.accent2 }}>{d.fix}</span>
            {d.fixNote ? <div style={{ fontSize: 16, color: C.dim, marginTop: 3 }}>{d.fixNote}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ lower third */
export const LowerThird: React.FC<{ t: number; at: number; until: number; title: string; sub?: string; x?: number; y?: number; color?: string }> = ({ t, at, until, title, sub, x = 56, y = 150, color = C.accent }) => {
  const o = life(t, at, until, 0.3);
  if (o <= 0.001) return null;
  const p = E.out(prog(t, at, 0.5));
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: o, display: "flex", alignItems: "stretch", gap: 0, pointerEvents: "none" }}>
      <div style={{ width: 6, background: color, borderRadius: 3, transform: `scaleY(${p})` }} />
      <div style={{ background: "rgba(5,10,22,0.86)", padding: "10px 22px 12px 18px", borderRadius: "0 12px 12px 0", clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>
        <div style={{ fontFamily, fontWeight: 700, fontSize: 28, color: "#f8fafc" }}>{title}</div>
        {sub ? <div style={{ fontFamily: monoFamily, fontSize: 17, color: C.dim, marginTop: 2 }}>{sub}</div> : null}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ badge chip */
export const Badge: React.FC<{ t: number; at: number; until: number; x: number; y: number; text: string; color?: string; size?: number; anchor?: "l" | "c" | "r" }> = ({ t, at, until, x, y, text, color = C.accent, size = 26, anchor = "c" }) => {
  const o = life(t, at, until, 0.22);
  if (o <= 0.001) return null;
  const p = back(cl((t - at) / 0.35));
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${anchor === "l" ? 0 : anchor === "r" ? -100 : -50}%, -50%) scale(${0.5 + 0.5 * p})`, opacity: o, pointerEvents: "none",
      background: color, color: "#04120c", fontFamily, fontWeight: 800, fontSize: size, padding: `${size * 0.3}px ${size * 0.65}px`, borderRadius: 999, boxShadow: `0 10px 30px rgba(0,0,0,0.45), 0 0 26px ${color}66`, whiteSpace: "nowrap" }}>
      {text}
    </div>
  );
};

/* ------------------------------------------------------------------ number counter */
export const Count: React.FC<{ t: number; at: number; dur?: number; from: number; to: number; decimals?: number; prefix?: string; suffix?: string; style?: React.CSSProperties }> = ({ t, at, dur = 0.9, from, to, decimals = 0, prefix = "", suffix = "", style }) => {
  const v = from + (to - from) * E.out(prog(t, at, dur));
  return <span style={style}>{prefix}{v.toFixed(decimals)}{suffix}</span>;
};

/** a soft spotlight that darkens everything except a circle/box (screen px) */
export const Spotlight: React.FC<{ o: number; x: number; y: number; r: number }> = ({ o, x, y, r }) =>
  o <= 0.001 ? null : <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(circle at ${x}px ${y}px, rgba(0,0,0,0) ${r}px, rgba(2,5,12,${0.62 * o}) ${r + 140}px)` }} />;

/** brief white flash */
export const Flash: React.FC<{ t: number; at: number; dur?: number; color?: string; max?: number }> = ({ t, at, dur = 0.35, color = "#ffffff", max = 0.6 }) => {
  const d = t - at;
  if (d < 0 || d > dur) return null;
  return <div style={{ position: "absolute", inset: 0, background: color, opacity: max * (1 - d / dur), pointerEvents: "none" }} />;
};

export { kf };
