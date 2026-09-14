import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { getScraperCatalog } from '../providers/index.js'
import { loadConfig } from '../utils/loadConfig.js'

const testsDir = path.dirname(fileURLToPath(import.meta.url))

test('Accenture Workday config avoids the capped generic India country facet', () => {
  const config = loadConfig(path.join(testsDir, '../../scraper/accenture.workday'))

  assert.equal(config.listingStrategy, 'jobs-api')
  assert.equal(
    config.jobsApiUrl,
    'https://accenture.wd103.myworkdayjobs.com/wday/cxs/accenture/AccentureCareers/jobs',
  )
  assert.equal(
    config.detailUrlBase,
    'https://accenture.wd103.myworkdayjobs.com/AccentureCareers',
  )
  assert.equal(config.locationCountry, null)
  assert.equal(config.searchText, 'India')
  assert.match(
    config.locationPattern,
    /india|bengaluru|bangalore|hyderabad|gurugram|gurgaon|pune|chennai|mumbai/i,
  )
})

test('active Accenture Workday catalog disables dry-run public-page refetch', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'accenture')

  assert.equal(provider?.dryRunEnrichPublicExperience, false)
})
