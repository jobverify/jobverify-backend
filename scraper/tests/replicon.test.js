import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../replicon/script.js')

const loadCatalog = async () => {
  try {
    return await import('../replicon/catalog.js')
  } catch {
    assert.fail('Expected Replicon catalog module at ../replicon/catalog.js')
  }
}

const loadScript = async () => {
  try {
    return await import('../replicon/script.js')
  } catch {
    assert.fail('Expected Replicon scraper module at ../replicon/script.js')
  }
}

const redirectedCareersPage = {
  status: 200,
  url: 'https://www.deltek.com/en/about/careers',
  html: `
    <!doctype html>
    <html lang="en">
      <head>
        <title>Drive Your Career with #TeamDeltek | Search Jobs | Deltek</title>
      </head>
      <body>
        <h1>Drive Your Career with #TeamDeltek</h1>
        <p>Replicon is now part of Deltek.</p>
        <a href="https://careers.deltek.com/">Search Jobs</a>
        <a href="/products/replicon/">Replicon</a>
      </body>
    </html>
  `,
}

test('Replicon local catalog records the exact-name careers redirect into generic Deltek hiring', async () => {
  const { REPLICON_CATALOG, default: defaultCatalog } = await loadCatalog()
  const provider = hydrateProviderCatalogEntry(REPLICON_CATALOG)
  const report = generateCompanyCoverageReport({
    csvText: 'Replicon\n',
    catalog: [provider],
  })

  assert.equal(defaultCatalog, REPLICON_CATALOG)
  assert.equal(provider.source, 'replicon')
  assert.equal(provider.companyName, 'Replicon')
  assert.equal(provider.officialBrandName, 'Replicon')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.replicon.com/company/careers/')
  assert.equal(provider.redirectCareersUrl, 'https://www.deltek.com/en/about/careers')
  assert.equal(provider.genericSearchJobsUrl, 'https://careers.deltek.com/')
  assert.equal(provider.upstreamCompanyName, 'Deltek')
  assert.equal(provider.companyDomain, 'replicon.com')
  assert.equal(provider.atsPlatform, 'redirected-parent-careers-no-standalone-replicon-jobs')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'exact-name-careers-redirect-validation')
  assert.equal(
    provider.extractionStrategy,
    'verified-replicon-careers-redirect+generic-deltek-search-jobs+fail-closed-sentinel',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.dryRunFile, /replicon[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /August 22, 2023/i)
  assert.match(provider.verifiedSurfaceSummary, /#TeamDeltek/i)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Replicon stays fail-closed only while the exact-name careers route still resolves to generic Deltek hiring', async () => {
  const replicon = await loadScript()

  assert.equal(replicon.CAREERS_URL, 'https://www.replicon.com/company/careers/')
  assert.equal(replicon.REDIRECT_CAREERS_URL, 'https://www.deltek.com/en/about/careers')
  assert.equal(replicon.GENERIC_SEARCH_JOBS_URL, 'https://careers.deltek.com/')
  assert.equal(replicon.extractGenericSearchJobsUrl(redirectedCareersPage.html), 'https://careers.deltek.com/')
  assert.equal(replicon.hasRedirectedDeltekCareersSignal(redirectedCareersPage), true)

  const jobs = await replicon.createRepliconScraper().run({
    fetchPage: async (url) => {
      assert.equal(url, replicon.CAREERS_URL)
      return redirectedCareersPage
    },
  })

  assert.deepEqual(jobs, [])
})

test('Replicon throws when the generic Deltek redirect contract drifts', async () => {
  const replicon = await loadScript()

  await assert.rejects(
    replicon.createRepliconScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: 'https://www.replicon.com/company/careers/',
        html: '<html><body><h1>Unexpected Replicon Careers</h1></body></html>',
      }),
    }),
    /Replicon careers redirect/i,
  )
})
