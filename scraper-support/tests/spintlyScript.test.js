import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T09:15:00.000Z'

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Spintly | Careers | Job Openings | Jobs at Spintly</title>
    <link rel="canonical" href="https://spintly.com/careers/" />
  </head>
  <body>
    <main>
      <h1>Join Us As We Build The Future of Access Control</h1>
      <p>Explore a growth-oriented and fulling career at Spintly.</p>
      <a href="#job-application-form">View Open Positions</a>

      <section id="openings">
        <h2>Job Openings</h2>
        <p>If you’d like to use your energy for good, we’d love to hear from you.</p>

        <h2>Sales / Operations</h2>
        <h2>Internal Technical Training</h2>
        <p>Goa - India • Full-Time • Onsite</p>
        <p>
          About the Role: The Internal Technical Trainer is responsible for designing,
          developing, and delivering technical training programs.
        </p>
        <p>
          Required Qualifications: Bachelor’s degree in Computer Science, Electronics,
          Information Technology, or a related field.
        </p>
        <h2><a href="#job-application-form">Apply Now</a></h2>

        <h2>Sales Coordinator</h2>
        <p>Goa - India • Full-Time • Onsite</p>
        <p>
          Job Overview: Spintly is looking for a highly organized and execution-focused
          Sales Coordinator to drive seamless coordination between the Sales, Operations,
          and Finance teams.
        </p>
        <p>
          Required Qualifications: Bachelor’s degree in Business Administration,
          Commerce, Marketing, or a related discipline.
        </p>
        <h2><a href="#job-application-form">Apply Now</a></h2>

        <h2>Junior Technical Project Manager</h2>
        <p>Fatorda, Margao, Goa - India • Onsite</p>
        <p>
          Requirements: 1-2 years experience, technical background, excellent written and
          verbal communication skills.
        </p>
        <h2><a href="#job-application-form">Apply Now</a></h2>
      </section>

      <form id="job-application-form">
        <input name="full-name" />
        <input name="email" />
      </form>
    </main>
  </body>
</html>
`

const loadSpintlyModule = async () => {
  try {
    return await import('../../scraper/spintly/script.js')
  } catch {
    assert.fail('Expected Spintly scraper module at ../../scraper/spintly/script.js')
  }
}

test('Spintly helpers stay pinned to the verified first-party inline jobs contract from July 17, 2026', async () => {
  const spintly = await loadSpintlyModule()

  assert.equal(spintly.SOURCE, 'spintly')
  assert.equal(spintly.COMPANY, 'Spintly')
  assert.equal(spintly.HOMEPAGE_URL, 'https://spintly.com/')
  assert.equal(spintly.CAREERS_URL, 'https://spintly.com/careers/')
  assert.equal(spintly.VERIFIED_ON, '2026-07-17')
  assert.match(spintly.VERIFIED_SURFACE_SUMMARY, /Join Us As We Build The Future of Access Control/i)
  assert.equal(spintly.hasOfficialCareersPageSignal(careersPageHtml), true)
  assert.equal(
    spintly.extractSharedApplyUrl(careersPageHtml),
    'https://spintly.com/careers/#job-application-form',
  )
})

test('Spintly extracts inline India job sections from the verified first-party careers page', async () => {
  const spintly = await loadSpintlyModule()
  const jobs = spintly.extractInlineJobs(careersPageHtml, {
    scrapedAt: FIXED_SCRAPED_AT,
  })

  assert.deepEqual(jobs, [
    {
      title: 'Internal Technical Training',
      company: 'Spintly',
      department: 'Sales / Operations',
      location: 'Goa - India',
      city: 'Goa',
      country: 'India',
      link: 'https://spintly.com/careers/#job-application-form',
      applyUrl: 'https://spintly.com/careers/#job-application-form',
      sourceUrl: 'https://spintly.com/careers/#job-application-form',
      source: 'spintly',
      jobId: 'internal-technical-training-goa-india',
      requisitionId: null,
      employmentType: 'Full-Time',
      experienceRequired: null,
      jobDescription:
        "About the Role: The Internal Technical Trainer is responsible for designing, developing, and delivering technical training programs. Required Qualifications: Bachelor's degree in Computer Science, Electronics, Information Technology, or a related field.",
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      remoteStatus: 'Onsite',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Sales Coordinator',
      company: 'Spintly',
      department: 'Sales / Operations',
      location: 'Goa - India',
      city: 'Goa',
      country: 'India',
      link: 'https://spintly.com/careers/#job-application-form',
      applyUrl: 'https://spintly.com/careers/#job-application-form',
      sourceUrl: 'https://spintly.com/careers/#job-application-form',
      source: 'spintly',
      jobId: 'sales-coordinator-goa-india',
      requisitionId: null,
      employmentType: 'Full-Time',
      experienceRequired: null,
      jobDescription:
        "Job Overview: Spintly is looking for a highly organized and execution-focused Sales Coordinator to drive seamless coordination between the Sales, Operations, and Finance teams. Required Qualifications: Bachelor's degree in Business Administration, Commerce, Marketing, or a related discipline.",
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      remoteStatus: 'Onsite',
      scrapedAt: FIXED_SCRAPED_AT,
    },
    {
      title: 'Junior Technical Project Manager',
      company: 'Spintly',
      department: 'Sales / Operations',
      location: 'Fatorda, Margao, Goa - India',
      city: 'Fatorda',
      country: 'India',
      link: 'https://spintly.com/careers/#job-application-form',
      applyUrl: 'https://spintly.com/careers/#job-application-form',
      sourceUrl: 'https://spintly.com/careers/#job-application-form',
      source: 'spintly',
      jobId: 'junior-technical-project-manager-fatorda-margao-goa-india',
      requisitionId: null,
      employmentType: null,
      experienceRequired: null,
      jobDescription:
        'Requirements: 1-2 years experience, technical background, excellent written and verbal communication skills.',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      remoteStatus: 'Onsite',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Spintly parser advances past an immediate post-location heading', async () => {
  const spintly = await loadSpintlyModule()
  const html = `
    <!doctype html>
    <html>
      <body>
        <h2>Job Openings</h2>
        <h2>Firmware Engineer</h2>
        <p>Goa - India â€¢ Full-Time â€¢ Onsite</p>
        <h2>Engineering</h2>
        <p>Build access-control firmware and support production diagnostics.</p>
        <h2><a href="#job-application-form">Apply Now</a></h2>
      </body>
    </html>
  `

  const jobs = spintly.extractInlineJobs(html, {
    scrapedAt: FIXED_SCRAPED_AT,
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Firmware Engineer')
  assert.equal(jobs[0].department, 'Engineering')
  assert.equal(
    jobs[0].jobDescription,
    'Build access-control firmware and support production diagnostics.',
  )
})

test('Spintly run validates the official careers page and returns normalized inline jobs', async () => {
  const spintly = await loadSpintlyModule()
  const requestedUrls = []

  const jobs = await spintly.createSpintlyScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === spintly.CAREERS_URL) {
        return careersPageHtml
      }

      throw new Error(`Unexpected Spintly text URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [spintly.CAREERS_URL])
  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].title, 'Internal Technical Training')
  assert.equal(jobs[1].department, 'Sales / Operations')
  assert.equal(jobs[2].companyDomain, 'spintly.com')
  assert.equal(jobs[2].companyCareerPage, 'https://spintly.com/careers/')
  assert.equal(jobs[2].atsPlatform, 'official-company-careers')
})

test('Spintly fails closed when the verified careers shell drifts or stops exposing inline jobs', async () => {
  const spintly = await loadSpintlyModule()

  await assert.rejects(
    spintly.createSpintlyScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified Spintly careers page/i,
  )

  await assert.rejects(
    spintly.createSpintlyScraper().run({
      fetchText: async () => `
        <!doctype html>
        <html>
          <head>
            <title>Spintly | Careers | Job Openings | Jobs at Spintly</title>
            <link rel="canonical" href="https://spintly.com/careers/" />
          </head>
          <body>
            <h1>Join Us As We Build The Future of Access Control</h1>
            <a href="#job-application-form">View Open Positions</a>
            <h2>Job Openings</h2>
            <p>No openings right now.</p>
          </body>
        </html>
      `,
    }),
    /no longer exposes normalized inline jobs/i,
  )
})
