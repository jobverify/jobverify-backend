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
    <title>About Innoval Digital Solutions | SAP Compliance Experts | Innoval Digital Solutions</title>
  </head>
  <body>
    <main>
      <h1>Company</h1>
      <a href="/company/">Careers</a>
      <a href="/life-at-ivl/">Life @ IVL</a>
      <p>Enterprise intelligent solutions on SAP BTP. Value delivered through innovations. Digital AI Business Apps.</p>
      <p>SAP BTP Certified CMMI L5</p>
    </main>
  </body>
</html>
`

test('Innoval Digital Solutions sentinel pins the verified first-party recruiting teaser surface', async () => {
  const innoval = await loadModule()

  assert.equal(innoval.SOURCE, 'innovaldigitalsolutions')
  assert.equal(innoval.COMPANY, 'Innoval Digital Solutions')
  assert.equal(innoval.CAREERS_URL, 'https://www.ivldsp.com/company/')
  assert.equal(innoval.VERIFIED_ON, '2026-08-02')
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
