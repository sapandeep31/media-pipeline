// Record one capture recipe to an MP4 clip.
// Usage: node tools/capture/record.mjs --recipe run-sim --out build/clips/demo.mp4 [--duration 8]
//        [--scene demo --timing build/timing.json] [--mode headless-gpu|headful-gpu|headless-swiftshader]
//        [--tail 1.0]   extra seconds recorded after the target duration (trim handle)
// When --scene/--timing are given, duration and beats come from the narration timing JSON
// (scene.duration and scene.beats, seconds from the start of that scene).
import fs from "node:fs";
import path from "node:path";
import * as lib from "./lib.mjs";
import { recipes } from "./recipes.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const id = arg("recipe");
const out = path.resolve(arg("out", `build/clips/${id}.mp4`));
const recipe = recipes[id];
if (!recipe) { console.error(`unknown recipe "${id}". Known: ${Object.keys(recipes).join(", ")}`); process.exit(2); }

let duration = Number(arg("duration", 8));
let beats = {};
const timingPath = arg("timing");
const sceneId = arg("scene");
if (timingPath && sceneId && fs.existsSync(timingPath)) {
  const t = JSON.parse(fs.readFileSync(timingPath, "utf8"));
  const s = t.scenes.find((x) => x.id === sceneId);
  if (s) { duration = arg("duration") ? duration : s.duration; beats = s.beats ?? {}; }
}
// lead-in: start recording early when a beat is negative (e.g. cursor must start moving before the scene starts);
// the clip is then trimmed by `lead` seconds in the edit (marks.json -> render.mjs trimStart).
const lead = Math.max(Number(arg("lead", 0)), ...Object.values(beats).map((b) => (typeof b === "number" && b < 0 ? -b + 0.2 : 0)));
if (lead > 0) { for (const k of Object.keys(beats)) if (typeof beats[k] === "number") beats[k] += lead; duration += lead; }
const tail = Number(arg("tail", 1.0));
const mode = arg("mode", "headless-gpu");
if (mode.endsWith("gpu") && process.env.DGPU === undefined) process.env.DGPU = "1"; // prefer the GTX 1650

fs.mkdirSync(path.dirname(out), { recursive: true });
const { browser, page } = await lib.launchBrowser({ mode });
try {
  const ctx = { page, duration, beats, lib };
  await recipe.preroll(ctx);
  const rec = await lib.startRecording(page, out, { fps: Number(arg("fps", 30)) });
  const t0 = Date.now();
  ctx.rec = rec;
  ctx.at = async (sec) => { const w = t0 + sec * 1000 - Date.now(); if (w > 0) await lib.sleep(w); };
  ctx.beat = async (name, fallback) => { const s = beats[name] ?? fallback + lead; rec.mark(name); await ctx.at(s); rec.mark(name + ":go"); };
  ctx.hold = async () => ctx.at(duration + tail);
  await recipe.record(ctx);
  await ctx.hold();
  const meta = await rec.stop();
  meta.lead = +lead.toFixed(3);
  fs.writeFileSync(out.replace(/\.mp4$/i, ".marks.json"), JSON.stringify(meta, null, 2));
} finally {
  await browser.close();
}
