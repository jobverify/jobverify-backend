import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const testsDir = path.dirname(fileURLToPath(import.meta.url))

test('registers Temenos against the official first-party Workday careers source', () => {
  const catalog = getScraperCatalog()
  const temenos = catalog.find((provider) => provider.source === 'temenos')

  assert.ok(temenos)
  assert.equal(temenos.companyName, 'Temenos')
  assert.equal(temenos.adapter, 'workday')
  assert.equal(temenos.atsPlatform, 'workday')
  assert.equal(temenos.companyCareerPage, 'https://www.temenos.com/about-us/careers/')
  assert.equal(temenos.companyDomain, 'temenos.com')
  assert.match(temenos.baseUrl, /temenos\.wd103\.myworkdayjobs\.com\/en-US\/Temenoscareers/i)

  const scraper = buildScrapers().find((candidate) => candidate.name === 'temenos')
  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /temenos.workday[\\/]jobs\.json$/)
})

test('uses the Temenos Workday jobs API with India search text and a tenant-specific location pattern', () => {
  const config = loadConfig(path.join(testsDir, '../../scraper/temenos.workday'))

  assert.equal(config.listingStrategy, 'jobs-api')
  assert.equal(
    config.jobsApiUrl,
    'https://temenos.wd103.myworkdayjobs.com/wday/cxs/temenos/Temenoscareers/jobs',
  )
  assert.equal(config.detailUrlBase, 'https://temenos.wd103.myworkdayjobs.com/en-US/Temenoscareers')
  assert.equal(config.locationCountry, null)
  assert.equal(config.searchText, 'India')
  assert.match(
    config.locationPattern,
    /india|bangalore|bengaluru|hyderabad|chennai|perungudi|pune|gurgaon|gurugram|mumbai|noida/i,
  )
})
