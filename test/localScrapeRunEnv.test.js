import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_LOCAL_SCRAPE_ENV,
  buildLocalScrapeRunEnv,
} from '../scripts/localScrapeRunEnv.js'

test('local scrape launchers keep the runner default Workday timeout unless explicitly overridden', () => {
  assert.equal(DEFAULT_LOCAL_SCRAPE_ENV.WORKDAY_SCRAPER_TIMEOUT_MS, '210000')
  assert.equal(
    buildLocalScrapeRunEnv({}).WORKDAY_SCRAPER_TIMEOUT_MS,
    '210000',
  )
})

test('local scrape launchers preserve explicit Workday timeout overrides', () => {
  assert.equal(
    buildLocalScrapeRunEnv({
      WORKDAY_SCRAPER_TIMEOUT_MS: '90000',
    }).WORKDAY_SCRAPER_TIMEOUT_MS,
    '90000',
  )
})
