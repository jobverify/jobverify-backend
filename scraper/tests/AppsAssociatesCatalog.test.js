import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../appsassociates/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../appsassociates/catalog.js')
  } catch {
    assert.fail('Expected Apps Associates catalog module at ../appsassociates/catalog.js')
  }
}

const assertCatalogMatchesBacklogRow = ({ provider, companyName }) => {
  const report = generateCompanyCoverageReport({
    csvText: `${companyName}\n`,
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
}

const assertHydratedCatalogLoadsScript = async (provider) => {
  const module = await import(pathToFileURL(provider.modulePath).href)
  assert.equal(typeof module.run, 'function')
}

test('Apps Associates catalog captures the verified first-party careers page without a public jobs listing surface', async () => {
  const { APPS_ASSOCIATES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(APPS_ASSOCIATES_CATALOG)

  assert.equal(defaultCatalog, APPS_ASSOCIATES_CATALOG)
  assert.equal(provider.source, 'appsassociates')
  assert.equal(provider.companyName, 'Apps Associates')
  assert.equal(provider.officialBrandName, 'Apps Associates')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://appsassociates.com/')
  assert.equal(provider.companyCareerPage, 'https://appsassociates.com/careers/')
  assert.equal(provider.atsPlatform, 'official-company-careers-no-public-jobs-catalog')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-page+job-openings-cta+online-application-faq+no-public-job-catalog',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.companyDomain, 'appsassociates.com')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /See Our Current Job Openings/i)
  assert.match(provider.verifiedSurfaceSummary, /online application/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs catalog/i)

  assertCatalogMatchesBacklogRow({
    provider,
    companyName: 'Apps Associates',
  })
  await assertHydratedCatalogLoadsScript(provider)
})
