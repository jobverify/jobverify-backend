import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/modeln/script.js')

const careersHtml = `
  <html>
    <head>
      <title>Careers | Model N</title>
    </head>
    <body>
      <section>
        <h2>Great Place to Work Certified in India</h2>
        <h2>Open Positions</h2>
        <div>Filter by location</div>
        <div>Filter by department</div>
        <div>Filter by work type</div>
        <div>Clear all</div>
        <div>No results</div>
      </section>
    </body>
  </html>
`

const liveJobsHtml = `
  <html>
    <head>
      <title>Careers | Model N</title>
    </head>
    <body>
      <section>
        <h2>Open Positions</h2>
        <article>
          <h3>Senior Software Engineer</h3>
          <p>Bengaluru, Karnataka, India</p>
        </article>
      </section>
    </body>
  </html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/modeln/catalog.js')
  } catch {
    assert.fail('Expected Model N catalog module at ../../scraper/modeln/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/modeln/script.js')
  } catch {
    assert.fail('Expected Model N scraper module at ../../scraper/modeln/script.js')
  }
}

test('Model N local catalog captures the verified empty first-party careers state', async () => {
  const { MODEL_N_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(MODEL_N_CATALOG)

  assert.equal(defaultCatalog, MODEL_N_CATALOG)
  assert.equal(provider.source, 'modeln')
  assert.equal(provider.companyName, 'Model N')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.modeln.com/company/careers/')
  assert.equal(provider.companyDomain, 'modeln.com')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'verified-first-party-careers-page-with-empty-open-positions-state')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+verified-open-positions-empty-state-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /No results/i)
})

test('Model N scraper returns no jobs while the verified first-party page still shows no results', async () => {
  const modelN = await loadScriptModule()

  assert.equal(modelN.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(modelN.hasNoResultsSignal(careersHtml), true)

  const jobs = await modelN.createModelNScraper().run({
    fetchPage: async (url) => ({
      status: 200,
      url,
      html: careersHtml,
    }),
  })

  assert.deepEqual(jobs, [])
})

test('Model N scraper fails closed when the official careers page starts showing live roles', async () => {
  const modelN = await loadScriptModule()

  await assert.rejects(
    modelN.createModelNScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: liveJobsHtml,
      }),
    }),
    /Model N verified empty careers state changed; review the scraper/,
  )
})
