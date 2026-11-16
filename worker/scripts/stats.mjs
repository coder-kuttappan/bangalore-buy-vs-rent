// Anonymous usage tally for the last 30 days. Run from the worker folder:
//   npm run stats
import { execFileSync } from 'node:child_process'

const out = execFileSync('npx', ['wrangler', 'd1', 'execute', 'buyvsrent-quotes', '--remote', '--yes', '--json', '--command',
  "SELECT day, event, n FROM hits WHERE day >= date('now', '-30 days') ORDER BY day DESC, event"], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const rows = JSON.parse(out)[0].results
if (!rows.length) console.log('No activity recorded in the last 30 days.')
const days = new Map()
for (const r of rows) days.set(r.day, { ...(days.get(r.day) || {}), [r.event]: r.n })
console.log('day         views  shares  quotes sent')
for (const [day, e] of days) console.log(`${day}  ${String(e.view || 0).padStart(5)}  ${String(e.share || 0).padStart(6)}  ${String(e.quote_sent || 0).padStart(11)}`)
const total = (k) => rows.filter((r) => r.event === k).reduce((s, r) => s + r.n, 0)
console.log(`\n30-day totals: ${total('view')} views, ${total('share')} shares, ${total('quote_sent')} quotes sent. Counts include bots.`)
