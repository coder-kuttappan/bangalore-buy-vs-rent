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

## v2 pass (June 2026) — per-area appreciation + segment-matched rents

### Method
- **Appreciation:** pulled squareyards/99acres "% change over last 10yr" listing figures → CAGR, then haircut ~3pp for the two known distortions (listing > registry, luxury-launch mix). Citywide sanity anchor: BLR ~flat 2015–19 (~2–3%/yr), boom 2020–25 (~13%/yr, ₹4,700→₹8,720/sqft) → ~7.5–8% real 10yr blend. Raw listing CAGRs averaged ~11%, confirming the ~3pp overstatement. Per-area haircut weighted by supply pressure + how peaked the market is.
- **Rents (rentNew):** gross-yield model on the v1 new-build price mids (2BHK 1150sqft, 3BHK 1650sqft). New gated stock yields ~3.2–3.5% in premium cores up to ~4.5% in affordable belts. Cross-checked vs confirmed listings (Sobha Windsor Whitefield 3BHK ₹70k; HSR new gated 2BHK ₹41–43k+maint).

### Raw listing CAGR → final (haircut)
Whitefield 12.3→8 · HSR 12.4→9 · Koramangala 7.1→7 · Sarjapur 11.2→9 · Indiranagar 10.3→7 · Hebbal 13.9→8 (most distorted, low conf) · Yelahanka 9.5→8 · E-City 6.9→6.5

### Caveats
- Appreciation is the weaker deliverable — no public registry-based per-area capital series exists; every number is a haircut listing index. Trust Koramangala / Indiranagar / E-City most (listing CAGRs already reflect maturity), Hebbal least.
- ~2/3 of the 10yr gain everywhere is front-loaded into 2021–25. These CAGRs implicitly assume the post-COVID surge sustains — optimistic for peaked cores (Koramangala, Indiranagar), more plausible for catalyst corridors (Sarjapur metro, Yelahanka airport).
- rentNew is yield-derived, not transaction-sampled — internally consistent with the price column by construction (the fix), confident where new gated supply is deep (Whitefield, Sarjapur, HSR), softest in Indiranagar (genuine new gated stock barely exists there).

### v2 sources
- squareyards.com locality overviews (HSR, Sarjapur) — 10yr % change
- 99acres price-trends pages (Hebbal, Yelahanka, Electronic City)
- mahindralifespaces.com — Whitefield decade trends; casagrand.co.in — citywide price trends
- 99acres / sobha.com — Whitefield & HSR new-gated rental listings

## v2.1 pass (June 2026) — 12 more areas (8 → 20 total)

Areas added: Horamavu, Thanisandra, Kalyan Nagar, Hennur, Banaswadi, Kadugodi, Varthur, Bannerghatta Road, JP Nagar, Devanahalli, Tumkur Road, KR Puram. Same method as v2 (listing 10yr CAGR haircut ~3pp toward ~8% citywide blend; rentNew yield-derived off price mid). Citywide rent anchor: ₹36k 2BHK / ₹62k 3BHK (bengaluru.rent).

### Raw listing CAGR → final appreciation (haircut)
Horamavu 6.0→6.5 · Thanisandra 9.0→8 · Kalyan Nagar 5.8→7 · Hennur 7.8→8 · Banaswadi 7.0→7 · Kadugodi 9.7→8.5 · Varthur 13.1→8.5 (most distorted) · Bannerghatta 8.4→8.5 · JP Nagar 8.1→7.5 · Devanahalli 14.6(5yr)→7 · Tumkur Rd 15.7→8 · KR Puram 8.4→8

### Weakest rows (low confidence — verify before trusting)
- **Tumkur Road** — 99acres ₹17,900 avg is inner-Yeshwanthpur luxury, unrepresentative; mid set to ₹9,000 (broader corridor trades ₹7–11k). Low price confidence.
- **Devanahalli** — plotted-land/under-construction airport play, thin apartment rental market (~3% yield); both appreciation and rentNew are softest in the set.
- **Varthur** — 243% 10yr listing gain heavily mix-distorted; low appreciation confidence.

### Cross-cutting caveats
- 1yr listing spikes (Bannerghatta +47%, JP Nagar +32%, KR Puram +31%, Kadugodi +22%) are luxury-launch composition effects, not real YoY — leaned on 10yr CAGR instead (same as Hebbal in v2).
- Listing-vs-registry gap widest in the east: Kadugodi (₹9,300 vs txn ₹5,741), Bannerghatta (₹9,650 vs ₹6,348) — ~40%, larger than the 10–30% first-pass assumption.
- rentNew most reliable where new gated supply is deep (Thanisandra, Hennur, Kadugodi, KR Puram); softest in low-new-supply pockets (Kalyan Nagar, Banaswadi, JP Nagar).

### v2.1 sources
- 99acres locality rate pages (all 12, June 2026 snapshots)
- NoBroker / SquareYards / OLX rent listings; bengaluru.rent median anchor
