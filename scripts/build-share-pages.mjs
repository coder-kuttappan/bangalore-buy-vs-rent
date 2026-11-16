// Runs after the site is built. Writes one small page per area at
// dist/a/<area>/index.html. Each carries that area's headline for link
// previews ("Whitefield: buying pulls ahead after about 6 years"), then sends
// the visitor straight to the calculator with their scenario intact.
//
// Link previews are fetched by servers that never see the part of a link after
// "#", which is where the scenario lives — so the preview can only describe the
// area's typical estimate, not the sharer's own numbers. The page says so.

import { mkdirSync, writeFileSync } from 'node:fs'
import { simulate, findBreakEven } from '../src/lib/calc.js'
import { compareAreas, defaultsFor } from '../src/lib/scenario.js'
import { years } from '../src/lib/format.js'

const SITE = 'https://buyvsrent.coderkuttappan.com'
const esc = (t) => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const rows = compareAreas(defaultsFor(), simulate, findBreakEven)
for (const r of rows) {
  const slug = r.name.toLowerCase().replace(/ /g, '-')
  const fd = r.fd.breakEven === null ? 'buying never catches up with renting' : `buying pulls ahead of renting after about ${years(Math.round(r.fd.breakEven * 2) / 2)}`
  const equity = r.equity.breakEven === null ? 'never' : `after about ${years(Math.round(r.equity.breakEven * 2) / 2)}`
  const title = `${r.name}: ${fd}`
  const description = `Typical 2 BHK in ${r.name}, with savings in a fixed deposit. With equity funds: ${equity}. Put in your own price and rent to see your answer.`
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(title)} — Buy vs Rent Bangalore</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="robots" content="noindex" />
    <link rel="canonical" href="${SITE}/" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${SITE}/a/${slug}/" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${SITE}/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <script>location.replace('/' + (location.hash || '#a=' + ${JSON.stringify(encodeURIComponent(r.name).replace(/%20/g, '+'))}))</script>
  </head>
  <body>
    <p><a href="/#a=${encodeURIComponent(r.name).replace(/%20/g, '+')}">Open ${esc(r.name)} in the Buy vs Rent Bangalore calculator</a></p>
  </body>
</html>
`
  mkdirSync(new URL(`../dist/a/${slug}/`, import.meta.url), { recursive: true })
  writeFileSync(new URL(`../dist/a/${slug}/index.html`, import.meta.url), html)
}
console.log(`Wrote ${rows.length} area share pages to dist/a/`)
