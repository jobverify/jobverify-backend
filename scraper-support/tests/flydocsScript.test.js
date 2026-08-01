import assert from 'node:assert/strict'
import test from 'node:test'

const loadFlydocsModule = async () => {
  try {
    return await import('../../scraper/flydocs/script.js')
  } catch {
    assert.fail('Expected Flydocs scraper module at ../../scraper/flydocs/script.js')
  }
}

const officialCareersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Vacancies | flydocs</title>
      <link rel="canonical" href="https://flydocs.aero/vacancies/">
    </head>
    <body>
      <main>
        <h1>Current Vacancies</h1>

        <article class="job-card">
          <h2><a href="https://zrec.in/TLOM1?source=flydocsWebsite">Technical Records Manager</a></h2>
          <p>Location: Pune, India</p>
          <p>Department: Operations</p>
          <p>Employment Type: Full time</p>
          <p>Support airline customers across records and compliance workflows.</p>
        </article>

        <article class="job-card">
          <h2>
            <a href="https://flydocs.zohorecruit.in/jobs/Careers/61915000010176003/Customer-Experience-Tier-1?source=flydocsWebsite">
              Customer Experience Tier 1
            </a>
          </h2>
          <p>Location: Bengaluru, India</p>
          <p>Department: Customer Experience</p>
          <p>Employment Type: Full time</p>
          <p>Handle customer support operations for aviation software users.</p>
        </article>

        <article class="job-card">
          <h2><a href="https://zrec.in/stale-role?source=flydocsWebsite">Legacy Role</a></h2>
          <p>Location: Remote</p>
        </article>

        <article class="job-card">
          <h2>
            <a href="https://flydocs.zohorecruit.in/jobs/Careers/61915000010176099/Dubai-Operations?source=flydocsWebsite">
              Dubai Operations
            </a>
          </h2>
          <p>Location: Dubai, United Arab Emirates</p>
        </article>
      </main>
    </body>
  </html>
`

test('Flydocs constants and official page signal stay pinned to the verified public vacancies page', async () => {
  const flydocs = await loadFlydocsModule()

  assert.equal(flydocs.CAREERS_URL, 'https://flydocs.aero/vacancies/')
  assert.equal(flydocs.COMPANY, 'flydocs')
  assert.equal(flydocs.SOURCE, 'flydocs')
  assert.equal(flydocs.hasOfficialCareersSignal(officialCareersHtml), true)
})

test('extractIndiaJobs keeps India roles from the official Flydocs page and normalizes shortlinks to public Zoho detail URLs', async () => {
  const flydocs = await loadFlydocsModule()

  const jobs = await flydocs.extractIndiaJobs(officialCareersHtml, {
    resolveJobUrl: async (url) => {
      if (url === 'https://zrec.in/TLOM1?source=flydocsWebsite') {
        return 'https://flydocs.zohorecruit.in/jobs/Careers/61915000008622445/Technical-Records-Manager?source=flydocsWebsite'
      }

      return null
    },
  })

  assert.deepEqual(jobs, [
    {
      title: 'Technical Records Manager',
      company: 'flydocs',
      department: 'Operations',
      location: 'Pune, India',
      city: 'Pune',
      country: 'India',
      jobId: '61915000008622445',
      requisitionId: '61915000008622445',
      sourceUrl: 'https://flydocs.zohorecruit.in/jobs/Careers/61915000008622445/Technical-Records-Manager?source=flydocsWebsite',
      applyUrl: 'https://flydocs.zohorecruit.in/jobs/Careers/61915000008622445/Technical-Records-Manager?source=flydocsWebsite',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Support airline customers across records and compliance workflows.',
    },
    {
      title: 'Customer Experience Tier 1',
      company: 'flydocs',
      department: 'Customer Experience',
      location: 'Bengaluru, India',
      city: 'Bangalore',
      country: 'India',
      jobId: '61915000010176003',
      requisitionId: '61915000010176003',
      sourceUrl: 'https://flydocs.zohorecruit.in/jobs/Careers/61915000010176003/Customer-Experience-Tier-1?source=flydocsWebsite',
      applyUrl: 'https://flydocs.zohorecruit.in/jobs/Careers/61915000010176003/Customer-Experience-Tier-1?source=flydocsWebsite',
      employmentType: 'Full-time',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Handle customer support operations for aviation software users.',
    },
  ])
})

test('run validates the official Flydocs vacancies page, resolves shortlinks, and decorates shared runner fields', async () => {
  const flydocs = await loadFlydocsModule()
  const requestedUrls = []
  const resolvedUrls = []

  const jobs = await flydocs.createFlydocsScraper({ maxJobs: 1 }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === flydocs.CAREERS_URL) return officialCareersHtml
      throw new Error(`Unexpected URL: ${url}`)
    },
    resolveJobUrl: async (url) => {
      resolvedUrls.push(url)
      if (url === 'https://zrec.in/TLOM1?source=flydocsWebsite') {
        return 'https://flydocs.zohorecruit.in/jobs/Careers/61915000008622445/Technical-Records-Manager?source=flydocsWebsite'
      }

      return null
    },
    now: () => '2026-07-09T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, ['https://flydocs.aero/vacancies/'])
  assert.deepEqual(resolvedUrls, [
    'https://zrec.in/TLOM1?source=flydocsWebsite',
    'https://zrec.in/stale-role?source=flydocsWebsite',
  ])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].source, 'flydocs')
  assert.equal(
    jobs[0].link,
    'https://flydocs.zohorecruit.in/jobs/Careers/61915000008622445/Technical-Records-Manager?source=flydocsWebsite',
  )
  assert.equal(jobs[0].scrapedAt, '2026-07-09T00:00:00.000Z')
})

test('run fails closed when the Flydocs official vacancies signal disappears', async () => {
  const flydocs = await loadFlydocsModule()

  await assert.rejects(
    flydocs.createFlydocsScraper().run({
      fetchText: async () => '<html><body>Unexpected page</body></html>',
    }),
    /official Flydocs vacancies page/i,
  )
})
