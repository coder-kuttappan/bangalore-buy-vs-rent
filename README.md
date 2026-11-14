# Buy vs Rent — Bangalore

The actual math on whether to buy or rent a home in Bangalore, by area. No broker, no agenda.

Most buy-vs-rent calculators hardcode a single appreciation number and ignore tax, transaction costs, and the risk of a bad year to sell. This one tries to be honest about the messy parts — and tells you exactly what it still leaves out.

> **Beta.** Every price, rent and appreciation figure is a researched estimate, not a quote. It shows you the *shape* of the trade-off — not a verdict to act on. Get real numbers for your own flat before deciding.

## What it does

- **20 Bangalore areas** with researched June 2026 price, rent and appreciation defaults — each with a confidence rating and an explanation of where the number comes from.
- **Month-by-month net-worth simulation:** buying (with leverage) vs renting and investing the difference — not a naive EMI-vs-rent comparison.
- **Invest-discipline slider:** models the truth that the renter only wins if they actually invest the gap (an EMI is forced savings; most people don't invest the difference).
- **True break-even** (window-independent) with the calendar year it lands in.
- **Tipping-point insights:** the appreciation rate above which buying wins, and the investment return above which renting wins.
- **Costs modelled:** stamp duty, registration, GST on under-construction, interiors, and maintenance and property tax that rise each year.
- **Tax applied to both sides:** under the old regime the buyer gets the Section 24b interest deduction and the renter gets the HRA exemption; under the new regime (the default) neither does. FD interest is taxed at slab for whoever is saving.
- **Shareable links:** the address bar always holds a link to exactly the scenario on screen. It lives in the URL fragment, which browsers never send to a server.
- **Exit taxes:** net worth is compared after cashing out — the home-sale gain and equity-fund gains are each taxed, with an option for reinvesting in another home.
- **FD and equity side by side:** the verdict card shows the answer for both, because where the spare money goes often decides it.
- **All areas at a glance:** a compare table ranks every area by how long buying takes to pull ahead, on your own settings.
- **Price tiers:** lower end, typical and premium within each area, with rent moving to match.
- **"What this leaves out":** the calculator names its own remaining blind spots (illiquidity, floating rates, volatility) on purpose.

## Methodology, in short

Net-worth comparison with bidirectional difference-investing: whoever spends less each month invests the gap; net worth is compared at any horizon. Prices come from listing aggregators (which run above registry values). Rents are matched to the same segment the price describes.

**Appreciation is shown as a range.** The low end is official: the [RBI House Price Index](https://data.rbi.org.in/DBIE/#/dbie/home), built from registered sale values, puts Bangalore at 6.8% a year over the ten years to Q1 2026-27. The high end comes from ~10 years of listing-site trends, trimmed for launch-mix distortion, averaging 7.8% across the 20 areas. Registered values tend to understate real prices and asking prices overstate them, so the truth is likely between; the calculator starts at the official end and tells you when the verdict flips inside the range. RBI publishes nothing below city level, so the spread between areas still rests on listings. The index data and the calculation live in [`src/data/hpi.js`](./src/data/hpi.js). Full provenance in [`data-research-2026-06.md`](./data-research-2026-06.md).

All India-specific policy (costs, tax, norms) lives in [`src/markets/india.js`](./src/markets/india.js) — the engine reads from it, so a future market is a config swap, not a rewrite.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm test         # engine and share-link tests (Node's built-in runner, no extra installs)
```

Tests run before every deploy; a failing test stops the site from updating.

## Stack

React + Vite + Tailwind v4 + Recharts. The calculator runs entirely in your browser, with no tracking.

## Shared quotes and the open dataset

Someone with a real quote can choose to add it to an open dataset. Only this is sent, and only when they press the button: area, flat size, price and/or rent, price tier, an optional project name, and the month. Salary, tax, down payment and loan details are never sent, and IP addresses are not stored.

- An area's median appears on the site once it has five quotes.
- Unusual quotes are held for a person to check before they are published.
- The dataset is downloadable as CSV from the API (`/quotes.csv`); a project is named only once three people have quoted it.
- The API is a small Cloudflare Worker with a D1 database, in [`worker/`](./worker).
- Project names for the picker come from OpenStreetMap (© OpenStreetMap contributors, ODbL), built by [`scripts/fetch-projects.mjs`](./scripts/fetch-projects.mjs).

## Licence

[MIT](./LICENSE). Use it, fork it, adapt it for your own city.

## Disclaimer

This is arithmetic, not financial advice. Do not make a purchase decision solely based on this tool.
