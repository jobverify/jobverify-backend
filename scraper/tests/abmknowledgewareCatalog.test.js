import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const loadAbmKnowledgewareModule = async () => {
  try {
    return await import('../abmknowledgeware/script.js')
  } catch {
    return null
  }
}

test('ABM Knowledgeware exports verified resume-only first-party metadata', async () => {
  const abmKnowledgeware = await loadAbmKnowledgewareModule()
  assert.ok(
    abmKnowledgeware,
    'Expected ABM Knowledgeware scraper module at ../abmknowledgeware/script.js',
  )

  assert.equal(abmKnowledgeware.SOURCE, 'abmknowledgeware')
  assert.equal(abmKnowledgeware.COMPANY, 'ABM Knowledgeware')
  assert.equal(abmKnowledgeware.COMPANY_DOMAIN, 'abmindia.com')
  assert.equal(abmKnowledgeware.VERIFIED_AT, '2026-07-14')
  assert.equal(abmKnowledgeware.HOMEPAGE_URL, 'https://www.abmindia.com/')
  assert.equal(abmKnowledgeware.CAREERS_URL, 'https://abmindia.com/home/abm_career')
  assert.deepEqual(abmKnowledgeware.SCRAPER_METADATA, {
    source: 'abmknowledgeware',
    companyName: 'ABM Knowledgeware',
    companyCareerPage: 'https://abmindia.com/home/abm_career',
    companyDomain: 'abmindia.com',
    countryFilter: 'India',
    atsPlatform: 'official-company-site-no-public-careers',
    paginationStrategy: 'verified-homepage-plus-resume-only-careers-page',
    extractionStrategy:
      'verified-first-party-homepage+verified-first-party-careers-page-without-public-listings-return-empty',
    parser: 'custom-script',
    normalizationProfile: 'engineering-default',
  })
})

test('buildScrapers and company coverage resolve ABM Knowledgeware from the shared catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'abmknowledgeware')
  const scraper = buildScrapers().find((item) => item.name === 'abmknowledgeware')

  assert.ok(provider)
  assert.ok(scraper)
  assert.equal(provider.companyName, 'ABM Knowledgeware')
  assert.equal(provider.companyCareerPage, 'https://abmindia.com/home/abm_career')
  assert.match(scraper.dryRunFile, /abmknowledgeware[\\/]jobs\.json$/i)

  const report = generateCompanyCoverageReport({
    csvText: 'ABM Knowledgeware\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['ABM Knowledgeware', 'abmknowledgeware', 'ABM Knowledgeware']],
  )
})
