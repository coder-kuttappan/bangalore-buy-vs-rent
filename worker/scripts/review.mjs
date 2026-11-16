// Review quotes that were held back (unusual numbers, or a project name typed
// by hand). Run from the worker folder:
//
//   npm run review                      list what is waiting
//   npm run review -- approve 12 15     publish quotes 12 and 15 as they are
//   npm run review -- approve-unnamed 12  publish quote 12 without its project name
//   npm run review -- reject 13         delete quote 13
//
// Uses your Cloudflare login (npx wrangler login).

import { execFileSync } from 'node:child_process'

const DB = 'buyvsrent-quotes'
function sql(command) {
  const out = execFileSync('npx', ['wrangler', 'd1', 'execute', DB, '--remote', '--yes', '--json', '--command', command], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  })
  return JSON.parse(out)[0].results
}

const [action, ...rest] = process.argv.slice(2)
// ids must be whole numbers — nothing else is ever put into the SQL
const ids = rest.map((v) => { if (!/^\d+$/.test(v)) throw new Error(`Not a quote number: ${v}`); return Number(v) })

if (!action) {
  const rows = sql("SELECT id, month, area, bhk, sqft, price_per_sqft, rent_monthly, tier, project_name FROM quotes WHERE status = 'review' ORDER BY id")
  if (!rows.length) console.log('Nothing waiting for review.')
  for (const r of rows) {
    const yieldPct = r.price_per_sqft && r.rent_monthly ? ((r.rent_monthly * 12) / (r.price_per_sqft * r.sqft) * 100).toFixed(1) + '% yield' : ''
    console.log(`#${r.id}  ${r.month}  ${r.area}, ${r.bhk}, ${r.sqft} sqft  price ${r.price_per_sqft ?? '-'}/sqft  rent ${r.rent_monthly ?? '-'}  ${yieldPct}  tier ${r.tier ?? '-'}  project ${r.project_name ? JSON.stringify(r.project_name) : '-'}`)
  }
  if (rows.length) console.log('\nThen: npm run review -- approve <numbers> | approve-unnamed <numbers> | reject <numbers>')
} else if (!ids.length) {
  throw new Error('Give one or more quote numbers.')
} else if (action === 'approve') {
  sql(`UPDATE quotes SET status = 'ok' WHERE status = 'review' AND id IN (${ids.join(',')})`)
  console.log(`Published: ${ids.join(', ')}`)
} else if (action === 'approve-unnamed') {
  sql(`UPDATE quotes SET status = 'ok', project_name = NULL, project_lat = NULL, project_lon = NULL WHERE status = 'review' AND id IN (${ids.join(',')})`)
  console.log(`Published without project name: ${ids.join(', ')}`)
} else if (action === 'reject') {
  sql(`DELETE FROM quotes WHERE status = 'review' AND id IN (${ids.join(',')})`)
  console.log(`Deleted: ${ids.join(', ')}`)
} else {
  throw new Error(`Unknown action: ${action}. Use approve, approve-unnamed or reject.`)
}
