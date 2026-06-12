# Bangalore Pricing Research — June 2026

Source data behind `src/data/areas.js`. Researched 2026-06-12 via listing
aggregators, crowdsourced rent data, and builder pages.

## Buy & Rent Table

| Area | Buy ₹/sqft range | Mid | 2BHK rent | Mid | 3BHK rent | Mid | Confidence |
|---|---|---|---|---|---|---|---|
| Whitefield | 9,500–16,000 | 12,500 | 28k–45k | 35k | 40k–70k | 55k | High |
| HSR Layout | 9,000–16,000 | 12,750 | 30k–48k | 38k | 45k–80k | 60k | Medium |
| Koramangala | 14,000–22,000 | 17,000 | 30k–55k | 40k | 50k–100k | 70k | Med-High |
| Sarjapur Road | 9,500–15,000 | 12,000 | 30k–50k | 40k | 45k–75k | 58k | High |
| Indiranagar | 16,000–27,000 | 19,500 | 35k–55k | 45k | 55k–100k | 75k | Medium |
| Hebbal | 10,000–19,000 | 14,000 | 30k–55k | 40k | 45k–85k | 60k | Medium |
| Yelahanka | 7,500–13,000 | 9,500 | 20k–35k | 27k | 38k–48k | 42k | Medium |
| Electronic City | 5,500–11,500 | 7,500 | 18k–33k | 25k | 25k–45k | 35k | High |

## Defaults rationale

- **Loan rate 8.0%**: SBI starts ~7.25–7.5% (repo-linked, post-2025/26 RBI
  cuts), HDFC 7.75–8.15%. 8% for salaried borrower with 750+ CIBIL;
  sensitivity range 7.5–8.5%.
- **Appreciation 7%/yr**: recent boom years (13%+ citywide) are mix-distorted
  by luxury launches. 2019–2023 official series is ~6.7% CAGR; 10-year locality
  CAGRs run 7–14%. 7% is the defensible long-run default; 5–9% reasonable range.
- **Stamp duty 5.6%**: Karnataka 5% above ₹45L + ~0.6% cess/surcharge (urban).
  No gender concession.
- **Registration 2%**: doubled from 1% effective Aug 31, 2025 — older guides
  still say 1%.
- **GST**: 5% on under-construction (no ITC), 1% affordable, zero on
  ready-to-move/resale. Not in calculator defaults (assumes resale/RTM).

## Data quality caveats

1. **Listing vs transaction gap**: aggregator listing prices run 10–30% above
   registered transaction values. Starkest in HSR Layout: ₹12,750 listed vs
   ~₹7,450 registry average. Mids lean toward deal prices but carry upward bias.
2. **Aggregator YoY figures (13–37%) are mix-distortion**, not real
   appreciation — driven by luxury launch composition (e.g. Hebbal "+36.9%").
3. **2BHK rent mids are the strongest numbers** — anchored on bengaluru.rent
   (crowdsourced from 3,800+ actual renters). 3BHK mids are partly derived from
   2BHK ratios — weakest numbers in the table.

## Sources

- 99acres locality rate pages (all 8 areas): 99acres.com/property-rates-and-price-trends-in-{area}-prffid
- bengaluru.rent — crowdsourced rent medians
- hexahome.in — Whitefield, HSR, Yelahanka rate trends
- propvison.com — Sarjapur Road 2026 prices
- homeloans.hdfc.bank.in / urbanmoney.com / cleartax.in — loan rates
- igr.karnataka.gov.in + cleartax.in — stamp duty & registration
- propsoch.com / ksandk.com — registration fee doubling (Aug 2025)
- nobroker.in / homebazaar.com / sobha.com — appreciation history
