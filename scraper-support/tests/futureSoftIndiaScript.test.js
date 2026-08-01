import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('../../scraper/futuresoftindia/script.js')
  } catch {
    assert.fail('Expected FutureSoft India scraper module at ../../scraper/futuresoftindia/script.js')
  }
}

const zeroRowsHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at FutureSoft India</title>
  </head>
  <body>
    <main>
      <h1>Careers at FutureSoft India</h1>
      <select name="job-title">
        <option>Technical Project Manager</option>
        <option>Node JS Developer</option>
        <option>Java Developer</option>
      </select>
      <select name="location">
        <option>Bangalore</option>
        <option>Chennai</option>
        <option>Noida</option>
      </select>
      <table>
        <thead>
          <tr>
            <th>Job Code</th>
            <th>Job Title</th>
            <th>Location</th>
            <th>Experience (Yrs)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </main>
  </body>
</html>
`

const liveRowsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Careers at FutureSoft India</h1>
    <table>
      <tbody>
        <tr>
          <td>FSI-001</td>
          <td>Node JS Developer</td>
          <td>Noida</td>
          <td>4</td>
          <td><a href="/apply/node-js-developer">Apply</a></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>
`

test('FutureSoft India sentinel pins the verified first-party careers table zero-row state', async () => {
  const futureSoft = await loadModule()

  assert.equal(futureSoft.SOURCE, 'futuresoftindia')
  assert.equal(futureSoft.COMPANY, 'FutureSoft India')
  assert.equal(futureSoft.CAREERS_URL, 'https://futuresoftindia.com/careers/')
  assert.equal(futureSoft.VERIFIED_ON, '2026-07-17')
  assert.equal(futureSoft.hasVerifiedCareersSignal(zeroRowsHtml), true)
  assert.equal(futureSoft.hasVerifiedZeroRowsSignal(zeroRowsHtml), true)
  assert.equal(futureSoft.hasVerifiedZeroRowsSignal(liveRowsHtml), false)
})

test('FutureSoft India returns [] only while the verified careers page keeps the zero-row jobs table state', async () => {
  const futureSoft = await loadModule()

  const jobs = await futureSoft.createFutureSoftIndiaScraper().run({
    fetchText: async (url) => {
      assert.equal(url, futureSoft.CAREERS_URL)
      return zeroRowsHtml
    },
  })

  assert.deepEqual(jobs, [])
})

test('FutureSoft India fails closed when the verified careers table drifts or starts exposing rendered rows', async () => {
  const futureSoft = await loadModule()

  await assert.rejects(
    futureSoft.createFutureSoftIndiaScraper().run({
      fetchText: async () => '<html><body><h1>Jobs</h1></body></html>',
    }),
    /verified FutureSoft India careers page/i,
  )

  await assert.rejects(
    futureSoft.createFutureSoftIndiaScraper().run({
      fetchText: async () => liveRowsHtml,
    }),
    /zero-row jobs table state/i,
  )
})
