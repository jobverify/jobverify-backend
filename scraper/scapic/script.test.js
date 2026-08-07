import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAREERS_URL,
  createScapicScraper,
  detectScapicSpecificSignal,
  hasVerifiedParentCareersSurface,
  runStandalone,
} from './script.js'

const currentParentCareersHtml = `
  <html>
    <head>
      <title>Flipkart Careers - Jobs @ India</title>
    </head>
    <body>
      <h1>Explore for opportunities here</h1>
      <section>Current Openings</section>
      <p>Flipkart Careers</p>
    </body>
  </html>
`

const canonicalParentCareersHtml = `
  <html>
    <head>
      <title>Flipkart Careers</title>
      <link rel="canonical" href="https://www.flipkartcareers.com/jobslist" />
    </head>
    <body>
      <p>Flipkart Careers</p>
    </body>
  </html>
`

const scapicSignalHtml = `
  <html>
    <head>
      <title>Flipkart Careers - Jobs @ India</title>
    </head>
    <body>
      <h1>Explore for opportunities here</h1>
      <section>Current Openings</section>
      <a href="https://www.flipkartcareers.com/jobslist/scapic-designer">Scapic designer</a>
    </body>
  </html>
`

test('Scapic verifier accepts both the legacy canonical surface and the current Flipkart jobslist surface', () => {
  assert.equal(hasVerifiedParentCareersSurface(canonicalParentCareersHtml), true)
  assert.equal(hasVerifiedParentCareersSurface(currentParentCareersHtml), true)
})

test('Scapic detector stays silent on generic Flipkart listings and flags explicit Scapic signals', () => {
  assert.equal(detectScapicSpecificSignal(currentParentCareersHtml, CAREERS_URL), null)
  assert.match(
    detectScapicSpecificSignal(scapicSignalHtml, CAREERS_URL),
    /scapic text signal|scapic-designer/i,
  )
})

test('Scapic remains fail-closed when the verified parent careers surface has no explicit Scapic signal', async () => {
  const scraper = createScapicScraper()

  const jobs = await scraper.run({
    fetchPage: async (url) => ({
      status: 200,
      url,
      html: currentParentCareersHtml,
    }),
  })

  assert.deepEqual(jobs, [])
})

test('Scapic fails closed when the parent careers surface exposes an explicit Scapic signal', async () => {
  const scraper = createScapicScraper()

  await assert.rejects(
    scraper.run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: scapicSignalHtml,
      }),
    }),
    /Scapic-specific signal/i,
  )
})

test('Scapic standalone dry runs write jobs.json', async () => {
  const writes = []

  const jobs = await runStandalone({
    argv: ['node', 'script.js', '--dry-run'],
    runScraper: async () => [],
    saveToFileImpl: (results, filePath) => {
      writes.push({ results, filePath })
    },
    saveToDbImpl: async () => {
      assert.fail('dry run should not write to the database')
    },
  })

  assert.deepEqual(jobs, [])
  assert.equal(writes.length, 1)
  assert.deepEqual(writes[0].results, [])
  assert.match(writes[0].filePath, /scapic[\\/]jobs\.json$/i)
})
