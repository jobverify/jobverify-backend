import assert from 'node:assert/strict'
import test from 'node:test'

import { FIRST_PARTY_ROOT_URL, createMelorraScraper, hasVerifiedOfficialSurface } from './script.js'

const homepageHtml = '<title>Melorra - Everyday Fine Jewellery</title><h1>Melorra</h1>'

test('official surface helper requires Melorra branding and no public job signal', () => {
  assert.equal(hasVerifiedOfficialSurface(homepageHtml), true)
  assert.equal(hasVerifiedOfficialSurface('<title>Melorra Careers</title>'), false)
  assert.equal(hasVerifiedOfficialSurface('<title>Other store</title>'), false)
})

test('run returns no jobs for the verified no-public-careers surface', async () => {
  const jobs = await createMelorraScraper().run()
  assert.deepEqual(jobs, [])
  assert.equal(FIRST_PARTY_ROOT_URL, 'https://www.melorra.com/')
})
