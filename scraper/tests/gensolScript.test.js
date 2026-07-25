import assert from 'node:assert/strict'
import test from 'node:test'

const loadGensolModule = async () => {
  try {
    return await import('../gensol/script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
  <!doctype html>
  <html lang="">
    <head>
      <title>gensol.in</title>
    </head>
    <body>
      <main>
        <h1>Something amazing will be constructed here...</h1>
        <p>To change this page, upload your website into the public_html directory.</p>
        <p>Powered by <a href="https://www.directadmin.com">DirectAdmin</a></p>
      </main>
    </body>
  </html>
`

const notFoundHtml = `
  <html>
    <head><title>404 Not Found</title></head>
    <body>
      <h1>404 Not Found</h1>
      <p>The resource requested could not be found on this server!</p>
      <p>Proudly powered by LiteSpeed Web Server</p>
    </body>
  </html>
`

const careersHtml = `
  <html>
    <head><title>Gensol Careers</title></head>
    <body>
      <h1>Careers at Gensol</h1>
      <article class="job-card">
        <h2>Solar Design Engineer</h2>
        <a href="/apply">Apply now</a>
      </article>
    </body>
  </html>
`

test('Gensol validates the verified homepage placeholder and 404 career routes before returning no jobs', async () => {
  const gensol = await loadGensolModule()
  assert.ok(gensol)

  assert.equal(gensol.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(gensol.isMissingCareerRoute(notFoundHtml), true)

  const requestedUrls = []
  const jobs = await gensol.createGensolScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === gensol.HOMEPAGE_URL) return homepageHtml
      if (url === gensol.CAREERS_URL || url === gensol.JOBS_URL) return notFoundHtml

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    gensol.HOMEPAGE_URL,
    gensol.CAREERS_URL,
    gensol.JOBS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Gensol fails closed when a first-party careers route starts serving public job content', async () => {
  const gensol = await loadGensolModule()
  assert.ok(gensol)

  await assert.rejects(
    gensol.createGensolScraper().run({
      fetchText: async (url) => {
        if (url === gensol.HOMEPAGE_URL) return homepageHtml
        if (url === gensol.CAREERS_URL) return careersHtml
        if (url === gensol.JOBS_URL) return notFoundHtml
        throw new Error(`Unexpected URL: ${url}`)
      },
    }),
    /surface changed|public job/i,
  )
})
