import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'innspark',
)

const readFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const careersHtml = readFixture('careers.html')
const applyHtml = readFixture('apply.html')

const loadModule = async () => {
  try {
    return await import('../../scraper/innspark/script.js')
  } catch {
    assert.fail('Expected Innspark scraper module at ../../scraper/innspark/script.js')
  }
}

test('Innspark helpers recognize the verified careers and apply surfaces', async () => {
  const innspark = await loadModule()

  assert.equal(innspark.SOURCE, 'innspark')
  assert.equal(innspark.COMPANY, 'Innspark')
  assert.equal(innspark.CAREERS_URL, 'https://innspark.in/careers/')
  assert.equal(innspark.APPLY_URL, 'https://innspark.in/apply/')
  assert.equal(innspark.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(innspark.hasOfficialApplySignal(applyHtml), true)
  assert.equal(innspark.extractCareerJobs(careersHtml).length, 11)
  assert.deepEqual(innspark.extractCareerJobs(careersHtml).slice(0, 4).map((job) => job.title), [
    'Embedded Systems Engineer (Drone / UAS development)',
    'C++ Engineer Qt-based Application Development (Drone / UAS development)',
    'Computer Vision Engineer (Drone / UAS development)',
    'SOC Analyst (L1 / L2)',
  ])
})

test('Innspark run falls back to browser-backed fetches when the origin breaks HTTP parsing', async () => {
  const innspark = await loadModule()
  const browserRequestedUrls = []

  const jobs = await innspark.createInnsparkScraper().run({
    fetchText: async () => {
      throw new Error('fetch failed | Response does not match the HTTP/1.1 protocol (Missing expected CR after header value)')
    },
    fetchBrowserText: async (url) => {
      browserRequestedUrls.push(url)
      if (url === innspark.CAREERS_URL) return careersHtml
      if (url === innspark.APPLY_URL) return applyHtml
      throw new Error(`Unexpected Innspark URL: ${url}`)
    },
  })

  assert.deepEqual(browserRequestedUrls, [
    innspark.CAREERS_URL,
    innspark.APPLY_URL,
  ])
  assert.equal(jobs.length, 11)
  assert.equal(jobs[0].source, 'innspark')
  assert.equal(jobs[0].link, innspark.APPLY_URL)
})
