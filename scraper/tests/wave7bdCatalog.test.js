import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const companyFixtures = [
  {
    exportName: 'CYBER_INFRASTRUCTURE_CATALOG',
    moduleDir: 'cyberinfrastructure',
    expected: {
      source: 'cyberinfrastructure',
      companyName: 'Cyber Infrastructure',
      officialBrandName: 'Cyber Infrastructure (CIS)',
      adapter: 'script',
      companyCareerPage: 'https://career.cisin.com/',
      companyDomain: 'cisin.com',
      atsPlatform: 'first-party-multi-country-jobs-board',
      countryFilter: 'India',
      paginationStrategy: 'single-first-party-country-sections',
      extractionStrategy: 'first-party-html-role-cards+country-section-filter',
      parser: 'custom-script',
      normalizationProfile: 'engineering-default',
      verifiedOn: '2026-07-18',
      verifiedSurfaceSummary:
        'Verified on Saturday, July 18, 2026 that https://career.cisin.com/ is Cyber Infrastructure\'s live first-party jobs board, that it exposes country-specific sections including "Current roles at India", and that the public HTML lists role titles with view-details/apply links that can be scraped directly from the first-party surface.',
    },
  },
  {
    exportName: 'WEBTEL_ELECTROSOFT_CATALOG',
    moduleDir: 'webtelelectrosoft',
    expected: {
      source: 'webtelelectrosoft',
      companyName: 'Webtel Electrosoft',
      officialBrandName: 'Webtel Electrosoft Limited',
      adapter: 'script',
      companyCareerPage: 'https://webtel.in/careers',
      companyDomain: 'webtel.in',
      atsPlatform: 'official-careers-page-no-public-job-cards',
      countryFilter: 'India',
      paginationStrategy: 'single-first-party-careers-page-sentinel',
      extractionStrategy: 'verified-first-party-careers-copy+no-public-openings-detection+fail-closed-sentinel',
      parser: 'custom-script',
      normalizationProfile: 'engineering-default',
      verifiedOn: '2026-07-18',
      verifiedSurfaceSummary:
        'Verified on Saturday, July 18, 2026 that https://webtel.in/careers is Webtel Electrosoft\'s live first-party careers page, but the public page currently exposes employer-branding copy only and does not publish a trustworthy machine-readable jobs inventory or stable public job cards. The local scraper therefore fails closed and returns no jobs until Webtel exposes a real public openings feed.',
    },
  },
  {
    exportName: 'CI_INFOTECH_CATALOG',
    moduleDir: 'ciinfotech',
    expected: {
      source: 'ciinfotech',
      companyName: 'CI Infotech',
      officialBrandName: 'CI Infotech Pvt. Ltd.',
      adapter: 'script',
      companyCareerPage: 'https://ciinfotech.net/current-openings/',
      companyDomain: 'ciinfotech.net',
      atsPlatform: 'first-party-current-openings-page',
      countryFilter: 'India',
      paginationStrategy: 'single-first-party-openings-page',
      extractionStrategy: 'first-party-html-opening-cards+detail-link-extraction',
      parser: 'custom-script',
      normalizationProfile: 'engineering-default',
      verifiedOn: '2026-07-18',
      verifiedSurfaceSummary:
        'Verified on Saturday, July 18, 2026 that https://ciinfotech.net/current-openings/ is CI Infotech\'s live first-party openings page and that the public HTML exposes repeated opening cards with job titles, posting dates, locations, job types, and details links that can be scraped directly from the first-party surface.',
    },
  },
  {
    exportName: 'APPCINO_TECHNOLOGIES_CATALOG',
    moduleDir: 'appcinotechnologies',
    expected: {
      source: 'appcinotechnologies',
      companyName: 'Appcino Technologies',
      officialBrandName: 'Appcino Technologies | Part of Xebia',
      adapter: 'script',
      companyCareerPage: 'https://xebia.com/careers/',
      companyDomain: 'xebia.com',
      atsPlatform: 'parent-company-careers-hub-no-appcino-inventory',
      countryFilter: 'India',
      paginationStrategy: 'single-parent-careers-hub-sentinel',
      extractionStrategy: 'appcino-acquisition-verification+parent-careers-hub-detection+fail-closed-sentinel',
      parser: 'custom-script',
      normalizationProfile: 'engineering-default',
      verifiedOn: '2026-07-18',
      verifiedSurfaceSummary:
        'Verified on Saturday, July 18, 2026 that Xebia publicly identifies Appcino as part of Xebia and routes recruiting through the general Xebia careers hub at https://xebia.com/careers/, but that public hub does not expose a trustworthy Appcino-specific jobs inventory. The local scraper therefore fails closed until Appcino or Xebia publishes company-attributable openings for this brand.',
    },
  },
  {
    exportName: 'LOTUS_WIRELESS_TECHNOLOGIES_CATALOG',
    moduleDir: 'lotuswirelesstechnologies',
    expected: {
      source: 'lotuswirelesstechnologies',
      companyName: 'Lotus Wireless Technologies',
      officialBrandName: 'Lotus Wireless Technologies India Pvt. Ltd.',
      adapter: 'script',
      companyCareerPage: 'https://www.lotuswireless.com/careers.html',
      companyDomain: 'lotuswireless.com',
      atsPlatform: 'official-careers-page-apply-email-sentinel',
      countryFilter: 'India',
      paginationStrategy: 'single-first-party-careers-page-apply-email-sentinel',
      extractionStrategy: 'verified-first-party-careers-page+apply-at-email-copy+fail-closed-sentinel',
      parser: 'custom-script',
      normalizationProfile: 'engineering-default',
      verifiedOn: '2026-07-18',
      verifiedSurfaceSummary:
        'Verified on Saturday, July 18, 2026 that https://www.lotuswireless.com/careers.html is Lotus Wireless Technologies\' live first-party careers page and that it currently instructs candidates to "Apply at hr@lotuswireless.com" without publishing trustworthy public job cards. The local scraper therefore fails closed and returns no jobs until Lotus Wireless exposes a stable public listings inventory.',
    },
  },
]

const loadModule = async (relativePath) => {
  try {
    return await import(relativePath)
  } catch {
    assert.fail(`Expected module at ${relativePath}`)
  }
}

for (const fixture of companyFixtures) {
  test(`${fixture.expected.companyName} local catalog matches the verified first-party contract`, async () => {
    const catalogModule = await loadModule(`../${fixture.moduleDir}/catalog.js`)
    const scriptModule = await loadModule(`../${fixture.moduleDir}/script.js`)
    const actualCatalog = catalogModule[fixture.exportName]

    assert.deepEqual(actualCatalog, {
      ...fixture.expected,
      modulePath: path.resolve(currentDir, '..', fixture.moduleDir, 'script.js'),
    })
    assert.equal(catalogModule.default, actualCatalog)
    assert.equal(scriptModule.PROVIDER_METADATA.source, actualCatalog.source)
    assert.equal(scriptModule.PROVIDER_METADATA.companyName, actualCatalog.companyName)
  })
}
