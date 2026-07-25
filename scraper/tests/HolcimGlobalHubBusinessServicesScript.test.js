import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../holcimglobalhubbusinessservices/script.js')

const categoryHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Global Hub Business Services</title>
  </head>
  <body>
    <h1>Job at Holcim GHBS</h1>
    <p>Showing 1 to 2 of 2 Jobs</p>
    <a href="/holcim_ghbs/job/Navi-Mumbai-Assistant-Manager-Analytics%2C-Qlik-Developer-%28GHAR%29-MH-400708/1348971557/">
      Assistant Manager - Analytics, Qlik Developer (GHAR)
    </a>
    <a href="/holcim_ghbs/job/Navi-Mumbai-Talent-Acquisition-Specialist-MH-400708/1361698557/">
      Talent Acquisition Specialist
    </a>
  </body>
</html>
`

const talentAcquisitionDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Talent Acquisition Specialist Job Details | HOLCIM Group</title>
  </head>
  <body>
    <a href="/holcim_ghbs/job/Navi-Mumbai-Talent-Acquisition-Specialist-MH-400708/1361698557/">Apply now »</a>
    <h1>Talent Acquisition Specialist</h1>
    <p>Location: Navi Mumbai, MH, IN, 400708</p>
    <p>Requisition ID: 17878</p>
    <div>
      <p>Job Description: Holcim Global Hub Business Services is looking for an experienced Talent Acquisition Specialist to manage corporate regional and international hiring requirements across multiple functions.</p>
      <p>Required Skills & Qualifications: 5+ years of experience in Talent Acquisition.</p>
    </div>
  </body>
</html>
`

const qlikDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Assistant Manager - Analytics, Qlik Developer (GHAR) Job Details | HOLCIM Group</title>
  </head>
  <body>
    <a href="/holcim_ghbs/job/Navi-Mumbai-Assistant-Manager-Analytics%2C-Qlik-Developer-%28GHAR%29-MH-400708/1348971557/">Apply now »</a>
    <h1>Assistant Manager - Analytics, Qlik Developer (GHAR)</h1>
    <p>Location: Navi Mumbai, MH, IN, 400708</p>
    <p>Requisition ID: 17692</p>
    <div>
      <p>Job Description: Build analytics solutions for the Global Hub Business Services team.</p>
      <p>Required Skills & Qualifications: Qlik, SQL, stakeholder management.</p>
    </div>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../holcimglobalhubbusinessservices/catalog.js')
  } catch {
    assert.fail('Expected Holcim Global Hub Business Services catalog module at ../holcimglobalhubbusinessservices/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../holcimglobalhubbusinessservices/script.js')
  } catch {
    assert.fail('Expected Holcim Global Hub Business Services scraper module at ../holcimglobalhubbusinessservices/script.js')
  }
}

test('Holcim Global Hub Business Services local catalog captures the verified first-party jobs surface', async () => {
  const { HOLCIM_GLOBAL_HUB_BUSINESS_SERVICES_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(HOLCIM_GLOBAL_HUB_BUSINESS_SERVICES_CATALOG)

  assert.equal(defaultCatalog, HOLCIM_GLOBAL_HUB_BUSINESS_SERVICES_CATALOG)
  assert.equal(provider.source, 'holcimglobalhubbusinessservices')
  assert.equal(provider.companyName, 'Holcim Global Hub Business Services')
  assert.equal(provider.adapter, 'script')
  assert.equal(
    provider.companyCareerPage,
    'https://careers.holcimgroup.com/holcim_ghbs/go/Job-at-Holcim-GHBS/8823002/',
  )
  assert.equal(provider.companyDomain, 'careers.holcimgroup.com')
  assert.equal(provider.atsPlatform, 'successfactors')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-successfactors-category-page-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-ghbs-jobs-category-page+successfactors-detail-pages+navi-mumbai-role-filter',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /13 Jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /Talent Acquisition Specialist/i)
})

test('Holcim Global Hub Business Services scraper extracts first-party job cards and detail pages', async () => {
  const holcim = await loadScriptModule()

  assert.equal(holcim.hasOfficialCategorySignal(categoryHtml), true)

  const listings = holcim.extractJobCards(categoryHtml)
  assert.deepEqual(
    listings.map((listing) => [listing.title, listing.detailUrl]),
    [
      [
        'Assistant Manager - Analytics, Qlik Developer (GHAR)',
        'https://careers.holcimgroup.com/holcim_ghbs/job/Navi-Mumbai-Assistant-Manager-Analytics%2C-Qlik-Developer-%28GHAR%29-MH-400708/1348971557/',
      ],
      [
        'Talent Acquisition Specialist',
        'https://careers.holcimgroup.com/holcim_ghbs/job/Navi-Mumbai-Talent-Acquisition-Specialist-MH-400708/1361698557/',
      ],
    ],
  )

  const talentJob = holcim.extractJobDetail(talentAcquisitionDetailHtml, listings[1])
  assert.equal(talentJob.title, 'Talent Acquisition Specialist')
  assert.equal(talentJob.location, 'Navi Mumbai, MH, India')
  assert.equal(talentJob.requisitionId, '17878')
  assert.match(talentJob.jobDescription, /corporate regional and international hiring/i)
})

test('Holcim Global Hub Business Services run validates the category page and decorates India jobs', async () => {
  const holcim = await loadScriptModule()
  const requestedUrls = []

  const jobs = await holcim.createHolcimGlobalHubBusinessServicesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === holcim.CATEGORY_URL) return categoryHtml
      if (url.endsWith('/1348971557/')) return qlikDetailHtml
      if (url.endsWith('/1361698557/')) return talentAcquisitionDetailHtml

      throw new Error(`Unexpected Holcim URL: ${url}`)
    },
    now: () => '2026-07-18T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    holcim.CATEGORY_URL,
    'https://careers.holcimgroup.com/holcim_ghbs/job/Navi-Mumbai-Assistant-Manager-Analytics%2C-Qlik-Developer-%28GHAR%29-MH-400708/1348971557/',
    'https://careers.holcimgroup.com/holcim_ghbs/job/Navi-Mumbai-Talent-Acquisition-Specialist-MH-400708/1361698557/',
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => [job.title, job.location, job.country, job.source]),
    [
      ['Assistant Manager - Analytics, Qlik Developer (GHAR)', 'Navi Mumbai, MH, India', 'India', 'holcimglobalhubbusinessservices'],
      ['Talent Acquisition Specialist', 'Navi Mumbai, MH, India', 'India', 'holcimglobalhubbusinessservices'],
    ],
  )
})
