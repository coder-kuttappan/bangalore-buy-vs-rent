import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  simulate, appreciationTippingPoint, investReturnTippingPoint, findBreakEven,
} from './lib/calc'
import { inr, inrFull, years } from './lib/format'
import { AREAS, BHK_PRESETS, DEFAULTS, DATA_ASOF, CITY_APPRECIATION } from './data/areas'
import { HPI_SOURCE_URL, hpiStatus } from './data/hpi'
import { MARKET } from './markets/india'
import {
  defaultRent, defaultsFor, sizeCosts, defaultInteriors, encodeScenario, decodeScenario, toSimInputs, dealPrice,
  investOption, compareAreas, FD_RETURN, EQUITY_RETURN,
} from './lib/scenario'
import Compare from './Compare'
import ShareQuote from './ShareQuote'
import { sharingEnabled, fetchStats } from './lib/quotes'

// the "advanced" slice of a scenario — everything held in the adv state object
const advFrom = (scenario) =>
  Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, scenario[k]]))

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

function SourceLink({ href, label = 'source', title }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={title}
      className="whitespace-nowrap text-stone-400 underline decoration-dotted hover:text-teal-700"
    >
      {label} ↗
    </a>
  )
}

function Field({ label, hint, dirty, onReset, children }) {
  return (
    <label className="block">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        <span className="flex flex-wrap items-baseline gap-1.5">
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
  // hold raw text while typing so clearing the field doesn't snap to 0; when
  // the value changes from outside (area switch, reset), show the new value
  const [text, setText] = useState(String(value))
  const [shown, setShown] = useState(value)
  if (value !== shown) {
    setShown(value)
    setText(String(value))
  }
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

// price tiers within an area, picked from the low / mid / high of its range
const TIERS = [
  ['low', 'Lower end'],
  ['mid', 'Typical'],
  ['high', 'Premium'],
]

export default function App() {
  // start from a shared link if the URL carries one, else our defaults
  const [initial] = useState(() => {
    let shared = null
    try { shared = decodeScenario(window.location.hash) } catch { /* fall back to defaults */ }
    return shared || defaultsFor()
  })
  const [areaName, setAreaName] = useState(initial.area)
  const [bhk, setBhk] = useState(initial.bhk)
  const [sqft, setSqftRaw] = useState(initial.sqft)
  const area = AREAS.find((a) => a.name === areaName)

  const [pricePerSqft, setPricePerSqft] = useState(initial.pricePerSqft)
  const [rentMonthly, setRentMonthly] = useState(initial.rentMonthly)
  const [securityDeposit, setSecurityDeposit] = useState(initial.securityDeposit)
  const [downPaymentPct, setDownPaymentPct] = useState(initial.downPaymentPct)
  const [adv, setAdv] = useState(() => advFrom(initial))
  const [copied, setCopied] = useState(false)
  // shared-quote medians per area, when the quotes API is configured
  const [quoteStats, setQuoteStats] = useState(null)
  const loadQuoteStats = () => { fetchStats().then(setQuoteStats).catch(() => {}) }
  useEffect(() => { if (sharingEnabled) loadQuoteStats() }, [])
  const [showAdv, setShowAdv] = useState(false)
  const [showCosts, setShowCosts] = useState(false)
  const [showMethod, setShowMethod] = useState(false)
  const [showLeftOut, setShowLeftOut] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showApprNote, setShowApprNote] = useState(false)
  // remembers where the invest-discipline slider was before "It gets spent"
  // zeroed it, so switching back to FD / mutual funds restores that value
  const [prevInvestFraction, setPrevInvestFraction] = useState(DEFAULTS.investFraction)

  const price = dealPrice({ pricePerSqft, sqft, priceDiscountPct: adv.priceDiscountPct })
  const downPayment = price * downPaymentPct / 100

  // maintenance and property tax track flat size — recompute when the size changes
  function setSqft(v) {
    setSqftRaw(v)
    setAdv((prev) => ({ ...prev, ...sizeCosts(v), interiorsBudget: defaultInteriors(pricePerSqft, v) }))
  }

  // load a whole scenario at once (reset, or a shared link pasted into this tab)
  function applyScenario(d) {
    setAreaName(d.area)
    setBhk(d.bhk)
    setSqftRaw(d.sqft)
    setPricePerSqft(d.pricePerSqft)
    setRentMonthly(d.rentMonthly)
    setSecurityDeposit(d.securityDeposit)
    setDownPaymentPct(d.downPaymentPct)
    setAdv(advFrom(d))
  }

  // a shared link pasted into an already-open tab only changes the fragment,
  // which doesn't reload the page — so listen for it and load that scenario
  useEffect(() => {
    const onHashChange = () => {
      const shared = decodeScenario(window.location.hash)
      if (shared) applyScenario(shared)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function pickArea(name) {
    const a = AREAS.find((x) => x.name === name)
    const rent = defaultRent(a, bhk)
    setAreaName(name)
    setPricePerSqft(a.pricePerSqft.mid)
    setRentMonthly(rent)
    setSecurityDeposit(MARKET.renting.securityDepositMonths * rent)
    setAdv((prev) => ({
      ...prev,
      appreciationPct: a.appreciationPct,
      interiorsBudget: defaultInteriors(a.pricePerSqft.mid, sqft),
    }))
  }

  // restore everything to our researched defaults for the current area + size
  function resetAll() {
    applyScenario(defaultsFor(area.name, bhk))
    setPrevInvestFraction(DEFAULTS.investFraction)
  }

  function pickReturn(val) {
    if (val === 0) {
      // "it gets spent" — stash the current slider position, then zero it
      if (adv.investFraction > 0) setPrevInvestFraction(adv.investFraction)
      setAdv({ ...adv, investReturnPct: 0, investTaxPct: 0, investExitTaxPct: 0, investFraction: 0 })
    } else {
      // FD / mutual funds — if the slider was zeroed by "spent", restore it;
      // otherwise leave whatever the user has dialed in. FD interest is taxed
      // at slab every year; equity gains are taxed once, at sale.
      setAdv({
        ...adv,
        ...investOption(val === EQUITY_RETURN ? 'equity' : 'fd', adv),
        investFraction: adv.investFraction === 0 ? prevInvestFraction : adv.investFraction,
      })
    }
  }

  function pickBhk(label) {
    const preset = BHK_PRESETS.find((b) => b.label === label)
    const rent = defaultRent(area, label)
    setBhk(label)
    setSqft(preset.sqft)
    setRentMonthly(rent)
    setSecurityDeposit(MARKET.renting.securityDepositMonths * rent)
  }

  // the whole scenario as one object — feeds the engine and the shareable link
  const scenario = useMemo(
    () => ({
      ...adv, area: areaName, bhk, sqft, pricePerSqft, rentMonthly, securityDeposit, downPaymentPct,
    }),
    [adv, areaName, bhk, sqft, pricePerSqft, rentMonthly, securityDeposit, downPaymentPct],
  )
  const simInputs = useMemo(() => toSimInputs(scenario), [scenario])

  // keep the address bar in step with the scenario, so the URL is always a
  // link to exactly what's on screen. It lives in the fragment (#...), which
  // browsers never send to a server.
  useEffect(() => {
    const encoded = encodeScenario(scenario)
    const url = window.location.pathname + window.location.search + (encoded ? `#${encoded}` : '')
    // Safari throws if this is called too often (e.g. while dragging a slider);
    // a missed update is harmless, the next change writes the link again
    try { window.history.replaceState(null, '', url) } catch { /* ignore */ }
  }, [scenario])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked — the address bar already holds the link */ }
  }

  // changing the slab moves the tax on returns with it while the two are linked
  function setSlab(v) {
    setAdv({
      ...adv,
      marginalTaxPct: v,
      investTaxPct: adv.investTaxPct === adv.marginalTaxPct ? v : adv.investTaxPct,
    })
  }

  const result = useMemo(() => simulate(simInputs), [simInputs])
  const verdictBuy = result.verdict === 'buy'

  // true break-even, independent of the graph window (rent keeps rising, loan
  // finishes at tenure — the crossover can land well past "compare over")
  const breakEven = useMemo(() => findBreakEven(simInputs), [simInputs])
  const breakEvenYear = breakEven === null ? null : new Date().getFullYear() + Math.round(breakEven)

  // the same scenario with the spare money in an FD, and in equity funds —
  // shown side by side because this choice often decides the answer
  const byInvestment = ['fd', 'equity'].map((kind) => {
    const option = investOption(kind, scenario)
    const r = simulate(toSimInputs({ ...scenario, ...option }))
    return {
      kind,
      label: kind === 'fd' ? `Fixed deposit (${FD_RETURN}%, taxed yearly)` : `Equity funds (${EQUITY_RETURN}%, taxed at sale)`,
      verdict: r.verdict,
      margin: r.margin,
      breakEven: findBreakEven(toSimInputs({ ...scenario, ...option })),
      active: scenario.investReturnPct === option.investReturnPct
        && scenario.investTaxPct === option.investTaxPct
        && scenario.investExitTaxPct === option.investExitTaxPct,
    }
  })
  // the two differ meaningfully if one never breaks even, or they are 3+ years apart
  const [beFd, beEquity] = byInvestment.map((o) => o.breakEven)
  const investmentDecides = (beFd === null) !== (beEquity === null)
    || (beFd !== null && beEquity !== null && Math.abs(beFd - beEquity) >= 3)

  // every area on the user's own settings, for the compare table
  const compareRows = useMemo(() => compareAreas(scenario, simulate, findBreakEven), [scenario])

  function pickFromCompare(name) {
    pickArea(name)
    document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // pick a price tier within the area; rent moves with it so both sides still
  // describe the same flat
  function pickTier(tier) {
    const ppsf = area.pricePerSqft[tier]
    const rent = Math.round(defaultRent(area, bhk) * ppsf / area.pricePerSqft.mid / 500) * 500
    setPricePerSqft(ppsf)
    setRentMonthly(rent)
    setSecurityDeposit(MARKET.renting.securityDepositMonths * rent)
    setAdv((prev) => ({ ...prev, interiorsBudget: defaultInteriors(ppsf, sqft) }))
  }

  // does the verdict survive across the likely range of appreciation?
  const verdictAt = (pct) => simulate({ ...simInputs, appreciationPct: pct }).verdict
  const rangeVerdicts = {
    low: verdictAt(area.appreciationPct),
    high: verdictAt(area.appreciationListingPct),
  }

  // the two levers that flip the verdict, everything else held
  const tippingAppreciation = useMemo(() => appreciationTippingPoint(simInputs), [simInputs])
  const tippingInvestReturn = useMemo(() => investReturnTippingPoint(simInputs), [simInputs])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Buy vs Rent <span className="text-teal-700">Bangalore</span>
            <span className="ml-2 align-middle rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
              beta
            </span>
          </h1>
          <p className="mt-2 text-stone-600">
            See whether buying or renting actually leaves you{' '}
            <strong className="font-semibold text-stone-800">richer</strong>.{' '}
            <span className="text-stone-400">No broker, no agenda.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span>
            Area estimates: {DATA_ASOF} · price index: {hpiStatus().latest.replace('.', ' ')}
            {hpiStatus().stale && (
              <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700">
                newer official data is out — update pending
              </span>
            )}
          </span>
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
                  Appreciation (how fast prices rise) is the least certain figure. Official
                  records give one rate for the whole city; how each area differs is estimated
                  from listing trends. We show both ends of the likely range. Treat every
                  number as a ballpark.
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

      <Compare
        rows={compareRows}
        bhk={bhk}
        selected={areaName}
        onPick={pickFromCompare}
      />

      <div id="calculator" className="grid scroll-mt-4 gap-8 lg:grid-cols-[360px_1fr]">
        {/* inputs */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                Your scenario
              </span>
              <span className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={copyLink}
                  title="Copy a link to exactly this scenario"
                  className="text-xs text-stone-400 transition hover:text-teal-700"
                >
                  {copied ? '✓ Link copied' : '🔗 Copy link'}
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-xs text-stone-400 transition hover:text-teal-700"
                >
                  ↺ Reset to defaults
                </button>
              </span>
            </div>
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
              <div className="flex flex-wrap items-center gap-2">
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
                  range {inrFull(area.pricePerSqft.low)}–{inrFull(area.pricePerSqft.high)}{' '}
                  <ConfBadge level={area.confidence} />
                </span>
              }
            >
              <Num value={pricePerSqft} onChange={setPricePerSqft} step={100} suffix="₹/sqft" />
              <div className="mt-2 flex flex-wrap gap-2">
                {TIERS.map(([tier, label]) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => pickTier(tier)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      pricePerSqft === area.pricePerSqft[tier]
                        ? 'bg-teal-700 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {label} {inrFull(area.pricePerSqft[tier])}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-stone-400">
                Lower end is older or resale flats; premium is a top-tier builder or a new
                launch. Rent moves with it. A specific project can sit outside this range —
                type your own numbers if you have a quote.
              </p>
            </Field>

            <Field label="Discount off the asking price">
              <Num
                value={adv.priceDiscountPct}
                step={5}
                onChange={(v) => setAdv({ ...adv, priceDiscountPct: Math.min(v, 90) })}
                suffix="%"
              />
              <p className="mt-1 text-xs text-stone-400">
                The price above is an asking price. Registered sale values in Bangalore run
                roughly 10–40% lower, though part of that gap is older flats, not bargaining.
                Set what you expect to negotiate; leave 0 to use the asking price.
              </p>
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

            <Field label="Security deposit" hint="set either — they stay linked">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Num
                    value={securityDeposit}
                    step={25000}
                    onChange={(v) => setSecurityDeposit(v)}
                    suffix="₹ total"
                  />
                </div>
                <div className="w-28">
                  <Num
                    value={rentMonthly > 0 ? Math.round(securityDeposit / rentMonthly) : 0}
                    step={1}
                    onChange={(v) => setSecurityDeposit(v * rentMonthly)}
                    suffix="months"
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-stone-400">
                Refundable, but sits idle earning nothing while you rent — the lost returns
                are a real cost. Landlords quote a number, so set the amount directly or in
                months of rent.
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
                    {area.name} likely {area.appreciationPct}–{area.appreciationListingPct}%/yr{' '}
                    <ConfBadge level={area.appConfidence} />
                  </span>
                }
              >
                <Num
                  value={adv.appreciationPct}
                  step={0.5}
                  onChange={(v) => setAdv({ ...adv, appreciationPct: v })}
                  suffix="%/yr"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    ['Official records', area.appreciationPct],
                    ['Asking-price trend', area.appreciationListingPct],
                  ].map(([label, val]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setAdv({ ...adv, appreciationPct: val })}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        adv.appreciationPct === val
                          ? 'bg-teal-700 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {label} {val}%
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowApprNote(!showApprNote)}
                  className="mt-1.5 text-xs text-teal-700 hover:underline"
                >
                  {showApprNote ? 'Hide' : 'Why this range?'}
                </button>
                {showApprNote && (
                  <div className="mt-1 space-y-1.5 rounded-lg bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-500">
                    <p>
                      <strong className="text-stone-700">Official records say {CITY_APPRECIATION.officialPct}%.</strong>{' '}
                      The RBI House Price Index, built from registered sale values, puts Bangalore
                      at {CITY_APPRECIATION.officialPct}%/yr over the last {CITY_APPRECIATION.years} years
                      (to {CITY_APPRECIATION.asOf}).{' '}
                      <SourceLink href={HPI_SOURCE_URL} label="RBI data" title="RBI Database on Indian Economy" />
                    </p>
                    <p>
                      <strong className="text-stone-700">Asking prices say closer to {CITY_APPRECIATION.listingPct}%.</strong>{' '}
                      Listing-site trends, trimmed for the shift toward pricier new launches,
                      average {CITY_APPRECIATION.listingPct}% across our areas.
                    </p>
                    <p>
                      Registered values often understate what was really paid, and asking prices
                      overstate it, so the truth is likely between. We start at the official end.
                      RBI publishes one figure for the whole city — how {area.name} differs from
                      the average still comes from listings.
                    </p>
                    <p>
                      <strong className="text-stone-700">{area.name}:</strong> {area.notes}{' '}
                      <span className="text-stone-400">({area.appConfidence} confidence)</span>
                    </p>
                  </div>
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
                    ['FD', FD_RETURN],
                    ['Mutual funds', EQUITY_RETURN],
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
                {adv.investReturnPct > 0 && (
                  <div className="mt-3">
                    {adv.investExitTaxPct > 0 ? (
                      <Field label="Tax on the gains when sold" hint="equity funds">
                        <Num
                          value={adv.investExitTaxPct}
                          step={2.5}
                          onChange={(v) => setAdv({ ...adv, investExitTaxPct: Math.min(v, 100) })}
                          suffix="%"
                        />
                      </Field>
                    ) : (
                      <Field
                        label="Tax on those returns each year"
                        hint={`${(adv.investReturnPct * (1 - adv.investTaxPct / 100)).toFixed(1)}% after tax`}
                      >
                        <Num
                          value={adv.investTaxPct}
                          step={5}
                          onChange={(v) => setAdv({ ...adv, investTaxPct: Math.min(v, 100) })}
                          suffix="%"
                        />
                      </Field>
                    )}
                    <p className="mt-1 text-xs text-stone-400">
                      FD interest is taxed every year at your income-tax slab. Equity-fund
                      gains are taxed once, when you sell: {MARKET.tax.equityGainsTaxPct}% above
                      the first {inr(MARKET.tax.equityGainsExemption)}.
                    </p>
                  </div>
                )}
              </Field>

              <Field
                label="How much of the monthly savings you'd actually invest"
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
                    livable — a cost the renter skips. We start at about 10% of the flat's
                    price, a common rule of thumb; put in your own budget if you have one.
                  </p>
                </Field>

                <Field label="Count the tax on cashing out?">
                  <div className="flex gap-2">
                    {[
                      [true, 'Yes'],
                      [false, 'No'],
                    ].map(([val, label]) => (
                      <button
                        key={label}
                        onClick={() => setAdv({ ...adv, countExitTax: val })}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm transition ${
                          adv.countExitTax === val
                            ? 'bg-teal-700 text-white'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    Net worth is compared as if each side cashed out: the home is sold and
                    the gain taxed at {MARKET.tax.propertyGainsTaxPct}%, and equity-fund gains
                    are taxed at {MARKET.tax.equityGainsTaxPct}%.
                  </p>
                  {adv.countExitTax && (
                    <label className="mt-2 flex items-start gap-2 text-xs text-stone-600">
                      <input
                        type="checkbox"
                        checked={adv.reinvestInHome}
                        onChange={(e) => setAdv({ ...adv, reinvestInHome: e.target.checked })}
                        className="mt-0.5 accent-teal-700"
                      />
                      <span>
                        I'd put the sale money into another home — that exempts the home-sale
                        gain from tax.
                      </span>
                    </label>
                  )}
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
                    The old regime gives each side a tax break: a buyer deducts up to ₹2L/yr
                    of home-loan interest (Section 24b), and a renter gets the HRA exemption.
                    The new regime gives neither. Most salaried people are on the new regime
                    unless they actively claim deductions. (80C principal is excluded —
                    usually already used up.)
                  </p>
                </Field>

                <Field label="Your income-tax slab">
                  <Num value={adv.marginalTaxPct} step={5} onChange={setSlab} suffix="%" />
                </Field>

                {adv.claimTaxBenefit && (
                  <Field label="Basic salary" hint="for the renter's HRA exemption">
                    <Num
                      value={adv.basicSalaryAnnual}
                      step={50000}
                      onChange={(v) => setAdv({ ...adv, basicSalaryAnnual: v })}
                      suffix="₹/yr"
                    />
                    <p className="mt-1 text-xs text-stone-400">
                      HRA exemption is the least of HRA received, rent minus 10% of basic, and
                      {' '}{MARKET.tax.hraCapPctOfBasic}% of basic. We assume your HRA equals that
                      {' '}{MARKET.tax.hraCapPctOfBasic}% and hold basic flat. The default is a guess — use
                      the basic pay on your payslip. Set 0 if you get no HRA.
                    </p>
                  </Field>
                )}
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
                  ['costInflationPct', 'Upkeep inflation %/yr', 0.5],
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
        <div className="min-w-0 space-y-4">
          <div
            className={`rounded-2xl p-6 text-white shadow-sm ${
              breakEven !== null && breakEven <= adv.horizonYears ? 'bg-teal-700' : 'bg-indigo-700'
            }`}
          >
            <div className="text-sm uppercase tracking-wide opacity-80">On your assumptions</div>
            <div className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">
              {breakEven === null
                ? "Buying doesn't catch up"
                : breakEven < 0.5
                ? 'Buying is ahead almost at once'
                : `Buying pulls ahead after ${years(breakEven)}`}
            </div>
            <div className="mt-2 opacity-90">
              {breakEven === null
                ? 'Renting leaves you richer for at least 40 years.'
                : `That is around ${breakEvenYear}. Leave before then and renting would have left you richer.`}
            </div>
            <div className="mt-1 text-sm opacity-90">
              After {adv.horizonYears} years, {verdictBuy ? 'buying' : 'renting'} is ahead by{' '}
              <strong>{inr(result.margin)}</strong>.
            </div>
            {adv.investFraction > 0 && (
              <div className="mt-4 rounded-xl bg-white/10 p-3 text-sm">
                <div className="mb-2 text-xs uppercase tracking-wide opacity-80">
                  {investmentDecides
                    ? 'It depends on where your spare money goes'
                    : 'Much the same wherever your spare money goes'}
                </div>
                <div className="space-y-1.5">
                  {byInvestment.map((o) => (
                    <button
                      key={o.kind}
                      type="button"
                      onClick={() => pickReturn(o.kind === 'fd' ? FD_RETURN : EQUITY_RETURN)}
                      className={`flex w-full flex-wrap items-baseline justify-between gap-x-3 rounded-lg px-2.5 py-1.5 text-left transition ${
                        o.active ? 'bg-white/20' : 'hover:bg-white/10'
                      }`}
                    >
                      <span>{o.label}</span>
                      <span>
                        {o.breakEven === null
                          ? <>buying <strong>never catches up</strong></>
                          : <>buying ahead after <strong>{years(o.breakEven)}</strong></>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 space-y-2 border-t border-white/20 pt-3 text-sm opacity-90">
              <div>
                {rangeVerdicts.low === rangeVerdicts.high ? (
                  <>
                    Over {adv.horizonYears} years, {rangeVerdicts.low === 'buy' ? 'buying' : 'renting'} wins
                    across the whole likely range of appreciation for {area.name}{' '}
                    ({area.appreciationPct}–{area.appreciationListingPct}%).
                  </>
                ) : (
                  <>
                    <strong>This one is close.</strong> Renting wins at the official rate
                    ({area.appreciationPct}%), buying wins at the asking-price trend
                    ({area.appreciationListingPct}%).
                  </>
                )}
              </div>
              <div>
                {tippingAppreciation === null ? (
                  <>Even at 30%/yr appreciation, renting still comes out ahead here.</>
                ) : tippingAppreciation <= 0 ? (
                  <>Buying wins at any positive appreciation rate.</>
                ) : (
                  <>
                    Over {adv.horizonYears} years, buying wins if appreciation beats{' '}
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
                    Flip it: over {adv.horizonYears} years renting wins if your savings earn more than{' '}
                    <strong>{tippingInvestReturn.toFixed(1)}%/yr</strong>
                    {' '}— you've assumed {adv.investReturnPct}%.
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              ['EMI', inr(result.emi) + '/mo'],
              ['Cash needed upfront', inr(downPayment + result.upfrontCosts)],
              [`Ahead after ${adv.horizonYears} yrs`, `${verdictBuy ? 'Buying' : 'Renting'} +${inr(result.margin)}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-3 sm:p-4 shadow-sm">
                <div className="text-[11px] uppercase tracking-wide text-stone-400 sm:text-xs">{label}</div>
                <div className="mt-1 text-sm font-semibold sm:text-lg">{value}</div>
              </div>
            ))}
          </div>

          {sharingEnabled && (
            <ShareQuote
              key={areaName}
              area={areaName}
              bhk={bhk}
              calcSqft={sqft}
              calcPrice={pricePerSqft}
              calcRent={rentMonthly}
              areaStats={quoteStats?.areas?.[areaName] || null}
              minimumToShow={quoteStats?.minimumToShow ?? 5}
              onApply={(q) => {
                if (q.pricePerSqft) setPricePerSqft(q.pricePerSqft)
                if (q.rentMonthly) {
                  setRentMonthly(q.rentMonthly)
                  setSecurityDeposit(MARKET.renting.securityDepositMonths * q.rentMonthly)
                }
                if (q.sqft) setSqft(q.sqft)
              }}
              onShared={(result) => {
                // show the new count straight away rather than waiting for the cached summary
                if (result?.area) {
                  setQuoteStats((prev) => ({ ...(prev || {}), areas: { ...(prev?.areas || {}), [areaName]: result.area } }))
                }
              }}
            />
          )}

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
                  portals and public market reports, which run 10–30% above
                  registered transaction values. The mid leans toward a realistic deal
                  price but still carries listing bias. Use <em>Discount off the asking
                  price</em> to model what you expect to actually pay.
                </p>
                <p>
                  <strong className="text-stone-700">Appreciation is a range, not a number.</strong>{' '}
                  The low end is official: the RBI House Price Index, built from registered
                  sale values, puts Bangalore at {CITY_APPRECIATION.officialPct}%/yr over the
                  last {CITY_APPRECIATION.years} years (to {CITY_APPRECIATION.asOf}). The high
                  end comes from ~10 years of listing-site price trends, trimmed by about 3
                  points for the shift toward pricier new launches; that averages{' '}
                  {CITY_APPRECIATION.listingPct}% across our areas. Registered values tend to
                  understate real prices and asking prices overstate them, so the truth is
                  likely between. The calculator starts at the official end.
                </p>
                <p>
                  <strong className="text-stone-700">Only the city average is official.</strong>{' '}
                  RBI publishes nothing below city level, so how one area differs from another
                  still rests on listing trends, adjusted for new supply and how stretched
                  prices already are. The confidence badge tells you how much to trust each
                  area — and the verdict card shows the rate where the answer flips, so you
                  don't have to trust our estimate at all.
                </p>
                <p>
                  <strong className="text-stone-700">The past is not a forecast.</strong> In the
                  official series Bangalore grew faster before 2020 than after it. A
                  10-year average smooths that out; it does not predict the next ten.
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
                  under-construction flats, interiors, and maintenance and property tax that
                  rise each year are all in — adjust them under <em>Costs &amp; taxes</em> and{' '}
                  <em>Assumptions</em>.
                </p>
                <p>
                  <strong className="text-stone-700">Tax is applied to both sides.</strong> Under
                  the old regime the buyer gets the Section 24b interest deduction and the
                  renter gets the HRA exemption; under the new regime neither does. Interest
                  on savings parked in an FD is taxed at your slab every year, whichever side
                  is doing the saving. Net worth is compared after cashing out: the home-sale
                  gain and equity-fund gains are each taxed at {MARKET.tax.propertyGainsTaxPct}%.
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
                  <strong className="text-stone-700">Cess, surcharge and tax harvesting.</strong>{' '}
                  Tax rates are the headline ones. The 4% cess and any surcharge are left out,
                  and so is selling a little equity each year to use the tax-free allowance.
                </li>
                <li>
                  <strong className="text-stone-700">Your salary never moves.</strong> The HRA
                  estimate holds basic pay flat and assumes HRA is a standard share of it.
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
