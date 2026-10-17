---
name: plinth
description: Build slide presentations and hackathon pitch decks that read like a person with an opinion made them — clean corporate layout, one claim per slide, no filler words. Use when the user asks for slides, a deck, a pitch deck, a keynote, a board update, a demo-day or hackathon pitch (Colosseum, Superteam, ETHGlobal), a pitch video script, or says "my slides look AI-generated", "make this deck cleaner", "review my deck", "susun slide", "bikin pitch deck", "presentasi". Outputs a single self-contained HTML deck (arrow keys, print to PDF) plus speaker notes, and lints the copy before handing it over.
---

# Plinth

A deck is an argument with pictures. Every rule below serves that sentence.

## Step 0 — Decide which job this is

Ask at most one question, only if the answer is not in the request:

| Signal | Mode | Read |
|---|---|---|
| hackathon, investors, demo day, grant, "pitch" | **Pitch** | `references/pitch.md` |
| team update, keynote, class, board, workshop, "presentasi" | **Talk** | `references/talk.md` |
| "review", "fix", "why does this look AI" + an existing deck | **Review** | `references/review.md` |

Always read `references/craft.md` (layout and type) and `references/voice.md` (words). They apply to every mode.

Then open `references/scenarios.md` and take the spine for the specific occasion (hackathon video, demo day, seed meeting, accelerator, grant, sales, quarterly update, board, launch keynote, conference talk, lecture, thesis/skripsi defense, lightning talk, all-hands). If the deck is not in English, also read `references/languages.md` for register, number formats and headline length in that language.

## Step 0.5 — Research before writing

For any pitch, and any talk that makes a claim about the world, read `references/research.md` and do it. Search the web and fetch the pages yourself: surveys, government and regulator data, indices, market reports, on-chain dashboards. Aim for one sourced number per question a judge asks (is it real, how many people, why now, how big, who else). Record each in `research/<deck>-sources.md` with URL, date and a verbatim quote, and look for data that cuts against the pitch too.

Never write a number from memory. If you have no tool to fetch pages, tell the user before building and ask them for the sources; a deck is not finished while any number is unsourced.

## Step 1 — Write the spine before any slide

Write the deck as headlines only, one line each, in a plain list. Read the list top to bottom. If it does not make the whole case on its own, the deck is not ready — fix the list, not the slides.

Headline rules:
- A headline is a full claim with a verb: "Merchants lose 3% of every sale to card fees", not "The Problem".
- 12 words or fewer. If it needs more, it is two slides.
- Section labels ("Problem", "Market", "Team") go in the small eyebrow above the headline, never as the headline.

For a pitch or grant, check the spine against `references/benchmark.md` (Colosseum's judging guidance, Sequoia's plan, the Airbnb seed deck). Each missing row becomes a slide, or a line in the hand-over saying why it is missing.

Show the spine to the user when the stakes are high (investor, judged pitch). For a routine internal deck, go straight on.

## Step 2 — Give each slide one job

For each headline pick exactly one supporting element:
- one chart that proves the headline: `.hbars` bars, or ranges with `--a` (start) and `--b` (end), when two or more sourced numbers can be compared
- one table (`table.t`) when options are compared on the same attributes (competition, pricing tiers)
- one timeline (`.tl`) for deadlines, milestones, regulation dates
- one flow diagram (`.flow`) for how the product works; it needs no number
- one phone mockup (`.phone`, `.phone.sms`) showing the real messages when the product lives in chat or SMS, captioned as an illustration
- nested market circles (`.rings`), every ring a sourced number, for market size
- a two-axis positioning map (`.quad`) for competition, axes the buyer cares about
- one screenshot or product frame (`img.shot` + `.cap`), cropped to the part that matters. A design mockup says "Design mockup, not yet built" in its caption
- a column chart (`.cols`) for periods or options side by side, the one that matters in the accent
- a donut (`.donut`, `--p`) for one share of a whole; two donuts side by side for "worried vs. prepared"
- an isotype (`.iso data-of data-hi data-icon`) for "three in four", "one in eighteen": one icon per unit
- a row of key numbers (`.kpis`), as in an earnings deck, when three sourced numbers belong together
- a stacked bar (`.stack`) for how one whole splits (6% interest = 5% to lenders + 1% to the platform)
- loss layers (`.layers`) for who pays first, top to bottom
- several phones in a row (`.phones`), one per step, when the demo is a chat
- a half-bleed photo or screen (`section.media` + `figure.pic`), or a full-bleed photo (`section.photo` + `figure.bg`), with the credit in `figcaption.credit`
- a drawn diagram in inline SVG (a cross-section, a mechanism) when the idea is physical; caption it "not to scale"
- one number, set large (`.big`), with its source line underneath, only when there is nothing to compare it with
- one short list, three items at most
- one quote from a real user, with name and role

A pitch or data talk needs at least three slides with a chart, table, timeline, diagram or image, and at least two slides with a real picture: a photo of the people or place the product serves, a product screenshot, or the product on a phone. The linter takes points off below either. Real pictures come from, in this order: the product itself (screenshot it, or the block explorer / GitHub page that proves it runs); the team's own photos; documentary photos with an open licence, found through the Wikimedia Commons API (`generator=search&prop=imageinfo&iiprop=url|extmetadata`), keeping only CC BY, CC BY-SA or public-domain files and writing author, licence and "Wikimedia Commons" in the credit. Never a posed stock photo, never an AI-generated image, never a photo whose caption would mislead (a photo of a health worker is captioned with who and where they are, not presented as your programme). Record every picture in `research/photo-credits.md`. The closing slide stays on screen through the questions, so it is never a headline alone: show the ask as a timeline (what happens by when), a table (who you need and why) or a flow (where the money goes). Bars grow and `.rv` children rise in when the slide appears; the PDF and PPTX show the final state. Markup for every component is in `assets/deck-template.html` and `examples/pitch-quantcoin.slides.html`.

Two elements = two slides. Empty space is fine; it is where the eye rests.

## Step 3 — Build the deck

Copy `assets/deck-template.html`, fill the slides, keep its CSS tokens. Give the deck its own brand first, as winning decks do: set `--accent` (and `--brand` if the cover colour differs), add `<svg id="brandmark" hidden>` with the project's logo or a simple mark, make the cover a `section.brand`, and put an icon on every flow, timeline and card item. No slide is only words: team, budget and goals become `.cards`. See `references/benchmark.md`. Do not invent a new visual system per deck; consistency is what reads as professional. Change only `--accent` and the fonts when the user has a brand.

Speaker notes go in `<aside class="notes">` inside each slide: what to say, 40–70 words, written the way the person talks.

## Step 4 — Lint, then fix by hand

Run:

```bash
node scripts/lint-deck.mjs path/to/deck.html
```

Then check that nothing runs off a slide or overlaps, that no text is under 18px, and that each picture fills at least 45% of the space under its headline (headless Chrome, 1280×720, every slide):

```bash
npm install puppeteer-core       # once
node scripts/check-layout.mjs path/to/deck.html
```

If the deck cites outside data, also run `node scripts/check-sources.mjs path/to/deck.html research/<deck>-sources.md`. It fetches every cited URL and confirms the quoted number is still on the page. Fix every FAIL before handing over.

**No placeholder leaves your hands.** The deck ships as a PDF or .pptx that nobody will fix by hand, so `[source needed]`, `[name]`, `[budget needed]` and the like make the linter exit non-zero at any score. For each one, in this order:
1. Research it (Step 0.5) and put the sourced number or fact in.
2. If the fact is the user's own (team, budget, traction) and they gave it to you, use it.
3. If it cannot be known, rewrite the slide to state only what is known ("No budget yet: line items are X, Y, Z"; "Sample deck, no team yet; the pilot needs these two roles"). Never invent a name, organisation or figure to fill the gap.

The team's own numbers (prices, targets) get a source line such as `Source: team plan, not outside data`, and in the notes say "our own plan" next to them.

The linter flags filler vocabulary, headline length, slide density, missing sources on numbers, emoji, and exclamation marks. A score below 90 means rewrite, not tweak. Rewrite flagged lines by saying the specific thing instead — never swap one stock phrase for its synonym.

## Step 5 — Hand over

Give the user: the HTML path, how to present (open in browser, `F` fullscreen, arrows, `P` print to PDF), the lint score, and anything you had to guess (a number with no source, a team bio you did not have). Guesses are listed, never hidden.

Always hand over the PDF and the PowerPoint file too, because a judge or investor opens files, not a browser tab:

```bash
npm install pptxgenjs puppeteer-core   # once
node scripts/to-pptx.mjs path/to/deck.html [out.pptx]
"<chrome>" --headless=new --no-pdf-header-footer --print-to-pdf=out.pdf "file:///path/to/deck.html?print"
```

The .pptx shows every slide exactly as the HTML renders it (charts, images, fonts), full-bleed 16:9, with speaker notes kept, so nothing shifts when Inter is missing on the presenting machine. It refuses to export while any placeholder remains. Use `--editable` only when the user must edit text in PowerPoint; that mode draws native text boxes and plain template classes, and charts come through as text.

## Non-negotiables

- No invented data. A number without a source is researched or cut before export; it never ships as a placeholder.
- No emoji, no exclamation marks, no gradient text, no posed stock photos, no AI-generated images. Documentary photos only with an open licence and a visible credit.
- Font sizes: headline ≥ 40px on a 1280×720 canvas, body ≥ 22px. Anything smaller means too many words.
- 3 minutes of video pitch = 8–11 slides. 20-minute talk = 15–25. More slides with less on each beats the reverse.
