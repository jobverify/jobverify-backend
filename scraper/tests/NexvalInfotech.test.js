import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../nexvalinfotech/script.js')

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Empower Your Business with NexVal: AI for Smarter Decisions</title>
  </head>
  <body>
    <a href="https://www.linkedin.com/company/nexval/">LinkedIn</a>
  </body>
</html>
`

const notFoundHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Page not found - nexval.ai: AI-First Mortgage Company</title>
  </head>
  <body>
    <h1>Page not found</h1>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../nexvalinfotech/catalog.js')
  } catch {
    assert.fail('Expected Nexval Infotech catalog module at ../nexvalinfotech/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../nexvalinfotech/script.js')
  } catch {
    assert.fail('Expected Nexval Infotech scraper module at ../nexvalinfotech/script.js')
  }
}

test('Nexval Infotech local catalog records the verified no-public-jobs state on the live domain', async () => {
  const { NEXVAL_INFOTECH_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(NEXVAL_INFOTECH_CATALOG)

  assert.equal(defaultCatalog, NEXVAL_INFOTECH_CATALOG)
  assert.equal(provider.source, 'nexvalinfotech')
  assert.equal(provider.companyName, 'Nexval Infotech')
  assert.equal(provider.officialBrandName, 'Nexval')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.nexval.ai/')
  assert.equal(provider.companyCareerPage, 'https://www.nexval.ai/careers/')
  assert.equal(provider.legacyCareerPageUrl, 'https://nexval.com/careers/')
  assert.equal(provider.companyDomain, 'nexval.ai')
  assert.equal(provider.atsPlatform, 'no-public-jobs-surface')
  assert.equal(provider.countryFilter, 'Global')
  assert.equal(provider.paginationStrategy, 'fail-closed-no-current-careers-surface')
  assert.equal(
    provider.extractionStrategy,
    'verified-current-homepage+careers-routes-404+legacy-careers-redirect-404+fail-closed-sentinel',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /nexval\.ai/i)
  assert.match(provider.verifiedSurfaceSummary, /nexval\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /no longer publishes a trustworthy public jobs surface/i)
})

test('Nexval Infotech exact backlog row resolves from the local catalog', async () => {
  const { NEXVAL_INFOTECH_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Nexval Infotech\n',
    catalog: [hydrateProviderCatalogEntry(NEXVAL_INFOTECH_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Nexval Infotech sentinel returns [] while the live domain keeps all public careers routes at 404', async () => {
  const nexval = await loadScriptModule()
  const jobs = await nexval.run({
    fetchText: async (url) => {
      if (url === nexval.HOMEPAGE_URL) return homepageHtml
      if (nexval.VERIFIED_NOT_FOUND_URLS.includes(url)) return notFoundHtml
      assert.fail(`Unexpected fetchText URL: ${url}`)
    },
  })

  assert.deepEqual(jobs, [])
})

test('Nexval Infotech sentinel fails closed if a live public careers route reappears', async () => {
  const nexval = await loadScriptModule()

  await assert.rejects(
    nexval.run({
      fetchText: async (url) => {
        if (url === nexval.HOMEPAGE_URL) return homepageHtml
        if (url === nexval.CAREERS_URL) {
          return '<html><head><title>Careers - Nexval</title></head><body>Open Positions</body></html>'
        }
        return notFoundHtml
      },
    }),
    /public jobs surface changed materially/i,
  )
})
