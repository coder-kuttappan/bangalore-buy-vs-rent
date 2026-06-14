import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  simulate, appreciationTippingPoint, investReturnTippingPoint, findBreakEven,
} from './lib/calc'
import { inr, inrFull, years } from './lib/format'
import { AREAS, BHK_PRESETS, DEFAULTS, DATA_ASOF } from './data/areas'
import { MARKET } from './markets/india'

function defaultRent(area, bhkLabel) {
  // rentNew = rent for the same new-gated segment the price describes, so the
  // buy and rent sides compare like-for-like (not new-flat price vs old-flat rent)
  if (bhkLabel === '1 BHK') return Math.round(area.rentNew['2 BHK'] * 0.7 / 500) * 500
  return area.rentNew[bhkLabel]
}

function ConfBadge({ level }) {
  const tone =
    level === 'high' || level === 'med-high'
      ? 'bg-emerald-100 text-emerald-700'
      : level === 'low'
      ? 'bg-rose-100 text-rose-700'
      : 'bg-amber-100 text-amber-700'
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
      {level} confidence
    </span>
  )
}

function Field({ label, hint, dirty, onReset, children }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        <span className="flex items-baseline gap-1.5">
          {hint && <span className="text-xs text-stone-400">{hint}</span>}
          {dirty && onReset && (
            <button
              type="button"
              title="Reset to our default for this area"
              onClick={(e) => { e.preventDefault(); onReset() }}
              className="text-xs text-stone-400 transition hover:text-teal-700"
            >
              ↺ reset
            </button>
          )}
        </span>
      </div>
      <div className="mt-1">{children}</div>
    </label>
  )
}

function Num({ value, onChange, step = 1, min = 0, suffix }) {
  // hold raw text while typing so clearing the field doesn't snap to 0
  const [text, setText] = useState(String(value))
  useEffect(() => { setText(String(value)) }, [value])
  return (
    <div className="relative">
      <input
        type="number"
        value={text}
        step={step}
        min={min}
        onChange={(e) => {
          setText(e.target.value)
          const n = Number(e.target.value)
          if (e.target.value !== '' && !Number.isNaN(n)) onChange(n)
        }}
        onBlur={() => {
          if (text === '' || Number.isNaN(Number(text))) setText(String(value))
        }}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm
                   focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">
          {suffix}
        </span>
      )}
    </div>
  )
}

export default function App() {
  const [areaName, setAreaName] = useState('Whitefield')
  const [bhk, setBhk] = useState('2 BHK')
  const [sqft, setSqft] = useState(1150)
  const area = AREAS.find((a) => a.name === areaName)

  const [pricePerSqft, setPricePerSqft] = useState(area.pricePerSqft.mid)
  const [rentMonthly, setRentMonthly] = useState(defaultRent(area, '2 BHK'))
  const [downPaymentPct, setDownPaymentPct] = useState(20)
  const [adv, setAdv] = useState({ ...DEFAULTS, appreciationPct: area.appreciationPct })
  const [showAdv, setShowAdv] = useState(false)
  const [showCosts, setShowCosts] = useState(false)
  const [showMethod, setShowMethod] = useState(false)
  const [showLeftOut, setShowLeftOut] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showApprNote, setShowApprNote] = useState(false)
  // remembers where the invest-discipline slider was before "It gets spent"
  // zeroed it, so switching back to FD / mutual funds restores that value
  const [prevInvestFraction, setPrevInvestFraction] = useState(DEFAULTS.investFraction)

  const price = pricePerSqft * sqft
  const downPayment = price * downPaymentPct / 100

  // maintenance and property tax track flat size — recompute whenever sqft changes
  useEffect(() => {
    setAdv((prev) => ({
      ...prev,
      maintenanceMonthly: Math.round(sqft * DEFAULTS.maintenancePerSqftMonthly),
      propertyTaxAnnual: Math.round(sqft * DEFAULTS.propertyTaxPerSqftAnnual),
    }))
  }, [sqft])

  function pickArea(name) {
    const a = AREAS.find((x) => x.name === name)
    setAreaName(name)
    setPricePerSqft(a.pricePerSqft.mid)
    setRentMonthly(defaultRent(a, bhk))
    setAdv((prev) => ({ ...prev, appreciationPct: a.appreciationPct }))
  }

  // restore everything to our researched defaults for the current area + size
  function resetAll() {
    const a = area
    const preset = BHK_PRESETS.find((b) => b.label === bhk)
    setSqft(preset.sqft)
    setPricePerSqft(a.pricePerSqft.mid)
    setRentMonthly(defaultRent(a, bhk))
    setDownPaymentPct(20)
    setAdv({ ...DEFAULTS, appreciationPct: a.appreciationPct })
    setPrevInvestFraction(DEFAULTS.investFraction)
  }

  function pickReturn(val) {
    if (val === 0) {
      // "it gets spent" — stash the current slider position, then zero it
      if (adv.investFraction > 0) setPrevInvestFraction(adv.investFraction)
      setAdv({ ...adv, investReturnPct: 0, investFraction: 0 })
    } else {
      // FD / mutual funds — if the slider was zeroed by "spent", restore it;
      // otherwise leave whatever the user has dialed in
      setAdv({
        ...adv,
        investReturnPct: val,
        investFraction: adv.investFraction === 0 ? prevInvestFraction : adv.investFraction,
      })
    }
  }

  function pickBhk(label) {
    const preset = BHK_PRESETS.find((b) => b.label === label)
    setBhk(label)
    setSqft(preset.sqft)
    setRentMonthly(defaultRent(area, label))
  }

  const simInputs = useMemo(
    () => ({
      price,
      downPayment,
      loanRatePct: adv.loanRatePct,
      tenureYears: adv.tenureYears,
      rentMonthly,
      rentInflationPct: adv.rentInflationPct,
      appreciationPct: adv.appreciationPct,
      investReturnPct: adv.investReturnPct,
      investFraction: adv.investFraction,
      horizonYears: adv.horizonYears,
      stampDutyPct: adv.stampDutyPct,
      registrationPct: adv.registrationPct,
      maintenanceMonthly: adv.maintenanceMonthly,
      propertyTaxAnnual: adv.propertyTaxAnnual,
      sellingCostPct: adv.sellingCostPct,
      securityDepositMonths: adv.securityDepositMonths,
      gstPct: adv.propertyType === 'under-construction'
        ? MARKET.cost.gstPct.underConstruction
        : MARKET.cost.gstPct.ready,
      interiorsCost: adv.interiorsBudget,
      claimTaxBenefit: adv.claimTaxBenefit,
      marginalTaxPct: adv.marginalTaxPct,
      interestDeductionCap: MARKET.tax.homeLoanInterestCap,
    }),
    [price, downPayment, rentMonthly, sqft, adv],
  )

  const result = useMemo(() => simulate(simInputs), [simInputs])
  const verdictBuy = result.verdict === 'buy'

  // true break-even, independent of the graph window (rent keeps rising, loan
  // finishes at tenure — the crossover can land well past "compare over")
  const breakEven = useMemo(() => findBreakEven(simInputs), [simInputs])
  const breakEvenYear = breakEven === null ? null : new Date().getFullYear() + Math.round(breakEven)

  // the two levers that flip the verdict, everything else held
  const tippingAppreciation = useMemo(() => appreciationTippingPoint(simInputs), [simInputs])
  const tippingInvestReturn = useMemo(() => investReturnTippingPoint(simInputs), [simInputs])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Buy vs Rent <span className="text-teal-700">Bangalore</span>
            <span className="ml-2 align-middle rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
              beta
            </span>
          </h1>
          <p className="text-stone-500">
            The actual math, by area. No broker, no agenda.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span>Area data as of {DATA_ASOF}</span>
          <span>·</span>
          <div className="relative">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-2 py-0.5 font-medium text-stone-500 transition hover:bg-stone-100"
            >
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border border-stone-400 text-[9px] font-bold">
                i
              </span>
              Disclaimer
            </button>
            {showInfo && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowInfo(false)} />
                <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-stone-200 bg-white p-4 text-left text-sm leading-relaxed text-stone-600 shadow-lg">
                  <strong className="text-stone-800">These are estimates, not quotes.</strong>{' '}
                  Prices and rents come from property listing sites, which usually run higher
                  than the price flats actually sell or rent for — so we adjust them down.
                  Appreciation (how fast prices rise) is the least certain figure: there's no
                  official long-term price record for each area, so we estimate it from listing
                  trends and pull it toward a realistic city-wide average. Treat every number
                  as a ballpark.
                  <strong className="mt-2 block text-stone-800">
                    Do not make a purchase decision solely based on this tool.
                  </strong>
                  Get real numbers for your specific flat, area and loan first.
                  <button
                    onClick={() => setShowInfo(false)}
                    className="mt-3 block text-xs font-medium text-teal-700"
                  >
                    Got it
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* inputs */}
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={resetAll}
              className="text-xs text-stone-400 transition hover:text-teal-700"
            >
              ↺ Reset to defaults
            </button>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
            <Field label="Area">
              <select
                value={areaName}
                onChange={(e) => pickArea(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm
                           focus:border-teal-600 focus:outline-none"
              >
                {AREAS.map((a) => (
                  <option key={a.name}>{a.name}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-stone-400">
                Defaults describe: <span className="font-medium text-stone-500">{area.segment}</span>
              </p>
            </Field>

            <Field label="Size">
              <div className="flex gap-2">
                {BHK_PRESETS.map((b) => (
                  <button
                    key={b.label}
                    onClick={() => pickBhk(b.label)}
                    className={`rounded-full px-3 py-1.5 text-sm transition ${
                      bhk === b.label
                        ? 'bg-teal-700 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
                <div className="ml-auto w-24">
                  <Num value={sqft} onChange={setSqft} step={50} suffix="sqft" />
                </div>
              </div>
            </Field>

            <Field
              label="Price per sqft"
              dirty={pricePerSqft !== area.pricePerSqft.mid}
              onReset={() => setPricePerSqft(area.pricePerSqft.mid)}
              hint={
                <span className="inline-flex items-center gap-1.5">
                  range {inr(area.pricePerSqft.low)}–{inr(area.pricePerSqft.high)}{' '}
                  <ConfBadge level={area.confidence} />
                </span>
              }
            >
              <Num value={pricePerSqft} onChange={setPricePerSqft} step={100} suffix="₹/sqft" />
            </Field>

            <div className="rounded-lg bg-stone-50 px-3 py-2 text-sm">
              Property price: <strong>{inr(price)}</strong>{' '}
              <span className="text-stone-400">({inrFull(price)})</span>
            </div>

            <Field label="Down payment" hint={inr(downPayment)}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={downPaymentPct}
                  onChange={(e) => setDownPaymentPct(Number(e.target.value))}
                  className="flex-1 accent-teal-700"
                />
                <span className="w-12 text-right text-sm font-medium">{downPaymentPct}%</span>
              </div>
            </Field>

            <Field
              label="Monthly rent for an equivalent home"
              hint={`typical ${inr(defaultRent(area, bhk))}`}
              dirty={rentMonthly !== defaultRent(area, bhk)}
              onReset={() => setRentMonthly(defaultRent(area, bhk))}
            >
              <Num value={rentMonthly} onChange={setRentMonthly} step={1000} suffix="₹/mo" />
            </Field>

            <Field
              label="Security deposit"
              hint={`${inr(adv.securityDepositMonths * rentMonthly)} locked up`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={12}
                  step={1}
                  value={adv.securityDepositMonths}
                  onChange={(e) => setAdv({ ...adv, securityDepositMonths: Number(e.target.value) })}
                  className="flex-1 accent-teal-700"
                />
                <span className="w-20 text-right text-sm font-medium">
                  {adv.securityDepositMonths} mo
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-400">
                Refundable, but sits idle earning nothing while you rent — the lost
                returns are a real cost.
              </p>
            </Field>

            <div className="border-t border-stone-100 pt-4 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                The two numbers that decide this
              </div>

              <Field
                label="Property appreciation"
                dirty={adv.appreciationPct !== area.appreciationPct}
                onReset={() => setAdv({ ...adv, appreciationPct: area.appreciationPct })}
                hint={
                  <span className="inline-flex items-center gap-1.5">
                    {area.name} ~{area.appreciationPct}%/yr <ConfBadge level={area.appConfidence} />
                  </span>
                }
              >
                <Num
                  value={adv.appreciationPct}
                  step={0.5}
                  onChange={(v) => setAdv({ ...adv, appreciationPct: v })}
                  suffix="%/yr"
                />
                <button
                  type="button"
                  onClick={() => setShowApprNote(!showApprNote)}
                  className="mt-1.5 text-xs text-teal-700 hover:underline"
                >
                  {showApprNote ? 'Hide' : 'Why this number?'}
                </button>
                {showApprNote && (
                  <p className="mt-1 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-500">
                    {area.notes} <span className="text-stone-400">({area.appConfidence} confidence)</span>
                  </p>
                )}
              </Field>

              <Field label="Investment return on the money you don't sink into a home">
                <Num
                  value={adv.investReturnPct}
                  step={0.5}
                  onChange={(v) => setAdv({ ...adv, investReturnPct: v })}
                  suffix="%/yr"
                />
                <div className="mt-2 flex gap-2">
                  {[
                    ['FD', 7],
                    ['Mutual funds', 11],
                    ['It gets spent', 0],
                  ].map(([label, val]) => (
                    <button
                      key={label}
                      onClick={() => pickReturn(val)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        adv.investReturnPct === val
                          ? 'bg-indigo-600 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {label} {val > 0 && `${val}%`}
                    </button>
                  ))}
                </div>
              </Field>

              <Field
                label="How much of the monthly gap you'd actually invest"
                hint={`${adv.investFraction}%`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={adv.investFraction}
                    onChange={(e) => setAdv({ ...adv, investFraction: Number(e.target.value) })}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="w-12 text-right text-sm font-medium">{adv.investFraction}%</span>
                </div>
                <p className="mt-1 text-xs text-stone-400">
                  An EMI forces you to save. The renter only comes out ahead if they
                  actually invest the difference — most don't.
                </p>
              </Field>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <button
              onClick={() => setShowCosts(!showCosts)}
              className="flex w-full items-center justify-between text-sm font-medium text-stone-700"
            >
              Costs &amp; taxes
              <span className="text-stone-400">{showCosts ? '−' : '+'}</span>
            </button>
            {showCosts && (
              <div className="mt-4 space-y-4">
                <Field label="Property type" hint={adv.propertyType === 'under-construction' ? `+${inr(price * MARKET.cost.gstPct.underConstruction / 100)} GST` : 'no GST'}>
                  <div className="flex gap-2">
                    {[
                      ['ready', 'Ready / resale'],
                      ['under-construction', 'Under-construction'],
                    ].map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => setAdv({ ...adv, propertyType: val })}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${
                          adv.propertyType === val
                            ? 'bg-teal-700 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    Under-construction flats attract 5% GST (1% for affordable housing).
                    Ready-to-move and resale have none.
                  </p>
                </Field>

                <Field label="Interiors budget" hint="set either — they stay linked">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Num
                        value={adv.interiorsBudget}
                        step={50000}
                        onChange={(v) => setAdv({ ...adv, interiorsBudget: v })}
                        suffix="₹ total"
                      />
                    </div>
                    <div className="w-28">
                      <Num
                        value={Math.round(adv.interiorsBudget / sqft)}
                        step={250}
                        onChange={(v) => setAdv({ ...adv, interiorsBudget: v * sqft })}
                        suffix="₹/sqft"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    A new flat needs interiors (kitchen, wardrobes, fixtures) before it's
                    livable — a cost the renter skips. Don't know the budget? The per-sqft
                    rate gives you a ballpark.
                  </p>
                </Field>

                <Field label="Which tax regime are you on?">
                  <div className="flex gap-2">
                    {[
                      [true, 'Old regime'],
                      [false, 'New regime'],
                    ].map(([val, label]) => (
                      <button
                        key={label}
                        onClick={() => setAdv({ ...adv, claimTaxBenefit: val })}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${
                          adv.claimTaxBenefit === val
                            ? 'bg-teal-700 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    The old regime lets you deduct up to ₹2L/yr of home-loan interest
                    (Section 24b); the new regime gives no benefit on a home you live in.
                    Most salaried people default to the new regime unless they actively
                    claim deductions. (80C principal is excluded — usually already used up.)
                  </p>
                  {adv.claimTaxBenefit && (
                    <div className="mt-3">
                      <Field label="Your income-tax slab">
                        <Num
                          value={adv.marginalTaxPct}
                          step={5}
                          onChange={(v) => setAdv({ ...adv, marginalTaxPct: v })}
                          suffix="%"
                        />
                      </Field>
                    </div>
                  )}
                </Field>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <button
              onClick={() => setShowAdv(!showAdv)}
              className="flex w-full items-center justify-between text-sm font-medium text-stone-700"
            >
              Assumptions
              <span className="text-stone-400">{showAdv ? '−' : '+'}</span>
            </button>
            {showAdv && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  ['loanRatePct', 'Loan rate %', 0.1],
                  ['tenureYears', 'Loan tenure (yrs)', 1],
                  ['rentInflationPct', 'Rent inflation %/yr', 0.5],
                  ['stampDutyPct', 'Stamp duty %', 0.1],
                  ['registrationPct', 'Registration %', 0.1],
                  ['maintenanceMonthly', 'Maintenance ₹/mo', 500],
                  ['propertyTaxAnnual', 'Property tax ₹/yr', 1000],
                  ['sellingCostPct', 'Selling cost %', 0.5],
                ].map(([key, label, step]) => (
                  <Field key={key} label={label}>
                    <Num
                      value={adv[key]}
                      step={step}
                      onChange={(v) => setAdv({ ...adv, [key]: v })}
                    />
                  </Field>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* results */}
        <div className="space-y-4">
          <div
            className={`rounded-2xl p-6 text-white shadow-sm ${
              verdictBuy ? 'bg-teal-700' : 'bg-indigo-700'
            }`}
          >
            <div className="text-sm uppercase tracking-wide opacity-80">
              On your assumptions, after {adv.horizonYears} years you're better off
            </div>
            <div className="mt-1 text-4xl font-bold">
              {verdictBuy ? 'Buying' : 'Renting'}
            </div>
            <div className="mt-2 opacity-90">
              by <strong>{inr(result.margin)}</strong> in net worth
            </div>
            <div className="mt-3 space-y-2 border-t border-white/20 pt-3 text-sm opacity-90">
              <div>
                {tippingAppreciation === null ? (
                  <>Even at 30%/yr appreciation, renting still comes out ahead here.</>
                ) : tippingAppreciation <= 0 ? (
                  <>Buying wins at any positive appreciation rate.</>
                ) : (
                  <>
                    Buying wins if appreciation beats{' '}
                    <strong>{tippingAppreciation.toFixed(1)}%/yr</strong>
                    {' '}— you've assumed {adv.appreciationPct}%.
                  </>
                )}
              </div>
              <div>
                {tippingInvestReturn === null ? (
                  <>Even earning 30%/yr on your savings, renting can't catch up — that's the leverage talking.</>
                ) : tippingInvestReturn <= 0 ? (
                  <>Renting wins at any realistic investment return.</>
                ) : (
                  <>
                    Flip it: renting wins if your savings earn more than{' '}
                    <strong>{tippingInvestReturn.toFixed(1)}%/yr</strong>
                    {' '}— you've assumed {adv.investReturnPct}%. Equity mutual funds have
                    historically returned ~11%.
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              ['EMI', inr(result.emi) + '/mo'],
              ['Cash needed upfront', inr(downPayment + result.upfrontCosts)],
              [
                'Break-even',
                breakEven === null
                  ? 'Beyond 40 yrs'
                  : `${years(breakEven)} · ${breakEvenYear}`,
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-stone-400">{label}</div>
                <div className="mt-1 text-lg font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-medium text-stone-700">
              Net worth over {adv.horizonYears} years
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={result.series} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="year" tickFormatter={(y) => `${y}y`} stroke="#a8a29e" fontSize={12} />
                <YAxis tickFormatter={inr} stroke="#a8a29e" fontSize={12} width={70} />
                <Tooltip formatter={(v) => inr(v)} labelFormatter={(y) => `Year ${y}`} />
                <Legend />
                {breakEven !== null && breakEven > 0 && breakEven <= adv.horizonYears && (
                  <ReferenceLine x={Math.round(breakEven)} stroke="#a8a29e" strokeDasharray="4 4" />
                )}
                <Line type="monotone" dataKey="buyNetWorth" name="Buy" stroke="#0f766e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rentNetWorth" name="Rent" stroke="#4338ca" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-3 border-t border-stone-100 pt-3">
              <div className="flex items-center gap-3">
                <span className="whitespace-nowrap text-sm text-stone-600">Compare over</span>
                <input
                  type="range"
                  min={3}
                  max={40}
                  step={1}
                  value={adv.horizonYears}
                  onChange={(e) => setAdv({ ...adv, horizonYears: Number(e.target.value) })}
                  className="flex-1 accent-teal-700"
                />
                <span className="w-16 text-right text-sm font-medium">{adv.horizonYears} yrs</span>
              </div>
              {breakEven !== null && breakEven > adv.horizonYears && (
                <p className="mt-2 text-xs text-stone-400">
                  Buying breaks even at year {Math.round(breakEven)} ({breakEvenYear}) — beyond the
                  window shown. Drag right to see the crossover.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <button
              onClick={() => setShowMethod(!showMethod)}
              className="flex w-full items-center justify-between text-sm font-medium text-stone-700"
            >
              How we got these numbers
              <span className="text-stone-400">{showMethod ? '−' : '+'}</span>
            </button>
            {showMethod && (
              <div className="mt-4 space-y-3 text-xs leading-relaxed text-stone-500">
                <p>
                  <strong className="text-stone-700">The math is exact.</strong> EMI,
                  amortization, stamp duty (5% + cess) and registration (2%, doubled from
                  1% in Aug 2025) are Karnataka government rates and standard loan formulas.
                </p>
                <p>
                  <strong className="text-stone-700">Prices</strong> come from listing
                  aggregators (99acres, Squareyards, HexaHome), which run 10–30% above
                  registered transaction values. The mid leans toward a realistic deal
                  price but still carries listing bias.
                </p>
                <p>
                  <strong className="text-stone-700">Appreciation is the soft number.</strong>{' '}
                  No official long-term price record exists for each area. Each rate is
                  estimated from property-listing price trends over ~10 years, then trimmed by
                  about 3 points toward the realistic ~8% city-wide average, adjusted for how
                  much new supply each area has and how stretched its prices already are.
                  Treat it as a defensible estimate, not a measurement — the confidence badge
                  tells you how much to trust each area.
                </p>
                <p>
                  <strong className="text-stone-700">The boom is front-loaded.</strong> Roughly
                  two-thirds of the last decade's gain happened in 2021–2025. These rates
                  assume that surge roughly sustains — optimistic for peaked cores
                  (Koramangala, Indiranagar), more plausible for corridors with live
                  infrastructure (Sarjapur metro, the airport belt). That's exactly why the
                  verdict card shows the appreciation rate where the answer flips — so you
                  don't have to trust our single estimate.
                </p>
                <p>
                  <strong className="text-stone-700">Rents</strong> are set for the same kind
                  of flat the price describes — a recently-built apartment in a gated complex,
                  not an older standalone building — by applying a realistic rental yield to the
                  price. So the buy and rent sides compare the <em>same</em> home, instead of
                  pricing a new flat against the rent of an old one.
                </p>
                <p>
                  <strong className="text-stone-700">Costs &amp; tax are modelled.</strong> GST on
                  under-construction flats, interiors, and the Section 24b interest
                  deduction (old regime) are all in — toggle them under <em>Costs &amp; taxes</em>.
                </p>
                <p className="text-stone-400">
                  This is arithmetic, not advice. It assumes the renter actually invests the
                  difference (the slider lets you dial in how much they really would). Area data
                  as of {DATA_ASOF}. Override any default with a real quote for your own decision.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <button
              onClick={() => setShowLeftOut(!showLeftOut)}
              className="flex w-full items-center justify-between text-sm font-medium text-stone-700"
            >
              What this leaves out
              <span className="text-stone-400">{showLeftOut ? '−' : '+'}</span>
            </button>
            {showLeftOut && (
              <ul className="mt-4 space-y-2 text-xs leading-relaxed text-stone-500">
                <li>
                  <strong className="text-stone-700">The risk of a bad year to sell.</strong>{' '}
                  Appreciation and returns are smooth averages — no crashes or booms. The real
                  danger, a downturn the year you need to sell, isn't modelled yet.
                </li>
                <li>
                  <strong className="text-stone-700">Selling isn't instant or free.</strong> We
                  assume you can sell at market value any time; property is illiquid and can take
                  months, and the 2% selling cost is on the light side.
                </li>
                <li>
                  <strong className="text-stone-700">The interest rate never moves.</strong> Real
                  home loans float — a rate rise would raise your EMI and shift the verdict.
                </li>
                <li>
                  <strong className="text-stone-700">Exit tax (LTCG).</strong> Capital-gains tax on
                  the home sale and on the renter's investments isn't counted yet.
                </li>
                <li>
                  <strong className="text-stone-700">The non-financial stuff.</strong> Security,
                  the freedom to move, not dealing with a landlord — none of that shows up in a
                  net-worth number.
                </li>
                <li>
                  <strong className="text-stone-700">Renting it out.</strong> This compares buying
                  to live in vs renting to live in — not buying as an investment to let.
                </li>
                <li className="text-stone-400">
                  We're adding these one by one. Each is a known gap, owned on purpose — not a
                  thing we hope you don't notice.
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
