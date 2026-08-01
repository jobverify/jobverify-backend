import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/peoplestrongtechnologies/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/peoplestrongtechnologies/catalog.js')
  } catch {
    assert.fail('Expected PeopleStrong Technologies catalog module at ../../scraper/peoplestrongtechnologies/catalog.js')
  }
}

test('PeopleStrong Technologies local catalog captures the broken public listing routes without alias churn', async () => {
  const { PEOPLESTRONG_TECHNOLOGIES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(PEOPLESTRONG_TECHNOLOGIES_CATALOG)

  assert.equal(defaultCatalog, PEOPLESTRONG_TECHNOLOGIES_CATALOG)
  assert.equal(provider.source, 'peoplestrongtechnologies')
  assert.equal(provider.companyName, 'PeopleStrong Technologies')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://careers.peoplestrong.com/')
  assert.equal(provider.companyDomain, 'careers.peoplestrong.com')
  assert.equal(provider.atsPlatform, 'official-company-careers-no-public-jobs')
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /job\/joblist/i)
  assert.match(provider.verifiedSurfaceSummary, /Could not find method getRequisitionListWithPaginationBySolrBundle/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'PeopleStrong Technologies'), false)
})

test('PeopleStrong Technologies backlog row matches directly from the local catalog', async () => {
  const { PEOPLESTRONG_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'PeopleStrong Technologies\n',
    catalog: [hydrateProviderCatalogEntry(PEOPLESTRONG_TECHNOLOGIES_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('PeopleStrong Technologies hydrated local catalog stays script-runner compatible', async () => {
  const { PEOPLESTRONG_TECHNOLOGIES_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(PEOPLESTRONG_TECHNOLOGIES_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(typeof module.run, 'function')
})
