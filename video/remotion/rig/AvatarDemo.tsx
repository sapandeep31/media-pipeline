import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { RigCharacter } from "./RigCharacter";
import { type Performance, locoAt, planWalk, walkAt } from "./gestures";

/** Avatar rig demo: walk in from screen-right, scold, wave, idle (procedural bones on a Mixamo skeleton).
 *  Copy this file to start any scene with the team avatars. a = Sapandeep, b = Nida (see avatars/README.md). */

export const AVATARS = {
  a: { glb: "assets/models3d/a_rigged.glb", map: "assets/models3d/a_albedo_light_4k.png" },
  b: { glb: "assets/models3d/b_rigged.glb", map: "assets/models3d/b_albedo_skin_4k.png" },
} as const;

export const AVATAR_DEMO_FRAMES = 141;

export const PERF_DEMO: Performance = {
  walk: planWalk({ start: [1.55, -0.45], h0: -72, h1: -36, dist: 1.25, t0: 0.6, stepDur: 0.33, lead: "R" }),
  segments: [
    { at: 0, g: "idle" },
    { at: 0.55, g: "walk", fade: 0.2 },
    { at: 1.78, g: "scold", fade: 0.3 },
    { at: 3.3, g: "wave", fade: 0.25 },
    { at: 4.38, g: "idle", fade: 0.35 },
  ],
};

const CAM = { pos: new THREE.Vector3(0.6, 1.05, 5.6), look: new THREE.Vector3(0.6, 0.9, 0), fov: 30 };

const CameraRig: React.FC = () => {
  const { camera } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.copy(CAM.pos);
  cam.fov = CAM.fov;
  cam.near = 0.1; cam.far = 50;
  cam.lookAt(CAM.look);
  cam.updateProjectionMatrix();
  return null;
};

/** radial blob for the soft contact shadow */
function useBlobTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(0,0,0,0.85)");
    gr.addColorStop(0.45, "rgba(0,0,0,0.45)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
}

const Scene: React.FC<{ who: keyof typeof AVATARS }> = ({ who }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const blob = useBlobTexture();
  const loco = locoAt(walkAt(PERF_DEMO.walk, frame / fps), frame / fps, 0.1, 0.075);
  const fL = loco.feet.L.pos, fR = loco.feet.R.pos;
  const cx = (fL.x + fR.x) / 2, cz = (fL.z + fR.z) / 2;
  return (
    <>
      <CameraRig />
      {/* key (warm, front-left high, casts the soft shadow), fill (cool, right), teal rims (behind) */}
      <hemisphereLight args={["#b9c8ff", "#101a30", 0.55]} />
      <directionalLight
        position={[-2.6, 4.6, 4.2]} intensity={2.6} color="#ffe6c8" castShadow
        shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-radius={6} shadow-bias={-0.0004}
        shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-camera-near={0.5} shadow-camera-far={14}
      />
      <directionalLight position={[4.5, 2.2, 3.5]} intensity={0.75} color="#9fb8ff" />
      <directionalLight position={[3.5, 2.8, -4.5]} intensity={2.4} color="#2dd4bf" />
      <directionalLight position={[-4, 2.2, -4]} intensity={1.4} color="#10b981" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <shadowMaterial opacity={0.42} color="#000814" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.002, cz]} scale={[0.75 + Math.abs(fL.x - fR.x), 0.42 + Math.abs(fL.z - fR.z), 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={blob} transparent depthWrite={false} opacity={0.8} />
      </mesh>
      <RigCharacter src={staticFile(AVATARS[who].glb)} mapSrc={staticFile(AVATARS[who].map)} perf={PERF_DEMO} />
    </>
  );
};

export const AvatarDemo: React.FC<{ who: keyof typeof AVATARS }> = ({ who }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #13213d 0%, #03060f 75%)" }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.shadowMap.type = THREE.PCFSoftShadowMap; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}>
        <Scene who={who} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
