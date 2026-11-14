import { useState } from 'react'
import { inrFull, years } from './lib/format'
import { FD_RETURN, EQUITY_RETURN } from './lib/scenario'

function Verdict({ result }) {
  const buy = result.verdict === 'buy'
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        buy ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'
      }`}
    >
      {buy ? 'Buy' : 'Rent'}
    </span>
  )
}

const BAR_MAX_YEARS = 20

// All areas at a glance: how long buying takes to pull ahead, and who wins
// over the comparison window with savings in an FD or in equity funds.
export default function Compare({ rows, bhk, horizonYears, selected, onPick }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? rows : rows.slice(0, 6)
  const fdBuys = rows.filter((r) => r.fd.verdict === 'buy').length
  const equityBuys = rows.filter((r) => r.equity.verdict === 'buy').length

  return (
    <section className="mb-8 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold tracking-tight">Where does buying win?</h2>
      <p className="mt-1 text-sm text-stone-600">
        For a {bhk} over {horizonYears} years, buying comes out ahead in{' '}
        <strong>{fdBuys} of {rows.length}</strong> areas if your spare money sits in a fixed
        deposit — and in <strong>{equityBuys} of {rows.length}</strong> if it goes into equity
        funds.
      </p>
      <p className="mt-1 text-xs text-stone-400">
        Each row uses our starting numbers for that area and your settings below. Pick a row
        to open it in the calculator.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-400">
              <th className="py-2 pr-3 font-medium">Area</th>
              <th className="py-2 pr-3 font-medium">
                <span className="sm:hidden">Break-even</span>
                <span className="hidden sm:inline">Buying pulls ahead after</span>
              </th>
              <th className="py-2 pr-2 text-center font-medium" title={`Fixed deposit, ${FD_RETURN}%`}>FD</th>
              <th className="py-2 text-center font-medium" title={`Equity funds, ${EQUITY_RETURN}%`}>Equity</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const be = r.fd.breakEven
              const width = be === null ? 100 : Math.min(be / BAR_MAX_YEARS, 1) * 100
              return (
                <tr
                  key={r.name}
                  onClick={() => onPick(r.name)}
                  className={`cursor-pointer border-b border-stone-100 transition hover:bg-stone-50 ${
                    r.name === selected ? 'bg-teal-50/60' : ''
                  }`}
                >
                  <td className="py-2 pr-3">
                    <button type="button" className="text-left font-medium text-stone-800">
                      {r.name}
                    </button>
                    <div className="text-xs text-stone-400">
                      {inrFull(r.pricePerSqft)}/sqft · rent {inrFull(r.rentMonthly)}
                    </div>
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="hidden h-1.5 w-28 shrink-0 rounded-full bg-stone-100 sm:block">
                        <div
                          className={`h-1.5 rounded-full ${be !== null && be <= horizonYears ? 'bg-teal-600' : 'bg-indigo-400'}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-stone-700">
                        {be === null ? '40+ yr' : years(be)}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-center"><Verdict result={r.fd} /></td>
                  <td className="py-2 text-center"><Verdict result={r.equity} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {rows.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm font-medium text-teal-700 hover:underline"
        >
          {showAll ? 'Show fewer' : `Show all ${rows.length} areas`}
        </button>
      )}
      <p className="mt-3 text-xs text-stone-400">
        Break-even is with savings in an FD. FD and Equity show who is richer
        after {horizonYears} years. Appreciation starts at the official end of each area's
        range, so these lean cautious on buying.
      </p>
    </section>
  )
}
