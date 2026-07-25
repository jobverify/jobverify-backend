import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

const fixturesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../manastuspace/fixtures',
)

const readHtmlFixture = (name) => readFileSync(path.join(fixturesDir, name), 'utf8')

const verifiedHomepageHtml = readHtmlFixture('homepage.html')
const verifiedCareersHtml = readHtmlFixture('careers.html')

const loadManastuSpaceModule = async () => {
  try {
    return await import('../manastuspace/script.js')
  } catch {
    assert.fail('Expected Manastu Space scraper module at ../manastuspace/script.js')
  }
}

test('Manastu Space scraper validates the verified homepage and current careers surface', async () => {
  const manastu = await loadManastuSpaceModule()

  assert.equal(manastu.SOURCE, 'manastuspace')
  assert.equal(manastu.COMPANY, 'Manastu Space')
  assert.equal(manastu.HOMEPAGE_URL, 'https://manastuspace.com/')
  assert.equal(manastu.CAREERS_URL, 'https://manastuspace.com/careers')
  assert.equal(manastu.hasOfficialHomepageSignal(verifiedHomepageHtml), true)
  assert.equal(manastu.hasOfficialCareersSignal(verifiedCareersHtml), true)
  assert.ok(manastu.extractPublicJobs(verifiedCareersHtml).length > 0)
})

test('Manastu Space provider is registered in the scraper catalog', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'manastuspace')
  const scraper = buildScrapers().find((item) => item.name === 'manastuspace')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Manastu Space')
  assert.equal(provider.companyCareerPage, 'https://manastuspace.com/careers')
  assert.equal(provider.companyDomain, 'manastuspace.com')
  assert.equal(provider.adapter, 'script')
  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
})
