import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T13:00:00.000Z'

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at insightsoftware | Job Openings & Opportunities</title>
  </head>
  <body>
    <main>
      <h1>Current Job Openings</h1>
      <p>Learn more about our high-energy, high-performance global team.</p>
      <ul class="locations">
        <li>India - Bangalore</li>
        <li>India - Hyderabad</li>
        <li>India - Hyderabad - Remote</li>
      </ul>
      <article class="job-card">
        <a href="https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Hyderabad/Customer-Success-Analyst_R-2131">Customer Success Analyst</a>
        <span class="job-location">India - Hyderabad</span>
      </article>
      <article class="job-card">
        <a href="https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Hyderabad---Remote/Director---Engineering_R-1904">Director - Engineering</a>
        <span class="job-location">India - Hyderabad - Remote</span>
      </article>
      <article class="job-card">
        <a href="https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Bangalore/Senior-Manager--Engineering_R-2106">Senior Manager, Engineering</a>
        <span class="job-location">India - Bangalore</span>
      </article>
      <article class="job-card">
        <a href="https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/USA---Remote/Enterprise-Account-Executive_R-9999">Enterprise Account Executive</a>
        <span class="job-location">USA - Remote</span>
      </article>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../insightsoftware/script.js')
  } catch {
    assert.fail('Expected insightsoftware scraper module at ../insightsoftware/script.js')
  }
}

test('insightsoftware helpers stay pinned to the verified first-party careers page and India Workday links', async () => {
  const insightsoftware = await loadModule()

  assert.equal(insightsoftware.SOURCE, 'insightsoftware')
  assert.equal(insightsoftware.COMPANY, 'insightsoftware')
  assert.equal(insightsoftware.CAREERS_URL, 'https://insightsoftware.com/careers/')
  assert.equal(insightsoftware.WORKDAY_TENANT_HOST, 'https://magnitudesoftware.wd1.myworkdayjobs.com/')
  assert.equal(insightsoftware.VERIFIED_ON, '2026-07-17')
  assert.equal(insightsoftware.hasOfficialCareersSignal(careersPageHtml), true)
  assert.deepEqual(
    insightsoftware.extractIndiaJobsFromCareersHtml(careersPageHtml, {
      scrapedAt: FIXED_SCRAPED_AT,
    }),
    [
      {
        title: 'Customer Success Analyst',
        company: 'insightsoftware',
        department: null,
        location: 'India - Hyderabad',
        city: 'Hyderabad',
        country: 'India',
        sourceUrl: 'https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Hyderabad/Customer-Success-Analyst_R-2131',
        applyUrl: 'https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Hyderabad/Customer-Success-Analyst_R-2131/apply',
        jobId: 'R-2131',
        requisitionId: 'R-2131',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        remoteStatus: null,
        source: 'insightsoftware',
        link: 'https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Hyderabad/Customer-Success-Analyst_R-2131',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'Director - Engineering',
        company: 'insightsoftware',
        department: null,
        location: 'India - Hyderabad - Remote',
        city: 'Hyderabad',
        country: 'India',
        sourceUrl: 'https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Hyderabad---Remote/Director---Engineering_R-1904',
        applyUrl: 'https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Hyderabad---Remote/Director---Engineering_R-1904/apply',
        jobId: 'R-1904',
        requisitionId: 'R-1904',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        remoteStatus: 'Remote',
        source: 'insightsoftware',
        link: 'https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Hyderabad---Remote/Director---Engineering_R-1904',
        scrapedAt: FIXED_SCRAPED_AT,
      },
      {
        title: 'Senior Manager, Engineering',
        company: 'insightsoftware',
        department: null,
        location: 'India - Bangalore',
        city: 'Bangalore',
        country: 'India',
        sourceUrl: 'https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Bangalore/Senior-Manager--Engineering_R-2106',
        applyUrl: 'https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Bangalore/Senior-Manager--Engineering_R-2106/apply',
        jobId: 'R-2106',
        requisitionId: 'R-2106',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        remoteStatus: null,
        source: 'insightsoftware',
        link: 'https://magnitudesoftware.wd1.myworkdayjobs.com/en-US/insightsoftware/job/India---Bangalore/Senior-Manager--Engineering_R-2106',
        scrapedAt: FIXED_SCRAPED_AT,
      },
    ],
  )
})

test('insightsoftware run validates the first-party careers page and returns only India jobs', async () => {
  const insightsoftware = await loadModule()
  const requestedUrls = []

  const jobs = await insightsoftware.createInsightsoftwareScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === insightsoftware.CAREERS_URL) return careersPageHtml
      throw new Error(`Unexpected insightsoftware URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [insightsoftware.CAREERS_URL])
  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => [job.title, job.location, job.companyCareerPage, job.companyDomain, job.atsPlatform]),
    [
      ['Customer Success Analyst', 'India - Hyderabad', 'https://insightsoftware.com/careers/', 'insightsoftware.com', 'workday'],
      ['Director - Engineering', 'India - Hyderabad - Remote', 'https://insightsoftware.com/careers/', 'insightsoftware.com', 'workday'],
      ['Senior Manager, Engineering', 'India - Bangalore', 'https://insightsoftware.com/careers/', 'insightsoftware.com', 'workday'],
    ],
  )
})

test('insightsoftware fails closed when the verified first-party careers contract drifts', async () => {
  const insightsoftware = await loadModule()

  await assert.rejects(
    insightsoftware.createInsightsoftwareScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified insightsoftware careers page/i,
  )
})
