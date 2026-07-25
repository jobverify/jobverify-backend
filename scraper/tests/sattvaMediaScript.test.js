import assert from 'node:assert/strict'
import test from 'node:test'

const JOIN_US_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join Sattva | Meaningful careers in sustainability & impact</title>
  </head>
  <body>
    <main>
      <h1>We are driven by impact and powered by knowledge.</h1>
      <h2>Life at Sattva</h2>
      <h2>Careers</h2>
      <p>Learn about our new opportunities and apply for positions online.</p>
      <a href="https://www.sattva.co.in/join-us/careers/">Know more</a>
      <p>For career and job opportunities, write to: careers@sattva.co.in</p>
    </main>
  </body>
</html>
`

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Sattva Consulting</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>Interested in being one of us?</p>
      <a href="https://sattva-talent.freshteam.com/jobs">SEE ALL JOBS</a>
      <p>For career and job opportunities, write to: careers@sattva.co.in</p>
    </main>
  </body>
</html>
`

const BOARD_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h4>Careers</h4>
    <h3>Open Positions</h3>
    <a href="/jobs/NL9eULd4lxHD/analyst-data-science-spatial-analytics">
      <span>Analyst - Data Science & Spatial Analytics</span>
      <span>New Delhi, Delhi</span>
      <span>Contract</span>
    </a>
    <a href="/jobs/VyhBa3Uwin7B/intern-corporate-advisory">
      <span>Intern - Corporate Advisory</span>
      <span>Mumbai, Maharashtra</span>
      <span>Internship</span>
    </a>
    <a href="/jobs/ldn000000001/growth-manager-emea">
      <span>Growth Manager - EMEA</span>
      <span>London, England</span>
      <span>Full Time</span>
    </a>
  </body>
</html>
`

const DATA_SCIENCE_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h4>Foundations Advisory</h4>
    <h1>Analyst - Data Science & Spatial Analytics</h1>
    <p>New Delhi, Delhi</p>
    <p>Work Type: Contract</p>
    <p>Role: Analyst - Data Science & Spatial Analytics</p>
    <p>Employment type: Contract (1 Year)</p>
    <p>Location: Delhi / Gurgaon / Bangalore</p>
    <p>2-5 years of experience working with Python, R, or SQL and spatial analytics workflows.</p>
    <h2>Submit Your Application</h2>
    <p>By proceeding with this job application portal and submitting your information to Sattva Media and Consulting Private Limited.</p>
  </body>
</html>
`

const INTERN_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h4>Corporate Advisory</h4>
    <h1>Intern - Corporate Advisory</h1>
    <p>Mumbai, Maharashtra</p>
    <p>Work Type: Internship</p>
    <p>Mode: Hybrid (2 days work from office, 3 days WFH)</p>
    <p>Location- Mumbai/Bangalore</p>
    <p>Please note: The organization follows a Bring Your Own Device (BYOD) policy.</p>
    <h2>Submit Your Application</h2>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../sattvamedia/script.js')
  } catch {
    assert.fail('Expected Sattva Media scraper module at ../sattvamedia/script.js')
  }
}

test('Sattva Media scraper stays pinned to the verified first-party join-us pages and Freshteam board', async () => {
  const sattvaMedia = await loadModule()

  assert.equal(sattvaMedia.SOURCE, 'sattvamedia')
  assert.equal(sattvaMedia.COMPANY_NAME, 'Sattva Media')
  assert.equal(sattvaMedia.OFFICIAL_BRAND_NAME, 'Sattva Consulting')
  assert.equal(sattvaMedia.LEGAL_ENTITY_NAME, 'Sattva Media and Consulting Private Limited')
  assert.equal(sattvaMedia.JOIN_US_URL, 'https://www.sattva.co.in/join-us/')
  assert.equal(sattvaMedia.CAREERS_URL, 'https://www.sattva.co.in/join-us/careers/')
  assert.equal(sattvaMedia.LISTING_URL, 'https://sattva-talent.freshteam.com/jobs')
  assert.equal(
    sattvaMedia.buildDetailUrl('NL9eULd4lxHD', 'analyst-data-science-spatial-analytics'),
    'https://sattva-talent.freshteam.com/jobs/NL9eULd4lxHD/analyst-data-science-spatial-analytics',
  )
  assert.equal(sattvaMedia.hasOfficialJoinUsLandingSignal(JOIN_US_HTML), true)
  assert.equal(sattvaMedia.hasOfficialCareersPageSignal(CAREERS_HTML), true)
  assert.equal(sattvaMedia.extractFreshteamJobsUrl(CAREERS_HTML), sattvaMedia.LISTING_URL)
  assert.equal(sattvaMedia.hasOfficialJobsBoardSignal(BOARD_HTML), true)
})

test('Sattva Media run verifies the first-party join-us flow and keeps only India jobs from Freshteam', async () => {
  const sattvaMedia = await loadModule()
  const requested = []

  const jobs = await sattvaMedia.createSattvaMediaScraper({ maxJobs: 2 }).run({
    fetchText: async (url) => {
      requested.push(url)
      if (url === sattvaMedia.JOIN_US_URL) return JOIN_US_HTML
      if (url === sattvaMedia.CAREERS_URL) return CAREERS_HTML
      if (url === sattvaMedia.LISTING_URL) return BOARD_HTML
      if (url === 'https://sattva-talent.freshteam.com/jobs/NL9eULd4lxHD/analyst-data-science-spatial-analytics') {
        return DATA_SCIENCE_DETAIL_HTML
      }
      if (url === 'https://sattva-talent.freshteam.com/jobs/VyhBa3Uwin7B/intern-corporate-advisory') {
        return INTERN_DETAIL_HTML
      }
      throw new Error(`Unexpected Sattva Media fixture URL: ${url}`)
    },
    now: () => '2026-07-17T00:00:00.000Z',
  })

  assert.deepEqual(requested, [
    sattvaMedia.JOIN_US_URL,
    sattvaMedia.CAREERS_URL,
    sattvaMedia.LISTING_URL,
    'https://sattva-talent.freshteam.com/jobs/NL9eULd4lxHD/analyst-data-science-spatial-analytics',
    'https://sattva-talent.freshteam.com/jobs/VyhBa3Uwin7B/intern-corporate-advisory',
  ])
  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      location: job.location,
      country: job.country,
      employmentType: job.employmentType,
      source: job.source,
      link: job.link,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Analyst - Data Science & Spatial Analytics',
        location: 'New Delhi, Delhi, India',
        country: 'India',
        employmentType: 'Contract',
        source: 'sattvamedia',
        link: 'https://sattva-talent.freshteam.com/jobs/NL9eULd4lxHD/analyst-data-science-spatial-analytics',
        scrapedAt: '2026-07-17T00:00:00.000Z',
      },
      {
        title: 'Intern - Corporate Advisory',
        location: 'Mumbai, Maharashtra, India',
        country: 'India',
        employmentType: 'Internship',
        source: 'sattvamedia',
        link: 'https://sattva-talent.freshteam.com/jobs/VyhBa3Uwin7B/intern-corporate-advisory',
        scrapedAt: '2026-07-17T00:00:00.000Z',
      },
    ],
  )
})

test('Sattva Media fails closed when the verified join-us landing, careers CTA, or Freshteam board drifts', async () => {
  const sattvaMedia = await loadModule()

  await assert.rejects(
    sattvaMedia.createSattvaMediaScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified Sattva join-us landing page/i,
  )

  await assert.rejects(
    sattvaMedia.createSattvaMediaScraper().run({
      fetchText: async (url) => {
        if (url === sattvaMedia.JOIN_US_URL) return JOIN_US_HTML
        if (url === sattvaMedia.CAREERS_URL) {
          return '<html><body><h1>Careers</h1><a href="/careers/apply">Apply</a></body></html>'
        }
        return BOARD_HTML
      },
    }),
    /verified Sattva careers page/i,
  )

  await assert.rejects(
    sattvaMedia.createSattvaMediaScraper().run({
      fetchText: async (url) => {
        if (url === sattvaMedia.JOIN_US_URL) return JOIN_US_HTML
        if (url === sattvaMedia.CAREERS_URL) return CAREERS_HTML
        return '<html><body><h1>Oops</h1></body></html>'
      },
    }),
    /verified Sattva Freshteam board/i,
  )
})
