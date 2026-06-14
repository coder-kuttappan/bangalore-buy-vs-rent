# Buy vs Rent — Bangalore

The actual math on whether to buy or rent a home in Bangalore, by area. No broker, no agenda.

Most buy-vs-rent calculators hardcode a single appreciation number and ignore tax, transaction costs, and the risk of a bad year to sell. This one tries to be honest about the messy parts — and tells you exactly what it still leaves out.

> **Beta.** Every price, rent and appreciation figure is a researched estimate, not a quote. It shows you the *shape* of the trade-off — not a verdict to act on. Get real numbers for your own flat before deciding.

## What it does

- **20 Bangalore areas** with researched June 2026 price, rent and appreciation defaults — each with a confidence rating and a link to its source.
- **Month-by-month net-worth simulation:** buying (with leverage) vs renting and investing the difference — not a naive EMI-vs-rent comparison.
- **Invest-discipline slider:** models the truth that the renter only wins if they actually invest the gap (an EMI is forced savings; most people don't invest the difference).
- **True break-even** (window-independent) with the calendar year it lands in.
- **Tipping-point insights:** the appreciation rate above which buying wins, and the investment return above which renting wins.
- **Costs & tax modelled:** stamp duty, registration, GST on under-construction, interiors, and the Section 24b interest deduction (old vs new regime).
- **"What this leaves out":** the calculator names its own remaining blind spots (LTCG, illiquidity, floating rates, volatility) on purpose.

## Methodology, in short

Net-worth comparison with bidirectional difference-investing: whoever spends less each month invests the gap; net worth is compared at any horizon. Prices come from listing aggregators (which run above registry values); appreciation is estimated from ~10yr listing trends, trimmed toward the realistic city-wide average and weighted by supply. Rents are matched to the same segment the price describes. Full provenance in [`data-research-2026-06.md`](./data-research-2026-06.md).

All India-specific policy (costs, tax, norms) lives in [`src/markets/india.js`](./src/markets/india.js) — the engine reads from it, so a future market is a config swap, not a rewrite.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```

## Stack

React + Vite + Tailwind v4 + Recharts. Fully client-side — no backend, no tracking, no data leaves your browser.

## Disclaimer

This is arithmetic, not financial advice. Do not make a purchase decision solely based on this tool.
