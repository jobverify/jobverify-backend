import assert from 'node:assert/strict'
import test from 'node:test'

const parkedHomepageHtml = `
<html>
  <head><title>403 Forbidden</title></head>
  <body>
    <center><h1>403 Forbidden</h1></center>
  </body>
</html>
`

const officialLegacyRootHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Karvy Online - Leading Stock Broking Company in India</title>
  </head>
  <body>
    <main>
      <h1>Leading Stock Broking Company in India</h1>
      <p>Mutual Funds</p>
      <p>Open Demat Account Online in 15 Mins</p>
      <a href="/join-us/career">Careers</a>
      <a href="/join-us/career.html"><img alt="Join us" src="/assets/images/join-us-mbanner.jpg" /></a>
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
      <h1>Have a Zest to grow in Your Career?</h1>
      <h1>Interested to Join Us?</h1>
      <p>Apply</p>
      <h4>
        email resume to<br />
        <a href="/cdn-cgi/l/email-protection#example" class="text-white eakarvy pT5">
          <span class="__cf_email__" data-cfemail="example">[email&#160;protected]</span>
        </a>
      </h4>
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
    return await import('../../scraper/karvy/script.js')
  } catch {
    assert.fail('Expected Karvy scraper module at ../../scraper/karvy/script.js')
  }
}

test('Karvy sentinel helpers stay pinned to the verified inactive exact-name domain and stale legacy careers contract', async () => {
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
  assert.equal(karvy.hasOfficialLegacyRootSignal(officialLegacyRootHtml), true)
  assert.equal(karvy.hasStaleCareerPageSignal(staleCareerPageHtml), true)
  assert.equal(karvy.hasPublicJobsSignal(staleCareerPageHtml), false)
  assert.equal(karvy.hasPublicJobsSignal(publicJobsHtml), true)
})

test('Karvy returns [] only while the verified exact-name domain stays inactive and the linked legacy careers page remains resume-only', async () => {
  const karvy = await loadKarvyModule()
  const requestedUrls = []

  const jobs = await karvy.createKarvyScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (karvy.PARKED_HOMEPAGE_URLS.includes(url)) {
        return {
          status: 403,
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
          html: officialLegacyRootHtml,
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

test('Karvy fails closed when the inactive exact-name domain or stale no-public-careers contract changes', async () => {
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
            status: 403,
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
            status: 403,
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
            html: officialLegacyRootHtml,
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
