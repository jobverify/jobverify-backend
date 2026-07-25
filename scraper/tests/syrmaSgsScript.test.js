import assert from 'node:assert/strict'
import test from 'node:test'

const lifeAtHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Life at SyrmaSGS - Syrma SGS</title>
  </head>
  <body>
    <h1>Careers at Syrma SGS</h1>
    <h2>Join the Team</h2>
    <p>
      Join talented makers, agile innovators, and inspiring leaders as they transform the world one
      product at a time.
    </p>
    <p>Our open positions span design engineering, manufacturing, operations, finance and more.</p>
    <a href="https://syrmasgs.com/job-openings/">Jobs</a>
  </body>
</html>
`

const jobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Jobs - Syrma SGS</title>
  </head>
  <body>
    <h1>Jobs</h1>
    <p>Search</p>
    <p>Filter by</p>
    <a href="https://syrmasgs.com/jobs/manager-sr-manager-npi-engineering/">
      Manager/Sr.Manager &#8211; NPI &amp; Engineering
      <span>More Details</span>
    </a>
    <a href="https://syrmasgs.com/jobs/22188/">
      Power Electronics Lead / Architect
      <span>More Details</span>
    </a>
  </body>
</html>
`

const npiDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Manager/Sr.Manager &#8211; NPI &amp; Engineering - Syrma SGS</title>
  </head>
  <body>
    <h1>Manager/Sr.Manager &#8211; NPI &amp; Engineering</h1>
    <p>Position Name Manager/Sr.Manager &#8211; NPI &amp; Engineering</p>
    <p>Department / Function NPI</p>
    <p>
      Educational qualifications (Threshold educational background required to execute the role) BE
    </p>
    <p>
      Relevant experience (Years of relevant experience required to execute the role)
      12 to 18 yrs in NPI
    </p>
    <p>
      Threshold skills and capabilities required to execute the role Functional: BOM preparation
      through ERP, Control plan, APQP, PPAP, FMEA, SPC, NP development &amp; ECN Control.
      Generic: Communication &amp; interpersonal skill, leadership, team building.
    </p>
    <h2>Apply for this position</h2>
    <p>Upload CV/Resume</p>
  </body>
</html>
`

const powerDetailHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Power Electronics Lead / Architect - Syrma SGS</title>
  </head>
  <body>
    <h1>Power Electronics Lead / Architect</h1>
    <p>Title of position : Power Electronics Lead / Architect</p>
    <p>Work Experience : 8 to 12 Yrs.</p>
    <p>Qualification : B.E./Btech/ME/MTech - Electrical / Electronics Engineering/related subject</p>
    <p>Location : Chennai</p>
    <p>Skills Required :</p>
    <ul>
      <li>Realization of complex system requirements to provide robust and reliable hardware solutions.</li>
      <li>Strong in embedded hardware product design, Debug, and Test</li>
    </ul>
    <h2>Apply for this position</h2>
    <p>Upload CV/Resume</p>
  </body>
</html>
`

const loadSyrmaSgsModule = async () => {
  try {
    return await import('../syrmasgs/script.js')
  } catch {
    assert.fail('Expected Syrma SGS scraper module at ../syrmasgs/script.js')
  }
}

test('Syrma SGS script helpers stay pinned to the verified first-party life page, jobs archive, and detail pages', async () => {
  const syrmaSgs = await loadSyrmaSgsModule()

  assert.equal(syrmaSgs.SOURCE, 'syrmasgs')
  assert.equal(syrmaSgs.COMPANY, 'Syrma SGS')
  assert.equal(syrmaSgs.COMPANY_DOMAIN, 'syrmasgs.com')
  assert.equal(syrmaSgs.LIFE_AT_URL, 'https://syrmasgs.com/life-at-syrmasgs/')
  assert.equal(syrmaSgs.JOBS_URL, 'https://syrmasgs.com/job-openings/')
  assert.equal(syrmaSgs.VERIFIED_AT, '2026-07-17')
  assert.equal(syrmaSgs.extractOfficialJobsUrl(lifeAtHtml), 'https://syrmasgs.com/job-openings/')
  assert.equal(syrmaSgs.hasOfficialLifeAtSignal(lifeAtHtml), true)
  assert.equal(syrmaSgs.hasOfficialJobsPageSignal(jobsHtml), true)
  assert.deepEqual(syrmaSgs.extractJobCards(jobsHtml), [
    {
      title: 'Manager/Sr.Manager - NPI & Engineering',
      sourceUrl: 'https://syrmasgs.com/jobs/manager-sr-manager-npi-engineering/',
      applyUrl: 'https://syrmasgs.com/jobs/manager-sr-manager-npi-engineering/',
      jobId: 'manager-sr-manager-npi-engineering',
    },
    {
      title: 'Power Electronics Lead / Architect',
      sourceUrl: 'https://syrmasgs.com/jobs/22188/',
      applyUrl: 'https://syrmasgs.com/jobs/22188/',
      jobId: 'power-electronics-lead-architect',
    },
  ])
})

test('Syrma SGS detail parsing reads both the structured and free-form first-party role pages', async () => {
  const syrmaSgs = await loadSyrmaSgsModule()

  const npiDetail = syrmaSgs.extractJobDetail(npiDetailHtml, {
    title: 'Manager/Sr.Manager - NPI & Engineering',
    sourceUrl: 'https://syrmasgs.com/jobs/manager-sr-manager-npi-engineering/',
    applyUrl: 'https://syrmasgs.com/jobs/manager-sr-manager-npi-engineering/',
    jobId: 'manager-sr-manager-npi-engineering',
  })
  assert.equal(npiDetail.title, 'Manager/Sr.Manager - NPI & Engineering')
  assert.equal(npiDetail.department, 'NPI')
  assert.equal(npiDetail.location, null)
  assert.equal(npiDetail.experienceRequired, '12 to 18 yrs in NPI')
  assert.equal(npiDetail.minimumQualification, 'BE')
  assert.match(npiDetail.jobDescription, /BOM preparation through ERP/i)
  assert.ok(
    npiDetail.requiredSkills.some((skill) => /communication & interpersonal skill/i.test(skill)),
  )

  const powerDetail = syrmaSgs.extractJobDetail(powerDetailHtml, {
    title: 'Power Electronics Lead / Architect',
    sourceUrl: 'https://syrmasgs.com/jobs/22188/',
    applyUrl: 'https://syrmasgs.com/jobs/22188/',
    jobId: 'power-electronics-lead-architect',
  })
  assert.equal(powerDetail.title, 'Power Electronics Lead / Architect')
  assert.equal(powerDetail.location, 'Chennai, India')
  assert.equal(powerDetail.city, 'Chennai')
  assert.equal(powerDetail.experienceRequired, '8 to 12 Yrs.')
  assert.equal(
    powerDetail.minimumQualification,
    'B.E./Btech/ME/MTech - Electrical / Electronics Engineering/related subject',
  )
  assert.ok(
    powerDetail.requiredSkills.some((skill) => /embedded hardware product design/i.test(skill)),
  )
})

test('Syrma SGS run uses browser-backed first-party HTML when direct HTTP access is blocked', async () => {
  const syrmaSgs = await loadSyrmaSgsModule()
  const attempts = []

  const jobs = await syrmaSgs.createSyrmaSgsScraper().run({
    fetchText: async (url) => {
      attempts.push(`http:${url}`)
      throw new Error(`Connect Timeout Error for ${url}`)
    },
    fetchBrowserText: async (url) => {
      attempts.push(`browser:${url}`)
      if (url === syrmaSgs.LIFE_AT_URL) return lifeAtHtml
      if (url === syrmaSgs.JOBS_URL) return jobsHtml
      if (url === 'https://syrmasgs.com/jobs/manager-sr-manager-npi-engineering/') return npiDetailHtml
      if (url === 'https://syrmasgs.com/jobs/22188/') return powerDetailHtml
      throw new Error(`Unexpected browser URL: ${url}`)
    },
    now: () => '2026-07-17T05:00:00.000Z',
  })

  assert.deepEqual(attempts, [
    `http:${syrmaSgs.LIFE_AT_URL}`,
    `browser:${syrmaSgs.LIFE_AT_URL}`,
    `http:${syrmaSgs.JOBS_URL}`,
    `browser:${syrmaSgs.JOBS_URL}`,
    'http:https://syrmasgs.com/jobs/manager-sr-manager-npi-engineering/',
    'browser:https://syrmasgs.com/jobs/manager-sr-manager-npi-engineering/',
    'http:https://syrmasgs.com/jobs/22188/',
    'browser:https://syrmasgs.com/jobs/22188/',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'syrmasgs')
  assert.equal(jobs[0].company, 'Syrma SGS')
  assert.equal(jobs[0].companyCareerPage, 'https://syrmasgs.com/job-openings/')
  assert.equal(jobs[0].companyDomain, 'syrmasgs.com')
  assert.equal(jobs[0].atsPlatform, 'wp-job-openings')
  assert.equal(jobs[0].link, jobs[0].applyUrl)
  assert.equal(jobs[0].scrapedAt, '2026-07-17T05:00:00.000Z')
  assert.equal(jobs[1].location, 'Chennai, India')
})

test('Syrma SGS fails closed when the verified life page, jobs archive, or detail page drifts', async () => {
  const syrmaSgs = await loadSyrmaSgsModule()

  await assert.rejects(
    syrmaSgs.createSyrmaSgsScraper().run({
      fetchText: async (url) => {
        if (url === syrmaSgs.LIFE_AT_URL) return '<html><title>Unexpected</title></html>'
        throw new Error(`Unexpected URL: ${url}`)
      },
      fetchBrowserText: async () => {
        throw new Error('Unexpected browser fallback')
      },
    }),
    /verified Syrma SGS life-at careers page/i,
  )

  await assert.rejects(
    syrmaSgs.createSyrmaSgsScraper().run({
      fetchText: async (url) => {
        if (url === syrmaSgs.LIFE_AT_URL) return lifeAtHtml
        if (url === syrmaSgs.JOBS_URL) return jobsHtml.replace('Power Electronics Lead / Architect', 'Unexpected Role')
        throw new Error(`Unexpected URL: ${url}`)
      },
      fetchBrowserText: async () => {
        throw new Error('Unexpected browser fallback')
      },
    }),
    /verified Syrma SGS jobs archive/i,
  )

  await assert.rejects(
    syrmaSgs.createSyrmaSgsScraper().run({
      fetchText: async (url) => {
        if (url === syrmaSgs.LIFE_AT_URL) return lifeAtHtml
        if (url === syrmaSgs.JOBS_URL) return jobsHtml
        if (url === 'https://syrmasgs.com/jobs/manager-sr-manager-npi-engineering/') {
          return npiDetailHtml.replace('Apply for this position', 'Contact Us')
        }
        if (url === 'https://syrmasgs.com/jobs/22188/') return powerDetailHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
      fetchBrowserText: async () => {
        throw new Error('Unexpected browser fallback')
      },
    }),
    /detail page/i,
  )
})
