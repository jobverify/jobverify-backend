import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-15T00:00:00.000Z'

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Official website of Garden Reach Shipbuilders &amp; Engineers Limited</title>
  </head>
  <body>
    <main>
      <h2>GARDEN REACH SHIPBUILDERS &amp; ENGINEERS LIMITED</h2>
      <h3>A GOVERNMENT OF INDIA UNDERTAKING - MINISTRY OF DEFENCE</h3>
      <a href="https://www.grse.in/career/">Careers</a>
      <h2>WELCOME TO THE OFFICIAL WEBSITE OF GARDEN REACH SHIPBUILDERS &amp; ENGINEERS LIMITED</h2>
      <h3>LATEST</h3>
      <a href="https://www.grse.in/career/">Employment Notification No. 2026/03(O)</a>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Official website of Garden Reach Shipbuilders and Engineers Limited - A Government of India undertaking, Ministry of Defence</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>Current Job Openings</p>
      <p>Engagement of Apprentices and Trainee</p>
      <p>Other Positions</p>

      <section class="notice">
        <p>1. RECRUITMENT OF OFFICERS [EMPLOYMENT NOTIFICATION -2026/03(O)]</p>
        <a href="/documents/2026-03-o-detailed.pdf">GRSE Employment Notification No. 2026/03(O) (Detailed Notification)</a>
        <p>Opening date for Online Registration : 09 Mar 2026 (14:00 Hrs.)</p>
        <p>Closing date for Online Registration : 29 Mar 2026 (23:59 Hrs.)</p>
        <p>Last date for online submission of application is extended upto 31st March 2026.</p>
        <a href="https://jobapply.in/grse2026/">APPLY ONLINE (URL)</a>
        <a href="https://jobapply.in/grse2026/">CORRIGENDUM - I (URL)</a>
        <p>EXECUTIVE DIRECTOR (TECHNICAL)</p>
        <p>ADDITIONAL GENERAL MANAGER (TECHNICAL)</p>
        <p>GENERAL MANAGER (TECHNICAL)</p>
        <p>GENERAL MANAGER (TECHNICAL - COMMERCIAL)</p>
        <p>Keep checking this webpage https://jobapply.in/grse2026/ website regularly for any Corrigendum/Addendum/Updates/Information related to engagement process.</p>
      </section>

      <section class="notice">
        <p>2. RECRUITMENT OF OFFICERS [EMPLOYMENT NOTIFICATION -2025/08(O)]</p>
        <a href="/documents/2025-08-o-detailed.pdf">GRSE Employment Notification No. 2025/08(O) (Detailed Notification)</a>
        <p>Opening date for Online Registration : 19 Dec 2025 (14:00 Hrs.)</p>
        <p>Closing date for Online Registration : 09 Jan 2026 (23:59 Hrs.)</p>
        <a href="https://jobapply.in/grse2025/">APPLY ONLINE (URL)</a>
        <p>DEPUTY GENERAL MANAGER (TECHNICAL)</p>
        <p>DEPUTY MANAGER (LEGAL)</p>
        <p>MANAGER (IT)</p>
        <p>Junior Manager (E-0)-Technical-Hull</p>
        <p>Keep checking this webpage https://jobapply.in/grse2025/ website regularly for any Corrigendum/Addendum/Updates/Information related to engagement process.</p>
      </section>

      <section class="notice">
        <p>3. ENGAGEMENT OF EXPERT / SPECIALIST (ON CONTRACT BASIS) [EMPLOYMENT NOTIFICATION -2025/09(E)]</p>
        <a href="/documents/2025-09-e-detailed.pdf">GRSE Employment Notification No. 2025/09(E) (Detailed Notification)</a>
        <p>Opening date for Online Registration : 11 Dec 2025 (from 14:00 Hrs.)</p>
        <p>Closing date for Online Registration : 31 Dec 2025 (upto 23:59 Hrs.)</p>
        <a href="https://jobapply.in/grse2025/">APPLY ONLINE (URL)</a>
        <p>Keep checking this webpage https://jobapply.in/grse2025/ website regularly for any Corrigendum/Addendum/Updates/Information related to engagement process.</p>
      </section>
    </main>
  </body>
</html>
`

const loadGardenReachShipbuildersModule = async () => {
  try {
    return await import('../../scraper/gardenreachshipbuilders/script.js')
  } catch {
    assert.fail('Expected Garden Reach Shipbuilders scraper module at ../../scraper/gardenreachshipbuilders/script.js')
  }
}

test('Garden Reach Shipbuilders scraper constants and helpers stay pinned to the verified first-party careers contract', async () => {
  const grse = await loadGardenReachShipbuildersModule()

  assert.equal(grse.SOURCE, 'gardenreachshipbuilders')
  assert.equal(grse.COMPANY, 'Garden Reach Shipbuilders')
  assert.equal(grse.OFFICIAL_BRAND_NAME, 'Garden Reach Shipbuilders & Engineers Limited')
  assert.equal(grse.VERIFIED_ON, '2026-07-15')
  assert.equal(grse.HOMEPAGE_URL, 'https://www.grse.in/')
  assert.equal(grse.CAREERS_URL, 'https://www.grse.in/career/')
  assert.deepEqual(grse.VERIFIED_APPLY_PORTAL_URLS, [
    'https://jobapply.in/grse2026/',
    'https://jobapply.in/grse2025/',
  ])
  assert.equal(grse.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(grse.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(grse.extractNotifications(careersHtml), [
    {
      title: 'RECRUITMENT OF OFFICERS',
      notificationId: '2026/03(O)',
      sourceUrl: 'https://www.grse.in/career/',
      applyUrl: 'https://jobapply.in/grse2026/',
      openingDate: '2026-03-09T00:00:00.000Z',
      closingDate: '2026-03-29T00:00:00.000Z',
      effectiveClosingDate: '2026-03-31T00:00:00.000Z',
      roleSummary: [
        'EXECUTIVE DIRECTOR (TECHNICAL)',
        'ADDITIONAL GENERAL MANAGER (TECHNICAL)',
        'GENERAL MANAGER (TECHNICAL)',
        'GENERAL MANAGER (TECHNICAL - COMMERCIAL)',
      ],
    },
    {
      title: 'RECRUITMENT OF OFFICERS',
      notificationId: '2025/08(O)',
      sourceUrl: 'https://www.grse.in/career/',
      applyUrl: 'https://jobapply.in/grse2025/',
      openingDate: '2025-12-19T00:00:00.000Z',
      closingDate: '2026-01-09T00:00:00.000Z',
      effectiveClosingDate: '2026-01-09T00:00:00.000Z',
      roleSummary: [
        'DEPUTY GENERAL MANAGER (TECHNICAL)',
        'DEPUTY MANAGER (LEGAL)',
        'MANAGER (IT)',
        'Junior Manager (E-0)-Technical-Hull',
      ],
    },
    {
      title: 'ENGAGEMENT OF EXPERT / SPECIALIST (ON CONTRACT BASIS)',
      notificationId: '2025/09(E)',
      sourceUrl: 'https://www.grse.in/career/',
      applyUrl: 'https://jobapply.in/grse2025/',
      openingDate: '2025-12-11T00:00:00.000Z',
      closingDate: '2025-12-31T00:00:00.000Z',
      effectiveClosingDate: '2025-12-31T00:00:00.000Z',
      roleSummary: [],
    },
  ])
})

test('Garden Reach Shipbuilders extracts active recruitment notices and filters them out once their closing dates pass', async () => {
  const grse = await loadGardenReachShipbuildersModule()

  assert.deepEqual(
    grse.extractActiveOpenings(careersHtml, { asOfDate: '2026-03-10' }),
    [{
      title: 'RECRUITMENT OF OFFICERS [Employment Notification 2026/03(O)]',
      company: 'Garden Reach Shipbuilders',
      department: null,
      location: 'India',
      city: null,
      state: null,
      country: 'India',
      jobId: 'gardenreachshipbuilders-2026-03-o',
      requisitionId: '2026/03(O)',
      sourceUrl: 'https://www.grse.in/career/',
      applyUrl: 'https://jobapply.in/grse2026/',
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2026-03-09T00:00:00.000Z',
      closingDate: '2026-03-31T00:00:00.000Z',
      jobDescription: 'Official GRSE recruitment notice. Roles on the verified public surface: EXECUTIVE DIRECTOR (TECHNICAL); ADDITIONAL GENERAL MANAGER (TECHNICAL); GENERAL MANAGER (TECHNICAL); GENERAL MANAGER (TECHNICAL - COMMERCIAL).',
      remoteStatus: 'On-site',
    }],
  )

  assert.deepEqual(
    grse.extractActiveOpenings(careersHtml, { asOfDate: '2026-07-15' }),
    [],
  )
})

test('run verifies the official GRSE homepage and careers surface, then returns no active public openings on 2026-07-15', async () => {
  const grse = await loadGardenReachShipbuildersModule()
  const requestedUrls = []

  const jobs = await grse.createGardenReachShipbuildersScraper({
    now: () => FIXED_SCRAPED_AT,
    asOfDate: '2026-07-15',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === grse.HOMEPAGE_URL) return homepageHtml
      if (url === grse.CAREERS_URL) return careersHtml
      throw new Error(`Unexpected Garden Reach Shipbuilders URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.grse.in/',
    'https://www.grse.in/career/',
  ])
  assert.deepEqual(jobs, [])
})

test('Garden Reach Shipbuilders fails closed when the verified homepage or careers contract drifts', async () => {
  const grse = await loadGardenReachShipbuildersModule()

  await assert.rejects(
    grse.createGardenReachShipbuildersScraper({ asOfDate: '2026-07-15' }).run({
      fetchText: async (url) => {
        if (url === grse.HOMEPAGE_URL) {
          return '<html><body><h1>Placeholder</h1></body></html>'
        }

        throw new Error(`Unexpected Garden Reach Shipbuilders URL: ${url}`)
      },
    }),
    /homepage/i,
  )

  await assert.rejects(
    grse.createGardenReachShipbuildersScraper({ asOfDate: '2026-07-15' }).run({
      fetchText: async (url) => {
        if (url === grse.HOMEPAGE_URL) return homepageHtml
        if (url === grse.CAREERS_URL) {
          return careersHtml.replace('Current Job Openings', 'Opportunities')
        }

        throw new Error(`Unexpected Garden Reach Shipbuilders URL: ${url}`)
      },
    }),
    /careers/i,
  )
})
