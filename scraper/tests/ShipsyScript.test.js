import assert from 'node:assert/strict'
import test from 'node:test'

const FIXED_SCRAPED_AT = '2026-07-17T18:00:00.000Z'

const careersPageHtml = `
<!doctype html>
<html lang="en">
  <body>
    <h1>Come drive the future of logistics.</h1>
    <p>OPEN ROLES</p>
    <a href="/careers/director-engineering">Pillar Owner 5–8 yrs Director, Engineering Gurugram Read the role</a>
    <a href="/careers/software-engineer-core-platform">Generalist IC 2–4 yrs Software Engineer, Core Platform Gurugram Read the role</a>
    <a href="mailto:careers@shipsy.io">careers@shipsy.io</a>
  </body>
</html>
`

const directorEngineeringDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <a href="/careers">All open roles</a>
    <p>Core Engineering · Pillar Owner</p>
    <h1>Director, Engineering</h1>
    <p>Gurugram</p>
    <p>Team</p>
    <p>Core Engineering</p>
    <p>Experience</p>
    <p>5–8 years</p>
    <p>Employment</p>
    <p>Full-time</p>
    <p>About the role</p>
    <p>Own a pillar end-to-end, set the technical direction, pick the bets, and lead the engineers who ship with you.</p>
    <p>Show your interest</p>
    <p>Apply for Director, Engineering</p>
    <a href="mailto:careers@shipsy.io">careers@shipsy.io</a>
  </body>
</html>
`

const softwareEngineerDetailHtml = `
<!doctype html>
<html lang="en">
  <body>
    <a href="/careers">All open roles</a>
    <p>Core Engineering · Platform · Any pillar</p>
    <h1>Software Engineer, Core Platform</h1>
    <p>Gurugram</p>
    <p>Strong foundations. Generalist by design.</p>
    <p>Team</p>
    <p>Core Engineering</p>
    <p>Experience</p>
    <p>2–4 years</p>
    <p>Employment</p>
    <p>Full-time</p>
    <p>About the role</p>
    <p>Turn product and deployment signals into durable platform primitives.</p>
    <p>Show your interest</p>
    <p>Apply for Software Engineer, Core Platform</p>
    <a href="mailto:careers@shipsy.io">careers@shipsy.io</a>
  </body>
</html>
`

const loadModule = async () => {
  try {
    return await import('../shipsy/script.js')
  } catch {
    assert.fail('Expected Shipsy scraper module at ../shipsy/script.js')
  }
}

test('Shipsy helpers stay pinned to the verified first-party role links and detail pages', async () => {
  const shipsy = await loadModule()

  assert.equal(shipsy.SOURCE, 'shipsy')
  assert.equal(shipsy.COMPANY, 'Shipsy')
  assert.equal(shipsy.OFFICIAL_BRAND_NAME, 'Shipsy')
  assert.equal(shipsy.CAREERS_URL, 'https://www.shipsy.ai/careers')
  assert.equal(shipsy.VERIFIED_ON, '2026-07-17')
  assert.equal(shipsy.hasOfficialCareersSignal(careersPageHtml), true)
  assert.deepEqual(shipsy.extractRoleCards(careersPageHtml), [
    {
      title: 'Director, Engineering',
      detailUrl: 'https://www.shipsy.ai/careers/director-engineering',
    },
    {
      title: 'Software Engineer, Core Platform',
      detailUrl: 'https://www.shipsy.ai/careers/software-engineer-core-platform',
    },
  ])
  assert.deepEqual(
    shipsy.extractJobFromDetailHtml(softwareEngineerDetailHtml, {
      title: 'Software Engineer, Core Platform',
      detailUrl: 'https://www.shipsy.ai/careers/software-engineer-core-platform',
    }, {
      scrapedAt: FIXED_SCRAPED_AT,
    }),
    {
      title: 'Software Engineer, Core Platform',
      company: 'Shipsy',
      department: 'Core Engineering',
      location: 'Gurugram, India',
      city: 'Gurugram',
      country: 'India',
      jobId: 'software-engineer-core-platform',
      requisitionId: 'software-engineer-core-platform',
      sourceUrl: 'https://www.shipsy.ai/careers/software-engineer-core-platform',
      applyUrl: 'mailto:careers@shipsy.io',
      employmentType: 'Full-time',
      experienceRequired: '2–4 years',
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: ['Strong foundations. Generalist by design.'],
      postingDate: null,
      closingDate: null,
      jobDescription: 'Turn product and deployment signals into durable platform primitives.',
      remoteStatus: 'On-site',
      source: 'shipsy',
      link: 'https://www.shipsy.ai/careers/software-engineer-core-platform',
      scrapedAt: FIXED_SCRAPED_AT,
    },
  )
})

test('Shipsy run validates the careers page, follows role detail pages, and returns India-normalized jobs', async () => {
  const shipsy = await loadModule()
  const requestedUrls = []

  const jobs = await shipsy.createShipsyScraper({
    now: () => FIXED_SCRAPED_AT,
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === shipsy.CAREERS_URL) return careersPageHtml
      if (url === 'https://www.shipsy.ai/careers/director-engineering') return directorEngineeringDetailHtml
      if (url === 'https://www.shipsy.ai/careers/software-engineer-core-platform') return softwareEngineerDetailHtml

      throw new Error(`Unexpected Shipsy URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    shipsy.CAREERS_URL,
    'https://www.shipsy.ai/careers/director-engineering',
    'https://www.shipsy.ai/careers/software-engineer-core-platform',
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].title, 'Director, Engineering')
  assert.equal(jobs[1].title, 'Software Engineer, Core Platform')
})

test('Shipsy fails closed when the verified role links disappear from the careers page', async () => {
  const shipsy = await loadModule()

  await assert.rejects(
    shipsy.createShipsyScraper().run({
      fetchText: async () => '<html><body><h1>Careers</h1></body></html>',
    }),
    /verified Shipsy careers page/i,
  )
})
