import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    assert.fail('Expected SuryaLogix scraper module at ./script.js')
  }
}

const readFixture = (name) =>
  fs.readFileSync(path.join(currentDir, 'fixtures', name), 'utf8')

const homepageHtml = readFixture('homepage.html')
const careersHtml = readFixture('careers.html')

test('SuryaLogix pins the verified first-party homepage and resume-submission careers surface', async () => {
  const suryalogix = await loadModule()

  assert.equal(suryalogix.SOURCE, 'suryalogix')
  assert.equal(suryalogix.COMPANY, 'SuryaLogix')
  assert.equal(suryalogix.HOMEPAGE_URL, 'https://suryalogix.com/')
  assert.equal(suryalogix.CAREERS_URL, 'https://suryalogix.com/career-opportunities/')
  assert.equal(suryalogix.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(suryalogix.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(suryalogix.hasApplicationFormSurface(careersHtml), true)
  assert.equal(suryalogix.hasUnexpectedPublicJobsSignal(careersHtml), false)
  assert.equal(
    suryalogix.hasUnexpectedPublicJobsSignal(
      `${careersHtml}<section><h2>Current Openings</h2><a href="/jobs/firmware-engineer">View Details</a></section>`,
    ),
    true,
  )
})

test('SuryaLogix returns no jobs while the verified first-party careers page stays a non-listing application form', async () => {
  const suryalogix = await loadModule()
  const requestedUrls = []

  const jobs = await suryalogix.createSuryaLogixScraper().run({
    fetchPage: async (url) => {
      requestedUrls.push(url)

      if (url === suryalogix.HOMEPAGE_URL) {
        return { status: 200, url, html: homepageHtml }
      }

      if (url === suryalogix.CAREERS_URL) {
        return { status: 200, url, html: careersHtml }
      }

      throw new Error(`Unexpected SuryaLogix fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    suryalogix.HOMEPAGE_URL,
    suryalogix.CAREERS_URL,
  ])
  assert.deepEqual(jobs, [])
})

test('SuryaLogix fails closed when the homepage, careers copy, or non-listing contract drifts', async () => {
  const suryalogix = await loadModule()

  await assert.rejects(
    suryalogix.createSuryaLogixScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: url === suryalogix.HOMEPAGE_URL
          ? '<html><head><title>Unexpected</title></head><body>Placeholder</body></html>'
          : careersHtml,
      }),
    }),
    /official homepage/i,
  )

  await assert.rejects(
    suryalogix.createSuryaLogixScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: url === suryalogix.HOMEPAGE_URL
          ? homepageHtml
          : careersHtml.replace('Application Form', 'Talent Community'),
      }),
    }),
    /official careers page|application form/i,
  )

  await assert.rejects(
    suryalogix.createSuryaLogixScraper().run({
      fetchPage: async (url) => ({
        status: 200,
        url,
        html: url === suryalogix.HOMEPAGE_URL
          ? homepageHtml
          : `${careersHtml}<section><h2>Open Positions</h2><a href="https://jobs.lever.co/suryalogix">Apply</a></section>`,
      }),
    }),
    /public jobs|non-listing/i,
  )
})
