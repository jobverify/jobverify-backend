import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/innovaldigitalsolutions/script.js')
  } catch {
    assert.fail('Expected Innoval Digital Solutions scraper module at ../../scraper/innovaldigitalsolutions/script.js')
  }
}

const companyHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Innoval Digital Solutions | Company</title>
  </head>
  <body>
    <main>
      <h1>Company</h1>
      <a href="/company/?tab=careers">Careers</a>
      <p>We're hiring across engineering, quality assurance, and digital delivery teams.</p>
      <p>See open roles and apply</p>
      <p>Grow with IVL in SAP, Node.js, and enterprise delivery.</p>
    </main>
  </body>
</html>
`

test('Innoval Digital Solutions sentinel pins the verified first-party recruiting teaser surface', async () => {
  const innoval = await loadModule()

  assert.equal(innoval.SOURCE, 'innovaldigitalsolutions')
  assert.equal(innoval.COMPANY, 'Innoval Digital Solutions')
  assert.equal(innoval.CAREERS_URL, 'https://www.ivldsp.com/company/')
  assert.equal(innoval.VERIFIED_ON, '2026-07-17')
  assert.equal(innoval.hasVerifiedCareersSignal(companyHtml), true)
})

test('Innoval Digital Solutions returns [] while the verified first-party recruiting teaser exposes no trustworthy inline openings list', async () => {
  const innoval = await loadModule()

  const jobs = await innoval.createInnovalDigitalSolutionsScraper().run({
    fetchText: async (url) => {
      assert.equal(url, innoval.CAREERS_URL)
      return companyHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('Innoval Digital Solutions fails closed when the verified recruiting teaser drifts', async () => {
  const innoval = await loadModule()

  await assert.rejects(
    innoval.createInnovalDigitalSolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Apply</h1></body></html>',
    }),
    /verified Innoval Digital Solutions recruiting surface/i,
  )
})
