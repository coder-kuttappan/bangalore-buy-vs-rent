// Buy-vs-rent simulation, month by month.
//
// Methodology: compare net worth at the end of each month under two scenarios
// that start with the same cash.
//
//   BUY:  pay down payment + transaction costs upfront, pay EMI + maintenance
//         + property tax monthly. Net worth = home value (minus selling costs
//         and tax on the gain) - outstanding loan + anything invested when
//         owning was cheaper.
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
    securityDeposit = 0,   // ₹ locked as a refundable deposit (landlord's number)
    gstPct = 0,            // GST on under-construction property (5%/1%); 0 for ready/resale
    interiorsCost = 0,     // ₹ upfront fit-out the buyer pays, the renter doesn't
    claimTaxBenefit = false, // Sec 24b interest deduction (old regime only)
    marginalTaxPct = 0,    // buyer's income-tax slab, for the 24b benefit
    interestDeductionCap = 200000, // annual cap on deductible loan interest (Sec 24b)
    costInflationPct = 0,  // annual % rise in maintenance + property tax
    investTaxPct = 0,      // % of each year's investment return lost to income tax
                           // (FD interest is taxed at slab); applies to BOTH portfolios
    basicSalaryAnnual = 0, // ₹ — enables the renter's HRA exemption (old regime only)
    hraCapPctOfBasic = 50, // HRA exemption ceiling as % of basic (metro rule)
    // Exit taxes — what is owed if each side cashed out at that point.
    homeExitTaxPct = 0,     // capital-gains tax on the home sale
    investExitTaxPct = 0,   // capital-gains tax on investment gains (equity funds)
    investExitExemption = 0, // ₹ of investment gain that is tax-free on exit
  } = inputs

  const loan = Math.max(price - downPayment, 0)
  const monthlyEmi = emi(loan, loanRatePct, tenureYears)
  // upfront the buyer sinks: stamp duty + registration + GST on the price, plus
  // one-time interiors. The renter avoids all of it and keeps it invested.
  const upfrontCosts = price * (stampDutyPct + registrationPct + gstPct) / 100 + interiorsCost
  const monthlyLoanRate = loanRatePct / 100 / 12
  // returns are taxed as they accrue, so both sides compound at the post-tax rate
  const netInvestReturnPct = investReturnPct * (1 - investTaxPct / 100)
  const monthlyInvestRate = Math.pow(1 + netInvestReturnPct / 100, 1 / 12) - 1
  const monthlyAppreciation = Math.pow(1 + appreciationPct / 100, 1 / 12) - 1

  // the renter's deposit is refundable, but it sits idle earning nothing — so it
  // comes out of the cash they'd otherwise invest, and is added back (nominal)
  // in net worth. The lost compounding is the real cost. Held flat (a
  // simplification — in reality it tracks rent on renewal).
  const deposit = securityDeposit

  let loanBalance = loan
  let homeValue = price
  let rent = rentMonthly
  let maintenance = maintenanceMonthly
  let propertyTax = propertyTaxAnnual
  let yearRent = 0       // rent paid in the current year, for the HRA exemption
  let renterPortfolio = downPayment + upfrontCosts - deposit // cash invested, deposit set aside
  let buyerPortfolio = 0
  // money each side has put in, so the gain on exit can be worked out
  let renterPaidIn = renterPortfolio
  let buyerPaidIn = 0
  // what the home cost to acquire, for the gain on sale: price plus stamp duty,
  // registration and GST. Interiors are left out — most fit-out is not accepted
  // as a cost of improvement.
  const homeCost = price * (1 + (stampDutyPct + registrationPct + gstPct) / 100)
  let totalInterest = 0
  let yearInterest = 0   // interest paid in the current year, for the 24b cap
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
      yearInterest += interest
      loanBalance -= principalPaid
      emiThisMonth = interest + principalPaid
    }

    const buyerOutflow = emiThisMonth + maintenance + propertyTax / 12
    const renterOutflow = rent
    totalRentPaid += rent
    yearRent += rent

    // whoever spends less invests the difference — but only the share the
    // household actually puts away rather than absorbs into lifestyle
    const invested = (investFraction / 100)
    const diff = buyerOutflow - renterOutflow
    if (diff > 0) {
      renterPortfolio += diff * invested
      renterPaidIn += diff * invested
    } else {
      buyerPortfolio += -diff * invested
      buyerPaidIn += -diff * invested
    }

    // year-end, old regime only: each side's income-tax saving goes into its
    // own pocket — modelled as money they invest.
    //   buyer:  Sec 24b refund on loan interest (capped at ₹2L)
    //   renter: HRA exemption = least of HRA received, rent − 10% of basic, and
    //           the cap % of basic. HRA received is assumed to equal the cap
    //           (the usual salary structure), and basic is held flat.
    // A buyer living in their own home gets no HRA; a renter gets no 24b.
    // Then reset the yearly counters and step rent and ownership costs up.
    if (m % 12 === 0) {
      if (claimTaxBenefit) {
        const deductible = Math.min(yearInterest, interestDeductionCap)
        buyerPortfolio += deductible * (marginalTaxPct / 100)
        buyerPaidIn += deductible * (marginalTaxPct / 100)
        if (basicSalaryAnnual > 0) {
          const hraExempt = Math.max(0, Math.min(
            yearRent - 0.1 * basicSalaryAnnual,
            basicSalaryAnnual * hraCapPctOfBasic / 100,
          ))
          renterPortfolio += hraExempt * (marginalTaxPct / 100)
          renterPaidIn += hraExempt * (marginalTaxPct / 100)
        }
      }
      yearInterest = 0
      yearRent = 0
      rent *= 1 + rentInflationPct / 100
      maintenance *= 1 + costInflationPct / 100
      propertyTax *= 1 + costInflationPct / 100
    }

    const snap = snapshot(m)
    if (breakEvenMonth === null && m > 0 && snap.buyNetWorth >= snap.rentNetWorth) {
      breakEvenMonth = m
    }
    if (m % 12 === 0) series.push(snap)
  }

  // tax owed on cashing out a portfolio: a flat rate on the gain above the
  // tax-free allowance
  function portfolioExitTax(value, paidIn) {
    const gain = Math.max(value - paidIn - investExitExemption, 0)
    return gain * investExitTaxPct / 100
  }

  // Net worth if each side cashed out this month: the buyer sells the home
  // (less selling costs and tax on the gain) and clears the loan; both pay
  // tax on their investment gains.
  function snapshot(m) {
    const saleProceeds = homeValue * (1 - sellingCostPct / 100)
    const homeTax = Math.max(saleProceeds - homeCost, 0) * homeExitTaxPct / 100
    return {
      year: m / 12,
      buyNetWorth: saleProceeds - homeTax - loanBalance
        + buyerPortfolio - portfolioExitTax(buyerPortfolio, buyerPaidIn),
      rentNetWorth: renterPortfolio - portfolioExitTax(renterPortfolio, renterPaidIn) + deposit,
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
