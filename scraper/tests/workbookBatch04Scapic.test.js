import assert from 'node:assert/strict'
import test from 'node:test'

const scapicModule = await import('../workbookbatch04/scapic.js').catch(() => ({}))

const {
  CAREERS_URL,
  COMPANY,
  DISPOSITION,
  OFFICIAL_BRAND,
  SOURCE,
  VERIFIED_SURFACE_SUMMARY,
  createScapicScraper,
  detectScapicSpecificSignal,
  hasVerifiedParentCareersSurface,
  run,
} = scapicModule

const VERIFIED_PARENT_CAREERS_HTML = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Jobs at Flipkart | Flipkart Careers</title>
      <link rel="canonical" href="https://www.flipkartcareers.com/jobslist" />
      <meta property="og:url" content="https://www.flipkartcareers.com/jobslist" />
    </head>
    <body>
      <main>
        <h1>Flipkart Careers</h1>
        <p>Explore opportunities across Flipkart businesses.</p>
        <section>
          <h2>Featured roles</h2>
          <a href="/job/software-development-engineer">Software Development Engineer</a>
          <a href="/job/category-manager">Category Manager</a>
        </section>
      </main>
    </body>
  </html>
`

test('Scapic stays fail-closed on the verified Flipkart parent-careers surface', async () => {
  let requestedUrl = null

  const jobs = await run({
    fetchPage: async (url) => {
      requestedUrl = url
      return {
        status: 200,
        url,
        html: VERIFIED_PARENT_CAREERS_HTML,
      }
    },
  })

  assert.equal(requestedUrl, CAREERS_URL)
  assert.deepEqual(jobs, [])
  assert.equal(SOURCE, 'scapic')
  assert.equal(COMPANY, 'Scapic')
  assert.equal(OFFICIAL_BRAND, 'Scapic')
  assert.equal(CAREERS_URL, 'https://www.flipkartcareers.com/jobslist')
  assert.equal(DISPOSITION, 'verified-parent-careers-surface-acquisition-context-fail-closed')
  assert.match(VERIFIED_SURFACE_SUMMARY, /Saturday, July 25, 2026/)
  assert.match(VERIFIED_SURFACE_SUMMARY, /parent-company careers surface reviewed for Scapic/i)
  assert.match(VERIFIED_SURFACE_SUMMARY, /returns no jobs until a verifiable public openings flow is implemented/i)
  assert.equal(typeof createScapicScraper, 'function')
  assert.equal(hasVerifiedParentCareersSurface(VERIFIED_PARENT_CAREERS_HTML), true)
  assert.equal(detectScapicSpecificSignal(VERIFIED_PARENT_CAREERS_HTML), null)
})

test('Scapic rejects when the verified Flipkart parent-careers surface disappears', async () => {
  assert.equal(
    hasVerifiedParentCareersSurface(`
      <html>
        <head><title>Example Careers</title></head>
        <body><h1>Example Careers</h1></body>
      </html>
    `),
    false,
  )

  await assert.rejects(
    run({
      fetchPage: async () => ({
        status: 200,
        url: 'https://www.flipkartcareers.com/careers',
        html: `
          <html>
            <head><title>Example Careers</title></head>
            <body><h1>Example Careers</h1></body>
          </html>
        `,
      }),
    }),
    /verified parent-company careers surface/i,
  )
})

test('Scapic rejects when the parent-company careers surface starts exposing explicit Scapic signals', async () => {
  const scapicSignalHtml = `
    ${VERIFIED_PARENT_CAREERS_HTML}
    <section>
      <h2>Scapic opportunities</h2>
      <a href="/job/scapic-growth-lead">Scapic Growth Lead</a>
    </section>
  `

  assert.match(detectScapicSpecificSignal(scapicSignalHtml) || '', /scapic/i)

  await assert.rejects(
    run({
      fetchPage: async () => ({
        status: 200,
        url: CAREERS_URL,
        html: scapicSignalHtml,
      }),
    }),
    /explicit Scapic-specific signal/i,
  )
})
