import assert from 'node:assert/strict'
import test from 'node:test'

const OFFICIAL_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>We're hiring – Linear</title>
    <link rel="canonical" href="https://linear.app/careers" />
  </head>
  <body>
    <main>
      <h1>Help us craft high-quality tools</h1>
      <p>Open roles</p>
      <section aria-label="Open roles">
        <article>
          <a href="/careers/29f7d3fe-a25a-4725-b4cb-2f48f56133b0">
            <span>Product Engineer</span>
            <span>North America</span>
          </a>
        </article>
        <article>
          <a href="/careers/4f064874-c020-4016-84cf-6c84fd5cc33a">
            <span>Senior / Staff Fullstack Engineer</span>
            <span>Europe, North America</span>
          </a>
        </article>
        <article>
          <a href="/careers/1d652292-04d9-405c-8101-578efd020e94">
            <span>Developer Relations</span>
            <span>Europe, North America</span>
          </a>
        </article>
      </section>
    </main>
  </body>
</html>
`

const INDIA_ROLE_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>We're hiring – Linear</title>
  </head>
  <body>
    <main>
      <h1>Help us craft high-quality tools</h1>
      <p>Open roles</p>
      <section aria-label="Open roles">
        <article>
          <a href="/careers/india-role">
            <span>Product Engineer</span>
            <span>India</span>
          </a>
        </article>
      </section>
    </main>
  </body>
</html>
`

const loadLinearModule = async () => {
  try {
    return await import('../../scraper/linear/script.js')
  } catch {
    assert.fail('Expected Linear scraper module at ../../scraper/linear/script.js')
  }
}

test('Linear pins the verified first-party careers page and extracts same-domain role links', async () => {
  const linear = await loadLinearModule()

  assert.equal(linear.SOURCE, 'linear')
  assert.equal(linear.COMPANY, 'Linear')
  assert.equal(linear.OFFICIAL_BRAND_NAME, 'Linear')
  assert.equal(linear.VERIFIED_ON, '2026-07-25')
  assert.equal(linear.CAREERS_PAGE_URL, 'https://linear.app/careers')
  assert.equal(linear.hasVerifiedCareersPageSignal(OFFICIAL_CAREERS_HTML), true)
  assert.deepEqual(linear.extractRoleSummaries(OFFICIAL_CAREERS_HTML), [
    {
      title: 'Product Engineer',
      location: 'North America',
      url: 'https://linear.app/careers/29f7d3fe-a25a-4725-b4cb-2f48f56133b0',
    },
    {
      title: 'Senior / Staff Fullstack Engineer',
      location: 'Europe, North America',
      url: 'https://linear.app/careers/4f064874-c020-4016-84cf-6c84fd5cc33a',
    },
    {
      title: 'Developer Relations',
      location: 'Europe, North America',
      url: 'https://linear.app/careers/1d652292-04d9-405c-8101-578efd020e94',
    },
  ])
})

test('Linear returns an honest empty array when the verified first-party careers page exposes no India locations', async () => {
  const linear = await loadLinearModule()
  const requestedUrls = []

  const jobs = await linear.createLinearScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return OFFICIAL_CAREERS_HTML
    },
  })

  assert.deepEqual(requestedUrls, [linear.CAREERS_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('Linear fails closed when the verified careers surface drifts or starts exposing India roles', async () => {
  const linear = await loadLinearModule()

  await assert.rejects(
    linear.createLinearScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified linear careers page/i,
  )

  await assert.rejects(
    linear.createLinearScraper().run({
      fetchText: async () => INDIA_ROLE_HTML,
    }),
    /verified linear india slice changed materially/i,
  )
})
