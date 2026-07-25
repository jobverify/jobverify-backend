import assert from 'node:assert/strict'
import test from 'node:test'

const indoreJobsHtml = `
  <div id="job-openings">
    <h1>#BaatBadiHaiYeMediBuddyHai</h1>
    <h1>Available Positions</h1>
    <div class="role-card">
      <h2>Associate/ Senior Associate - Operations</h2>
      <a href="https://medibuddy.hire.trakstar.com/jobs/fk0pg7p/" target="_blank" rel="noopener">Apply</a>
      <a href="https://medibuddy.hire.trakstar.com/jobs/fk0pg7p/" target="_blank" rel="noopener">View Job Description</a>
    </div>
    <div class="role-card">
      <h2>Operations - TL/AM</h2>
      <a href="https:/https://medibuddy.hire.trakstar.com/jobs/fk0pg7u/medibuddy.hire.trakstar.com/jobs/fk0pg7p/" target="_blank" rel="noopener">Apply</a>
      <a href="https://mhttps://medibuddy.hire.trakstar.com/jobs/fk0pg7u/edibuddy.hire.trakstar.com/jobs/fk0pg7p/" target="_blank" rel="noopener">View Job Description</a>
    </div>
    <div class="role-card">
      <h2>HR Generalist</h2>
      <a href="https://medibuddy.hire.trakstar.com/jobs/fk0pg77/" target="_blank" rel="noopener">Apply</a>
      <a href="https://medibuddy.hire.trakstar.com/jobs/fk0pg77/" target="_blank" rel="noopener">View Job Description</a>
    </div>
  </div>
`

const mediRevivaJobsHtml = `
  <div id="available-positions">
    <h1>MediReViva: Empowering Women to Reignite Their Careers</h1>
    <p>Individuals who can commit to the full duration of the six-month office based program.</p>
    <h1>Available Positions</h1>
    <div class="role-card">
      <h2>Financial Analyst - AR</h2>
      <a href="https://form.typeform.com/to/lCYKMpLE?typeform-source=www.google.com" target="_blank" rel="noopener">Apply</a>
      <a href="https://docs.google.com/document/d/18zXKapwfIJPCaLmSHsG4Z6z2_JRjB3mEgsRX4xPB43c/edit?usp=sharing" target="_blank" rel="noopener">View Job Description</a>
    </div>
    <div class="role-card">
      <h2>Operations Automation Associate</h2>
      <a href="https://form.typeform.com/to/lCYKMpLE?typeform-source=www.google.com" target="_blank" rel="noopener">Apply</a>
      <a href="https://docs.google.com/document/d/1ZD7raKT5NdnyEr7TDFvo_AxCaEgL7Eag3yu5ozTPyUg/edit?usp=sharing" target="_blank" rel="noopener">View Job Description</a>
    </div>
  </div>
`

const operationsDetailHtml = `
  <html>
    <body>
      <h1>Associate/ Senior Associate - Operations</h1>
      <p>Indore, Madhya Pradesh, India | operations | Full-time</p>
      <p>About the role - The Insurance Operations Associate/Senior Associate will manage day-to-day operations involving customers and diagnostic centers.</p>
      <ul>
        <li>Freshers - 2 years in backend operations.</li>
      </ul>
      <h2>Application Form</h2>
    </body>
  </html>
`

const tlAmDetailHtml = `
  <html>
    <body>
      <h1>Operations - TL/AM</h1>
      <p>Indore, Madhya Pradesh, India | operations | Full-time</p>
      <p>Lead day-to-day operations execution and team performance.</p>
      <h2>Application Form</h2>
    </body>
  </html>
`

const hrGeneralistDetailHtml = `
  <html>
    <body>
      <h1>HR Generalist</h1>
      <p>Indore, Madhya Pradesh, India | human resources | Full-time</p>
      <p>Support HR operations, employee engagement, and hiring coordination.</p>
      <h2>Application Form</h2>
    </body>
  </html>
`

const financialAnalystDocHtml = `
  <html>
    <head>
      <title>MediBuddy - JD Financial Analyst - AR - Google Docs</title>
      <meta property="og:title" content="MediBuddy - JD Financial Analyst - AR">
    </head>
    <body>
      <script>
        var DOCS_modelChunk = "Financial Analyst - AR\\u000bLocation: Onsite (No remote or hybrid work)\\u000bRole Overview\\u000bWe are looking for a detail-oriented and proactive Financial Analyst to join our Finance & Accounts team.\\u000bWork Mode\\u000bOnsite only (No remote/hybrid options)";
      </script>
    </body>
  </html>
`

const operationsAutomationDocHtml = `
  <html>
    <head>
      <title>MediBuddy - JD Operations Automation Associate - Google Docs</title>
      <meta property="og:title" content="MediBuddy - JD Operations Automation Associate">
    </head>
    <body>
      <script>
        var DOCS_modelChunk = "Operations Automation Associate\\u000bLocation: Onsite (No remote or hybrid work)\\u000bRole Overview\\u000bDrive process automation and workflow improvements for operations teams.\\u000bWork Mode\\u000bOnsite only";
      </script>
    </body>
  </html>
`

const loadMediBuddyModule = async () => {
  try {
    return await import('../medibuddy/script.js')
  } catch {
    assert.fail('Expected MediBuddy scraper module at ../medibuddy/script.js')
  }
}

test('MediBuddy exports the verified first-party page constants and recognizes both official jobs surfaces', async () => {
  const mediBuddy = await loadMediBuddyModule()

  assert.deepEqual(mediBuddy.FIRST_PARTY_JOB_PAGES, [
    'https://www.medibuddy.in/health-services/indore-job-openings',
    'https://www.medibuddy.in/health-services/medireviva',
  ])
  assert.equal(mediBuddy.TRAKSTAR_JOBS_HOST, 'https://medibuddy.hire.trakstar.com')
  assert.equal(
    mediBuddy.MEDIREVIVA_APPLY_URL,
    'https://form.typeform.com/to/lCYKMpLE?typeform-source=www.google.com',
  )
  assert.equal(mediBuddy.hasOfficialJobsPageSignal(indoreJobsHtml), true)
  assert.equal(mediBuddy.hasOfficialJobsPageSignal(mediRevivaJobsHtml), true)
})

test('MediBuddy extracts verified role cards from both first-party pages and normalizes malformed Trakstar URLs', async () => {
  const mediBuddy = await loadMediBuddyModule()

  assert.deepEqual(
    mediBuddy.extractListingCards(indoreJobsHtml, mediBuddy.FIRST_PARTY_JOB_PAGES[0]).map((listing) => ({
      title: listing.title,
      sourceUrl: listing.sourceUrl,
      applyUrl: listing.applyUrl,
      detailKind: listing.detailKind,
      employmentType: listing.employmentType,
    })),
    [
      {
        title: 'Associate/ Senior Associate - Operations',
        sourceUrl: 'https://medibuddy.hire.trakstar.com/jobs/fk0pg7p/',
        applyUrl: 'https://medibuddy.hire.trakstar.com/jobs/fk0pg7p/',
        detailKind: 'trakstar',
        employmentType: null,
      },
      {
        title: 'Operations - TL/AM',
        sourceUrl: 'https://medibuddy.hire.trakstar.com/jobs/fk0pg7u/',
        applyUrl: 'https://medibuddy.hire.trakstar.com/jobs/fk0pg7u/',
        detailKind: 'trakstar',
        employmentType: null,
      },
      {
        title: 'HR Generalist',
        sourceUrl: 'https://medibuddy.hire.trakstar.com/jobs/fk0pg77/',
        applyUrl: 'https://medibuddy.hire.trakstar.com/jobs/fk0pg77/',
        detailKind: 'trakstar',
        employmentType: null,
      },
    ],
  )

  assert.deepEqual(
    mediBuddy.extractListingCards(mediRevivaJobsHtml, mediBuddy.FIRST_PARTY_JOB_PAGES[1]).map((listing) => ({
      title: listing.title,
      sourceUrl: listing.sourceUrl,
      applyUrl: listing.applyUrl,
      detailKind: listing.detailKind,
      employmentType: listing.employmentType,
    })),
    [
      {
        title: 'Financial Analyst - AR',
        sourceUrl: 'https://docs.google.com/document/d/18zXKapwfIJPCaLmSHsG4Z6z2_JRjB3mEgsRX4xPB43c/edit?usp=sharing',
        applyUrl: 'https://form.typeform.com/to/lCYKMpLE?typeform-source=www.google.com',
        detailKind: 'public-doc',
        employmentType: 'Internship',
      },
      {
        title: 'Operations Automation Associate',
        sourceUrl: 'https://docs.google.com/document/d/1ZD7raKT5NdnyEr7TDFvo_AxCaEgL7Eag3yu5ozTPyUg/edit?usp=sharing',
        applyUrl: 'https://form.typeform.com/to/lCYKMpLE?typeform-source=www.google.com',
        detailKind: 'public-doc',
        employmentType: 'Internship',
      },
    ],
  )
})

test('MediBuddy enriches Trakstar and public-doc details into the shared job shape conservatively', async () => {
  const mediBuddy = await loadMediBuddyModule()

  const trakstarListing = mediBuddy.extractListingCards(indoreJobsHtml, mediBuddy.FIRST_PARTY_JOB_PAGES[0])[0]
  assert.deepEqual(mediBuddy.extractTrakstarDetail(operationsDetailHtml, trakstarListing), {
    title: 'Associate/ Senior Associate - Operations',
    department: 'operations',
    location: 'Indore, Madhya Pradesh, India',
    city: 'Indore',
    employmentType: 'Full-time',
    experienceRequired: '2 years',
    jobDescription:
      'About the role - The Insurance Operations Associate/Senior Associate will manage day-to-day operations involving customers and diagnostic centers. Freshers - 2 years in backend operations.',
    remoteStatus: 'On-site',
  })

  const docListing = mediBuddy.extractListingCards(mediRevivaJobsHtml, mediBuddy.FIRST_PARTY_JOB_PAGES[1])[0]
  assert.deepEqual(mediBuddy.extractGoogleDocDetail(financialAnalystDocHtml, docListing), {
    title: 'Financial Analyst - AR',
    location: null,
    city: null,
    employmentType: 'Internship',
    experienceRequired: null,
    jobDescription:
      'Role Overview We are looking for a detail-oriented and proactive Financial Analyst to join our Finance & Accounts team. Work Mode Onsite only (No remote/hybrid options)',
    remoteStatus: 'On-site',
  })
})

test('MediBuddy run verifies the first-party pages, fetches each role detail, and emits both Indore and MediReViva jobs', async () => {
  const mediBuddy = await loadMediBuddyModule()
  const requested = []

  const jobs = await mediBuddy.createMediBuddyScraper({ maxJobs: 5 }).run({
    fetchText: async (url) => {
      requested.push(url)

      if (url === mediBuddy.FIRST_PARTY_JOB_PAGES[0]) return indoreJobsHtml
      if (url === mediBuddy.FIRST_PARTY_JOB_PAGES[1]) return mediRevivaJobsHtml
      if (url === 'https://medibuddy.hire.trakstar.com/jobs/fk0pg7p/') return operationsDetailHtml
      if (url === 'https://medibuddy.hire.trakstar.com/jobs/fk0pg7u/') return tlAmDetailHtml
      if (url === 'https://medibuddy.hire.trakstar.com/jobs/fk0pg77/') return hrGeneralistDetailHtml
      if (url === 'https://docs.google.com/document/d/18zXKapwfIJPCaLmSHsG4Z6z2_JRjB3mEgsRX4xPB43c/edit?usp=sharing') {
        return financialAnalystDocHtml
      }
      if (url === 'https://docs.google.com/document/d/1ZD7raKT5NdnyEr7TDFvo_AxCaEgL7Eag3yu5ozTPyUg/edit?usp=sharing') {
        return operationsAutomationDocHtml
      }

      throw new Error(`Unexpected MediBuddy fixture URL: ${url}`)
    },
    now: () => '2026-07-16T00:00:00.000Z',
  })

  assert.deepEqual(requested, [
    mediBuddy.FIRST_PARTY_JOB_PAGES[0],
    mediBuddy.FIRST_PARTY_JOB_PAGES[1],
    'https://medibuddy.hire.trakstar.com/jobs/fk0pg7p/',
    'https://medibuddy.hire.trakstar.com/jobs/fk0pg7u/',
    'https://medibuddy.hire.trakstar.com/jobs/fk0pg77/',
    'https://docs.google.com/document/d/18zXKapwfIJPCaLmSHsG4Z6z2_JRjB3mEgsRX4xPB43c/edit?usp=sharing',
    'https://docs.google.com/document/d/1ZD7raKT5NdnyEr7TDFvo_AxCaEgL7Eag3yu5ozTPyUg/edit?usp=sharing',
  ])
  assert.equal(jobs.length, 5)
  assert.deepEqual(jobs[0], {
    title: 'Associate/ Senior Associate - Operations',
    company: 'MediBuddy',
    department: 'operations',
    location: 'Indore, Madhya Pradesh, India',
    city: 'Indore',
    country: 'India',
    source: 'medibuddy',
    jobId: 'fk0pg7p',
    requisitionId: 'fk0pg7p',
    sourceUrl: 'https://medibuddy.hire.trakstar.com/jobs/fk0pg7p/',
    applyUrl: 'https://medibuddy.hire.trakstar.com/jobs/fk0pg7p/',
    link: 'https://medibuddy.hire.trakstar.com/jobs/fk0pg7p/',
    employmentType: 'Full-time',
    experienceRequired: '2 years',
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription:
      'About the role - The Insurance Operations Associate/Senior Associate will manage day-to-day operations involving customers and diagnostic centers. Freshers - 2 years in backend operations.',
    remoteStatus: 'On-site',
    scrapedAt: '2026-07-16T00:00:00.000Z',
  })
  assert.equal(jobs[3].title, 'Financial Analyst - AR')
  assert.equal(jobs[3].sourceUrl, 'https://docs.google.com/document/d/18zXKapwfIJPCaLmSHsG4Z6z2_JRjB3mEgsRX4xPB43c/edit?usp=sharing')
  assert.equal(jobs[3].applyUrl, mediBuddy.MEDIREVIVA_APPLY_URL)
  assert.equal(jobs[3].employmentType, 'Internship')
  assert.equal(jobs[3].location, null)
  assert.equal(jobs[3].remoteStatus, 'On-site')
})

test('MediBuddy fails closed when a verified first-party jobs page drifts away from the expected surface', async () => {
  const mediBuddy = await loadMediBuddyModule()

  await assert.rejects(
    mediBuddy.createMediBuddyScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected surface</h1></body></html>',
    }),
    /verified MediBuddy first-party jobs page/i,
  )
})
