import { useState } from 'react'
import { inrFull } from './lib/format'
import { quotePayload, sendQuote, versusMedian } from './lib/quotes'

const TIER_CHOICES = [
  ['', 'Not sure'],
  ['low', 'Older or resale flat'],
  ['mid', 'Typical gated apartment'],
  ['high', 'Premium builder or new launch'],
]

const inputClass = `mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base
  focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 sm:text-sm`

// Sits in the scenario card, right under the price and rent the user has
// typed. Those boxes are where a quote is entered; this only offers to share
// it. A number still equal to our starting estimate is not offered, so our own
// estimates are never sent back to us as if they were real.
export default function ShareQuote({
  area, bhk, sqft, pricePerSqft, rentMonthly, project, priceChanged, rentChanged, tierFromPrice, areaStats, minimumToShow, onShared,
}) {
  const [open, setOpen] = useState(false)
  const [matchesEstimate, setMatchesEstimate] = useState(false) // "my quote happens to equal your estimate"
  const [tier, setTier] = useState('')
  const [state, setState] = useState({ status: 'idle' }) // idle | sending | done | error
  const sharePrice = priceChanged || matchesEstimate
  const shareRent = rentChanged || matchesEstimate
  const ready = sharePrice || shareRent
  const payload = quotePayload({
    area, bhk, sqft, pricePerSqft, rentMonthly, tier: tier || tierFromPrice || null, sharePrice, shareRent,
    project,
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

  const priceVs = areaStats?.medianPricePerSqft ? versusMedian(pricePerSqft, areaStats.medianPricePerSqft) : null
  const rentVs = areaStats?.medianRentPerSqft ? versusMedian(rentMonthly / sqft, areaStats.medianRentPerSqft) : null

  return (
    <div className="rounded-xl border border-stone-200 p-3 text-sm">
      {areaStats && (
        <p className="mb-2 text-stone-700">
          <strong>{areaStats.quotes} people</strong> have shared real quotes for {area}.
          {priceVs && <> Your price is <strong>{priceVs}</strong> their median of {inrFull(areaStats.medianPricePerSqft)}/sqft.</>}
          {rentVs && <> Your rent is <strong>{rentVs}</strong> their median.</>}
        </p>
      )}

      {state.status === 'done' ? (
        <p className="text-stone-700">
          <strong>Thank you — added.</strong>{' '}
          {state.result.published
            ? state.result.area
              ? `${area} now has ${state.result.area.quotes} shared quotes.`
              : `We show an area's numbers once it has ${state.result.minimumToShow ?? minimumToShow} quotes; ${area} isn't there yet.`
            : 'It looked a little unusual, so a person will check it before it is published.'}
        </p>
      ) : !ready ? (
        <p className="text-xs text-stone-500">
          <strong className="text-stone-700">Got a real quote?</strong> Type its price or rent in the
          boxes above, and you can add it to the open dataset to help the next person.{' '}
          <button type="button" onClick={() => { setMatchesEstimate(true); setOpen(true) }} className="text-teal-700 underline decoration-dotted">
            My quote already matches these numbers
          </button>
        </p>
      ) : !open ? (
        <button type="button" onClick={() => setOpen(true)} className="w-full text-left">
          <span className="font-medium text-teal-700">Is this a real quote? Add it to the open dataset →</span>
          <span className="block text-xs text-stone-400">Anonymous. It helps the next person see what flats here really cost.</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="font-medium text-stone-700">Add this quote to the open dataset</div>
          {!tierFromPrice && (
            <label className="block text-stone-700">
              Kind of flat
              <select value={tier} onChange={(e) => setTier(e.target.value)} className={inputClass}>
                {TIER_CHOICES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          )}

          <div className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">
            <div className="font-medium text-stone-700">Exactly what will be sent</div>
            <div className="mt-1">
              {payload.area} · {payload.bhk} · {payload.sqft} sqft
              {payload.pricePerSqft !== undefined && <> · {inrFull(payload.pricePerSqft)}/sqft</>}
              {payload.rentMonthly !== undefined && <> · rent {inrFull(payload.rentMonthly)}</>}
              {payload.tier && <> · {TIER_CHOICES.find(([v]) => v === payload.tier)[1].toLowerCase()}</>}
              {payload.project && <> · {payload.project.name}</>}
              {' '}· this month
            </div>
            {!payload.project && (
              <div className="mt-1">No project named — add one in the box near the top if you like.</div>
            )}
            {payload.project && project?.lat === undefined && (
              <div className="mt-1">The project name was typed by hand, so a person checks it before it is published.</div>
            )}
            {!matchesEstimate && !(priceChanged && rentChanged) && (
              <div className="mt-1">
                The {priceChanged ? 'rent' : 'price'} is still our estimate, so it is left out.
                Change it above if you have a real figure.
              </div>
            )}
            <div className="mt-1">
              Not sent: salary, tax, down payment, loan or anything that identifies you. We don't
              store your IP address.
            </div>
          </div>

          {state.status === 'error' && <p className="text-xs text-rose-600">{state.message}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={state.status === 'sending'}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
            >
              {state.status === 'sending' ? 'Sending…' : 'Add my quote'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setMatchesEstimate(false) }} className="text-sm text-stone-500 hover:underline">
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
