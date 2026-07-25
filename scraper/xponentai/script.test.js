import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>xponent.ai</title>
  </head>
  <body>
    <main>
      <h1>xponent.ai</h1>
      <p>AI-led product engineering for modern enterprises.</p>
      <a href="https://xponent.ai/career/">Careers</a>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career | xponent.ai</title>
  </head>
  <body>
    <main>
      <h1>Career</h1>
      <p>Join a team building AI-first products.</p>
      <section class="wp-job-openings">
        <h2>Current Openings</h2>
      </section>
      <div class="awsm-job-listings awsm-lists"></div>
    </main>
  </body>
</html>
`

const listings = [
  {
    id: 101,
    link: 'https://xponent.ai/jobs/ai-engineer/',
    title: { rendered: 'AI Engineer' },
    content: {
      rendered: `
        <p>Build production AI systems.</p>
        <ul>
          <li>Python</li>
          <li>LLM Ops</li>
        </ul>
      `,
    },
    class_list: [
      'post-101',
      'awsm_job_openings',
      'type-awsm_job_openings',
      'status-publish',
      'job-location-bengaluru',
      'job-type-full-time',
      'job-category-engineering',
      'job-mode-hybrid',
    ],
  },
  {
    id: 102,
    link: 'https://xponent.ai/jobs/genai-architect/',
    title: { rendered: 'GenAI Architect' },
    content: {
      rendered: `
        <p>Design enterprise GenAI platforms.</p>
        <ul>
          <li>Solution Architecture</li>
        </ul>
      `,
    },
    class_list: [
      'post-102',
      'awsm_job_openings',
      'type-awsm_job_openings',
      'status-publish',
      'job-location-remote',
      'job-type-contract',
      'job-category-architecture',
      'job-mode-remote',
    ],
  },
]

test('xponent.ai validates the verified homepage and careers surfaces and maps the first-party AWSM feed into public jobs', async () => {
  const xponent = await loadModule()
  assert.ok(xponent, 'xponent.ai scraper module should load')

  assert.equal(xponent.SOURCE, 'xponentai')
  assert.equal(xponent.COMPANY, 'xponent.ai')
  assert.equal(xponent.HOMEPAGE_URL, 'https://xponent.ai/')
  assert.equal(xponent.CAREERS_URL, 'https://xponent.ai/career/')
  assert.equal(xponent.CAREERS_API_URL, 'https://xponent.ai/wp-json/wp/v2/awsm_job_openings')
  assert.equal(xponent.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(xponent.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(
    xponent.buildSearchUrl(1),
    'https://xponent.ai/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=100&page=1',
  )

  const jobs = xponent.extractSearchResults(listings)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'AI Engineer',
    company: 'xponent.ai',
    department: 'Engineering',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: '101',
    requisitionId: '101',
    sourceUrl: 'https://xponent.ai/jobs/ai-engineer/',
    applyUrl: 'https://xponent.ai/jobs/ai-engineer/',
    employmentType: 'Full Time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Python',
      'LLM Ops',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Build production AI systems. Python LLM Ops',
    remoteStatus: 'Hybrid',
  })
  assert.deepEqual(jobs[1], {
    title: 'GenAI Architect',
    company: 'xponent.ai',
    department: 'Architecture',
    location: 'Remote',
    city: null,
    country: null,
    jobId: '102',
    requisitionId: '102',
    sourceUrl: 'https://xponent.ai/jobs/genai-architect/',
    applyUrl: 'https://xponent.ai/jobs/genai-architect/',
    employmentType: 'Contract',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Solution Architecture',
    ],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Design enterprise GenAI platforms. Solution Architecture',
    remoteStatus: 'Remote',
  })
})

test('xponent.ai run validates the official first-party surfaces, paginates the AWSM feed, and decorates runner fields', async () => {
  const xponent = await loadModule()
  assert.ok(xponent, 'xponent.ai scraper module should load')

  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await xponent.createXponentAiScraper({ pageSize: 2 }).run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === xponent.HOMEPAGE_URL) return homepageHtml
      if (url === xponent.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected HTML URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      if (url === xponent.buildSearchUrl(1, 2)) return listings
      if (url === xponent.buildSearchUrl(2, 2)) return []
      throw new Error(`Unexpected JSON URL: ${url}`)
    },
    now: () => '2026-07-12T09:00:00.000Z',
  })

  assert.deepEqual(requestedTextUrls, [
    'https://xponent.ai/',
    'https://xponent.ai/career/',
  ])
  assert.deepEqual(requestedJsonUrls, [
    'https://xponent.ai/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=2&page=1',
    'https://xponent.ai/wp-json/wp/v2/awsm_job_openings?_fields=id%2Clink%2Ctitle%2Ccontent%2Cclass_list&per_page=2&page=2',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'xponentai')
  assert.equal(jobs[0].link, 'https://xponent.ai/jobs/ai-engineer/')
  assert.equal(jobs[0].scrapedAt, '2026-07-12T09:00:00.000Z')
})

test('xponent.ai fails closed when the homepage, careers page, or AWSM feed changes materially', async () => {
  const xponent = await loadModule()
  assert.ok(xponent, 'xponent.ai scraper module should load')

  await assert.rejects(
    xponent.createXponentAiScraper().run({
      fetchText: async (url) => {
        if (url === xponent.HOMEPAGE_URL) return '<html><body><h1>Placeholder</h1></body></html>'
        throw new Error(`Unexpected HTML URL: ${url}`)
      },
      fetchJson: async () => [],
    }),
    /homepage/i,
  )

  await assert.rejects(
    xponent.createXponentAiScraper().run({
      fetchText: async (url) => {
        if (url === xponent.HOMEPAGE_URL) return homepageHtml
        if (url === xponent.CAREERS_URL) return '<html><body><h1>Careers</h1></body></html>'
        throw new Error(`Unexpected HTML URL: ${url}`)
      },
      fetchJson: async () => [],
    }),
    /careers page/i,
  )

  await assert.rejects(
    xponent.createXponentAiScraper().run({
      fetchText: async (url) => {
        if (url === xponent.HOMEPAGE_URL) return homepageHtml
        if (url === xponent.CAREERS_URL) return careersHtml
        throw new Error(`Unexpected HTML URL: ${url}`)
      },
      fetchJson: async () => ({ total: 0 }),
    }),
    /wp job openings feed/i,
  )
})
