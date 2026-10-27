import assert from 'node:assert/strict'
import test from 'node:test'
import { createCatalogScraper, getScraperCatalog } from '../providers/index.js'
import { readInventoryEvidence } from '../utils/inventoryEvidence.js'

const module = () => import('../../scraper/arcelormittal/oracleNative.js')
const networkTripwire=async fn=>{const prior=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unexpected implicit network')};try{return await fn()}finally{globalThis.fetch=prior}}
const nativeProtocol=(url)=>{
 const origin='https://efhi.fa.em3.oraclecloud.com',board=origin+'/hcmUI/CandidateExperience/en/sites/CX_1'
 if(url==='https://www.landmarkgroup.com/careers')return'<title>Landmark Group</title><script src="/_next/static/chunks/native.js"></script>'
 if(url==='https://www.landmarkgroup.com/_next/static/chunks/native.js')return'/api/page/${ ?locale=${'
 if(url==='https://www.landmarkgroup.com/api/page/careers?locale=en')return JSON.stringify({data:[{sections:[{rolesByRegionList:[{buttonLink:board}]}]}]})
 if(url===board)return'<title>LANDMARK GROUP</title><base data-sitenumber="CX_1" data-apibaseurl="'+origin+'"><script src="https://static.oracle.com/cdn/fa/oj-hcm-ce/test/js/main-minimal.js"></script>'
 if(url==='https://static.oracle.com/cdn/fa/oj-hcm-ce/test/js/main-minimal.js')return'/recruitingCEJobRequisitions?onlyData=true requisitionList.secondaryLocations finder=findReqs /recruitingCEJobRequisitionDetails finder=ById siteSettings/ /hcmRestApi/resources/latest'
 if(url===origin+'/hcmRestApi/CandidateExperience/en/siteSettings/CX_1')return JSON.stringify({app:{siteNumber:'CX_1',siteName:'LANDMARK GROUP',settings:[]}})
 return null
}
test('native Oracle HTML projection excludes nonrendering text and decodes each input once',async()=>{
 const {projectHTML}=await module()
 for(const v of ['0','00','+0','0e0','0.000','-0'])assert.equal(projectHTML(`<p>Visible &amp;amp;</p><span style="opacity:${v}">HIDDEN</span><template>INERT</template><script>CODE</script>`).text,'Visible &amp;')
 assert.equal(projectHTML('<p style="display:&#110;one">HIDDEN</p><p>Visible</p>').text,'Visible')
 for(const h of ['<p style="display&amp;colon;none">HIDDEN</p>','<style>.h{display&#58;none}</style><p class="h">HIDDEN</p>','<style>.h{display:none}</style><p class="h">HIDDEN</p>']){const r=projectHTML(h);assert.equal(r.complete,false);assert.ok(!r.text.includes('HIDDEN'))}
})
test('full Oracle detail preserves native identities, publication, expiry and all public sections',async()=>{
 const {mapOracleDetail}=await module()
 const r=mapOracleDetail({Id:'7',Title:'Engineer',PrimaryLocationCountry:'IN',PrimaryLocation:'Pune',RequisitionId:7001,ExternalPostedStartDate:'2026-10-20T11:22:33+00:00',ExternalPostedEndDate:'2026-11-01T11:22:33+00:00',ExternalDescriptionStr:'<p>Full description.</p>',ExternalResponsibilitiesStr:'<p>Build services.</p>',ExternalQualificationsStr:'<p>Degree and experience.</p>',OrganizationDescriptionStr:'<p>Native brand information.</p>',CorporateDescriptionStr:'<p>Group information.</p>',JobSchedule:null,RequisitionType:'Professional',LegalEmployer:null,Organization:null,requisitionFlexFields:[]},{source:'landmarkgroup',now:'2026-10-27T00:00:00Z'})
 assert.equal(r.requisitionId,'7001');assert.equal(r.employmentType,null);assert.equal(r.legalEmployer,null);assert.equal(r.brand,null);assert.equal(r.postingDate,'2026-10-20T11:22:33+00:00');assert.equal(r.closingDate,'2026-11-01T11:22:33+00:00');assert.ok(r.sourceClosingDateIsExact)
 for(const s of ['Full description.','Build services.','Degree and experience.','Native brand information.','Group information.'])assert.ok(r.sourceDescription.includes(s))
 assert.equal(r.sourceDetailComplete,true)
})
test('role country classification never infers India from a city, filter, or headquarters',async()=>{
 const {classifyOracleCountry}=await module()
 assert.equal(classifyOracleCountry({PrimaryLocation:'Pune, India'}),'unknown')
 assert.equal(classifyOracleCountry({PrimaryLocationCountry:'AE',PrimaryLocation:'Pune, India'}),'foreign')
 assert.equal(classifyOracleCountry({PrimaryLocationCountry:'AE',secondaryLocations:[{CountryCode:'IN',Name:'Bengaluru'}]}),'india')
 assert.equal(classifyOracleCountry({PrimaryLocationCountry:'AE',secondaryLocations:[{Name:'Bengaluru'}]}),'unknown')
})
test('registered arcelormittal stops on first current careers denial and never reaches historical Oracle',async()=>{
 const calls=[],p=getScraperCatalog().find(x=>x.source==='arcelormittal')
 await networkTripwire(()=>assert.rejects(createCatalogScraper(p).run({fetchPage:async url=>{calls.push(url);return{status:403,url,body:'<title>Just a moment...</title>'}}}),/403/))
 assert.deepEqual(calls,['https://corporate.arcelormittal.com/careers'])
})
test('registered sources reject legacy listing-only overrides before implicit network',async()=>{
 for(const source of ['arcelormittal','landmarkgroup'])await networkTripwire(()=>assert.rejects(createCatalogScraper(getScraperCatalog().find(x=>x.source===source)).run({fetchJson:async()=>({items:[]})}),/fetchPage/))
})
test('pagination uses native offsets despite foreign-only or short pages, closes full scope before maxJobs',async()=>{
 const {createOracleNativeScraper,readOracleNativeReport}=await module(),calls=[]
 const rows=[{Id:'1',Title:'Foreign1',PrimaryLocationCountry:'AE'},{Id:'2',Title:'Foreign2',PrimaryLocationCountry:'AE'},{Id:'3',Title:'India',PrimaryLocationCountry:'IN'}]
 const stage={};let detailCalls=0
 const jobs=await createOracleNativeScraper('landmarkgroup',{maxJobs:0,fetchPage:async url=>{
  calls.push(url)
  const protocol=nativeProtocol(url);if(protocol!==null)return{status:200,url,body:protocol}
  if(url.includes('JobRequisitionDetails')){detailCalls++;return{status:200,url,body:JSON.stringify({items:[{...rows[2],RequisitionId:3003,ExternalDescriptionStr:'<p>Full India role.</p>',ExternalResponsibilitiesStr:'<p>Build.</p>',ExternalQualificationsStr:'<p>Degree.</p>'}]})}}
  const offset=Number(url.match(/offset=(\d+)/)?.[1]);stage[offset]=(stage[offset]??0)+1
  return{status:200,url,body:JSON.stringify({items:[{SiteNumber:'CX_1',TotalJobsCount:4,Limit:24,Offset:offset,requisitionList:offset===0?rows:[]}]})}
 }}).run()
 assert.equal(detailCalls,1);assert.equal(stage[0],2);assert.equal(jobs.length,0)
 const report=readOracleNativeReport(jobs);assert.equal(report.oracle.observedCount,3);assert.equal(report.oracle.reportedTotal,4);assert.equal(report.oracle.complete,false);assert.equal(report.cleanupAllowed,false);assert.equal(readInventoryEvidence(jobs).listingComplete,false)
})
