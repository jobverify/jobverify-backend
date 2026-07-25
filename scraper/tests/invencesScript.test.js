import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  './fixtures/invences',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const homepageHtml = readFixture('homepage.html')
const careerHtml = readFixture('career.html')

const loadInvencesModule = async () => {
  try {
    return await import('../invences/script.js')
  } catch {
    assert.fail('Expected Invences scraper module at ../invences/script.js')
  }
}

test('Invences validates the official homepage and career table before extracting jobs', async () => {
  const invences = await loadInvencesModule()

  assert.equal(invences.HOMEPAGE_URL, 'https://invences.com/')
  assert.equal(invences.CAREERS_URL, 'https://invences.com/career')
  assert.equal(invences.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(invences.hasOfficialCareersSignal(careerHtml), true)

  assert.deepEqual(invences.extractJobs(careerHtml), [
    {
      title: 'Systems Engineer',
      company: 'Invences Inc.',
      department: null,
      location: 'Dallas, TX',
      city: 'Dallas',
      state: 'TX',
      country: 'United States',
      jobId: 'invences-systems-engineer-2025-12-01',
      requisitionId: 'invences-systems-engineer-2025-12-01',
      sourceUrl: 'https://invences.com/careers/Systems-Engineer-2025-12-01',
      applyUrl: 'https://invences.com/careers/Systems-Engineer-2025-12-01',
      employmentType: 'Remote',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-12-18',
      closingDate: null,
      jobDescription: 'Official Invences Inc. opening for Systems Engineer in Dallas, TX.',
    },
    {
      title: 'Cloud Engineer',
      company: 'Invences Inc.',
      department: null,
      location: 'Dallas, TX',
      city: 'Dallas',
      state: 'TX',
      country: 'United States',
      jobId: 'invences-cloud-engineer',
      requisitionId: 'invences-cloud-engineer',
      sourceUrl: 'https://invences.com/careers/Cloud-Engineer',
      applyUrl: 'https://invences.com/careers/Cloud-Engineer',
      employmentType: 'On-site',
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: '2025-12-17',
      closingDate: null,
      jobDescription: 'Official Invences Inc. opening for Cloud Engineer in Dallas, TX.',
    },
  ])
})

test('Invences scraper fetches the verified homepage and careers page and decorates extracted jobs', async () => {
  const invences = await loadInvencesModule()
  const requestedUrls = []

  const jobs = await invences.createInvencesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === invences.HOMEPAGE_URL) return homepageHtml
      if (url === invences.CAREERS_URL) return careerHtml

      throw new Error(`Unexpected fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    invences.HOMEPAGE_URL,
    invences.CAREERS_URL,
  ])
  assert.equal(jobs.length, 2)
  assert.equal(jobs[0].source, 'invences')
  assert.equal(jobs[0].company, 'Invences Inc.')
  assert.equal(jobs[0].link, jobs[0].sourceUrl)
  assert.equal(typeof jobs[0].scrapedAt, 'string')
})

test('Invences scraper fails closed when the verified careers table contract changes', async () => {
  const invences = await loadInvencesModule()

  await assert.rejects(
    invences.createInvencesScraper().run({
      fetchText: async (url) => {
        if (url === invences.HOMEPAGE_URL) return homepageHtml

        return `
          <html>
            <head><title>Invences - Career</title></head>
            <body>
              <h2>Join our team</h2>
              <p>No openings today.</p>
            </body>
          </html>
        `
      },
    }),
    /verified careers surface/i,
  )
})
