import assert from 'node:assert/strict'
import test from 'node:test'

import { getDiskBackedScraperSources } from '../scraper-support/providers/sourceInventory.js'

test('getDiskBackedScraperSources excludes configured providers without a scraper folder', () => {
  const sources = getDiskBackedScraperSources({
    catalog: [
      { source: 'alpha', companyName: 'Alpha Inc.' },
      { source: 'beta', companyName: 'Beta Labs' },
    ],
    scraperDirectories: ['alpha', 'helpers'],
  })

  assert.deepEqual(sources, ['alpha'])
})
