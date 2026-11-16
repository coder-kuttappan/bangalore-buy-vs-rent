// Tests for the simulation engine. Run with: npm test
// Uses Node's built-in test runner, so there is nothing extra to install.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  emi, simulate, findBreakEven, appreciationTippingPoint, investReturnTippingPoint,
} from '../src/lib/calc.js'
import { defaultsFor, toSimInputs } from '../src/lib/scenario.js'

const near = (actual, expected, tolerance = 1) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`)

// A stripped-down scenario with every cost and growth rate at zero, so each
// test can switch on one thing and check its effect by hand.
const bare = (over = {}) => ({
  price: 10000000, downPayment: 10000000, loanRatePct: 8, tenureYears: 20,
  rentMonthly: 0, rentInflationPct: 0, appreciationPct: 0, investReturnPct: 0,
  investFraction: 100, horizonYears: 1, stampDutyPct: 0, registrationPct: 0,
  maintenanceMonthly: 0, propertyTaxAnnual: 0, sellingCostPct: 0, ...over,
})

test('EMI matches the standard formula', () => {
  near(emi(10000000, 8, 20), 83644)       // ₹1 Cr, 8%, 20 yrs — the textbook figure
  near(emi(1200000, 0, 10), 10000, 0.001) // no interest: principal spread evenly
  assert.equal(emi(0, 8, 20), 0)
})

test('with nothing switched on, both sides just keep their cash', () => {
  const r = simulate(bare())
  near(r.buyNetWorthAtHorizon, 10000000, 0.01)
  near(r.rentNetWorthAtHorizon, 10000000, 0.01)
})

test('whoever spends less each month invests the difference', () => {
  // buyer has no outgoings, renter pays 50k — buyer banks 50k x 12
  const r = simulate(bare({ rentMonthly: 50000 }))
  near(r.buyNetWorthAtHorizon, 10000000 + 600000, 0.01)
  near(r.rentNetWorthAtHorizon, 10000000, 0.01)
  near(r.totalRentPaid, 600000, 0.01)
})

test('an undisciplined renter keeps less of the monthly saving', () => {
  const inputs = bare({ downPayment: 2000000, rentMonthly: 20000, horizonYears: 5 })
  const full = simulate(inputs).rentNetWorthAtHorizon
  const half = simulate({ ...inputs, investFraction: 50 }).rentNetWorthAtHorizon
  const none = simulate({ ...inputs, investFraction: 0 }).rentNetWorthAtHorizon
  assert.ok(full > half && half > none)
  near(none, 2000000, 0.01) // only the untouched down payment is left
})

test('a loan is fully repaid at the end of its tenure', () => {
  const r = simulate(bare({ downPayment: 2000000, horizonYears: 20 }))
  // home is worth the price, nothing owed, nothing else invested
  near(r.buyNetWorthAtHorizon, 10000000, 1)
  near(r.totalInterest, r.emi * 240 - 8000000, 1)
})

test('upfront costs are cash the renter keeps', () => {
  const r = simulate(bare({ stampDutyPct: 5.6, registrationPct: 2, gstPct: 5, interiorsCost: 1000000 }))
  near(r.upfrontCosts, 10000000 * 0.126 + 1000000, 0.01)
  near(r.rentNetWorthAtHorizon - r.buyNetWorthAtHorizon, r.upfrontCosts, 0.01)
})

test('selling costs come off the home value', () => {
  const r = simulate(bare({ sellingCostPct: 2 }))
  near(r.buyNetWorthAtHorizon, 9800000, 0.01)
})

test('security deposit is returned but earns nothing', () => {
  const inputs = bare({ investReturnPct: 10 })
  const without = simulate(inputs).rentNetWorthAtHorizon
  const withDeposit = simulate({ ...inputs, securityDeposit: 500000 }).rentNetWorthAtHorizon
  near(without - withDeposit, 50000, 0.01) // one year of 10% on the locked 5L
})

test('maintenance and property tax rise with cost inflation', () => {
  const inputs = bare({ maintenanceMonthly: 4000, propertyTaxAnnual: 6000, horizonYears: 2 })
  const flat = simulate(inputs)
  const rising = simulate({ ...inputs, costInflationPct: 10 })
  // year 1 identical; year 2 costs 10% more: (48000 + 6000) x 0.10
  near(rising.rentNetWorthAtHorizon - flat.rentNetWorthAtHorizon, 5400, 0.01)
})

test('tax on returns lowers the rate both sides compound at', () => {
  const inputs = bare({ investReturnPct: 7 })
  near(simulate(inputs).rentNetWorthAtHorizon, 10700000, 0.5)
  near(simulate({ ...inputs, investTaxPct: 30 }).rentNetWorthAtHorizon, 10490000, 0.5) // 4.9% net
})

test('old regime: buyer gets the 24b refund, capped at 2L of interest', () => {
  const inputs = bare({ downPayment: 2000000, marginalTaxPct: 30 }) // year-1 interest ~6.3L
  const none = simulate(inputs)
  const claimed = simulate({ ...inputs, claimTaxBenefit: true })
  assert.ok(none.totalInterest > 200000)
  near(claimed.buyNetWorthAtHorizon - none.buyNetWorthAtHorizon, 60000, 0.01) // 2L x 30%
})

test('old regime: renter gets the HRA exemption', () => {
  // rent 6L/yr, basic 15L: least of (6L - 1.5L) and (50% of 15L) = 4.5L, at 30% = 1.35L
  const inputs = bare({ rentMonthly: 50000, marginalTaxPct: 30, basicSalaryAnnual: 1500000, claimTaxBenefit: true })
  const off = simulate({ ...inputs, basicSalaryAnnual: 0 })
  near(simulate(inputs).rentNetWorthAtHorizon - off.rentNetWorthAtHorizon, 135000, 0.01)

  // capped at 50% of basic when rent is high relative to salary
  const capped = simulate({ ...inputs, basicSalaryAnnual: 600000 }) // least of (6L - 0.6L, 3L) = 3L
  near(capped.rentNetWorthAtHorizon - off.rentNetWorthAtHorizon, 90000, 0.01)

  // nothing when rent is under 10% of basic
  const tiny = simulate({ ...inputs, basicSalaryAnnual: 9000000 })
  near(tiny.rentNetWorthAtHorizon, off.rentNetWorthAtHorizon, 0.01)
})

test('new regime: neither side gets a tax break', () => {
  const inputs = bare({ downPayment: 2000000, rentMonthly: 50000, marginalTaxPct: 30, basicSalaryAnnual: 1500000 })
  const a = simulate(inputs)
  const b = simulate({ ...inputs, marginalTaxPct: 0, basicSalaryAnnual: 0 })
  near(a.buyNetWorthAtHorizon, b.buyNetWorthAtHorizon, 0.01)
  near(a.rentNetWorthAtHorizon, b.rentNetWorthAtHorizon, 0.01)
})

test('more appreciation only ever helps the buyer', () => {
  const base = toSimInputs(defaultsFor())
  let last = -Infinity
  for (const pct of [0, 3, 6, 9, 12]) {
    const r = simulate({ ...base, appreciationPct: pct })
    assert.ok(r.buyNetWorthAtHorizon > last)
    last = r.buyNetWorthAtHorizon
  }
})

test('tipping points land where the two sides are level', () => {
  const base = { ...toSimInputs(defaultsFor()), investReturnPct: 9, investTaxPct: 0 }
  const gap = (over) => {
    const r = simulate({ ...base, ...over })
    return r.buyNetWorthAtHorizon - r.rentNetWorthAtHorizon
  }
  const appr = appreciationTippingPoint(base)
  assert.ok(appr > 0 && appr < 30)
  near(gap({ appreciationPct: appr }), 0, 100)

  const ret = investReturnTippingPoint(base)
  assert.ok(ret > 0 && ret < 30)
  near(gap({ investReturnPct: ret }), 0, 100)
})

test('break-even does not depend on the comparison window', () => {
  const base = toSimInputs(defaultsFor('Electronic City'))
  const be = findBreakEven(base)
  assert.equal(findBreakEven({ ...base, horizonYears: 3 }), be)
  assert.equal(findBreakEven({ ...base, horizonYears: 30 }), be)
})

test('every area produces sane numbers on its defaults', () => {
  for (const name of ['Whitefield', 'Indiranagar', 'Devanahalli', 'Horamavu']) {
    for (const bhk of ['1 BHK', '2 BHK', '3 BHK']) {
      const r = simulate(toSimInputs(defaultsFor(name, bhk)))
      for (const v of [r.emi, r.buyNetWorthAtHorizon, r.rentNetWorthAtHorizon, r.margin]) {
        assert.ok(Number.isFinite(v) && v >= 0, `${name} ${bhk}: ${v}`)
      }
      assert.equal(r.series.length, 11) // year 0 through year 10
    }
  }
})

test('official appreciation is the 10-year RBI growth rate for Bangalore', async () => {
  const { officialAppreciation } = await import('../src/data/hpi.js')
  const ten = officialAppreciation(10)
  const { HPI_NEW, HPI_OLD } = await import('../src/data/hpi.js')
  // whatever the latest data, the figure must be a believable long-run rate
  assert.ok(ten.pct > 3 && ten.pct < 12, `10-year rate ${ten.pct}`)
  assert.equal(ten.asOf, HPI_NEW[HPI_NEW.length - 1][0])
  // the two series must still overlap for the join to work, with no missing quarters
  assert.ok(HPI_OLD.some(([q]) => q.endsWith('.2022-23')) && HPI_NEW[0][0] === 'Q1.2022-23')
  assert.ok(HPI_NEW.every(([q, v]) => /^Q[1-4]\.\d{4}-\d{2}$/.test(q) && v > 50 && v < 1000))
  // a flat series grows 0%; one that doubles in 10 years grows ~7.18%/yr
  const quarters = (fromYear, n, value) => Array.from({ length: n }, (_, i) => {
    const y = fromYear + Math.floor(i / 4)
    return [`Q${(i % 4) + 1}.${y}-${String((y + 1) % 100).padStart(2, '0')}`, value(i)]
  })
  const flatOld = quarters(2010, 52, () => 100), flatNew = quarters(2022, 16, () => 50)
  near(officialAppreciation(10, flatOld, flatNew).pct, 0, 1e-9)
  const doublingNew = quarters(2022, 16, (i) => 50 * Math.pow(2, i / 40))
  const doublingOld = quarters(2010, 52, (i) => 100 * Math.pow(2, (i - 48) / 40))
  near(officialAppreciation(10, doublingOld, doublingNew).pct, 7.177, 0.01)
})

test('data freshness: knows which quarter is next and when it is overdue', async () => {
  const { hpiStatus, quarterEnd, nextQuarter } = await import('../src/data/hpi.js')
  assert.equal(quarterEnd('Q1.2026-27').toISOString().slice(0, 10), '2026-06-30')
  assert.equal(quarterEnd('Q4.2026-27').toISOString().slice(0, 10), '2027-03-31')
  assert.equal(nextQuarter('Q1.2026-27'), 'Q2.2026-27')
  assert.equal(nextQuarter('Q4.2026-27'), 'Q1.2027-28')
  assert.equal(nextQuarter('Q4.2098-99'), 'Q1.2099-00')
  const series = [['Q1.2026-27', 127.1]]
  // Q2 (Jul–Sep 2026) ends 30 Sep; due about 65 days later, on 4 Dec
  assert.equal(hpiStatus(new Date('2026-11-16'), series).updateDue, false)
  assert.equal(hpiStatus(new Date('2026-12-10'), series).updateDue, true)
  assert.equal(hpiStatus(new Date('2026-12-10'), series).stale, false)
  assert.equal(hpiStatus(new Date('2027-04-10'), series).stale, true)
  assert.equal(hpiStatus(new Date('2026-12-10'), series).next, 'Q2.2026-27')
})

test('each area starts at the official end of its appreciation range', async () => {
  const { AREAS, CITY_APPRECIATION } = await import('../src/data/areas.js')
  for (const a of AREAS) {
    assert.ok(a.appreciationPct < a.appreciationListingPct, a.name)
    assert.ok(a.appreciationPct > 3 && a.appreciationListingPct < 12, a.name)
    assert.equal(defaultsFor(a.name).appreciationPct, a.appreciationPct)
  }
  const mean = AREAS.reduce((s, a) => s + a.appreciationPct, 0) / AREAS.length
  near(mean, CITY_APPRECIATION.officialPct, 0.06) // area average matches the RBI city rate
})

test('exit tax on the home is charged on the gain over what it cost to acquire', () => {
  // 1 Cr home, 10% a year for a year -> 1.1 Cr; cost includes 7.6% duty + registration
  const inputs = bare({ appreciationPct: 10, stampDutyPct: 5.6, registrationPct: 2 })
  const untaxed = simulate(inputs).buyNetWorthAtHorizon
  const taxed = simulate({ ...inputs, homeExitTaxPct: 12.5 }).buyNetWorthAtHorizon
  near(untaxed - taxed, (11000000 - 10760000) * 0.125, 0.5)
  // no gain, no tax
  const flat = bare({ homeExitTaxPct: 12.5, stampDutyPct: 5.6 })
  near(simulate(flat).buyNetWorthAtHorizon, 10000000, 0.01)
})

test('exit tax on investments is charged on the gain above the allowance', () => {
  // renter keeps 1 Cr invested at 10% for a year: gain 10L
  const inputs = bare({ investReturnPct: 10 })
  const untaxed = simulate(inputs).rentNetWorthAtHorizon
  near(untaxed - simulate({ ...inputs, investExitTaxPct: 12.5 }).rentNetWorthAtHorizon, 125000, 0.5)
  near(untaxed - simulate({ ...inputs, investExitTaxPct: 12.5, investExitExemption: 125000 }).rentNetWorthAtHorizon, 109375, 0.5)
  // money paid in along the way is not counted as gain
  const saving = bare({ downPayment: 2000000, rentMonthly: 20000, investExitTaxPct: 12.5, horizonYears: 3 })
  near(simulate(saving).rentNetWorthAtHorizon, simulate({ ...saving, investExitTaxPct: 0 }).rentNetWorthAtHorizon, 0.01)
})

test('scenario switches control which exit taxes apply', async () => {
  const { toSimInputs: sim, investOption } = await import('../src/lib/scenario.js')
  const d = defaultsFor()
  assert.equal(sim(d).homeExitTaxPct, 12.5)
  assert.equal(sim(d).investExitTaxPct, 0) // FD: taxed yearly instead
  assert.equal(sim({ ...d, reinvestInHome: true }).homeExitTaxPct, 0)
  const equity = { ...d, ...investOption('equity', d) }
  assert.equal(sim(equity).investExitTaxPct, 12.5)
  assert.equal(sim(equity).investTaxPct, 0)
  assert.equal(sim({ ...equity, countExitTax: false }).investExitTaxPct, 0)
  assert.equal(sim({ ...equity, countExitTax: false }).homeExitTaxPct, 0)
  assert.deepEqual(investOption('fd', d), { investReturnPct: 7, investTaxPct: d.marginalTaxPct, investExitTaxPct: 0 })
})
