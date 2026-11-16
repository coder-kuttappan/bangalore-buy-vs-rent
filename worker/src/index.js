// Buy vs Rent — shared quotes API (Cloudflare Worker + D1).
//
//   POST /quotes       share one quote
//   GET  /stats        per-area medians, once an area has enough quotes
//   GET  /quotes.csv   the open dataset
//   POST /hit          add one to today's anonymous tally for an event
//
// Nothing that identifies a person is stored: no names, no contact details, no
// IP addresses, and only the month of submission.

import projectList from '../../public/projects.json'
import { checkQuote, summarise, toCsv, MAX_PER_VISITOR_PER_DAY } from './quotes.js'

const knownProjects = new Set(projectList.projects.map(([name]) => name.toLowerCase()))

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim())
  const origin = request.headers.get('Origin')
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  }
}

const json = (data, status, headers) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...headers } })

// A one-way fingerprint of the visitor that changes every day and can't be
// turned back into an IP address. Used only to cap submissions per day.
async function visitorHash(request, env, day) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const bytes = new TextEncoder().encode(`${day}|${ip}|${env.HASH_SALT || 'dev-salt'}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

async function publishedRows(env) {
  const { results } = await env.DB
    .prepare("SELECT month, area, bhk, sqft, price_per_sqft, rent_monthly, tier, project_name, project_lat, project_lon FROM quotes WHERE status = 'ok' ORDER BY id")
    .all()
  return results
}

async function addQuote(request, env, cors) {
  let body
  try {
    const text = await request.text()
    if (text.length > 2000) return json({ error: 'Too much data.' }, 413, cors)
    body = JSON.parse(text)
  } catch {
    return json({ error: 'Could not read the quote.' }, 400, cors)
  }
  const checked = checkQuote(body, knownProjects)
  if (!checked.ok) return json({ error: checked.error }, 400, cors)

  const day = new Date().toISOString().slice(0, 10)
  const hash = await visitorHash(request, env, day)
  await env.DB.prepare('DELETE FROM submitters WHERE day < ?').bind(day).run()
  const seen = await env.DB.prepare('SELECT count FROM submitters WHERE day = ? AND hash = ?').bind(day, hash).first()
  if (seen && seen.count >= MAX_PER_VISITOR_PER_DAY) {
    return json({ error: 'That is enough quotes for one day. Thank you.' }, 429, cors)
  }
  await env.DB
    .prepare('INSERT INTO submitters (day, hash, count) VALUES (?, ?, 1) ON CONFLICT (day, hash) DO UPDATE SET count = count + 1')
    .bind(day, hash).run()

  const q = checked.quote
  await env.DB
    .prepare('INSERT INTO quotes (month, area, bhk, sqft, price_per_sqft, rent_monthly, tier, project_name, project_lat, project_lon, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(day.slice(0, 7), q.area, q.bhk, q.sqft, q.pricePerSqft, q.rentMonthly, q.tier, q.projectName, q.projectLat, q.projectLon, q.status)
    .run()

  const summary = summarise(await publishedRows(env))
  return json({ saved: true, published: q.status === 'ok', area: summary.areas[q.area] || null, minimumToShow: summary.minimumToShow }, 201, cors)
}

// Things worth counting. Anything else is ignored.
const EVENTS = ['view', 'share', 'quote_sent']

// Adds one to today's tally for an event. Stores a day, an event name and a
// number — nothing about the visitor.
async function addHit(request, env, cors) {
  const text = (await request.text()).slice(0, 100)
  let event = null
  try { event = JSON.parse(text).event } catch { /* ignore */ }
  if (!EVENTS.includes(event)) return new Response(null, { status: 204, headers: cors })
  const day = new Date().toISOString().slice(0, 10)
  await env.DB
    .prepare('INSERT INTO hits (day, event, n) VALUES (?, ?, 1) ON CONFLICT (day, event) DO UPDATE SET n = n + 1')
    .bind(day, event).run()
  return new Response(null, { status: 204, headers: cors })
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env)
    const { pathname } = new URL(request.url)
    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
      if (request.method === 'POST' && pathname === '/quotes') return await addQuote(request, env, cors)
      if (request.method === 'POST' && pathname === '/hit') return await addHit(request, env, cors)
      if (request.method === 'GET' && pathname === '/stats') {
        // the count of held quotes is public but says nothing about them; it
        // lets a scheduled check remind the owner to review
        const held = await env.DB.prepare("SELECT count(*) AS n FROM quotes WHERE status = 'review'").first()
        const summary = { ...summarise(await publishedRows(env)), waitingForReview: held?.n ?? 0 }
        return json(summary, 200, { ...cors, 'Cache-Control': 'public, max-age=300' })
      }
      if (request.method === 'GET' && pathname === '/quotes.csv') {
        return new Response(toCsv(await publishedRows(env)), {
          headers: { ...cors, 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
        })
      }
      return json({ error: 'Not found.' }, 404, cors)
    } catch (err) {
      console.error(err)
      return json({ error: 'Something went wrong on our side.' }, 500, cors)
    }
  },
}
