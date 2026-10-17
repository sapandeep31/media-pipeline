# What judges reward (hackathons, accelerators, demo days)

Sources:
- An official organiser "Ask the expert" Q&A from a 2026 cloud-AI hackathon, given by the sponsor's developer advocate (transcribed).
- Hackathon guides: AngelHack, Reskilll, HackerEarth, YC (Kevin Hale), Duarte, Alley (assertion-evidence).

These are general lessons. **The current event's rules always win.** Read them first.

## Disqualifiers (check before anything else)

- **Required parts:** pitch deck, demo video, **deployed prototype link** and an accessible repo. Some events also require a brief description of the stack used.
- **The live link must work for the whole evaluation window.** Judges may click it on any day after the deadline.
  - Serverless that scales to zero is fine.
  - Raise the minimum instances on judging days if cold starts hurt.
  - Don't push risky changes after the deadline.
- **Hosting platform:** if the event mandates one (for example Cloud Run or Firebase), the URL the judges open must be on that platform.
- **Secrets:** a key or credential visible anywhere (deck, repo, video) disqualifies the entry.
- **Eligibility:** team-member rules, such as professionals only.

## What earns points

- **Technical depth you actually solved, with real numbers.** For example, how you kept latency under a few seconds. "Don't make stuff up, we get to know."
- **Stated limitations,** such as "you can't ask more than five questions" or "first load is slow." These help you; they don't hurt.
- **Test instructions for judges:** sample inputs, a 3-click path, and test credentials if a sign-in can't be avoided. Better still, no sign-in at all.
- **Evidence for grounding and guardrails:** name the data sources, say how AI output is checked, and say what is synthetic or simulated. Clearly labelled synthetic data is acceptable.
- **Name every model and what it does.** "We used an LLM" can't be scored.
- **One memorable moment,** such as a side-by-side with the old way.

## Why strong prototypes still lose

1. **Feasibility doubts.** "Great prototype, won't work in the real world." Answer this with cost, rollout and limits.
2. **Too basic.** No extra mile beyond the obvious.
3. **No clarity.** Low-volume audio, a weak deck, a demo that doesn't match the app. "If you built greatness, show that greatness in the presentation." Polish is not optional.

## Video (about 3 minutes, unless the rules say otherwise)

- Hook within 8 s, with a frustration the audience has felt. State the governing thought by 0:20.
- The demo takes about 50–70% of the runtime. Narrate what the viewer can't see; don't describe the screen.
- AI-generated narration and visuals are allowed, but the video must match the real app.
- Clear, loud audio: -14 LUFS, with the voice well above the music.

## Deck (usually a PDF, often on the organiser's template)

- Make each rubric criterion easy to find. The template's section labels usually map to them.
- Write action titles: full-sentence claims of 12 words or fewer. They pass the storyline test.
- Keep it to about 40–60 words per slide, with each fact in one place.
- Include feasibility and scalability slides when the brief asks for them, plus a "Try it" box with sample steps and the known limits.
