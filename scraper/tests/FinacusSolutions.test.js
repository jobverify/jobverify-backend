import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const finacusModulePath = path.resolve(currentDir, '../finacussolutions/script.js')
const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Finacus Solutions</title>
  </head>
  <body>
    <h2>Current Openings</h2>
    <div class="roles">
      <a data-id="233" class="btn-ca positionget" data-career-position="Sales Coordinator  ">Apply</a>
      <a data-id="234" class="btn-ca positionget" data-career-position="React. JS Developer">Apply</a>
    </div>
    <h3>Apply Now</h3>
    <footer>Finacus Solutions Private Limited</footer>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../finacussolutions/catalog.js')
  } catch {
    assert.fail('Expected Finacus Solutions catalog module at ../finacussolutions/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../finacussolutions/script.js')
  } catch {
    assert.fail('Expected Finacus Solutions scraper module at ../finacussolutions/script.js')
  }
}

test('Finacus Solutions local catalog captures the verified first-party careers page', async () => {
  const { FINACUS_SOLUTIONS_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const finacus = await loadScriptModule()
  const provider = hydrateProviderCatalogEntry(FINACUS_SOLUTIONS_CATALOG)

  assert.equal(defaultCatalog, FINACUS_SOLUTIONS_CATALOG)
  assert.equal(provider.source, 'finacussolutions')
  assert.equal(provider.companyName, 'Finacus Solutions')
  assert.equal(provider.officialBrandName, 'Finacus Solutions Private Limited')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.finacus.co.in/')
  assert.equal(provider.companyCareerPage, 'https://www.finacus.co.in/careers/')
  assert.equal(provider.companyDomain, 'finacus.co.in')
  assert.equal(provider.atsPlatform, 'official-company-careers-page')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-current-openings-section')
  assert.equal(
    provider.extractionStrategy,
    'verified-careers-page+inline-opening-cards+same-page-apply-form',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.verifiedPublicJobCount, 20)
  assert.equal(provider.modulePath, finacusModulePath)
  assert.match(provider.verifiedSurfaceSummary, /20 visible role cards/i)
  assert.equal(finacus.PROVIDER_METADATA.source, FINACUS_SOLUTIONS_CATALOG.source)

  const report = generateCompanyCoverageReport({
    csvText: 'Finacus Solutions\n',
    catalog: [provider],
    aliasMap: {},
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Finacus Solutions run validates the first-party careers page and maps inline role cards', async () => {
  const finacus = await loadScriptModule()

  assert.equal(finacus.hasOfficialCareersPageSignal(careersHtml), true)
  assert.deepEqual(finacus.extractSearchResults(careersHtml), [
    {
      title: 'Sales Coordinator',
      company: 'Finacus Solutions',
      department: null,
      location: 'India',
      city: null,
      state: null,
      country: 'India',
      jobId: '233',
      requisitionId: '233',
      sourceUrl: 'https://www.finacus.co.in/careers/',
      applyUrl: 'https://www.finacus.co.in/careers/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
    {
      title: 'React. JS Developer',
      company: 'Finacus Solutions',
      department: null,
      location: 'India',
      city: null,
      state: null,
      country: 'India',
      jobId: '234',
      requisitionId: '234',
      sourceUrl: 'https://www.finacus.co.in/careers/',
      applyUrl: 'https://www.finacus.co.in/careers/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    },
  ])

  const jobs = await finacus.createFinacusSolutionsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, finacus.CAREERS_PAGE_URL)
      return careersHtml
    },
  })

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'finacussolutions')
  assert.equal(jobs[0].link, 'https://www.finacus.co.in/careers/')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('Finacus Solutions fails closed when the verified careers page drifts', async () => {
  const finacus = await loadScriptModule()

  await assert.rejects(
    finacus.createFinacusSolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Placeholder</h1></body></html>',
    }),
    /verified official careers page/i,
  )
})
