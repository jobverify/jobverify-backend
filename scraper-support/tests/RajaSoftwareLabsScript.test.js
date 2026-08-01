import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T09:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Current Openings</h1>
    <p>We are always looking to hire good engineering talent.</p>
    <h2>To apply for a specific job</h2>
    <ul>
      <li><a href="/careers/current-openings/android-2023">Software Engineer – Android</a></li>
      <li><a href="/careers/current-openings/ios-2023">Software Engineer – iOS</a></li>
      <li><a href="/careers/current-openings/web-frontend-2023">Software Engineer – Web Frontend</a></li>
    </ul>
    <p>If you feel you are a good fit, please email your resume to careers@rajasoftwarelabs.com.</p>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/rajasoftwarelabs/script.js')
  } catch {
    assert.fail('Expected Raja Software Labs scraper module at ../../scraper/rajasoftwarelabs/script.js')
  }
}

test('Raja Software Labs helpers stay pinned to the verified current openings page', async () => {
  const rsl = await loadModule()

  assert.equal(rsl.SOURCE, 'rajasoftwarelabs')
  assert.equal(rsl.COMPANY, 'Raja Software Labs')
  assert.equal(rsl.CAREERS_URL, 'https://rajasoftwarelabs.com/careers/current-openings')
  assert.equal(rsl.VERIFIED_ON, '2026-07-18')
  assert.equal(rsl.hasOfficialCareersSignal(careersHtml), true)
})

test('Raja Software Labs run parses current openings from the first-party careers page', async () => {
  const rsl = await loadModule()
  const jobs = await rsl.createRajaSoftwareLabsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, rsl.CAREERS_URL)
      return careersHtml
    },
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].title, 'Software Engineer – Android')
  assert.equal(jobs[0].location, 'Pune, Maharashtra, India')
  assert.equal(jobs[0].applyUrl, 'https://rajasoftwarelabs.com/careers/current-openings/android-2023')
  assert.equal(jobs[2].title, 'Software Engineer – Web Frontend')
  assert.equal(jobs[2].scrapedAt, FIXED_SCRAPED_AT)
})

test('Raja Software Labs fails closed when the trusted current openings shell changes materially', async () => {
  const rsl = await loadModule()

  await assert.rejects(
    rsl.createRajaSoftwareLabsScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified Raja Software Labs current openings page/i,
  )
})
