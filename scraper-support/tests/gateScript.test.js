import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Gate Careers | Crypto & Web3 Jobs at Gate | Gate.com</title>
  </head>
  <body>
    <main>
      <h1>Career Opportunities</h1>
      <p>Start your career journey with Gate and explore unlimited opportunities.</p>
      <p>Job Openings</p>
      <button>View LinkedIn</button>
      <p>12 positions open, waiting just for you!</p>
      <ul>
        <li>Product</li>
        <li>Engineering</li>
        <li>Technical Support</li>
        <li>Legal &amp; Compliance</li>
        <li>Investment Products</li>
        <li>Risk Control &amp; AML</li>
        <li>Finance</li>
        <li>Internship</li>
      </ul>
    </main>
  </body>
</html>
`

const LEVER_BOARD_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Gate</title>
  </head>
  <body>
    <main>
      <label>Location type</label>
      <p>Location All</p>
      <p>Team All</p>
      <label>Work type</label>
      <a href="https://www.gate.com/">Gate Home Page</a>
      <article>
        <h2>Business Development Manager</h2>
        <button>Apply</button>
      </article>
    </main>
  </body>
</html>
`

const LEVER_JOBS = [
  {
    id: 'gate-1',
    text: 'Business Development Manager',
    hostedUrl: 'https://jobs.lever.co/gate/gate-1',
    applyUrl: 'https://jobs.lever.co/gate/gate-1/apply',
    createdAt: 1761772800000,
    country: 'IN',
    workplaceType: 'Remote',
    categories: {
      location: 'Remote',
      team: 'Business Development',
      commitment: 'Full-time remote',
    },
    descriptionPlain: 'Build strategic partnerships.',
  },
  {
    id: 'gate-2',
    text: 'AML Analyst',
    hostedUrl: 'https://jobs.lever.co/gate/gate-2',
    createdAt: 1761859200000,
    country: 'SG',
    workplaceType: 'Onsite',
    categories: {
      location: 'Singapore',
      team: 'Risk Control',
    },
    descriptionPlain: 'Support AML reviews.',
  },
]

const loadGateModule = async () => {
  try {
    return await import('../../scraper/gate/script.js')
  } catch {
    assert.fail('Expected Gate scraper module at ../../scraper/gate/script.js')
  }
}

test('Gate helpers recognize the current official careers and Lever board surfaces', async () => {
  const gate = await loadGateModule()

  assert.equal(gate.SOURCE, 'gate')
  assert.equal(gate.COMPANY, 'Gate')
  assert.equal(gate.OFFICIAL_CAREERS_URL, 'https://www.gate.com/careers')
  assert.equal(gate.LEVER_BOARD_URL, 'https://jobs.lever.co/gate')
  assert.equal(gate.LEVER_ENDPOINT, 'https://api.lever.co/v0/postings/gate?mode=json')
  assert.equal(gate.hasOfficialCareersSignal(OFFICIAL_CAREERS_HTML), true)
  assert.equal(gate.hasLeverBoardSignal(LEVER_BOARD_HTML), true)
  assert.deepEqual(gate.extractLeverJobs(LEVER_JOBS), [
    {
      title: 'Business Development Manager',
      company: 'Gate',
      department: 'Business Development',
      location: 'Remote',
      city: 'Remote',
      country: 'India',
      jobId: 'gate-1',
      requisitionId: 'gate-1',
      sourceUrl: 'https://jobs.lever.co/gate/gate-1',
      applyUrl: 'https://jobs.lever.co/gate/gate-1/apply',
      employmentType: 'Full-time remote',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-10-29T21:20:00.000Z',
      closingDate: null,
      jobDescription: 'Build strategic partnerships.',
      remoteStatus: 'Remote',
    },
    {
      title: 'AML Analyst',
      company: 'Gate',
      department: 'Risk Control',
      location: 'Singapore',
      city: 'Singapore',
      country: 'Singapore',
      jobId: 'gate-2',
      requisitionId: 'gate-2',
      sourceUrl: 'https://jobs.lever.co/gate/gate-2',
      applyUrl: 'https://jobs.lever.co/gate/gate-2',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-10-30T21:20:00.000Z',
      closingDate: null,
      jobDescription: 'Support AML reviews.',
      remoteStatus: 'On-site',
    },
  ])
})

test('Gate run verifies the current careers surfaces and decorates Lever jobs', async () => {
  const gate = await loadGateModule()
  const requestedTexts = []
  const requestedJson = []

  const jobs = await gate.createGateScraper({
    now: () => '2026-07-26T19:40:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedTexts.push(url)

      if (url === gate.OFFICIAL_CAREERS_URL) return OFFICIAL_CAREERS_HTML
      if (url === gate.LEVER_BOARD_URL) return LEVER_BOARD_HTML

      throw new Error(`Unexpected text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJson.push(url)
      return LEVER_JOBS
    },
  })

  assert.deepEqual(requestedTexts, [
    gate.OFFICIAL_CAREERS_URL,
    gate.LEVER_BOARD_URL,
  ])
  assert.deepEqual(requestedJson, [gate.LEVER_ENDPOINT])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'gate')
  assert.equal(jobs[0].companyCareerPage, gate.OFFICIAL_CAREERS_URL)
  assert.equal(jobs[0].companyDomain, 'gate.com')
  assert.equal(jobs[0].atsPlatform, 'lever')
  assert.equal(jobs[0].scrapedAt, '2026-07-26T19:40:00.000Z')
})

test('Gate fails closed when the official careers page or Lever board drifts', async () => {
  const gate = await loadGateModule()

  await assert.rejects(
    gate.createGateScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
      fetchJson: async () => [],
    }),
    /official gate careers surface/i,
  )

  await assert.rejects(
    gate.createGateScraper().run({
      fetchText: async (url) => {
        if (url === gate.OFFICIAL_CAREERS_URL) return OFFICIAL_CAREERS_HTML
        return '<html><body><h1>Unexpected Lever board</h1></body></html>'
      },
      fetchJson: async () => [],
    }),
    /public jobs surface/i,
  )
})
