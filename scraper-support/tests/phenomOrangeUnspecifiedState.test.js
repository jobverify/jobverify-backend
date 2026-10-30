import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { createPhenomScraper } from '../phenom/engine.js'

const fixture = JSON.parse(readFileSync(new URL('./fixtures/phenom/orange-unspecified-state-20261029.json', import.meta.url), 'utf8'))
const replay = (nativeUnspecifiedState, mutate = () => {}) => {
  const samples = structuredClone(fixture.samples)
  mutate(samples)
  const scraper = createPhenomScraper({ source: 'orangebusiness', companyName: 'Orange Business',
    baseUrl: 'https://orange.jobs', searchPath: '/gb/en/search-results', nativeUnspecifiedState,
    scraperDir: fileURLToPath(new URL('.', import.meta.url)) })
  return scraper.run({ fetchText: async url => {
    if (url.endsWith('/search-results')) return '<script>phApp.ddo = ' + JSON.stringify({ eagerLoadRefineSearch: {
      status: 200, totalHits: samples.length, hits: samples.length,
      data: { jobs: samples.map(sample => sample.listing), aggregations: [{ field: 'country', value: { INDIA: samples.length } }] },
    } }) + '</script>'
    const sample = samples.find(sample => sample.url === url)
    assert.ok(sample, 'Fetch only an advertised Orange role')
    return '<link rel="canonical" href="' + sample.url + '"><script>phApp.ddo = '
      + JSON.stringify({ jobDetail: { status: 200, data: { job: sample.detail } } }) + '</script>'
      + '<script type="application/ld+json">' + JSON.stringify(sample.posting) + '</script>'
  } })
}

test('captured Orange city/country offices accept their corroborated absent-state marker', async () => {
  const jobs = await replay(true)
  assert.equal(jobs.length, 3)
  assert.ok(jobs.every(job => job.sourceDetailComplete === true))
  assert.ok(jobs.every(job => job.jobDescription.length > 1000))
  assert.ok(jobs.every(job => job.country === 'India'))
})

test('other Phenom sources retain the strict state checks unless the adapter opts in', async () => {
  const jobs = await replay(false)
  assert.ok(jobs.every(job => job.sourceDetailComplete === false))
})

for (const [name, mutate] of [
  ['different role identity', samples => { samples[0].detail.reqId = 'unrelated-role' }],
  ['contradictory real state', samples => { samples[0].detail.multi_location[0].state = 'California' }],
  ['contradictory office country', samples => { samples[0].detail.multi_location[0].country = 'United States' }],
  ['missing state-country corroboration', samples => { delete samples[0].detail.multi_location[0].stateCountry }],
  ['contradictory schema country', samples => { samples[0].posting.jobLocation[0].address.addressCountry = 'United States' }],
]) test('Orange absent-state support still rejects ' + name, async () => {
  const jobs = await replay(true, mutate)
  assert.equal(jobs[0].sourceDetailComplete, false)
  assert.equal(jobs[0].sourceDetailFailureKind, 'identity-mismatch')
  assert.equal(jobs[0].jobDescription, null)
  assert.ok(jobs.slice(1).every(job => job.sourceDetailComplete === true))
})
