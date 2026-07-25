import assert from 'node:assert/strict'
import test from 'node:test'

const loadBizongoModule = async () => {
  try {
    return await import('../bizongo/script.js')
  } catch {
    assert.fail('Expected Bizongo scraper module at ../bizongo/script.js')
  }
}

const officialCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers | Bizongo</title>
    <link rel="canonical" href="https://bizongo.com/careers" />
  </head>
  <body>
    <main>
      <h1>Careers</h1>
      <p>Explore open positions</p>
      <a href="https://careers.bizongo.com/">Apply</a>
    </main>
  </body>
</html>
`

test('Bizongo verifies the official careers handoff and returns an honest zero-job result only while the careers host stays broken', async () => {
  const bizongo = await loadBizongoModule()

  const jobs = await bizongo.createBizongoScraper().run({
    fetchPage: async (url) => {
      if (url === bizongo.CAREERS_URL) {
        return {
          status: 200,
          url,
          html: officialCareersHtml,
        }
      }

      throw new Error('fetch failed')
    },
  })

  assert.equal(bizongo.hasOfficialCareersSignal(officialCareersHtml), true)
  assert.deepEqual(jobs, [])
})

test('Bizongo fails closed when the official careers page changes or the broken host becomes a real public board', async () => {
  const bizongo = await loadBizongoModule()

  await assert.rejects(
    bizongo.createBizongoScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: '<html><body>Jobs</body></html>',
      }),
    }),
    /verified Bizongo careers page/i,
  )

  await assert.rejects(
    bizongo.createBizongoScraper().run({
      fetchPage: async (url) => {
        if (url === bizongo.CAREERS_URL) {
          return { status: 200, url, html: officialCareersHtml }
        }

        return {
          status: 200,
          url,
          html: '<html><body><h1>Open Positions</h1><a href="/jobs/1">Apply now</a></body></html>',
        }
      },
    }),
    /verified broken Bizongo careers host state/i,
  )
})
