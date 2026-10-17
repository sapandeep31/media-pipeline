import React from "react";
import { Composition, Folder, staticFile } from "remotion";
import { Main } from "./Main";
import { TitleCard } from "./components/TitleCard";
import { Outro, StatsPanel } from "./components/Panels";
import { AvatarDemo, AVATAR_DEMO_FRAMES } from "./rig/AvatarDemo";
import type { Timeline } from "./types";

const EMPTY: Timeline = { meta: { fps: 30, width: 1920, height: 1080 }, total: 5, scenes: [] };

/** Core compositions. Project-specific, hand-built compositions live in projects/<name>/remotion and are
 *  registered here (or in a project Root) while that project is in production. */
export const Root: React.FC = () => (
  <>
    {/* The YAML-driven video: props = public/gen/timeline.json (render.mjs passes it; Studio fetches it). */}
    <Composition
      id="Main"
      component={Main}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={150}
      defaultProps={{ timeline: EMPTY }}
      calculateMetadata={async ({ props }) => {
        let tl = props.timeline;
        if (!tl.scenes.length) {
          try { tl = await (await fetch(staticFile("gen/timeline.json"))).json(); } catch { /* none yet */ }
        }
        return { durationInFrames: Math.max(1, Math.ceil(tl.total * tl.meta.fps)), fps: tl.meta.fps, width: tl.meta.width, height: tl.meta.height, props: { timeline: tl } };
      }}
    />
    <Folder name="components">
      <Composition id="TitleCard" component={TitleCard} fps={30} width={1920} height={1080} durationInFrames={120}
        defaultProps={{ title: "Acme", subtitle: "One line on what it does", kicker: "Launch 2026" }} />
      <Composition id="Stats" component={StatsPanel} fps={30} width={1920} height={1080} durationInFrames={120}
        defaultProps={{ title: "Proof, in two numbers", stats: [{ from: 0, to: 14, prefix: "₹", suffix: "k", label: "spent" }, { from: 0, to: -5.6, decimals: 1, label: "risk score" }], footnote: "label every number: measured, simulated or estimate" }} />
      <Composition id="Outro" component={Outro} fps={30} width={1920} height={1080} durationInFrames={120}
        defaultProps={{ name: "Acme", tagline: "The tagline goes here.", url: "acme.example" }} />
    </Folder>
    <Folder name="avatars">
      {/* a = Sapandeep, b = Nida: rigged GLBs posed procedurally (walk, scold, wave, idle) */}
      <Composition id="AvatarA" component={AvatarDemo} fps={30} width={1920} height={1080} durationInFrames={AVATAR_DEMO_FRAMES} defaultProps={{ who: "a" as const }} />
      <Composition id="AvatarB" component={AvatarDemo} fps={30} width={1920} height={1080} durationInFrames={AVATAR_DEMO_FRAMES} defaultProps={{ who: "b" as const }} />
    </Folder>
  </>
);
