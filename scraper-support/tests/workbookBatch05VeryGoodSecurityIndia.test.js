import assert from 'node:assert/strict'
import test from 'node:test'

const veryGoodSecurityIndiaModule = await import(
  '../../scraper/verygoodsecurityindia/script.js'
).catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  SOURCE,
  createVeryGoodSecurityIndiaScraper,
  run,
} = veryGoodSecurityIndiaModule

const VERIFIED_NON_ENUMERABLE_HTML = `
  <main>
    <h1>It Takes Exceptional People to Create VGS</h1>
    <section>
      <h2>What We Are Looking For In Each Teammate</h2>
      <p>
        Are you an enthusiastic professional who is passionate about your craft
        and has the desire to join an expanding team solving crucial payment
        problems?
      </p>
      <p>Current VGS Job Openings Below</p>
      <img src="/images/vgs-logo.png" alt="VGS Logo" />
    </section>
  </main>
`

test('Very Good Security India stays fail-closed on the verified non-enumerable careers surface', async () => {
  let requestedUrl = null

  const jobs = await run({
    fetchHtml: async (url) => {
      requestedUrl = url
      return VERIFIED_NON_ENUMERABLE_HTML
    },
  })

  assert.equal(requestedUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'verygoodsecurityindia')
  assert.equal(COMPANY, 'Very Good Security India')
  assert.equal(CAREERS_URL, 'https://www.verygoodsecurity.com/careers')
  assert.equal(DISPOSITION, 'verified-non-enumerable-careers-surface')
  assert.equal(typeof createVeryGoodSecurityIndiaScraper, 'function')
})

test('Very Good Security India ignores same-origin Nuxt payload assets when no public jobs surface exists', async () => {
  const jobs = await run({
    fetchHtml: async () => `
      ${VERIFIED_NON_ENUMERABLE_HTML}
      <link
        rel="preload"
        as="fetch"
        href="/careers/_payload.json?fc098e94-ac75-47d4-88f9-6a172d46b040"
      >
    `,
  })

  assert.deepEqual(jobs, [])
})

test('Very Good Security India rejects when the verified careers contract disappears', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        <main>
          <h1>Careers</h1>
          <p>Explore opportunities with VGS.</p>
        </main>
      `,
    }),
    /verified careers contract/i,
  )
})

test('Very Good Security India rejects when a trustworthy public listings surface appears', async () => {
  await assert.rejects(
    run({
      fetchHtml: async () => `
        ${VERIFIED_NON_ENUMERABLE_HTML}
        <section aria-label="Open roles">
          <iframe src="https://boards.greenhouse.io/embed/job_board?for=vgs"></iframe>
        </section>
      `,
    }),
    /public listings surface/i,
  )
})
