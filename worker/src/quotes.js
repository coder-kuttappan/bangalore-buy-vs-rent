// Pure logic for shared quotes: checking a submission, summarising an area and
// preparing the public dataset. No network or database code here, so it can be
// tested directly.

import { AREAS, BHK_PRESETS } from '../../src/data/areas.js'

export const MIN_QUOTES_TO_SHOW = 5    // an area's numbers stay hidden below this
export const MIN_QUOTES_TO_NAME = 3    // a project is named in the dataset only at this many quotes
export const MAX_PER_VISITOR_PER_DAY = 5

const TIERS = ['low', 'mid', 'high']
const BHKS = BHK_PRESETS.map((b) => b.label)
// Bangalore, generously
const BOUNDS = { south: 12.7, north: 13.3, west: 77.3, east: 77.95 }

const wholeNumber = (v, min, max) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : null

function cleanName(v) {
  if (typeof v !== 'string') return null
  // drop control characters and anything that looks like markup, cap the length
  // eslint-disable-next-line no-control-regex
  const name = v.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
  return name.length >= 3 ? name : null
}

// Checks one submission. Returns { ok: true, quote } or { ok: false, error }.
// A quote that passes but looks unusual gets status 'review' and is not
// published until a person has looked at it.
export function checkQuote(body, knownProjects = new Set()) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Send the quote as a JSON object.' }
  const area = AREAS.find((a) => a.name === body.area)
  if (!area) return { ok: false, error: 'Unknown area.' }
  if (!BHKS.includes(body.bhk)) return { ok: false, error: 'Unknown flat size.' }
  const sqft = wholeNumber(body.sqft, 200, 10000)
  if (sqft === null) return { ok: false, error: 'Size should be between 200 and 10,000 sqft.' }

  const hasPrice = body.pricePerSqft !== undefined && body.pricePerSqft !== null
  const hasRent = body.rentMonthly !== undefined && body.rentMonthly !== null
  if (!hasPrice && !hasRent) return { ok: false, error: 'Give a price, a rent, or both.' }
  const pricePerSqft = hasPrice ? wholeNumber(body.pricePerSqft, 1500, 100000) : null
  const rentMonthly = hasRent ? wholeNumber(body.rentMonthly, 3000, 1000000) : null
  if (hasPrice && pricePerSqft === null) return { ok: false, error: 'Price per sqft should be between 1,500 and 1,00,000.' }
  if (hasRent && rentMonthly === null) return { ok: false, error: 'Monthly rent should be between 3,000 and 10,00,000.' }

  const tier = TIERS.includes(body.tier) ? body.tier : null
  const projectName = cleanName(body.project?.name)
  const lat = Number(body.project?.lat)
  const lon = Number(body.project?.lon)
  const located = projectName && lat >= BOUNDS.south && lat <= BOUNDS.north && lon >= BOUNDS.west && lon <= BOUNDS.east

  // reasons to hold a quote for a person to look at
  const reasons = []
  if (pricePerSqft !== null && (pricePerSqft < area.pricePerSqft.low * 0.6 || pricePerSqft > area.pricePerSqft.high * 1.8)) {
    reasons.push('price far from the usual range for this area')
  }
  if (pricePerSqft !== null && rentMonthly !== null) {
    const yieldPct = (rentMonthly * 12) / (pricePerSqft * sqft) * 100
    if (yieldPct < 1.5 || yieldPct > 8) reasons.push('rent and price do not fit together')
  }
  if (rentMonthly !== null && pricePerSqft === null) {
    const perSqft = rentMonthly / sqft
    if (perSqft < 8 || perSqft > 120) reasons.push('rent far from the usual range')
  }
  if (projectName && !knownProjects.has(projectName.toLowerCase())) reasons.push('project name typed by hand')

  return {
    ok: true,
    reasons,
    quote: {
      area: area.name,
      bhk: body.bhk,
      sqft,
      pricePerSqft,
      rentMonthly,
      tier,
      projectName,
      projectLat: located ? Math.round(lat * 1e4) / 1e4 : null,
      projectLon: located ? Math.round(lon * 1e4) / 1e4 : null,
      status: reasons.length ? 'review' : 'ok',
    },
  }
}

export function median(values) {
  const sorted = values.filter((v) => v !== null && v !== undefined).sort((a, b) => a - b)
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

// Published summary per area. Rows are database rows with status 'ok'. An area
// appears only once it has enough quotes; medians, so one odd entry can't move it.
export function summarise(rows) {
  const byArea = new Map()
  for (const row of rows) {
    if (!byArea.has(row.area)) byArea.set(row.area, [])
    byArea.get(row.area).push(row)
  }
  const areas = {}
  for (const [area, list] of byArea) {
    if (list.length < MIN_QUOTES_TO_SHOW) continue
    const prices = list.map((r) => r.price_per_sqft).filter((v) => v !== null)
    const rents = list.map((r) => r.rent_monthly).filter((v) => v !== null)
    areas[area] = {
      quotes: list.length,
      medianPricePerSqft: prices.length >= MIN_QUOTES_TO_SHOW ? median(prices) : null,
      medianRentPerSqft: rents.length >= MIN_QUOTES_TO_SHOW
        ? Math.round(median(list.filter((r) => r.rent_monthly !== null).map((r) => r.rent_monthly / r.sqft)) * 10) / 10
        : null,
    }
  }
  return { totalQuotes: rows.length, minimumToShow: MIN_QUOTES_TO_SHOW, areas }
}

// The open dataset as CSV. A project is named only when several people have
// quoted it, so a single entry can't be tied to one household.
export function toCsv(rows) {
  const perProject = new Map()
  for (const r of rows) if (r.project_name) perProject.set(r.project_name, (perProject.get(r.project_name) || 0) + 1)
  const cell = (v) => {
    if (v === null || v === undefined) return ''
    const text = String(v)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const lines = ['month,area,bhk,sqft,price_per_sqft,rent_monthly,tier,project,lat,lon']
  for (const r of rows) {
    const named = r.project_name && perProject.get(r.project_name) >= MIN_QUOTES_TO_NAME
    lines.push([
      r.month, r.area, r.bhk, r.sqft, r.price_per_sqft, r.rent_monthly, r.tier,
      named ? r.project_name : null, named ? r.project_lat : null, named ? r.project_lon : null,
    ].map(cell).join(','))
  }
  return lines.join('\n') + '\n'
}
