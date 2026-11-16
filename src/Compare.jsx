import { lazy, Suspense, useEffect, useState } from 'react'
import { inrFull, years } from './lib/format'
import { FD_RETURN, EQUITY_RETURN } from './lib/scenario'

// the map and its library load only when this section is shown
const AreaMap = lazy(() => import('./AreaMap'))

// One hue, darker = buying pulls ahead sooner. "Never" is neutral grey.
// Every tile also prints its number, so colour is never the only signal.
const STEPS = [
  { upTo: 6, label: 'under 6 yrs', hex: '#115e59', tile: 'bg-teal-800' },
  { upTo: 8, label: '6–8', hex: '#0d9488', tile: 'bg-teal-600' },
  { upTo: 10, label: '8–10', hex: '#2dd4bf', tile: 'bg-teal-400' },
  { upTo: 15, label: '10–15', hex: '#99f6e4', tile: 'bg-teal-200' },
  { upTo: Infinity, label: '15+', hex: '#f0fdfa', tile: 'bg-teal-50 ring-1 ring-inset ring-teal-300' },
]
const NEVER = { label: 'never (40+)', hex: '#a8a29e', tile: 'bg-stone-400' }
const stepFor = (be) => (be === null ? NEVER : STEPS.find((s) => be < s.upTo))
const short = (be) => (be === null ? 'never' : be < 10 ? be.toFixed(1) : String(Math.round(be)))

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
  const [mapData, setMapData] = useState(null)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}map.json`).then((r) => r.json()).then(setMapData).catch(() => setMapData(false))
  }, [])
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]))
  const focus = rows.find((r) => r.name === (hover || selected))

  return (
    <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
      <div className="lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-7">
        {/* words first on a phone; beside the map on a wide screen */}
        <div className="lg:col-start-2 lg:row-start-1">
          <h2 className="text-lg font-semibold tracking-tight">Where does buying make sense?</h2>
          <p className="mt-2 text-sm text-stone-700">
            <strong>Each number on the map is the years you would need to stay before buying
            leaves you richer than renting.</strong> Fewer years means buying makes sense sooner.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
            <span>Years:</span>
            {[...STEPS, NEVER].map((s) => (
              <span key={s.label} className="inline-flex items-center gap-1">
                <span className={`inline-block h-3 w-3 rounded-sm ${s.tile}`} />
                {s.label}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-stone-500">If your spare money goes into</span>
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
          <p className="mt-2 text-sm text-stone-600">
            For a {bhk}: with a fixed deposit, {summary(rows, 'fd')}. With equity funds,{' '}
            {summary(rows, 'equity')}.
          </p>
        </div>

        <div className="mt-4 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0">
          {mapData === false ? (
            <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
              The map could not be loaded. The list below has the same numbers.
            </p>
          ) : (
            <Suspense fallback={<div className="area-map rounded-xl bg-stone-100" />}>
              <AreaMap
                data={mapData}
                selected={selected}
                colourFor={(name) => stepFor(byName[name][kind].breakEven).hex}
                labelFor={(name) => short(byName[name][kind].breakEven)}
                tipFor={(name) => {
                  const be = byName[name][kind].breakEven
                  return `${name}: ${be === null ? 'buying never catches up' : `buying pulls ahead after ${years(be)}`}`
                }}
                onHover={setHover}
                onPick={onPick}
              />
            </Suspense>
          )}
        </div>

        <div className="mt-4 lg:col-start-2 lg:row-start-2">
          {focus && (
            <div className="rounded-xl bg-stone-50 p-4 text-sm">
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
                    <dt className="whitespace-nowrap text-stone-500">{label}</dt>
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
            </div>
          )}
          <p className="mt-3 text-xs text-stone-400">
            These are our starting estimates with your settings; a real quote in the calculator
            replaces them. Shaded patches are the wards we count as each area — our own grouping,
            since these areas have no official borders. Unshaded parts of the city have no
            estimate yet. Circles mark areas outside the city boundary.
            {mapData && rows.filter((r) => mapData.areas[r.name]?.centre[0] > 13.16).map((r) => (
              <span key={r.name}>
                {' '}{r.name} is north of this view ({r[kind].breakEven === null ? 'never' : years(r[kind].breakEven)}) — drag the map down to see it.
              </span>
            ))}
          </p>
        </div>
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
