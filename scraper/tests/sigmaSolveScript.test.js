import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'
const OPENING_URL =
  'https://www.sigmasolve.com/who-we-are/open-position/ai-driven-lead-generation-amp-email-marketing-specialist'

const openingsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Open Positions - Sigma Solve | Sigma Solve</title>
    <meta name="description" content="Career opportunities at Sigma Solve. Explore current openings and apply directly.">
    <link rel="canonical" href="https://www.sigmasolve.com/who-we-are/openings">
  </head>
  <body>
    <main>
      <p>Returning Candidate? <a href="/who-we-are/career-login">Log back in!</a></p>
      <label for="job-search">Search your job</label>
      <input id="job-search" type="search" placeholder="Search your job here">
      <ul>
        <li>
          <a href="/who-we-are/open-position/ai-driven-lead-generation-amp-email-marketing-specialist">
            AI-Driven Lead Generation &amp;amp; Email Marketing Specialist
          </a>
          <p><span>Full-time</span><span>Marketing</span></p>
        </li>
      </ul>
    </main>
  </body>
</html>
`

const detailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>AI-Driven Lead Generation &amp;amp; Email Marketing Specialist | Sigma Solve</title>
    <meta name="description" content="Email Marketing | SEO | AI-Driven Prospecting | GA4/GTM/Clarity | Campaign Optimization">
    <link rel="canonical" href="${OPENING_URL}">
  </head>
  <body>
    <main>
      <h1>AI-Driven Lead Generation &amp;amp; Email Marketing Specialist</h1>
      <div>
        <span class="text-brand font-semibold">Type</span><span class="text-foreground">Full-time</span>
        <span class="text-brand font-semibold">Location</span><span class="text-foreground">United States</span>
        <span class="text-brand font-semibold">Department</span><span class="text-foreground">Marketing</span>
      </div>
      <h3>Key Responsibilities</h3>
      <ul>
        <li>Use AI tools to identify high-intent prospects.</li>
      </ul>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../sigmasolve/script.js')
  } catch {
    assert.fail('Expected Sigma Solve scraper module at ../sigmasolve/script.js')
  }
}

test('Sigma Solve helpers stay pinned to the verified first-party openings route and detail-link pattern', async () => {
  const sigmaSolve = await loadModule()

  assert.equal(sigmaSolve.SOURCE, 'sigmasolve')
  assert.equal(sigmaSolve.COMPANY, 'Sigma Solve')
  assert.equal(sigmaSolve.CAREERS_PAGE_URL, 'https://www.sigmasolve.com/who-we-are/openings')
  assert.equal(sigmaSolve.VERIFIED_ON, '2026-07-17')
  assert.equal(sigmaSolve.hasOfficialOpeningsPageSignal(openingsHtml), true)
  assert.deepEqual(sigmaSolve.extractOpeningSummaries(openingsHtml), [
    {
      title: 'AI-Driven Lead Generation & Email Marketing Specialist',
      department: 'Marketing',
      employmentType: 'Full-time',
      sourceUrl: OPENING_URL,
      applyUrl: OPENING_URL,
    },
  ])
})

test('Sigma Solve extracts the verified first-party detail page into shared scraper job fields', async () => {
  const sigmaSolve = await loadModule()
  const jobs = sigmaSolve.extractJobsFromDetailPages([
    {
      summary: {
        title: 'AI-Driven Lead Generation & Email Marketing Specialist',
        department: 'Marketing',
        employmentType: 'Full-time',
        sourceUrl: OPENING_URL,
        applyUrl: OPENING_URL,
      },
      detailHtml,
    },
  ])

  assert.deepEqual(jobs, [
    {
      title: 'AI-Driven Lead Generation & Email Marketing Specialist',
      company: 'Sigma Solve',
      department: 'Marketing',
      location: 'United States',
      city: null,
      state: null,
      country: 'United States',
      jobId: 'ai-driven-lead-generation-amp-email-marketing-specialist',
      requisitionId: 'ai-driven-lead-generation-amp-email-marketing-specialist',
      sourceUrl: OPENING_URL,
      applyUrl: OPENING_URL,
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Email Marketing | SEO | AI-Driven Prospecting | GA4/GTM/Clarity | Campaign Optimization',
      remoteStatus: 'On-site',
    },
  ])
})

test('Sigma Solve run validates the official openings page and returns normalized same-domain jobs', async () => {
  const sigmaSolve = await loadModule()
  const requestedUrls = []

  const jobs = await sigmaSolve.createSigmaSolveScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === sigmaSolve.CAREERS_PAGE_URL) return openingsHtml
      if (url === OPENING_URL) return detailHtml
      throw new Error(`Unexpected Sigma Solve URL: ${url}`)
    },
    now: () => FIXED_SCRAPED_AT,
  })

  assert.deepEqual(requestedUrls, [
    sigmaSolve.CAREERS_PAGE_URL,
    OPENING_URL,
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'sigmasolve')
  assert.equal(jobs[0].link, OPENING_URL)
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})

test('Sigma Solve fails closed when the openings page, opening cards, or detail page drift', async () => {
  const sigmaSolve = await loadModule()

  await assert.rejects(
    sigmaSolve.createSigmaSolveScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified sigma solve openings page/i,
  )

  await assert.rejects(
    sigmaSolve.createSigmaSolveScraper().run({
      fetchText: async (url) => {
        if (url === sigmaSolve.CAREERS_PAGE_URL) {
          return openingsHtml.replaceAll('/who-we-are/open-position/ai-driven-lead-generation-amp-email-marketing-specialist', '/who-we-are/career-login')
        }
        return detailHtml
      },
    }),
    /trusted sigma solve opening cards/i,
  )

  await assert.rejects(
    sigmaSolve.createSigmaSolveScraper().run({
      fetchText: async (url) => {
        if (url === sigmaSolve.CAREERS_PAGE_URL) return openingsHtml
        return '<html><head><title>Unexpected</title></head><body>No job details</body></html>'
      },
    }),
    /verified sigma solve detail page/i,
  )
})
