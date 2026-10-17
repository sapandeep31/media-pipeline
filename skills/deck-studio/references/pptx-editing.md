# How the builder edits a PPTX template (and the OOXML footguns)

`presentation/tools/build_deck.py` loads a fresh copy of `template.pptx` with python-pptx on every build. Then it does three things.

## 1. Structure

- `ORDER` lists template slide numbers in their final order. Repeating a number duplicates that slide, shapes and image relationships included. Leaving a number out deletes that slide.
- `KEYS` names each output slide, so `SLIDES["proof"]` fills the right copy.
- Structural work happens before any content is filled.

## 2. Section label

- The first text shape that came with the template slide is treated as its section label. The builder keeps that run's formatting.
- Set `"label"` to rename it or `None` to keep it. Use `"move_label": False` on covers.
- Prompt lines under the label are removed.
- Organiser covers with fields such as "Team name:" are filled through the `COVER` mapping. The values are written in bold.

## 3. Elements

- Element types: `text`, `image`, `rect`, `icon`, `arrow`, `hbar`, plus the `bars()` / `box()` / `col_text()` helpers in `content.py`.
- Every shape the builder adds is named `ms-*`. `check.py` uses that prefix to tell your shapes from the template's.
- Speaker notes come from `"notes"`.

## Footguns

- **Run formatting:** never set `text_frame.text = …` on template text. It drops the run formatting, so set `run.text`.
- **XML prefixes:** if you post-process XML, use lxml (python-pptx already does) and never `xml.etree`. ElementTree rewrites namespace prefixes and corrupts the deck.
- **Font names are plain strings.** A family the viewer doesn't have falls back silently. Prefer one family with bold flags, and ship the font with the deck.
- **Hex colours:** `RGBColor.from_string("059669")`, with no `#`.
- **Bullets:** use one `<a:p>` per bullet, with a real `buChar` (the builder's `bullet: True`). Never type a literal "•".
- **Default shape style:** auto-shapes carry a theme style that adds a soft shadow in LibreOffice and Slides. The builder strips `p:style`.
- **Charts:** python-pptx chart data labels wrap in LibreOffice. For two to five values, draw bars as shapes (`bars()`).
- **Images:** the builder crops the image and resizes it to about 220 dpi before inserting it. Without that, 4K captures make a PPTX of 25 MB or more.
- **Template slots:** if a template slot has more items than you need, delete the whole group, then check the render for orphans.
- **Validate:** after saving, run `validate.py --original template.pptx` (`check.py` does this when the pptx session skill is available).
