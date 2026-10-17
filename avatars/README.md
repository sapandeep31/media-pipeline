# Team avatars

These are stylised, rigged 3D stand-ins for the two team members. Use them wherever a person appears in a video or a deck. **Real photos of the team are never used.**

| Id | Person | GLB (rigged) | Texture (4K, final) |
|---|---|---|---|
| `a` | Sapandeep | `video/public/assets/models3d/a_rigged.glb` | `a_albedo_light_4k.png` |
| `b` | Nida | `video/public/assets/models3d/b_rigged.glb` | `b_albedo_skin_4k.png` |

- **Rig sources:** the Mixamo FBX rigs are in `avatars/source/`.
- **Look reference:** `avatars/style-reference.png`.

## Approved look

- **Blocky, flat-shaded, low-poly**, with chunky proportions and a slightly moody, cinematic look. Lighting is a warm key, a cool fill and teal rims (see `video/remotion/rig/AvatarDemo.tsx`).
- **Rejected:**
  - cute or rounded "Pixar kid" styles
  - over-faceted or over-simplified low-poly
  - photo-real faces
- **Default material:** matte (metalness 0, roughness about 0.8). Gloss makes the blocks look plastic.

## Use in a video (Remotion)

```tsx
import { RigCharacter } from "../rig/RigCharacter";
import { type Performance, planWalk } from "../rig/gestures";
const perf: Performance = {
  walk: planWalk({ start: [1.55, -0.45], h0: -72, h1: -36, dist: 1.25, t0: 0.6, stepDur: 0.33, lead: "R" }),
  segments: [{ at: 0, g: "idle" }, { at: 0.55, g: "walk", fade: 0.2 }, { at: 1.8, g: "wave", fade: 0.25 }],
};
<RigCharacter src={staticFile("assets/models3d/b_rigged.glb")} mapSrc={staticFile("assets/models3d/b_albedo_skin_4k.png")} perf={perf} />
```

- **Gestures** (`video/remotion/rig/gestures.ts`):
  - `idle`
  - `walk`, driven by `planWalk`
  - `scold`
  - `wave`
  - custom gestures, written as a `GestureFn` over bone poses (`arm`, `elbow`, `clav`)
- **Presenter bust:** `video/remotion/lib/Presenter.tsx` has a corner presenter that talks while its line plays. It also has a full-figure layout.
- **Preview:** `cd video; .\make.ps1 studio`, then open `avatars/AvatarA` or `avatars/AvatarB`. For a single frame, run `.\make.ps1 still AvatarB 100`.

### Gotchas

- Pass `mapSrc` to use the 4K texture. The loader sets `flipY=false` on replacement maps.
- Skinned meshes need `frustumCulled=false`, which `RigCharacter` already sets. Without it, limbs pop out at the frame edges.
- Render the final with PNG frames (`--image-format=png`). JPEG frames soften the texture.
- The bones follow Mixamo naming (`mixamorig:*`). `rig.ts` maps poses onto them.

## How they were made (to make a new avatar)

1. **Image to 3D.** Generate a blocky low-poly character from a style-matched reference image with an image-to-3D tool. The result is a GLB with Draco and WebP. Which tool was used for the current two was not recorded; write it down next time.
2. **Plain GLB:** `node video/tools/avatars/glb-plain.mjs in.glb plain.glb`. This decodes Draco and WebP into a plain GLB.
3. **OBJ for Mixamo:** `node video/tools/avatars/glb2obj.mjs plain.glb out.obj`.
4. **Auto-rig.** Upload the OBJ to Mixamo (free; Adobe account) and download an FBX with skin, T-pose and no animation.
5. **FBX to GLB.** Run `FBX2glTF.exe -i rigged.fbx -o rigged --binary`. Get it from github.com/facebookincubator/FBX2glTF releases and put it in `vendor/fbx2gltf/`.
6. **Skin tone (optional).** `video/tools/avatars/reskin_a.py` builds UV-space skin masks from bone weights and colour, then remaps skin to one tone. Its UV crops are specific to these two meshes, so adapt it for a new mesh.
7. **Upscale to 4K.** Run `realesrgan-ncnn-vulkan -n realesr-animevideov3 -s 4` from github.com/xinntao/Real-ESRGAN releases, placed in `vendor/realesrgan/`.
8. **Check it.** Add the avatar to `AVATARS` in `AvatarDemo.tsx`, render a still, and look at it. Get approval on one sample before using it in scenes.

Licence: these avatars depict real people. They are public here so the team can reuse them; ask before using them in anything else.
