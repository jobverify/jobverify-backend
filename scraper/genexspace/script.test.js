import assert from 'node:assert/strict'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const homepageHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Genex Space</title>
    </head>
    <body>
      <main>
        <h1>Genex Space</h1>
        <p>SpaceShaala is a Genex Space initiative for hands-on space education.</p>
        <p>info@genex.space</p>
        <p>Bengaluru, Karnataka, India</p>
        <a href="https://genex.space/gsef/">Apply</a>
      </main>
    </body>
  </html>
`

const fellowshipHtml = `
  <!doctype html>
  <html lang="en">
    <head>
      <title>Genex Space Explorers Fellowship</title>
    </head>
    <body>
      <main>
        <h1>Genex Space Explorers Fellowship</h1>
        <p>Indian nationals can apply to become full-time Fellows.</p>
        <p>This is a two-year commitment with a monthly stipend.</p>
        <p>Teaching locations may be in any city where Genex operates.</p>
        <form action="/gsef/apply" enctype="multipart/form-data">
          <input type="file" name="resume" />
          <button type="submit">Apply Now</button>
        </form>
      </main>
    </body>
  </html>
`

test('Genex Space validates the official homepage and fellowship page and extracts the single public opening', async () => {
  const genex = await loadModule()
  assert.ok(genex, 'Genex Space scraper module should load')

  assert.equal(genex.SOURCE, 'genexspace')
  assert.equal(genex.COMPANY, 'Genex Space')
  assert.equal(genex.HOMEPAGE_URL, 'https://genex.space/')
  assert.equal(genex.FELLOWSHIP_URL, 'https://genex.space/gsef/')
  assert.equal(genex.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(genex.hasOfficialFellowshipSignal(fellowshipHtml), true)
  assert.deepEqual(genex.extractPublicJobs(fellowshipHtml), [{
    title: 'Genex Space Explorers Fellowship',
    company: 'Genex Space',
    department: 'Fellowship',
    location: 'India',
    city: null,
    country: 'India',
    jobId: 'genexspace-genex-space-explorers-fellowship',
    requisitionId: 'genexspace-gsef',
    sourceUrl: 'https://genex.space/gsef/',
    applyUrl: 'https://genex.space/gsef/',
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: 'Join the Genex Space Explorers Fellowship for Indian nationals as a full-time two-year fellowship with a stipend and first-party resume-upload application.',
    remoteStatus: null,
  }])
})

test('Genex Space run decorates the verified fellowship opening', async () => {
  const genex = await loadModule()
  assert.ok(genex, 'Genex Space scraper module should load')

  const requestedUrls = []
  const jobs = await genex.createGenexSpaceScraper({
    now: () => '2026-07-12T14:00:00.000Z',
  }).run({
    fetchText: async (url) => {
      requestedUrls.push(url)
      if (url === genex.HOMEPAGE_URL) return homepageHtml
      if (url === genex.FELLOWSHIP_URL) return fellowshipHtml
      throw new Error(`Unexpected Genex Space URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    'https://genex.space/',
    'https://genex.space/gsef/',
  ])
  assert.equal(jobs.length, 1)
  assert.deepEqual(
    {
      title: jobs[0].title,
      source: jobs[0].source,
      company: jobs[0].company,
      link: jobs[0].link,
      scrapedAt: jobs[0].scrapedAt,
    },
    {
      title: 'Genex Space Explorers Fellowship',
      source: 'genexspace',
      company: 'Genex Space',
      link: 'https://genex.space/gsef/',
      scrapedAt: '2026-07-12T14:00:00.000Z',
    },
  )
})

test('Genex Space fails closed when the verified homepage or fellowship page changes materially', async () => {
  const genex = await loadModule()
  assert.ok(genex, 'Genex Space scraper module should load')

  await assert.rejects(
    genex.createGenexSpaceScraper().run({
      fetchText: async () => '<html><body><h1>Unexpected homepage</h1></body></html>',
    }),
    /verified official homepage/i,
  )

  await assert.rejects(
    genex.createGenexSpaceScraper().run({
      fetchText: async (url) => {
        if (url === genex.HOMEPAGE_URL) return homepageHtml
        return '<html><body><h1>Unexpected program page</h1></body></html>'
      },
    }),
    /verified official fellowship page/i,
  )
})
