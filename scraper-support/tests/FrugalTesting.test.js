import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { generateCompanyCoverageReport } from '../providers/companyCoverage.js'
import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const modulePath = path.resolve(currentDir, '../../scraper/frugaltesting/script.js')
const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers</title>
  </head>
  <body>
    <main>
      <h1>Careers at Frugal</h1>
      <h2>We're looking for talented people to join us</h2>
      <a href="/apply-to-frugal-testing">Apply now</a>
      <a href="/job-openings/sales-executive">Learn more</a>
      <a href="/job-openings/senior-qa-engineer">Learn more</a>
      <a href="/job-openings/junior-graphic-designer">Learn more</a>
    </main>
  </body>
</html>
`

const salesExecutiveHtml = `
<!doctype html>
<html lang="en">
  <body>
    <p>Sales & Business Development</p>
    <h2>Sales Executive</h2>
    <p>As a Sales Executive at Frugal Testing, you'll drive revenue growth by identifying and converting prospects into clients.</p>
    <p>Hyderabad</p>
    <p>Full Time, Permanent</p>
    <p>2 to 5 years</p>
    <a href="https://www.frugaltesting.com/apply-to-frugal-testing">Apply Now</a>
  </body>
</html>
`

const seniorQaEngineerHtml = `
<!doctype html>
<html lang="en">
  <body>
    <p>Software & QA</p>
    <h2>Senior QA Engineer</h2>
    <p>We are looking for a Senior QA Engineer with extensive experience in manual and automated testing to join our team.</p>
    <p>Hyderabad</p>
    <p>Full Time</p>
    <p>2 - 5 years</p>
    <a href="https://www.frugaltesting.com/apply-to-frugal-testing">Apply Now</a>
  </body>
</html>
`

const juniorGraphicDesignerHtml = `
<!doctype html>
<html lang="en">
  <body>
    <p>Graphic Designer + Operations</p>
    <h2>Junior Graphic Designer</h2>
    <p>As a Junior Graphic Designer/Canva Designer at Frugal Testing, you'll create engaging content for blogs and social media using Canva.</p>
    <p>Hyderabad</p>
    <p>Full Time</p>
    <p>1-3 Years</p>
    <a href="https://www.frugaltesting.com/apply-to-frugal-testing">Apply Now</a>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../../scraper/frugaltesting/catalog.js')
  } catch {
    assert.fail('Expected Frugal Testing catalog module at ../../scraper/frugaltesting/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../../scraper/frugaltesting/script.js')
  } catch {
    assert.fail('Expected Frugal Testing scraper module at ../../scraper/frugaltesting/script.js')
  }
}

test('Frugal Testing local catalog captures the verified first-party careers and detail-page surface', async () => {
  const { FRUGAL_TESTING_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(FRUGAL_TESTING_CATALOG)

  assert.equal(defaultCatalog, FRUGAL_TESTING_CATALOG)
  assert.equal(provider.source, 'frugaltesting')
  assert.equal(provider.companyName, 'Frugal Testing')
  assert.equal(provider.officialBrandName, 'Frugal Testing')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.homepageUrl, 'https://www.frugaltesting.com/')
  assert.equal(provider.companyCareerPage, 'https://www.frugaltesting.com/careers')
  assert.equal(provider.applicationFormUrl, 'https://www.frugaltesting.com/apply-to-frugal-testing')
  assert.equal(provider.companyDomain, 'frugaltesting.com')
  assert.equal(provider.atsPlatform, 'official-first-party-job-openings')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'single-first-party-careers-page-plus-detail-pages')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-careers-listing+first-party-job-detail-pages+shared-application-form',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.equal(provider.modulePath, modulePath)
  assert.match(provider.verifiedSurfaceSummary, /Saturday, July 18, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Sales Executive/i)
  assert.match(provider.verifiedSurfaceSummary, /Senior QA Engineer/i)
  assert.match(provider.verifiedSurfaceSummary, /Junior Graphic Designer/i)

  const report = generateCompanyCoverageReport({
    csvText: 'Frugal Testing\n',
    catalog: [provider],
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 0)
})

test('Frugal Testing scraper parses first-party detail pages linked from the careers listing', async () => {
  const frugal = await loadScriptModule()

  assert.equal(frugal.SOURCE, 'frugaltesting')
  assert.equal(frugal.COMPANY, 'Frugal Testing')
  assert.equal(frugal.CAREERS_URL, 'https://www.frugaltesting.com/careers')
  assert.equal(frugal.APPLICATION_FORM_URL, 'https://www.frugaltesting.com/apply-to-frugal-testing')
  assert.equal(frugal.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(frugal.extractJobDetailUrls(careersHtml), [
    'https://www.frugaltesting.com/job-openings/sales-executive',
    'https://www.frugaltesting.com/job-openings/senior-qa-engineer',
    'https://www.frugaltesting.com/job-openings/junior-graphic-designer',
  ])

  const parsedJob = frugal.parseJobDetailPage(
    'https://www.frugaltesting.com/job-openings/senior-qa-engineer',
    seniorQaEngineerHtml,
  )
  assert.equal(parsedJob.title, 'Senior QA Engineer')
  assert.equal(parsedJob.department, 'Software & QA')
  assert.equal(parsedJob.location, 'Hyderabad')
  assert.equal(parsedJob.employmentType, 'Full Time')
  assert.equal(parsedJob.experienceRequired, '2 - 5 years')

  const jobs = await frugal.createFrugalTestingScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      if (url === frugal.CAREERS_URL) return careersHtml
      if (url === 'https://www.frugaltesting.com/job-openings/sales-executive') return salesExecutiveHtml
      if (url === 'https://www.frugaltesting.com/job-openings/senior-qa-engineer') return seniorQaEngineerHtml
      if (url === 'https://www.frugaltesting.com/job-openings/junior-graphic-designer') return juniorGraphicDesignerHtml
      throw new Error(`Unexpected Frugal Testing URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => [job.title, job.department, job.location, job.applyUrl]),
    [
      ['Sales Executive', 'Sales & Business Development', 'Hyderabad', frugal.APPLICATION_FORM_URL],
      ['Senior QA Engineer', 'Software & QA', 'Hyderabad', frugal.APPLICATION_FORM_URL],
      ['Junior Graphic Designer', 'Graphic Designer + Operations', 'Hyderabad', frugal.APPLICATION_FORM_URL],
    ],
  )
  assert.equal(jobs[0].source, 'frugaltesting')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('Frugal Testing fails closed when the verified careers listing or detail pages drift', async () => {
  const frugal = await loadScriptModule()

  await assert.rejects(
    frugal.createFrugalTestingScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified frugal testing careers page/i,
  )

  await assert.rejects(
    frugal.createFrugalTestingScraper().run({
      fetchText: async (url) => {
        if (url === frugal.CAREERS_URL) return careersHtml
        return '<html><body><h2>Broken</h2></body></html>'
      },
    }),
    /verified frugal testing detail page/i,
  )
})
