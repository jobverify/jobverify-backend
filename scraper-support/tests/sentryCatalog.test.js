import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog } from '../providers/index.js'
import { extractRoleSummaries, hasVerifiedCareersPageSignal } from '../../scraper/sentry/script.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/sentry/catalog.js')
  } catch {
    assert.fail('Expected Sentry catalog module at ../../scraper/sentry/catalog.js')
  }
}

test('getScraperCatalog includes Sentry as a verified first-party script provider', async () => {
  const { SENTRY_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = getScraperCatalog().find((item) => item.source === 'sentry')

  assert.equal(defaultCatalog, SENTRY_CATALOG)
  assert.ok(provider, 'Expected Sentry provider to be registered in customProviders.json')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Sentry')
  assert.equal(provider.officialBrandName, 'Sentry')
  assert.equal(provider.companyCareerPage, 'https://sentry.io/careers')
  assert.equal(provider.companyDomain, 'sentry.io')
  assert.equal(provider.atsPlatform, 'official-first-party-careers-page')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-open-roles-page-current-empty-india-slice')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-open-roles-page+same-domain-role-links+return-empty-when-no-india-locations',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-25')
  assert.match(provider.modulePath, /sentry[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /sentry[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 25, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/sentry\.io\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /\b48 open positions\b/i)
  assert.match(provider.verifiedSurfaceSummary, /zero India locations/i)
})

test('Sentry scraper extracts UUID-backed same-domain role rows from the verified first-party page contract', () => {
  const html = `
    <html>
      <head><title>Careers | Sentry</title></head>
      <body>
        <h1>Work at Sentry</h1>
        <h2>Browse our openings</h2>
        <p>48 open positions across all offices and all teams and all jobs</p>
        <div id="openings-list">
          <li class="_jobRow_1mlov_287">
            <a href="/careers/01e24f35-a936-4dd1-a700-31e872c50da8/" class="_jobLink_1mlov_292">
              <span class="_jobTitle_1mlov_306">Senior Software Engineer (Node), JavaScript SDK</span>
              <span class="_jobLocation_1mlov_334">Toronto, Ontario, Canada</span>
            </a>
          </li>
        </div>
      </body>
    </html>
  `

  assert.equal(hasVerifiedCareersPageSignal(html), true)
  assert.deepEqual(extractRoleSummaries(html), [
    {
      title: 'Senior Software Engineer (Node), JavaScript SDK',
      location: 'Toronto, Ontario, Canada',
      label: 'Senior Software Engineer (Node), JavaScript SDK Toronto, Ontario, Canada',
      url: 'https://sentry.io/careers/01e24f35-a936-4dd1-a700-31e872c50da8/',
    },
  ])
})

test('Sentry exact-name backlog coverage resolves directly from the local catalog without aliases', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nSentry\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Sentry', 'sentry', 'Sentry']],
  )
})

test('buildScrapers exposes a runnable Sentry scraper without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'sentry')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /sentry[\\/]jobs\.json$/i)
  assert.equal(scraper.provider.source, 'sentry')
  assert.equal(scraper.provider.companyCareerPage, 'https://sentry.io/careers')
})
