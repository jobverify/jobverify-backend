import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-25T00:00:00.000Z'

const officialCareersHtml = `
  <html>
    <head>
      <title>Careers at Quick Heal | Cybersecurity Jobs &amp; Career Opportunities</title>
    </head>
    <body>
      <p>Work with purpose. Grow from the experience. Innovate to shape the future with Quick Heal</p>
      <p>Innovator. Curious. Growth-mindset. Positive. Sounds like you?</p>
      <p>Customer Centricity is one the core values of Seqrite.</p>
      <a href="https://lifecycleqhtl.darwinbox.in/ms/candidate/careers">Apply for a job</a>
      <a href="https://lifecycleqhtl.darwinbox.in/ms/candidate/careers">Join Our Innovative Team</a>
    </body>
  </html>
`

const listingPayload = {
  job_counts: 2,
  data: [
    {
      id: 'seqrite-001',
      title: 'Senior Threat Researcher',
      department_name: 'Seqrite Labs',
      locations: 'Pune, Maharashtra, India',
      country: 'India',
      emp_type_name: 'Full Time',
      experience: '4 - 8 Years',
      posted_on: '25-Jul-2026',
      jd: '<p>Investigate emerging threats.</p>',
    },
    {
      id: 'non-india-001',
      title: 'Security Analyst',
      department_name: 'Seqrite Labs',
      locations: 'Austin, Texas, United States',
      country: 'United States',
      emp_type_name: 'Full Time',
      experience: '4 - 8 Years',
      posted_on: '25-Jul-2026',
      jd: '<p>Ignore this non-India role.</p>',
    },
  ],
}

const loadSeqriteModule = async () => {
  try {
    return await import('../seqrite/script.js')
  } catch {
    assert.fail('Expected Seqrite scraper module at ../seqrite/script.js')
  }
}

test('Seqrite pins the verified Quick Heal first-party careers handoff', async () => {
  const seqrite = await loadSeqriteModule()

  assert.equal(seqrite.SOURCE, 'seqrite')
  assert.equal(seqrite.COMPANY_NAME, 'Seqrite')
  assert.equal(seqrite.DARWINBOX_COMPANY_ID, 'main')
  assert.equal(seqrite.OFFICIAL_CAREERS_URL, 'https://www.quickheal.co.in/jobs-careers-at-quick-heal')
  assert.equal(seqrite.DARWINBOX_ORIGIN, 'https://lifecycleqhtl.darwinbox.in')
  assert.equal(
    seqrite.OFFICIAL_CAREERS_HANDOFF_URL,
    'https://lifecycleqhtl.darwinbox.in/ms/candidate/careers',
  )
  assert.equal(
    seqrite.PUBLIC_PORTAL_URL,
    'https://lifecycleqhtl.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  )
  assert.equal(seqrite.hasOfficialSeqriteCareersSignals(officialCareersHtml), true)
  assert.equal(
      seqrite.hasOfficialSeqriteCareersSignals(
      officialCareersHtml.replace(/lifecycleqhtl\.darwinbox\.in/g, 'example.com'),
    ),
    false,
  )
})

test('Seqrite maps verified Darwinbox listings into India jobs', async () => {
  const { createSeqriteScraper } = await loadSeqriteModule()
  const scraper = createSeqriteScraper({ now: () => FIXED_SCRAPED_AT })
  const requestedPages = []

  const jobs = await scraper.run({
    fetchText: async () => officialCareersHtml,
    fetchListingPage: async ({ page }) => {
      requestedPages.push(page)
      return listingPayload
    },
  })

  assert.deepEqual(requestedPages, [1])
  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].company, 'Seqrite')
  assert.equal(jobs[0].source, 'seqrite')
  assert.equal(jobs[0].jobId, 'seqrite-001')
  assert.equal(jobs[0].city, 'Pune')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
})
