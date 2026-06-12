// Area pricing data — researched June 2026 from listing aggregators (99acres,
// HexaHome), crowdsourced rent data (bengaluru.rent, 3800+ renters), and
// builder pages. Full provenance in data-research-2026-06.md.
//
// Caveat: listing prices run 10-30% above registered transaction values
// (starkest in HSR Layout). Mids lean toward realistic deal prices but still
// carry upward listing bias. 3BHK rent mids are the weakest numbers (partly
// derived from 2BHK ratios).

export const DATA_ASOF = 'June 2026'

export const AREAS = [
  { name: 'Whitefield',      pricePerSqft: { low: 9500,  mid: 12500, high: 16000 }, rent2bhk: { low: 28000, mid: 35000 }, rent3bhk: { low: 40000, mid: 55000 }, confidence: 'high', notes: 'Skews new-launch; resale 9.5–11k, new launches 13–17k' },
  { name: 'HSR Layout',      pricePerSqft: { low: 9000,  mid: 12750, high: 16000 }, rent2bhk: { low: 30000, mid: 38000 }, rent3bhk: { low: 45000, mid: 60000 }, confidence: 'med',  notes: 'Listings inflated vs registered transactions (~7.5k/sqft registry avg)' },
  { name: 'Koramangala',     pricePerSqft: { low: 14000, mid: 17000, high: 22000 }, rent2bhk: { low: 30000, mid: 40000 }, rent3bhk: { low: 50000, mid: 70000 }, confidence: 'med',  notes: 'Resale-dominated; premium blocks 20k+/sqft' },
  { name: 'Sarjapur Road',   pricePerSqft: { low: 9500,  mid: 12000, high: 15000 }, rent2bhk: { low: 30000, mid: 40000 }, rent3bhk: { low: 45000, mid: 58000 }, confidence: 'high', notes: 'Skews new-launch; older stock rents 25–30k' },
  { name: 'Indiranagar',     pricePerSqft: { low: 16000, mid: 19500, high: 27000 }, rent2bhk: { low: 35000, mid: 45000 }, rent3bhk: { low: 55000, mid: 75000 }, confidence: 'med',  notes: 'Thin apartment stock, wide variance — mid is soft' },
  { name: 'Hebbal',          pricePerSqft: { low: 10000, mid: 14000, high: 19000 }, rent2bhk: { low: 30000, mid: 40000 }, rent3bhk: { low: 45000, mid: 60000 }, confidence: 'med',  notes: 'Aggregator avg dominated by luxury towers; broader stock 9–13k' },
  { name: 'Yelahanka',       pricePerSqft: { low: 7500,  mid: 9500,  high: 13000 }, rent2bhk: { low: 20000, mid: 27000 }, rent3bhk: { low: 38000, mid: 42000 }, confidence: 'med',  notes: 'Airport corridor demand' },
  { name: 'Electronic City', pricePerSqft: { low: 5500,  mid: 7500,  high: 11500 }, rent2bhk: { low: 18000, mid: 25000 }, rent3bhk: { low: 25000, mid: 35000 }, confidence: 'high', notes: 'Cheapest corridor; premium new launches sit outside this band' },
]

export const BHK_PRESETS = [
  { label: '1 BHK', sqft: 650 },
  { label: '2 BHK', sqft: 1150 },
  { label: '3 BHK', sqft: 1650 },
]

export const DEFAULTS = {
  loanRatePct: 8.0,      // SBI from ~7.25-7.5%, HDFC 7.75-8.15%; 8% for salaried 750+ CIBIL
  tenureYears: 20,
  appreciationPct: 7,    // long-run defensible; boom-era 13%+ YoY is mix-distorted
  investReturnPct: 11,
  rentInflationPct: 5,
  horizonYears: 10,
  stampDutyPct: 5.6,     // Karnataka >₹45L: 5% + ~0.6% cess/surcharge
  registrationPct: 2,    // doubled from 1% effective Aug 31, 2025
  maintenanceMonthly: 5000,
  propertyTaxAnnual: 15000,
  sellingCostPct: 2,     // brokerage on eventual sale
}
