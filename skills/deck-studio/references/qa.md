# QA after every render

Look at the images fresh. After writing the generator you see what you expect, not what rendered. When you can, have a subagent look at `out/png/*.png` and report defects.

## 1. Visual: each changed slide, then the contact sheet

1. **Text overflow or clipping.** Check this first. Titles must stay on one line.
2. **Overlaps:** text running through shapes or captures, or a caption colliding with content.
3. **Template bands:** nothing touching the header strip or the footer bar. Side margins of at least 0.4 in. Gaps between blocks of at least 0.2 in, and even.
4. **Consistency:** action titles sit at the same y, size and weight on every content slide.
5. **Line breaks:** no word or number split across lines ("₹14" / "k").
6. **Contrast:** check accent text and pale grey text against the background.
7. **Captures:** not stretched, not blurry, and no irrelevant app chrome.
8. **Template leftovers:** no prompt text still showing.

## 2. Content

- **Read it as text:** run `.\make.ps1 text` and read top to bottom. Look for typos, the order, and the storyline test.
- **Placeholders:** `check` must find no leftover placeholders or template prompts.
- **Numbers:** every number shows its kind (measured, simulated or estimate) and a source.
- **AI models:** each one is named along with its job.
- **3-second glance test:** can you state each slide's point from its title alone?
- **Repetition:** does any fact appear on more than one slide? Keep it only where it lands hardest.

## 3. File

- `check` ends with "checks OK". That means `validate.py` against the template passed.
- PDF page count equals the slide count, and text is selectable.
- The PPTX is a few MB, not tens. The builder downsizes images; drop huge source PNGs.
- **Open the PPTX once in Google Slides or PowerPoint.** Font availability differs between apps, and bold must survive.
