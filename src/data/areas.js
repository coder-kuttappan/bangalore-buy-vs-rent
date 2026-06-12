// PLACEHOLDER DATA — rough ballparks, to be replaced with researched
// June 2026 figures (listing aggregators + builder pages). Do not ship as-is.

export const DATA_ASOF = 'placeholder'

export const AREAS = [
  { name: 'Whitefield',      pricePerSqft: { low: 8000,  mid: 9500,  high: 12000 }, rent2bhk: { low: 28000, mid: 35000 }, rent3bhk: { low: 40000, mid: 50000 }, confidence: 'low', notes: '' },
  { name: 'HSR Layout',      pricePerSqft: { low: 11000, mid: 13500, high: 16000 }, rent2bhk: { low: 38000, mid: 45000 }, rent3bhk: { low: 55000, mid: 65000 }, confidence: 'low', notes: '' },
  { name: 'Koramangala',     pricePerSqft: { low: 13000, mid: 16000, high: 20000 }, rent2bhk: { low: 45000, mid: 55000 }, rent3bhk: { low: 65000, mid: 80000 }, confidence: 'low', notes: '' },
  { name: 'Sarjapur Road',   pricePerSqft: { low: 8000,  mid: 9500,  high: 12000 }, rent2bhk: { low: 30000, mid: 36000 }, rent3bhk: { low: 42000, mid: 52000 }, confidence: 'low', notes: '' },
  { name: 'Indiranagar',     pricePerSqft: { low: 13000, mid: 16500, high: 21000 }, rent2bhk: { low: 45000, mid: 55000 }, rent3bhk: { low: 65000, mid: 85000 }, confidence: 'low', notes: '' },
  { name: 'Hebbal',          pricePerSqft: { low: 9000,  mid: 11000, high: 14000 }, rent2bhk: { low: 30000, mid: 36000 }, rent3bhk: { low: 42000, mid: 55000 }, confidence: 'low', notes: '' },
  { name: 'Yelahanka',       pricePerSqft: { low: 7000,  mid: 8500,  high: 11000 }, rent2bhk: { low: 22000, mid: 28000 }, rent3bhk: { low: 32000, mid: 40000 }, confidence: 'low', notes: '' },
  { name: 'Electronic City', pricePerSqft: { low: 5500,  mid: 7000,  high: 9000 },  rent2bhk: { low: 20000, mid: 25000 }, rent3bhk: { low: 28000, mid: 35000 }, confidence: 'low', notes: '' },
]

export const BHK_PRESETS = [
  { label: '1 BHK', sqft: 650 },
  { label: '2 BHK', sqft: 1150 },
  { label: '3 BHK', sqft: 1650 },
]

export const DEFAULTS = {
  loanRatePct: 8.5,
  tenureYears: 20,
  appreciationPct: 6,
  investReturnPct: 11,
  rentInflationPct: 5,
  horizonYears: 10,
  stampDutyPct: 5.6,     // Karnataka: 5% + cess/surcharge, effective ~5.6%
  registrationPct: 1,
  maintenanceMonthly: 5000,
  propertyTaxAnnual: 15000,
  sellingCostPct: 2,     // brokerage on eventual sale
}
