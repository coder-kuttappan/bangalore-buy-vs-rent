// Builds public/map.json: Bangalore's ward outlines, simplified, with each
// ward tagged with the area of ours it belongs to (or none).
//
// Ward boundaries: "Bangalore ward boundaries" by the DataMeet India community,
// CC BY 4.0 — https://github.com/datameet/Municipal_Spatial_Data
//
// Our 20 areas have no official borders. A ward is counted as part of an area
// when it carries the area's name, or when its centre lies within RADIUS_KM of
// the area's centre and no other area is closer. Everything else is left
// untagged and drawn as "no estimate". An area with no wards at all (outside
// the city boundary) is drawn as a circle at its location.
//
//   node scripts/build-map.mjs            downloads the boundaries
//   node scripts/build-map.mjs file.json  uses a saved copy

import { readFileSync, writeFileSync } from 'node:fs'

const SOURCE = 'https://raw.githubusercontent.com/datameet/Municipal_Spatial_Data/master/Bangalore/BBMP.geojson'
const RADIUS_KM = 1.6
const TOLERANCE = 0.00035 // simplification, in degrees (~35 m)

// name -> [lat, lon, ...ward-name fragments that mean "this is the area itself"]
const AREAS = {
  'Whitefield': [12.9698, 77.7500, 'whitefield'],
  'HSR Layout': [12.9116, 77.6474, 'hsr'],
  'Koramangala': [12.9352, 77.6245, 'koramangala'],
  'Sarjapur Road': [12.9010, 77.6860],
  'Indiranagar': [12.9719, 77.6412],
  'Hebbal': [13.0358, 77.5970, 'hebbala'],
  'Yelahanka': [13.1007, 77.5963, 'yelahanka'],
  'Electronic City': [12.8452, 77.6602],
  'Horamavu': [13.0270, 77.6600, 'horamavu'],
  'Thanisandra': [13.0580, 77.6330, 'thanisandra'],
  'Kalyan Nagar': [13.0240, 77.6400],
  'Hennur': [13.0410, 77.6430, 'hennur'],
  'Banaswadi': [13.0104, 77.6480, 'banasavadi'],
  'Kadugodi': [12.9950, 77.7610, 'kadugodi'],
  'Varthur': [12.9390, 77.7470, 'varthuru'],
  'Bannerghatta Road': [12.8880, 77.5970],
  'JP Nagar': [12.9063, 77.5857, 'j p nagar'],
  'Devanahalli': [13.2437, 77.7172],
  'Tumkur Road': [13.0300, 77.5200],
  'KR Puram': [13.0050, 77.6950, 'k r puram'],
}

const raw = process.argv[2]
  ? JSON.parse(readFileSync(process.argv[2], 'utf8'))
  : await (await fetch(SOURCE)).json()

const km = (a, b) => {
  const dLat = (a[0] - b[0]) * 111.2
  const dLon = (a[1] - b[1]) * 111.2 * Math.cos(a[0] * Math.PI / 180)
  return Math.hypot(dLat, dLon)
}

// outer rings of a Polygon or MultiPolygon, as [[lon, lat], ...]
const rings = (g) => (g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map((p) => p[0]))

function centre(ringList) {
  // centre of the largest ring's bounding box — good enough to place a ward
  const big = ringList.reduce((a, b) => (b.length > a.length ? b : a))
  const lons = big.map((p) => p[0])
  const lats = big.map((p) => p[1])
  return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lons) + Math.max(...lons)) / 2]
}

// Douglas–Peucker line simplification
function simplify(points, tolerance) {
  if (points.length < 5) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = points[a]
    const [bx, by] = points[b]
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy) || 1e-12
    let worst = 0
    let index = -1
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + bx * ay - by * ax) / len
      if (d > worst) { worst = d; index = i }
    }
    if (worst > tolerance) { keep[index] = 1; stack.push([a, index], [index, b]) }
  }
  return points.filter((_, i) => keep[i])
}
// A ward outline is a closed loop (first point = last point), which the line
// method above can't handle directly — so cut it at the point farthest from
// the start and simplify the two halves.
function simplifyRing(ring, tolerance) {
  let far = 0
  let farthest = 0
  for (let i = 1; i < ring.length - 1; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1])
    if (d > farthest) { farthest = d; far = i }
  }
  if (far === 0) return ring
  return [...simplify(ring.slice(0, far + 1), tolerance).slice(0, -1), ...simplify(ring.slice(far), tolerance)]
}
const round = (n) => Math.round(n * 1e4) / 1e4

const wards = raw.features.map((f) => {
  const ringList = rings(f.geometry)
  return { name: f.properties.KGISWardName, centre: centre(ringList), ringList, area: null }
})

// 1. wards that carry an area's name; the area's centre becomes that ward's centre
const centres = {}
for (const [area, [lat, lon, ...fragments]] of Object.entries(AREAS)) {
  centres[area] = [lat, lon]
  const named = wards.filter((w) => fragments.some((frag) => w.name.toLowerCase().includes(frag)))
  for (const w of named) w.area = area
  if (named.length) {
    centres[area] = [
      named.reduce((s, w) => s + w.centre[0], 0) / named.length,
      named.reduce((s, w) => s + w.centre[1], 0) / named.length,
    ]
  }
}
// 2. remaining wards join the nearest area if close enough
for (const w of wards) {
  if (w.area) continue
  let best = null
  let bestKm = RADIUS_KM
  for (const [area, c] of Object.entries(centres)) {
    const d = km(w.centre, c)
    if (d < bestKm) { best = area; bestKm = d }
  }
  w.area = best
}

const out = {
  credit: 'Ward boundaries: DataMeet India community, CC BY 4.0',
  areas: Object.fromEntries(Object.entries(centres).map(([area, c]) => [
    area,
    { centre: [round(c[0]), round(c[1])], wards: wards.filter((w) => w.area === area).length },
  ])),
  // each ward: [area or null, [ring, ring, ...]] with rings as [lat, lon] pairs
  wards: wards.map((w) => [
    w.area,
    w.ringList.map((r) => simplifyRing(r, TOLERANCE).map(([lon, lat]) => [round(lat), round(lon)])).filter((r) => r.length >= 4),
  ]),
}
writeFileSync(new URL('../public/map.json', import.meta.url), JSON.stringify(out))

for (const area of Object.keys(AREAS)) {
  const list = wards.filter((w) => w.area === area).map((w) => w.name)
  console.log(`${area.padEnd(18)} ${String(list.length).padStart(2)}  ${list.join(', ') || '(no wards — drawn as a circle)'}`)
}
console.log(`\n${wards.filter((w) => w.area).length} of ${wards.length} wards tagged. Wrote public/map.json`)
