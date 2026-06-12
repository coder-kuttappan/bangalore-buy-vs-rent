import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { simulate } from './lib/calc'
import { inr, inrFull, years } from './lib/format'
import { AREAS, BHK_PRESETS, DEFAULTS, DATA_ASOF } from './data/areas'

function defaultRent(area, bhkLabel) {
  if (bhkLabel === '1 BHK') return Math.round(area.rent2bhk.mid * 0.7 / 500) * 500
  if (bhkLabel === '3 BHK') return area.rent3bhk.mid
  return area.rent2bhk.mid
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        {hint && <span className="text-xs text-stone-400">{hint}</span>}
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
  const [adv, setAdv] = useState(DEFAULTS)
  const [showAdv, setShowAdv] = useState(false)

  const price = pricePerSqft * sqft
  const downPayment = price * downPaymentPct / 100

  function pickArea(name) {
    const a = AREAS.find((x) => x.name === name)
    setAreaName(name)
    setPricePerSqft(a.pricePerSqft.mid)
    setRentMonthly(defaultRent(a, bhk))
  }

  function pickBhk(label) {
    const preset = BHK_PRESETS.find((b) => b.label === label)
    setBhk(label)
    setSqft(preset.sqft)
    setRentMonthly(defaultRent(area, label))
  }

  const result = useMemo(
    () =>
      simulate({
        price,
        downPayment,
        loanRatePct: adv.loanRatePct,
        tenureYears: adv.tenureYears,
        rentMonthly,
        rentInflationPct: adv.rentInflationPct,
        appreciationPct: adv.appreciationPct,
        investReturnPct: adv.investReturnPct,
        horizonYears: adv.horizonYears,
        stampDutyPct: adv.stampDutyPct,
        registrationPct: adv.registrationPct,
        maintenanceMonthly: adv.maintenanceMonthly,
        propertyTaxAnnual: adv.propertyTaxAnnual,
        sellingCostPct: adv.sellingCostPct,
      }),
    [price, downPayment, rentMonthly, adv],
  )

  const verdictBuy = result.verdict === 'buy'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Buy vs Rent <span className="text-teal-700">Bangalore</span>
        </h1>
        <p className="mt-1 text-stone-500">
          The actual math, by area. No broker, no agenda.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        {/* inputs */}
        <div className="space-y-4">
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
              hint={`range ${inr(area.pricePerSqft.low)}–${inr(area.pricePerSqft.high)} · ${area.confidence} confidence`}
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

            <Field label="Monthly rent for an equivalent home" hint={`typical ${inr(defaultRent(area, bhk))}`}>
              <Num value={rentMonthly} onChange={setRentMonthly} step={1000} suffix="₹/mo" />
            </Field>
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
                  ['tenureYears', 'Tenure (yrs)', 1],
                  ['appreciationPct', 'Appreciation %/yr', 0.5],
                  ['investReturnPct', 'Investment return %/yr', 0.5],
                  ['rentInflationPct', 'Rent inflation %/yr', 0.5],
                  ['horizonYears', 'Horizon (yrs)', 1],
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
              After {adv.horizonYears} years, you're better off
            </div>
            <div className="mt-1 text-4xl font-bold">
              {verdictBuy ? 'Buying' : 'Renting'}
            </div>
            <div className="mt-2 opacity-90">
              by <strong>{inr(result.margin)}</strong> in net worth
              {result.breakEvenYears !== null && result.breakEvenYears > 0 && (
                <> — buying {verdictBuy ? 'pulls ahead' : 'would catch up'} at {years(result.breakEvenYears)}</>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              ['EMI', inr(result.emi) + '/mo'],
              ['Cash needed upfront', inr(downPayment + result.upfrontCosts)],
              ['Break-even', years(result.breakEvenYears)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-stone-400">{label}</div>
                <div className="mt-1 text-lg font-semibold">{value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 text-sm font-medium text-stone-700">
              Net worth over time
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={result.series} margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="year" tickFormatter={(y) => `${y}y`} stroke="#a8a29e" fontSize={12} />
                <YAxis tickFormatter={inr} stroke="#a8a29e" fontSize={12} width={70} />
                <Tooltip formatter={(v) => inr(v)} labelFormatter={(y) => `Year ${y}`} />
                <Legend />
                {result.breakEvenYears !== null && result.breakEvenYears > 0 && (
                  <ReferenceLine x={Math.round(result.breakEvenYears)} stroke="#a8a29e" strokeDasharray="4 4" />
                )}
                <Line type="monotone" dataKey="buyNetWorth" name="Buy" stroke="#0f766e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rentNetWorth" name="Rent" stroke="#4338ca" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs leading-relaxed text-stone-400">
            This is arithmetic, not advice. Assumes the renter actually invests the
            difference (most don't), ignores tax deductions on home loan interest,
            and uses {DATA_ASOF === 'placeholder' ? 'rough placeholder' : DATA_ASOF} area
            price data as defaults — override with real quotes for your decision.
          </p>
        </div>
      </div>
    </div>
  )
}
