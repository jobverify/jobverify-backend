import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
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
      <title>SWELECT Energy Systems - Leading Renewable Energy Solutions Provider</title>
    </head>
    <body>
      <main>
        <h1>Powering the World Responsibly</h1>
        <p>SWELECT Energy Systems Ltd. (formerly known as Numeric Power Systems Ltd.) is a leading renewable energy player.</p>
        <a href="https://www.swelectes.com/career.php">Career</a>
      </main>
      <footer>
        <p>SWELECT ENERGY SYSTEMS LIMITED</p>
        <p>info@swelectes.com</p>
      </footer>
    </body>
  </html>
`

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Careers at SWELECT | Join Our Team</title>
    </head>
    <body>
      <main>
        <h1>Career</h1>
        <h2>Join us & Help build the future of Renewable Energy</h2>
        <h2>Positions</h2>

        <ul>
          <li>Sales</li>
          <li>Engineer- Channel Sales</li>
          <li>Qualification : DEEE / B.E (EEE/ECE)</li>
          <li>Experience : 3 to 5 years</li>
          <li>Location : Andhra Pradesh, Chennai, Kerala</li>
          <li>Marketing, Lead creation, BOM & Quote preparation, Market analysis and customer service</li>
          <li><a href="#apply">Apply</a></li>

          <li>Executive - Direct Sales</li>
          <li>Qualification : B.E, MBA</li>
          <li>Experience : Min 2 to 3 years</li>
          <li>Location : Chennai, Bangalore</li>
          <li>Develop customer, competitor, and market understanding.</li>
          <li><a href="#apply">Apply</a></li>

          <li>Executive - Direct Sales</li>
          <li>Qualification : BE / B.Com / MBA</li>
          <li>Experience : 2 to 4 years</li>
          <li>Location : Chennai/Noida</li>
          <li>Tender & RFP Analysis and contract drafting support.</li>
          <li><a href="#apply">Apply</a></li>

          <li>Internships</li>
          <li>INTERNSHIP OFFER</li>
          <li>Qualification : Any relevant degree</li>
          <li>Experience : -</li>
          <li>Location : Chennai</li>
          <li>Internship Period: 3 months / 6 months</li>
          <li><a href="#apply">Apply</a></li>
        </ul>

        <section>
          <h2>Join Our Team</h2>
          <p>Position Junior Executive - Tender Engineer - Channel Sales Assistant Manager</p>
          <p>Ms Vishnupriya</p>
          <p>hr@swelectes.com</p>
        </section>
      </main>
    </body>
  </html>
`

test('Swelect scraper extracts inline first-party roles from the official careers page', async () => {
  const swelect = await loadModule()
  assert.ok(swelect, 'Swelect scraper module should load')

  assert.equal(swelect.HOMEPAGE_URL, 'https://www.swelectes.com/')
  assert.equal(swelect.CAREERS_URL, 'https://www.swelectes.com/career.php')
  assert.equal(swelect.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(swelect.hasOfficialCareersSignal(careersHtml), true)

  const jobs = swelect.extractJobCards(careersHtml)

  assert.equal(jobs.length, 4)
  assert.deepEqual(jobs[0], {
    title: 'Engineer- Channel Sales',
    company: 'Swelect',
    department: 'Sales',
    location: 'Andhra Pradesh, Chennai, Kerala, India',
    city: 'Chennai',
    country: 'India',
    jobId: 'swelect-engineer-channel-sales-chennai-deee-b-e-eee-ece',
    requisitionId: 'swelect-engineer-channel-sales-chennai-deee-b-e-eee-ece',
    sourceUrl: 'https://www.swelectes.com/career.php',
    applyUrl: 'https://www.swelectes.com/career.php',
    employmentType: null,
    experienceRequired: '3 to 5 years',
    minimumQualification: 'DEEE / B.E (EEE/ECE)',
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Marketing, Lead creation, BOM & Quote preparation, Market analysis and customer service',
  })

  assert.notEqual(jobs[1].jobId, jobs[2].jobId)
  assert.equal(jobs[3].title, 'INTERNSHIP OFFER')
  assert.equal(jobs[3].department, 'Internships')
})

test('Swelect scraper run decorates first-party careers roles', async () => {
  const swelect = await loadModule()
  assert.ok(swelect, 'Swelect scraper module should load')

  const requestedUrls = []
  const jobs = await swelect.createSwelectScraper({
    now: () => '2026-07-12T12:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === swelect.HOMEPAGE_URL) return homepageHtml
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.swelectes.com/',
    'https://www.swelectes.com/career.php',
  ])
  assert.equal(jobs.length, 4)
  assert.deepEqual(
    {
      title: jobs[0].title,
      source: jobs[0].source,
      company: jobs[0].company,
      link: jobs[0].link,
      scrapedAt: jobs[0].scrapedAt,
    },
    {
      title: 'Engineer- Channel Sales',
      source: 'swelect',
      company: 'Swelect',
      link: 'https://www.swelectes.com/career.php',
      scrapedAt: '2026-07-12T12:00:00.000Z',
    },
  )
})

test('Swelect default fetch path applies a bounded timeout to every request', async () => {
  const swelect = await loadModule()
  assert.ok(swelect, 'Swelect scraper module should load')

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

    return {
      ok: true,
      status: 200,
      text: async () => (url === swelect.HOMEPAGE_URL ? homepageHtml : careersHtml),
    }
  }

  try {
    const jobs = await swelect.createSwelectScraper().run()
    assert.equal(jobs.length, 4)
  } finally {
    globalThis.fetch = originalFetch
    AbortSignal.timeout = originalTimeout
  }

  assert.deepEqual(requests.map((request) => request.url), [
    swelect.HOMEPAGE_URL,
    swelect.CAREERS_URL,
  ])
  assert.deepEqual(timeoutCalls, [15000, 15000])
  assert.deepEqual(requests.map((request) => request.options.signal), timeoutSignals)
})

test('Swelect scraper fails closed when the first-party careers structure changes materially', async () => {
  const swelect = await loadModule()
  assert.ok(swelect, 'Swelect scraper module should load')

  await assert.rejects(
    swelect.createSwelectScraper().run({
      fetchText: async (url) => {
        if (url === 'https://www.swelectes.com/') return homepageHtml
        return `
          <html>
            <body>
              <h1>Career</h1>
              <p>Build your future with us.</p>
            </body>
          </html>
        `
      },
    }),
    /Swelect verified first-party careers page no longer matches/i,
  )
})
