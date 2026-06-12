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
    horizonYears,
    stampDutyPct,
    registrationPct,
    maintenanceMonthly,    // ₹ owner-paid society maintenance
    propertyTaxAnnual,     // ₹
    sellingCostPct,        // brokerage etc. on eventual sale
  } = inputs

  const loan = Math.max(price - downPayment, 0)
  const monthlyEmi = emi(loan, loanRatePct, tenureYears)
  const upfrontCosts = price * (stampDutyPct + registrationPct) / 100
  const monthlyLoanRate = loanRatePct / 100 / 12
  const monthlyInvestRate = Math.pow(1 + investReturnPct / 100, 1 / 12) - 1
  const monthlyAppreciation = Math.pow(1 + appreciationPct / 100, 1 / 12) - 1

  let loanBalance = loan
  let homeValue = price
  let rent = rentMonthly
  let renterPortfolio = downPayment + upfrontCosts // cash the buyer spent upfront
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

    // whoever spends less invests the difference
    const diff = buyerOutflow - renterOutflow
    if (diff > 0) renterPortfolio += diff
    else buyerPortfolio += -diff

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
      rentNetWorth: renterPortfolio,
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
