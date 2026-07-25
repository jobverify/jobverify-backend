import assert from 'node:assert/strict'
import test from 'node:test'

const PRIMARY_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>General Insurance Company India | Careers & Opportunities - Magma Insurance</title>
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>Be a part of the Magma family!</p>
      <h2>Apply for Job</h2>
      <form>
        <label>Name</label>
        <label>Mobile Number</label>
        <label>Email ID</label>
        <label>Educational Qualification</label>
        <label>Insurance Experience</label>
        <label>Campus Name</label>
        <label>Date Of Birth</label>
        <label>Location</label>
        <label>Upload CV</label>
      </form>
    </main>
  </body>
</html>
`

const ALTERNATE_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers & Opportunities - Magma Insurance</title>
  </head>
  <body>
    <section>
      <h1>Careers</h1>
      <p>Join Magma Insurance.</p>
      <h2>Apply for Job</h2>
      <p>Fill in your details and upload your CV.</p>
      <ul>
        <li>Educational Qualification</li>
        <li>Insurance Experience</li>
        <li>Location</li>
        <li>Upload CV</li>
      </ul>
    </section>
  </body>
</html>
`

const PAGE_WITH_PUBLIC_OPENINGS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Magma Insurance</title>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <article>
        <h2>Senior Claims Manager</h2>
        <a href="/jobs/senior-claims-manager">Apply now</a>
      </article>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../magmageneralinsurance/script.js')
  } catch {
    assert.fail('Expected Magma General Insurance scraper module at ../magmageneralinsurance/script.js')
  }
}

test('Magma General Insurance helpers stay pinned to the verified first-party careers form pages from Friday, July 17, 2026', async () => {
  const magma = await loadModule()

  assert.equal(magma.SOURCE, 'magmageneralinsurance')
  assert.equal(magma.COMPANY, 'Magma General Insurance')
  assert.equal(magma.OFFICIAL_BRAND_NAME, 'Magma Insurance')
  assert.equal(magma.CAREERS_URL, 'https://www.magmainsurance.com/fi/more/career')
  assert.equal(magma.ALTERNATE_CAREERS_URL, 'https://www.magmainsurance.com/career')
  assert.equal(magma.VERIFIED_ON, '2026-07-17')
  assert.equal(magma.hasPrimaryCareersSignal(PRIMARY_CAREERS_HTML), true)
  assert.equal(magma.hasAlternateCareersSignal(ALTERNATE_CAREERS_HTML), true)
  assert.equal(magma.hasPublicJobListingsSignal(PRIMARY_CAREERS_HTML), false)
  assert.equal(magma.hasPublicJobListingsSignal(ALTERNATE_CAREERS_HTML), false)
  assert.equal(magma.hasPublicJobListingsSignal(PAGE_WITH_PUBLIC_OPENINGS_HTML), true)
})

test('Magma General Insurance returns [] only while both verified first-party careers pages remain generic application forms', async () => {
  const magma = await loadModule()
  const requestedUrls = []

  const jobs = await magma.createMagmaGeneralInsuranceScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === magma.CAREERS_URL) return PRIMARY_CAREERS_HTML
      if (url === magma.ALTERNATE_CAREERS_URL) return ALTERNATE_CAREERS_HTML
      throw new Error(`Unexpected Magma General Insurance URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    magma.CAREERS_URL,
    magma.ALTERNATE_CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Magma General Insurance fails closed when either verified careers form drifts or starts exposing public job listings', async () => {
  const magma = await loadModule()

  await assert.rejects(
    magma.createMagmaGeneralInsuranceScraper().run({
      fetchText: async (url) => {
        if (url === magma.CAREERS_URL) return '<html><body><h1>Unexpected</h1></body></html>'
        return ALTERNATE_CAREERS_HTML
      },
    }),
    /verified primary careers page/i,
  )

  await assert.rejects(
    magma.createMagmaGeneralInsuranceScraper().run({
      fetchText: async (url) => {
        if (url === magma.CAREERS_URL) return PRIMARY_CAREERS_HTML
        return '<html><body><h1>Unexpected</h1></body></html>'
      },
    }),
    /verified alternate careers page/i,
  )

  await assert.rejects(
    magma.createMagmaGeneralInsuranceScraper().run({
      fetchText: async (url) => {
        if (url === magma.CAREERS_URL) return PAGE_WITH_PUBLIC_OPENINGS_HTML
        return ALTERNATE_CAREERS_HTML
      },
    }),
    /public job listings/i,
  )
})
