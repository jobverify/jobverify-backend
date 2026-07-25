import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>NCSi Careers</title>
  </head>
  <body>
    <h1>Join our renowned team</h1>
    <h2>YOUR CAREER. OUR COMMITMENT.</h2>
    <p>We are constantly looking for individuals who can enhance our relationships and enjoy the benefits of the culture at NCSI.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../ncsitechnologiespvtltd/script.js')
  } catch {
    assert.fail('Expected NCSI Technologies Pvt Ltd scraper module at ../ncsitechnologiespvtltd/script.js')
  }
}

test('NCSI Technologies Pvt Ltd returns [] while the verified official careers page remains a generic landing page without an exact-name India jobs board', async () => {
  const ncsi = await loadModule()

  assert.equal(ncsi.SOURCE, 'ncsitechnologiespvtltd')
  assert.equal(ncsi.COMPANY, 'NCSI Technologies Pvt Ltd')
  assert.equal(ncsi.CAREERS_URL, 'https://www.ncsi.us/careers/')
  assert.equal(ncsi.hasVerifiedCareersPageSignal(careersHtml), true)

  const jobs = await ncsi.createNcsitechnologiespvtltdScraper().run({
    fetchText: async () => careersHtml,
  })

  assert.deepEqual(jobs, [])
})

test('NCSI Technologies Pvt Ltd fails closed when the verified generic careers landing contract drifts', async () => {
  const ncsi = await loadModule()

  await assert.rejects(
    ncsi.createNcsitechnologiespvtltdScraper().run({
      fetchText: async () => careersHtml.replace('YOUR CAREER. OUR COMMITMENT.', 'Apply now'),
    }),
    /verified generic careers landing/i,
  )
})
