import { useEffect, useState } from 'react'
import { inrFull } from './lib/format'
import { quotePayload, sendQuote, suggestProjects, versusMedian } from './lib/quotes'

const TIER_CHOICES = [
  ['', 'Not sure'],
  ['low', 'Older or resale flat'],
  ['mid', 'Typical gated apartment'],
  ['high', 'Premium builder or new launch'],
]

const inputClass = `mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base
  focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 sm:text-sm`

// A number typed into a box: '' means "not given", anything else must be a positive number
const typed = (text) => {
  const n = Number(text)
  return text.trim() !== '' && Number.isFinite(n) && n > 0 ? n : null
}

// Lets someone with a real quote add it to the open dataset. The quote is
// typed here, not taken from the calculator, so our starting estimates are
// never sent back to us as if they were real. Shows exactly what will be sent.
export default function ShareQuote({ area, bhk, calcSqft, calcPrice, calcRent, areaStats, minimumToShow, onApply, onShared }) {
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState('')
  const [rent, setRent] = useState('')
  const [sqft, setSqft] = useState(String(calcSqft))
  const [tier, setTier] = useState('')
  const [projectText, setProjectText] = useState('')
  const [project, setProject] = useState(null) // a pick from the list, with its position
  const [projects, setProjects] = useState(null)
  const [state, setState] = useState({ status: 'idle' }) // idle | sending | done | error

  // the project list is only fetched when someone opens this card
  useEffect(() => {
    if (!open || projects) return
    fetch(`${import.meta.env.BASE_URL}projects.json`)
      .then((r) => r.json())
      .then((d) => setProjects(d.projects))
      .catch(() => setProjects([]))
  }, [open, projects])

  const pricePerSqft = typed(price)
  const rentMonthly = typed(rent)
  const size = typed(sqft)
  const ready = size !== null && (pricePerSqft !== null || rentMonthly !== null)
  const suggestions = project ? [] : suggestProjects(projects || [], projectText)
  const payload = quotePayload({
    area, bhk, sqft: size, pricePerSqft, rentMonthly, tier: tier || null,
    sharePrice: pricePerSqft !== null, shareRent: rentMonthly !== null,
    project: project || { name: projectText },
  })

  async function submit() {
    setState({ status: 'sending' })
    try {
      const result = await sendQuote(payload)
      setState({ status: 'done', result })
      onShared?.(result)
    } catch (err) {
      setState({ status: 'error', message: err.message })
    }
  }

  const priceVs = areaStats?.medianPricePerSqft ? versusMedian(pricePerSqft ?? calcPrice, areaStats.medianPricePerSqft) : null
  const rentVs = areaStats?.medianRentPerSqft
    ? versusMedian((rentMonthly ?? calcRent) / (size ?? calcSqft), areaStats.medianRentPerSqft)
    : null

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      {areaStats ? (
        <div className="mb-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-stone-700">
          <strong>{areaStats.quotes} people</strong> have shared real quotes for {area}.
          {priceVs && <> Your price is <strong>{priceVs}</strong> the median of {inrFull(areaStats.medianPricePerSqft)}/sqft.</>}
          {rentVs && <> Your rent is <strong>{rentVs}</strong> the median.</>}
        </div>
      ) : null}

      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-stone-700"
      >
        <span>
          Have a real quote for {area}? Add it to the open dataset
          <span className="block text-xs font-normal text-stone-400">
            Anonymous. It helps the next person see what flats here really cost.
          </span>
        </span>
        <span className="text-stone-400">{open ? '−' : '+'}</span>
      </button>

      {open && state.status !== 'done' && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-stone-700">
              Price you were quoted
              <input type="number" inputMode="numeric" min="0" value={price} placeholder="₹ per sqft"
                onChange={(e) => setPrice(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-stone-700">
              Rent you were quoted
              <input type="number" inputMode="numeric" min="0" value={rent} placeholder="₹ per month"
                onChange={(e) => setRent(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-stone-700">
              Flat size ({bhk})
              <input type="number" inputMode="numeric" min="0" value={sqft} placeholder="sqft"
                onChange={(e) => setSqft(e.target.value)} className={inputClass} />
            </label>
            <label className="block text-stone-700">
              Kind of flat
              <select value={tier} onChange={(e) => setTier(e.target.value)} className={inputClass}>
                {TIER_CHOICES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <p className="text-xs text-stone-400">
            Fill in the price, the rent, or both — whichever you have a real figure for.{' '}
            <button
              type="button"
              onClick={() => { setPrice(String(calcPrice)); setRent(String(calcRent)); setSqft(String(calcSqft)) }}
              className="text-teal-700 underline decoration-dotted"
            >
              Copy the numbers from the calculator
            </button>{' '}
            if you already typed your quote there.
          </p>

          <div className="relative">
            <label className="block text-stone-700">
              Project or building <span className="text-stone-400">(optional)</span>
              <input
                type="text"
                value={projectText}
                maxLength={80}
                placeholder="Start typing a name"
                onChange={(e) => { setProjectText(e.target.value); setProject(null) }}
                className={inputClass}
              />
            </label>
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-stone-200 bg-white shadow-lg">
                {suggestions.map((p) => (
                  <li key={p[0]}>
                    <button
                      type="button"
                      onClick={() => { setProject({ name: p[0], lat: p[1], lon: p[2] }); setProjectText(p[0]) }}
                      className="block w-full px-3 py-2 text-left hover:bg-stone-50"
                    >
                      {p[0]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-stone-400">
              {project
                ? 'Picked from the list, so its location is included.'
                : 'Pick from the list if it appears. A name typed by hand is checked by a person before it is published.'}
              {' '}Project names © OpenStreetMap contributors.
            </p>
          </div>

          <div className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
            <div className="font-medium text-stone-700">Exactly what will be sent</div>
            <div className="mt-1">
              {ready ? (
                <>
                  {payload.area} · {payload.bhk} · {payload.sqft} sqft
                  {payload.pricePerSqft !== undefined && <> · {inrFull(payload.pricePerSqft)}/sqft</>}
                  {payload.rentMonthly !== undefined && <> · rent {inrFull(payload.rentMonthly)}</>}
                  {payload.tier && <> · {TIER_CHOICES.find(([v]) => v === payload.tier)[1].toLowerCase()}</>}
                  {payload.project && <> · {payload.project.name}</>}
                  {' '}· this month
                </>
              ) : 'Nothing yet — enter a price or a rent above.'}
            </div>
            <div className="mt-1">
              Not sent: your salary, tax, down payment, loan or anything that identifies you. We
              don't store your IP address.
            </div>
          </div>

          {state.status === 'error' && <p className="text-xs text-rose-600">{state.message}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={!ready || state.status === 'sending'}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
            >
              {state.status === 'sending' ? 'Sending…' : 'Add my quote'}
            </button>
            {ready && (
              <button
                type="button"
                onClick={() => onApply?.({ pricePerSqft, rentMonthly, sqft: size })}
                className="text-sm text-teal-700 underline decoration-dotted"
              >
                Use these numbers in the calculator
              </button>
            )}
          </div>
        </div>
      )}

      {state.status === 'done' && (
        <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-stone-700">
          <strong>Thank you — added.</strong>{' '}
          {state.result.published
            ? state.result.area
              ? `${area} now has ${state.result.area.quotes} shared quotes.`
              : `We show an area's numbers once it has ${state.result.minimumToShow ?? minimumToShow} quotes; ${area} isn't there yet.`
            : 'It looked a little unusual, so a person will check it before it is published.'}
        </p>
      )}
    </div>
  )
}
