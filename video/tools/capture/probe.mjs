// Probe: which Edge launch mode gives the best WebGL frame rate + CDP screencast rate on this machine.
// Usage: node tools/capture/probe.mjs <mode>   mode = headful-gpu | headless-gpu | headless-swiftshader
import { launchBrowser, openApp, sleep } from "./lib.mjs";

const mode = process.argv[2] ?? "headful-gpu";
const { browser, page } = await launchBrowser({ mode });
await openApp(page);
await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll("button"));
  els.find((e) => (e.textContent ?? "").includes("Launch demo"))?.click();
});
await sleep(6000);
await page.screenshot({ path: `out/probe-${mode}.png` });
const info = await page.evaluate(async () => {
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2");
  const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "n/a";
  let n = 0;
  const t0 = performance.now();
  await new Promise((res) => {
    const f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else res(); };
    requestAnimationFrame(f);
  });
  return { renderer, rafFps: +(n / 3).toFixed(1), w: innerWidth, h: innerHeight, dpr: devicePixelRatio };
});
const cdp = await page.createCDPSession();
let frames = 0;
cdp.on("Page.screencastFrame", async (f) => { frames++; await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); });
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 85, everyNthFrame: 1 });
// keep the scene moving
await page.mouse.move(900, 500);
for (let i = 0; i < 60; i++) { await page.mouse.move(900 + i * 5, 500 + Math.sin(i / 5) * 40); await sleep(50); }
await cdp.send("Page.stopScreencast");
console.log(JSON.stringify({ mode, ...info, screencastFps: +(frames / 3).toFixed(1) }));
await browser.close();
