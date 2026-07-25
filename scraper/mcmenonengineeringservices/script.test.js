import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.join(currentDir, 'fixtures')

const loadMcMenonModule = async () => import('./script.js')

const homepageHtml = fs.readFileSync(path.join(fixturesDir, 'homepage.html'), 'utf8')
const careersHtml = fs.readFileSync(path.join(fixturesDir, 'careers.html'), 'utf8')

test('McMenon Engineering Services recognizes the verified homepage and email-only careers page', async () => {
  const mcmenon = await loadMcMenonModule()

  assert.equal(mcmenon.SOURCE, 'mcmenonengineeringservices')
  assert.equal(mcmenon.COMPANY, 'McMenon Engineering Services Ltd.')
  assert.equal(mcmenon.HOMEPAGE_URL, 'https://www.mcmenon.com/')
  assert.equal(mcmenon.CAREERS_URL, 'https://www.mcmenon.com/careers/')
  assert.equal(mcmenon.hasOfficialHomepageSignal(homepageHtml), true)
  assert.equal(mcmenon.hasVerifiedCareersLink(homepageHtml), true)
  assert.equal(mcmenon.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(mcmenon.hasEmailOnlyCareersSignal(careersHtml), true)
  assert.equal(mcmenon.hasPublicJobsSignal(careersHtml), false)
})

test('McMenon Engineering Services returns no jobs from the verified first-party careers surface', async () => {
  const mcmenon = await loadMcMenonModule()
  const requestedUrls = []

  const jobs = await mcmenon.createMcMenonEngineeringServicesScraper().run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === mcmenon.HOMEPAGE_URL) {
        return homepageHtml
      }

      if (url === mcmenon.CAREERS_URL) {
        return careersHtml
      }

      throw new Error(`Unexpected URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [mcmenon.HOMEPAGE_URL, mcmenon.CAREERS_URL])
  assert.deepEqual(jobs, [])
})
