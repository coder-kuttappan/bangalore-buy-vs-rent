// Builds public/projects.json: named apartment projects and residential
// layouts in Bangalore, from OpenStreetMap. Used for the project picker when
// someone shares a quote.
//
// OpenStreetMap data is open (ODbL): it may be stored and republished with
// credit to "OpenStreetMap contributors". Run occasionally to pick up new
// projects:   node scripts/fetch-projects.mjs
// Pass a saved Overpass response to skip the download:
//             node scripts/fetch-projects.mjs response.json

import { readFileSync, writeFileSync } from 'node:fs'

const BBOX = '12.83,77.45,13.16,77.80' // south, west, north, east
const QUERY = `[out:json][timeout:90];(
  nwr["landuse"="residential"]["name"](${BBOX});
  nwr["building"~"^(apartments|residential)$"]["name"](${BBOX});
);out center tags;`
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

async function download() {
  for (const server of SERVERS) {
    const res = await fetch(server, {
      method: 'POST',
      headers: { 'User-Agent': 'buy-vs-rent-projects/1.0' },
      body: new URLSearchParams({ data: QUERY }),
    })
    if (res.ok) return res.json()
    console.error(`${server} answered ${res.status}, trying the next one`)
  }
  throw new Error('No Overpass server answered. Try again later.')
}

const raw = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : await download()

const seen = new Map()
for (const el of raw.elements) {
  const name = (el.tags?.name || '').replace(/\s+/g, ' ').trim()
  const lat = el.center?.lat ?? el.lat
  const lon = el.center?.lon ?? el.lon
  // skip unnamed, one-word generic labels and anything without a position
  if (name.length < 4 || lat === undefined || /^(apartments?|residential|flats?|block [a-z0-9]+)$/i.test(name)) continue
  const key = name.toLowerCase()
  if (!seen.has(key)) seen.set(key, [name, Math.round(lat * 1e4) / 1e4, Math.round(lon * 1e4) / 1e4])
}
const projects = [...seen.values()].sort((a, b) => a[0].localeCompare(b[0]))

writeFileSync(
  new URL('../public/projects.json', import.meta.url),
  JSON.stringify({ source: 'OpenStreetMap contributors (ODbL)', fetched: new Date().toISOString().slice(0, 10), projects }),
)
console.log(`Wrote ${projects.length} projects to public/projects.json`)
