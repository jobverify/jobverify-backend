import assert from 'node:assert/strict'
import test from 'node:test'

const loadSybroxModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Sybrox Tech</title>
  </head>
  <body>
    <main>
      <h1>Empowering Businesses with Innovation & Technology</h1>
      <p>Sybrox is a next-generation IT training and career-launch platform built for the real world.</p>
      <p>Paid Internships</p>
      <p>Sybrox Tech Pvt. Ltd. is a fast-growing IT startup committed to building innovative mobile apps, software solutions and next-generation digital platforms.</p>
      <p>careers@sybrox.com</p>
    </main>
  </body>
</html>
`

const aboutHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>About Us</title>
  </head>
  <body>
    <main>
      <h1>About Us</h1>
      <p>Innovation. Integrity. Impact.</p>
      <p>Sybrox is an integrated IT services, consulting, and training company that blends innovation with expertise to deliver impactful business and learning solutions.</p>
      <p>We bring together IT services, consulting, training, and staffing under one roof.</p>
      <p>Sybrox Tech Pvt. Ltd. is a fast-growing IT startup committed to building innovative mobile apps, software solutions and next-generation digital platforms.</p>
      <p>careers@sybrox.com</p>
    </main>
  </body>
</html>
`

const contactHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Contact Us</title>
  </head>
  <body>
    <main>
      <h1>Contact Us</h1>
      <p>Let’s Build Something Great Together</p>
      <p>Business Inquiries: info@sybrox.com</p>
      <p>Join Our Team: careers@sybrox.com</p>
      <p>Services Inquiries: services@sybrox.com</p>
      <p>Working Hours: Mon–Sat, 9:00 AM – 6:00 PM IST</p>
      <p>Sybrox Tech Pvt. Ltd. is a fast-growing IT startup committed to building innovative mobile apps, software solutions and next-generation digital platforms.</p>
    </main>
  </body>
</html>
`

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>RPO Partner Vacancies</title>
  </head>
  <body>
    <main>
      <h1>RPO Partner Vacancies</h1>
      <p>Discover exciting career opportunities with leading organizations through Sybrox RPO Services.</p>

      <h3>Voice Process – Telesales (Lead Generation)</h3>
      <p>Chennai | Full time | Experience: Freshers & Experienced</p>
      <p>Required Skill: Tamil / Malayalam Communication, Telesales, Lead Generation</p>
      <p>+</p>
      <p>Job: Voice Process – Personal Loan Sales</p>
      <p>Openings: 200 Vacancies</p>
      <h4>Job Description</h4>
      <p>Process Type: Lead Generation – Personal Loan Sales</p>
      <p>Languages Required: Tamil & Malayalam</p>
      <p>Location: Chennai</p>
      <p>Eligibility: 12th Pass / Any Degree (Freshers & Experienced Welcome)</p>
      <p>Shift Timing: 9:30 AM – 6:30 PM</p>
      <p>Week Off: Sunday Fixed</p>
      <p>Benefits: PF, ESIC & Other Company Perks</p>
      <a href="https://forms.gle/o43Zh9YvfH4sRCvo8">Apply Now</a>

      <h3>Non-Voice Process – Data Entry</h3>
      <p>Chennai | Full time | Experience: Freshers & Experienced</p>
      <p>Required Skill: Typing, Data Entry, Attention to Detail</p>
      <p>+</p>
      <p>Job: Data Entry Executive – Poonawalla Finance</p>
      <p>Openings: 50 Vacancies</p>
      <h4>Job Description</h4>
      <p>Company: Poonawalla Finance</p>
      <p>Location: Chennai</p>
      <p>Eligibility: 12th / Any Degree (Freshers & Experienced Welcome)</p>
      <p>Shift Timing: Rotational</p>
      <p>Week Off: Rotational</p>
      <p>Benefits: PF, ESIC & Other Company Perks</p>
      <a href="https://forms.gle/o43Zh9YvfH4sRCvo8">Apply Now</a>

      <p>Sybrox Tech Pvt. Ltd. is a fast-growing IT startup committed to building innovative mobile apps, software solutions and next-generation digital platforms.</p>
      <p>careers@sybrox.com</p>
    </main>
  </body>
</html>
`

test('Sybrox scraper recognizes the verified homepage, about, contact, and RPO vacancies surface', async () => {
  const sybrox = await loadSybroxModule()
  assert.ok(sybrox, 'Expected scraper module at ./script.js')

  assert.equal(sybrox.SOURCE, 'sybrox')
  assert.equal(sybrox.COMPANY, 'Sybrox Tech Pvt. Ltd.')
  assert.equal(sybrox.HOMEPAGE_URL, 'https://sybrox.com/')
  assert.equal(sybrox.ABOUT_URL, 'https://sybrox.com/about')
  assert.equal(sybrox.CONTACT_URL, 'https://sybrox.com/contact')
  assert.equal(sybrox.CAREERS_URL, 'https://sybrox.com/rpo%20partner%20vacancies')
  assert.equal(sybrox.APPLY_URL, 'https://forms.gle/o43Zh9YvfH4sRCvo8')
  assert.equal(sybrox.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(sybrox.hasOfficialAboutSignal(aboutHtml), true)
  assert.equal(sybrox.hasOfficialContactSignal(contactHtml), true)
  assert.equal(sybrox.hasOfficialCareersSignal(careersHtml), true)
  assert.deepEqual(sybrox.extractApplyUrls(careersHtml), ['https://forms.gle/o43Zh9YvfH4sRCvo8'])
})

test('Sybrox scraper extracts jobs from the verified first-party RPO vacancies page', async () => {
  const sybrox = await loadSybroxModule()
  assert.ok(sybrox, 'Expected scraper module at ./script.js')

  const jobs = sybrox.extractJobs(careersHtml)
  assert.equal(jobs.length, 2)

  assert.deepEqual(jobs[0], {
    title: 'Voice Process – Personal Loan Sales',
    company: 'Sybrox Tech Pvt. Ltd.',
    department: 'Voice Process – Telesales (Lead Generation)',
    location: 'Chennai',
    city: 'Chennai',
    state: null,
    country: 'India',
    jobId: 'sybrox-sybrox-tech-pvt-ltd-voice-process-personal-loan-sales-chennai',
    requisitionId: 'sybrox-sybrox-tech-pvt-ltd-voice-process-personal-loan-sales-chennai',
    sourceUrl: 'https://sybrox.com/rpo%20partner%20vacancies',
    applyUrl: 'https://forms.gle/o43Zh9YvfH4sRCvo8',
    employmentType: 'Full-time',
    experienceRequired: 'Freshers & Experienced',
    minimumQualification: '12th Pass / Any Degree (Freshers & Experienced Welcome)',
    preferredQualification: null,
    requiredSkills: ['Tamil / Malayalam Communication', 'Telesales', 'Lead Generation'],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Process Type: Lead Generation – Personal Loan Sales\nLanguages Required: Tamil & Malayalam\nLocation: Chennai\nEligibility: 12th Pass / Any Degree (Freshers & Experienced Welcome)\nShift Timing: 9:30 AM – 6:30 PM\nWeek Off: Sunday Fixed\nBenefits: PF, ESIC & Other Company Perks',
    remoteStatus: 'On-site',
  })

  assert.equal(jobs[1].title, 'Data Entry Executive – Poonawalla Finance')
  assert.equal(jobs[1].company, 'Poonawalla Finance')
  assert.equal(jobs[1].department, 'Non-Voice Process – Data Entry')
  assert.equal(jobs[1].applyUrl, 'https://forms.gle/o43Zh9YvfH4sRCvo8')
  assert.equal(jobs[1].employmentType, 'Full-time')
  assert.equal(jobs[1].experienceRequired, 'Freshers & Experienced')
  assert.deepEqual(jobs[1].requiredSkills, ['Typing', 'Data Entry', 'Attention to Detail'])
})

test('Sybrox run validates the official first-party surface and returns stamped jobs', async () => {
  const sybrox = await loadSybroxModule()
  assert.ok(sybrox, 'Expected scraper module at ./script.js')

  const requestedUrls = []
  const jobs = await sybrox.createSybroxScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === sybrox.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === sybrox.ABOUT_URL) return { status: 200, url, html: aboutHtml }
      if (url === sybrox.CONTACT_URL) return { status: 200, url, html: contactHtml }
      if (url === sybrox.CAREERS_URL) return { status: 200, url, html: careersHtml }
      throw new Error(`Unexpected URL: ${url}`)
    },
    now: () => '2026-07-12T00:00:00.000Z',
  })

  assert.deepEqual(requestedUrls, [
    sybrox.HOMEPAGE_URL,
    sybrox.ABOUT_URL,
    sybrox.CONTACT_URL,
    sybrox.CAREERS_URL,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'sybrox')
  assert.equal(jobs[0].link, 'https://forms.gle/o43Zh9YvfH4sRCvo8')
  assert.equal(jobs[0].scrapedAt, '2026-07-12T00:00:00.000Z')
})

test('Sybrox default fetch path applies a bounded timeout to every request', async () => {
  const sybrox = await loadSybroxModule()
  assert.ok(sybrox, 'Expected scraper module at ./script.js')

  const originalFetch = globalThis.fetch
  const originalTimeout = AbortSignal.timeout
  const timeoutCalls = []
  const timeoutSignals = []
  const requests = []

  AbortSignal.timeout = (timeoutMs) => {
    timeoutCalls.push(timeoutMs)
    const controller = new AbortController()
    timeoutSignals.push(controller.signal)
    return controller.signal
  }

  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options })

    if (url === sybrox.HOMEPAGE_URL) return { status: 200, url, text: async () => homepageHtml }
    if (url === sybrox.ABOUT_URL) return { status: 200, url, text: async () => aboutHtml }
    if (url === sybrox.CONTACT_URL) return { status: 200, url, text: async () => contactHtml }
    if (url === sybrox.CAREERS_URL) return { status: 200, url, text: async () => careersHtml }
    throw new Error(`Unexpected URL: ${url}`)
  }

  try {
    const jobs = await sybrox.createSybroxScraper().run()
    assert.equal(jobs.length, 2)
  } finally {
    globalThis.fetch = originalFetch
    AbortSignal.timeout = originalTimeout
  }

  assert.deepEqual(requests.map((request) => request.url), [
    sybrox.HOMEPAGE_URL,
    sybrox.ABOUT_URL,
    sybrox.CONTACT_URL,
    sybrox.CAREERS_URL,
  ])
  assert.deepEqual(timeoutCalls, [15000, 15000, 15000, 15000])
  assert.deepEqual(requests.map((request) => request.options.signal), timeoutSignals)
})

test('Sybrox run fails closed when the official first-party surface drifts', async () => {
  const sybrox = await loadSybroxModule()
  assert.ok(sybrox, 'Expected scraper module at ./script.js')

  await assert.rejects(
    sybrox.createSybroxScraper().run({
      fetchPage: async (url) => {
        if (url === sybrox.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body><h1>Unexpected</h1></body></html>' }
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official homepage/i,
  )

  await assert.rejects(
    sybrox.createSybroxScraper().run({
      fetchPage: async (url) => {
        if (url === sybrox.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === sybrox.ABOUT_URL) return { status: 200, url, html: aboutHtml }
        if (url === sybrox.CONTACT_URL) return { status: 200, url, html: contactHtml }
        if (url === sybrox.CAREERS_URL) {
          return { status: 200, url, html: careersHtml.replaceAll('Apply Now', 'Learn More') }
        }
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /official careers page/i,
  )
})

test('Sybrox returns an empty result when the current first-party host is DNS-unresolved', async () => {
  const sybrox = await loadSybroxModule()
  assert.ok(sybrox, 'Expected scraper module at ./script.js')

  const jobs = await sybrox.createSybroxScraper().run({
    fetchPage: async () => {
      const error = new TypeError('fetch failed')
      error.cause = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND sybrox.com',
      }
      throw error
    },
  })

  assert.deepEqual(jobs, [])
})
