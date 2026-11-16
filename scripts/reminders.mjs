// Run on a schedule by GitHub (.github/workflows/reminders.yml). Prints, as
// JSON, the reminders that are due:
//   - a new RBI House Price Index quarter should be out
//   - shared quotes are waiting for review
// The workflow turns each one into a GitHub issue, which emails the repo owner.

import { hpiStatus } from '../src/data/hpi.js'

const reminders = []

const hpi = hpiStatus()
if (hpi.updateDue) {
  reminders.push({
    key: 'rbi-data',
    title: `RBI House Price Index: ${hpi.next.replace('.', ' ')} should be out`,
    body: [
      `The site holds data up to **${hpi.latest.replace('.', ' ')}**. The next quarter was due around ${hpi.nextDue}.`,
      '',
      'To update:',
      '1. Download "House Price Index" as a spreadsheet from RBI\'s data portal (data.rbi.org.in → Statistics → Real Sector → Prices & Wages).',
      '2. Run `python3 scripts/update_hpi.py <the downloaded file>`. Add the address of RBI\'s press release for the quarter as a second argument to update the source link.',
      '3. Run `npm test`, then commit and push.',
      '',
      'If RBI has not published it yet, leave this open; no new reminder is raised while it is.',
    ].join('\n'),
  })
}

const api = process.env.QUOTES_API
if (api) {
  try {
    const stats = await (await fetch(`${api}/stats`)).json()
    if (stats.waitingForReview > 0) {
      reminders.push({
        key: 'quotes-review',
        title: `${stats.waitingForReview} shared quote${stats.waitingForReview === 1 ? '' : 's'} waiting for review`,
        body: [
          'Some shared quotes were held back because they looked unusual or had a project name typed by hand.',
          '',
          'From the `worker` folder:',
          '- `npm run review` lists them',
          '- `npm run review -- approve <numbers>` publishes them',
          '- `npm run review -- approve-unnamed <numbers>` publishes without the project name',
          '- `npm run review -- reject <numbers>` deletes them',
        ].join('\n'),
      })
    }
  } catch (err) {
    console.error('Could not reach the quotes API:', err.message)
  }
}

console.log(JSON.stringify(reminders))
