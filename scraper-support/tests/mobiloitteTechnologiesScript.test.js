import assert from 'node:assert/strict'
import test from 'node:test'

const careersHtml = `
<!doctype html>
<html>
  <body>
    <h1>Careers at Mobiloitte That Build Your Future</h1>
    <h2>Current Openings</h2>
    <button>Search Jobs</button>
    <p>Didn't find the right position?</p>
    <p>careers@mobiloitte.com</p>
    <div>No Jobs Found</div>
    <p>We couldn't find any jobs matching your criteria.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/mobiloittetechnologies/script.js')
  } catch {
    assert.fail('Expected Mobiloitte Technologies scraper module at ../../scraper/mobiloittetechnologies/script.js')
  }
}

test('Mobiloitte Technologies accepts the verified no-jobs empty state', async () => {
  const mobiloitte = await loadModule()

  assert.equal(mobiloitte.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(mobiloitte.hasNoJobsFoundState(careersHtml), true)
  assert.deepEqual(
    await mobiloitte.createMobiloitteTechnologiesScraper().run({
      fetchText: async () => careersHtml,
    }),
    [],
  )
})

test('Mobiloitte Technologies can recover with a browser-backed careers page when direct requests are blocked', async () => {
  const mobiloitte = await loadModule()
  const browserUrls = []

  const jobs = await mobiloitte.createMobiloitteTechnologiesScraper().run({
    fetchText: async () => {
      throw new Error(`HTTP 403 for ${mobiloitte.CAREERS_URL}`)
    },
    fetchBrowserText: async (url) => {
      browserUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(browserUrls, [mobiloitte.CAREERS_URL])
  assert.deepEqual(jobs, [])
})
