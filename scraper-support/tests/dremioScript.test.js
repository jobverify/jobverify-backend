import assert from 'node:assert/strict'
import test from 'node:test'

const careersLandingHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join the Dremio Team | Career Opportunities | Dremio</title>
  </head>
  <body>
    <h1>Careers</h1>
    <p>The next wave of data analytics is here.</p>
    <a href="/careers/job-postings/">Search Jobs</a>
    <a href="/careers/job-postings/">Open Roles</a>
  </body>
</html>
`

const jobPostingsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Postings | Career Opportunities | Dremio</title>
    <script src="https://boards.greenhouse.io/embed/job_board/js?for=dremio"></script>
  </head>
  <body>
    <h1>Job Postings</h1>
    <a href="/careers/job-postings/?gh_jid=7578193003">Commercial Account Executive - East</a>
    <a href="/careers/job-postings/?gh_jid=6314003003">Future Opportunities</a>
    <p>Open Roles</p>
  </body>
</html>
`

const greenhousePayload = {
  jobs: [
    {
      absolute_url: 'https://www.dremio.com/careers/job-postings/?gh_jid=7578193003',
      id: 7578193003,
      requisition_id: '1048',
      title: 'Commercial Account Executive - East',
      company_name: 'Dremio',
      updated_at: '2026-03-27T04:49:45-04:00',
      first_published: '2026-01-12T04:23:16-05:00',
      application_deadline: null,
      location: {
        name: 'New York, New York, United States',
      },
      departments: [
        {
          name: 'Sales',
        },
      ],
      offices: [
        {
          name: 'New York, New York',
          location: 'New York, New York, United States',
        },
      ],
      content:
        '&lt;p&gt;Build Dremio pipeline coverage across the East.&lt;/p&gt;&lt;p&gt;3-5 years of experience in pipeline-driven SaaS sales roles.&lt;/p&gt;&lt;p&gt;#LI-remote&lt;/p&gt;',
    },
    {
      absolute_url: 'https://www.dremio.com/careers/job-postings/?gh_jid=6314003003',
      id: 6314003003,
      requisition_id: '902',
      title: 'Future Opportunities',
      company_name: 'Dremio',
      updated_at: '2026-05-02T10:30:00-04:00',
      first_published: '2025-11-10T09:00:00-05:00',
      application_deadline: null,
      location: {
        name: 'Remote',
      },
      departments: [
        {
          name: 'General & Administrative',
        },
      ],
      offices: [],
      content:
        '&lt;p&gt;Join the Dremio talent network for future openings.&lt;/p&gt;&lt;p&gt;7+ years of experience building high-growth teams.&lt;/p&gt;',
    },
  ],
}

const loadDremioModule = async () => {
  try {
    return await import('../../scraper/dremio/script.js')
  } catch {
    assert.fail('Expected Dremio scraper module at ../../scraper/dremio/script.js')
  }
}

test('Dremio scraper helpers stay pinned to the verified first-party careers pages and Greenhouse jobs API contract', async () => {
  const dremio = await loadDremioModule()

  assert.equal(dremio.SOURCE, 'dremio')
  assert.equal(dremio.COMPANY, 'Dremio')
  assert.equal(dremio.CAREERS_LANDING_URL, 'https://www.dremio.com/careers/')
  assert.equal(dremio.JOB_POSTINGS_URL, 'https://www.dremio.com/careers/job-postings/')
  assert.equal(
    dremio.GREENHOUSE_EMBED_SCRIPT_URL,
    'https://boards.greenhouse.io/embed/job_board/js?for=dremio',
  )
  assert.equal(
    dremio.buildGreenhouseJobsApiUrl(),
    'https://boards-api.greenhouse.io/v1/boards/dremio/jobs?content=true',
  )
  assert.equal(dremio.hasOfficialCareersLandingSignal(careersLandingHtml), true)
  assert.equal(dremio.hasOfficialJobPostingsSignal(jobPostingsHtml), true)

  const jobs = dremio.extractJobsFromGreenhousePayload(greenhousePayload, {
    scrapedAt: '2026-07-15T00:00:00.000Z',
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      city: job.city,
      country: job.country,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      link: job.link,
      department: job.department,
      remoteStatus: job.remoteStatus,
      experienceRequired: job.experienceRequired,
    })),
    [
      {
        title: 'Commercial Account Executive - East',
        location: 'New York, New York, United States',
        city: 'New York',
        country: 'United States',
        sourceUrl: 'https://www.dremio.com/careers/job-postings/?gh_jid=7578193003',
        applyUrl: 'https://www.dremio.com/careers/job-postings/?gh_jid=7578193003',
        link: 'https://www.dremio.com/careers/job-postings/?gh_jid=7578193003',
        department: 'Sales',
        remoteStatus: 'Remote',
        experienceRequired: '3-5 years',
      },
      {
        title: 'Future Opportunities',
        location: 'Remote',
        city: null,
        country: null,
        sourceUrl: 'https://www.dremio.com/careers/job-postings/?gh_jid=6314003003',
        applyUrl: 'https://www.dremio.com/careers/job-postings/?gh_jid=6314003003',
        link: 'https://www.dremio.com/careers/job-postings/?gh_jid=6314003003',
        department: 'General & Administrative',
        remoteStatus: 'Remote',
        experienceRequired: '7+ years',
      },
    ],
  )
  assert.match(jobs[0].jobDescription, /pipeline coverage across the East/i)
})

test('Dremio run verifies the official careers pages before fetching the Greenhouse jobs API', async () => {
  const dremio = await loadDremioModule()
  const requested = []

  const jobs = await dremio.createDremioScraper().run({
    fetchText: async (url) => {
      requested.push({ type: 'text', url })
      if (url === dremio.CAREERS_LANDING_URL) return careersLandingHtml
      if (url === dremio.JOB_POSTINGS_URL) return jobPostingsHtml
      throw new Error(`Unexpected Dremio fixture URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requested.push({ type: 'json', url, options })
      return greenhousePayload
    },
    now: () => '2026-07-15T00:00:00.000Z',
  })

  assert.deepEqual(requested, [
    { type: 'text', url: 'https://www.dremio.com/careers/' },
    { type: 'text', url: 'https://www.dremio.com/careers/job-postings/' },
    {
      type: 'json',
      url: 'https://boards-api.greenhouse.io/v1/boards/dremio/jobs?content=true',
      options: { method: 'GET' },
    },
  ])

  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'dremio')
  assert.equal(jobs[0].company, 'Dremio')
  assert.equal(
    jobs[0].link,
    'https://www.dremio.com/careers/job-postings/?gh_jid=7578193003',
  )
})

test('Dremio fails closed when the verified careers pages or Greenhouse payload drift materially', async () => {
  const dremio = await loadDremioModule()

  await assert.rejects(
    dremio.createDremioScraper().run({
      fetchText: async (url) => {
        if (url === dremio.CAREERS_LANDING_URL) {
          return careersLandingHtml.replace('Search Jobs', 'Browse Roles')
        }
        throw new Error(`Unexpected Dremio fixture URL: ${url}`)
      },
      fetchJson: async () => greenhousePayload,
    }),
    /verified Dremio careers landing page/i,
  )

  await assert.rejects(
    dremio.createDremioScraper().run({
      fetchText: async (url) => {
        if (url === dremio.CAREERS_LANDING_URL) return careersLandingHtml
        if (url === dremio.JOB_POSTINGS_URL) {
          return jobPostingsHtml.replace(
            'https://boards.greenhouse.io/embed/job_board/js?for=dremio',
            'https://boards.greenhouse.io/embed/job_board/js?for=dremio-old',
          )
        }
        throw new Error(`Unexpected Dremio fixture URL: ${url}`)
      },
      fetchJson: async () => greenhousePayload,
    }),
    /verified Dremio job postings page/i,
  )

  await assert.rejects(
    dremio.createDremioScraper().run({
      fetchText: async (url) => {
        if (url === dremio.CAREERS_LANDING_URL) return careersLandingHtml
        if (url === dremio.JOB_POSTINGS_URL) return jobPostingsHtml
        throw new Error(`Unexpected Dremio fixture URL: ${url}`)
      },
      fetchJson: async () => ({ jobs: null }),
    }),
    /Greenhouse jobs payload/i,
  )
})
