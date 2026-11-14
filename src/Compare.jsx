import { useState } from 'react'
import { inrFull, years } from './lib/format'
import { FD_RETURN, EQUITY_RETURN } from './lib/scenario'

// Where each area sits on the tile map: [row, column], laid out roughly as the
// city is — north at the top, east on the right. Short names fit a phone tile.
const TILES = {
  'Devanahalli': [0, 3, 'Devanahalli'],
  'Yelahanka': [1, 2, 'Yelahanka'],
  'Thanisandra': [1, 3, 'Thanisandra'],
  'Tumkur Road': [2, 0, 'Tumkur Road'],
  'Hebbal': [2, 2, 'Hebbal'],
  'Hennur': [2, 3, 'Hennur'],
  'Horamavu': [2, 4, 'Horamavu'],
  'Kalyan Nagar': [3, 3, 'Kalyan Nagar'],
  'Banaswadi': [3, 4, 'Banaswadi'],
  'KR Puram': [3, 5, 'KR Puram'],
  'Indiranagar': [4, 3, 'Indiranagar'],
  'Whitefield': [4, 4, 'Whitefield'],
  'Kadugodi': [4, 5, 'Kadugodi'],
  'Koramangala': [5, 2, 'Koramangala'],
  'HSR Layout': [5, 3, 'HSR'],
  'Sarjapur Road': [5, 4, 'Sarjapur Road'],
  'Varthur': [5, 5, 'Varthur'],
  'JP Nagar': [6, 1, 'JP Nagar'],
  'Bannerghatta Road': [6, 2, 'Bannerghatta'],
  'Electronic City': [6, 3, 'E-City'],
}

// One hue, darker = buying pulls ahead sooner. "Never" is neutral grey.
// Every tile also prints its number, so colour is never the only signal.
const STEPS = [
  { upTo: 6, label: 'under 6 yrs', tile: 'bg-teal-800 text-white' },
  { upTo: 8, label: '6–8', tile: 'bg-teal-600 text-white' },
  { upTo: 10, label: '8–10', tile: 'bg-teal-400 text-stone-900' },
  { upTo: 15, label: '10–15', tile: 'bg-teal-200 text-stone-900' },
  { upTo: Infinity, label: '15+', tile: 'bg-teal-50 text-stone-900 ring-1 ring-inset ring-teal-200' },
]
const NEVER = { label: 'never (40+)', tile: 'bg-stone-200 text-stone-700' }
const stepFor = (be) => (be === null ? NEVER : STEPS.find((s) => be < s.upTo))
const short = (be) => (be === null ? '40+' : be < 10 ? be.toFixed(1) : String(Math.round(be)))

function summary(rows, kind) {
  const reached = rows.filter((r) => r[kind].breakEven !== null).sort((a, b) => a[kind].breakEven - b[kind].breakEven)
  if (!reached.length) return 'buying does not catch up in any area within 40 years'
  const mid = reached[Math.floor(reached.length / 2)][kind].breakEven
  const first = reached[0]
  const last = reached[reached.length - 1]
  const missing = rows.length - reached.length
  return `buying pulls ahead after about ${Math.round(mid)} years in a typical area — from ${years(first[kind].breakEven)} in ${first.name} to ${years(last[kind].breakEven)} in ${last.name}${missing ? `, and never in ${missing}` : ''}`
}

// All areas at a glance: how long buying takes to pull ahead of renting.
export default function Compare({ rows, bhk, selected, onPick }) {
  const [kind, setKind] = useState('fd')
  const [showList, setShowList] = useState(false)
  const [hover, setHover] = useState(null)
  const focus = rows.find((r) => r.name === (hover || selected))

  return (
    <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight">Where does buying make sense?</h2>
      <p className="mt-1 text-sm text-stone-600">
        For a {bhk}: with spare money in a fixed deposit, {summary(rows, 'fd')}. With equity
        funds, {summary(rows, 'equity')}.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-stone-500">Spare money goes into</span>
        {[
          ['fd', `Fixed deposit ${FD_RETURN}%`],
          ['equity', `Equity funds ${EQUITY_RETURN}%`],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              kind === value ? 'bg-teal-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,560px)_1fr]">
        <div>
          <div
            className="grid gap-1 sm:gap-1.5"
            style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}
            role="group"
            aria-label="Areas of Bangalore, coloured by years until buying pulls ahead"
          >
            {rows.map((r) => {
              const [row, col, label] = TILES[r.name]
              const be = r[kind].breakEven
              return (
                <button
                  key={r.name}
                  type="button"
                  onClick={() => onPick(r.name)}
                  onMouseEnter={() => setHover(r.name)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(r.name)}
                  onBlur={() => setHover(null)}
                  title={`${r.name}: ${be === null ? 'buying never catches up' : `buying pulls ahead after ${years(be)}`}`}
                  style={{ gridRow: row + 1, gridColumn: col + 1 }}
                  className={`flex aspect-square flex-col items-center justify-center overflow-hidden rounded-lg text-center transition
                    hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900
                    ${stepFor(be).tile} ${r.name === selected ? 'outline outline-2 outline-offset-1 outline-stone-900' : ''}`}
                >
                  <span className="text-base font-semibold leading-none sm:text-xl">{short(be)}</span>
                  <span className="mt-0.5 w-full text-[7.5px] leading-[1.1] tracking-tighter opacity-90 sm:text-[11px] sm:tracking-normal">{label}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
            <span>Years until buying pulls ahead:</span>
            {[...STEPS, NEVER].map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1">
                <span className={`inline-block h-3 w-3 rounded-sm ${s.tile}`} />
                {s.label}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-stone-400">North is up, east is right. Positions are approximate.</p>
        </div>

        {focus && (
          <div className="self-start rounded-xl bg-stone-50 p-4 text-sm">
            <div className="font-semibold text-stone-800">{focus.name}</div>
            <div className="mt-1 text-xs text-stone-500">
              Starting estimate: {inrFull(focus.pricePerSqft)}/sqft · rent {inrFull(focus.rentMonthly)} ·
              appreciation {focus.appreciationPct}–{focus.appreciationListingPct}%
            </div>
            <dl className="mt-3 space-y-1.5">
              {[
                ['fd', 'Fixed deposit'],
                ['equity', 'Equity funds'],
              ].map(([k, label]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-stone-500">{label}</dt>
                  <dd className="text-right font-medium text-stone-800">
                    {focus[k].breakEven === null ? 'buying never catches up' : `buying ahead after ${years(focus[k].breakEven)}`}
                  </dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={() => onPick(focus.name)}
              className="mt-3 text-sm font-medium text-teal-700 hover:underline"
            >
              Open {focus.name} in the calculator ↓
            </button>
            <p className="mt-2 text-xs text-stone-400">
              These are our starting estimates with your settings. Got a real quote? Put it
              in the calculator and the answer is yours, not ours.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowList(!showList)}
        className="mt-4 text-sm font-medium text-teal-700 hover:underline"
      >
        {showList ? 'Hide the list' : 'See all areas as a list'}
      </button>
      {showList && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-400">
                <th className="py-2 pr-3 font-medium">Area</th>
                <th className="py-2 pr-3 font-medium">Fixed deposit</th>
                <th className="py-2 font-medium">Equity funds</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.name}
                  onClick={() => onPick(r.name)}
                  className={`cursor-pointer border-b border-stone-100 transition hover:bg-stone-50 ${
                    r.name === selected ? 'bg-teal-50/60' : ''
                  }`}
                >
                  <td className="py-2 pr-3">
                    <div className="font-medium text-stone-800">{r.name}</div>
                    <div className="text-xs text-stone-400">
                      {inrFull(r.pricePerSqft)}/sqft · rent {inrFull(r.rentMonthly)}
                    </div>
                  </td>
                  {['fd', 'equity'].map((k) => (
                    <td key={k} className="whitespace-nowrap py-2 pr-3 text-stone-700">
                      {r[k].breakEven === null ? 'never (40+ yr)' : years(r[k].breakEven)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-stone-400">
            Years until buying pulls ahead of renting. Appreciation starts at the official end
            of each area's range, so these lean cautious on buying.
          </p>
        </div>
      )}
    </section>
  )
}
