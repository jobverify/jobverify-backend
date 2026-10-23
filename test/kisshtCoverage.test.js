import assert from 'node:assert/strict'
import test from 'node:test'
import { execFileSync } from 'node:child_process'

import { generateCompanyCoverageReport } from '../scraper-support/providers/companyCoverage.js'
import { getScraperCatalog } from '../scraper-support/providers/index.js'
import { run } from '../scraper/kissht/script.js'

test('Kissht resolves only to its exact-name official provider', () => {
  const report = generateCompanyCoverageReport({
    csvText: 'company_name\nKissht\nKissht Finance\n',
    catalog: getScraperCatalog(),
  })

  assert.equal(report.matchedCount, 1)
  assert.equal(report.unmatchedCount, 1)
  assert.deepEqual(
    report.matched.map((item) => [item.companyName, item.source, item.provider?.companyName ?? null]),
    [['Kissht', 'kissht', 'Kissht']],
  )
  assert.deepEqual(report.unmatched.map((item) => item.companyName), ['Kissht Finance'])
})

test('Kissht fails closed when its official ATS has no verified enumerable listings', async () => {
  await assert.rejects(run({ fetchImpl: async () => ({ status: 503 }) }), error => {
    assert.equal(error.code, 'KISSHT_COVERAGE_GAP')
    assert.equal(error.sourceListingComplete, false)
    assert.equal(error.inventoryEvidence.status, 'coverage-gap')
    assert.equal(error.inventoryEvidence.reportedTotal, null)
    assert.equal(error.inventoryEvidence.indiaFacetCount, null)
    return true
  })
})

test('Kissht does not certify unfamiliar successful HTML as an empty inventory', async () => {
  await assert.rejects(run({ fetchImpl: async url => ({ status: 200, url, text: async () => '<h1>Kissht careers</h1>' }) }), { code: 'KISSHT_COVERAGE_GAP' })
})

test('Kissht bounds an uncooperative transport and body reader', async () => {
  for (const fetchImpl of [() => new Promise(() => {}), async url => ({ status: 200, url, text: () => new Promise(() => {}) })]) {
    await assert.rejects(run({ fetchImpl, timeoutMs: 20 }), error => error.code === 'KISSHT_COVERAGE_GAP' && /timeout/i.test(error.message))
  }
})

test('Kissht preserves the caller abort reason during transport and body reads', async () => {
  for (const fetchImpl of [() => new Promise(() => {}), async url => ({ status: 200, url, text: () => new Promise(() => {}) })]) {
    const controller = new AbortController()
    const reason = new Error('Caller stopped this source')
    const pending = run({ fetchImpl, signal: controller.signal })
    setTimeout(() => controller.abort(reason), 10)
    await assert.rejects(pending, error => error === reason)
  }
})

test('Kissht rejects ATS redirects, empty bodies and body failures with unknown totals', async () => {
  for (const response of [
    { status: 302, url: 'https://app1596.workline.hr/login' },
    { status: 200, url: 'https://app1596.workline.hr/Cportal/GeneralOpening.aspx', text: async () => '' },
    { status: 200, url: 'https://app1596.workline.hr/Cportal/GeneralOpening.aspx', text: async () => { throw new Error('body disconnected') } },
  ]) {
    await assert.rejects(run({ fetchImpl: async url => url.includes('kissht.com')
      ? { status: 200, url, text: async () => '<a href="https://app1596.workline.hr/Cportal/GeneralOpening.aspx">View Open Positions</a>' }
      : response }), error => {
      assert.equal(error.code, 'KISSHT_COVERAGE_GAP')
      assert.equal(error.inventoryEvidence.listingComplete, false)
      assert.equal(error.inventoryEvidence.pagesFetched, 2)
      assert.equal(error.inventoryEvidence.reportedTotal, null)
      return true
    })
  }
})

test('Kissht pre-abort preserves reason without starting transport', async () => {
  const controller = new AbortController()
  const reason = new Error('Already stopped')
  controller.abort(reason)
  let requests = 0
  await assert.rejects(run({ signal: controller.signal, fetchImpl: async () => { requests++; throw new Error('Unexpected request') } }), error => error === reason)
  assert.equal(requests, 0)
})

test('Kissht importing with a caller dry-run flag performs no scraping or persistence', () => {
  const url = new URL('../scraper/kissht/script.js', import.meta.url).href
  const result = execFileSync(process.execPath, ['--input-type=module', '-e',
    `process.argv.push('--dry-run'); globalThis.fetch = () => { throw new Error('Unexpected import request') }; await import(${JSON.stringify(url)}); console.log('safe-import')`], { encoding: 'utf8' })
  assert.equal(result.trim(), 'safe-import')
})
