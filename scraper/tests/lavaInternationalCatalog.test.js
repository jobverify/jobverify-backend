import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../lavainternational/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../lavainternational/catalog.js')
  } catch {
    assert.fail('Expected Lava International catalog module at ../lavainternational/catalog.js')
  }
}

const loadScraperModule = async () => {
  try {
    return await import('../lavainternational/script.js')
  } catch {
    assert.fail('Expected Lava International scraper module at ../lavainternational/script.js')
  }
}

test('Lava International local catalog captures the verified resume-only careers sentinel state', async () => {
  const { LAVA_INTERNATIONAL_CATALOG } = await loadCatalogModule()
  const lavainternational = await loadScraperModule()
  const provider = hydrateProviderCatalogEntry(LAVA_INTERNATIONAL_CATALOG)

  assert.equal(provider.source, 'lavainternational')
  assert.equal(provider.companyName, 'Lava International')
  assert.equal(provider.officialBrandName, 'Lava International Limited')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://shop.lavamobiles.com/')
  assert.equal(provider.aboutPageUrl, 'https://shop.lavamobiles.com/pages/about-us')
  assert.equal(provider.companyCareerPage, 'https://shop.lavamobiles.com/pages/career')
  assert.equal(provider.applicationEmail, 'careers@lavainternational.in')
  assert.equal(provider.applicationUrl, 'mailto:careers@lavainternational.in')
  assert.equal(provider.companyDomain, 'lavamobiles.com')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-about-page-plus-resume-only-careers-page-plus-common-route-404-validation',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-about-page+verified-resume-only-careers-page+verified-missing-common-job-routes-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-16')
  assert.match(provider.dryRunFile, /lavainternational[\\/]jobs\.json$/i)
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /July 16, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/shop\.lavamobiles\.com\/pages\/about-us/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/shop\.lavamobiles\.com\/pages\/career/i)
  assert.match(provider.verifiedSurfaceSummary, /careers@lavainternational\.in/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/shop\.lavamobiles\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/shop\.lavamobiles\.com\/jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public job listings/i)

  assert.equal(lavainternational.PROVIDER_METADATA.source, LAVA_INTERNATIONAL_CATALOG.source)
  assert.equal(lavainternational.PROVIDER_METADATA.companyName, LAVA_INTERNATIONAL_CATALOG.companyName)
  assert.equal(
    lavainternational.PROVIDER_METADATA.companyCareerPage,
    LAVA_INTERNATIONAL_CATALOG.companyCareerPage,
  )
})

test('Lava International exact backlog name matches directly from local provider metadata', async () => {
  const { LAVA_INTERNATIONAL_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Lava International\n',
    catalog: [hydrateProviderCatalogEntry(LAVA_INTERNATIONAL_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Lava International', 'lavainternational', 'Lava International']],
  )
})

test('Lava International hydrated local catalog stays script-runner compatible for central registry integration', async () => {
  const { LAVA_INTERNATIONAL_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(LAVA_INTERNATIONAL_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyName, 'Lava International')
  assert.equal(provider.companyCareerPage, 'https://shop.lavamobiles.com/pages/career')
  assert.equal(provider.companyDomain, 'lavamobiles.com')
  assert.equal(provider.atsPlatform, 'official-company-site-no-public-careers')
  assert.match(provider.modulePath, /lavainternational[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /lavainternational[\\/]jobs\.json$/i)
  assert.equal(typeof module.run, 'function')
})
