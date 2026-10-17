# Deck pipeline

This pipeline fills any PPTX template (an organiser's, a company's, or the plain starter) from a Python content file. It renders every slide locally, checks it, and exports the PDF. It needs no Office and no admin rights.

```
projects/<name>/template.pptx + content.py ──► tools/build_deck.py ──► out/deck.pptx
                                                         ├─► tools/render.py (portable LibreOffice) ──► deck.pdf + png/slide-NN.png + contact-sheet.png
                                                         └─► tools/check.py ──► placeholders · fonts · bounds · validate.py
```

Process (slide-map approval first): `../SOP.md`. Agent skill: `../skills/deck-studio/SKILL.md`. Research: `RESEARCH.md`.

## Quick start

```powershell
..\setup.ps1 -Presentation          # once: npm deps, .venv, portable LibreOffice + Google Sans Flex cuts
cd presentation
.\make.ps1                          # starter deck in .\deck -> out\deck.pptx, out\deck.pdf, out\png\, out\contact-sheet.png
mkdir projects\acme; copy deck\content.py projects\acme\; copy <organiser-template>.pptx projects\acme\template.pptx
.\make.ps1 -Project projects\acme   # build + render + check that project
.\make.ps1 -Project projects\acme render --only "3,5"   # re-shoot slides 3 and 5
.\make.ps1 -Project projects\acme text                  # read the deck as text
.\make.ps1 html graphics\diagram-stage.html --no-pdf    # draw a diagram on a 1920x1080 HTML stage -> PNG
```

No template? Run `.\.venv\Scripts\python.exe tools\new_template.py projects\acme\template.pptx [--dark]`.

## content.py in one screen

```python
ORDER = [1, 2, 2, 3]                       # template slide numbers in final order; repeat = duplicate
KEYS  = ["cover", "problem", "proof", "close"]
COVER = {"Team name:": "Acme"}             # fill "Label:" style covers (values written bold)
SLIDES = {
  "proof": {
    "label": "Proof",                      # rename the template's section label (None keeps it)
    "title": "A free fix cut simulated risk from 8.5 to 2.9",   # action title: one line, a full claim
    "elements": [
      {"type": "text", "x": 0.4, "y": 1.8, "w": 4.4, "h": 0.9, "font": FONT_SEMI, "size": 54,
       "paras": [[("8.5", {"color": INK_MUTED}), ("  →  ", {}), ("2.9", {"color": TEAL_TEXT})]]},
      *bars(x=0.4, y=4.0, label_w=1.25, bar_w=2.55, bar_h=0.26, gap=0.12,
            rows=[("₹14k streetlight", 40.0, TEAL_FILL), ("₹54k bundle", 10.4, "9CA3AF")]),
      {"type": "image", "src": "shots/app.png", "x": 5.05, "y": 1.8, "w": 4.55, "h": 3.1,
       "src_box": (250, 100, 1650, 950), "border": LINE},          # crop box in source px; cover-fit
      {"type": "icon", "name": "route", "x": 0.4, "y": 1.2},       # Tabler outline icon
    ],
    "notes": "speaker notes",
  },
}
```

- **Element types:**
  - `text` takes paragraphs of runs; each paragraph can have `bullet`, `align`, `line` and `after`.
  - `image` cover-fits around `focus`, with an optional `src_box`.
  - `rect` takes an optional text, `radius`, `fill` and `line`.
  - `icon` draws a Tabler outline icon.
  - `arrow` draws a connector with an arrowhead.
  - `hbar` is a native chart. Prefer the `bars()` helper.
- **Helpers in the starter `content.py`:** `bars()`, `box()`, `col_text()`.
- **Image paths** resolve against the project folder first, then `presentation/`.

## Layout

```
make.ps1                 entry point (-Project <folder>, puts ../vendor/node on PATH)
deck/                    starter project: template.pptx (from new_template.py) + content.py
tools/build_deck.py      template -> ORDER/KEYS structure -> labels, titles, elements, notes -> out/deck.pptx
tools/render.py          portable LibreOffice -> PDF; PyMuPDF -> PNG per slide; contact sheet
tools/check.py           leftover prompts/placeholders, font + 10 pt floor, content-area bounds, validate.py vs template
tools/new_template.py    plain 16:9 starter template (light or --dark)
tools/make_fonts.py      static Google Sans Flex cuts (Regular/Medium/SemiBold) for LibreOffice rendering
tools/lo.ps1             administrative extract of the LibreOffice MSI + fonts (no admin)
tools/build.mjs          HTML stage -> PNG/PDF via Edge with layout checks (diagrams)
graphics/                HTML stage: theme.css tokens, deck.js viewer, diagram-stage.html
assets/fonts, icons      Google Sans Flex + Geist (OFL), Tabler icon picks (MIT)
```

## Gotchas

- **Bold:** use `FONT_SEMI` (rendered as the regular family plus bold) instead of a "SemiBold" family name. Viewers that lack that family would show the text unbolded.
- **python-pptx:** `text_frame.text = …` wipes template formatting. The builder sets `run.text` instead.
- **LibreOffice:** the template's fonts must be installed in the portable LibreOffice (`tools/lo.ps1` does this). Otherwise renders use a substitute font with different widths, and the overflow checks lie.
- **PowerShell 5.1:** quote comma lists (`--only "3,5"`). Edit files with the Edit tool or Python, because `Set-Content` mangles UTF-8.
- **`render.py`** uses a throw-away LibreOffice profile per run. Set `SOFFICE=` to use another install.
