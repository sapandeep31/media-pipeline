// Shared capture helpers: launch Edge, fake on-screen cursor, smooth mouse, click-by-text,
// and a timestamp-accurate CDP screencast recorder that encodes to constant-frame-rate H.264.
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const EDGE = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
export const BASE = process.env.BASE_URL ?? "http://localhost:3000";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * mode:
 *  headful-gpu          real window, D3D11 GPU (best WebGL; window must stay un-minimised)
 *  headless-gpu         new headless with ANGLE d3d11 (may fall back to software)
 *  headless-swiftshader what scripts/shot.ts uses (slow but deterministic)
 */
export async function launchBrowser({ mode = "headful-gpu", width = 1920, height = 1080, dpr = 1 } = {}) {
  const gpu = mode.endsWith("gpu");
  const args = [
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=Translate,msEdgeSidebarV2,msHubApps,msUndersideButton",
    "--hide-scrollbars",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--force-color-profile=srgb",
    `--window-size=${width},${height + (mode === "headful-gpu" ? 140 : 0)}`,
    "--window-position=0,0",
    ...(gpu
      ? ["--use-angle=d3d11", "--enable-gpu-rasterization", "--ignore-gpu-blocklist", "--enable-zero-copy",
         ...(process.env.DGPU === "1" ? ["--force_high_performance_gpu"] : [])]
      : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
  ];
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: mode.startsWith("headless"),
    defaultViewport: null,
    userDataDir: path.resolve("vendor/.edge-profile"),
    args,
  });
  const [page] = await browser.pages();
  await page.setViewport({ width, height, deviceScaleFactor: dpr });
  page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));
  await page.evaluateOnNewDocument(CURSOR_SCRIPT);
  return { browser, page };
}

export async function openApp(page, route = "/") {
  await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1200);
}

// ---------- fake cursor (CDP screencast does not include the OS cursor) ----------
const CURSOR_SCRIPT = `(() => {
  if (window.__vcursor) return; window.__vcursor = true;
  const mk = () => {
    const c = document.createElement('div');
    c.id = '__vcursor';
    c.style.cssText = 'position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;transform:translate(-200px,-200px);transition:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))';
    c.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.7 L11.6 14 L18 14 Z" fill="white" stroke="#0b1220" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    let x = -200, y = -200;
    addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; c.style.transform = 'translate(' + (x - 4) + 'px,' + (y - 2) + 'px)'; }, true);
    addEventListener('mousedown', e => {
      const r = document.createElement('div');
      r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border-radius:50%;border:3px solid #10b981;left:' + (e.clientX - 6) + 'px;top:' + (e.clientY - 6) + 'px;width:12px;height:12px;opacity:.95;transition:all .45s cubic-bezier(.2,.7,.2,1)';
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.left = (e.clientX - 26) + 'px'; r.style.top = (e.clientY - 26) + 'px'; r.style.width = '52px'; r.style.height = '52px'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 600);
    }, true);
  };
  if (document.documentElement) mk(); else addEventListener('DOMContentLoaded', mk);
})();`;

let mouse = { x: 960, y: 540 };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Smooth eased mouse move (~60 Hz). */
export async function moveTo(page, x, y, ms = 700) {
  const from = { ...mouse };
  const n = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= n; i++) {
    const k = ease(i / n);
    await page.mouse.move(from.x + (x - from.x) * k, from.y + (y - from.y) * k);
    await sleep(ms / n);
  }
  mouse = { x, y };
}

/** Find a visible element whose text includes `text` (buttons/links/tabs by default). */
export async function findByText(page, text, selector = "button, a, [role=button], [role=tab], label") {
  return page.evaluate(
    (t, sel) => {
      const els = Array.from(document.querySelectorAll(sel));
      const el = els.find((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (e.textContent ?? "").trim().includes(t) && !e.disabled;
      });
      if (!el) return null;
      el.scrollIntoView({ block: "nearest" });
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
    },
    text,
    selector
  );
}

export async function waitForText(page, text, { timeout = 60000, selector } = {}) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const box = await findByText(page, text, selector);
    if (box) return box;
    await sleep(250);
  }
  throw new Error(`timeout waiting for "${text}"`);
}

/** Move the visible cursor to an element by text and click it. */
export async function clickText(page, text, { moveMs = 700, timeout = 60000, selector, pauseMs = 250 } = {}) {
  const box = await waitForText(page, text, { timeout, selector });
  await moveTo(page, box.x, box.y, moveMs);
  await sleep(pauseMs);
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
  return box;
}

/** Drag (e.g. orbit the 3D camera). */
export async function drag(page, from, to, ms = 1200, button = "left") {
  await moveTo(page, from.x, from.y, 400);
  await page.mouse.down({ button });
  await moveTo(page, to.x, to.y, ms);
  await page.mouse.up({ button });
}

export async function wheel(page, deltaY, steps = 10, ms = 600) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel({ deltaY: deltaY / steps });
    await sleep(ms / steps);
  }
}

// ---------- recorder ----------
/**
 * Records the page via CDP Page.startScreencast. Each frame carries a compositor timestamp, so we
 * rebuild real timing with ffmpeg's concat demuxer and resample to constant fps -> smooth, in-sync clip.
 * rec.mark(name) stores a named timestamp (seconds from start) into <out>.marks.json for assembly.
 */
export async function startRecording(page, outMp4, { fps = 30, width = 1920, height = 1080, quality = 92 } = {}) {
  const dir = outMp4.replace(/\.mp4$/i, "") + "_frames";
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.createCDPSession();
  const frames = [];
  let t0 = null;
  const marks = {};
  let wall0 = null;
  let stopped = false;
  cdp.on("Page.screencastFrame", (f) => {
    if (stopped) return;
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    const ts = f.metadata.timestamp ?? Date.now() / 1000;
    if (t0 === null) { t0 = ts; wall0 = Date.now() / 1000; }
    const file = path.join(dir, `f${String(frames.length).padStart(6, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, "base64"));
    frames.push({ file, t: ts - t0 });
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality, maxWidth: width, maxHeight: height, everyNthFrame: 1 });
  const startedWall = Date.now() / 1000;
  return {
    /** seconds since the first captured frame (same clock as mark()) */
    time() { return +(Date.now() / 1000 - (wall0 ?? startedWall)).toFixed(3); },
    mark(name) {
      marks[name] = +(Date.now() / 1000 - (wall0 ?? startedWall)).toFixed(3);
      console.log(`[mark] ${name} @ ${marks[name]}s`);
    },
    async stop() {
      await sleep(200);
      await cdp.send("Page.stopScreencast");
      stopped = true;
      const end = Date.now() / 1000 - (wall0 ?? startedWall);
      if (!frames.length) throw new Error("no frames captured");
      const lines = [];
      for (let i = 0; i < frames.length; i++) {
        const next = i + 1 < frames.length ? frames[i + 1].t : end;
        lines.push(`file '${frames[i].file.replace(/\\/g, "/")}'`, `duration ${Math.max(0.001, next - frames[i].t).toFixed(4)}`);
      }
      lines.push(`file '${frames[frames.length - 1].file.replace(/\\/g, "/")}'`);
      const list = path.join(dir, "list.txt");
      fs.writeFileSync(list, lines.join("\n"));
      const r = spawnSync(
        "ffmpeg",
        ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
         "-vf", `fps=${fps},scale=${width}:${height}:flags=lanczos:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x0b1220,format=yuv420p`,
         "-c:v", "libx264", "-preset", "medium", "-crf", "15", "-movflags", "+faststart", outMp4],
        { stdio: "inherit" }
      );
      if (r.status !== 0) throw new Error("ffmpeg encode failed");
      const meta = { frames: frames.length, seconds: +end.toFixed(3), avgFps: +(frames.length / end).toFixed(1), marks };
      fs.writeFileSync(outMp4.replace(/\.mp4$/i, ".marks.json"), JSON.stringify(meta, null, 2));
      if (!process.env.KEEP_FRAMES) fs.rmSync(dir, { recursive: true, force: true });
      console.log(`[rec] ${outMp4}  ${meta.seconds}s  ${meta.frames} frames (avg ${meta.avgFps} fps)`);
      return meta;
    },
  };
}
