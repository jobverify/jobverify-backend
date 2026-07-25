import assert from 'node:assert/strict'
import test from 'node:test'

const parkedHomepageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Porkbun Marketplace: The domain karvy.com is for sale.</title>
  </head>
  <body>
    <main>
      <h1>This domain is for sale!</h1>
      <p>Porkbun Marketplace</p>
      <p>Buy now price</p>
    </main>
  </body>
</html>
`

const contaminatedLegacyRootHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>KEMBANGTOTO</title>
  </head>
  <body>
    <main>
      <h1>KEMBANGTOTO - Olah Data Togel</h1>
      <a href="https://karvy.ember-spirit.co/">karvy.ember-spirit.co</a>
    </main>
  </body>
</html>
`

const staleCareerPageHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career</title>
  </head>
  <body>
    <main>
      <h1>Interested to Join Us?</h1>
      <p>Apply</p>
      <p>email resume to careers@karvy.com</p>
      <p>SEBI rejoinder</p>
    </main>
  </body>
</html>
`

const publicJobsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Karvy Careers</title>
  </head>
  <body>
    <main>
      <h1>Current Openings</h1>
      <a href="https://jobs.example.com/karvy/apply">Apply now</a>
    </main>
  </body>
</html>
`

const loadKarvyModule = async () => {
  try {
    return await import('../karvy/script.js')
  } catch {
    assert.fail('Expected Karvy scraper module at ../karvy/script.js')
  }
}

test('Karvy sentinel helpers stay pinned to the verified parked exact-name domain and stale legacy careers contract', async () => {
  const karvy = await loadKarvyModule()

  assert.equal(karvy.SOURCE, 'karvy')
  assert.equal(karvy.COMPANY, 'Karvy')
  assert.equal(karvy.HOMEPAGE_URL, 'https://www.karvy.com/')
  assert.deepEqual(karvy.PARKED_HOMEPAGE_URLS, [
    'https://karvy.com/',
    'https://www.karvy.com/',
  ])
  assert.equal(karvy.LEGACY_HOMEPAGE_URL, 'https://www.karvyonline.com/')
  assert.equal(karvy.CAREERS_URL, 'https://www.karvyonline.com/join-us/career/')
  assert.equal(karvy.hasParkedHomepageSignal(parkedHomepageHtml), true)
  assert.equal(karvy.hasContaminatedLegacyRootSignal(contaminatedLegacyRootHtml), true)
  assert.equal(karvy.hasStaleCareerPageSignal(staleCareerPageHtml), true)
  assert.equal(karvy.hasPublicJobsSignal(staleCareerPageHtml), false)
  assert.equal(karvy.hasPublicJobsSignal(publicJobsHtml), true)
})

test('Karvy returns [] only while the verified exact-name domain is parked and the legacy surface remains untrustworthy', async () => {
  const karvy = await loadKarvyModule()
  const requestedUrls = []

  const jobs = await karvy.createKarvyScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (karvy.PARKED_HOMEPAGE_URLS.includes(url)) {
        return {
          status: 200,
          url,
          finalUrl: url,
          html: parkedHomepageHtml,
        }
      }

      if (url === karvy.LEGACY_HOMEPAGE_URL) {
        return {
          status: 200,
          url,
          finalUrl: url,
          html: contaminatedLegacyRootHtml,
        }
      }

      if (url === karvy.CAREERS_URL) {
        return {
          status: 200,
          url,
          finalUrl: url,
          html: staleCareerPageHtml,
        }
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    ...karvy.PARKED_HOMEPAGE_URLS,
    karvy.LEGACY_HOMEPAGE_URL,
    karvy.CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Karvy fails closed when the parked domain or stale no-public-careers contract changes', async () => {
  const karvy = await loadKarvyModule()

  await assert.rejects(
    karvy.createKarvyScraper().run({
      fetchPage: async (url) => {
        if (karvy.PARKED_HOMEPAGE_URLS.includes(url)) {
          return {
            status: 200,
            url,
            finalUrl: url,
            html: publicJobsHtml,
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /parked exact-name domain/i,
  )

  await assert.rejects(
    karvy.createKarvyScraper().run({
      fetchPage: async (url) => {
        if (karvy.PARKED_HOMEPAGE_URLS.includes(url)) {
          return {
            status: 200,
            url,
            finalUrl: url,
            html: parkedHomepageHtml,
          }
        }

        if (url === karvy.LEGACY_HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            finalUrl: url,
            html: '<html><head><title>Karvy</title></head><body>Corporate homepage</body></html>',
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /legacy homepage/i,
  )

  await assert.rejects(
    karvy.createKarvyScraper().run({
      fetchPage: async (url) => {
        if (karvy.PARKED_HOMEPAGE_URLS.includes(url)) {
          return {
            status: 200,
            url,
            finalUrl: url,
            html: parkedHomepageHtml,
          }
        }

        if (url === karvy.LEGACY_HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            finalUrl: url,
            html: contaminatedLegacyRootHtml,
          }
        }

        if (url === karvy.CAREERS_URL) {
          return {
            status: 200,
            url,
            finalUrl: url,
            html: publicJobsHtml,
          }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /stale career page|public job/i,
  )
})
