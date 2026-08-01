import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import workbookBatch02Aliases from '../providers/companyAliasExtensions/workbook-batch-02.json' with { type: 'json' }
import workbookBatch02Providers from '../providers/providerExtensions/workbook-batch-02.json' with { type: 'json' }
import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { buildScrapers, getScraperCatalog, hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const SENTINEL_MODULE_PATH = '../workbookbatch02/failClosedSentinel.js'
const SHARED_DRY_RUN_DIR = path.resolve(currentDir, '../workbookbatch02')
const EXPECTED_ALIAS_MAP = {
  Cibil: 'transunioncibil',
}
const EXPECTED_NON_SENTINEL_PROVIDERS = {
  adpushup: {
    modulePath: '../workbookbatch04/verifiedCareersEmptyState.js',
    companyCareerPage: 'https://www.adpushup.com/careers/',
    companyDomain: 'adpushup.com',
    atsPlatform: 'verified-first-party-careers-empty-result',
    paginationStrategy: 'verified-careers-snapshot-empty-result',
    extractionStrategy: 'verified-first-party-careers-surface+zero-public-job-snapshot+return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /Trusted by more than 300 publishers/i,
  },
  alaan: {
    modulePath: '../workbookbatch04/verifiedCareersEmptyState.js',
    companyCareerPage: 'https://www.alaan.com/careers',
    companyDomain: 'alaan.com',
    atsPlatform: 'verified-first-party-careers-empty-result',
    paginationStrategy: 'verified-careers-snapshot-empty-result',
    extractionStrategy: 'verified-first-party-careers-surface+zero-public-job-snapshot+return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /no trustworthy public job listings/i,
  },
  amrutam: {
    modulePath: '../workbookbatch02/amrutam.js',
    companyCareerPage: 'https://amrutam.co.in/',
    companyDomain: 'amrutam.co.in',
    atsPlatform: 'official-company-site-no-public-careers',
    paginationStrategy:
      'verified-homepage-plus-team-page-plus-story-page-plus-work-with-us-form-plus-branded-404-careers-routes-validation',
    extractionStrategy:
      'verified-exact-name-homepage+verified-team-and-story-pages+verified-work-with-us-form+verified-missing-careers-routes-return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /Work with Amrutam/i,
  },
  apisero: {
    modulePath: '../workbookbatch02/apisero.js',
    companyCareerPage: 'https://apisero.com/',
    companyDomain: 'apisero.com',
    atsPlatform: 'official-company-site-no-public-careers',
    paginationStrategy:
      'verified-homepage-careers-jobs-and-about-routes-redirect-to-parent-about-page-validation',
    extractionStrategy:
      'verified-exact-name-routes-redirect-to-parent-company-about-page-return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /NTT DATA/i,
  },
  allohealth: {
    modulePath: '../workbookbatch02/allohealth.js',
    companyCareerPage: 'https://www.allohealth.com/about',
    companyDomain: 'allohealth.com',
    atsPlatform: 'official-company-site-no-public-careers',
    paginationStrategy: 'verified-homepage-plus-about-page-plus-missing-careers-route-and-non-www-alias-validation',
    extractionStrategy:
      'verified-exact-name-homepage+verified-about-page+verified-missing-careers-route-return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /structured healthcare ecosystem/i,
  },
  amberstudent: {
    modulePath: '../workbookbatch02/amberstudent.js',
    companyCareerPage: 'https://amberstudent.com/career',
    companyDomain: 'amberstudent.com',
    atsPlatform: 'smartrecruiters',
    paginationStrategy: 'official-first-party-page-plus-smartrecruiters-board-and-api',
    extractionStrategy: 'verified-first-party-careers-page+public-smartrecruiters-board+detail-api+india-filter',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 1,
    verifiedIndiaJobCount: 1,
    verifiedSurfaceSummaryPattern: /Sales Associate in Pune, Maharashtra, India/i,
  },
  aranca: {
    modulePath: '../workbookbatch02/aranca.js',
    companyCareerPage: 'https://www.aranca.com/careers.php',
    companyDomain: 'aranca.com',
    atsPlatform: 'verified-first-party-careers-page-plus-public-paginated-jobs-board',
    paginationStrategy: 'verified-pagination-links',
    extractionStrategy: 'verified-first-party-careers-handoff+paginated-board+india-detail-pages',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 17,
    verifiedIndiaJobCount: 16,
    verifiedSurfaceSummaryPattern: /public jobs board/i,
  },
  arivihan: {
    modulePath: '../workbookbatch02/arivihan.js',
    companyCareerPage: 'https://www.arivihan.com/about',
    companyDomain: 'arivihan.com',
    atsPlatform: 'official-company-site-no-public-careers',
    paginationStrategy: 'verified-homepage-plus-about-page-plus-missing-careers-route-validation',
    extractionStrategy:
      'verified-exact-name-homepage+verified-about-page+verified-missing-careers-route-return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /Our Mission/i,
  },
  artiumacademy: {
    modulePath: '../workbookbatch04/verifiedCareersEmptyState.js',
    companyCareerPage: 'https://artiumacademy.com/careers',
    companyDomain: 'artiumacademy.com',
    atsPlatform: 'verified-first-party-careers-empty-result',
    paginationStrategy: 'verified-careers-snapshot-empty-result',
    extractionStrategy: 'verified-first-party-careers-surface+zero-public-job-snapshot+return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /No jobs available/i,
  },
  betterplace: {
    modulePath: '../workbookbatch02/betterplace.js',
    companyCareerPage: 'https://aj.betterplace.co.in/careers/',
    companyDomain: 'betterplace.co.in',
    atsPlatform: 'verified-first-party-careers-page-visible-cards',
    paginationStrategy: 'single-first-party-careers-page',
    extractionStrategy:
      'verified-first-party-careers-page+public-visible-job-cards+betterplace-select-subdomain',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 18,
    verifiedIndiaJobCount: 18,
    verifiedSurfaceSummaryPattern: /public Betterplace Select careers page/i,
  },
  basepair: {
    modulePath: '../workbookbatch04/verifiedCareersEmptyState.js',
    companyCareerPage: 'https://www.basepairtech.com/careers/',
    companyDomain: 'basepairtech.com',
    atsPlatform: 'verified-first-party-careers-empty-result',
    paginationStrategy: 'verified-careers-snapshot-empty-result',
    extractionStrategy: 'verified-first-party-careers-surface+zero-public-job-snapshot+return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /careers@basepairtech\.com/i,
  },
  bhive: {
    modulePath: '../workbookbatch02/bhive.js',
    companyCareerPage: 'https://bhive.careers/jobs/',
    companyDomain: 'bhive.careers',
    atsPlatform: 'wordpress-rest-api',
    paginationStrategy: 'verified-first-party-jobs-page-plus-paged-wordpress-rest-api',
    extractionStrategy:
      'verified-first-party-jobs-page+public-wordpress-jobs-api+embedded-taxonomies+india-location-normalization',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 17,
    verifiedIndiaJobCount: 17,
    verifiedSurfaceSummaryPattern: /public WordPress jobs API/i,
  },
  blusmart: {
    modulePath: '../workbookbatch02/blusmart.js',
    companyCareerPage: 'https://blusmart.com/',
    companyDomain: 'blusmart.com',
    atsPlatform: 'official-company-site-no-public-careers',
    paginationStrategy: 'verified-homepage-plus-legacy-careers-alias-plus-missing-careers-route-validation',
    extractionStrategy:
      'verified-exact-name-homepage+verified-legacy-careers-alias+verified-missing-careers-route-return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /BluSmart tablets/i,
  },
  bounce: {
    modulePath: '../workbookbatch02/bounce.js',
    companyCareerPage: 'https://bounce-v2.bounceinfinity.com/about.html',
    companyDomain: 'bounceinfinity.com',
    atsPlatform: 'official-company-site-no-public-careers',
    paginationStrategy: 'verified-homepage-plus-legacy-about-page-plus-missing-careers-route-validation',
    extractionStrategy:
      'verified-exact-name-homepage+verified-legacy-about-page+verified-missing-careers-route-return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /Vivekananda Hallekere/i,
  },
  brij: {
    modulePath: '../workbookbatch02/brij.js',
    companyCareerPage: 'https://brij.ai/careers',
    companyDomain: 'brij.ai',
    atsPlatform: 'official-careers-page-plus-applytojob-board',
    paginationStrategy: 'validate-official-careers-page-then-read-linked-public-applytojob-board',
    extractionStrategy:
      'official-careers-page-handoff-verification+public-jazzhr-board+detail-enrichment+india-filter',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 1,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /Director of Partnerships/i,
  },
  corover: {
    modulePath: '../workbookbatch02/corover.js',
    companyCareerPage: 'https://corover.ai/company/careers',
    companyDomain: 'corover.ai',
    atsPlatform: 'verified-first-party-careers-page-plus-same-origin-detail-pages',
    paginationStrategy: 'single-first-party-careers-page',
    extractionStrategy:
      'verified-first-party-careers-page+public-visible-job-cards+same-origin-detail-pages+india-filter',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 4,
    verifiedIndiaJobCount: 4,
    verifiedSurfaceSummaryPattern: /same-origin public detail page/i,
  },
  damensch: {
    modulePath: '../workbookbatch02/damensch.js',
    companyCareerPage: 'https://www.damensch.com/about-us',
    companyDomain: 'damensch.com',
    atsPlatform: 'official-company-site-no-public-careers',
    paginationStrategy:
      'verified-homepage-plus-about-page-plus-branded-404-careers-and-jobs-routes-plus-storefront-pages-careers-shell-validation',
    extractionStrategy:
      'verified-exact-name-homepage+verified-about-page+verified-missing-careers-and-jobs-routes+verified-storefront-pages-careers-shell-return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /About Damensch Fashion That Thinks/i,
  },
  doctorc: {
    modulePath: '../workbookbatch04/verifiedCareersEmptyState.js',
    companyCareerPage: 'https://doctorc.in/jobs/',
    companyDomain: 'doctorc.in',
    atsPlatform: 'verified-first-party-careers-empty-result',
    paginationStrategy: 'verified-careers-snapshot-empty-result',
    extractionStrategy: 'verified-first-party-careers-surface+zero-public-job-snapshot+return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /Current Openings at DoctorC/i,
  },
  dhiwise: {
    modulePath: '../workbookbatch04/verifiedCareersEmptyState.js',
    companyCareerPage: 'https://www.dhiwise.com/careers',
    companyDomain: 'dhiwise.com',
    atsPlatform: 'verified-first-party-careers-empty-result',
    paginationStrategy: 'verified-careers-snapshot-empty-result',
    extractionStrategy: 'verified-first-party-careers-surface+zero-public-job-snapshot+return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /Available Spots/i,
  },
  zimyo: {
    modulePath: '../workbookbatch04/verifiedCareersEmptyState.js',
    companyCareerPage: 'https://www.zimyo.com/about/career/',
    companyDomain: 'zimyo.com',
    atsPlatform: 'verified-first-party-careers-empty-result',
    paginationStrategy: 'verified-careers-snapshot-empty-result',
    extractionStrategy: 'verified-first-party-careers-surface+zero-public-job-snapshot+return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /career@zimyo\.com/i,
  },
  zivame: {
    modulePath: '../workbookbatch02/zivame.js',
    companyCareerPage: 'https://careers.zivame.com/',
    companyDomain: 'careers.zivame.com',
    atsPlatform: 'verified-first-party-careers-page-plus-same-origin-detail-pages',
    paginationStrategy: 'single-first-party-careers-page',
    extractionStrategy:
      'verified-first-party-careers-page+public-same-origin-role-pages+india-filter',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 3,
    verifiedIndiaJobCount: 3,
    verifiedSurfaceSummaryPattern: /Frontend Developer, iOS Developer, and QA Engineer - Automation/i,
  },
  zoomcar: {
    modulePath: '../workbookbatch02/zoomcar.js',
    companyCareerPage: 'https://www.zoomcar.com/careers',
    companyDomain: 'zoomcar.com',
    atsPlatform: 'official-company-site-no-public-careers',
    paginationStrategy: 'verified-homepage-plus-careers-route-plus-jobs-route-marketing-shell-validation',
    extractionStrategy:
      'verified-exact-name-homepage+verified-careers-and-jobs-routes-serving-consumer-marketing-shell-return-empty',
    verifiedOn: '2026-07-30',
    verifiedPublicJobCount: 0,
    verifiedIndiaJobCount: 0,
    verifiedSurfaceSummaryPattern: /same consumer booking shell/i,
  },
}
const EXPECTED_BATCH_02_COMPANIES = [
  ['Zimyo', 'zimyo'],
  ['Ziptrax', 'ziptrax'],
  ['Zivame', 'zivame'],
  ['ZoomCar', 'zoomcar'],
  ['AdPushup', 'adpushup'],
  ['Akasa Air Digital', 'akasaairdigital'],
  ['Alaan', 'alaan'],
  ['Allo Health', 'allohealth'],
  ['Amberstudent', 'amberstudent'],
  ['Amrutam', 'amrutam'],
  ['Anomalo India', 'anomaloindia'],
  ['APISero', 'apisero'],
  ['Aranca', 'aranca'],
  ['Arcatron Mobility', 'arcatronmobility'],
  ['Arivihan', 'arivihan'],
  ['Arna Health', 'arnahealth'],
  ['Artoo', 'artoo'],
  ['Artium Academy', 'artiumacademy'],
  ['Basepair', 'basepair'],
  ['BetterPlace', 'betterplace'],
  ['Bhive', 'bhive'],
  ['Bluelearn', 'bluelearn'],
  ['BluSmart', 'blusmart'],
  ['Bolo Live', 'bololive'],
  ['Bounce', 'bounce'],
  ['Brij', 'brij'],
  ['Catamaran', 'catamaran'],
  ['CoRover', 'corover'],
  ['Collabera Digital', 'collaberadigital'],
  ['Contour Software India', 'contoursoftwareindia'],
  ['DaMENSCH', 'damensch'],
  ['DhiWise', 'dhiwise'],
  ['DoctorC', 'doctorc'],
  ['Easetec', 'easetec'],
]
const EXPECTED_BATCH_02_WORKBOOK_COMPANIES = [
  'Cibil',
  ...EXPECTED_BATCH_02_COMPANIES.map(([companyName]) => companyName),
]
const EXPECTED_SENTINEL_COMPANIES = EXPECTED_BATCH_02_COMPANIES.filter(
  ([, source]) => !Object.hasOwn(EXPECTED_NON_SENTINEL_PROVIDERS, source),
)
const EXPECTED_ACTIVE_SENTINEL_SOURCES = [
  'akasaairdigital',
  'anomaloindia',
  'arcatronmobility',
  'arnahealth',
  'artoo',
  'bluelearn',
  'bololive',
  'catamaran',
  'collaberadigital',
  'contoursoftwareindia',
  'easetec',
  'ziptrax',
]

test('workbook batch 02 registers the expected providers and the scoped Cibil alias only', () => {
  assert.deepEqual(workbookBatch02Aliases, EXPECTED_ALIAS_MAP)
  assert.deepEqual(
    workbookBatch02Providers.map((provider) => [provider.companyName, provider.source]),
    EXPECTED_BATCH_02_COMPANIES,
  )

  for (const provider of workbookBatch02Providers) {
    const hydratedProvider = hydrateProviderCatalogEntry(provider)
    assert.equal(provider.adapter, 'script')
    assert.equal(provider.countryFilter, 'India')
    assert.equal(provider.parser, 'custom-script')
    assert.equal(provider.normalizationProfile, 'engineering-default')
    assert.match(provider.verifiedSurfaceSummary, new RegExp(provider.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

    if (Object.hasOwn(EXPECTED_NON_SENTINEL_PROVIDERS, provider.source)) {
      const expectedProvider = EXPECTED_NON_SENTINEL_PROVIDERS[provider.source]
      assert.equal(provider.modulePath, expectedProvider.modulePath)
      assert.equal(provider.companyCareerPage, expectedProvider.companyCareerPage)
      assert.equal(provider.companyDomain, expectedProvider.companyDomain)
      assert.equal(provider.atsPlatform, expectedProvider.atsPlatform)
      assert.equal(provider.paginationStrategy, expectedProvider.paginationStrategy)
      assert.equal(provider.extractionStrategy, expectedProvider.extractionStrategy)
      assert.equal(provider.verifiedOn, expectedProvider.verifiedOn)
      assert.equal(provider.verifiedPublicJobCount, expectedProvider.verifiedPublicJobCount)
      assert.equal(provider.verifiedIndiaJobCount, expectedProvider.verifiedIndiaJobCount)
      assert.match(provider.verifiedSurfaceSummary, expectedProvider.verifiedSurfaceSummaryPattern)
      assert.doesNotMatch(provider.verifiedSurfaceSummary, /exact-name sentinel/i)
      if (provider.source === 'betterplace') {
        assert.equal(provider.verificationDisposition, 'verified-public-careers-cards')
      }
      if (provider.source === 'aranca') {
        assert.equal(provider.verificationDisposition, 'verified-public-paginated-jobs-board')
        assert.equal(provider.officialJobsBoardUrl, 'https://www2.aranca.com/careers/')
        assert.equal(
          provider.detailUrlPattern,
          'https://www2.aranca.com/careers/jobdetails/job/{numeric_id}',
        )
      }
    } else {
      assert.equal(provider.modulePath, SENTINEL_MODULE_PATH)
      assert.equal(provider.companyCareerPage, undefined)
      assert.equal(provider.companyDomain, undefined)
      assert.equal(provider.atsPlatform, 'workbook-exact-name-sentinel')
      assert.equal(provider.paginationStrategy, 'none')
      assert.equal(
        provider.extractionStrategy,
        'exact-name-batch-coverage-sentinel-return-empty-until-public-surface-is-verified',
      )
      assert.match(provider.verifiedSurfaceSummary, /exact-name sentinel/i)
    }

    assert.equal(
      hydratedProvider.dryRunFile,
      path.join(SHARED_DRY_RUN_DIR, `${provider.source}.jobs.json`),
    )
  }
})

test('workbook batch 02 expected workbook companies resolve fully from the shared catalog with no unmatched companies', () => {
  const csvText = `company_name\n${EXPECTED_BATCH_02_WORKBOOK_COMPANIES.join('\n')}\n`
  const report = generateCompanyCoverageReport({
    csvText,
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, EXPECTED_BATCH_02_WORKBOOK_COMPANIES.length)
  assert.equal(report.unmatchedCount, 0)
  assert.deepEqual(report.unmatched, [])
  assert.equal(
    report.matched.find((item) => item.companyName === 'Cibil')?.source,
    'transunioncibil',
  )
  assert.deepEqual(
    report.matched
      .filter((item) => item.companyName !== 'Cibil')
      .map((item) => [item.companyName, item.source]),
    EXPECTED_BATCH_02_COMPANIES,
  )
})

test('workbook batch 02 active sentinel scrapers stay registered in the global catalog and fail closed with zero jobs', async () => {
  const scrapers = buildScrapers().filter((scraper) =>
    EXPECTED_ACTIVE_SENTINEL_SOURCES.includes(scraper.name),
  )

  assert.deepEqual(
    scrapers.map((scraper) => scraper.name).sort(),
    [...EXPECTED_ACTIVE_SENTINEL_SOURCES].sort(),
  )

  for (const scraper of scrapers) {
    assert.equal(scraper.provider.modulePath, SENTINEL_MODULE_PATH)
    assert.equal(scraper.provider.atsPlatform, 'workbook-exact-name-sentinel')
    assert.deepEqual(await scraper.run(), [])
  }
})
