# Research: the numbers a judge or investor will ask for

A pitch without outside data asks the audience to trust you. A pitch with data they can check asks them to trust the data. Do the research before writing the spine. The spine is built on whatever the data supports, not the other way round.

## The rule

Every number from outside the project goes in a sources ledger before it goes on a slide:

```
research/<deck>-sources.md
| id | number | what it measures | publisher | title | date | url | quote | status |
```

- **quote** is copied word for word from the page and contains the number. Under 30 words.
- **status** is `VERIFIED` when you fetched the page and saw the number yourself. It is `SECONDARY` when the number comes from an article quoting a report you could not open; name both.
- Never recall a number from memory. Search, fetch, then copy. If fetching fails, the number does not go in.
- On the slide, the source line carries the ledger id: `Source: Global Risk Institute, Quantum Threat Timeline 2024 [S4]`.

Then run:

```bash
node scripts/check-sources.mjs deck.html research/<deck>-sources.md
```

It fails when a slide cites an id that is not in the ledger, when a ledger URL does not load, or when the quoted text is no longer on the page. Hand the ledger over with the deck; a judge can run the same command.

Checker output: `OK` is a verified quote, `OK-2ND` a quote found on a SECONDARY source (say so aloud if asked), `PDF` a PDF it could not read, `BLOCKED` a page that refused the fetch. A deck with no `[id]` citations fails.

- Numbers said only in speaker notes still need an `[id]` in the notes; the checker reads slides, so check those by hand.
- An inline `[id]` in body text counts, but put a `Source:` line on any slide that shows a number.
- If a page renders its text with scripts (PubMed, some dashboards) and the fetch comes back empty, cite a page that carries the same number in plain HTML, and name the original in the ledger.

- Copy quotes from the raw page (`curl -sL url`), not from a tool that summarises pages; a summary is not a verbatim quote.
- The team's own numbers (targets, prices, plans) get `Source: team plan, not outside data` so nobody mistakes them for research.
- Placeholders like `[source needed]` or `[name]` are honest, and the linter takes points for each. A deck with them is not finished.

## What to look for, by question

Judges and investors ask the same five questions. Find at least one sourced number for each.

| Their question | What answers it | Where it usually lives |
|---|---|---|
| Is the problem real? | Incidents, losses, share of users affected | Government agencies, incident trackers (Chainalysis, Immunefi), court or regulator filings |
| How many people have it? | Population, adoption, survey share with sample size | National statistics offices, World Bank, Pew, Reuters Institute Digital News Report, GSMA, Statista (secondary) |
| Why now? | A deadline, a standard, a price drop, a new capability | NIST, NSA, EU and national regulators, standards bodies, vendor release notes |
| How big can it get? | Market size with the firm's name and year | Gartner, IDC, McKinsey, BCG, MarketsandMarkets; say which one, and treat forecasts as forecasts |
| Who else is trying? | Competitors, funding rounds, open-source activity | Crunchbase (secondary), GitHub, Colosseum Copilot, DefiLlama, Electric Capital developer report |

For crypto specifically: DefiLlama (TVL, fees), Dune dashboards (name the dashboard and author), Solana Foundation and Anza posts, Electric Capital developer report, Messari (often paywalled, mark SECONDARY), Chainalysis crypto crime report.

For Indonesia: BPS (Badan Pusat Statistik), OJK, Bank Indonesia, APJII internet survey, Kominfo/Komdigi.

## Surveys: what to write down

A survey number means nothing without four things. Put all four in the ledger, and at least the publisher and year on the slide:

1. who ran it and who paid for it
2. sample size and who was asked (CISOs, adults in 12 countries, developers)
3. when it was fielded
4. the exact question, if the report gives it

"68% of organisations" from a vendor survey of 400 of its own customers is weaker than it sounds. Say so in the notes if a judge might ask.

## Data that cuts against you

Look for it on purpose and write it in the ledger. Long timelines, small markets, a competitor that already shipped. A judge who finds it first will assume you hid it. A deck that names it and answers it reads as the stronger one.

## One number per slide

Research produces more numbers than slides. Pick the one that proves the headline, put it large with its source, and move the rest to the notes or the appendix. Three statistics on one slide read as a list, and nobody remembers a list.
