// A "scenario" is everything the user can change, as one flat object. This
// module owns its defaults and its conversion to and from a shareable link.
//
// Links carry the scenario in the URL fragment (the part after #). Browsers
// never send the fragment to a server, so a shared link keeps the promise that
// no data leaves the browser. Only values that differ from the area's defaults
// are written, which keeps links short.

import { AREAS, BHK_PRESETS, DEFAULTS } from '../data/areas.js'
import { MARKET } from '../markets/india.js'

export const DEFAULT_AREA = 'Whitefield'
export const DEFAULT_BHK = '2 BHK'

export function defaultRent(area, bhkLabel) {
  // rentNew = rent for the same new-gated segment the price describes, so the
  // buy and rent sides compare like-for-like (not new-flat price vs old-flat rent)
  if (bhkLabel === '1 BHK') return Math.round(area.rentNew['2 BHK'] * 0.7 / 500) * 500
  return area.rentNew[bhkLabel]
}

// maintenance and property tax track flat size
export function sizeCosts(sqft) {
  return {
    maintenanceMonthly: Math.round(sqft * MARKET.recurring.maintenancePerSqftMonthly),
    propertyTaxAnnual: Math.round(sqft * MARKET.recurring.propertyTaxPerSqftAnnual),
  }
}

// Default interiors budget: a share of the flat's price, within a per-sqft band,
// so a cheaper flat isn't loaded with a premium flat's fit-out.
export function defaultInteriors(pricePerSqft, sqft) {
  const { interiorsPctOfPrice, interiorsMinPerSqft, interiorsMaxPerSqft } = MARKET.cost
  const perSqft = Math.min(Math.max(pricePerSqft * interiorsPctOfPrice / 100, interiorsMinPerSqft), interiorsMaxPerSqft)
  return Math.round(perSqft * sqft / 5000) * 5000
}

// Our researched starting point for an area and size. Pass sqft to get the
// defaults for a custom size (maintenance and property tax follow it).
export function defaultsFor(areaName = DEFAULT_AREA, bhk = DEFAULT_BHK, sqft) {
  const area = AREAS.find((a) => a.name === areaName) || AREAS.find((a) => a.name === DEFAULT_AREA)
  const preset = BHK_PRESETS.find((b) => b.label === bhk) || BHK_PRESETS.find((b) => b.label === DEFAULT_BHK)
  const size = sqft ?? preset.sqft
  const rent = defaultRent(area, preset.label)
  return {
    area: area.name,
    bhk: preset.label,
    sqft: size,
    pricePerSqft: area.pricePerSqft.mid,
    rentMonthly: rent,
    securityDeposit: MARKET.renting.securityDepositMonths * rent,
    downPaymentPct: 20,
    ...DEFAULTS,
    ...sizeCosts(size),
    interiorsBudget: defaultInteriors(area.pricePerSqft.mid, size),
    appreciationPct: area.appreciationPct,
  }
}

// short code in the link -> [scenario key, type]
const FIELDS = {
  s: ['sqft', 'num'],
  p: ['pricePerSqft', 'num'],
  disc: ['priceDiscountPct', 'num'],
  r: ['rentMonthly', 'num'],
  dep: ['securityDeposit', 'num'],
  dp: ['downPaymentPct', 'num'],
  ap: ['appreciationPct', 'num'],
  ir: ['investReturnPct', 'num'],
  it: ['investTaxPct', 'num'],
  ix: ['investExitTaxPct', 'num'],
  xt: ['countExitTax', 'bool'],
  re: ['reinvestInHome', 'bool'],
  if: ['investFraction', 'num'],
  h: ['horizonYears', 'num'],
  lr: ['loanRatePct', 'num'],
  lt: ['tenureYears', 'num'],
  ri: ['rentInflationPct', 'num'],
  ci: ['costInflationPct', 'num'],
  sd: ['stampDutyPct', 'num'],
  rg: ['registrationPct', 'num'],
  sc: ['sellingCostPct', 'num'],
  mt: ['maintenanceMonthly', 'num'],
  pt: ['propertyTaxAnnual', 'num'],
  in: ['interiorsBudget', 'num'],
  uc: ['propertyType', 'enum', { 1: 'under-construction', 0: 'ready' }],
  old: ['claimTaxBenefit', 'bool'],
  slab: ['marginalTaxPct', 'num'],
  basic: ['basicSalaryAnnual', 'num'],
}

const MAX = 1e12 // rejects absurd numbers from a hand-edited link

export function encodeScenario(scenario) {
  const base = defaultsFor(scenario.area, scenario.bhk, scenario.sqft)
  const presetSqft = defaultsFor(scenario.area, scenario.bhk).sqft
  const params = new URLSearchParams()
  if (scenario.area !== DEFAULT_AREA) params.set('a', scenario.area)
  if (scenario.bhk !== DEFAULT_BHK) params.set('b', scenario.bhk[0])
  for (const [code, [key, type, map]] of Object.entries(FIELDS)) {
    const value = scenario[key]
    const def = key === 'sqft' ? presetSqft : base[key]
    if (value === def || value === undefined) continue
    if (type === 'num') params.set(code, String(value))
    else if (type === 'bool') params.set(code, value ? '1' : '0')
    else params.set(code, Object.keys(map).find((k) => map[k] === value))
  }
  return params.toString()
}

// Returns a full scenario, or null when the fragment holds nothing usable.
// Anything unrecognised or out of range is ignored, so a mangled link falls
// back to defaults instead of breaking the page.
export function decodeScenario(fragment) {
  const text = (fragment || '').replace(/^#/, '')
  if (!text) return null
  const params = new URLSearchParams(text)
  const known = ['a', 'b', ...Object.keys(FIELDS)]
  if (!known.some((k) => params.has(k))) return null

  const areaName = AREAS.some((a) => a.name === params.get('a')) ? params.get('a') : DEFAULT_AREA
  const preset = BHK_PRESETS.find((b) => b.label[0] === params.get('b'))
  const bhk = preset ? preset.label : DEFAULT_BHK

  const num = (code) => {
    if (!params.has(code)) return undefined
    const n = Number(params.get(code))
    return params.get(code) !== '' && Number.isFinite(n) && n >= 0 && n <= MAX ? n : undefined
  }
  const sqft = num('s')
  const scenario = defaultsFor(areaName, bhk, sqft && sqft > 0 ? sqft : undefined)

  for (const [code, [key, type, map]] of Object.entries(FIELDS)) {
    if (key === 'sqft' || !params.has(code)) continue
    const raw = params.get(code)
    if (type === 'num') {
      const n = num(code)
      if (n !== undefined) scenario[key] = n
    } else if (type === 'bool') {
      if (raw === '1' || raw === '0') scenario[key] = raw === '1'
    } else if (raw in map) {
      scenario[key] = map[raw]
    }
  }
  return scenario
}

// what the buyer actually pays: asking price less any discount they expect
export function dealPrice(s) {
  const discount = Math.min(Math.max(s.priceDiscountPct || 0, 0), 90)
  return s.pricePerSqft * s.sqft * (1 - discount / 100)
}

// scenario -> the inputs simulate() expects
export function toSimInputs(s) {
  const price = dealPrice(s)
  return {
    price,
    downPayment: price * s.downPaymentPct / 100,
    loanRatePct: s.loanRatePct,
    tenureYears: s.tenureYears,
    rentMonthly: s.rentMonthly,
    rentInflationPct: s.rentInflationPct,
    appreciationPct: s.appreciationPct,
    investReturnPct: s.investReturnPct,
    investTaxPct: s.investTaxPct,
    investFraction: s.investFraction,
    horizonYears: s.horizonYears,
    stampDutyPct: s.stampDutyPct,
    registrationPct: s.registrationPct,
    maintenanceMonthly: s.maintenanceMonthly,
    propertyTaxAnnual: s.propertyTaxAnnual,
    costInflationPct: s.costInflationPct,
    sellingCostPct: s.sellingCostPct,
    securityDeposit: s.securityDeposit,
    gstPct: s.propertyType === 'under-construction'
      ? MARKET.cost.gstPct.underConstruction
      : MARKET.cost.gstPct.ready,
    interiorsCost: s.interiorsBudget,
    claimTaxBenefit: s.claimTaxBenefit,
    marginalTaxPct: s.marginalTaxPct,
    interestDeductionCap: MARKET.tax.homeLoanInterestCap,
    basicSalaryAnnual: s.basicSalaryAnnual,
    hraCapPctOfBasic: MARKET.tax.hraCapPctOfBasic,
    homeExitTaxPct: s.countExitTax && !s.reinvestInHome ? MARKET.tax.propertyGainsTaxPct : 0,
    investExitTaxPct: s.countExitTax ? s.investExitTaxPct : 0,
    investExitExemption: MARKET.tax.equityGainsExemption,
  }
}

// The two usual homes for spare cash, with how each is taxed. FD interest is
// taxed every year at the saver's slab; equity-fund gains are taxed once, when
// sold.
export const FD_RETURN = 7
export const EQUITY_RETURN = 11
export function investOption(kind, s) {
  return kind === 'equity'
    ? { investReturnPct: EQUITY_RETURN, investTaxPct: 0, investExitTaxPct: MARKET.tax.equityGainsTaxPct }
    : { investReturnPct: FD_RETURN, investTaxPct: s.marginalTaxPct, investExitTaxPct: 0 }
}

// Every area side by side, for the compare table. Each row uses that area's
// own defaults (price, rent, appreciation) for the chosen size, and keeps the
// user's personal settings — down payment, horizon, tax, discipline and so on.
const AREA_FIELDS = ['area', 'pricePerSqft', 'rentMonthly', 'securityDeposit', 'appreciationPct', 'interiorsBudget']
export function compareAreas(scenario, simulate, findBreakEven) {
  return AREAS.map((area) => {
    const defaults = defaultsFor(area.name, scenario.bhk, scenario.sqft)
    const base = { ...scenario }
    for (const key of AREA_FIELDS) base[key] = defaults[key]
    const run = (kind) => {
      const s = { ...base, ...investOption(kind, base) }
      const r = simulate(toSimInputs(s))
      return { verdict: r.verdict, margin: r.margin, breakEven: findBreakEven(toSimInputs(s)) }
    }
    return {
      name: area.name,
      pricePerSqft: defaults.pricePerSqft,
      rentMonthly: defaults.rentMonthly,
      appreciationPct: area.appreciationPct,
      appreciationListingPct: area.appreciationListingPct,
      fd: run('fd'),
      equity: run('equity'),
    }
  }).sort((a, b) => (a.fd.breakEven ?? Infinity) - (b.fd.breakEven ?? Infinity))
}
