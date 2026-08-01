import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers</title>
  </head>
  <body>
    <h1>Build Your Dream Career with OSI Digital</h1>
    <h2>Current Opportunities</h2>
    <p>All candidates are encouraged to apply for active positions via the OSI Digital website or our LinkedIn page.</p>
    <p>If you are interested in applying for a position with us, please submit your resume below.</p>
    <a href="#apply-today">APPLY TODAY</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/osidigital/script.js')
  } catch {
    assert.fail('Expected OSI Digital scraper module at ../../scraper/osidigital/script.js')
  }
}

test('OSI Digital validates the first-party careers page and returns no jobs when only a resume form is present', async () => {
  const osi = await loadModule()

  assert.equal(osi.SOURCE, 'osidigital')
  assert.equal(osi.COMPANY, 'OSI Digital')
  assert.equal(osi.CAREERS_URL, 'https://osidigital.com/careers/')
  assert.equal(osi.VERIFIED_ON, '2026-07-18')
  assert.equal(osi.hasOfficialCareersSignal(careersHtml), true)

  const jobs = await osi.createOsiDigitalScraper().run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})

test('OSI Digital fails closed if the careers page starts exposing structured first-party job links', async () => {
  const osi = await loadModule()

  await assert.rejects(
    osi.createOsiDigitalScraper().run({
      fetchText: async () => `${careersHtml}<a href="https://osidigital.com/careers/data-engineer">Data Engineer</a>`,
    }),
    /public first-party jobs surface/i,
  )
})
