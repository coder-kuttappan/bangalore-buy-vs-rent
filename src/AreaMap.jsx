import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// A real map of Bangalore. The wards that make up each of our areas are
// shaded by how long buying takes to pull ahead; the rest of the city is left
// unshaded because we have no estimate for it. Street map underneath from
// OpenStreetMap, ward boundaries from DataMeet (see scripts/build-map.mjs).

const NO_DATA = { color: '#a8a29e', weight: 0.6, opacity: 0.7, fill: false, interactive: false }

function circle(centre, km = 1.4, steps = 28) {
  const [lat, lon] = centre
  return Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * 2 * Math.PI
    return [lat + (km / 111.2) * Math.sin(t), lon + (km / (111.2 * Math.cos(lat * Math.PI / 180))) * Math.cos(t)]
  })
}

// colourFor(area) -> fill colour; labelFor(area) -> number on the map; tipFor(area) -> hover text
export default function AreaMap({ data, colourFor, labelFor, tipFor, selected, onHover, onPick }) {
  const holder = useRef(null)
  const mapRef = useRef(null)
  const shapes = useRef({}) // area name -> its polygons
  const labels = useRef({}) // area name -> its label marker
  const handlers = useRef({ onHover, onPick })
  useEffect(() => { handlers.current = { onHover, onPick } })

  // build the map once the ward data is in
  useEffect(() => {
    if (!data || mapRef.current) return
    const map = L.map(holder.current, { scrollWheelZoom: false, zoomSnap: 0.25, attributionControl: true })
    mapRef.current = map
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 15,
      minZoom: 9,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · wards: DataMeet (CC BY 4.0)',
    }).addTo(map)

    const city = [] // every point of every ward: the view is fitted to the city itself
    const byArea = {}
    for (const [area, rings] of data.wards) {
      city.push(...rings.flat())
      if (!area) L.polygon(rings, NO_DATA).addTo(map)
      else (byArea[area] ||= []).push(...rings)
    }
    for (const [area, info] of Object.entries(data.areas)) {
      const rings = byArea[area] || [circle(info.centre)]
      const layer = L.polygon(rings, { weight: 1, fillOpacity: 0.78 }).addTo(map)
      layer.on('mouseover', () => handlers.current.onHover(area))
      layer.on('mouseout', () => handlers.current.onHover(null))
      layer.on('click', () => handlers.current.onPick(area))
      layer.bindTooltip(area, { sticky: true, direction: 'top', opacity: 0.95 })
      shapes.current[area] = layer
      labels.current[area] = L.marker(info.centre, {
        interactive: false,
        icon: L.divIcon({ className: 'area-label', html: '', iconSize: [0, 0] }),
      }).addTo(map)
    }
    map.fitBounds(L.latLngBounds(city), { padding: [4, 4] })
    return () => { map.remove(); mapRef.current = null; shapes.current = {}; labels.current = {} }
  }, [data])

  // recolour and relabel whenever the numbers or the selection change
  useEffect(() => {
    for (const [area, layer] of Object.entries(shapes.current)) {
      const fill = colourFor(area)
      const isSelected = area === selected
      layer.setStyle({
        fillColor: fill,
        color: isSelected ? '#1c1917' : fill === '#f0fdfa' ? '#5eead4' : fill,
        weight: isSelected ? 2.5 : 1,
      })
      if (isSelected) layer.bringToFront()
      const el = labels.current[area]?.getElement()
      if (el) el.innerHTML = `<span>${labelFor(area)}</span>`
      layer.setTooltipContent(tipFor(area))
    }
  })

  return (
    <div
      ref={holder}
      className="area-map w-full overflow-hidden rounded-xl"
      role="application"
      aria-label="Map of Bangalore with areas shaded by years until buying pulls ahead"
    />
  )
}
