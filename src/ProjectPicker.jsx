import { useEffect, useState } from 'react'
import { suggestProjects } from './lib/quotes'

// "Which project or building is this?" — a text box with suggestions from the
// OpenStreetMap project list. Calls onChange with { name } for typed text, or
// { name, lat, lon } once a suggestion is picked.
export default function ProjectPicker({ value, onChange }) {
  const [projects, setProjects] = useState(null)
  const [wanted, setWanted] = useState(false) // load the list the first time the box is used
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!wanted || projects) return
    fetch(`${import.meta.env.BASE_URL}projects.json`)
      .then((r) => r.json())
      .then((d) => setProjects(d.projects))
      .catch(() => setProjects([]))
  }, [wanted, projects])

  const picked = value?.lat !== undefined
  const suggestions = focused && !picked ? suggestProjects(projects || [], value?.name || '') : []

  return (
    <div className="relative">
      <input
        type="text"
        value={value?.name || ''}
        maxLength={80}
        placeholder="Start typing, e.g. Prestige…"
        onFocus={() => { setWanted(true); setFocused(true) }}
        onBlur={() => setTimeout(() => setFocused(false), 150)} // let a click on a suggestion land first
        onChange={(e) => onChange(e.target.value ? { name: e.target.value } : null)}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-base
                   focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 sm:text-sm"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-stone-200 bg-white shadow-lg">
          {suggestions.map((p) => (
            <li key={p[0]}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange({ name: p[0], lat: p[1], lon: p[2] }); setFocused(false) }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-stone-50"
              >
                {p[0]}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-xs text-stone-400">
        {picked
          ? 'Picked from the list.'
          : 'Optional. Pick from the list if it appears.'}
        {' '}Only used if you share your quote below. Names © OpenStreetMap contributors.
      </p>
    </div>
  )
}
