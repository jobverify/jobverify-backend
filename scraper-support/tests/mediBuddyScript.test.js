import assert from 'node:assert/strict'
import test from 'node:test'

const loadMediBuddyModule = async () => {
  try {
    return await import('../../scraper/medibuddy/script.js')
  } catch {
    assert.fail('Expected MediBuddy scraper module at ../../scraper/medibuddy/script.js')
  }
}

const INDORE_PAGE_HTML = `
  <html>
    <body>
      <h1>#BaatBadiHaiYeMediBuddyHai</h1>
      <section id="job-openings">
        <h2>Available Positions</h2>
        <h2>Associate/ Senior Associate - Operations</h2>
        <a href="https://medibuddy.hire.trakstar.com/jobs/fk0pg7p/">Apply</a>
      </section>
      <div>Testimonials</div>
    </body>
  </html>
`

const MEDIREVIVA_PAGE_HTML = `
  <html>
    <body>
      <h1>MediReViva</h1>
      <section id="available-positions">
        <h2>Available Positions</h2>
        <h2>Financial Analyst - AR</h2>
        <a href="https://docs.google.com/document/d/18zXKapwfIJPCaLmSHsG4Z6z2_JRjB3mEgsRX4xPB43c/edit?usp=sharing">View Job Description</a>
        <a href="https://form.typeform.com/to/lCYKMpLE?typeform-source=www.google.com">Apply</a>
      </section>
      <div>FAQ</div>
    </body>
  </html>
`

const TRAKSTAR_INACTIVE_HTML = `
  <html>
    <body>
      <h1>Inactive account.</h1>
      <p>This employer is no longer using Trakstar Hire to collect applications.</p>
    </body>
  </html>
`

const DOC_EXPORT_TEXT = `
Financial Analyst – Finance & Accounts Team
Location: Onsite (No remote or hybrid work)
About MediBuddy

Role Overview
We are looking for a detail-oriented and proactive Financial Analyst to join our Finance & Accounts team.

Key Responsibilities
Build reports and reconcile accounts.

Work Mode
Onsite only (No remote/hybrid options)
`

test('MediBuddy skips inactive Trakstar listings and parses public Google Doc exports', async () => {
  const medibuddy = await loadMediBuddyModule()

  assert.equal(medibuddy.hasOfficialJobsPageSignal(INDORE_PAGE_HTML), true)
  assert.equal(medibuddy.hasOfficialJobsPageSignal(MEDIREVIVA_PAGE_HTML), true)
  assert.equal(medibuddy.isInactiveTrakstarAccount(TRAKSTAR_INACTIVE_HTML), true)
  assert.equal(
    medibuddy.getGoogleDocExportUrl('https://docs.google.com/document/d/abc123/edit?usp=sharing'),
    'https://docs.google.com/document/d/abc123/export?format=txt',
  )

  const jobs = await medibuddy.createMediBuddyScraper().run({
    fetchText: async (url) => {
      if (url === medibuddy.FIRST_PARTY_JOB_PAGES[0]) return INDORE_PAGE_HTML
      if (url === medibuddy.FIRST_PARTY_JOB_PAGES[1]) return MEDIREVIVA_PAGE_HTML
      if (url === medibuddy.TRAKSTAR_ROOT_JOBS_URL) return TRAKSTAR_INACTIVE_HTML
      if (url === 'https://docs.google.com/document/d/18zXKapwfIJPCaLmSHsG4Z6z2_JRjB3mEgsRX4xPB43c/export?format=txt') {
        return DOC_EXPORT_TEXT
      }
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-25T12:00:00.000Z',
  })

  assert.deepEqual(jobs, [
    {
      title: 'Financial Analyst - AR',
      company: 'MediBuddy',
      department: null,
      location: null,
      city: null,
      country: 'India',
      source: 'medibuddy',
      jobId: '18zXKapwfIJPCaLmSHsG4Z6z2_JRjB3mEgsRX4xPB43c',
      requisitionId: '18zXKapwfIJPCaLmSHsG4Z6z2_JRjB3mEgsRX4xPB43c',
      sourceUrl: 'https://docs.google.com/document/d/18zXKapwfIJPCaLmSHsG4Z6z2_JRjB3mEgsRX4xPB43c/edit?usp=sharing',
      applyUrl: 'https://form.typeform.com/to/lCYKMpLE?typeform-source=www.google.com',
      link: 'https://docs.google.com/document/d/18zXKapwfIJPCaLmSHsG4Z6z2_JRjB3mEgsRX4xPB43c/edit?usp=sharing',
      employmentType: 'Internship',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription:
        'Role Overview We are looking for a detail-oriented and proactive Financial Analyst to join our Finance & Accounts team. Work Mode Onsite only (No remote/hybrid options)',
      remoteStatus: 'On-site',
      scrapedAt: '2026-07-25T12:00:00.000Z',
    },
  ])
})
