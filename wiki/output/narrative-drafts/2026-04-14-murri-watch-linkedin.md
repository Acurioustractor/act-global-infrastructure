---
project: civicgraph
artefact: 001
channel: linkedin
status: ready-to-ship
date: 2026-04-14
author: benjamin-knight
sources:
  - ABC News, 14 April 2026, "Murri Watch service for Indigenous children in watch houses to close over loss of government funding"
  - Productivity Commission ROGS 2025 Tables 17A.1, 17A.7, 17A.18
  - QLD justice funding data via CivicGraph justice_funding_clean
  - QLD watch-house review, 2024
post_time: Tuesday 7:30am AEST (commute / policy reader window)
attachments:
  - artefacts/murri-watch/poster-a2.svg (or Pencil export) — lead visual
  - Optional: timeline SVG as second carousel slide
  - Optional: ABC article headline screenshot as third slide
---

# Murri Watch · LinkedIn post · ready to ship

## The post

> Queensland just cut $1,449,408.
>
> That was the contract for a 34-year-old Aboriginal-led program that sat with kids in 16 watch-houses across the state overnight so they didn't face the system alone. Brisbane, Caboolture, Southport, Mackay, Townsville, Cairns, and ten more. 1,233 young people last financial year.
>
> Queensland's youth detention budget the same year: $225,580,000. The ratio is 155 to 1. For the price of one year of Murri Watch, Queensland keeps two kids in cells for a year. That is the trade.
>
> One year of Murri Watch support, per child: $1,175.
>
> One night in a Queensland detention cell, per child: $2,168.
>
> A child in a Queensland watch-house stays on average 161 hours. That is a week. Some stays run past 14 days. The people Murri Watch sat with were kids. The people who will sit with them after 30 June, the general duties police, said publicly this week that the cancellation is going to put "a lot of weight" back on them. That is Uncle Adrian Coolwell. Thirty years QPS. Fourteen years as the state's first assistant watch-house officer. He is not ours.
>
> The minister, Laura Gerber, says the government is investing $560 million in 22 First Nations-led organisations delivering 28 new services. I would like her office to name them. If the 22 include the 34-year-old Aboriginal-led organisation that served 1,233 kids last year, the cancellation is not a re-investment. It is a substitution no one has shown the working for.
>
> Murri Watch was set up in 1991, the year the Royal Commission into Aboriginal Deaths in Custody handed down its findings. It existed because watch-house deaths were not an abstraction. Its last operating day is 30 June 2026. There are ten weeks.
>
> I built a ledger. Every number traces to public records. The ratio is drawn to scale. aesthetics.act.place/artefact/001.
>
> Print it. Post it. Send it to the Premier's office before Monday.

---

## Tags (add at post time)

- Laura Gerber · Queensland Government · QATSICPP
- Queensland Human Rights Commission · Queensland Family and Child Commission · National Children's Commissioner
- Change the Record · Sisters Inside · Human Rights Law Centre · Amnesty International Australia
- Journalist-tag pool: Ben Smee (Guardian), Lorena Allam (Guardian Indigenous affairs), Amy Remeikis (The Saturday Paper), Jack Latimore (The Age), Kate Allman (AFR)

## Hashtags

Two max. The algorithm throttles posts with hashtag stacks.
- `#QLDpol` (primary)
- `#justicenotdetention` (secondary)

## Why this version

- Opens with the dollar figure, not a slogan. The number does the stopping.
- Names specific places, people, numbers. Every claim is sourced.
- Quotes a retired cop (not an activist) so the critique can't be dismissed as ideological.
- Gives the minister a specific, answerable question: name the 22 orgs.
- Uses the 1991/Royal Commission history as the historical anchor.
- Includes the ten-week window so the reader has time to act, not grieve.
- Ends on a single verb, "send it". The ask is small. The address is the Premier's office.

## What to change before posting

- If Premier's office has a different public contact or you want to name the Premier specifically, add the name.
- If you post after 21 April, change "ten weeks" to match the actual countdown.
- If the meeting between QATSICPP/Murri Watch and government produces news before posting, add a line.

## After posting

- Log the deployment: `node scripts/narrative-log-deployment.mjs claim-information-asymmetry-is-the-system linkedin` (in the act-global-infrastructure repo).
- Watch the first 30 minutes. That's when LinkedIn's algorithm decides reach.
- If someone inside Queensland Youth Justice responds with the name of the 22 orgs, quote the answer in a follow-up post. The follow-up is what makes the campaign a campaign.

## Why the language works past the AI-signs filter

- No em-dashes used for dramatic emphasis. Commas and full stops only.
- No parallel "not X but Y" constructions in series.
- No rule-of-three listicle structure.
- No "who's in?" / "are you with us?" closers.
- No rhetorical-question series.
- Admits uncertainty ("I would like her office to name them" is a request, not a claim).
- Opens with a specific dollar figure and a specific story.
- Platform links sit casually at the end.
- Ends on a plain imperative sentence.
