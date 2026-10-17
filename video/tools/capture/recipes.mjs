// Capture recipes. Each recipe = { preroll, record }.
//   preroll(ctx): unrecorded setup (load the page, set state). Keep it idempotent.
//   record(ctx):  the on-camera actions. ctx.at(sec) waits until a moment of the clip,
//                 ctx.beat(name, fallbackSec) waits for a narration-driven beat (seconds from clip start,
//                 resolved from public/gen/timing.json by tools/align), ctx.hold() waits until ctx.duration.
//   ctx = { page, rec, duration, beats, at, beat, hold, lib }
// Never edit the app under capture: clicks, keys, mouse moves and injected CSS only.
// The target URL is BASE_URL (default http://localhost:3000). For WebGL apps, expose the camera/store on window in
// dev builds and tween it from page.evaluate for smooth 3D moves.
import * as lib from "./lib.mjs";
const { clickText, moveTo, sleep, wheel } = lib;

async function open({ page }) {
  await lib.openApp(page);
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {}); // hide dev chrome
  await sleep(1500); // ms
  await moveTo(page, 960, 540, 50);
}

export const recipes = {
  /** Scroll a landing page top to bottom over the clip, pausing on each screen. */
  "scroll-page": {
    preroll: open,
    async record({ page, duration, at, hold }) {
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        await at((duration * i) / (steps + 1));
        await wheel(page, 700); // deltaY px, eased over ~0.6 s
      }
      await hold();
    },
  },

  /** Click a button by its visible text when the narration says the beat word (beats: { click: "word:Start-0.6" }). */
  "click-cta": {
    preroll: open,
    async record({ page, beat, hold }) {
      await beat("click", 1.5);
      await clickText(page, process.env.CTA_TEXT ?? "Get started");
      await hold();
    },
  },
};
