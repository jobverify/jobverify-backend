import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import companyAliases from '../providers/companyAliases.json' with { type: 'json' }
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../embibe/catalog.js')
  } catch {
    assert.fail('Expected Embibe catalog module at ../embibe/catalog.js')
  }
}

const loadEmbibeModule = async () => {
  try {
    return await import('../embibe/script.js')
  } catch {
    assert.fail('Expected Embibe scraper module at ../embibe/script.js')
  }
}

test('Embibe local catalog captures the verified first-party join-us plus empty Darwinbox shell without aliases', async () => {
  const { EMBIBE_CATALOG } = await loadCatalogModule()
  const embibe = await loadEmbibeModule()
  const provider = hydrateProviderCatalogEntry(EMBIBE_CATALOG)

  assert.equal(provider.source, 'embibe')
  assert.equal(provider.companyName, 'Embibe')
  assert.equal(provider.officialBrandName, 'Indiavidual Learning Limited (Embibe)')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.modulePath, '../embibe/script.js')
  assert.equal(provider.rootUrl, 'https://www.embibe.com/')
  assert.equal(provider.rootCareersRouteUrl, 'https://www.embibe.com/careers')
  assert.equal(provider.homepageUrl, 'https://www.embibe.com/in-en/home/')
  assert.equal(provider.contactPageUrl, 'https://www.embibe.com/in-en/contactus/')
  assert.equal(provider.companyCareerPage, 'https://www.embibe.com/in-en/joinus/')
  assert.equal(provider.joinUsApiUrl, 'https://www.embibe.com/in-en/wp-json/wp/v2/pages/483')
  assert.equal(provider.sitemapIndexUrl, 'https://www.embibe.com/in-en/sitemap_index.xml')
  assert.equal(provider.pageSitemapUrl, 'https://www.embibe.com/in-en/page-sitemap.xml')
  assert.equal(provider.darwinboxHandoffUrl, 'https://embibe.darwinbox.in/ms/candidate/careers')
  assert.equal(provider.companyDomain, 'embibe.com')
  assert.equal(provider.atsPlatform, 'official-company-careers-empty-shell')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(
    provider.paginationStrategy,
    'verified-root-shell-plus-first-party-join-us-page-plus-empty-darwinbox-shell-validation',
  )
  assert.equal(
    provider.extractionStrategy,
    'verified-root-shell+verified-marketing-homepage+verified-contact-page+verified-join-us-page+verified-join-us-api+verified-sitemap-surfaces+verified-empty-darwinbox-shell-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.equal(provider.normalizationProfile, 'engineering-default')
  assert.equal(provider.verifiedOn, '2026-07-15')
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.embibe\.com\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.embibe\.com\/in-en\/joinus\//i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.embibe\.com\/in-en\/wp-json\/wp\/v2\/pages\/483/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/www\.embibe\.com\/in-en\/page-sitemap\.xml/i)
  assert.match(provider.verifiedSurfaceSummary, /https:\/\/embibe\.darwinbox\.in\/ms\/candidate\/careers/i)
  assert.match(provider.verifiedSurfaceSummary, /Indiavidual Learning Limited \(Embibe\)/i)
  assert.match(provider.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(Object.prototype.hasOwnProperty.call(companyAliases, 'Embibe'), false)

  assert.equal(embibe.PROVIDER_METADATA.source, EMBIBE_CATALOG.source)
  assert.equal(embibe.PROVIDER_METADATA.companyName, EMBIBE_CATALOG.companyName)
  assert.equal(embibe.PROVIDER_METADATA.companyCareerPage, EMBIBE_CATALOG.companyCareerPage)
})

test('Embibe backlog row matches directly from local provider metadata without alias churn', async () => {
  const { EMBIBE_CATALOG } = await loadCatalogModule()
  const report = generateCompanyCoverageReport({
    csvText: 'Embibe\n',
    catalog: [hydrateProviderCatalogEntry(EMBIBE_CATALOG)],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Embibe', 'embibe', 'Embibe']],
  )
})
