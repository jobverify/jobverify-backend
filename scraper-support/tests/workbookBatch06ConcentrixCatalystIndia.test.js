import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_LINKEDIN_COMPANY_HTML = `
  <html>
    <body>
      <main>
        <h1>Concentrix Catalyst</h1>
        <p>IT Services and IT Consulting</p>
        <a href="https://www.linkedin.com/jobs/concentrix-catalyst-jobs">See jobs</a>
        <p>Website https://catalyst.concentrix.com/</p>
        <p>Bangalore, 560078, IN</p>
        <p>Chennai, IN</p>
        <p>Hyderabad, IN</p>
      </main>
    </body>
  </html>
`

const VERIFIED_PARENT_INDIA_HTML = `
  <html>
    <body>
      <main>
        <h1>India</h1>
        <p>
          Here at Concentrix India, we are supporting forward-thinking brands with
          their AI, automation, and data driven CX needs.
        </p>
        <h2>Join Our Team</h2>
        <p>Experience the power of a game-changing career.</p>
        <a href="https://jobs.concentrix.com/">Join Us</a>
        <p>15 locations across India</p>
        <p>Human centered. Tech-powered. Intelligence-fueled.</p>
      </main>
    </body>
  </html>
`

const VERIFIED_LINKEDIN_JOBS_HTML = `
  <html>
    <body>
      <main>
        <p>Concentrix Catalyst in India</p>
        <p>
          <span>Get notified about new Concentrix Catalyst jobs in India</span><span>.</span>
        </p>
        <p>Sign in to create job alert</p>
        <h1>1,000+ Concentrix Catalyst Jobs in India</h1>
        <article>
          <h3>Microsoft Dynamic CRM</h3>
          <h4><a href="https://www.linkedin.com/company/concentrix/">Concentrix</a></h4>
          <p>Hyderabad, Telangana, India</p>
        </article>
      </main>
    </body>
  </html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/concentrixcatalystindia/script.js')
  } catch {
    assert.fail(
      'Expected Concentrix Catalyst India scraper module at ../../scraper/concentrixcatalystindia/script.js',
    )
  }
}

const loadCatalog = async () => {
  try {
    return (await import('../../scraper/concentrixcatalystindia/catalog.js')).default
  } catch {
    assert.fail(
      'Expected Concentrix Catalyst India catalog module at ../../scraper/concentrixcatalystindia/catalog.js',
    )
  }
}

test('Concentrix Catalyst India validates the reviewed exact-company and parent surfaces and returns [] while no exact-company jobs contract is verified', async () => {
  const concentrixCatalystIndia = await loadModule()
  const concentrixCatalystIndiaCatalog = await loadCatalog()
  const requestedUrls = []

  const jobs = await concentrixCatalystIndia.run({
    fetchHtml: async (url) => {
      requestedUrls.push(url)

      if (url === concentrixCatalystIndia.CAREERS_URL) {
        return VERIFIED_LINKEDIN_COMPANY_HTML
      }

      if (url === concentrixCatalystIndia.PARENT_INDIA_URL) {
        return VERIFIED_PARENT_INDIA_HTML
      }

      if (url === concentrixCatalystIndia.LINKEDIN_INDIA_JOBS_URL) {
        return VERIFIED_LINKEDIN_JOBS_HTML
      }

      throw new Error(`Unexpected URL requested during test: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    concentrixCatalystIndia.CAREERS_URL,
    concentrixCatalystIndia.PARENT_INDIA_URL,
    concentrixCatalystIndia.LINKEDIN_INDIA_JOBS_URL,
  ])
  assert.deepEqual(jobs, [])
  assert.equal(concentrixCatalystIndia.SOURCE, 'concentrixcatalystindia')
  assert.equal(concentrixCatalystIndia.COMPANY, 'Concentrix Catalyst India')
  assert.equal(concentrixCatalystIndia.OFFICIAL_BRAND, 'Concentrix Catalyst')
  assert.equal(concentrixCatalystIndia.VERIFIED_ON, '2026-09-03')
  assert.equal(
    concentrixCatalystIndia.CAREERS_URL,
    'https://in.linkedin.com/company/concentrix-catalyst',
  )
  assert.equal(
    concentrixCatalystIndia.PARENT_INDIA_URL,
    'https://www.concentrix.com/india/',
  )
  assert.equal(
    concentrixCatalystIndia.LINKEDIN_INDIA_JOBS_URL,
    'https://in.linkedin.com/jobs/concentrix-catalyst-jobs',
  )
  assert.equal(
    concentrixCatalystIndia.DISPOSITION,
    'verified-exact-name-linkedin-company-surface-plus-parent-careers-handoff-without-trustworthy-exact-company-jobs-contract',
  )
  assert.match(
    concentrixCatalystIndia.VERIFIED_SURFACE_SUMMARY,
    /Verified on September 3, 2026 that https:\/\/in\.linkedin\.com\/company\/concentrix-catalyst remained the live exact-name public company surface/i,
  )
  assert.match(
    concentrixCatalystIndia.VERIFIED_SURFACE_SUMMARY,
    /jobs\.concentrix\.com/i,
  )
  assert.match(
    concentrixCatalystIndia.VERIFIED_SURFACE_SUMMARY,
    /visible result data is attributed to the parent Concentrix brand rather than the exact workbook company/i,
  )
  assert.match(
    concentrixCatalystIndia.VERIFIED_SURFACE_SUMMARY,
    /returns no jobs until a stable exact-company public openings flow is verified/i,
  )
  assert.equal(concentrixCatalystIndiaCatalog.source, 'concentrixcatalystindia')
  assert.equal(concentrixCatalystIndiaCatalog.companyName, 'Concentrix Catalyst India')
  assert.equal(concentrixCatalystIndiaCatalog.companyCareerPage, concentrixCatalystIndia.CAREERS_URL)
  assert.equal(concentrixCatalystIndiaCatalog.verifiedOn, '2026-09-03')
  assert.equal(
    concentrixCatalystIndiaCatalog.atsPlatform,
    concentrixCatalystIndia.DISPOSITION,
  )
  assert.equal(
    concentrixCatalystIndiaCatalog.extractionStrategy,
    'verified-exact-name-linkedin-company-surface+parent-careers-handoff+no-exact-company-jobs-sentinel',
  )
  assert.match(
    concentrixCatalystIndiaCatalog.verifiedSurfaceSummary,
    /Verified on September 3, 2026/i,
  )
})

test('Concentrix Catalyst India rejects when the verified exact-name LinkedIn company surface markers disappear', async () => {
  const concentrixCatalystIndia = await loadModule()

  await assert.rejects(
    concentrixCatalystIndia.run({
      fetchHtml: async (url) => {
        if (url === concentrixCatalystIndia.CAREERS_URL) {
          return `
            <html>
              <body>
                <main>
                  <h1>Concentrix</h1>
                  <p>Technology services</p>
                </main>
              </body>
            </html>
          `
        }

        if (url === concentrixCatalystIndia.PARENT_INDIA_URL) {
          return VERIFIED_PARENT_INDIA_HTML
        }

        return VERIFIED_LINKEDIN_JOBS_HTML
      },
    }),
    /verified exact-name LinkedIn company surface changed/i,
  )
})

test('Concentrix Catalyst India rejects when the reviewed parent Concentrix India careers handoff disappears', async () => {
  const concentrixCatalystIndia = await loadModule()

  await assert.rejects(
    concentrixCatalystIndia.run({
      fetchHtml: async (url) => {
        if (url === concentrixCatalystIndia.CAREERS_URL) {
          return VERIFIED_LINKEDIN_COMPANY_HTML
        }

        if (url === concentrixCatalystIndia.PARENT_INDIA_URL) {
          return `
            <html>
              <body>
                <main>
                  <p>Here at Concentrix India</p>
                  <h2>Join Our Team</h2>
                  <p>Experience the power of a game-changing career.</p>
                  <a href="https://www.concentrix.com/contact/">Contact Us</a>
                  <p>15 locations across India</p>
                  <p>Human centered. Tech-powered. Intelligence-fueled.</p>
                </main>
              </body>
            </html>
          `
        }

        return VERIFIED_LINKEDIN_JOBS_HTML
      },
    }),
    /verified parent careers handoff changed/i,
  )
})

test('Concentrix Catalyst India rejects when the reviewed public LinkedIn jobs shell changes materially', async () => {
  const concentrixCatalystIndia = await loadModule()

  await assert.rejects(
    concentrixCatalystIndia.run({
      fetchHtml: async (url) => {
        if (url === concentrixCatalystIndia.CAREERS_URL) {
          return VERIFIED_LINKEDIN_COMPANY_HTML
        }

        if (url === concentrixCatalystIndia.PARENT_INDIA_URL) {
          return VERIFIED_PARENT_INDIA_HTML
        }

        return `
          <html>
            <body>
              <main>
                <p>Concentrix Catalyst in India</p>
                <p>Search similar titles</p>
              </main>
            </body>
          </html>
        `
      },
    }),
    /verified public LinkedIn jobs search shell changed/i,
  )
})

test('Concentrix Catalyst India rejects when the public jobs search starts exposing an exact-company listing contract', async () => {
  const concentrixCatalystIndia = await loadModule()

  await assert.rejects(
    concentrixCatalystIndia.run({
      fetchHtml: async (url) => {
        if (url === concentrixCatalystIndia.CAREERS_URL) {
          return VERIFIED_LINKEDIN_COMPANY_HTML
        }

        if (url === concentrixCatalystIndia.PARENT_INDIA_URL) {
          return VERIFIED_PARENT_INDIA_HTML
        }

        return `
          <html>
            <body>
              <main>
                <p>Concentrix Catalyst in India</p>
                <p>Get notified about new Concentrix Catalyst jobs in India.</p>
                <p>Sign in to create job alert</p>
                <h1>1,000+ Concentrix Catalyst Jobs in India</h1>
                <article>
                  <h3>Microsoft Dynamic CRM</h3>
                  <h4><a href="https://www.linkedin.com/company/concentrix-catalyst/">Concentrix Catalyst India</a></h4>
                  <p>Hyderabad, Telangana, India</p>
                </article>
              </main>
            </body>
          </html>
        `
      },
    }),
    /exact-company listing contract/i,
  )
})
