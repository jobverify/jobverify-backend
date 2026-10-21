import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { getScraperCatalog, createCatalogScraper } from '../scraper-support/providers/index.js'
import { readInventoryEvidence } from '../scraper-support/utils/inventoryEvidence.js'
import { extractOfficialRecruitmentLinks } from '../scripts/officialRecruitmentLinks.js'

const expected = {
  ataccama: ['publicAts', 'lever', 'ataccama'],
  aurecon: ['workday', 'workday', 'https://aurecongroup.wd3.myworkdayjobs.com/en-US/aurecon'],
  automox: ['publicAts', 'greenhouse', 'automox'],
  avisbudgetgroup: ['workday', 'workday', 'https://avisbudget.wd1.myworkdayjobs.com/en-US/ABG_Careers'],
}
const providerFor = source => getScraperCatalog().find(row => row.source === source)

test('batch 003 replaces four exact source sentinels without board or alias duplication', () => {
  const catalog = getScraperCatalog()
  assert.equal(catalog.length, 4587)
  for (const [source, [adapter, atsPlatform, identity]] of Object.entries(expected)) {
    const row = providerFor(source)
    assert.equal(row.adapter, adapter, source)
    assert.equal(row.atsPlatform, atsPlatform)
    assert.equal(adapter === 'workday' ? row.baseUrl : row.boardToken, identity)
    assert.equal(catalog.filter(p => p.source === source).length, 1)
    assert.equal(catalog.filter(p => p.adapter === adapter && p.atsPlatform === atsPlatform
      && (adapter === 'workday' ? p.baseUrl === identity : p.boardToken === identity)).length, 1)
  }
  const extension = JSON.parse(readFileSync(new URL('../scraper-support/providers/providerExtensions/zzzzzzzz-verified-discovery-adapters-003.json', import.meta.url)))
  assert.deepEqual(extension.map(row => row.source).sort(), Object.keys(expected).sort())
})

test('batch 003 hashes current corporate proof chains and keeps runtime counts unknown', () => {
  for (const source of Object.keys(expected)) {
    const row = providerFor(source)
    assert.equal(row.remediationStatus, 'implemented-awaiting-live-validation')
    assert.equal(row.verifiedPublicJobCount, null)
    assert.equal(row.verifiedIndiaJobCount, null)
    assert.equal(row.bindingEvidence.verified, true)
    assert.ok(row.bindingEvidence.httpProofs.length)
    for (const proof of row.bindingEvidence.httpProofs) {
      const bytes = readFileSync(new URL(proof.file, new URL('../', import.meta.url)))
      assert.equal(createHash('sha256').update(bytes).digest('hex'), proof.sha256)
      const capture = JSON.parse(bytes)
      assert.equal(capture.status, 200)
      assert.equal(capture.finalURL, capture.requestedURL)
      assert.equal(createHash('sha256').update(capture.body).digest('hex'), capture.bodySha256)
      if (source !== 'aurecon') {
        assert.ok(extractOfficialRecruitmentLinks(capture.body, capture.finalURL).some(url => url.href === capture.expectedTarget))
      } else {
        // Corporate JSON navigation data is distinct from an HTML href. The
        // original discovery separately records clicking this rendered link.
        assert.equal(row.bindingEvidence.evidenceOrigin, 'corporate-navigation-data-and-reviewed-clicked-link')
        let found = false
        const walk = value => {
          if (!value || typeof value !== 'object') return
          if (value.Type === 'PageLink' && value.MenuTitle === 'Search all jobs'
            && value.Url === 'https://aurecongroup.wd3.myworkdayjobs.com/aurecon') found = true
          for (const child of Object.values(value)) walk(child)
        }
        for (const match of capture.body.matchAll(/<script type="application\/json">([\s\S]*?)<\/script>/g)) walk(JSON.parse(match[1]))
        assert.equal(found, true)
      }
    }
  }
})

for (const source of ['ataccama', 'automox']) {
  test(`${source} preserves native descriptions and excludes generic or US Remote`, async () => {
    const jobs = await createCatalogScraper(providerFor(source)).run({ fetchJson: async url => {
      assert.equal(url, source === 'ataccama' ? 'https://api.lever.co/v0/postings/ataccama?mode=json'
        : 'https://boards-api.greenhouse.io/v1/boards/automox/jobs?content=true')
      const rows = ['Remote', 'Remote, United States', 'Pune, India'].map((location, index) => source === 'ataccama'
        ? { id: `role-${index}`, text: 'Software Engineer', categories: { location },
          hostedUrl: `https://jobs.lever.co/ataccama/role-${index}`, applyUrl: `https://jobs.lever.co/ataccama/role-${index}/apply`,
          descriptionPlain: 'Build and maintain production services.' }
        : { id: index + 1, title: 'Software Engineer', location: { name: location },
          absolute_url: `https://job-boards.greenhouse.io/automox/jobs/${index + 1}`,
          content: '<p>Build and maintain production services.</p>' })
      return source === 'ataccama' ? rows : { jobs: rows, meta: { total: rows.length } }
    } })
    assert.equal(jobs.length, 1)
    assert.match(jobs[0].location, /Pune/)
    assert.match(jobs[0].jobDescription, /production services/)
    assert.equal(readInventoryEvidence(jobs).reportedTotal, 3)
    assert.equal(readInventoryEvidence(jobs).listingComplete, true)
  })
}

test('Workday geography config follows the observed native country facets', () => {
  assert.equal(providerFor('aurecon').locationCountry, null)
  const config = JSON.parse(readFileSync(new URL('../scraper/aurecon.workday/config.json', import.meta.url)))
  assert.equal(config.locationCountry, null)
  assert.equal(providerFor('avisbudgetgroup').locationCountry, 'c4f78be1a8f14da0ab49ce1162348a5e')
  assert.equal(providerFor('aurecon').boardIdentityVerified, true)
  assert.equal(providerFor('avisbudgetgroup').boardIdentityVerified, true)
})
