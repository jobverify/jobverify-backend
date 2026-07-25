import assert from 'node:assert/strict'
import test from 'node:test'

const VERIFIED_CAREERS_HTML = `
<!doctype html>
<html lang="en">
  <head>
    <title>Lloyds Technology Centre | Careers</title>
  </head>
  <body>
    <h1>Careers at Lloyds Technology Centre</h1>
    <p>We're Lloyds Technology Centre*, a tech and data company located in Hyderabad, India.</p>
    <a href="https://lbg.wd3.myworkdayjobs.com/Lloyds_Technology_Centre">Search and apply</a>
    <a href="https://lbg.wd3.myworkdayjobs.com/Lloyds_Technology_Centre">Search and apply for jobs</a>
  </body>
</html>
`

const WORKDAY_MAINTENANCE_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Workday is currently unavailable.</h2>
    <p>Workday is performing planned maintenance during the following period:</p>
  </body>
</html>
`

const WORKDAY_RECOVERED_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Search for Jobs</h1>
    <p>Open Positions</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../lloydstechnologycentre/script.js')
  } catch {
    assert.fail('Expected Lloyds Technology Centre scraper module at ../lloydstechnologycentre/script.js')
  }
}

test('Lloyds Technology Centre helpers stay pinned to the verified careers page and Workday maintenance state', async () => {
  const lloyds = await loadModule()

  assert.equal(lloyds.SOURCE, 'lloydstechnologycentre')
  assert.equal(lloyds.COMPANY, 'Lloyds Technology Centre')
  assert.equal(lloyds.CAREERS_URL, 'https://lloydstechnologycentre.com/')
  assert.equal(
    lloyds.WORKDAY_BOARD_URL,
    'https://lbg.wd3.myworkdayjobs.com/Lloyds_Technology_Centre',
  )
  assert.equal(lloyds.hasOfficialCareersSignal(VERIFIED_CAREERS_HTML), true)
  assert.equal(
    lloyds.extractVerifiedWorkdayBoardUrl(VERIFIED_CAREERS_HTML),
    lloyds.WORKDAY_BOARD_URL,
  )
  assert.equal(lloyds.hasWorkdayMaintenanceSignal(WORKDAY_MAINTENANCE_HTML), true)
  assert.equal(lloyds.hasWorkdayMaintenanceSignal(WORKDAY_RECOVERED_HTML), false)
})

test('Lloyds Technology Centre returns [] only while the verified Workday handoff remains in maintenance', async () => {
  const lloyds = await loadModule()
  const requestedUrls = []

  const jobs = await lloyds.createLloydsTechnologyCentreScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === lloyds.CAREERS_URL) return VERIFIED_CAREERS_HTML
      if (url === lloyds.WORKDAY_BOARD_URL) return WORKDAY_MAINTENANCE_HTML
      throw new Error(`Unexpected Lloyds Technology Centre URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    lloyds.CAREERS_URL,
    lloyds.WORKDAY_BOARD_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('Lloyds Technology Centre fails closed when the careers handoff drifts or the Workday board leaves the verified maintenance-only state', async () => {
  const lloyds = await loadModule()

  await assert.rejects(
    lloyds.createLloydsTechnologyCentreScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
    }),
    /verified Lloyds Technology Centre careers page/i,
  )

  await assert.rejects(
    lloyds.createLloydsTechnologyCentreScraper().run({
      fetchText: async (url) => {
        if (url === lloyds.CAREERS_URL) return VERIFIED_CAREERS_HTML
        return WORKDAY_RECOVERED_HTML
      },
    }),
    /maintenance-only state/i,
  )
})
