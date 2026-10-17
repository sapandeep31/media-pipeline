// Convert a static GLB to a clean OBJ + MTL (mesh + UVs only, no hierarchy) for Mixamo upload.
// Usage: node tools/avatars/glb2obj.mjs <in.glb> <outDir> <name> <albedo.jpg>
import fs from "fs";
import path from "path";

const [inGlb, outDir, name, albedo] = process.argv.slice(2);
const buf = fs.readFileSync(inGlb);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
const binStart = 20 + jsonLen + 8;
const bin = buf.subarray(binStart);

const COMP = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function acc(i) {
  const a = gltf.accessors[i];
  const v = gltf.bufferViews[a.bufferView];
  const T = COMP[a.componentType];
  const n = a.count * SIZE[a.type];
  const off = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const comps = SIZE[a.type];
  const elem = T.BYTES_PER_ELEMENT * comps;
  const stride = v.byteStride;
  if (!stride || stride === elem) {
    return new T(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + n * T.BYTES_PER_ELEMENT));
  }
  // interleaved: copy element by element
  const outArr = new T(n);
  const dv = new DataView(bin.buffer, bin.byteOffset);
  const get = { 5126: "getFloat32", 5125: "getUint32", 5123: "getUint16", 5121: "getUint8" }[a.componentType];
  for (let e = 0; e < a.count; e++) {
    for (let c = 0; c < comps; c++) outArr[e * comps + c] = dv[get](off + e * stride + c * T.BYTES_PER_ELEMENT, true);
  }
  return outArr;
}

// world transform per node: scale → rotate (quaternion) → translate, or a full matrix if given
function nodeMatrix(node) {
  if (node.matrix) {
    const m = node.matrix; // column-major
    return (p) => [
      m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
      m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
      m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
    ];
  }
  const s = node.scale ?? [1, 1, 1], t = node.translation ?? [0, 0, 0];
  const [qx, qy, qz, qw] = node.rotation ?? [0, 0, 0, 1];
  return (p) => {
    const x = p[0] * s[0], y = p[1] * s[1], z = p[2] * s[2];
    // v' = q * v * q^-1
    const ix = qw * x + qy * z - qz * y, iy = qw * y + qz * x - qx * z, iz = qw * z + qx * y - qy * x, iw = -qx * x - qy * y - qz * z;
    return [
      ix * qw + iw * -qx + iy * -qz - iz * -qy + t[0],
      iy * qw + iw * -qy + iz * -qx - ix * -qz + t[1],
      iz * qw + iw * -qz + ix * -qy - iy * -qx + t[2],
    ];
  };
}
const out = ["# clean export for Mixamo", `mtllib ${name}.mtl`, `o ${name}`, `usemtl ${name}_mat`];
let vBase = 1;
let vtBase = 1;
function walk(nodeIdx, parentXf) {
  const node = gltf.nodes[nodeIdx];
  const local = nodeMatrix(node);
  const xf = (p) => parentXf(local(p));
  if (node.mesh !== undefined) {
    for (const prim of gltf.meshes[node.mesh].primitives) {
      const pos = acc(prim.attributes.POSITION);
      const uv = prim.attributes.TEXCOORD_0 !== undefined ? acc(prim.attributes.TEXCOORD_0) : null;
      const nor = null; // Mixamo recomputes normals; skipping avoids un-rotated normals
      const count = pos.length / 3;
      // Weld: share one `v` per unique position (1e-5 m) so the mesh is connected for rigging;
      // UVs stay per-corner via separate `vt` indices, so texture seams are preserved.
      const posKey = new Map();
      const posIdx = new Int32Array(count);
      for (let i = 0; i < count; i++) {
        const p = xf([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]]);
        const key = `${Math.round(p[0] * 1e5)},${Math.round(p[1] * 1e5)},${Math.round(p[2] * 1e5)}`;
        let id = posKey.get(key);
        if (id === undefined) {
          id = vBase + posKey.size;
          posKey.set(key, id);
          out.push(`v ${p[0].toFixed(6)} ${p[1].toFixed(6)} ${p[2].toFixed(6)}`);
        }
        posIdx[i] = id;
      }
      const uvKey = new Map();
      const uvIdx = new Int32Array(count);
      if (uv) {
        for (let i = 0; i < count; i++) {
          const u = uv[i * 2], v = 1 - uv[i * 2 + 1];
          const key = `${Math.round(u * 1e6)},${Math.round(v * 1e6)}`;
          let id = uvKey.get(key);
          if (id === undefined) {
            id = vtBase + uvKey.size;
            uvKey.set(key, id);
            out.push(`vt ${u.toFixed(6)} ${v.toFixed(6)}`);
          }
          uvIdx[i] = id;
        }
      }
      const idx = prim.indices !== undefined ? acc(prim.indices) : Array.from({ length: count }, (_, i) => i);
      let skipped = 0;
      for (let i = 0; i < idx.length; i += 3) {
        const c = [idx[i], idx[i + 1], idx[i + 2]];
        const pv = c.map((x) => posIdx[x]);
        if (pv[0] === pv[1] || pv[1] === pv[2] || pv[0] === pv[2]) { skipped++; continue; } // degenerate after weld
        out.push("f " + c.map((x, k) => (uv ? `${pv[k]}/${uvIdx[x]}` : `${pv[k]}`)).join(" "));
      }
      console.log(`  welded ${count} → ${posKey.size} positions, ${uvKey.size} uvs, skipped ${skipped} degenerate tris`);
      vBase += posKey.size;
      vtBase += uvKey.size;
    }
  }
  for (const c of node.children ?? []) walk(c, xf);
}
const scene = gltf.scenes[gltf.scene ?? 0];
for (const n of scene.nodes) walk(n, (p) => p);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${name}.obj`), out.join("\n"));
// Texture: use the given file, or extract the GLB's own base-colour image (albedo arg = "embedded").
let texName = path.basename(albedo ?? "embedded");
if (!albedo || albedo === "embedded") {
  const mat = gltf.materials?.[0];
  const texIdx = mat?.pbrMetallicRoughness?.baseColorTexture?.index ?? 0;
  const img = gltf.images[gltf.textures?.[texIdx]?.source ?? 0];
  const bv = gltf.bufferViews[img.bufferView];
  const ext = img.mimeType === "image/png" ? "png" : "jpg";
  texName = `${name}_albedo.${ext}`;
  fs.writeFileSync(path.join(outDir, texName), bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength));
} else {
  fs.copyFileSync(albedo, path.join(outDir, texName));
}
fs.writeFileSync(path.join(outDir, `${name}.mtl`), `newmtl ${name}_mat\nKd 1 1 1\nmap_Kd ${texName}\n`);
console.log(`wrote ${name}.obj (${vBase - 1} verts) + mtl + texture to ${outDir}`);
