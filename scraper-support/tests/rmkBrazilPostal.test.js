import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {parseRmkListing} from '../shared/successFactorsRmk.js'
const html=gunzipSync(fs.readFileSync(new URL('./fixtures/rmkNativePair/bunge-postal-20261022.html.gz',import.meta.url))).toString('utf8')
const config={origin:'https://jobs.bunge.com',source:'bunge',companyName:'Bunge',companyToken:'Bunge'}
test('native RMK Brazil postal punctuation preserves the explicit BR country and complete one-hundred-row page',()=>{
 const p=parseRmkListing(html,config);assert.equal(p.jobs.length,100);assert.equal(p.start,101);assert.equal(p.end,200);assert.equal(p.total,841)
 const row=p.jobs.find(j=>j.location==='Rio Verde, GO, BR, 75.908-660');assert.ok(row);assert.equal(row.countryCode,'BR');assert.equal(row.country,'Brazil')
 assert.ok(p.jobs.filter(j=>j.location.includes('75.908-660')).every(j=>j.countryCode==='BR'))
})
test('the dotted numeric suffix requires the explicit native BR country',()=>{
 assert.ok(html.includes('BR, 75.908-660'));assert.throws(()=>parseRmkListing(html.replaceAll('BR, 75.908-660','US, 75.908-660'),config),/Unknown native location country: Rio Verde, GO, US, 75\.908-660/)
})
test('arbitrary dotted text and unrecognized countries remain unverified parsing failures',()=>{
 assert.throws(()=>parseRmkListing(html.replaceAll('BR, 75.908-660','BR, unavailable.zip'),config),/Unknown native location country/)
 assert.throws(()=>parseRmkListing(html.replaceAll('BR, 75.908-660','XX, 75.908-660'),config),/Unknown native location country/)
})
