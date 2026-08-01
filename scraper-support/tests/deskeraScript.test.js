import assert from 'node:assert/strict'
import test from 'node:test'

const HOMEPAGE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Deskera</title>
  </head>
  <body>
    <nav>
      <a href="/company/overview">Overview</a>
      <a href="/company/why-deskera">Why Deskera</a>
      <a href="https://www.linkedin.com/jobs/deskera-jobs">Careers</a>
    </nav>
    <h1>Next Generation</h1>
    <p>Cloud ERP</p>
    <p>Payroll and HR</p>
    <h2>Run & scale your business with Deskera</h2>
    <p>Sales: 888 690 3830</p>
  </body>
</html>
`

const LINKEDIN_COMPANY_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Deskera | LinkedIn</title>
  </head>
  <body>
    <h1>Deskera</h1>
    <p>Technology, Information and Internet</p>
    <p>We want to radically change how businesses operate.</p>
    <p>Deskera is an award-winning integrated platform that enables SMBs to scale faster with fewer tools.</p>
    <p>Website</p>
    <a href="https://www.deskera.com">https://www.deskera.com</a>
    <p>Level 3, Maruthi Emerald</p>
    <p>ITPL Main Rd</p>
    <p>Bengaluru, 560066, IN</p>
  </body>
</html>
`

const BROKEN_LINKEDIN_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>404 Not Found</title>
  </head>
  <body>
    <h1>This page doesn't exist</h1>
  </body>
</html>
`

const loadDeskeraModule = async () => {
  try {
    return await import('../../scraper/deskera/script.js')
  } catch {
    assert.fail('Expected Deskera scraper module at ../../scraper/deskera/script.js')
  }
}

test('Deskera sentinel constants stay pinned to the verified homepage, LinkedIn company page, and broken jobs handoff', async () => {
  const deskera = await loadDeskeraModule()

  assert.equal(deskera.SOURCE, 'deskera')
  assert.equal(deskera.COMPANY, 'Deskera')
  assert.equal(deskera.HOMEPAGE_URL, 'https://www.deskera.com/')
  assert.equal(deskera.LINKEDIN_JOBS_URL, 'https://www.linkedin.com/jobs/deskera-jobs')
  assert.equal(deskera.LINKEDIN_COMPANY_PAGE_URL, 'https://www.linkedin.com/company/deskera/')
  assert.equal(deskera.hasOfficialHomepageSignal(HOMEPAGE_HTML), true)
  assert.equal(deskera.extractLinkedInJobsUrl(HOMEPAGE_HTML), deskera.LINKEDIN_JOBS_URL)
  assert.equal(deskera.pageExposesFirstPartyJobsSignal(HOMEPAGE_HTML), false)
  assert.equal(deskera.hasVerifiedLinkedInCompanySignal(LINKEDIN_COMPANY_HTML), true)
  assert.equal(
    deskera.isVerifiedMissingLinkedInJobsPage({
      status: 404,
      url: deskera.LINKEDIN_JOBS_URL,
      html: BROKEN_LINKEDIN_JOBS_HTML,
    }),
    true,
  )
})

test('Deskera sentinel returns [] only while the official homepage still hands off to the verified broken LinkedIn jobs page', async () => {
  const deskera = await loadDeskeraModule()
  const requestedUrls = []

  const jobs = await deskera.createDeskeraScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === deskera.HOMEPAGE_URL) {
        return { status: 200, url, html: HOMEPAGE_HTML }
      }

      if (url === deskera.LINKEDIN_COMPANY_PAGE_URL) {
        return { status: 200, url, html: LINKEDIN_COMPANY_HTML }
      }

      if (url === deskera.LINKEDIN_JOBS_URL) {
        return { status: 404, url, html: BROKEN_LINKEDIN_JOBS_HTML }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    deskera.HOMEPAGE_URL,
    deskera.LINKEDIN_COMPANY_PAGE_URL,
    deskera.LINKEDIN_JOBS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Deskera sentinel fails closed when the homepage handoff, LinkedIn company page, or broken jobs state drifts', async () => {
  const deskera = await loadDeskeraModule()

  await assert.rejects(
    deskera.createDeskeraScraper().run({
      fetchPage: async (url) => {
        if (url === deskera.HOMEPAGE_URL) {
          return { status: 200, url, html: '<html><body>Unexpected</body></html>' }
        }

        return { status: 404, url, html: BROKEN_LINKEDIN_JOBS_HTML }
      },
    }),
    /official homepage changed/i,
  )

  await assert.rejects(
    deskera.createDeskeraScraper().run({
      fetchPage: async (url) => {
        if (url === deskera.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: HOMEPAGE_HTML.replace(
              'https://www.linkedin.com/jobs/deskera-jobs',
              'https://www.linkedin.com/jobs/search/?keywords=Deskera',
            ),
          }
        }

        return { status: 404, url, html: BROKEN_LINKEDIN_JOBS_HTML }
      },
    }),
    /careers handoff changed/i,
  )

  await assert.rejects(
    deskera.createDeskeraScraper().run({
      fetchPage: async (url) => {
        if (url === deskera.HOMEPAGE_URL) {
          return { status: 200, url, html: `${HOMEPAGE_HTML}<a href="/careers/software-engineer">Apply</a>` }
        }

        return { status: 404, url, html: BROKEN_LINKEDIN_JOBS_HTML }
      },
    }),
    /first-party public jobs surface/i,
  )

  await assert.rejects(
    deskera.createDeskeraScraper().run({
      fetchPage: async (url) => {
        if (url === deskera.HOMEPAGE_URL) {
          return { status: 200, url, html: HOMEPAGE_HTML }
        }

        if (url === deskera.LINKEDIN_COMPANY_PAGE_URL) {
          return { status: 200, url, html: '<html><body>LinkedIn</body></html>' }
        }

        return { status: 404, url, html: BROKEN_LINKEDIN_JOBS_HTML }
      },
    }),
    /LinkedIn company page changed/i,
  )

  await assert.rejects(
    deskera.createDeskeraScraper().run({
      fetchPage: async (url) => {
        if (url === deskera.HOMEPAGE_URL) {
          return { status: 200, url, html: HOMEPAGE_HTML }
        }

        if (url === deskera.LINKEDIN_COMPANY_PAGE_URL) {
          return { status: 200, url, html: LINKEDIN_COMPANY_HTML }
        }

        return { status: 200, url, html: '<html><body>Open jobs</body></html>' }
      },
    }),
    /LinkedIn jobs route no longer matches/i,
  )
})
