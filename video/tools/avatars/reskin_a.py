"""Skin textures for the rigged characters (texture step, run once; re-run after changing the tone).

  .venv\\Scripts\\python.exe tools\\avatars\\reskin_a.py

1. Skin masks are built in UV space from the MESH: every triangle whose vertices are mostly skinned to the
   head/neck/hand bones is rasterised into the atlas, then intersected with a colour test.
   - A: brown skin hue, saturation >= ~0.16 (catches the greyer smudged side-of-head/ear/neck island too);
     near-black hair, white eyes/shirt/collar fall outside it.
   - B: her leopard hijab has the SAME base tan as her skin, so colour cannot separate them. Her skin =
     hand-bone triangles + the face island (the connected skin-coloured region holding the eyes), all
     restricted to pixels close to her skin colour (the black spots / tunic are excluded).
2. Target tone: B's face skin median, desaturated ~18% and nudged cooler ("wheat / light brown").
3. A's skin and B's skin are both remapped to that tone, keeping each pixel's shading (luminance ratio).
Writes public/assets/models3d/a_albedo_light.png and b_albedo_skin.png (+ mask previews in out/hook-v3/).
RigCharacter loads them via `mapSrc` (glTF UV convention: flipY = false).
"""
import io, json, struct
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
M3D = ROOT / "public" / "assets" / "models3d"
PREV = ROOT / "out" / "hook-v3"
PREV.mkdir(parents=True, exist_ok=True)

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


class GLB:
    def __init__(self, p: Path):
        b = p.read_bytes()
        jl = struct.unpack_from("<I", b, 12)[0]
        self.j = json.loads(b[20:20 + jl])
        self.bin = b[20 + jl + 8:]

    def acc(self, i):
        a = self.j["accessors"][i]
        bv = self.j["bufferViews"][a["bufferView"]]
        dt = CT[a["componentType"]]
        n = NC[a["type"]]
        off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        stride = bv.get("byteStride", 0)
        isz = np.dtype(dt).itemsize * n
        if stride and stride != isz:
            raw = np.frombuffer(self.bin, np.uint8, count=stride * a["count"], offset=off).reshape(a["count"], stride)[:, :isz]
            return raw.copy().view(dt).reshape(a["count"], n)
        return np.frombuffer(self.bin, dt, count=a["count"] * n, offset=off).reshape(a["count"], n)

    def image(self):
        bv = self.j["bufferViews"][self.j["images"][0]["bufferView"]]
        s = bv.get("byteOffset", 0)
        return Image.open(io.BytesIO(self.bin[s:s + bv["byteLength"]])).convert("RGB")

    def joint_names(self):
        sk = self.j["skins"][0]
        return [self.j["nodes"][k]["name"].replace("mixamorig:", "") for k in sk["joints"]]

    def uv_mask(self, bones: set[str], size: int, thresh=0.5) -> np.ndarray:
        """rasterise triangles whose summed weight on `bones` (avg over the 3 verts) >= thresh"""
        names = self.joint_names()
        sel = np.array([n in bones for n in names])
        img = Image.new("L", (size, size), 0)
        dr = ImageDraw.Draw(img)
        for prim in self.j["meshes"][0]["primitives"]:
            at = prim["attributes"]
            uv = self.acc(at["TEXCOORD_0"]).astype(np.float64)
            J = self.acc(at["JOINTS_0"]).astype(int)
            Wt = self.acc(at["WEIGHTS_0"]).astype(np.float64)
            if Wt.max() > 1.5:
                Wt = Wt / 255.0
            vw = (Wt * sel[J]).sum(1)
            idx = self.acc(prim["indices"]).reshape(-1, 3)
            for tri in idx:
                if vw[tri].mean() >= thresh:
                    pts = [(uv[k, 0] * size, uv[k, 1] * size) for k in tri]
                    dr.polygon(pts, fill=255)
        return np.asarray(img, np.float32) / 255


def hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, (mx - mn) / (mx + 1e-6), mx


ramp = lambda x, a, b: np.clip((x - a) / (b - a), 0, 1)
lum = lambda a: a @ np.array([0.2126, 0.7152, 0.0722])

HEADS = {"Head", "HeadTop_End", "Neck"}
HANDS = {n for s in ("Left", "Right") for n in (f"{s}Hand",) } | {f"{s}Hand{f}{k}" for s in ("Left", "Right") for f in ("Thumb", "Index", "Middle", "Ring", "Pinky") for k in range(1, 5)}


def remap(tex, mask, src_skin, dst_skin):
    ratio = np.clip(lum(tex) / max(1e-4, float(lum(src_skin[None])[0])), 0.35, 1.45)[..., None]
    new = np.clip(dst_skin[None, None] * ratio, 0, 1)
    return tex * (1 - mask[..., None]) + new * mask[..., None]


ga, gb = GLB(M3D / "a_rigged.glb"), GLB(M3D / "b_rigged.glb")
A = np.asarray(ga.image(), np.float32) / 255
Bt = np.asarray(gb.image(), np.float32) / 255
N = A.shape[0]

# ---- target tone
hB = Bt.shape[0]
b_skin = np.median(Bt[int(hB * 0.275):int(hB * 0.325), int(hB * 0.02):int(hB * 0.1)].reshape(-1, 3), 0)
g = lum(b_skin[None])[0]
tone = g + (b_skin - g) * 0.82            # -18% saturation
tone = tone * np.array([0.975, 1.0, 1.05])  # a touch cooler
tone *= g / lum(tone[None])[0]            # keep brightness

# ---- A mask: head/neck/hand triangles x skin colour (looser saturation than v1)
# (low threshold: the neck/jaw triangles of the side-of-head island are split between Head, Neck and Spine2)
geoA = np.maximum(ga.uv_mask(HEADS, N, 0.15), ga.uv_mask(HANDS, N, 0.3))
geoA = ndimage.maximum_filter(geoA, size=5)  # cover seams / texel bleed at island borders
h, s, v = hsv(A)
colA = ramp(h, 4, 9) * (1 - ramp(h, 40, 48)) * ramp(s, 0.13, 0.22) * ramp(v, 0.17, 0.25) * (1 - ramp(v, 0.9, 0.96))
mA = geoA * colA
# whole colour-connected islands that are mostly skin-bone geometry (the smudged neck/jaw island has triangles
# whose weights are spread over Spine2/shoulders too)
labA, nA = ndimage.label(colA > 0.5)
if nA:
    cover = ndimage.mean(geoA, labA, index=np.arange(1, nA + 1))
    keep = np.concatenate([[False], cover > 0.25])
    mA = np.maximum(mA, keep[labA] * colA)
# never touch the shoes (brown-ish shoe texels sit in islands adjoining the hands in the atlas)
FEET = {"LeftFoot", "RightFoot", "LeftToeBase", "RightToeBase", "LeftLeg", "RightLeg"}
mA *= 1 - ndimage.maximum_filter(ga.uv_mask(FEET, N, 0.2), size=5)
# fade out where the pixel is much lighter than skin (skin->white-shirt blends) to avoid hard orange rims
mA *= 1 - ramp(lum(A) / max(1e-4, float(lum(np.array([[97, 54, 37]]) / 255)[0])), 1.3, 1.65)
strictA = colA * ramp(s, 0.4, 0.5)
a_skin = np.median(A[(mA > 0.9) & (strictA > 0.9)], 0)

# ---- B mask: hands + face island, close to her skin colour
dB = np.linalg.norm(Bt - b_skin[None, None], axis=-1)
colB = 1 - ramp(dB, 0.07, 0.12)
geoHandB = ndimage.maximum_filter(gb.uv_mask(HANDS, N, 0.5), size=5)
lab, _ = ndimage.label(colB > 0.5)
face_lbl = np.bincount(lab[int(hB * 0.28):int(hB * 0.38), int(hB * 0.01):int(hB * 0.11)].ravel())
face_lbl[0] = 0
faceB = (lab == face_lbl.argmax()).astype(np.float32)
faceB = ndimage.maximum_filter(faceB, size=3)
mB = np.maximum(geoHandB, faceB) * colB

outA = remap(A, mA, a_skin, tone)
outB = remap(Bt, mB, b_skin, tone)
Image.fromarray((outA * 255 + 0.5).astype(np.uint8)).save(M3D / "a_albedo_light.png", optimize=True)
Image.fromarray((outB * 255 + 0.5).astype(np.uint8)).save(M3D / "b_albedo_skin.png", optimize=True)
for name, tex, m in (("a", A, mA), ("b", Bt, mB)):
    vis = tex * 0.6
    vis[..., 1] = np.maximum(vis[..., 1], m)
    Image.fromarray((vis * 255).astype(np.uint8)).save(PREV / f"{name}_skin_mask.png")
# 4x upscale for HD close-ups (Real-ESRGAN ncnn-vulkan, realesr-animevideov3 keeps the flat painted look cleanest);
# UV layout unchanged (same aspect, 4096^2). Output: *_4k.png, which is what the renderer loads.
import subprocess as _sp
ESR = ROOT / "vendor" / "realesrgan" / "realesrgan-ncnn-vulkan.exe"
if ESR.exists():
    for nm in ("a_albedo_light", "b_albedo_skin"):
        _sp.run([str(ESR), "-i", str(M3D / f"{nm}.png"), "-o", str(M3D / f"{nm}_4k.png"), "-n", "realesr-animevideov3", "-s", "4",
                 "-m", str(ESR.parent / "models")], check=True, capture_output=True)
print("B skin", (b_skin * 255).round(), "A skin", (a_skin * 255).round(), "tone", (tone * 255).round(),
      "A px", int((mA > 0.5).sum()), "B px", int((mB > 0.5).sum()))
