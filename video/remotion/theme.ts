import { loadFont } from "@remotion/google-fonts/Geist";
import { loadFont as loadMono } from "@remotion/google-fonts/GeistMono";

// Fonts are fetched from Google Fonts at render time (needs internet once; Chrome caches them).
export const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });
export const { fontFamily: monoFamily } = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

// Default palette: night navy + teal accent. Change these tokens per project (brand colours, fonts).
export const C = {
  bg: "#070d1a",
  bg2: "#0b1220",
  panel: "rgba(15,23,42,0.78)",
  line: "rgba(148,163,184,0.18)",
  text: "#e8eef7",
  dim: "#94a3b8",
  accent: "#10b981",
  accent2: "#6ee7b7",
  accentDeep: "#06140f",
  warn: "#f59e0b",
  danger: "#ef4444",
  violet: "#7c3aed",
};

export const shadow = "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(148,163,184,0.12)";
