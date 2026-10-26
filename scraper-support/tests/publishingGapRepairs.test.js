import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { getScraperCatalog } from '../providers/index.js'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'

const manifest = JSON.parse(fs.readFileSync(new URL('../providers/providerExtensions/zzz-publishing-gap-repairs.json', import.meta.url)))
const catalog = getScraperCatalog()

test('repair release contains 50 distinct sources with fresh official binding evidence', () => {
  assert.equal(manifest.length, 50)
  assert.equal(new Set(manifest.map((p) => p.source)).size, 50)
  for (const metadata of manifest) {
    assert.equal(metadata.bindingEvidence.verified, true, metadata.source)
    assert.ok(metadata.bindingEvidence.checkedAt, metadata.source)
    const links = metadata.bindingEvidence.matchedLinks || []
    if (links.length) {
      const platform = { greenhouse: /greenhouse\.io/i, ashby: /ashbyhq\.com|\/api\/ashby\//i, lever: /lever\.co|leverJobsOptions/i }[metadata.atsPlatform]
      assert.ok(links.some((link) => platform.test(link)), `${metadata.source}: binding must prove the configured ATS platform`)
    }
    const provider = catalog.find((p) => p.source === metadata.source)
    assert.equal(provider.atsPlatform, metadata.atsPlatform)
    assert.equal(provider.backfillMode, 'live-parser')
    assert.equal(provider.zeroResultPolicy, 'evidence-required')
  }
})

for (const metadata of manifest) {
  test(`${metadata.source} maps its ATS fixture and fails safely on upstream errors`, async () => {
    const provider = catalog.find((p) => p.source === metadata.source)
    const module = await import(pathToFileURL(provider.modulePath).href)
    const url = `https://example.com/jobs/${metadata.source}`
    const record = metadata.atsPlatform === 'greenhouse'
      ? { id: 1, title: 'Software Engineer', location: { name: 'Bangalore, India' }, absolute_url: url, content: 'Build and maintain applications.' }
      : metadata.atsPlatform === 'ashby'
        ? { id: '1', title: 'Software Engineer', location: 'Bangalore, India',
          jobUrl: `https://jobs.ashbyhq.com/${encodeURIComponent(metadata.boardToken)}/1`,
          applyUrl: `https://jobs.ashbyhq.com/${encodeURIComponent(metadata.boardToken)}/1/application`,
          isListed: true, descriptionPlain: 'Build and maintain applications.' }
        : { id: '1', text: 'Software Engineer', categories: { location: 'Bangalore, India' },
          hostedUrl: `https://jobs.lever.co/${encodeURIComponent(metadata.boardToken)}/1`,
          applyUrl: `https://jobs.lever.co/${encodeURIComponent(metadata.boardToken)}/1/apply`,
          descriptionPlain: 'Build and maintain applications.' }
    const payload = metadata.atsPlatform === 'lever' ? [record]
      : metadata.atsPlatform === 'greenhouse' ? { jobs: [record], meta: { total: 1 } } : { jobs: [record], apiVersion: '1' }
    const jobs = await module.run({ fetchJson: async () => payload })
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0].source, metadata.source)
    assert.equal(jobs[0].company, metadata.companyName)
    assert.equal(readInventoryEvidence(jobs).listingComplete, true)
    assert.notEqual(jobs[0].sourceListingComplete, false)
    if (metadata.atsPlatform === 'lever') {
      await assert.rejects(module.run({ fetchJson: async () => [{ ...record, hostedUrl: url, applyUrl: `${url}/apply` }] }), /board|identity/i)
    }
    await assert.rejects(module.run({ fetchJson: async () => { throw new Error('HTTP 503') } }), /503/)
  })
}
