// Buy-vs-rent simulation, month by month.
//
// Methodology: compare net worth at the end of each month under two scenarios
// that start with the same cash.
//
//   BUY:  pay down payment + transaction costs upfront, pay EMI + maintenance
//         + property tax monthly. Net worth = home value (minus selling costs)
//         - outstanding loan + anything invested when owning was cheaper.
//   RENT: invest the upfront cash instead, pay rent monthly (inflating yearly).
//         Whenever owning costs more per month than renting, the renter invests
//         the difference; whenever renting costs more, the buyer invests it.
//         Net worth = investment portfolio.
//
// Break-even = first month the buyer's net worth catches up.

export function emi(principal, annualRatePct, years) {
  if (principal <= 0) return 0
  const r = annualRatePct / 100 / 12
  const n = years * 12
  if (r === 0) return principal / n
  const f = Math.pow(1 + r, n)
  return (principal * r * f) / (f - 1)
}

export function simulate(inputs) {
  const {
    price,                 // total property price ₹
    downPayment,           // ₹
    loanRatePct,           // annual %
    tenureYears,
    rentMonthly,           // ₹ for the equivalent home
    rentInflationPct,      // annual %
    appreciationPct,       // annual %
    investReturnPct,       // annual % — what the renter's cash earns
    investFraction = 100,  // % of the monthly surplus actually invested (vs spent)
    horizonYears,
    stampDutyPct,
    registrationPct,
    maintenanceMonthly,    // ₹ owner-paid society maintenance
    propertyTaxAnnual,     // ₹
    sellingCostPct,        // brokerage etc. on eventual sale
    securityDepositMonths = 0, // months of rent locked as a refundable deposit
  } = inputs

  const loan = Math.max(price - downPayment, 0)
  const monthlyEmi = emi(loan, loanRatePct, tenureYears)
  const upfrontCosts = price * (stampDutyPct + registrationPct) / 100
  const monthlyLoanRate = loanRatePct / 100 / 12
  const monthlyInvestRate = Math.pow(1 + investReturnPct / 100, 1 / 12) - 1
  const monthlyAppreciation = Math.pow(1 + appreciationPct / 100, 1 / 12) - 1

  // the renter's deposit is refundable, but it sits idle earning nothing — so it
  // comes out of the cash they'd otherwise invest, and is added back (nominal)
  // in net worth. The lost compounding is the real cost. Held flat at the
  // starting level (a simplification — in reality it tracks rent on renewal).
  const deposit = securityDepositMonths * rentMonthly

  let loanBalance = loan
  let homeValue = price
  let rent = rentMonthly
  let renterPortfolio = downPayment + upfrontCosts - deposit // cash invested, deposit set aside
  let buyerPortfolio = 0
  let totalInterest = 0
  let totalRentPaid = 0
  let breakEvenMonth = null

  const months = horizonYears * 12
  const series = [snapshot(0)]

  for (let m = 1; m <= months; m++) {
    // grow assets
    renterPortfolio *= 1 + monthlyInvestRate
    buyerPortfolio *= 1 + monthlyInvestRate
    homeValue *= 1 + monthlyAppreciation

    // loan amortization
    let emiThisMonth = 0
    if (loanBalance > 0) {
      const interest = loanBalance * monthlyLoanRate
      const principalPaid = Math.min(monthlyEmi - interest, loanBalance)
      totalInterest += interest
      loanBalance -= principalPaid
      emiThisMonth = interest + principalPaid
    }

    const buyerOutflow = emiThisMonth + maintenanceMonthly + propertyTaxAnnual / 12
    const renterOutflow = rent
    totalRentPaid += rent

    // whoever spends less invests the difference — but only the share the
    // household actually puts away rather than absorbs into lifestyle
    const invested = (investFraction / 100)
    const diff = buyerOutflow - renterOutflow
    if (diff > 0) renterPortfolio += diff * invested
    else buyerPortfolio += -diff * invested

    // rent rises once a year
    if (m % 12 === 0) rent *= 1 + rentInflationPct / 100

    const snap = snapshot(m)
    if (breakEvenMonth === null && m > 0 && snap.buyNetWorth >= snap.rentNetWorth) {
      breakEvenMonth = m
    }
    if (m % 12 === 0) series.push(snap)
  }

  function snapshot(m) {
    return {
      year: m / 12,
      buyNetWorth: homeValue * (1 - sellingCostPct / 100) - loanBalance + buyerPortfolio,
      rentNetWorth: renterPortfolio + deposit,
    }
  }

  const last = series[series.length - 1]
  return {
    emi: monthlyEmi,
    loan,
    upfrontCosts,
    totalInterest,
    totalRentPaid,
    series,
    breakEvenMonth,
    breakEvenYears: breakEvenMonth === null ? null : breakEvenMonth / 12,
    buyNetWorthAtHorizon: last.buyNetWorth,
    rentNetWorthAtHorizon: last.rentNetWorth,
    verdict: last.buyNetWorth >= last.rentNetWorth ? 'buy' : 'rent',
    margin: Math.abs(last.buyNetWorth - last.rentNetWorth),
  }
}

// The true break-even — the year buying overtakes renting, found over a long
// window (default 40yr) so it doesn't depend on the graph's display horizon.
// Rent keeps inflating and the loan finishes at its tenure inside this window,
// both of which can push the crossover well past a short comparison period.
// Returns fractional years, or null if buying never catches up within maxYears.
export function findBreakEven(inputs, maxYears = 40) {
  return simulate({ ...inputs, horizonYears: maxYears }).breakEvenYears
}

// The appreciation rate at which buying and renting end up even at the horizon.
// Net worth is monotonic in appreciation (more appreciation only helps the
// buyer), so a binary search finds the crossover. Returns:
//   - a % number: buying wins above this rate
//   - 0: buying already wins even at 0% appreciation
//   - null: renting still wins at the top of the search range (hi)
export function appreciationTippingPoint(inputs, lo = 0, hi = 30) {
  const gapAt = (pct) => {
    const r = simulate({ ...inputs, appreciationPct: pct })
    return r.buyNetWorthAtHorizon - r.rentNetWorthAtHorizon
  }
  if (gapAt(lo) >= 0) return lo
  if (gapAt(hi) < 0) return null
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (gapAt(mid) >= 0) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}

// The investment return at which renting overtakes buying. A higher return on
// the renter's invested cash favours renting, so the gap (buy − rent) shrinks
// as return rises — there's a threshold above which renting wins. Returns:
//   - a % number: renting wins above this return
//   - null: buying wins even at the top of the search range (leverage too strong)
//   - 0: renting wins even at 0% return
export function investReturnTippingPoint(inputs, lo = 0, hi = 30) {
  const gapAt = (pct) => {
    const r = simulate({ ...inputs, investReturnPct: pct })
    return r.buyNetWorthAtHorizon - r.rentNetWorthAtHorizon
  }
  if (gapAt(lo) < 0) return 0
  if (gapAt(hi) >= 0) return null
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (gapAt(mid) >= 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}
