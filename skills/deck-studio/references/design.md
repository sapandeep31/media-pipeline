# Design rules for decks built with deck-studio

These defaults come from a deck the user approved. The brand tokens live at the top of `content.py`; change them per project. Units are inches on a 10 × 5.625 in (16:9) slide.

## Canvas

- If an organiser's template has a header strip and a footer bar, measure them once (python-pptx: shape `top` and `height`) and never place anything over them.
- **Default layout:**
  - Section label at y 0.60–0.70. Keep the template's label text, because that is how reviewers find the section.
  - Action title at y about 1.05–1.10.
  - Body content from y about 1.75 to 5.30.
  - Side margins 0.40 in, so content runs x 0.40 → 9.60.
- **Grid:** 12 columns across 9.2 in. Halves are 4.5 in each and thirds are 2.93 in each.
- **Gaps:** always 0.2 in or 0.3 in. Pick one per slide and use it throughout.

## Type

| Role | Size | Colour |
|---|---|---|
| Section label | template's own (often 16 pt bold) | template's own |
| **Action title** | 22–24 pt bold, one line, about 58 characters maximum | `111827` |
| Big number | 54–66 pt bold | accent text colour for the good value, `6B7280` for the before value |
| Body | 12–14 pt | `1F2937` |
| Caption / source line | 10–11 pt | `6B7280` |

- **Size floor:** nothing under 10 pt.
- **When text doesn't fit:** cut words or split the slide. Don't shrink it.
- **Alignment:** left-align body text. Never centre paragraphs.
- **Fonts:** one family. The default is Google Sans Flex (OFL, in `presentation/assets/fonts`). Bold comes from the bold flag on the regular family.

## Colour

- **One accent.** Use the fill tone for shapes and icons, and a darker tone for text on white. Check text contrast against WCAG 4.5:1. For example, teal `10B981` on white is only 2.5:1, so use `059669` for teal text.
- **One alert colour** (amber `D97706`) for "before" or bad states, used sparingly.
- **Ink:** `111827` / `1F2937` / `6B7280`. Light fills: `F3F4F6`, plus an accent tint for one highlighted block.
- **Organiser and brand colours** belong to their logos. Don't reuse them for your own elements.

## Imagery

- **Real product captures first.** Crop to the part that matters and keep the aspect ratio. Use a 0.75 pt `E5E7EB` border or none. No drop shadows and no device mockups.
- **People:** only the stylised avatars in `avatars/`. Never real team photos.
- **Icons:** Tabler outline only (`icon` element), one stroke weight, never emoji.
- **Bars (2–5 values):** use the `bars()` helper. It draws native rectangles with a zero baseline and puts the value at the end of each bar.
- **Diagrams:** native boxes and arrows (`box()` and the `arrow` element) stay editable. For complex pictures, render an HTML stage to PNG (`presentation/graphics/`).

## Banned (AI-deck tells)

- **Layout clichés:**
  - chips, pills, tags or badges
  - accent lines under titles, or coloured side stripes on cards
  - gradient fills and purple washes
  - three identical icon cards on every slide
- **Text:**
  - more than about 60 words or 5 bullets on a slide
  - the same fact repeated on several slides
- **Numbers:** unsourced figures and market-size boilerplate.
- **Templates:** moving, recolouring or covering an organiser's marks.
