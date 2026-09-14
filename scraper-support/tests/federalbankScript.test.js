import assert from 'node:assert/strict'
import test from 'node:test'

const loadFederalBankModule = async () => {
  try {
    return await import('../../scraper/federalbank/script.js')
  } catch {
    assert.fail('Expected Federal Bank scraper module at ../../scraper/federalbank/script.js')
  }
}

const officialCareersPage = `
  <html>
    <head><title>Careers at Federal Bank | Shape the Future of Banking</title></head>
    <body>
      <h1>Career - Welcome</h1>
      <a href="https://federalbankcareers.zappyhire.com/">Explore Opportunities</a>
      <p>Federal Bank announces its job openings only on its official website.</p>
    </body>
  </html>
`

const radwareChallengePage = `
  <html>
    <head><title>Radware Page</title></head>
    <body>
      <h1>Verifying your browser before proceeding...</h1>
    </body>
  </html>
`

const radwareBlockPage = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <title>Radware Block Page</title>
      <link rel="stylesheet" href="https://captcha.perfdrive.com/captcha-public/css/shieldsquare_styles.min.css">
    </head>
    <body>
      <script>
        var ssk = "botmanager_support@radware.com";
        window.SSJSConnectorObj = window.SSJSConnectorObj || {};
      </script>
    </body>
  </html>
`

const careersPortalShell = `
  <html>
    <head><title>Talent Connect</title></head>
    <body>
      <app-root></app-root>
      <script src="main-VHZBZ757.js" type="module"></script>
    </body>
  </html>
`

const currentClosedDashboardPayload = {
  status: 1,
  errors: '',
  results: {
    open_jobs: [
      {
        id: 3176,
        title: 'Apprentice',
        designation: 'Apprentice',
        experience_field: 'Freshers & Experienced',
        description: '<p>Federal Bank invites application from eligible graduate candidates.</p>',
        skills: [],
        job_url: 'https://nats.education.gov.in/regular_student.php',
        external_job_link: 'https://nats.education.gov.in/regular_student.php',
        deployment_location: 'Kerala, Tamil Nadu & Karnataka',
        engagement_type: 'Apprentice (1 Year)',
        job_portal_published_datetime: '10.03.2026',
        registration_closing_datetime: '23.59, 17th March 2026',
        is_registration_closed: true,
        qualification: 'Graduation',
        job_portal_free_text: [
          { label: 'Monthly Stipend', value: '₹18,000' },
        ],
      },
      {
        id: 3139,
        title: 'Associate Officer (Sales)',
        designation: 'Associate Officer (Sales)',
        experience_field: 'Freshers & Experienced',
        description: '<p>Sales role.</p>',
        skills: [],
        job_url: 'https://fedregister.zappyhire.com/start/3139/cl/ad',
        external_job_link: 'https://fedregister.zappyhire.com/start/3139/cl/ad',
        deployment_location: 'As per Notification',
        engagement_type: 'Full Time',
        job_portal_published_datetime: '20.02.2026',
        registration_closing_datetime: '23.59, 4th March 2026',
        is_registration_closed: true,
        qualification: 'Graduation',
        job_portal_free_text: [],
      },
    ],
  },
}

const mixedDashboardPayload = {
  status: 1,
  errors: '',
  results: {
    open_jobs: [
      {
        id: 4001,
        title: 'Relationship Manager',
        designation: 'Relationship Manager',
        experience_field: '1-3 years',
        description: '<p>Build customer relationships.</p>',
        skills: ['Sales', 'Client Acquisition'],
        job_url: 'https://fedregister.zappyhire.com/start/4001/rm/ad',
        external_job_link: 'https://fedregister.zappyhire.com/start/4001/rm/ad',
        deployment_location: 'Anywhere in India',
        engagement_type: 'Full Time',
        job_portal_published_datetime: '17.08.2026',
        registration_closing_datetime: '23.59, 31st August 2026',
        is_registration_closed: false,
        qualification: 'Graduation',
        job_portal_free_text: [
          { label: 'Band', value: 'Officer' },
        ],
      },
      {
        id: 3176,
        title: 'Apprentice',
        designation: 'Apprentice',
        experience_field: 'Freshers & Experienced',
        description: '<p>Federal Bank invites application from eligible graduate candidates.</p>',
        skills: [],
        job_url: 'https://nats.education.gov.in/regular_student.php',
        external_job_link: 'https://nats.education.gov.in/regular_student.php',
        deployment_location: 'Kerala, Tamil Nadu & Karnataka',
        engagement_type: 'Apprentice (1 Year)',
        job_portal_published_datetime: '10.03.2026',
        registration_closing_datetime: '23.59, 17th March 2026',
        is_registration_closed: true,
        qualification: 'Graduation',
        job_portal_free_text: [],
      },
    ],
  },
}

test('Federal Bank accepts the current Radware careers interstitial and returns [] when every public posting is already closed', async () => {
  const federalBank = await loadFederalBankModule()
  const requestedPages = []
  const requestedJson = []

  assert.equal(federalBank.hasRadwareChallengeSignal(radwareBlockPage), true)

  const jobs = await federalBank.createFederalBankScraper({
    now: () => '2026-08-17T12:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      requestedPages.push(url)

      if (url === federalBank.CAREER_PAGE_URL) {
        return { status: 200, url, html: radwareChallengePage }
      }

      if (url === federalBank.CAREERS_PORTAL_URL) {
        return { status: 200, url, html: careersPortalShell }
      }

      throw new Error(`Unexpected Federal Bank page URL: ${url}`)
    },
    fetchJson: async (url, requestInit) => {
      requestedJson.push({ url, requestInit })
      return currentClosedDashboardPayload
    },
  })

  assert.deepEqual(requestedPages, [
    'https://www.federal.bank.in/careers',
    'https://federalbankcareers.zappyhire.com/',
  ])
  assert.equal(requestedJson.length, 1)
  assert.equal(requestedJson[0].url, federalBank.DASHBOARD_API_URL)
  assert.equal(requestedJson[0].requestInit?.method, 'POST')
  assert.equal(requestedJson[0].requestInit?.body, '{}')
  assert.deepEqual(jobs, [])
})

test('Federal Bank returns normalized current openings from the public dashboard and filters out closed postings', async () => {
  const federalBank = await loadFederalBankModule()

  const jobs = await federalBank.createFederalBankScraper({
    now: () => '2026-08-17T12:00:00.000Z',
  }).run({
    fetchPage: async (url) => {
      if (url === federalBank.CAREER_PAGE_URL) {
        return { status: 200, url, html: officialCareersPage }
      }

      if (url === federalBank.CAREERS_PORTAL_URL) {
        return { status: 200, url, html: careersPortalShell }
      }

      throw new Error(`Unexpected Federal Bank page URL: ${url}`)
    },
    fetchJson: async () => mixedDashboardPayload,
  })

  assert.equal(jobs.length, 1)
  assert.equal(jobs[0].title, 'Relationship Manager')
  assert.equal(jobs[0].location, 'Anywhere in India')
  assert.equal(jobs[0].country, 'India')
  assert.equal(jobs[0].jobId, 'federalbank-4001')
  assert.equal(jobs[0].requisitionId, '4001')
  assert.equal(jobs[0].applyUrl, 'https://fedregister.zappyhire.com/start/4001/rm/ad')
  assert.equal(jobs[0].employmentType, 'Full-time')
  assert.equal(jobs[0].minimumQualification, 'Graduation')
  assert.equal(jobs[0].experienceRequired, '1-3 years')
  assert.equal(jobs[0].postingDate, '2026-08-17T00:00:00.000Z')
  assert.equal(jobs[0].closingDate, '2026-08-31T00:00:00.000Z')
  assert.match(jobs[0].jobDescription, /Build customer relationships/i)
  assert.match(jobs[0].jobDescription, /Band: Officer/i)
  assert.equal(jobs[0].source, 'federalbank')
  assert.equal(jobs[0].companyCareerPage, 'https://www.federal.bank.in/careers')
  assert.equal(jobs[0].companyDomain, 'federal.bank.in')
  assert.equal(jobs[0].atsPlatform, 'zappyhire-job-portal')
  assert.equal(jobs[0].scrapedAt, '2026-08-17T12:00:00.000Z')
})

test('Federal Bank fails closed when the careers surface, portal shell, or dashboard contract changes', async () => {
  const federalBank = await loadFederalBankModule()

  await assert.rejects(
    federalBank.createFederalBankScraper().run({
      fetchPage: async (url) => {
        if (url === federalBank.CAREER_PAGE_URL) {
          return { status: 200, url, html: '<html><title>Unexpected</title></html>' }
        }

        throw new Error(`Unexpected Federal Bank page URL: ${url}`)
      },
    }),
    /Federal Bank official careers surface changed/i,
  )

  await assert.rejects(
    federalBank.createFederalBankScraper().run({
      fetchPage: async (url) => {
        if (url === federalBank.CAREER_PAGE_URL) {
          return { status: 200, url, html: officialCareersPage }
        }

        if (url === federalBank.CAREERS_PORTAL_URL) {
          return { status: 200, url, html: '<html><title>Broken</title></html>' }
        }

        throw new Error(`Unexpected Federal Bank page URL: ${url}`)
      },
    }),
    /Federal Bank public careers portal changed/i,
  )

  await assert.rejects(
    federalBank.createFederalBankScraper().run({
      fetchPage: async (url) => {
        if (url === federalBank.CAREER_PAGE_URL) {
          return { status: 200, url, html: officialCareersPage }
        }

        if (url === federalBank.CAREERS_PORTAL_URL) {
          return { status: 200, url, html: careersPortalShell }
        }

        throw new Error(`Unexpected Federal Bank page URL: ${url}`)
      },
      fetchJson: async () => ({ status: 0, errors: 'broken', results: {} }),
    }),
    /Federal Bank public dashboard payload changed/i,
  )
})
