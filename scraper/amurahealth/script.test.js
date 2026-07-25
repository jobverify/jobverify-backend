import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const jobsBlogHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Jobs at Amura - Adventure of your Lifetime</title>
    </head>
    <body>
      <main>
        <h1>Working at Amura</h1>
        <article>
          <a href="https://amura.ai/jobs/2023/10/04/growth-is-addictive/">Growth is addictive</a>
          <a href="https://amura.ai/jobs/2023/10/04/growth-is-addictive/">2023-10-04</a>
          <time>2023-10-04</time>
        </article>
        <a href="https://amura.ai/jobs">Jobs at Amura</a>
        <p>Proudly powered by WordPress</p>
      </main>
    </body>
  </html>
`

const changedJobsHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Jobs at Amura - Adventure of your Lifetime</title>
    </head>
    <body>
      <main>
        <h1>Working at Amura</h1>
        <article>
          <a href="https://amura.ai/jobs/2026/07/08/backend-engineer/">Backend Engineer</a>
        </article>
        <a href="https://amura.ai/jobs">Jobs at Amura</a>
        <p>Growth is addictive</p>
        <p>Proudly powered by WordPress</p>
      </main>
    </body>
  </html>
`

test('Amura Health scraper recognizes the verified jobs blog surface and known non-role post', async () => {
  const amura = await loadModule()
  assert.ok(amura, 'Amura Health scraper module should load')

  const {
    JOBS_PAGE_URL,
    SOURCE,
    extractPublicPostTitles,
    hasKnownNonRolePostsOnly,
    hasVerifiedJobsBlogSurface,
  } = amura

  assert.equal(SOURCE, 'amurahealth')
  assert.equal(JOBS_PAGE_URL, 'https://amura.ai/jobs/')
  assert.equal(hasVerifiedJobsBlogSurface(jobsBlogHtml), true)
  assert.deepEqual(extractPublicPostTitles(jobsBlogHtml), ['Growth is addictive'])
  assert.equal(hasKnownNonRolePostsOnly(jobsBlogHtml), true)
})

test('Amura Health scraper returns no jobs while the public jobs blog has only the verified non-role post', async () => {
  const amura = await loadModule()
  assert.ok(amura, 'Amura Health scraper module should load')

  const { JOBS_PAGE_URL, createAmuraHealthScraper } = amura

  const requestedUrls = []
  const jobs = await createAmuraHealthScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      assert.equal(url, JOBS_PAGE_URL)
      return jobsBlogHtml
    },
  })

  assert.deepEqual(requestedUrls, [JOBS_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('Amura Health scraper fails loudly when the public jobs surface changes', async () => {
  const amura = await loadModule()
  assert.ok(amura, 'Amura Health scraper module should load')

  const { createAmuraHealthScraper } = amura

  await assert.rejects(
    createAmuraHealthScraper().run({
      fetchText: async () => '<html><title>Home</title></html>',
    }),
    /verified official public surface/i,
  )

  await assert.rejects(
    createAmuraHealthScraper().run({
      fetchText: async () => changedJobsHtml,
    }),
    /new or structured openings/i,
  )
})
