import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-08-05T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head><title>Talentsprint's Careers and Job Opportunities</title></head>
  <body>
    <main>
      <h1>Go Beyond the Ordinary</h1>
      <p>Let's build a future-proof, modern-day workforce together</p>
      <a href="https://talentsprint.darwinbox.in/ms/candidate/careers">View Job Openings</a>
    </main>
  </body>
</html>
`

const loadTalentSprintModule = async () => {
  try {
    return await import('../../scraper/talentsprint/script.js')
  } catch {
    assert.fail('Expected TalentSprint scraper module at ../../scraper/talentsprint/script.js')
  }
}

test('TalentSprint pins the verified first-party careers page and Darwinbox handoff', async () => {
  const talentsprint = await loadTalentSprintModule()

  assert.equal(talentsprint.SOURCE, 'talentsprint')
  assert.equal(talentsprint.COMPANY_NAME, 'TalentSprint')
  assert.equal(talentsprint.COMPANY_ID, 'main')
  assert.equal(talentsprint.VERIFIED_ON, '2026-08-05')
  assert.equal(talentsprint.OFFICIAL_SITE_URL, 'https://talentsprint.com/')
  assert.equal(talentsprint.CAREERS_PAGE_URL, 'https://talentsprint.com/careers/')
  assert.equal(talentsprint.DARWINBOX_ORIGIN, 'https://talentsprint.darwinbox.in')
  assert.equal(talentsprint.OFFICIAL_CAREERS_HANDOFF_URL, 'https://talentsprint.darwinbox.in/ms/candidate/careers')
  assert.equal(talentsprint.PUBLIC_ALL_JOBS_URL, 'https://talentsprint.darwinbox.in/ms/candidatev2/main/careers/allJobs')
  assert.equal(talentsprint.hasOfficialCareersHandoffSignal(careersHtml), true)
  assert.equal(talentsprint.extractDarwinboxHandoffUrl(careersHtml), talentsprint.OFFICIAL_CAREERS_HANDOFF_URL)
})

test('TalentSprint validates the first-party handoff and stays fail-closed while the Darwinbox listing API remains unavailable', async () => {
  const talentsprint = await loadTalentSprintModule()
  const requestedUrls = []
  const scraper = talentsprint.createTalentSprintScraper({
    now: () => FIXED_SCRAPED_AT,
  })

  const jobs = await scraper.run({
    maxPages: 1,
    maxJobs: 1,
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, [talentsprint.CAREERS_PAGE_URL])
  assert.deepEqual(jobs, [])
})

test('TalentSprint fails closed when its verified careers handoff changes', async () => {
  const talentsprint = await loadTalentSprintModule()

  await assert.rejects(
    talentsprint.createTalentSprintScraper().run({ fetchText: async () => '<h1>Unexpected</h1>' }),
    /verified talentsprint careers page/i,
  )

  await assert.rejects(
    talentsprint.createTalentSprintScraper().run({
      fetchText: async () => careersHtml.replace('https://talentsprint.darwinbox.in/ms/candidate/careers', 'https://example.com/jobs'),
    }),
    /darwinbox handoff/i,
  )
})
