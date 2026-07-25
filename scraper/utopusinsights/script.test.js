import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const loadModule = async () => {
  try {
    return await import('./script.js')
  } catch {
    return null
  }
}

const readFixture = (name) => readFileSync(new URL(`../tests/fixtures/${name}`, import.meta.url), 'utf8')

const careersHtml = readFixture('utopusinsights-careers.html')
const openingsHtml = readFixture('utopusinsights-open-positions.html')
const bambooHrEmbedHtml = readFixture('utopusinsights-bamboohr-embed.html')

test('Utopus Insights keeps the verified official careers and BambooHR empty-state URLs', async () => {
  const utopus = await loadModule()
  assert.ok(utopus, 'Expected scraper module at ./script.js')

  assert.equal(utopus.COMPANY, 'Utopus Insights')
  assert.equal(utopus.SOURCE, 'utopusinsights')
  assert.equal(utopus.CAREERS_URL, 'https://www.utopusinsights.com/careers')
  assert.equal(utopus.OPEN_POSITIONS_URL, 'https://www.utopusinsights.com/open-positions')
  assert.equal(
    utopus.BAMBOOHR_EMBED_URL,
    'https://utopusinsights.bamboohr.com/jobs/embed2.php?version=1.0.0',
  )
})

test('Utopus Insights verifies the official careers shell, BambooHR handoff, and current no-openings state', async () => {
  const utopus = await loadModule()
  assert.ok(utopus, 'Expected scraper module at ./script.js')

  assert.equal(utopus.hasOfficialCareersSignal(careersHtml), true)
  assert.equal(utopus.hasOfficialOpenPositionsSignal(openingsHtml), true)
  assert.equal(utopus.hasBambooHrHandoff(openingsHtml), true)
  assert.equal(utopus.hasEmptyOpeningsSignal(bambooHrEmbedHtml), true)
})

test('Utopus Insights zero-openings scraper validates the official surface and returns no jobs', async () => {
  const utopus = await loadModule()
  assert.ok(utopus, 'Expected scraper module at ./script.js')

  const requestedUrls = []
  const jobs = await utopus.run({
    fetchText: async (url) => {
      requestedUrls.push(url)

      if (url === utopus.CAREERS_URL) return careersHtml
      if (url === utopus.OPEN_POSITIONS_URL) return openingsHtml
      if (url === utopus.BAMBOOHR_EMBED_URL) return bambooHrEmbedHtml

      throw new Error(`Unexpected Utopus fixture URL: ${url}`)
    },
  })

  assert.deepEqual(requestedUrls, [
    utopus.CAREERS_URL,
    utopus.OPEN_POSITIONS_URL,
    utopus.BAMBOOHR_EMBED_URL,
  ])
  assert.deepEqual(jobs, [])
})
