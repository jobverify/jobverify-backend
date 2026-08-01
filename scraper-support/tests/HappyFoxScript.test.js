import assert from 'node:assert/strict'
import test from 'node:test'

const jobsHubHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>HappyFox Job Opportunities - HappyFox Careers</title>
  </head>
  <body>
    <h1>Join Us In Spreading the Happy-ness</h1>
    <a href="/jobs/chennai/">Chennai</a>
    <a href="/jobs/bengaluru/">Bengaluru</a>
    <a href="/jobs/hyderabad/">Hyderabad</a>
    <a href="/jobs/us/">Open positions in the USA</a>
    <p>Open positions in India</p>
  </body>
</html>
`

const bengaluruListingsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Open Positions</h1>
    <section>
      <h2>engineering</h2>
      <h3>Frontend Engineer</h3>
      <p>Bengaluru full time</p>
      <a href="https://happyfox.hire.trakstar.com/jobs/fk0xixf">Apply</a>
      <h3>Backend Engineer (Python)</h3>
      <p>Bengaluru full time</p>
      <a href="https://happyfox.hire.trakstar.com/jobs/fk0xix1">Apply</a>
    </section>
    <section>
      <h2>sales</h2>
      <h3>Senior Sales Engineer</h3>
      <p>Bengaluru full time</p>
      <a href="https://happyfox.hire.trakstar.com/jobs/fk0sales1">Apply</a>
    </section>
  </body>
</html>
`

const chennaiListingsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Open Positions</h1>
    <section>
      <h2>engineering</h2>
      <h3>Technical Lead - Backend</h3>
      <p>Chennai full time</p>
      <a href="https://happyfox.hire.trakstar.com/jobs/fk0lead1">Apply</a>
    </section>
  </body>
</html>
`

const hyderabadListingsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Open Positions</h1>
    <section>
      <h2>marketing</h2>
      <h3>Product Marketing Manager</h3>
      <p>Hyderabad full time</p>
      <a href="https://happyfox.hire.trakstar.com/jobs/fk0market1">Apply</a>
    </section>
  </body>
</html>
`

const frontendDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Frontend Engineer</h1>
    <p>Bengaluru, Karnataka, India | Engineering | Full-time</p>
    <p>We’re looking for an experienced Frontend Engineer to join our growing engineering team to help build and maintain HappyFox’s product offerings.</p>
    <ul>
      <li>You will implement product features writing clean, robust, reusable code with tests.</li>
      <li>You have at least 3 years of relevant professional experience in building web applications with javascript frameworks like Ember.js or React.js.</li>
    </ul>
    <h2>Application Form</h2>
  </body>
</html>
`

const backendDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Backend Engineer (Python)</h1>
    <p>Bengaluru, Karnataka, India | Engineering | Full-time</p>
    <p>We’re looking for an experienced Backend Engineer to join our growing team of engineers.</p>
    <ul>
      <li>At least 3 years of relevant professional experience.</li>
      <li>Sound knowledge of programming languages like Python.</li>
    </ul>
    <h2>Application Form</h2>
  </body>
</html>
`

const leadDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Technical Lead - Backend</h1>
    <p>Chennai, Tamil Nadu, India | Engineering | Full-time</p>
    <p>We’re looking for a Lead Backend Engineer with 5+ years of experience in building web services to join our engineering team.</p>
    <ul>
      <li>Lead a team of engineers working on our product roadmap.</li>
    </ul>
    <h2>Application Form</h2>
  </body>
</html>
`

const marketingDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Product Marketing Manager</h1>
    <p>Hyderabad, Telangana, India | Marketing | Full-time</p>
    <p>Help position HappyFox products and launches for enterprise customers.</p>
    <h2>Application Form</h2>
  </body>
</html>
`

const salesDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Senior Sales Engineer</h1>
    <p>Bengaluru, Karnataka, India | Sales | Full-time</p>
    <p>Support enterprise sales conversations for HappyFox products.</p>
    <h2>Application Form</h2>
  </body>
</html>
`

const loadHappyFoxModule = async () => {
  try {
    return await import('../../scraper/happyfox/script.js')
  } catch {
    assert.fail('Expected HappyFox scraper module at ../../scraper/happyfox/script.js')
  }
}

test('HappyFox verifies the first-party jobs hub, India city pages, and Trakstar handoff constants', async () => {
  const happyFox = await loadHappyFoxModule()

  assert.equal(happyFox.JOBS_HUB_URL, 'https://www.happyfox.com/jobs/')
  assert.deepEqual(happyFox.INDIA_CITY_PAGE_URLS, [
    'https://www.happyfox.com/jobs/chennai/',
    'https://www.happyfox.com/jobs/bengaluru/',
    'https://www.happyfox.com/jobs/hyderabad/',
  ])
  assert.equal(happyFox.TRAKSTAR_JOBS_HOST, 'https://happyfox.hire.trakstar.com')
  assert.equal(happyFox.hasOfficialJobsHubSignal(jobsHubHtml), true)
  assert.deepEqual(happyFox.extractIndiaCityPageUrls(jobsHubHtml), happyFox.INDIA_CITY_PAGE_URLS)
  assert.equal(happyFox.hasCityListingSignal(bengaluruListingsHtml), true)
  assert.equal(happyFox.hasTrakstarJobSignal(frontendDetailHtml), true)
})

test('HappyFox extracts India roles from city pages and enriches them from Trakstar detail pages', async () => {
  const happyFox = await loadHappyFoxModule()

  const listings = happyFox.extractListingCards(bengaluruListingsHtml, 'https://www.happyfox.com/jobs/bengaluru/')
  assert.equal(listings.length, 3)
  assert.deepEqual(
    listings.map((listing) => ({
      title: listing.title,
      detailUrl: listing.detailUrl,
      locationHint: listing.locationHint,
    })),
    [
      {
        title: 'Frontend Engineer',
        detailUrl: 'https://happyfox.hire.trakstar.com/jobs/fk0xixf',
        locationHint: 'Bengaluru full time',
      },
      {
        title: 'Backend Engineer (Python)',
        detailUrl: 'https://happyfox.hire.trakstar.com/jobs/fk0xix1',
        locationHint: 'Bengaluru full time',
      },
      {
        title: 'Senior Sales Engineer',
        detailUrl: 'https://happyfox.hire.trakstar.com/jobs/fk0sales1',
        locationHint: 'Bengaluru full time',
      },
    ],
  )

  const job = happyFox.extractJobDetail(frontendDetailHtml, listings[0])
  assert.deepEqual(job, {
    title: 'Frontend Engineer',
    company: 'HappyFox',
    department: 'Engineering',
    location: 'Bengaluru, Karnataka, India',
    city: 'Bengaluru',
    country: 'India',
    jobId: 'fk0xixf',
    requisitionId: 'fk0xixf',
    sourceUrl: 'https://happyfox.hire.trakstar.com/jobs/fk0xixf',
    applyUrl: 'https://happyfox.hire.trakstar.com/jobs/fk0xixf',
    employmentType: 'Full-time',
    experienceRequired: '3 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'We’re looking for an experienced Frontend Engineer to join our growing engineering team to help build and maintain HappyFox’s product offerings. You will implement product features writing clean, robust, reusable code with tests. You have at least 3 years of relevant professional experience in building web applications with javascript frameworks like Ember.js or React.js.',
    remoteStatus: 'On-site',
  })
})

test('HappyFox run verifies the jobs hub before scraping India city pages and Trakstar details', async () => {
  const happyFox = await loadHappyFoxModule()
  const requested = []

  const jobs = await happyFox.createHappyFoxScraper({ maxJobs: 2 }).run({
    fetchText: async (url) => {
      requested.push(url)
      if (url === happyFox.JOBS_HUB_URL) return jobsHubHtml
      if (url === happyFox.INDIA_CITY_PAGE_URLS[0]) return chennaiListingsHtml
      if (url === happyFox.INDIA_CITY_PAGE_URLS[1]) return bengaluruListingsHtml
      if (url === happyFox.INDIA_CITY_PAGE_URLS[2]) return hyderabadListingsHtml
      if (url === 'https://happyfox.hire.trakstar.com/jobs/fk0lead1') return leadDetailHtml
      if (url === 'https://happyfox.hire.trakstar.com/jobs/fk0xixf') return frontendDetailHtml
      if (url === 'https://happyfox.hire.trakstar.com/jobs/fk0xix1') return backendDetailHtml
      if (url === 'https://happyfox.hire.trakstar.com/jobs/fk0sales1') return salesDetailHtml
      if (url === 'https://happyfox.hire.trakstar.com/jobs/fk0market1') return marketingDetailHtml
      throw new Error(`Unexpected HappyFox fixture URL: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(requested, [
    happyFox.JOBS_HUB_URL,
    happyFox.INDIA_CITY_PAGE_URLS[0],
    happyFox.INDIA_CITY_PAGE_URLS[1],
    happyFox.INDIA_CITY_PAGE_URLS[2],
    'https://happyfox.hire.trakstar.com/jobs/fk0lead1',
    'https://happyfox.hire.trakstar.com/jobs/fk0xixf',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'happyfox')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-16T00:00:00.000Z')
})

test('HappyFox fails closed when the verified jobs hub drifts materially', async () => {
  const happyFox = await loadHappyFoxModule()

  await assert.rejects(
    happyFox.createHappyFoxScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified HappyFox jobs hub/i,
  )
})
