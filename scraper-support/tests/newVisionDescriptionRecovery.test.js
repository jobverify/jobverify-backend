import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import * as source from '../../scraper/newvisionsoftwareconsultancy/script.js'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/newvisionsoftwareconsultancy/${name}.json`, import.meta.url)))
const detailUrl = 'https://careers-newvision.peoplestrong.com/api/cp/rest/altone/cp/job/NVS_SRD_1875599/v2?part=basic,organisational,descriprion,workflow,skill,qualification,certification,language,applied&isReqId=false'
const careersHtml = '<h1>People-first culture, AI-first careers.</h1><a href="https://careers-newvision.peoplestrong.com/">See Open Roles</a>Explore Career career@newvision-software.com'
const shellHtml = '<title>Candidate Portal</title><body class="candidate-portal"><app-root data-testid="src-index-app-root-page-1"></app-root><script src="main-3V5KPFGK.js"></script></body>'
const listing = () => ({...fixture('listing'), response: fixture('listing').response.slice(0, 1), totalRecords: 1})
const run = (payload = listing(), detail = fixture('india-detail'), options = {}) => {
  const requests = []
  const promise = source.run({
    fetchPage: async url => ({status:200,url,html:url === source.CAREERS_PAGE_URL ? careersHtml : shellHtml}),
    fetchJson: async (url, request = {}) => {
      requests.push({url,...request})
      if (url === source.buildApiUrl()) return payload
      if (url === detailUrl) return detail
      throw new Error(`Unexpected public API: ${url}`)
    },
    ...options,
  })
  return {promise,requests}
}

test('NewVision retrieves employer description through the native underscore-code GET detail contract', async () => {
  const controller = new AbortController()
  const result = run(listing(), fixture('india-detail'), {signal:controller.signal})
  const [job] = await result.promise
  assert.match(job.jobDescription, /UiPath|Ui Path/i)
  assert.match(job.jobDescription, /6–8 years of overall IT experience/)
  assert.equal(job.sourceDescription, job.jobDescription)
  assert.match(job.jobDescriptionHtml, /<ul/)
  assert.equal(job.jobId, 'NVS/SRD/1875599')
  assert.equal(job.country, 'India')
  assert.equal(job.location, 'Pune, Maharashtra, India')
  assert.equal(job.applyUrl, 'https://careers-newvision.peoplestrong.com/job/detail/NVS_SRD_1875599')
  const request = result.requests.find(r => r.url === detailUrl)
  assert.equal(request.method, 'GET')
  assert.equal(request.signal, controller.signal)
  assert.equal(request.body, undefined)
})

test('NewVision rejects detail substitution, employer drift, closed status and country conflicts', async () => {
  for (const mutate of [d => {d.response.requisitionCode='NVS/OTHER/1'}, d => {d.response.entityID='1'}, d => {d.response.organizationUnitComplete='Other Employer'}, d => {d.response.jobTitle='Different role'}, d => {d.response.requisitionStatus='CLOSED'}, d => {d.response.locationHierarchyComplete='USA>US>San Francisco'}]) {
    const detail=fixture('india-detail'); mutate(detail)
    await assert.rejects(run(listing(),detail).promise, /detail|identity|employer|location|open/i)
  }
})

test('NewVision excludes explicitly foreign roles and rejects an off-tenant detail URL', async () => {
  const payload=listing()
  payload.response=[fixture('listing').response.find(r=>r.jobCode==='NVS/SA-D/1897947')]
  const foreign=run(payload,fixture('us-detail'))
  assert.deepEqual(await foreign.promise, [])
  assert.equal(foreign.requests.length,1)
  const invalid=listing();invalid.response[0].jobDetailUrl='https://unrelated.example/job/detail/NVS_SRD_1875599'
  await assert.rejects(run(invalid).promise,/identity|application|tenant/i)
})

test('NewVision rejects unavailable or truncated listing shapes instead of treating them as empty', async () => {
  for (const payload of [{error:'upstream unavailable'}, {response:[],totalRecords:177,messageCode:{code:200}}, {...listing(),totalRecords:0}]) {
    await assert.rejects(run(payload).promise,/listing|inventory|total/i)
  }
})

test('NewVision cannot claim complete inventory after the caller truncates its listing', async () => {
  const payload=fixture('listing')
  const result=run(payload,fixture('india-detail'),{maxJobs:1})
  const jobs=await result.promise
  assert.equal(jobs.length,1)
  assert.notEqual(readInventoryEvidence(jobs)?.status,'complete-inventory')
  assert.notEqual(jobs[0].sourceListingComplete,true)
})

test('NewVision waits for active detail requests and stops queued work after the first detail failure', async () => {
  const rows=fixture('listing').response.slice(0,3)
  const failure=new Error('first native detail identity failure')
  const detailRequests=[]
  let releaseSecond
  let secondStarted
  const secondIsActive=new Promise(resolve=>{secondStarted=resolve})
  let activeSettled=false
  let rejectedBeforeActiveSettled=false
  const result=source.run({
    detailConcurrency:2,
    fetchPage:async url=>({status:200,url,html:url===source.CAREERS_PAGE_URL?careersHtml:shellHtml}),
    fetchJson:async url=>{
      if(url===source.buildApiUrl())return {...fixture('listing'),response:rows,totalRecords:3}
      detailRequests.push(url)
      if(url===source.buildJobDetailsApiUrl(rows[0].jobCode))throw failure
      if(url===source.buildJobDetailsApiUrl(rows[1].jobCode)){
        secondStarted()
        await new Promise(resolve=>{releaseSecond=resolve})
        activeSettled=true
        const detail=fixture('india-detail')
        Object.assign(detail.response,{jobTitle:rows[1].jobTitle,requisitionCode:rows[1].jobCode,
          requisitionId:rows[1].jobCode.split('/').at(-1),organizationUnitComplete:rows[1].organizationUnitComplete,
          locationHierarchyComplete:rows[1].locationHierarchyComplete})
        return detail
      }
      throw new Error('queued detail requested after failure')
    },
  }).catch(error=>{rejectedBeforeActiveSettled=!activeSettled;return error})
  await secondIsActive
  await new Promise(resolve=>setImmediate(resolve))
  releaseSecond()
  assert.equal(await result,failure)
  await new Promise(resolve=>setImmediate(resolve))
  assert.equal(rejectedBeforeActiveSettled,false)
  assert.equal(detailRequests.length,2)
})
