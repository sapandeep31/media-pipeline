// A recorded app clip (3840x2160, 1920x1080 CSS layout) shown as a cinematic shot:
//  - time remap: scene time -> clip time (piecewise linear keys; flat = freeze, steep = speed ramp)
//  - camera: zoom/pan onto a region of the 1920x1080 source (eased keys), clamped so no edge shows
//  - window: 1 = framed browser window floating on the backdrop (with tilt), 0 = full bleed
// Overlays given as `children(cam)` get a toScreen() mapper so callouts stay a constant size and track the zoom.
import React from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, staticFile } from "remotion";
import { fontFamily, monoFamily } from "../theme";

export type Ease = (x: number) => number;
export const E = {
  lin: (x: number) => x,
  io: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: (x: number) => 1 - Math.pow(1 - x, 3),
  in: (x: number) => x * x * x,
  sine: (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x),
};
const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** keys [[t, v, ease?], ...] -> value at t (ease applies to the segment ending at that key) */
export function kf(t: number, keys: [number, number, Ease?][]): number {
  if (!keys.length) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) { const u = t1 === t0 ? 1 : (t - t0) / (t1 - t0); return v0 + (v1 - v0) * (e ?? E.io)(u); }
  }
  return keys[keys.length - 1][1];
}

export interface CamKey { t: number; x: number; y: number; z: number; win?: number; ease?: Ease }
export interface CamState { x: number; y: number; z: number; win: number }
export function camAt(t: number, keys: CamKey[]): CamState {
  const g = (k: keyof CamState, d: number) => kf(t, keys.map((q) => [q.t, (q[k] as number | undefined) ?? d, q.ease] as [number, number, Ease?]));
  // interpolate zoom in log space (constant-speed push-in)
  const lz = kf(t, keys.map((q) => [q.t, Math.log(q.z), q.ease] as [number, number, Ease?]));
  const z = Math.exp(lz);
  const hw = 960 / z, hh = 540 / z;
  return { x: cl(g("x", 960), hw, 1920 - hw), y: cl(g("y", 540), hh, 1080 - hh), z, win: g("win", 0) };
}

/** window geometry for win in 0..1 */
const WIN = { s: 0.8, bar: 34 };
export function shotGeom(c: CamState) {
  const s = 1 - (1 - WIN.s) * c.win;
  const barH = WIN.bar * c.win;
  const h = 1080 * s, w = 1920 * s;
  const left = (1920 - w) / 2, top = (1080 - h - barH) / 2 + barH;
  return { s, w, h, left, top, barH };
}
/** source px (1920x1080 CSS of the app) -> composition px */
export function toScreen(p: { x: number; y: number }, c: CamState) {
  const g = shotGeom(c);
  return { x: g.left + ((p.x - c.x) * c.z + 960) * g.s, y: g.top + ((p.y - c.y) * c.z + 540) * g.s, k: c.z * g.s };
}

export const AppShot: React.FC<{
  src: string; t: number; remap: [number, number][]; cam: CamKey[]; fps?: number; tilt?: number; dim?: number;
  children?: (c: CamState, map: (p: { x: number; y: number }) => { x: number; y: number; k: number }) => React.ReactNode;
  label?: string; clipLen?: number;
}> = ({ src, t, remap, cam, fps = 30, tilt = 0, dim = 0, children, label = "App", clipLen }) => {
  const ct = Math.max(0, kf(t, remap.map(([a, b]) => [a, b, E.lin] as [number, number, Ease?])));
  const frame = Math.max(0, Math.min(clipLen ? Math.floor(clipLen * fps) - 2 : 1e9, Math.round(ct * fps)));
  const c = camAt(t, cam);
  const g = shotGeom(c);
  const tx = 960 - c.x * c.z, ty = 540 - c.y * c.z;
  return (
    <AbsoluteFill>
      {c.win > 0.005 ? <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 80% at 50% 40%, #0f1b33 0%, #070d1a 60%, #03060d 100%)", opacity: Math.min(1, c.win * 3) }} /> : null}
      <div style={{ position: "absolute", left: g.left, top: g.top - g.barH, width: g.w, height: g.h + g.barH, transform: tilt ? `perspective(2400px) rotateX(${tilt * 10}deg) rotateY(${-tilt * 14}deg)` : undefined, transformOrigin: "50% 60%",
        borderRadius: 14 * c.win, overflow: "hidden", boxShadow: c.win > 0.02 ? `0 ${40 * c.win}px ${120 * c.win}px rgba(0,0,0,${0.65 * c.win}), 0 0 0 1px rgba(148,163,184,${0.25 * c.win})` : undefined }}>
        {g.barH > 0.5 ? (
          <div style={{ height: g.barH, background: "linear-gradient(#1b2433, #121926)", display: "flex", alignItems: "center", gap: 8 * c.win, paddingLeft: 16 * c.win, opacity: c.win }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((col) => <div key={col} style={{ width: 12 * c.win, height: 12 * c.win, borderRadius: "50%", background: col }} />)}
            <div style={{ marginLeft: 18 * c.win, height: 22 * c.win, width: 520 * c.win, borderRadius: 7, background: "rgba(255,255,255,0.07)", color: "#94a3b8", fontFamily: monoFamily, fontSize: 13 * c.win, display: "flex", alignItems: "center", paddingLeft: 12 * c.win }}>
              {label}
            </div>
          </div>
        ) : null}
        <div style={{ position: "relative", width: g.w, height: g.h, overflow: "hidden", background: "#0b1220" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `scale(${g.s}) translate(${tx}px, ${ty}px) scale(${c.z})` }}>
            <Freeze frame={frame}>
              <OffthreadVideo src={staticFile(src)} muted style={{ width: 1920, height: 1080 }} />
            </Freeze>
          </div>
          {dim > 0 ? <div style={{ position: "absolute", inset: 0, background: `rgba(2,6,16,${dim})` }} /> : null}
        </div>
      </div>
      {children ? children(c, (p) => toScreen(p, c)) : null}
    </AbsoluteFill>
  );
};
void fontFamily;
