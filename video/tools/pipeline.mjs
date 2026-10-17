// One-command pipeline:  script -> TTS -> align -> capture (cached) -> Remotion render -> master -> frame checks
// Usage: node tools/pipeline.mjs script/sample.yaml [--recapture] [--skip-capture] [--only-capture] [--vertical]
//                                [--no-whisper] [--name out_name] [--scale 0.5] [--check]
// Run from the video/ folder (or via .\make.ps1 which sets PATH to the portable Node).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
process.chdir(ROOT);
const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const scriptPath = argv[0];
if (!scriptPath) { console.error("usage: node tools/pipeline.mjs script/<file>.yaml [flags]"); process.exit(2); }
const PY = path.join(ROOT, ".venv/Scripts/python.exe");
const NODE = process.execPath;

function run(cmd, args, label) {
  console.log(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, PYTHONIOENCODING: "utf-8", HF_HUB_DISABLE_SYMLINKS_WARNING: "1" } });
  if (r.status !== 0) { console.error(`${label} failed (exit ${r.status})`); process.exit(r.status ?? 1); }
}

const t0 = Date.now();
run(PY, ["tools/tts/tts.py", scriptPath], "1/5 TTS (Kokoro)");
run(PY, ["tools/align/align.py", scriptPath, ...(has("no-whisper") ? ["--no-whisper"] : [])], "2/5 Align (faster-whisper)");

// 3. capture every scene whose visual is a capture recipe (cached unless timing changed or --recapture)
if (!has("skip-capture")) {
  console.log("\n=== 3/5 Capture (puppeteer + Edge) ===");
  const timing = JSON.parse(fs.readFileSync("public/gen/timing.json", "utf8"));
  for (const s of timing.scenes) {
    if (s.visual?.type !== "capture" || s.visual.src) continue;
    const out = `public/gen/clips/${s.id}.mp4`;
    const marks = out.replace(/\.mp4$/, ".marks.json");
    const want = JSON.stringify({ recipe: s.visual.recipe, duration: s.duration, beats: s.beats ?? {} });
    const prev = fs.existsSync(marks) ? JSON.parse(fs.readFileSync(marks, "utf8")).request : null;
    if (!has("recapture") && fs.existsSync(out) && prev === want) { console.log(`[cached] ${s.id}`); continue; }
    if (prev && prev !== want && !has("recapture")) console.log(`[stale] ${s.id}: duration/beats changed -> re-recording`);
    run(NODE, ["tools/capture/record.mjs", "--recipe", s.visual.recipe, "--out", out, "--scene", s.id, "--timing", "public/gen/timing.json",
      ...(s.visual.mode ? ["--mode", s.visual.mode] : [])], `capture ${s.id} (${s.visual.recipe}, ${s.duration}s)`);
    const m = JSON.parse(fs.readFileSync(marks, "utf8"));
    m.request = want;
    fs.writeFileSync(marks, JSON.stringify(m, null, 2));
  }
}
if (has("only-capture")) process.exit(0);

const name = arg("name", path.basename(scriptPath).replace(/\.(ya?ml|json)$/, ""));
// render in a child process (isolates Chrome Headless Shell from this process; render.mjs retries internally)
run(NODE, ["tools/assemble/render.mjs", scriptPath, "--name", name, "--scale", arg("scale", "1"), ...(has("vertical") ? ["--vertical"] : [])],
  "4/5 Render (Remotion) + master (ffmpeg loudnorm)");
const final = path.join(ROOT, "out", `${name}.mp4`);

console.log("\n=== 5/5 Checks ===");
const tl = JSON.parse(fs.readFileSync("public/gen/timeline.json", "utf8"));
const checkDir = path.join(ROOT, "out", `${name}_frames`);
fs.mkdirSync(checkDir, { recursive: true });
// one frame from the middle of every scene -> out/<name>_frames/<scene>.png (look at them!)
for (const s of tl.scenes) {
  const at = (s.start + s.duration * 0.6).toFixed(2);
  spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", at, "-i", final, "-frames:v", "1", path.join(checkDir, `${s.id}.png`)]);
}
const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate:format=duration", "-of", "compact", final], { encoding: "utf8" });
console.log(probe.stdout.trim());
const vol = spawnSync("ffmpeg", ["-hide_banner", "-i", final, "-af", "volumedetect,ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const pick = (re) => (vol.match(re) ?? [])[1];
console.log(`audio: mean ${pick(/mean_volume: (\S+ dB)/)}, max ${pick(/max_volume: (\S+ dB)/)}, integrated ${pick(/I:\s+(\S+ LUFS)(?![\s\S]*I:)/)}, true peak ${pick(/Peak:\s+(\S+ dBFS)(?![\s\S]*Peak:)/)}`);
console.log(`\nDONE in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${final}\nframes -> ${checkDir}`);
