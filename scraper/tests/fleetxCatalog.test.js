import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fleetxModulePath = path.resolve(currentDir, '../fleetx/script.js')

const loadCatalogModule = async () => {
  try {
    return await import('../fleetx/catalog.js')
  } catch {
    assert.fail('Expected Fleetx catalog module at ../fleetx/catalog.js')
  }
}

const loadFleetxModule = async () => {
  try {
    return await import('../fleetx/script.js')
  } catch {
    assert.fail('Expected Fleetx scraper module at ../fleetx/script.js')
  }
}

test('Fleetx local catalog captures the verified timeout-only first-party surface', async () => {
  const { FLEETX_CATALOG } = await loadCatalogModule()
  const fleetx = await loadFleetxModule()

  assert.equal(FLEETX_CATALOG.source, 'fleetx')
  assert.equal(FLEETX_CATALOG.companyName, 'Fleetx')
  assert.equal(FLEETX_CATALOG.officialBrandName, 'Fleetx')
  assert.equal(FLEETX_CATALOG.adapter, 'script')
  assert.equal(FLEETX_CATALOG.homepageUrl, 'https://fleetx.io/')
  assert.equal(FLEETX_CATALOG.wwwHomepageUrl, 'https://www.fleetx.io/')
  assert.equal(FLEETX_CATALOG.companyCareerPage, 'https://fleetx.io/careers')
  assert.equal(FLEETX_CATALOG.wwwCareerPageUrl, 'https://www.fleetx.io/careers')
  assert.equal(FLEETX_CATALOG.robotsUrl, 'https://fleetx.io/robots.txt')
  assert.equal(FLEETX_CATALOG.wwwRobotsUrl, 'https://www.fleetx.io/robots.txt')
  assert.equal(FLEETX_CATALOG.sitemapUrl, 'https://fleetx.io/sitemap.xml')
  assert.equal(FLEETX_CATALOG.wwwSitemapUrl, 'https://www.fleetx.io/sitemap.xml')
  assert.deepEqual(FLEETX_CATALOG.timeoutProbeUrls, [
    'https://fleetx.io/',
    'https://www.fleetx.io/',
    'https://fleetx.io/careers',
    'https://www.fleetx.io/careers',
    'https://fleetx.io/career',
    'https://www.fleetx.io/career',
    'https://fleetx.io/jobs',
    'https://www.fleetx.io/jobs',
    'https://fleetx.io/join-us',
    'https://www.fleetx.io/join-us',
    'https://fleetx.io/work-with-us',
    'https://www.fleetx.io/work-with-us',
    'https://fleetx.io/robots.txt',
    'https://www.fleetx.io/robots.txt',
    'https://fleetx.io/sitemap.xml',
    'https://www.fleetx.io/sitemap.xml',
  ])
  assert.equal(
    FLEETX_CATALOG.atsPlatform,
    'official-company-site-no-public-careers',
  )
  assert.equal(FLEETX_CATALOG.companyDomain, 'fleetx.io')
  assert.equal(FLEETX_CATALOG.countryFilter, 'India')
  assert.equal(
    FLEETX_CATALOG.paginationStrategy,
    'verified-first-party-home-careers-and-discovery-route-timeout-validation',
  )
  assert.equal(
    FLEETX_CATALOG.extractionStrategy,
    'verified-homepage-timeouts+verified-careers-route-timeouts+verified-robots-and-sitemap-timeouts-return-empty',
  )
  assert.equal(FLEETX_CATALOG.parser, 'custom-script')
  assert.equal(FLEETX_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(FLEETX_CATALOG.verifiedOn, '2026-07-15')
  assert.equal(FLEETX_CATALOG.dryRunFile, 'fleetx/jobs.json')
  assert.match(FLEETX_CATALOG.verifiedSurfaceSummary, /https:\/\/fleetx\.io\//i)
  assert.match(FLEETX_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.fleetx\.io\//i)
  assert.match(FLEETX_CATALOG.verifiedSurfaceSummary, /https:\/\/fleetx\.io\/careers/i)
  assert.match(FLEETX_CATALOG.verifiedSurfaceSummary, /https:\/\/fleetx\.io\/robots\.txt/i)
  assert.match(FLEETX_CATALOG.verifiedSurfaceSummary, /https:\/\/fleetx\.io\/sitemap\.xml/i)
  assert.match(FLEETX_CATALOG.verifiedSurfaceSummary, /timed out/i)
  assert.match(FLEETX_CATALOG.verifiedSurfaceSummary, /no trustworthy public jobs surface/i)
  assert.equal(FLEETX_CATALOG.modulePath, fleetxModulePath)

  assert.equal(fleetx.PROVIDER_METADATA.source, FLEETX_CATALOG.source)
  assert.equal(fleetx.PROVIDER_METADATA.companyCareerPage, FLEETX_CATALOG.companyCareerPage)
  assert.deepEqual(fleetx.PROVIDER_METADATA.timeoutProbeUrls, FLEETX_CATALOG.timeoutProbeUrls)
})
