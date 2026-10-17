import * as THREE from "three";
import {
  type BoneName, type BonePose, type QPose, type V3, Rig, addPose, blendQ, ease, eulerQ, kf, mirror, smoothstep, toQ, wobble,
} from "./rig";

/**
 * Gesture library + locomotion + per-frame solver for Mixamo-skeleton characters.
 * Everything is a pure function of time t (seconds): no Math.random, no clocks.
 *
 *   const spec: Performance = { walk: planWalk({...}), segments: [{ at: 0, g: "idle" }, { at: 1.9, g: "scold" }, ...] };
 *   solveFrame(rig, t, spec);   // poses every bone for time t
 *
 * Gestures are written for the RIGHT-handed version; `side: "L"` on a segment mirrors it.
 */

/* ------------------------------------------------------------------ */
/* Pose helpers (model-axis deltas, see rig.ts)                         */
/* ------------------------------------------------------------------ */

export type S = "L" | "R";
/** upper arm: down = lowered from T-pose (deg, negative = raised above horizontal), fwd = swung forward, twist about the arm */
export const arm = (s: S, down: number, fwd: number, twist = 0): V3 => (s === "L" ? [twist, -fwd, -down] : [twist, fwd, down]);
/** forearm: bend = elbow flexion toward the front (in the T-pose frame), up = flexion toward the sky (for waves) */
export const elbow = (s: S, bend: number, up = 0, twist = 0): V3 => (s === "L" ? [twist, -bend, up] : [twist, bend, -up]);
/** clavicle: up = shrug, fwd = protract */
export const clav = (s: S, up: number, fwd = 0): V3 => (s === "L" ? [0, -fwd, up] : [0, fwd, -up]);
const B =(s: S, n: "Arm" | "ForeArm" | "Hand" | "Shoulder") => `${s === "L" ? "Left" : "Right"}${n}` as BoneName;

/** relaxed arms hanging along the body with a slight elbow bend (the T-pose fix) */
export const relaxedArms = (s: S, t: number, seed = 0): BonePose => ({
  [B(s, "Arm")]: arm(s, 76 + wobble(t * 0.7, seed) * 1.2, 4 + wobble(t * 0.5, seed + 3) * 1.5, 0),
  [B(s, "ForeArm")]: elbow(s, 14 + wobble(t * 0.6, seed + 5) * 2),
  [B(s, "Hand")]: [0, 0, 0],
});

/* ------------------------------------------------------------------ */
/* Locomotion (footstep planner + pelvis path)                          */
/* ------------------------------------------------------------------ */

export interface Step { foot: S; s0: number; s1: number; t0: number; t1: number }
export interface WalkPlan {
  start: [number, number]; // x, z on the floor (m)
  h0: number; h1: number;  // heading (deg about +Y; 0 = facing camera/+Z, -90 = walking toward screen-left)
  dist: number;
  t0: number; t1: number;
  steps: Step[];
  path: { x: number; z: number; h: number }[]; // sampled along s
}

/** Plan a start-walk-stop: `n` alternating steps to `dist`, plus a closing step. Lead foot first. */
export function planWalk(o: { start: [number, number]; h0: number; h1: number; dist: number; t0: number; stepDur: number; lead?: S; stride?: number }): WalkPlan {
  const stride = o.stride ?? 0.42;
  const n = Math.max(1, Math.ceil(o.dist / stride));
  const steps: Step[] = [];
  const pos: Record<S, number> = { L: 0, R: 0 };
  let foot: S = o.lead ?? "R";
  let t = o.t0;
  for (let k = 1; k <= n; k++) {
    const s1 = (k * o.dist) / n;
    steps.push({ foot, s0: pos[foot], s1, t0: t, t1: t + o.stepDur });
    pos[foot] = s1; t += o.stepDur; foot = foot === "L" ? "R" : "L";
  }
  // closing step: bring the trailing foot alongside (a bit quicker)
  steps.push({ foot, s0: pos[foot], s1: o.dist, t0: t, t1: t + o.stepDur * 0.85 });
  t += o.stepDur * 0.85;
  // integrate the heading curve into a path
  const N = 160, path: WalkPlan["path"] = [];
  let x = o.start[0], z = o.start[1];
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * o.dist;
    const h = o.h0 + (o.h1 - o.h0) * ease.smooth(s / o.dist);
    path.push({ x, z, h });
    const ds = o.dist / N, hr = (h * Math.PI) / 180;
    x += Math.sin(hr) * ds; z += Math.cos(hr) * ds;
  }
  return { start: o.start, h0: o.h0, h1: o.h1, dist: o.dist, t0: o.t0, t1: t, steps, path };
}

const pathAt = (w: WalkPlan, s: number) => {
  const f = Math.min(1, Math.max(0, s / w.dist)) * (w.path.length - 1);
  const i = Math.min(w.path.length - 2, Math.floor(f)), u = f - i;
  const a = w.path[i], b = w.path[i + 1];
  return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, h: a.h + (b.h - a.h) * u };
};

export interface FootState { pos: THREE.Vector3; yaw: number; pitch: number; s: number }
export interface Loco {
  pelvis: THREE.Vector3; // x,z only meaningful; y solved from legs
  yaw: number;           // heading of the pelvis (deg)
  twist: number;         // walk pelvis twist (deg)
  moving: number;        // 0..1
  armSwing: number;      // + = right arm forward
  feet: Record<S, FootState>;
}

/** where a foot is at time t */
function footAt(w: WalkPlan, f: S, t: number, lateral: number, ankleY: number): FootState {
  let s = 0, lift = 0, pitch = 0;
  for (const st of w.steps) {
    if (st.foot !== f) continue;
    if (t >= st.t1) { s = st.s1; continue; }
    if (t > st.t0) {
      const u = (t - st.t0) / (st.t1 - st.t0);
      const dl = st.s1 - st.s0;
      s = st.s0 + dl * ease.inOut(u);
      const len = Math.abs(dl); // negative dist = walking backward (facing stays the heading)
      lift = Math.sin(Math.PI * Math.min(1, u * 1.08)) * (0.05 + 0.08 * Math.min(1, len / 0.6));
      // heel-off (toe down) early, toe up before heel strike
      pitch = 30 * Math.sin(Math.PI * Math.min(1, u / 0.45)) * (u < 0.45 ? 1 : 0) - 16 * Math.sin(Math.PI * Math.max(0, (u - 0.5) / 0.5)) * (u > 0.5 ? 1 : 0);
      pitch *= Math.min(1, len / 0.5);
    }
    break;
  }
  const p = pathAt(w, s);
  const hr = (p.h * Math.PI) / 180;
  const side = f === "L" ? 1 : -1;
  const pos = new THREE.Vector3(p.x + Math.cos(hr) * lateral * side, ankleY + lift, p.z - Math.sin(hr) * lateral * side);
  return { pos, yaw: p.h, pitch, s };
}

export function locoAt(w: WalkPlan, t: number, lateral: number, ankleY: number): Loco {
  const L = footAt(w, "L", t, lateral, ankleY), R = footAt(w, "R", t, lateral, ankleY);
  const u = Math.min(1, Math.max(0, (t - w.t0) / (w.t1 - w.t0)));
  const lead = 0.05 * Math.sin(Math.PI * u);
  const sP = 0.5 * ((L.s + R.s) / 2) + 0.5 * w.dist * ease.inOut(u) + lead;
  const p = pathAt(w, sP);
  const hr = (p.h * Math.PI) / 180;
  // shift weight over the stance foot, twist the pelvis with the swinging leg
  let sway = 0, twist = 0;
  for (const st of w.steps) {
    if (t > st.t0 && t < st.t1) {
      const v = Math.sin(Math.PI * (t - st.t0) / (st.t1 - st.t0)) * Math.min(1, Math.abs(st.s1 - st.s0) / 0.5);
      const stanceSide = st.foot === "L" ? -1 : 1; // left swinging -> weight on right
      sway += 0.028 * v * stanceSide;
      twist += 6 * v * (st.foot === "R" ? 1 : -1);
    }
  }
  const pelvis = new THREE.Vector3(p.x + Math.cos(hr) * sway, 0, p.z - Math.sin(hr) * sway);
  const moving = smoothstep(w.t0 - 0.05, w.t0 + 0.15, t) * (1 - smoothstep(w.t1 - 0.2, w.t1 + 0.1, t));
  const armSwing = Math.max(-1, Math.min(1, (L.s - R.s) / 0.42));
  return { pelvis, yaw: p.h, twist, moving, armSwing, feet: { L, R } };
}

/* ------------------------------------------------------------------ */
/* Gestures                                                             */
/* ------------------------------------------------------------------ */

export interface Ctx { t: number; tau: number; loco: Loco; yaw: number }
export interface GOut {
  pose: BonePose;
  /** extra pelvis yaw on top of the walk heading (deg) */
  yaw?: number;
  /** hand IK targets in pelvis space (x = character's left, y up from the Hips joint, z forward), weight */
  handIK?: Partial<Record<S, { at: V3; w: number }>>;
  /** pelvis offset in pelvis space (m): weight shift / dip */
  pelvis?: V3;
  /** absolute world height of the Hips joint (m), e.g. sitting on a seat; overrides the leg-reach height */
  hipY?: number;
}
export type GestureFn = (c: Ctx) => GOut;

export const idle: GestureFn = ({ t }) => ({
  pose: {
    ...relaxedArms("L", t, 1), ...relaxedArms("R", t, 7),
    Head: [wobble(t * 0.8, 2) * 2.2, wobble(t * 0.55, 9) * 4, wobble(t * 0.7, 4) * 1.5],
    Neck: [0, wobble(t * 0.55, 9) * 1.5, 0],
  },
  pelvis: [0.018 * Math.sin(t * 1.6 + 0.4), 0, 0],
  yaw: wobble(t * 0.4, 5) * 1.5,
});

export const walk: GestureFn = ({ loco }) => {
  const a = loco.armSwing * loco.moving;
  return {
    pose: {
      RightArm: arm("R", 78, 16 * a), LeftArm: arm("L", 78, -16 * a),
      RightForeArm: elbow("R", 16 + 14 * Math.max(0, a)), LeftForeArm: elbow("L", 16 + 14 * Math.max(0, -a)),
      Spine: [3 * loco.moving, -0.35 * loco.twist, 0],
      Spine2: [1, -0.45 * loco.twist, 0],
      Head: [-2, 0.4 * loco.twist, 0],
    },
  };
};

/** pulse used for jabs/nods: fast attack (`a` s), slower release (`r` s) */
const hit = (x: number, a = 0.07, r = 0.2) => (x < 0 ? 0 : x < a ? ease.out(x / a) : Math.max(0, 1 - ease.inOut((x - a) / r)));

/**
 * Scold: hand on hip, the other arm points (toward world -X = screen-left) with emphatic jabs, head tilt, lean in.
 * Jab times are seconds from the start of the gesture (default matches "I told you to do the HOOK first!").
 */
export const scold = (jabs: number[] = [0.32, 0.86, 1.18]): GestureFn => ({ tau, yaw }) => {
  const up = smoothstep(0, 0.22, tau);
  const j = jabs.reduce((m, tj) => Math.max(m, hit(tau - tj + 0.04)), 0);
  // aim the pointing arm at screen-left, a little toward camera, compensating the body + spine yaw
  const spineYaw = -7;
  const fwd = -(yaw + 2 * spineYaw) + 12;
  return {
    pose: {
      RightShoulder: clav("R", 3 + 3 * j, 4 * j),
      RightArm: arm("R", kf(up, [[0, 70], [1, -14 - 4 * j]]), fwd * up + 10 * j, 0),
      RightForeArm: elbow("R", 30 - 26 * j + 10 * (1 - up)),
      RightHand: [0, 0, -6],
      LeftShoulder: clav("L", 4),
      LeftArm: arm("L", 42, -32, 0),
      LeftForeArm: elbow("L", 110),
      LeftHand: [0, 0, 0],
      Spine: [1 + 1.5 * j, spineYaw * 0.6, 1.5],
      Spine1: [1 + 1.5 * j, spineYaw * 0.7, 1.5],
      Spine2: [0.5 + 1 * j, spineYaw * 0.7, 1],
      Neck: [-2, -5, 2],
      Head: [-9 + 6 * j, -8, 9 - 2 * j],
    },
    handIK: { L: { at: [0.2, 0.2, 0.0], w: up } },
    pelvis: [-0.02, 0, 0],
    yaw: -4,
  };
};

/** Wave: turn toward camera, raise the (right) arm, forearm waves `n` times. */
export const wave = (n = 3, dur = 1.15): GestureFn => ({ tau, t }) => {
  const up = smoothstep(0, 0.25, tau) * (1 - smoothstep(dur - 0.2, dur, tau));
  const wt0 = 0.22, wt1 = dur - 0.22;
  const ph = Math.min(1, Math.max(0, (tau - wt0) / (wt1 - wt0)));
  const osc = Math.sin(ph * Math.PI * 2 * n) * Math.sin(Math.PI * ph) ** 0.35;
  return {
    pose: {
      ...relaxedArms("L", t, 1),
      RightShoulder: clav("R", 6 * up),
      RightArm: arm("R", kf(up, [[0, 76], [1, 8]]), 30 * up, 0),
      RightForeArm: elbow("R", 12 * up + 14 * (1 - up), 60 * up + osc * 24 * up),
      RightHand: [0, 0, -osc * 10 * up],
      Spine: [0, 6, 0], Spine1: [0, 5, -1.5], Spine2: [-1, 4, -1.5],
      Head: [-3, 8 + wobble(t, 3) * 2, -6],
    },
    yaw: 18,
  };
};

export const GESTURES: Record<string, GestureFn> = { idle, walk, scold: scold(), wave: wave() };

/* ------------------------------------------------------------------ */
/* Additive layers                                                      */
/* ------------------------------------------------------------------ */

/** breathing (chest rise, shoulder lift) - always on */
export function breathing(t: number, amt = 1): BonePose {
  const b = Math.sin((t * 2 * Math.PI) / 3.4);
  return {
    Spine1: [-0.9 * b * amt, 0, 0],
    Spine2: [-1.2 * b * amt, 0, 0],
    Neck: [0.8 * b * amt, 0, 0],
    LeftShoulder: clav("L", 1.0 * b * amt),
    RightShoulder: clav("R", 1.0 * b * amt),
  };
}

/* ------------------------------------------------------------------ */
/* Performance = walk plan + gesture segments, and the per-frame solver */
/* ------------------------------------------------------------------ */

export interface Segment { at: number; g: string | GestureFn; fade?: number; mirror?: boolean }
/** `walk` may be several plans in time order (each starting where the previous one ends); the latest started one is active */
export interface Performance { walk: WalkPlan | WalkPlan[]; segments: Segment[] }
export const walkAt = (w: WalkPlan | WalkPlan[], t: number): WalkPlan => {
  if (!Array.isArray(w)) return w;
  let cur = w[0];
  for (const p of w) if (t >= p.t0) cur = p;
  return cur;
};

const mirrorOut = (o: GOut): GOut => ({
  pose: mirror(o.pose),
  yaw: o.yaw === undefined ? undefined : -o.yaw,
  pelvis: o.pelvis ? [-o.pelvis[0], o.pelvis[1], o.pelvis[2]] : undefined,
  handIK: o.handIK ? Object.fromEntries(Object.entries(o.handIK).map(([k, v]) => [k === "L" ? "R" : "L", { at: [-v!.at[0], v!.at[1], v!.at[2]], w: v!.w }])) : undefined,
});

interface Blended { q: QPose; yaw: number; pelvis: V3; handIK: Partial<Record<S, { at: V3; w: number }>>; hipY: number; hipW: number }

function evalSeg(seg: Segment, t: number, base: Omit<Ctx, "tau">): Blended {
  const fn = typeof seg.g === "string" ? GESTURES[seg.g] : seg.g;
  let o = fn({ ...base, tau: t - seg.at });
  if (seg.mirror) o = { ...mirrorOut(o), hipY: o.hipY };
  return { q: toQ(o.pose), yaw: o.yaw ?? 0, pelvis: o.pelvis ?? [0, 0, 0], handIK: o.handIK ?? {}, hipY: o.hipY ?? 0, hipW: o.hipY === undefined ? 0 : 1 };
}

function blendOut(a: Blended, b: Blended, w: number): Blended {
  const handIK: Blended["handIK"] = {};
  for (const s of ["L", "R"] as S[]) {
    const x = a.handIK[s], y = b.handIK[s];
    if (!x && !y) continue;
    const at: V3 = x && y ? [0, 1, 2].map((i) => x.at[i] + (y.at[i] - x.at[i]) * w) as V3 : (x ?? y)!.at;
    handIK[s] = { at, w: (x?.w ?? 0) * (1 - w) + (y?.w ?? 0) * w };
  }
  return {
    q: blendQ(a.q, b.q, w),
    yaw: a.yaw + (b.yaw - a.yaw) * w,
    pelvis: [0, 1, 2].map((i) => a.pelvis[i] + (b.pelvis[i] - a.pelvis[i]) * w) as V3,
    handIK,
    hipY: a.hipW && b.hipW ? a.hipY + (b.hipY - a.hipY) * w : a.hipW ? a.hipY : b.hipY,
    hipW: a.hipW * (1 - w) + b.hipW * w,
  };
}

const Y = new THREE.Vector3(0, 1, 0);
const yawQ = (deg: number) => new THREE.Quaternion().setFromAxisAngle(Y, (deg * Math.PI) / 180);

/** Pose every bone of `rig` for time `t`. */
export function solveFrame(rig: Rig, t: number, perf: Performance) {
  rig.reset();
  const rp = rig.restPos;
  const lateral = Math.abs(rp.LeftFoot.x - rp.RightFoot.x) / 2;
  const ankleY = (rp.LeftFoot.y + rp.RightFoot.y) / 2;
  const loco = locoAt(walkAt(perf.walk, t), t, lateral, ankleY);

  // --- gesture blend (each segment fades in over the previous one) ---
  const segs = [...perf.segments].sort((a, b) => a.at - b.at);
  let idx = 0;
  for (let i = 0; i < segs.length; i++) if (t >= segs[i].at) idx = i;
  const preYaw = loco.yaw; // gestures that aim need the body yaw; approximate with the walk heading
  const base = { t, loco, yaw: preYaw };
  let out = evalSeg(segs[idx], t, base);
  const fade = segs[idx].fade ?? 0.25;
  if (idx > 0 && t < segs[idx].at + fade) {
    const prev = evalSeg(segs[idx - 1], t, base);
    out = blendOut(prev, out, ease.smooth((t - segs[idx].at) / fade));
  }
  // --- additive layers ---
  const add = toQ(breathing(t, 1 - 0.6 * loco.moving));
  for (const [k, q] of Object.entries(add) as [BoneName, THREE.Quaternion][]) out.q[k] = (out.q[k] ?? new THREE.Quaternion()).clone().multiply(q);

  // --- pelvis ---
  const yaw = loco.yaw + out.yaw * (1 - loco.moving) + loco.twist;
  const yq = yawQ(yaw);
  const pel = loco.pelvis.clone().add(new THREE.Vector3(...out.pelvis).multiplyScalar(1 - loco.moving).applyQuaternion(yq));
  // height: highest pelvis the planted legs allow (slight knee bend), never above rest
  const hipRestY = rp.Hips.y;
  const legLen = rp.LeftUpLeg.distanceTo(rp.LeftLeg) + rp.LeftLeg.distanceTo(rp.LeftFoot);
  const upLegDrop = hipRestY - rp.LeftUpLeg.y;
  let py = hipRestY - 0.004;
  for (const s of ["L", "R"] as S[]) {
    const f = loco.feet[s];
    const hipJ = new THREE.Vector3((s === "L" ? 1 : -1) * Math.abs(rp.LeftUpLeg.x - rp.Hips.x), 0, 0).applyQuaternion(yq).add(pel);
    const horiz = Math.hypot(hipJ.x - f.pos.x, hipJ.z - f.pos.z);
    const reach = legLen * 0.985;
    const allowed = f.pos.y + Math.sqrt(Math.max(0, reach * reach - horiz * horiz)) + upLegDrop;
    py = Math.min(py, allowed);
  }
  pel.y = py + (out.pelvis[1] ?? 0);
  if (out.hipW > 0) pel.y += (out.hipY - pel.y) * out.hipW;
  const hips = rig.bones.Hips;
  hips.parent!.updateWorldMatrix(true, false);
  hips.position.copy(hips.parent!.worldToLocal(pel.clone()));
  const hipsD = yq.clone().multiply(out.q.Hips ?? new THREE.Quaternion());
  rig.setDelta("Hips", hipsD);

  // --- upper body FK ---
  rig.applyPose(out.q);

  // --- legs: pre-bend knees forward, then IK to the planted/swinging feet ---
  for (const s of ["L", "R"] as S[]) {
    const side = s === "L" ? "Left" : "Right";
    rig.setDelta(`${side}UpLeg` as BoneName, eulerQ([-4, 0, 0]));
    rig.setDelta(`${side}Leg` as BoneName, eulerQ([8, 0, 0]));
  }
  rig.root.updateMatrixWorld(true);
  for (const s of ["L", "R"] as S[]) {
    const side = s === "L" ? "Left" : "Right";
    const f = loco.feet[s];
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(yawQ(f.yaw));
    rig.twoBoneIK(`${side}UpLeg` as BoneName, `${side}Leg` as BoneName, `${side}Foot` as BoneName, f.pos, 1, fwd);
    const lat = new THREE.Vector3(1, 0, 0).applyQuaternion(yawQ(f.yaw));
    const footQ = new THREE.Quaternion().setFromAxisAngle(lat, (f.pitch * Math.PI) / 180).multiply(rig.restWorld(`${side}Foot` as BoneName, yawQ(f.yaw)));
    rig.setWorldRot(`${side}Foot` as BoneName, footQ);
    // toes stay flat on the floor while the heel lifts
    const toeQ = rig.restWorld(`${side}ToeBase` as BoneName, yawQ(f.yaw));
    if (f.pitch > 0) rig.setWorldRot(`${side}ToeBase` as BoneName, toeQ);
  }

  // --- hand IK (e.g. hand on hip) ---
  rig.root.updateMatrixWorld(true);
  for (const s of ["L", "R"] as S[]) {
    const ik = out.handIK[s];
    if (!ik || ik.w <= 0.001) continue;
    const side = s === "L" ? "Left" : "Right";
    const target = new THREE.Vector3(...ik.at).applyQuaternion(yq).add(pel);
    rig.twoBoneIK(`${side}Arm` as BoneName, `${side}ForeArm` as BoneName, `${side}Hand` as BoneName, target, ik.w);
  }
  rig.root.updateMatrixWorld(true);
  return { pelvis: pel, yaw, loco };
}

export { addPose };
