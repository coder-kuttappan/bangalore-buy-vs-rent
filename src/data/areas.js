// Area pricing data — researched June 2026 from listing aggregators (99acres,
// HexaHome), crowdsourced rent data (bengaluru.rent, 3800+ renters), and
// builder pages. Full provenance in data-research-2026-06.md.
//
// Caveat: listing prices run 10-30% above registered transaction values
// (starkest in HSR Layout). Mids lean toward realistic deal prices but still
// carry upward listing bias. 3BHK rent mids are the weakest numbers (partly
// derived from 2BHK ratios).

import { MARKET } from '../markets/india.js'

export const DATA_ASOF = 'June 2026'

// rentNew = rent for a NEW gated-community flat — the same segment the price
// mid describes. The all-stock median rents (rent2bhk/rent3bhk.mid) describe
// older stock and were biasing the tool toward renting; rentNew is the
// segment-matched default the UI uses (yield-derived off the price mid,
// calibrated to confirmed new-gated listings). appreciationPct is the per-area
// long-run (~10yr) capital-value CAGR — listing-platform 10yr indices haircut
// ~3pp toward the ~8% citywide real blend, weighted by supply pressure and how
// peaked each market is. appConfidence rates that CAGR specifically.
// Two structural caveats: (1) ~2/3 of the 10yr gain everywhere happened
// 2021–2025, so these CAGRs assume the post-COVID surge roughly sustains;
// (2) appreciation is the weaker deliverable — no clean registry series exists.
export const AREAS = [
  { name: 'Whitefield',      pricePerSqft: { low: 9500,  mid: 12500, high: 16000 }, rent2bhk: { low: 28000, mid: 35000 }, rent3bhk: { low: 40000, mid: 55000 }, rentNew: { '2 BHK': 48000, '3 BHK': 70000 }, appreciationPct: 8,   appConfidence: 'med-high', confidence: 'high', notes: 'Skews new-launch; resale 9.5–11k, new launches 13–17k. Mature, high new-supply' },
  { name: 'HSR Layout',      pricePerSqft: { low: 9000,  mid: 12750, high: 16000 }, rent2bhk: { low: 30000, mid: 38000 }, rent3bhk: { low: 45000, mid: 60000 }, rentNew: { '2 BHK': 50000, '3 BHK': 72000 }, appreciationPct: 9,   appConfidence: 'med',      confidence: 'med',  notes: 'Land-constrained, low new-apt supply = genuinely strong; listings ~70% above registry' },
  { name: 'Koramangala',     pricePerSqft: { low: 14000, mid: 17000, high: 22000 }, rent2bhk: { low: 30000, mid: 40000 }, rent3bhk: { low: 50000, mid: 70000 }, rentNew: { '2 BHK': 58000, '3 BHK': 85000 }, appreciationPct: 7,   appConfidence: 'med-high', confidence: 'med',  notes: 'Premium/peaked; few new gated projects, rents ~3.4% yield on 17k/sqft' },
  { name: 'Sarjapur Road',   pricePerSqft: { low: 9500,  mid: 12000, high: 15000 }, rent2bhk: { low: 30000, mid: 40000 }, rent3bhk: { low: 45000, mid: 58000 }, rentNew: { '2 BHK': 46000, '3 BHK': 66000 }, appreciationPct: 9,   appConfidence: 'med',      confidence: 'high', notes: 'Growth corridor + approved metro (2033); deep new gated stock (Prestige, Sobha)' },
  { name: 'Indiranagar',     pricePerSqft: { low: 16000, mid: 19500, high: 27000 }, rent2bhk: { low: 35000, mid: 45000 }, rent3bhk: { low: 55000, mid: 75000 }, rentNew: { '2 BHK': 60000, '3 BHK': 92000 }, appreciationPct: 7,   appConfidence: 'med',      confidence: 'med',  notes: 'Premium/peaked (recent YoY ~4%); few true new gated communities, segment match soft' },
  { name: 'Hebbal',          pricePerSqft: { low: 10000, mid: 14000, high: 19000 }, rent2bhk: { low: 30000, mid: 40000 }, rent3bhk: { low: 45000, mid: 60000 }, rentNew: { '2 BHK': 50000, '3 BHK': 72000 }, appreciationPct: 8,   appConfidence: 'low',      confidence: 'med',  notes: 'Most mix-distorted of the 8 (airport-corridor luxury launches); widest uncertainty' },
  { name: 'Yelahanka',       pricePerSqft: { low: 7500,  mid: 9500,  high: 13000 }, rent2bhk: { low: 20000, mid: 27000 }, rent3bhk: { low: 38000, mid: 42000 }, rentNew: { '2 BHK': 35000, '3 BHK': 50000 }, appreciationPct: 8,   appConfidence: 'med',      confidence: 'med',  notes: 'Emerging north/airport belt; new-town gated 2BHK ~32-40k' },
  { name: 'Electronic City', pricePerSqft: { low: 5500,  mid: 7500,  high: 11500 }, rent2bhk: { low: 18000, mid: 25000 }, rent3bhk: { low: 25000, mid: 35000 }, rentNew: { '2 BHK': 30000, '3 BHK': 42000 }, appreciationPct: 6.5, appConfidence: 'med-high', confidence: 'high', notes: 'Heavy continuous supply caps appreciation — lowest of the 8; highest yields (~4.5%)' },

  // Second pass (June 2026) — 12 more areas, same method. North/NE belt,
  // east corridors, south, and affordable/peripheral. See data-research-2026-06.md.
  { name: 'Horamavu',          pricePerSqft: { low: 5500,  mid: 6200,  high: 8800 },  rent2bhk: { low: 16000, mid: 22000 }, rent3bhk: { low: 24000, mid: 30000 }, rentNew: { '2 BHK': 25000, '3 BHK': 36000 }, appreciationPct: 6.5, appConfidence: 'med', confidence: 'high', notes: 'Affordable NE belt just above E-City floor; listings ~15% above ₹5,398 registry; high yields (~4.3%)' },
  { name: 'Thanisandra',       pricePerSqft: { low: 9000,  mid: 10500, high: 14400 }, rent2bhk: { low: 22000, mid: 28000 }, rent3bhk: { low: 33000, mid: 42000 }, rentNew: { '2 BHK': 35000, '3 BHK': 50000 }, appreciationPct: 8,   appConfidence: 'med', confidence: 'high', notes: 'Manyata Tech Park + metro, but very heavy new-tower supply caps appreciation; deep gated stock' },
  { name: 'Kalyan Nagar',      pricePerSqft: { low: 6500,  mid: 8500,  high: 11300 }, rent2bhk: { low: 20000, mid: 26000 }, rent3bhk: { low: 30000, mid: 38000 }, rentNew: { '2 BHK': 32000, '3 BHK': 46000 }, appreciationPct: 7,   appConfidence: 'med', confidence: 'med',  notes: 'Established low-supply NE; holds value but few new gated projects so segment match is soft' },
  { name: 'Hennur',            pricePerSqft: { low: 8650,  mid: 9500,  high: 12950 }, rent2bhk: { low: 21000, mid: 27000 }, rent3bhk: { low: 32000, mid: 40000 }, rentNew: { '2 BHK': 33000, '3 BHK': 47000 }, appreciationPct: 8,   appConfidence: 'med', confidence: 'high', notes: 'Hebbal/Manyata-adjacent corridor, steady absorption; deep new-launch supply, mid yields (~3.6%)' },
  { name: 'Banaswadi',         pricePerSqft: { low: 6300,  mid: 8000,  high: 10300 }, rent2bhk: { low: 20000, mid: 25000 }, rent3bhk: { low: 30000, mid: 36000 }, rentNew: { '2 BHK': 31000, '3 BHK': 44000 }, appreciationPct: 7,   appConfidence: 'med', confidence: 'med',  notes: 'Established NE; mostly villa/builder-floor, thin pure-apartment market, 1yr slightly negative' },
  { name: 'Kadugodi',          pricePerSqft: { low: 6800,  mid: 8500,  high: 13550 }, rent2bhk: { low: 18000, mid: 24000 }, rent3bhk: { low: 27000, mid: 34000 }, rentNew: { '2 BHK': 30000, '3 BHK': 43000 }, appreciationPct: 8.5, appConfidence: 'med', confidence: 'med',  notes: 'Whitefield/ITPL-adjacent, Purple Line metro terminus; big listing-vs-registry gap (txn ₹5,741)' },
  { name: 'Varthur',           pricePerSqft: { low: 9600,  mid: 10500, high: 14950 }, rent2bhk: { low: 20000, mid: 26000 }, rent3bhk: { low: 30000, mid: 38000 }, rentNew: { '2 BHK': 35000, '3 BHK': 50000 }, appreciationPct: 8.5, appConfidence: 'low', confidence: 'med',  notes: 'Whitefield-adjacent; 243% 10yr listing gain is most mix-distorted of the 12, heavily haircut' },
  { name: 'Bannerghatta Road', pricePerSqft: { low: 6500,  mid: 9500,  high: 14150 }, rent2bhk: { low: 20000, mid: 26000 }, rent3bhk: { low: 30000, mid: 38000 }, rentNew: { '2 BHK': 34000, '3 BHK': 48000 }, appreciationPct: 8.5, appConfidence: 'med', confidence: 'med',  notes: 'Long south corridor (txn ₹6,348 vs new 12–14k); Pink Line metro late 2026 is the catalyst' },
  { name: 'JP Nagar',          pricePerSqft: { low: 7550,  mid: 11000, high: 15150 }, rent2bhk: { low: 23000, mid: 30000 }, rent3bhk: { low: 35000, mid: 45000 }, rentNew: { '2 BHK': 38000, '3 BHK': 54000 }, appreciationPct: 7.5, appConfidence: 'med', confidence: 'med',  notes: 'Established premium south; huge phase spread (6th ~7.5k vs 7th/8th ~12.5k) — mid blends phases' },
  { name: 'Devanahalli',       pricePerSqft: { low: 5000,  mid: 6000,  high: 8500 },  rent2bhk: { low: 12000, mid: 16000 }, rent3bhk: { low: 18000, mid: 24000 }, rentNew: { '2 BHK': 17000, '3 BHK': 25000 }, appreciationPct: 7,   appConfidence: 'low', confidence: 'low',  notes: 'Airport plotted-land play, mostly under-construction; weak rental demand (~3% yield), speculative' },
  { name: 'Tumkur Road',       pricePerSqft: { low: 7000,  mid: 9000,  high: 16000 }, rent2bhk: { low: 17000, mid: 22000 }, rent3bhk: { low: 25000, mid: 32000 }, rentNew: { '2 BHK': 30000, '3 BHK': 44000 }, appreciationPct: 8,   appConfidence: 'low', confidence: 'low',  notes: 'NW industrial/metro corridor; 99acres avg distorted by inner-Yeshwanthpur luxury — mid set to realistic gated end' },
  { name: 'KR Puram',          pricePerSqft: { low: 6600,  mid: 8500,  high: 12150 }, rent2bhk: { low: 18000, mid: 24000 }, rent3bhk: { low: 28000, mid: 35000 }, rentNew: { '2 BHK': 31000, '3 BHK': 44000 }, appreciationPct: 8,   appConfidence: 'med', confidence: 'med',  notes: 'Best-connected east hub (Purple Line + railway), strong Whitefield-worker rental demand; mixed build quality' },
]

export const BHK_PRESETS = [
  { label: '1 BHK', sqft: 650 },
  { label: '2 BHK', sqft: 1150 },
  { label: '3 BHK', sqft: 1650 },
]

// The form's starting state. Market policy (costs, tax, norms) comes from the
// market profile; only the universal user assumptions (appreciation seed,
// investment return, horizon, etc.) live inline here. appreciationPct is just a
// seed — it's overwritten by the selected area's per-area rate on first render.
const DEFAULT_SQFT = 1150
export const DEFAULTS = {
  // universal user assumptions
  appreciationPct: 7,
  investReturnPct: 7,    // FD — the realistic floor most people park cash at
  investFraction: 100,   // % of the monthly EMI-vs-rent gap actually invested
  horizonYears: 10,
  // financing (from market)
  loanRatePct: MARKET.financing.loanRatePct,
  tenureYears: MARKET.financing.tenureYears,
  // transaction costs (from market)
  stampDutyPct: MARKET.cost.stampDutyPct,
  registrationPct: MARKET.cost.registrationPct,
  sellingCostPct: MARKET.cost.sellingCostPct,
  propertyType: 'ready', // 'ready' (0% GST) | 'under-construction'
  interiorsBudget: Math.round(DEFAULT_SQFT * MARKET.cost.interiorsPerSqft), // total ₹; per-sqft derived in UI
  // recurring (from market) — maintenance & tax scale with size, recomputed live
  maintenanceMonthly: Math.round(DEFAULT_SQFT * MARKET.recurring.maintenancePerSqftMonthly),
  propertyTaxAnnual: Math.round(DEFAULT_SQFT * MARKET.recurring.propertyTaxPerSqftAnnual),
  maintenancePerSqftMonthly: MARKET.recurring.maintenancePerSqftMonthly,
  propertyTaxPerSqftAnnual: MARKET.recurring.propertyTaxPerSqftAnnual,
  // renting (from market)
  rentInflationPct: MARKET.renting.rentInflationPct,
  securityDepositMonths: MARKET.renting.securityDepositMonths,
  // income tax (from market)
  claimTaxBenefit: true, // Sec 24b — old tax regime; New regime = false
  marginalTaxPct: MARKET.tax.defaultMarginalPct,
}

// What kind of stock the price (and matched rent) defaults describe. Most areas
// default to recently-built gated apartments; established premium pockets have
// little new gated supply, so their numbers reflect resale/standalone stock.
const NON_GATED = {
  'Koramangala': 'Resale / standalone',
  'Indiranagar': 'Resale / boutique',
  'JP Nagar': 'Resale / standalone',
  'Kalyan Nagar': 'Resale / standalone',
  'Banaswadi': 'Resale / builder-floor',
  'Devanahalli': 'New, under construction',
}
AREAS.forEach((a) => { a.segment = NON_GATED[a.name] || 'New gated apartment' })

// 99acres locality slugs. The rates page (price + 1/3/5/10yr appreciation trend)
// and the rentals page share one slug per area, so we generate both URLs from
// this map. For a handful of areas (Tumkur Road price, Hebbal/Varthur
// appreciation, Devanahalli) the page's headline figure was deliberately
// overridden/haircut in our data — the per-area `notes` explain why, so the
// link is the underlying market source, not a claim that it equals our number.
const SLUGS = {
  'Whitefield': 'whitefield-bangalore-east',
  'HSR Layout': 'hsr-layout-bangalore-south',
  'Koramangala': 'koramangala-bangalore-south',
  'Sarjapur Road': 'sarjapur-road-bangalore-east',
  'Indiranagar': 'indiranagar-bangalore-east',
  'Hebbal': 'hebbal-bangalore-north',
  'Yelahanka': 'yelahanka-bangalore-north',
  'Electronic City': 'electronic-city-bangalore-south',
  'Horamavu': 'horamavu-bangalore-east',
  'Thanisandra': 'thanisandra-bangalore-north',
  'Kalyan Nagar': 'kalyan-nagar-bangalore-east',
  'Hennur': 'hennur-road-bangalore-north',
  'Banaswadi': 'banaswadi-bangalore-east',
  'Kadugodi': 'kadugodi-bangalore-east',
  'Varthur': 'varthur-bangalore-east',
  'Bannerghatta Road': 'bannerghatta-road-bangalore-south',
  'JP Nagar': 'jp-nagar-bangalore-south',
  'Devanahalli': 'devanahalli-bangalore-north',
  'Tumkur Road': 'tumkur-road-bangalore-west',
  'KR Puram': 'kr-puram-bangalore-east',
}
AREAS.forEach((a) => {
  const slug = SLUGS[a.name]
  a.sources = {
    rates: `https://www.99acres.com/property-rates-and-price-trends-in-${slug}-prffid`,
    rent: `https://www.99acres.com/property-for-rent-in-${slug}-ffid`,
  }
})
