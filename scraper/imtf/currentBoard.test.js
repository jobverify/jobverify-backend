import {test} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import zlib from 'node:zlib'
import {runNative} from './native.js'
import {readInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {getScraperCatalog,createCatalogScraper} from '../../scraper-support/providers/index.js'

const fixture=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./test-data/current-board-20261105.json.gz',import.meta.url))))
const index='https://apply.workable.com/imtf/jobs.md'
const detail='https://apply.workable.com/imtf/jobs/view/40AEB306B4.md'
const transport=(change={})=>{let inventoryReads=0;return async url=>{
  const packet=fixture.responses[url]
  // Header-only observation retained in india-redirect-chain.json. The body is
  // deliberately irrelevant to this controlled redirect response.
  if(url==='https://apply.workable.com/imtf/j/E90526054F/')return {url,status:302,headers:{location:'/imtf/?not_found=true','content-type':'text/html'},body:Buffer.alloc(0),bodyComplete:true}
  if(!packet)throw Error('Unretained stale careers-card detail')
  let body=url===index&&inventoryReads++>0?Buffer.from(fixture.closingInventory.bodyBase64,'base64'):Buffer.from(packet.bodyBase64,'base64')
  if(change[url] instanceof Error)throw change[url]
  if(typeof change[url]==='function')body=Buffer.from(change[url](body.toString('utf8'),inventoryReads))
  return {...packet,body}
}}

test('current employer-advertised native board verifies nine foreign roles and stable zero India despite stale careers cards',async()=>{
  const jobs=await runNative({transport:transport()})
  assert.equal(jobs.length,0)
  const evidence=readInventoryEvidence(jobs),native=jobs[Symbol.for('jobverify.imtf-native-evidence')]
  assert.equal(evidence.status,'complete-inventory')
  assert.equal(evidence.listingComplete,true)
  assert.equal(evidence.indiaFacetCount,0)
  assert.equal(evidence.reportedTotal,9)
  assert.equal(native.nativeBoardEvidence.observedListingCount,9)
  assert.equal(native.nativeBoardEvidence.verifiedForeignRoles.length,9)
  assert.deepEqual([...new Set(native.nativeBoardEvidence.verifiedForeignRoles.map(r=>r.country))].sort(),['Germany','Morocco','Switzerland'])
  assert.equal(native.verifiedZeroInventory,true)
  assert.equal(native.cleanupAllowed,false)
  assert.ok(native.careersCardFailures.some(f=>f.message==='Conflicting listing/detail placement'))
})

test('native board missing detail and native country contradiction cannot certify zero',async()=>{
  for(const change of [{[detail]:Error('detail unavailable')},{[detail]:s=>s.replace('Givisiez, Switzerland','Givisiez, India')}]){
    const jobs=await runNative({transport:transport(change)}),native=jobs[Symbol.for('jobverify.imtf-native-evidence')]
    assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
    assert.equal(native.verifiedZeroInventory,false)
    assert.equal(native.nativeBoardEvidence.observedListingCount,9)
    assert.ok(native.failures.length>0)
  }
})

test('native closing inventory change cannot certify zero',async()=>{
  const jobs=await runNative({transport:transport({[index]:(s,n)=>n>1?s.replace('2026-10-22','2026-10-21'):s})})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
  assert.equal(jobs[Symbol.for('jobverify.imtf-native-evidence')].verifiedZeroInventory,false)
})

test('an explicit current India row never becomes verified foreign-only zero',async()=>{
  const replace=s=>s.replace('Givisiez, Switzerland','Givisiez, India')
  const jobs=await runNative({transport:transport({[index]:replace,[detail]:replace})})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
  assert.equal(jobs[Symbol.for('jobverify.imtf-native-evidence')].verifiedZeroInventory,false)
})

test('a foreign-tenant advertised inventory alternate cannot establish IMTF zero',async()=>{
  const url='https://apply.workable.com/imtf/j/6A5764CB0F'
  await assert.rejects(()=>runNative({transport:transport({[url]:s=>s.replace('https://apply.workable.com/imtf/llms.txt','https://apply.workable.com/other/llms.txt')})}),e=>e.code==='IMTF_NATIVE_INCOMPLETE')
})

test('own hidden locations, secondary India and contradictory country labels keep zero unverified',async()=>{
  const url='https://apply.workable.com/api/v2/accounts/imtf/jobs/40AEB306B4'
  for(const mutate of [n=>{n.locations[0].hidden=true},n=>{n.locations.push({city:'Bengaluru',country:'India',countryCode:'IN',hidden:false,region:'Karnataka'})},n=>{n.locations[0].countryCode='IN'},n=>{n.accountUid='other-account'}]){
    const jobs=await runNative({transport:transport({[url]:s=>{const n=JSON.parse(s);mutate(n);return JSON.stringify(n)}})})
    assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
    assert.equal(jobs[Symbol.for('jobverify.imtf-native-evidence')].verifiedZeroInventory,false)
  }
})

test('own numeric identity must agree with the employer-handoff role HTML identity',async()=>{
  const url='https://apply.workable.com/api/v2/accounts/imtf/jobs/6A5764CB0F'
  const jobs=await runNative({transport:transport({[url]:s=>{const n=JSON.parse(s);n.id=999999;return JSON.stringify(n)}})})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
})

test('own primary country contradicting its all-location collection cannot certify zero',async()=>{
  const url='https://apply.workable.com/api/v2/accounts/imtf/jobs/40AEB306B4'
  const jobs=await runNative({transport:transport({[url]:s=>{const n=JSON.parse(s);n.location={city:'Bengaluru',country:'India',countryCode:'IN'};return JSON.stringify(n)}})})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
})

test('stale India not-found redirect is retained as unavailable and never followed as a role',async()=>{
  const nativeTransport=transport(),calls=[],stale='https://apply.workable.com/imtf/j/E90526054F/'
  const jobs=await runNative({transport:async url=>{
    calls.push(url)
    if(url===stale)return {url,status:302,headers:{location:'/imtf/?not_found=true','content-type':'text/html'},body:Buffer.alloc(0),bodyComplete:true}
    return nativeTransport(url)
  }})
  assert.equal(readInventoryEvidence(jobs).status,'complete-inventory')
  assert.deepEqual(jobs[Symbol.for('jobverify.imtf-native-evidence')].notFoundCareersShortcodes,['E90526054F'])
  assert.equal(calls.includes('https://apply.workable.com/imtf/?not_found=true'),false)
})

test('closing own worksite change keeps current zero unverified',async()=>{
  const url='https://apply.workable.com/api/v2/accounts/imtf/jobs/40AEB306B4';let reads=0
  const jobs=await runNative({transport:transport({[url]:s=>{
    if(++reads===1)return s
    const n=JSON.parse(s);n.location.region='Changed region';n.locations[0].region='Changed region';return JSON.stringify(n)
  }})})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
})

test('selected catalog preserves current native verified India-zero evidence',async()=>{
  const jobs=await createCatalogScraper(getScraperCatalog().find(p=>p.source==='imtf')).run({transport:transport()})
  assert.equal(jobs.length,0)
  assert.equal(readInventoryEvidence(jobs).status,'complete-inventory')
  assert.equal(readInventoryEvidence(jobs).listingComplete,true)
})

test('unreviewed corporate hiring carriers and malformed role rows prevent company-wide completion',async()=>{
  const careers='https://imtf.com/about-us/careers/'
  for(const addition of ['<a href="https://apply.workable.com/other-company/j/ABCDEF1234/">Another role</a>','<a href="https://jobs.example.org/imtf/">Other IMTF vacancies</a>','<div class="imtf-careers-position"><a class="imtf-careers-position-1" href="https://apply.workable.com/imtf/j/ABCDEF1234/">Malformed role</a></div>']){
    const jobs=await runNative({transport:transport({[careers]:s=>s.replace('</body>',addition+'</body>')})})
    const native=jobs[Symbol.for('jobverify.imtf-native-evidence')]
    assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
    assert.equal(native.verifiedZeroInventory,false)
    assert.ok(native.failures.some(f=>f.stage==='native-listing'))
  }
})

test('alternative India placement appended only to Markdown Description prevents foreign-only zero',async()=>{
  const jobs=await runNative({transport:transport({[detail]:s=>s.replace('## Description\n','## Description\n\nThis role may alternatively be based in Bengaluru, India.\n')})})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
  assert.equal(jobs[Symbol.for('jobverify.imtf-native-evidence')].verifiedZeroInventory,false)
})

test('alternative India placement added only to closing own Description prevents foreign-only zero',async()=>{
  const url='https://apply.workable.com/api/v2/accounts/imtf/jobs/40AEB306B4';let reads=0
  const jobs=await runNative({transport:transport({[url]:s=>{
    if(++reads===1)return s
    const n=JSON.parse(s);n.description+='<p>This role may alternatively be based in Bengaluru, India.</p>';return JSON.stringify(n)
  }})})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
})

test('matching unreviewed alternative India text in both native criteria carriers does not certify foreign-only zero',async()=>{
  const url='https://apply.workable.com/api/v2/accounts/imtf/jobs/40AEB306B4'
  const jobs=await runNative({transport:transport({
    [detail]:s=>s.replace('## Description\n','## Description\n\nThis role may alternatively be based in Bengaluru, India.\n'),
    [url]:s=>{const n=JSON.parse(s);n.description='<p>This role may alternatively be based in Bengaluru, India.</p>'+n.description;return JSON.stringify(n)}
  })})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
})

test('closing Markdown criteria are reread and reconciled before foreign-only completion',async()=>{
  let reads=0
  const jobs=await runNative({transport:transport({[detail]:s=>++reads<3?s:s.replace('## Description\n','## Description\n\nThis role may alternatively be based in Bengaluru, India.\n')})})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
})

test('an unreviewed native alternative-worksites field prevents foreign-only completion',async()=>{
  const url='https://apply.workable.com/api/v2/accounts/imtf/jobs/40AEB306B4'
  const jobs=await runNative({transport:transport({[url]:s=>{const n=JSON.parse(s);n.alternativeWorksites=[{city:'Bengaluru',country:'India'}];return JSON.stringify(n)}})})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
})

test('a material Requirements addition without geographic words must reconcile across native carriers',async()=>{
  const jobs=await runNative({transport:transport({[detail]:s=>s.replace('## Requirements\n','## Requirements\n\nA professional accounting certification is mandatory.\n')})})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
})

test('matching alternative-office text without an explicit country remains unresolved',async()=>{
  const url='https://apply.workable.com/api/v2/accounts/imtf/jobs/40AEB306B4'
  const jobs=await runNative({transport:transport({
    [detail]:s=>s.replace('## Description\n','## Description\n\nAlternative office: Bengaluru.\n'),
    [url]:s=>{const n=JSON.parse(s);n.description='<p>Alternative office: Bengaluru.</p>'+n.description;return JSON.stringify(n)}
  })})
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
  assert.equal(jobs.length,0)
})

for(const [label,document,addition]of[
  ['HOME visible link','https://imtf.com/','<a href="https://jobs.lever.co/imtf/">India jobs</a>'],
  ['CAREERS template','https://imtf.com/about-us/careers/','<template><a href="https://jobs.lever.co/imtf/">India jobs</a></template>'],
  ['CAREERS iframe','https://imtf.com/about-us/careers/','<iframe src="https://jobs.lever.co/imtf/"></iframe>'],
  ['HOME noscript','https://imtf.com/','<noscript><a href="https://jobs.lever.co/imtf/">India jobs</a></noscript>'],
  ['CAREERS iframe srcdoc','https://imtf.com/about-us/careers/','<iframe srcdoc="&lt;a href=&quot;https://jobs.lever.co/imtf/&quot;&gt;India jobs&lt;/a&gt;"></iframe>'],
  ['CAREERS lazy iframe','https://imtf.com/about-us/careers/','<iframe data-src="https://jobs.lever.co/imtf/"></iframe>'],
  ['CAREERS embedded object','https://imtf.com/about-us/careers/','<object data="https://jobs.lever.co/imtf/"></object>'],
])test(`unreviewed ${label} hiring surface prevents company-wide completion`,async()=>{
  const jobs=await runNative({transport:transport({[document]:s=>s.replace('</body>',addition+'</body>')})})
  const native=jobs[Symbol.for('jobverify.imtf-native-evidence')]
  assert.equal(readInventoryEvidence(jobs).status,'coverage-gap')
  assert.equal(native.verifiedZeroInventory,false)
  assert.ok(native.failures.some(f=>f.stage==='native-listing'))
})
