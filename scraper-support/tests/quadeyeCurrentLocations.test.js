import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { extractIndiaJobs, createQuadEyeScraper, CAREERS_PAGE_URL, CAREERS_PORTAL_URL } from '../../scraper/quadeye/script.js'
const payload = JSON.parse(readFileSync(new URL('./fixtures/quadeye/current-api.json', import.meta.url), 'utf8'))
const home = '<title>Jobs | quadeye</title><link rel="canonical" href="https://www.quadeye.com/jobs"><a href="/career">Careers</a><a href="/contact-us">Contact</a><h2>Open Roles</h2>Loading roles'
const portal = '<title>Jobs at PeoplePlus</title><meta property="og:url" content="https://quadeye.zohorecruit.in/jobs/Careers/"><meta property="og:site_name" content="Quadeye"><input id="pageJson"><input id="moduleMeta"><input id="jobs" value="' + JSON.stringify(payload.data.map(job=>({id:job.id}))).replaceAll('"','&quot;') + '">'
const fetchText = async url => url === CAREERS_PAGE_URL ? home : url === CAREERS_PORTAL_URL ? portal : '<title>Quadeye</title><h1>' + payload.data.find(job => job.$url === url).Posting_Title + '</h1>'
test('QuadEye includes eight roles with explicit Gurugram Job_Location and absent Country', () => {
  const jobs = extractIndiaJobs(payload)
  assert.equal(jobs.length, 20)
  assert.equal(jobs.filter(job => payload.data.find(row=>row.id===job.jobId).Country == null).length, 8)
  assert.ok(jobs.every(job => job.country === 'India' && job.location === 'Gurugram, India'))
  assert.ok(jobs.every(job => !/Singapore|New York|Romania/.test(job.location)))
})
test('QuadEye rejects unparseable public records, unknown locations and unrelated application URLs', () => {
  for (const change of [row=>{row.id=''},row=>{row.Job_Location=['Remote'];row.Country=null},row=>{row.$url='https://unrelated.example/job'},row=>{row.Posting_Title='';row.Job_Opening_Name=''}]) {
    const changed = structuredClone(payload); change(changed.data[0]); assert.throws(()=>extractIndiaJobs(changed),/incomplete|location|identity|application/i)
  }
})
test('QuadEye compares public API identities with the independently rendered portal inventory', async () => {
  await assert.rejects(createQuadEyeScraper().run({fetchText,fetchJson:async()=>({...payload,data:payload.data.slice(1)})}),/incomplete|inventory/i)
})
test('QuadEye caps preserve incomplete snapshot status after validating the full inventory', async () => {
  const jobs = await createQuadEyeScraper({maxJobs:2}).run({fetchText,fetchJson:async()=>payload})
  assert.equal(jobs.length,2)
  assert.ok(jobs.every(job=>job.sourceListingComplete===false))
})
