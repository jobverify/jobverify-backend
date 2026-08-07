import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Official website of Garden Reach Shipbuilders & Engineers Limited</title>
    </head>
    <body>
      <nav>
        <a href="career/">Careers</a>
      </nav>
      <main>
        <h1>WELCOME TO THE OFFICIAL WEBSITE OF GARDEN REACH SHIPBUILDERS & ENGINEERS LIMITED</h1>
        <h2>LATEST</h2>
        <a href="https://jobapply.in/grse2025">Apply online</a>
      </main>
    </body>
  </html>
`

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>
        Careers - Official website of Garden Reach Shipbuilders and Engineers
        Limited - A Government of India undertaking, Ministry of Defence
      </title>
    </head>
    <body>
      <main>
        <h1>Current Job Openings</h1>
        <section>
          <h2>Engagement of Apprentices and Trainee</h2>
          <h2>Other Positions</h2>

          <div>1. RECRUITMENT OF OFFICERS [EMPLOYMENT NOTIFICATION -2026/03(O)]</div>
          <div>Executive Director (Technical)</div>
          <div>Opening date for Online Registration : 09 Mar 2026 (14:00 Hrs.)</div>
          <div>Closing date for Online Registration : 29 Mar 2026 (23:59 Hrs.)</div>
          <div>Last date for online submission of application is extended upto 31st March 2026.</div>
          <a href="https://jobapply.in/grse2026">APPLY ONLINE</a>

          <div>2. RECRUITMENT OF OFFICERS [EMPLOYMENT NOTIFICATION -2025/08(O)]</div>
          <div>Assistant Manager (Technical)</div>
          <div>Opening date for Online Registration : 19 Dec 2025 (14:00 Hrs.)</div>
          <div>Closing date for Online Registration : 09 Jan 2026 (23:59 Hrs.)</div>
          <a href="https://jobapply.in/grse2025">APPLY ONLINE</a>

          <div>3. ENGAGEMENT OF EXPERT / SPECIALIST (ON CONTRACT BASIS) [EMPLOYMENT NOTIFICATION -2025/09(E)]</div>
          <div>Expert / Specialist (Technical)</div>
          <div>Opening date for Online Registration : 11 Dec 2025 (from 14:00 Hrs.)</div>
          <div>Closing date for Online Registration : 31 Dec 2025 (upto 23:59 Hrs.)</div>
          <a href="https://jobapply.in/grse2025">APPLY ONLINE</a>
        </section>
      </main>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/gardenreachshipbuilders/script.js')
  } catch {
    assert.fail('Expected Garden Reach Shipbuilders scraper module at ../../scraper/gardenreachshipbuilders/script.js')
  }
}

test('Garden Reach Shipbuilders accepts the current official homepage and careers surface signals', async () => {
  const gardenReachShipbuilders = await loadModule()

  assert.equal(gardenReachShipbuilders.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(gardenReachShipbuilders.hasOfficialCareersSignal(careersHtml), true)
})

test('Garden Reach Shipbuilders keeps historical notifications but returns no active openings after August 2, 2026', async () => {
  const gardenReachShipbuilders = await loadModule()

  assert.deepEqual(gardenReachShipbuilders.extractNotifications(careersHtml), [
    {
      title: 'RECRUITMENT OF OFFICERS',
      notificationId: '2026/03(O)',
      sourceUrl: 'https://www.grse.in/career/',
      applyUrl: 'https://jobapply.in/grse2026',
      openingDate: '2026-03-09T00:00:00.000Z',
      closingDate: '2026-03-29T00:00:00.000Z',
      effectiveClosingDate: '2026-03-31T00:00:00.000Z',
      roleSummary: ['Executive Director (Technical)'],
    },
    {
      title: 'RECRUITMENT OF OFFICERS',
      notificationId: '2025/08(O)',
      sourceUrl: 'https://www.grse.in/career/',
      applyUrl: 'https://jobapply.in/grse2025',
      openingDate: '2025-12-19T00:00:00.000Z',
      closingDate: '2026-01-09T00:00:00.000Z',
      effectiveClosingDate: '2026-01-09T00:00:00.000Z',
      roleSummary: ['Assistant Manager (Technical)'],
    },
    {
      title: 'ENGAGEMENT OF EXPERT / SPECIALIST (ON CONTRACT BASIS)',
      notificationId: '2025/09(E)',
      sourceUrl: 'https://www.grse.in/career/',
      applyUrl: 'https://jobapply.in/grse2025',
      openingDate: '2025-12-11T00:00:00.000Z',
      closingDate: '2025-12-31T00:00:00.000Z',
      effectiveClosingDate: '2025-12-31T00:00:00.000Z',
      roleSummary: ['Expert / Specialist (Technical)'],
    },
  ])

  assert.deepEqual(
    gardenReachShipbuilders.extractActiveOpenings(careersHtml, { asOfDate: '2026-08-02' }),
    [],
  )
})
