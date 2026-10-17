// Decode a Draco + WebP GLB into a plain GLB (uncompressed geometry, PNG textures).
// Usage: node tools/avatars/glb-plain.mjs <in.glb> <out.glb>
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// WebP → PNG via the ffmpeg CLI (avoids a native image dependency)
function webpToPng(bytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webp-"));
  const src = path.join(dir, "in.webp"), dst = path.join(dir, "out.png");
  fs.writeFileSync(src, bytes);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", src, dst]);
  const png = fs.readFileSync(dst);
  fs.rmSync(dir, { recursive: true, force: true });
  return new Uint8Array(png);
}

const [inp, out] = process.argv.slice(2);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "draco3d.decoder": await draco3d.createDecoderModule() });

const doc = await io.read(inp);
for (const tex of doc.getRoot().listTextures()) {
  const img = tex.getImage();
  if (img && (tex.getMimeType() === "image/webp" || tex.getMimeType() === "")) {
    tex.setImage(webpToPng(img)).setMimeType("image/png");
    tex.setURI(tex.getURI().replace(/\.webp$/i, ".png"));
  }
}
for (const ext of doc.getRoot().listExtensionsUsed()) {
  if (ext.extensionName === "KHR_draco_mesh_compression" || ext.extensionName === "EXT_texture_webp") ext.dispose();
}
await io.write(out, doc);
console.log("wrote", out);
