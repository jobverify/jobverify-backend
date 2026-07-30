import assert from 'node:assert/strict'
import test from 'node:test'

const renderedPageOneHtml = `
  <html>
    <body>
      <h1>Join our mission to help businesses earn and prove trust</h1>
      <section>
        <h2>Open Roles</h2>
        <div role="list">
          <div role="listitem" class="careers-open_card w-dyn-item">
            <div class="text-color-black">Software Engineering</div>
            <div fs-text-element="job-title" class="text-weight-semibold">
              Senior Software Engineer, Developer Experience
            </div>
            <div fs-cmsfilter-field="location" class="text-weight-semibold">Remote U.S.</div>
            <a
              fs-text-element="job-url"
              href="https://www.vanta.com/company/careers/senior-software-engineer-developer-experience"
              class="careers-open_button"
            >Learn more</a>
          </div>
          <div role="listitem" class="careers-open_card w-dyn-item">
            <div class="text-color-black">Solutions Engineering</div>
            <div fs-text-element="job-title" class="text-weight-semibold">
              Solutions Engineer, Enterprise
            </div>
            <div fs-cmsfilter-field="location" class="text-weight-semibold">Bengaluru, India</div>
            <a
              fs-text-element="job-url"
              href="https://www.vanta.com/company/careers/solutions-engineer-enterprise"
              class="careers-open_button"
            >Learn more</a>
          </div>
        </div>
        <div class="w-pagination-wrapper careers-open_pagination">
          <a href="?9a22bd08_page=2" aria-label="Next Page" class="w-pagination-next button">Next</a>
        </div>
      </section>
    </body>
  </html>
`

const renderedPageTwoHtml = `
  <html>
    <body>
      <section>
        <h2>Open Roles</h2>
        <div role="list">
          <div role="listitem" class="careers-open_card w-dyn-item">
            <div class="text-color-black">Customer Success</div>
            <div fs-text-element="job-title" class="text-weight-semibold">
              Customer Success Manager, APAC
            </div>
            <div fs-cmsfilter-field="location" class="text-weight-semibold">Remote, India</div>
            <a
              fs-text-element="job-url"
              href="https://www.vanta.com/company/careers/customer-success-manager-apac"
              class="careers-open_button"
            >Learn more</a>
          </div>
          <div role="listitem" class="careers-open_card w-dyn-item">
            <div class="text-color-black">Sales</div>
            <div fs-text-element="job-title" class="text-weight-semibold">Manager, Sales - London</div>
            <div fs-cmsfilter-field="location" class="text-weight-semibold">London, UK</div>
            <a
              fs-text-element="job-url"
              href="https://www.vanta.com/company/careers/manager-sales-london"
              class="careers-open_button"
            >Learn more</a>
          </div>
        </div>
        <div class="w-pagination-wrapper careers-open_pagination">
          <a href="?9a22bd08_page=1" aria-label="Previous Page" class="w-pagination-previous button">Previous</a>
          <a href="?9a22bd08_page=3" aria-label="Next Page" class="w-pagination-next button">Next</a>
        </div>
      </section>
    </body>
  </html>
`

const renderedEmptyPageHtml = `
  <html>
    <body>
      <section>
        <h2>Open Roles</h2>
        <div class="w-pagination-wrapper careers-open_pagination">
          <a href="?9a22bd08_page=2" aria-label="Previous Page" class="w-pagination-previous button">Previous</a>
        </div>
        <div fs-cmsfilter-element="empty" class="careers-open_empty">
          <div class="heading-style-h2 heading-nib-dark-semibold">No open position found</div>
        </div>
      </section>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../vanta/script.js')
  } catch {
    assert.fail('Expected Vanta scraper module at ../vanta/script.js')
  }
}

test('Vanta scraper helpers stay pinned to the verified first-party careers surface', async () => {
  const vanta = await loadModule()

  assert.equal(vanta.SOURCE, 'vanta')
  assert.equal(vanta.COMPANY, 'Vanta')
  assert.equal(vanta.CAREERS_URL, 'https://www.vanta.com/company/careers')
  assert.equal(vanta.VERIFIED_ON, '2026-07-25')
  assert.equal(vanta.hasVerifiedCareersPageSignal(renderedPageOneHtml), true)
  assert.equal(vanta.hasVerifiedCareersPageSignal('<html><body>Not Vanta</body></html>'), false)
  assert.equal(vanta.hasNoOpenPositionSignal(renderedEmptyPageHtml), true)
  assert.equal(vanta.hasNoOpenPositionSignal(renderedPageOneHtml), false)
  assert.equal(vanta.extractNextPageNumber(renderedPageOneHtml), 2)
  assert.equal(vanta.extractNextPageNumber(renderedPageTwoHtml), 3)
  assert.equal(vanta.extractNextPageNumber(renderedEmptyPageHtml), null)

  assert.deepEqual(vanta.extractJobsFromRenderedPageHtml(renderedPageOneHtml), [
    {
      title: 'Senior Software Engineer, Developer Experience',
      company: 'Vanta',
      department: 'Software Engineering',
      location: 'Remote U.S.',
      city: 'Remote',
      country: 'United States',
      jobId: 'vanta:senior-software-engineer-developer-experience',
      requisitionId: null,
      sourceUrl: 'https://www.vanta.com/company/careers/senior-software-engineer-developer-experience',
      applyUrl: 'https://www.vanta.com/company/careers/senior-software-engineer-developer-experience',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'Remote',
    },
    {
      title: 'Solutions Engineer, Enterprise',
      company: 'Vanta',
      department: 'Solutions Engineering',
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      country: 'India',
      jobId: 'vanta:solutions-engineer-enterprise',
      requisitionId: null,
      sourceUrl: 'https://www.vanta.com/company/careers/solutions-engineer-enterprise',
      applyUrl: 'https://www.vanta.com/company/careers/solutions-engineer-enterprise',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    },
  ])
})

test('Vanta scraper paginates the verified first-party careers pages and keeps only India jobs', async () => {
  const vanta = await loadModule()
  const requestedPages = []

  const jobs = await vanta.createVantaScraper().run({
    fetchPageHtml: async (pageNumber) => {
      requestedPages.push(pageNumber)
      if (pageNumber === 1) return renderedPageOneHtml
      if (pageNumber === 2) return renderedPageTwoHtml
      return renderedEmptyPageHtml
    },
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(requestedPages, [1, 2, 3])
  assert.deepEqual(
    jobs.map((job) => [job.title, job.location, job.department, job.country, job.link]),
    [
      [
        'Solutions Engineer, Enterprise',
        'Bengaluru, India',
        'Solutions Engineering',
        'India',
        'https://www.vanta.com/company/careers/solutions-engineer-enterprise',
      ],
      [
        'Customer Success Manager, APAC',
        'Remote, India',
        'Customer Success',
        'India',
        'https://www.vanta.com/company/careers/customer-success-manager-apac',
      ],
    ],
  )
  assert.equal(jobs[0].source, 'vanta')
  assert.equal(jobs[0].scrapedAt, '2026-07-25T00:00:00.000Z')
})

test('Vanta scraper allows a trustworthy but currently non-India board to return an empty list', async () => {
  const vanta = await loadModule()

  const jobs = await vanta.createVantaScraper().run({
    fetchPageHtml: async (pageNumber) => (
      pageNumber === 1
        ? renderedPageOneHtml.replace('Bengaluru, India', 'Remote U.S.')
        : renderedEmptyPageHtml
    ),
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [])
})
