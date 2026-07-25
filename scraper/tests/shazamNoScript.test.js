import assert from 'node:assert/strict'
import test from 'node:test'

const SHAZAM_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Shazam - Music Discovery, Charts & Song Lyrics</title>
  </head>
  <body>
    <main>
      <h1>Name songs in seconds</h1>
      <h2>Find music, concerts and more with Shazam</h2>
    </main>
    <footer>
      <h2>Shazam Footer</h2>
      <h3>Company</h3>
      <a href="https://jobs.apple.com/en-us/search?product=apple-music-APPMU">Careers</a>
      <a href="https://www.shazam.com/en-us/about">About Us</a>
      <p>Copyright 2026 Apple Inc. and its affiliates</p>
    </footer>
  </body>
</html>
`

const APPLE_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Search Jobs - Apple Music - Jobs - Careers at Apple</title>
  </head>
  <body>
    <h1>Find your perfect role.</h1>
    <section>
      <h2>QA Lead - Shazam (12 Month Contract)</h2>
      <p>Software and Services</p>
      <p>Location London</p>
      <p>Imagine what you could do here.</p>
      <p>The role is located in our London office, the tech hub of the Shazam team.</p>
    </section>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../shazamno/script.js')
  } catch {
    assert.fail('Expected Shazam? no scraper module at ../shazamno/script.js')
  }
}

test('Shazam? no pins the verified noisy-row contract to the Shazam brand page and Apple careers surface', async () => {
  const shazamNo = await loadModule()

  assert.equal(shazamNo.SOURCE, 'shazamno')
  assert.equal(shazamNo.COMPANY, 'Shazam? no')
  assert.equal(shazamNo.OFFICIAL_BRAND_NAME, 'Shazam')
  assert.equal(shazamNo.VERIFIED_ON, '2026-07-17')
  assert.equal(shazamNo.HOMEPAGE_URL, 'https://www.shazam.com/en-us')
  assert.equal(shazamNo.APPLE_CAREERS_SEARCH_URL, 'https://jobs.apple.com/en-us/search?product=apple-music-APPMU')
  assert.equal(shazamNo.hasVerifiedShazamBrandPageSignal(SHAZAM_HTML), true)
  assert.equal(shazamNo.hasVerifiedAppleCareersSignal(APPLE_CAREERS_HTML), true)
  assert.equal(
    shazamNo.extractAppleCareersSearchUrl(SHAZAM_HTML),
    'https://jobs.apple.com/en-us/search?product=apple-music-APPMU',
  )
  assert.equal(shazamNo.containsLiteralBacklogRow(SHAZAM_HTML), false)
})

test('Shazam? no run returns [] only while the exact row remains a noisy note rather than a real first-party company name', async () => {
  const shazamNo = await loadModule()
  const requestedUrls = []

  const jobs = await shazamNo.createShazamNoScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === shazamNo.HOMEPAGE_URL) {
        return { status: 200, url, html: SHAZAM_HTML }
      }

      if (url === shazamNo.APPLE_CAREERS_SEARCH_URL) {
        return { status: 200, url, html: APPLE_CAREERS_HTML }
      }

      throw new Error(`Unexpected Shazam? no URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    shazamNo.HOMEPAGE_URL,
    shazamNo.APPLE_CAREERS_SEARCH_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Shazam? no fails closed when the Shazam page, Apple careers handoff, or exact-row-noise evidence changes materially', async () => {
  const shazamNo = await loadModule()

  await assert.rejects(
    shazamNo.createShazamNoScraper().run({
      fetchPage: async (url) => {
        if (url === shazamNo.HOMEPAGE_URL) {
          return {
            status: 200,
            url,
            html: SHAZAM_HTML.replace(
              'https://jobs.apple.com/en-us/search?product=apple-music-APPMU',
              'https://www.shazam.com/en-us/careers',
            ),
          }
        }

        return { status: 200, url, html: APPLE_CAREERS_HTML }
      },
    }),
    /verified Apple careers handoff/i,
  )

  await assert.rejects(
    shazamNo.createShazamNoScraper().run({
      fetchPage: async (url) => {
        if (url === shazamNo.HOMEPAGE_URL) {
          return { status: 200, url, html: SHAZAM_HTML.replace('Shazam', 'Shazam? no') }
        }

        return { status: 200, url, html: APPLE_CAREERS_HTML }
      },
    }),
    /exact-row literal/i,
  )

  await assert.rejects(
    shazamNo.createShazamNoScraper().run({
      fetchPage: async (url) => {
        if (url === shazamNo.HOMEPAGE_URL) {
          return { status: 200, url, html: SHAZAM_HTML }
        }

        return {
          status: 200,
          url,
          html: APPLE_CAREERS_HTML.replace('QA Lead - Shazam (12 Month Contract)', 'QA Lead - Music'),
        }
      },
    }),
    /verified Apple careers surface/i,
  )
})
