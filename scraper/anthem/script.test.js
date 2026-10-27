import assert from 'node:assert/strict'
import test from 'node:test'
globalThis.fetch=()=>{throw Error('OFFLINE_NETWORK_TRIPWIRE')}
const{getScraperCatalog,createCatalogScraper}=await import('../../scraper-support/providers/index.js')
const{frozenPairTransport}=await import('../../scraper-support/tests/peopleStrongNativePair20261027.fixtures.js')
test('current frozen Anthem corporate5/native0 contradiction is retained through registered extraction',async()=>{
 let report
 const jobs=await createCatalogScraper(getScraperCatalog().find(x=>x.source==='anthem')).run({fetchPage:frozenPairTransport(),onReport:r=>{report=r},now:'2026-10-27T06:00:00Z'})
 assert.equal(jobs.length,0);assert.equal(report.reportedNativeTotal,0);assert.equal(report.delegation.advertisedCount,5);assert.equal(report.advertisedCountMismatch,true);assert.equal(report.sourceScopeComplete,false);assert.equal(report.rawJobs,null);assert.equal(report.verifiedZeroInventory,false)
})
