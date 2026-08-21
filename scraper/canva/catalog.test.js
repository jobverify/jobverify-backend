import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('Canva provider metadata captures the verified blocked first-party jobs state', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'canva')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Canva')
  assert.equal(provider.companyCareerPage, 'https://www.lifeatcanva.com/en/jobs/')
  assert.equal(provider.atsPlatform, 'official-first-party-jobs-board')
  assert.equal(provider.companyDomain, 'lifeatcanva.com')
  assert.equal(provider.verifiedOn, '2026-08-14')
  assert.match(provider.extractionStrategy, /verified-cloudflare-challenge-empty/i)
  assert.match(provider.verifiedSurfaceSummary, /Just a moment/i)
})

test('Canva is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'canva')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.match(scraper.dryRunFile, /canva[\\/]jobs\.json$/)
})
