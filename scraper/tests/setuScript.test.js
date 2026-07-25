import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T00:00:00.000Z'

const staticCareersHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Careers at Setu | Join Our Fintech Team</title>
  </head>
  <body>
    <main>
      <h1>Come tackle India's toughest fintech problems with an exceptional set of people.</h1>
      <p>We are completely overhauling our country's dated fintech architecture.</p>
      <h2>Current openings</h2>
      <p>Fetching open roles...</p>
      <footer>© 2026 BrokenTusk Technologies Pvt. Ltd</footer>
    </main>
  </body>
</html>
`

const renderedCareersHtml = `
<!doctype html>
<html lang="en">
  <body>
    <main>
      <h2>Current openings</h2>
      <h3>Build core infrastructure to enable payments to businesses.</h3>
      <article class="opening">
        <h4>SDE - II Fullstack Engineer</h4>
        <button>Apply ↗</button>
      </article>
      <article class="opening">
        <h4>SDE - II Backend Engineer</h4>
        <button>Apply ↗</button>
      </article>
    </main>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../setu/script.js')
  } catch {
    assert.fail('Expected Setu scraper module at ../setu/script.js')
  }
}

test('Setu helpers stay pinned to the verified official careers shell and browser-rendered openings contract', async () => {
  const setu = await loadModule()

  assert.equal(setu.SOURCE, 'setu')
  assert.equal(setu.COMPANY_NAME, 'Setu')
  assert.equal(setu.OFFICIAL_BRAND_NAME, 'BrokenTusk Technologies Pvt. Ltd.')
  assert.equal(setu.VERIFIED_ON, '2026-07-17')
  assert.equal(setu.CAREERS_URL, 'https://setu.co/careers/')
  assert.equal(setu.hasOfficialCareersSignal(staticCareersHtml), true)
  assert.equal(setu.hasPlaceholderOpeningsSignal(staticCareersHtml), true)
  assert.equal(setu.hasRenderableOpeningsSignal(renderedCareersHtml), true)
  assert.equal(
    setu.hasRenderableOpeningsSignal(renderedCareersHtml.replace('SDE - II Backend Engineer', 'Backend Engineer')),
    false,
  )

  assert.deepEqual(setu.extractRenderedOpenings(renderedCareersHtml), [
    {
      slug: 'sde-ii-fullstack-engineer',
      title: 'SDE - II Fullstack Engineer',
      location: 'India',
      city: null,
      country: 'India',
      sourceUrl: 'https://setu.co/careers/#sde-ii-fullstack-engineer',
      applyUrl: 'https://setu.co/careers/#sde-ii-fullstack-engineer',
      jobDescription: 'Build core infrastructure to enable payments to businesses.',
    },
    {
      slug: 'sde-ii-backend-engineer',
      title: 'SDE - II Backend Engineer',
      location: 'India',
      city: null,
      country: 'India',
      sourceUrl: 'https://setu.co/careers/#sde-ii-backend-engineer',
      applyUrl: 'https://setu.co/careers/#sde-ii-backend-engineer',
      jobDescription: 'Build core infrastructure to enable payments to businesses.',
    },
  ])
})

test('Setu run validates the official careers page and uses the rendered openings contract when static HTML is still a placeholder', async () => {
  const setu = await loadModule()
  const requestedTexts = []
  const requestedRenderedUrls = []

  const jobs = await setu.createSetuScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedTexts.push(url)
      return staticCareersHtml
    },
    renderCareersPage: async (url) => {
      requestedRenderedUrls.push(url)
      return renderedCareersHtml
    },
  })

  assert.deepEqual(requestedTexts, [setu.CAREERS_URL])
  assert.deepEqual(requestedRenderedUrls, [setu.CAREERS_URL])
  assert.equal(jobs.length, 2)
  assert.deepEqual(jobs[0], {
    title: 'SDE - II Fullstack Engineer',
    company: 'Setu',
    department: null,
    location: 'India',
    city: null,
    country: 'India',
    jobId: 'sde-ii-fullstack-engineer',
    requisitionId: null,
    sourceUrl: 'https://setu.co/careers/#sde-ii-fullstack-engineer',
    applyUrl: 'https://setu.co/careers/#sde-ii-fullstack-engineer',
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Build core infrastructure to enable payments to businesses.',
    source: 'setu',
    link: 'https://setu.co/careers/#sde-ii-fullstack-engineer',
    scrapedAt: FIXED_SCRAPED_AT,
  })
  assert.equal(jobs[1].title, 'SDE - II Backend Engineer')
})

test('Setu fails closed when the official careers shell or rendered openings drift materially', async () => {
  const setu = await loadModule()

  await assert.rejects(
    setu.createSetuScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected</h1></body></html>',
      renderCareersPage: async () => renderedCareersHtml,
    }),
    /verified setu careers page/i,
  )

  await assert.rejects(
    setu.createSetuScraper().run({
      fetchText: async () => staticCareersHtml,
      renderCareersPage: async () => '<html><body><p>Fetching open roles...</p></body></html>',
    }),
    /rendered setu openings/i,
  )
})
