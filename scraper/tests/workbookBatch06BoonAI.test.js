import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_HOME_HTML = `
  <html>
    <body>
      <main>
        <p>Your international career starts here</p>
        <h1>Find Your International Job Now</h1>
        <p>Verified Licensed Agencies</p>
        <p>Walk-In Interviews Happening Across India!</p>
        <p>Get the Boon.ai Mobile App</p>
        <p>Boon gives you the tools and trusted network to launch your global career with confidence.</p>
        <a href="https://www.boonindia.ai/about">About us</a>
        Careers
        <a href="https://www.boonindia.ai/pricing">Pricing</a>
        <a href="https://www.boonindia.ai/jobs">Jobs</a>
      </main>
    </body>
  </html>
`

const VERIFIED_ABOUT_HTML = `
  <html>
    <body>
      <main>
        <p>
          Boon.ai is a next-generation job board specifically tailored to connect
          Indian job seekers with licensed overseas recruitment agencies.
        </p>
        <h2>Specialized Platform for Gulf Jobs</h2>
        <h2>AI-powered Job Ad Conversion</h2>
        <h2>Direct Job Applications</h2>
        <p>support@boonindia.ai</p>
        <p>BOON INFOMATE PRIVATE LIMITED, Latha Nivas Tower, Santosh Nagar, Mehdipatnam, Hyderabad-28, Telangana, India.</p>
      </main>
    </body>
  </html>
`

const VERIFIED_PRICING_HTML = `
  <html>
    <body>
      <main>
        <h1>BoonPromo - Job Ad Posting Services</h1>
        <p>Job Posting Plans for Licensed Overseas Recruitment Agencies</p>
        <p>60 Ad Postings</p>
        <p>Unlimited Applications</p>
        <p>Post a Job Today & Start Hiring the Right Talent!</p>
        <a href="https://employer.boonindia.ai/register">I am an Employer / Agency</a>
      </main>
    </body>
  </html>
`

const VERIFIED_EMPLOYER_REGISTER_HTML = `
  <html>
    <body>
      <main>
        <h5>BOON.AI</h5>
        <label>Agency Name</label>
        <label>License Number</label>
        <p>Already have an account? Login</p>
        <button>Register</button>
      </main>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../workbookbatch06/boonai.js')
  } catch {
    assert.fail('Expected BoonAI scraper module at ../workbookbatch06/boonai.js')
  }
}

test('BoonAI validates the verified public platform and recruiter surfaces and returns []', async () => {
  const boonai = await loadModule()
  const requestedUrls = []

  const jobs = await boonai.createBoonAIScraper().run({
    fetchHtml: async (url) => {
      requestedUrls.push(url)

      if (url === boonai.HOME_URL) return VERIFIED_HOME_HTML
      if (url === boonai.ABOUT_URL) return VERIFIED_ABOUT_HTML
      if (url === boonai.PRICING_URL) return VERIFIED_PRICING_HTML
      if (url === boonai.EMPLOYER_REGISTER_URL) return VERIFIED_EMPLOYER_REGISTER_HTML

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    boonai.HOME_URL,
    boonai.ABOUT_URL,
    boonai.PRICING_URL,
    boonai.EMPLOYER_REGISTER_URL,
  ])
  assert.deepEqual(jobs, [])
  assert.equal(boonai.SOURCE, 'boonai')
  assert.equal(boonai.COMPANY, 'BoonAI')
  assert.equal(boonai.OFFICIAL_BRAND, 'Boon.ai')
  assert.equal(boonai.VERIFIED_ON, '2026-07-25')
  assert.equal(boonai.CAREERS_URL, 'https://www.boonindia.ai/about')
  assert.equal(
    boonai.DISPOSITION,
    'verified-public-platform-and-recruiter-surfaces-without-exact-company-careers-contract',
  )
  assert.match(boonai.VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.match(boonai.VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.boonindia\.ai\/about/)
  assert.match(boonai.VERIFIED_SURFACE_SUMMARY, /https:\/\/www\.boonindia\.ai\/pricing/)
  assert.match(boonai.VERIFIED_SURFACE_SUMMARY, /https:\/\/employer\.boonindia\.ai\/register/)
  assert.equal(boonai.hasVerifiedHomeSurface(VERIFIED_HOME_HTML), true)
  assert.equal(boonai.hasVerifiedAboutSurface(VERIFIED_ABOUT_HTML), true)
  assert.equal(boonai.hasVerifiedPricingSurface(VERIFIED_PRICING_HTML), true)
  assert.equal(
    boonai.hasVerifiedEmployerRegisterSurface(VERIFIED_EMPLOYER_REGISTER_HTML),
    true,
  )
  assert.equal(boonai.detectExactCompanyJobsSurface(VERIFIED_HOME_HTML, boonai.HOME_URL), null)
  assert.equal(boonai.detectExactCompanyJobsSurface(VERIFIED_ABOUT_HTML, boonai.ABOUT_URL), null)
  assert.equal(
    boonai.detectExactCompanyJobsSurface(VERIFIED_PRICING_HTML, boonai.PRICING_URL),
    null,
  )
})

test('BoonAI rejects when the verified official marketplace or company-about markers disappear', async () => {
  const boonai = await loadModule()

  await assert.rejects(
    boonai.createBoonAIScraper().run({
      fetchHtml: async (url) => {
        if (url === boonai.HOME_URL) {
          return `
            <html>
              <body>
                <main>
                  <h1>Jobs</h1>
                  <p>Search roles.</p>
                </main>
              </body>
            </html>
          `
        }

        if (url === boonai.ABOUT_URL) return VERIFIED_ABOUT_HTML
        if (url === boonai.PRICING_URL) return VERIFIED_PRICING_HTML
        if (url === boonai.EMPLOYER_REGISTER_URL) return VERIFIED_EMPLOYER_REGISTER_HTML

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /marketplace home surface changed/i,
  )

  await assert.rejects(
    boonai.createBoonAIScraper().run({
      fetchHtml: async (url) => {
        if (url === boonai.HOME_URL) return VERIFIED_HOME_HTML
        if (url === boonai.ABOUT_URL) {
          return `
            <html>
              <body>
                <main>
                  <h1>About Boon</h1>
                  <p>We connect talent and agencies.</p>
                </main>
              </body>
            </html>
          `
        }
        if (url === boonai.PRICING_URL) return VERIFIED_PRICING_HTML
        if (url === boonai.EMPLOYER_REGISTER_URL) return VERIFIED_EMPLOYER_REGISTER_HTML

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /company about surface changed/i,
  )
})

test('BoonAI fails closed when an exact-company public jobs handoff appears on the verified surfaces', async () => {
  const boonai = await loadModule()

  await assert.rejects(
    boonai.createBoonAIScraper().run({
      fetchHtml: async (url) => {
        if (url === boonai.HOME_URL) return VERIFIED_HOME_HTML
        if (url === boonai.ABOUT_URL) {
          return `
            ${VERIFIED_ABOUT_HTML}
            <a href="https://jobs.lever.co/boonai">Careers at Boon.ai</a>
          `
        }
        if (url === boonai.PRICING_URL) return VERIFIED_PRICING_HTML
        if (url === boonai.EMPLOYER_REGISTER_URL) return VERIFIED_EMPLOYER_REGISTER_HTML

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /exact-company public jobs surface/i,
  )

  await assert.rejects(
    boonai.createBoonAIScraper().run({
      fetchHtml: async (url) => {
        if (url === boonai.HOME_URL) {
          return `
            ${VERIFIED_HOME_HTML}
            <a href="https://www.boonindia.ai/careers">Join the Boon.ai team</a>
          `
        }
        if (url === boonai.ABOUT_URL) return VERIFIED_ABOUT_HTML
        if (url === boonai.PRICING_URL) return VERIFIED_PRICING_HTML
        if (url === boonai.EMPLOYER_REGISTER_URL) return VERIFIED_EMPLOYER_REGISTER_HTML

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /exact-company public jobs surface/i,
  )
})

test('BoonAI fails closed when exact-company JobPosting markup appears on the verified surfaces', async () => {
  const boonai = await loadModule()

  await assert.rejects(
    boonai.createBoonAIScraper().run({
      fetchHtml: async (url) => {
        if (url === boonai.HOME_URL) return VERIFIED_HOME_HTML
        if (url === boonai.ABOUT_URL) {
          return `
            ${VERIFIED_ABOUT_HTML}
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "JobPosting",
                "title": "Founding Engineer",
                "hiringOrganization": {
                  "@type": "Organization",
                  "name": "Boon.ai"
                }
              }
            </script>
          `
        }
        if (url === boonai.PRICING_URL) return VERIFIED_PRICING_HTML
        if (url === boonai.EMPLOYER_REGISTER_URL) return VERIFIED_EMPLOYER_REGISTER_HTML

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /exact-company public jobs surface|JobPosting markup/i,
  )
})
