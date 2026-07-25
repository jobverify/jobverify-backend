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
    <body>
      <main>
        <h1>Renault Group</h1>
        <p>Careers</p>
        <p>News about the group</p>
        <a href="https://www.renaultgroup.com/en/careers/">Careers</a>
        <a href="https://www.renaultgroup.com/en/careers/our-international-vacancies/">Our job offers</a>
      </main>
      <footer>
        <p>Legal notices</p>
        <p>Security and confidentiality</p>
      </footer>
    </body>
  </html>
`

const careersHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <main>
        <h1>A career at the centre of the automotive revolution</h1>
        <p>Joining Renault Group means being part of a pioneering automotive company.</p>
        <h2>Find your next job</h2>
        <a href="https://www.renaultgroup.com/en/careers/our-international-vacancies/">View our offers</a>
        <p>ReKnow University</p>
      </main>
      <footer>
        <p>Legal notices</p>
        <p>Security and confidentiality</p>
      </footer>
    </body>
  </html>
`

const offersHtml = `
  <!doctype html>
  <html lang="en">
    <body>
      <main>
        <h1>Find your next job</h1>
        <h2>Join our tech force and be part of the future of mobility</h2>
        <p>We need software architects, devOps, cybersecurity engineers, scrum masters, and more.</p>
        <p>Working at Renault Group</p>
        <p>Recruitement privacy information policy</p>
      </main>
      <footer>
        <p>Legal notices</p>
        <p>Security and confidentiality</p>
      </footer>
    </body>
  </html>
`

test('Renault Group sentinel validates the verified homepage, careers page, and offers page without a public jobs surface', async () => {
  const renault = await loadModule()
  assert.ok(renault, 'Renault Group scraper module should load')

  assert.equal(renault.SOURCE, 'renaultgroup')
  assert.equal(renault.COMPANY, 'Renault Group')
  assert.equal(renault.HOMEPAGE_URL, 'https://www.renaultgroup.com/en/')
  assert.equal(renault.CAREERS_URL, 'https://www.renaultgroup.com/en/careers/')
  assert.equal(renault.OFFERS_URL, 'https://www.renaultgroup.com/en/careers/our-international-vacancies/')
  assert.equal(renault.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(renault.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(renault.hasOfficialOffersSignal(offersHtml), true)
  assert.equal(renault.hasPublicJobsSignal(offersHtml), false)
})

test('Renault Group run returns an empty list while the verified offers page exposes no public job records or apply links', async () => {
  const renault = await loadModule()
  assert.ok(renault, 'Renault Group scraper module should load')

  const requestedUrls = []
  const jobs = await renault.createRenaultGroupScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)
      if (url === renault.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
      if (url === renault.CAREERS_URL) return { status: 200, url, html: careersHtml }
      if (url === renault.OFFERS_URL) return { status: 200, url, html: offersHtml }
      throw new Error(`Unexpected Renault Group URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://www.renaultgroup.com/en/',
    'https://www.renaultgroup.com/en/careers/',
    'https://www.renaultgroup.com/en/careers/our-international-vacancies/',
  ])
  assert.deepEqual(jobs, [])
})

test('Renault Group fails closed when a trusted page changes materially or the offers page starts exposing public job links', async () => {
  const renault = await loadModule()
  assert.ok(renault, 'Renault Group scraper module should load')

  await assert.rejects(
    renault.createRenaultGroupScraper().run({
      fetchPage: async () => ({ status: 200, url: 'https://www.renaultgroup.com/en/', html: '<html><body><h1>Unexpected homepage</h1></body></html>' }),
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    renault.createRenaultGroupScraper().run({
      fetchPage: async (url) => {
        if (url === renault.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        return { status: 200, url, html: '<html><body><h1>Unexpected careers page</h1></body></html>' }
      },
    }),
    /verified careers page/i,
  )

  await assert.rejects(
    renault.createRenaultGroupScraper().run({
      fetchPage: async (url) => {
        if (url === renault.HOMEPAGE_URL) return { status: 200, url, html: homepageHtml }
        if (url === renault.CAREERS_URL) return { status: 200, url, html: careersHtml }
        return {
          status: 200,
          url,
          html: offersHtml.replace(
            '</main>',
            '<a href="https://jobs.renaultgroup.com/jobs/42">Apply now</a></main>',
          ),
        }
      },
    }),
    /now appears to expose a direct public jobs surface/i,
  )
})
