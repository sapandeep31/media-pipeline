# Pitch mode

## What the data says (Colosseum Copilot, pulled 2026-09-25)

Sample: 363 projects returned for 15 category queries across Renaissance, Radar, Breakout and Cypherpunk: 180 prize winners, 183 non-winners. Full dataset: 293 winners out of 5,428 projects (5.4%).

| Surface feature | Winners | Non-winners |
|---|---|---|
| Median one-liner length | 13 words | 13 words |
| Pitch video or deck link present | 100% | 100% |
| Separate technical demo link | 53% | 65% |
| Hype words in one-liner (revolutionize, seamless, unlock...) | 4% | 4% |
| Twitter/X account linked | 96% | 80% |

Read this honestly: format does not win. Every project submits a deck, and winners do not write shorter one-liners. What separates them is what the pitch says and whether the team is visibly building in public (the only real gap in the table is the X account). The deck's job is to make a clear case fast, not to look busy.

## What Colosseum says judges want

From "How to Win a Colosseum Hackathon" and "Perfecting Your Hackathon Submission" (blog.colosseum.com):
- Under 3 minutes. Running over is listed as a top mistake.
- Six things: team background, the product, why you started, the market it opens, how you get first users (or traction so far), how it works (demo).
- Judges look for teams who intend to go full-time and a business that could be viable.
- "A clear and well-structured narrative is more valuable than professional video editing." A voiceover over slides is fine.
- Separate 2 to 3 minute technical demo: the how, stack decisions, and why Solana and the on-chain logic. Do not repeat the pitch in it.
- Named mistakes: flashy visuals with little substance, buzzwords, vague or overly technical descriptions, no team info, not explaining the core idea and its impact, links judges cannot open.
- Share links set to public; test them in a private window.

## The 10-slide spine (3-minute video)

| # | Eyebrow | The headline does this | Seconds |
|---|---|---|---|
| 1 | none | Name + one-liner: who it is for and what changes for them | 10 |
| 2 | Problem | A specific person, a specific pain, a number | 20 |
| 3 | Why now | What changed (tech, cost, regulation, behavior) | 15 |
| 4 | Product | The aha moment in one screen | 20 |
| 5 | Demo | Live flow, 3 steps max, a real devnet tx if on-chain | 40 |
| 6 | How it works | Architecture in one diagram; what is on-chain and why | 15 |
| 7 | Traction | Users, waitlist, LOIs, testers' words: anything real | 15 |
| 8 | Market | Bottom-up: number of buyers x what they pay | 15 |
| 9 | Go-to-market | The first 100 users: where, how, by when | 15 |
| 10 | Team | Why these people; one line of proof each | 15 |
| 11 | Ask | What you want and what you will do with it | 10 |

Merge 3 into 2, or 8 into 9, if time runs short. Never drop Demo or Team.

## One-liner formula

`[Product] lets [specific user] [do a thing] [without the old cost or pain].`

Winners that follow it:
- "Transaction debugger for Solana providing line-by-line traces, source mapping, and local variable inspection." (Seer, 1st place Infrastructure)
- "Mobile sentiment prediction app where users stake on crowd opinions rather than event outcomes." (Trepa, 1st place Consumer)

Concrete nouns carry both. No adjective is doing the work.

## Market slide

Top-down TAM ("$4T payments market") gets ignored. Go bottom-up and show the arithmetic on the slide: "38,000 monthly active Solana devs x $20 a month = $9.1M a year."

## Script

Voiceover runs at about 150 words per minute, so 3 minutes is about 450 words. Read it aloud once and cut every sentence you stumble on.

## Outside the deck: presence

The one gap the data showed was not in any slide: 96% of winners linked an X account, against 80% of the rest. This is a correlation, not a proven cause, but it costs little. Before submitting, check:

- The project has a public X account, linked in the submission.
- At least one progress post per week of the hackathon, each with a screenshot or clip of something that works.
- The repo is public and the README opens with the one-liner from slide 1.
- The demo video is unlisted or public on YouTube, not a private drive link.
- The deck, the README, and the submission form use the same one-liner, word for word.
