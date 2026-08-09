import assert from 'node:assert/strict'
import test from 'node:test'

import { formatFinalSummaryTable } from '../scraper-support/finalSummaryFormatter.js'

test('formatFinalSummaryTable renders an ASCII-safe summary table', () => {
  const output = formatFinalSummaryTable({
    ascendion: {
      success: true,
      jobs: 173,
      inserted: 0,
      updated: 0,
      durationMs: 18_600,
    },
    ashokleyland: {
      success: false,
      softFailure: true,
      jobs: 0,
      inserted: 0,
      updated: 0,
      durationMs: 6_700,
    },
    backyardcreators: {
      success: false,
      softFailure: false,
      jobs: 0,
      inserted: 0,
      updated: 0,
      durationMs: 9_400,
    },
  })

  assert.match(output, /^[\x0A\x0D\x20-\x7E]+$/)
  assert.equal(
    output,
    [
      'Source           | Status   | Jobs | New | Updated | Time ',
      '-----------------|----------|------|-----|---------|------',
      'ascendion        | OK       | 173  | 0   | 0       | 18.6s',
      'ashokleyland     | Upstream | 0    | 0   | 0       | 6.7s ',
      'backyardcreators | Fail     | 0    | 0   | 0       | 9.4s ',
    ].join('\n'),
  )
})
