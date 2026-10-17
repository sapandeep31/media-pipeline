# Lessons log

Add a few lines per project: what worked, what cost time, what to do differently. Newest first.

## 2026-10 Hackathon pitch video + submission deck (3D simulation product)

**What worked**
- Agreeing on the script and slide map before building.
- Showing one sample slide or scene before making the full set.
- Real app captures recorded at 4K/DPR 2. They crop beautifully onto slides and into zooms.
- Action titles, plus one number per slide with its kind ("simulated").
- An organiser Q&A transcript. It surfaced rules the website didn't state: the live link is checked during judging, stated limits count in your favour, secrets disqualify.

**Corrections from the user, now house rules**
- **No chips or badges on slides.** Too many small boxes look cluttered.
- **Don't harp on implementation details.** "One change at a time" and "same seeded night" undersold the product. Say what the user can do: any mix of fixes, rerun, compare.
- **Write punchy, specific headlines.** "Make your society safer with more AI and less gut feeling" beat a careful but dull title.
- **Keep it short.** The first full draft had 100–140 words per slide and repeated the headline number on 4 slides. Cut to about 60–90 words, with each fact in one place.

**Bugs worth remembering**
- **"Bold" not showing for the user:** a "SemiBold" family name only exists where that font is installed. Use the regular family with the bold flag.
- **25 MB PPTX:** 4K source images went in uncropped. The builder now bakes the crop and downsizes.
- **Wrapped data labels:** LibreOffice wraps python-pptx chart labels. Draw small bar charts as shapes.
- **PowerShell traps:**
  - variable names are case-insensitive (`$v` is the same as `$V`)
  - `cp` is an alias for `Copy-Item` that shadows any function named `cp`
  - a comma list passed to a native exe splits into separate arguments, so quote it
- **Leaked key:** a grep for secrets printed a line of `.env` into a log. Exclude `.env` files from searches, and rotate the key if it happens.
