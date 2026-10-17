// Build public/gen/timeline.json from (script + timing + captured clips), render with Remotion,
// then master audio with ffmpeg (two-pass loudnorm to -14 LUFS / -1.5 dBTP) and write SRT captions.
// Usage: node tools/assemble/render.mjs script/sample.yaml [--name sample] [--vertical] [--scale 0.5] [--frames 0-90]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const PUB = path.join(ROOT, "public");
const GEN = path.join(PUB, "gen");

export function buildTimeline(scriptPath) {
  const script = YAML.parse(fs.readFileSync(scriptPath, "utf8"));
  const timing = JSON.parse(fs.readFileSync(path.join(GEN, "timing.json"), "utf8"));
  const lib = JSON.parse(fs.readFileSync(path.join(PUB, "assets/sfx/library.json"), "utf8"));
  const meta = { fps: 30, width: 1920, height: 1080, captions: true, ...(script.meta ?? {}) };
  const sfxSrc = (s) => {
    const src = s.src ?? lib[s.name];
    if (!src || !fs.existsSync(path.join(PUB, src))) throw new Error(`sfx "${s.name ?? s.src}" not found (see public/assets/sfx/library.json)`);
    return src;
  };
  if (meta.music) {
    const m = typeof meta.music === "string" ? { src: meta.music } : meta.music;
    if (!fs.existsSync(path.join(PUB, m.src))) throw new Error(`music ${m.src} not found under public/`);
    meta.music = m;
  }
  const scenes = timing.scenes.map((s) => {
    const v = { ...s.visual };
    if (v.type === "capture") {
      v.src = v.src ?? `gen/clips/${s.id}.mp4`;
      const abs = path.join(PUB, v.src);
      if (!fs.existsSync(abs)) throw new Error(`capture clip missing for scene "${s.id}": ${v.src} (run the capture step)`);
      const marks = abs.replace(/\.mp4$/, ".marks.json");
      if (fs.existsSync(marks)) {
        const mk = JSON.parse(fs.readFileSync(marks, "utf8"));
        v.clipDuration = mk.seconds;
        v.trimStart = v.trimStart ?? mk.lead ?? 0; // skip the recorded lead-in
      }
    }
    return { ...s, visual: v, sfx: (s.sfx ?? []).map((x) => ({ at: x.at, volume: x.volume, src: sfxSrc(x) })) };
  });
  const tl = { meta, total: timing.total, scenes };
  fs.writeFileSync(path.join(GEN, "timeline.json"), JSON.stringify(tl, null, 2));
  return tl;
}

function srt(tl) {
  const fmt = (t) => {
    const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
  };
  const out = [];
  let n = 1;
  for (const s of tl.scenes) {
    let cur = [];
    const flush = () => { if (!cur.length) return; out.push(`${n++}\n${fmt(s.start + cur[0].s)} --> ${fmt(s.start + cur[cur.length - 1].e + 0.2)}\n${cur.map((w) => w.w).join(" ")}\n`); cur = []; };
    for (const w of s.words) { cur.push(w); if (cur.length >= 8 || /[.!?]$/.test(w.w)) flush(); }
    flush();
  }
  return out.join("\n");
}

function ff(args) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-y", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error("ffmpeg failed:\n" + r.stderr.slice(-2000));
  return r.stderr;
}

/** Two-pass EBU R128 loudness normalisation of the audio track; video stream copied. */
export function master(inp, out, { lufs = -14, tp = -1.5, limit = 0.82 } = {}) {
  const pass1 = ff(["-i", inp, "-af", `loudnorm=I=${lufs}:TP=${tp}:LRA=11:print_format=json`, "-f", "null", "-"]);
  const j = JSON.parse(pass1.slice(pass1.lastIndexOf("{"), pass1.lastIndexOf("}") + 1));
  ff(["-i", inp, "-c:v", "copy", "-af",
    `loudnorm=I=${lufs}:TP=${tp}:LRA=11:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000,alimiter=limit=${limit}:level=false:attack=3:release=60`,
    "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out]);
  return j;
}

/** 9:16 variant: blurred, darkened fill + the 16:9 frame centred (good enough for Shorts/Reels). */
export function vertical(inp, out) {
  ff(["-i", inp, "-filter_complex",
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:3,eq=brightness=-0.25[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "copy", "-movflags", "+faststart", out]);
}

export async function render(scriptPath, { name, vertical: vert = false, scale = 1, frames, concurrency } = {}) {
  name = name ?? path.basename(scriptPath).replace(/\.(ya?ml|json)$/, "");
  const tl = buildTimeline(scriptPath);
  fs.mkdirSync(path.join(ROOT, "out"), { recursive: true });
  console.log(`[render] ${tl.scenes.length} scenes, ${tl.total}s @ ${tl.meta.fps}fps`);
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, "remotion/index.ts"), publicDir: PUB, onProgress: () => {} });
  const inputProps = { timeline: tl };
  const raw = path.join(ROOT, "out", `${name}.raw.mp4`);
  let last = -1;
  const go = async (opts) => {
    const composition = await selectComposition({ serveUrl, id: "Main", inputProps, chromiumOptions: opts.chromiumOptions });
    return renderMedia({
      composition, serveUrl, inputProps, codec: "h264", crf: 17, x264Preset: "medium", pixelFormat: "yuv420p",
      audioCodec: "aac", audioBitrate: "320k", outputLocation: raw, scale,
      frameRange: frames ? frames.split("-").map(Number) : undefined,
      onProgress: ({ progress }) => { const p = Math.floor(progress * 10); if (p !== last) { last = p; process.stdout.write(`  ${p * 10}%`); } },
      ...opts,
    });
  };
  // Chrome Headless Shell occasionally dies at startup ("Target closed" in Page.bringToFront) on this machine.
  // Retry: same settings once more, then software GL with fewer tabs.
  const attempts = [
    { concurrency: concurrency ?? 3, chromiumOptions: { gl: "angle" } },
    { concurrency: concurrency ?? 3, chromiumOptions: { gl: "angle" } },
    { concurrency: 2, chromiumOptions: { gl: "swangle" } },
  ];
  for (let i = 0; i < attempts.length; i++) {
    try { await go(attempts[i]); break; } catch (e) {
      if (i === attempts.length - 1) throw e;
      console.warn(`\n[render] attempt ${i + 1} failed: ${String(e.message ?? e).split("\n")[0]} -> retrying (${JSON.stringify(attempts[i + 1].chromiumOptions)})`);
      last = -1;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  process.stdout.write("\n");
  const final = path.join(ROOT, "out", `${name}.mp4`);
  const ln = master(raw, final);
  console.log(`[master] input ${ln.input_i} LUFS, TP ${ln.input_tp} -> -14 LUFS  => ${final}`);
  fs.writeFileSync(path.join(ROOT, "out", `${name}.srt`), srt(tl));
  if (vert) { vertical(final, path.join(ROOT, "out", `${name}.9x16.mp4`)); console.log(`[vertical] out/${name}.9x16.mp4`); }
  if (!process.env.KEEP_RAW) fs.rmSync(raw, { force: true });
  return final;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(ROOT, "tools/assemble/render.mjs")) {
  const argv = process.argv.slice(2);
  const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
  await render(argv[0], { name: arg("name"), vertical: argv.includes("--vertical"), scale: Number(arg("scale", 1)), frames: arg("frames") });
}
