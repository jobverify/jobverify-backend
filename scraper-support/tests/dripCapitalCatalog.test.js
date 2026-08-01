import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const dripCapitalModulePath = path.resolve(currentDir, '../../scraper/dripcapital/script.js')

const loadDripCapitalCatalog = async () => {
  try {
    return await import('../../scraper/dripcapital/catalog.js')
  } catch {
    assert.fail('Expected Drip Capital catalog module at ../../scraper/dripcapital/catalog.js')
  }
}

const loadDripCapitalModule = async () => {
  try {
    return await import('../../scraper/dripcapital/script.js')
  } catch {
    assert.fail('Expected Drip Capital scraper module at ../../scraper/dripcapital/script.js')
  }
}

test('Drip Capital local catalog captures the verified first-party careers shells and no-public-jobs evidence', async () => {
  const { DRIP_CAPITAL_CATALOG } = await loadDripCapitalCatalog()
  const dripCapital = await loadDripCapitalModule()

  assert.equal(DRIP_CAPITAL_CATALOG.source, 'dripcapital')
  assert.equal(DRIP_CAPITAL_CATALOG.companyName, 'Drip Capital')
  assert.equal(DRIP_CAPITAL_CATALOG.officialBrandName, 'Drip Capital')
  assert.equal(DRIP_CAPITAL_CATALOG.adapter, 'script')
  assert.equal(DRIP_CAPITAL_CATALOG.homepageUrl, 'https://www.dripcapital.com/')
  assert.equal(DRIP_CAPITAL_CATALOG.companyCareerPage, 'https://www.dripcapital.com/en-in/careers/')
  assert.equal(DRIP_CAPITAL_CATALOG.careersPageUrl, 'https://www.dripcapital.com/en-in/careers/')
  assert.equal(DRIP_CAPITAL_CATALOG.legacyCareersPageUrl, 'https://www.dripcapital.com/careers/')
  assert.equal(DRIP_CAPITAL_CATALOG.usCareersPageUrl, 'https://www.dripcapital.com/en-us/careers/')
  assert.equal(
    DRIP_CAPITAL_CATALOG.legacyCareersPayloadUrl,
    'https://assets.dripcapital.com/_nuxt/static/1783926833/careers/payload.js',
  )
  assert.equal(
    DRIP_CAPITAL_CATALOG.indiaCareersPayloadUrl,
    'https://assets.dripcapital.com/_nuxt/static/1783926833/en-in/careers/payload.js',
  )
  assert.equal(
    DRIP_CAPITAL_CATALOG.usCareersPayloadUrl,
    'https://assets.dripcapital.com/_nuxt/static/1783926833/en-us/careers/payload.js',
  )
  assert.equal(DRIP_CAPITAL_CATALOG.jobsPageUrl, 'https://www.dripcapital.com/jobs')
  assert.equal(DRIP_CAPITAL_CATALOG.robotsTxtUrl, 'https://www.dripcapital.com/robots.txt')
  assert.equal(DRIP_CAPITAL_CATALOG.sitemapUrl, 'https://www.dripcapital.com/sitemap.xml')
  assert.equal(DRIP_CAPITAL_CATALOG.companyDomain, 'dripcapital.com')
  assert.equal(DRIP_CAPITAL_CATALOG.atsPlatform, 'official-company-site-no-public-careers')
  assert.equal(DRIP_CAPITAL_CATALOG.countryFilter, 'India')
  assert.equal(
    DRIP_CAPITAL_CATALOG.paginationStrategy,
    'homepage-plus-legacy-and-localized-careers-shells-plus-payload-and-sitemap-validation',
  )
  assert.equal(
    DRIP_CAPITAL_CATALOG.extractionStrategy,
    'verified-homepage+verified-legacy-and-localized-careers-shells+verified-empty-careers-payloads+verified-jobs-404+verified-robots-and-sitemap-no-role-urls',
  )
  assert.equal(DRIP_CAPITAL_CATALOG.parser, 'custom-script')
  assert.equal(DRIP_CAPITAL_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(DRIP_CAPITAL_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(DRIP_CAPITAL_CATALOG.dryRunFile, 'dripcapital/jobs.json')
  assert.match(DRIP_CAPITAL_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.dripcapital\.com\//i)
  assert.match(DRIP_CAPITAL_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.dripcapital\.com\/careers\//i)
  assert.match(DRIP_CAPITAL_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.dripcapital\.com\/en-in\/careers\//i)
  assert.match(DRIP_CAPITAL_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.dripcapital\.com\/en-us\/careers\//i)
  assert.match(
    DRIP_CAPITAL_CATALOG.verifiedSurfaceSummary,
    /https:\/\/assets\.dripcapital\.com\/_nuxt\/static\/1783926833\/en-in\/careers\/payload\.js/i,
  )
  assert.match(DRIP_CAPITAL_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.dripcapital\.com\/jobs/i)
  assert.match(DRIP_CAPITAL_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.dripcapital\.com\/sitemap\.xml/i)
  assert.match(DRIP_CAPITAL_CATALOG.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(DRIP_CAPITAL_CATALOG.modulePath, dripCapitalModulePath)

  assert.equal(dripCapital.PROVIDER_METADATA.source, DRIP_CAPITAL_CATALOG.source)
  assert.equal(dripCapital.PROVIDER_METADATA.companyName, DRIP_CAPITAL_CATALOG.companyName)
  assert.equal(dripCapital.PROVIDER_METADATA.careersPageUrl, DRIP_CAPITAL_CATALOG.careersPageUrl)
  assert.equal(dripCapital.PROVIDER_METADATA.jobsPageUrl, DRIP_CAPITAL_CATALOG.jobsPageUrl)
})

test('Drip Capital backlog row hydrates locally without requiring a shared alias entry', async () => {
  const { DRIP_CAPITAL_CATALOG } = await loadDripCapitalCatalog()
  const provider = hydrateProviderCatalogEntry(DRIP_CAPITAL_CATALOG)

  assert.equal(provider.companyName, 'Drip Capital')
  assert.equal(provider.companyDomain, 'dripcapital.com')
  assert.match(provider.modulePath, /dripcapital[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /dripcapital[\\/]jobs\.json$/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Drip Capital'), false)

  const report = generateCompanyCoverageReport({
    csvText: 'Drip Capital\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Drip Capital', 'dripcapital', 'Drip Capital']],
  )
})
