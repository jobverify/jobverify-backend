import assert from 'node:assert/strict'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import { recruitmentBatchProviders } from '../scraper-support/utils/recruitmentBatch20261103.js'
import { getScraperCatalog, createCatalogScraper } from '../scraper-support/providers/index.js'
import { classifyProviderImplementation } from '../scripts/reportScriptCatalogTopology.js'
import { readInventoryEvidence } from '../scraper-support/utils/inventoryEvidence.js'
import { RECRUITMENT_OBSERVATIONS } from '../scraper-support/utils/verifiedRecruitment.js'

const batch = recruitmentBatchProviders()
const catalog = getScraperCatalog()
const bySource = new Map(catalog.map(provider => [provider.source, provider]))
const description = '<p>Build and operate production software systems, investigate service failures, review API designs and collaborate with the product engineering team on reliable delivery.</p>'

test('the additional batch has exactly 500 distinct current source registrations and no fabricated inventory counts', () => {
  assert.equal(batch.length, 500)
  assert.equal(new Set(batch.map(provider => provider.source)).size, 500)
  assert.equal(catalog.length, 4567)
  assert.equal(new Set(catalog.map(provider => provider.source)).size, catalog.length)
  for (const spec of batch) {
    const current = bySource.get(spec.source)
    assert.ok(current)
    assert.equal(classifyProviderImplementation(current).type, 'script', spec.source)
    assert.equal(current.parser, 'runtime-verified-recruitment', spec.source)
    assert.equal(current.companyName, spec.companyName, spec.source)
    assert.equal(current.zeroResultPolicy, 'evidence-required', spec.source)
    assert.equal(current.sourceScopeComplete, false, spec.source)
    assert.equal(current.verifiedPublicJobCount, null, spec.source)
    assert.equal(current.verifiedIndiaJobCount, null, spec.source)
  }
})

test('every registered source extracts controlled current India content through its production module and catalog', async t => {
  let unmocked = 0
  t.mock.method(globalThis, 'fetch', () => { unmocked++; assert.fail('Batch tests forbid uncontrolled HTTP') })
  for (const spec of batch) await t.test(spec.source, async () => {
    const current = bySource.get(spec.source)
    const module = await import(pathToFileURL(current.modulePath).href)
    assert.equal(module.SOURCE, spec.source)
    assert.equal(typeof module.run, 'function')
    const root = new URL(/(?:myworkdayjobs|smartrecruiters|ashbyhq|greenhouse|lever\.co|breezy\.hr|workable\.com)/i.test(spec.companyCareerPage)
      ? spec.officialHomepageUrl : spec.companyCareerPage)
    root.search = ''; root.hash = ''
    root.pathname = root.pathname.replace(/\/$/, '') + '/jobs/controlled-native-role'
    const roleURL = root.href
    const native = { '@type': 'JobPosting', title: 'Software Engineer', identifier: { value: spec.source + '-native-1' },
      url: roleURL, hiringOrganization: { name: spec.companyName }, description,
      jobLocation: { address: { addressCountry: 'IN', addressLocality: 'Bengaluru' } }, datePosted: '2026-10-30' }
    const readPages = []
    const jobs = await createCatalogScraper(current).run({ now: () => '2026-11-03T10:00:00Z', maxPages: 4,
      fetchPage: async url => {
        readPages.push(url)
        return { status: 200, url, html: url === roleURL
          ? '<h1>Software Engineer</h1>' + description + '<script type="application/ld+json">' + JSON.stringify(native) + '</script>'
          : '<h1>Careers</h1><a href="' + roleURL + '">Open job</a>' }
      },
      fetchJson: async url => url.includes('ashbyhq.com') ? { apiVersion: '1', jobs: [] }
        : url.includes('greenhouse.io') ? { jobs: [], meta: { total: 0 } }
          : url.includes('smartrecruiters.com') ? { totalFound: 0, content: [] }
            : url.includes('myworkdayjobs.com') ? { total: 0, jobPostings: [] } : [],
    })
    assert.ok(readPages.includes(roleURL), spec.source)
    assert.equal(jobs.length, 1, spec.source)
    assert.equal(jobs[0].company, spec.companyName)
    assert.equal(jobs[0].source, spec.source)
    assert.equal(jobs[0].country, 'India')
    assert.equal(jobs[0].jobDescription, description)
    assert.equal(jobs[0].postingDate, '2026-10-30')
    assert.equal(jobs[0].applyUrl, roleURL)
    assert.equal(jobs[0].lifecycleCleanupAllowed, false)
    assert.equal(readInventoryEvidence(jobs).listingComplete, false)
    assert.ok(jobs[RECRUITMENT_OBSERVATIONS])
  })
  assert.equal(unmocked, 0)
})

test('every registered source retains an explicit coverage failure when current pages are unavailable', async t => {
  for (const spec of batch) await t.test(spec.source, async () => {
    await assert.rejects(createCatalogScraper(bySource.get(spec.source)).run({
      fetchPage: async url => ({ status: 403, url, html: '' }),
      fetchJson: async () => assert.fail('Blocked pages cannot authorize an API read'),
    }), error => error.failureKind === 'coverage_gap' && error.softFailure === true)
  })
})
