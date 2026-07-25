import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Figma</title>
    <meta
      name="description"
      content="Our vision is to make design accessible to all. We focus on building our software with care and craftsmanship, and we welcome talented people from all backgrounds. Come join us!"
    />
    <link rel="canonical" href="https://www.figma.com/careers/" />
  </head>
  <body>
    <main>
      <h1>Careers at Figma</h1>
      <p>
        Our vision is to make design accessible to all. We focus on building our software with
        care and craftsmanship, and we welcome talented people from all backgrounds. Come join us!
      </p>
      <a href="https://www.figma.com/careers/#job-openings">Job openings</a>
      <a href="https://boards.greenhouse.io/figma/jobs/5579204004?gh_jid=5579204004">
        Account Executive, Enterprise (Bengaluru, India)
      </a>
      <a href="https://boards.greenhouse.io/figma/jobs/5615966004?gh_jid=5615966004">
        Enterprise Solutions Consultant (Bengaluru, India)
      </a>
      <a href="https://boards.greenhouse.io/figma/jobs/6013495004?gh_jid=6013495004">
        Marketing Engineer
      </a>
    </main>
  </body>
</html>
`

const greenhousePayload = {
  jobs: [
    {
      id: 5579204004,
      title: 'Account Executive, Enterprise (Bengaluru, India)',
      location: { name: 'Bengaluru, India' },
      absolute_url: 'https://boards.greenhouse.io/figma/jobs/5579204004?gh_jid=5579204004',
      requisition_id: '1759',
      company_name: 'Figma',
      updated_at: '2026-04-15T15:32:40-04:00',
      content:
        '&lt;p&gt;This is a full time role in our Bengaluru office within a hybrid environment.&lt;/p&gt;&lt;p&gt;3+ years of enterprise sales experience.&lt;/p&gt;',
      departments: [{ name: 'Sales' }],
      offices: [{ name: 'Bengaluru', location: 'Bengaluru, India' }],
    },
    {
      id: 6013495004,
      title: 'Marketing Engineer',
      location: { name: 'San Francisco, CA • New York, NY • United States' },
      absolute_url: 'https://boards.greenhouse.io/figma/jobs/6013495004?gh_jid=6013495004',
      requisition_id: '2344',
      company_name: 'Figma',
      updated_at: '2026-06-08T17:51:11-04:00',
      content:
        '&lt;p&gt;This is a full time role that can be held from one of our US hubs or remotely in the United States.&lt;/p&gt;&lt;p&gt;5+ years of experience building systems for go-to-market teams.&lt;/p&gt;&lt;p&gt;#LI-Remote&lt;/p&gt;',
      departments: [{ name: 'Marketing' }],
      offices: [{ name: 'US', location: 'United States' }],
    },
  ],
}

const loadFigmaModule = async () => {
  try {
    return await import('../figma/script.js')
  } catch {
    assert.fail('Expected Figma scraper module at ../figma/script.js')
  }
}

test('Figma helpers stay pinned to the verified first-party careers page and Greenhouse jobs API contract', async () => {
  const figma = await loadFigmaModule()

  assert.equal(figma.SOURCE, 'figma')
  assert.equal(figma.COMPANY, 'Figma')
  assert.equal(figma.VERIFIED_ON, '2026-07-15')
  assert.equal(figma.CAREERS_URL, 'https://www.figma.com/careers/')
  assert.equal(figma.GREENHOUSE_JOB_BASE_URL, 'https://boards.greenhouse.io/figma/jobs')
  assert.equal(
    figma.buildGreenhouseJobsApiUrl(),
    'https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true',
  )
  assert.equal(figma.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.deepEqual(figma.extractGreenhouseJobUrls(officialCareersHtml), [
    'https://boards.greenhouse.io/figma/jobs/5579204004?gh_jid=5579204004',
    'https://boards.greenhouse.io/figma/jobs/5615966004?gh_jid=5615966004',
    'https://boards.greenhouse.io/figma/jobs/6013495004?gh_jid=6013495004',
  ])
  assert.equal(
    figma.normalizeGreenhouseJobUrl('https://boards.greenhouse.io/figma/jobs/5579204004', 5579204004),
    'https://boards.greenhouse.io/figma/jobs/5579204004?gh_jid=5579204004',
  )
})

test('Figma extracts jobs from the verified Greenhouse payload and preserves the public Greenhouse detail URLs', async () => {
  const figma = await loadFigmaModule()

  const jobs = figma.extractJobsFromGreenhousePayload(greenhousePayload, {
    scrapedAt: '2026-07-15T00:00:00.000Z',
  })

  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      city: job.city,
      country: job.country,
      link: job.link,
      applyUrl: job.applyUrl,
      department: job.department,
      postingDate: job.postingDate,
      remoteStatus: job.remoteStatus,
      experienceRequired: job.experienceRequired,
    })),
    [
      {
        title: 'Account Executive, Enterprise (Bengaluru, India)',
        location: 'Bengaluru, India',
        city: 'Bengaluru',
        country: 'India',
        link: 'https://boards.greenhouse.io/figma/jobs/5579204004?gh_jid=5579204004',
        applyUrl: 'https://boards.greenhouse.io/figma/jobs/5579204004?gh_jid=5579204004',
        department: 'Sales',
        postingDate: '2026-04-15',
        remoteStatus: 'Hybrid',
        experienceRequired: '3+ years',
      },
      {
        title: 'Marketing Engineer',
        location: 'San Francisco, CA • New York, NY • United States',
        city: 'San Francisco',
        country: 'United States',
        link: 'https://boards.greenhouse.io/figma/jobs/6013495004?gh_jid=6013495004',
        applyUrl: 'https://boards.greenhouse.io/figma/jobs/6013495004?gh_jid=6013495004',
        department: 'Marketing',
        postingDate: '2026-06-08',
        remoteStatus: 'Remote',
        experienceRequired: '5+ years',
      },
    ],
  )
  assert.equal(jobs[0].source, 'figma')
  assert.match(jobs[0].jobDescription, /Bengaluru office within a hybrid environment/i)
  assert.match(jobs[1].jobDescription, /held from one of our US hubs or remotely/i)
})

test('Figma run validates the verified first-party careers page before fetching the Greenhouse jobs API', async () => {
  const figma = await loadFigmaModule()
  const requested = []

  const jobs = await figma.createFigmaScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requested.push({ type: 'text', url })
      if (url === figma.CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected Figma fixture URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requested.push({ type: 'json', url, options })
      return greenhousePayload
    },
    now: () => '2026-07-15T00:00:00.000Z',
  })

  assert.deepEqual(requested, [
    { type: 'text', url: figma.CAREERS_URL },
    {
      type: 'json',
      url: 'https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true',
      options: { method: 'GET' },
    },
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'figma')
  assert.equal(
    jobs[0].link,
    'https://boards.greenhouse.io/figma/jobs/5579204004?gh_jid=5579204004',
  )
})

test('Figma run fails closed when the verified careers page or Greenhouse detail route drift materially', async () => {
  const figma = await loadFigmaModule()

  await assert.rejects(
    figma.createFigmaScraper().run({
      fetchText: async () => officialCareersHtml.replace('Careers at Figma', 'Join Figma'),
      fetchJson: async () => greenhousePayload,
    }),
    /verified Figma careers page/i,
  )

  await assert.rejects(
    figma.createFigmaScraper().run({
      fetchText: async () =>
        officialCareersHtml.replace(
          'https://boards.greenhouse.io/figma/jobs/5579204004?gh_jid=5579204004',
          'https://boards.greenhouse.io/other-company/jobs/5579204004?gh_jid=5579204004',
        ),
      fetchJson: async () => greenhousePayload,
    }),
    /verified public Greenhouse job links/i,
  )

  await assert.rejects(
    figma.createFigmaScraper().run({
      fetchText: async () => officialCareersHtml,
      fetchJson: async () => ({
        jobs: [
          {
            ...greenhousePayload.jobs[0],
            absolute_url: 'https://boards.greenhouse.io/other-company/jobs/5579204004?gh_jid=5579204004',
          },
        ],
      }),
    }),
    /verified public Greenhouse detail URLs/i,
  )
})
