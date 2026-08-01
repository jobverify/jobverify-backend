import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Why Groupon</title>
  </head>
  <body>
    <main>
      <h1>Meaningful Work. Happy Teams. Great Deals.</h1>
      <p>We have a presence in Bangalore and Chennai.</p>
      <a href="https://job-boards.eu.greenhouse.io/groupon">Apply now and join the Groupon team!</a>
    </main>
  </body>
</html>
`

const VERIFIED_BOARD_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs at Groupon</title>
  </head>
  <body>
    <main>
      <a href="https://job-boards.eu.greenhouse.io/groupon/jobs/4924951101">(AI-First) Engineering Manager</a>
      <a href="https://job-boards.eu.greenhouse.io/groupon/jobs/4817345101">Business Development Manager</a>
    </main>
  </body>
</html>
`

const GREENHOUSE_PAYLOAD = {
  jobs: [
    {
      id: 4924951101,
      title: '(AI-First) Engineering Manager',
      location: { name: 'Prague' },
      absolute_url: 'https://job-boards.eu.greenhouse.io/groupon/jobs/4924951101',
      requisition_id: 'ENG-4924951101',
      company_name: 'Groupon',
      updated_at: '2026-07-10T11:25:21-04:00',
      content:
        '&lt;p&gt;Lead AI-first engineering efforts for Groupon IQ in a hybrid setup.&lt;/p&gt;&lt;p&gt;7+ years of engineering leadership experience.&lt;/p&gt;',
      departments: [{ name: 'Engineering' }],
    },
    {
      id: 4817345101,
      title: 'Business Development Manager',
      location: { name: 'Chicago (35 W. Wacker Dr.)' },
      absolute_url: 'https://job-boards.eu.greenhouse.io/groupon/jobs/4817345101',
      requisition_id: 'BD-4817345101',
      company_name: 'Groupon',
      updated_at: '2026-07-14T23:44:14-04:00',
      content:
        '&lt;p&gt;Drive strategic merchant relationships across Chicago.&lt;/p&gt;&lt;p&gt;5+ years of business development experience.&lt;/p&gt;',
      departments: [{ name: 'Sales' }],
    },
  ],
}

const loadModule = async () => {
  try {
    return await import('../../scraper/groupon/script.js')
  } catch {
    assert.fail('Expected Groupon scraper module at ../../scraper/groupon/script.js')
  }
}

test('Groupon helpers stay pinned to the verified first-party careers handoff and official Greenhouse board', async () => {
  const groupon = await loadModule()

  assert.equal(groupon.SOURCE, 'groupon')
  assert.equal(groupon.COMPANY, 'Groupon')
  assert.equal(groupon.OFFICIAL_BRAND_NAME, 'Groupon')
  assert.equal(groupon.VERIFIED_ON, '2026-07-17')
  assert.equal(groupon.CAREERS_URL, 'https://www.grouponcareers.com/')
  assert.equal(groupon.BOARD_URL, 'https://job-boards.eu.greenhouse.io/groupon')
  assert.equal(groupon.GREENHOUSE_JOB_BASE_URL, 'https://job-boards.eu.greenhouse.io/groupon/jobs')
  assert.equal(
    groupon.buildGreenhouseJobsApiUrl(),
    'https://boards-api.greenhouse.io/v1/boards/groupon/jobs?content=true',
  )
  assert.equal(groupon.hasOfficialCareersSignal(VERIFIED_CAREERS_HTML), true)
  assert.equal(
    groupon.hasOfficialCareersSignal('<html><body><h1>Careers</h1></body></html>'),
    false,
  )
  assert.equal(
    groupon.extractOfficialBoardUrl(VERIFIED_CAREERS_HTML),
    'https://job-boards.eu.greenhouse.io/groupon',
  )
  assert.deepEqual(groupon.extractVisibleJobUrls(VERIFIED_BOARD_HTML), [
    'https://job-boards.eu.greenhouse.io/groupon/jobs/4924951101',
    'https://job-boards.eu.greenhouse.io/groupon/jobs/4817345101',
  ])
  assert.equal(
    groupon.normalizeGreenhouseJobUrl(
      'https://job-boards.eu.greenhouse.io/groupon/jobs/4924951101?gh_jid=4924951101',
      4924951101,
    ),
    'https://job-boards.eu.greenhouse.io/groupon/jobs/4924951101',
  )

  const jobs = groupon.extractJobsFromGreenhousePayload(GREENHOUSE_PAYLOAD, {
    scrapedAt: FIXED_SCRAPED_AT,
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
      experienceRequired: job.experienceRequired,
    })),
    [
      {
        title: '(AI-First) Engineering Manager',
        location: 'Prague',
        city: 'Prague',
        country: null,
        link: 'https://job-boards.eu.greenhouse.io/groupon/jobs/4924951101',
        applyUrl: 'https://job-boards.eu.greenhouse.io/groupon/jobs/4924951101',
        department: 'Engineering',
        postingDate: '2026-07-10',
        experienceRequired: '7+ years',
      },
      {
        title: 'Business Development Manager',
        location: 'Chicago (35 W. Wacker Dr.)',
        city: 'Chicago',
        country: null,
        link: 'https://job-boards.eu.greenhouse.io/groupon/jobs/4817345101',
        applyUrl: 'https://job-boards.eu.greenhouse.io/groupon/jobs/4817345101',
        department: 'Sales',
        postingDate: '2026-07-14',
        experienceRequired: '5+ years',
      },
    ],
  )
  assert.equal(jobs[0].source, 'groupon')
  assert.match(jobs[0].jobDescription, /Groupon IQ in a hybrid setup/i)
  assert.match(jobs[1].jobDescription, /merchant relationships across Chicago/i)
})

test('Groupon run validates the verified first-party careers page and board before fetching the Greenhouse jobs API', async () => {
  const groupon = await loadModule()
  const requested = []

  const jobs = await groupon.createGrouponScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requested.push({ type: 'text', url })
      if (url === groupon.CAREERS_URL) return VERIFIED_CAREERS_HTML
      if (url === groupon.BOARD_URL) return VERIFIED_BOARD_HTML
      throw new Error(`Unexpected Groupon text fixture URL: ${url}`)
    },
    fetchJson: async (url, options = {}) => {
      requested.push({ type: 'json', url, options })
      return GREENHOUSE_PAYLOAD
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.deepEqual(
    requested.map((request) => [request.type, request.url]),
    [
      ['text', groupon.CAREERS_URL],
      ['text', groupon.BOARD_URL],
      ['json', 'https://boards-api.greenhouse.io/v1/boards/groupon/jobs?content=true'],
    ],
  )
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'groupon')
  assert.equal(jobs[0].company, 'Groupon')
  assert.equal(jobs[0].link, 'https://job-boards.eu.greenhouse.io/groupon/jobs/4924951101')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('Groupon fails closed when the verified careers page or Greenhouse board links drift materially', async () => {
  const groupon = await loadModule()

  await assert.rejects(
    groupon.createGrouponScraper().run({
      fetchText: async () => VERIFIED_CAREERS_HTML.replace('Why Groupon', 'Join Groupon'),
      fetchJson: async () => GREENHOUSE_PAYLOAD,
    }),
    /verified Groupon careers page/i,
  )

  await assert.rejects(
    groupon.createGrouponScraper().run({
      fetchText: async (url) => {
        if (url === groupon.CAREERS_URL) return VERIFIED_CAREERS_HTML
        if (url === groupon.BOARD_URL) return '<html><head><title>Jobs at Groupon</title></head><body></body></html>'
        throw new Error(`Unexpected Groupon text fixture URL: ${url}`)
      },
      fetchJson: async () => GREENHOUSE_PAYLOAD,
    }),
    /visible Groupon Greenhouse job links/i,
  )

  await assert.rejects(
    groupon.createGrouponScraper().run({
      fetchText: async (url) => {
        if (url === groupon.CAREERS_URL) return VERIFIED_CAREERS_HTML
        if (url === groupon.BOARD_URL) return VERIFIED_BOARD_HTML
        throw new Error(`Unexpected Groupon text fixture URL: ${url}`)
      },
      fetchJson: async () => ({
        jobs: [
          {
            ...GREENHOUSE_PAYLOAD.jobs[0],
            absolute_url: 'https://job-boards.eu.greenhouse.io/other-company/jobs/4924951101',
          },
        ],
      }),
    }),
    /verified Groupon Greenhouse board links/i,
  )
})
