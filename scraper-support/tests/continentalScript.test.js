import assert from 'node:assert/strict'
import test from 'node:test'

const loadContinentalModule = async () => {
  try {
    return await import('../../scraper/continental/script.js')
  } catch {
    assert.fail('Expected Continental scraper module at ../../scraper/scraper/continental/script.js')
  }
}

const indiaListing = {
  refNumber: 'REF97252H',
  publicationDate: '2026-07-02T06:58:29.671Z',
  title: ' Production Shift Supervisor ',
  cityLabel: 'Meerut',
  countryLabel: 'India',
  fieldOfWorkLabel: 'Manufacturing Operations and Production',
  jobFlexibilityLabel: 'Onsite Job',
  internalId: 'REF97252H-p-c7e537bc6244c0a1d9a5c8edb0e5ae72',
  absoluteUrl: 'https://jobs.continental.com/en/detail-page/job-detail/REF97252H-p-c7e537bc6244c0a1d9a5c8edb0e5ae72/production-shift-supervisor-/',
}

const detailHtml = `
  <html>
    <head>
      <title>Production Shift Supervisor | Continental</title>
      <meta property="og:title" content="Production Shift Supervisor" />
    </head>
    <body>
      <h1>Production Shift Supervisor</h1>
      <h2>Your tasks</h2>
      <div class="c-jobdetails__section__content" data-accordion-target="contentsection-job-description">
        <div class="c-readmore">
          <p>Lead production operations and maintain shift discipline.</p>
        </div>
      </div>
      <h2>Your profile</h2>
      <div class="c-jobdetails__section__content" data-accordion-target="contentsection-qualifications">
        <div class="c-readmore">
          <p>3-5 years of experience in manufacturing supervision.</p>
        </div>
      </div>
    </body>
  </html>
`

const removedDetailHtml = `
  <html>
    <body>
      <p>We are sorry. We were unable to find any job opportunities for this inquiry.</p>
      <p>This vacancy has been removed.</p>
    </body>
  </html>
`

test('buildIndiaSearchRequest uses Continental\'s official India location payload', async () => {
  const { buildIndiaSearchRequest, INDIA_LOCATION, RESULTS_API_URL } = await loadContinentalModule()

  const request = buildIndiaSearchRequest({ currentPage: 2, itemsPerPage: 100 })

  assert.equal(request.url, RESULTS_API_URL)
  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.body.get('tx_conjobs_api[filter][location]'), INDIA_LOCATION)
  assert.equal(request.options.body.get('tx_conjobs_api[itemsPerPage]'), '100')
  assert.equal(request.options.body.get('tx_conjobs_api[currentPage]'), '2')
})

test('extractSearchResults keeps Continental India listings and maps public API fields', async () => {
  const { extractSearchResults } = await loadContinentalModule()
  const jobs = extractSearchResults({
    result: {
      list: [
        indiaListing,
        {
          ...indiaListing,
          refNumber: 'REF99999H',
          cityLabel: 'Hanover',
          countryLabel: 'Germany',
        },
      ],
    },
  })

  assert.deepEqual(jobs, [{
    title: 'Production Shift Supervisor',
    company: 'Continental',
    department: 'Manufacturing Operations and Production',
    location: 'Meerut, India',
    city: 'Meerut',
    country: 'India',
    jobId: 'REF97252H',
    requisitionId: 'REF97252H',
    sourceUrl: indiaListing.absoluteUrl,
    applyUrl: indiaListing.absoluteUrl,
    employmentType: null,
    remoteStatus: 'On-site',
    postingDate: '2026-07-02T06:58:29.671Z',
    closingDate: null,
    requiredSkills: [],
    jobDescription: 'Field of work: Manufacturing Operations and Production. Flexibility: Onsite Job.',
  }])
})

test('extractJobDetailFromHtml parses Continental detail pages and skips removed vacancies', async () => {
  const { extractJobDetailFromHtml } = await loadContinentalModule()

  assert.deepEqual(extractJobDetailFromHtml(detailHtml, {
    title: 'Production Shift Supervisor',
    company: 'Continental',
    department: 'Manufacturing Operations and Production',
    location: 'Meerut, India',
    city: 'Meerut',
    country: 'India',
    jobId: 'REF97252H',
    requisitionId: 'REF97252H',
    sourceUrl: indiaListing.absoluteUrl,
    applyUrl: indiaListing.absoluteUrl,
    employmentType: null,
    remoteStatus: 'On-site',
    postingDate: '2026-07-02T06:58:29.671Z',
    closingDate: null,
    requiredSkills: [],
    jobDescription: 'Field of work: Manufacturing Operations and Production. Flexibility: Onsite Job.',
  }), {
    title: 'Production Shift Supervisor',
    company: 'Continental',
    department: 'Manufacturing Operations and Production',
    location: 'Meerut, India',
    city: 'Meerut',
    country: 'India',
    jobId: 'REF97252H',
    requisitionId: 'REF97252H',
    sourceUrl: indiaListing.absoluteUrl,
    applyUrl: indiaListing.absoluteUrl,
    employmentType: null,
    remoteStatus: 'On-site',
    postingDate: '2026-07-02T06:58:29.671Z',
    closingDate: null,
    requiredSkills: [],
    jobDescription: 'Lead production operations and maintain shift discipline.\n\n3-5 years of experience in manufacturing supervision.',
    experienceRequired: '3-5 years',
    publicExperienceChecked: true,
  })

  assert.equal(extractJobDetailFromHtml(removedDetailHtml, indiaListing), null)
})

test('run paginates Continental\'s official India results and decorates runner fields', async () => {
  const { RESULTS_API_URL, createContinentalScraper } = await loadContinentalModule()
  const requestedPages = []
  const requestedDetails = []
  const scraper = createContinentalScraper()

  const jobs = await scraper.run({
    fetchJson: async (url, options) => {
      assert.equal(url, RESULTS_API_URL)
      requestedPages.push(options.body.get('tx_conjobs_api[currentPage]') || '1')

      if (requestedPages.length === 1) {
        return {
          result: {
            list: [indiaListing],
            pagination: { nextPage: 2, isLastPage: false },
          },
        }
      }

      return {
        result: {
          list: [{
            ...indiaListing,
            refNumber: 'REF97253H',
            title: 'Software Engineer',
            cityLabel: 'Bangalore',
          }],
          pagination: { nextPage: null, isLastPage: true },
        },
      }
    },
    fetchText: async (url) => {
      requestedDetails.push(url)
      return detailHtml
    },
  })

  assert.deepEqual(requestedPages, ['1', '2'])
  assert.deepEqual(requestedDetails, [
    indiaListing.absoluteUrl,
    'https://jobs.continental.com/en/detail-page/job-detail/REF97252H-p-c7e537bc6244c0a1d9a5c8edb0e5ae72/production-shift-supervisor-/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'continental')
  assert.equal(jobs[0].link, indiaListing.absoluteUrl)
  assert.equal(jobs[0].experienceRequired, '3-5 years')
  assert.equal(jobs[0].publicExperienceChecked, true)
  assert.match(jobs[0].scrapedAt, /^\d{4}-\d{2}-\d{2}T/)
})
