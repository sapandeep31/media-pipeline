// Sapandeep (A) / Nida (B): the rigged GLBs from HookV3S2 with their 4K skins, posed procedurally.
//  <PresenterBust> = head-and-shoulders in a teal ring (corner of the frame) while their line plays
//  <StageFigure>   = full body on a soft stage (future-scope beat, names)
import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { RigCharacter } from "../rig/RigCharacter";
import { type GestureFn, type Performance, arm, clav, elbow, idle, planWalk, relaxedArms, wave } from "../rig/gestures";
import { addPose, smoothstep, wobble, type BonePose } from "../rig/rig";
import { C, fontFamily } from "../theme";

const SKIN = {
  a: { glb: "assets/models3d/a_rigged.glb", map: "assets/models3d/a_albedo_light_4k.png", head: 1.67 },
  b: { glb: "assets/models3d/b_rigged.glb", map: "assets/models3d/b_albedo_skin_4k.png", head: 1.56 },
};

/** 30 fps envelope lookup (linear), 0 outside */
export function envAtArr(env: number[], start: number, t: number) {
  const f = (t - start) * 30;
  if (!env.length || f < 0 || f >= env.length - 1) return 0;
  const i = Math.floor(f), u = f - i;
  return env[i] * (1 - u) + env[i + 1] * u;
}
/** talking layer (same as hookv3/perf3.ts talk()): nods on syllable onsets, chest energy from the envelope */
export function talkPose(env: number[], start: number, t: number, amt = 1): BonePose {
  const e = 0.25 * envAtArr(env, start, t - 1 / 30) + 0.5 * envAtArr(env, start, t) + 0.25 * envAtArr(env, start, t + 1 / 30);
  const onset = Math.max(0, envAtArr(env, start, t) - envAtArr(env, start, t - 0.1));
  const nod = (onset * 7 + e * 1.5) * amt;
  return { Head: [nod, 0, 0], Neck: [nod * 0.4, 0, 0], Spine2: [-1.6 * e * amt, 0, 0], LeftShoulder: clav("L", 1.4 * e * amt), RightShoulder: clav("R", 1.4 * e * amt) };
}
export interface TalkSpan { env: number[]; at: number }
const withTalks = (fn: GestureFn, spans: TalkSpan[], amt = 1): GestureFn => (c) => {
  const o = fn(c);
  let p = o.pose;
  for (const s of spans) p = addPose(p, talkPose(s.env, s.at, c.t, amt));
  return { ...o, pose: p };
};

/** relaxed talking idle; open-palm beat gesture on strong onsets (both hands low, forward) */
const talker = (spans: TalkSpan[], heading: number): GestureFn => (c) => {
  const o = idle(c);
  let beat = 0;
  for (const s of spans) beat = Math.max(beat, envAtArr(s.env, s.at, c.t - 0.12));
  const open = smoothstep(0.35, 0.9, beat);
  return {
    ...o,
    pose: {
      ...o.pose,
      ...relaxedArms("L", c.t, 2), ...relaxedArms("R", c.t, 5),
      LeftArm: arm("L", 74 - 12 * open, 8 + 18 * open, -12 * open), RightArm: arm("R", 74 - 12 * open, 8 + 18 * open, -12 * open),
      LeftForeArm: elbow("L", 22 + 30 * open, 0, -30 * open), RightForeArm: elbow("R", 22 + 30 * open, 0, -30 * open),
      Head: [o.pose.Head![0] - 2 + wobble(c.t * 0.6, 3), o.pose.Head![1] + wobble(c.t * 0.4, 7) * 3, o.pose.Head![2]],
    },
    yaw: heading,
  };
};

/** presenting: one arm opens toward screen-right on each `cues` time (s), returns between */
const presenter = (spans: TalkSpan[], cues: number[], heading: number): GestureFn => (c) => {
  const o = talker(spans, heading)(c);
  const near = cues.reduce((m, q) => Math.max(m, smoothstep(q - 0.35, q, c.t) * (1 - smoothstep(q + 0.9, q + 1.4, c.t))), 0);
  return {
    ...o,
    pose: {
      ...o.pose,
      LeftShoulder: clav("L", 4 * near),
      LeftArm: arm("L", 74 - 46 * near, 8 + 44 * near, -30 * near),
      LeftForeArm: elbow("L", 22 - 4 * near, 10 * near, -60 * near),
      LeftHand: [0, 0, 14 * near],
      Spine1: [0, 6 * near, 0], Neck: [0, 8 * near, 0],
      Head: [o.pose.Head![0], o.pose.Head![1] + 16 * near, o.pose.Head![2]],
    },
  };
};

const perfOf = (g: GestureFn, pos: [number, number], heading: number): Performance => ({
  walk: planWalk({ start: pos, h0: heading, h1: heading, dist: 0.002, t0: -10, stepDur: 0.3, lead: "R" }),
  segments: [{ at: -20, g }],
});

const Cam: React.FC<{ pos: [number, number, number]; look: [number, number, number]; fov: number }> = ({ pos, look, fov }) => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.set(...pos); cam.fov = fov; cam.near = 0.05; cam.far = 30; cam.lookAt(new THREE.Vector3(...look)); cam.updateProjectionMatrix();
  return null;
};

const Lights: React.FC<{ k?: number }> = ({ k = 1 }) => (
  <>
    <hemisphereLight args={["#c9d6ff", "#1a2440", 0.9]} />
    <directionalLight position={[-2.4, 4.4, 4.6]} intensity={3.3 * k} color="#ffe2c0" />
    <directionalLight position={[4.2, 2.0, 4.0]} intensity={1.3} color="#a9c2ff" />
    <directionalLight position={[3.2, 3.0, -4.2]} intensity={3.0 * k} color="#2dd4bf" />
    <directionalLight position={[-3.6, 2.6, -4]} intensity={2.2 * k} color="#34d399" />
    <directionalLight position={[0, 1.2, 5]} intensity={0.5} color="#ffffff" />
  </>
);

/** bust in a ring; `o` = 0..1 appear (scale/fade), `t` = absolute seconds (performance clock) */
export const PresenterBust: React.FC<{ who: "a" | "b"; t: number; o: number; spans: TalkSpan[]; corner?: "br" | "bl"; size?: number; name?: string; role?: string }> = ({ who, t, o, spans, corner = "br", size = 300, name, role }) => {
  const { fps } = useVideoConfig();
  const S = SKIN[who];
  const heading = corner === "br" ? -14 : 14;
  const perf = useMemo(() => perfOf(withTalks(talker(spans, heading), spans, 1), [0, 0], 0), [spans, heading]);
  if (o <= 0.001) return null;
  const k = 0.7 + 0.3 * o;
  const pad = 40;
  const pos: React.CSSProperties = { position: "absolute", width: size, height: size, bottom: 150, [corner === "br" ? "right" : "left"]: pad, transform: `scale(${k})`, transformOrigin: corner === "br" ? "100% 100%" : "0% 100%", opacity: o };
  void fps;
  return (
    <div style={pos}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle at 50% 38%, #1b3159 0%, #0b1324 70%)", border: `4px solid ${C.accent}`, boxShadow: `0 0 40px rgba(16,185,129,0.45), 0 20px 50px rgba(0,0,0,0.6)` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden" }}>
        <ThreeCanvas width={size} height={size} dpr={2} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.2; }}>
          <Cam pos={[0, S.head - 0.07, 1.25]} look={[0, S.head - 0.13, 0]} fov={30} />
          <Lights />
          <RigCharacter src={staticFile(S.glb)} mapSrc={staticFile(S.map)} perf={perf} time={t} />
        </ThreeCanvas>
      </div>
      {name ? (
        <div style={{ position: "absolute", left: "50%", bottom: -18, transform: "translateX(-50%)", background: C.accent, color: "#04120c", fontWeight: 800, fontSize: 20, padding: "5px 16px", borderRadius: 999, whiteSpace: "nowrap", fontFamily }}>
          {name}{role ? <span style={{ fontWeight: 500, opacity: 0.8 }}> · {role}</span> : null}
        </div>
      ) : null}
    </div>
  );
};

/** full figure(s) rendered into a transparent full-frame canvas; camera framed for a standing person */
export const StageFigures: React.FC<{
  t: number; figures: { who: "a" | "b"; x: number; z?: number; heading: number; spans: TalkSpan[]; cues?: number[]; waveAt?: number }[];
  cam?: { pos: [number, number, number]; look: [number, number, number]; fov: number };
}> = ({ t, figures, cam = { pos: [0, 1.1, 4.6], look: [0, 0.95, 0], fov: 30 } }) => {
  const { width, height } = useVideoConfig();
  const perfs = useMemo(() => figures.map((f) => {
    let g: GestureFn = f.cues?.length ? presenter(f.spans, f.cues, f.heading) : talker(f.spans, f.heading);
    if (f.waveAt !== undefined) {
      const wv = wave(3, 1.4), base = g, w0 = f.waveAt;
      g = (c) => (c.t >= w0 && c.t < w0 + 1.4 ? { ...wv({ ...c, tau: c.t - w0 }), yaw: f.heading } : base(c));
    }
    return perfOf(withTalks(g, f.spans, 0.9), [f.x, f.z ?? 0], 0);
  }), [figures]);
  return (
    <ThreeCanvas width={width} height={height} dpr={1.5} shadows gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.2; }}>
      <Cam {...cam} />
      <Lights />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[14, 14]} /><shadowMaterial opacity={0.35} color="#000814" /></mesh>
      {figures.map((f, i) => (
        <RigCharacter key={f.who + i} src={staticFile(SKIN[f.who].glb)} mapSrc={staticFile(SKIN[f.who].map)} perf={perfs[i]} time={t} />
      ))}
    </ThreeCanvas>
  );
};
export const useT = () => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return f / fps; };
