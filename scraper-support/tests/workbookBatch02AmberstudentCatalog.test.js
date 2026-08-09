import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('Amberstudent is wired to a verified SmartRecruiters-backed live scraper instead of the generic sentinel', async () => {
  const provider = getScraperCatalog().find((item) => item.source === 'amberstudent')
  const scraper = buildScrapers().find((item) => item.name === 'amberstudent')

  assert.ok(provider)
  assert.ok(scraper)

  assert.equal(provider.companyName, 'Amberstudent')
  assert.equal(provider.companyCareerPage, 'https://amberstudent.com/career')
  assert.equal(provider.companyDomain, 'amberstudent.com')
  assert.equal(
    provider.officialJobsBoardUrl,
    'https://careers.smartrecruiters.com/amberstudent',
  )
  assert.equal(provider.atsPlatform, 'smartrecruiters')
  assert.equal(provider.paginationStrategy, 'official-first-party-page-plus-smartrecruiters-board-and-api')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+public-smartrecruiters-board+detail-api+india-filter',
  )
  assert.equal(provider.verifiedOn, '2026-07-30')
  assert.equal(provider.verifiedPublicJobCount, 1)
  assert.equal(provider.verifiedIndiaJobCount, 1)
  assert.equal(provider.smartRecruitersCompanyIdentifier, 'amberstudent')
  assert.equal(
    provider.smartRecruitersListingApiUrl,
    'https://api.smartrecruiters.com/v1/companies/amberstudent/postings',
  )
  assert.equal(
    provider.smartRecruitersDetailApiUrlTemplate,
    'https://api.smartrecruiters.com/v1/companies/amberstudent/postings/{{jobId}}',
  )
  assert.equal(scraper.provider.modulePath, provider.modulePath)
  assert.match(provider.modulePath, /[\\/]amberstudent[\\/]script\.js$/)
})
