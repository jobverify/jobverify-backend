import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_JOB_OPENINGS = [
  {
    job_id: 'a6a560cbbba247',
    location: ['Noida, Delhi, Delhi, India (SB_NCR)'],
    location_city: ['Delhi'],
    location_country: 'India',
    job_title: 'Associate',
    employee_type: 'Full Time',
    experience_from: 0,
    experience_to: 2,
    post_on_careers_page: 1,
  },
  {
    job_id: 'a69e5d49b8a0ef',
    location: ['Bangalore, Bangalore, Karnataka, India (SB_CO)'],
    location_city: ['Bangalore'],
    location_country: 'India',
    job_title: 'Software Development Engineer in Test',
    employee_type: 'Full Time',
    experience_from: 3,
    experience_to: 5,
    post_on_careers_page: 1,
  },
  {
    job_id: 'a6a13d4b05c2eb',
    location: ['Pune, Pune, Maharashtra, India (SB_PUNE)'],
    location_city: ['Pune'],
    location_country: 'India',
    job_title: 'Senior Relationship Manager',
    employee_type: 'Full Time',
    experience_from: 4,
    experience_to: 7,
    post_on_careers_page: 1,
  },
  {
    job_id: 'sg-004',
    location: ['Singapore'],
    location_city: ['Singapore'],
    location_country: 'Singapore',
    job_title: 'International Wealth Specialist',
    employee_type: 'Full Time',
    experience_from: 5,
    experience_to: 8,
    post_on_careers_page: 1,
  },
  {
    job_id: 'hidden-005',
    location: ['Bangalore, Bangalore, Karnataka, India (SB_CO)'],
    location_city: ['Bangalore'],
    location_country: 'India',
    job_title: 'Hidden Internal Role',
    employee_type: 'Full Time',
    experience_from: 1,
    experience_to: 3,
    post_on_careers_page: 0,
  },
]

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Scripbox</title>
    <link href="https://scripbox.com/pages/careers" rel="canonical" />
  </head>
  <body>
    <main>
      <h1>Join us in helping make every Indian financially secure</h1>
      <section>
        <h2>Job Openings</h2>
        <a href="https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a560cbbba247?from=all">Associate</a>
        <a href="https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69e5d49b8a0ef?from=all">Software Development Engineer in Test</a>
        <a href="https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a13d4b05c2eb?from=all">Senior Relationship Manager</a>
      </section>
      <section>
        <h2>Get In Touch</h2>
        <p>For queries regarding job openings, email us at our recruiting desk.</p>
      </section>
    </main>
    <script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      page: '/pages/careers',
      props: {
        pageProps: {
          jobOpenings: VERIFIED_JOB_OPENINGS,
        },
      },
    })}</script>
  </body>
</html>
`

const DRIFTED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Unexpected</title>
  </head>
  <body>
    <main><p>No verified jobs surface.</p></main>
  </body>
</html>
`

const INVALID_DETAIL_LINKS_HTML = VERIFIED_CAREERS_HTML.replace(
  'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69e5d49b8a0ef?from=all',
  'https://example.com/jobs/a69e5d49b8a0ef',
)

const loadScripboxModule = async () => {
  try {
    return await import('../scripbox/script.js')
  } catch {
    assert.fail('Expected Scripbox scraper module at ../scripbox/script.js')
  }
}

test('Scripbox helpers pin the verified first-party careers page and extract India openings from embedded next data', async () => {
  const scripbox = await loadScripboxModule()

  assert.equal(scripbox.SOURCE, 'scripbox')
  assert.equal(scripbox.COMPANY, 'Scripbox')
  assert.equal(scripbox.HOMEPAGE_URL, 'https://scripbox.com/')
  assert.equal(scripbox.CAREERS_URL, 'https://scripbox.com/pages/careers')
  assert.equal(scripbox.PUBLIC_BOARD_URL, 'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/allJobs')
  assert.equal(
    scripbox.VERIFIED_SAMPLE_JOB_URL,
    'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69e5d49b8a0ef?from=all',
  )
  assert.equal(scripbox.VERIFIED_ON, '2026-07-19')
  assert.equal(scripbox.hasVerifiedCareersPageSignal(VERIFIED_CAREERS_HTML), true)
  assert.deepEqual(
    scripbox.extractEmbeddedJobOpenings(VERIFIED_CAREERS_HTML).map((job) => job.job_id),
    ['a6a560cbbba247', 'a69e5d49b8a0ef', 'a6a13d4b05c2eb', 'sg-004', 'hidden-005'],
  )

  const jobs = scripbox.extractIndiaJobsFromCareersPage(VERIFIED_CAREERS_HTML, {
    scrapedAt: '2026-07-17T00:00:00.000Z',
  })

  assert.deepEqual(jobs, [
    {
      title: 'Associate',
      company: 'Scripbox',
      location: 'Delhi, India',
      city: 'Delhi',
      country: 'India',
      employmentType: 'Full Time',
      experienceRequired: '0-2 years',
      jobId: 'a6a560cbbba247',
      requisitionId: 'a6a560cbbba247',
      sourceUrl: 'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a560cbbba247?from=all',
      applyUrl: 'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a560cbbba247?from=all',
      link: 'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a560cbbba247?from=all',
      source: 'scripbox',
      scrapedAt: '2026-07-17T00:00:00.000Z',
    },
    {
      title: 'Software Development Engineer in Test',
      company: 'Scripbox',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      employmentType: 'Full Time',
      experienceRequired: '3-5 years',
      jobId: 'a69e5d49b8a0ef',
      requisitionId: 'a69e5d49b8a0ef',
      sourceUrl: 'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69e5d49b8a0ef?from=all',
      applyUrl: 'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69e5d49b8a0ef?from=all',
      link: 'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a69e5d49b8a0ef?from=all',
      source: 'scripbox',
      scrapedAt: '2026-07-17T00:00:00.000Z',
    },
    {
      title: 'Senior Relationship Manager',
      company: 'Scripbox',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      employmentType: 'Full Time',
      experienceRequired: '4-7 years',
      jobId: 'a6a13d4b05c2eb',
      requisitionId: 'a6a13d4b05c2eb',
      sourceUrl: 'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a13d4b05c2eb?from=all',
      applyUrl: 'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a13d4b05c2eb?from=all',
      link: 'https://scripbox.darwinbox.in/ms/candidatev2/main/careers/jobDetails/a6a13d4b05c2eb?from=all',
      source: 'scripbox',
      scrapedAt: '2026-07-17T00:00:00.000Z',
    },
  ])
})

test('Scripbox run validates the verified careers page before returning India roles', async () => {
  const scripbox = await loadScripboxModule()
  const requestedUrls = []

  const jobs = await scripbox.createScripboxScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === scripbox.CAREERS_URL) return VERIFIED_CAREERS_HTML
      throw new Error(`Unexpected Scripbox fixture URL: ${url}`)
    },
    now: () => '2026-07-17T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [scripbox.CAREERS_URL])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].title, 'Associate')
  assert.equal(jobs[0].source, 'scripbox')
})

test('Scripbox fails closed when the verified careers shell drifts or the public detail links stop matching the Darwinbox handoff', async () => {
  const scripbox = await loadScripboxModule()

  await assert.rejects(
    scripbox.createScripboxScraper().run({
      fetchText: async () => DRIFTED_CAREERS_HTML,
    }),
    /verified first-party careers page/i,
  )

  await assert.rejects(
    scripbox.createScripboxScraper().run({
      fetchText: async () => INVALID_DETAIL_LINKS_HTML,
    }),
    /darwinbox detail links/i,
  )
})
