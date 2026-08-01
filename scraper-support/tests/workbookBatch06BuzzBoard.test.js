import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_CAREERS_HTML = `
  <html>
    <head>
      <title>Careers at BuzzBoard: The Future of Autonomous Marketing Services</title>
      <link rel="canonical" href="https://www.buzzboard.ai/careers/">
    </head>
    <body>
      <main>
        <p>Careers</p>
        <h1>Join the future of autonomous digital marketing</h1>
        <a href="#open-positions">View open positions</a>
        <h2>Why work at BuzzBoard</h2>
        <section id="open-positions">
          <h2>Open Positions</h2>
          <article>
            <h3>Associate Product Manager / Product Manager</h3>
            <p>Remote - Full Time</p>
            <a href="https://buzzboard.applytojob.com/apply/jobs/details/KHFbeOLhcc">Apply</a>
          </article>
          <article>
            <h3>Software Engineer (Node JS Developer)</h3>
            <p>Remote - Full Time</p>
            <a href="https://buzzboard.applytojob.com/apply/zZ5VZq3ojD/Software-Engineer-Node-JS-Developer">Apply</a>
          </article>
        </section>
        <section>
          <h3>Current opportunities</h3>
          <p>Ready to innovate with us?</p>
          <p>Join our team</p>
        </section>
        <section>
          <h3>Our Address</h3>
          <p>345 California St., Suite 600</p>
        </section>
      </main>
    </body>
  </html>
`

const VERIFIED_BOARD_HTML = `
  <html>
    <head>
      <title>BuzzBoard - Career Page</title>
    </head>
    <body>
      <a href="https://www.buzzboard.com">View Our Website</a>
      <p>Thanks for visiting our Career Page.</p>
      <h2>Current Openings</h2>
      <ul>
        <li>
          <h3>
            <a href="https://buzzboard.applytojob.com/apply/jobs/details/KHFbeOLhcc">
              Associate Product Manager / Product Manager
            </a>
          </h3>
          <p>Remote</p>
          <p>Full Time</p>
        </li>
      </ul>
      <p>Powered by JazzHR</p>
    </body>
  </html>
`

const VERIFIED_PRODUCT_MANAGER_DETAIL_HTML = `
  <html>
    <body>
      <main>
        <h2>BuzzBoard</h2>
        <h1>Associate Product Manager / Product Manager</h1>
        <p>Remote - Full Time</p>
        <p>Product Manager/Associate Product Manager</p>
        <p>
          About Us: At BuzzBoard, we are growing and building AI-driven products.
          Job Description: As a Product Manager at BuzzBoard, you will own one or
          more product lines and collaborate across engineering and design.
          Experience: 4+ years
        </p>
        <p>Current CTC?</p>
        <p>Expected CTC?</p>
        <p>Notice Period?</p>
        <p>Apply for this position</p>
        <p>Powered by JazzHR</p>
      </main>
    </body>
  </html>
`

const VERIFIED_NODE_DETAIL_HTML = `
  <html>
    <body>
      <main>
        <h2>BuzzBoard</h2>
        <h1>Software Engineer (Node JS Developer)</h1>
        <p>Remote</p>
        <p>Full Time</p>
        <p>
          Job Summary: We are seeking a skilled Node.js developer to build robust
          microservices and APIs. Minimum 5 Years
        </p>
        <p>Current Annual CTC?</p>
        <p>Notice Period?</p>
        <p>Apply for this position</p>
        <p>Powered by JazzHR</p>
      </main>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/buzzboard/script.js')
  } catch {
    assert.fail('Expected BuzzBoard scraper module at ../../scraper/buzzboard/script.js')
  }
}

test('BuzzBoard validates the verified first-party careers surface and extracts public openings from the official page', async () => {
  const buzzboard = await loadModule()
  const listings = buzzboard.extractOfficialOpenings(VERIFIED_CAREERS_HTML)
  const detail = buzzboard.extractJobDetail(VERIFIED_PRODUCT_MANAGER_DETAIL_HTML, listings[0])

  assert.equal(buzzboard.SOURCE, 'buzzboard')
  assert.equal(buzzboard.COMPANY, 'BuzzBoard')
  assert.equal(buzzboard.OFFICIAL_BRAND, 'BuzzBoard')
  assert.equal(buzzboard.VERIFIED_ON, '2026-07-25')
  assert.equal(buzzboard.CAREERS_URL, 'https://www.buzzboard.ai/careers/')
  assert.equal(buzzboard.BOARD_URL, 'https://buzzboard.applytojob.com/apply')
  assert.equal(
    buzzboard.DISPOSITION,
    'verified-first-party-careers-page-plus-public-jazzhr-board',
  )
  assert.match(buzzboard.VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.match(buzzboard.VERIFIED_SURFACE_SUMMARY, /buzzboard\.applytojob\.com\/apply/i)
  assert.match(
    buzzboard.VERIFIED_SURFACE_SUMMARY,
    /Associate Product Manager \/ Product Manager/i,
  )
  assert.equal(buzzboard.hasOfficialCareersPageSignal(VERIFIED_CAREERS_HTML), true)
  assert.deepEqual(buzzboard.extractOfficialApplyUrls(VERIFIED_CAREERS_HTML), [
    'https://buzzboard.applytojob.com/apply/jobs/details/KHFbeOLhcc',
    'https://buzzboard.applytojob.com/apply/zZ5VZq3ojD/Software-Engineer-Node-JS-Developer',
  ])
  assert.equal(buzzboard.hasVerifiedBoardSignal(VERIFIED_BOARD_HTML), true)
  assert.equal(listings.length, 2)
  assert.deepEqual(
    {
      ...listings[0],
      ...Object.fromEntries(
        Object.entries(detail).filter(([, value]) => value != null),
      ),
    },
    {
      title: 'Associate Product Manager / Product Manager',
      company: 'BuzzBoard',
      department: null,
      location: 'Remote, India',
      city: null,
      country: 'India',
      jobId: 'KHFbeOLhcc',
      requisitionId: 'KHFbeOLhcc',
      sourceUrl: 'https://buzzboard.applytojob.com/apply/jobs/details/KHFbeOLhcc',
      applyUrl: 'https://buzzboard.applytojob.com/apply/jobs/details/KHFbeOLhcc',
      employmentType: 'Full-time',
      experienceRequired: '4+ years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: "At BuzzBoard, we are growing and building AI-driven products. Job Description: As a Product Manager at BuzzBoard, you will own one or more product lines and collaborate across engineering and design. Experience: 4+ years",
      remoteStatus: 'Remote',
    },
  )
})

test('BuzzBoard run validates the official careers handoff and returns public openings', async () => {
  const buzzboard = await loadModule()
  const requestedUrls = []

  const jobs = await buzzboard.createBuzzBoardScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === buzzboard.CAREERS_URL) return VERIFIED_CAREERS_HTML
      if (url === buzzboard.BOARD_URL) return VERIFIED_BOARD_HTML
      if (url === 'https://buzzboard.applytojob.com/apply/jobs/details/KHFbeOLhcc') {
        return VERIFIED_PRODUCT_MANAGER_DETAIL_HTML
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(
    requestedUrls,
    [
      buzzboard.CAREERS_URL,
      buzzboard.BOARD_URL,
      'https://buzzboard.applytojob.com/apply/jobs/details/KHFbeOLhcc',
    ],
  )
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'buzzboard')
  assert.equal(jobs[0].company, 'BuzzBoard')
  assert.equal(jobs[0].location, 'Remote, India')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].experienceRequired, '4+ years')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-25T00:00:00.000Z')
})

test('BuzzBoard run keeps conservative listing data when JazzHR detail enrichment fails', async () => {
  const buzzboard = await loadModule()
  const requestedUrls = []

  const jobs = await buzzboard.createBuzzBoardScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === buzzboard.CAREERS_URL) return VERIFIED_CAREERS_HTML
      if (url === buzzboard.BOARD_URL) return VERIFIED_BOARD_HTML
      if (url === 'https://buzzboard.applytojob.com/apply/jobs/details/KHFbeOLhcc') {
        throw new Error(`HTTP 429 for ${url}`)
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-25T00:00:00.000Z',
  })

  assert.deepEqual(
    requestedUrls,
    [
      buzzboard.CAREERS_URL,
      buzzboard.BOARD_URL,
      'https://buzzboard.applytojob.com/apply/jobs/details/KHFbeOLhcc',
    ],
  )
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Associate Product Manager / Product Manager')
  assert.equal(jobs[0].location, 'Remote, India')
  assert.equal(jobs[0].jobDescription, null)
  assert.equal(jobs[0].experienceRequired, null)
  assert.equal(jobs[0].source, 'buzzboard')
})

test('BuzzBoard fails closed when the official careers surface or JazzHR board drifts', async () => {
  const buzzboard = await loadModule()

  await assert.rejects(
    buzzboard.createBuzzBoardScraper().run({
      fetchText: async (url) => {
        if (url === buzzboard.CAREERS_URL) {
          return `
            <html>
              <head>
                <title>Careers</title>
              </head>
              <body>
                <main>
                  <h1>Work with us</h1>
                  <p>Explore roles.</p>
                </main>
              </body>
            </html>
          `
        }

        return VERIFIED_BOARD_HTML
      },
    }),
    /official careers page changed materially/i,
  )

  await assert.rejects(
    buzzboard.createBuzzBoardScraper().run({
      fetchText: async (url) => {
        if (url === buzzboard.CAREERS_URL) return VERIFIED_CAREERS_HTML
        if (url === buzzboard.BOARD_URL) {
          return VERIFIED_BOARD_HTML.replace('Powered by JazzHR', 'Powered by Something Else')
        }

        return VERIFIED_PRODUCT_MANAGER_DETAIL_HTML
      },
    }),
    /public JazzHR board changed materially/i,
  )

  await assert.rejects(
    buzzboard.createBuzzBoardScraper().run({
      fetchText: async (url) => {
        if (url === buzzboard.CAREERS_URL) {
          return VERIFIED_CAREERS_HTML.replace(
            'https://buzzboard.applytojob.com/apply/jobs/details/KHFbeOLhcc',
            'https://example.com/apply/KHFbeOLhcc',
          )
        }

        if (url === buzzboard.BOARD_URL) return VERIFIED_BOARD_HTML
        return VERIFIED_PRODUCT_MANAGER_DETAIL_HTML
      },
    }),
    /official careers page changed materially/i,
  )
})
