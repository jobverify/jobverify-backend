import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const CAREERS_HOME_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Explore Job Opportunities - Progress Careers</title>
  </head>
  <body>
    <main>
      <h1>Build a Career at Progress</h1>
      <p>People power Progress! Be part of a team where you can learn, grow and thrive.</p>
      <a href="https://www.progress.com/company/careers/open-positions">View Open Positions</a>
      <h2>India</h2>
      <p>Office locations: Hyderabad, Bengaluru and New Delhi</p>
      <a href="https://www.progress.com/company/careers/open-positions">See Open Positions @ India</a>
    </main>
  </body>
</html>
`

const OPEN_POSITIONS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Search Open Positions</h1>
    <p>India (11)</p>
    <section class="job-group">
      <h6>Software Engineering</h6>
      <a href="https://www.progress.com/company/careers/open-positions/manager-software-engineering-os43yfwh">Manager, Software Engineering</a>
      <p>Hyderabad, India</p>
      <a href="https://www.progress.com/company/careers/open-positions/principal-software-engineer-lead-rust-developer-rs88xyzz">Principal Software Engineer ( Lead RUST Developer)</a>
      <p>Remote, India</p>
    </section>
    <section class="job-group">
      <h6>Technical Support</h6>
      <a href="https://www.progress.com/company/careers/open-positions/technical-support-engineer-senior-1-open-edge-oracle-dba-ts77pqrr">Technical Support Engineer, Senior 1(Open Edge/ Oracle DBA)</a>
      <p>Hybrid, Hyderabad, India</p>
    </section>
    <section class="job-group">
      <h6>Sales</h6>
      <a href="https://www.progress.com/company/careers/open-positions/senior-sales-manager-sitefinity-us11abcd">Senior Sales Manager - Sitefinity</a>
      <p>Hybrid, Burlington, United States</p>
    </section>
  </body>
</html>
`

const MANAGER_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Manager, Software Engineering</h1>
    <h6>Remote Type</h6>
    <p>In Office</p>
    <h6>Location</h6>
    <p>Hyderabad, India</p>
    <h6>Job Category</h6>
    <p>Software Engineering</p>
    <a href="https://www.progress.com/company/careers/open-positions/manager-software-engineering-os43yfwh">Apply now</a>
    <h2>Job Summary</h2>
    <p>We are Progress and we are seeking an experienced Manager of Software Engineering to lead our Progress OpenEdge development team.</p>
    <p>You will be responsible for leading a team of software engineers and driving the strategic evolution of our OpenEdge platform.</p>
  </body>
</html>
`

const RUST_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Principal Software Engineer ( Lead RUST Developer)</h1>
    <h6>Remote Type</h6>
    <p>Remote</p>
    <h6>Location</h6>
    <p>India</p>
    <h6>Job Category</h6>
    <p>Software Engineering</p>
    <a href="https://www.progress.com/company/careers/open-positions/principal-software-engineer-lead-rust-developer-rs88xyzz">Apply now</a>
    <h2>Job Summary</h2>
    <p>Build core Rust runtime capabilities for Progress products from anywhere in India.</p>
  </body>
</html>
`

const SUPPORT_DETAIL_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Technical Support Engineer, Senior 1(Open Edge/ Oracle DBA)</h1>
    <h6>Remote Type</h6>
    <p>Hybrid</p>
    <h6>Location</h6>
    <p>Hyderabad, India</p>
    <h6>Job Category</h6>
    <p>Technical Support</p>
    <a href="https://www.progress.com/company/careers/open-positions/technical-support-engineer-senior-1-open-edge-oracle-dba-ts77pqrr">Apply now</a>
    <h2>Job Summary</h2>
    <p>Support Progress OpenEdge and Oracle DBA workloads for customers from Hyderabad.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../progresssoftware/script.js')
  } catch {
    assert.fail('Expected Progress Software scraper module at ../progresssoftware/script.js')
  }
}

test('Progress Software pins the verified first-party careers homepage, open-positions board, and detail URL patterns', async () => {
  const progressSoftware = await loadModule()

  assert.equal(progressSoftware.CAREERS_HOME_URL, 'https://www.progress.com/company/careers')
  assert.equal(progressSoftware.OPEN_POSITIONS_URL, 'https://www.progress.com/company/careers/open-positions')
  assert.equal(
    progressSoftware.JOB_PAGE_PREFIX,
    'https://www.progress.com/company/careers/open-positions/',
  )
  assert.equal(progressSoftware.hasOfficialCareersHomeSignal(CAREERS_HOME_HTML), true)
  assert.equal(progressSoftware.hasOpenPositionsSignal(OPEN_POSITIONS_HTML), true)
  assert.deepEqual(progressSoftware.extractIndiaJobCards(OPEN_POSITIONS_HTML), [
    {
      title: 'Manager, Software Engineering',
      department: 'Software Engineering',
      listingLocation: 'Hyderabad, India',
      detailUrl: 'https://www.progress.com/company/careers/open-positions/manager-software-engineering-os43yfwh',
    },
    {
      title: 'Principal Software Engineer ( Lead RUST Developer)',
      department: 'Software Engineering',
      listingLocation: 'Remote, India',
      detailUrl: 'https://www.progress.com/company/careers/open-positions/principal-software-engineer-lead-rust-developer-rs88xyzz',
    },
    {
      title: 'Technical Support Engineer, Senior 1(Open Edge/ Oracle DBA)',
      department: 'Technical Support',
      listingLocation: 'Hybrid, Hyderabad, India',
      detailUrl: 'https://www.progress.com/company/careers/open-positions/technical-support-engineer-senior-1-open-edge-oracle-dba-ts77pqrr',
    },
  ])
})

test('Progress Software extracts a structured job from a verified first-party detail page', async () => {
  const progressSoftware = await loadModule()

  const job = progressSoftware.extractJobFromDetailPage(
    MANAGER_DETAIL_HTML,
    {
      title: 'Manager, Software Engineering',
      department: 'Software Engineering',
      listingLocation: 'Hyderabad, India',
      detailUrl: 'https://www.progress.com/company/careers/open-positions/manager-software-engineering-os43yfwh',
    },
  )

  assert.deepEqual(job, {
    title: 'Manager, Software Engineering',
    company: 'Progress Software',
    department: 'Software Engineering',
    location: 'Hyderabad, India',
    city: 'Hyderabad',
    country: 'India',
    jobId: 'os43yfwh',
    requisitionId: 'os43yfwh',
    sourceUrl: 'https://www.progress.com/company/careers/open-positions/manager-software-engineering-os43yfwh',
    applyUrl: 'https://www.progress.com/company/careers/open-positions/manager-software-engineering-os43yfwh',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: [
      'Job Summary',
      'We are Progress and we are seeking an experienced Manager of Software Engineering to lead our Progress OpenEdge development team.',
      'You will be responsible for leading a team of software engineers and driving the strategic evolution of our OpenEdge platform.',
    ].join('\n'),
    remoteStatus: 'On-site',
  })
})

test('Progress Software run validates the official first-party surfaces and returns only India jobs from first-party detail pages', async () => {
  const progressSoftware = await loadModule()
  const requestedUrls = []

  const jobs = await progressSoftware.createProgressSoftwareScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === progressSoftware.CAREERS_HOME_URL) return CAREERS_HOME_HTML
      if (url === progressSoftware.OPEN_POSITIONS_URL) return OPEN_POSITIONS_HTML
      if (url === 'https://www.progress.com/company/careers/open-positions/manager-software-engineering-os43yfwh') return MANAGER_DETAIL_HTML
      if (url === 'https://www.progress.com/company/careers/open-positions/principal-software-engineer-lead-rust-developer-rs88xyzz') return RUST_DETAIL_HTML
      if (url === 'https://www.progress.com/company/careers/open-positions/technical-support-engineer-senior-1-open-edge-oracle-dba-ts77pqrr') return SUPPORT_DETAIL_HTML

      throw new Error(`Unexpected Progress Software URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    progressSoftware.CAREERS_HOME_URL,
    progressSoftware.OPEN_POSITIONS_URL,
    'https://www.progress.com/company/careers/open-positions/manager-software-engineering-os43yfwh',
    'https://www.progress.com/company/careers/open-positions/principal-software-engineer-lead-rust-developer-rs88xyzz',
    'https://www.progress.com/company/careers/open-positions/technical-support-engineer-senior-1-open-edge-oracle-dba-ts77pqrr',
  ])
  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => ({
      title: job.title,
      city: job.city,
      jobId: job.jobId,
      link: job.link,
      source: job.source,
      remoteStatus: job.remoteStatus,
      scrapedAt: job.scrapedAt,
    })),
    [
      {
        title: 'Manager, Software Engineering',
        city: 'Hyderabad',
        jobId: 'os43yfwh',
        link: 'https://www.progress.com/company/careers/open-positions/manager-software-engineering-os43yfwh',
        source: 'progresssoftware',
        remoteStatus: 'On-site',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'Principal Software Engineer ( Lead RUST Developer)',
        city: null,
        jobId: 'rs88xyzz',
        link: 'https://www.progress.com/company/careers/open-positions/principal-software-engineer-lead-rust-developer-rs88xyzz',
        source: 'progresssoftware',
        remoteStatus: 'Remote',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'Technical Support Engineer, Senior 1(Open Edge/ Oracle DBA)',
        city: 'Hyderabad',
        jobId: 'ts77pqrr',
        link: 'https://www.progress.com/company/careers/open-positions/technical-support-engineer-senior-1-open-edge-oracle-dba-ts77pqrr',
        source: 'progresssoftware',
        remoteStatus: 'Hybrid',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})

test('Progress Software fails closed when the verified careers homepage, open-positions board, or detail pages drift materially', async () => {
  const progressSoftware = await loadModule()

  await assert.rejects(
    progressSoftware.createProgressSoftwareScraper().run({
      fetchText: async (url) => {
        if (url === progressSoftware.CAREERS_HOME_URL) return '<html><body><h1>Unexpected</h1></body></html>'
        throw new Error(`Unexpected Progress Software URL: ${url}`)
      },
    }),
    /verified official progress software careers homepage/i,
  )

  await assert.rejects(
    progressSoftware.createProgressSoftwareScraper().run({
      fetchText: async (url) => {
        if (url === progressSoftware.CAREERS_HOME_URL) return CAREERS_HOME_HTML
        if (url === progressSoftware.OPEN_POSITIONS_URL) return '<html><body><p>No roles</p></body></html>'
        throw new Error(`Unexpected Progress Software URL: ${url}`)
      },
    }),
    /verified progress software open positions surface/i,
  )

  await assert.rejects(
    progressSoftware.createProgressSoftwareScraper().run({
      fetchText: async (url) => {
        if (url === progressSoftware.CAREERS_HOME_URL) return CAREERS_HOME_HTML
        if (url === progressSoftware.OPEN_POSITIONS_URL) return OPEN_POSITIONS_HTML
        if (url === 'https://www.progress.com/company/careers/open-positions/manager-software-engineering-os43yfwh') {
          return '<html><body><h1>Broken</h1></body></html>'
        }
        if (url === 'https://www.progress.com/company/careers/open-positions/principal-software-engineer-lead-rust-developer-rs88xyzz') return RUST_DETAIL_HTML
        if (url === 'https://www.progress.com/company/careers/open-positions/technical-support-engineer-senior-1-open-edge-oracle-dba-ts77pqrr') return SUPPORT_DETAIL_HTML
        throw new Error(`Unexpected Progress Software URL: ${url}`)
      },
    }),
    /verified progress software job detail page/i,
  )
})
