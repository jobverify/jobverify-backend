import assert from 'node:assert/strict'
import test from 'node:test'

const homepageHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Credgenics | Debt Collections &amp; Resolution Platform | Loan Collections Platform | Debt Recovery Software</title>
  </head>
  <body>
    <h1>Supercharge debt collections with AI-driven full-stack platform</h1>
    <p>India’s Best Selling AI-powered Loan Collections Platform - three times winner for 2022 -2024.</p>
    <section>
      <h2>Company</h2>
      <a href="/about-us">About Us</a>
      <a href="/security">Security</a>
    </section>
    <p>support@credgenics.com</p>
    <p>Copyright 2026 Analog Legalhub Technology Solutions Pvt. Ltd. All Rights Reserved.</p>
  </body>
</html>
`

const currentHomepageHtml = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Credgenics | Debt Collections &amp; Resolution Platform | Loan Collections Platform | Debt Recovery Software</title>
  </head>
  <body>
    <h1>Supercharge debt collections with AI-driven full-stack platform</h1>
    <p>India’s Best Selling AI-powered Loan Collections Platform - three times winner for 2022 -2024.</p>
    <section>
      <h2>Company</h2>
      <a href="/about-us">About Us</a>
      <a href="https://www.linkedin.com/jobs/search/?f_C=14634991&amp;geoId=92000000">LinkedIn jobs</a>
    </section>
    <p>support@credgenics.com</p>
    <p>© 2026 Analog Legalhub Technology Solutions Pvt. Ltd. All Rights Reserved.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/credgenics/script.js')
  } catch {
    assert.fail('Expected Credgenics scraper module at ../../scraper/credgenics/script.js')
  }
}

test('Credgenics sentinel validates the verified official homepage with no public careers links', async () => {
  const credgenics = await loadModule()

  assert.equal(credgenics.SOURCE, 'credgenics')
  assert.equal(credgenics.COMPANY, 'Credgenics')
  assert.equal(credgenics.HOMEPAGE_URL, 'https://www.credgenics.com/')
  assert.equal(credgenics.LINKEDIN_COMPANY_ID, '14634991')
  assert.equal(
    credgenics.VERIFIED_LINKEDIN_JOBS_URL,
    'https://www.linkedin.com/jobs/search/?f_C=14634991&geoId=92000000',
  )
  assert.equal(credgenics.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(credgenics.extractLinkedInJobsUrl(homepageHtml), null)
  assert.equal(credgenics.pageExposesFirstPartyJobsSignal(homepageHtml), false)
})

test('Credgenics sentinel accepts the current homepage punctuation and LinkedIn handoff shape', async () => {
  const credgenics = await loadModule()

  assert.equal(credgenics.hasOfficialHomepageSignal(currentHomepageHtml), true)
  assert.equal(
    credgenics.extractLinkedInJobsUrl(currentHomepageHtml),
    'https://www.linkedin.com/jobs/search/?f_C=14634991&geoId=92000000',
  )
  assert.equal(credgenics.pageExposesFirstPartyJobsSignal(currentHomepageHtml), false)
})

test('Credgenics sentinel returns no jobs while the verified homepage exposes no public jobs surface', async () => {
  const credgenics = await loadModule()
  const requestedUrls = []

  const jobs = await credgenics.createCredgenicsScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return homepageHtml
    },
  })

  assert.deepEqual(requestedUrls, [credgenics.HOMEPAGE_URL])
  assert.deepEqual(jobs, [])
})

test('Credgenics sentinel fails closed if the verified homepage or first-party jobs surface drifts', async () => {
  const credgenics = await loadModule()

  await assert.rejects(
    credgenics.createCredgenicsScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /Credgenics official homepage changed/i,
  )

  await assert.rejects(
    credgenics.createCredgenicsScraper().run({
      fetchText: async () => `${homepageHtml}
        <section>
          <h2>Current Openings</h2>
          <a href="/careers/customer-success-manager">Apply now</a>
        </section>`,
    }),
    /first-party public jobs surface/i,
  )
})
