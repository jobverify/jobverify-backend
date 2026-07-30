import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const officialJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs | Plivo</title>
  </head>
  <body>
    <main id="main-content">
      <h1>Come build the future of Agentic AI with us</h1>
      <p>03 open positions</p>
      <h2>Open Positions</h2>
      <p>Loading positions...</p>
      <astro-island
        component-url="/_astro/JobsPage.CF5RpfNv.js"
        component-export="default"
        renderer-url="/_astro/client.Yi0K8k_T.js"
        props="{}"
        client="load"
      ></astro-island>
    </main>
  </body>
</html>
`

const jobsBundleJs = `
import{j as e}from"./jsx-runtime";
function JobsPage(){
  return fetch("https://api.lever.co/v0/postings/plivo?mode=json")
}
export default JobsPage;
`

const officialLeverBoardHtml = `
<!doctype html>
<html>
  <head>
    <title>Plivo</title>
    <meta name="twitter:description" content="Job openings at Plivo" />
  </head>
  <body class="list header-compact">
    <div class="content">
      <div class="main-header-text">Location type</div>
      <div class="main-header-text">Location</div>
      <div class="main-header-text">Team</div>
      <div class="main-header-text">Work type</div>
      <div class="postings-message">No job postings currently open. Check back later!</div>
      <div>Jobs powered by Lever</div>
    </div>
  </body>
</html>
`

const currentOfficialLeverBoardHtml = `
<!doctype html>
<html>
  <head>
    <title>Plivo</title>
    <meta name="twitter:description" content="Job openings at Plivo" />
  </head>
  <body class="list header-compact">
    <div class="postings-wrapper">
      <div class="postings-message">No job postings currently open. Check back later!</div>
      <a href="https://www.plivo.com/">Plivo Home Page</a>
      <section aria-label="Privacy Notice">
        <h2>Privacy Notice</h2>
        <p>
          We may use artificial intelligence (AI) tools to support parts of the hiring process,
          such as reviewing applications and analyzing resumes.
        </p>
      </section>
      <footer>
        <span>Jobs powered by</span>
        <img alt="Lever" src="/img/lever-logo.png" />
      </footer>
    </div>
  </body>
</html>
`

const sampleLeverJobs = [
  {
    id: '669aaffa-a293-4f99-8989-393aa077f854',
    text: 'Senior Account Manager',
    hostedUrl: 'https://jobs.lever.co/plivo/669aaffa-a293-4f99-8989-393aa077f854',
    applyUrl: 'https://jobs.lever.co/plivo/669aaffa-a293-4f99-8989-393aa077f854/apply',
    createdAt: 1_751_592_000_000,
    categories: {
      location: 'Bangalore, Karnataka',
      team: 'Customer Success',
      department: 'API',
      commitment: 'Full-time',
      allLocations: ['Bangalore, Karnataka'],
    },
    country: 'IN',
    workplaceType: 'onsite',
    descriptionPlain: 'Manage key customer relationships across APAC and EMEA.',
  },
  {
    id: 'us-remote-role',
    text: 'Developer Advocate',
    hostedUrl: 'https://jobs.lever.co/plivo/us-remote-role',
    applyUrl: 'https://jobs.lever.co/plivo/us-remote-role/apply',
    createdAt: 1_751_678_400_000,
    categories: {
      location: 'United States (Remote)',
      team: 'Developer Relations',
      department: 'Marketing',
      commitment: 'Full-time',
      allLocations: ['United States (Remote)'],
    },
    country: 'US',
    workplaceType: 'remote',
    descriptionPlain: 'Build developer content and community for Plivo.',
  },
]

const loadPlivoModule = async () => {
  try {
    return await import('../plivo/script.js')
  } catch {
    assert.fail('Expected Plivo scraper module at ../plivo/script.js')
  }
}

test('Plivo scraper pins the verified first-party jobs shell, bundle, and Lever API contract', async () => {
  const plivo = await loadPlivoModule()

  assert.equal(plivo.SOURCE, 'plivo')
  assert.equal(plivo.COMPANY, 'Plivo')
  assert.equal(plivo.OFFICIAL_BRAND_NAME, 'Plivo')
  assert.equal(plivo.HOMEPAGE_URL, 'https://www.plivo.com/')
  assert.equal(plivo.CAREERS_URL, 'https://www.plivo.com/jobs/')
  assert.equal(plivo.LEVER_BOARD_URL, 'https://jobs.lever.co/plivo')
  assert.equal(plivo.LEVER_API_URL, 'https://api.lever.co/v0/postings/plivo?mode=json')
  assert.equal(plivo.VERIFIED_ON, '2026-07-26')
  assert.equal(plivo.hasOfficialPlivoJobsSignal(officialJobsHtml), true)
  assert.equal(
    plivo.extractJobsBundleUrl(officialJobsHtml),
    'https://www.plivo.com/_astro/JobsPage.CF5RpfNv.js',
  )
  assert.equal(
    plivo.extractLeverApiUrl(jobsBundleJs),
    'https://api.lever.co/v0/postings/plivo?mode=json',
  )
  assert.equal(plivo.hasOfficialLeverBoardSignal(officialLeverBoardHtml), true)
  assert.equal(plivo.hasEmptyLeverBoardSignal(officialLeverBoardHtml), true)
})

test('Plivo accepts the current July 26, 2026 empty Lever board layout', async () => {
  const plivo = await loadPlivoModule()

  assert.equal(plivo.hasOfficialLeverBoardSignal(currentOfficialLeverBoardHtml), true)
  assert.equal(plivo.hasEmptyLeverBoardSignal(currentOfficialLeverBoardHtml), true)
})

test('Plivo extracts Lever jobs into shared scraper job fields and preserves a global scope', async () => {
  const plivo = await loadPlivoModule()
  const jobs = plivo.extractLeverJobs(sampleLeverJobs)

  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'Senior Account Manager',
    company: 'Plivo',
    department: 'Customer Success',
    location: 'Bangalore, Karnataka',
    city: 'Bangalore',
    country: 'India',
    jobId: '669aaffa-a293-4f99-8989-393aa077f854',
    requisitionId: '669aaffa-a293-4f99-8989-393aa077f854',
    sourceUrl: 'https://jobs.lever.co/plivo/669aaffa-a293-4f99-8989-393aa077f854',
    applyUrl: 'https://jobs.lever.co/plivo/669aaffa-a293-4f99-8989-393aa077f854/apply',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: '2025-07-04T01:20:00.000Z',
    closingDate: null,
    jobDescription: 'Manage key customer relationships across APAC and EMEA.',
    remoteStatus: 'On-site',
  })
  assert.equal(jobs[1].country, 'United States')
  assert.equal(jobs[1].city, null)
  assert.equal(jobs[1].remoteStatus, 'Remote')
})

test('Plivo run validates the first-party shell and returns [] for the live empty Lever board', async () => {
  const plivo = await loadPlivoModule()
  const requestedTextUrls = []
  const requestedJsonUrls = []

  const jobs = await plivo.createPlivoScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === plivo.CAREERS_URL) return officialJobsHtml
      if (url === 'https://www.plivo.com/_astro/JobsPage.CF5RpfNv.js') return jobsBundleJs
      if (url === plivo.LEVER_BOARD_URL) return officialLeverBoardHtml
      throw new Error(`Unexpected Plivo text URL: ${url}`)
    },
    fetchJson: async (url) => {
      requestedJsonUrls.push(url)
      return []
    },
  })

  assert.deepEqual(requestedTextUrls, [
    'https://www.plivo.com/jobs/',
    'https://www.plivo.com/_astro/JobsPage.CF5RpfNv.js',
    'https://jobs.lever.co/plivo',
  ])
  assert.deepEqual(requestedJsonUrls, ['https://api.lever.co/v0/postings/plivo?mode=json'])
  assert.deepEqual(jobs, [])
})

test('Plivo fails closed when the official jobs shell or Lever contract drifts', async () => {
  const plivo = await loadPlivoModule()

  await assert.rejects(
    plivo.createPlivoScraper().run({
      fetchText: async (url) => {
        if (url === plivo.CAREERS_URL) return '<html><body><h1>Unexpected</h1></body></html>'
        throw new Error(`Unexpected Plivo text URL: ${url}`)
      },
      fetchJson: async () => [],
    }),
    /verified official jobs page changed materially/i,
  )

  await assert.rejects(
    plivo.createPlivoScraper().run({
      fetchText: async (url) => {
        if (url === plivo.CAREERS_URL) return officialJobsHtml
        if (url === 'https://www.plivo.com/_astro/JobsPage.CF5RpfNv.js') return 'console.log("missing lever url")'
        throw new Error(`Unexpected Plivo text URL: ${url}`)
      },
      fetchJson: async () => [],
    }),
    /jobs bundle no longer exposes the verified Lever API/i,
  )

  await assert.rejects(
    plivo.createPlivoScraper().run({
      fetchText: async (url) => {
        if (url === plivo.CAREERS_URL) return officialJobsHtml
        if (url === 'https://www.plivo.com/_astro/JobsPage.CF5RpfNv.js') return jobsBundleJs
        if (url === plivo.LEVER_BOARD_URL) return '<html><body><h1>Broken board</h1></body></html>'
        throw new Error(`Unexpected Plivo text URL: ${url}`)
      },
      fetchJson: async () => [],
    }),
    /verified public Lever board changed materially/i,
  )
})
