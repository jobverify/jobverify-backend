import assert from 'node:assert/strict'
import test from 'node:test'

const CAREERS_PAGE_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <a href="#positions">Open Positions</a>
    <h2>Open Positions</h2>
    <div id="positions">
      <div id="jobylon-jobs-widget"></div>
      <script type="text/javascript">
        const widgets = [{
          target: 'jobylon-jobs-widget-1',
          version: 'v4',
          id: 1,
        }];
        var el = document.createElement('script');
        el.src = 'https://cdn.jobylon.com/embedder.js';
      </script>
    </div>
  </body>
</html>
`

const PUBLIC_JOBS_HTML = `
<!doctype html>
<html lang="en">
  <body>
    <h2>Open Positions</h2>
    <a href="https://jobs.jobylon.com/jobs/123-senior-engineer">Senior Engineer</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/basware/script.js')
  } catch {
    assert.fail('Expected Basware scraper module at ../../scraper/basware/script.js')
  }
}

test('Basware sentinel helpers stay pinned to the verified first-party Jobylon shell from Saturday, July 18, 2026', async () => {
  const basware = await loadModule()

  assert.equal(basware.SOURCE, 'basware')
  assert.equal(basware.COMPANY, 'Basware')
  assert.equal(basware.OFFICIAL_BRAND_NAME, 'Basware')
  assert.equal(basware.VERIFIED_ON, '2026-07-18')
  assert.equal(basware.CAREERS_URL, 'https://careers.basware.com/')
  assert.equal(basware.hasOfficialJobylonShellSignal(CAREERS_PAGE_HTML), true)
  assert.equal(basware.hasPublicJobsSignal(CAREERS_PAGE_HTML), false)
  assert.equal(basware.hasPublicJobsSignal(PUBLIC_JOBS_HTML), true)
})

test('Basware returns [] only while the verified first-party careers page stays Jobylon-shell-only', async () => {
  const basware = await loadModule()
  const requestedUrls = []

  const jobs = await basware.createBaswareScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === basware.CAREERS_URL) return CAREERS_PAGE_HTML
      throw new Error(`Unexpected Basware URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [basware.CAREERS_URL])
  assert.deepEqual(jobs, [])
})

test('Basware fails closed when the verified Jobylon shell drifts or starts exposing public jobs', async () => {
  const basware = await loadModule()

  await assert.rejects(
    basware.createBaswareScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /trusted Jobylon shell/i,
  )

  await assert.rejects(
    basware.createBaswareScraper().run({
      fetchText: async () => PUBLIC_JOBS_HTML,
    }),
    /surface now appears to expose public jobs/i,
  )
})
