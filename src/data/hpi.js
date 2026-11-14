// RBI House Price Index — Bangalore, quarterly.
//
// Source: Reserve Bank of India, Database on Indian Economy (data.rbi.org.in/DBIE
// > Statistics > Real Sector > Prices & Wages > House Price Index). RBI builds
// the index from sale values recorded by the registration authorities, so it
// tracks what was registered, not what sellers ask.
//
// Two series, because RBI rebased the index: the old one (2010-11 = 100, ten
// cities) ends at Q4 2024-25; the new one (2022-23 = 100, eighteen cities)
// starts at Q1 2022-23. They overlap for three years, which is what lets us
// join them. Quarters are Indian financial-year quarters (Q1 = Apr-Jun).
// The latest quarter is provisional when published (Q1.2026-27(P)).
//
// To refresh: download the spreadsheet from the path above and append the new
// rows to HPI_NEW. Everything derived from it recalculates.

export const HPI_SOURCE_URL = 'https://data.rbi.org.in/DBIE/#/dbie/home'

// base 2010-11 = 100
export const HPI_OLD = [
  ['Q1.2010-11', 98.64], ['Q2.2010-11', 97.9], ['Q3.2010-11', 97.94], ['Q4.2010-11', 105.52],
  ['Q1.2011-12', 110.68], ['Q2.2011-12', 107.83], ['Q3.2011-12', 138.6], ['Q4.2011-12', 133.35],
  ['Q1.2012-13', 133.33], ['Q2.2012-13', 136.58], ['Q3.2012-13', 141.18], ['Q4.2012-13', 141.94],
  ['Q1.2013-14', 142.27], ['Q2.2013-14', 150.37], ['Q3.2013-14', 169.26], ['Q4.2013-14', 184.29],
  ['Q1.2014-15', 180.4], ['Q2.2014-15', 174.6], ['Q3.2014-15', 183.08], ['Q4.2014-15', 202.7],
  ['Q1.2015-16', 208.42], ['Q2.2015-16', 208.01], ['Q3.2015-16', 205.92], ['Q4.2015-16', 190.02],
  ['Q1.2016-17', 220.61], ['Q2.2016-17', 220.11], ['Q3.2016-17', 225.14], ['Q4.2016-17', 218.35],
  ['Q1.2017-18', 227.66], ['Q2.2017-18', 221.0], ['Q3.2017-18', 225.64], ['Q4.2017-18', 232.93],
  ['Q1.2018-19', 244.84], ['Q2.2018-19', 245.79], ['Q3.2018-19', 243.25], ['Q4.2018-19', 256.15],
  ['Q1.2019-20', 265.98], ['Q2.2019-20', 273.58], ['Q3.2019-20', 283.8], ['Q4.2019-20', 273.84],
  ['Q1.2020-21', 308.76], ['Q2.2020-21', 297.72], ['Q3.2020-21', 319.13], ['Q4.2020-21', 316.78],
  ['Q1.2021-22', 333.74], ['Q2.2021-22', 313.17], ['Q3.2021-22', 315.92], ['Q4.2021-22', 281.01],
  ['Q1.2022-23', 320.35], ['Q2.2022-23', 324.48], ['Q3.2022-23', 331.08], ['Q4.2022-23', 326.85],
  ['Q1.2023-24', 336.44], ['Q2.2023-24', 331.08], ['Q3.2023-24', 352.06], ['Q4.2023-24', 355.67],
  ['Q1.2024-25', 364.82], ['Q2.2024-25', 360.11], ['Q3.2024-25', 362.44], ['Q4.2024-25', 375.51],
]

// base 2022-23 = 100
export const HPI_NEW = [
  ['Q1.2022-23', 98.23], ['Q2.2022-23', 97.37], ['Q3.2022-23', 102.05], ['Q4.2022-23', 102.35],
  ['Q1.2023-24', 102.24], ['Q2.2023-24', 101.91], ['Q3.2023-24', 113.39], ['Q4.2023-24', 112.73],
  ['Q1.2024-25', 114.63], ['Q2.2024-25', 113.16], ['Q3.2024-25', 114.76], ['Q4.2024-25', 120.63],
  ['Q1.2025-26', 119.96], ['Q2.2025-26', 118.96], ['Q3.2025-26', 121.2], ['Q4.2025-26', 123.1],
  ['Q1.2026-27', 127.08],
]

const average = (values) => values.reduce((sum, v) => sum + v, 0) / values.length

// 'Q3.2015-16' -> a running quarter number, so quarters can be compared
function quarterIndex(label) {
  const [, q, year] = label.match(/^Q([1-4])\.(\d{4})-\d{2}$/)
  return Number(year) * 4 + Number(q) - 1
}

// Growth per year, in %, over the `years` up to the latest published quarter.
// Compares the average of the latest four quarters with the average of the
// same four quarters `years` earlier — four-quarter averages because single
// quarters in this index jump around. The new series is scaled onto the old
// one using the financial year both cover in full (2022-23).
export function officialAppreciation(years = 10, oldSeries = HPI_OLD, newSeries = HPI_NEW) {
  const overlap = (series) => average(series.filter(([q]) => q.endsWith('.2022-23')).map(([, v]) => v))
  const scale = overlap(oldSeries) / overlap(newSeries)

  // one joined series on the old base: old values up to 2021-22, new values after
  const joined = new Map()
  for (const [q, v] of oldSeries) joined.set(quarterIndex(q), v)
  for (const [q, v] of newSeries) joined.set(quarterIndex(q), v * scale)

  const latest = quarterIndex(newSeries[newSeries.length - 1][0])
  const window = (end) => average([0, 1, 2, 3].map((back) => {
    const v = joined.get(end - back)
    if (v === undefined) throw new Error('House Price Index has a gap in the window needed')
    return v
  }))
  const growth = window(latest) / window(latest - years * 4)
  return {
    pct: (Math.pow(growth, 1 / years) - 1) * 100,
    years,
    asOf: newSeries[newSeries.length - 1][0], // e.g. 'Q1.2026-27'
  }
}
