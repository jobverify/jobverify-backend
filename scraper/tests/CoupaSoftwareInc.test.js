import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { hydrateProviderCatalogEntry } from '../providers/index.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const scriptModulePath = path.resolve(currentDir, '../coupasoftwareinc/script.js')

const jobsPageOneHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Shape your career at Coupa - Explore opportunities to make an impact. | Coupa Careers</title>
  </head>
  <body>
    <h1>Shape your career at Coupa</h1>
    <p>Displaying 1 to 20 of 101 matching jobs</p>
    <article class="job-card">
      <h2><a href="https://careers.coupa.com/en/jobs/coupa-manager-software-engineering-11699/">Manager, Software Engineering (.Net with React)(12+ years) - 11699</a></h2>
      <ul>
        <li>Hyderabad, India</li>
        <li>Engineering - India</li>
        <li>Hybrid</li>
      </ul>
    </article>
    <article class="job-card">
      <h2><a href="https://careers.coupa.com/en/jobs/coupa-lead-ruby-11693/">Lead Software Engineer - Ruby on Rails(8-12 years) - 11693</a></h2>
      <ul>
        <li>Pune, India</li>
        <li>Engineering - India</li>
        <li>Hybrid</li>
      </ul>
    </article>
    <article class="job-card">
      <h2><a href="https://careers.coupa.com/en/jobs/coupa-sr-account-director-11692/">Sr Account Director, Enterprise - 11692</a></h2>
      <ul>
        <li>United States</li>
        <li>Sales Americas</li>
      </ul>
    </article>
    <nav aria-label="Pagination">
      <a href="https://careers.coupa.com/en/jobs/?page=2">2</a>
    </nav>
  </body>
</html>
`

const jobsPageTwoHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Shape your career at Coupa - Explore opportunities to make an impact. | Coupa Careers</title>
  </head>
  <body>
    <h1>Shape your career at Coupa</h1>
    <article class="job-card">
      <h2><a href="https://careers.coupa.com/en/jobs/coupa-lead-cloud-11625/">Lead Cloud Software Engineer - 11625</a></h2>
      <ul>
        <li>Bangalore, India</li>
        <li>Cloud Operations</li>
        <li>Remote</li>
      </ul>
    </article>
  </body>
</html>
`

const loadCatalogModule = async () => {
  try {
    return await import('../coupasoftwareinc/catalog.js')
  } catch {
    assert.fail('Expected Coupa Software Inc catalog module at ../coupasoftwareinc/catalog.js')
  }
}

const loadScriptModule = async () => {
  try {
    return await import('../coupasoftwareinc/script.js')
  } catch {
    assert.fail('Expected Coupa Software Inc scraper module at ../coupasoftwareinc/script.js')
  }
}

test('Coupa Software Inc local catalog captures the verified first-party jobs contract', async () => {
  const { COUPA_SOFTWARE_INC_CATALOG, default: defaultCatalog } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(COUPA_SOFTWARE_INC_CATALOG)

  assert.equal(defaultCatalog, COUPA_SOFTWARE_INC_CATALOG)
  assert.equal(provider.source, 'coupasoftwareinc')
  assert.equal(provider.companyName, 'Coupa Software Inc')
  assert.equal(provider.officialBrandName, 'Coupa')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.companyCareerPage, 'https://careers.coupa.com/en/jobs/')
  assert.equal(provider.jobsPageUrl, 'https://careers.coupa.com/en/jobs/')
  assert.equal(provider.companyDomain, 'careers.coupa.com')
  assert.equal(provider.atsPlatform, 'coupa-careers-site')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-html-pagination')
  assert.equal(
    provider.extractionStrategy,
    'verified-first-party-jobs-page+html-job-cards+country-filtered-pagination',
  )
  assert.equal(provider.verifiedOn, '2026-07-18')
  assert.match(provider.verifiedSurfaceSummary, /Displaying 1 to 20 of 101 matching jobs/i)
  assert.match(provider.verifiedSurfaceSummary, /Manager, Software Engineering/i)
  assert.match(provider.modulePath, /coupasoftwareinc[\\/]script\.js$/i)
})

test('Coupa Software Inc hydrated local catalog stays script-runner compatible', async () => {
  const { COUPA_SOFTWARE_INC_CATALOG } = await loadCatalogModule()
  const provider = hydrateProviderCatalogEntry(COUPA_SOFTWARE_INC_CATALOG)
  const module = await import(pathToFileURL(provider.modulePath).href)

  assert.equal(provider.adapter, 'script')
  assert.equal(typeof module.run, 'function')
})

test('Coupa Software Inc helpers stay pinned to the verified first-party jobs page', async () => {
  const coupa = await loadScriptModule()

  assert.equal(coupa.SOURCE, 'coupasoftwareinc')
  assert.equal(coupa.COMPANY, 'Coupa Software Inc')
  assert.equal(coupa.JOBS_PAGE_URL, 'https://careers.coupa.com/en/jobs/')
  assert.equal(coupa.VERIFIED_ON, '2026-07-18')
  assert.equal(coupa.hasOfficialJobsPageSignal(jobsPageOneHtml), true)
  assert.deepEqual(coupa.extractIndiaJobsFromPage(jobsPageOneHtml), [
    {
      title: 'Manager, Software Engineering (.Net with React)(12+ years) - 11699',
      location: 'Hyderabad, India',
      department: 'Engineering - India',
      employmentType: 'Hybrid',
      sourceUrl: 'https://careers.coupa.com/en/jobs/coupa-manager-software-engineering-11699/',
      jobId: '11699',
    },
    {
      title: 'Lead Software Engineer - Ruby on Rails(8-12 years) - 11693',
      location: 'Pune, India',
      department: 'Engineering - India',
      employmentType: 'Hybrid',
      sourceUrl: 'https://careers.coupa.com/en/jobs/coupa-lead-ruby-11693/',
      jobId: '11693',
    },
  ])
  assert.deepEqual(coupa.extractPaginationUrls(jobsPageOneHtml), [
    'https://careers.coupa.com/en/jobs/?page=2',
  ])
})

test('Coupa Software Inc run paginates the verified first-party jobs pages and returns India jobs', async () => {
  const coupa = await loadScriptModule()
  const requestedUrls = []
  const jobs = await coupa.createCoupaSoftwareIncScraper({
    now: () => '2026-07-18T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === coupa.JOBS_PAGE_URL) return jobsPageOneHtml
      if (url === 'https://careers.coupa.com/en/jobs/?page=2') return jobsPageTwoHtml
      throw new Error(`Unexpected Coupa URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    coupa.JOBS_PAGE_URL,
    'https://careers.coupa.com/en/jobs/?page=2',
  ])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'coupasoftwareinc')
  assert.equal(jobs[0].company, 'Coupa Software Inc')
  assert.equal(jobs[0].companyCareerPage, coupa.JOBS_PAGE_URL)
  assert.equal(jobs[0].companyDomain, 'careers.coupa.com')
  assert.equal(jobs[0].atsPlatform, 'coupa-careers-site')
  assert.equal(jobs[2].location, 'Bangalore, India')
  assert.equal(jobs[2].employmentType, 'Remote')
})

test('Coupa Software Inc fails closed when the verified jobs shell changes materially', async () => {
  const coupa = await loadScriptModule()

  await assert.rejects(
    coupa.createCoupaSoftwareIncScraper().run({
      fetchText: async () => '<html><body><h1>Jobs</h1></body></html>',
    }),
    /verified Coupa jobs page/i,
  )
})
