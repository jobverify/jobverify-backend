import test from 'node:test'
import assert from 'node:assert/strict'
import {getScraperCatalog} from '../../scraper-support/providers/index.js'
test('C.H. Robinson replaces one sentinel with an exact verified board, preserving4587 registrations and unknown runtime counts',()=>{
 const all=getScraperCatalog(),p=all.find(p=>p.source==='chrobinson')
 assert.equal(all.length,4587);assert.equal(new Set(all.map(p=>p.source)).size,4587)
 assert.equal(p.adapter,'script');assert.equal(p.atsPlatform,'workday')
 assert.equal(p.jobsBoardUrl,'https://chrobinson.wd5.myworkdayjobs.com/CHRobinson')
 assert.equal(p.verifiedPublicJobCount,null);assert.equal(p.verifiedIndiaJobCount,null);assert.equal(p.verifiedOn,null)
 assert.equal(all.filter(row=>row.jobsBoardUrl===p.jobsBoardUrl).length,1)
})
