import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../eidikosystemsintegrators/script.js')

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Eidiko Systems Integrators</title>
  </head>
  <body>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
      <a href="/careers">Careers</a>
    </nav>
    <h1>Eidiko - Leading digital and integration service provider</h1>
    <p>Partner in digital transformation.</p>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../eidikosystemsintegrators/catalog.js')
  } catch {
    assert.fail('Expected Eidiko Systems Integrators catalog module at ../eidikosystemsintegrators/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../eidikosystemsintegrators/script.js')
  } catch {
    assert.fail('Expected Eidiko Systems Integrators scraper module at ../eidikosystemsintegrators/script.js')
  }
}

test('Eidiko Systems Integrators local catalog records the verified no-public-jobs state', async () => {
  const { EIDIKO_SYSTEMS_INTEGRATORS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(EIDIKO_SYSTEMS_INTEGRATORS_CATALOG)

  assert.equal(defaultCatalog, EIDIKO_SYSTEMS_INTEGRATORS_CATALOG)
  assert.equal(provider.source, 'eidikosystemsintegrators')
  assert.equal(provider.companyName, 'Eidiko Systems Integrators')
  assert.equal(provider.officialBrandName, 'Eidiko')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://eidiko.com/')
  assert.equal(provider.companyDomain, 'eidiko.com')
  assert.equal(provider.atsPlatform, 'official-site-no-public-jobs')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'homepage-plus-careers-route-validation')
  assert.equal(provider.extractionStrategy, 'verified-homepage+404-careers-routes+no-trustworthy-public-jobs-surface-return-empty')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /404/i)
})

test('Eidiko Systems Integrators exact backlog row resolves from the local catalog', async () => {
  const { EIDIKO_SYSTEMS_INTEGRATORS_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Eidiko Systems Integrators\n',
    catalog: [hydrateProviderCatalogEntry(EIDIKO_SYSTEMS_INTEGRATORS_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Eidiko Systems Integrators sentinel returns [] while first-party routes expose no public jobs', async () => {
  const eidiko = await loadScriptModule()

  const jobs = await eidiko.run({
    fetchText: async (url) => {
      if (url === 'https://eidiko.com/') return homepageHtml
      const error = new Error('404 Not Found')
      error.statusCode = 404
      throw error
    },
  })

  assert.deepEqual(jobs, [])
})

test('Eidiko Systems Integrators sentinel fails closed if a first-party jobs surface appears', async () => {
  const eidiko = await loadScriptModule()

  await assert.rejects(
    eidiko.run({
      fetchText: async () => '<html><body><h1>Current Openings</h1><a href="/jobs/data-engineer">Apply Now</a></body></html>',
    }),
    /public jobs surface/i,
  )
})
