import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COMPANY,
  LEVER_BOARD_URL,
  LEVER_ENDPOINT,
  OFFICIAL_CAREERS_URL,
  SOURCE,
  createGateScraper,
  extractLeverJobs,
  hasLeverBoardSignal,
  hasOfficialCareersSignal,
} from './script.js'

const officialCareersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Gate Careers | Crypto & Web3 Jobs at Gate | Gate.com</title>
    </head>
    <body>
      <main>
        <h1>Join Gate &amp; Shape A New Career Chapter</h1>
        <p>Join global innovators to shape the future of crypto finance and create your own impact.</p>
        <section>
          <h2>Our Culture, One Gate</h2>
          <p>Direct communication, clear ownership, and results-driven collaboration.</p>
        </section>
        <section>
          <h2>Our Core Values</h2>
          <p>Innovation, cooperation, insight, curiosity, and integrity are the principles that guide how we work.</p>
        </section>
        <section>
          <h2>Why Gate</h2>
          <p>Rewards, growth, flexibility, and a global stage all belong here.</p>
        </section>
        <section>
          <h2>Unlock Your Next Career Chapter</h2>
          <p>View All Positions (0)</p>
        </section>
        <section>
          <h2>Gate News &amp; Insights</h2>
          <a href="https://www.linkedin.com/company/gateio/">LinkedIn</a>
        </section>
      </main>
    </body>
  </html>
`

const leverBoardHtml = `
  <!doctype html>
  <html>
  <head>
      <title>Gate</title>
      <meta property="og:description" content="Job openings at Gate">
    </head>
    <body>
      <div>Location Type</div>
      <div>Work Type</div>
      <div>Location All</div>
      <div>Team All</div>
      <div class="posting" data-qa-posting-id="aa738bea-de6b-4a76-a9f5-c30a6c8ceabc">
        <a class="posting-title" href="https://jobs.lever.co/gate/aa738bea-de6b-4a76-a9f5-c30a6c8ceabc">
          <h5 data-qa="posting-name">Product Manager - ASO/SEO</h5>
        </a>
      </div>
      <p><a href="https://www.gate.com">Gate Home Page</a></p>
      <a href="https://www.lever.co/job-seeker-support/">Jobs powered by Lever</a>
    </body>
  </html>
`

const sampleLeverJobs = [
  {
    id: 'aa738bea-de6b-4a76-a9f5-c30a6c8ceabc',
    text: 'Product Manager - ASO/SEO',
    country: 'CN',
    workplaceType: 'remote',
    createdAt: 1_783_006_400_000,
    categories: {
      commitment: 'Full-time remote',
      department: 'Research and Development',
      location: 'APAC-C1',
      team: 'Product Design',
      allLocations: ['APAC-C1'],
    },
    description:
      '<div><p>Own ASO/SEO product strategy.</p><p>Build search growth loops.</p></div>',
    hostedUrl: 'https://jobs.lever.co/gate/aa738bea-de6b-4a76-a9f5-c30a6c8ceabc',
    applyUrl: 'https://jobs.lever.co/gate/aa738bea-de6b-4a76-a9f5-c30a6c8ceabc/apply',
  },
  {
    id: '76f72a07-c5d4-404e-af59-15b66a05297c',
    text: 'Senior Associate',
    country: 'GD',
    workplaceType: 'remote',
    createdAt: 1_781_920_000_000,
    categories: {
      commitment: 'Full-time remote',
      department: 'Gate Ventures',
      location: 'Global-NAG2',
      team: 'Gate Ventures',
      allLocations: ['Global-NAG2'],
    },
    description:
      '<div><p>Support venture operations and sourcing.</p></div>',
    hostedUrl: 'https://jobs.lever.co/gate/76f72a07-c5d4-404e-af59-15b66a05297c',
    applyUrl: 'https://jobs.lever.co/gate/76f72a07-c5d4-404e-af59-15b66a05297c/apply',
  },
]

test('Gate exports the verified official careers and Lever surfaces', () => {
  assert.equal(COMPANY, 'Gate')
  assert.equal(SOURCE, 'gate')
  assert.equal(OFFICIAL_CAREERS_URL, 'https://www.gate.com/careers')
  assert.equal(LEVER_BOARD_URL, 'https://jobs.lever.co/gate')
  assert.equal(LEVER_ENDPOINT, 'https://api.lever.co/v0/postings/gate?mode=json')
})

test('verified HTML signals match the live Gate careers and Lever pages', () => {
  assert.equal(hasOfficialCareersSignal(officialCareersHtml), true)
  assert.equal(hasLeverBoardSignal(leverBoardHtml), true)
})

test('extractLeverJobs maps Gate Lever postings without inventing unsupported location detail', () => {
  assert.deepEqual(extractLeverJobs(sampleLeverJobs), [
    {
      title: 'Product Manager - ASO/SEO',
      company: 'Gate',
      department: 'Product Design',
      location: 'APAC-C1',
      city: null,
      country: 'China',
      jobId: 'aa738bea-de6b-4a76-a9f5-c30a6c8ceabc',
      requisitionId: 'aa738bea-de6b-4a76-a9f5-c30a6c8ceabc',
      sourceUrl: 'https://jobs.lever.co/gate/aa738bea-de6b-4a76-a9f5-c30a6c8ceabc',
      applyUrl: 'https://jobs.lever.co/gate/aa738bea-de6b-4a76-a9f5-c30a6c8ceabc/apply',
      employmentType: 'Full-time remote',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-07-02T15:33:20.000Z',
      closingDate: null,
      jobDescription: 'Own ASO/SEO product strategy. Build search growth loops.',
      remoteStatus: 'Remote',
    },
    {
      title: 'Senior Associate',
      company: 'Gate',
      department: 'Gate Ventures',
      location: 'Global-NAG2',
      city: null,
      country: 'Grenada',
      jobId: '76f72a07-c5d4-404e-af59-15b66a05297c',
      requisitionId: '76f72a07-c5d4-404e-af59-15b66a05297c',
      sourceUrl: 'https://jobs.lever.co/gate/76f72a07-c5d4-404e-af59-15b66a05297c',
      applyUrl: 'https://jobs.lever.co/gate/76f72a07-c5d4-404e-af59-15b66a05297c/apply',
      employmentType: 'Full-time remote',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-06-20T01:46:40.000Z',
      closingDate: null,
      jobDescription: 'Support venture operations and sourcing.',
      remoteStatus: 'Remote',
    },
  ])
})

test('run validates the official Gate careers page before trusting Lever jobs', async () => {
  const requests = []
  const scraper = createGateScraper({
    now: () => '2026-07-13T00:00:00.000Z',
  })

  const jobs = await scraper.run({
    fetchText: async (url) => {
      requests.push(url)

      if (url === OFFICIAL_CAREERS_URL) return officialCareersHtml
      if (url === LEVER_BOARD_URL) return leverBoardHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
    fetchJson: async (url) => {
      requests.push(url)
      return sampleLeverJobs
    },
  })

  assert.deepEqual(requests, [OFFICIAL_CAREERS_URL, LEVER_BOARD_URL, LEVER_ENDPOINT])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'gate')
  assert.equal(jobs[0].link, 'https://jobs.lever.co/gate/aa738bea-de6b-4a76-a9f5-c30a6c8ceabc/apply')
  assert.equal(jobs[0].companyCareerPage, 'https://www.gate.com/careers')
  assert.equal(jobs[0].companyDomain, 'gate.com')
  assert.equal(jobs[0].atsPlatform, 'lever')
  assert.equal(jobs[0].scrapedAt, '2026-07-13T00:00:00.000Z')
})

test('run fails closed when the official Gate careers page drifts away from the verified public jobs surface', async () => {
  const scraper = createGateScraper()

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => {
        if (url === OFFICIAL_CAREERS_URL) {
          return '<html><body><h1>Careers</h1><p>No verified Gate jobs surface here.</p></body></html>'
        }

        return leverBoardHtml
      },
      fetchJson: async () => sampleLeverJobs,
    }),
    /official Gate careers surface/i,
  )
})

test('run fails closed when the public Gate Lever board no longer matches the verified surface', async () => {
  const scraper = createGateScraper()

  await assert.rejects(
    scraper.run({
      fetchText: async (url) => {
        if (url === OFFICIAL_CAREERS_URL) return officialCareersHtml
        return '<html><body><h1>Apply now</h1></body></html>'
      },
      fetchJson: async () => sampleLeverJobs,
    }),
    /public jobs surface/i,
  )
})
