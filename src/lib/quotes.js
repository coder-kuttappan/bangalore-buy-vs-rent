// Talking to the shared-quotes API. If no API address is configured the
// sharing features simply don't appear, and the calculator works as before.

export const QUOTES_API = (import.meta.env?.VITE_QUOTES_API || '').replace(/\/$/, '')
export const sharingEnabled = QUOTES_API !== ''

// Exactly what is sent when someone shares a quote — nothing else leaves the
// browser. No salary, tax, down payment or loan details.
export function quotePayload({ area, bhk, sqft, pricePerSqft, rentMonthly, tier, project, sharePrice, shareRent }) {
  const payload = { area, bhk, sqft }
  if (sharePrice) payload.pricePerSqft = pricePerSqft
  if (shareRent) payload.rentMonthly = rentMonthly
  if (tier) payload.tier = tier
  const name = (project?.name || '').trim()
  if (name) payload.project = project.lat !== undefined ? { name, lat: project.lat, lon: project.lon } : { name }
  return payload
}

export async function sendQuote(payload) {
  const res = await fetch(`${QUOTES_API}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not save the quote. Please try again later.')
  return data
}

export async function fetchStats() {
  const res = await fetch(`${QUOTES_API}/stats`)
  if (!res.ok) throw new Error('stats unavailable')
  return res.json()
}

// "8% above" / "5% below" / "in line with" a median
export function versusMedian(value, median) {
  if (!median) return null
  const pct = Math.round((value / median - 1) * 100)
  if (pct === 0) return 'in line with'
  return `${Math.abs(pct)}% ${pct > 0 ? 'above' : 'below'}`
}

// Best matches for what the user has typed: names starting with it first,
// then names containing it.
export function suggestProjects(projects, typed, limit = 8) {
  const q = typed.trim().toLowerCase()
  if (q.length < 2) return []
  const starts = []
  const contains = []
  for (const p of projects) {
    const name = p[0].toLowerCase()
    if (name.startsWith(q)) starts.push(p)
    else if (name.includes(q)) contains.push(p)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}
