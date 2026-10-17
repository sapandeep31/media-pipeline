import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useThree } from "@react-three/fiber";
import { useCurrentFrame, useDelayRender, useVideoConfig } from "remotion";
import { Rig } from "./rig";
import { type Performance, solveFrame } from "./gestures";

/**
 * A Mixamo-rigged glTF character posed procedurally every frame (no clips, no mixer).
 * The model is wrapped in a holder group scaled by `unitScale` (the Mixamo export here is in 1/100 m).
 * Place it at the scene root: the performance's floor coordinates are world coordinates.
 */
export const RigCharacter: React.FC<{
  src: string;
  perf: Performance;
  unitScale?: number;
  roughness?: number;
  onPose?: (info: ReturnType<typeof solveFrame>) => void;
  /** override the performance time (s), e.g. to hold a pose during an impact freeze */
  time?: number;
  /** replacement albedo texture (same UV layout as the GLB's), e.g. a recoloured skin */
  mapSrc?: string;
}> = ({ src, perf, unitScale = 100, roughness = 0.82, onPose, time, mapSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [state, setState] = useState<{ holder: THREE.Group; rig: Rig } | null>(null);
  const [handle] = useState(() => delayRender(`load ${src}`));
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    let alive = true;
    Promise.all([
      new GLTFLoader().loadAsync(src),
      mapSrc ? new THREE.TextureLoader().loadAsync(mapSrc) : Promise.resolve(null),
    ])
      .then(([gltf, map]) => {
        if (!alive) return;
        // crisp sampling: sRGB, trilinear mipmaps for minification, linear magnification, max anisotropy
        const crisp = (tx: THREE.Texture) => {
          tx.colorSpace = THREE.SRGBColorSpace;
          tx.generateMipmaps = true;
          tx.minFilter = THREE.LinearMipmapLinearFilter;
          tx.magFilter = THREE.LinearFilter;
          tx.anisotropy = gl.capabilities.getMaxAnisotropy();
          tx.needsUpdate = true;
        };
        if (map) { map.flipY = false; crisp(map); }
        const holder = new THREE.Group();
        holder.scale.setScalar(unitScale);
        holder.add(gltf.scene);
        gltf.scene.traverse((o) => {
          const m = o as THREE.SkinnedMesh;
          if (!m.isMesh) return;
          m.castShadow = true;
          m.receiveShadow = false;
          m.frustumCulled = false; // skinned bounds don't follow the bones
          const old = m.material as THREE.MeshStandardMaterial;
          // matte, well-lit look: kill the FBX Phong->PBR metalness/gloss
          m.material = new THREE.MeshStandardMaterial({ map: map ?? old.map, color: 0xffffff, metalness: 0, roughness, flatShading: false });
          if (old.map) crisp(old.map);
        });
        holder.updateMatrixWorld(true);
        setState({ holder, rig: new Rig(gltf.scene) });
      })
      .catch((e) => cancelRender(e));
    return () => { alive = false; };
  }, [src, mapSrc, unitScale, roughness, handle, continueRender, cancelRender, gl]);

  // pose synchronously during render so R3F draws this frame's pose
  const tt = time ?? frame / fps;
  const info = useMemo(() => (state ? solveFrame(state.rig, tt, perf) : null), [state, tt, frame, perf]);
  useEffect(() => { if (info && onPose) onPose(info); }, [info, onPose]);
  // ThreeCanvas only advances R3F when the frame changes; the model arrives later, so draw once more, then release.
  const { advance } = useThree();
  useEffect(() => {
    if (!state) return;
    advance(performance.now());
    continueRender(handle);
  }, [state, advance, continueRender, handle]);

  return state ? <primitive object={state.holder} /> : null;
};
