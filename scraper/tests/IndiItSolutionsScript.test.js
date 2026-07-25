import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-18T00:00:00.000Z'

const careersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Career</title>
  </head>
  <body>
    <main>
      <h1>Join Our Vibrant Team at Indi IT.</h1>
      <p>View Open Roles</p>
      <p>Excited to be part of our journey? Send your resume and cover letter to hr@indiit.com.</p>
      <section>
        <h2>Top Opportunities Right Now.</h2>
        <article class="indi-role-card">
          <h3>Marketing Analyst</h3>
          <p class="experience">Minimum 2 years of experience</p>
          <p class="vacancies">2 Vacancies</p>
          <a href="https://indiit.com/career/#marketing-analyst-2y">Apply Now</a>
        </article>
        <article class="indi-role-card">
          <h3>HR Specialist</h3>
          <p class="experience">Minimum 2 years of experience</p>
          <p class="vacancies">3 Vacancies</p>
          <a href="https://indiit.com/career/#hr-specialist">Apply Now</a>
        </article>
        <article class="indi-role-card">
          <h3>UI/UX Designer</h3>
          <p class="experience">Minimum 4 years of experience</p>
          <p class="vacancies">2 Vacancies</p>
          <a href="https://indiit.com/career/#ui-ux-designer">Apply Now</a>
        </article>
      </section>
    </main>
  </body>
</html>
`

const loadIndiModule = async () => {
  try {
    return await import('../indiitsolutions/script.js')
  } catch {
    assert.fail('Expected INDI IT SOLUTIONS scraper module at ../indiitsolutions/script.js')
  }
}

test('INDI IT SOLUTIONS extracts visible opportunity cards from the verified first-party career page', async () => {
  const indi = await loadIndiModule()

  assert.equal(indi.hasOfficialIndiItCareerSignals(careersHtml), true)
  assert.deepEqual(indi.extractOpportunityCards(careersHtml), [
    {
      title: 'Marketing Analyst',
      location: 'India',
      city: null,
      country: 'India',
      experienceRequired: 'Minimum 2 years of experience',
      vacancies: '2 Vacancies',
      applyUrl: 'https://indiit.com/career/#marketing-analyst-2y',
      sourceUrl: 'https://indiit.com/career/#marketing-analyst-2y',
      jobId: 'marketing-analyst-2y',
    },
    {
      title: 'HR Specialist',
      location: 'India',
      city: null,
      country: 'India',
      experienceRequired: 'Minimum 2 years of experience',
      vacancies: '3 Vacancies',
      applyUrl: 'https://indiit.com/career/#hr-specialist',
      sourceUrl: 'https://indiit.com/career/#hr-specialist',
      jobId: 'hr-specialist',
    },
    {
      title: 'UI/UX Designer',
      location: 'India',
      city: null,
      country: 'India',
      experienceRequired: 'Minimum 4 years of experience',
      vacancies: '2 Vacancies',
      applyUrl: 'https://indiit.com/career/#ui-ux-designer',
      sourceUrl: 'https://indiit.com/career/#ui-ux-designer',
      jobId: 'ui-ux-designer',
    },
  ])
})

test('INDI IT SOLUTIONS run returns structured jobs from the verified first-party career page', async () => {
  const indi = await loadIndiModule()
  const requestedUrls = []

  const jobs = await indi.createIndiItSolutionsScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      return careersHtml
    },
  })

  assert.deepEqual(requestedUrls, ['https://indiit.com/career/'])
  assert.equal(jobs.length, 3)
  assert.deepEqual(
    jobs.map((job) => [job.title, job.experienceRequired, job.country, job.source, job.scrapedAt]),
    [
      ['Marketing Analyst', 'Minimum 2 years of experience', 'India', 'indiitsolutions', FIXED_SCRAPED_AT],
      ['HR Specialist', 'Minimum 2 years of experience', 'India', 'indiitsolutions', FIXED_SCRAPED_AT],
      ['UI/UX Designer', 'Minimum 4 years of experience', 'India', 'indiitsolutions', FIXED_SCRAPED_AT],
    ],
  )
})

test('INDI IT SOLUTIONS fails closed when the verified career page no longer exposes the opportunity cards', async () => {
  const indi = await loadIndiModule()

  await assert.rejects(
    indi.createIndiItSolutionsScraper().run({
      fetchText: async () => '<html><body><h1>Career</h1></body></html>',
    }),
    /verified first-party career page/i,
  )
})
