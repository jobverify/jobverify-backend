import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_PAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Explore Opportunities Across the Globe | Hyland</title>
  </head>
  <body>
    <h1>Explore opportunities across the globe</h1>
    <a href="https://careers-hyland.icims.com/jobs/search?hashed=-435679902&ss=1">Join our team</a>
    <p>Career opportunities across the globe</p>
  </body>
</html>
`

const LISTINGS_PAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Hyland | Jobs in Software at Hyland | Job Listings at Hyland</title>
    <link rel="next" href="https://careers-hyland.icims.com/jobs/search?pr=1&in_iframe=1&searchRelation=keyword_all" />
  </head>
  <body>
    <h1>Job Listings</h1>
    <div>Search Results Page 1 of 2</div>
    <article class="job">
      <a href="https://careers-hyland.icims.com/jobs/14187/senior-product-designer---cloud-update-service/job?in_iframe=1">Senior Product Designer - Cloud Update Service</a>
      <div>Job ID 2026-14187</div>
      <div>Category Product Management</div>
      <div>Job Locations Remote - India</div>
      <p>Senior Product Designer – Content Cloud</p>
    </article>
    <article class="job">
      <a href="https://careers-hyland.icims.com/jobs/13938/senior-cyber-security-analyst-%28cybersecurity---identity-and-access-management%29/job?in_iframe=1">Senior Cyber Security Analyst (Cybersecurity - Identity and Access Management)</a>
      <div>Job ID 2026-13938</div>
      <div>Category Customer Success &amp; Operations</div>
      <div>Job Locations Hyderabad India Office</div>
      <p>Location: Hyderabad, India Work Arrangement: Hybrid – 3 days per week in office</p>
    </article>
  </body>
</html>
`

const PAGE_TWO_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Hyland | Jobs in Software at Hyland | Job Listings at Hyland</title>
  </head>
  <body>
    <h1>Job Listings</h1>
    <div>Search Results Page 2 of 2</div>
    <article class="job">
      <a href="https://careers-hyland.icims.com/jobs/14170/senior-software-engineer/job?in_iframe=1">Senior Software Engineer</a>
      <div>Job ID 2026-14170</div>
      <div>Category Technology - Engineering &amp; Testing</div>
      <div>Job Locations Kolkata India Office</div>
      <p>Hybrid role in Kolkata.</p>
    </article>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../hylandsoftwaresolutionsindia/script.js')
  } catch {
    assert.fail('Expected Hyland Software Solutions India scraper module at ../hylandsoftwaresolutionsindia/script.js')
  }
}

test('Hyland Software Solutions India helpers stay pinned to the verified first-party careers handoff and iCIMS India listings', async () => {
  const hyland = await loadModule()

  assert.equal(hyland.SOURCE, 'hylandsoftwaresolutionsindia')
  assert.equal(hyland.COMPANY, 'Hyland Software Solutions India LLP')
  assert.equal(hyland.CAREERS_URL, 'https://www.hyland.com/en/company/careers')
  assert.equal(hyland.JOBS_SEARCH_URL, 'https://careers-hyland.icims.com/jobs/search?hashed=-435679902&ss=1')
  assert.equal(hyland.VERIFIED_ON, '2026-07-17')
  assert.equal(hyland.hasOfficialCareersSignal(CAREERS_PAGE_HTML), true)
  assert.equal(hyland.extractSearchUrl(CAREERS_PAGE_HTML), hyland.JOBS_SEARCH_URL)
  assert.equal(hyland.hasListingsSignal(LISTINGS_PAGE_HTML), true)
  assert.equal(
    hyland.extractNextPageUrl(LISTINGS_PAGE_HTML),
    'https://careers-hyland.icims.com/jobs/search?pr=1&in_iframe=1&searchRelation=keyword_all',
  )
  assert.deepEqual(hyland.extractJobs(LISTINGS_PAGE_HTML), [
    {
      title: 'Senior Product Designer - Cloud Update Service',
      company: 'Hyland Software Solutions India LLP',
      department: 'Product Management',
      location: 'Remote - India',
      city: null,
      country: 'India',
      jobId: '2026-14187',
      requisitionId: '2026-14187',
      sourceUrl: 'https://careers-hyland.icims.com/jobs/14187/senior-product-designer---cloud-update-service/job?in_iframe=1',
      applyUrl: 'https://careers-hyland.icims.com/jobs/14187/senior-product-designer---cloud-update-service/job?in_iframe=1',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Senior Product Designer – Content Cloud',
    },
    {
      title: 'Senior Cyber Security Analyst (Cybersecurity - Identity and Access Management)',
      company: 'Hyland Software Solutions India LLP',
      department: 'Customer Success & Operations',
      location: 'Hyderabad India Office',
      city: 'Hyderabad',
      country: 'India',
      jobId: '2026-13938',
      requisitionId: '2026-13938',
      sourceUrl: 'https://careers-hyland.icims.com/jobs/13938/senior-cyber-security-analyst-%28cybersecurity---identity-and-access-management%29/job?in_iframe=1',
      applyUrl: 'https://careers-hyland.icims.com/jobs/13938/senior-cyber-security-analyst-%28cybersecurity---identity-and-access-management%29/job?in_iframe=1',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Location: Hyderabad, India Work Arrangement: Hybrid – 3 days per week in office',
    },
  ])
})

test('Hyland Software Solutions India run validates the first-party handoff and paginates India iCIMS roles', async () => {
  const hyland = await loadModule()
  const jobs = await hyland.createHylandSoftwareSolutionsIndiaScraper({
    now: () => '2026-07-17T12:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      if (url === hyland.CAREERS_URL) return CAREERS_PAGE_HTML
      if (url === hyland.JOBS_SEARCH_URL) return LISTINGS_PAGE_HTML
      if (url === 'https://careers-hyland.icims.com/jobs/search?pr=1&in_iframe=1&searchRelation=keyword_all') {
        return PAGE_TWO_HTML
      }
      throw new Error(`Unexpected Hyland URL: ${url}`)
    },
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].source, 'hylandsoftwaresolutionsindia')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-17T12:00:00.000Z')
  assert.equal(jobs[2].city, 'Kolkata')
})

test('Hyland Software Solutions India fails closed when the first-party careers handoff or iCIMS surface drifts', async () => {
  const hyland = await loadModule()

  await assert.rejects(
    hyland.createHylandSoftwareSolutionsIndiaScraper().run({
      fetchText: async (url) => {
        if (url === hyland.CAREERS_URL) return '<html><body><h1>Careers</h1></body></html>'
        throw new Error(`Unexpected Hyland URL: ${url}`)
      },
    }),
    /verified Hyland careers page/i,
  )

  await assert.rejects(
    hyland.createHylandSoftwareSolutionsIndiaScraper().run({
      fetchText: async (url) => {
        if (url === hyland.CAREERS_URL) return CAREERS_PAGE_HTML
        if (url === hyland.JOBS_SEARCH_URL) return '<html><body><h1>Jobs</h1></body></html>'
        throw new Error(`Unexpected Hyland URL: ${url}`)
      },
    }),
    /verified Hyland iCIMS listings surface/i,
  )
})
