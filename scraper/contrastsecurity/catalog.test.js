import test from 'node:test'
import assert from 'node:assert/strict'
import {getScraperCatalog} from '../../scraper-support/providers/index.js'
test('Contrast has one exact native board with unknown company counts and fixed extension sequence',()=>{
 const all=getScraperCatalog(),p=all.find(p=>p.source==='contrastsecurity')
 assert.equal(all.length,4587);assert.equal(new Set(all.map(p=>p.source)).size,4587)
 assert.equal(p.adapter,'script');assert.equal(p.atsPlatform,'ashby');assert.equal(p.boardToken,'contrast-security')
 assert.equal(p.jobsBoardUrl,'https://jobs.ashbyhq.com/contrast-security');assert.equal(p.verifiedOn,null);assert.equal(p.verifiedPublicJobCount,null);assert.equal(p.verifiedIndiaJobCount,null)
 assert.equal(p.sourceScopeComplete,false);assert.equal(all.filter(r=>r.jobsBoardUrl===p.jobsBoardUrl).length,1)
})
