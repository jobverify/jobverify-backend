import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-14T00:00:00.000Z'

const loadAbsoluteModule = async () => {
  try {
    return await import('../../scraper/absolute/script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Stop Downtime &amp; Business Disruption | Absolute Security</title>
  </head>
  <body>
    <nav>
      <a href="/company/careers">Careers</a>
      <a href="https://www.absolute.com/company/about/">About</a>
    </nav>
    <main>
      <h1>Absolute Security Cyber Resilience Platform</h1>
      <p>We Stop Downtime.</p>
      <p>Only Absolute Security creates an unbreakable connection between device firmware and the Absolute platform.</p>
    </main>
    <footer>Absolute Software Corporation</footer>
  </body>
</html>
`

const currentHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Stop Downtime &amp; Business Disruption | Absolute Security</title>
  </head>
  <body>
    <main>
      <h1>Detect.Remediate.Rehydrate.Recover.Autonomously.</h1>
      <h2>Fully. In Minutes.</h2>
      <p>THE AUTONOMOUS CYBER RESILIENCE PLATFORM</p>
      <p>Cyber incidents are now the new normal.</p>
      <p>We Stop Downtime.</p>
    </main>
    <footer>
      <a href="/company/careers">Careers</a>
      <span>Absolute Security</span>
    </footer>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Absolute Security</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>We're the world's only provider of self-healing, intelligent security solutions - and we're growing.</p>
      <section>
        <a href="https://jobs.jobvite.com/absolute/">Professional &amp; Managed Services - we're hiring.</a>
      </section>
    </main>
  </body>
</html>
`

const boardHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Absolute Security Careers</title>
  </head>
  <body>
    <main>
      <h2>Open Positions</h2>
      <p>Location: Bangalore, India Delhi, India Tokyo, Japan</p>

      <section class="category">
        <h3>Marketing</h3>
        <div class="job-row">
          <a href="/absolute/job/oNKoAfwf">Business Development Representative, EMEA</a>
          <span class="job-location">Bangalore, India</span>
        </div>
        <div class="job-row">
          <a href="/absolute/job/oIgnore123">Business Development Representative, Enterprise</a>
          <span class="job-location">Remote, United Kingdom</span>
        </div>
      </section>

      <section class="category">
        <h3>Sales</h3>
        <div class="job-row">
          <a href="/absolute/job/o0vpAfwe">Account Executive, India (Government &amp; Education)</a>
          <span class="job-location">Delhi, India</span>
        </div>
      </section>

      <p>Powered by Jobvite</p>
      <p>Absolute provides persistent endpoint security and data risk management solutions for computers, tablets, and smartphones.</p>
    </main>
  </body>
</html>
`

const liveTableBoardHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h2>Open Positions</h2>
      <section>
        <h3 class="h2">Marketing</h3>
        <table class="jv-job-list">
          <tbody>
            <tr>
              <td class="jv-job-list-name">
                <a href="/absolute/job/oNKoAfwf">Business Development Representative, EMEA</a>
              </td>
              <td class="jv-job-list-location">
                Bangalore,
                India
              </td>
            </tr>
            <tr>
              <td class="jv-job-list-name">
                <a href="/absolute/job/ozKoAfw1">Business Development Representative, Enterprise</a>
              </td>
              <td class="jv-job-list-location">
                Remote,
                United Kingdom
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <h3 class="h2">Sales</h3>
        <table class="jv-job-list">
          <tbody>
            <tr>
              <td class="jv-job-list-name">
                <a href="/absolute/job/o0vpAfwe">Account Executive, India (Government &amp; Commercial accounts)</a>
              </td>
              <td class="jv-job-list-location">
                Delhi,
                India
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <p>Powered by Jobvite</p>
      <p>Absolute provides persistent endpoint security and data risk management solutions for computers, tablets, and smartphones.</p>
    </main>
  </body>
</html>
`

const bangaloreDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h2>Business Development Representative, EMEA</h2>
      <p class="job-meta">Marketing Bangalore, India</p>
      <a href="/absolute/job/oNKoAfwf/apply">Apply</a>
      <h3>Description</h3>
      <p>About the team</p>
      <p>Our Business Development team is the vanguard of our business, with Business Development Reps (BDRs) driving interest in Absolute and initiating the sales cycle.</p>
      <p>Previous sales experience (1-3 years preferred) with a proven track record of consistently opening qualified opportunities that lead to revenue.</p>
      <ul>
        <li>Generate and qualify leads, identifying prospects interested in our cybersecurity solutions.</li>
        <li>Prioritize and research prospects, understanding their current IT situation, challenges, and needs.</li>
        <li>Engage prospective clients via phone, email, and social media (LinkedIn) to convey Absolute's unique value propositions.</li>
      </ul>
      <p>Powered by Jobvite</p>
    </main>
  </body>
</html>
`

const delhiDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h2>Account Executive, India (Government &amp; Education)</h2>
      <p class="job-meta">Sales Delhi, India</p>
      <a href="/absolute/job/o0vpAfwe/apply">Apply</a>
      <h3>Description</h3>
      <p>This enterprise sales role supports government and education customers across India.</p>
      <p>Experience selling cybersecurity or enterprise software for 5+ years is preferred.</p>
      <ul>
        <li>Develop public sector and education account plans for India.</li>
        <li>Lead pipeline growth, forecasting, and executive stakeholder communication.</li>
      </ul>
      <p>Powered by Jobvite</p>
    </main>
  </body>
</html>
`

test('Absolute validates the verified official homepage, careers handoff, Jobvite board, and India listings', async () => {
  const absolute = await loadAbsoluteModule()

  assert.ok(
    absolute,
    'Expected Absolute scraper module at ../../scraper/absolute/script.js',
  )

  assert.equal(absolute.SOURCE, 'absolute')
  assert.equal(absolute.COMPANY, 'Absolute')
  assert.equal(absolute.VERIFIED_AT, '2026-07-14')
  assert.equal(absolute.HOMEPAGE_URL, 'https://www.absolute.com/')
  assert.equal(absolute.CAREERS_URL, 'https://www.absolute.com/company/careers/')
  assert.equal(absolute.JOB_BOARD_URL, 'https://jobs.jobvite.com/absolute/')
  assert.equal(
    absolute.DETAIL_URL_PATTERN,
    'https://jobs.jobvite.com/absolute/job/{jobvite_id}',
  )
  assert.equal(absolute.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(absolute.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(absolute.extractJobBoardUrl(careersHtml), absolute.JOB_BOARD_URL)
  assert.equal(absolute.hasOfficialJobBoardSignal(boardHtml), true)

  assert.deepEqual(absolute.extractJobBoardListings(boardHtml), [
    {
      title: 'Business Development Representative, EMEA',
      department: 'Marketing',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      detailUrl: 'https://jobs.jobvite.com/absolute/job/oNKoAfwf',
      jobId: 'oNKoAfwf',
      requisitionId: 'oNKoAfwf',
    },
    {
      title: 'Account Executive, India (Government & Education)',
      department: 'Sales',
      location: 'Delhi, India',
      city: 'Delhi',
      country: 'India',
      detailUrl: 'https://jobs.jobvite.com/absolute/job/o0vpAfwe',
      jobId: 'o0vpAfwe',
      requisitionId: 'o0vpAfwe',
    },
  ])
})

test('Absolute recognizes the current July 25, 2026 homepage shell after the marketing refresh', async () => {
  const absolute = await loadAbsoluteModule()
  assert.ok(absolute)

  assert.equal(absolute.hasOfficialHomepageSignal(currentHomepageHtml), true)
})

test('Absolute extracts India roles from the current Jobvite table layout', async () => {
  const absolute = await loadAbsoluteModule()
  assert.ok(absolute)

  assert.equal(absolute.hasOfficialJobBoardSignal(liveTableBoardHtml), true)
  assert.deepEqual(absolute.extractJobBoardListings(liveTableBoardHtml), [
    {
      title: 'Business Development Representative, EMEA',
      department: 'Marketing',
      location: 'Bangalore, India',
      city: 'Bangalore',
      country: 'India',
      detailUrl: 'https://jobs.jobvite.com/absolute/job/oNKoAfwf',
      jobId: 'oNKoAfwf',
      requisitionId: 'oNKoAfwf',
    },
    {
      title: 'Account Executive, India (Government & Commercial accounts)',
      department: 'Sales',
      location: 'Delhi, India',
      city: 'Delhi',
      country: 'India',
      detailUrl: 'https://jobs.jobvite.com/absolute/job/o0vpAfwe',
      jobId: 'o0vpAfwe',
      requisitionId: 'o0vpAfwe',
    },
  ])
})

test('Absolute extracts Jobvite detail pages into the shared job shape', async () => {
  const absolute = await loadAbsoluteModule()
  assert.ok(absolute)

  const listing = absolute.extractJobBoardListings(boardHtml)[0]
  const detail = absolute.extractJobDetail(bangaloreDetailHtml, listing)

  assert.deepEqual(detail, {
    title: 'Business Development Representative, EMEA',
    company: 'Absolute',
    department: 'Marketing',
    location: 'Bangalore, India',
    city: 'Bangalore',
    country: 'India',
    jobId: 'oNKoAfwf',
    requisitionId: 'oNKoAfwf',
    sourceUrl: 'https://jobs.jobvite.com/absolute/job/oNKoAfwf',
    applyUrl: 'https://jobs.jobvite.com/absolute/job/oNKoAfwf',
    employmentType: null,
    experienceRequired: '1-3 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [
      'Generate and qualify leads, identifying prospects interested in our cybersecurity solutions.',
      'Prioritize and research prospects, understanding their current IT situation, challenges, and needs.',
      "Engage prospective clients via phone, email, and social media (LinkedIn) to convey Absolute's unique value propositions.",
    ],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'About the team Our Business Development team is the vanguard of our business, with Business Development Reps (BDRs) driving interest in Absolute and initiating the sales cycle. Previous sales experience (1-3 years preferred) with a proven track record of consistently opening qualified opportunities that lead to revenue. Generate and qualify leads, identifying prospects interested in our cybersecurity solutions. Prioritize and research prospects, understanding their current IT situation, challenges, and needs. Engage prospective clients via phone, email, and social media (LinkedIn) to convey Absolute\'s unique value propositions.',
  })
})

test('Absolute run validates the verified first-party careers surface and returns only India Jobvite roles', async () => {
  const absolute = await loadAbsoluteModule()
  assert.ok(absolute)

  const requestedUrls = []
  const jobs = await absolute.createAbsoluteScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === absolute.HOMEPAGE_URL) return homepageHtml
      if (url === absolute.CAREERS_URL) return careersHtml
      if (url === absolute.JOB_BOARD_URL) return boardHtml
      if (url === 'https://jobs.jobvite.com/absolute/job/oNKoAfwf') return bangaloreDetailHtml
      if (url === 'https://jobs.jobvite.com/absolute/job/o0vpAfwe') return delhiDetailHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    absolute.HOMEPAGE_URL,
    absolute.CAREERS_URL,
    absolute.JOB_BOARD_URL,
    'https://jobs.jobvite.com/absolute/job/oNKoAfwf',
    'https://jobs.jobvite.com/absolute/job/o0vpAfwe',
  ])

  assert.equal(jobs.length, 2)
  assert.deepEqual(
    jobs.map((job) => [job.title, job.department, job.city, job.source, job.link, job.scrapedAt]),
    [
      [
        'Business Development Representative, EMEA',
        'Marketing',
        'Bangalore',
        'absolute',
        'https://jobs.jobvite.com/absolute/job/oNKoAfwf',
        FIXED_SCRAPED_AT,
      ],
      [
        'Account Executive, India (Government & Education)',
        'Sales',
        'Delhi',
        'absolute',
        'https://jobs.jobvite.com/absolute/job/o0vpAfwe',
        FIXED_SCRAPED_AT,
      ],
    ],
  )
  assert.equal(jobs[1].experienceRequired, '5+ years')
})

test('Absolute default fetches are bounded with abort signals', async () => {
  const absolute = await loadAbsoluteModule()
  assert.ok(absolute)

  const originalFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), signal: init.signal })

    if (url === absolute.HOMEPAGE_URL) {
      return { ok: true, status: 200, text: async () => homepageHtml }
    }
    if (url === absolute.CAREERS_URL) {
      return { ok: true, status: 200, text: async () => careersHtml }
    }
    if (url === absolute.JOB_BOARD_URL) {
      return { ok: true, status: 200, text: async () => boardHtml }
    }
    if (url === 'https://jobs.jobvite.com/absolute/job/oNKoAfwf') {
      return { ok: true, status: 200, text: async () => bangaloreDetailHtml }
    }
    if (url === 'https://jobs.jobvite.com/absolute/job/o0vpAfwe') {
      return { ok: true, status: 200, text: async () => delhiDetailHtml }
    }

    assert.fail(`Unexpected URL: ${url}`)
  }

  try {
    const jobs = await absolute.createAbsoluteScraper({
      now: () => FIXED_SCRAPED_AT,
    }).run()

    assert.equal(jobs.length, 2)
    assert.ok(requests.every((request) => request.signal), 'each fetch should include an abort signal')
    assert.ok(requests.every((request) => typeof request.signal.aborted === 'boolean'))
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Absolute fails closed when the official homepage, careers handoff, or Jobvite board drifts', async () => {
  const absolute = await loadAbsoluteModule()
  assert.ok(absolute)

  await assert.rejects(
    absolute.createAbsoluteScraper().run({
      fetchText: async () => '<html><body><h1>Absolute</h1></body></html>',
    }),
    /official homepage/i,
  )

  await assert.rejects(
    absolute.createAbsoluteScraper().run({
      fetchText: async (url) => {
        if (url === absolute.HOMEPAGE_URL) return homepageHtml
        if (url === absolute.CAREERS_URL) {
          return careersHtml.replace('https://jobs.jobvite.com/absolute/', 'https://example.com/jobs')
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /careers handoff/i,
  )

  await assert.rejects(
    absolute.createAbsoluteScraper().run({
      fetchText: async (url) => {
        if (url === absolute.HOMEPAGE_URL) return homepageHtml
        if (url === absolute.CAREERS_URL) return careersHtml
        if (url === absolute.JOB_BOARD_URL) return '<html><body><h1>Jobs</h1></body></html>'

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /Jobvite board/i,
  )
})
