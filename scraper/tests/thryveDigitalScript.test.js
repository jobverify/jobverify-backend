import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T11:30:00.000Z'

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>enGen Global</title>
  </head>
  <body>
    <main>
      <p>Thryve Digital is currently in the process of rebranding itself to "enGen Global"</p>
      <p>Prospective candidates can explore job openings here</p>
      <h2>Join our Global Team of Information Technology Specialists</h2>
      <h2>Global Collaboration – Integrity – Strong Principles</h2>
      <p>Click here to explore opportunities</p>
      <a href="https://tdh.darwinbox.in/ms/candidate/careers">Click here to explore opportunities</a>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../thryvedigital/script.js')
  } catch {
    assert.fail('Expected Thryve Digital scraper module at ../thryvedigital/script.js')
  }
}

test('Thryve Digital helpers stay pinned to the verified first-party Darwinbox handoff from Friday, July 17, 2026', async () => {
  const thryveDigital = await loadModule()

  assert.equal(thryveDigital.SOURCE, 'thryvedigital')
  assert.equal(thryveDigital.COMPANY, 'Thryve Digital')
  assert.equal(thryveDigital.OFFICIAL_CAREERS_URL, 'https://www.thryvedigital.com/')
  assert.equal(
    thryveDigital.OFFICIAL_CAREERS_HANDOFF_URL,
    'https://tdh.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(thryveDigital.DARWINBOX_ORIGIN, 'https://tdh.darwinbox.in')
  assert.equal(
    thryveDigital.PUBLIC_PORTAL_URL,
    'https://tdh.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(thryveDigital.VERIFIED_ON, '2026-07-17')
  assert.match(thryveDigital.VERIFIED_SURFACE_SUMMARY, /Thryve Digital/i)
  assert.equal(
    thryveDigital.extractOfficialDarwinboxUrl(officialCareersHtml),
    thryveDigital.OFFICIAL_CAREERS_HANDOFF_URL,
  )
  assert.equal(thryveDigital.hasOfficialThryveDigitalCareersSignals(officialCareersHtml), true)
})

test('Thryve Digital run validates the first-party careers page before delegating to the Darwinbox India listing contract', async () => {
  const thryveDigital = await loadModule()
  const requestedPages = []
  const requestedTextUrls = []

  const jobs = await thryveDigital.createThryveDigitalScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedTextUrls.push(url)
      if (url === thryveDigital.OFFICIAL_CAREERS_URL) {
        return officialCareersHtml
      }

      throw new Error(`Unexpected Thryve Digital text URL: ${url}`)
    },
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)

      return {
        status: 'success',
        data: [
          {
            id: 'thryve-001',
            title: 'Senior Data Analyst',
            department_name: 'Analytics',
            locations: 'Hyderabad, Telangana, India',
            country: 'India',
            emp_type_name: 'Full Time',
            experience: '4 - 7 Years',
            posted_on: '17-Jul-2026',
            jd: '<p>Analyze healthcare operations data and build actionable insights.</p>',
          },
          {
            id: 'thryve-us-001',
            title: 'US Claims Specialist',
            department_name: 'Claims',
            locations: 'Pittsburgh, Pennsylvania, United States',
            country: 'United States',
            emp_type_name: 'Full Time',
            experience: '3 - 5 Years',
            posted_on: '17-Jul-2026',
            jd: '<p>Support US-only claims operations.</p>',
          },
        ],
        job_counts: 2,
      }
    },
  })

  assert.deepEqual(requestedTextUrls, [thryveDigital.OFFICIAL_CAREERS_URL])
  assert.deepEqual(requestedPages, [1])
  assert.deepEqual(jobs, [
    {
      title: 'Senior Data Analyst',
      company: 'Thryve Digital',
      department: 'Analytics',
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      jobId: 'thryve-001',
      requisitionId: null,
      sourceUrl: 'https://tdh.darwinbox.in/ms/candidatev2/main/careers/jobDetails/thryve-001',
      applyUrl: 'https://tdh.darwinbox.in/ms/candidatev2/main/careers/jobDetails/thryve-001',
      employmentType: 'Full Time',
      experienceRequired: '4 - 7 Years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '17-Jul-2026',
      closingDate: null,
      jobDescription: '<p>Analyze healthcare operations data and build actionable insights.</p>',
      source: 'thryvedigital',
      link: 'https://tdh.darwinbox.in/ms/candidatev2/main/careers/jobDetails/thryve-001',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  ])
})

test('Thryve Digital fails closed when the first-party careers handoff drifts', async () => {
  const thryveDigital = await loadModule()

  await assert.rejects(
    thryveDigital.createThryveDigitalScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified official careers page/i,
  )
})
