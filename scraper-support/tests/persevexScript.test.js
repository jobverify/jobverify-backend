import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'
const loadPersevexModule = () => import('../../scraper/persevex/script.js')
const fixture = name => readFileSync(new URL('../../scraper/persevex/fixtures/' + name, import.meta.url), 'utf8')
const home = fixture('current-home.html'), careers = fixture('current-careers.html'), client = fixture('persevex-careers-client.js')

test('Persevex validates published role details, marks partial India coverage and preserves unresolved geography', async () => {
  const source = await loadPersevexModule()
  assert.equal(source.SOURCE, 'persevex')
  assert.equal(source.hasOfficialHomepageSignal(home), true)
  assert.equal(source.hasOfficialCareersSignal(careers), true)
  const jobs = source.extractPublicJobs(careers, client)
  assert.equal(jobs.length, 5)
  assert.ok(jobs.every(job => job.publicExperienceChecked === true && job.sourceListingComplete === false && job.country === 'India'))
  assert.deepEqual(new Set(jobs.map(job => job.requisitionId)), new Set(['fe-dev', 'content-lead', 'placement-exec', 'hr-exec', 'bd-exec']))
  const frontend = jobs.find(job => job.jobId === 'fe-dev')
  assert.match(frontend.jobDescription, /^Build and maintain the Persevex web platform/)
  assert.match(frontend.jobDescription, /Eye for detail and animation/)
  assert.equal(readInventoryEvidence(jobs).status, 'coverage-gap')
  assert.equal(readInventoryEvidence(jobs).reportedTotal, 6)
  assert.equal(readInventoryEvidence(jobs).indiaFacetCount, 5)
  assert.match(readInventoryEvidence(jobs).reason, /social-intern.*Remote/)
  assert.throws(() => source.extractPublicJobs(careers), /published.*client/i)
})

test('Persevex run decorates exact jobs while retaining inventory evidence and incomplete-listing flags', async () => {
  const source = await loadPersevexModule()
  const clientUrl = source.extractPublishedClientUrl(careers)
  const pages = new Map([[source.HOMEPAGE_URL, home], [source.CAREERS_URL, careers], [clientUrl, client]])
  const requested = []
  const jobs = await source.run({ fetchPage: async url => {
    requested.push(url)
    assert.ok(pages.has(url), 'Unexpected Persevex URL')
    return { status: 200, url, html: pages.get(url) }
  } })
  assert.deepEqual(requested, [source.HOMEPAGE_URL, source.CAREERS_URL, clientUrl])
  assert.equal(jobs.length, 5)
  assert.equal(jobs[0].source, source.SOURCE)
  assert.equal(jobs[0].companyCareerPage, source.CAREERS_URL)
  assert.ok(jobs.every(job => typeof job.scrapedAt === 'string' && job.sourceListingComplete === false))
  assert.equal(readInventoryEvidence(jobs).pagesFetched, 3)
  await assert.rejects(source.run({ fetchPage: async url => ({ status: 200, url: 'https://unrelated.example/', html: home }) }), /URL.*identity/i)
})
