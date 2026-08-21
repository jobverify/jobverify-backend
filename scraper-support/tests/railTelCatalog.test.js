import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const railTelModulePath = path.resolve(currentDir, '../../scraper/railtel/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/railtel/catalog.js')
  } catch {
    assert.fail('Expected RailTel catalog module at ../../scraper/railtel/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/railtel/script.js')
  } catch {
    assert.fail('Expected RailTel scraper module at ../../scraper/railtel/script.js')
  }
}

test('RailTel local catalog captures the verified current-job-openings page and first-party vacancy-table contract', async () => {
  const { RAILTEL_CATALOG } = await loadCatalogModule()
  const railTel = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(RAILTEL_CATALOG)

  assert.equal(provider.source, 'railtel')
  assert.equal(provider.companyName, 'RailTel')
  assert.equal(provider.officialBrandName, 'RailTel')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.railtel.in/current-job-openings.html')
  assert.equal(provider.officialCareersHubUrl, 'https://www.railtel.in/career.html')
  assert.equal(provider.companyDomain, 'railtel.in')
  assert.equal(provider.currentOpeningsTitle, 'Current Job Openings')
  assert.equal(provider.verifiedSampleJobTitle, 'DEPUTATION/Re-employment for 1 post of Junior Translator/ E-0 at Corporate Office, Delhi')
  assert.equal(provider.verifiedSampleApplyTitle, 'Click here to apply')
  assert.equal(provider.atsPlatform, 'official-current-openings-page')
  assert.equal(provider.dryRunEnrichPublicExperience, false)
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-current-openings-page')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-current-openings-page+inline-vacancy-tables+first-party-pdf-notices+optional-digialm-apply',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.equal(provider.modulePath, railTelModulePath)
  assert.match(provider.dryRunFile, /railtel[\\/]jobs\.json$/i)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.railtel\.in\/current-job-openings\.html/i)
  assert.match(provider.verifiedSurfaceSummary, /Junior Translator/i)
  assert.match(provider.verifiedSurfaceSummary, /Prayagraj/i)
  assert.match(provider.verifiedSurfaceSummary, /Detailed Vacancy Notice No\. RCIL\/2025\/P&A\/44\/3/i)
  assert.match(provider.verifiedSurfaceSummary, /UNABLE_TO_VERIFY_LEAF_SIGNATURE/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'RailTel'), false)

  assert.equal(railTel.PROVIDER_METADATA.source, RAILTEL_CATALOG.source)
  assert.equal(railTel.PROVIDER_METADATA.companyName, RAILTEL_CATALOG.companyName)
  assert.equal(
    railTel.PROVIDER_METADATA.officialCareersHubUrl,
    RAILTEL_CATALOG.officialCareersHubUrl,
  )
})

test('RailTel backlog row matches directly from the local catalog without alias churn', async () => {
  const { RAILTEL_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'RailTel\n',
    catalog: [hydrateProviderCatalogEntry(RAILTEL_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['RailTel', 'railtel', 'RailTel']],
  )
})

test('RailTel hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { RAILTEL_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(RAILTEL_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.match(provider.modulePath, /railtel[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /railtel[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
