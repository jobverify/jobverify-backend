import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../../scraper-support/providers/index.js'

test('Peer Robotics is registered against the verified first-party about-page hiring handoff', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'peerrobotics')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Peer Robotics')
  assert.equal(provider.companyCareerPage, 'https://peerrobotics.ai/about')
  assert.equal(provider.atsPlatform, 'wellfound')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-about-hiring-handoff-plus-challenge-gated-board')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-about-hiring-handoff+verified-wellfound-challenge-gate-return-empty',
  )
  assert.equal(provider.companyDomain, 'peerrobotics.ai')
  assert.equal(provider.verifiedOn, '2026-08-07')
  assert.equal(provider.verifiedPublicJobCount, 0)
  assert.equal(provider.verifiedIndiaJobCount, 0)
  assert.match(provider.verifiedSurfaceSummary, /Friday, August 7, 2026/i)
  assert.match(provider.verifiedSurfaceSummary, /Cloudflare/i)
  assert.match(provider.modulePath, /peerrobotics[\\/]script\.js$/i)
})

test('Peer Robotics is runnable through the scraper provider catalog', () => {
  const scraper = buildScrapers().find((item) => item.name === 'peerrobotics')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'peerrobotics')
  assert.match(scraper.dryRunFile, /peerrobotics[\\/]jobs\.json$/i)
})
