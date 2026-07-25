import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T18:00:00.000Z'

const jobsIndexHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs - ZingHR HCM Solution</title>
  </head>
  <body>
    <h1>Jobs</h1>
    <p>Filter by</p>
    <a class="job-card" href="https://www.zinghr.com/jobs/customer-support-hrms-hcm/">
      Customer Support- (HRMS/HCM)
      <span>Customer Experience</span>
      <span>Full Time</span>
      <span>Mumbai</span>
      <span>More Details</span>
    </a>
    <a class="job-card" href="https://www.zinghr.com/jobs/sales-manager/">
      Sales Manager
      <span>Business Development</span>
      <span>Full Time</span>
      <span>Chandigarh Coimbatore Jaipur Kochi Kolkata Mumbai Nagpur Nasik Pune Raipur Trivandrum</span>
      <span>More Details</span>
    </a>
  </body>
</html>
`

const customerSupportDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Customer Support- (HRMS/HCM) - ZingHR HCM Solution</title>
  </head>
  <body>
    <h1>Customer Support- (HRMS/HCM)</h1>
    <p>April 9, 2024</p>
    <p>JOB DESCRIPTION</p>
    <p>We are looking for a techno-functional consulting champion.</p>
    <p>Job Category: Customer Experience</p>
    <p>Job Type: Full Time</p>
    <p>Job Location: Mumbai</p>
    <h2>Apply for this position</h2>
  </body>
</html>
`

const salesManagerDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Sales Manager - ZingHR HCM Solution</title>
  </head>
  <body>
    <h1>Sales Manager</h1>
    <p>April 9, 2024</p>
    <p>JOB DESCRIPTION</p>
    <p>ZingHR is looking for high performing sales professionals.</p>
    <p>Job Category: Business Development</p>
    <p>Job Type: Full Time</p>
    <p>Job Location: Chandigarh / Coimbatore / Jaipur / Kochi / Kolkata / Mumbai / Nagpur / Nasik / Pune / Raipur / Trivandrum</p>
    <h2>Apply for this position</h2>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../zinghr/script.js')
  } catch {
    assert.fail('Expected ZingHR scraper module at ../zinghr/script.js')
  }
}

test('ZingHR helpers stay pinned to the verified jobs index and detail page contract', async () => {
  const zinghr = await loadModule()

  assert.equal(zinghr.SOURCE, 'zinghr')
  assert.equal(zinghr.COMPANY, 'ZingHR')
  assert.equal(zinghr.CAREERS_URL, 'https://www.zinghr.com/job-openings/')
  assert.equal(zinghr.VERIFIED_ON, '2026-07-17')
  assert.equal(zinghr.hasVerifiedJobsIndexSignal(jobsIndexHtml), true)
  assert.deepEqual(zinghr.extractJobCards(jobsIndexHtml), [
    {
      title: 'Customer Support- (HRMS/HCM)',
      category: 'Customer Experience',
      employmentType: 'Full-time',
      location: 'Mumbai, India',
      detailUrl: 'https://www.zinghr.com/jobs/customer-support-hrms-hcm/',
    },
    {
      title: 'Sales Manager',
      category: 'Business Development',
      employmentType: 'Full-time',
      location: 'Chandigarh Coimbatore Jaipur Kochi Kolkata Mumbai Nagpur Nasik Pune Raipur Trivandrum, India',
      detailUrl: 'https://www.zinghr.com/jobs/sales-manager/',
    },
  ])

  const detail = zinghr.extractJobDetail(customerSupportDetailHtml, {
    title: 'Customer Support- (HRMS/HCM)',
    category: 'Customer Experience',
    employmentType: 'Full-time',
    location: 'Mumbai, India',
    detailUrl: 'https://www.zinghr.com/jobs/customer-support-hrms-hcm/',
  })

  assert.equal(detail.title, 'Customer Support- (HRMS/HCM)')
  assert.equal(detail.category, 'Customer Experience')
  assert.equal(detail.employmentType, 'Full-time')
  assert.equal(detail.location, 'Mumbai, India')
  assert.equal(detail.postingDate, 'April 9, 2024')
  assert.match(detail.jobDescription, /techno-functional consulting champion/i)
})

test('ZingHR run fetches the verified jobs index and detail pages into the shared job contract', async () => {
  const zinghr = await loadModule()
  const requestedUrls = []

  const jobs = await zinghr.createZingHrScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === zinghr.CAREERS_URL) return jobsIndexHtml
      if (url === 'https://www.zinghr.com/jobs/customer-support-hrms-hcm/') return customerSupportDetailHtml
      if (url === 'https://www.zinghr.com/jobs/sales-manager/') return salesManagerDetailHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    zinghr.CAREERS_URL,
    'https://www.zinghr.com/jobs/customer-support-hrms-hcm/',
    'https://www.zinghr.com/jobs/sales-manager/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'zinghr')
  assert.equal(jobs[0].company, 'ZingHR')
  assert.equal(jobs[0].companyCareerPage, zinghr.CAREERS_URL)
  assert.equal(jobs[0].companyDomain, 'zinghr.com')
  assert.equal(jobs[0].atsPlatform, 'official-company-careers')
  assert.equal(jobs[0].jobId, 'customer-support-hrms-hcm')
  assert.equal(jobs[0].department, 'Customer Experience')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.equal(jobs[1].jobId, 'sales-manager')
  assert.match(jobs[1].location, /Chandigarh/i)
})

test('ZingHR fails closed when the jobs index or detail pages drift from the verified contract', async () => {
  const zinghr = await loadModule()

  await assert.rejects(
    zinghr.createZingHrScraper().run({
      fetchText: async (url) => (url === zinghr.CAREERS_URL ? '<html><body><h1>Jobs</h1></body></html>' : customerSupportDetailHtml),
    }),
    /verified ZingHR jobs page/i,
  )

  await assert.rejects(
    zinghr.createZingHrScraper().run({
      fetchText: async (url) => {
        if (url === zinghr.CAREERS_URL) return jobsIndexHtml
        return '<html><body><h1>Unexpected</h1></body></html>'
      },
    }),
    /verified ZingHR job detail page/i,
  )
})
