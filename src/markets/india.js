// ─────────────────────────────────────────────────────────────────────────
// MARKET PROFILE — India / Bangalore
// ─────────────────────────────────────────────────────────────────────────
// Every country-specific rule lives here. The simulation engine (lib/calc.js)
// and the form defaults (data/areas.js) read from this object — nothing about
// India is hardcoded in the math. To launch a new market (e.g. US), copy this
// file to markets/us.js, swap the values, and point the app at it.
//
// What is NOT yet here (other India-specific surfaces to localise for a port):
//   - Number formatting (lakhs/crores) lives in lib/format.js
//   - Per-area price/rent/appreciation data lives in data/areas.js
//   - A few UI labels ("BBMP", "Section 24b", "₹/sqft") are inline in App.jsx
// These are listed so a future market profile knows the full surface area.

export const MARKET = {
  id: 'india-bangalore',
  country: 'India',
  city: 'Bangalore',
  currency: { code: 'INR', symbol: '₹', format: 'indian' }, // 'indian' = lakh/crore grouping

  // ── One-time transaction costs (on the price) ──────────────────────────
  cost: {
    stampDutyPct: 5.6,    // Karnataka >₹45L: 5% + ~0.6% cess/surcharge
    registrationPct: 2,   // doubled from 1% effective Aug 31, 2025
    sellingCostPct: 2,    // brokerage on eventual sale
    // GST applies to under-construction property only; ready/resale is exempt
    gstPct: { ready: 0, underConstruction: 5, affordable: 1 },
    interiorsPerSqft: 1500, // typical new-flat interiors (kitchen, wardrobes, fixtures)
  },

  // ── Recurring ownership costs (scale with flat size) ───────────────────
  recurring: {
    maintenancePerSqftMonthly: 3.5, // typical gated-community society maintenance
    propertyTaxPerSqftAnnual: 4.5,  // BBMP self-occupied ballpark (~₹7k for a 3BHK)
    costInflationPct: 5,            // maintenance + property tax rise over time, like rent
  },

  // ── Financing norms ────────────────────────────────────────────────────
  financing: {
    loanRatePct: 8,   // salaried, 750+ CIBIL (SBI ~7.5%, HDFC ~8%)
    tenureYears: 20,
  },

  // ── Renting norms ──────────────────────────────────────────────────────
  renting: {
    securityDepositMonths: 6,  // Bangalore norm 6–10 months; locked, earns nothing
    rentInflationPct: 5,
  },

  // ── Income-tax treatment of a home loan ────────────────────────────────
  tax: {
    // Section 24b: interest on a self-occupied home loan is deductible up to
    // this cap per year — but ONLY under the old regime. The new regime gives
    // no benefit on a self-occupied home.
    homeLoanInterestCap: 200000,
    defaultMarginalPct: 30,
    // 80C principal deduction is deliberately excluded — for most salaried
    // buyers it's already used up by EPF/insurance.
    //
    // New regime is the default for salaried filers, so the tool starts there:
    // neither 24b (buyer) nor HRA (renter) applies.
    defaultRegime: 'new',
    // HRA exemption (old regime, renters only): least of HRA received,
    // rent − 10% of basic, and this % of basic. Bengaluru moved from 40% to the
    // 50% metro list from FY 2026-27 under the Income Tax Rules, 2026 — reported
    // by several outlets; the notified text has not been checked first-hand.
    hraCapPctOfBasic: 50,
    // Long-term capital gains, FY 2026-27 (from secondary sources, not the Act):
    // 12.5% on a home sale with no indexation; 12.5% on equity-fund gains above
    // ₹1.25L a year. Cess and surcharge are left out here, as they are for the
    // slab rate. Reinvesting a home-sale gain in another home can exempt it.
    propertyGainsTaxPct: 12.5,
    equityGainsTaxPct: 12.5,
    equityGainsExemption: 125000,
    defaultBasicSalaryAnnual: 1500000, // a guess for this price band; user-editable
  },
}
