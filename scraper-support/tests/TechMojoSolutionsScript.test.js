import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T08:45:00.000Z'

const jobsHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>TechMojo Career Portal</h1>
    <h2>Open Positions</h2>
    <a href="https://jobs.techmojo.com/jobs/qHvPdv3CYTe8/java-developer-work-from-office">
      Java Developer (Work from Office)
      Hyderabad, Telangana
      Full Time
    </a>
    <a href="https://jobs.techmojo.com/jobs/LdW63p80hQdv/sre-lead">
      SRE Lead
      Hyderabad, Telangana
      Full Time
    </a>
    <a href="https://jobs.techmojo.com/jobs/QyvVmsDoUdwc/member-of-technical-staff-php-work-from-office">
      Member of Technical Staff(PHP) (Work from Office)
      Hyderabad, Telangana
      Full Time
    </a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../../scraper/techmojosolutions/script.js')
  } catch {
    assert.fail('Expected TechMojo Solutions scraper module at ../../scraper/techmojosolutions/script.js')
  }
}

test('TechMojo Solutions helpers stay pinned to the verified jobs portal shell', async () => {
  const techmojo = await loadModule()

  assert.equal(techmojo.SOURCE, 'techmojosolutions')
  assert.equal(techmojo.COMPANY, 'TechMojo Solutions')
  assert.equal(techmojo.CAREERS_URL, 'https://jobs.techmojo.com/jobs')
  assert.equal(techmojo.VERIFIED_ON, '2026-07-18')
  assert.equal(techmojo.hasOfficialJobsPortalSignal(jobsHtml), true)
})

test('TechMojo Solutions run parses job cards from the first-party jobs portal', async () => {
  const techmojo = await loadModule()
  const jobs = await techmojo.createTechMojoSolutionsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      assert.equal(url, techmojo.CAREERS_URL)
      return jobsHtml
    },
  })

  assert.equal(jobs.length, 3)
  assert.equal(jobs[0].title, 'Java Developer (Work from Office)')
  assert.equal(jobs[0].location, 'Hyderabad, Telangana, India')
  assert.equal(jobs[0].employmentType, 'Full Time')
  assert.equal(jobs[0].scrapedAt, FIXED_SCRAPED_AT)
  assert.equal(jobs[1].title, 'SRE Lead')
})

test('TechMojo Solutions fails closed when the trusted jobs portal shell changes materially', async () => {
  const techmojo = await loadModule()

  await assert.rejects(
    techmojo.createTechMojoSolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Jobs</h1></body></html>',
    }),
    /verified TechMojo Solutions jobs portal/i,
  )
})
