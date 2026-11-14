// Tests for scenario defaults and shareable links.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultsFor, encodeScenario, decodeScenario } from '../src/lib/scenario.js'
import { AREAS, BHK_PRESETS } from '../src/data/areas.js'

test('the default scenario needs no link at all', () => {
  assert.equal(encodeScenario(defaultsFor()), '')
  assert.equal(decodeScenario(''), null)
  assert.equal(decodeScenario('#'), null)
})

test('every area and size survives a round trip through a link', () => {
  for (const area of AREAS) {
    for (const { label } of BHK_PRESETS) {
      const s = defaultsFor(area.name, label)
      const link = encodeScenario(s)
      if (link) assert.deepEqual(decodeScenario('#' + link), s)
    }
  }
})

test('a customised scenario survives a round trip', () => {
  const s = {
    ...defaultsFor('HSR Layout', '3 BHK', 1800),
    pricePerSqft: 14250, rentMonthly: 80000, securityDeposit: 300000, downPaymentPct: 35,
    appreciationPct: 6.5, investReturnPct: 11, investTaxPct: 0, investFraction: 60,
    horizonYears: 15, loanRatePct: 8.4, propertyType: 'under-construction',
    claimTaxBenefit: true, marginalTaxPct: 20, basicSalaryAnnual: 2000000,
    maintenanceMonthly: 9000, interiorsBudget: 2500000, costInflationPct: 6,
  }
  assert.deepEqual(decodeScenario('#' + encodeScenario(s)), s)
})

test('links only carry what differs from the defaults', () => {
  const s = { ...defaultsFor('Koramangala'), rentMonthly: 65000 }
  assert.equal(encodeScenario(s), 'a=Koramangala&r=65000')
})

test('a custom size carries its matching upkeep costs without spelling them out', () => {
  const s = defaultsFor('Whitefield', '2 BHK', 1400)
  assert.equal(encodeScenario(s), 's=1400')
  assert.equal(decodeScenario('#s=1400').maintenanceMonthly, s.maintenanceMonthly)
})

test('a mangled or hostile link falls back to safe values', () => {
  const d = defaultsFor()
  const s = decodeScenario('#a=<script>&b=9&p=abc&r=-5&h=1e99&uc=7&old=maybe&dp=')
  assert.equal(s.area, d.area)
  assert.equal(s.bhk, d.bhk)
  assert.equal(s.pricePerSqft, d.pricePerSqft)
  assert.equal(s.rentMonthly, d.rentMonthly)
  assert.equal(s.horizonYears, d.horizonYears)
  assert.equal(s.propertyType, d.propertyType)
  assert.equal(s.claimTaxBenefit, d.claimTaxBenefit)
  assert.equal(s.downPaymentPct, d.downPaymentPct)
  assert.equal(decodeScenario('#utm_source=whatever'), null)
})

test('a discount lowers the price the buyer pays, and travels in the link', async () => {
  const { toSimInputs, dealPrice } = await import('../src/lib/scenario.js')
  const full = defaultsFor('Horamavu')
  const cut = { ...full, priceDiscountPct: 10 }
  assert.equal(dealPrice(full), full.pricePerSqft * full.sqft)
  assert.ok(Math.abs(dealPrice(cut) - 0.9 * dealPrice(full)) < 1e-6)
  assert.ok(Math.abs(toSimInputs(cut).downPayment - 0.9 * toSimInputs(full).downPayment) < 1e-6)
  assert.equal(encodeScenario(cut), 'a=Horamavu&disc=10')
  assert.equal(decodeScenario('#a=Horamavu&disc=10').priceDiscountPct, 10)
  assert.equal(dealPrice({ ...full, priceDiscountPct: 500 }), dealPrice({ ...full, priceDiscountPct: 90 }))
})

test('the compare table covers every area, sorted by break-even', async () => {
  const { compareAreas } = await import('../src/lib/scenario.js')
  const { simulate, findBreakEven } = await import('../src/lib/calc.js')
  const mine = { ...defaultsFor('Koramangala', '3 BHK'), downPaymentPct: 40, pricePerSqft: 99999 }
  const rows = compareAreas(mine, simulate, findBreakEven)
  assert.equal(rows.length, AREAS.length)
  const be = rows.map((r) => r.fd.breakEven ?? Infinity)
  assert.deepEqual(be, [...be].sort((a, b) => a - b))
  // each row uses its own area's price, not the one the user typed for another area
  const whitefield = rows.find((r) => r.name === 'Whitefield')
  assert.equal(whitefield.pricePerSqft, defaultsFor('Whitefield', '3 BHK').pricePerSqft)
  assert.equal(whitefield.rentMonthly, defaultsFor('Whitefield', '3 BHK').rentMonthly)
  // but keeps the user's own settings: a bigger down payment changes the answer
  const standard = compareAreas(defaultsFor('Koramangala', '3 BHK'), simulate, findBreakEven)
  assert.notEqual(whitefield.fd.margin, standard.find((r) => r.name === 'Whitefield').fd.margin)
})

test('interiors default scales with the price of the flat, within a band', async () => {
  const { defaultInteriors } = await import('../src/lib/scenario.js')
  assert.equal(defaultInteriors(12500, 1150), 1440000)  // 10% of price = 1,250/sqft
  assert.equal(defaultInteriors(6200, 1150), 805000)    // floor of 700/sqft
  assert.equal(defaultInteriors(40000, 1000), 2500000)  // ceiling of 2,500/sqft
  assert.ok(defaultsFor('Horamavu').interiorsBudget < defaultsFor('Indiranagar').interiorsBudget)
  assert.equal(encodeScenario(defaultsFor('Horamavu', '3 BHK')), 'a=Horamavu&b=3')
})
