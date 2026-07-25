import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers - Serene Info Solutions</title>
  </head>
  <body>
    <main>
      <h1>Shape your Future with a Career at Serene</h1>
      <p>Join a vibrant, innovative team to make an impact and reach your goals.</p>
      <h2>Excellent Opportunity to Explore Your Passions.</h2>
      <p>At Serene Info Solutions, we are committed to helping you realize your professional ambitions.</p>
      <a href="https://www.sereneinfosolutions.in/jobs/">Jobs</a>
      <a href="https://www.sereneinfosolutions.in/join-us/">Submit CV</a>
    </main>
  </body>
</html>
`

const jobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Job Listing - Serene Info Solutions</title>
  </head>
  <body>
    <main>
      <article class="job-card">
        <h2>Bench Sales Recruiter</h2>
        <p>Grow our staffing pipeline for US technology accounts.</p>
        <a href="#">View Job</a>
      </article>
      <article class="job-card">
        <h2>Talent Acquisition Associate</h2>
        <p>Support hiring coordination and candidate engagement across client mandates.</p>
        <a href="#">View Job</a>
      </article>
      <article class="job-card">
        <h2>Resource Executive</h2>
        <p>Advanced knowledge of Microsoft Office (Outlook, Excel, and Word) and the Internet.</p>
        <p>Ability to communicate (written and verbal) effectively and professionally in a timely manner.</p>
        <a href="#">View Job</a>
      </article>
      <article class="job-card">
        <h2>US IT Recruiter</h2>
        <p>We are looking for a driven and detail-oriented US Recruiter with 3-6 years of experience in recruitment for the US market.</p>
        <a href="#">View Job</a>
      </article>
    </main>
  </body>
</html>
`

const joinUsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Join Us - Serene Info Solutions</title>
  </head>
  <body>
    <main>
      <h1>Join Us</h1>
      <p>We are looking for highly motivated, talented people to join our team.</p>
      <form id="job-application">
        <label>First name</label>
        <label>Last name</label>
        <label>Upload CV</label>
        <label>Interested jobs</label>
        <button>Submit Form</button>
      </form>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../serene/script.js')
  } catch {
    assert.fail('Expected Serene scraper module at ../serene/script.js')
  }
}

test('Serene helpers stay pinned to the verified careers page, jobs page, and shared application form', async () => {
  const serene = await loadModule()

  assert.equal(serene.SOURCE, 'serene')
  assert.equal(serene.COMPANY_NAME, 'Serene')
  assert.equal(serene.OFFICIAL_BRAND_NAME, 'Serene Info Solutions Pvt. Ltd.')
  assert.equal(serene.VERIFIED_ON, '2026-07-17')
  assert.equal(serene.CAREERS_URL, 'https://www.sereneinfosolutions.in/careers/')
  assert.equal(serene.JOBS_URL, 'https://www.sereneinfosolutions.in/jobs/')
  assert.equal(serene.APPLICATION_URL, 'https://www.sereneinfosolutions.in/join-us/')
  assert.equal(serene.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(serene.hasOfficialJobsSignal(jobsHtml), true)
  assert.equal(serene.hasOfficialApplicationFormSignal(joinUsHtml), true)
  assert.equal(
    serene.hasOfficialJobsSignal(jobsHtml.replace('Bench Sales Recruiter', 'Bench Recruiter')),
    false,
  )

  assert.deepEqual(serene.extractJobListings(jobsHtml), [
    {
      slug: 'bench-sales-recruiter',
      title: 'Bench Sales Recruiter',
      sourceUrl: 'https://www.sereneinfosolutions.in/jobs/#bench-sales-recruiter',
      applyUrl: 'https://www.sereneinfosolutions.in/join-us/',
      experienceRequired: null,
      jobDescription: 'Grow our staffing pipeline for US technology accounts.',
    },
    {
      slug: 'talent-acquisition-associate',
      title: 'Talent Acquisition Associate',
      sourceUrl: 'https://www.sereneinfosolutions.in/jobs/#talent-acquisition-associate',
      applyUrl: 'https://www.sereneinfosolutions.in/join-us/',
      experienceRequired: null,
      jobDescription: 'Support hiring coordination and candidate engagement across client mandates.',
    },
    {
      slug: 'resource-executive',
      title: 'Resource Executive',
      sourceUrl: 'https://www.sereneinfosolutions.in/jobs/#resource-executive',
      applyUrl: 'https://www.sereneinfosolutions.in/join-us/',
      experienceRequired: null,
      jobDescription: 'Advanced knowledge of Microsoft Office (Outlook, Excel, and Word) and the Internet. Ability to communicate (written and verbal) effectively and professionally in a timely manner.',
    },
    {
      slug: 'us-it-recruiter',
      title: 'US IT Recruiter',
      sourceUrl: 'https://www.sereneinfosolutions.in/jobs/#us-it-recruiter',
      applyUrl: 'https://www.sereneinfosolutions.in/join-us/',
      experienceRequired: '3-6 years',
      jobDescription: 'We are looking for a driven and detail-oriented US Recruiter with 3-6 years of experience in recruitment for the US market.',
    },
  ])
})

test('Serene run validates the official careers flow before returning visible job listings', async () => {
  const serene = await loadModule()
  const requestedUrls = []

  const jobs = await serene.createSereneScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === serene.CAREERS_URL) return careersHtml
      if (url === serene.JOBS_URL) return jobsHtml
      if (url === serene.APPLICATION_URL) return joinUsHtml
      throw new Error(`Unexpected Serene URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    serene.CAREERS_URL,
    serene.JOBS_URL,
    serene.APPLICATION_URL,
  ])
  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs[0], {
    title: 'Bench Sales Recruiter',
    company: 'Serene',
    department: null,
    location: 'India',
    city: null,
    country: 'India',
    jobId: 'bench-sales-recruiter',
    requisitionId: null,
    sourceUrl: 'https://www.sereneinfosolutions.in/jobs/#bench-sales-recruiter',
    applyUrl: 'https://www.sereneinfosolutions.in/join-us/',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Grow our staffing pipeline for US technology accounts.',
    source: 'serene',
    link: 'https://www.sereneinfosolutions.in/join-us/',
    scrapedAt: FIXED_SCRAPED_AT,
  })
  assert.equal(jobs[3].title, 'US IT Recruiter')
  assert.equal(jobs[3].experienceRequired, '3-6 years')
})

test('Serene fails closed when the verified careers page, jobs page, or application form drifts materially', async () => {
  const serene = await loadModule()

  await assert.rejects(
    serene.createSereneScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified serene careers page/i,
  )

  await assert.rejects(
    serene.createSereneScraper().run({
      fetchText: async (url) => {
        if (url === serene.CAREERS_URL) return careersHtml
        if (url === serene.JOBS_URL) return jobsHtml.replace('US IT Recruiter', 'US Recruiter')
        return joinUsHtml
      },
    }),
    /verified serene jobs page/i,
  )

  await assert.rejects(
    serene.createSereneScraper().run({
      fetchText: async (url) => {
        if (url === serene.CAREERS_URL) return careersHtml
        if (url === serene.JOBS_URL) return jobsHtml
        return joinUsHtml.replace('Interested jobs', 'Preferred role')
      },
    }),
    /verified serene application form/i,
  )
})
