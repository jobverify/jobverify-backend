import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/slice/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/slice/catalog.js')
  } catch {
    assert.fail('Expected Slice catalog module at ../../scraper/slice/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../../scraper/slice/script.js')
  } catch {
    assert.fail('Expected Slice scraper module at ../../scraper/slice/script.js')
  }
}

test('Slice local catalog captures the verified exact-name ambiguity between two first-party companies without alias churn', async () => {
  const { SLICE_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const slice = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(SLICE_CATALOG)

  assert.equal(defaultCatalog, SLICE_CATALOG)
  assert.equal(provider.source, 'slice')
  assert.equal(provider.companyName, 'Slice')
  assert.equal(provider.officialBrandName, 'Slice')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://slice.bank.in/careers/')
  assert.equal(provider.officialBankApplyPageUrl, 'https://slice.bank.in/careers/apply')
  assert.equal(provider.alternateCompanyCareerPage, 'https://slice.careers/')
  assert.equal(provider.bankCompanyLegalName, 'slice small finance bank ltd')
  assert.equal(provider.alternateCompanyReferenceDomain, 'about.slicelife.com')
  assert.equal(provider.companyDomain, 'slice.bank.in')
  assert.equal(provider.alternateCompanyDomain, 'slice.careers')
  assert.equal(provider.atsPlatform, 'ambiguous-exact-name-multiple-first-party-companies')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'multiple-first-party-exact-name-careers-surface-validation',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-slice-bank-careers+verified-slice-careers+exact-name-ambiguity-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-17')
  assert.match(provider.dryRunFile, /slice[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Friday, July 17, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/slice\.bank\.in\/careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/slice\.bank\.in\/careers\/apply/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/slice\.careers\//i)
  assert.match(provider.verifiedSurfaceSummary, /slice small finance bank ltd/i)
  assert.match(provider.verifiedSurfaceSummary, /Ilir Sela/i)
  assert.match(provider.verifiedSurfaceSummary, /exact-name ambiguity/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Slice'), false)

  assert.equal(slice.PROVIDER_METADATA.source, SLICE_CATALOG.source)
  assert.equal(slice.PROVIDER_METADATA.companyName, SLICE_CATALOG.companyName)
  assert.equal(
    slice.PROVIDER_METADATA.alternateCompanyCareerPage,
    SLICE_CATALOG.alternateCompanyCareerPage,
  )
})

test('Slice exact backlog row matches directly from local provider metadata', async () => {
  const { SLICE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Slice\n',
    catalog: [hydrateProviderCatalogEntry(SLICE_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Slice', 'slice', 'Slice']],
  )
})

test('Slice hydrated local catalog stays script-runner compatible while the exact row remains ambiguous', async () => {
  const { SLICE_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(SLICE_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Slice')
  assert.equal(provider.companyCareerPage, 'https://slice.bank.in/careers/')
  assert.equal(provider.companyDomain, 'slice.bank.in')
  assert.equal(provider.atsPlatform, 'ambiguous-exact-name-multiple-first-party-companies')
  assert.match(provider.modulePath, /slice[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /slice[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
