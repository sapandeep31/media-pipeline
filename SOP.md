# SOP: making a video or a deck

This is the operating procedure for people and agents. Follow the steps in order. **Never build before the script or outline is agreed.**

## 0. Brief (5 minutes, ask if unknown)

- **Audience:** judges, investors, customers or the internal team. What do they already know?
- **Job of the piece:** win a judged round, get a demo booked, launch, or explain. One sentence.
- **Format and limits:** length (for example a 3-minute video or about 12 slides), aspect ratio, template or rubric, deadline, and the file to deliver (MP4 or PDF).
- **Brand:** colours, fonts and logo. Real people are shown only as the stylised avatars in `avatars/`.
- **Facts available:** links, numbers and claims, with sources. Note which are measured, which are simulated and which are estimates.

## 1. Research (only what the piece needs)

- **The rules first.** Read the official rules or rubric and any organiser Q&A. Put the notes in `projects/<name>/notes.md`. Use `knowledge/hackathon-judging.md` as the checklist of what judges score.
- **One sourced number per question a viewer will ask:** is it real, how big is it, why now, who else does this.
- **Record every source** in `projects/<name>/sources.md`: URL, date and a verbatim quote. Never write a number from memory.

## 2. Script or outline, then discuss. **STOP here for approval.**

Use the method in `knowledge/pitch-structure.md`: the answer first (Minto), SCQA, action titles, and pillars mapped to the rubric.

- **Video:** a scene list in a table: time | action title | narration | visual | motion | SFX. Run the storyline test: read only the titles, top to bottom, and check they make the case.
- **Deck:** a slide map in a table: slide | section label | action title (12 words or fewer) | evidence | rubric criterion.
- **Agree on:**
  - the hook and the tagline
  - the voices (play two or three audition takes before choosing)
  - the cast (which avatar says what)
  - what is real and what is simulated
- **Get an explicit OK.** Don't start production on a script nobody has signed off.

## 3. One sample, then approval

- **Video:** render the hook or the most important scene as a sample. Use `--scale 0.5` for speed.
- **Deck:** fill one slide, preferably the proof or performance slide.
- **Show the sample** and get feedback on look, pacing and voice. Only then build the whole thing.

## 4. Build

- **Video:** follow `video/README.md`. Use either the YAML route (`make.ps1 script\x.yaml`) or a hand-built composition in `projects/<name>/remotion/`.
- **Deck:** follow `presentation/README.md`. Put the template and `content.py` in `presentation/projects/<name>/`.
- **Keep project files under `projects/<name>/`.** The framework folders stay generic.

## 5. QA: look at the output, not the code

- **Video:**
  - Extract frames at every scene and at the key moments, and look at them.
  - Audio should be about -14 LUFS with a true peak of -1.5 dBTP or lower. The music should sit at least 12 dB under the voice.
  - Listen for mispronunciations.
  - Check that captions match the narration.
- **Deck:**
  - Run `make.ps1` and look at every PNG and the contact sheet.
  - `check` must pass.
  - Use the 3-second glance test on every slide.
- **Honesty:**
  - Every number carries its kind (measured, simulated or estimate) and a source.
  - No invented quotes, users or results.
  - No secrets visible in captures.

## 6. Deliver

- **Export the final file** (MP4, PDF or PPTX) to `projects/<name>/deliverables/`.
- **Upload where the brief says.** Check that public links are set to "anyone with the link".
- **Write down what was learned** in `knowledge/lessons.md`, so the next project starts smarter.

## House rules (from past projects)

- **Show one sample before building a full set.** This applies to images, voices, slides and scenes.
- **No real photos of the team.** Use only the stylised blocky avatars in `avatars/`.
- **No chips, pills or badges on slides.** Qualifiers such as "simulated" go into the title or the label.
- **Frame the product by what the user can do.** For example: "try any mix of fixes and rerun". Don't frame it by implementation details such as seeds.
- **Short beats long.** About 40 to 60 words per slide is plenty. Cut repeated facts and keep each one in its best place.
- **Never install into `~/.claude`.** Skills live in `skills/`. To install one, run the command in the README yourself.
