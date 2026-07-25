import assert from 'node:assert/strict'
import test from 'node:test'

const loadCampusSutraModule = async () => {
  try {
    return await import('../campussutra/script.js')
  } catch {
    assert.fail('Expected Campus Sutra scraper module at ../scraper/campussutra/script.js')
  }
}

const companyHtml = '<title>Campus Sutra | LinkedIn</title><meta content="urn:li:organization:3032227">'

const searchHtml = `
  <div class="base-card base-card--link job-search-card" data-entity-urn="urn:li:jobPosting:4409925259">
    <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/performance-marketing-at-campus-sutra-4409925259">
      <h3 class="base-search-card__title">Performance Marketing</h3>
    </a>
    <h4 class="base-search-card__subtitle"><a>Campus Sutra</a></h4>
    <span class="job-search-card__location">Bengaluru, Karnataka, India</span>
    <time class="job-search-card__listdate" datetime="2026-06-26"></time>
  </div>
`

const detailHtml = `
  <script type="application/ld+json">
    {"@type":"JobPosting","employmentType":"FULL_TIME","description":"<p>Scale paid campaigns.</p>"}
  </script>
`

test('Campus Sutra scraper accepts only its official public company page', async () => {
  const campusSutra = await loadCampusSutraModule()

  assert.equal(campusSutra.pageIndicatesCampusSutraCompany(companyHtml), true)
  assert.equal(campusSutra.pageIndicatesCampusSutraCompany('<title>Other | LinkedIn</title>'), false)
})

test('Campus Sutra scraper maps public India job records and decorates them for the runner', async () => {
  const campusSutra = await loadCampusSutraModule()
  const scraper = campusSutra.createCampusSutraScraper({ maxJobs: 1 })
  const requestedUrls = []

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === campusSutra.LINKEDIN_COMPANY_PAGE_URL) return companyHtml
      if (url === campusSutra.LINKEDIN_INDIA_JOBS_URL) return searchHtml
      if (url.includes('/jobs/view/performance-marketing-at-campus-sutra-4409925259')) return detailHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    campusSutra.LINKEDIN_COMPANY_PAGE_URL,
    campusSutra.LINKEDIN_INDIA_JOBS_URL,
    'https://www.linkedin.com/jobs/view/performance-marketing-at-campus-sutra-4409925259',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Performance Marketing')
  assert.equal(jobs[0].company, 'Campus Sutra')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].source, 'campussutra')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
})
