import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const homepageHtml = `
  <html lang="en">
    <head>
      <title>Electronics Manufacturing Services | Dixon Technologies</title>
    </head>
    <body>
      <section>
        <h1>Precision and Performance in every Product</h1>
        <a href="https://www.dixoninfo.com/job-openings">WORK WITH US</a>
      </section>
    </body>
  </html>
`

const officialJobOpeningsHtml = `
  <html lang="en">
    <head>
      <title>Job Openings | Dixon Technologies</title>
      <meta
        name="description"
        content="Join Dixon Technologies’ growing team. Explore current job openings across departments and locations and start your career with us today."
      >
    </head>
    <body>
      <section>
        <h2>Grow With Us</h2>
        <h4>A Great Place to Work.</h4>
        <a href="employee-stories">Voices of Dixon</a>
        <a href="https://dixon.darwinbox.in/ms/candidate/careers">EXPLORE JOB OPENINGS</a>
        <a href="submit-resume">SUBMIT YOUR RESUME</a>
      </section>
    </body>
  </html>
`

const listingPayload = {
  job_counts: 2,
  data: [
    {
      id: 'dixon-001',
      title: 'Production Engineer',
      department_name: 'Manufacturing',
      locations: 'Noida, Uttar Pradesh, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '2 - 4 Years',
      posted_on: '15-Jul-2026',
      jd: '<p>Support production planning and quality execution.</p>',
    },
    {
      id: 'dixon-us-001',
      title: 'Plant Controller',
      department_name: 'Finance',
      locations: 'Austin, Texas, United States',
      country: 'United States',
      emp_type_name: 'Full Time',
      experience: '7 - 10 Years',
      posted_on: '15-Jul-2026',
      jd: '<p>Ignore non-India role.</p>',
    },
  ],
}

const loadDixonTechnologiesModule = async () => {
  try {
    return await import('../../scraper/dixontechnologies/script.js')
  } catch {
    assert.fail('Expected Dixon Technologies scraper module at ../../scraper/dixontechnologies/script.js')
  }
}

const replaceHomepageWorkWithUsUrl = (html, replacement) =>
  html.replace(/https:\/\/www\.dixoninfo\.com\/job-openings/g, replacement)

const replaceOfficialHandoffUrl = (html, replacement) =>
  html.replace(/https:\/\/dixon\.darwinbox\.in\/ms\/candidate\/careers/g, replacement)

test('Dixon Technologies scraper keeps the verified homepage and Darwinbox handoff explicit and fails closed on drift', async () => {
  const {
    COMPANY_NAME,
    DARWINBOX_COMPANY_ID,
    DARWINBOX_ORIGIN,
    HOMEPAGE_URL,
    OFFICIAL_CAREERS_HANDOFF_URL,
    OFFICIAL_CAREERS_URL,
    PUBLIC_PORTAL_URL,
    SOURCE,
    createDixonTechnologiesScraper,
    extractHomepageWorkWithUsUrl,
    extractOfficialDarwinboxUrl,
    hasOfficialDixonHomepageSignals,
    hasOfficialDixonJobOpeningsSignals,
  } = await loadDixonTechnologiesModule()

  assert.equal(COMPANY_NAME, 'Dixon Technologies')
  assert.equal(SOURCE, 'dixontechnologies')
  assert.equal(DARWINBOX_COMPANY_ID, 'main')
  assert.equal(DARWINBOX_ORIGIN, 'https://dixon.darwinbox.in')
  assert.equal(HOMEPAGE_URL, 'https://www.dixoninfo.com/')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://www.dixoninfo.com/job-openings')
  assert.equal(
    OFFICIAL_CAREERS_HANDOFF_URL,
    'https://dixon.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    PUBLIC_PORTAL_URL,
    'https://dixon.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(
    extractHomepageWorkWithUsUrl(homepageHtml),
    'https://www.dixoninfo.com/job-openings',
  )
  assert.equal(
    extractOfficialDarwinboxUrl(officialJobOpeningsHtml),
    OFFICIAL_CAREERS_HANDOFF_URL,
  )
  assert.equal(hasOfficialDixonHomepageSignals(homepageHtml), true)
  assert.equal(hasOfficialDixonJobOpeningsSignals(officialJobOpeningsHtml), true)
  assert.equal(
    hasOfficialDixonHomepageSignals(
      replaceHomepageWorkWithUsUrl(homepageHtml, 'https://example.com/job-openings'),
    ),
    false,
  )
  assert.equal(
    hasOfficialDixonJobOpeningsSignals(
      replaceOfficialHandoffUrl(
        officialJobOpeningsHtml,
        'https://example.com/ms/candidate/careers',
      ),
    ),
    false,
  )

  const scraper = createDixonTechnologiesScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) {
          return replaceHomepageWorkWithUsUrl(homepageHtml, 'https://example.com/job-openings')
        }

        return officialJobOpeningsHtml
      },
      fetchListingPage: async () => listingPayload,
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => {
        if (url === HOMEPAGE_URL) return homepageHtml
        if (url === OFFICIAL_CAREERS_URL) {
          return replaceOfficialHandoffUrl(
            officialJobOpeningsHtml,
            'https://example.com/ms/candidate/careers',
          )
        }

        throw new Error(`Unexpected Dixon Technologies URL: ${url}`)
      },
      fetchListingPage: async () => listingPayload,
    }),
    /verified official job openings page/i,
  )
})

test('run maps verified Dixon Technologies Darwinbox listings into Jobify jobs and keeps only India roles', async () => {
  const { createDixonTechnologiesScraper, HOMEPAGE_URL, OFFICIAL_CAREERS_URL } =
    await loadDixonTechnologiesModule()
  const scraper = createDixonTechnologiesScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const requestedUrls = []
  const requestedPages = []

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === OFFICIAL_CAREERS_URL) return officialJobOpeningsHtml

      throw new Error(`Unexpected Dixon Technologies URL: ${url}`)
    },
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)
      return listingPayload
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.dixoninfo.com/',
    'https://www.dixoninfo.com/job-openings',
  ])
  assert.deepEqual(requestedPages, [1])
  assert.deepEqual(jobs, [
    {
      title: 'Production Engineer',
      company: 'Dixon Technologies',
      department: 'Manufacturing',
      location: 'Noida, Uttar Pradesh, India',
      city: 'Noida',
      jobId: 'dixon-001',
      requisitionId: null,
      sourceUrl: 'https://dixon.darwinbox.in/ms/candidatev2/main/careers/jobDetails/dixon-001',
      applyUrl: 'https://dixon.darwinbox.in/ms/candidatev2/main/careers/jobDetails/dixon-001',
      employmentType: 'Full Time',
      experienceRequired: '2 - 4 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '15-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Support production planning and quality execution.</p>',
      source: 'dixontechnologies',
      link: 'https://dixon.darwinbox.in/ms/candidatev2/main/careers/jobDetails/dixon-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('run can recover when the verified Dixon first-party pages only fail due to an expired TLS certificate', async () => {
  const { createDixonTechnologiesScraper, HOMEPAGE_URL, OFFICIAL_CAREERS_URL } =
    await loadDixonTechnologiesModule()
  const scraper = createDixonTechnologiesScraper({
    now: () => FIXED_SCRAPED_AT,
  })
  const directUrls = []
  const insecureUrls = []

  const jobs = await scraper.run({
    fetchText: async (url) => {
      directUrls.push(url)
      if (url === HOMEPAGE_URL || url === OFFICIAL_CAREERS_URL) {
        const error = new Error('fetch failed | certificate has expired')
        error.code = 'CERT_HAS_EXPIRED'
        throw error
      }

      throw new Error(`Unexpected Dixon Technologies URL: ${url}`)
    },
    fetchInsecureText: async (url) => {
      insecureUrls.push(url)
      if (url === HOMEPAGE_URL) return homepageHtml
      if (url === OFFICIAL_CAREERS_URL) return officialJobOpeningsHtml

      throw new Error(`Unexpected insecure Dixon Technologies URL: ${url}`)
    },
    fetchListingPage: async () => listingPayload,
  })

  assert.deepEqual(directUrls, [
    'https://www.dixoninfo.com/',
    'https://www.dixoninfo.com/job-openings',
  ])
  assert.deepEqual(insecureUrls, [
    'https://www.dixoninfo.com/',
    'https://www.dixoninfo.com/job-openings',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Production Engineer')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})
