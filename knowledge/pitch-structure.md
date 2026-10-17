# How consultants structure a proposal, and what wins demo videos

Research notes on structuring a pitch. Compiled 2026-10-15. Most sources are practitioner guides that describe McKinsey, Bain and BCG practice, not primary MBB publications. Treat them as convention, not doctrine.

## 1. Minto Pyramid Principle: answer first

- Barbara Minto developed it at McKinsey. Her book *The Pyramid Principle* sets the canonical form.
- **Governing thought:** one sentence at the top of the pyramid that answers the reader's question. Everything below it supports it.
- **Structure:** governing thought → 3 to 4 key-line arguments → evidence under each.
  - Ideas at any level summarise the ideas grouped below them.
  - The ideas in a group must be the same kind of idea, in a logical order (time, structure or importance).
- **Answer first:** lead with the conclusion, then justify it. Do not build up to a reveal.
- Sources:
  - https://thinkinsights.net/strategy/pyramid-principle
  - https://productmindset.substack.com/p/mckinseys-pyramid-principle
  - https://deckary.com/blog/pyramid-principle-consulting
  - https://strategycase.com/the-pyramid-principle-case-interview/

## 2. SCQA / SCR: the introduction that sets up the answer

| Part | Meaning |
|---|---|
| **S**ituation | Uncontroversial context the audience already accepts |
| **C**omplication | What changed or what is wrong; the source of urgency |
| **Q**uestion | The question the complication raises; often left implicit |
| **A**nswer | The governing thought |

SCR (Situation–Complication–Resolution) is the short form proposals use. Sources: thinkinsights.net (above), https://slideworks.io/resources/how-to-write-consulting-proposals-like-mckinsey

## 3. MECE

Supporting arguments should be **Mutually Exclusive, Collectively Exhaustive**:
- No overlap between pillars.
- No gap: together they fully support the governing thought.

Test: could a judge's question fall between two pillars, or into both? If so, regroup. Sources: https://deckary.com/blog/pillar-consulting-presentations-guide, https://slidespeak.co/blog/mckinsey-style-presentation

## 4. Action titles and "so what"

- **Every slide/scene headline is a full-sentence takeaway**, not a topic label.
  - Bad: "Simulation results".
  - Good: "A free patrol re-route cuts simulated risk from 8.5 to 2.9."
- Aim for under ~12 words.
- **One message per slide.** If a title needs "and" or a semicolon to hold two claims, split the slide.
- **Storyline test:** read all titles in order, top to bottom. They should read like a paragraph that makes the whole case. `PITCH.md` §5 applies this test.
- **So what:** every number on screen carries its implication (e.g. "8.5 → 2.9 *for ₹0*").
- Sources:
  - https://deckary.com/blog/mckinsey-style-slides
  - https://chatslide.ai/guides/mckinsey-consulting-style-slides
  - https://piktochart.com/blog/mckinsey-style-presentation.md

## 5. Executive summary first, then the classic proposal arc

The arc is **context → problem/root cause → solution → evidence → impact/business case → implementation/roadmap → ask/next steps**, with an executive summary up front that restates the client's goal in their own language.

- **Root cause:** "5 Whys"-style analysis strengthens the problem section.
- **Business case:** quantify the cost of the problem, ideally with the client's own data.
- **Close:** next steps.

Sources:
- https://slideworks.io/resources/how-to-write-consulting-proposals-like-mckinsey
- https://blog.getaura.ai/consulting-proposal
- https://www.netsuite.com/portal/resource/articles/erp/consulting-proposals.shtml

For a pitch video, this maps to:

| Proposal element | Video beat |
|---|---|
| Exec summary / governing thought | Inside the first ~15 s (answer first) |
| Context + complication | The hook, plus the problem scene |
| Root cause | One scene naming why today's approach fails |
| Solution | The product walkthrough |
| Evidence | Before vs after, with one headline number |
| Business case | Cost and value: what it saves or earns, per rupee or dollar |
| Implementation / roadmap | How it is deployed, plus one roadmap line |
| Ask | The tagline or call to action |

## 6. What wins hackathon demo videos (2–3 sources)

- **Reskilll, "Pitch in 3 minutes and win":** https://blogs.reskilll.com/hackathon-demo-presentation-tips-pitch-3-minutes-win-2026/
  - Timing:
    - 0:00–0:20 hook: the problem, with one stat.
    - 0:20–0:40 what you built: what it does, not how.
    - 0:40–2:30 demo: the core action and the result that proves it.
    - 2:30–2:50 tech + impact.
    - 2:50–3:00 close and team.
  - Use realistic data. No code editor or terminal on screen. No half-built features. Don't run over time.
- **AngelHack, "10 tips to rock your hackathon demo":** https://angelhack.com/blog/10-tips-to-help-you-rock-your-next-hackathon-demo/
  - The demo should be about half the runtime.
  - Open with a frustration the audience has felt.
  - **Name your AI model and say how you checked its output.** "We used an LLM" can't be scored.
  - Narrate what judges *can't* see; don't describe what's already on screen.
  - **Build one memorable moment**, e.g. a side-by-side with the old way.
  - Be ready for "who is the user, who pays, what's real vs mocked, what's next".
- **Hackathon.com / TRON Devpost guide:**
  - https://tips.hackathon.com/article/creating-the-best-demo-video-for-a-hackathon-what-to-know
  - https://forum.trondao.org/t/tron-grand-hackathon-improving-your-devpost-judge-score/9393
  - The video is often the first, and sometimes the only, thing a judge sees.
  - Map each judging criterion to something visible in the video.
  - Lead with the product, not a long intro.
- **HackerEarth:** https://www.hackerearth.com/blog/10-tips-win-hackathon
  - Read the rubric. It says what will be rewarded.

## 7. Rules to apply to a pitch video

1. Hook within 8 s, with a frustration the audience has felt. Governing thought before 0:20.
2. Every scene has an on-screen action title (a full sentence, 12 words or fewer). The titles pass the storyline test.
3. Three MECE pillars, one per major judging block (for example technical depth, problem and impact, innovation). UX is shown through the demo, not told.
4. Demo is about 55–60% of the runtime, with one memorable moment (a before/after on the same data).
5. Name every model and what it does, and say how its output is checked.
6. Every number gets a so-what and its kind (measured, simulated or estimate). No real-world claims the data can't back.
7. Close with the ask: the tagline or call to action.
