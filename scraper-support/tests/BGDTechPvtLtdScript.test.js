import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at BGD</title>
  </head>
  <body>
    <main>
      <h1>Careers at BGD</h1>
      <p>Welcome to the vacancies page of our company!</p>
      <p>Didn't find the right job?</p>
      <p>hello@bgd-limited.com</p>
      <input type="text" name="name" />
      <input type="text" name="resume" />
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/bgdtechpvtltd/script.js')
  } catch {
    assert.fail('Expected BGD Tech PVT LTD scraper module at ../../scraper/bgdtechpvtltd/script.js')
  }
}

test('BGD Tech PVT LTD returns [] only while the verified first-party careers page remains a resume-intake surface', async () => {
  const bgd = await loadModule()

  assert.equal(bgd.SOURCE, 'bgdtechpvtltd')
  assert.equal(bgd.COMPANY, 'BGD Tech PVT LTD')
  assert.equal(bgd.CAREERS_URL, 'https://bgd-limited.com/careers')
  assert.equal(bgd.VERIFIED_ON, '2026-07-17')
  assert.equal(bgd.hasOfficialCareersSignal(CAREERS_HTML), true)
  assert.equal(bgd.pageExposesPublicJobListings(CAREERS_HTML), false)

  const jobs = await bgd.createBGDTechPvtLtdScraper().run({
    fetchPage: async (url) => {
      assert.equal(url, bgd.CAREERS_URL)
      return {
        status: 200,
        url,
        html: CAREERS_HTML,
      }
    },
  })

  assert.deepEqual(jobs, [])
})

test('BGD Tech PVT LTD fails closed when the careers surface drifts into public jobs or stops matching the verified intake page', async () => {
  const bgd = await loadModule()

  await assert.rejects(
    bgd.createBGDTechPvtLtdScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: bgd.CAREERS_URL,
        html: '<html><body><h1>Current Openings</h1><a href="/jobs/frontend-engineer">Apply now</a></body></html>',
      }),
    }),
    /public jobs surface/i,
  )

  await assert.rejects(
    bgd.createBGDTechPvtLtdScraper().run({
      fetchPage: async () => ({
        status: 200,
        url: bgd.CAREERS_URL,
        html: '<html><body><h1>Careers</h1></body></html>',
      }),
    }),
    /verified BGD Tech PVT LTD careers page/i,
  )
})
