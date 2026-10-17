# Deck tooling research

> **Context:** researched in 2026 on a Windows laptop with no admin rights and no Office. The goal was to fill a mandated PPTX template and deliver a PDF. The choices apply to any deck.

## Decision summary

| Need | Choice | Why |
|---|---|---|
| Editing engine | **python-pptx 1.0.2** on a fresh template copy each build (`tools/build_deck.py` + `content.py`) | Reproducible. Keeps the template's masters, marks and fonts. Needs no Office. |
| Render / QA / PDF | **LibreOffice 26.2, portable**: the official MSI, administrative extract, no admin → PDF. Then **PyMuPDF** → one PNG per slide | The only Office-grade renderer that runs without an install. The QA loop (render, look, fix) is built on it. |
| Template fonts | Real font files installed into the portable LibreOffice. Static cuts are made with fontTools (`tools/make_fonts.py`) when a template names weight families such as "… SemiBold" | Without the font, LibreOffice substitutes one with different widths, and the overflow checks lie. |
| Bold | Regular family plus the bold flag, never a "SemiBold" family name | Viewers without that family installed show the text as regular weight. |
| Small charts | Native shapes (the `bars()` helper) | LibreOffice wraps python-pptx chart data labels. |
| Images | Crop and downsize to about 220 dpi before inserting | 4K captures otherwise make a PPTX of 25 MB or more. |
| Diagrams | Native boxes and arrows, or an HTML 1920×1080 stage rendered to PNG through Edge (`tools/build.mjs`) | Editable when simple, full control when complex. |
| Icons | **Tabler** outline (MIT), one set only | Broad vocabulary; consistent stroke. |
| Cross-check | Open the PPTX once in Google Slides or PowerPoint | Reviewers open it there, and font availability differs between apps. |

## Engines considered

| Engine | Verdict |
|---|---|
| python-pptx on the template | **Chosen** whenever a template is given. |
| pptxgenjs 4.0.1 | Good for decks built from scratch. It can't open an existing template. |
| HTML + Edge print-to-PDF | Vector text and embedded fonts. Used for diagrams, or for a fully custom deck when no template is required. |
| Marp CLI | Fast Markdown → PDF fallback. Editable PPTX needs LibreOffice. |
| Slidev / reveal.js | Heavy toolchains, so not worth it under a deadline. |

## Skills (vetted, copied into `skills/`)

| Skill | Source | Licence | Used for |
|---|---|---|---|
| deck-studio | written here | MIT | The loop, design rules, PPTX footguns, QA |
| plinth | github.com/bryankwandou/plinth | MIT | Pitch spine, headline rules, copy linter (the Solana `anchor.mjs` was removed) |
| frontend-slides | github.com/zarazhangrui/frontend-slides | MIT | 1920×1080 stage discipline, density modes, anti-slop rules |
| frontend-design, theme-factory | github.com/anthropics/skills | Apache-2.0 | Taste: the AI-default looks to avoid |
| slidev, marp-slide | slidevjs/slidev, softaworks/agent-toolkit | MIT | Reference and fallback |

Not copied:
- Anthropic's `pptx` skill, which is proprietary. `check.py` calls its `validate.py` in place when the session has it.
- Skills with no licence.

## Content guidance (sources)

- **Answer first (Minto) plus SCQA.** Use action titles: full-sentence claims of 12 words or fewer. They should pass the storyline test. See `knowledge/pitch-structure.md`.
- **Assertion-evidence titles** improve recall (Alley, Penn State; p < .01).
- **Duarte glance test:** the point lands in about 3 seconds.
- **YC (Hale):** legible, simple, obvious.
- **Honest numbers:**
  - Label each number's kind (measured, simulated or estimate).
  - Bars start at zero, and the lie factor is about 1 (Tufte).
  - Cite external statistics on the slide.
- **Density:** about 40–60 words per slide, and each fact appears in one place.

## Visual guidance

- **WCAG contrast:** 4.5:1 for text, 3:1 for large text. Bright accents such as teal `10B981` fail as text on white, so use a darker tone for text.
- **Layout:** 0.4 in side margins, gaps of 0.2 or 0.3 in, titles at a fixed y.
- **AI-deck failure modes to avoid:**
  - walls of text
  - gradient washes
  - emoji icons
  - identical icon cards
  - underline and stripe decorations
  - label titles
  - unsourced numbers
  - chips and badges
- Give concrete constraints (hex values, font, grid) rather than "avoid slop".
- **Brand marks** belong to their owners. Use only what a template provides, unmodified.
