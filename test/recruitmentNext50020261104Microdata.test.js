import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {createHash} from 'node:crypto'
import {readNativeDocument} from '../scraper-support/utils/activeNativeHtml.js'
import {recruitmentMicrodataPostings} from '../scraper-support/utils/recruitmentMicrodata.js'
import {createVerifiedRecruitmentScraper,RECRUITMENT_OBSERVATIONS} from '../scraper-support/utils/verifiedRecruitment.js'
import {readInventoryEvidence} from '../scraper-support/utils/inventoryEvidence.js'

const capture=JSON.parse(gunzipSync(readFileSync(new URL('./test-data/recruitmentNext50020261104/volvo-native-street-address.json.gz',import.meta.url))))
const url='https://example.test/job/Bangalore/1371387055/'
const description='Develop reliable production software services, collaborate with engineering teams on API designs, investigate incidents, and improve service performance and availability.'
const html=(street,{visible=street,country=null,extra=''}={})=>`<div itemscope itemtype="http://schema.org/JobPosting">
 <meta itemprop="hiringOrganization" content="Example"><h1><span itemprop="title">Software Engineer</span></h1>
 <span itemprop="jobLocation" itemscope><span itemprop="address" itemscope>
 <meta itemprop="streetAddress" content="${street}">${country===null?'':`<meta itemprop="addressCountry" content="${country}">`}
 </span></span><span class="jobGeoLocation">${visible}</span><div itemprop="description">${description}</div>${extra}</div>`
const parse=body=>recruitmentMicrodataPostings(readNativeDocument(body),url)[0]

test('the captured Volvo role owns its visible full worksite and retains the exact street address while resolving its country',()=>{
 assert.equal(createHash('sha256').update(capture.html).digest('hex'),capture.bodySHA256)
 const row=recruitmentMicrodataPostings(readNativeDocument(capture.html),capture.url)[0]
 assert.deepEqual(row.nativeMicrodataIssues,[])
 assert.equal(row.jobLocation[0].address.addressCountry,'India')
 assert.equal(row.jobLocation[0].address.streetAddress,'Bangalore, IN, 562122')
 assert.equal(row.jobLocation[0].address.addressLocality,'Bangalore')
 assert.equal(row.hiringOrganization.name,'Volvo Group')
 assert.ok(row.description.length>1000)
})

test('an own visible native street address can supply an explicit country name or a corroborated India code and PIN',()=>{
 for(const street of ['Bangalore, IN, 562122','Bengaluru, Karnataka, India, 560001','Bangalore, India']){
  const row=parse(html(street))
  assert.deepEqual(row.nativeMicrodataIssues,[])
  assert.equal(row.jobLocation[0].address.addressCountry,'India')
  assert.equal(row.jobLocation[0].address.streetAddress,street)
 }
})

test('an Indiana state, a missing PIN, an unknown city or a shortened Indonesian country cannot supply India',()=>{
 for(const street of ['Indianapolis, IN, 46204','Bangalore, IN','Bangalore, In, 562122','Jakarta, IN, 562122','Unknown place, IN, 562122','Bangalore, IN, 000000']){
  const row=parse(html(street))
  assert.notEqual(row.jobLocation[0].address.addressCountry,'India',street)
  assert.ok(row.nativeMicrodataIssues.length,street)
 }
})

test('unrelated, hidden, mismatched or conflicting workplace fields cannot donate country proof',()=>{
 const valid='Bangalore, IN, 562122'
 for(const body of [
  html(valid,{visible:'Mumbai, IN, 400001'}),
  html(valid).replace(`<span class="jobGeoLocation">${valid}</span>`,`<span hidden class="jobGeoLocation">${valid}</span>`),
  html('Unknown location',{extra:`<aside itemscope><span class="jobGeoLocation">${valid}</span></aside>`}),
  html(valid,{country:'US'}),
 ])assert.ok(parse(body).nativeMicrodataIssues.length)
})

test('an ordinary street address preserves an already explicit native country without requiring an RMK worksite label',()=>{
 for(const country of ['India','United States']){
  const body=html('100 Corporate Drive',{country}).replace(/<span class="jobGeoLocation">[^<]*<\/span>/,'')
  const row=parse(body)
  assert.deepEqual(row.nativeMicrodataIssues,[])
  assert.equal(row.jobLocation[0].address.addressCountry,country)
  assert.equal(row.jobLocation[0].address.streetAddress,'100 Corporate Drive')
 }
})

test('registered-style collection returns the proven India role and retains incomplete company scope',async()=>{
 const source={source:'example',companyName:'Example',companyDomain:'example.test',companyCareerPage:'https://example.test/careers'}
 const jobs=await createVerifiedRecruitmentScraper(source).run({fetchPage:async requested=>({status:200,url:requested,
  html:requested===url?html('Bangalore, IN, 562122'):`<h1>Example Careers</h1><a href="${url}">Software Engineer</a>`})})
 assert.equal(jobs.length,1)
 assert.equal(jobs[0].country,'India')
 assert.equal(jobs[0].city,'Bangalore')
 assert.equal(jobs[0].sourceDescription,description)
 assert.equal(readInventoryEvidence(jobs).listingComplete,false)
 assert.equal(jobs[0].lifecycleCleanupAllowed,false)
 assert.equal(jobs[RECRUITMENT_OBSERVATIONS].returnedIndiaJobs,1)
})
