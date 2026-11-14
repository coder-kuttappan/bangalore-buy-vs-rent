// Tests for the shared-quotes logic used by the Worker.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkQuote, summarise, toCsv, median, MIN_QUOTES_TO_SHOW } from '../worker/src/quotes.js'

const good = { area: 'Horamavu', bhk: '2 BHK', sqft: 1150, pricePerSqft: 6500, rentMonthly: 26000, tier: 'mid' }
const known = new Set(['prestige gulmohar'])

test('a sensible quote is accepted and published', () => {
  const r = checkQuote(good, known)
  assert.equal(r.ok, true)
  assert.equal(r.quote.status, 'ok')
  assert.deepEqual(Object.keys(r.quote).sort(), ['area', 'bhk', 'pricePerSqft', 'projectLat', 'projectLon', 'projectName', 'rentMonthly', 'sqft', 'status', 'tier'].sort())
})

test('only the listed fields are kept, whatever else is sent', () => {
  const r = checkQuote({ ...good, salary: 5000000, email: 'a@b.c', downPayment: 1 }, known)
  assert.equal('salary' in r.quote, false)
  assert.equal('email' in r.quote, false)
})

test('a price alone or a rent alone is fine; neither is not', () => {
  assert.equal(checkQuote({ ...good, rentMonthly: undefined }, known).quote.rentMonthly, null)
  assert.equal(checkQuote({ ...good, pricePerSqft: null }, known).quote.pricePerSqft, null)
  assert.equal(checkQuote({ ...good, pricePerSqft: null, rentMonthly: null }, known).ok, false)
})

test('nonsense is rejected outright', () => {
  for (const bad of [
    null, 'text', { ...good, area: 'Atlantis' }, { ...good, bhk: '9 BHK' }, { ...good, sqft: 5 },
    { ...good, pricePerSqft: 10 }, { ...good, pricePerSqft: 'lots' }, { ...good, rentMonthly: 1e9 },
    { ...good, sqft: NaN },
  ]) assert.equal(checkQuote(bad, known).ok, false)
})

test('unusual but possible quotes are held for review, not published', () => {
  assert.equal(checkQuote({ ...good, pricePerSqft: 30000 }, known).quote.status, 'review')  // far above the area
  assert.equal(checkQuote({ ...good, rentMonthly: 200000 }, known).quote.status, 'review')  // rent and price don't fit
  assert.equal(checkQuote({ ...good, pricePerSqft: null, rentMonthly: 4000 }, known).quote.status, 'review')
})

test('a project from the list is kept with its position; a hand-typed one waits for review', () => {
  const listed = checkQuote({ ...good, project: { name: 'Prestige Gulmohar', lat: 13.029, lon: 77.6651 } }, known)
  assert.equal(listed.quote.status, 'ok')
  assert.equal(listed.quote.projectName, 'Prestige Gulmohar')
  assert.equal(listed.quote.projectLat, 13.029)
  const typed = checkQuote({ ...good, project: { name: '  My <b>Own</b>   Towers ' } }, known)
  assert.equal(typed.quote.status, 'review')
  assert.equal(typed.quote.projectName, 'My bOwn/b Towers')
  // a position outside Bangalore is dropped
  assert.equal(checkQuote({ ...good, project: { name: 'Prestige Gulmohar', lat: 28.6, lon: 77.2 } }, known).quote.projectLat, null)
})

const row = (over = {}) => ({ month: '2026-11', area: 'Horamavu', bhk: '2 BHK', sqft: 1000, price_per_sqft: 6000, rent_monthly: 25000, tier: 'mid', project_name: null, project_lat: null, project_lon: null, ...over })

test('median handles odd, even and empty lists', () => {
  assert.equal(median([3, 1, 2]), 2)
  assert.equal(median([4, 1, 3, 2]), 3)
  assert.equal(median([]), null)
})

test('an area is shown only once it has enough quotes, as medians', () => {
  const few = Array.from({ length: MIN_QUOTES_TO_SHOW - 1 }, () => row())
  assert.deepEqual(summarise(few).areas, {})
  const enough = [5000, 6000, 7000, 8000, 90000].map((p) => row({ price_per_sqft: p }))
  const s = summarise(enough)
  assert.equal(s.areas.Horamavu.quotes, 5)
  assert.equal(s.areas.Horamavu.medianPricePerSqft, 7000) // the 90,000 outlier doesn't move it
  assert.equal(s.areas.Horamavu.medianRentPerSqft, 25)
  assert.equal(s.totalQuotes, 5)
})

test('the open dataset names a project only when several people have quoted it', () => {
  const rows = [
    row({ project_name: 'Solo Heights', project_lat: 13.0, project_lon: 77.6 }),
    ...[1, 2, 3].map(() => row({ project_name: 'Busy "Park", Phase 1', project_lat: 13.01, project_lon: 77.61 })),
  ]
  const csv = toCsv(rows).trim().split('\n')
  assert.equal(csv[0], 'month,area,bhk,sqft,price_per_sqft,rent_monthly,tier,project,lat,lon')
  assert.equal(csv[1], '2026-11,Horamavu,2 BHK,1000,6000,25000,mid,,,')
  assert.equal(csv[2], '2026-11,Horamavu,2 BHK,1000,6000,25000,mid,"Busy ""Park"", Phase 1",13.01,77.61')
  assert.equal(csv.length, 5)
})

test('the page sends only the chosen fields', async () => {
  const { quotePayload, versusMedian, suggestProjects } = await import('../src/lib/quotes.js')
  const base = { area: 'Horamavu', bhk: '2 BHK', sqft: 1150, pricePerSqft: 9800, rentMonthly: 38000, tier: 'high' }
  assert.deepEqual(
    quotePayload({ ...base, sharePrice: true, shareRent: false, project: { name: '' }, salary: 1, marginalTaxPct: 30 }),
    { area: 'Horamavu', bhk: '2 BHK', sqft: 1150, pricePerSqft: 9800, tier: 'high' },
  )
  assert.deepEqual(
    quotePayload({ ...base, sharePrice: false, shareRent: true, project: { name: 'Prestige Gulmohar', lat: 13.029, lon: 77.6651 } }).project,
    { name: 'Prestige Gulmohar', lat: 13.029, lon: 77.6651 },
  )
  assert.deepEqual(quotePayload({ ...base, sharePrice: true, shareRent: true, project: { name: ' Typed Name ' } }).project, { name: 'Typed Name' })
  // what the page sends passes the server's own check
  assert.equal(checkQuote(quotePayload({ ...base, sharePrice: true, shareRent: true, project: null }), known).ok, true)

  assert.equal(versusMedian(108, 100), '8% above')
  assert.equal(versusMedian(95, 100), '5% below')
  assert.equal(versusMedian(100.2, 100), 'in line with')
  assert.equal(versusMedian(100, null), null)

  const list = [['Sobha Prestige View', 1, 2], ['Prestige Gulmohar', 3, 4], ['Prestige Shantiniketan', 5, 6], ['Brigade Gateway', 7, 8]]
  assert.deepEqual(suggestProjects(list, 'pres').map((p) => p[0]), ['Prestige Gulmohar', 'Prestige Shantiniketan', 'Sobha Prestige View'])
  assert.deepEqual(suggestProjects(list, 'p'), [])
})
