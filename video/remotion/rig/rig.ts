import * as THREE from "three";

/**
 * Procedural bone animation for Mixamo-skeleton characters (mixamorig:* names).
 *
 * Every joint rotation is written as a DELTA in model axes (x = character's left, y = up, z = forward when the
 * character stands in its rest T-pose facing +Z), applied in the rest frame of the bone's parent:
 *     local = Prest^-1 * D * Prest * L0
 * so "rotate the left arm -70 deg about Z" always means "lower it", independent of how the auto-rigger oriented
 * the bone axes, and the deltas compose like FK (a bent elbow follows the upper arm). The same numbers therefore
 * work on any Mixamo-rigged model, and mirror() turns a left-side gesture into a right-side one.
 *
 * Euler triples are degrees, order "ZYX" (X applied first): for arms X = twist, Y = swing forward/back,
 * Z = raise/lower; for spine/head X = pitch (+ = forward), Y = yaw (+ = toward the character's left), Z = roll.
 */

export type V3 = [number, number, number];
export type BonePose = Partial<Record<BoneName, V3>>;

export const BONE_NAMES = [
  "Hips", "Spine", "Spine1", "Spine2", "Neck", "Head",
  "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand",
  "RightShoulder", "RightArm", "RightForeArm", "RightHand",
  "LeftUpLeg", "LeftLeg", "LeftFoot", "LeftToeBase",
  "RightUpLeg", "RightLeg", "RightFoot", "RightToeBase",
] as const;
export type BoneName = (typeof BONE_NAMES)[number];

const D2R = Math.PI / 180;
const _e = new THREE.Euler();
export const eulerQ = (v: V3, out = new THREE.Quaternion()) =>
  out.setFromEuler(_e.set(v[0] * D2R, v[1] * D2R, v[2] * D2R, "ZYX"));

/** Mirror a pose across the character's sagittal plane (swap Left/Right, negate Y and Z rotations). */
export function mirror(p: BonePose): BonePose {
  const out: BonePose = {};
  for (const [k, v] of Object.entries(p) as [BoneName, V3][]) {
    const m = (k.startsWith("Left") ? k.replace("Left", "Right") : k.startsWith("Right") ? k.replace("Right", "Left") : k) as BoneName;
    out[m] = [v[0], -v[1], -v[2]];
  }
  return out;
}

/** Sum two euler poses component-wise (cheap additive layer for small angles). */
export function addPose(a: BonePose, b: BonePose): BonePose {
  const out: BonePose = { ...a };
  for (const [k, v] of Object.entries(b) as [BoneName, V3][]) {
    const o = out[k];
    out[k] = o ? [o[0] + v[0], o[1] + v[1], o[2] + v[2]] : [...v];
  }
  return out;
}

/** Quaternion pose (what gets blended). */
export type QPose = Partial<Record<BoneName, THREE.Quaternion>>;
export const toQ = (p: BonePose): QPose => {
  const out: QPose = {};
  for (const [k, v] of Object.entries(p) as [BoneName, V3][]) out[k] = eulerQ(v);
  return out;
};
const ID = new THREE.Quaternion();
/** Slerp two quaternion poses (missing bones = identity). */
export function blendQ(a: QPose, b: QPose, w: number): QPose {
  if (w <= 0) return a;
  if (w >= 1) return b;
  const out: QPose = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<BoneName>;
  for (const k of keys) out[k] = (a[k] ?? ID).clone().slerp(b[k] ?? ID, w);
  return out;
}

interface Rest { L0: THREE.Quaternion; P: THREE.Quaternion; Pinv: THREE.Quaternion; W0: THREE.Quaternion; pos0: THREE.Vector3 }

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion();
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export class Rig {
  bones = {} as Record<BoneName, THREE.Bone>;
  rest = {} as Record<BoneName, Rest>;
  /** rest-pose WORLD positions (includes the parent group's scale), captured at construction */
  restPos = {} as Record<BoneName, THREE.Vector3>;
  /** the Object3D whose space is "model space" (the glTF scene root) */
  root: THREE.Object3D;

  constructor(root: THREE.Object3D) {
    this.root = root;
    root.traverse((o) => {
      const n = o.name.replace(/^mixamorig:?/, "") as BoneName;
      if ((o as THREE.Bone).isBone && (BONE_NAMES as readonly string[]).includes(n)) this.bones[n] = o as THREE.Bone;
    });
    for (const n of BONE_NAMES) if (!this.bones[n]) throw new Error(`Rig: bone ${n} not found`);
    root.updateMatrixWorld(true);
    const rootInv = root.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const n of BONE_NAMES) {
      const b = this.bones[n];
      const W0 = rootInv.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion()));
      const P = rootInv.clone().multiply(b.parent!.getWorldQuaternion(new THREE.Quaternion()));
      this.rest[n] = { L0: b.quaternion.clone(), P, Pinv: P.clone().invert(), W0, pos0: b.position.clone() };
      this.restPos[n] = b.getWorldPosition(new THREE.Vector3());
    }
  }

  reset() {
    for (const n of BONE_NAMES) {
      this.bones[n].quaternion.copy(this.rest[n].L0);
      this.bones[n].position.copy(this.rest[n].pos0);
    }
  }

  /** Apply a model-axis delta rotation to a bone (relative to its rest pose, in the parent's rest frame). */
  setDelta(n: BoneName, d: THREE.Quaternion) {
    const r = this.rest[n];
    this.bones[n].quaternion.copy(r.Pinv).multiply(d).multiply(r.P).multiply(r.L0);
  }

  applyPose(p: QPose) {
    for (const [k, q] of Object.entries(p) as [BoneName, THREE.Quaternion][]) if (k !== "Hips") this.setDelta(k, q);
  }

  /** Set a bone's rotation in WORLD space (parent matrices must be current). */
  setWorldRot(n: BoneName, qWorld: THREE.Quaternion) {
    const b = this.bones[n];
    b.parent!.updateWorldMatrix(true, false);
    const pInv = b.parent!.getWorldQuaternion(_q1).invert();
    b.quaternion.copy(pInv.multiply(qWorld));
  }

  worldPos(n: BoneName, out = new THREE.Vector3()) {
    return this.bones[n].getWorldPosition(out);
  }

  /** World rest rotation of a bone with an extra world rotation pre-multiplied (e.g. a body yaw). */
  restWorld(n: BoneName, pre?: THREE.Quaternion) {
    const rq = this.root.getWorldQuaternion(new THREE.Quaternion()).multiply(this.rest[n].W0);
    return pre ? pre.clone().multiply(rq) : rq;
  }

  /**
   * Analytic two-bone IK (after D. Holden, "Simple Two Joint IK"). Keeps the current bend plane, so pre-pose the
   * chain with a small bend in the direction the knee/elbow should point. `w` blends FK -> IK.
   */
  twoBoneIK(aN: BoneName, bN: BoneName, cN: BoneName, target: THREE.Vector3, w = 1, poleHint?: THREE.Vector3) {
    if (w <= 0) return;
    const A = this.bones[aN], B = this.bones[bN], C = this.bones[cN];
    A.updateWorldMatrix(true, true);
    const a = A.getWorldPosition(new THREE.Vector3());
    const b = B.getWorldPosition(new THREE.Vector3());
    const c = C.getWorldPosition(new THREE.Vector3());
    const lab = b.distanceTo(a), lcb = c.distanceTo(b);
    const lat = clamp(target.distanceTo(a), 1e-4, (lab + lcb) * 0.9995);
    const ac = _v1.subVectors(c, a).normalize();
    const ab = new THREE.Vector3().subVectors(b, a).normalize();
    const ba = new THREE.Vector3().subVectors(a, b).normalize();
    const bc = new THREE.Vector3().subVectors(c, b).normalize();
    const at = new THREE.Vector3().subVectors(target, a).normalize();
    const ac_ab_0 = Math.acos(clamp(ac.dot(ab), -1, 1));
    const ba_bc_0 = Math.acos(clamp(ba.dot(bc), -1, 1));
    const ac_at_0 = Math.acos(clamp(ac.dot(at), -1, 1));
    const ac_ab_1 = Math.acos(clamp((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat), -1, 1));
    const ba_bc_1 = Math.acos(clamp((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1));
    const axis0 = _v2.crossVectors(ac, ab);
    if (axis0.lengthSq() < 1e-10) axis0.crossVectors(ac, poleHint ?? new THREE.Vector3(1, 0, 0));
    axis0.normalize();
    const axis1 = _v3.crossVectors(ac, at);
    const hasA1 = axis1.lengthSq() > 1e-12;
    if (hasA1) axis1.normalize();
    const aG = A.getWorldQuaternion(new THREE.Quaternion());
    const bG = B.getWorldQuaternion(new THREE.Quaternion());
    const aGi = aG.clone().invert(), bGi = bG.clone().invert();
    const r0 = new THREE.Quaternion().setFromAxisAngle(axis0.clone().applyQuaternion(aGi), ac_ab_1 - ac_ab_0);
    const r1 = new THREE.Quaternion().setFromAxisAngle(axis0.clone().applyQuaternion(bGi), ba_bc_1 - ba_bc_0);
    const r2 = hasA1 ? new THREE.Quaternion().setFromAxisAngle(axis1.clone().applyQuaternion(aGi), ac_at_0) : new THREE.Quaternion();
    const aNew = A.quaternion.clone().multiply(r0).multiply(r2);
    const bNew = B.quaternion.clone().multiply(r1);
    A.quaternion.slerp(aNew, w);
    B.quaternion.slerp(bNew, w);
    A.updateWorldMatrix(false, true);
  }
}

/* ------------------------------------------------------------------ */
/* Keyframe helpers (pure functions of time)                            */
/* ------------------------------------------------------------------ */

export type Ease = (x: number) => number;
export const ease = {
  linear: (x: number) => x,
  inOut: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  out: (x: number) => 1 - Math.pow(1 - x, 3),
  in: (x: number) => x * x * x,
  smooth: (x: number) => x * x * (3 - 2 * x),
  /** fast attack with a small overshoot, for emphatic hits */
  back: (x: number) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};

/** Keyframed scalar: keys [[t, v, easeIntoThisKey?], ...] sorted by t. Holds outside the range. */
export function kf(t: number, keys: [number, number, Ease?][]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const u = (t - t0) / Math.max(1e-6, t1 - t0);
      return v0 + (v1 - v0) * (e ?? ease.inOut)(u);
    }
  }
  return keys[keys.length - 1][1];
}

/** Keyframed vector (same as kf, per component). */
export function kfv(t: number, keys: [number, V3, Ease?][]): V3 {
  return [0, 1, 2].map((c) => kf(t, keys.map(([tt, v, e]) => [tt, v[c], e] as [number, number, Ease?]))) as V3;
}

export const smoothstep = (e0: number, e1: number, x: number) => {
  const u = clamp((x - e0) / (e1 - e0), 0, 1);
  return u * u * (3 - 2 * u);
};

/** Deterministic smooth noise: sum of incommensurate sines, roughly in [-1, 1]. */
export const wobble = (t: number, seed: number) =>
  0.55 * Math.sin(t * 1.13 + seed * 1.7) + 0.3 * Math.sin(t * 2.31 + seed * 4.1) + 0.15 * Math.sin(t * 4.07 + seed * 2.3);
