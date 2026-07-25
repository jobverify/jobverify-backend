import assert from 'node:assert/strict'
import test from 'node:test'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers — Netomi</title>
  </head>
  <body>
    <main>
      <p>Careers at Netomi</p>
      <h1>Join the team</h1>
      <a href="#roles">View open roles</a>
      <section id="roles">
        <h2>Open roles</h2>
      </section>
    </main>
    <script>
      fetch('https://api.lever.co/v0/postings/netomi?mode=json')
    </script>
  </body>
</html>
`

const sampleLeverJobs = [
  {
    id: '8fa09624-2464-4e19-a56d-2c38323ce49d',
    text: 'Agentic AI Forward Deployment Engineering Lead',
    hostedUrl: 'https://jobs.lever.co/netomi/8fa09624-2464-4e19-a56d-2c38323ce49d',
    applyUrl: 'https://jobs.lever.co/netomi/8fa09624-2464-4e19-a56d-2c38323ce49d/apply',
    createdAt: 1_781_953_756_907,
    categories: {
      location: 'Toronto , Canada',
      team: 'Agentic Delivery',
      department: 'Global Services & Delivery',
      commitment: 'Full-time',
      allLocations: ['Toronto , Canada'],
    },
    country: 'CA',
    workplaceType: 'remote',
    descriptionBodyPlain:
      'About the Role As an Agentic AI Forward Deployment Engineering Lead at Netomi, you will lead enterprise deployments.',
  },
  {
    id: 'ba379f47-091b-4f2d-82d3-e97a0821227e',
    text: 'Agentic Engineer',
    hostedUrl: 'https://jobs.lever.co/netomi/ba379f47-091b-4f2d-82d3-e97a0821227e',
    applyUrl: 'https://jobs.lever.co/netomi/ba379f47-091b-4f2d-82d3-e97a0821227e/apply',
    createdAt: 1_781_165_190_864,
    categories: {
      location: 'Remote - India',
      team: 'Agentic Delivery',
      department: 'Global Services & Delivery',
      commitment: 'Full Time - Remote',
      allLocations: ['Remote - India'],
    },
    country: 'IN',
    workplaceType: 'remote',
    descriptionPlain:
      'About the role We are looking for an Agentic Engineer to build and scale agentic workflows and tools.',
  },
]

const loadNetomiModule = async () => {
  try {
    return await import('../netomi/script.js')
  } catch {
    assert.fail('Expected Netomi scraper module at ../netomi/script.js')
  }
}

test('Netomi scraper pins the verified first-party careers page and embedded Lever API reference', async () => {
  const netomi = await loadNetomiModule()

  assert.equal(netomi.SOURCE, 'netomi')
  assert.equal(netomi.COMPANY, 'Netomi')
  assert.equal(netomi.OFFICIAL_BRAND_NAME, 'Netomi')
  assert.equal(netomi.HOMEPAGE_URL, 'https://www.netomi.com/')
  assert.equal(netomi.CAREERS_URL, 'https://www.netomi.com/careers')
  assert.equal(netomi.LEVER_BOARD_URL, 'https://jobs.lever.co/netomi')
  assert.equal(netomi.LEVER_API_URL, 'https://api.lever.co/v0/postings/netomi?mode=json')
  assert.equal(netomi.COMPANY_DOMAIN, 'netomi.com')
  assert.equal(netomi.VERIFIED_ON, '2026-07-16')
  assert.equal(netomi.hasOfficialNetomiCareersSignal(officialCareersHtml), true)
  assert.equal(
    netomi.extractLeverApiUrl(officialCareersHtml),
    'https://api.lever.co/v0/postings/netomi?mode=json',
  )
})

test('Netomi extracts the live Lever payload shape into shared scraper job fields without an India-only filter', async () => {
  const netomi = await loadNetomiModule()
  const jobs = netomi.extractLeverJobs(sampleLeverJobs)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Agentic AI Forward Deployment Engineering Lead',
    company: 'Netomi',
    department: 'Agentic Delivery',
    location: 'Toronto, Canada',
    city: 'Toronto',
    country: 'Canada',
    jobId: '8fa09624-2464-4e19-a56d-2c38323ce49d',
    requisitionId: '8fa09624-2464-4e19-a56d-2c38323ce49d',
    sourceUrl: 'https://jobs.lever.co/netomi/8fa09624-2464-4e19-a56d-2c38323ce49d',
    applyUrl: 'https://jobs.lever.co/netomi/8fa09624-2464-4e19-a56d-2c38323ce49d/apply',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2026-06-20T11:09:16.907Z',
    closingDate: null,
    jobDescription:
      'About the Role As an Agentic AI Forward Deployment Engineering Lead at Netomi, you will lead enterprise deployments.',
    remoteStatus: 'Remote',
  })
  assert.equal(jobs[1].country, 'India')
  assert.equal(jobs[1].city, null)
  assert.equal(jobs[1].location, 'Remote - India')
  assert.equal(jobs[1].title, 'Agentic Engineer')
})

test('Netomi run validates the first-party careers page and decorates public Lever jobs', async () => {
  const netomi = await loadNetomiModule()
  const requestedPages = []
  const requestedJson = []

  const jobs = await netomi.createNetomiScraper({
    maxJobs: 1,
    now: () => '2026-07-16T00:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedPages.push(url)
      if (url === netomi.CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected page URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      if (url === netomi.LEVER_API_URL) return sampleLeverJobs
      throw new Error(`Unexpected json URL: ${url}`)
    },
  })

  assert.deepEqual(requestedPages, [netomi.CAREERS_URL])
  assert.deepEqual(requestedJson, [netomi.LEVER_API_URL])
  assert.deepEqual(jobs, [
    {
      title: 'Agentic AI Forward Deployment Engineering Lead',
      company: 'Netomi',
      department: 'Agentic Delivery',
      location: 'Toronto, Canada',
      city: 'Toronto',
      country: 'Canada',
      jobId: '8fa09624-2464-4e19-a56d-2c38323ce49d',
      requisitionId: '8fa09624-2464-4e19-a56d-2c38323ce49d',
      sourceUrl: 'https://jobs.lever.co/netomi/8fa09624-2464-4e19-a56d-2c38323ce49d',
      applyUrl: 'https://jobs.lever.co/netomi/8fa09624-2464-4e19-a56d-2c38323ce49d/apply',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-06-20T11:09:16.907Z',
      closingDate: null,
      jobDescription:
        'About the Role As an Agentic AI Forward Deployment Engineering Lead at Netomi, you will lead enterprise deployments.',
      remoteStatus: 'Remote',
      source: 'netomi',
      link: 'https://jobs.lever.co/netomi/8fa09624-2464-4e19-a56d-2c38323ce49d/apply',
      scrapedAt: '2026-07-16T00:00:00.000Z',
      companyCareerPage: 'https://www.netomi.com/careers',
      companyDomain: 'netomi.com',
      atsPlatform: 'lever',
    },
  ])
})

test('Netomi fails closed when the verified careers page disappears or the Lever payload shape drifts', async () => {
  const netomi = await loadNetomiModule()

  await assert.rejects(
    netomi.createNetomiScraper().run({
      fetchText: async () => '<html><body><h1>Join Netomi</h1></body></html>',
      fetchJson: async () => sampleLeverJobs,
    }),
    /verified official careers surface/i,
  )

  await assert.rejects(
    netomi.createNetomiScraper().run({
      fetchText: async () => officialCareersHtml,
      fetchJson: async () => [
        {
          id: 'broken-role',
          text: 'Broken Role',
        },
      ],
    }),
    /lever postings payload/i,
  )
})
