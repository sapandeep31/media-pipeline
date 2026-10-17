---
name: deck-studio
description: Plan, write and build presentation decks (pitch, hackathon submission, GTM/sales, investor, internal) with the media-pipeline presentation harness. It fills any PPTX template from a content.py file with python-pptx, renders through portable LibreOffice to PDF and PNGs, and runs placeholder, font, bounds and schema checks. Use for any request to outline a deck, write slide copy, fill an organiser's template, add charts, diagrams or screenshots, review a deck for verbosity or repetition, or export the final PDF.
---

# Deck studio

The code lives in `presentation/` of the media-pipeline repo. Read `presentation/README.md` before touching it. The order of work is fixed by `SOP.md`.

## The order of work

1. **Brief.** Collect the audience, any mandated template, the required sections or rubric, and the output format (usually a PDF). Read the organiser's rules and Q&A first. They override any guidance here.
2. **Research.** One sourced number per question the audience will ask. Record each one in `projects/<name>/sources.md`.
3. **Slide map, then approval. Stop here until the user approves.**
   - Columns: slide | section label (from the template) | action title (12 words or fewer, a full claim) | evidence | rubric criterion.
   - Run the storyline test: the titles alone, read top to bottom, should make the case.
   - Method: `knowledge/pitch-structure.md`.
4. **One sample slide.** Build the proof slide first, render it, and get an OK.
5. **Build.**
   - Use `presentation/projects/<name>/` holding `template.pptx` (the organiser's, or one from `tools/new_template.py`) and `content.py` (copy from `presentation/deck/content.py`).
   - Run `.\make.ps1 -Project projects\<name>`.
6. **QA.**
   - Look at every PNG and the contact sheet (`references/qa.md`).
   - `check` must end with "checks OK".
   - Count words: about 40–60 per slide.
   - Each fact appears once, in its best place.
7. **Deliver.** Upload the PDF. Cross-check the PPTX once in Google Slides or PowerPoint, because that is how the reviewers will open it.

## Rules

- **The organiser's template:** keep its marks, header and footer. Never redraw or recolour logos. Delete, duplicate and reorder slides freely.
- **No chips, pills or badges.** Qualifiers ("simulated") go into the title or the label, with at most one plain footnote.
- **Bold text:** use the regular font family with the bold flag. The builder does this for `FONT_SEMI`. That way bold survives on machines that don't have the semibold family installed.
- **Bars:** use the `bars()` helper (native rectangles, zero baseline). Don't use python-pptx charts for small bar comparisons, because LibreOffice wraps their labels.
- **Images:**
  - Use real product captures, cropped to the point.
  - The builder bakes the crop and downsizes to about 220 dpi, so files stay small.
  - Never use stock photos, AI art or real team photos (use `avatars/`).
- **Copy:**
  - Every number has a source and its kind.
  - Frame the product by what the user can do, not by implementation details.
  - Name each AI model and its job.
- **References:** `references/design.md` (layout, type, colour, what's banned), `references/pptx-editing.md` (OOXML footguns), `references/qa.md`. Also `skills/plinth/references/{voice,craft,pitch}.md` and `skills/frontend-design/SKILL.md`.
- **pptx skill:** the session skill `anthropic-skills:pptx`, if available, has `validate.py`. `check.py` calls it in place. It is proprietary and not copied here.
