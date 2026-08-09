import assert from 'node:assert/strict'
import test from 'node:test'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/latticesemiconductorindia/catalog.js')
  } catch {
    assert.fail('Expected Lattice Semiconductor India catalog module at ../../scraper/latticesemiconductorindia/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/latticesemiconductorindia/script.js')
  } catch {
    assert.fail('Expected Lattice Semiconductor India scraper module at ../../scraper/latticesemiconductorindia/script.js')
  }
}

test('Lattice Semiconductor India catalog captures the verified first-party careers page and India iCIMS contracts', async () => {
  const {
    LATTICE_SEMICONDUCTOR_INDIA_CATALOG,
    default: defaultCatalog,
  } = await loadCatalogModule()
  const lattice = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(LATTICE_SEMICONDUCTOR_INDIA_CATALOG)

  assert.equal(defaultCatalog, LATTICE_SEMICONDUCTOR_INDIA_CATALOG)
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.source, 'latticesemiconductorindia')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.companyName, 'Lattice Semiconductor India')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.officialBrandName, 'Lattice Semiconductor')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.adapter, 'script')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.modulePath, '../../scraper/latticesemiconductorindia/script.js')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.dryRunFile, 'latticesemiconductorindia/jobs.json')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.homepageUrl, 'https://www.latticesemi.com/en')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.companyCareerPage, 'https://www.latticesemi.com/About/Jobs')
  assert.equal(
    LATTICE_SEMICONDUCTOR_INDIA_CATALOG.indiaJobsIntroUrl,
    'https://careers-latticesemi.icims.com/jobs/intro?bga=true&hashed=-625919477&height=500&jan1offset=-480&jun1offset=-420&mobile=false&needsRedirect=false&width=1378',
  )
  assert.equal(
    LATTICE_SEMICONDUCTOR_INDIA_CATALOG.indiaJobsSearchWrapperUrl,
    'https://careers-latticesemi.icims.com/jobs/search?hashed=-625919477&ss=1',
  )
  assert.equal(
    LATTICE_SEMICONDUCTOR_INDIA_CATALOG.indiaJobsSearchIframeUrl,
    'https://careers-latticesemi.icims.com/jobs/search?hashed=-625919477&ss=1&in_iframe=1',
  )
  assert.equal(
    LATTICE_SEMICONDUCTOR_INDIA_CATALOG.officialJobDetailExampleUrl,
    'https://careers-latticesemi.icims.com/jobs/3678/senior-director%2C-global-facilities/job',
  )
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.atsPlatform, 'icims')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.countryFilter, 'India')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.paginationStrategy, 'icims-next-page-search')
  assert.equal(
    LATTICE_SEMICONDUCTOR_INDIA_CATALOG.extractionStrategy,
    'verified-first-party-careers-page+verified-icims-intro+iframe-listings+detail-pages',
  )
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.parser, 'custom-script')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.normalizationProfile, 'engineering-default')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.companyDomain, 'latticesemi.com')
  assert.equal(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.verifiedOn, '2026-08-02')
  assert.match(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.verifiedSurfaceSummary, /https:\/\/www\.latticesemi\.com\/About\/Jobs/i)
  assert.match(
    LATTICE_SEMICONDUCTOR_INDIA_CATALOG.verifiedSurfaceSummary,
    /https:\/\/careers-latticesemi\.icims\.com\/jobs\/intro\?bga=true&hashed=-625919477/i,
  )
  assert.match(
    LATTICE_SEMICONDUCTOR_INDIA_CATALOG.verifiedSurfaceSummary,
    /https:\/\/careers-latticesemi\.icims\.com\/jobs\/search\?hashed=-625919477&ss=1/i,
  )
  assert.match(
    LATTICE_SEMICONDUCTOR_INDIA_CATALOG.verifiedSurfaceSummary,
    /https:\/\/careers-latticesemi\.icims\.com\/jobs\/search\?hashed=-625919477&ss=1&in_iframe=1/i,
  )
  assert.match(
    LATTICE_SEMICONDUCTOR_INDIA_CATALOG.verifiedSurfaceSummary,
    /https:\/\/careers-latticesemi\.icims\.com\/jobs\/3678\/senior-director%2C-global-facilities\/job/i,
  )
  assert.match(LATTICE_SEMICONDUCTOR_INDIA_CATALOG.verifiedSurfaceSummary, /IN-MH-Pune/i)

  assert.equal(provider.source, 'latticesemiconductorindia')
  assert.equal(provider.companyName, 'Lattice Semiconductor India')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://www.latticesemi.com/About/Jobs')
  assert.equal(provider.companyDomain, 'latticesemi.com')
  assert.match(provider.modulePath, /latticesemiconductorindia[\\/]script\.js$/i)
  assert.match(provider.dryRunFile, /latticesemiconductorindia[\\/]jobs\.json$/i)

  assert.equal(lattice.PROVIDER_METADATA.source, provider.source)
  assert.equal(lattice.HOMEPAGE_URL, provider.homepageUrl)
  assert.equal(lattice.OFFICIAL_CAREERS_PAGE_URL, provider.companyCareerPage)
  assert.equal(lattice.SEARCH_INTRO_URL, provider.indiaJobsIntroUrl)
  assert.equal(lattice.SEARCH_WRAPPER_URL, provider.indiaJobsSearchWrapperUrl)
  assert.equal(lattice.SEARCH_IFRAME_URL, provider.indiaJobsSearchIframeUrl)
})

test('Lattice Semiconductor India exact-name backlog rows resolve directly from the local provider metadata', async () => {
  const { LATTICE_SEMICONDUCTOR_INDIA_CATALOG } = await loadCatalogModule()

  const report = generateCompanyCoverageReport({
    csvText: 'Lattice Semiconductor India\n',
    catalog: [hydrateProviderCatalogEntry(LATTICE_SEMICONDUCTOR_INDIA_CATALOG)],
    aliasMap: {},
  })

  assert.equal(report.totalRows, 1)
  assert.equal(report.candidateRows, 1)
  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Lattice Semiconductor India', 'latticesemiconductorindia', 'Lattice Semiconductor India']],
  )
})
