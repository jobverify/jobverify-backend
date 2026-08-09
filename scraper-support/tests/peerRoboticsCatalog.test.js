import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScrapers, getScraperCatalog } from '../providers/index.js'

test('getScraperCatalog includes Peer Robotics as a verified Wellfound handoff provider', () => {
  const provider = getScraperCatalog().find((item) => item.source === 'peerrobotics')

  assert.ok(provider)
  assert.equal(provider.companyName, 'Peer Robotics')
  assert.equal(provider.adapter, 'script')
  assert.equal(provider.atsPlatform, 'wellfound')
  assert.equal(provider.companyCareerPage, 'https://peerrobotics.ai/about')
  assert.equal(provider.companyDomain, 'peerrobotics.ai')
  assert.equal(provider.countryFilter, 'India')
  assert.equal(provider.paginationStrategy, 'first-party-about-hiring-handoff-plus-challenge-gated-board')
  assert.equal(
    provider.extractionStrategy,
    'verified-homepage+verified-about-hiring-handoff+verified-wellfound-challenge-gate-return-empty',
  )
  assert.equal(provider.parser, 'custom-script')
  assert.match(provider.modulePath, /peerrobotics[\\/]script\.js$/i)
})

test('buildScrapers exposes a runnable Peer Robotics lane without changing the runner contract', () => {
  const scraper = buildScrapers().find((item) => item.name === 'peerrobotics')

  assert.ok(scraper)
  assert.equal(typeof scraper.run, 'function')
  assert.equal(scraper.provider.source, 'peerrobotics')
  assert.equal(scraper.provider.atsPlatform, 'wellfound')
  assert.match(scraper.dryRunFile, /peerrobotics[\\/]jobs\.json$/i)
})
