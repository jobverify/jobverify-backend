import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { run } from './script.js'
import { readInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { readDetail, readListings, publicationDate } from './parser.js'

const fixture = name => {
  try { return JSON.parse(readFileSync(new URL(`fixtures/${name}`, import.meta.url),'utf8')) }
  catch(error) { if(error.code!=='ENOENT')throw error;return JSON.parse(gunzipSync(readFileSync(new URL(`fixtures/${name}.gz`, import.meta.url))).toString('utf8')) }
}
const listing = JSON.parse(fixture('listing-response.json').body)
const rows = JSON.parse(listing.d.obj1)
const transport = (payload = listing) => async (url, options = {}) => {
  if (url === 'https://www.kissht.com/career') return fixture('official-response.json')
  if (url === 'https://app1596.workline.hr/Cportal/GeneralOpening.aspx') return fixture('board-response.json')
  if (url.endsWith('/GetCurrentopening')) {
    assert.equal(options.method,'POST')
    assert.deepEqual(JSON.parse(options.body),{ JDFileName:'', OrgCode:'', KeyName:'' })
    return {status:200,url,body:JSON.stringify(payload)}
  }
  const row = rows.find(row => url.includes(row.TrackToken))
  assert.ok(row,'Unexpected native URL '+url)
  const body=fixture('detail-first-response.json').body
    .replaceAll('Sales Manager - Ibrahipatnam',row.Position_Name.trim())
    .replaceAll('Si Creva C7186',row.Req_No)
    .replaceAll('Secunderabad',row.LOCATIONNAME)
    .replaceAll('22-Oct-2026',row.PublishDate||'')
    .replaceAll('615416a2-8699-4388-b85e-5814a4117d3d',row.TrackToken)
    .replace(/<div class="description-info">[\s\S]*?<\/div>/,'<div class="description-info"><h4>Job Description</h4></div>')
  return {status:200,url,body}
}
const fetcher = payload => async (url, options) => {
  const response = await transport(payload)(url,options)
  return { ...response, url:response.finalUrl || response.url, text:async()=>response.body }
}

test('Kissht collects all266 client-paginated native roles with explicit India and brand identity',async()=>{
  const jobs = await run({fetchImpl:fetcher()})
  assert.equal(jobs.length,266)
  assert.equal(new Set(jobs.map(j=>j.id)).size,266)
  assert.equal(jobs.filter(j=>j.nativeLegalEmployer === 'OnEMI Technology Solutions Limited').length,9)
  assert.equal(jobs[0].title,'Sales Manager - Ibrahipatnam')
  assert.equal(jobs[0].country,'India')
  assert.equal(jobs[0].postedAt,'2026-10-22')
  assert.equal(jobs[0].sourceDescription,null)
  assert.equal(jobs[0].sourceDetailComplete,false)
  assert.equal(readInventoryEvidence(jobs).reportedTotal,266)
  assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})

test('Kissht rejects duplicated native identities and employer contradictions',async()=>{
  for(const change of [r=>r[1]=structuredClone(r[0]),r=>r[0].Company_Name1='Other Group']){
    const modified=structuredClone(rows);change(modified)
    await assert.rejects(run({fetchImpl:fetcher({d:{...listing.d,obj1:JSON.stringify(modified)}})}),{code:'KISSHT_COVERAGE_GAP'})
  }
})

test('Kissht reads actual inline first-role prose and its native application',()=>{
  const detail=readDetail(fixture('detail-first-response.json').body,rows[0])
  assert.match(detail.description,/Achieve targets for the Mortgages/)
  assert.equal(detail.applyUrl,'https://app1596.workline.hr/Candidate/SignInv1.aspx?PRFCode=615416a2-8699-4388-b85e-5814a4117d3d&Flag=C&DirectApply=1')
})

test('Kissht missing, hidden, inert, script and heading-only descriptions remain null',()=>{
  const html=fixture('detail-first-response.json').body
  for(const content of ['', '<h4>Job Description</h4>', '<p><strong>Responsibilities</strong></p>', '<p hidden>Substantial hidden duties</p>', '<div inert><p>Substantial inert duties</p></div>', '<div style="content-visibility:hidden"><p>Substantial hidden duties</p></div>', '<script>Some job duties</script>', '<p>Sales Manager - Ibrahipatnam</p>']){
    const changed=html.replace(/<div class="description-info">[\s\S]*?<\/div>/,`<div class="description-info">${content}</div>`)
    assert.equal(readDetail(changed,rows[0]).description,null)
  }
})

test('Kissht rejects state-country conflicts and newly introduced secondary geography',()=>{
  for(const change of [r=>r.State_Name=r.State='Canada',r=>r.SecondaryCountry='Canada',r=>r.LOCATIONNAME='Toronto, Canada',r=>r.State_Name=r.State='California',r=>r.CustomName1='Canada']){
    const modified=structuredClone(rows);change(modified[0])
    assert.throws(()=>readListings({d:{...listing.d,obj1:JSON.stringify(modified)}}))
  }
})

test('Kissht dates retain publication only and reject invalid calendar dates',()=>{
  assert.equal(publicationDate(null),null)
  assert.equal(publicationDate('22-Oct-2026'),'2026-10-22')
  assert.throws(()=>publicationDate('31-Feb-2026'))
})

test('Kissht rejects detail location or public posting-date contradictions',()=>{
  const html=fixture('detail-first-response.json').body
  for(const changed of [html.replaceAll('Secunderabad','Toronto, Canada'),html.replaceAll('22-Oct-2026','23-Oct-2026')]){
    assert.throws(()=>readDetail(changed,rows[0]))
  }
})

test('Kissht replays every actual captured role detail with a live-sized aggregate budget',async()=>{
  const captures=[fixture('official-response.json'),fixture('board-response.json'),fixture('listing-response.json'),...fixture('detail-responses.json')]
  const byUrl=new Map(captures.map(c=>[c.url,c]))
  const jobs=await run({timeoutMs:240000,fetchImpl:async url=>{
    const c=byUrl.get(url);assert.ok(c,'Uncaptured request '+url)
    return {...c,url:c.finalUrl||c.url,text:async()=>c.body}
  }})
  assert.equal(jobs.length,266)
  assert.equal(jobs[0].sourceDetailComplete,true)
  assert.match(jobs[0].sourceDescription,/Achieve targets for the Mortgages/)
  assert.equal(jobs.filter(job=>job.sourceDetailComplete).length,202)
  assert.equal(jobs.filter(job=>job.sourceDescription===null).length,64)
})

test('Kissht stops detail queues after a fatal native HTTP failure',async()=>{
  let detailRequests=0
  const pending=run({fetchImpl:async(url,options)=>{
    if(url.includes('/CandidatePortal/')){
      detailRequests++
      if(detailRequests===1)return{status:503,url,text:async()=>''}
      return new Promise(()=>{})
    }
    return fetcher()(url,options)
  }})
  await assert.rejects(pending,{code:'KISSHT_COVERAGE_GAP'})
  assert.ok(detailRequests<=4)
})

test('Kissht captured file and exact response-body hashes reconcile with the manifest',()=>{
  const sha=value=>createHash('sha256').update(value).digest('hex')
  const manifest=fixture('manifest.json')
  for(const capture of manifest.captures){
    const bytes=readFileSync(new URL('fixtures/'+capture.file,import.meta.url))
    assert.equal(sha(bytes),capture.sha256)
    const decoded=capture.file.endsWith('.gz')?gunzipSync(bytes):bytes
    assert.equal(sha(decoded),capture.uncompressedSha256)
    const envelopes=JSON.parse(decoded.toString('utf8'))
    const list=Array.isArray(envelopes)?envelopes:[envelopes]
    assert.deepEqual(list.map(c=>sha(c.body)),capture.responses.map(c=>c.bodySha256))
  }
})
