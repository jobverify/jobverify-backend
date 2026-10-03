import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import * as scraper from './script.js'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
const fixture = name => readFileSync(new URL('./fixtures/' + name, import.meta.url), 'utf8')
test('Persevex replacement homepage retains verified company identity', () => {
  assert.equal(scraper.hasOfficialHomepageSignal(fixture('persevex-home.html')), true)
  assert.equal(scraper.hasOfficialHomepageSignal(fixture('persevex-home.html').replaceAll('support@persevex.com', 'support@example.org')), false)
})
test('Persevex preserves the current generic Remote role as unresolved geography', () => {
  const jobs = scraper.extractPublicJobs(fixture('current-careers.html'), fixture('persevex-careers-client.js'))
  assert.equal(jobs.length, 5)
  assert.ok(jobs.every(job => job.jobId !== 'social-intern' && job.sourceListingComplete === false))
  const evidence = readInventoryEvidence(jobs)
  assert.equal(evidence.unverifiedGeographyCount, 1)
  assert.deepEqual(evidence.unresolvedRoles, [{ id: 'social-intern', title: 'Social Media & Marketing Intern', location: 'Remote' }])
})
