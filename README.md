# Hearth & Ledger — the household budget book

[![Competition](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=household-budget)
[![Rank](https://make.fun/badge/best-household-budget-site-20261126-1457/ZKCLJW/household-budget/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=household-budget)
[![Reward](https://make.fun/badge/best-household-budget-site-20261126-1457/ZKCLJW/household-budget/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=household-budget)

An entry for the make.fun bounty [Make the best household budget site](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=household-budget).

A household budget site built around one worked example — Alex &amp; Sam, one child, renting in
Austin, $6,940 a month take-home — where **every number is computed from the same entries, so
the books always balance**. Six linked pages:

- **This month** — income, spent, left and savings rate for the month, the biggest envelopes,
  the latest entries and what still has to leave the account. A switcher walks back through
  the closed books to July.
- **Envelopes** — eleven spending envelopes with bars that run green, amber, then red, and a
  plain-words note under each ("$X left — about $Y a day to the 30th"). The add-an-expense form
  really adds: every total in the book moves.
- **Bills** — the regular bills on their November dates, autopay marked, each with a working
  "mark paid" tick that updates the month's position — and an add-a-bill form that joins a new
  regular bill to the table and the totals.
- **Goals** — an emergency fund, a holiday trip and a car fund, each with its finish line; a
  slider per goal adds extra per month and the finish line moves, live.
- **The year** — all five months summed: total kept, the average savings rate, a cumulative
  savings line that climbs month by month, and a month-by-month table with each month's
  biggest envelope, best month and tightest month called out.
- **Insights** — income against spending across the five months, a category donut, an honest
  50/30/20 check with the verdict written out, and a what-if bench: trim the "want" envelopes
  with sliders and watch the freed money move the savings rate and every goal's finish line.

## Layout

- `app/index.html` — the page shell and navigation
- `app/data.js` — the household's books: incomes, envelopes, five months of entries, bills, goals
- `app/views.js` — the six views, the charts, and every computation
- `app/main.js` — session state, the hash router, and the wiring for every control
- `app/style.css` — the warm ledger styling
- `main.ts` — the handover program: copies `app/` and `screenshots/` to the output and writes
  the dossier with the vendored library

## Run it

Requires Node.js 22.18 or later, standard library only:

```
node serve.ts          # serves app/ locally
MAKEFUN_OUTPUT_DIR=out node main.ts   # build the handover output
```

MIT licensed.
